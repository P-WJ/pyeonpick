# 크롤링 특성·운영 메모

> 2026-10-28 기준. 편의점별 수집 방식, 실행 환경, 분류기, 알려진 함정을 모았다.
> 크롤러를 고치거나 수집이 실패했을 때 먼저 읽을 것.

## 한눈에

| 편의점 | 실행 위치 | 방식 | 2026-10 수집량 | 상태 |
|--------|-----------|------|----------------|------|
| CU | GitHub Actions | POST AJAX → HTML 조각 | 약 1,500 | ✅ |
| 이마트24 | GitHub Actions | GET 페이지 (20개/페이지) | 약 2,500 수집 → 중복 제거 2,300 | ✅ |
| 씨스페이스 | GitHub Actions | GET 페이지 (카테고리 코드별) | 100~430 (변동 큼) | ✅ (간헐적 끊김) |
| 세븐일레븐 | **로컬 PC 작업 스케줄러** | POST 초기 페이지 + 더보기 AJAX | 약 2,300 | ✅ (CI에서는 차단) |
| GS25 | — | — | — | ⛔ 수집 중단 (아래 참조) |

- 모든 매장: `httpx` + `BeautifulSoup`. **Playwright 미사용** (2026-10-28 의존성·`browser.py` 제거)
- 요청 간 `random.uniform(1.0, 2.0)`초 sleep (프로젝트 규칙)
- 사이트는 행사 기간을 주지 않는다 → `valid_from`/`valid_to`는 **수집 시점의 KST 월 1일~말일** (`common.current_month_range`)

## 실행 경로

```
python -m crawler.main [--stores cu,seven,emart24,cspace]
  └ crawler/main.py          — crawler/.env 자동 로드, --stores 파싱, 실패 매장 있으면 exit 1
     └ use_cases/crawl_all.py — 매장별: 수집 → AI 분류 → upsert → 미수집 상품 만료 → (전체 후) 신규 상품 웹 푸시
```

### 매장 1곳 처리 순서 (`crawl_all_stores`)
1. 시작 전 DB의 `(store, name)` 전체 스냅샷 → **신규 상품 판별 기준** (조회 실패 시 알림만 건너뜀, 전체 발송으로 폴백하지 않음)
2. `fetch_products()` — 매장 모듈은 요청 실패를 로그만 남기고 빈 목록을 돌려준다. **0개면 RuntimeError로 실패 처리** (접속 차단이 성공으로 묻히지 않게)
3. `classify_products()` — DB에 이미 있는 이름은 기존 카테고리 유지, 신규만 Groq 분류
4. `upsert_products()` — `on_conflict="store,name"`, 500개 배치, 같은 이름 중복은 사전 제거
5. `expire_unseen_products()` — 진행 중인데 이번 목록에 없는 상품을 **어제 날짜로 만료**. 단 수집량이 진행 중 상품의 50% 미만이면 부분 실패로 보고 건너뜀 (`MIN_COLLECTED_RATIO_FOR_EXPIRE`)

### 스케줄

| 무엇 | 언제 (KST) | 어디 |
|------|-----------|------|
| CU·이마트24·씨스페이스 1차 | 매월 1일 00:05 | `.github/workflows/crawl.yml` — cron `5 15 28-31 * *` + gate 잡이 KST 1일인지 확인 |
| CU·이마트24·씨스페이스 2차 | 매월 1일·15일 09:17 | cron `17 0 1,15 * *` |
| 세븐일레븐 | 매월 1일 00:10, 1일 09:30, 15일 09:30 | Windows 작업 스케줄러 `\PyeonPick\SevenMonthStart` / `SevenDay1` / `SevenDay15` |
| DB keep-alive | 매주 월·목 | `.github/workflows/keepalive.yml` |

- **GitHub 예약은 정시에 실행되지 않는다** — 정각 예약이 실측 약 4시간 밀렸다(03:43~04:48 UTC 시작). 그래서 정각을 피하고(`:05`, `:17`), 월초는 전날 밤(UTC)에 건다
- 1일 00:05 1차가 **지난달 목록**을 가져올 수 있다 (매장 사이트가 자정에 바로 바뀌지 않음). 그래도 날짜는 이번 달로 찍히고, 09:17 2차가 새 목록으로 덮어쓰며 빠진 상품을 만료시킨다
- 1차 추가 이유: 이전엔 1일 낮까지 "진행 중 상품 0건" 공백이 있었다 (지난달 상품은 말일에 끝나는데 새 수집은 예약 지연으로 늦게 들어옴)
- `concurrency: crawl` — 수동 실행과 예약이 겹쳐도 순차 실행
- 수동 실행: GitHub Actions 탭의 `workflow_dispatch`, 또는 로컬 `python -m crawler.main --stores cu`

