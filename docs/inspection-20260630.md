# Inspection Report — personal-ai-agent (2026-06-30)

> 읽기 전용 리팩토링·디밸롭 점검. 코드는 변경하지 않았다. 모든 판단은 코드/스모크 실측 근거를 기준으로 한다.
> 전제 유지: 이 저장소는 **not production-ready**, **not all-provider-complete**, **not hosted SaaS**. 현재 검증된 안전 클레임은 `provider-scoped pilot-ready` (OpenAI-backed local-first 경로) 뿐이다.

---

## 1. 현황 요약

### 1.1 Git 실측 (배경값과 비교)

| 항목 | 배경(2026-06-27) | 실측(2026-06-30) | 비고 |
|---|---|---|---|
| 브랜치 | main | main | 동일 |
| origin 대비 ahead | 2 | **2** | `git rev-list --left-right --count origin/main...HEAD` → `0  2` |
| behind | 0 | **0** | 동일 |
| 미커밋(working tree) | 0 | **0** | `git status` 깨끗함 |

미푸시 2커밋:
- `767a31bb feat: surface operator handoff gates`
- `c769e9fd docs: route agent work through shared skill gates`

원격에는 `codex/*` 자동 생성 브랜치가 40개+ 존재(대부분 execution-v1 artifact refresh 류). main 자체는 ahead 2/behind 0로 배경과 일치.

### 1.2 구조

- `src/core/` — 서비스/정책/스토어/리트리벌/릴리스 레디니스 (33개 모듈)
- `src/harness/runtime-harness.mjs` — 역할 실행/세션/승인/아티팩트 라이프사이클 (300줄, 깔끔)
- `src/providers/` — 레지스트리 + 5개 어댑터(stub/openai/anthropic/local/hermes) + 카탈로그/런타임 유틸
- `src/web/server.mjs` — 로컬 operator API/콘솔 (4,108줄)
- `src/web/public/app.js` — 프론트엔드 단일 파일 (**25,969줄**)
- `scripts/` — smoke/evidence/live/rehearsal 스크립트 199개, 그중 smoke 167개

### 1.3 Smoke 실행 결과 (실측)

| 스모크 | 결과 |
|---|---|
| `npm run smoke` (집계) | **PASS** (3 미션 완료, approval 1건) |
| `smoke:provider-readiness-matrix` | PASS |
| `smoke:execution-flow` | PASS (`verificationStatus: passed`) |
| `smoke:approval-approve` | PASS |
| `smoke:provider-fallback-policy` | PASS |
| `smoke:representative-demo` | PASS (`credentialFree: true`, `productionReadyClaim: false`) |
| `smoke:production-provider-readiness` | **FAIL (EXIT=1)** |

실패 1건은 **문서/스모크 드리프트**다. `scripts/smoke-production-provider-readiness.mjs:289`가 README에 `npm run rehearsal:production-provider-readiness` 문자열이 있어야 한다고 단언하지만, 현재 `README.md`에는 해당 문자열이 0회(`grep -c` 확인). 같은 문자열은 `docs/production-provider-readiness-v1.md`와 `docs/deployment-pilot-v1.md`에는 존재. README가 6/23에 마지막 수정된 반면 스모크 단언이 이후 추가되며 README 갱신이 누락된 것으로 보임. **코드 결함이 아니라 README 누락.** CI(`.github/workflows/provider-smoke.yml`)는 이 스모크를 참조하지 않음(`grep -rln production-provider-readiness .github` → 매치 없음)이라 CI는 녹색일 수 있으나 로컬 게이트는 깨져 있음.

Node v24.13.1, zero-dependency(`node:*`만 사용). `package.json`에 `test` 스크립트 없음, `package-lock.json` 없음.

---

## 2. 리팩토링 후보

### P0 — `src/core/mission-service.mjs` (19,645줄, 단일 export, 내부 함수 394개)
- 단일 팩토리 `createMissionService(...)`가 4,219줄~끝까지 **15,426줄을 한 클로저**에 담음. 전역 코딩 스타일(파일 200~400줄, 최대 800줄)을 크게 초과.
- 한 모듈에 retrieval 아티팩트, mission attachment, escalation/owner-handoff reminder, provider telemetry 집계, orchestration profile, learning promotion 등 **서로 무관한 도메인**이 섞여 있음(low cohesion).
- 분할 후보(순수 헬퍼부터 추출하면 위험 낮음):
  - retrieval/아티팩트 요약 (`summarizeStoredRetrievalArtifact`, `compareRetrievalPreviewWithLatestArtifact`, `formatRetrievalArtifactContent`)
  - mission attachment (`normalizeMissionAttachmentFileName`, `inferMissionAttachmentMimeType`, `isSupportedMissionAttachment`, `sanitizeMissionAttachmentContent`)
  - escalation/owner-handoff (`buildEscalationReminderNote`, `formatEscalation*`, `deriveOwnerHandoff*`)
  - provider telemetry 집계 (`summarizeAttemptMetrics`, `summarizeUsageMetrics`, `summarizeEstimatedCost*`, `extractProviderFailureMetadata`)
  - orchestration/quality-gate (`resolveMissionParallelPlan`, `evaluateParallelQualityGate`)
