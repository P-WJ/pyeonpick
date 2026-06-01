"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Product } from "@/domain/entities/product";
import type { CartItem } from "@/domain/entities/cart";
import { buildShareUrl, calculateSavings } from "@/domain/use-cases/cart";
import {
  addToCart,
  updateQuantity,
  removeItem,
  calculateTotalPrice,
} from "@/app/use-cases/cart-manager";
import Link from "next/link";
import { FilterBar, type ActiveFilters } from "./components/FilterBar";
import { ProductCard } from "./components/ProductCard";
import { CartDrawer } from "./components/CartDrawer";
import { AiBanner } from "./components/AiBanner";
import { SubscribeForm } from "./components/SubscribeForm";
import { PRODUCTS_PAGE_LIMIT } from "@/lib/constants";

const CART_STORAGE_KEY = "cvs-cart-v1";
const SKELETON_COUNT = 10;
const TOAST_DURATION_MS = 2500;

const INITIAL_FILTERS: ActiveFilters = {
  store: "",
  eventType: "",
  category: "",
  search: "",
};

function buildSearchParams(
  filters: ActiveFilters,
  page: number
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.store) params.set("store", filters.store);
  if (filters.eventType) params.set("eventType", filters.eventType);
  if (filters.category) params.set("category", filters.category);
  if (filters.search) params.set("search", filters.search);
  params.set("page", String(page));
  params.set("limit", String(PRODUCTS_PAGE_LIMIT));
  return params;
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ActiveFilters>(INITIAL_FILTERS);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);

  // 장바구니 로컬스토리지 복원
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) setCartItems(JSON.parse(stored) as CartItem[]);
    } catch {
      // 손상된 데이터는 무시
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  // 초기 & 추가 페이지 로드
  const fetchPage = useCallback(
    async (targetPage: number, isInitialLoad: boolean) => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;

      if (isInitialLoad) {
        setIsLoadingInitial(true);
      } else {
        setIsLoadingMore(true);
      }
      setFetchError(null);

      try {
        const params = buildSearchParams(filters, targetPage);
        const response = await fetch(`/api/products?${params.toString()}`);
        const json = (await response.json()) as {
          data: Product[] | null;
          error: string | null;
          meta: { hasMore: boolean } | null;
        };
        if (json.error) throw new Error(json.error);

        const newProducts = json.data ?? [];
        const nextHasMore = json.meta?.hasMore ?? false;

        if (isInitialLoad) {
          setProducts(newProducts);
        } else {
          setProducts((prev) => [...prev, ...newProducts]);
        }
        setHasMore(nextHasMore);
        setPage(targetPage);
      } catch (error) {
        setFetchError(
          error instanceof Error ? error.message : "상품을 불러오지 못했습니다."
        );
      } finally {
        if (isInitialLoad) {
          setIsLoadingInitial(false);
        } else {
          setIsLoadingMore(false);
        }
        isLoadingRef.current = false;
      }
    },
    [filters]
  );

  // 필터 변경 시 초기화 후 1페이지 재조회
  useEffect(() => {
    setProducts([]);
    setPage(1);
    setHasMore(true);
    fetchPage(1, true);
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // Intersection Observer — sentinel 감지 시 다음 페이지 로드
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && hasMore && !isLoadingRef.current) {
          fetchPage(page + 1, false);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, page, fetchPage]);

  function showToast(message: string) {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), TOAST_DURATION_MS);
  }

  function handleAddToCart(product: Product) {
    setCartItems((prev) => addToCart(prev, product));
    showToast(`${product.name}을(를) 담았습니다.`);
  }

  function handleUpdateQuantity(productId: number, quantity: number) {
    setCartItems((prev) => updateQuantity(prev, productId, quantity));
  }

  function handleRemoveItem(productId: number) {
    setCartItems((prev) => removeItem(prev, productId));
  }

  function copyShareUrl() {
    const url = buildShareUrl(cartItems);
    navigator.clipboard
      .writeText(url)
      .then(() => showToast("공유 링크가 복사됐습니다."));
  }

  function handleFilterChange(nextFilters: ActiveFilters) {
    setFilters(nextFilters);
  }

  function handleSearch(searchText: string) {
    setFilters((prev) => ({ ...prev, search: searchText }));
  }

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = calculateTotalPrice(cartItems);
  const totalSavings = calculateSavings(cartItems);

  const showEmptyState =
    !isLoadingInitial && !fetchError && products.length === 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8FAFC" }}>
      {/* 헤더 */}
      <header className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <span className="text-xl font-extrabold text-blue-700 tracking-tight">
              편픽
            </span>
            <span className="ml-2 text-xs text-gray-400 font-medium hidden sm:inline">
              편의점 행사 비교
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* 알림 구독 버튼 */}
            <button
              type="button"
              onClick={() => setIsSubscribeOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
              aria-label="알림 구독"
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
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>

            {/* 장바구니 버튼 */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              <span className="hidden sm:inline">장바구니</span>
              {totalCartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-4">
        {/* 필터 */}
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onSearch={handleSearch}
        />

        {/* AI 추천 배너 — v1.2 자리 확보 */}
        <AiBanner onToast={showToast} />

        {/* 초기 로딩 스켈레톤 */}
        {isLoadingInitial && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
              <div
                key={index}
                className="h-64 animate-pulse rounded-xl bg-gray-200"
              />
            ))}
          </div>
        )}

        {/* 오류 */}
        {fetchError && (
          <div className="rounded-xl bg-red-50 p-4 text-center text-sm text-red-600 border border-red-100">
            {fetchError}
          </div>
        )}

        {/* 빈 결과 */}
        {showEmptyState && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-3 text-5xl">검색 결과 없음</div>
            <p className="text-sm font-medium text-gray-500">
              조건에 맞는 상품이 없습니다.
            </p>
            <p className="mt-1 text-xs text-gray-400">필터를 변경해보세요.</p>
          </div>
        )}

        {/* 상품 목록 */}
        {!isLoadingInitial && products.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}

        {/* 추가 로딩 스피너 */}
        {isLoadingMore && (
          <div className="flex justify-center py-6">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          </div>
        )}

        {/* 더 이상 상품 없음 표시 */}
        {!isLoadingInitial && !hasMore && products.length > 0 && (
          <p className="text-center text-xs text-gray-400 py-4">
            모든 상품을 불러왔습니다.
          </p>
        )}

        {/* Intersection Observer sentinel */}
        <div ref={sentinelRef} className="h-1" />
      </main>

      {/* 장바구니 드로어 */}
      <CartDrawer
        isOpen={isCartOpen}
        items={cartItems}
        totalPrice={totalPrice}
        totalSavings={totalSavings}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onShare={copyShareUrl}
      />

      {/* 알림 구독 모달 */}
      {isSubscribeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setIsSubscribeOpen(false)}
        >
          <div
            className="w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <SubscribeForm />
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white shadow-lg">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
