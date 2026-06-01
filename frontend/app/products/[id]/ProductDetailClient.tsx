"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/domain/entities/product";
import type { CartItem } from "@/domain/entities/cart";
import { STORE_COLORS } from "@/lib/constants";
import { EventBadge } from "@/app/components/EventBadge";

const CART_STORAGE_KEY = "cvs-cart-v1";
const PLACEHOLDER_IMAGE = "/placeholder.png";

interface ProductDetailClientProps {
  product: Product;
  relatedProducts: Product[];
}

function addProductToCart(product: Product): void {
  const stored = localStorage.getItem(CART_STORAGE_KEY);
  const cartItems: CartItem[] = stored
    ? (JSON.parse(stored) as CartItem[])
    : [];

  const existingItemIndex = cartItems.findIndex(
    (item) => item.product.id === product.id
  );

  if (existingItemIndex >= 0) {
    cartItems[existingItemIndex] = {
      ...cartItems[existingItemIndex],
      quantity: (cartItems[existingItemIndex]?.quantity ?? 0) + 1,
    };
  } else {
    cartItems.push({ product, quantity: 1 });
  }

  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
}

function RelatedProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const storeColors = STORE_COLORS[product.store];

  return (
    <button
      type="button"
      onClick={() => router.push(`/products/${product.id}`)}
      className="min-w-[120px] w-[120px] flex-shrink-0 flex flex-col gap-1 rounded-xl bg-white border border-gray-100 p-2 text-left hover:border-gray-300 transition-colors"
    >
      <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-gray-50">
        <Image
          src={product.imageUrl || PLACEHOLDER_IMAGE}
          alt={product.name}
          fill
          className="object-contain"
          unoptimized={!product.imageUrl}
        />
      </div>
      <EventBadge eventType={product.eventType} className="text-[10px] px-1.5 py-0.5" />
      <p className="text-xs text-gray-800 line-clamp-2 leading-tight">
        {product.name}
      </p>
      <p className="text-xs font-bold" style={{ color: storeColors.primary }}>
        {product.price.toLocaleString("ko-KR")}원
      </p>
    </button>
  );
}

export function ProductDetailClient({
  product,
  relatedProducts,
}: ProductDetailClientProps) {
  const router = useRouter();
  const storeColors = STORE_COLORS[product.store];

  function handleAddToCart() {
    addProductToCart(product);
    router.push("/");
  }

  return (
    <>
      {/* 헤더 */}
      <header className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-2xl mx-auto">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors flex-shrink-0"
            aria-label="뒤로가기"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <span className="text-base font-semibold text-gray-900">상품 상세</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto pb-28">
        {/* 이미지 영역 */}
        <div className="relative w-full max-h-72 bg-gray-50 flex items-center justify-center overflow-hidden">
          <div className="relative w-full h-72">
            <Image
              src={product.imageUrl || PLACEHOLDER_IMAGE}
              alt={product.name}
              fill
              className="object-contain"
              unoptimized={!product.imageUrl}
              priority
            />
          </div>
        </div>

        {/* 상품 정보 */}
        <div className="px-4 py-5 space-y-4">
          {/* 편의점명 + 행사 뱃지 */}
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-semibold"
              style={{ color: storeColors.primary }}
            >
              {product.store}
            </span>
            <EventBadge eventType={product.eventType} />
          </div>

          {/* 상품명 */}
          <h1 className="text-2xl font-bold text-gray-900 leading-snug">
            {product.name}
          </h1>

          {/* 가격 */}
          <p
            className="text-3xl font-black"
            style={{ color: storeColors.primary }}
          >
            {product.price.toLocaleString("ko-KR")}
            <span className="text-lg font-semibold text-gray-500">원</span>
          </p>

          {/* 유효기간 */}
          <p className="text-sm text-gray-400">
            {product.validFrom} ~ {product.validTo}
          </p>

          {/* 카테고리 pill */}
          <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            {product.category}
          </span>
        </div>

        {/* 영양성분 섹션 */}
        <div className="px-4">
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm font-bold text-amber-800 mb-1">영양성분</p>
            <p className="text-xs text-amber-600">
              영양성분 정보는 준비 중입니다. 빠른 시일 내 제공될 예정이에요.
            </p>
          </div>
        </div>

        {/* 관련 상품 섹션 */}
        <div className="px-4 mt-6">
          <p className="text-sm font-bold text-gray-800 mb-3">
            이 카테고리 베스트
          </p>

          {relatedProducts.length === 0 ? (
            <p className="text-xs text-gray-400">관련 상품이 없습니다.</p>
          ) : (
            <div
              className="flex gap-3 overflow-x-auto pb-2"
              style={{ scrollbarWidth: "none" }}
            >
              {relatedProducts.map((relatedProduct) => (
                <RelatedProductCard
                  key={relatedProduct.id}
                  product={relatedProduct}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 하단 고정 장바구니 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 px-4 py-3 max-w-2xl mx-auto">
        <button
          type="button"
          onClick={handleAddToCart}
          className="w-full py-3 rounded-xl text-base font-bold text-white hover:opacity-90 active:opacity-75 transition-opacity"
          style={{ backgroundColor: storeColors.primary }}
        >
          장바구니 담기
        </button>
      </div>
    </>
  );
}
