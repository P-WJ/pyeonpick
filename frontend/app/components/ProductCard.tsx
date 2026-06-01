"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import type { Product, EventType } from "@/domain/entities/product";
import { STORE_COLORS } from "@/lib/constants";
import { EventBadge } from "./EventBadge";
import { useCart } from "@/app/contexts/cart-context";

const EVENT_BENEFIT_TEXT: Record<EventType, string | null> = {
  "1+1": "1개 가격에 2개",
  "2+1": "3개 구매 시 1개 무료",
  "3+1": "4개 구매 시 1개 무료",
  "할인": null,
  "증정": "증정품 제공",
};

function resolveBenefitText(eventType: EventType): string | null {
  return EVENT_BENEFIT_TEXT[eventType];
}

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
      className="relative flex flex-col rounded-xl bg-white shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
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
          className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 shadow-sm transition-colors duration-150 hover:bg-white"
        >
          <span className={`text-lg leading-none ${isWishlisted ? "text-rose-500" : "text-gray-300"}`}>
            {isWishlisted ? "♥" : "♡"}
          </span>
        </button>
      )}

      {/* 이미지 */}
      <div className="relative mx-auto mt-4 h-32 w-32">
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
        <p
          className="text-xs font-semibold"
          style={{ color: storeColors.primary }}
        >
          {product.store}
        </p>
        <h3 className="mt-1 line-clamp-2 text-sm font-medium text-gray-900 leading-snug">
          {product.name}
        </h3>
        <p className="mt-1.5 text-base font-bold text-gray-900">
          {product.price.toLocaleString("ko-KR")}
          <span className="text-xs font-normal text-gray-500">원</span>
        </p>
        {resolveBenefitText(product.eventType) && (
          <p className="mt-0.5 text-xs text-gray-400">
            {resolveBenefitText(product.eventType)}
          </p>
        )}

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onAddToCart(product);
          }}
          className="mt-3 w-full rounded-lg py-1.5 text-sm font-medium text-white transition-opacity duration-150 hover:opacity-90 active:opacity-75"
          style={{ backgroundColor: storeColors.primary }}
        >
          담기
        </button>
      </div>
    </Link>
  );
}
