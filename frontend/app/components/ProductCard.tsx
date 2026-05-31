"use client";

import Image from "next/image";
import type { Product } from "@/domain/entities/product";
import { STORE_COLORS, EVENT_TYPE_BADGES } from "@/lib/constants";

const PLACEHOLDER_IMAGE = "/placeholder.png";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const storeColors = STORE_COLORS[product.store];
  const eventBadge = EVENT_TYPE_BADGES[product.eventType];

  return (
    <div
      className="relative flex flex-col rounded-xl bg-white shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-200 overflow-hidden"
      style={{ borderTop: `3px solid ${storeColors.primary}` }}
    >
      {/* 행사 뱃지 */}
      <span
        className="absolute left-2 top-2 z-10 rounded-full px-2 py-0.5 text-xs font-bold"
        style={{
          backgroundColor: eventBadge.backgroundColor,
          color: eventBadge.textColor,
        }}
      >
        {eventBadge.label}
      </span>

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

        <button
          type="button"
          onClick={() => onAddToCart(product)}
          className="mt-3 w-full rounded-lg py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 active:opacity-75"
          style={{ backgroundColor: storeColors.primary }}
        >
          담기
        </button>
      </div>
    </div>
  );
}
