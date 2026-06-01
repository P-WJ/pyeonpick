# 진행 현황

## 현재 단계: 기능 고도화 1단계 진행 예정

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

### 알림 구독 흐름 (현재)
1. 사용자가 이메일 + 키워드(선택) + 편의점(선택) 입력 후 구독
2. 매월 크롤링 완료 후 `notify_subscribers()` 자동 실행
3. 구독 조건에 맞는 신규 상품만 이메일 발송 (임시 Resend, 추후 카카오 알림톡으로 전환 예정)
4. `notifications_sent` 테이블로 중복 발송 방지

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

## 고도화 1단계 — 진행 예정

- **공유 링크 자동 불러오기**: URL `?cart=1,2,3` 파싱 → 장바구니 자동 담기
- **찜하기**: 하트 아이콘 + 로컬스토리지(`cvs-wishlist-v1`) 기반
- **UI 폴리싱**: 버튼·카드 애니메이션, 그림자 효과 전반 개선

## 고도화 2단계 — 진행 예정

- **최근 본 상품**: 상세 페이지 접속 시 로컬스토리지 기록, 메인 하단 노출
- **프로필 페이지** (`/profile`): 찜한 상품, 작성 글 모아보기

## v1.2 — 완료 (2026-06-02)

### 완료 항목
- AI 조합 추천 백엔드 구현 (Groq llama-3.3-70b-versatile)
- Gemini API quota 문제로 Groq으로 교체 (`infrastructure/gemini.ts` 내부 교체)
- `/api/ai/recommend` POST 엔드포인트 + 5분 캐시
- UI: AiBanner, AiRecommendModal (기존 완성)
- 활성화: Vercel 환경변수 `NEXT_PUBLIC_ENABLE_AI_RECOMMEND=true` 필요
- UI는 완성 상태 (`AiBanner`, `AiRecommendModal`), API Route만 구현하면 됨

## v1.3 — 진행 예정

- 알림 발송을 카카오 알림톡으로 전환 (현재 이메일 임시 운영)
- 알림 설정 수정 기능 추가 (현재 해제만 가능)
- 카카오 비즈니스 채널(플러스친구) 설정 필요
