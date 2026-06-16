# AI Agent Runtime Evidence

## 1. Priority Evidence Summary

| Runtime area | Status | Evidence file | What it proves |
|---|---|---|---|
| Mission creation and run | 검증 완료 | `evidence/cli-logs/bootstrap-local-runtime.log` | `scripts/bootstrap-local.mjs` created a mission and completed a stub-backed managed run |
| Session lifecycle | 검증 완료 | `evidence/cli-logs/session-show-runtime.log` | generated session reached `completed`, current stage `reviewer`, and persisted agent run/artifact ids |
| Mission read model | 검증 완료 | `evidence/cli-logs/mission-show-runtime.log` | mission summary exposes sessions, artifacts, provider activity, memory/retrieval/harness state |
| Provider adapter structure | 검증 완료 | `evidence/cli-logs/provider-adapter-structure.log`, `evidence/architecture/provider-adapter-structure.mmd` | provider registry connects stub, OpenAI, Anthropic, local, and Hermes adapters behind one surface |
| Approval/review gate | 검증 완료 / 범위 제한 있음 | `evidence/cli-logs/learning-promotions-runtime.log`, `evidence/cli-logs/execution-preflight-approval-runtime.log` | learning candidate requires human approver; direct execution is correctly blocked for knowledge-mode mission |
| Artifact/evidence generation | 검증 완료 | `evidence/output-artifacts/runtime-mission-artifact-list.log` | mission session produced prompt, plan, deliverable, reviewer, and learning-candidate files |
| Operator console | 검증 완료 | `evidence/screenshots/operator-console-home.png`, `evidence/api-responses/*.json` | local web operator console and API surfaces loaded without external provider secrets |
| CLI operator logs | 검증 완료 | `evidence/cli-logs/*.log` | smoke, provider list, global overview, release blocker, bootstrap, mission, session, approval logs were captured |

## 2. Mission / Session Creation Evidence

The focused runtime proof uses a stub provider so no API key is needed.

Command:

```bash
node scripts/bootstrap-local.mjs --workspace /Users/<user>/dev/personal/personal-ai-agent --name portfolio-runtime-evidence --run --provider stub
```

Evidence:

- `evidence/cli-logs/bootstrap-local-runtime.log`
- mission id: `mission_20260609060035_b10cc9`
- session id: `session_20260609060035_ba6107`
- provider: `stub`
- reviewer verdict: `pass`
- mission status: `completed`
- session status: `completed`

## 3. Provider Adapter Evidence

Provider implementation evidence is based on:

- `src/providers/index.mjs`
- `src/providers/provider-catalog.mjs`
- `src/providers/stub-provider.mjs`
- `src/providers/openai-provider.mjs`
- `src/providers/anthropic-provider.mjs`
- `src/providers/local-provider.mjs`
- `src/providers/hermes-provider.mjs`

Captured evidence:

- `evidence/cli-logs/provider-list.log`
- `evidence/cli-logs/provider-adapter-structure.log`
- `evidence/api-responses/api-providers.json`
- `evidence/architecture/provider-adapter-structure.mmd`

Current validation boundary:

- Stub provider: verified locally.
- OpenAI/Anthropic/local/Hermes adapters: code-backed provider surfaces exist.
- External live validation: only use when provider credentials and account readiness are explicitly available; this evidence package does not include API keys.

## 4. Approval Gate Evidence

Two approval-related surfaces were captured:

- Learning promotion review gate: `evidence/cli-logs/learning-promotions-runtime.log`
  - shows `pending-review`
  - recommended owner: `human-approver`
  - recommended command requires explicit approve/reject decision
- Execution preflight: `evidence/cli-logs/execution-preflight-approval-runtime.log`
  - direct execution is blocked for `knowledge` mode
  - blocked reason: knowledge mode is document/memory-centered and does not support direct execution

Interpretation:

- Approval/review governance is implemented for learning promotion and risky workflow boundaries.
- The generated knowledge mission does not prove a successful execution lease because direct execution is intentionally blocked for that mission type.

## 5. Artifact / Evidence Generation

Generated mission artifacts are listed in:

- `evidence/output-artifacts/runtime-mission-artifact-list.log`

Observed artifact types:

- `manager-context.md`
- `manager-prompt.md`
- `planner-plan.md`
- `executor-prompt.md`
- `decision-memo.md`
- `reviewer-prompt.md`
- `reviewer-report.md`
- `learning-candidate.json`

This supports portfolio claims about session-scoped artifact and evidence generation.

## 6. Operator Console / API Evidence

Web/API proof:

- `evidence/screenshots/operator-console-home.png`
- `evidence/api-responses/api-health.json`
- `evidence/api-responses/api-meta.json`
- `evidence/api-responses/api-providers.json`
- `evidence/api-responses/api-execution-v1-status.json`

The operator console screenshot was captured with Playwright from the local UI server.

## 7. Safe Claim Boundary

Safe to claim:

- Local-first AI agent runtime with mission/session/artifact evidence.
- Provider adapter structure for stub, OpenAI, Anthropic, local, and Hermes providers.
- Human review/approval gates for learning promotion and blocked execution boundaries.
- Operator CLI and web console surfaces.

Do not claim yet:

- Production-ready hosted SaaS.
- All-provider live validation.
- Successful Hermes production readiness.
- Hosted tenant isolation.
- Automatic production mutation without approval.
