"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Product } from "@/domain/entities/product";
import { FilterBar, type ActiveFilters } from "./components/FilterBar";
import { ProductCard } from "./components/ProductCard";
import { AiBanner } from "./components/AiBanner";
import { AiRecommendModal } from "./components/AiRecommendModal";
import { PRODUCTS_PAGE_LIMIT } from "@/lib/constants";
import { useCart } from "@/app/contexts/cart-context";

const SKELETON_COUNT = 10;

const INITIAL_FILTERS: ActiveFilters = {
  store: "",
  eventType: "",
  category: "",
  search: "",
};

function buildSearchParams(filters: ActiveFilters, page: number): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.store) params.set("store", filters.store);
  if (filters.eventType) params.set("eventType", filters.eventType);
  if (filters.category) params.set("category", filters.category);
  if (filters.search) params.set("search", filters.search);
  params.set("page", String(page));
  params.set("limit", String(PRODUCTS_PAGE_LIMIT));
  return params;
}

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    wishlistIds,
    setCartItems,
    setIsCartOpen,
    handleAddToCart,
    handleAddMultipleToCart,
    handleToggleWishlist,
    showToast,
  } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ActiveFilters>(INITIAL_FILTERS);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);

  // 공유 링크 자동 불러오기 (?cart=id1,id2,id3)
  useEffect(() => {
    const cartParam = searchParams.get("cart");
    if (!cartParam || cartParam.trim() === "") return;

    const sharedIds = cartParam
      .split(",")
      .map((s: string) => Number(s.trim()))
      .filter((id: number) => !isNaN(id) && id > 0);

    if (sharedIds.length === 0) return;

    fetch(`/api/products/by-ids?ids=${sharedIds.join(",")}`)
      .then((r) => r.json())
      .then((json: { data: Product[] | null; error: string | null }) => {
        if (json.error || !json.data) return;
        setCartItems((prev) => {
          const existingIds = new Set(prev.map((item) => item.product.id));
          const newItems = json
            .data!.filter((p) => !existingIds.has(p.id))
            .map((p) => ({ product: p, quantity: 1 }));
          if (newItems.length > 0) {
            showToast(`🛒 공유된 조합 ${newItems.length}개가 장바구니에 담겼어요!`);
            setIsCartOpen(true);
            return [...prev, ...newItems];
          }
          return prev;
        });
        const cleanParams = new URLSearchParams(searchParams.toString());
        cleanParams.delete("cart");
        const cleanQuery = cleanParams.toString();
        router.replace(cleanQuery ? `/?${cleanQuery}` : "/");
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPage = useCallback(
    async (targetPage: number, isInitialLoad: boolean) => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;

      if (isInitialLoad) setIsLoadingInitial(true);
      else setIsLoadingMore(true);
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
        if (isInitialLoad) setProducts(newProducts);
        else setProducts((prev) => [...prev, ...newProducts]);
        setHasMore(json.meta?.hasMore ?? false);
        setPage(targetPage);
      } catch (error) {
        setFetchError(error instanceof Error ? error.message : "상품을 불러오지 못했습니다.");
      } finally {
        if (isInitialLoad) setIsLoadingInitial(false);
        else setIsLoadingMore(false);
        isLoadingRef.current = false;
      }
    },
    [filters]
  );

  useEffect(() => {
    setProducts([]);
    setPage(1);
    setHasMore(true);
    fetchPage(1, true);
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoadingRef.current) {
          fetchPage(page + 1, false);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, page, fetchPage]);

  const showEmptyState = !isLoadingInitial && !fetchError && products.length === 0;

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="mx-auto max-w-7xl px-4 py-4 space-y-3">
        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          onSearch={(text) => setFilters((prev) => ({ ...prev, search: text }))}
        />

        {process.env.NEXT_PUBLIC_ENABLE_AI_RECOMMEND === "true" && (
          <AiBanner onOpenModal={() => setIsAiModalOpen(true)} />
        )}

        {/* 상품 수 표시 */}
        {!isLoadingInitial && !fetchError && products.length > 0 && (
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-gray-400">
              행사 상품 <span className="font-semibold text-gray-700">{products.length.toLocaleString()}개</span>
              {hasMore && " 이상"}
            </p>
          </div>
        )}

        {isLoadingInitial && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-white aspect-[3/4] shadow-[0_1px_4px_rgba(0,0,0,0.06)]" />
            ))}
          </div>
        )}

        {fetchError && (
          <div className="rounded-2xl bg-red-50 p-4 text-center text-sm text-red-600 border border-red-100">
            {fetchError}
          </div>
        )}

        {showEmptyState && (
          <div className="flex flex-col items-center justify-center py-24 text-center px-8">
            <div className="mb-4 text-5xl">🔍</div>
            <p className="text-base font-semibold text-gray-900">검색 결과가 없어요</p>
            <p className="mt-1 text-sm text-gray-400">조건에 맞는 상품이 없습니다. 필터를 변경해보세요.</p>
            <button
              type="button"
              onClick={() => setFilters(INITIAL_FILTERS)}
              className="mt-5 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 active:scale-[0.98] transition-all duration-150"
            >
              필터 초기화
            </button>
          </div>
        )}

        {!isLoadingInitial && products.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                isWishlisted={wishlistIds.includes(product.id)}
                onToggleWishlist={handleToggleWishlist}
              />
            ))}
          </div>
        )}

        {isLoadingMore && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500" />
          </div>
        )}

        {!isLoadingInitial && !hasMore && products.length > 0 && (
          <p className="text-center text-xs text-gray-400 py-4">— 모든 상품을 불러왔습니다 —</p>
        )}

        <div ref={sentinelRef} className="h-1" />

        {process.env.NEXT_PUBLIC_ENABLE_AI_RECOMMEND === "true" && isAiModalOpen && (
          <AiRecommendModal
            allProducts={products}
            onClose={() => setIsAiModalOpen(false)}
            onAddToCart={handleAddMultipleToCart}
          />
        )}
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}
