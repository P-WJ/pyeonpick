import type { Product } from "@/domain/entities/product";
import type { RecommendationResult } from "@/domain/entities/recommendation";

const MAX_PRODUCTS_IN_PROMPT = 100;

export function buildRecommendationPrompt(
  products: Product[],
  budget: number,
  userPrompt?: string
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

  const userPreferenceSection = userPrompt?.trim()
    ? `\n[사용자 요청]\n${userPrompt.trim()}\n위 요청을 최우선으로 반영하여 조합을 구성하세요.\n`
    : "";

  return `
당신은 편의점 먹거리 큐레이터 "편픽"입니다. 실제로 함께 먹으면 맛있는 조합을 추천해주세요.

[현재 행사 상품 목록]
${JSON.stringify(productSummaries, null, 2)}
${userPreferenceSection}
[추천 원칙]
1. 반드시 위 상품 목록에 있는 실제 상품명(store + name)을 reason에 그대로 언급하세요.
   좋은 예: "CU의 신라면 컵 먹고 나서 롯데 설레임으로 마무리하면..."
   나쁜 예: "라면과 아이스크림의 조합은..."
2. 아래 테마 중 상품 목록에 어울리는 2~3가지를 골라 조합을 구성하세요:
   - 🌙 혼자 먹는 야식 — 라면·삼각김밥·탄산음료 등 밤에 혼자 먹는 조합
   - 🍺 혼술 세트 — 맥주·소주·안주류 궁합
   - ☀️ 간편 아침식사 — 샌드위치·음료·과일 등 가볍고 든든한 아침
   - 🍿 영화관람 간식 — 팝콘 대신 편의점 과자·음료 조합
   - 💪 운동 후 회복 — 단백질·이온음료·건강 간식 조합
   - 🍜 든든한 한 끼 — 즉석식품·국물류·반찬 조합
3. reason에 맛 궁합을 구체적으로 설명하고, 해당 편의점과 행사 혜택도 자연스럽게 언급하세요.
4. 각 조합의 totalPrice는 예산(${budget.toLocaleString("ko-KR")}원) 이하여야 합니다.
5. 각 조합의 products 배열에는 상품 id(숫자)만 포함하세요.

아래 JSON 형식으로만 응답하세요. 다른 텍스트나 설명은 포함하지 마세요:
\`\`\`json
{
  "combinations": [
    {
      "title": "조합 제목 (테마 이모지 포함, 예: 🌙 혼자 먹는 야식 세트)",
      "reason": "실제 상품명을 언급한 맛 궁합 설명 (예: GS25의 참이슬 1+1에 CU 매콤한 닭강정을 곁들이면...)",
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
