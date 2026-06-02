"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";

export function BoardHeader() {
  const { data: session } = useSession();
  const user = session?.user;
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-xl font-black text-gray-900 tracking-tight"
          >
            편픽
          </Link>
          <span className="text-gray-200">|</span>
          <Link
            href="/board"
            className="text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors duration-150"
          >
            게시판
          </Link>
        </div>

        <div className="flex items-center gap-1.5">
          {user ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="flex items-center gap-2 rounded-xl border border-gray-200 pl-1.5 pr-3 py-1 text-sm text-gray-700 hover:bg-gray-50 transition-all duration-150"
              >
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name ?? ""}
                    width={26}
                    height={26}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold">
                    {user.name?.[0] ?? "?"}
                  </div>
                )}
                <span className="hidden sm:inline font-medium text-sm">
                  {user.name}
                </span>
              </button>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/board" })}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-1 py-1"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => signIn("kakao")}
              className="flex items-center gap-1.5 rounded-xl bg-[#FEE500] px-3 py-2 text-sm font-semibold text-[#191919] hover:opacity-90 active:scale-[0.98] transition-all duration-150"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.569 1.397 4.836 3.527 6.238l-.898 3.359a.375.375 0 0 0 .545.417L9.31 18.4A10.56 10.56 0 0 0 12 18c5.523 0 10-3.477 10-7.5S17.523 3 12 3z" />
              </svg>
              <span>로그인</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
