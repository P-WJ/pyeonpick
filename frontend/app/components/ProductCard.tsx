"use client";

import Image from "next/image";
import type { Product } from "@/domain/entities/product";
import { EVENT_TYPE_COLORS } from "@/lib/constants";

const PLACEHOLDER_IMAGE = "/placeholder.png";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const badgeColor = EVENT_TYPE_COLORS[product.eventType] ?? "bg-gray-500";

  return (
    <div className="relative flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <span
        className={`absolute left-3 top-3 rounded-full px-2 py-0.5 text-xs font-bold text-white ${badgeColor}`}
      >
        {product.eventType}
      </span>
      <div className="relative mx-auto mb-3 h-32 w-32">
        <Image
          src={product.imageUrl || PLACEHOLDER_IMAGE}
          alt={product.name}
          fill
          className="object-contain"
          unoptimized={!product.imageUrl}
        />
      </div>
      <p className="text-xs text-gray-400">{product.store}</p>
      <h3 className="mt-1 line-clamp-2 text-sm font-medium text-gray-900">
        {product.name}
      </h3>
      <p className="mt-1 text-base font-bold text-gray-900">
        {product.price.toLocaleString("ko-KR")}원
      </p>
      <button
        type="button"
        onClick={() => onAddToCart(product)}
        className="mt-3 w-full rounded-lg bg-indigo-600 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
      >
        장바구니 추가
      </button>
    </div>
  );
}
