"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { Post, Comment } from "@/domain/entities/post";

const COMMENT_MAX_LENGTH = 1000;
const POST_TITLE_MAX_LENGTH = 100;
const POST_CONTENT_MAX_LENGTH = 10000;

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
  자유: "bg-blue-50/80 text-blue-600 border border-blue-150/40",
  조합공유: "bg-violet-50/80 text-violet-650 border border-violet-150/40",
  질문: "bg-amber-50/80 text-amber-600 border border-amber-150/40",
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

  // 댓글 작성 상태
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // 게시글 수정 상태
  const [isEditMode, setIsEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // 게시글 삭제 상태
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // 댓글 삭제 진행 중인 commentId 목록
  const [deletingCommentIds, setDeletingCommentIds] = useState<Set<number>>(new Set());

  const isPostAuthor =
    post !== null &&
    session?.user?.nickname !== undefined &&
    post.authorNickname === session.user.nickname;

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

  function enterEditMode() {
    if (!post) return;
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditError(null);
    setIsEditMode(true);
  }

  function cancelEditMode() {
    setIsEditMode(false);
    setEditError(null);
  }

  async function handleSavePost() {
    if (editTitle.trim().length === 0) {
      setEditError("제목을 입력해주세요.");
      return;
    }
    if (editContent.trim().length === 0) {
      setEditError("내용을 입력해주세요.");
      return;
    }

    setIsSavingPost(true);
    setEditError(null);

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim(), content: editContent.trim() }),
      });

      const json = (await response.json()) as {
        data: Post | null;
        error: string | null;
      };

      if (json.error || !json.data) {
        throw new Error(json.error ?? "게시글 수정에 실패했습니다.");
      }

      setPost(json.data);
      setIsEditMode(false);
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : "게시글 수정에 실패했습니다."
      );
    } finally {
      setIsSavingPost(false);
    }
  }

  function requestDeletePost() {
    setIsConfirmingDelete(true);
    setTimeout(() => setIsConfirmingDelete(false), 3000);
  }

  async function handleDeletePost() {
    setIsConfirmingDelete(false);
    setIsDeletingPost(true);

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
      });

      const json = (await response.json()) as {
        data: { success: boolean } | null;
        error: string | null;
      };

      if (json.error) {
        throw new Error(json.error);
      }

      router.push("/board");
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "게시글 삭제에 실패했습니다."
      );
    } finally {
      setIsDeletingPost(false);
    }
  }

  async function handleDeleteComment(commentId: number) {
    setDeletingCommentIds((prev) => new Set(prev).add(commentId));

    try {
      const response = await fetch(
        `/api/posts/${postId}/comments/${commentId}`,
        { method: "DELETE" }
      );

      const json = (await response.json()) as {
        data: { success: boolean } | null;
        error: string | null;
      };

      if (json.error) {
        throw new Error(json.error);
      }

      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
      setPost((prev) =>
        prev ? { ...prev, commentCount: Math.max(0, prev.commentCount - 1) } : prev
      );
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "댓글 삭제에 실패했습니다."
      );
    } finally {
      setDeletingCommentIds((prev) => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  }

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
    <div className="min-h-screen bg-gray-50/50">
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* 뒤로가기 */}
        <Link
          href="/board"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors duration-150 py-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          목록으로 돌아가기
        </Link>

        {/* 로딩 */}
        {isLoadingPost && (
          <div className="space-y-3">
            <div className="h-9 w-2/3 animate-pulse rounded-2xl bg-white border border-gray-100" />
            <div className="h-5 w-1/3 animate-pulse rounded-2xl bg-white border border-gray-100" />
            <div className="h-52 animate-pulse rounded-3xl bg-white border border-gray-100" />
          </div>
        )}

        {/* 에러 */}
        {postError && (
          <div className="rounded-3xl bg-red-50 p-6 text-center text-xs font-bold text-red-650 border border-red-100 shadow-sm">
            <p className="mb-2">⚠️ {postError}</p>
            <button
              type="button"
              onClick={() => router.push("/board")}
              className="text-xs text-red-500 underline hover:text-red-700"
            >
              게시판 목록으로 돌아가기
            </button>
          </div>
        )}

        {/* 게시글 본문 */}
        {!isLoadingPost && post && (
          <article className="rounded-3xl bg-white border border-gray-100/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-5">
            {/* 카테고리 배지 + 수정/삭제 버튼 */}
            <div className="flex items-center justify-between border-b border-gray-50 pb-3">
              <span
                className={`rounded-full px-3 py-0.5 text-[10px] font-bold border ${
                  CATEGORY_BADGE_COLORS[post.category] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {post.category}
              </span>

              {isPostAuthor && !isEditMode && (
                <div className="flex items-center gap-2">
                  {isConfirmingDelete ? (
                    <div className="flex items-center gap-2 bg-red-50/80 border border-red-100/50 rounded-xl px-3 py-1.5">
                      <span className="text-[10px] text-red-600 font-bold">정말 삭제할까요?</span>
                      <button
                        type="button"
                        onClick={handleDeletePost}
                        disabled={isDeletingPost}
                        className="text-[10px] font-extrabold text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                      >
                        {isDeletingPost ? "삭제 중..." : "삭제"}
                      </button>
                      <span className="text-red-200">|</span>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingDelete(false)}
                        className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={enterEditMode}
                        className="text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors duration-150 px-1 py-1"
                      >
                        수정
                      </button>
                      <span className="text-gray-200">|</span>
                      <button
                        type="button"
                        onClick={requestDeletePost}
                        disabled={isDeletingPost}
                        className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed px-1 py-1"
                      >
                        삭제
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 수정 모드 */}
            {isEditMode ? (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="edit-title"
                    className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase"
                  >
                    제목
                  </label>
                  <input
                    id="edit-title"
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    maxLength={POST_TITLE_MAX_LENGTH}
                    className="w-full rounded-2xl border border-gray-200/80 bg-gray-50/50 px-4 py-3.5 text-base font-bold text-gray-900 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 transition-all duration-200"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-content"
                    className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase"
                  >
                    내용
                  </label>
                  <textarea
                    id="edit-content"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    maxLength={POST_CONTENT_MAX_LENGTH}
                    rows={8}
                    className="w-full resize-none rounded-2xl border border-gray-200/80 bg-gray-50/50 px-4.5 py-3.5 text-sm font-semibold text-gray-900 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 transition-all duration-200"
                  />
                </div>
                {editError && (
                  <p className="text-xs font-bold text-red-500">{editError}</p>
                )}
                <div className="flex items-center gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={cancelEditMode}
                    className="rounded-xl border border-gray-200 px-4.5 py-2.5 text-xs font-bold text-gray-650 hover:bg-gray-50 active:scale-[0.98] transition-all duration-150"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePost}
                    disabled={isSavingPost}
                    className="rounded-xl bg-gray-950 px-4.5 py-2.5 text-xs font-bold text-white hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-150"
                  >
                    {isSavingPost ? "저장 중..." : "저장"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-extrabold text-gray-900 leading-snug">{post.title}</h1>
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 pb-4 border-b border-gray-100/60">
                  {post.authorProfileImage ? (
                    <Image
                      src={post.authorProfileImage}
                      alt={post.authorNickname}
                      width={18}
                      height={18}
                      className="rounded-full ring-1 ring-gray-100"
                    />
                  ) : (
                    <div className="w-4.5 h-4.5 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-[9px] font-bold">
                      {post.authorNickname[0] ?? "?"}
                    </div>
                  )}
                  <span className="font-bold text-gray-600">
                    {post.authorNickname}
                  </span>
                  <span>·</span>
                  <span>{formatRelativeTime(post.createdAt)}</span>
                </div>
                <div className="text-sm font-semibold text-gray-800 leading-relaxed whitespace-pre-wrap tracking-tight pt-2">
                  {post.content}
                </div>
              </>
            )}
          </article>
        )}

        {/* 댓글 섹션 */}
        {!isLoadingPost && post && (
          <section className="rounded-3xl bg-white border border-gray-100/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-5">
            <h2 className="text-sm font-extrabold text-gray-900 flex items-center gap-1.5">
              <span>💬</span> 댓글
              {post.commentCount > 0 && (
                <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-lg border border-violet-100/30">
                  {post.commentCount}
                </span>
              )}
            </h2>

            {/* 댓글 목록 */}
            {isLoadingComments ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-16 animate-pulse rounded-2xl bg-gray-50"
                  />
                ))}
              </div>
            ) : comments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-150 p-6 text-center">
                <p className="text-xs font-semibold text-gray-400">아직 등록된 댓글이 없습니다. 첫 댓글을 남겨보세요.</p>
              </div>
            ) : (
              <ul className="space-y-4 divide-y divide-gray-100/60">
                {comments.map((comment) => {
                  const isCommentAuthor =
                    session?.user?.nickname !== undefined &&
                    comment.authorNickname === session.user.nickname;
                  const isDeletingThisComment = deletingCommentIds.has(comment.id);

                  return (
                    <li key={comment.id} className="pt-4 first:pt-0 group/comment">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {comment.authorProfileImage ? (
                            <Image
                              src={comment.authorProfileImage}
                              alt={comment.authorNickname}
                              width={18}
                              height={18}
                              className="rounded-full ring-1 ring-gray-100"
                            />
                          ) : (
                            <div className="w-4.5 h-4.5 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-[9px] font-bold">
                              {comment.authorNickname[0] ?? "?"}
                            </div>
                          )}
                          <span className="text-xs font-bold text-gray-700">
                            {comment.authorNickname}
                          </span>
                          <span className="text-[10px] font-semibold text-gray-400">
                            {formatRelativeTime(comment.createdAt)}
                          </span>
                        </div>
                        {isCommentAuthor && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment.id)}
                            disabled={isDeletingThisComment}
                            className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed opacity-0 group-hover/comment:opacity-100 p-1 rounded hover:bg-gray-50"
                          >
                            {isDeletingThisComment ? "삭제 중..." : "삭제"}
                          </button>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-gray-800 leading-relaxed whitespace-pre-wrap pl-6.5 tracking-tight">
                        {comment.content}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* 댓글 작성 폼 — 로그인 시에만 표시 */}
            {session?.user ? (
              <form
                onSubmit={handleSubmitComment}
                className="space-y-3 pt-4 border-t border-gray-100/60"
              >
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  maxLength={COMMENT_MAX_LENGTH}
                  placeholder="따뜻한 댓글을 남겨보세요..."
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-gray-200/80 bg-gray-50/50 px-4.5 py-3.5 text-xs font-semibold text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 transition-all duration-200"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-450">
                    {commentText.length}/{COMMENT_MAX_LENGTH}
                  </span>
                  <button
                    type="submit"
                    disabled={isSubmittingComment}
                    className="rounded-xl bg-gray-950 px-4 py-2.5 text-xs font-bold text-white hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-150 shadow-sm"
                  >
                    {isSubmittingComment ? "등록 중..." : "댓글 등록"}
                  </button>
                </div>
                {commentError && (
                  <p className="text-xs font-bold text-red-500">{commentError}</p>
                )}
              </form>
            ) : (
              <div className="pt-4 border-t border-gray-100/60 text-center py-6">
                <p className="text-xs font-semibold text-gray-400 mb-3">
                  댓글을 작성하려면 로그인이 필요합니다
                </p>
                <button
                  onClick={() => router.push("/api/auth/signin")}
                  className="inline-flex items-center rounded-2xl bg-[#FEE500] px-5.5 py-3 text-xs font-bold text-[#191919] hover:bg-[#FDE100] active:scale-[0.98] transition-all duration-150 shadow-sm"
                >
                  카카오 로그인하고 댓글 쓰기
                </button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
