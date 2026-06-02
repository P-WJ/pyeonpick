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
    <main className="min-h-screen bg-gray-50/50 pb-24">
      {/* ⚡ 대형 히어로 비주얼 배너 */}
      <section className="relative overflow-hidden rounded-b-[40px] bg-gradient-to-br from-violet-900 via-indigo-950 to-slate-900 px-5.5 py-12 text-white shadow-lg border border-violet-900/10">
        {/* Subtle neon glowing light background decoration */}
        <div className="absolute -left-16 -top-16 w-52 h-52 bg-purple-600/15 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -right-16 -bottom-16 w-52 h-52 bg-indigo-500/15 rounded-full blur-3xl" />
        
        <div className="mx-auto max-w-7xl relative z-10 space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 px-3.5 py-1.5 text-[9px] font-bold text-violet-300 border border-violet-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping" />
            실시간 5대 편의점 통합 포털
          </span>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            오늘 편의점, 어디서 <br className="sm:hidden" />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-300 bg-clip-text text-transparent">터는 게 이득</span>일까? ⚡
          </h1>
          <p className="text-xs sm:text-sm text-slate-350 font-medium leading-relaxed max-w-xl">
            CU, GS25, 세븐일레븐, 이마트24, 씨스페이스 행사 상품 정보를 1초 만에 매칭합니다. 스마트 보관함에 담고 절약율을 즉시 분석해 보세요.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        {/* 📊 미니 대시보드 통계 카드 */}
        <section className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-gray-150/60 bg-white/70 backdrop-blur-md p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-md transition-all duration-300">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">오늘의 1+1</p>
            <p className="text-base sm:text-lg font-black text-gray-900 mt-1 leading-none">
              1,248<span className="text-[10px] font-semibold text-gray-450 ml-0.5">개 상품</span>
            </p>
            <p className="text-[9px] font-semibold text-rose-500 mt-1">▲ 전일비 +12%</p>
          </div>
          <div className="rounded-2xl border border-gray-150/60 bg-white/70 backdrop-blur-md p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-md transition-all duration-300">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">AI 연산 조합</p>
            <p className="text-base sm:text-lg font-black text-violet-650 mt-1 leading-none">
              512<span className="text-[10px] font-semibold text-violet-400 ml-0.5">개 추천</span>
            </p>
            <p className="text-[9px] font-semibold text-violet-500 mt-1">🤖 최적 혜택 연산</p>
          </div>
          <div className="rounded-2xl border border-gray-150/60 bg-white/70 backdrop-blur-md p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-md transition-all duration-300">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">조합 공유</p>
            <p className="text-base sm:text-lg font-black text-gray-900 mt-1 leading-none">
              4,802<span className="text-[10px] font-semibold text-gray-450 ml-0.5">건 누적</span>
            </p>
            <p className="text-[9px] font-semibold text-emerald-500 mt-1">● 커뮤니티 활성</p>
          </div>
        </section>

        {/* 🔍 스티키 통합 검색 및 필터 패널 */}
        <div className="sticky top-[56px] z-20 -mx-4 px-4 py-3 bg-gray-50/80 backdrop-blur-md border-b border-gray-200/40 shadow-[0_4px_12px_-6px_rgba(0,0,0,0.03)] transition-all">
          <FilterBar
            filters={filters}
            onFilterChange={setFilters}
            onSearch={(text) => setFilters((prev) => ({ ...prev, search: text }))}
          />
        </div>

        {/* AI 추천 배너 */}
        {process.env.NEXT_PUBLIC_ENABLE_AI_RECOMMEND === "true" && (
          <AiBanner onOpenModal={() => setIsAiModalOpen(true)} />
        )}

        {/* 상품 수량 및 안내 인디케이터 */}
        {!isLoadingInitial && !fetchError && products.length > 0 && (
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              행사 상품 조회결과 <span className="font-extrabold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100/30 ml-1">{products.length.toLocaleString()}개</span>
              {hasMore && " 이상"}
            </p>
          </div>
        )}

        {/* 초기 로딩 스켈레톤 그리드 */}
        {isLoadingInitial && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-3xl bg-white border border-gray-100 aspect-[3/4] shadow-[0_2px_8px_rgba(0,0,0,0.01)]" />
            ))}
          </div>
        )}

        {/* 페치 오류 안내 */}
        {fetchError && (
          <div className="rounded-2xl bg-red-50 p-4 text-center text-xs font-bold text-red-650 border border-red-100">
            {fetchError}
          </div>
        )}

        {/* 결과값 없음 엠프티 스테이트 */}
        {showEmptyState && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6 bg-white rounded-3xl border border-gray-150/60 shadow-[0_4px_16px_rgba(0,0,0,0.01)]">
            <div className="mb-4 text-4xl">🔍</div>
            <p className="text-sm font-extrabold text-gray-950">검색 조건에 맞는 상품이 없어요</p>
            <p className="mt-1 text-xs font-semibold text-gray-400">다른 검색어를 입력하시거나 상세 필터 버튼들을 리셋해 보세요</p>
            <button
              type="button"
              onClick={() => setFilters(INITIAL_FILTERS)}
              className="mt-6 rounded-2xl bg-gray-950 px-5.5 py-3 text-xs font-bold text-white hover:bg-gray-800 active:scale-[0.98] transition-all duration-150 shadow-sm"
            >
              필터 전체 초기화
            </button>
          </div>
        )}

        {/* 메인 상품 그리드 */}
        {!isLoadingInitial && products.length > 0 && (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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

        {/* 페이지 하단 추가 로딩 */}
        {isLoadingMore && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-100 border-t-gray-500" />
          </div>
        )}

        {/* 로딩 완료 표시 */}
        {!isLoadingInitial && !hasMore && products.length > 0 && (
          <p className="text-center text-[10px] font-bold text-gray-450 py-6">— 모든 행사 상품을 조회했습니다 —</p>
        )}

        <div ref={sentinelRef} className="h-1" />

        {/* AI 추천 모달 */}
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
