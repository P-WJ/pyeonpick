"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Product, Nutrition } from "@/domain/entities/product";
import type { CartItem } from "@/domain/entities/cart";
import { STORE_COLORS } from "@/lib/constants";
import { EventBadge } from "@/app/components/EventBadge";
import { calculatePriceBenefit } from "@/domain/use-cases/price";

const CART_STORAGE_KEY = "cvs-cart-v1";
const RECENTLY_VIEWED_KEY = "cvs-recently-viewed-v1";
const RECENTLY_VIEWED_MAX_COUNT = 20;

// Elegant inline SVG data URI as the primary fallback instead of raw broken image
const PLACEHOLDER_IMAGE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23f9fafb"/><stop offset="100%" stop-color="%23f3f4f6"/></linearGradient></defs><rect width="100" height="100" fill="url(%23g)"/><circle cx="50" cy="45" r="14" fill="%23e5e7eb" opacity="0.8"/><path d="M32 72 h36 v-22 h-36 z" fill="%23d1d5db" opacity="0.6"/><path d="M42 50 h16 v-6 h-16 z" fill="%239ca3af" opacity="0.5"/></svg>`;

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
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-sm font-extrabold text-gray-900">영양성분</p>
        {nutrition.serving_size && (
          <p className="text-xs text-gray-400 mt-1 font-medium">
            1회 제공량: {nutrition.serving_size}
          </p>
        )}
      </div>

      {nutrition.calories !== undefined && (
        <div className="px-5 py-4.5 border-b border-gray-50 flex items-baseline justify-between">
          <span className="text-sm font-bold text-gray-500">열량</span>
          <span className="text-3xl font-black text-gray-950">
            {nutrition.calories}
            <span className="text-xs font-semibold text-gray-450 ml-1">kcal</span>
          </span>
        </div>
      )}

      {availableNutrients.length > 0 && (
        <table className="w-full text-xs font-semibold">
          <tbody>
            {availableNutrients.map((key) => (
              <tr key={key} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3.5 text-gray-500">
                  {NUTRITION_LABELS[key]}
                </td>
                <td className="px-5 py-3.5 text-right text-gray-900 font-bold">
                  {nutrition[key]}
                  <span className="text-[10px] text-gray-400 ml-0.5">{NUTRITION_UNITS[key]}</span>
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
      className="min-w-[130px] w-[130px] flex-shrink-0 flex flex-col gap-2 rounded-2xl bg-white border border-gray-100 p-3 text-left transition-all duration-300 hover:-translate-y-1 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] active:scale-[0.98] group"
    >
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-gray-50/70 border border-gray-50 flex items-center justify-center">
        <Image
          src={product.imageUrl || PLACEHOLDER_IMAGE}
          alt={product.name}
          fill
          className="object-contain p-2.5 transition-transform duration-300 group-hover:scale-[1.04]"
          unoptimized={!product.imageUrl}
        />
      </div>
      <div className="shadow-sm rounded overflow-hidden w-fit">
        <EventBadge eventType={product.eventType} className="text-[9px] px-1.5 py-0.5" />
      </div>
      <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-snug min-h-[2rem]">
        {product.name}
      </p>
      <div className="flex items-center gap-1.5 mt-auto pt-1">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: storeColors.primary }}
        />
        <p className="text-xs font-extrabold text-gray-900">
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
      <main className="max-w-2xl mx-auto pb-28 bg-gray-50/50 min-h-screen">
        {/* 뒤로가기 바 */}
        <div className="flex items-center gap-3 px-4 py-3.5 bg-white border-b border-gray-100/50">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-900 active:scale-95 transition-all duration-150 flex-shrink-0 border border-gray-100/50 bg-white"
            aria-label="뒤로가기"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="text-base font-extrabold text-gray-900">상품 상세</span>
        </div>

        {/* 이미지 영역 */}
        <div className="relative w-full aspect-square bg-white border-b border-gray-100/40 flex items-center justify-center">
          <Image
            src={product.imageUrl || PLACEHOLDER_IMAGE}
            alt={product.name}
            fill
            className="object-contain p-12 transition-transform duration-500 hover:scale-[1.02]"
            unoptimized={!product.imageUrl}
            priority
          />
        </div>

        {/* 상품 정보 */}
        <div className="px-5 pt-6 pb-5 bg-white border-b border-gray-100/50 space-y-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.02)]">
          {/* 편의점 뱃지 + 행사 뱃지 */}
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
              style={{
                backgroundColor: storeColors.secondary,
                color: storeColors.text,
              }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: storeColors.primary }}
              />
              {product.store}
            </span>
            <div className="shadow-sm rounded overflow-hidden">
              <EventBadge eventType={product.eventType} />
            </div>
          </div>

          {/* 상품명 */}
          <h1 className="text-xl font-extrabold text-gray-900 leading-snug">
            {product.name}
          </h1>

          {/* 가격 행 */}
          <div className="flex items-end justify-between pt-1">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">표시 가격</p>
              <p className="text-3xl font-black text-gray-950 leading-none">
                {product.price.toLocaleString("ko-KR")}
                <span className="text-sm font-semibold text-gray-400 ml-1">원</span>
              </p>
            </div>
            {benefit.savingsRate > 0 && (
              <span className="rounded-full bg-rose-50 border border-rose-100 px-3.5 py-1.5 text-xs font-bold text-rose-500 shadow-sm animate-pulse-slow">
                {benefit.savingsRate}% 절약
              </span>
            )}
          </div>
        </div>

        {/* 혜택 카드 */}
        <div className="mx-4 mt-4.5">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
              행사 혜택 정보
            </p>

            {benefit.savings > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-bold text-gray-800 bg-gray-50/80 rounded-xl px-3.5 py-2.5 border border-gray-100/30">
                  ⚡ {benefit.benefitDescription}
                </p>
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="rounded-2xl bg-gray-50/50 border border-gray-100/50 py-3.5 px-2">
                    <p className="text-[10px] font-bold text-gray-400 mb-1">최소 구매</p>
                    <p className="text-base font-extrabold text-gray-900">
                      {benefit.requiredQuantity}개
                    </p>
                  </div>
                  <div className="rounded-2xl bg-gray-50/50 border border-gray-100/50 py-3.5 px-2">
                    <p className="text-[10px] font-bold text-gray-400 mb-1">개당 단가</p>
                    <p className="text-base font-extrabold text-gray-900">
                      {benefit.unitPrice.toLocaleString("ko-KR")}원
                    </p>
                  </div>
                  <div className="rounded-2xl bg-rose-50/40 border border-rose-100/40 py-3.5 px-2">
                    <p className="text-[10px] font-bold text-rose-450 mb-1">절약 금액</p>
                    <p className="text-base font-black text-rose-500">
                      {benefit.savings.toLocaleString("ko-KR")}원
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm font-bold text-gray-600 bg-gray-50/85 rounded-xl px-4 py-3 border border-gray-100/40">
                {benefit.benefitDescription}
              </p>
            )}
          </div>
        </div>

        {/* 카테고리 + 유효기간 */}
        <div className="mx-5 mt-4 flex items-center gap-2.5 flex-wrap">
          <span className="inline-block rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 border border-gray-200/20">
            {product.category}
          </span>
          <span className="text-xs font-bold text-gray-400">
            행사기간: {product.validFrom} ~ {product.validTo}
          </span>
        </div>

        {/* 영양성분 섹션 */}
        {product.category !== "생활용품" && (
          <div className="mx-4 mt-4.5">
            {product.nutrition ? (
              <NutritionTable nutrition={product.nutrition} />
            ) : (
              <div className="rounded-2xl bg-white border border-gray-100 p-5 text-center shadow-[0_4px_12px_rgba(0,0,0,0.01)]">
                <p className="text-xs font-semibold text-gray-400">영양성분 정보를 준비 중이에요.</p>
              </div>
            )}
          </div>
        )}

        {/* 관련 상품 섹션 */}
        <div className="mt-7">
          <p className="text-sm font-extrabold text-gray-900 mb-3.5 px-5">
            이 카테고리 추천 상품
          </p>

          {relatedProducts.length === 0 ? (
            <div className="px-5">
              <div className="rounded-2xl bg-white border border-gray-100 p-6 text-center">
                <p className="text-xs font-semibold text-gray-400">관련 상품이 없습니다.</p>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="mt-3.5 px-4.5 py-2.5 bg-gray-950 text-white rounded-xl text-xs font-bold min-h-[40px] active:scale-[0.98] transition-all duration-150 shadow-sm"
                >
                  다른 상품 보러가기
                </button>
              </div>
            </div>
          ) : (
            <div
              className="flex gap-3 overflow-x-auto pb-4 px-5 scrollbar-hide"
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
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-gray-100/80 px-4 py-3.5 max-w-2xl mx-auto flex gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <button
          type="button"
          onClick={handleAddToCart}
          className="w-full py-4 rounded-2xl text-sm font-extrabold text-white bg-gray-950 hover:bg-gray-800 active:scale-[0.98] transition-all duration-200 min-h-[50px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-lg"
        >
          장바구니 담기
        </button>
      </div>
    </>
  );
}
