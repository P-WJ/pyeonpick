import { type NextRequest, NextResponse } from "next/server";
import { getPushSubscriptionByEndpoint } from "@/infrastructure/repositories/push-subscription-repository";

// GET /api/push/subscription?endpoint=<url>
// sw.js의 pushsubscriptionchange 핸들러에서 기존 구독의 keywords/stores를 복원할 때 사용한다.
export async function GET(request: NextRequest) {
  const endpoint = request.nextUrl.searchParams.get("endpoint");

  if (!endpoint || !endpoint.startsWith("https://")) {
    return NextResponse.json(
      { data: null, error: "유효하지 않은 endpoint 파라미터입니다." },
      { status: 400 }
    );
  }

  try {
    const record = await getPushSubscriptionByEndpoint(endpoint);

    if (!record) {
      return NextResponse.json(
        { data: null, error: "해당 endpoint의 구독 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { data: { keywords: record.keywords, stores: record.stores }, error: null },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "구독 정보 조회 중 오류가 발생했습니다.";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
