import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getPostById,
  updatePost,
  deletePost,
  getUserIdByKakaoId,
} from "@/infrastructure/repositories/post-repository";

const MIN_TITLE_LENGTH = 1;
const MAX_TITLE_LENGTH = 100;
const MIN_CONTENT_LENGTH = 1;
const MAX_CONTENT_LENGTH = 10000;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const postId = Number(id);

  if (isNaN(postId) || postId <= 0) {
    return NextResponse.json(
      { data: null, error: "올바르지 않은 게시글 ID입니다." },
      { status: 400 }
    );
  }

  try {
    const post = await getPostById(postId);

    if (!post) {
      return NextResponse.json(
        { data: null, error: "게시글을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: post, error: null });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json(
      { data: null, error: message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.kakaoId) {
    return NextResponse.json(
      { data: null, error: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const { id } = await params;
  const postId = Number(id);

  if (isNaN(postId) || postId <= 0) {
    return NextResponse.json(
      { data: null, error: "올바르지 않은 게시글 ID입니다." },
      { status: 400 }
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

  const { title, content } = body as { title?: unknown; content?: unknown };

  if (
    typeof title !== "string" ||
    title.trim().length < MIN_TITLE_LENGTH ||
    title.trim().length > MAX_TITLE_LENGTH
  ) {
    return NextResponse.json(
      { data: null, error: `제목은 ${MIN_TITLE_LENGTH}~${MAX_TITLE_LENGTH}자여야 합니다.` },
      { status: 400 }
    );
  }

  if (
    typeof content !== "string" ||
    content.trim().length < MIN_CONTENT_LENGTH ||
    content.trim().length > MAX_CONTENT_LENGTH
  ) {
    return NextResponse.json(
      { data: null, error: `내용은 ${MIN_CONTENT_LENGTH}~${MAX_CONTENT_LENGTH}자여야 합니다.` },
      { status: 400 }
    );
  }

  try {
    const post = await updatePost(postId, userId, title.trim(), content.trim());
    return NextResponse.json({ data: post, error: null });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    const status = message.includes("권한") ? 403 : 500;
    return NextResponse.json({ data: null, error: message }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.kakaoId) {
    return NextResponse.json(
      { data: null, error: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const { id } = await params;
  const postId = Number(id);

  if (isNaN(postId) || postId <= 0) {
    return NextResponse.json(
      { data: null, error: "올바르지 않은 게시글 ID입니다." },
      { status: 400 }
    );
  }

  const userId = await getUserIdByKakaoId(session.user.kakaoId);

  if (!userId) {
    return NextResponse.json(
      { data: null, error: "사용자 정보를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  try {
    await deletePost(postId, userId);
    return NextResponse.json({ data: { success: true }, error: null });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    const status = message.includes("권한") ? 403 : 500;
    return NextResponse.json({ data: null, error: message }, { status });
  }
}
