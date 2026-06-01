"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signIn, signOut } from "next-auth/react";

export function BoardHeader() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-30 bg-white shadow-sm">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xl font-extrabold text-blue-700 tracking-tight"
          >
            편픽
          </Link>
          <span className="text-gray-300">|</span>
          <Link
            href="/board"
            className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors"
          >
            게시판
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-gray-200 pl-1 pr-3 py-1 text-sm text-gray-700">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name ?? ""}
                    width={28}
                    height={28}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                    {user.name?.[0] ?? "?"}
                  </div>
                )}
                <span className="hidden sm:inline font-medium text-sm">
                  {user.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/board" })}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => signIn("kakao")}
              className="flex items-center gap-1.5 rounded-full bg-[#FEE500] px-3 py-2 text-sm font-semibold text-[#191919] hover:bg-[#F5DC00] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
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
