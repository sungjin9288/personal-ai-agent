# Evidence Checklist

| 항목 | 상태 | 증거 | 메모 |
|---|---|---|---|
| 프로젝트 루트 확인 | 완료 | `<local-workspace>/personal-ai-agent` | local path는 evidence에서 치환 |
| 프로젝트 유형 판단 | 완료 | `docs/implementation-evidence.md` | PoC / MVP 구현 |
| 필수 CLI smoke 실행 | 완료 | `evidence/cli-logs/npm-run-smoke.log` | `exit_code=0` |
| Mission/session 생성 | 완료 | `evidence/cli-logs/bootstrap-local-runtime.log` | stub provider run completed |
| Session lifecycle 확인 | 완료 | `evidence/cli-logs/session-show-runtime.log` | completed session and agent runs |
| Artifact 생성 확인 | 완료 | `evidence/output-artifacts/runtime-mission-artifact-list.log` | prompt/plan/deliverable/reviewer artifacts |
| Approval/review gate 확인 | 완료 | `evidence/cli-logs/learning-promotions-runtime.log` | human-approver pending-review |
| Execution preflight boundary 확인 | 완료 | `evidence/cli-logs/execution-preflight-approval-runtime.log` | knowledge mode direct execution blocked |
| Provider adapter 구조 확인 | 완료 | `evidence/cli-logs/provider-adapter-structure.log` | provider registry/adapters |
| Provider CLI surface 확인 | 완료 | `evidence/cli-logs/provider-list.log` | `exit_code=0` |
| Global overview 확인 | 완료 | `evidence/cli-logs/overview-global.log` | `exit_code=0` |
| Release blocker 확인 | 완료 | `evidence/cli-logs/release-blockers-hermes.log` | `exit_code=0` |
| Web server 실행 | 완료 | `evidence/api-responses/api-health.json` | `/api/health` 응답 저장 |
| API 응답 저장 | 완료 | `evidence/api-responses/*.json` | health/meta/providers/execution status |
| Web UI screenshot | 완료 | `evidence/screenshots/operator-console-home.png` | Playwright screenshot |
| CLI/agent output artifact | 완료 | `evidence/output-artifacts/*.md` | 기존 release evidence 복사 |
| Architecture diagram | 완료 | `evidence/architecture/current-architecture.mmd` | Mermaid |
| Sequence diagram | 완료 | `evidence/architecture/mission-run-sequence.mmd` | Mermaid |
| Provider adapter diagram | 완료 | `evidence/architecture/provider-adapter-structure.mmd` | Mermaid |
| 민감정보 파일명 검사 | 완료 | `evidence/evidence_manifest.md` | 제외 대상 없음 |
| API key 패턴 검사 | 완료 | `evidence/evidence_manifest.md` | 의심 패턴 없음 |
| 기존 portfolio zip 갱신 | 완료 | `_portfolio_export/personal_ai_agent_portfolio_pack.zip` | 414,081 bytes, SHA-256 `048ae109ca09bf6588a44839387a99171500ab1b9a3f055bcbca3d56fce80c22` |

## 검증 실패 / 보류

| 항목 | 상태 | 이유 | 다음 조치 |
|---|---|---|---|
| Anthropic live validation | 검증 필요 | 외부 provider credential/billing 검증은 이번 작업 범위 밖 | provider 계정 준비 후 live validation |
| Hermes live validation | 검증 필요 | target Hermes model/env/evidence blocker 존재 | target architecture evidence와 env proof 확보 |
| Hosted SaaS production readiness | 미구현 | 현재 release docs가 production-ready claim을 금지 | hosted identity/session, tenant isolation, target deployment evidence 필요 |
| Public demo URL | 미구현 | 현재 repo에 demo link 없음 | recorded demo 또는 self-hosted preview 준비 |
