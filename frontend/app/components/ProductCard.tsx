"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import type { Product } from "@/domain/entities/product";
import { STORE_COLORS } from "@/lib/constants";
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
      className="group relative flex flex-col border border-gray-100 rounded-2xl bg-white overflow-hidden cursor-pointer transition-all duration-200 hover:border-gray-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
    >
      {/* 이미지 영역 */}
      <div className="relative w-full aspect-square bg-gray-50 overflow-hidden">
        <Image
          src={product.imageUrl || PLACEHOLDER_IMAGE}
          alt={product.name}
          fill
          className="object-contain p-4 transition-transform duration-300 group-hover:scale-[1.03]"
          unoptimized={!product.imageUrl}
        />

        {/* 행사 뱃지 — 좌하단 */}
        <div className="absolute left-2 top-2 z-10">
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
            className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm transition-all duration-150 hover:scale-110 active:scale-95"
          >
            <span className={`text-sm leading-none ${isWishlisted ? "text-rose-500" : "text-gray-300"}`}>
              {isWishlisted ? "♥" : "♡"}
            </span>
          </button>
        )}
      </div>

      {/* 정보 영역 */}
      <div className="flex flex-1 flex-col p-3">
        {/* 편의점 + 가격 한 줄 */}
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: storeColors.primary }}
            />
            <span className="text-xs text-gray-500 truncate">{product.store}</span>
          </div>
          <p className="text-[15px] font-bold text-gray-900 shrink-0">
            {product.price.toLocaleString("ko-KR")}
            <span className="text-[11px] font-normal text-gray-400">원</span>
          </p>
        </div>

        {/* 상품명 */}
        <h3 className="line-clamp-2 text-sm font-medium text-gray-900 leading-snug flex-1 min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* 담기 버튼 */}
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onAddToCart(product);
          }}
          className="w-full mt-2.5 rounded-xl py-2 text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 active:scale-[0.98] transition-all duration-150 min-h-[44px]"
        >
          + 담기
        </button>
      </div>
    </Link>
  );
}
