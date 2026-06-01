"use client";

import { useState } from "react";
import Link from "next/link";
import { STORES } from "@/lib/constants";
import type { Store } from "@/domain/entities/product";

type FormStep = "email" | "settings" | "done";

const MAX_KEYWORDS = 10;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function SubscribeForm() {
  const [step, setStep] = useState<FormStep>("email");
  const [email, setEmail] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addKeyword() {
    const trimmed = keywordInput.trim();
    if (!trimmed || keywords.includes(trimmed) || keywords.length >= MAX_KEYWORDS) return;
    setKeywords((prev) => [...prev, trimmed]);
    setKeywordInput("");
  }

  function removeKeyword(keyword: string) {
    setKeywords((prev) => prev.filter((k) => k !== keyword));
  }

  function toggleStore(store: Store) {
    setSelectedStores((prev) =>
      prev.includes(store) ? prev.filter((s) => s !== store) : [...prev, store]
    );
  }

  async function handleSubmit() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, keywords, stores: selectedStores }),
      });
      const json = (await response.json()) as { data: unknown; error: string | null };
      if (!response.ok) {
        setError(json.error ?? "저장 중 오류가 발생했습니다.");
        return;
      }
      setStep("done");
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  }

  function reset() {
    setStep("email");
    setEmail("");
    setKeywords([]);
    setSelectedStores([]);
    setKeywordInput("");
    setError(null);
  }

  if (step === "done") {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm text-center space-y-3">
        <div className="text-4xl">✅</div>
        <h3 className="text-lg font-bold text-gray-900">알림 설정 완료!</h3>
        <p className="text-sm text-gray-500">
          <span className="font-medium text-blue-600">{email}</span>으로
          <br />
          {keywords.length > 0 ? `"${keywords.join(", ")}" 관련 상품` : "전체 행사 상품"}을
          언제든 확인할 수 있어요.
        </p>
        <Link
          href="/notifications"
          className="inline-block rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
        >
          알림 페이지 보기
        </Link>
        <div>
          <button type="button" onClick={reset} className="text-xs text-gray-400 underline">
            다른 이메일로 설정하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
      <div>
        <h3 className="text-base font-bold text-gray-900">행사 알림 설정</h3>
        <p className="text-xs text-gray-500 mt-0.5">이메일로 알림 설정을 저장하고 언제든 확인하세요</p>
      </div>

      {step === "email" && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">이메일</label>
            <input
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isValidEmail(email)) setStep("settings");
              }}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
            />
          </div>
          <button
            type="button"
            onClick={() => setStep("settings")}
            disabled={!isValidEmail(email)}
            className="w-full rounded-lg bg-blue-500 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            다음
          </button>
        </div>
      )}

      {step === "settings" && (
        <div className="space-y-4">
          {/* 편의점 선택 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
              편의점 <span className="text-gray-400">(선택 안 하면 전체)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {STORES.map((store) => (
                <button
                  key={store}
                  type="button"
                  onClick={() => toggleStore(store)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    selectedStores.includes(store)
                      ? "bg-blue-500 text-white border-blue-500"
                      : "bg-white text-gray-600 border-gray-300 hover:border-blue-300"
                  }`}
                >
                  {store}
                </button>
              ))}
            </div>
          </div>

          {/* 키워드 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
              키워드 <span className="text-gray-400">(선택 안 하면 전체 알림)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="예: 삼각김밥, 컵라면"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addKeyword(); }}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
              />
              <button
                type="button"
                onClick={addKeyword}
                disabled={!keywordInput.trim() || keywords.length >= MAX_KEYWORDS}
                className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                추가
              </button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs text-blue-700"
                  >
                    {keyword}
                    <button
                      type="button"
                      onClick={() => removeKeyword(keyword)}
                      className="text-blue-400 hover:text-blue-600 leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setStep("email"); setError(null); }}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              이전
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 rounded-lg bg-blue-500 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
