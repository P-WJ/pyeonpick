import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getPosts,
  createPost,
  getUserIdByKakaoId,
} from "@/infrastructure/repositories/post-repository";
import type { PostCategory } from "@/domain/entities/post";

const VALID_CATEGORIES = new Set<string>(["자유", "조합공유", "질문"]);
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const categoryParam = searchParams.get("category");
  const category =
    categoryParam && VALID_CATEGORIES.has(categoryParam)
      ? (categoryParam as PostCategory)
      : undefined;

  const page = Math.max(
    DEFAULT_PAGE,
    Number(searchParams.get("page") ?? DEFAULT_PAGE)
  );
  const limit = Math.max(
    1,
    Number(searchParams.get("limit") ?? DEFAULT_LIMIT)
  );

  try {
    const { posts, hasMore } = await getPosts({ category, page, limit });
    return NextResponse.json({
      data: posts,
      error: null,
      meta: { count: posts.length, page, limit, hasMore },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json(
      { data: null, error: message, meta: null },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.kakaoId) {
    return NextResponse.json(
      { data: null, error: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const userId = await getUserIdByKakaoId(session.user.kakaoId);

  if (!userId) {
    return NextResponse.json(
      { data: null, error: "사용자 정보를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: "요청 형식이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const { category, title, content } = body as {
    category?: unknown;
    title?: unknown;
    content?: unknown;
  };

  if (
    typeof category !== "string" ||
    !VALID_CATEGORIES.has(category) ||
    typeof title !== "string" ||
    title.trim().length === 0 ||
    typeof content !== "string" ||
    content.trim().length === 0
  ) {
    return NextResponse.json(
      { data: null, error: "카테고리, 제목, 내용을 모두 입력해주세요." },
      { status: 400 }
    );
  }

  try {
    const post = await createPost(
      userId,
      category as PostCategory,
      title.trim(),
      content.trim()
    );
    return NextResponse.json({ data: post, error: null }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json(
      { data: null, error: message },
      { status: 500 }
    );
  }
}
