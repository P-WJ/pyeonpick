# 편의점 행사 비교 서비스 — 편픽(PyeonPick)

## 프로젝트 개요

CU, GS25, 세븐일레븐, 이마트24, 씨스페이스의 1+1·2+1·3+1·할인·증정 행사상품을 한눈에 비교하는 웹 서비스.
차별점: 장바구니·절약액 계산·개당가 비교·찜하기·알림(웹 푸시)·AI 조합 추천·커뮤니티 게시판.

## 아키텍처 원칙 (전체 공통)

**실용적 클린 아키텍처** — 레이어 분리 + 의존성 방향 고정. 과도한 인터페이스 없음.

```
의존성 방향: domain ← infrastructure ← use_cases/app ← entry point
                ↑
           외부 의존성 없음
```

| 레이어          | 역할                           | 외부 import    |
| --------------- | ------------------------------ | -------------- |
| domain          | 엔티티 + 순수 비즈니스 로직    | 금지           |
| infrastructure  | DB, API, 브라우저 등 외부 연동 | OK             |
| use_cases / app | 오케스트레이션                 | domain + infra |

**절대 위반 금지:**

- domain이 Supabase, Playwright, Next.js 등을 import하면 위반
- 컴포넌트가 DB를 직접 호출하면 위반
- API Route에 비즈니스 로직이 있으면 위반

## 클린 코드 공통 규칙

- 함수 하나 = 역할 하나 (이름에 "and" 있으면 분리 신호)
- 줄임말 금지: `prod` → `product`, `calc` → `calculate`
- 매직 넘버 금지: 상수로 이름 부여
- 에러 메시지는 한국어로, 구체적으로

## 모노레포 구조

```
PyeonPick/
├── frontend/                  # Next.js 15 + TypeScript + Tailwind
│   ├── domain/
│   │   ├── entities/          # product, cart, post, recommendation
│   │   └── use-cases/         # cart, price, recommend
│   ├── infrastructure/
│   │   ├── repositories/      # product, push-subscription, post
│   │   ├── supabase.ts
│   │   └── llm.ts             # Groq API 래퍼 (구 gemini.ts, 2026-08-26 리네임)
│   └── app/
│       ├── components/        # Header, ProductCard, CartDrawer, FilterBar, StoreComparison, PushNotificationBell, AiBanner 등
│       ├── products/[id]/     # 상품 상세
│       ├── notifications/     # 알림 구독 조회
│       ├── board/             # 커뮤니티 게시판
│       └── api/               # API Routes
├── crawler/                   # Python + Playwright/httpx
│   ├── domain/
│   ├── infrastructure/
│   │   ├── stores/            # CU, GS25, 세븐일레븐, 이마트24, 씨스페이스
│   │   ├── ai_classifier.py   # Groq AI 카테고리 분류
│   │   └── repository.py
│   └── use_cases/
├── ai_classify.py             # 기존 상품 일괄 재분류 스크립트 (Groq llama-3.1-8b-instant)
├── .claude/agents/            # 서브에이전트 정의
└── docs/                      # 스키마, 크롤링 특성, 진행 현황
```

## 개발 단계

**현재 단계: 고도화 3단계까지 완료 (마지막 작업 2026-06-03) / v1.3 미착수**

| 단계 | 기능 | 상태 |
| ---- | ---- | ---- |
| MVP  | 크롤링 + UI + 장바구니 + 배포 | ✅ 완료 |
| v1.1 | 알림 구독 + 카카오 로그인 + 게시판 | ✅ 완료 |
| 고도화 1단계 | 공유 링크 자동 불러오기, 찜하기, UI 폴리싱 | ✅ 완료 |
| 고도화 2단계 | 최근 본 상품, 프로필 페이지, 게시글 수정/삭제 | ✅ 완료 |
| v1.2 | AI 조합 추천 (Groq API) | ✅ 완료 |
| 고도화 3단계 | 실통계·개당가·정렬·D-day + 매장 간 가격 비교 | ✅ 완료 (2026-06-03) |
| v1.3 | 알림 설정 수정 (웹 푸시) | ⬜ 미착수 |

## 기술 스택

