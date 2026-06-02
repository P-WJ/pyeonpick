"use client";

import { useState, useRef, useEffect } from "react";
import { usePushNotification } from "@/app/hooks/usePushNotification";
import { STORES } from "@/lib/constants";
import type { Store } from "@/domain/entities/product";

// ─── 아이콘 컴포넌트 ──────────────────────────────────────────────────────────

function BellOutlineIcon({ className }: { className?: string }) {
  return (
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
      className={className}
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function BellFilledIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeWidth="2" fill="none" />
    </svg>
  );
}

function BellBlockedIcon({ className }: { className?: string }) {
  return (
    <span className={`relative inline-flex ${className ?? ""}`}>
      <BellOutlineIcon />
      <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white leading-none">
        ✕
      </span>
    </span>
  );
}

// ─── 구독 다이얼로그 ──────────────────────────────────────────────────────────

interface SubscribeDialogProps {
  onSubscribe: (keywords: string[], stores: string[]) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

function SubscribeDialog({ onSubscribe, onCancel, isLoading }: SubscribeDialogProps) {
  const [selectedStores, setSelectedStores] = useState<Store[]>([]);
  const [keywordInput, setKeywordInput] = useState("");

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
      <h3 className="mb-1 text-base font-bold text-gray-900">웹 푸시 알림 구독</h3>
      <p className="mb-4 text-xs text-gray-500">
        새 행사 상품이 등록되면 브라우저 알림을 보내드립니다.
      </p>

      {/* 편의점 선택 */}
      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold text-gray-700">
          편의점 선택 <span className="font-normal text-gray-400">(미선택 시 전체)</span>
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
      <div className="mb-5">
        <label htmlFor="push-keyword-input" className="mb-1.5 block text-xs font-semibold text-gray-700">
          키워드 <span className="font-normal text-gray-400">(쉼표로 구분, 선택사항)</span>
        </label>
        <input
          id="push-keyword-input"
          type="text"
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
          placeholder="예: 삼각김밥, 컵라면, 아이스크림"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
        />
      </div>

      {/* 버튼 */}
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
    </div>
  );
}

// ─── PushNotificationBell (메인 컴포넌트) ────────────────────────────────────

export function PushNotificationBell() {
  const { isSupported, permission, isSubscribed, subscribe, unsubscribe } =
    usePushNotification();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
      setSuccessMessage("알림 구독이 해제되었습니다.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "구독 해제 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleBellClick() {
    setErrorMessage(null);
    if (permission === "denied") return; // denied 상태에서는 클릭 무효
    if (isSubscribed) {
      handleUnsubscribe();
    } else {
      setIsDialogOpen((prev) => !prev);
    }
  }

  // 권한 거부 상태
  if (permission === "denied") {
    return (
      <div className="relative" title="알림이 차단되었습니다. 브라우저 설정에서 허용해주세요.">
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
        aria-label={isSubscribed ? "푸시 알림 구독 중 (클릭하여 해제)" : "푸시 알림 구독하기"}
        title={isSubscribed ? "알림 구독 중 — 클릭하여 해제" : "알림 구독하기"}
      >
        {isSubscribed ? (
          <BellFilledIcon className="text-purple-600" />
        ) : (
          <BellOutlineIcon />
        )}
      </button>

      {/* 구독 다이얼로그 */}
      {isDialogOpen && (
        <SubscribeDialog
          onSubscribe={handleSubscribe}
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
