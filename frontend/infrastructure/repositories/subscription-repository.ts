import { createSupabaseServerClient } from "@/infrastructure/supabase";
import type { Store } from "@/domain/entities/product";

export interface Subscription {
  id: string;
  email: string;
  keywords: string[];
  stores: Store[];
  isActive: boolean;
  createdAt: string;
}

export interface CreateSubscriptionInput {
  email: string;
  keywords: string[];
  stores: Store[];
}

export async function createSubscription(
  input: CreateSubscriptionInput
): Promise<Subscription> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      email: input.email.toLowerCase(),
      keywords: input.keywords,
      stores: input.stores,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("이미 알림을 설정한 이메일 주소입니다.");
    }
    throw new Error(`알림 설정 저장 실패: ${error.message}`);
  }

  return parseRow(data as Record<string, unknown>);
}

export async function updateSubscription(
  email: string,
  input: Omit<CreateSubscriptionInput, "email">
): Promise<Subscription> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .update({ keywords: input.keywords, stores: input.stores })
    .eq("email", email.toLowerCase())
    .eq("is_active", true)
    .select()
    .single();

  if (error) throw new Error(`알림 설정 수정 실패: ${error.message}`);

  return parseRow(data as Record<string, unknown>);
}

export async function deactivateSubscription(email: string): Promise<void> {
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from("subscriptions")
    .update({ is_active: false })
    .eq("email", email.toLowerCase())
    .eq("is_active", true);

  if (error) throw new Error(`알림 해제 실패: ${error.message}`);
}

export async function getSubscriptionByEmail(
  email: string
): Promise<Subscription | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("email", email.toLowerCase())
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(`알림 설정 조회 실패: ${error.message}`);
  if (!data) return null;

  return parseRow(data as Record<string, unknown>);
}

function parseRow(row: Record<string, unknown>): Subscription {
  return {
    id: String(row.id ?? ""),
    email: String(row.email ?? ""),
    keywords: Array.isArray(row.keywords) ? (row.keywords as string[]) : [],
    stores: Array.isArray(row.stores) ? (row.stores as Store[]) : [],
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at ?? ""),
  };
}
