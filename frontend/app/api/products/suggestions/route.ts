import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/infrastructure/supabase";

const MINIMUM_QUERY_LENGTH = 2;
const SUGGESTION_LIMIT = 8;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";

  if (query.length < MINIMUM_QUERY_LENGTH) {
    return NextResponse.json({ data: [], error: null });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("name")
    .ilike("name", `%${query}%`)
    .limit(SUGGESTION_LIMIT);

  if (error) {
    return NextResponse.json({ data: [], error: error.message });
  }

  const names = [...new Set((data ?? []).map((row) => row.name))];
  return NextResponse.json({ data: names, error: null });
}
