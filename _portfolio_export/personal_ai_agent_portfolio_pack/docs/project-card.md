# Project Card

## 1. Snapshot

- 프로젝트명: Personal AI Agent
- 프로젝트 유형: PoC
- 기간: 개인 개발 프로젝트. 정확한 시작일/종료일은 이 문서에서 확정하지 않음
- 현재 상태: MVP 구현
- 현재 검증 claim: `provider-scoped pilot-ready` for OpenAI-backed local-first/self-hosted path
- 내 역할: 저장소 기준 설명 범위는 제품 기획, Node.js runtime 구현, provider adapter, CLI/web operator surface, smoke/evidence 자동화, 포트폴리오 문서화
- GitHub 링크: https://github.com/sungjin9288/personal-ai-agent
- Demo 링크: public hosted demo 없음. 대표 demo는 `Representative Demo: Release Readiness Evidence Walkthrough`와 `evidence/` replay proof로 제공
- 핵심 기술스택: Node.js ESM, JavaScript, local JSON store, CLI, HTTP web console, OpenAI Responses API, Anthropic Messages API, OpenAI-compatible local provider, Hermes-compatible provider adapter, GitHub Actions, deterministic smoke scripts
- 이력서 반영 가능 여부: 가능
- 판단 이유: `src/cli.mjs`, `src/core/mission-service.mjs`, `src/harness/runtime-harness.mjs`, `src/providers/*`, `src/web/server.mjs`, `scripts/smoke-*.mjs`, `docs/release-readiness-v1.md` 기준으로 local-first multi-agent runtime, provider abstraction, approval gate, execution evidence, operator API/UI, smoke verification이 코드와 문서 양쪽에 존재한다. 단, production-ready, hosted SaaS, 모든 provider live validation 완료 주장은 위험하다.

## 2. One-liner

개발자와 operator가 저장소 기반 작업을 계획, 실행, 검토, 증거화하는 문제를 해결하기 위해 local-first multi-agent runtime, provider adapter, approval gate, evidence workflow를 개발 중인 개인 AI agent harness

## 3. Problem

- 이 프로젝트가 해결하려는 사용자 문제: 저장소 기반 개발/문서/검증 작업을 AI agent에게 맡길 때 작업 계획, 실행 권한, provider 선택, 산출물, 검증 근거가 분산되어 추적하기 어렵다.
- 기존 방식의 불편함 또는 한계: 단발성 AI 답변은 session, approval, artifact, provider failure, reviewer feedback, release evidence가 운영 가능한 기록으로 남지 않는다.
- 이 프로젝트에서 가장 중요한 문제정의: autonomous agent가 바로 시스템을 변경하게 하는 것이 아니라, 사람이 통제 가능한 managed multi-agent workflow와 evidence trail을 제공하는 것.
- 컨설팅 경험과 자연스럽게 연결되는 부분:
  - 문제정의: AI agent 운영에서 필요한 통제 지점과 산출물 기준을 분리
  - 요구사항 정리: provider, mission, approval, artifact, release readiness 요구를 문서와 smoke script로 구조화
  - 사용자 관점: engineering lead, platform/operator, implementation engineer가 보는 화면과 CLI surface를 분리
  - 문서화: `docs/product-plan-v1.md`, `docs/security-model-v1.md`, `docs/operator-runbook-v1.md`, `docs/release-readiness-v1.md`
  - 기대효과 정리: local-first pilot, OpenAI-backed path, production blocker를 분리해 과장된 readiness claim을 방지

## 4. Solution

- 제공하려는 핵심 기능: workspace 등록, mission 생성/실행, manager-planner-executor-reviewer 순차 agent run, bounded specialist fan-out, provider adapter, approval gate, execution lease, artifact/evidence 생성, operator web console, provider/release/action overview
- 현재 실제로 제공 가능한 기능: CLI command surface, local web API/UI, stub provider, OpenAI/Anthropic/local/Hermes provider adapter 코드, provider readiness/probe, mission attachment, memory/fact graph, approval/action inbox, execution preflight/start/stop/rollback/logs, release evidence/status/handoff routes
- 개발 중인 기능: production target evidence closure, hosted identity/session, hosted tenant isolation, target secret manager, target observability/SLO, full target provider operations
- 아직 할 수 없는 기능: production-ready hosted SaaS claim, all-provider production validation claim, hosted multi-tenant production isolation, autonomous unbounded swarm, automatic production mutation without approval
- 사용자 흐름: `workspace add` 또는 `/api/workspaces` -> `mission create` 또는 `/api/missions` -> `mission run` 또는 UI run -> provider/approval/reviewer/artifact 확인 -> action inbox와 release readiness로 후속 조치 정리
- AI/IT 기술을 적용한 방식: provider registry가 `stub`, `openai`, `anthropic`, `local`, `hermes`를 같은 contract로 다루고, mission service가 agent role output, retrieval context, approval, evidence artifact를 local state에 저장한다.

