"use client";

import { useState } from "react";
import Link from "next/link";
import type { Product } from "@/domain/entities/product";
import type { Subscription } from "@/infrastructure/repositories/subscription-repository";
import { ProductCard } from "@/app/components/ProductCard";
import type { CartItem } from "@/domain/entities/cart";
import { addToCart } from "@/app/use-cases/cart-manager";
import { STORE_COLORS } from "@/lib/constants";

const CART_STORAGE_KEY = "cvs-cart-v1";
const TOAST_DURATION_MS = 2500;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export default function NotificationsPage() {
  const [email, setEmail] = useState("");
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [matchingProducts, setMatchingProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  function showToast(message: string) {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), TOAST_DURATION_MS);
  }

  function handleAddToCart(product: Product) {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      const cart: CartItem[] = stored ? (JSON.parse(stored) as CartItem[]) : [];
      const updated = addToCart(cart, product);
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updated));
      showToast(`${product.name}을(를) 담았습니다.`);
    } catch {
      showToast("장바구니 추가에 실패했습니다.");
    }
  }

  async function handleSearch() {
    if (!isValidEmail(email)) {
      setError("유효한 이메일 주소를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasSearched(false);

    try {
      const response = await fetch(`/api/subscriptions?email=${encodeURIComponent(email)}`);
      const json = (await response.json()) as { data: Subscription | null; error: string | null };

      if (json.error) throw new Error(json.error);

      setSubscription(json.data);
      setHasSearched(true);

      if (json.data) {
        await fetchMatchingProducts(json.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "조회 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchMatchingProducts(sub: Subscription) {
    const params = new URLSearchParams();
    if (sub.stores.length === 1) params.set("store", sub.stores[0]);
    if (sub.keywords.length > 0) params.set("search", sub.keywords[0]);
    params.set("limit", "48");

    const response = await fetch(`/api/products?${params.toString()}`);
    const json = (await response.json()) as { data: Product[] | null; error: string | null };
    if (json.error) throw new Error(json.error);

    let products = json.data ?? [];

    // 키워드가 여러 개면 클라이언트에서 OR 필터
    if (sub.keywords.length > 1) {
      products = products.filter((p) =>
        sub.keywords.some((kw) => p.name.toLowerCase().includes(kw.toLowerCase()))
      );
    }

    // 편의점이 여러 개면 클라이언트에서 필터
    if (sub.stores.length > 1) {
      products = products.filter((p) => sub.stores.includes(p.store));
    }

    setMatchingProducts(products);
  }

  async function handleDelete() {
    if (!subscription) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/subscriptions?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });
      const json = (await response.json()) as { data: unknown; error: string | null };
      if (json.error) throw new Error(json.error);
      setSubscription(null);
      setMatchingProducts([]);
      showToast("알림 설정이 해제됐습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "해제 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8FAFC" }}>
      {/* 헤더 */}
      <header className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-xl font-extrabold text-blue-700 tracking-tight">
            편픽
          </Link>
          <span className="text-sm font-medium text-gray-500">알림 설정</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        {/* 이메일 검색 */}
        <div className="rounded-2xl bg-white p-5 shadow-sm space-y-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">내 알림 설정 확인</h2>
            <p className="text-xs text-gray-500 mt-0.5">등록한 이메일로 알림 설정과 매칭 상품을 확인하세요</p>
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={isLoading || !isValidEmail(email)}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {isLoading ? "조회 중..." : "확인"}
            </button>
          </div>
          {error && (
            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* 알림 설정 없음 */}
        {hasSearched && !subscription && (
          <div className="rounded-2xl bg-white p-6 shadow-sm text-center space-y-3">
            <p className="text-gray-500 text-sm">알림 설정이 없습니다.</p>
            <Link
              href="/"
              className="inline-block rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
            >
              알림 설정하러 가기
            </Link>
          </div>
        )}

        {/* 알림 설정 카드 */}
        {subscription && (
          <div className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">현재 알림 설정</h3>
                <p className="text-xs text-gray-400 mt-0.5">{subscription.email}</p>
              </div>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isLoading}
                className="text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                알림 해제
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-xs font-medium text-gray-500">편의점</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {subscription.stores.length === 0 ? (
                    <span className="text-xs text-gray-400">전체</span>
                  ) : (
                    subscription.stores.map((store) => {
                      const color = STORE_COLORS[store];
                      return (
                        <span
                          key={store}
                          className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                          style={{ backgroundColor: color.primary }}
                        >
                          {store}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-gray-500">키워드</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {subscription.keywords.length === 0 ? (
                    <span className="text-xs text-gray-400">전체 상품</span>
                  ) : (
                    subscription.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs text-blue-700"
                      >
                        {kw}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 매칭 상품 */}
        {subscription && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-700">
              현재 행사 중인 매칭 상품
              {matchingProducts.length > 0 && (
                <span className="ml-2 text-blue-500">{matchingProducts.length}개</span>
              )}
            </h3>

            {matchingProducts.length === 0 ? (
              <div className="rounded-2xl bg-white p-6 shadow-sm text-center">
                <p className="text-sm text-gray-400">현재 행사 중인 매칭 상품이 없습니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {matchingProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 토스트 */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white shadow-lg">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
