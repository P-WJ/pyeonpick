import { NextRequest, NextResponse } from "next/server";
import {
  upsertSubscription,
  deactivateSubscription,
  getSubscriptionByEmail,
} from "@/infrastructure/repositories/subscription-repository";
import { STORES } from "@/lib/constants";
import type { Store } from "@/domain/entities/product";

const VALID_STORES = new Set<string>(STORES);
const MAX_KEYWORDS = 10;
const MAX_KEYWORD_LENGTH = 30;

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function validateKeywords(keywords: unknown): string[] | null {
  if (!Array.isArray(keywords)) return null;
  if (keywords.length > MAX_KEYWORDS) return null;
  return keywords
    .filter((k) => typeof k === "string" && k.trim().length > 0 && k.length <= MAX_KEYWORD_LENGTH)
    .map((k: string) => k.trim());
}

function validateStores(stores: unknown): Store[] | null {
  if (!Array.isArray(stores)) return null;
  return stores.filter((s) => typeof s === "string" && VALID_STORES.has(s)) as Store[];
}

// GET /api/subscriptions?email=... — 알림 설정 조회
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email") ?? "";
  if (!validateEmail(email)) {
    return NextResponse.json({ data: null, error: "유효하지 않은 이메일 주소입니다." }, { status: 400 });
  }
  try {
    const subscription = await getSubscriptionByEmail(email);
    return NextResponse.json({ data: subscription, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "조회 중 오류가 발생했습니다.";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}

// POST /api/subscriptions — 알림 설정 등록/수정
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ data: null, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const { email, keywords, stores } = body as Record<string, unknown>;

  if (typeof email !== "string" || !validateEmail(email)) {
    return NextResponse.json({ data: null, error: "유효하지 않은 이메일 주소입니다." }, { status: 400 });
  }

  const validatedKeywords = validateKeywords(keywords ?? []);
  if (validatedKeywords === null) {
    return NextResponse.json(
      { data: null, error: `키워드는 최대 ${MAX_KEYWORDS}개까지 입력할 수 있습니다.` },
      { status: 400 }
    );
  }

  const validatedStores = validateStores(stores ?? []);
  if (validatedStores === null) {
    return NextResponse.json({ data: null, error: "유효하지 않은 편의점 값입니다." }, { status: 400 });
  }

  try {
    const subscription = await upsertSubscription({
      email,
      keywords: validatedKeywords,
      stores: validatedStores,
    });

    return NextResponse.json({ data: subscription, error: null }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}

// DELETE /api/subscriptions?email=... — 알림 해제
export async function DELETE(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email") ?? "";
  if (!validateEmail(email)) {
    return NextResponse.json({ data: null, error: "유효하지 않은 이메일 주소입니다." }, { status: 400 });
  }
  try {
    const existing = await getSubscriptionByEmail(email);
    if (!existing) {
      return NextResponse.json({ data: null, error: "알림 설정을 찾을 수 없습니다." }, { status: 404 });
    }
    await deactivateSubscription(email);
    return NextResponse.json({ data: { email }, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "해제 중 오류가 발생했습니다.";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
