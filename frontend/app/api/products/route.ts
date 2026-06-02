import { type NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/app/use-cases/get-products";
import type { Store, EventType, Category, ProductSort } from "@/domain/entities/product";
import { PRODUCTS_PAGE_LIMIT, STORES, EVENT_TYPES, CATEGORIES } from "@/lib/constants";

const DEFAULT_PAGE = 1;
const VALID_STORES = new Set<string>(STORES);
const VALID_EVENT_TYPES = new Set<string>(EVENT_TYPES);
const VALID_CATEGORIES = new Set<string>(CATEGORIES);
const VALID_SORTS = new Set<string>(["recommended", "price_asc", "discount"]);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const storeParam = searchParams.get("store") || undefined;
  const eventTypeParam = searchParams.get("eventType") || undefined;
  const categoryParam = searchParams.get("category") || undefined;
  const sortParam = searchParams.get("sort") || undefined;

  if (storeParam && !VALID_STORES.has(storeParam)) {
    return NextResponse.json({ data: null, error: "유효하지 않은 편의점 값입니다.", meta: null }, { status: 400 });
  }
  if (eventTypeParam && !VALID_EVENT_TYPES.has(eventTypeParam)) {
    return NextResponse.json({ data: null, error: "유효하지 않은 행사 유형 값입니다.", meta: null }, { status: 400 });
  }
  if (categoryParam && !VALID_CATEGORIES.has(categoryParam)) {
    return NextResponse.json({ data: null, error: "유효하지 않은 카테고리 값입니다.", meta: null }, { status: 400 });
  }
  if (sortParam && !VALID_SORTS.has(sortParam)) {
    return NextResponse.json({ data: null, error: "유효하지 않은 정렬 값입니다.", meta: null }, { status: 400 });
  }

  const filters = {
    store: storeParam as Store | undefined,
    eventType: eventTypeParam as EventType | undefined,
    category: categoryParam as Category | undefined,
    search: searchParams.get("search") || undefined,
    sort: sortParam as ProductSort | undefined,
  };

  const page = Math.max(DEFAULT_PAGE, Number(searchParams.get("page") ?? DEFAULT_PAGE));
  const limit = Math.max(1, Number(searchParams.get("limit") ?? PRODUCTS_PAGE_LIMIT));

  try {
    const { products, hasMore } = await getProducts(filters, { page, limit });
    return NextResponse.json({
      data: products,
      error: null,
      meta: { count: products.length, page, limit, hasMore },
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
