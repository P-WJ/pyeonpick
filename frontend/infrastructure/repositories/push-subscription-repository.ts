import { createSupabaseServerClient } from "@/infrastructure/supabase";

export interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  keywords: string[];
  stores: string[];
  createdAt: string;
}

export interface CreatePushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  keywords?: string[];
  stores?: string[];
}

export async function upsertPushSubscription(
  input: CreatePushSubscriptionInput
): Promise<PushSubscriptionRecord> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        keywords: input.keywords ?? [],
        stores: input.stores ?? [],
      },
      { onConflict: "endpoint" }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`웹 푸시 구독 저장 실패: ${error.message}`);
  }

  return parseRow(data as Record<string, unknown>);
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) {
    throw new Error(`웹 푸시 구독 해제 실패: ${error.message}`);
  }
}

export async function getAllPushSubscriptions(): Promise<PushSubscriptionRecord[]> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*");

  if (error) {
    throw new Error(`웹 푸시 구독 목록 조회 실패: ${error.message}`);
  }

  return (data as Record<string, unknown>[]).map(parseRow);
}

function parseRow(row: Record<string, unknown>): PushSubscriptionRecord {
  return {
    id: String(row.id ?? ""),
    endpoint: String(row.endpoint ?? ""),
    p256dh: String(row.p256dh ?? ""),
    auth: String(row.auth ?? ""),
    keywords: Array.isArray(row.keywords) ? (row.keywords as string[]) : [],
    stores: Array.isArray(row.stores) ? (row.stores as string[]) : [],
    createdAt: String(row.created_at ?? ""),
  };
}
