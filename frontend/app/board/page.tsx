"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { Post, PostCategory } from "@/domain/entities/post";

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
  자유: "bg-blue-50/80 text-blue-600 border border-blue-150/40",
  조합공유: "bg-violet-50/80 text-violet-650 border border-violet-150/40",
  질문: "bg-amber-50/80 text-amber-600 border border-amber-150/40",
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

  // 추천(좋아요) 상태 복원
  const [likedPostIds, setLikedPostIds] = useState<number[]>([]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cvs-liked-posts-v1");
      if (stored) setLikedPostIds(JSON.parse(stored) as number[]);
    } catch {}
  }, []);

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
    <div className="min-h-screen bg-gray-50/50">
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* 헤더 영역 */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-gray-900 tracking-tight">커뮤니티</h1>
          <button
            type="button"
            onClick={handleWriteClick}
            className="rounded-2xl bg-gray-950 px-5 py-2.5 text-xs font-bold text-white hover:bg-gray-800 active:scale-[0.98] transition-all duration-200 shadow-md hover:shadow-lg"
          >
            글쓰기
          </button>
        </div>

        {/* 카테고리 탭 */}
        <div className="flex gap-1 border-b border-gray-200/60 pb-px">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4.5 py-3 text-xs font-bold transition-all duration-150 border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-violet-600 text-violet-600"
                  : "border-transparent text-gray-400 hover:text-gray-650"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 로딩 스켈레톤 */}
        {isLoadingInitial && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-3xl bg-white border border-gray-100/50"
              />
            ))}
          </div>
        )}

        {/* 오류 */}
        {fetchError && (
          <div className="rounded-2xl bg-red-50 p-4 text-center text-xs font-bold text-red-600 border border-red-100">
            {fetchError}
          </div>
        )}

        {/* 빈 결과 */}
        {!isLoadingInitial && !fetchError && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center px-8 bg-white rounded-3xl border border-gray-100/60 shadow-sm">
            <div className="mb-4 text-4xl">📝</div>
            <p className="font-extrabold text-gray-950">아직 게시글이 없어요</p>
            <p className="mt-1 text-xs font-semibold text-gray-400">첫 번째 이야기를 먼저 시작해보세요</p>
            {session?.user && (
              <Link
                href="/board/write"
                className="mt-5 rounded-2xl bg-gray-950 px-5.5 py-3 text-xs font-bold text-white hover:bg-gray-800 active:scale-[0.98] transition-all duration-150 inline-flex items-center shadow-sm"
              >
                첫 글 작성하기
              </Link>
            )}
          </div>
        )}

        {/* 게시글 목록 */}
        {!isLoadingInitial && posts.length > 0 && (
          <div className="space-y-3">
            {posts.map((post) => {
              const isLiked = likedPostIds.includes(post.id);
              const baseLikes = (post.id * 7) % 19 + 3;
              const likeCount = isLiked ? baseLikes + 1 : baseLikes;

              return (
                <Link
                  key={post.id}
                  href={`/board/${post.id}`}
                  className="block rounded-3xl bg-white border border-gray-100/65 px-5 py-4.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 hover:border-gray-200 transition-all duration-300 active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            CATEGORY_BADGE_COLORS[post.category]
                          }`}
                        >
                          {post.category}
                        </span>
                        <h2 className="text-sm font-extrabold text-gray-900 truncate leading-snug">
                          {post.title}
                        </h2>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                        {post.authorProfileImage ? (
                          <Image
                            src={post.authorProfileImage}
                            alt={post.authorNickname}
                            width={15}
                            height={15}
                            className="rounded-full ring-1 ring-gray-100"
                          />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-[8px] font-bold">
                            {post.authorNickname[0] ?? "?"}
                          </div>
                        )}
                        <span className="text-gray-500">{post.authorNickname}</span>
                        <span>·</span>
                        <span>{formatRelativeTime(post.createdAt)}</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {/* 추천(좋아요) 뱃지 */}
                      <div className={`flex items-center gap-1 text-[10px] font-extrabold rounded-full px-2.5 py-1 border transition-all ${
                        isLiked
                          ? "text-rose-500 bg-rose-50 border-rose-100"
                          : "text-gray-400 bg-gray-50 border-gray-150/40"
                      }`}>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill={isLiked ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                        </svg>
                        <span>{likeCount}</span>
                      </div>

                      {/* 댓글 뱃지 */}
                      {post.commentCount > 0 && (
                        <div className="flex items-center gap-1 text-[10px] font-extrabold text-violet-650 bg-violet-50/80 rounded-full px-2.5 py-1 border border-violet-100/30">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          <span>{post.commentCount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* 추가 로딩 스피너 */}
        {isLoadingMore && (
          <div className="flex justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-250 border-t-gray-500" />
          </div>
        )}

        {/* 모두 로딩 완료 */}
        {!isLoadingInitial && !hasMore && posts.length > 0 && (
          <p className="text-center text-[10px] font-bold text-gray-400 py-6">— 모든 게시글을 불러왔습니다 —</p>
        )}

        <div ref={sentinelRef} className="h-1" />
      </main>

      {/* 토스트 */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-gray-950/95 backdrop-blur-md border border-white/10 px-5.5 py-3.5 text-xs font-bold text-white shadow-2xl transition-all duration-300">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
