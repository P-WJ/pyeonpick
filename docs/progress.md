# 진행 현황

## 현재 단계: UX 고도화 3단계까지 완료 / v1.3 미착수

- 마지막 기능 개발: **2026-06-03**
- 마지막 문서·정합성 정리: **2026-08-26** (아래 최하단 항목)

---

## MVP — 완료 (2026-05-31)

### 완료 항목
- **Phase 0** 기반 세팅: 도메인 엔티티, DB 마이그레이션 SQL
- **Phase 1** 크롤러: CU, GS25, 세븐일레븐, 이마트24, 씨스페이스
- **Phase 2** 백엔드 API: Supabase 연동, 상품 조회 API
- **Phase 3** 프론트엔드 UI: 상품 목록, 필터, 장바구니, 공유 링크
- **Phase 4** 배포: Vercel (프론트), GitHub Actions (크롤러 월 1·2일 자동 실행)

### 수집 행사 유형
- 1+1, 2+1, 3+1 (이마트24), 할인, 증정

### 배포 현황
| 서비스 | 플랫폼 | 상태 |
|--------|--------|------|
| 프론트엔드 | Vercel | ✅ 운영 중 |
| 크롤러 스케줄 | GitHub Actions | ✅ 운영 중 (매월 1·2일 09:00 KST) |
| DB | Supabase | ✅ 운영 중 |

---

## v1.1 — 완료 (2026-06-01)

### 완료 항목
- **알림 구독**: SubscribeForm (3단계 폼), 구독 API (POST/DELETE/GET), `/notifications` 조회 페이지
- **카카오 로그인**: NextAuth v5, 헤더 프로필/로그아웃
- **커뮤니티 게시판**: 목록(무한스크롤, 카테고리 탭), 글쓰기, 댓글
- **DB**: subscriptions, notifications_sent, posts, comments 테이블

### 알림 구독 흐름 (웹 푸시 — 2026-06-03 전환)
1. 사용자가 브라우저 푸시 권한 허용 + 키워드(선택)·편의점(선택) 설정 후 구독 → `push_subscriptions` 테이블 저장
2. 매월 크롤링 완료 후 `send_web_push_notifications()` 자동 실행
3. 구독 조건에 맞는 신규 상품을 웹 푸시(Web Push API + VAPID)로 발송
4. 만료된 구독(HTTP 410)은 자동 삭제

> 카카오 알림톡·Resend 이메일은 **둘 다 미사용**. 이메일 구독 UI·API·repository는 제거 완료(2026-06-03). `/notifications`는 웹 푸시 설정 페이지로 유지.

---

## 고도화 작업 — 완료 (2026-06-02)

### UX/UI 개선
- 필터 초기화 버튼 추가 (빈 상태 UI)
- AI 배너/모달 환경변수 플래그로 숨김 처리 (`NEXT_PUBLIC_ENABLE_AI_RECOMMEND`)
- FilterBar 모바일 가로 스크롤 전환, 버튼 터치 타겟 개선
- 비로그인 글쓰기 클릭 시 토스트 안내
- CartDrawer 수량 변경 하이라이트 애니메이션
- ProductCard 혜택 텍스트 표시 ("1개 가격에 2개" 등)
- 상품 상세 관련 상품 없을 때 CTA 추가
- 게시판 댓글 수 시각화 강화

### 카테고리 재분류
- 5개 카테고리 확정: 음료, 과자, 식품, 아이스크림, 생활용품
- Groq llama-3.3-70b-versatile 기반 `ai_classify.py` 작성
  - 우선순위 순서 처리, 체크포인트 파일로 중단 후 재개 가능
  - 배치당 DB upsert → update로 수정 (NOT NULL 제약 오류 해결)

---

## 고도화 1단계 — 완료 (2026-06-02~03)

### 완료 항목
- **UI 전면 리디자인 (Toss/당근마켓 스타일)**
  - ProductCard: aspect-square 이미지, 브랜드 컬러 dot, 플랫 뱃지, 담기 버튼 dark
  - FilterBar: 아이콘 검색바, dark 선택 상태 통일, 모바일 가로 스크롤
  - Header: h-14 고정, BETA 뱃지, 모바일 게시판 아이콘
  - ProductDetailClient: 브랜드색 제거, aspect-square, 영양성분 섹션 완전 제거
  - 게시판(board): 카테고리 뱃지 중립화, window.confirm → 인라인 확인