| 영역       | 기술                                              |
| ---------- | ------------------------------------------------- |
| 프론트엔드 | Next.js 15, TypeScript strict, Tailwind CSS, lucide-react |
| 인증       | NextAuth v5 (카카오 OAuth)                        |
| 백엔드 API | Next.js API Routes                                |
| 크롤러     | Python 3.11+, Playwright, httpx, pywebpush        |
| DB         | PostgreSQL (Supabase)                             |
| 알림       | 웹 푸시 (Web Push API + VAPID) — 카카오·이메일 미사용 |
| AI 분류    | Groq API (llama-3.1-8b-instant)                   |
| AI 추천    | Groq API (llama-3.1-8b-instant)                   |
| 배포       | Vercel (프론트), GitHub Actions (크롤러 스케줄)   |

## 상품 카테고리 시스템

5개 카테고리: `음료`, `과자`, `식품`, `아이스크림`, `생활용품`

- 크롤링 시 신규 상품은 `ai_classifier.py`로 자동 분류 (Groq API)
- 기존 상품 일괄 재분류: 루트의 `ai_classify.py` 실행
  - 우선순위: 기타 → 간편식사 → 아이스크림 → 음료 → 과자 → 식품 → 생활용품
  - 체크포인트(`classify_progress.json`)로 중단 후 이어서 실행 가능
- `product-repository.ts`의 `VALID_CATEGORIES`에 없는 카테고리는 프론트에서 필터링됨

## 편의점 브랜드 컬러

| 편의점 | 컬러 |
|--------|------|
| CU | 보라 (purple) |
| GS25 | 파랑 (blue) |
| 세븐일레븐 | 초록 (green) |
| 이마트24 | 노랑 (yellow) |
| 씨스페이스 | 청록 (teal) |

## 서브에이전트

| 에이전트 | 역할 |
| -------- | ---- |
| crawler | 편의점 크롤러 작성·디버깅 |
| frontend | Next.js UI 컴포넌트·페이지·API Route |
| db-api | DB 스키마·마이그레이션·API Route |
| notifier | 알림 발송 로직 (웹 푸시) |
| ai-recommender | Groq AI 추천 기능 (llama-3.1-8b-instant) |
| reviewer | 코드 리뷰 (Read-only — Read/Glob/Grep만 부여) |
| ux-auditor | UX 감사·기능 누락 탐지 (Read-only — Read/Glob/Grep만 부여) |
| ui-designer | 반응형 UI 디자인 구현 |

커맨드(`.claude/commands/`): `Mvp-start`, `Review`, `ux-audit`, `ui-improve`, `V1.1-start`, `V1.2-start`

## 개발 규칙

- 패키지 매니저: `npm` (frontend — `package-lock.json` 기반, pnpm 사용 금지), `uv` (crawler)
- 커밋: `feat:`, `fix:`, `chore:`, `refactor:`
- 모든 API 응답: `{ data: T | null, error: string | null, meta? }`
- 환경변수: `.env.local` (frontend), `.env` (crawler)
- 크롤러 요청 간 1~2초 sleep 필수
- AI 배너/모달: `NEXT_PUBLIC_ENABLE_AI_RECOMMEND=true` 환경변수로 활성화

## 주요 환경변수

**frontend `.env.local`**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
AUTH_KAKAO_ID                      # 카카오 로그인 (알림 아님)
AUTH_KAKAO_SECRET
AUTH_SECRET
GROQ_API_KEY                       # AI 추천 + 카테고리 분류 공용
NEXT_PUBLIC_ENABLE_AI_RECOMMEND    # true 시 AI 추천 배너 노출
NEXT_PUBLIC_VAPID_PUBLIC_KEY       # 웹 푸시 구독용 VAPID 공개키
```

**crawler `.env`**
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GROQ_API_KEY
VAPID_PRIVATE_KEY                  # 웹 푸시 발송용 VAPID 비밀키
VAPID_SUBJECT                      # mailto: 형식 연락처
```

## 로컬스토리지 키

| 키 | 용도 |
|----|------|
| `cvs-cart-v1` | 장바구니 |
| `cvs-wishlist-v1` | 찜 목록 |
| `cvs-recently-viewed-v1` | 최근 본 상품 |

## 디자인 시스템

**디자인 철학**: 심플하고 세련된 한국형 커머스 UI. Toss·당근마켓처럼 여백이 넉넉하고 위계가 명확한 디자인. 화려함보다 신뢰감.

### 컬러 팔레트

