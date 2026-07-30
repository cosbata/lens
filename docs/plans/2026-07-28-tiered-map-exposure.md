# LENS Expanded Real-Time Map — 수정 계획

**Date:** 2026-07-28  
**Goal:** WorldMonitor를 복제하지 않고, 현재 수집 중인 데이터를 더 많이·더 명확하게·준실시간으로 보여준다.

## 1. 요구사항

- 처음 화면은 지금처럼 중요한 사건만 보여서 복잡하지 않아야 한다.
- 사용자가 원하면 지도에서 수집 중인 전체 사건을 볼 수 있어야 한다.
- USGS·NASA EONET처럼 실제 좌표가 있는 관측 데이터만 따로 볼 수 있어야 한다.
- 숫자 클러스터를 누르면 목록이 열리는 대신 지도 자체가 확대되며 개별 좌표로 분리돼야 한다.
- 개별 점을 눌렀을 때만 오른쪽 상세 패널이 열려야 한다.
- 새 데이터가 수집되면 새로고침 없이 지도와 건수가 갱신돼야 한다.
- WorldMonitor API가 없어도 기본 기능이 정상 작동해야 한다.

## 2. 현재 구조와 문제

| 영역 | 현재 구현 | 문제 |
|---|---|---|
| 메인 브리핑 | 점수 55 이상, 최대 8건 (`src/core/score/event-score.ts:5`, `src/core/select/briefing-selection.ts:20-67`) | 메인 이슈용으로는 적절함 |
| 지도 watchlist | 점수 40 이상 (`src/server/api/routes.ts:11`, `src/server/api/routes.ts:55-73`) | 좌표가 있어도 40점 미만이면 보이지 않음 |
| 실시간 관측 | USGS·EONET만 반환 (`src/server/api/routes.ts:75-83`) | 의미는 명확하므로 다른 뉴스 사건과 섞으면 안 됨 |
| 지도 렌더링 | 중요 사건과 관측 사건의 2개 GeoJSON 소스가 이미 존재 (`src/web/map/WorldMap.tsx:210-302`) | 새 지도 레이어를 만들 필요 없음 |
| 클러스터 | MapLibre 확장 줌이 이미 구현됨 (`src/web/map/WorldMap.tsx:370-439`) | 이 동작을 유지하고 회귀를 막아야 함 |
| 실시간 전달 | SSE + 30초 폴링 fallback (`src/web/data/live-briefing.ts:199-243`) | `live`가 연결 상태만 뜻하고 데이터 시각은 보여주지 않음 |
| 지도 생명주기 | 사건 배열이 바뀔 때 지도를 재생성 (`src/web/map/WorldMap.tsx:194-455`) | 실시간 갱신 시 깜빡임·카메라 초기화 위험 |

핵심 원인은 수집량이 아니라 **하나의 watchlist 기준만 지도 노출 기준으로 사용한 것**이다.

## 3. 결정

기존 의미를 보존한 세 가지 모드를 제공한다.

1. **Important** — 현재 watchlist만 선명하게 표시한다.
2. **All monitored** — watchlist는 선명하게, 나머지 좌표 보유 사건은 작고 투명하게 표시한다.
3. **Live observations** — USGS·EONET 등 구조화 관측 사건만 표시한다.

새 MapLibre 소스나 새 지도 라이브러리는 추가하지 않는다. 기존 `lens-events`와 `lens-activity` 두 소스를 모드에 따라 재사용한다.

## 4. 구현 단계

### 단계 0 — 현재 동작을 테스트로 고정

**Files**

- `tests/server/api/read-api.test.ts`
- `tests/web/live-briefing.test.ts`
- `tests/web/today-map.test.tsx`

추가할 회귀 조건:

- watchlist 점수 기준은 그대로 유지된다.
- activity는 USGS·EONET 구조화 관측만 포함한다.
- 클러스터 클릭은 `getClusterExpansionZoom()` 결과로 지도 확대만 수행한다.
- 클러스터 클릭만으로 상세 패널이 열리지 않는다.
- 개별 점 클릭은 해당 사건을 선택한다.

### 단계 1 — 전체 지도 사건을 별도 API 필드로 제공

**File:** `src/server/api/routes.ts`

