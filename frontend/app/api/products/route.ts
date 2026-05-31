import { type NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/app/use-cases/get-products";
import type { Store, EventType, Category } from "@/domain/entities/product";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filters = {
    store: (searchParams.get("store") as Store) || undefined,
    eventType: (searchParams.get("eventType") as EventType) || undefined,
    category: (searchParams.get("category") as Category) || undefined,
    search: searchParams.get("search") || undefined,
  };

  try {
    const products = await getProducts(filters);
    return NextResponse.json({
      data: products,
      error: null,
      meta: { count: products.length },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json(
      { data: null, error: message, meta: null },
      { status: 500 }
    );
  }
}
