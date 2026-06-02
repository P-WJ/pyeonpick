"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Product } from "@/domain/entities/product";
import type { Subscription } from "@/infrastructure/repositories/subscription-repository";
import { ProductCard } from "@/app/components/ProductCard";
import type { CartItem } from "@/domain/entities/cart";
import { addToCart } from "@/app/use-cases/cart-manager";
import { STORE_COLORS } from "@/lib/constants";
import { usePushNotification } from "@/app/hooks/usePushNotification";
import type { PushSubscriptionSettings } from "@/app/hooks/usePushNotification";
import { STORES } from "@/lib/constants";
import type { Store } from "@/domain/entities/product";

const CART_STORAGE_KEY = "cvs-cart-v1";
const TOAST_DURATION_MS = 2500;
const NOTIFICATION_SCHEDULE_LABEL = "매월 1일·15일 새 행사 상품 알림";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

// ─── 웹 푸시 섹션 ─────────────────────────────────────────────────────────────

function WebPushSection() {
  const {
    isSupported,
    permission,
    isSubscribed,
    subscribe,
    unsubscribe,
    fetchCurrentSettings,
  } = usePushNotification();

  const [currentSettings, setCurrentSettings] = useState<PushSubscriptionSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showSubscribeForm, setShowSubscribeForm] = useState(false);
  const [selectedStores, setSelectedStores] = useState<Store[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function showFeedback(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), TOAST_DURATION_MS);
  }

  // 구독 중이면 현재 설정 로드
  useEffect(() => {
    if (!isSubscribed) return;
    setIsLoadingSettings(true);
    fetchCurrentSettings()
      .then((settings) => {
        setCurrentSettings(settings);
        if (settings) {
          setSelectedStores(settings.stores as Store[]);
          setKeywordInput(settings.keywords.join(", "));
        }
      })
      .finally(() => setIsLoadingSettings(false));
  }, [isSubscribed, fetchCurrentSettings]);

  function toggleStore(store: Store) {
    setSelectedStores((prev) =>
      prev.includes(store) ? prev.filter((s) => s !== store) : [...prev, store]
    );
  }

  async function handleSubscribe() {
    setIsActionLoading(true);
    try {
      const keywords = keywordInput
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
      await subscribe(keywords, selectedStores);
      setShowSubscribeForm(false);
      showFeedback("success", "웹 푸시 알림 구독이 완료되었습니다.");
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "구독 중 오류가 발생했습니다.");
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleSaveSettings() {
    setIsActionLoading(true);
    try {
      const keywords = keywordInput
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
      // 기존 구독 해제 후 새 설정으로 재구독 (PATCH 없음)
      await subscribe(keywords, selectedStores);
      setShowSubscribeForm(false);
      showFeedback("success", "알림 설정이 변경되었습니다.");
    } catch (err) {
      showFeedback(
        "error",
        err instanceof Error ? err.message : "설정 변경 중 오류가 발생했습니다."
      );
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleUnsubscribe() {
    setIsActionLoading(true);
    try {
      await unsubscribe();
      setCurrentSettings(null);
      setShowSubscribeForm(false);
      showFeedback("success", "웹 푸시 알림 구독이 해제되었습니다.");
    } catch (err) {
      showFeedback(
        "error",
        err instanceof Error ? err.message : "구독 해제 중 오류가 발생했습니다."
      );
    } finally {
      setIsActionLoading(false);
    }
  }

  if (!isSupported) return null;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">웹 푸시 알림</h2>
          <p className="text-xs text-gray-500 mt-0.5">{NOTIFICATION_SCHEDULE_LABEL}</p>
        </div>
        {/* 구독 상태 뱃지 */}
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            permission === "denied"
              ? "bg-red-100 text-red-600"
              : isSubscribed
              ? "bg-purple-100 text-purple-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {permission === "denied" ? "차단됨" : isSubscribed ? "구독 중" : "미구독"}
        </span>
      </div>

      {/* 피드백 메시지 */}
      {message && (
        <p
          className={`text-xs rounded-lg px-3 py-2 ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}

      {/* 권한 차단 상태 */}
      {permission === "denied" && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">
          알림이 차단되었습니다. 브라우저 주소창 왼쪽의 자물쇠 아이콘을 클릭해 알림 권한을
          허용해주세요.
        </div>
      )}

      {/* 구독 중 — 현재 설정 표시 */}
      {permission !== "denied" && isSubscribed && (
        <>
          {isLoadingSettings ? (
            <p className="text-xs text-gray-400">설정 불러오는 중...</p>
          ) : currentSettings ? (
            <div className="space-y-2">
              <div>
                <span className="text-xs font-medium text-gray-500">편의점</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {currentSettings.stores.length === 0 ? (
                    <span className="text-xs text-gray-400">전체</span>
                  ) : (
                    currentSettings.stores.map((store) => {
                      const color = STORE_COLORS[store as Store];
                      return (
                        <span
                          key={store}
                          className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                          style={{ backgroundColor: color?.primary }}
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
                  {currentSettings.keywords.length === 0 ? (
                    <span className="text-xs text-gray-400">전체 상품</span>
                  ) : (
                    currentSettings.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-xs text-purple-700"
                      >
                        {kw}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {!showSubscribeForm && (
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowSubscribeForm(true)}
                className="flex-1 rounded-lg border border-purple-200 py-2 text-xs font-medium text-purple-600 hover:bg-purple-50 transition-colors"
              >
                설정 변경
              </button>
              <button
                type="button"
                onClick={handleUnsubscribe}
                disabled={isActionLoading}
                className="flex-1 rounded-lg border border-red-200 py-2 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {isActionLoading ? "처리 중..." : "해제"}
              </button>
            </div>
          )}
        </>
      )}

      {/* 미구독 — 구독 버튼 */}
      {permission !== "denied" && !isSubscribed && !showSubscribeForm && (
        <button
          type="button"
          onClick={() => setShowSubscribeForm(true)}
          className="w-full rounded-lg bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 transition-colors"
        >
          브라우저 알림 받기
        </button>
      )}

      {/* 구독/설정변경 폼 */}
      {showSubscribeForm && (
        <div className="space-y-4 border-t border-gray-100 pt-4">
          {/* 편의점 선택 */}
          <div>
            <p className="mb-2 text-xs font-semibold text-gray-700">
              편의점 선택{" "}
              <span className="font-normal text-gray-400">(미선택 시 전체)</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {STORES.map((store) => (
                <button
                  key={store}
                  type="button"
                  onClick={() => toggleStore(store)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    selectedStores.includes(store)
                      ? "border-purple-500 bg-purple-50 text-purple-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {store}
                </button>
              ))}
            </div>
          </div>

          {/* 키워드 입력 */}
          <div>
            <label
              htmlFor="notifications-push-keyword"
              className="mb-1.5 block text-xs font-semibold text-gray-700"
            >
              키워드{" "}
              <span className="font-normal text-gray-400">(쉼표로 구분, 선택사항)</span>
            </label>
            <input
              id="notifications-push-keyword"
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="예: 삼각김밥, 컵라면, 아이스크림"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowSubscribeForm(false)}
              disabled={isActionLoading}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={isSubscribed ? handleSaveSettings : handleSubscribe}
              disabled={isActionLoading}
              className="flex-1 rounded-lg bg-purple-600 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {isActionLoading
                ? "처리 중..."
                : isSubscribed
                ? "설정 변경 저장"
                : "구독하기"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────

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
        {/* 웹 푸시 알림 섹션 */}
        <WebPushSection />

        {/* 이메일 구독 구분선 */}
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-gray-200" />
          <span className="text-xs text-gray-400 shrink-0">이메일 알림</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        {/* 이메일 검색 */}
        <div className="rounded-2xl bg-white p-5 shadow-sm space-y-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">이메일 알림 설정 확인</h2>
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
                <h3 className="text-sm font-bold text-gray-900">현재 이메일 알림 설정</h3>
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
