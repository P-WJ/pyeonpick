"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Product } from "@/domain/entities/product";
import type { CartItem } from "@/domain/entities/cart";
import { buildShareUrl, calculateSavings } from "@/domain/use-cases/cart";
import {
  addToCart,
  updateQuantity,
  removeItem,
  calculateTotalPrice,
} from "@/app/use-cases/cart-manager";
import { FilterBar, type ActiveFilters } from "./components/FilterBar";
import { Header } from "./components/Header";
import { ProductCard } from "./components/ProductCard";
import { CartDrawer } from "./components/CartDrawer";
import { AiBanner } from "./components/AiBanner";
import { AiRecommendModal } from "./components/AiRecommendModal";
import { SubscribeForm } from "./components/SubscribeForm";
import { PRODUCTS_PAGE_LIMIT } from "@/lib/constants";

const CART_STORAGE_KEY = "cvs-cart-v1";
const WISHLIST_STORAGE_KEY = "cvs-wishlist-v1";
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ActiveFilters>(INITIAL_FILTERS);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [wishlistIds, setWishlistIds] = useState<number[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

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

  // 찜하기 로컬스토리지 복원
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (stored) setWishlistIds(JSON.parse(stored) as number[]);
    } catch {
      // 손상된 데이터는 무시
    }
  }, []);

  // 공유 링크 자동 불러오기 (?cart=id1,id2,id3)
  useEffect(() => {
    const cartParam = searchParams.get("cart");
    if (!cartParam || cartParam.trim() === "") return;

    const sharedIds = cartParam
      .split(",")
      .map((segment: string) => Number(segment.trim()))
      .filter((id: number) => !isNaN(id) && id > 0);

    if (sharedIds.length === 0) return;

    fetch(`/api/products/by-ids?ids=${sharedIds.join(",")}`)
      .then((response) => response.json())
      .then((json: { data: Product[] | null; error: string | null }) => {
        if (json.error || !json.data) return;

        setCartItems((prev) => {
          const existingIds = new Set(prev.map((item) => item.product.id));
          const newItems: CartItem[] = json.data!
            .filter((product) => !existingIds.has(product.id))
            .map((product) => ({ product, quantity: 1 }));
          return newItems.length > 0 ? [...prev, ...newItems] : prev;
        });

        // URL에서 ?cart= 파라미터 제거
        const cleanParams = new URLSearchParams(searchParams.toString());
        cleanParams.delete("cart");
        const cleanQuery = cleanParams.toString();
        router.replace(cleanQuery ? `/?${cleanQuery}` : "/");
      })
      .catch(() => {
        // 공유 링크 로드 실패는 조용히 무시
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistIds));
  }, [wishlistIds]);

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

  function handleAddMultipleToCart(productsToAdd: Product[]) {
    setCartItems((prev) => {
      let updatedCart = prev;
      for (const product of productsToAdd) {
        updatedCart = addToCart(updatedCart, product);
      }
      return updatedCart;
    });
    showToast(`${productsToAdd.length}개 상품을 장바구니에 담았습니다.`);
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

  function handleToggleWishlist(product: Product) {
    setWishlistIds((prev) => {
      if (prev.includes(product.id)) {
        return prev.filter((id) => id !== product.id);
      }
      return [...prev, product.id];
    });
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
      <Header
        onSubscribeOpen={() => setIsSubscribeOpen(true)}
        onCartOpen={() => setIsCartOpen(true)}
        cartCount={totalCartCount}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-4">
        {/* 필터 */}
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onSearch={handleSearch}
        />

        {/* AI 추천 배너 — NEXT_PUBLIC_ENABLE_AI_RECOMMEND 플래그가 있을 때만 노출 */}
        {process.env.NEXT_PUBLIC_ENABLE_AI_RECOMMEND === "true" && (
          <AiBanner onOpenModal={() => setIsAiModalOpen(true)} />
        )}

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
            <div className="mb-4 text-5xl">🔍</div>
            <p className="text-base font-semibold text-gray-700">
              검색 결과가 없습니다
            </p>
            <p className="mt-1 text-sm text-gray-400">
              조건에 맞는 상품이 없습니다. 필터를 변경해보세요.
            </p>
            <button
              type="button"
              onClick={() => setFilters(INITIAL_FILTERS)}
              className="mt-5 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              필터 초기화
            </button>
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
                isWishlisted={wishlistIds.includes(product.id)}
                onToggleWishlist={handleToggleWishlist}
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

      {/* AI 추천 모달 — NEXT_PUBLIC_ENABLE_AI_RECOMMEND 플래그가 있을 때만 노출 */}
      {process.env.NEXT_PUBLIC_ENABLE_AI_RECOMMEND === "true" && isAiModalOpen && (
        <AiRecommendModal
          allProducts={products}
          onClose={() => setIsAiModalOpen(false)}
          onAddToCart={handleAddMultipleToCart}
        />
      )}

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
