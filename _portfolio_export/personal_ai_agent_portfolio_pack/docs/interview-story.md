# Interview Story

## 1. 1분 프로젝트 소개

이 프로젝트는 AI agent가 저장소 기반 작업을 수행할 때 계획, 실행, 검토, 승인, 산출물, provider 상태가 흩어지는 문제를 해결하기 위해 시작했습니다.
저는 저장소 기준으로 local-first multi-agent runtime, CLI, web operator API/UI, provider adapter, approval/evidence workflow, smoke/evidence 자동화를 설계하고 구현했습니다.
기술적으로는 Node.js ESM, JavaScript, local JSON store, OpenAI/Anthropic/local/Hermes provider adapter, smoke scripts를 사용했고, 현재는 OpenAI-backed local-first pilot boundary까지 구현했습니다.
개발 과정에서 production-ready처럼 과장하기 쉬운 readiness 표현과 provider별 검증 상태를 분리하는 어려움이 있었고, 이를 release readiness 문서, target evidence gate, deterministic smoke script로 해결했거나 해결 중입니다.
이 프로젝트를 통해 AI agent 시스템은 기능 구현뿐 아니라 approval, fallback, audit, evidence 설계가 중요하다는 점을 배웠고, 향후에는 hosted identity/session, tenant isolation, target provider operations를 보완해 고도화할 계획입니다.

## 2. 3분 상세 설명

- 프로젝트 배경: 저장소 기반 개발/문서 작업을 AI agent로 수행할 때 operator가 실행 흐름과 검증 근거를 통제할 수 있는 local-first harness가 필요했다.
- 문제정의: autonomous swarm보다 managed multi-agent runtime, 명시적 approval gate, artifact evidence, provider readiness가 먼저 필요하다고 보았다.
- 기술 선택 이유: Node.js ESM은 CLI, HTTP server, file store, smoke automation을 한 repo에서 단순하게 연결하기 좋고, 별도 DB 없이 PoC를 빠르게 검증할 수 있다.
- 핵심 구현: `createMissionService()`가 workspace/mission/provider/action/approval/execution/memory 흐름을 소유하고, `createRuntimeHarness()`가 session, agent run, artifact, approval lifecycle을 기록한다. Provider는 `createProviderRegistry()` 뒤에서 공통 contract로 다룬다.
- 현재 상태: OpenAI-backed local-first pilot은 문서상 pilot-ready로 정리되어 있으나 production-ready, hosted SaaS, all-provider validation은 아직 아니다.
- 앞으로의 개선 방향: target provider validation, hosted identity/session, tenant isolation, secret manager, observability/SLO, demo deployment, portfolio screenshots
- 컨설팅 경험과의 자연스러운 연결: 문제를 사용자 역할과 운영 흐름으로 분해하고, 구현 완료와 target blocker를 구분해 stakeholder가 의사결정할 수 있는 문서로 정리한 점을 강조한다.

## 3. 기술 면접 예상 질문 10개

| 예상 질문 | 답변 방향 | 코드 근거 | 보완 필요 지식 |
|---|---|---|---|
| 왜 Node.js ESM으로 만들었나? | CLI, HTTP server, smoke script를 같은 runtime으로 단순화하기 위해 선택 | `package.json`, `src/cli.mjs`, `src/web/server.mjs` | Node event loop, ESM module loading |
| Provider adapter는 어떻게 추상화했나? | provider catalog와 registry가 env, capability, runtime status를 정규화 | `src/providers/index.mjs`, `src/providers/provider-catalog.mjs` | Adapter pattern, retry/fallback design |
| Local persistence는 어떻게 동작하나? | `var/state.json`에 collection state를 atomic write하고 mission artifact는 file path에 저장 | `src/core/store.mjs` | File locking, concurrency risk |
| Agent workflow는 어떤 순서인가? | manager, planner, executor, reviewer 순서이며 specialist fan-out은 bounded | `docs/adr/ADR-001-runtime-and-agent-shape.md`, `src/core/mission-service.mjs` | Multi-agent orchestration |
| 위험한 실행은 어떻게 막나? | approval gate, execution lease, preflight, rollback/log를 사용 | `src/harness/runtime-harness.mjs`, `src/core/mission-service.mjs` | Sandbox, command validation |
| Web API 인증은 어떻게 처리하나? | optional shared secret, OIDC/JWKS, RBAC, tenant claim mode를 env로 제어 | `src/web/server.mjs`, `src/core/web-auth-policy.mjs`, `src/core/rbac-policy.mjs` | JWT/OIDC, RBAC |
| Release readiness는 코드와 어떻게 연결되나? | scripts가 evidence docs를 생성/검증하고 web API가 status/release blockers를 노출 | `scripts/build-*.mjs`, `src/web/server.mjs` | CI/CD release gates |
| Provider failure는 어떻게 분류하나? | provider runtime utils와 smoke scripts가 config, timeout, non-json, schema invalid 등을 다룸 | `src/providers/provider-runtime-utils.mjs`, `scripts/smoke-provider-*.mjs` | Error taxonomy |
| Retrieval/memory는 어떤 방식인가? | mission attachment와 memory entry를 context로 요약하고 fact graph를 유지 | `src/core/retrieval-service.mjs`, `src/core/fact-graph-service.mjs` | RAG, graph modeling |
| 현재 가장 큰 기술 부채는? | file store concurrency, hosted auth/session, production tenant isolation, all-provider validation | `docs/security-model-v1.md`, `docs/release-readiness-v1.md` | Production architecture |

