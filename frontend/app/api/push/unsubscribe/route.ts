import { type NextRequest, NextResponse } from "next/server";
import { deletePushSubscription } from "@/infrastructure/repositories/push-subscription-repository";

// DELETE /api/push/unsubscribe
export async function DELETE(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: "요청 형식이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const { endpoint } = body as Record<string, unknown>;

  if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) {
    return NextResponse.json(
      { data: null, error: "유효하지 않은 push endpoint입니다." },
      { status: 400 }
    );
  }

  try {
    await deletePushSubscription(endpoint);
    return NextResponse.json({ data: null, error: null }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "구독 해제 중 오류가 발생했습니다.";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
