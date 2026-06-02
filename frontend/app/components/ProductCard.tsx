"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import type { Product, EventType } from "@/domain/entities/product";
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
      className="relative flex flex-col rounded-2xl bg-white overflow-hidden cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] active:scale-[0.98]"
      style={{ borderTop: `3px solid ${storeColors.primary}` }}
    >
      {/* 행사 뱃지 */}
      <div className="absolute left-2 top-2 z-10">
        <EventBadge eventType={product.eventType} />
      </div>

      {/* 찜하기 버튼 — onToggleWishlist가 전달된 경우에만 노출 */}
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
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition-all duration-150 hover:bg-white hover:scale-110 active:scale-95"
        >
          <span className={`text-base leading-none ${isWishlisted ? "text-rose-500" : "text-gray-300"}`}>
            {isWishlisted ? "♥" : "♡"}
          </span>
        </button>
      )}

      {/* 이미지 */}
      <div className="relative mx-auto mt-5 h-36 w-36">
        <Image
          src={product.imageUrl || PLACEHOLDER_IMAGE}
          alt={product.name}
          fill
          className="object-contain"
          unoptimized={!product.imageUrl}
        />
      </div>

      {/* 정보 영역 */}
      <div className="flex flex-1 flex-col p-3">
        {/* 편의점 뱃지 — pill 형태 */}
        <span
          className="inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ backgroundColor: storeColors.secondary, color: storeColors.primary }}
        >
          {product.store}
        </span>
        <h3 className="mt-1.5 line-clamp-2 text-sm font-medium text-gray-900 leading-snug">
          {product.name}
        </h3>
        <p className="mt-1.5 text-base font-bold text-gray-900">
          {product.price.toLocaleString("ko-KR")}
          <span className="text-xs font-normal text-gray-500">원</span>
        </p>
        {EVENT_BENEFIT_TEXT[product.eventType] && (
          <p className="mt-0.5 text-xs" style={{ color: storeColors.primary, opacity: 0.75 }}>
            {EVENT_BENEFIT_TEXT[product.eventType]}
          </p>
        )}

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onAddToCart(product);
          }}
          className="mt-3 w-full rounded-xl py-2 text-sm font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98] min-h-[40px]"
          style={{ backgroundColor: storeColors.primary }}
        >
          담기
        </button>
      </div>
    </Link>
  );
}
