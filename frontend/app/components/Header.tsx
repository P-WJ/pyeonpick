"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signIn, signOut } from "next-auth/react";
import { useCart } from "@/app/contexts/cart-context";
import { PushNotificationBell } from "@/app/components/PushNotificationBell";

export function Header() {
  const { data: session } = useSession();
  const user = session?.user;
  const { cartCount, setIsCartOpen } = useCart();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100/60 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.02)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 h-14">
        {/* 로고 */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-gray-900 group"
          >
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent group-hover:opacity-90 transition-opacity">편픽</span>
            <span className="hidden sm:inline text-[9px] font-bold text-violet-600 bg-violet-50/80 border border-violet-100 px-1.5 py-0.5 rounded-full leading-none">
              BETA
            </span>
          </Link>
          <span className="hidden md:inline text-[11px] text-gray-400 font-medium">
            편의점 행사 상품 비교
          </span>
        </div>

        {/* 우측 액션 영역 */}
        <div className="flex items-center gap-1.5">
          {/* 게시판 링크 — 모바일에서도 노출 */}
          <Link
            href="/board"
            className="flex items-center px-3 py-2 text-sm font-semibold text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all duration-150"
          >
            <span className="hidden sm:inline">게시판</span>
            {/* 모바일: 아이콘만 */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="sm:hidden"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </Link>

          {/* 웹 푸시 알림 */}
          <PushNotificationBell />

          {/* 로그인 / 프로필 */}
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 rounded-xl border border-gray-200/80 pl-1.5 pr-2.5 py-1.5 text-sm text-gray-700 bg-white/50 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm active:scale-[0.98] transition-all duration-150 cursor-pointer"
              >
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name ?? ""}
                    width={22}
                    height={22}
                    className="rounded-full ring-1 ring-gray-100"
                  />
                ) : (
                  <div className="w-5.5 h-5.5 rounded-full bg-violet-100/80 text-violet-600 flex items-center justify-center text-xs font-bold ring-1 ring-violet-200">
                    {user.name?.[0] ?? "?"}
                  </div>
                )}
                <span className="hidden sm:inline font-bold text-xs leading-none text-gray-800">
                  {user.name}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`text-gray-400 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* 드롭다운 메뉴 */}
              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-32 rounded-2xl bg-white border border-gray-150/60 shadow-[0_8px_30px_rgba(0,0,0,0.08)] py-1.5 z-50 overflow-hidden animate-pulse-slow">
                  <Link
                    href="/profile"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-55 transition-colors"
                  >
                    내 정보
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                    className="w-full flex items-center px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50/50 transition-colors text-left border-t border-gray-100/60 mt-1.5 pt-2 cursor-pointer"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => signIn("kakao")}
              className="flex items-center gap-1.5 rounded-xl bg-[#FEE500] px-3.5 py-2 text-xs font-bold text-[#191919] hover:bg-[#FDE100] active:scale-[0.97] transition-all duration-150 shadow-[0_2px_8px_-2px_rgba(254,229,0,0.35)] hover:shadow-md"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.569 1.397 4.836 3.527 6.238l-.898 3.359a.375.375 0 0 0 .545.417L9.31 18.4A10.56 10.56 0 0 0 12 18c5.523 0 10-3.477 10-7.5S17.523 3 12 3z" />
              </svg>
              <span className="hidden sm:inline">로그인</span>
            </button>
          )}

          {/* 장바구니 */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-1.5 rounded-xl bg-gray-950 px-3.5 py-2 text-xs font-bold text-white hover:bg-gray-800 active:scale-[0.97] transition-all duration-150 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.12)] hover:shadow-lg ml-0.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span className="hidden sm:inline">장바구니</span>
            {cartCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white shadow-sm ring-2 ring-white animate-pulse-slow">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
