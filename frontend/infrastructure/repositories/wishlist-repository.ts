import { createSupabaseServerClient } from "@/infrastructure/supabase";

export async function getWishlistProductIds(userId: string): Promise<number[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("wishlists")
    .select("product_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`찜 목록 조회 실패: ${error.message}`);
  return (data ?? []).map((row) => Number(row.product_id));
}

/**
 * 찜을 추가한다. 이미 있는 항목은 무시한다.
 * 크롤러가 지운 상품 id가 섞여 있으면 FK 오류로 전체가 실패하므로 존재하는 상품만 넣는다.
 */
export async function addWishlistItems(userId: string, productIds: number[]): Promise<number> {
  if (productIds.length === 0) return 0;
  const supabase = createSupabaseServerClient();

  const { data: existing, error: lookupError } = await supabase
    .from("products")
    .select("id")
    .in("id", productIds);
  if (lookupError) throw new Error(`찜 상품 확인 실패: ${lookupError.message}`);

  const rows = (existing ?? []).map((row) => ({ user_id: userId, product_id: row.id }));
  if (rows.length === 0) return 0;

  const { error } = await supabase
    .from("wishlists")
    .upsert(rows, { onConflict: "user_id,product_id", ignoreDuplicates: true });
  if (error) throw new Error(`찜 추가 실패: ${error.message}`);
  return rows.length;
}

export async function removeWishlistItem(userId: string, productId: number): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("wishlists")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", productId);
  if (error) throw new Error(`찜 삭제 실패: ${error.message}`);
}
