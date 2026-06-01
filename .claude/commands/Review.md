@agent-reviewer 에게 전체 코드 리뷰를 요청해줘.

## 리뷰 범위

아래 순서대로 모든 파일을 리뷰하고 결과를 `docs/review-{오늘날짜}.md` 에 저장해줘.

1. `crawler/domain/` — 엔티티 순수성 확인
2. `crawler/infrastructure/stores/` — 5개 편의점 크롤러별 구현 (cu, gs25, seven, emart24, cspace)
3. `crawler/infrastructure/ai_classifier.py` — Groq AI 분류 로직
4. `crawler/use_cases/` — 크롤링·알림 오케스트레이션
5. `frontend/domain/` — 엔티티·순수 함수 (product, cart, post, recommendation)
6. `frontend/infrastructure/` — Repository, Supabase, Gemini 클라이언트
7. `frontend/app/api/` — API Route 얇은지 확인 (products, subscriptions, posts, ai/recommend)
8. `frontend/app/components/` — 컴포넌트 품질
9. `frontend/app/board/` — 게시판 페이지·컴포넌트
10. `frontend/app/products/` — 상품 상세 페이지

## 우선순위

🔴 클린 아키텍처 레이어 위반 → 반드시 머지 전 수정
🟡 클린 코드 개선사항 → 권장
🟢 잘된 부분 → 기록

## 특히 확인할 것

- `any` 타입 사용 여부
- API Route에 비즈니스 로직 인라인 여부
- `SUPABASE_SERVICE_ROLE_KEY` 클라이언트 노출 여부
- 카테고리 유효성 검증 (`VALID_CATEGORIES` 외 값 처리)
- 비로그인 사용자 보호 (게시글·댓글 작성 API)

리뷰 완료 후 요약 한 줄로 마무리해줘.
