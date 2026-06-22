# README Improvement Plan

## 1. 현재 README의 문제점

- 구현 로그와 release note가 길어 첫 방문자가 프로젝트 목적, 실행 방법, 현재 상태를 빠르게 파악하기 어렵다.
- 구현 완료, pilot-ready, production blocker, target architecture가 한 흐름에 섞여 있어 portfolio용 claim을 고르기 어렵다.
- API, CLI, provider, smoke command가 많이 나오지만 “처음 실행할 최소 경로”가 먼저 보이지 않는다.
- screenshot/demo 섹션이 부족해 web operator console의 실제 사용 흐름을 파악하기 어렵다.
- production-ready가 아니라는 중요한 제한이 길게 설명되어 있어 별도 Current Status/Limitations 표로 분리하는 편이 좋다.

## 1.1 적용한 개선 방향

- 기존 README의 긴 target evidence command와 smoke 의존 문구는 회귀 방지를 위해 보존한다.
- 대신 README 최상단에 `Portfolio Overview`를 추가해 첫 방문자가 프로젝트 목적, 현재 claim boundary, 대표 demo, 빠른 재현 명령, evidence 파일을 먼저 볼 수 있게 한다.
- `smoke:readme-portfolio-overview`로 상단 요약이 `provider-scoped pilot-ready`, `not production-ready`, representative demo evidence 경로를 유지하는지 검증한다.

## 2. README에 추가해야 할 섹션

# Personal AI Agent

## 1. 프로젝트 개요
## 2. 개발 배경
## 3. 주요 기능
  - 구현 완료
  - 개발 중
  - 향후 개선
## 4. 기술 스택
## 5. 시스템 구조
## 6. 핵심 구현 내용
## 7. 실행 방법
## 8. 환경변수
## 9. 화면 예시
## 10. 개발 과정에서 해결한 문제
## 11. 비즈니스/사용자 관점의 적용 가능성
## 12. 향후 개선 계획

## 3. README 초안

# Personal AI Agent

Local-first multi-agent engineering harness for planning, running, reviewing, and evidencing repository-based AI work.

## 1. 프로젝트 개요

Personal AI Agent는 개발자와 operator가 저장소 기반 작업을 AI agent로 수행할 때 mission, provider, approval, artifact, release evidence를 한 흐름으로 추적하기 위한 Node.js 기반 local-first runtime입니다.

현재 목표는 production SaaS가 아니라 OpenAI-backed local-first/self-hosted pilot boundary를 검증하는 것입니다.

## 2. 개발 배경

일반적인 AI chat 또는 agent 실행은 다음 정보가 분리되기 쉽습니다.

- 어떤 workspace와 mission에서 실행되었는지
- 어떤 provider와 model configuration을 사용했는지
- 어떤 approval 또는 reviewer gate를 통과했는지
- 어떤 artifact와 release evidence가 남았는지
- 어떤 blocker 때문에 production claim을 하면 안 되는지

이 프로젝트는 이 흐름을 local-first control plane으로 묶는 것을 목표로 합니다.

## 3. 주요 기능

### 구현 완료

- CLI-first workspace/mission/session command surface: `src/cli.mjs`
- Web operator API/UI: `src/web/server.mjs`, `src/web/public/*`
- Managed multi-agent flow: `manager -> planner -> executor -> reviewer`
- Bounded specialist lanes: research, implementation, verification, design, documentation
- Provider registry/adapters: Stub, OpenAI, Anthropic, local OpenAI-compatible, Hermes-compatible
- Local JSON state and artifact persistence: `src/core/store.mjs`
- Approval gate, execution lease, start/stop/rollback/log surface
- Provider probe, fallback, attention, telemetry, action inbox
- Release readiness, handoff, snapshot, smoke/evidence scripts

### 개발 중

- Target provider operations evidence closure
- Hosted identity/session architecture
- Hosted tenant isolation architecture
- Target secret manager, observability, SLO, backup/retention operations
- Clean deployment and production-like release drills

### 향후 개선

- Anthropic/Hermes live validation blocker closure
- Public demo or recorded walkthrough
- Portfolio-friendly screenshots and scenario docs
- Production deployment architecture after target evidence is closed

