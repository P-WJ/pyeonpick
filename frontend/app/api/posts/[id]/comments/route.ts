import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getComments,
  createComment,
  getUserIdByKakaoId,
} from "@/infrastructure/repositories/post-repository";

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
    const comments = await getComments(postId);
    return NextResponse.json({ data: comments, error: null });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json(
      { data: null, error: message },
      { status: 500 }
    );
  }
}

export async function POST(
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

  const { content } = body as { content?: unknown };

  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json(
      { data: null, error: "댓글 내용을 입력해주세요." },
      { status: 400 }
    );
  }

  try {
    const comment = await createComment(postId, userId, content.trim());
    return NextResponse.json({ data: comment, error: null }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json(
      { data: null, error: message },
      { status: 500 }
    );
  }
}
