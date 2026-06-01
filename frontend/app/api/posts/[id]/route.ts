import { type NextRequest, NextResponse } from "next/server";
import { getPostById } from "@/infrastructure/repositories/post-repository";

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
