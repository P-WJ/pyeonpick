import { unstable_cache } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import type { Store } from "@/domain/entities/product";
import type { RecommendationResult } from "@/domain/entities/recommendation";
import { buildRecommendationPrompt, parseRecommendationResponse } from "@/domain/use-cases/recommend";
import { generateTextFromPrompt } from "@/infrastructure/gemini";
import { getProducts } from "@/app/use-cases/get-products";

const MAX_PRODUCTS_FOR_AI = 100;
const MIN_BUDGET = 1000;
const MAX_BUDGET = 10_000_000;
const MAX_USER_PROMPT_LENGTH = 200;
const CACHE_REVALIDATE_SECONDS = 5 * 60; // 5분

function buildCacheKey(budget: number, stores: Store[], userPrompt: string): string {
  const sortedStores = [...stores].sort().join(",");
  return `ai-recommend:${budget}:${sortedStores}:${userPrompt}`;
}

function createCachedRecommendation(budget: number, stores: Store[], userPrompt: string) {
  const cacheKey = buildCacheKey(budget, stores, userPrompt);
  return unstable_cache(
    async (): Promise<RecommendationResult> => {
      const filters = stores.length === 1 ? { store: stores[0] } : {};

      let products;
      if (stores.length > 1) {
        const perStoreLimit = Math.ceil(MAX_PRODUCTS_FOR_AI / stores.length);
        const storeProductArrays = await Promise.all(
          stores.map((store) =>
            getProducts({ store }, { page: 1, limit: perStoreLimit }).then(
              (result) => result.products
            )
          )
        );
        products = storeProductArrays.flat().slice(0, MAX_PRODUCTS_FOR_AI);
      } else {
        const result = await getProducts(filters, { page: 1, limit: MAX_PRODUCTS_FOR_AI });
        products = result.products;
      }

      if (products.length === 0) {
        throw new Error("현재 조건에 맞는 행사 상품이 없습니다.");
      }

      const prompt = buildRecommendationPrompt(products, budget, userPrompt);
      const rawResponse = await generateTextFromPrompt(prompt);
      return parseRecommendationResponse(rawResponse);
    },
    [cacheKey],
    { revalidate: CACHE_REVALIDATE_SECONDS, tags: ["ai-recommend"] }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { budget?: unknown; stores?: unknown; userPrompt?: unknown };

    const budget = Number(body.budget);
    if (!Number.isFinite(budget) || budget < MIN_BUDGET || budget > MAX_BUDGET) {
      return NextResponse.json(
        {
          data: null,
          error: `예산은 ${MIN_BUDGET.toLocaleString("ko-KR")}원 이상 ${MAX_BUDGET.toLocaleString("ko-KR")}원 이하로 입력해주세요.`,
        },
        { status: 400 }
      );
    }

    const requestedStores: Store[] = Array.isArray(body.stores) && body.stores.length > 0
      ? (body.stores as Store[])
      : [];

    const userPrompt = typeof body.userPrompt === "string"
      ? body.userPrompt.trim().slice(0, MAX_USER_PROMPT_LENGTH)
      : "";

    const getCachedRecommendation = createCachedRecommendation(budget, requestedStores, userPrompt);
    const recommendationResult = await getCachedRecommendation();

    return NextResponse.json({ data: recommendationResult, error: null });
  } catch (error) {
    if (error instanceof Error && error.message === "현재 조건에 맞는 행사 상품이 없습니다.") {
      return NextResponse.json({ data: null, error: error.message }, { status: 404 });
    }
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json(
      { data: null, error: message },
      { status: 500 }
    );
  }
}