## 4. 기술 스택

- Language/runtime: JavaScript, Node.js ESM
- Backend: Node HTTP server, service layer modules
- Frontend: Vanilla HTML/CSS/JavaScript operator console
- AI providers: OpenAI Responses API, Anthropic Messages API, local OpenAI-compatible provider, Hermes-compatible provider, deterministic stub
- Persistence: local JSON state and file artifacts under `var/`
- Verification: deterministic smoke scripts, evidence builders, GitHub Actions provider smoke

## 5. 시스템 구조

```text
Operator
-> CLI or Web UI
-> Mission Service
-> Runtime Harness
-> Agent Role Prompts
-> Provider Registry
-> Provider Adapter
-> Local Store and Artifacts
-> Evidence Docs / Release Handoff
```

## 6. 핵심 구현 내용

- `createMissionService()`는 workspace, mission, provider, action, approval, execution, memory, fact graph 흐름을 관리합니다.
- `createRuntimeHarness()`는 session, agent run, artifact, approval, execution lease lifecycle을 기록합니다.
- `createProviderRegistry()`는 provider env readiness와 default provider selection을 담당합니다.
- `src/web/server.mjs`는 local operator API와 static UI를 제공합니다.
- `scripts/smoke-*.mjs`는 provider fallback, execution flow, UI, release artifact hygiene 등을 검증합니다.

## 7. 실행 방법

```bash
npm run bootstrap:local
```

```bash
PERSONAL_AI_AGENT_UI_HOST=127.0.0.1 PERSONAL_AI_AGENT_UI_PORT=4400 npm run ui
```

```bash
node src/cli.mjs workspace add /absolute/path/to/repo --name my-repo
node src/cli.mjs workspace list
node src/cli.mjs provider list
node src/cli.mjs overview global
```

## 8. 환경변수

Provider:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `LOCAL_PROVIDER_MODEL`
- `LOCAL_PROVIDER_BASE_URL`
- `HERMES_PROVIDER_MODEL`
- `HERMES_PROVIDER_BASE_URL`

Web auth/RBAC/tenant mode:

- `PERSONAL_AI_AGENT_WEB_AUTH_MODE`
- `PERSONAL_AI_AGENT_WEB_AUTH_TOKEN`
- `PERSONAL_AI_AGENT_OIDC_ISSUER`
- `PERSONAL_AI_AGENT_OIDC_AUDIENCE`
- `PERSONAL_AI_AGENT_OIDC_JWKS_URL`
- `PERSONAL_AI_AGENT_RBAC_MODE`
- `PERSONAL_AI_AGENT_TENANT_MODE`

## 9. 화면 예시

추가 필요:

- Mission creation and run screen
- Provider readiness screen
- Release readiness tab
- Action inbox
- Artifact/handoff preview

## 10. 개발 과정에서 해결한 문제

- Provider adapter별 env readiness와 failure classification을 provider registry와 smoke scripts로 정리
- 위험한 실행을 approval gate와 execution lease로 분리
- release readiness claim을 pilot-ready와 production-blocked 상태로 분리
- local JSON store와 artifact path를 사용해 별도 DB 없이 session evidence를 남김

## 11. 비즈니스/사용자 관점의 적용 가능성

- Engineering lead: release readiness와 blocker를 evidence 기반으로 확인
- Platform/operator: provider health, action inbox, approval, artifact, handoff 관리
- Implementation engineer: mission 단위로 작업 계획과 reviewer result를 추적
- AI solution pilot: self-hosted local-first boundary에서 provider credential을 operator가 통제

## 12. 향후 개선 계획

- 대표 demo scenario와 screenshot 추가
- Anthropic/Hermes provider live validation blocker 해결
- target provider operations evidence 정리
- hosted identity/session, tenant isolation, secret manager, observability/SLO 검증
- clean deployment and rollback procedure 강화

## Current Status

| 항목 | 상태 |
|---|---|
| Local-first CLI/web MVP | 구현 완료 |
| OpenAI-backed local-first pilot | 가능 |
| Anthropic live validation | 검증 필요 |
| Hermes live validation | 검증 필요 |
| Hosted SaaS production | 미구현 |
| Production-ready claim | 사용 금지 |
