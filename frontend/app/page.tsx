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
    handleAddToCart,
    handleAddMultipleToCart,
    handleToggleWishlist,
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
          return newItems.length > 0 ? [...prev, ...newItems] : prev;
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
    <main className="mx-auto max-w-7xl px-4 py-6 space-y-4">
      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        onSearch={(text) => setFilters((prev) => ({ ...prev, search: text }))}
      />

      {process.env.NEXT_PUBLIC_ENABLE_AI_RECOMMEND === "true" && (
        <AiBanner onOpenModal={() => setIsAiModalOpen(true)} />
      )}

      {isLoadingInitial && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      )}

      {fetchError && (
        <div className="rounded-xl bg-red-50 p-4 text-center text-sm text-red-600 border border-red-100">
          {fetchError}
        </div>
      )}

      {showEmptyState && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 text-5xl">🔍</div>
          <p className="text-base font-semibold text-gray-700">검색 결과가 없습니다</p>
          <p className="mt-1 text-sm text-gray-400">조건에 맞는 상품이 없습니다. 필터를 변경해보세요.</p>
          <button
            type="button"
            onClick={() => setFilters(INITIAL_FILTERS)}
            className="mt-5 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            필터 초기화
          </button>
        </div>
      )}

      {!isLoadingInitial && products.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
        <div className="flex justify-center py-6">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        </div>
      )}

      {!isLoadingInitial && !hasMore && products.length > 0 && (
        <p className="text-center text-xs text-gray-400 py-4">모든 상품을 불러왔습니다.</p>
      )}

      <div ref={sentinelRef} className="h-1" />

      {process.env.NEXT_PUBLIC_ENABLE_AI_RECOMMEND === "true" && isAiModalOpen && (
        <AiRecommendModal
          allProducts={products}
          onClose={() => setIsAiModalOpen(false)}
          onAddToCart={handleAddMultipleToCart}
        />
      )}
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