- **영양성분 완전 제거**
  - `domain/entities/product.ts` — Nutrition 타입 + nutrition 필드 제거
  - `infrastructure/repositories/product-repository.ts` — nutrition 파싱 제거
  - `crawler/domain/entities.py` — nutrition 필드 제거
  - `crawler/infrastructure/stores/cu.py` — 영양성분 파싱 전체 제거

### 고도화 1단계 미완료 항목 (다음 단계로 이월)
- **공유 링크 자동 불러오기**: URL `?cart=1,2,3` 파싱 → 장바구니 자동 담기
- **찜하기**: 하트 아이콘 + 로컬스토리지(`cvs-wishlist-v1`) 기반

---

## 고도화 2단계 — 진행 예정

- **최근 본 상품**: 상세 페이지 접속 시 로컬스토리지 기록, 메인 하단 노출
- **프로필 페이지** (`/profile`): 찜한 상품, 작성 글 모아보기
- **공유 링크 자동 불러오기**: URL `?cart=1,2,3` 파싱 → 장바구니 자동 담기
- **찜하기**: 하트 아이콘 + 로컬스토리지(`cvs-wishlist-v1`) 기반

---

## v1.2 — 완료 (2026-06-02)

### 완료 항목
- AI 조합 추천 백엔드 구현 (Groq llama-3.3-70b-versatile)
- Gemini API quota 문제로 Groq으로 교체 (`infrastructure/gemini.ts` 내부 교체)
- `/api/ai/recommend` POST 엔드포인트 + 5분 캐시
- UI: AiBanner, AiRecommendModal 완성
- 활성화: Vercel 환경변수 `NEXT_PUBLIC_ENABLE_AI_RECOMMEND=true` 필요

---

## 크롤러 개선 — 완료 (2026-06-03)

### 완료 항목
- **AI 분류 모델 변경**: `llama-3.3-70b-versatile` → `llama-3.1-8b-instant` (TPD 500,000으로 rate limit 해소)
- **행사기간 수정**: `date.today()+6일` → 월 1일~말일 (`current_month_range()` 함수 추가)
- **상품 중복 적재 해결**: unique constraint `(store, name, valid_from)` → `(store, name)` 으로 변경
  - 마이그레이션 SQL: `docs/migrations/005_products_unique_store_name.sql` (Supabase에서 수동 실행 필요)
- **카테고리 재분류 스크립트**: `ai_classify.py` — BATCH_SIZE=45, SLEEP=3초, 체크포인트 지원

### 미완료 (수동 작업 필요)
- Supabase SQL Editor에서 `docs/migrations/005_products_unique_store_name.sql` 실행
- `classify_progress.json` 삭제 후 `uv run python ai_classify.py` 실행

---

## 코드 리뷰 반영 — 완료 (2026-06-03)

### 🔴 필수 수정 3건 반영
- **AI 추천 API stores 검증**: `app/api/ai/recommend/route.ts` — `body.stores` 배열 원소를 `VALID_STORES` 기준 type guard로 필터링 (프롬프트 오염 방지)
- **AI 분류 JSON 파싱 강화**: `crawler/infrastructure/ai_classifier.py` — `_parse_response`의 `int(k)` 변환을 try/except로 감싸 인덱스 파싱 실패 시 경고 후 건너뜀
- **도메인 엔티티 타입 강화**: `crawler/domain/entities.py` — `Category`/`StoreType`/`EventType` Literal 타입 정의, `Product` 필드에 적용

리뷰 리포트: `docs/review-2026-06-03.md`

---

## UX 고도화 3단계 — 비교 본질 보강 (2026-06-03)

UX 감사에서 도출한 "비교 서비스인데 정작 비교·신뢰 요소가 약하다"는 지적 반영.

### 1단계 — 신뢰·흐름 (✅ 완료)
- **홈 가짜 통계 제거**: 하드코딩(`1,248 / 512 / 4,802` + 가짜 트렌드 `▲+12%`)을 **실제 DB 집계**로 교체
  - 신규 `getProductStats()` (repository) → `/api/products/stats` → 홈에서 진행 중 행사 / 1+1 / 2+1 실시간 수 노출
- **상세 담기 → 홈 강제 이동 제거**: `ProductDetailClient`가 로컬 `addProductToCart` + `router.push("/")` 하던 것을 cart-context `handleAddToCart`로 교체 (토스트·헤더 카운트 갱신, 페이지 유지). 미사용 로컬 함수·상수·import 정리

