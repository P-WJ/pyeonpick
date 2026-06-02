"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { STORE_COLORS, STORES } from "@/lib/constants";
import { usePushNotification } from "@/app/hooks/usePushNotification";
import type { PushSubscriptionSettings } from "@/app/hooks/usePushNotification";
import type { Store } from "@/domain/entities/product";

const TOAST_DURATION_MS = 2500;
const NOTIFICATION_SCHEDULE_LABEL = "매월 1일·15일 새 행사 상품 알림";

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
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] space-y-4">
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
                className="flex-1 rounded-xl border border-purple-200 py-2 text-xs font-medium text-purple-600 hover:bg-purple-50 active:scale-[0.98] transition-all duration-150"
              >
                설정 변경
              </button>
              <button
                type="button"
                onClick={handleUnsubscribe}
                disabled={isActionLoading}
                className="flex-1 rounded-xl border border-red-200 py-2 text-xs font-medium text-red-500 hover:bg-red-50 active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
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
          className="w-full rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 active:scale-[0.98] transition-all duration-150"
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
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-150 active:scale-[0.97] ${
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
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400 focus:bg-white transition-all duration-150"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowSubscribeForm(false)}
              disabled={isActionLoading}
              className="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 active:scale-[0.98] transition-all duration-150"
            >
              취소
            </button>
            <button
              type="button"
              onClick={isSubscribed ? handleSaveSettings : handleSubscribe}
              disabled={isActionLoading}
              className="flex-1 rounded-xl bg-purple-600 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 active:scale-[0.98] transition-all duration-150"
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
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-xl font-black text-gray-900 tracking-tight">
            편픽
          </Link>
          <span className="text-sm font-medium text-gray-500">알림 설정</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        <WebPushSection />
      </main>
    </div>
  );
}
