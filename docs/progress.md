# 진행 현황

## 현재 단계: v1.1 (알림 구독)

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
- **크롤러**: Subscription 엔티티, 구독 DB 쿼리, Resend 이메일 발송, 키워드 매칭 알림 발송
- **프론트엔드**: 구독 API (POST/DELETE/GET), SubscribeForm 컴포넌트 (2단계 폼), 헤더 알림 버튼 연결
- **DB**: subscriptions, notifications_sent 테이블 마이그레이션 SQL

### 알림 구독 흐름
1. 사용자가 이메일 + 키워드(선택) + 편의점(선택) 입력 후 구독
2. 매월 크롤링 완료 후 `notify_subscribers()` 자동 실행
3. 구독 조건에 맞는 신규 상품만 Resend API로 이메일 발송
4. `notifications_sent` 테이블로 중복 발송 방지

### 배포 전 필요 작업
- Supabase에서 `20260601_subscriptions.sql` 마이그레이션 실행
- Vercel 환경변수에 `RESEND_API_KEY` 추가
- crawler `.env`에 `RESEND_API_KEY` 추가

---

## v1.2 — 진행 예정

- AI 조합 추천 (Gemini API)
