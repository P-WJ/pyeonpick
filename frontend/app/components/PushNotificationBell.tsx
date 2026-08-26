"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";
import { usePushNotification } from "@/app/hooks/usePushNotification";
import type { PushSubscriptionSettings } from "@/app/hooks/usePushNotification";
import { ACTIVE_STORES } from "@/lib/constants";
import type { Store } from "@/domain/entities/product";

const NOTIFICATION_SCHEDULE_LABEL = "매월 1일·15일 새 행사 상품 알림";

// ─── 아이콘 컴포넌트 (lucide-react) ───────────────────────────────────────────

const BELL_ICON_SIZE = 18;

function BellOutlineIcon({ className }: { className?: string }) {
  return <Bell size={BELL_ICON_SIZE} className={className} />;
}

function BellFilledIcon({ className }: { className?: string }) {
  return <Bell size={BELL_ICON_SIZE} fill="currentColor" className={className} />;
}

function BellBlockedIcon({ className }: { className?: string }) {
  return <BellOff size={BELL_ICON_SIZE} className={className} />;
}

// ─── 구독 다이얼로그 ──────────────────────────────────────────────────────────

interface SubscribeDialogProps {
  /** 현재 구독 중인 경우 기존 설정값을 초기값으로 전달 */
  initialSettings?: PushSubscriptionSettings | null;
  isSubscribed: boolean;
  onSubscribe: (keywords: string[], stores: string[]) => Promise<void>;
  onUnsubscribe: () => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

function SubscribeDialog({
  initialSettings,
  isSubscribed,
  onSubscribe,
  onUnsubscribe,
  onCancel,
  isLoading,
}: SubscribeDialogProps) {
  const [selectedStores, setSelectedStores] = useState<Store[]>(
    () => (initialSettings?.stores ?? []) as Store[]
  );
  const [keywordInput, setKeywordInput] = useState("");

  // initialSettings가 로드된 후 반영 (비동기 fetch 완료 시점)
  useEffect(() => {
    if (initialSettings) {
      setSelectedStores(initialSettings.stores as Store[]);
    }
  }, [initialSettings]);

  function toggleStore(store: Store) {
    setSelectedStores((prev) =>
      prev.includes(store) ? prev.filter((s) => s !== store) : [...prev, store]
    );
  }

  function handleSubmit() {
    const keywords = keywordInput
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    onSubscribe(keywords, selectedStores);
  }

  return (
    <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-gray-100 bg-white p-5 shadow-xl">
      <h3 className="mb-1 text-base font-bold text-gray-900">
        {isSubscribed ? "알림 설정 변경" : "웹 푸시 알림 구독"}
      </h3>
      <p className="mb-1 text-xs text-gray-500">
        새 행사 상품이 등록되면 브라우저 알림을 보내드립니다.
      </p>
      {/* 발송 주기 안내 */}
      <p className="mb-4 text-xs font-medium text-purple-600">
        {NOTIFICATION_SCHEDULE_LABEL}
      </p>

      {/* 편의점 선택 */}
      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold text-gray-700">
          편의점 선택 <span className="font-normal text-gray-400">(미선택 시 전체)</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ACTIVE_STORES.map((store) => (
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
      <div className="mb-5">
        <label
          htmlFor="push-keyword-input"
          className="mb-1.5 block text-xs font-semibold text-gray-700"
        >
          키워드{" "}
          <span className="font-normal text-gray-400">
            {initialSettings?.keywords && initialSettings.keywords.length > 0
              ? `(현재: ${initialSettings.keywords.join(", ")})`
              : "(쉼표로 구분, 선택사항)"}
          </span>
        </label>
        <input
          id="push-keyword-input"
          type="text"
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
          placeholder={
            initialSettings?.keywords && initialSettings.keywords.length > 0
              ? initialSettings.keywords.join(", ")
              : "예: 삼각김밥, 컵라면, 아이스크림"
          }
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
        />
      </div>

      {/* 버튼 영역 */}
      {isSubscribed ? (
        // 구독 중: "설정 변경 저장" / "구독 해제" / "취소" 3버튼
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 rounded-lg bg-purple-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
            >
              {isLoading ? "저장 중..." : "설정 변경 저장"}
            </button>
          </div>
          <button
            type="button"
            onClick={onUnsubscribe}
            disabled={isLoading}
            className="w-full rounded-lg border border-red-200 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            {isLoading ? "처리 중..." : "구독 해제"}
          </button>
        </div>
      ) : (
        // 미구독: "취소" / "구독하기" 2버튼
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 rounded-lg bg-purple-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
          >
            {isLoading ? "구독 중..." : "구독하기"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── PushNotificationBell (메인 컴포넌트) ────────────────────────────────────

export function PushNotificationBell() {
  const { isSupported, permission, isSubscribed, subscribe, unsubscribe, fetchCurrentSettings } =
    usePushNotification();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentSettings, setCurrentSettings] = useState<PushSubscriptionSettings | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 다이얼로그 외부 클릭 시 닫기
  useEffect(() => {
    if (!isDialogOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDialogOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDialogOpen]);

  // 브라우저 미지원 시 렌더링하지 않음
  if (!isSupported) return null;

  async function handleSubscribe(keywords: string[], stores: string[]) {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await subscribe(keywords, stores);
      setIsDialogOpen(false);
      setCurrentSettings(null);
      setSuccessMessage("구독 완료! 새 행사 상품 알림을 받을 수 있습니다.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "구독 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUnsubscribe() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await unsubscribe();
      setIsDialogOpen(false);
      setCurrentSettings(null);
      setSuccessMessage("알림 구독이 해제되었습니다.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "구독 해제 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleBellClick() {
    setErrorMessage(null);
    if (permission === "denied") return;

    if (isSubscribed) {
      // 구독 중일 때도 다이얼로그를 열어 현재 설정 표시
      const settings = await fetchCurrentSettings();
      setCurrentSettings(settings);
    }

    setIsDialogOpen((prev) => !prev);
  }

  // 권한 거부 상태 — 버그 3 수정: 부모에 group 클래스 추가
  if (permission === "denied") {
    return (
      <div className="group relative" title="알림이 차단되었습니다. 브라우저 설정에서 허용해주세요.">
        <button
          type="button"
          disabled
          className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-full border border-gray-200 text-gray-400"
          aria-label="알림 차단됨 — 브라우저 설정에서 허용해주세요"
        >
          <BellBlockedIcon />
        </button>
        <div className="pointer-events-none absolute right-0 top-11 hidden w-52 rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs text-gray-600 shadow-lg group-hover:block">
          브라우저 설정에서 알림을 허용해주세요.
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* 종 버튼 */}
      <button
        type="button"
        onClick={handleBellClick}
        disabled={isLoading}
        className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors disabled:opacity-50 ${
          isSubscribed
            ? "border-purple-300 bg-purple-50 text-purple-600 hover:bg-purple-100"
            : "border-gray-200 text-gray-500 hover:bg-gray-50"
        }`}
        aria-label={isSubscribed ? "알림 설정 변경 또는 구독 해제" : "푸시 알림 구독하기"}
        title={isSubscribed ? `알림 구독 중 — ${NOTIFICATION_SCHEDULE_LABEL}` : "알림 구독하기"}
      >
        {isSubscribed ? (
          <BellFilledIcon className="text-purple-600" />
        ) : (
          <BellOutlineIcon />
        )}
      </button>

      {/* 구독/설정 변경 다이얼로그 */}
      {isDialogOpen && (
        <SubscribeDialog
          initialSettings={isSubscribed ? currentSettings : null}
          isSubscribed={isSubscribed}
          onSubscribe={handleSubscribe}
          onUnsubscribe={handleUnsubscribe}
          onCancel={() => setIsDialogOpen(false)}
          isLoading={isLoading}
        />
      )}

      {/* 에러 토스트 */}
      {errorMessage && (
        <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700 shadow-lg">
          {errorMessage}
        </div>
      )}

      {/* 성공 토스트 */}
      {successMessage && (
        <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-xs text-green-700 shadow-lg">
          {successMessage}
        </div>
      )}
    </div>
  );
}
