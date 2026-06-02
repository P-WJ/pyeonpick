import { type NextRequest, NextResponse } from "next/server";
import { upsertPushSubscription } from "@/infrastructure/repositories/push-subscription-repository";
import { STORES } from "@/lib/constants";

const VALID_STORES = new Set<string>(STORES);
const MAX_KEYWORDS = 10;
const MAX_KEYWORD_LENGTH = 30;

function validateEndpoint(endpoint: unknown): endpoint is string {
  return typeof endpoint === "string" && endpoint.startsWith("https://");
}

function validateKey(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function parseKeywords(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((k): k is string => typeof k === "string" && k.trim().length > 0 && k.length <= MAX_KEYWORD_LENGTH)
    .slice(0, MAX_KEYWORDS)
    .map((k) => k.trim());
}

function parseStores(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is string => typeof s === "string" && VALID_STORES.has(s));
}

// POST /api/push/subscribe
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: "요청 형식이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const { endpoint, p256dh, auth, keywords, stores } = body as Record<string, unknown>;

  if (!validateEndpoint(endpoint)) {
    return NextResponse.json(
      { data: null, error: "유효하지 않은 push endpoint입니다." },
      { status: 400 }
    );
  }

  if (!validateKey(p256dh) || !validateKey(auth)) {
    return NextResponse.json(
      { data: null, error: "p256dh 또는 auth 키가 누락되었습니다." },
      { status: 400 }
    );
  }

  try {
    const record = await upsertPushSubscription({
      endpoint,
      p256dh,
      auth,
      keywords: parseKeywords(keywords),
      stores: parseStores(stores),
    });

    return NextResponse.json({ data: { id: record.id }, error: null }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "구독 저장 중 오류가 발생했습니다.";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
