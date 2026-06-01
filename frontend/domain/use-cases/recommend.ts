import type { Product } from "@/domain/entities/product";
import type { RecommendationResult } from "@/domain/entities/recommendation";

const MAX_PRODUCTS_IN_PROMPT = 100;

export function buildRecommendationPrompt(
  products: Product[],
  budget: number
): string {
  const limitedProducts = products.slice(0, MAX_PRODUCTS_IN_PROMPT);

  const productSummaries = limitedProducts.map((product) => ({
    id: product.id,
    store: product.store,
    name: product.name,
    price: product.price,
    eventType: product.eventType,
    category: product.category,
  }));

  return `
당신은 편의점 쇼핑 전문가입니다. 아래 현재 행사 중인 편의점 상품 목록을 분석하여 예산에 맞는 최적 조합을 추천해주세요.

[현재 행사 상품 목록]
${JSON.stringify(productSummaries, null, 2)}

[요청 조건]
- 예산: ${budget.toLocaleString("ko-KR")}원
- 1+1, 2+1, 3+1 등 행사 혜택을 최대한 활용하는 조합 추천
- 2~3가지 서로 다른 조합 추천 (각 조합의 totalPrice는 예산 이하)
- 각 조합의 products 배열에는 상품 id(숫자)만 포함

아래 JSON 형식으로만 응답하세요. 다른 텍스트나 설명은 포함하지 마세요:
\`\`\`json
{
  "combinations": [
    {
      "title": "조합 제목 (예: 음료 특가 조합)",
      "reason": "이 조합을 추천하는 이유 (행사 혜택 및 절약 포인트 포함)",
      "products": [상품 id 배열],
      "totalPrice": 총가격(숫자)
    }
  ]
}
\`\`\`
`.trim();
}

export function parseRecommendationResponse(rawText: string): RecommendationResult {
  const jsonBlockPattern = /```json\s*([\s\S]*?)\s*```/;
  const match = jsonBlockPattern.exec(rawText);

  const jsonText = match ? match[1] : rawText;

  try {
    const parsed = JSON.parse(jsonText.trim()) as RecommendationResult;

    if (!Array.isArray(parsed.combinations)) {
      throw new Error("combinations 필드가 배열이 아닙니다.");
    }

    for (const combination of parsed.combinations) {
      if (typeof combination.title !== "string") {
        throw new Error("조합의 title 필드가 문자열이 아닙니다.");
      }
      if (typeof combination.reason !== "string") {
        throw new Error("조합의 reason 필드가 문자열이 아닙니다.");
      }
      if (!Array.isArray(combination.products)) {
        throw new Error("조합의 products 필드가 배열이 아닙니다.");
      }
      if (typeof combination.totalPrice !== "number") {
        throw new Error("조합의 totalPrice 필드가 숫자가 아닙니다.");
      }
    }

    return parsed;
  } catch (error) {
    throw new Error(
      `AI 응답 파싱 실패: JSON 형식이 아님 — ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
