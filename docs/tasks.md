# MVP 작업 목록

세션 시작 시: "tasks.md 순서대로 진행해줘"
작업 완료 시 [ ] → [x] 로 변경 후 다음 작업 진행.
중단된 세션은 첫 번째 [ ] 항목부터 재개.

---

## Phase 0 — 기반 세팅

- [x] `crawler/domain/entities.py` 생성 (Product, CrawlResult dataclass)
- [x] `frontend/domain/entities/product.ts` 생성 (Product, Store, EventType, Category 타입)
- [x] `frontend/domain/entities/cart.ts` 생성 (CartItem 타입)
- [x] `frontend/domain/use-cases/cart.ts` 생성 (calculateSavings, buildShareUrl 순수 함수)
- [x] Supabase `products` 테이블 마이그레이션 SQL 작성 (`crawler/migrations/20260530_init.sql`)

---

## Phase 1 — 크롤러

- [x] `crawler/infrastructure/browser.py` 생성 (Playwright 세션 관리)
- [x] `crawler/infrastructure/stores/cu.py` 생성 + 단독 테스트
- [x] `crawler/infrastructure/stores/gs25.py` 생성 + 단독 테스트
- [x] `crawler/infrastructure/stores/seven.py` 생성 + 단독 테스트 (Playwright)
- [x] `crawler/infrastructure/stores/emart24.py` 생성 + 단독 테스트
- [x] `crawler/infrastructure/repository.py` 생성 (upsert_products)
- [x] `crawler/use_cases/crawl_all.py` 생성 (전체 오케스트레이션)
- [x] `crawler/main.py` 생성 (APScheduler 새벽 3시 자동 실행)

---

## Phase 2 — 백엔드 API

- [x] `frontend/infrastructure/supabase.ts` 생성 (클라이언트 팩토리)
- [x] `frontend/infrastructure/repositories/product-repository.ts` 생성
- [x] `frontend/app/api/products/route.ts` 생성 (GET, 필터 파라미터 지원)

---

## Phase 3 — 프론트엔드 UI

- [x] `frontend/app/page.tsx` 업데이트 (상품 목록 레이아웃)
- [x] `frontend/app/components/FilterBar.tsx` 생성 (편의점·행사·카테고리 필터)
- [x] `frontend/app/components/ProductCard.tsx` 생성
- [x] `frontend/app/components/CartDrawer.tsx` 생성 (장바구니 + 절약액)
- [x] `frontend/app/components/SavingsBadge.tsx` 생성
- [x] 장바구니 localStorage 연동 (`cvs-cart-v1`)
- [x] 공유 링크 생성 기능

---

## Phase 4 — 마무리

- [ ] `@agent-reviewer` 전체 코드 리뷰
- [ ] `docs/progress.md` MVP 완료로 업데이트
- [ ] Vercel 배포 설정
- [ ] Railway 크롤러 배포 설정