### 2단계 — 비교 본질 (✅ 완료)
- **개당 실질가격 노출**: `ProductCard`에 `calculatePriceBenefit().unitPrice` 표시 (`개당 N원` + 원가 취소선). 행사로 단가가 내려가는 경우만 노출
- **정렬 기능 추가**: 추천순/저가순/할인율순
  - `ProductSort` 타입(`domain/entities/product.ts`), `SORT_OPTIONS`(constants)
  - repository `getProducts`에 정렬 분기 (price asc / event_type asc / name)
  - `/api/products` `sort` 파라미터 검증, `ActiveFilters.sort`, 홈 결과 행에 정렬 드롭다운
- **행사 마감 표시**: 전 상품이 매월 1일~말일로 종료일이 동일하므로, 카드마다 D-day를 다는 대신 **홈 히어로 배너에 1회** 표시 ("이번 달 행사 N월 N일까지 · D-N")
  - 순수 함수 `domain/use-cases/event-period.ts` `currentMonthPromotion`/`formatDaysLeft`, 하이드레이션 불일치 방지 위해 마운트 후 계산
  - (개정) 초기엔 ProductCard에 카드별 D-day를 넣었으나 종료일이 전 상품 공통이라 중복이라 제거하고 배너로 이동

### 알림 채널 정리 — 웹 푸시 전용 (✅ 완료)
- 카카오 알림톡 + Resend 이메일을 **둘 다 제거**, 알림은 **웹 푸시**로 일원화
- `crawl_all.py`: 이메일(`notify_subscribers`) 호출 제거, `send_web_push_notifications` 결과 로깅으로 정리
- 삭제: `crawler/infrastructure/notifier.py`(Resend), `crawler/use_cases/notify_subscribers.py`(이메일 오케스트레이션)
- 웹 푸시는 `crawler/infrastructure/web_push_notifier.py` + 프론트 구독 인프라(`/api/push/*`, `usePushNotification`, `PushNotificationBell`)로 이미 완비
- 환경변수: 크롤러 `VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`, 프론트 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

### 검증
- `tsc --noEmit` 통과(exit 0). (참고: node_modules가 pnpm/npm 혼용으로 손상되어 `npm install`로 복구함. 이 프로젝트는 package-lock.json 기반 npm 사용)
- 크롤러 `crawl_all` import 정상 확인
- ESLint는 프로젝트에 미설정 상태

### 3단계 — 매장 간 같은 상품 비교 뷰 (✅ 완료)
서비스 정체성 핵심. 상품 상세에서 동일 상품을 5개 편의점 가격·행사로 비교.
- **매칭 방식**: 바코드가 없으므로 상품명 **정규화 키**로 매칭
  - `normalizeProductName`: 소문자화 + 괄호/대괄호 내용 제거 + 제조사 접두사(`진주햄)`·`CJ]`) 제거 + 한글/영숫자 외 제거
  - 예) `진주햄)천하장사28g` · `진주)천하장사28G` · `진주햄]천하장사28g` → `천하장사28g`
  - 실데이터 분석: 활성 8,558개 중 **2개+ 매장 동일 그룹 775개** 확인
- **조회**: `extractSearchCore`로 핵심 토큰 추출 → DB ilike 후보군(≤300) → 정규화 키 동치로 정밀 필터 (`getCrossStoreComparison`)
- **표시 로직**: `buildStoreComparison` — 매장별 **최저 개당가** 1행, 개당가 오름차순, 최저가 매장 강조 (순수 함수)
- **UI**: `StoreComparison` 컴포넌트 — 매장 뱃지·행사 뱃지·개당가·표시가, 최저가/현재 매장 표시, 다른 매장 행 클릭 시 해당 상품으로 이동
- **연결**: 서버 컴포넌트(`products/[id]/page.tsx`)에서 `getCrossStoreComparison` 조회 후 `ProductDetailClient` → `StoreComparison`에 전달
- **검증**: `tsc` 통과 + dev 서버 실측(`/products/9055` CU 천하장사 → GS25·세븐일레븐 비교 정상 노출, 최저가/개당가 확인)
- **한계(후속)**: `(3입)`·`(원형)` 등 구성 차이 변형이 같은 키로 묶일 수 있음 → 매장별 최저 개당가 1행으로 흡수. 정확 매칭 고도화는 추후.