## 4. 프로젝트 면접 예상 질문 10개

| 예상 질문 | 답변 방향 | 근거 | 보완 필요 사항 |
|---|---|---|---|
| 이 프로젝트의 사용자는 누구인가? | engineering lead, platform/operator, implementation engineer | `docs/product-plan-v1.md` | 실제 사용자 인터뷰 |
| MVP 범위는 어디까지인가? | local-first managed runtime과 OpenAI-backed pilot boundary | `docs/product-plan-v1.md`, `docs/release-readiness-v1.md` | demo scenario 정리 |
| 왜 autonomous swarm이 아닌 managed runtime인가? | 승인, 검토, evidence 없이 자동 실행하는 리스크를 줄이기 위해 | `docs/adr/ADR-001-runtime-and-agent-shape.md` | Agent safety 사례 |
| 구현 완료와 예정 기능은 어떻게 구분하나? | 코드 파일, smoke script, release readiness 문서의 status로 구분 | 이 문서의 Current Status | 최신 smoke 결과 |
| README가 긴데 핵심 메시지는 무엇인가? | README 최상단 Portfolio Overview가 목적, claim boundary, representative demo, evidence entry point를 먼저 설명하고 상세 운영 문서는 아래에 보존 | `README.md`, `docs/readme-improvement.md` | 지속적인 screenshot/demo 보강 |
| 배포 상태는 어떤가? | self-hosted local-first pilot guide는 있으나 hosted production은 아님 | `docs/deployment-pilot-v1.md` | 실제 demo link |
| 수치 성과가 있나? | 현재 없음. 임의 생성하지 않음 | 저장소 근거 없음 | pilot metric 확보 |
| 보안은 어느 정도 구현됐나? | local shared-secret/OIDC/RBAC/tenant mode와 security docs는 있으나 hosted production은 gap | `docs/security-model-v1.md` | threat model 심화 |
| 테스트 전략은 무엇인가? | 많은 deterministic smoke script와 GitHub Actions provider smoke 사용 | `package.json`, `.github/workflows/provider-smoke.yml` | 테스트 분류표 |
| 포트폴리오에서 어떻게 설명할 것인가? | AI agent control plane, provider abstraction, evidence-driven workflow 중심 | `docs/project-card.md` | 발표용 screenshot |

## 5. 컨설팅 경험과의 연결 질문 5개

| 예상 질문 | 답변 방향 | 주의할 점 |
|---|---|---|
| 컨설팅 경험이 개발에 어떻게 도움이 되었나? | 사용자의 업무 흐름과 의사결정 기준을 mission, approval, evidence, blocker로 구조화하는 데 도움 | 프로젝트 도메인을 다른 분야로 억지 연결하지 않기 |
| 문제정의를 어떻게 했나? | “AI가 답한다”가 아니라 “operator가 통제하고 증거를 남긴다”로 문제를 재정의 | 기능 과장 금지 |
| 문서화 역량은 어디에 드러나나? | product plan, security model, release readiness, runbook, roadmap | 문서가 코드보다 앞선 부분은 target 상태로 표시 |
| 사용자 관점은 어떻게 반영했나? | engineering lead/operator/implementation engineer별 surface와 handoff를 분리 | 실제 사용자 검증은 아직 없다고 말하기 |
| 개선안 도출은 어떻게 했나? | production blockers를 target evidence gate로 분리해 다음 개발 순서를 명확히 함 | production-ready라고 말하지 않기 |

## 6. 내가 추가로 공부해야 할 부분

- 기술: Node.js concurrency, file-based persistence limits, provider API failure handling
- 아키텍처: hosted control plane, multi-tenant data isolation, deployment boundary
- 보안: OIDC/JWKS 운영, RBAC administration, secret manager, audit log integrity
- 배포: clean deployment, rollback, artifact registry, self-hosted packaging
- 테스트: smoke vs integration vs E2E 분류, flaky browser test 관리
- AI/LLM: tool calling, structured output reliability, provider cost telemetry, RAG quality evaluation
- CS 기초: process management, HTTP server lifecycle, filesystem atomicity, network timeout/retry
