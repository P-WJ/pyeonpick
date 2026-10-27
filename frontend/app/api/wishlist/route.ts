import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserIdByKakaoId } from "@/infrastructure/repositories/post-repository";
import {
  getWishlistProductIds,
  addWishlistItems,
  removeWishlistItem,
} from "@/infrastructure/repositories/wishlist-repository";

// 로그인 직후 로컬 찜을 한 번에 올리는 경우를 고려한 상한
const MAX_PRODUCT_IDS_PER_REQUEST = 500;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ data: null, error: message, meta: null }, { status });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
}

/** 로그인 사용자의 users.id. 비로그인이거나 사용자 행이 없으면 null. */
async function resolveUserId(): Promise<string | null> {
  const session = await auth();
  const kakaoId = session?.user?.kakaoId;
  if (!kakaoId) return null;
  return getUserIdByKakaoId(kakaoId);
}

function isProductId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

// GET /api/wishlist — 내 찜 상품 id 목록
export async function GET() {
  const userId = await resolveUserId();
  if (!userId) return errorResponse("로그인이 필요합니다.", 401);

  try {
    const productIds = await getWishlistProductIds(userId);
    return NextResponse.json({ data: productIds, error: null, meta: { count: productIds.length } });
  } catch (error) {
    return errorResponse(errorMessage(error), 500);
  }
}

// POST /api/wishlist — body: { productIds: number[] } 찜 추가 (중복 무시)
export async function POST(request: NextRequest) {
  const userId = await resolveUserId();
  if (!userId) return errorResponse("로그인이 필요합니다.", 401);

  let body: { productIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse("요청 본문이 올바른 JSON이 아닙니다.", 400);
  }

  if (!Array.isArray(body.productIds) || !body.productIds.every(isProductId)) {
    return errorResponse("productIds는 양의 정수 배열이어야 합니다.", 400);
  }
  if (body.productIds.length > MAX_PRODUCT_IDS_PER_REQUEST) {
    return errorResponse(`한 번에 최대 ${MAX_PRODUCT_IDS_PER_REQUEST}개까지 추가할 수 있습니다.`, 400);
  }

  try {
    const added = await addWishlistItems(userId, body.productIds);
    return NextResponse.json({ data: { added }, error: null });
  } catch (error) {
    return errorResponse(errorMessage(error), 500);
  }
}

// DELETE /api/wishlist?productId=123 — 찜 해제
export async function DELETE(request: NextRequest) {
  const userId = await resolveUserId();
  if (!userId) return errorResponse("로그인이 필요합니다.", 401);

  const productId = Number(request.nextUrl.searchParams.get("productId"));
  if (!isProductId(productId)) return errorResponse("productId가 올바르지 않습니다.", 400);

  try {
    await removeWishlistItem(userId, productId);
    return NextResponse.json({ data: { productId }, error: null });
  } catch (error) {
    return errorResponse(errorMessage(error), 500);
  }
}
