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
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="px-4 py-3.5 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900">영양성분</p>
        {nutrition.serving_size && (
          <p className="text-xs text-gray-400 mt-0.5">
            1회 제공량: {nutrition.serving_size}
          </p>
        )}
      </div>

      {nutrition.calories !== undefined && (
        <div className="px-4 py-4 border-b border-gray-100 flex items-baseline justify-between">
          <span className="text-sm font-medium text-gray-500">열량</span>
          <span className="text-3xl font-black text-gray-900">
            {nutrition.calories}
            <span className="text-sm font-normal text-gray-400 ml-1">kcal</span>
          </span>
        </div>
      )}

      {availableNutrients.length > 0 && (
        <table className="w-full text-sm">
          <tbody>
            {availableNutrients.map((key) => (
              <tr key={key} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2.5 text-gray-500">
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
      className="min-w-[120px] w-[120px] flex-shrink-0 flex flex-col gap-1.5 rounded-2xl bg-white border border-gray-100 p-2.5 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] active:scale-[0.98]"
    >
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-gray-50">
        <Image
          src={product.imageUrl || PLACEHOLDER_IMAGE}
          alt={product.name}
          fill
          className="object-contain p-1"
          unoptimized={!product.imageUrl}
        />
      </div>
      <EventBadge eventType={product.eventType} className="text-[10px] px-1.5 py-0.5" />
      <p className="text-xs text-gray-800 line-clamp-2 leading-snug">
        {product.name}
      </p>
      <div className="flex items-center gap-1">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: storeColors.primary }}
        />
        <p className="text-xs font-bold text-gray-900">
          {product.price.toLocaleString("ko-KR")}원
        </p>
      </div>
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
      <main className="max-w-2xl mx-auto pb-28 bg-gray-50 min-h-screen">
        {/* 뒤로가기 바 */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 active:scale-95 transition-all duration-150 flex-shrink-0"
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
          </button>
          <span className="text-base font-semibold text-gray-900">상품 상세</span>
        </div>

        {/* 이미지 영역 */}
        <div className="relative w-full aspect-square bg-white">
          <Image
            src={product.imageUrl || PLACEHOLDER_IMAGE}
            alt={product.name}
            fill
            className="object-contain p-8"
            unoptimized={!product.imageUrl}
            priority
          />
        </div>

        {/* 상품 정보 */}
        <div className="px-4 pt-5 pb-4 bg-white border-b border-gray-100 space-y-3">
          {/* 편의점 뱃지 + 행사 뱃지 */}
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{
                backgroundColor: storeColors.secondary,
                color: storeColors.primary,
              }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: storeColors.primary }}
              />
              {product.store}
            </span>
            <EventBadge eventType={product.eventType} />
          </div>

          {/* 상품명 */}
          <h1 className="text-xl font-bold text-gray-900 leading-snug">
            {product.name}
          </h1>

          {/* 가격 행 */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">표시 가격</p>
              <p className="text-3xl font-black text-gray-900">
                {product.price.toLocaleString("ko-KR")}
                <span className="text-base font-medium text-gray-400 ml-1">원</span>
              </p>
            </div>
            {benefit.savingsRate > 0 && (
              <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-red-500 border border-red-100">
                {benefit.savingsRate}% 절약
              </span>
            )}
          </div>
        </div>

        {/* 혜택 카드 */}
        <div className="mx-4 mt-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              행사 혜택
            </p>

            {benefit.savings > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  {benefit.benefitDescription}
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-gray-50 py-3 px-2">
                    <p className="text-[10px] text-gray-400 mb-0.5">최소 구매</p>
                    <p className="text-base font-bold text-gray-900">
                      {benefit.requiredQuantity}개
                    </p>
                  </div>
                  <div className="rounded-xl bg-gray-50 py-3 px-2">
                    <p className="text-[10px] text-gray-400 mb-0.5">개당 단가</p>
                    <p className="text-base font-bold text-gray-900">
                      {benefit.unitPrice.toLocaleString("ko-KR")}원
                    </p>
                  </div>
                  <div className="rounded-xl bg-red-50 py-3 px-2">
                    <p className="text-[10px] text-red-400 mb-0.5">절약 금액</p>
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
        </div>

        {/* 카테고리 + 유효기간 */}
        <div className="mx-4 mt-3 flex items-center gap-2 flex-wrap">
          <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            {product.category}
          </span>
          <span className="text-xs text-gray-400">
            행사기간: {product.validFrom} ~ {product.validTo}
          </span>
        </div>

        {/* 영양성분 섹션 */}
        {product.category !== "생활용품" && (
          <div className="mx-4 mt-4">
            {product.nutrition ? (
              <NutritionTable nutrition={product.nutrition} />
            ) : (
              <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                <p className="text-xs text-gray-400">영양성분 정보를 준비 중이에요.</p>
              </div>
            )}
          </div>
        )}

        {/* 관련 상품 섹션 */}
        <div className="mt-6">
          <p className="text-sm font-semibold text-gray-900 mb-3 px-4">
            이 카테고리 베스트
          </p>

          {relatedProducts.length === 0 ? (
            <div className="px-4">
              <p className="text-xs text-gray-400">관련 상품이 없습니다.</p>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="mt-3 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium min-h-[44px] active:scale-[0.98] transition-all duration-150"
              >
                다른 상품 보러가기
              </button>
            </div>
          ) : (
            <div
              className="flex gap-3 overflow-x-auto pb-2 px-4"
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
          className="w-full py-3.5 rounded-xl text-base font-bold text-white bg-gray-900 hover:bg-gray-800 active:scale-[0.98] transition-all duration-150 min-h-[52px]"
        >
          장바구니 담기
        </button>
      </div>
    </>
  );
}
