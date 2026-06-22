# Implementation Evidence

## 1. Project Type

- 프로젝트 유형: PoC / MVP 구현
- 판단 근거: `package.json`은 Node.js ESM 기반 local-first personal AI agent scaffold를 정의하고, `src/cli.mjs`, `src/web/server.mjs`, `src/core/mission-service.mjs`, `src/providers/*`, `scripts/smoke-*.mjs`가 실제 실행 가능한 CLI/web/API/provider/smoke surface를 제공한다.
- 현재 상태: OpenAI-backed local-first/self-hosted pilot boundary는 evidence 문서와 smoke script로 검증 가능하나, hosted SaaS와 production-ready claim은 `docs/release-readiness-v1.md` 기준 차단 상태다.

## 2. Evidence Matrix

| 기능 | 구현 상태 | 증거 파일 | 실행/검증 결과 | 비고 |
|---|---|---|---|---|
| Mission/session 생성과 stub-backed run | 검증 완료 | `evidence/cli-logs/bootstrap-local-runtime.log`, `evidence/cli-logs/session-show-runtime.log` | `exit_code=0`, mission/session completed | AI agent runtime 핵심 증거 |
| Session artifact 생성 | 검증 완료 | `evidence/output-artifacts/runtime-mission-artifact-list.log` | prompt/plan/deliverable/reviewer/learning-candidate artifact 확인 | source code 포함 없음 |
| Approval/review gate | 검증 완료 / 범위 제한 있음 | `evidence/cli-logs/learning-promotions-runtime.log`, `evidence/cli-logs/execution-preflight-approval-runtime.log` | learning promotion은 human approval 필요, knowledge execution은 blocked | 직접 execution lease 성공 증거는 아님 |
| Provider adapter structure | 검증 완료 | `evidence/cli-logs/provider-adapter-structure.log`, `evidence/architecture/provider-adapter-structure.mmd` | adapter/registry/capability 구조 확인 | live provider key 미사용 |
| Local-first CLI smoke flow | 검증 완료 | `evidence/cli-logs/npm-run-smoke.log` | `exit_code=0` | `npm run smoke`가 workspace/mission/approval flow를 생성 |
| Provider registry/status | 검증 완료 | `evidence/cli-logs/provider-list.log`, `evidence/api-responses/api-providers.json` | `exit_code=0`, API 응답 저장 | provider 5종 구현 상태 확인 |
| Global overview/read model | 검증 완료 | `evidence/cli-logs/overview-global.log` | `exit_code=0` | workspace/global summary surface 확인 |
| Release blocker handoff | 검증 완료 | `evidence/cli-logs/release-blockers-hermes.log` | `exit_code=0` | Hermes/target provider blocker가 남아 있음을 증거화 |
| Representative release demo | 검증 완료 | `evidence/cli-logs/representative-release-demo-replay.log`, `evidence/output-artifacts/representative-release-demo-summary.json`, `evidence/output-artifacts/representative-release-demo-browser-e2e.json`, `evidence/screenshots/representative-release-demo-release-status.png` | 대표 demo smoke/status/snapshot/handoff/hygiene/pilot-export 통과, browser report/screenshot evidence 복사 | credential-free portfolio walkthrough |
| Operator surface demo evidence | 검증 완료 | `docs/operator-surface-demo-evidence-v1.md`, `evidence/cli-logs/mission-show-runtime.log`, `evidence/cli-logs/provider-list.log`, `evidence/cli-logs/approval-inbox-runtime.log`, `evidence/api-responses/api-providers.json` | mission/provider/action support evidence map smoke 통과 | release tab 밖의 보조 설명 증거 |
| Web API health/meta/status | 검증 완료 | `evidence/api-responses/api-health.json`, `api-meta.json`, `api-execution-v1-status.json` | HTTP 응답 저장 | local server `http://127.0.0.1:4510`에서 수집 |
| Web operator console | 검증 완료 | `evidence/screenshots/operator-console-home.png` | Playwright full-page screenshot 저장 | UI title: `에이전트 운영 콘솔` |
| Release/evidence output artifacts | 검증 완료 | `evidence/output-artifacts/*.md` | 기존 repo evidence docs 복사 | source docs 재생성 없이 포트폴리오 증거로 복사 |
| Architecture/sequence evidence | 검증 완료 | `evidence/architecture/current-architecture.mmd`, `mission-run-sequence.mmd` | Mermaid diagram 작성 | 코드 구조 기준 |
| Anthropic live validation | 검증 필요 | `docs/release-readiness-v1.md` | 이번 작업에서 live provider key 사용 안 함 | billing/credit blocker 기록 |
| Hermes live validation | 검증 필요 | `docs/release-readiness-v1.md`, `evidence/cli-logs/release-blockers-hermes.log` | blocker 확인 | target model/env/evidence 필요 |
| Hosted SaaS / production deployment | 미구현 | `docs/release-readiness-v1.md`, `docs/roadmap.md` | production-ready claim 금지 | target architecture 단계 |

