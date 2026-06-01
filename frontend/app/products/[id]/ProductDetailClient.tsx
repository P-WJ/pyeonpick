"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Product, Nutrition } from "@/domain/entities/product";
import type { CartItem } from "@/domain/entities/cart";
import { STORE_COLORS } from "@/lib/constants";
import { EventBadge } from "@/app/components/EventBadge";
import { calculatePriceBenefit } from "@/domain/use-cases/price";

const CART_STORAGE_KEY = "cvs-cart-v1";
const RECENTLY_VIEWED_KEY = "cvs-recently-viewed-v1";
const RECENTLY_VIEWED_MAX_COUNT = 20;
const PLACEHOLDER_IMAGE = "/placeholder.png";

const NUTRITION_LABELS: Record<keyof Omit<Nutrition, "serving_size" | "calories">, string> = {
  protein: "단백질",
  fat: "지방",
  carbohydrates: "탄수화물",
  sugars: "당류",
  sodium: "나트륨",
  saturated_fat: "포화지방",
  trans_fat: "트랜스지방",
  cholesterol: "콜레스테롤",
};

const NUTRITION_UNITS: Record<keyof Omit<Nutrition, "serving_size" | "calories">, string> = {
  protein: "g",
  fat: "g",
  carbohydrates: "g",
  sugars: "g",
  sodium: "mg",
  saturated_fat: "g",
  trans_fat: "g",
  cholesterol: "mg",
};

function NutritionTable({ nutrition }: { nutrition: Nutrition }) {
  const nutrientKeys = Object.keys(NUTRITION_LABELS) as Array<
    keyof Omit<Nutrition, "serving_size" | "calories">
  >;
  const availableNutrients = nutrientKeys.filter(
    (key) => nutrition[key] !== undefined && nutrition[key] !== null
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <p className="text-sm font-bold text-gray-800">영양성분</p>
        {nutrition.serving_size && (
          <p className="text-xs text-gray-500 mt-0.5">
            1회 제공량: {nutrition.serving_size}
          </p>
        )}
      </div>

      {nutrition.calories !== undefined && (
        <div className="px-4 py-4 border-b border-gray-100 flex items-baseline justify-between">
          <span className="text-base font-semibold text-gray-700">열량</span>
          <span className="text-3xl font-black text-gray-900">
            {nutrition.calories}
            <span className="text-sm font-normal text-gray-500 ml-1">kcal</span>
          </span>
        </div>
      )}

      {availableNutrients.length > 0 && (
        <table className="w-full text-sm">
          <tbody>
            {availableNutrients.map((key) => (
              <tr key={key} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2.5 text-gray-600">
                  {NUTRITION_LABELS[key]}
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                  {nutrition[key]}
                  {NUTRITION_UNITS[key]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

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
  const benefit = calculatePriceBenefit(product.price, product.eventType);

  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem(RECENTLY_VIEWED_KEY) ?? "[]"
      ) as number[];
      const filtered = stored.filter((id) => id !== product.id);
      const updated = [product.id, ...filtered].slice(0, RECENTLY_VIEWED_MAX_COUNT);
      localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
    } catch {
      // 손상된 데이터는 무시
    }
  }, [product.id]);

  function handleAddToCart() {
    addProductToCart(product);
    router.push("/");
  }

  return (
    <>
      <main className="max-w-2xl mx-auto pb-28">
        {/* 뒤로가기 */}
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors flex-shrink-0"
            aria-label="뒤로가기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="text-base font-semibold text-gray-900">상품 상세</span>
        </div>
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

          {/* 가격 혜택 카드 */}
          <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: storeColors.primary + "33", backgroundColor: storeColors.primary + "08" }}>
            {/* 표시 가격 + 절약률 */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">표시 가격</p>
                <p className="text-3xl font-black" style={{ color: storeColors.primary }}>
                  {product.price.toLocaleString("ko-KR")}
                  <span className="text-lg font-semibold text-gray-500">원</span>
                </p>
              </div>
              {benefit.savingsRate > 0 && (
                <span className="rounded-full bg-red-500 px-3 py-1 text-sm font-bold text-white">
                  {benefit.savingsRate}% 절약
                </span>
              )}
            </div>

            {/* 행사 혜택 상세 */}
            {benefit.savings > 0 ? (
              <div className="rounded-xl bg-white p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-500">{benefit.benefitDescription}</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-gray-50 py-2">
                    <p className="text-[10px] text-gray-400">최소 구매</p>
                    <p className="text-base font-bold text-gray-800">{benefit.requiredQuantity}개</p>
                  </div>
                  <div className="rounded-lg py-2" style={{ backgroundColor: storeColors.primary + "15" }}>
                    <p className="text-[10px] text-gray-400">개당 단가</p>
                    <p className="text-base font-bold" style={{ color: storeColors.primary }}>
                      {benefit.unitPrice.toLocaleString("ko-KR")}원
                    </p>
                  </div>
                  <div className="rounded-lg bg-red-50 py-2">
                    <p className="text-[10px] text-gray-400">절약 금액</p>
                    <p className="text-base font-bold text-red-500">
                      {benefit.savings.toLocaleString("ko-KR")}원
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">{benefit.benefitDescription}</p>
            )}
          </div>

          {/* 유효기간 + 카테고리 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              {product.category}
            </span>
            <span className="text-xs text-gray-400">
              행사기간: {product.validFrom} ~ {product.validTo}
            </span>
          </div>
        </div>

        {/* 영양성분 섹션 — 식품류만 표시 */}
        {product.category !== "생활용품" && (
          <div className="px-4">
            {product.nutrition ? (
              <NutritionTable nutrition={product.nutrition} />
            ) : (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                <p className="text-xs text-amber-600">영양성분 정보를 준비 중이에요.</p>
              </div>
            )}
          </div>
        )}

        {/* 관련 상품 섹션 */}
        <div className="px-4 mt-6">
          <p className="text-sm font-bold text-gray-800 mb-3">
            이 카테고리 베스트
          </p>

          {relatedProducts.length === 0 ? (
            <div>
              <p className="text-xs text-gray-400">관련 상품이 없습니다.</p>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="mt-3 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium"
              >
                다른 상품 보러가기
              </button>
            </div>
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
