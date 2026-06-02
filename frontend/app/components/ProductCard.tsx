"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import type { Product } from "@/domain/entities/product";
import { STORE_COLORS, EVENT_BENEFIT_TEXT } from "@/lib/constants";
import { EventBadge } from "./EventBadge";
import { useCart } from "@/app/contexts/cart-context";

const PLACEHOLDER_IMAGE = "/placeholder.png";

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

  return (
    <Link
      href={`/products/${product.id}`}
      className="group relative flex flex-col rounded-2xl bg-white overflow-hidden cursor-pointer transition-all duration-200 ease-out hover:-translate-y-1 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.10)]"
      style={{ borderTop: `3px solid ${storeColors.primary}` }}
    >
      {/* 이미지 — 전체 너비, 정방형 */}
      <div className="relative w-full aspect-square bg-gray-50 overflow-hidden">
        <Image
          src={product.imageUrl || PLACEHOLDER_IMAGE}
          alt={product.name}
          fill
          className="object-contain p-5 transition-transform duration-300 group-hover:scale-105"
          unoptimized={!product.imageUrl}
        />

        {/* 행사 뱃지 */}
        <div className="absolute left-2.5 top-2.5 z-10">
          <EventBadge eventType={product.eventType} />
        </div>

        {/* 찜하기 버튼 */}
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
            className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-150 hover:scale-110 active:scale-95"
          >
            <span className={`text-sm leading-none ${isWishlisted ? "text-rose-500" : "text-gray-300"}`}>
              {isWishlisted ? "♥" : "♡"}
            </span>
          </button>
        )}
      </div>

      {/* 정보 영역 */}
      <div className="flex flex-1 flex-col p-3.5">
        {/* 편의점 + 혜택 */}
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide"
            style={{ backgroundColor: storeColors.secondary, color: storeColors.primary }}
          >
            {product.store}
          </span>
          {EVENT_BENEFIT_TEXT[product.eventType] && (
            <span className="text-[10px] text-gray-400 truncate">
              {EVENT_BENEFIT_TEXT[product.eventType]}
            </span>
          )}
        </div>

        {/* 상품명 */}
        <h3 className="line-clamp-2 text-sm font-medium text-gray-900 leading-snug flex-1">
          {product.name}
        </h3>

        {/* 가격 + 담기 */}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <p className="text-base font-bold text-gray-900 shrink-0">
            {product.price.toLocaleString("ko-KR")}
            <span className="text-xs font-normal text-gray-400">원</span>
          </p>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onAddToCart(product);
            }}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-all duration-150 hover:opacity-90 active:scale-95 shrink-0"
            style={{ backgroundColor: storeColors.primary }}
          >
            담기
          </button>
        </div>
      </div>
    </Link>
  );
}