## 3. Commands Run

| 명령 | 로그 | 결과 |
|---|---|---|
| `npm run smoke` | `evidence/cli-logs/npm-run-smoke.log` | 통과 |
| `node src/cli.mjs provider list` | `evidence/cli-logs/provider-list.log` | 통과 |
| `node src/cli.mjs overview global` | `evidence/cli-logs/overview-global.log` | 통과 |
| `node src/cli.mjs overview release-blockers --provider hermes` | `evidence/cli-logs/release-blockers-hermes.log` | 통과 |
| `npm run evidence:representative-demo` | `evidence/cli-logs/representative-release-demo-replay.log` | 통과 |
| `npm run smoke:representative-demo-evidence` | `evidence/output-artifacts/representative-release-demo-summary.json` | 통과 |
| `npm run smoke:operator-surface-demo-evidence` | `docs/operator-surface-demo-evidence-v1.md` | 통과 |
| `node scripts/bootstrap-local.mjs --workspace ... --run --provider stub` | `evidence/cli-logs/bootstrap-local-runtime.log` | 통과 |
| `node src/cli.mjs mission show mission_20260609060035_b10cc9` | `evidence/cli-logs/mission-show-runtime.log` | 통과 |
| `node src/cli.mjs session show mission_20260609060035_b10cc9 --session session_20260609060035_ba6107` | `evidence/cli-logs/session-show-runtime.log` | 통과 |
| `node src/cli.mjs action learning-promotions --mission mission_20260609060035_b10cc9` | `evidence/cli-logs/learning-promotions-runtime.log` | 통과 |
| `node src/cli.mjs mission execution preflight mission_20260609060035_b10cc9 --request-approval` | `evidence/cli-logs/execution-preflight-approval-runtime.log` | 통과, knowledge mode execution blocked |
| `curl -sS http://127.0.0.1:4510/api/health` | `evidence/api-responses/api-health.json` | 응답 저장 |
| `curl -sS http://127.0.0.1:4510/api/meta` | `evidence/api-responses/api-meta.json` | 응답 저장 |
| `curl -sS http://127.0.0.1:4510/api/providers` | `evidence/api-responses/api-providers.json` | 응답 저장 |
| `curl -sS http://127.0.0.1:4510/api/execution-v1/status` | `evidence/api-responses/api-execution-v1-status.json` | 응답 저장 |

## 4. Screenshot Evidence

- 파일: `evidence/screenshots/operator-console-home.png`
- 대표 demo 파일: `evidence/screenshots/representative-release-demo-release-status.png`
- 수집 방식: Playwright full-page screenshot
- 확인한 화면: local operator web console
- 민감정보 처리: evidence text files에서 local user path를 `/Users/<user>`로 치환했다.

## 5. Output Artifacts

- `evidence/output-artifacts/execution-v1-evidence.md`
- `evidence/output-artifacts/execution-v1-handoff.md`
- `evidence/output-artifacts/release-readiness-v1.md`

위 파일은 기존 repository evidence 문서를 포트폴리오 검토용으로 복사한 것이다. 앱 소스코드와 기존 원본 문서는 수정하지 않았다.

## 6. Verified vs Unverified

### 검증 완료

- local smoke flow
- representative release readiness demo replay
- mission/session creation and completed stub run
- session-scoped artifact generation
- learning promotion human-approval review gate
- provider registry/status surface
- web API health/meta/providers/execution status
- web operator console screenshot
- release blocker handoff surface
- architecture/sequence evidence

### 검증 실패

- 없음. 실행한 명령은 모두 성공했다.

### 검증 필요

- real OpenAI/Anthropic/Hermes/live local provider credentials를 사용하는 live provider validation
- hosted SaaS, hosted tenant isolation, production secret manager, production observability/SLO
- public demo URL과 실제 사용자 feedback

## 7. Evidence Boundaries

- 이번 evidence package는 app source code를 포함하지 않는다.
- API key, `.env`, token, password, private key, dependency folder, build artifact는 포함하지 않는다.
- 이 프로젝트의 실제 기능은 local-first multi-agent engineering harness이며, 다른 도메인으로 확장해 설명하지 않는다.
