import { createSupabaseServerClient } from "@/infrastructure/supabase";
import type { Product, Store, EventType, Category, Nutrition } from "@/domain/entities/product";
import { PRODUCTS_PAGE_LIMIT, RELATED_PRODUCTS_LIMIT, EVENT_TYPES } from "@/lib/constants";

const VALID_STORES = new Set<string>(["CU", "GS25", "세븐일레븐", "이마트24", "씨스페이스"]);
const VALID_EVENT_TYPES = new Set<string>(["1+1", "2+1", "3+1", "할인", "증정"]);
const VALID_CATEGORIES = new Set<string>(["음료", "과자", "식품", "아이스크림", "생활용품"]);

const EVENT_TYPE_SORT_ORDER: Record<string, number> = {
  "1+1": 1,
  "2+1": 2,
  "3+1": 3,
  "할인": 4,
  "증정": 5,
};

export interface ProductFilters {
  store?: Store;
  eventType?: EventType;
  category?: Category;
  search?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedProducts {
  products: Product[];
  hasMore: boolean;
}

function todayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

export async function getProducts(
  filters: ProductFilters = {},
  pagination: PaginationOptions = { page: 1, limit: PRODUCTS_PAGE_LIMIT }
): Promise<PaginatedProducts> {
  const supabase = createSupabaseServerClient();
  const offset = (pagination.page - 1) * pagination.limit;

  let query = supabase
    .from("products")
    .select("*")
    .gte("valid_to", todayDateString())
    .in("event_type", EVENT_TYPES);

  if (filters.store) query = query.eq("store", filters.store);
  if (filters.eventType) query = query.eq("event_type", filters.eventType);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.search) query = query.ilike("name", `%${filters.search}%`);

  const { data, error } = await query
    .order("name")
    .range(offset, offset + pagination.limit);

  if (error) throw new Error(`상품 조회 실패: ${error.message}`);

  const rows = data ?? [];
  // We fetch limit+1 rows to determine hasMore, then slice back to limit
  const hasMore = rows.length > pagination.limit;
  const slicedRows = hasMore ? rows.slice(0, pagination.limit) : rows;

  const products = slicedRows.flatMap((row) => {
    const product = parseProductRow(row);
    return product ? [product] : [];
  });

  return { products, hasMore };
}

export async function getProductById(id: number): Promise<Product | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;

  return parseProductRow(data as Record<string, unknown>);
}

export async function getRelatedProducts(
  productId: number,
  category: string,
  limit: number = RELATED_PRODUCTS_LIMIT
): Promise<Product[]> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("category", category)
    .neq("id", productId)
    .gte("valid_to", todayDateString())
    .in("event_type", EVENT_TYPES)
    .order("name")
    .limit(limit * 2); // fetch extra to allow client-side event type sort

  if (error) throw new Error(`관련 상품 조회 실패: ${error.message}`);

  const products = (data ?? []).flatMap((row) => {
    const product = parseProductRow(row);
    return product ? [product] : [];
  });

  return products
    .sort((productA, productB) => {
      const priorityA = EVENT_TYPE_SORT_ORDER[productA.eventType] ?? 99;
      const priorityB = EVENT_TYPE_SORT_ORDER[productB.eventType] ?? 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return productA.name.localeCompare(productB.name, "ko");
    })
    .slice(0, limit);
}

export async function getProductsByIds(ids: number[]): Promise<Product[]> {
  if (ids.length === 0) return [];

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .in("id", ids);

  if (error) throw new Error(`상품 일괄 조회 실패: ${error.message}`);

  return (data ?? []).flatMap((row) => {
    const product = parseProductRow(row);
    return product ? [product] : [];
  });
}

function parseProductRow(row: Record<string, unknown>): Product | null {
  const id = typeof row.id === "number" ? row.id : Number(row.id);
  const store = String(row.store ?? "");
  const name = String(row.name ?? "");
  const price = typeof row.price === "number" ? row.price : Number(row.price);
  const eventType = String(row.event_type ?? "");
  const category = String(row.category ?? "");
  const imageUrl = String(row.image_url ?? "");
  const validFrom = String(row.valid_from ?? "");
  const validTo = String(row.valid_to ?? "");

  if (!VALID_STORES.has(store)) return null;
  if (!VALID_EVENT_TYPES.has(eventType)) return null;
  if (!VALID_CATEGORIES.has(category)) return null;
  if (!name || isNaN(id) || isNaN(price)) return null;

  const nutrition =
    row.nutrition != null && typeof row.nutrition === "object"
      ? (row.nutrition as Nutrition)
      : null;

  return {
    id,
    store: store as Store,
    name,
    price,
    eventType: eventType as EventType,
    category: category as Category,
    imageUrl,
    validFrom,
    validTo,
    nutrition,
  };
}
