"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signIn, signOut } from "next-auth/react";
import { useCart } from "@/app/contexts/cart-context";
import { PushNotificationBell } from "@/app/components/PushNotificationBell";

export function Header() {
  const { data: session } = useSession();
  const user = session?.user;
  const { cartCount, setIsCartOpen } = useCart();

  return (
    <header className="sticky top-0 z-30 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div>
          <Link href="/" className="text-xl font-extrabold text-blue-700 tracking-tight">
            편픽
          </Link>
          <span className="ml-2 text-xs text-gray-400 font-medium hidden sm:inline">
            편의점 행사 비교
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* 게시판 링크 */}
          <Link
            href="/board"
            className="hidden sm:flex items-center gap-1 rounded-full border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            게시판
          </Link>

          {/* 알림 구독 버튼 (웹 푸시) */}
          <PushNotificationBell />

          {/* 로그인/프로필 */}
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-full border border-gray-200 pl-1 pr-3 py-1 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {user.image ? (
                  <Image src={user.image} alt={user.name ?? ""} width={28} height={28} className="rounded-full" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                    {user.name?.[0] ?? "?"}
                  </div>
                )}
                <span className="hidden sm:inline font-medium text-sm">{user.name}</span>
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
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
              <span className="hidden sm:inline">로그인</span>
            </button>
          )}

          {/* 장바구니 버튼 */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span className="hidden sm:inline">장바구니</span>
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