`watchlist`와 `activity`의 의미를 바꾸지 않고 `monitored`를 추가한다.

`monitored` 포함 조건:

- `phase === "active"`
- `geometry !== null`
- 최신 점수가 존재함
- 점수 하한 없음

응답 구조:

```text
events      = 메인 브리핑
watchlist   = 중요 사건
monitored   = 좌표가 있는 전체 활성 사건
activity    = 구조화된 실시간 관측
```

중복은 클라이언트에서 ID 기준으로 한 번만 표시한다.

**성능 게이트:** 실제 `/api/v1/briefing` 응답을 측정한다. 압축 전 3MB를 넘을 경우에만 `monitored`를 지도용 최소 필드로 줄이고, 상세 내용은 기존 `/api/v1/events/:eventId`로 지연 조회한다. 측정 전에 별도 DTO나 새 endpoint를 만들지 않는다.

### 단계 2 — 클라이언트 데이터 흐름 연결

**Files**

- `src/web/data/live-briefing.ts`
- `src/web/App.tsx`

변경:

- `BriefingResponse.data.monitored` 타입 추가
- `briefingToMonitoredEvents()` 추가
- `App`에서 `monitoredEvents` 상태 유지
- SSE 갱신 시 watchlist·monitored·activity를 같은 응답에서 함께 교체
- `meta.dataTime`을 보존해 UI에 마지막 데이터 갱신 시각 전달

fallback fixture는 API가 비어 있거나 오프라인일 때만 사용한다.

### 단계 3 — 세 가지 지도 모드 제공

**Files**

- `src/web/components/MonitorControls.tsx`
- `src/web/screens/TodayOverview.tsx`

기존 `Selected events` / `Observed activity` 체크박스를 다음 단일 모드 선택기로 교체한다.

```text
Important | All monitored | Live observations
```

모드별 전달 데이터:

| Mode | `WorldMap.events` | `WorldMap.activityEvents` |
|---|---|---|
| Important | 필터된 watchlist | 빈 배열 |
| All monitored | 필터된 watchlist | monitored 중 watchlist와 중복되지 않은 사건 |
| Live observations | 빈 배열 | 필터된 activity |

검색과 카테고리 필터는 현재 선택된 모드의 전체 데이터에 적용한다. 표시 건수도 현재 모드 기준으로 계산한다.

기본 모드는 `Important`로 유지해 첫 화면의 복잡도를 늘리지 않는다.

### 단계 4 — 지도 갱신을 자연스럽게 수정

**File:** `src/web/map/WorldMap.tsx`

- 지도 인스턴스는 basemap이 바뀔 때만 재생성한다.
- 사건 갱신은 기존 `GeoJSONSource.setData()`로 처리한다.
- 실시간 데이터가 들어와도 현재 줌·중심·사용자 탐색 위치를 유지한다.
- 사건을 직접 선택했을 때만 `focusActive` 카메라 이동을 실행한다.
- `All monitored`의 보조 점은 기존 activity 스타일을 사용한다.
- 세계 줌에서는 넓게 클러스터링하고, 확대할수록 작은 반투명 점으로 분리한다.
- 클러스터 클릭은 현재 구현된 MapLibre expansion zoom을 그대로 사용한다.

새로운 spiderfy, 방사형 선, 탭 목록 UI는 추가하지 않는다.

### 단계 5 — “실시간” 상태를 정확하게 표시

**Files**

- `src/web/data/live-briefing.ts`
- `src/web/components/MonitorControls.tsx`
- `src/server/api/routes.ts`

UI를 두 정보로 분리한다.

- 전송 상태: `Live connection`, `Polling`, `Offline`
- 데이터 상태: `Updated 4 min ago`, `Delayed`, `Partial source outage`

서버 메타데이터는 선택적으로 비활성화된 공급자를 장애로 계산하지 않는다. 과거 DB에 남은 `worldmonitor_api_key_missing` 상태 때문에 전체 서비스가 `degraded`로 표시되지 않도록 필터링한다.

실제 수집 주기는 유지한다 (`src/server/index.ts:29-65`).

- USGS: 5분
- RSS: 10분
- EONET: 15분
- WorldMonitor·BarentsWatch: 설정된 경우에만 실행

### 단계 6 — 데이터 소스 확대 여부를 지표로 결정

