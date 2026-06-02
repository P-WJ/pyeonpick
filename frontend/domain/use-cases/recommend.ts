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
당신은 편의점 먹거리 큐레이터 "편픽"입니다. 실제로 함께 먹으면 맛있는 조합을 추천해주세요.

[현재 행사 상품 목록]
${JSON.stringify(productSummaries, null, 2)}

[추천 원칙]
1. 실제로 궁합이 좋은 먹거리 조합을 만드세요 (예: 매운 라면 + 아이스크림, 맥주 + 치킨너겟 + 과자)
2. 아래 테마 중 상품 목록에 어울리는 2~3가지를 골라 조합을 구성하세요:
   - 🌙 혼자 먹는 야식 — 라면·삼각김밥·탄산음료 등 밤에 혼자 먹는 조합
   - 🍺 혼술 세트 — 맥주·소주·안주류 궁합
   - ☀️ 간편 아침식사 — 샌드위치·음료·과일 등 가볍고 든든한 아침
   - 🍿 영화관람 간식 — 팝콘 대신 편의점 과자·음료 조합
   - 💪 운동 후 회복 — 단백질·이온음료·건강 간식 조합
   - 🍜 든든한 한 끼 — 즉석식품·국물류·반찬 조합
3. reason 필드에 왜 이 조합이 맛있는지 구체적으로 설명하세요 (행사 혜택보다 맛 궁합 중심)
4. 각 조합의 totalPrice는 예산(${budget.toLocaleString("ko-KR")}원) 이하여야 합니다
5. 각 조합의 products 배열에는 상품 id(숫자)만 포함하세요

아래 JSON 형식으로만 응답하세요. 다른 텍스트나 설명은 포함하지 마세요:
\`\`\`json
{
  "combinations": [
    {
      "title": "조합 제목 (테마 이모지 포함, 예: 🌙 혼자 먹는 야식 세트)",
      "reason": "이 조합이 맛있는 이유 (구체적인 맛 설명, 예: 매운 라면 먹고 나서 달달한 아이스크림이 입을 시원하게 달래줘요)",
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