| 용도 | 값 | 설명 |
|------|----|------|
| 페이지 배경 | `bg-gray-50` (`#F9FAFB`) | 카드와 대비되는 미세한 회색 |
| 카드/컴포넌트 | `bg-white` | 항상 흰색 |
| 주요 텍스트 | `text-gray-900` | 제목, 가격 |
| 보조 텍스트 | `text-gray-500` | 설명, 라벨 |
| 3차 텍스트 | `text-gray-400` | 힌트, 캡션 |
| 테두리 | `border-gray-100` | 카드 테두리 (매우 연하게) |
| 구분선 | `border-gray-200` | 섹션 구분 |
| 브랜드(AI) | `#7C3AED` (purple-700) | AI 추천, 강조 요소 |

편의점 브랜드 컬러는 `STORE_COLORS`에서만 사용. 일반 UI에 임의로 섞지 않는다.

### 그림자 시스템

```
카드 기본:  shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]
카드 호버:  shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]
드로어/모달: shadow-2xl
```
`shadow-sm` / `shadow-md` Tailwind 기본값 대신 커스텀 shadow로 섬세하게.

### 타이포그래피

| 용도 | 클래스 |
|------|--------|
| 페이지 제목 | `text-xl font-bold tracking-tight text-gray-900` |
| 섹션 제목 | `text-base font-semibold text-gray-900` |
| 카드 상품명 | `text-sm font-medium text-gray-900 leading-snug` |
| 가격 | `text-base font-bold text-gray-900` |
| 보조 설명 | `text-xs text-gray-500` |
| 캡션/힌트 | `text-xs text-gray-400` |

### 모서리(Border Radius)

| 요소 | 값 |
|------|----|
| 카드, 드로어 | `rounded-2xl` |
| 버튼 (기본) | `rounded-xl` |
| 입력 필드 | `rounded-xl` |
| 작은 뱃지/태그 | `rounded-full` |
| 내부 요소 | `rounded-lg` |

### 애니메이션

```
기본 전환: transition-all duration-200 ease-out
카드 호버: hover:-translate-y-0.5 (1px만 살짝)
버튼 클릭: active:scale-[0.98]
모달 열기: fade-in + slide-up (translateY 8px → 0)
스켈레톤: animate-pulse
```
과도한 움직임 금지. 전환은 150~200ms, 모달은 250ms 이하.

### 컴포넌트 패턴

**카드**
- 배경 흰색, 테두리 `border border-gray-100`, `rounded-2xl`
- 상단 편의점 컬러 강조선 3px (`border-t-[3px]`)
- 호버 시 shadow 강화 + `-translate-y-0.5`

**버튼 (Primary)**
- 편의점 브랜드 색상 배경, 흰색 텍스트
- `rounded-xl py-2 px-4 text-sm font-semibold`
- `hover:opacity-90 active:scale-[0.98]`

**버튼 (Secondary/Ghost)**
- `border border-gray-200 bg-white text-gray-700`
- `hover:bg-gray-50`

**인풋/셀렉트**
- `border border-gray-200 bg-gray-50 rounded-xl`
- `focus:border-gray-400 focus:ring-0 focus:bg-white`
- 테두리색만 변하는 포커스 (ring 최소화)

**뱃지**
- 행사 유형 뱃지: 그라디언트 + `rounded-full` + `text-[11px] font-bold`
- 편의점 뱃지: 브랜드 secondary 배경 + primary 텍스트

**빈 상태(Empty State)**
- 아이콘 + 제목 + 설명 + CTA 버튼 구조
- 아이콘: 64px, `text-gray-300`

### 간격(Spacing)

- 섹션 간격: `space-y-6` 또는 `gap-6`
- 카드 그리드: `gap-3` (모바일), `gap-4` (데스크탑)
- 카드 내부 패딩: `p-4`
- 페이지 좌우 여백: `px-4` (모바일), `px-6` (데스크탑)

### 금지 사항

- `shadow-md`, `shadow-lg` 직접 사용 금지 → 커스텀 shadow 사용
- 텍스트에 편의점 브랜드 컬러 남용 금지
- `font-bold` 과남용 금지 — 중요한 숫자·제목만
- 테두리 두께 2px 이상 금지 (강조선 제외)
- 여러 색상 그라디언트 남용 금지 (AI 배너 등 포인트 요소만)

## 참고 문서

@docs/progress.md
@docs/schema.md
@docs/crawling-notes.md