### 로컬 실행 (세븐일레븐·디버깅)
- `crawler/.env` 필요 (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, 선택 `VAPID_*`)
- 스케줄러 스크립트: `scripts/crawl-seven-local.ps1`
  - 처음 실행 시 `crawler/.venv` 자동 생성 (httpx, bs4, supabase, python-dotenv, pywebpush)
  - 로그: `%LOCALAPPDATA%\pyeonpick\logs\seven-YYYYMMDD-HHmm.log`
  - 재등록: `powershell -ExecutionPolicy Bypass -File scripts\crawl-seven-local.ps1 -Register` (관리자 불필요). `StartWhenAvailable` — PC가 꺼져 있어 놓친 실행은 켜진 직후 실행
  - `schtasks /SC MONTHLY /D`는 **날짜 하나만** 받는다 → 날짜별로 작업을 따로 만든다
  - PowerShell 5.1은 네이티브 인자 속 큰따옴표를 깨뜨린다 → `/TR`엔 `powershell.exe`만 넣고 `Set-ScheduledTask`로 실제 인자를 덮어쓴다
- 이 스크립트는 **UTF-8 BOM**으로 저장해야 한다 (PowerShell 5.1이 BOM 없는 한글을 ANSI로 읽음)

## 편의점별

### CU — `stores/cu.py`
- `POST https://cu.bgfretail.com/event/plusAjax.do` (`pageIndex`, `listType=0`, `searchCondition=`), Referer 필요
- 응답은 HTML 조각. `div.prodListBtn`(더보기 버튼) 없으면 마지막 페이지
- 행사 유형: `.badge span.plus1`=1+1, `span.plus2`=2+1, 그 외 할인

### 세븐일레븐 — `stores/seven.py`
- 초기: `POST https://www.7-eleven.co.kr/product/presentList.asp` (`pTab`), 더보기: `POST .../listMoreAjax.asp` (10개씩)
- `pTab`: 1=1+1, 2=2+1, 3=증정, 4=할인. **2026-10 기준 pTab=3(증정)은 0개**
- 🔴 **GitHub Actions(데이터센터 IP)에서는 매번 `ConnectTimeout`** — 6월 이후 CI에서 한 번도 수집 못 함. 가정용 IP에서는 1~2초에 200
  - 초기 페이지 3회 재시도(5·10초 백오프)는 남아 있지만 CI 차단엔 소용없음
  - 셀프호스티드 러너는 **보류** — 공개 저장소라 포크 PR이 PC에서 코드를 실행할 위험
  - CI는 `--stores cu,emart24,cspace`로 세븐일레븐을 뺀다
- 수집만 약 17분 (1+1·2+1 탭이 각각 90여 회 더보기 × 1~2초) + 신규 상품 AI 분류 시간

### 이마트24 — `stores/emart24.py`
- `GET https://www.emart24.co.kr/goods/event?page=N` (20개/페이지). 전체 페이지는 스크립트의 `totalCount`/`pageLength` 또는 페이지 네비에서 계산
- 행사 유형 클래스: `onepl`=1+1, `twopl`=2+1, `tripl`=**3+1(이마트24만)**, `gola`/`sale`=할인
- 같은 상품명이 여러 번 나와 수집 수 > 저장 수 (중복 제거)

### 씨스페이스 — `stores/cspace.py`
- `GET https://www.cspace.co.kr/service/product.html?cpage=N&...` — 카테고리 코드로 행사 구분
  - `00030000000000000000`=1+1, `00040000000000000000`=2+1, `00060000000000000000`=할인 (`00050000…` 증정은 상품 없음)
- 페이지 수는 `select#page`의 option 개수
- 🟡 간헐적 `Server disconnected` — 일부 페이지가 빠져 수집량이 크게 흔들림(105~426). 만료 처리의 50% 안전장치가 이 경우를 위한 것

### GS25 — ⛔ 수집 중단 (`stores/gs25.py` 보존)
- 2026-08-26: `gs25.gsretail.com` 전 경로가 가맹점주용 `www.gsretail.com/brand/gs25`로 301. 옛 AJAX(`event-goods-search`)도 SPA 셸 HTML만 반환
- 2026-10-28 재조사:
  - GS리테일 홈페이지 JS 번들 125개 — 상품·행사 API 없음 (매장 검색·GIS뿐)
  - 우리동네GS 웹(`woodongs.com`) 번들 204개 — 행사 목록 없음. 기능은 Flutter 네이티브 앱에만
  - 앱 검색 API `POST b2c-apigw.woodongs.com/search/v3/totalSearch`의 `woodel_gs` 컬렉션에 `prmByQty`/`prmGtQty`(1/1=1+1, 2/1=2+1) 존재. **비공식·키워드 검색 전용**, 앱이 요청 암호화·인증서 고정 사용 → 약관 위험으로 **사용하지 않기로 결정**