### 이메일 구독 잔재 제거 (✅ 완료 2026-06-03)
웹 푸시 일원화에 따라 사용하지 않는 이메일 구독 코드를 제거.
- 삭제: 프론트 `SubscribeForm.tsx`, `/api/subscriptions/route.ts`, `infrastructure/repositories/subscription-repository.ts`, 크롤러 `subscription_repository.py`
- 삭제: 크롤러 `entities.py`의 `Subscription`·`NotifyResult` 데이터클래스(미사용)
- 정리: `GlobalShell`의 이메일 구독 모달 + `cart-context`의 `isSubscribeOpen`/`setIsSubscribeOpen`(트리거가 없는 죽은 코드였음)
- `/notifications`: 이메일 검색·설정 파트 제거, **웹 푸시 섹션(`WebPushSection`)만 유지**
- 보존: `push-subscription-repository.ts`, `/api/push/*`, `usePushNotification`, `PushNotificationBell`
- 검증: `tsc` 통과 + 크롤러 import 정상
- DB(수동): `subscriptions`, `notifications_sent` 테이블은 Supabase에서 수동 드롭 가능(남겨둬도 무해)

### 3단계 — 남은 확장 (🔜 예정)
- **카카오톡 공유**: 카카오 SDK 연동 (현재 공유 = 클립보드 복사뿐, `copyShareUrl`에 `.catch` 없음 → 함께 보완)
- **로그인 후 찜 목록 서버 동기화**: 현재 localStorage 전용이라 기기 종속

---

## v1.3 — 미착수

- ~~카카오 알림톡 전환~~ / ~~Resend 이메일~~ → **둘 다 취소 (2026-06-03)**: 알림은 **웹 푸시**로 운영
- 알림 설정 수정 기능 추가 (현재 해제만 가능)
- 이메일 구독 잔재 제거 — ✅ 완료 (2026-06-03, 위 참조). `subscriptions`/`notifications_sent` 테이블만 수동 드롭 남음(선택)

---

## 문서·코드 정합성 정리 — 완료 (2026-08-26)

기능 변경 없음. 문서가 코드보다 뒤처져 생긴 불일치만 정리.

### 코드
- `frontend/infrastructure/gemini.ts` → **`llm.ts` 리네임** (내용은 처음부터 Groq 래퍼였음). import 지점은 `api/ai/recommend/route.ts` 1곳뿐
- `reviewer` / `ux-auditor` 에이전트에서 **`Bash` 도구 제거** — `Read, Glob, Grep`만 부여. Bash가 있으면 `sed` 등으로 파일 수정이 가능해 "읽기 전용" 격리가 실제로는 성립하지 않았음
- `domain/use-cases/recommend.ts` — `MAX_PRODUCTS_IN_PROMPT`(100)가 실효 상한이 아님을 주석으로 명시 (실제 상한은 route의 `MAX_PRODUCTS_FOR_AI` = 50)

### 문서
- 모델명 통일: 문서 곳곳의 `llama-3.3-70b-versatile` → 실제 코드값 **`llama-3.1-8b-instant`** (`Claude.md`, `Ai-recommender.md`, `Crawler.md`, `V1.2-start.md`). 단, `progress.md`의 과거 기록은 이력이므로 보존
- 패키지 매니저 통일: `pnpm tsc` → `npx tsc` (`Frontend.md`, `ui-designer.md`, `ui-improve.md`, `Mvp-start.md`). `Claude.md`의 "pnpm 사용 금지" 규칙과 충돌하던 부분
- 배치 크기 표기 정정: 크롤링 중 분류 80개/2.5초, 일괄 재분류 스크립트 45개/3초 — 서로 다른 값임을 명시
- 이메일 구독 잔재 표기 제거: `Frontend.md`, `Db-api.md`, `Notifier.md`, `ui-designer.md`, `V1.1-start.md`, `Review.md` (`SubscribeForm`, `/api/subscriptions`, `subscriptions` 테이블 → 웹 푸시 기준으로 교체)
- 구현 현황표 갱신: 찜하기·최근 본 상품·프로필·공유링크 자동 불러오기·AI 추천이 `❌ 미구현`으로 남아 있던 것 → `✅`
- 상태 표기: "진행 중" → 완료일 명시 (`Claude.md`, `progress.md`)

### 파일 정리
- `.claude/agents/Clawler.md` → `Crawler.md` (오타)
- `.claude/agents/ui-improve.md`, `ux-audit.md` → `.claude/commands/` 로 이동 (에이전트가 아니라 커맨드였음)

### 검증
- `npx tsc --noEmit` 통과
