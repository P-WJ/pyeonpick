import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  deleteComment,
  getUserIdByKakaoId,
} from "@/infrastructure/repositories/post-repository";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const session = await auth();

  if (!session?.user?.kakaoId) {
    return NextResponse.json(
      { data: null, error: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const { commentId } = await params;
  const commentIdNumber = Number(commentId);

  if (isNaN(commentIdNumber) || commentIdNumber <= 0) {
    return NextResponse.json(
      { data: null, error: "올바르지 않은 댓글 ID입니다." },
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
    await deleteComment(commentIdNumber, userId);
    return NextResponse.json({ data: { success: true }, error: null });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    const status = message.includes("권한") ? 403 : 500;
    return NextResponse.json({ data: null, error: message }, { status });
  }
}