- 남은 대안: GS리테일 공식 제휴 문의, GS25 데이터를 가진 집계 사이트와 제휴
- 재개 방법: 출처가 생기면 `gs25.py` 수정 → `crawl_all.STORE_MODULES`·`STORE_MODULES_BY_KEY`에 추가 → 프론트 `lib/constants.ts`의 `SUSPENDED_STORES`에서 제거 → `FilterBar` 안내 문구 제거

## AI 카테고리 분류 (Groq)

### 크롤링 중 분류 — `crawler/infrastructure/ai_classifier.py`
- 주 모델 `openai/gpt-oss-120b` (`GROQ_MODEL`로 교체), 일일 한도 걸리면 `openai/gpt-oss-20b`로 대체 (`_classify_with_fallback`)
- 배치 25개, `reasoning_effort: medium`, `max_completion_tokens: 8192`, `response_format: json_object`, 배치 간 2.5초
- 분류 실패·키 없음 → 상품은 **`기타`로 저장**되고 프론트 목록에서 숨겨진다 (그 후 `ai_classify.py`가 메움)
- 기존 상품 카테고리 조회는 이름 100개 단위로 쪼갬 (URL 길이 제한)

### 일괄 재분류 — 루트 `ai_classify.py`
- `uv run python ai_classify.py` (또는 `crawler/.venv`의 python). 120b만 사용, `classify_names` 공유
- '기타' 먼저, 나머지 id 순. 바뀐 카테고리만 update
- 체크포인트 `classify_progress.json`(`done_ids`) — 일일 한도면 **exit 2**로 저장 후 종료, 다시 실행하면 이어서. 전부 끝나면 파일 자동 삭제
- 진행 상황 (2026-10-28): 1차 전체 재분류 진행 중 — 2,075개 처리. 하루 약 2,000개라 11월 초에 끝날 예정

### Groq 무료 한도·함정
- 모델별 **TPM 8,000 / TPD 200,000** → 하루 약 2,000개 분류
- gpt-oss는 **추론 토큰도 출력 한도에 포함**된다. `max_tokens` 1024일 때 JSON이 잘려 '기타' 1,636개가 쌓였었음
- 배치 50·reasoning low는 응답 인덱스가 밀려 이웃 상품의 카테고리가 붙는다 → 25·medium
- `json_validate_failed`(HTTP 400)는 일시적 — 재시도
- `llama-3.1-8b-instant`·`llama-3.3-70b-versatile`는 Enterprise 전용으로 바뀌어 일반 키로 404 (2026-08)
- 헷갈리는 사례(브랜드명만 있는 아이스크림, 후랑크, 두유, 생리대·사료 등)는 `SYSTEM_PROMPT`에 명시돼 있음
- `common.infer_category`(키워드 규칙)는 현재 **호출하는 곳 없음** — AI 분류로 대체된 잔재

## 웹 푸시 알림
- 전체 매장 수집 후 **신규 상품만** 대상으로 `web_push_notifier.send_web_push_notifications()` (구독의 keywords·stores로 필터)
- 410 응답 구독은 삭제. `VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` 없거나 `pywebpush` import 실패 시 0건 발송으로 끝남
- 2026-10-28 기준 구독 0건, 실발송 검증은 사용자 요청으로 보류

## 장애 이력 (재발 시 여기부터 확인)

| 증상 | 원인 | 조치 |
|------|------|------|
| 저장 단계 `[Errno -2] Name or service not known` (9/15·10/1·10/15) | Supabase 무료 플랜 일시정지 → 도메인 DNS 소멸 | 대시보드에서 복구, `keepalive.yml` 추가 |
| CI 신규 상품 전부 '기타' | `GROQ_API_KEY` secret 무효(401) / 빈 값 | secret 재설정 (`gh secret set`은 대화형 입력이라 `!` 실행 시 빈 값이 될 수 있음 — 웹 UI 권장) |
| CU·이마트24 `URL component 'query' too long` | `.in_()`에 이름 수천 개 | 100개 단위 분할 |
| 세븐일레븐 4개 탭 전부 0개 | 데이터센터 IP 차단 | 로컬 작업 스케줄러로 분리 |
| 1일 낮까지 상품 0건 | 예약 지연 + "오늘"을 UTC로 계산 | KST 기준 계산, 1일 00:05 1차 추가 |
| CI DB 인증 실패 | workflow가 존재하지 않는 secret 이름 참조(빈 문자열 주입) | `secrets.SUPABASE_SERVICE_ROLE_KEY`로 정정 |

등록된 GitHub secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
