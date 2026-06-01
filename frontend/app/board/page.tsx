"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { Post, PostCategory } from "@/domain/entities/post";
import { BoardHeader } from "@/app/board/components/BoardHeader";

type CategoryTab = "전체" | PostCategory;

const CATEGORY_TABS: CategoryTab[] = ["전체", "자유", "조합공유", "질문"];
const POSTS_PAGE_LIMIT = 20;

function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "방금 전";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString("ko-KR");
}

const CATEGORY_BADGE_COLORS: Record<PostCategory, string> = {
  자유: "bg-gray-100 text-gray-600",
  조합공유: "bg-blue-100 text-blue-700",
  질문: "bg-green-100 text-green-700",
};

const TOAST_DURATION_MS = 2500;

export default function BoardPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<CategoryTab>("전체");
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const router = useRouter();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);

  function showToast(message: string) {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), TOAST_DURATION_MS);
  }

  function handleWriteClick() {
    if (!session?.user) {
      showToast("게시글 작성을 위해 로그인이 필요합니다.");
      return;
    }
    router.push("/board/write");
  }

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
        const params = new URLSearchParams();
        if (activeTab !== "전체") params.set("category", activeTab);
        params.set("page", String(targetPage));
        params.set("limit", String(POSTS_PAGE_LIMIT));

        const response = await fetch(`/api/posts?${params.toString()}`);
        const json = (await response.json()) as {
          data: Post[] | null;
          error: string | null;
          meta: { hasMore: boolean } | null;
        };

        if (json.error) throw new Error(json.error);

        const newPosts = json.data ?? [];
        const nextHasMore = json.meta?.hasMore ?? false;

        if (isInitialLoad) {
          setPosts(newPosts);
        } else {
          setPosts((prev) => [...prev, ...newPosts]);
        }
        setHasMore(nextHasMore);
        setPage(targetPage);
      } catch (error) {
        setFetchError(
          error instanceof Error
            ? error.message
            : "게시글을 불러오지 못했습니다."
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
    [activeTab]
  );

  useEffect(() => {
    setPosts([]);
    setPage(1);
    setHasMore(true);
    fetchPage(1, true);
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8FAFC" }}>
      <BoardHeader />

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* 헤더 영역 */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">게시판</h1>
          <button
            type="button"
            onClick={handleWriteClick}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            글쓰기
          </button>
        </div>

        {/* 카테고리 탭 */}
        <div className="flex gap-2 border-b border-gray-200 pb-0">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 로딩 스켈레톤 */}
        {isLoadingInitial && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-2xl bg-gray-200"
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
        {!isLoadingInitial && !fetchError && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-lg font-medium text-gray-400">
              아직 게시글이 없습니다.
            </p>
            {session?.user && (
              <Link
                href="/board/write"
                className="mt-4 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                첫 글 작성하기
              </Link>
            )}
          </div>
        )}

        {/* 게시글 목록 */}
        {!isLoadingInitial && posts.length > 0 && (
          <div className="space-y-2">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/board/${post.id}`}
                className="block rounded-2xl bg-white shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          CATEGORY_BADGE_COLORS[post.category]
                        }`}
                      >
                        {post.category}
                      </span>
                      <h2 className="text-sm font-semibold text-gray-900 truncate">
                        {post.title}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {post.authorProfileImage ? (
                        <Image
                          src={post.authorProfileImage}
                          alt={post.authorNickname}
                          width={16}
                          height={16}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[9px] font-bold">
                          {post.authorNickname[0] ?? "?"}
                        </div>
                      )}
                      <span>{post.authorNickname}</span>
                      <span>·</span>
                      <span>{formatRelativeTime(post.createdAt)}</span>
                    </div>
                  </div>
                  <div
                    className={`shrink-0 flex items-center gap-1 text-sm ${
                      post.commentCount > 0
                        ? "text-blue-600 font-medium"
                        : "text-gray-400"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>{post.commentCount}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 추가 로딩 스피너 */}
        {isLoadingMore && (
          <div className="flex justify-center py-6">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          </div>
        )}

        {/* 모두 로딩 완료 */}
        {!isLoadingInitial && !hasMore && posts.length > 0 && (
          <p className="text-center text-xs text-gray-400 py-4">
            모든 게시글을 불러왔습니다.
          </p>
        )}

        <div ref={sentinelRef} className="h-1" />
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
