# 편의점 행사 비교 서비스 — 편픽(PyeonPick)

## 프로젝트 개요

CU, GS25, 세븐일레븐, 이마트24, 씨스페이스의 1+1·2+1·3+1·할인·증정 행사상품을 한눈에 비교하는 웹 서비스.
차별점: 장바구니·절약액 계산·찜하기·알림(카카오톡)·AI 조합 추천·커뮤니티 게시판.

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
│   │   ├── repositories/      # product, subscription, post
│   │   ├── supabase.ts
│   │   └── gemini.ts          # Groq API 래퍼 (파일명 유지, 내부는 Groq)
│   └── app/
│       ├── components/        # Header, ProductCard, CartDrawer, FilterBar, SubscribeForm, AiBanner 등
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
├── ai_classify.py             # 기존 상품 일괄 재분류 스크립트 (Groq llama-3.3-70b)
├── .claude/agents/            # 서브에이전트 정의
└── docs/                      # 스키마, 크롤링 특성, 진행 현황
```

## 개발 단계

**현재 단계: v1.1 완료 / 기능 고도화 진행 중**

| 단계 | 기능 | 상태 |
| ---- | ---- | ---- |
| MVP  | 크롤링 + UI + 장바구니 + 배포 | ✅ 완료 |
| v1.1 | 알림 구독 + 카카오 로그인 + 게시판 | ✅ 완료 |
| 고도화 1단계 | 공유 링크 자동 불러오기, 찜하기, UI 폴리싱 | ✅ 완료 |
| 고도화 2단계 | 최근 본 상품, 프로필 페이지, 게시글 수정/삭제 | ✅ 완료 |
| v1.2 | AI 조합 추천 (Groq API) | ✅ 완료 |
| v1.3 | 알림 카카오톡 전환 | 🔜 진행 예정 |

## 기술 스택

| 영역       | 기술                                              |
| ---------- | ------------------------------------------------- |
| 프론트엔드 | Next.js 15, TypeScript strict, Tailwind CSS       |
| 인증       | NextAuth v5 (카카오 OAuth)                        |
| 백엔드 API | Next.js API Routes                                |
| 크롤러     | Python 3.11+, Playwright, httpx, APScheduler      |
| DB         | PostgreSQL (Supabase)                             |
| 알림       | 카카오톡 알림톡 (예정, 현재 Resend 이메일 임시)   |
| AI 분류    | Groq API (llama-3.3-70b-versatile)                |
| AI 추천    | Groq API (llama-3.3-70b-versatile)                |
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
| notifier | 알림 발송 로직 (카카오톡 전환 예정) |
| ai-recommender | Groq AI 추천 기능 (llama-3.3-70b) |
| reviewer | 코드 리뷰 (Read-only) |
| ux-auditor | UX 감사·기능 누락 탐지 (Read-only) |
| ui-designer | 반응형 UI 디자인 구현 |

## 개발 규칙

- 패키지 매니저: `pnpm` (frontend), `uv` (crawler)
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
AUTH_KAKAO_ID
AUTH_KAKAO_SECRET
AUTH_SECRET
GROQ_API_KEY
GROQ_API_KEY                       # AI 추천 + 카테고리 분류 공용
NEXT_PUBLIC_ENABLE_AI_RECOMMEND   # true 시 AI 추천 배너 노출
```

**crawler `.env`**
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GROQ_API_KEY
```

## 로컬스토리지 키

| 키 | 용도 |
|----|------|
| `cvs-cart-v1` | 장바구니 |
| `cvs-wishlist-v1` | 찜 목록 (예정) |
| `cvs-recently-viewed-v1` | 최근 본 상품 (예정) |

## 참고 문서

@docs/progress.md
@docs/schema.md
@docs/crawling-notes.md
