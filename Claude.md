# 편의점 행사 비교 서비스

## 프로젝트 개요

CU, GS25, 세븐일레븐, 이마트24, 씨스페이스의 1+1·2+1 행사상품을 한눈에 비교하는 웹 서비스.
차별점: 장바구니·절약액 계산·알림 구독·AI 조합 추천.

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
cvs-compare/
├── frontend/          # Next.js 15 + TypeScript + Tailwind
│   ├── domain/        # 엔티티 + 순수 로직
│   ├── infrastructure/# Supabase, AI 클라이언트 등
│   └── app/           # Next.js App Router
├── crawler/           # Python + Playwright
│   ├── domain/        # 엔티티
│   ├── infrastructure/# 편의점 크롤러, DB, 이메일
│   └── use_cases/     # 오케스트레이션
├── .claude/agents/    # 서브에이전트 정의
└── docs/              # 스키마, 크롤링 특성, 진행 현황
```

## 개발 단계

**현재 단계: v1.1**

| 단계 | 기능                   | 추가 에이전트                       |
| ---- | ---------------------- | ----------------------------------- |
| MVP  | 크롤링 + UI + 장바구니 | crawler, frontend, db-api, reviewer |
| v1.1 | 알림 구독              | + notifier                          |
| v1.2 | AI 조합 추천 (Gemini)  | + ai-recommender                    |

단계 전환 시 위 표에서 "현재 단계" 줄만 업데이트.

## 기술 스택

| 영역       | 기술                                        |
| ---------- | ------------------------------------------- |
| 프론트엔드 | Next.js 15, TypeScript strict, Tailwind CSS |
| 백엔드 API | Next.js API Routes                          |
| 크롤러     | Python 3.11+, Playwright, APScheduler       |
| DB         | PostgreSQL (Supabase)                       |
| 알림       | Resend                                      |
| AI         | Gemini API (모델 미정)                      |
| 배포       | Vercel (프론트), Railway (크롤러)           |

## 개발 규칙

- 패키지 매니저: `pnpm` (frontend), `uv` (crawler)
- 커밋: `feat:`, `fix:`, `chore:`, `refactor:`
- 모든 API 응답: `{ data: T | null, error: string | null, meta? }`
- 환경변수: `.env.local` (frontend), `.env` (crawler)
- 크롤러 요청 간 1~2초 sleep 필수

## 참고 문서

@docs/progress.md
@docs/schema.md
@docs/crawling-notes.md
