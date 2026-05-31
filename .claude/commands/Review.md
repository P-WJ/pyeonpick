@agent-reviewer 에게 전체 코드 리뷰를 요청해줘.

## 리뷰 범위

아래 순서대로 모든 파일을 리뷰하고 결과를 `docs/review-{오늘날짜}.md` 에 저장해줘.

1. `crawler/domain/` — 엔티티 순수성 확인
2. `crawler/infrastructure/stores/` — 크롤러별 구현
3. `crawler/use_cases/` — 오케스트레이션 로직
4. `frontend/domain/` — 엔티티·순수 함수
5. `frontend/infrastructure/` — Repository, 외부 클라이언트
6. `frontend/app/api/` — API Route 얇은지 확인
7. `frontend/app/components/` — 컴포넌트 품질

## 우선순위

🔴 클린 아키텍처 레이어 위반 → 반드시 머지 전 수정
🟡 클린 코드 개선사항 → 권장
🟢 잘된 부분 → 기록

리뷰 완료 후 요약 한 줄로 마무리해줘.
