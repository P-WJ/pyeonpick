import { createSupabaseServerClient } from "@/infrastructure/supabase";
import type { Post, Comment, PostCategory } from "@/domain/entities/post";

const VALID_CATEGORIES = new Set<string>(["자유", "조합공유", "질문"]);
const DEFAULT_POSTS_LIMIT = 20;

export interface GetPostsOptions {
  category?: PostCategory;
  page: number;
  limit?: number;
  authorUserId?: string;
}

export interface PaginatedPosts {
  posts: Post[];
  hasMore: boolean;
}

export async function getPosts({
  category,
  page,
  limit = DEFAULT_POSTS_LIMIT,
  authorUserId,
}: GetPostsOptions): Promise<PaginatedPosts> {
  const supabase = createSupabaseServerClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from("posts")
    .select(
      `id, user_id, category, title, content, created_at, updated_at,
       users(nickname, profile_image),
       comments(count)`
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit);

  if (category) {
    query = query.eq("category", category);
  }

  if (authorUserId) {
    query = query.eq("user_id", authorUserId);
  }

  const { data, error } = await query;

  if (error) throw new Error(`게시글 목록 조회 실패: ${error.message}`);

  const rows = (data ?? []) as unknown as PostRow[];
  const hasMore = rows.length > limit;
  const slicedRows = hasMore ? rows.slice(0, limit) : rows;

  return {
    posts: slicedRows.map(parsePostRow),
    hasMore,
  };
}

export async function getPostById(id: number): Promise<Post | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("posts")
    .select(
      `id, user_id, category, title, content, created_at, updated_at,
       users(nickname, profile_image),
       comments(count)`
    )
    .eq("id", id)
    .single();

  if (error) return null;

  return parsePostRow(data as unknown as PostRow);
}

export async function createPost(
  userId: string,
  category: PostCategory,
  title: string,
  content: string
): Promise<Post> {
  const supabase = createSupabaseServerClient();

  const { data: insertedData, error: insertError } = await supabase
    .from("posts")
    .insert({ user_id: userId, category, title, content })
    .select("id")
    .single();

  if (insertError) throw new Error(`게시글 작성 실패: ${insertError.message}`);

  const createdId = (insertedData as { id: number }).id;
  const post = await getPostById(createdId);

  if (!post) throw new Error("게시글 작성 후 조회에 실패했습니다.");

  return post;
}

export async function getComments(postId: number): Promise<Comment[]> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("comments")
    .select(
      `id, post_id, user_id, content, created_at,
       users(nickname, profile_image)`
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`댓글 조회 실패: ${error.message}`);

  return (data ?? []).map((row) => parseCommentRow(row as unknown as CommentRow));
}

export async function createComment(
  postId: number,
  userId: string,
  content: string
): Promise<Comment> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, user_id: userId, content })
    .select(
      `id, post_id, user_id, content, created_at,
       users(nickname, profile_image)`
    )
    .single();

  if (error) throw new Error(`댓글 작성 실패: ${error.message}`);

  return parseCommentRow(data as unknown as CommentRow);
}

export async function updatePost(
  postId: number,
  userId: string,
  title: string,
  content: string
): Promise<Post> {
  const supabase = createSupabaseServerClient();

  const { data: updatedData, error: updateError } = await supabase
    .from("posts")
    .update({ title, content, updated_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("user_id", userId)
    .select("id");

  if (updateError) throw new Error(`게시글 수정 실패: ${updateError.message}`);

  const rows = updatedData as { id: number }[] | null;
  if (!rows || rows.length === 0) {
    throw new Error("권한이 없거나 존재하지 않는 게시글입니다.");
  }

  const post = await getPostById(postId);
  if (!post) throw new Error("게시글 수정 후 조회에 실패했습니다.");

  return post;
}

export async function deletePost(
  postId: number,
  userId: string
): Promise<void> {
  const supabase = createSupabaseServerClient();

  const { data: deletedData, error: deleteError } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", userId)
    .select("id");

  if (deleteError) throw new Error(`게시글 삭제 실패: ${deleteError.message}`);

  const rows = deletedData as { id: number }[] | null;
  if (!rows || rows.length === 0) {
    throw new Error("권한이 없거나 존재하지 않는 게시글입니다.");
  }
}

export async function deleteComment(
  commentId: number,
  userId: string
): Promise<void> {
  const supabase = createSupabaseServerClient();

  const { data: deletedData, error: deleteError } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", userId)
    .select("id");

  if (deleteError) throw new Error(`댓글 삭제 실패: ${deleteError.message}`);

  const rows = deletedData as { id: number }[] | null;
  if (!rows || rows.length === 0) {
    throw new Error("권한이 없거나 존재하지 않는 댓글입니다.");
  }
}

export async function getUserIdByKakaoId(
  kakaoId: string
): Promise<string | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (error || !data) return null;

  return String((data as { id: string }).id);
}

// --- 내부 파싱 헬퍼 ---

interface UserJoin {
  nickname: string;
  profile_image: string | null;
}

interface CommentCountJoin {
  count: number;
}

interface PostRow {
  id: number;
  user_id: string;
  category: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  users: UserJoin | null;
  comments: CommentCountJoin[] | null;
}

interface CommentRow {
  id: number;
  post_id: number;
  user_id: string;
  content: string;
  created_at: string;
  users: UserJoin | null;
}

function parsePostRow(row: PostRow): Post {
  const category = VALID_CATEGORIES.has(row.category)
    ? (row.category as PostCategory)
    : "자유";

  const commentCount =
    Array.isArray(row.comments) && row.comments.length > 0
      ? Number(row.comments[0]?.count ?? 0)
      : 0;

  return {
    id: Number(row.id),
    userId: String(row.user_id),
    authorNickname: row.users?.nickname ?? "알 수 없음",
    authorProfileImage: row.users?.profile_image ?? "",
    category,
    title: String(row.title),
    content: String(row.content),
    commentCount,
    createdAt: String(row.created_at),
  };
}

function parseCommentRow(row: CommentRow): Comment {
  return {
    id: Number(row.id),
    postId: Number(row.post_id),
    userId: String(row.user_id),
    authorNickname: row.users?.nickname ?? "알 수 없음",
    authorProfileImage: row.users?.profile_image ?? "",
    content: String(row.content),
    createdAt: String(row.created_at),
  };
}