- 권고: 던전 프로젝트에서 검증된 "Shared 순수헬퍼 + 도메인 모듈 + ctx 콜백" 분할 패턴을 적용. **대형 모델 일괄 리팩터는 트렁케이션 위험**이 있으므로 도메인 1개씩 추출 → 매 단계 관련 smoke 재실행.

### P1 — `src/web/public/app.js` (25,969줄, 함수 753개)
- 프론트엔드 전체가 단일 파일. operator 콘솔이 커지며 누적된 god-file. 도메인별(provider/mission/action-inbox/release) 모듈 분리 후보.
- 단, 빌드리스(no bundler) 제약이 있으면 `<script type="module">` 단위 분리가 선행 조건. 분리 전 채널/표면 단위 회귀 smoke 확보 필요.

### P1 — `src/web/server.mjs` (4,108줄, 내부 함수 104개)
- `handleApi`가 `request.method && pathname === ...` if-체인(약 49개 분기)으로 라우팅. 라우트 테이블(메서드+패턴→핸들러) 도입 시 분기 평탄화 + 핸들러 모듈 추출 가능.
- 경로 안전 가드(`startsWith(safeRoot)`)가 여러 곳 중복(703/2690/775 등) → 단일 `resolveWithinRoot()` 유틸로 통합 권고(보안·중복 동시 해소).

### 비후보(양호) — `src/harness/runtime-harness.mjs`
- 300줄, store 얇은 래퍼, 전부 불변 스프레드 패턴. `classifyRisk`로 승인 게이트 일원화. **추가 분할 불필요.** (점검 의뢰에 핵심 모듈로 포함됐으나 실측상 건강함.)

---

## 3. 디밸롭 후보 — Provider 확장 (현재 진척 중심)

### 3.1 핵심 사실: 어댑터는 이미 5개 모두 `implemented: true`
`openai/anthropic/local/hermes` 어댑터는 **코드 구조가 동일**하다 — 각자 `implemented: true`, 완전한 `probe()`(`GET /models`)와 `run()`(provider별 transport) 구현, 동일한 정책 래퍼(`requestJsonWithPolicy`), usage/cost 정규화, structured-JSON 파싱을 가짐. 즉 **provider 미완의 병목은 "코드 구현"이 아니라 "live 검증 증거(account/billing/architecture approval + target-boundary live run)"** 다. 이 분리는 `docs/provider-readiness-matrix-v1.md`와 `src/providers/index.mjs`로 코드 근거가 확실함.

### 3.2 Provider별 현재 상태 (registry/catalog/matrix 근거)

| Provider | 어댑터 | required env | readiness 상태 | 안전 클레임 |
|---|---|---|---|---|
| `stub` | 구현 | 없음 | 결정론적 로컬 리플레이 검증됨 | 로컬 기본 provider |
| `openai` | 구현 | `OPENAI_API_KEY` | **pilot-ready** (문서화된 boundary 내) | `provider-scoped pilot-ready` (유일 검증 클레임) |
| `anthropic` | 구현 | `ANTHROPIC_API_KEY` | **부분** — 어댑터 OK, billing/credit 증거로 live 차단 | "어댑터 지원"만 |
| `local` | 구현 | `LOCAL_PROVIDER_MODEL` | **부분** — configured 로컬 pilot proof는 아카이브됨, target 아키텍처 승인은 차단 | "아카이브된 configured 로컬 pilot" 한정 |
| `hermes` | 구현 | `HERMES_PROVIDER_MODEL` | **미완** — 어댑터+tool-call 파서만, target Hermes 아키텍처 증거 대기 | "Hermes-compatible 어댑터/파서"만 |

(OpenAI 외 4개는 `getDefaultProviderId`에서 자동 기본값이 되지 않음. `provider !== 'stub' && !explicitProviderSelection`이면 `runtime-harness.classifyRisk`가 승인을 강제 → 외부 모델 암묵 실행 차단.)