## 5. Tech Stack

| 영역 | 사용 기술 | 현재 사용 여부 | 근거 파일 |
|---|---|---|---|
| Language | JavaScript, Node.js ESM | 사용 중 | `package.json`, `src/cli.mjs` |
| Frontend | Vanilla HTML/CSS/JS operator console | 사용 중 | `src/web/public/index.html`, `src/web/public/app.js`, `src/web/public/styles.css` |
| Backend | Node.js HTTP server, local service layer | 사용 중 | `src/web/server.mjs`, `src/core/mission-service.mjs` |
| AI/LLM | Stub, OpenAI Responses API, Anthropic Messages API, local OpenAI-compatible, Hermes-compatible provider | 사용 중 / 일부 검증 필요 | `src/providers/index.mjs`, `src/providers/provider-catalog.mjs`, `docs/release-readiness-v1.md` |
| Database | JSON file store under `var/state.json`, mission artifact files | 사용 중 | `src/core/store.mjs` |
| Infra/Deploy | Local-first self-hosted pilot, GitHub Actions provider smoke | 사용 중 / production 배포는 예정 | `.github/workflows/provider-smoke.yml`, `docs/deployment-pilot-v1.md`, `docs/release-readiness-v1.md` |
| Tools | CLI, smoke scripts, evidence builders, Playwright/browser evidence artifacts | 사용 중 | `src/cli.mjs`, `scripts/smoke-*.mjs`, `scripts/build-*.mjs` |
| Test | Deterministic smoke scripts, provider smoke workflow | 사용 중 | `package.json`, `.github/workflows/provider-smoke.yml` |

## 6. Architecture

### 현재 아키텍처

