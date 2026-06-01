import { type NextRequest, NextResponse } from "next/server";
import { getProductsByIds } from "@/infrastructure/repositories/product-repository";

export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get("ids");

  if (!idsParam || idsParam.trim() === "") {
    return NextResponse.json({ data: [], error: null });
  }

  const ids = idsParam
    .split(",")
    .map((segment: string) => Number(segment.trim()))
    .filter((id: number) => !isNaN(id) && id > 0);

  if (ids.length === 0) {
    return NextResponse.json({ data: [], error: null });
  }

  try {
    const products = await getProductsByIds(ids);
    return NextResponse.json({ data: products, error: null });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json(
      { data: null, error: message },
      { status: 500 }
    );
  }
}
