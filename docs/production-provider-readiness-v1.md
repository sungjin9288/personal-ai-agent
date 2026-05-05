# Production Provider Readiness v1

- status: local-provider-readiness-current
- generatedAt: 2026-05-05T02:06:43.126Z
- sourceBranch: codex/managed-multi-agent-v1-foundation
- sourceCommit: b4fa0cae585814c8125b7a0d6c6e86e7216b4afb
- releaseLabel: provider-scoped pilot ready for OpenAI-backed local-first path
- scope: local provider preflight and live-validation handoff readiness rehearsal
- productionReadyClaim: false
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedEvidence: [execution-v1-evidence.md](execution-v1-evidence.md)
- relatedCloseout: [execution-v1-closeout.md](execution-v1-closeout.md)
- relatedHandoff: [execution-v1-handoff.md](execution-v1-handoff.md)

## Decision Boundary

This rehearsal proves that OpenAI, Anthropic, local, and Hermes provider deterministic prerequisites can be checked together and that missing environment or account-level blockers are visible before live validation.

It is not live-provider-complete evidence, not target production provider validation, not provider account remediation proof, and not permission to claim `production-ready`.

Production-ready remains blocked until every provider included in the target release has successful live validation archived from the approved production-like deployment boundary.

## Command Matrix

| Command | Result | Exit Code | Duration Ms |
| --- | --- | ---: | ---: |
| `npm run preflight:execution-v1:all` | pass | 0 | 5842 |

## Key Signals

```json
{
  "blockedCount": 0,
  "missingEnvCount": 4,
  "readyForLiveCount": 0,
  "status": "ready-but-missing-env"
}
```

## Provider Matrix

| Provider | Preflight Status | Env Key | Env Ready | Archived Live Status | Live Command |
| --- | --- | --- | --- | --- | --- |
| openai | ready-but-missing-env | OPENAI_API_KEY | no | passed | `npm run live:execution-v1:openai` |
| anthropic | ready-but-missing-env | ANTHROPIC_API_KEY | no | failed (anthropic live mission run failed \| rootDir=<temp>/personal-ai-agent-live-anthropic-Ttzfhb \| workspaceId=workspace_20260505020629_a64b77 \| missionId=mission_20260505020629_acd205 \| artifact=manager-prompt.md \| sessionId=session_20260505020629_447927 \| missionStatus=failed) | `npm run live:execution-v1:anthropic` |
| local | ready-but-missing-env | LOCAL_PROVIDER_BASE_URL | no | missing-env | `npm run live:execution-v1:local` |
| hermes | ready-but-missing-env | HERMES_PROVIDER_MODEL | no | missing-env | `npm run live:execution-v1:hermes` |

## Provider Details

### openai

- preflightStatus: ready-but-missing-env
- envKey: OPENAI_API_KEY
- envReady: false
- deterministicChecks: smoke:openai-provider:passed, smoke:execution-flow:passed
- archivedLiveStatus: passed
- operationalState: passed
- liveCommand: `npm run live:execution-v1:openai`
- missingEnvCommand: `export OPENAI_RUN_TIMEOUT_MS=60000 OPENAI_API_KEY="..." && npm run live:execution-v1:openai`

### anthropic

- preflightStatus: ready-but-missing-env
- envKey: ANTHROPIC_API_KEY
- envReady: false
- deterministicChecks: smoke:execution-flow:passed
- archivedLiveStatus: failed (anthropic live mission run failed | rootDir=<temp>/personal-ai-agent-live-anthropic-Ttzfhb | workspaceId=workspace_20260505020629_a64b77 | missionId=mission_20260505020629_acd205 | artifact=manager-prompt.md | sessionId=session_20260505020629_447927 | missionStatus=failed)
- operationalState: failed (anthropic live mission run failed | rootDir=<temp>/personal-ai-agent-live-anthropic-Ttzfhb | workspaceId=workspace_20260505020629_a64b77 | missionId=mission_20260505020629_acd205 | artifact=manager-prompt.md | sessionId=session_20260505020629_447927 | missionStatus=failed)
- liveCommand: `npm run live:execution-v1:anthropic`
- missingEnvCommand: `export ANTHROPIC_API_KEY="..." && npm run live:execution-v1:anthropic`

### local

- preflightStatus: ready-but-missing-env
- envKey: LOCAL_PROVIDER_BASE_URL
- envReady: false
- deterministicChecks: smoke:execution-flow:passed
- archivedLiveStatus: missing-env
- operationalState: blocked by missing `LOCAL_PROVIDER_BASE_URL`
- liveCommand: `npm run live:execution-v1:local`
- missingEnvCommand: `export LOCAL_PROVIDER_BASE_URL="..." && npm run live:execution-v1:local`

### hermes

- preflightStatus: ready-but-missing-env
- envKey: HERMES_PROVIDER_MODEL
- envReady: false
- deterministicChecks: smoke:hermes-provider:passed, smoke:execution-flow:passed
- archivedLiveStatus: missing-env
- operationalState: blocked by missing `HERMES_PROVIDER_MODEL`
- liveCommand: `npm run live:execution-v1:hermes`
- missingEnvCommand: `export HERMES_PROVIDER_MODEL="..." && npm run live:execution-v1:hermes`

## Operating Interpretation

- OpenAI remains the only archived passed live provider in the current release evidence
- Anthropic remains blocked until provider account billing or credit is remediated and live validation passes
- local provider remains blocked until an approved `LOCAL_PROVIDER_BASE_URL` and model runtime are configured
- Hermes remains blocked until approved Hermes endpoint/model configuration is injected and live validation passes
- deterministic provider preflight passing is necessary but not sufficient for production provider readiness

## Operator Re-Run

```bash
npm run rehearsal:production-provider-readiness
npm run smoke:production-provider-readiness
```

## Acceptance Rule

The rehearsal is acceptable only when aggregate preflight reports `blockedCount: 0`, every provider appears in the provider matrix, and missing env or account blockers remain explicit.

The rehearsal must keep `productionReadyClaim: false` until live validation evidence is archived for every provider included in the target production claim.
