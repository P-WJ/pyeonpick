import { type NextRequest, NextResponse } from "next/server";
import type { Store } from "@/domain/entities/product";
import type { RecommendationResult } from "@/domain/entities/recommendation";
import { buildRecommendationPrompt, parseRecommendationResponse } from "@/domain/use-cases/recommend";
import { generateTextFromPrompt } from "@/infrastructure/gemini";
import { getProducts } from "@/app/use-cases/get-products";

const MAX_PRODUCTS_FOR_AI = 100;
const MIN_BUDGET = 1000;
const MAX_BUDGET = 10_000_000;

const recommendationCache = new Map<string, { result: RecommendationResult; cachedAt: number }>();
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5분

function buildCacheKey(budget: number, stores: Store[]): string {
  const sortedStores = [...stores].sort().join(",");
  return `${budget}:${sortedStores}`;
}

function getCachedResult(cacheKey: string): RecommendationResult | null {
  const cached = recommendationCache.get(cacheKey);
  if (!cached) return null;

  const isExpired = Date.now() - cached.cachedAt > CACHE_DURATION_MS;
  if (isExpired) {
    recommendationCache.delete(cacheKey);
    return null;
  }

  return cached.result;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { budget?: unknown; stores?: unknown };

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

    const cacheKey = buildCacheKey(budget, requestedStores);
    const cachedResult = getCachedResult(cacheKey);
    if (cachedResult) {
      return NextResponse.json({ data: cachedResult, error: null });
    }

    const filters = requestedStores.length > 0
      ? { store: requestedStores[0] }
      : {};

    // 여러 편의점 필터 처리: 각 편의점 상품을 개별 조회 후 합산
    let products;
    if (requestedStores.length > 1) {
      const perStoreLimit = Math.ceil(MAX_PRODUCTS_FOR_AI / requestedStores.length);
      const storeProductArrays = await Promise.all(
        requestedStores.map((store) =>
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
      return NextResponse.json(
        { data: null, error: "현재 조건에 맞는 행사 상품이 없습니다." },
        { status: 404 }
      );
    }

    const prompt = buildRecommendationPrompt(products, budget);
    const rawResponse = await generateTextFromPrompt(prompt);
    const recommendationResult = parseRecommendationResponse(rawResponse);

    recommendationCache.set(cacheKey, {
      result: recommendationResult,
      cachedAt: Date.now(),
    });

    return NextResponse.json({ data: recommendationResult, error: null });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json(
      { data: null, error: message },
      { status: 500 }
    );
  }
}
