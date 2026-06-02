"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import type { Product } from "@/domain/entities/product";
import { STORE_COLORS } from "@/lib/constants";
import { EventBadge } from "./EventBadge";
import { useCart } from "@/app/contexts/cart-context";

// Elegant inline SVG data URI as the primary fallback instead of raw broken image
const PLACEHOLDER_IMAGE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23f9fafb"/><stop offset="100%" stop-color="%23f3f4f6"/></linearGradient></defs><rect width="100" height="100" fill="url(%23g)"/><circle cx="50" cy="45" r="14" fill="%23e5e7eb" opacity="0.8"/><path d="M32 72 h36 v-22 h-36 z" fill="%23d1d5db" opacity="0.6"/><path d="M42 50 h16 v-6 h-16 z" fill="%239ca3af" opacity="0.5"/></svg>`;

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  isWishlisted?: boolean;
  onToggleWishlist?: (product: Product) => void;
}

export function ProductCard({
  product,
  onAddToCart,
  isWishlisted = false,
  onToggleWishlist,
}: ProductCardProps) {
  const storeColors = STORE_COLORS[product.store];
  const { data: session } = useSession();
  const { showToast } = useCart();
  const [isAdded, setIsAdded] = useState(false);

  return (
    <Link
      href={`/products/${product.id}`}
      className="group relative flex flex-col border border-gray-100/80 rounded-2xl bg-white overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-gray-200 hover:shadow-[0_12px_24px_-4px_rgba(0,0,0,0.06)]"
    >
      {/* 이미지 영역 */}
      <div className="relative w-full aspect-square bg-gray-50/70 overflow-hidden border-b border-gray-50/50 flex items-center justify-center">
        <Image
          src={product.imageUrl || PLACEHOLDER_IMAGE}
          alt={product.name}
          fill
          className="object-contain p-4.5 transition-transform duration-300 group-hover:scale-[1.04]"
          unoptimized={!product.imageUrl}
        />

        {/* 행사 뱃지 — 좌하단 */}
        <div className="absolute left-2.5 top-2.5 z-10 shadow-sm rounded-lg overflow-hidden">
          <EventBadge eventType={product.eventType} />
        </div>

        {/* 찜하기 버튼 — 우상단 */}
        {onToggleWishlist && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!session?.user) {
                showToast("찜하기는 로그인 후 이용할 수 있습니다.");
                return;
              }
              onToggleWishlist(product);
            }}
            aria-label={isWishlisted ? "찜하기 해제" : "찜하기"}
            className="absolute right-2.5 top-2.5 z-10 flex h-7.5 w-7.5 items-center justify-center rounded-full bg-white/85 hover:bg-white backdrop-blur-md shadow-sm border border-gray-100/50 transition-all duration-150 hover:scale-110 active:scale-95 group/wish"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill={isWishlisted ? "#f43f5e" : "none"}
              stroke={isWishlisted ? "#f43f5e" : "#9ca3af"}
              strokeWidth="2.5"
              className={`transition-transform duration-200 ${isWishlisted ? "scale-110" : "group-hover/wish:scale-110"}`}
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </button>
        )}
      </div>

      {/* 정보 영역 */}
      <div className="flex flex-1 flex-col p-3.5">
        {/* 편의점 + 가격 한 줄 */}
        <div className="flex items-center justify-between gap-1 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: storeColors.primary }}
            />
            <span className="text-xs font-bold text-gray-500 truncate" style={{ color: storeColors.text }}>
              {product.store}
            </span>
          </div>
          <p className="text-base font-extrabold text-gray-900 shrink-0">
            {product.price.toLocaleString("ko-KR")}
            <span className="text-[11px] font-medium text-gray-400 ml-0.5">원</span>
          </p>
        </div>

        {/* 상품명 */}
        <h3 className="line-clamp-2 text-sm font-semibold text-gray-800 leading-snug flex-1 min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* 담기 버튼 */}
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onAddToCart(product);
            setIsAdded(true);
            setTimeout(() => setIsAdded(false), 1200);
          }}
          className={`w-full mt-3 rounded-xl py-2.5 text-xs font-bold active:scale-[0.98] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] hover:shadow-md transition-all duration-200 flex items-center justify-center gap-1 min-h-[38px] ${
            isAdded
              ? "bg-violet-600 hover:bg-violet-700 text-white"
              : "bg-gray-950 hover:bg-gray-800 text-white"
          }`}
        >
          {isAdded ? "✓ 담겼어요!" : "+ 담기"}
        </button>
      </div>
    </Link>
  );
}