### 3.3 "다음 1개 provider를 올리는 최소 작업 셋" — **local 권장**

근거: local은 이미 "configured 로컬 pilot proof 아카이브" 상태이고, 외부 계정/billing이 아니라 **로컬 엔드포인트 소유/모델 핀**만 충족하면 되어 신용 의존(anthropic) 대비 자력 진행 가능. 코드 경로도 완비되어 있음.

코드/파일 기반 체크리스트:
1. **환경 구성** — `LOCAL_PROVIDER_MODEL`(필수), 필요시 `LOCAL_PROVIDER_BASE_URL`(기본 `http://127.0.0.1:11434/v1`) 설정. 로컬 OpenAI-호환 서버(Ollama 등) 기동.
   - 근거: `src/providers/provider-catalog.mjs` local 블록, `src/providers/local-provider.mjs:resolveLocalConfig`.
2. **deterministic preflight** — `npm run preflight:execution-v1:local` 실행. `scripts/preflight-execution-v1-live.mjs`가 `smoke:execution-flow` PASS + `LOCAL_PROVIDER_MODEL` 존재를 확인하고 `status: ready-for-live-validation`을 내야 함. (env 없으면 `local-live-env-missing` stop-condition.)
3. **probe 확인** — `npm run smoke:local-provider` 또는 `cli ... probe`로 `GET /models`가 `modelAvailable: true`인지.
4. **target-boundary live run** — `npm run live:execution-v1:local` (`scripts/run-execution-v1-live.mjs`가 env 게이트 후 `--live-local` 플래그로 evidence/closeout 빌드 실행).
5. **target 아키텍처 증거 충족** — `docs/target-local-provider-architecture-v1.md`가 요구하는: 엔드포인트 소유, 모델 핀, 네트워크 격리, transcript 정책, quota/resource guard, telemetry, fallback 승인.
   - 근거: matrix v1 local 행 + `preflight...mjs` `local.requiredClosingEvidence`.
6. **릴리스 증거 재생성** — `smoke:release-artifact-hygiene` + execution-v1 snapshot 재생성, `productionReadyClaim: false` 유지.
7. **문서 갱신** — matrix v1의 local 행 readiness 상태 갱신, README Status Boundary 표 갱신(과장 표현 금지 규칙 준수).

> 대안: anthropic을 다음으로 올리려면 위 1~4의 env만 `ANTHROPIC_API_KEY`로 바뀌고, 5번이 "billing/credit/account 증거 해소"로 대체된다(외부 의존이라 자력 통제 불가 → 우선순위 낮춤).

---

## 4. 기술 부채 · 위험

| ID | 심각도 | 내용 | 근거 |
|---|---|---|---|
| D1 | HIGH | `smoke:production-provider-readiness` 로컬 FAIL — README에 `rehearsal:production-provider-readiness` 누락 | 스모크 EXIT=1, `grep -c` README=0 / smoke:289 |
| D2 | HIGH | `mission-service.mjs` 19,645줄 god-module (단일 export, 394 내부 함수) | `wc -l`, `grep -c ^function` |
| D3 | MEDIUM | `app.js` 25,969줄 단일 프론트 파일 | `wc -l`, 753 함수 |
| D4 | MEDIUM | **단위 테스트 0** — 검증이 167개 deterministic smoke(주로 문서/상태 assert)에 전적으로 의존. 핵심 순수 로직(telemetry 집계, risk 분류, retrieval 비교)의 단위 커버리지 공백 | `test` 스크립트 없음, `*.test.*` 없음 |
| D5 | MEDIUM | 경로 가드 `startsWith(safeRoot)` 중복(server.mjs 다수) | grep 다중 매치 |
| D6 | LOW | smoke 스크립트가 README 문자열을 정규식으로 단언 → 문서 표현 변경 시 깨지기 쉬움(D1이 그 사례). CI 비포함이라 드리프트가 늦게 발견됨 | smoke 패턴, CI grep |
| D7 | LOW | 원격 `codex/*` 브랜치 40개+ 누적(artifact refresh) — 정리 필요 가능성 | `git branch -vv` |

