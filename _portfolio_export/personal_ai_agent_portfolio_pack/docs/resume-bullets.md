# Resume Bullets

## 1. 이력서용 프로젝트 제목 후보

- Local-first Multi-Agent Engineering Harness
- Personal AI Agent Runtime for Controlled Engineering Workflows
- Provider-aware AI Agent Control Plane PoC

## 2. 한 줄 소개 후보

- 저장소 기반 작업을 계획, 실행, 검토, 증거화하기 위한 Node.js 기반 local-first multi-agent harness
- OpenAI 등 LLM provider를 mission workflow에 연결하고 approval/evidence gate로 통제하는 개인 AI agent runtime
- CLI와 web operator console에서 mission, provider, approval, artifact, release readiness를 관리하는 AI engineering workflow 도구

## 3. 현재 이력서에 넣어도 되는 bullet

- AI agent 실행 결과가 추적되지 않는 문제를 해결하기 위해 Node.js ESM 기반 `manager -> planner -> executor -> reviewer` managed runtime을 구현하고, session/approval/artifact 상태를 local JSON store에 기록하는 MVP를 개발 중
- Provider별 설정과 장애 원인이 분산되는 문제를 줄이기 위해 Stub, OpenAI, Anthropic, local OpenAI-compatible, Hermes-compatible adapter를 `createProviderRegistry()` 뒤에 추상화하고 provider readiness/probe/fallback surface를 구현
- 위험한 agent 실행을 통제하기 위해 approval gate, execution lease, preflight, start/stop, rollback, log 조회 흐름을 `mission-service`와 CLI/web API에 반영
- Operator가 작업 상태를 빠르게 파악할 수 있도록 workspace, mission, provider, action inbox, approval, release readiness API와 vanilla JS web console을 구현
- Release claim 과장을 방지하기 위해 OpenAI-backed local-first pilot boundary와 production blocker를 `docs/release-readiness-v1.md`, smoke/evidence scripts, handoff docs로 분리해 문서화
- 사용자 흐름과 운영 리스크를 구조화하는 컨설팅형 접근을 바탕으로 product plan, security model, operator runbook, deployment pilot, target evidence docs를 정리

## 4. 구현 후 넣을 수 있는 bullet

- 구현 후 사용 가능: Hosted identity/session, tenant isolation, target secret manager, target observability/SLO evidence를 닫아 production-like deployment readiness를 검증
- 구현 후 사용 가능: Anthropic, local, Hermes target provider live validation을 모두 완료하고 all-provider readiness matrix를 운영 문서와 smoke evidence로 제공
- 구현 후 사용 가능: 실제 사용자 pilot feedback과 운영 metric을 기반으로 mission completion, approval turnaround, provider failure recovery 사례를 정량화

## 5. 기술스택 한 줄

- 현재 사용 중: JavaScript, Node.js ESM, Node HTTP server, local JSON file store, OpenAI Responses API, Anthropic Messages API, OpenAI-compatible local provider, Hermes-compatible adapter, GitHub Actions, smoke scripts
- 예정 / target: hosted identity/session, tenant isolation, secret manager, observability/SLO stack, production deployment automation

## 6. 지원 직무별 강조 포인트

### AI/IT 개발자

- Provider abstraction, runtime lifecycle, approval/execution control, smoke-driven verification을 강조한다.

### AI 서비스 기획

- Target user, use case, MVP/non-scope, readiness level, pilot vs production boundary를 구조화한 점을 강조한다.

### AI 솔루션 엔지니어

- Self-hosted local-first pilot, provider env validation, operator runbook, release handoff, target evidence checklist를 강조한다.

### DX/AI 컨설팅 주니어

- 고객/팀 업무 흐름을 mission, approval, artifact, evidence, blocker로 분해하고 도입 리스크를 문서화한 점을 강조한다.

## 7. 쓰면 위험한 표현

- Production-ready AI platform
- Hosted SaaS service 완성
- Enterprise-grade multi-tenant isolation 구현 완료
- 모든 LLM provider live validation 완료
- 실사용 고객 성과 또는 비용 절감 수치

## 8. 보완 후 쓸 수 있는 표현

- Anthropic/Hermes/local provider live validation 완료 후: multi-provider live validation matrix 구축
- Hosted identity/session과 tenant isolation proof 완료 후: tenant-aware hosted control plane 구현
- 실제 pilot 운영 후: pilot feedback 기반 운영 개선 사례 확보
- 배포 URL과 demo scenario 확보 후: self-hosted pilot demo 제공

## 9. 최종 판단

- 현재 이력서 반영 가능 여부: 가능
- 이유: 핵심 runtime, provider adapter, CLI/web surfaces, local persistence, approval/evidence workflow가 코드 근거로 확인된다.
- 이력서에 넣기 전 반드시 보완할 것: 직접 구현 범위, 기간, demo screenshot, 대표 smoke command 결과, 가장 설명하기 쉬운 mission scenario 1개
- 가장 먼저 개선해야 할 것: README를 portfolio-friendly하게 정리하고 production-ready가 아닌 OpenAI-backed local-first pilot boundary를 명확히 표현
