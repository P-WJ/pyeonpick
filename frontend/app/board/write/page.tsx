"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { PostCategory } from "@/domain/entities/post";

const CATEGORY_OPTIONS: PostCategory[] = ["자유", "조합공유", "질문"];
const TITLE_MAX_LENGTH = 100;
const CONTENT_MAX_LENGTH = 5000;

export default function WritePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [category, setCategory] = useState<PostCategory>("자유");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/board");
    }
  }, [status, router]);

  if (status === "loading" || !session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-violet-100 border-t-violet-600" />
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    if (title.trim().length === 0) {
      setSubmitError("제목을 입력해주세요.");
      return;
    }
    if (content.trim().length === 0) {
      setSubmitError("내용을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, title: title.trim(), content: content.trim() }),
      });

      const json = (await response.json()) as {
        data: { id: number } | null;
        error: string | null;
      };

      if (json.error || !json.data) {
        throw new Error(json.error ?? "게시글 작성에 실패했습니다.");
      }

      router.push(`/board/${json.data.id}`);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "게시글 작성에 실패했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* 뒤로가기 바 */}
        <div className="mb-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-150/60 text-gray-500 hover:bg-white active:scale-95 transition-all duration-150 bg-white/50"
            aria-label="뒤로가기"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-extrabold text-gray-900 tracking-tight">글쓰기</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl bg-white border border-gray-100/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-5"
        >
          {/* 카테고리 선택 */}
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2.5 uppercase tracking-wider">
              카테고리
            </label>
            <div className="flex gap-2">
              {CATEGORY_OPTIONS.map((option) => {
                const isActive = category === option;
                // Category options custom branding colors matching board badges
                const activeClasses = 
                  option === "자유" 
                    ? "bg-blue-500 text-white border-blue-500 shadow-sm" 
                    : option === "조합공유"
                    ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                    : "bg-amber-500 text-white border-amber-500 shadow-sm";
                
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setCategory(option)}
                    className={`rounded-full px-4 py-2 text-xs font-bold transition-all duration-150 border active:scale-[0.97] ${
                      isActive
                        ? activeClasses
                        : "bg-white border-gray-250 text-gray-500 hover:border-gray-350"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 제목 */}
          <div>
            <label
              htmlFor="post-title"
              className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider"
            >
              제목
            </label>
            <input
              id="post-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={TITLE_MAX_LENGTH}
              placeholder="게시글 제목을 작성해주세요"
              className="w-full rounded-2xl border border-gray-200/80 bg-gray-50/50 px-4.5 py-3.5 text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 transition-all"
            />
            <p className="mt-1.5 text-right text-[10px] font-bold text-gray-400">
              {title.length}/{TITLE_MAX_LENGTH}
            </p>
          </div>

          {/* 내용 */}
          <div>
            <label
              htmlFor="post-content"
              className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider"
            >
              본문 내용
            </label>
            <textarea
              id="post-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={CONTENT_MAX_LENGTH}
              placeholder="편픽 식구들과 나누고 싶은 이야기를 들려주세요..."
              rows={10}
              className="w-full resize-none rounded-2xl border border-gray-200/80 bg-gray-50/50 px-4.5 py-3.5 text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 transition-all"
            />
            <p className="mt-1.5 text-right text-[10px] font-bold text-gray-400">
              {content.length}/{CONTENT_MAX_LENGTH}
            </p>
          </div>

          {/* 에러 */}
          {submitError && (
            <div className="rounded-2xl bg-red-50 p-3.5 text-xs font-bold text-red-650 border border-red-100">
              {submitError}
            </div>
          )}

          {/* 제출 버튼 */}
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-2xl px-5 py-3 text-xs font-bold text-gray-650 border border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] transition-all"
            >
              작성 취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-2xl bg-gray-950 px-5.5 py-3 text-xs font-bold text-white hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-150 shadow-md hover:shadow-lg"
            >
              {isSubmitting ? "작성 등록 중..." : "글 작성 완료"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
