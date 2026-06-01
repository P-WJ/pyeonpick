import NextAuth from "next-auth";
import Kakao from "next-auth/providers/kakao";
import { createSupabaseServerClient } from "@/infrastructure/supabase";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Kakao({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "kakao") return false;

      const kakaoId = account.providerAccountId;
      const nickname = user.name ?? "사용자";
      const profileImage = user.image ?? "";

      try {
        const supabase = createSupabaseServerClient();
        await supabase.from("users").upsert(
          { kakao_id: kakaoId, nickname, profile_image: profileImage },
          { onConflict: "kakao_id" }
        );
      } catch {
        // DB 저장 실패해도 로그인은 허용
      }

      return true;
    },
    async jwt({ token, account, user }) {
      if (account?.provider === "kakao") {
        token.kakaoId = account.providerAccountId;
        token.nickname = user.name ?? "사용자";
        token.profileImage = user.image ?? "";
      }
      return token;
    },
    async session({ session, token }) {
      session.user.kakaoId = token.kakaoId as string;
      session.user.nickname = token.nickname as string;
      session.user.profileImage = token.profileImage as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
