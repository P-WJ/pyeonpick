import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/infrastructure/supabase";
import { getRelatedProducts } from "@/infrastructure/repositories/product-repository";
import { RELATED_PRODUCTS_LIMIT } from "@/lib/constants";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const productId = Number(id);

  if (isNaN(productId)) {
    return NextResponse.json(
      { data: null, error: "유효하지 않은 상품 ID입니다.", meta: null },
      { status: 400 }
    );
  }

  try {
    const supabase = createSupabaseServerClient();
    const { data: productRow, error: productError } = await supabase
      .from("products")
      .select("category")
      .eq("id", productId)
      .single();

    if (productError || !productRow) {
      return NextResponse.json(
        { data: null, error: "상품을 찾을 수 없습니다.", meta: null },
        { status: 404 }
      );
    }

    const category = String(productRow.category ?? "");
    const relatedProducts = await getRelatedProducts(productId, category, RELATED_PRODUCTS_LIMIT);

    return NextResponse.json({
      data: relatedProducts,
      error: null,
      meta: { count: relatedProducts.length },
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
