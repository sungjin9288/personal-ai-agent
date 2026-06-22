# Case Study

## 1. 배경

- 이 프로젝트를 시작한 배경: 저장소 기반 engineering/knowledge work를 AI agent로 수행할 때 계획, 실행, 검토, 승인, 산출물, provider 상태, release evidence를 한 흐름으로 관리하기 위한 local-first harness가 필요했다.
- 해결하려는 사용자 문제: AI agent 실행 결과가 단발성 답변으로 끝나고, 어떤 provider가 어떤 근거를 읽었는지, 어떤 승인과 검증을 거쳤는지 추적하기 어렵다.
- 이 문제가 중요한 이유: 개발 작업은 코드 변경, 명령 실행, 외부 provider 호출, 문서/릴리즈 판단이 섞이므로 통제와 evidence가 없으면 운영 리스크가 커진다.
- 현재 개발 진행 상태: `provider-scoped pilot-ready` for OpenAI-backed local-first/self-hosted path는 구현 및 문서화되어 있고, production/hosted SaaS readiness는 차단 상태다.

## 2. 문제 정의

### As-Is

- 현재 사용자는 CLI, IDE, AI chat, 문서, 테스트 결과를 따로 확인하며 작업한다.
- 기존 방식의 한계는 agent session, reviewer feedback, approval, artifact, provider failure, release blocker가 하나의 source-of-record로 남지 않는다는 점이다.

### Pain Points

- 불편 1: AI 실행 결과와 실제 검증 근거가 분리되어 면접/운영/릴리즈 설명이 어렵다.
- 불편 2: provider별 env, billing, timeout, retry, fallback 상태가 작업 단위와 연결되지 않는다.
- 불편 3: 위험한 실행이나 production claim을 막는 명시적 approval/release gate가 없으면 과장된 상태 표현이 나오기 쉽다.

## 3. 목표

### MVP 목표

- Local-first Node.js runtime에서 workspace, mission, session, provider, approval, artifact를 저장하고 추적한다.
- `manager -> planner -> executor -> reviewer` 순서의 managed multi-agent workflow를 제공한다.
- OpenAI-backed local-first pilot을 설명 가능한 evidence와 smoke script로 검증한다.

### 기술 목표

- Provider adapter를 공통 registry 뒤에 숨긴다.
- JSON-backed store와 artifact path를 사용해 별도 DB 없이 재현 가능한 state를 구성한다.
- CLI와 web API/UI가 같은 service contract를 사용하게 한다.

### 사용자 목표

- Operator가 mission을 만들고 실행한 뒤 결과, approval, action inbox, release readiness를 한 화면 또는 CLI로 확인한다.
- Engineering lead가 production blocker와 pilot-ready boundary를 명확히 구분한다.

### 학습 목표

- AI provider integration, execution governance, local persistence, smoke-driven verification, release evidence design을 실전 프로젝트 형태로 학습한다.

## 4. 해결 접근

- 어떤 기능으로 문제를 해결하려 했는가? Workspace/mission 모델, role-based agent runtime, provider registry, approval gate, artifact store, action inbox, release evidence docs/scripts로 해결한다.
- AI/IT 기술을 어디에 적용했는가? Provider adapter가 OpenAI, Anthropic, local OpenAI-compatible, Hermes-compatible runtime을 같은 mission execution flow에 연결한다.
- 왜 이 기술스택을 선택했는가? Node.js ESM만으로 CLI, local web server, file store, smoke scripts를 단순하게 묶을 수 있어 PoC/MVP 속도와 검증성이 높다.
- 현재 구현된 접근: CLI/web local control plane, JSON store, provider adapters, approval/execution/rollback/log surface, smoke/evidence automation.
- 향후 목표 접근: hosted identity/session, target tenant isolation, target secret manager, target observability/SLO, target provider operations evidence를 닫은 production-like deployment.

## 5. 구현 범위

### 구현 완료

- CLI command surface: `src/cli.mjs`
- Web API/UI: `src/web/server.mjs`, `src/web/public/*`
- Mission service와 runtime harness: `src/core/mission-service.mjs`, `src/harness/runtime-harness.mjs`
- Local JSON/file persistence: `src/core/store.mjs`
- Provider registry/adapters: `src/providers/*`
- Smoke/evidence scripts: `scripts/smoke-*.mjs`, `scripts/build-*.mjs`
- GitHub Actions provider smoke workflow: `.github/workflows/provider-smoke.yml`

### 개발 중

- Production target provider operations
- Hosted SaaS architecture and clean deployment evidence
- Hosted identity/session and tenant isolation evidence
- Target secret manager, observability, SLO, backup/retention operations

### 미구현 / 예정

- Hosted production SaaS
- Full production multi-tenant isolation
- All-provider production live validation
- Customer-facing demo deployment link

