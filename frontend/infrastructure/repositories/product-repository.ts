import { createSupabaseServerClient } from "@/infrastructure/supabase";
import type { Product, Store, EventType, Category } from "@/domain/entities/product";
import { PRODUCTS_FETCH_LIMIT } from "@/lib/constants";

const VALID_STORES = new Set<string>(["CU", "GS25", "세븐일레븐", "이마트24", "씨스페이스"]);
const VALID_EVENT_TYPES = new Set<string>(["1+1", "2+1", "할인"]);
const VALID_CATEGORIES = new Set<string>(["음료", "과자", "간편식사", "아이스크림", "생활용품", "기타"]);

export interface ProductFilters {
  store?: Store;
  eventType?: EventType;
  category?: Category;
  search?: string;
}

function todayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

export async function getProducts(filters: ProductFilters = {}): Promise<Product[]> {
  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("products")
    .select("*")
    .gte("valid_to", todayDateString())
    .in("event_type", ["1+1", "2+1"])
    .limit(PRODUCTS_FETCH_LIMIT);

  if (filters.store) query = query.eq("store", filters.store);
  if (filters.eventType) query = query.eq("event_type", filters.eventType);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.search) query = query.ilike("name", `%${filters.search}%`);

  const { data, error } = await query.order("name").range(0, PRODUCTS_FETCH_LIMIT - 1);
  if (error) throw new Error(`상품 조회 실패: ${error.message}`);

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
  };
}
