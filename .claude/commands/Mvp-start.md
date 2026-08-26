docs/tasks.md 를 읽고 아래 규칙대로 작업을 진행해줘.

## 실행 규칙

1. `[ ]` 상태인 첫 번째 항목부터 시작
2. 작업 완료 시 `[ ]` → `[x]` 로 변경 후 즉시 저장
3. Phase 0부터 순서대로 — 앞 Phase 미완료 상태에서 다음 Phase 시작 금지
4. 각 작업은 해당 에이전트에게 위임:
   - crawler/ 관련 → @agent-crawler
   - frontend/domain/, frontend/infrastructure/ → @agent-frontend 또는 @agent-db-api
   - frontend/app/components/ → @agent-frontend
   - 마이그레이션 SQL → @agent-db-api
5. 작업 완료 후 `npx tsc --noEmit` (frontend) 또는 단독 테스트 (crawler) 실행해서 검증
6. 에러 발생 시 즉시 수정 후 재검증 — 에러 있는 채로 다음 작업 진행 금지
7. 컨텍스트 한계에 가까워지면 현재까지 체크 저장 후 중단 — 다음 세션에서 이어서 진행

지금 바로 시작해줘.
