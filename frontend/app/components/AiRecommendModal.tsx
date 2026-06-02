"use client";

import { useState } from "react";
import type { Product, Store } from "@/domain/entities/product";
import type { RecommendationCombination, RecommendationResult } from "@/domain/entities/recommendation";
import { STORES, STORE_COLORS } from "@/lib/constants";

const MIN_BUDGET_INPUT = 1000;
const MAX_BUDGET_INPUT = 10_000_000;
const DEFAULT_BUDGET = 10000;

interface AiRecommendModalProps {
  allProducts: Product[];
  onClose: () => void;
  onAddToCart: (products: Product[]) => void;
}

export function AiRecommendModal({
  allProducts,
  onClose,
  onAddToCart,
}: AiRecommendModalProps) {
  const [budget, setBudget] = useState<number>(DEFAULT_BUDGET);
  const [selectedStores, setSelectedStores] = useState<Store[]>([]);
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [recommendationResult, setRecommendationResult] =
    useState<RecommendationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [addedCombinationIndexes, setAddedCombinationIndexes] = useState<
    Set<number>
  >(new Set());

  function toggleStoreSelection(store: Store) {
    setSelectedStores((previous) =>
      previous.includes(store)
        ? previous.filter((s) => s !== store)
        : [...previous, store]
    );
  }

  async function handleRequestRecommendation() {
    if (budget < MIN_BUDGET_INPUT) {
      setErrorMessage(
        `예산은 ${MIN_BUDGET_INPUT.toLocaleString("ko-KR")}원 이상 입력해주세요.`
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setRecommendationResult(null);
    setAddedCombinationIndexes(new Set());

    try {
      const requestBody = {
        budget,
        stores: selectedStores.length > 0 ? selectedStores : undefined,
        userPrompt: userPrompt.trim() || undefined,
      };

      const response = await fetch("/api/ai/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const json = (await response.json()) as {
        data: RecommendationResult | null;
        error: string | null;
      };

      if (json.error || !json.data) {
        throw new Error(json.error ?? "추천 결과를 받아오지 못했습니다.");
      }

      setRecommendationResult(json.data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function resolveProductsFromIds(productIds: number[]): Product[] {
    return productIds.flatMap((id) => {
      const found = allProducts.find((product) => product.id === id);
      return found ? [found] : [];
    });
  }

  function handleAddCombinationToCart(
    combination: RecommendationCombination,
    combinationIndex: number
  ) {
    const products = resolveProductsFromIds(combination.products);
    if (products.length === 0) return;

    onAddToCart(products);
    setAddedCombinationIndexes((previous) => new Set([...previous, combinationIndex]));
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div
          className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          {/* 헤더 */}
          <div
            className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl px-6 py-4"
            style={{
              background:
                "linear-gradient(135deg, #7C3AED 0%, #A855F7 50%, #C084FC 100%)",
            }}
          >
            <div>
              <h2 className="text-lg font-bold text-white">AI 조합 추천</h2>
              <p className="mt-0.5 text-xs text-purple-200">
                행사 혜택을 극대화하는 최적 조합을 찾아드려요
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-purple-200 hover:bg-white/20 hover:text-white transition-colors"
              aria-label="모달 닫기"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* 예산 입력 */}
            <div>
              <label
                htmlFor="budget-input"
                className="block text-sm font-semibold text-gray-700 mb-1.5"
              >
                예산
              </label>
              <div className="relative">
                <input
                  id="budget-input"
                  type="number"
                  min={MIN_BUDGET_INPUT}
                  max={MAX_BUDGET_INPUT}
                  step={500}
                  value={budget}
                  onChange={(event) => setBudget(Number(event.target.value))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-10 text-sm font-medium text-gray-900 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                  placeholder="예산을 입력하세요"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  원
                </span>
              </div>
            </div>

            {/* 편의점 필터 */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                편의점 선택{" "}
                <span className="text-xs font-normal text-gray-400">
                  (선택 안 하면 전체)
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {STORES.map((store) => {
                  const isSelected = selectedStores.includes(store);
                  const storeColors = STORE_COLORS[store];
                  return (
                    <button
                      key={store}
                      type="button"
                      onClick={() => toggleStoreSelection(store)}
                      className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-all"
                      style={
                        isSelected
                          ? {
                              backgroundColor: storeColors.primary,
                              borderColor: storeColors.primary,
                              color: "#fff",
                            }
                          : {
                              backgroundColor: "#fff",
                              borderColor: "#E5E7EB",
                              color: "#6B7280",
                            }
                      }
                    >
                      {store}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 사용자 요청 */}
            <div>
              <label
                htmlFor="user-prompt-input"
                className="block text-sm font-semibold text-gray-700 mb-1.5"
              >
                원하는 조합 말해주세요
                <span className="ml-1.5 text-xs font-normal text-gray-400">(선택)</span>
              </label>
              <textarea
                id="user-prompt-input"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                maxLength={200}
                rows={2}
                placeholder="예: 매운 거 좋아해요, 혼술하고 싶어요, 다이어트 중이에요..."
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
              />
              <p className="mt-1 text-right text-xs text-gray-400">{userPrompt.length}/200</p>
            </div>

            {/* 추천받기 버튼 */}
            <button
              type="button"
              onClick={handleRequestRecommendation}
              disabled={isLoading}
              className="w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background:
                  "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)",
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  AI가 분석 중...
                </span>
              ) : (
                "추천받기"
              )}
            </button>

            {/* 오류 메시지 */}
            {errorMessage && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                {errorMessage}
              </div>
            )}

            {/* 추천 결과 */}
            {recommendationResult && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-800">
                  추천 조합 {recommendationResult.combinations.length}개
                </h3>
                {recommendationResult.combinations.map(
                  (combination, combinationIndex) => {
                    const resolvedProducts = resolveProductsFromIds(
                      combination.products
                    );
                    const isAlreadyAdded =
                      addedCombinationIndexes.has(combinationIndex);

                    return (
                      <RecommendationCombinationCard
                        key={combinationIndex}
                        combination={combination}
                        resolvedProducts={resolvedProducts}
                        isAlreadyAdded={isAlreadyAdded}
                        onAddToCart={() =>
                          handleAddCombinationToCart(combination, combinationIndex)
                        }
                      />
                    );
                  }
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

interface RecommendationCombinationCardProps {
  combination: RecommendationCombination;
  resolvedProducts: Product[];
  isAlreadyAdded: boolean;
  onAddToCart: () => void;
}

function RecommendationCombinationCard({
  combination,
  resolvedProducts,
  isAlreadyAdded,
  onAddToCart,
}: RecommendationCombinationCardProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
      {/* 조합 제목 + 총 가격 */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-bold text-gray-900">{combination.title}</h4>
        <span className="shrink-0 text-sm font-bold text-purple-700">
          {combination.totalPrice.toLocaleString("ko-KR")}원
        </span>
      </div>

      {/* 추천 이유 */}
      <p className="text-xs text-gray-500 leading-relaxed">{combination.reason}</p>

      {/* 상품 목록 */}
      {resolvedProducts.length > 0 && (
        <div className="space-y-1.5">
          {resolvedProducts.map((product) => {
            const storeColors = STORE_COLORS[product.store];
            return (
              <div
                key={product.id}
                className="flex items-center justify-between rounded-lg bg-white border border-gray-100 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{
                      backgroundColor: storeColors.secondary,
                      color: storeColors.primary,
                    }}
                  >
                    {product.store}
                  </span>
                  <span className="truncate text-xs font-medium text-gray-800">
                    {product.name}
                  </span>
                </div>
                <span className="shrink-0 ml-2 text-xs font-semibold text-gray-700">
                  {product.price.toLocaleString("ko-KR")}원
                </span>
              </div>
            );
          })}

          {combination.products.length > resolvedProducts.length && (
            <p className="text-xs text-gray-400 pl-1">
              {combination.products.length - resolvedProducts.length}개 상품은
              현재 목록에서 찾을 수 없습니다.
            </p>
          )}
        </div>
      )}

      {/* 장바구니 담기 버튼 */}
      <button
        type="button"
        onClick={onAddToCart}
        disabled={isAlreadyAdded || resolvedProducts.length === 0}
        className="w-full rounded-lg py-2 text-xs font-bold transition-all"
        style={
          isAlreadyAdded
            ? {
                backgroundColor: "#F3E8FF",
                color: "#7C3AED",
                cursor: "default",
              }
            : {
                background:
                  "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)",
                color: "#fff",
              }
        }
      >
        {isAlreadyAdded
          ? "담기 완료"
          : resolvedProducts.length === 0
          ? "담을 수 있는 상품 없음"
          : `장바구니에 ${resolvedProducts.length}개 담기`}
      </button>
    </div>
  );
}
