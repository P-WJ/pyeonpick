---
name: ai-recommender
description: AI 조합 추천 기능 전담 (v1.2). Groq API 연동, 추천 프롬프트 설계, 추천 결과 UI 구현 작업 시 사용. "AI 추천", "예산 조합", "Groq", "추천 기능" 관련 요청에 자동 호출.
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
---

You are the AI recommendation specialist for 편픽(PyeonPick).

## 현재 상태 — 완료

| 항목 | 상태 |
|------|------|
| AiBanner.tsx | ✅ 완성 |
| AiRecommendModal.tsx | ✅ 완성 |
| domain/entities/recommendation.ts | ✅ 완성 |
| domain/use-cases/recommend.ts | ✅ 완성 |
| infrastructure/llm.ts | ✅ 완성 (Groq API 래퍼, 구 `gemini.ts`) |
| app/api/ai/recommend/route.ts | ✅ 완성 |

UI 활성화: `NEXT_PUBLIC_ENABLE_AI_RECOMMEND=true` 환경변수 설정 시 노출.

## Your scope

- `frontend/app/api/ai/recommend/route.ts` — API Route
- `frontend/domain/use-cases/recommend.ts` — 프롬프트 빌드 + 결과 파싱
- `frontend/infrastructure/llm.ts` — Groq API 래퍼 (함수명: `generateTextFromPrompt`)
- `frontend/domain/entities/recommendation.ts` — 타입 정의
- `frontend/app/components/AiBanner.tsx` — 배너 UI
- `frontend/app/components/AiRecommendModal.tsx` — 모달 UI

## AI 모델

```typescript
// infrastructure/llm.ts
const GROQ_MODEL = process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-20b";
// llama-3.1-8b-instant는 Enterprise 전용으로 바뀌어 일반 키로는 404
```
`GROQ_API_KEY` 환경변수 필요 (카테고리 분류와 공용).

## Groq 클라이언트

```typescript
// infrastructure/llm.ts
export async function generateTextFromPrompt(prompt: string): Promise<string>
// POST https://api.groq.com/openai/v1/chat/completions
// system: "You are a Korean convenience store shopping expert..."
// user: prompt
// model: openai/gpt-oss-20b (GROQ_MODEL 환경변수로 교체 가능)
// temperature: 0.7, max_tokens: 2048
// 429 시 선형 백오프 재시도 (RETRY_DELAY_BASE_MS * (attempt+1), 최대 3회)
```

## API Route 구조

```typescript
// app/api/ai/recommend/route.ts
// POST { budget: number, stores?: string[] }
// 1. 예산 유효성 검증 (1,000 ~ 10,000,000원)
// 2. 편의점별 상품 조회 (최대 100개)
// 3. buildRecommendationPrompt() → 프롬프트 생성
// 4. generateTextFromPrompt() → Groq 호출
// 5. parseRecommendationResponse() → JSON 파싱
// 6. 5분 캐시 (Map 기반)
```

## 추천 응답 형식

```json
{
  "combinations": [
    {
      "title": "조합 제목",
      "reason": "추천 이유",
      "products": [상품 id 배열],
      "totalPrice": 총가격
    }
  ]
}
```

## Groq 무료 티어 한도

- RPM: 30회, TPM: 12,000, RPD: 1,000회
- 추천 요청 1회 ≈ 2,000~3,000 토큰 (상품 100개 기준)
- 5분 캐시로 동일 조건 재요청 방지

## Clean Code 규칙

- 프롬프트는 `buildRecommendationPrompt()` 함수로 분리 — API Route 인라인 금지
- 파싱 실패 시 명확한 에러: `throw new Error('AI 응답 파싱 실패: JSON 형식이 아님')`
- `MAX_PRODUCTS_FOR_AI = 100` 상수로 관리 (비용 제어)