```text
User / Operator
-> CLI (`src/cli.mjs`) or Web UI (`src/web/public/*`)
-> Web/API server (`src/web/server.mjs`) or Mission Service (`src/core/mission-service.mjs`)
-> Runtime Harness (`src/harness/runtime-harness.mjs`)
-> Agent roles (`src/agents/*.md`) and mission packs (`src/packs/*`)
-> Provider Registry (`src/providers/index.mjs`)
-> Provider Adapter (`stub`, `openai`, `anthropic`, `local`, `hermes`)
-> Local Store (`var/state.json`, `var/missions/**`)
-> Artifacts / Docs / Release evidence
```

### 목표 아키텍처

```text
Operator / Team
-> Authenticated Web/API or CLI control plane
-> Workspace / Mission / Provider / Approval policy layer
-> Managed multi-agent runtime + bounded specialist lanes
-> Target provider accounts and target deployment evidence
-> Tenant-aware storage, secret manager, observability, backup, SLO operations
-> Pilot or hosted production handoff package
```

### 설명

- 주요 데이터 흐름: mission 입력과 attachment가 service에서 정규화되고, agent run 결과와 approval/artifact/provider telemetry가 `store.mjs`를 통해 local JSON state와 mission artifact path에 저장된다.
- 주요 모듈 구성: `src/core/*`는 service/policy/store, `src/providers/*`는 LLM provider adapter, `src/harness/runtime-harness.mjs`는 session/run/artifact/approval lifecycle, `src/web/*`는 operator API/UI, `scripts/*`는 smoke/evidence 자동화.
- API 구조: `/api/health`, `/api/meta`, `/api/workspaces`, `/api/missions`, `/api/providers`, `/api/providers/events`, `/api/actions`, `/api/approvals`, `/api/execution-v1/status`, `/api/execution-v1/release-blockers`, `/api/execution-v1/refresh`, `/api/execution-v1/snapshot` 등이 구현되어 있다.
- AI/LLM 처리 흐름: `createProviderRegistry()`가 default provider를 결정하고, `runMission()`이 manager, planner, executor, reviewer 및 specialist role 실행을 provider contract로 호출한다.
- DB 또는 저장소 구조: 별도 DB 없이 `var/state.json`과 `var/missions/<missionId>/...` 파일 기반 artifact store를 사용한다.
- 인증/보안/환경변수 처리 방식: web API는 optional shared-secret auth, OIDC/JWKS auth, RBAC, tenant claim mode를 환경변수로 제어한다. provider key는 `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `LOCAL_PROVIDER_MODEL`, `HERMES_PROVIDER_MODEL` 등으로 주입한다.
- 배포 구조가 있다면 설명: 현재 self-hosted local-first pilot 문서가 있으며 GitHub Actions provider smoke가 있다.
- 배포 구조가 아직 없다면 “미구현”으로 표시: hosted SaaS production 배포, hosted identity/session, production tenant isolation은 미구현 또는 target evidence 단계다.

## 7. My Contribution

- 직접 구현했다고 설명 가능한 기능: 저장소 기준으로 CLI command surface, mission runtime, provider adapter, web API/UI, smoke/evidence automation이 존재한다.
- 설계했다고 설명 가능한 구조: managed role order `manager -> planner -> executor -> reviewer`, approval gate, provider registry, local-first state/artifact model, release readiness evidence model
- 문서화 또는 기획 측면 기여: product plan, security model, operator runbook, release readiness, deployment pilot, target evidence docs
- 문제 해결 또는 디버깅 사례: provider fallback, provider attention remediation, release artifact hygiene, execution-v1 snapshot/evidence refresh 관련 smoke scripts가 문제 해결 근거로 사용 가능하다.
- 면접에서 코드 수준으로 설명해야 할 부분: `createMissionService()`, `createRuntimeHarness()`, `createProviderRegistry()`, `src/web/server.mjs` API routing, `src/core/store.mjs` atomic JSON write, provider failure normalization

## 8. Current Status

| 구분 | 기능 | 상태 | 근거 파일 | 이력서 반영 가능 여부 |
|---|---|---|---|---|
| 구현 완료 | CLI-first workspace/mission/session/action/provider command surface | 구현 완료 | `src/cli.mjs` | 가능 |
| 구현 완료 | Local JSON store와 mission artifact persistence | 구현 완료 | `src/core/store.mjs` | 가능 |
| 구현 완료 | Managed multi-agent runtime와 approval/artifact lifecycle | 구현 완료 | `src/harness/runtime-harness.mjs`, `src/core/mission-service.mjs` | 가능 |
| 구현 완료 | Provider registry와 Stub/OpenAI/Anthropic/local/Hermes adapter | 구현 완료 | `src/providers/index.mjs`, `src/providers/provider-catalog.mjs` | 가능, live validation 범위 명시 필요 |
| 구현 완료 | Operator web API/UI | 구현 완료 | `src/web/server.mjs`, `src/web/public/app.js` | 가능 |
| 개발 중 | Target provider operations와 production evidence closure | 개발 중 | `docs/target-provider-operations-v1.md`, `docs/release-readiness-v1.md` | 조건부 가능 |
| 개발 중 | Hosted SaaS, hosted identity/session, hosted tenant isolation | 개발 중 / target architecture | `docs/hosted-saas-architecture-decision-v1.md`, `docs/hosted-identity-session-architecture-v1.md`, `docs/hosted-tenant-isolation-architecture-v1.md` | 보류 |
| 미구현 | Production-ready hosted SaaS | 미구현 | `docs/release-readiness-v1.md` | 보류 |
| 검증 필요 | Anthropic live validation | 검증 필요 | `docs/release-readiness-v1.md` | 조건부 가능 |
| 검증 필요 | Hermes live validation | 검증 필요 | `docs/release-readiness-v1.md`, `src/providers/hermes-provider.mjs` | 조건부 가능 |
| 문서상 존재, 코드 근거 없음 | Enterprise production 운영 완료 | 문서상 target evidence, production claim blocked | `docs/release-readiness-v1.md` | 보류 |

## 9. Evidence

- 주요 코드 파일: `src/cli.mjs`, `src/core/mission-service.mjs`, `src/harness/runtime-harness.mjs`, `src/core/store.mjs`, `src/web/server.mjs`, `src/providers/index.mjs`
- 주요 함수/클래스: `createMissionService`, `createRuntimeHarness`, `createProviderRegistry`, `createStore`, `getProviderSpec`, `listProviderSpecs`
- 주요 API 엔드포인트: `/api/health`, `/api/meta`, `/api/workspaces`, `/api/missions`, `/api/providers`, `/api/providers/events`, `/api/actions`, `/api/approvals`, `/api/execution-v1/status`, `/api/execution-v1/release-blockers`, `/api/execution-v1/refresh`, `/api/execution-v1/snapshot`
- 설정 파일: `package.json`, `.github/workflows/provider-smoke.yml`
- 실행 파일: `src/cli.mjs`, `src/web/server.mjs`, `scripts/bootstrap-local.mjs`
- 테스트 파일: `scripts/smoke-*.mjs`, `scripts/verify-execution-v1.mjs`, `.github/workflows/provider-smoke.yml`
- README 또는 문서 근거: `README.md`, `docs/product-plan-v1.md`, `docs/security-model-v1.md`, `docs/release-readiness-v1.md`, `docs/adr/ADR-001-runtime-and-agent-shape.md`
- 실행 방법이 명확한지: README에 `npm run ui`, `node src/cli.mjs ...`, `npm run bootstrap:local` 예시가 있다.
- 대표 demo 근거: `evidence/cli-logs/representative-release-demo-replay.log`, `evidence/output-artifacts/representative-release-demo-summary.json`, `evidence/screenshots/representative-release-demo-release-status.png`
- 스크린샷/데모가 필요한 부분: mission run flow, provider readiness/status, action inbox는 추가 screenshot을 보강하면 좋다.

## 10. Consulting Angle

| 프로젝트 요소 | 연결되는 컨설팅 역량 | 이력서/면접 표현 | 근거 |
|---|---|---|---|
| Product plan과 readiness level 분리 | 문제정의, 기대효과 정리 | AI agent 운영을 production claim이 아닌 pilot boundary와 blocker 기준으로 구조화 | `docs/product-plan-v1.md`, `docs/release-readiness-v1.md` |
| Mission, approval, artifact lifecycle | 요구사항 정리, 업무 흐름 이해 | agent 실행 흐름을 operator가 검토 가능한 단계와 산출물로 분해 | `src/core/mission-service.mjs`, `src/harness/runtime-harness.mjs` |
| Provider readiness/fallback | 데이터 해석, 개선안 도출 | provider failure를 missing env, billing blocker, runtime failure 등으로 분류해 recovery route를 설계 | `src/providers/index.mjs`, `scripts/smoke-provider-*.mjs` |
| Security/tenant/auth 문서 | 사용자 관점, 문서화 | pilot에서 가능한 통제와 production gap을 구분해 risk communication 수행 | `docs/security-model-v1.md` |
| Smoke/evidence scripts | 문서화, 검증 기준 정리 | 기능 주장과 검증 명령을 연결해 재현 가능한 evidence workflow 구성 | `package.json`, `scripts/smoke-*.mjs` |

## 11. Safe vs Risky Expressions

### 써도 되는 표현

- Local-first multi-agent engineering harness를 Node.js ESM 기반으로 개발
- CLI와 web operator console을 통해 workspace, mission, provider, approval, artifact 흐름 구현
- OpenAI, Anthropic, local, Hermes provider adapter를 provider registry 뒤에 추상화
- Approval gate, execution lease, rollback/log surface, deterministic smoke scripts로 agent 실행 통제와 검증 근거를 설계
- OpenAI-backed local-first pilot boundary와 production blocker를 문서화

### 조건부로 가능한 표현

- OpenAI-backed pilot ready: `docs/release-readiness-v1.md`의 bounded local-first/self-hosted 범위를 함께 설명할 때 가능
- Multi-provider support: adapter 구현과 provider별 live validation 상태를 구분할 때 가능
- Enterprise controls: local rehearsal와 target evidence contract를 구분할 때 가능

### 쓰면 위험한 표현

- Production-ready AI agent platform
- Hosted SaaS 완성
- 모든 provider live validation 완료
- 완전한 multi-tenant isolation 구현
- 자율적으로 코드를 수정/배포하는 autonomous swarm 완성
- 실제 고객 운영 성과나 비용 절감 수치

### 위험한 이유

- `docs/release-readiness-v1.md`가 production-ready claim을 명시적으로 금지한다.
- Anthropic은 billing/credit blocker, Hermes는 target architecture evidence와 model/env proof가 남아 있다.
- hosted identity/session, tenant isolation, secret manager, SLO/observability는 target evidence 단계다.
- 성과 수치와 실사용 고객 피드백은 저장소 근거가 없다.
