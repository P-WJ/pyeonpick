import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      kakaoId: string;
      nickname: string;
      profileImage: string;
    } & DefaultSession["user"];
  }
}
