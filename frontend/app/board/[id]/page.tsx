"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { Post, Comment } from "@/domain/entities/post";
import { BoardHeader } from "@/app/board/components/BoardHeader";

const COMMENT_MAX_LENGTH = 1000;

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

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  자유: "bg-gray-100 text-gray-600",
  조합공유: "bg-blue-100 text-blue-700",
  질문: "bg-green-100 text-green-700",
};

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  const postId = Number(params.id);

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingPost, setIsLoadingPost] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [postError, setPostError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const fetchPost = useCallback(async () => {
    setIsLoadingPost(true);
    setPostError(null);

    try {
      const response = await fetch(`/api/posts/${postId}`);
      const json = (await response.json()) as {
        data: Post | null;
        error: string | null;
      };

      if (json.error || !json.data) {
        throw new Error(json.error ?? "게시글을 찾을 수 없습니다.");
      }

      setPost(json.data);
    } catch (error) {
      setPostError(
        error instanceof Error ? error.message : "게시글을 불러오지 못했습니다."
      );
    } finally {
      setIsLoadingPost(false);
    }
  }, [postId]);

  const fetchComments = useCallback(async () => {
    setIsLoadingComments(true);

    try {
      const response = await fetch(`/api/posts/${postId}/comments`);
      const json = (await response.json()) as {
        data: Comment[] | null;
        error: string | null;
      };

      if (json.error) throw new Error(json.error);
      setComments(json.data ?? []);
    } catch {
      // 댓글 로드 실패는 조용히 처리
    } finally {
      setIsLoadingComments(false);
    }
  }, [postId]);

  useEffect(() => {
    if (isNaN(postId) || postId <= 0) {
      setPostError("올바르지 않은 게시글입니다.");
      setIsLoadingPost(false);
      return;
    }
    fetchPost();
    fetchComments();
  }, [postId, fetchPost, fetchComments]);

  async function handleSubmitComment(event: React.FormEvent) {
    event.preventDefault();
    setCommentError(null);

    if (commentText.trim().length === 0) {
      setCommentError("댓글 내용을 입력해주세요.");
      return;
    }

    setIsSubmittingComment(true);

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });

      const json = (await response.json()) as {
        data: Comment | null;
        error: string | null;
      };

      if (json.error || !json.data) {
        throw new Error(json.error ?? "댓글 작성에 실패했습니다.");
      }

      setComments((prev) => [...prev, json.data!]);
      setCommentText("");
      setPost((prev) =>
        prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev
      );
    } catch (error) {
      setCommentError(
        error instanceof Error ? error.message : "댓글 작성에 실패했습니다."
      );
    } finally {
      setIsSubmittingComment(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8FAFC" }}>
      <BoardHeader />

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* 뒤로가기 */}
        <Link
          href="/board"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          게시판으로
        </Link>

        {/* 로딩 */}
        {isLoadingPost && (
          <div className="space-y-3">
            <div className="h-8 w-2/3 animate-pulse rounded-lg bg-gray-200" />
            <div className="h-4 w-1/3 animate-pulse rounded-lg bg-gray-200" />
            <div className="h-48 animate-pulse rounded-2xl bg-gray-200" />
          </div>
        )}

        {/* 에러 */}
        {postError && (
          <div className="rounded-xl bg-red-50 p-6 text-center text-sm text-red-600 border border-red-100">
            <p>{postError}</p>
            <button
              type="button"
              onClick={() => router.push("/board")}
              className="mt-3 text-xs text-red-500 underline hover:text-red-700"
            >
              게시판으로 돌아가기
            </button>
          </div>
        )}

        {/* 게시글 본문 */}
        {!isLoadingPost && post && (
          <article className="rounded-2xl bg-white shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  CATEGORY_BADGE_COLORS[post.category] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {post.category}
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{post.title}</h1>
            <div className="flex items-center gap-2 text-xs text-gray-400 pb-4 border-b border-gray-100">
              {post.authorProfileImage ? (
                <Image
                  src={post.authorProfileImage}
                  alt={post.authorNickname}
                  width={20}
                  height={20}
                  className="rounded-full"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-bold">
                  {post.authorNickname[0] ?? "?"}
                </div>
              )}
              <span className="font-medium text-gray-600">
                {post.authorNickname}
              </span>
              <span>·</span>
              <span>{formatRelativeTime(post.createdAt)}</span>
            </div>
            <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
              {post.content}
            </div>
          </article>
        )}

        {/* 댓글 섹션 */}
        {!isLoadingPost && post && (
          <section className="rounded-2xl bg-white shadow-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-gray-900">
              댓글 {post.commentCount > 0 ? post.commentCount : ""}
            </h2>

            {/* 댓글 목록 */}
            {isLoadingComments ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-14 animate-pulse rounded-xl bg-gray-100"
                  />
                ))}
              </div>
            ) : comments.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                첫 댓글을 남겨보세요.
              </p>
            ) : (
              <ul className="space-y-4 divide-y divide-gray-100">
                {comments.map((comment) => (
                  <li key={comment.id} className="pt-4 first:pt-0">
                    <div className="flex items-center gap-2 mb-2">
                      {comment.authorProfileImage ? (
                        <Image
                          src={comment.authorProfileImage}
                          alt={comment.authorNickname}
                          width={20}
                          height={20}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-bold">
                          {comment.authorNickname[0] ?? "?"}
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-700">
                        {comment.authorNickname}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap pl-7">
                      {comment.content}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {/* 댓글 작성 폼 — 로그인 시에만 표시 */}
            {session?.user ? (
              <form
                onSubmit={handleSubmitComment}
                className="space-y-2 pt-2 border-t border-gray-100"
              >
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  maxLength={COMMENT_MAX_LENGTH}
                  placeholder="댓글을 입력해주세요"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {commentText.length}/{COMMENT_MAX_LENGTH}
                  </span>
                  <button
                    type="submit"
                    disabled={isSubmittingComment}
                    className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmittingComment ? "등록 중..." : "댓글 등록"}
                  </button>
                </div>
                {commentError && (
                  <p className="text-xs text-red-500">{commentError}</p>
                )}
              </form>
            ) : (
              <div className="pt-2 border-t border-gray-100 text-center py-4">
                <p className="text-sm text-gray-500">
                  댓글을 작성하려면{" "}
                  <Link
                    href="/api/auth/signin"
                    className="text-blue-600 font-medium underline"
                  >
                    로그인
                  </Link>
                  이 필요합니다.
                </p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