### 이번 MVP에서 제외한 범위

- 제외한 기능: production-ready hosted SaaS, automatic production mutation, unbounded autonomous swarm, mandatory vector database, full OCR/vision document ingestion
- 제외한 이유: `docs/product-plan-v1.md`와 `docs/release-readiness-v1.md` 기준 v1은 local-first managed runtime과 OpenAI-backed pilot boundary에 집중한다.

## 6. 시스템 설계

- 전체 구조: CLI/web -> mission service -> runtime harness -> agent roles/provider registry -> local store/artifacts -> evidence docs/scripts
- 데이터 흐름: workspace 등록 후 mission과 attachment를 저장하고, session별 agent run과 artifact, approval, provider telemetry를 `var/state.json` 및 `var/missions/**`에 기록한다.
- API 구조: `src/web/server.mjs`가 `/api/workspaces`, `/api/missions`, `/api/providers`, `/api/actions`, `/api/approvals`, `/api/execution-v1/*` 등을 제공한다.
- AI/LLM 처리 흐름: provider registry가 configured provider를 선택하고, mission run이 role별 prompt와 retrieval context를 provider adapter에 전달한다.
- 예외 처리: provider failure envelope, retry/fallback, action inbox, provider attention remediation, execution stop/rollback/log path가 있다.
- 보안/환경변수 처리: provider secret은 env로 주입하고, web auth/RBAC/OIDC/tenant mode는 `PERSONAL_AI_AGENT_*` env로 제어한다.
- 배포 계획: 현재는 self-hosted local-first pilot. Hosted SaaS와 production deployment는 target evidence 단계다.

## 7. 나의 역할

- 기획: product plan, readiness level, target user/use case, MVP/non-scope를 문서화했다.
- 요구사항 정의: `docs/product-plan-v1.md`, `docs/security-model-v1.md`, `docs/release-readiness-v1.md` 기준으로 provider, approval, evidence, release blocker 요구를 구조화했다.
- 프론트엔드: `src/web/public/app.js`, `index.html`, `styles.css` 기반 operator console과 release/provider/action surface를 구성했다.
- 백엔드: `src/web/server.mjs`, `src/core/mission-service.mjs`, `src/core/store.mjs` 중심의 local API/service/store 흐름을 구현했다.
- AI/LLM: `src/providers/*`, `src/agents/*.md`를 통해 provider adapter와 role prompt 기반 managed agent flow를 구성했다.
- 데이터 처리: local JSON store, artifact write, retrieval/fact graph/memory service로 실행 evidence를 남기도록 설계했다.
- 배포/검증: self-hosted pilot docs, GitHub Actions provider smoke, release evidence generator, representative demo replay proof를 정리했다.
- 문서화: v1 planning/evidence/security/operator docs와 portfolio evidence 문서를 유지했다.

## 8. 결과

- 구현 완료 기능: local-first multi-agent runtime, CLI, web API/UI, provider abstraction, local persistence, approval/action/release evidence surfaces
- 로컬 실행 가능 여부: 가능. README 기준 `npm run ui`, `npm run bootstrap:local`, `node src/cli.mjs ...`
- 테스트 여부: smoke scripts, representative demo evidence smoke, execution-v1 artifact smoke, GitHub Actions provider smoke가 존재한다.
- 배포 여부: hosted production 배포 근거 없음. self-hosted local-first pilot guide 존재.
- 사용자 피드백: 현재 없음. 임의 생성 금지.
- 수치 성과:
  - 현재 없음. 임의 생성 금지.

## 9. 배운 점

- 기술적으로 배운 점: provider adapter를 공통 registry로 묶고, local state와 artifact를 분리하면 agent run을 재현 가능하게 만들 수 있다.
- 설계에서 배운 점: AI agent 시스템은 기능보다 approval, evidence, fallback, blocker 표현이 먼저 안정화되어야 한다.
- 사용자 관점에서 배운 점: operator와 engineering lead는 “무엇을 할 수 있는가”보다 “어디까지 검증되었는가”를 빠르게 알아야 한다.
- 다음 프로젝트에 반영할 점: README와 portfolio 문서에서도 구현 완료, target architecture, production blocker를 명확히 분리한다.

## 10. 이 프로젝트가 보여주는 역량

- 개발 역량: Node.js ESM 기반 CLI/web backend, local persistence, provider integration, smoke automation
- 문제정의 역량: autonomous agent가 아니라 managed multi-agent harness로 문제 범위를 좁힌 점
- 데이터/AI 활용 역량: provider execution telemetry, retry/fallback, retrieval memory, fact graph, evidence artifact
- 커뮤니케이션/문서화 역량: product, security, operator, release readiness 문서를 통한 상태 전달
- 컨설팅형 사고: 사용자 역할, 운영 리스크, 검증 기준, readiness claim을 구조화하는 능력
