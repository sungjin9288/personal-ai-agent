# Execution v1 Handoff

- archivedAt: 2026-05-08T19:09:24.209Z
- sourcePath: docs/execution-v1-handoff.md

- generatedAt: 2026-05-08T19:09:24.171Z
- localDate: 2026-05-09
- branch: codex/execution-v1-refresh-runbook-alignment
- commit: f6ebd3deed671069d9c45e7a2f35207eae5ed8f8
- evidence: [execution-v1-evidence.md](docs/releases/execution-v1/f6ebd3deed671069d9c45e7a2f35207eae5ed8f8/execution-v1-evidence.md)
- closeout: [execution-v1-closeout.md](docs/releases/execution-v1/f6ebd3deed671069d9c45e7a2f35207eae5ed8f8/execution-v1-closeout.md)
- immutableSnapshot: [docs/releases/execution-v1/f6ebd3deed671069d9c45e7a2f35207eae5ed8f8](docs/releases/execution-v1/f6ebd3deed671069d9c45e7a2f35207eae5ed8f8)
- visualArtifactSetSha256: 3e62b861c85c7c4556914975ea8ac91abc0f54e20f359b147dd215f33d653abb
- commitPushStatus: not pushed, origin/codex/execution-v1-refresh-runbook-alignment not found

## Operational State

- deterministic execution flow: ready
- CLI execution contract: ready
- operator console execution contract: ready
- browser interaction E2E: ready
- reference adoption aggregate: ready, 15 scripts, ok=true, totalDuration=32.7s
- deterministic runtime summary: ready
- snapshot portability: ready
- OpenAI live validation: passed
- Anthropic live validation: failed (anthropic live mission run failed | rootDir=<temp>/personal-ai-agent-live-anthropic-S78A4H | workspaceId=workspace_20260505160104_ea885a | missionId=mission_20260505160104_5c9b4f | artifact=manager-prompt.md | sessionId=session_20260505160104_292515 | missionStatus=failed)
- local provider live validation: blocked by missing `LOCAL_PROVIDER_MODEL`
- Hermes live validation: blocked by missing `HERMES_PROVIDER_MODEL`

## Live Failure Triage Summary

- OpenAI: no active blocker
- Anthropic: http-status, HTTP 400, Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.
- local provider: missing `LOCAL_PROVIDER_MODEL`
- Hermes: missing `HERMES_PROVIDER_MODEL`

## Implemented Capability Surface

- Multi-agent orchestration includes engineering/reviewer/specialist flows, approval gates, owner escalation, follow-up inboxes, and parallel specialist runs.
- Harness-style execution is wired through deterministic mission execution, execution lease approval, foreground runtime session tracking, CLI controls, and operator UI controls.
- Hermes Agent adoption is represented through the Hermes provider, Hermes tool-call parsing, Hermes profile metadata, UI blueprint card, and `engineering-full-spectrum` runtime blueprint coverage.
- Reference-inspired extensions are covered by aggregate smoke tests for output compaction, provider guard/rate handling, document conversion, retrieval memory, fact graph memory, instruction-boundary fixtures, runtime discovery, visual evidence manifest, orchestration profiles, UI blueprints, parallel specialists, and process timeout handling.
- Release evidence is captured in evidence, closeout, visual manifest, handoff, and immutable snapshot artifacts.

## Evidence-Backed Verification

- smoke:execution-flow: passed
- smoke:execution-cli: passed
- smoke:ui-execution-console: passed
- smoke:ui-execution-browser-e2e: passed
- smoke:reference-adoptions: passed
- smoke:execution-v1-live-helpers: passed
- smoke:execution-v1-handoff: passed
- smoke:production-readiness-gate: passed
- reference adoption aggregate: 15 scripts, ok=true
- deterministic runtime rows: 8
- visual artifact set: 3e62b861c85c7c4556914975ea8ac91abc0f54e20f359b147dd215f33d653abb

## Live Provider Handoff

Run these only in an environment that is allowed to use real provider credentials or local model endpoints:

```bash
npm run preflight:execution-v1:all
export OPENAI_RUN_TIMEOUT_MS=60000 OPENAI_API_KEY="..." && npm run live:execution-v1:openai
export ANTHROPIC_API_KEY="..." && npm run live:execution-v1:anthropic
export LOCAL_PROVIDER_MODEL="..." && npm run live:execution-v1:local
export HERMES_PROVIDER_MODEL="..." && npm run live:execution-v1:hermes
```

Expected pre-live state:

- `blockedCount` remains `0` when deterministic prerequisites are healthy.
- Providers without env/config remain `ready-but-missing-env` until their required value is injected.
- Provider account, billing, quota, or model access errors remain live blockers even when credentials are present.
- After env injection, live validation must be rerun before claiming provider-backed production readiness.

## Next Operator Steps

1. Resolve failed provider account-level blockers, then rerun only the affected `live:execution-v1:*` commands.
2. Inject local/Hermes runtime configuration in the target environment before claiming those provider paths.
3. Run `npm run refresh:execution-v1-artifacts` after live validation or planning source-of-record changes so evidence, closeout, handoff, provider readiness, and snapshot stay aligned while preserving archived live proof by default.
4. Use `node scripts/build-execution-v1-evidence.mjs --live-<provider>` first only when intentionally replacing live-provider proof for a selected provider.
5. Commit and push the refreshed release artifacts when the operator explicitly resumes git publishing.

## Completion Boundary

Execution v1 is provider-scoped pilot ready for an OpenAI-backed bounded local-first path. It is not production-ready or live-provider-complete because Anthropic is blocked by provider account billing/credit, and local/Hermes live validation still requires target runtime configuration.