승인 게이트/evidence 워크플로 빈틈:
- 승인 게이트 자체는 **건강**: `classifyRisk`가 (a) executor proposedAction.requiresApproval, (b) 비-stub provider 암묵 선택을 모두 승인 강제. `smoke:approval-approve/reject/inbox` 통과.
- evidence 게이트도 **다층 방어**가 코드로 존재: preflight(deterministic) → env 게이트 → live → closeout. `run-execution-v1-live.mjs`가 env 없으면 즉시 `process.exit(1)`.
- 빈틈은 검증 자동화 쪽: live 경로는 본 점검에서 **실행 불가**(외부 자격증명 없음, 의도된 boundary). 따라서 anthropic/local/hermes의 실제 live 동작은 코드 존재만 확인했고 런타임 검증은 못 함 — 정직성상 "코드 구현됨, live 미검증"으로 표기.

---

## 5. 정직성 · 문서

- README는 정직성 규칙을 잘 준수: `## Scope & Limitations`/`Status Boundary` 표 존재, "not production-ready / not all-provider-complete" 명시, 측정 근거 없는 수치 없음, demo URL "없음" 명기. **이 전제를 깨는 표현은 발견되지 않음.**
- matrix v1은 어댑터 구현 ≠ readiness 클레임을 명확히 분리하고 provider별 blocker/다음 명령을 코드 경로와 함께 제공 — 외부 공개용으로 신뢰 가능.
- 유일한 정합성 결함은 D1(README↔smoke 드리프트). 문서가 코드보다 신뢰의 단일 진실원이어야 하는데 README가 smoke 단언을 따라가지 못함.
- 권고(정직성 유지): README Status Boundary에 "Anthropic/Hermes/Local target: 어댑터 구현됨, **live 미검증**"을 한 줄 더 명시하면 "구현 vs 검증" 혼동을 더 줄임.

---

## 6. 우선순위 P0/P1/P2

### P0 (즉시)
- **P0-1**: `smoke:production-provider-readiness` FAIL 해소. README에 `npm run rehearsal:production-provider-readiness` 1줄을 (Testing 또는 provider 섹션에) 추가. 단, AGENTS.md 정직성 규칙 준수 — 새 수치/과장 금지, 명령만 추가. 추가 후 `node scripts/smoke-production-provider-readiness.mjs` 재확인.
- **P0-2**: 미푸시 2커밋 push 결정. ahead 2/behind 0/충돌 없음/working tree clean이므로 push **권장**(rebase 불필요). 단 P0-1을 먼저 같은 푸시에 포함하면 원격 main이 깨진 스모크 없이 정렬됨.

### P1 (단기)
- **P1-1**: `mission-service.mjs` 도메인 1개 추출 PoC(가장 안전한 retrieval 또는 attachment 순수 헬퍼 → 별 모듈). 매 추출 후 관련 smoke 재실행. (D2)
- **P1-2**: 핵심 순수 함수에 `node:test` 단위 테스트 시드 도입(`classifyRisk`, telemetry 집계, retrieval 비교). `test` 스크립트 추가. (D4)
- **P1-3**: 다음 provider(=local) live-ready 진행 — 3.3 체크리스트 1~7. (디밸롭)
- **P1-4**: `smoke:production-provider-readiness`를 CI(`provider-smoke.yml`)에 편입해 README 드리프트 조기 검출. (D6)

### P2 (중기)
- **P2-1**: `server.mjs` 라우트 테이블화 + 경로 가드 단일 유틸 통합. (D3 일부, D5)
- **P2-2**: `app.js` 도메인 모듈 분리(빌드리스 module 분할 선행 조사). (D3)
- **P2-3**: 원격 `codex/*` stale 브랜치 정리. (D7)
- **P2-4**: anthropic live-ready(외부 billing 증거 확보 시).

---

## 7. 권장 다음 액션 (실행 순서)

1. README에 `npm run rehearsal:production-provider-readiness` 추가 → `node scripts/smoke-production-provider-readiness.mjs` GREEN 확인 (P0-1).
2. 동일 변경 + 기존 2커밋을 `git push`로 origin/main 정렬 (P0-2).
3. `smoke:production-provider-readiness`를 CI에 추가 (P1-4) — 같은 드리프트 재발 방지.
4. local provider live-ready 시도: `LOCAL_PROVIDER_MODEL` 설정 → `preflight:execution-v1:local` → `live:execution-v1:local` → matrix/README 갱신 (P1-3).
5. `mission-service.mjs` 첫 도메인 추출 + `node:test` 단위 테스트 시드 (P1-1/P1-2).

> 모든 문서 갱신은 AGENTS.md 정직성 규칙(측정 근거 없는 수치 금지, production-ready/enterprise 과장 금지, Scope & Limitations 유지)을 우선한다.
