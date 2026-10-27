# DB 스키마 (Supabase PostgreSQL)

> 2026-10-28 실DB 조회로 확인한 상태. 마이그레이션 파일과 실DB가 다른 곳은 따로 표시했다.

## 접근 방식

- **서버에서만 접근한다.** 프론트는 API Route·서버 컴포넌트에서 `SUPABASE_SERVICE_ROLE_KEY`로, 크롤러도 service role 키로 접근한다. 브라우저에 Supabase 키가 나가지 않는다 (`SUPABASE_URL`도 `NEXT_PUBLIC_` 아님)
- RLS는 `wishlists`만 명시적으로 켜 두었다 (service role은 RLS를 우회하므로 동작에 영향 없음, anon 접근 차단 목적)
- 무료 플랜은 비활성 시 **일시정지**되고, 정지되면 프로젝트 도메인 DNS가 사라진다 (`[Errno -2] Name or service not known`). `.github/workflows/keepalive.yml`이 매주 월·목 products 1행 조회로 막는다
- PostgREST 조회는 **1회 1,000행 상한** — 전체 조회는 `range()` 페이지네이션 필수 (`repository.fetch_existing_product_keys`, `ai_classify.fetch_all_products` 참고)
- `.in_()` 필터도 GET 쿼리스트링이라 값이 많으면 `URL component 'query' too long` — 100~200개 단위로 쪼갠다

## 테이블

### products — 행사 상품 (2026-10-28 기준 11,402행, 진행 중 6,564행)

| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | BIGSERIAL PK | **매달 바뀌지 않음** — `(store, name)`이 같으면 upsert로 같은 행을 갱신. 찜·공유 링크가 달을 넘겨도 유지됨 |
| store | TEXT | `CU` / `GS25` / `세븐일레븐` / `이마트24` / `씨스페이스` (크롤러 각 모듈의 `STORE_NAME`) |
| name | TEXT | 매장 원문 상품명 |
| price | INTEGER | 1개 판매가 (원) |
| event_type | TEXT | `1+1` / `2+1` / `3+1`(이마트24만) / `할인` / `증정` |
| category | TEXT | `음료` / `과자` / `식품` / `아이스크림` / `생활용품` / **`기타`(미분류)** — CHECK 제약 없음. `기타`는 목록·통계 조회 단계에서 제외됨 |
| image_url | TEXT | 기본값 `''` |
| valid_from | DATE | 행사 시작 — 수집 월의 1일 (KST) |
| valid_to | DATE | 행사 종료 — 수집 월의 말일. 이번 수집에 빠진 상품은 **어제 날짜로 당겨서 만료** |
| created_at / updated_at | TIMESTAMPTZ | `trigger_products_updated_at` |
| nutrition | JSONB | ⚠️ **잔재 컬럼.** 영양성분 기능은 2026-06 코드에서 제거됐지만 DB 컬럼은 남아 있음. 읽고 쓰는 코드 없음 |

- UNIQUE `products_store_name_key (store, name)` — 마이그레이션 005로 `(store, name, valid_from)`에서 변경
- 인덱스: store, event_type, category, valid_to
- **"진행 중" 판정 = `valid_to >= 오늘(KST)`**. 지난 행사 상품은 지우지 않고 남긴다 (옛 링크·찜 보존)

### users — 카카오 로그인 사용자

| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | UUID PK | `gen_random_uuid()` |
| kakao_id | TEXT UNIQUE | 세션의 `session.user.kakaoId` |
| nickname | TEXT | |
| profile_image | TEXT NULL | |
| created_at / updated_at | TIMESTAMPTZ | |

- 로그인할 때 `frontend/auth.ts`의 signIn 콜백이 upsert. API에서 사용자 식별은 `getUserIdByKakaoId(kakaoId)` → `users.id`

### posts / comments — 커뮤니티 게시판

- `posts`: id BIGSERIAL, user_id → users (CASCADE), category `CHECK IN ('자유','조합공유','질문')`, title, content, created_at, updated_at
- `comments`: id BIGSERIAL, post_id → posts (CASCADE), user_id → users (CASCADE), content, created_at. 인덱스 `comments_post_id_idx`

### push_subscriptions — 웹 푸시 구독

| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | UUID PK | |
| endpoint | TEXT UNIQUE | 브라우저 PushSubscription.endpoint — **upsert 기준** (알림 설정 수정 = 같은 endpoint로 재구독) |
| p256dh / auth | TEXT | 구독 키 (base64url) |
| keywords | TEXT[] | 빈 배열 = 전체 상품 |
| stores | TEXT[] | 빈 배열 = 전체 편의점 |
| created_at | TIMESTAMPTZ | |

- 발송: 크롤러 `web_push_notifier.send_web_push_notifications()`. HTTP 410(만료) 구독은 자동 삭제
- 2026-10-28 기준 0행 — 실제 발송은 아직 검증 안 됨 (사용자 요청으로 실발송 테스트는 보류)

### wishlists — 로그인 사용자 찜 (2026-10-28 추가)

- PK `(user_id, product_id)`, user_id → users (CASCADE), product_id → products (CASCADE), created_at
- RLS 활성화
- 비로그인은 localStorage `cvs-wishlist-v1`만 사용. 로그인 시 로컬·서버를 **합집합**으로 병합 (`useWishlist`)

### subscriptions — ⚠️ 미사용 잔재

- 폐기된 이메일 구독 테이블 (2026-06-03 기능 제거). 2행 남아 있음. 읽고 쓰는 코드 없음 — 드롭해도 됨 (선택)
- `notifications_sent`는 이미 실DB에 없음

## 마이그레이션 파일

두 폴더에 나뉘어 있다. 자동 적용 도구는 없고 **전부 Supabase SQL Editor에서 수동 실행**했다.

| 파일 | 내용 | 실DB 적용 |
|------|------|-----------|
| `crawler/migrations/20260530_init.sql` | products, `update_updated_at()` | ✅ |
| `crawler/migrations/20260601_users.sql` | users | ✅ |
| `crawler/migrations/20260601_subscriptions.sql` | subscriptions(폐기), **`update_updated_at_column()` 함수 정의** | ✅ |
| `crawler/migrations/20260601_board.sql` | posts, comments | ✅ |
| `crawler/migrations/20260601_nutrition.sql` | products.nutrition | ✅ (잔재) |
| `docs/migrations/004_push_subscriptions.sql` | push_subscriptions | ✅ |
| `docs/migrations/005_products_unique_store_name.sql` | UNIQUE (store, name) | ✅ |
| `docs/migrations/006_wishlists.sql` | wishlists | ✅ (2026-10-28) |

- 순서 주의: users·board의 트리거가 쓰는 `update_updated_at_column()`은 **subscriptions 마이그레이션에서 정의**된다. 새 DB에 재현할 때 subscriptions 파일을 users·board보다 먼저 실행해야 한다 (products는 별도 함수 `update_updated_at()` 사용)
- 새 마이그레이션은 `docs/migrations/007_*.sql`부터 이어서 번호를 붙인다
