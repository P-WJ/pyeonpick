import { NextResponse } from "next/server";
import { getProductStats } from "@/app/use-cases/get-products";

export async function GET() {
  try {
    const stats = await getProductStats();
    return NextResponse.json({ data: stats, error: null });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