위 단계 완료 후 카테고리별 다음 지표를 기록한다.

- 수집 원문 수
- 중복 통합 사건 수
- 좌표 보유 비율
- 정확 좌표 / 지명 좌표 / 국가 근사 좌표 비율
- 최근 24시간 활성 사건 수
- 공급자별 마지막 성공 시각

그 결과 특정 카테고리가 부족할 때만 새 무료 소스를 추가한다. WorldMonitor API 연결은 필수 조건이 아니며 이번 수정 범위에 포함하지 않는다.

## 5. 완료 조건

- 기본 진입 시 기존처럼 중요한 사건만 보인다.
- `All monitored` 선택 시 모든 활성·좌표 보유 사건이 지도 데이터에 포함된다.
- `Live observations` 선택 시 구조화 관측 데이터만 보인다.
- 클러스터를 반복 클릭하면 실제 좌표 점으로 분리된다.
- 클러스터 클릭만으로 상세 패널이 열리지 않는다.
- 개별 점 클릭 시 해당 사건 상세 패널이 열린다.
- 검색·카테고리 필터와 표시 건수가 세 모드 모두 일치한다.
- SSE 이벤트 이후 새로고침 없이 건수와 점이 갱신된다.
- SSE 장애 시 30초 폴링으로 자동 전환된다.
- 갱신 중 현재 지도 줌과 중심이 초기화되지 않는다.
- WorldMonitor 키가 없어도 전체 상태가 오류로 표시되지 않는다.
- 기존 메인 브리핑 선별 점수와 최대 개수는 변경되지 않는다.

## 6. 검증

1. `npm test -- tests/server/api/read-api.test.ts tests/web/live-briefing.test.ts tests/web/today-map.test.tsx`
2. `npm run typecheck`
3. `npm run build`
4. 브라우저 검증:
   - 세 모드 전환
   - 검색·카테고리 조합
   - 세계 → 국가 → 지역 클러스터 확대
   - 개별 사건 선택
   - SSE 갱신 중 카메라 유지
   - SSE 차단 후 polling fallback
5. API 검증:
   - `/api/v1/briefing` 배열별 건수와 중복 ID
   - `/api/v1/metrics`의 mapped 수와 `monitored` 수 일치
   - `/api/v1/providers/health`의 활성 공급자 상태

## 7. 위험과 대응

| 위험 | 대응 |
|---|---|
| 400개 이상 점으로 세계 화면이 복잡해짐 | 기본은 Important, All monitored에서만 보조 점 노출 |
| API 응답이 커짐 | 먼저 측정하고 3MB 초과 시에만 최소 필드 + 상세 지연 조회 |
| 국가 근사 좌표가 한 점에 겹침 | MapLibre 클러스터 확대 유지, 정확한 지역 좌표를 인위적으로 만들지 않음 |
| 실시간 갱신 때 지도 초기화 | 지도 재생성 대신 `setData()` 사용 |
| `live` 문구가 실제 최신성을 오해시킴 | 연결 상태와 데이터 갱신 시각을 분리 |
| WorldMonitor API 의존성 증가 | 선택 연동으로 유지하고 기본 경로에서는 제외 |

## 8. 구현 순서

```text
회귀 테스트
→ monitored API
→ 클라이언트 매핑
→ 3개 표시 모드
→ 지도 인스턴스 유지
→ 실시간/최신성 표시
→ 통합·브라우저 검증
```

**Stop condition:** 위 완료 조건을 충족하면 종료한다. 새 공급자 추가와 WorldMonitor API 연결은 별도 작업으로 분리한다.

## 9. 구현 결과

- 완료: `monitored` API와 클라이언트 매핑
- 완료: Important / All monitored / Live observations 모드
- 변경: 기본 지도는 All monitored, 주요 이슈는 다양성 우선 24개로 제한
- 완료: 클러스터의 MapLibre 확대 동작 유지
- 완료: 데이터 갱신 시 `setData()` 사용 및 카메라 유지
- 완료: SSE·polling 상태와 데이터 최신성 표시
- 완료: 선택형 WorldMonitor 키 미설정을 장애 상태에서 제외
- 검증: 단위 테스트 162개, 타입 검사, 린트, 프로덕션 빌드, E2E 14개 통과
