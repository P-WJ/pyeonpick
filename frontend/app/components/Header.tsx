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
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-xl font-black text-gray-900 tracking-tight">
            편픽
          </Link>
          <span className="text-xs text-gray-400 font-medium hidden sm:inline">
            편의점 행사 비교
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* 게시판 링크 */}
          <Link
            href="/board"
            className="hidden sm:flex items-center px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors duration-150 rounded-lg hover:bg-gray-50"
          >
            게시판
          </Link>

          {/* 알림 구독 버튼 (웹 푸시) */}
          <PushNotificationBell />

          {/* 로그인/프로필 */}
          {user ? (
            <div className="flex items-center gap-1.5">
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-xl border border-gray-200 pl-1.5 pr-3 py-1 text-sm text-gray-700 hover:bg-gray-50 transition-all duration-150"
              >
                {user.image ? (
                  <Image src={user.image} alt={user.name ?? ""} width={26} height={26} className="rounded-full" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold">
                    {user.name?.[0] ?? "?"}
                  </div>
                )}
                <span className="hidden sm:inline font-medium text-sm">{user.name}</span>
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
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
              <span className="hidden sm:inline">로그인</span>
            </button>
          )}

          {/* 장바구니 버튼 */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-1.5 rounded-xl bg-gray-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-gray-800 active:scale-[0.98] transition-all duration-150"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span className="hidden sm:inline">장바구니</span>
            {cartCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
