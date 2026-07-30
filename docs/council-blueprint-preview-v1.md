# Council Blueprint Preview v1.1a

- status: preview-only
- productionReadyClaim: false
- C13 boundary: `keep-stub-only`

## Purpose

This is a deterministic, read-only projection of a selectable council meeting. It is not a mission profile, a provider contract, or an execution path. It does not create a mission, write storage, call a provider or model, request approval, or dispatch concurrent work.

## Selectable roles and fixed roles

The selectable specialist roles are `research`, `product`, `architecture`, `implementation`, `security`, `verification`, and `operations`. A preview accepts exactly three through seven unique specialists and canonicalizes them in that order. The default is `research`, `implementation`, `verification`.

`chair` and `reviewer` are always present as fixed, non-selectable roles. Every displayed role is limited to a responsibility, an evidence allowlist, prohibited actions, and an output contract.

## Deterministic plan

For `n` selected specialists the plan has `2n + 2` stages:

1. `opening:<role>` for every selected specialist, with no dependencies.
2. `rebuttal:<role>` for every selected specialist, depending on all openings and targeting the next canonical selected role cyclically.
3. `chair:synthesis`, depending on every rebuttal.
4. `reviewer:review`, depending on the chair synthesis.

Every dependency failure projects as `dependency-blocked`. The optional failed-stage projection is explanatory only: an opening failure blocks the rebuttal round and all later stages; a rebuttal failure blocks chair and reviewer; a chair failure blocks reviewer.

The preview authority is explicit and fixed: provider calls, model selection, mission mutation, approval mutation, runtime activation, and filesystem mutation are all unauthorized.

## Read-only surfaces

- CLI: `node src/cli.mjs council blueprints`
- CLI: `node src/cli.mjs council blueprint-preview --role research --role implementation --role verification`
- HTTP: `GET /api/council/blueprints`
- HTTP: `GET /api/council/blueprint-preview?role=research&role=implementation&role=verification`
- UI: the setup-page **Council preview** panel

The CLI preview dispatches before root/store/mission-service initialization, so it leaves an empty `PERSONAL_AI_AGENT_ROOT` untouched. The HTTP and UI surfaces are viewer-safe GET/read-model paths; neither provides an execution action. UI selection is intentionally isolated from the current mission Agent Blueprint and never contributes to `buildMissionConstraintPayload`.

## Scope & Limitations

- Concurrent execution is deferred; this plan neither schedules nor simulates it.
- The existing C6–C13 fixtures, evidence, artifacts, contracts, provider behavior, storage schema, mission flow, and approvals are unchanged.
- `keep-stub-only` remains the C13 decision. This preview is not evidence of local-model compatibility, provider readiness, runtime execution, deployment, or production readiness.

## Verification

Run `npm test`, `npm run smoke:council-blueprint-preview`, `npm run smoke:ui-agent-blueprints`, `npm run smoke:council-stub-runtime`, `npm run smoke:local-council-strict-prompt-candidate-qualification`, and `npm run smoke:local-council-v6-actual-compatibility-observation`.
