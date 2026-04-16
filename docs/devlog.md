# Devlog

<!-- document-log:start {"createdAt":"2026-04-16T02:00:00.000Z","id":"doclog_20260416020000_18f3ab","type":"devlog","updatedAt":"2026-04-16T02:00:00.000Z"} -->
## 2026-04-16 Release Recommended Actions

- date: 2026-04-16T02:00:00.000Z
- added `recommendedActions` to the execution-v1 status payload so release readiness is not just a collection of badges but an ordered operator queue
- prioritized stale current surface regeneration, eligible snapshot freeze, and provider-specific preflight/env preparation into a single list with explicit action ids that reuse existing release tab commands
- kept the change storage-free by deriving the queue entirely from current evidence/closeout summary, snapshot eligibility, and provider readiness instead of introducing new persisted release state
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T00:45:00.000Z","id":"doclog_20260416004500_93c7a1","type":"devlog","updatedAt":"2026-04-16T00:45:00.000Z"} -->
## 2026-04-16 Recommendation Jump-To-History Pass

- date: 2026-04-16T00:45:00.000Z
- added `최근 기록 보기` on recommendation cards so the operator can jump directly from a recommended action to the matching release action history row without scanning the full history list
- introduced a lightweight focused-history state and inline highlight style rather than a new modal or filter layer, keeping the release tab single-surface and low-friction
- kept the linkage fully client-side by reusing the persisted history ids already present in `releaseActionHistory`, which avoids expanding the server contract for a purely navigational affordance
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T00:30:00.000Z","id":"doclog_20260416003000_d1b84c","type":"devlog","updatedAt":"2026-04-16T00:30:00.000Z"} -->
## 2026-04-16 Recommendation History Link Pass

- date: 2026-04-16T00:30:00.000Z
- linked `권장 다음 액션` cards to the persisted release action history so each recommendation can surface its latest relevant preflight, confirmation-required, or blocked attempt inline
- kept the implementation read-only by deriving the latest matching history entry in the client from existing `recommendedActions` and `releaseActionHistory` payloads instead of adding another server-side summary layer
- improved operator triage speed by showing `최근 시도 / 마지막 summary / 시각` directly on the recommendation card, which reduces the need to scan the full history list for the same action context
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T00:00:00.000Z","id":"doclog_20260416000000_7a4f31","type":"devlog","updatedAt":"2026-04-16T00:00:00.000Z"} -->
## 2026-04-16 Release Action History Pass

- date: 2026-04-16T00:00:00.000Z
- added persisted `release action history` for execution-v1 release operations so refresh preflight, current-surface rewrite, provider preflight, and snapshot freeze outcomes are retained instead of existing only as transient notices
- wired the `v1 마감 상태` tab to show recent `allowed / blocked / confirmation-required / completed / failed` actions with branch and commit context, which makes release triage possible without leaving the operator console
- kept the scope narrow by logging only explicit release POST actions and by leaving mutable current-surface evidence/closeout markdown outside the commit boundary
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T01:15:00.000Z","id":"doclog_20260416011500_b2df83","type":"devlog","updatedAt":"2026-04-16T01:15:00.000Z"} -->
## 2026-04-16 Live Validation Confirm Guard

- date: 2026-04-16T01:15:00.000Z
- added explicit confirmation for provider-backed release refresh so `/api/execution-v1/refresh` no longer runs live validation from a single click
- reused `/api/execution-v1/refresh/preflight` as the exact readiness check for provider live validation, then armed the UI with a provider-scoped confirm state before the actual refresh call
- aligned the three mutating release actions under the same operator contract: `current surface 재생성`, `release snapshot 고정`, and `provider live validation` now all follow `preflight -> confirm -> execute`
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T00:45:00.000Z","id":"doclog_20260416004500_7ab31d","type":"devlog","updatedAt":"2026-04-16T00:45:00.000Z"} -->
## 2026-04-16 Snapshot Freeze Preflight Guard

- date: 2026-04-16T00:45:00.000Z
- added `/api/execution-v1/snapshot/preflight` so release snapshot freeze is re-evaluated by the server immediately before the operator arms the action, rather than trusting a stale eligibility badge rendered earlier
- changed `/api/execution-v1/snapshot` to require `confirmSnapshotFreeze`, which means snapshot freeze now follows the same two-step server-guarded contract as current surface regeneration
- mirrored the preflight result back into the release tab so the operator sees why snapshot freeze is allowed or blocked at the exact point of confirmation
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T00:30:00.000Z","id":"doclog_20260416003000_184a62","type":"devlog","updatedAt":"2026-04-16T00:30:00.000Z"} -->
## 2026-04-16 Server-Side Regeneration Preflight

- date: 2026-04-16T00:30:00.000Z
- added `/api/execution-v1/refresh/preflight` so current surface regeneration is armed only after the server re-evaluates overwrite impact and deterministic rerun semantics, instead of relying on stale client-side state alone
- changed `/api/execution-v1/refresh` to require `confirmCurrentSurfaceRewrite` for plain current-surface regeneration and to return a 409 with preflight metadata when the explicit confirm flag is missing
- kept provider live rerun behavior unchanged while making current-surface rewrite a server-guarded action, which closes the gap between UI confirmation and actual mutation permission
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T00:15:00.000Z","id":"doclog_20260416001500_703c11","type":"devlog","updatedAt":"2026-04-16T00:15:00.000Z"} -->
## 2026-04-16 Release Regeneration Confirm Step

- date: 2026-04-16T00:15:00.000Z
- added an explicit confirm state for current surface regeneration so the operator has to arm the action first, read the impact summary, and then click 재생성 확인 before evidence/closeout rewrite actually runs
- kept the flow inside the release tab rather than opening a modal, which preserves the operator context and makes the overwrite risk visible next to the refresh plan itself
- reset the confirm state whenever release status is reloaded or regeneration/live refresh actually runs, which avoids stale confirmation UI after state changes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T00:05:00.000Z","id":"doclog_20260416000500_2b8719","type":"devlog","updatedAt":"2026-04-16T00:05:00.000Z"} -->
## 2026-04-16 Current Surface Regeneration Preview

- date: 2026-04-16T00:05:00.000Z
- extended execution-v1 status with a refresh plan so the release tab can describe exactly what current surface regeneration will do before the operator triggers it
- surfaced rewrite targets, deterministic verification rerun behavior, provider live validation default behavior, and snapshot non-mutation in the same release panel, which turns regenerate from a vague button into a concrete operator action
- kept the contract local-first and read-only by default: the preview is part of status payload, while the actual regenerate path still goes through the explicit current surface 재생성 action
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T23:50:00.000Z","id":"doclog_20260415235000_f91b88","type":"devlog","updatedAt":"2026-04-15T23:50:00.000Z"} -->
## 2026-04-15 Release Reload vs Regenerate Split

- date: 2026-04-15T23:50:00.000Z
- split the release tab action semantics so `상태 다시 읽기` now performs a read-only `/api/execution-v1/status` reload, while `current surface 재생성` remains the explicit path that mutates evidence/closeout artifacts
- kept provider-specific live validation on its own buttons, which makes it clear that there are now three distinct operator actions in the same surface: inspect state, rebuild current artifacts, or rerun a provider-backed release check
- updated release copy to explain the distinction directly inside the UI, reducing the chance that an operator unintentionally regenerates evidence when they only meant to re-read status
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T23:35:00.000Z","id":"doclog_20260415233500_1d4f82","type":"devlog","updatedAt":"2026-04-15T23:35:00.000Z"} -->
## 2026-04-15 Provider Preflight Action Surface

- date: 2026-04-15T23:35:00.000Z
- added a dedicated `/api/execution-v1/preflight` route so the operator console can run provider-specific deterministic readiness checks without leaving the release tab
- extended each provider card with `preflight 실행` and a persisted preflight status badge, which separates `ready-but-missing-env` from actual `blocked` smoke failures instead of making the operator infer that state from env badges alone
- kept the live action disabled until env is present, but made preflight always callable, which is the right operational split for optional provider expansion work
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T23:20:00.000Z","id":"doclog_20260415232000_37a92b","type":"devlog","updatedAt":"2026-04-15T23:20:00.000Z"} -->
## 2026-04-15 Release Snapshot Action Surface

- date: 2026-04-15T23:20:00.000Z
- added an explicit `/api/execution-v1/snapshot` path and a matching `release snapshot 고정` operator action so release snapshotting is no longer a terminal-only step once current evidence is fresh
- gated snapshot creation on the same `summary.ready` contract used by current-surface closeout, which prevents operators from freezing stale evidence into a misleading handoff artifact
- surfaced snapshot eligibility copy in the `v1 마감 상태` tab so the UI explains whether snapshotting is allowed right now or blocked because the current surface still needs refresh
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T23:05:00.000Z","id":"doclog_20260415230500_8cb221","type":"devlog","updatedAt":"2026-04-15T23:05:00.000Z"} -->
## 2026-04-15 Verified Baseline Release Surface

- date: 2026-04-15T23:05:00.000Z
- split execution-v1 release status into two explicit layers: `current surface ready` still means the mutable evidence/closeout markdown matches the current HEAD, while `verified baseline ready` means the last archived snapshot already closed all required OpenAI gates
- extended `/api/execution-v1/status` with baseline summary fields derived from the immutable snapshot so operators can see whether they are blocked by real closeout gaps or only by stale current-surface markdown
- updated the `v1 마감 상태` tab to render `baseline ready · current surface refresh needed` instead of treating every stale current surface as a full release failure, which keeps the OpenAI-passed baseline visible even after follow-up code changes move HEAD forward
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T22:25:00.000Z","id":"doclog_20260415222500_5c2d72","type":"devlog","updatedAt":"2026-04-15T22:25:00.000Z"} -->
## 2026-04-15 Live Closeout Evidence Reuse

- date: 2026-04-15T22:25:00.000Z
- found a release orchestration bug where `run-execution-v1-live` executed a successful live evidence pass first, then invoked `build-execution-v1-closeout` in a way that re-ran evidence and could overwrite the just-passed result with a second failing live run
- added `--reuse-existing-evidence` / `--evidence-path` support to the closeout builder so closeout generation can read the already-produced evidence markdown instead of implicitly spawning a second provider validation
- updated the live helper to pass the freshly written evidence path into closeout generation, which keeps `live:execution-v1:*` aligned with the operator expectation that one rerun should produce one coherent evidence/closeout pair
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T22:10:00.000Z","id":"doclog_20260415221000_2f2f7c","type":"devlog","updatedAt":"2026-04-15T22:10:00.000Z"} -->
## 2026-04-15 Provider Manifest Placeholder Command Guard

- date: 2026-04-15T22:10:00.000Z
- latest OpenAI live rerun failed because the provider manifest still included literal placeholder test commands such as `TBD_AFTER_INSPECTION (e.g., npm run smoke:openai:live ...)` and `<runner> <live-validate-entrypoint> --provider stub ...`, and the execution engine treated those strings as runnable shell commands
- hardened provider manifest normalization to drop placeholder commands containing `TBD_*`, `after inspection`, `e.g.`, `or equivalent`, or angle-bracket placeholder tokens like `<runner>` / `<model>` before step execution, which prevents foreground sessions from failing on obviously non-runnable planning text
- extended `smoke:execution-flow` so provider-style manifests with placeholder test commands now prove two things together: the placeholder is removed, and the bounded `node --check src/cli.mjs` verification fallback is still appended to preserve `verification.status=passed/failed`
- latest rerun still failed one layer earlier because the provider emitted a suspicious inspect command `ls -ლა` plus an edit placeholder `scripts/openai_live_validation.{ext}` / `PLACEHOLDER: ...`, and those values were still making it into the execution session
- hardened execution manifest normalization again so suspicious non-ASCII shell tokens, placeholder file paths with `{}` / `<>`, and `PLACEHOLDER:` edit content are all dropped before execution
- expanded `smoke:execution-flow` to lock this exact regression down: provider-style manifests with unicode-confusable shell flags or placeholder edit steps must normalize down to runnable inspect/artifact steps plus the bounded `node --check src/cli.mjs` verification fallback
- after OpenAI live validation finally passed, the next UX gap was release-state semantics rather than execution logic: evidence/closeout markdowns are intentionally regenerated in the working tree, so the UI must not mark that state as stale when the recorded commit still matches HEAD
- updated execution v1 status building/rendering so `dirty docs + matching commit` becomes `로컬 갱신됨(local-current)` instead of `갱신 필요`, which keeps the operator console honest about “latest local evidence” versus true stale/mismatched evidence
- added `snapshot:execution-v1` so the successful local evidence/closeout pair can be archived under `docs/releases/execution-v1/<verified-commit>/` as an immutable, commit-friendly release artifact
- snapshot flow keeps `docs/execution-v1-*.md` as the mutable current surface while giving release/handoff work a stable artifact that does not become stale just because HEAD moves after the evidence was generated
- wired release snapshot metadata into `/api/execution-v1/status` and the `v1 마감 상태` tab, so operators can see the last archived verified artifact even when the current surface is stale or only locally refreshed
- split optional provider expansion (Anthropic/local) from required closeout readiness in the release summary, so OpenAI-passed execution v1 no longer looks incomplete just because optional providers are still `missing-env`
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T21:55:00.000Z","id":"doclog_20260415215500_a1c5bd","type":"devlog","updatedAt":"2026-04-15T21:55:00.000Z"} -->
## 2026-04-15 Fallback Hint Command Filtering

- date: 2026-04-15T21:55:00.000Z
- root cause for the latest OpenAI live rerun was not reviewer wording but fallback manifest execution: proposal-derived hints such as `npm run smoke:openai` and `python -m tests.smoke_openai` were accepted even though those entrypoints do not exist in this repo
- hardened fallback manifest generation to keep only runnable hints: `npm/pnpm/yarn run` now requires an actual package script, `node ...` requires an existing file, and `python -m ...` requires a resolvable module path under the workspace
- extended `smoke:execution-flow` so invalid hinted commands are explicitly filtered out while `git status --short` and the bounded `node --check src/cli.mjs` verification step remain, keeping the deterministic execution path aligned with the live rerun expectations
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T21:35:00.000Z","id":"doclog_20260415213500_4f8b11","type":"devlog","updatedAt":"2026-04-15T21:35:00.000Z"} -->
## 2026-04-15 Release Evidence Freshness Surface

- date: 2026-04-15T21:35:00.000Z
- extended `execution-v1/status` so the UI now compares evidence/closeout commit metadata against the current HEAD and also reports whether either markdown file is still modified in the working tree
- updated the `v1 마감 상태` tab to surface `evidence 상태`, stale reasons, current branch/commit, and dirty doc markers so operators can distinguish “code is still blocked” from “the release documents are simply stale”
- tightened the release-ready calculation to require both a closed checklist and fresh evidence, which avoids falsely presenting a ready closeout while older failure markdown is still sitting in the workspace
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T21:10:00.000Z","id":"doclog_20260415211000_7d3a4e","type":"devlog","updatedAt":"2026-04-15T21:10:00.000Z"} -->
## 2026-04-15 Execution Manifest Verification Fallback

- date: 2026-04-15T21:10:00.000Z
- hardened execution manifest normalization so provider-supplied engineering manifests can no longer finish with `verification.status=not-run` just because they only contained `inspect` and `artifact` steps
- upgraded command-kind inference to treat `test/check/verify/smoke/lint/typecheck` as `test` and `build/compile` as `build`, then append a bounded `node --check src/cli.mjs` fallback when no verification step exists at all
- extended `smoke:execution-flow` with a provider-like manifest assertion so the `verification fallback` contract stays covered by the same deterministic readiness path used before OpenAI live reruns
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T20:50:00.000Z","id":"doclog_20260415205000_5fb632","type":"devlog","updatedAt":"2026-04-15T20:50:00.000Z"} -->
## 2026-04-15 Live Validation Preflight Helper

- date: 2026-04-15T20:50:00.000Z
- added provider-specific `preflight:execution-v1:*` entrypoints so operators can run the deterministic readiness checks before consuming a live provider call
- OpenAI preflight now bundles `smoke:openai-provider` and `smoke:execution-flow`, then reports `ready-for-live-validation` vs `ready-but-missing-env` in one JSON payload instead of forcing users to remember which smoke scripts matter
- documented the intended operator order as `preflight -> live rerun -> evidence/closeout`, which reduces back-and-forth when the remaining gap is credential injection rather than code uncertainty
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T20:35:00.000Z","id":"doclog_20260415203500_34d1af","type":"devlog","updatedAt":"2026-04-15T20:35:00.000Z"} -->
## 2026-04-15 Engineering Review Contract Hardening

- date: 2026-04-15T20:35:00.000Z
- extended executor normalization for engineering missions so reviewer-facing markdown no longer depends on provider wording for the full contract: missing `Diagnosis`, `Implementation Plan`, `Verification Plan`, or `Risk Notes` sections are now backfilled from mission context and execution manifest
- tightened `Verification Plan` canonicalization to guarantee an explicit smoke/test path when the provider draft omits it, which aligns the executor artifact with the reviewer rule instead of trusting the raw provider output
- expanded the deterministic OpenAI provider smoke to cover the partial-draft path, proving that a minimal provider response is upgraded into a reviewer-safe implementation proposal before live validation reruns
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T20:05:00.000Z","id":"doclog_20260415200500_b5238d","type":"devlog","updatedAt":"2026-04-15T20:05:00.000Z"} -->
## 2026-04-15 Live Validation Triage Structuring

- date: 2026-04-15T20:05:00.000Z
- added a shared parser for `provider live mission run failed | key=value` failure strings so the helper, evidence markdown, and closeout markdown now surface the same structured triage fields instead of leaving operators to manually re-split a long pipe-delimited message
- updated the live helper failure JSON to emit `failure` plus `liveFailureDetails`, which makes the rerun path easier to automate or inspect without opening the markdown artifacts first
- expanded the closeout document with a dedicated `Live Failure Triage` section so failed provider validation now points directly at `rootDir`, `missionId`, `sessionId`, `artifact`, and `reviewerSummary` when that data exists
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T20:20:00.000Z","id":"doclog_20260415202000_91c4aa","type":"devlog","updatedAt":"2026-04-15T20:20:00.000Z"} -->
## 2026-04-15 Live Validation Artifact Triage Extraction

- date: 2026-04-15T20:20:00.000Z
- extended live validation triage so helper and release docs no longer stop at the pipe-delimited failure reason; when the temp root still exists they now read the reviewer report and implementation proposal directly
- surfaced `reviewerReportPath`, `implementationProposalPath`, `failedChecks`, `findings`, and `nextActionSnippet` in the helper/evidence/closeout path, which turns a failed rerun into an immediately inspectable artifact trail instead of a manual file hunt
- added a dedicated smoke for the parser plus artifact extraction contract so this triage path stays deterministic even without live provider credentials
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T19:35:00.000Z","id":"doclog_20260415193500_8fbc42","type":"devlog","updatedAt":"2026-04-15T19:35:00.000Z"} -->
## 2026-04-15 Engineering Approval Gate Canonicalization

- date: 2026-04-15T19:35:00.000Z
- after OpenAI live validation advanced past timeout, the remaining failure moved to reviewer mismatch because the executor draft omitted the explicit approval gate sentence that the engineering rubric requires
- aligned the executor normalization path with the reviewer rubric by canonicalizing `Next Action` for engineering missions that require `workspace_execution` approval, so provider wording drift no longer creates a false fail when the rest of the proposal is valid
- extended the deterministic OpenAI smoke to cover this canonicalization path, asserting that a draft with a vague next action is rewritten to include the required approval-before-execution instruction
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T19:15:00.000Z","id":"doclog_20260415191500_4dd87e","type":"devlog","updatedAt":"2026-04-15T19:15:00.000Z"} -->
## 2026-04-15 OpenAI Live Helper Timeout Default

- date: 2026-04-15T19:15:00.000Z
- changed `run-execution-v1-live.mjs` so the OpenAI path now injects `OPENAI_RUN_TIMEOUT_MS=60000` into its child verification env by default, which removes one manual recovery step from the operator rerun flow
- kept the behavior override-safe: if the operator already exported a timeout value, the helper preserves the explicit env instead of forcing the default
- fixed the machine-readable `missing-env` hint so it now prints a shell-valid `export OPENAI_RUN_TIMEOUT_MS=60000 OPENAI_API_KEY=\"...\"` command rather than a broken prefix string
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T19:00:00.000Z","id":"doclog_20260415190000_b6d1af","type":"devlog","updatedAt":"2026-04-15T19:00:00.000Z"} -->
## 2026-04-15 OpenAI Timeout Envelope Hardening

- date: 2026-04-15T19:00:00.000Z
- raised the default OpenAI provider `runTimeoutMs` from 20 seconds to 45 seconds after inspecting a real live-validation failure where manager completed but planner hit the old timeout ceiling twice
- added `OPENAI_RUN_TIMEOUT_MS` and `OPENAI_PROBE_TIMEOUT_MS` env overrides so operator reruns can widen or narrow the provider timeout envelope without another code change
- extended the deterministic OpenAI smoke to assert that the env timeout override actually produces a bounded timeout failure path, so the new escape hatch is covered even when no live API key is available
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T18:25:00.000Z","id":"doclog_20260415182500_a4c91e","type":"devlog","updatedAt":"2026-04-15T18:25:00.000Z"} -->
## 2026-04-15 Live Validation Failure Triage Surface

- date: 2026-04-15T18:25:00.000Z
- changed live validation failure output to carry `rootDir`, `workspaceId`, `missionId`, and `sessionId`, so a failed provider-backed run is immediately inspectable without guessing where the temporary state was written
- updated `run-execution-v1-live.mjs` to treat `failed` as a real failure instead of printing a misleading completed status, and to return evidence/checklist paths plus mission/session context when triage is needed
- documented the new behavior in the README so the final operator path is now deterministic: missing env, failed provider run, and passed live validation all terminate with clearly different machine-readable outputs
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T18:10:00.000Z","id":"doclog_20260415181000_7a1dc2","type":"devlog","updatedAt":"2026-04-15T18:10:00.000Z"} -->
## 2026-04-15 Live Validation Helper Entry Points

- date: 2026-04-15T18:10:00.000Z
- added provider-specific `npm run live:execution-v1:*` entrypoints so the final v1 closeout path is no longer “remember two evidence/closeout commands plus a provider flag”; operators can now inject the credential and run one command per provider
- introduced `run-execution-v1-live.mjs` to enforce env presence before execution, print a structured missing-env hint when credentials are absent, and then run evidence plus closeout sequentially when credentials exist
- documented the helper in the README so the remaining execution-v1 gap is an operator action problem, not a script memorization problem
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T17:00:00.000Z","id":"doclog_20260415170000_5d31c8","type":"devlog","updatedAt":"2026-04-15T17:00:00.000Z"} -->
## 2026-04-15 Live Validation Failure Capture

- date: 2026-04-15T17:00:00.000Z
- changed `verify-execution-v1` so optional live validation can be captured as a structured failed result instead of aborting evidence generation, which makes `evidence:execution-v1` usable even when provider-backed runs fail after credential injection
- enriched live failure output with mission status, latest session id, reviewer summary, and artifact file so operator triage can start from the evidence markdown instead of rerunning the whole flow blindly
- updated closeout parsing to read `provider: failed (...)` records, so release status now distinguishes missing-env, skipped, and actual provider-backed execution failure
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T16:10:00.000Z","id":"doclog_20260415161000_f3d702","type":"devlog","updatedAt":"2026-04-15T16:10:00.000Z"} -->
## 2026-04-15 Live Validation Readiness Surface

- date: 2026-04-15T16:10:00.000Z
- surfaced provider readiness directly inside the `v1 마감 상태` tab so the remaining execution-v1 gap is no longer just a markdown note; operators can now see per-provider env readiness, expected command, and whether live validation can be fired immediately
- extended the execution-v1 status payload with `providerReadiness` instead of forcing the UI to infer env state from closeout prose, which keeps server and operator surface aligned on the same release contract
- added direct live validation action buttons for ready providers so the final closeout path is one click from the release surface when credentials exist
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T15:20:00.000Z","id":"doclog_20260415152000_a1f3b9","type":"devlog","updatedAt":"2026-04-15T15:20:00.000Z"} -->
## 2026-04-15 Browser E2E Closeout Alignment

- date: 2026-04-15T15:20:00.000Z
- closed the remaining browser interaction gap by promoting `smoke:ui-execution-browser-e2e` into the deterministic execution-v1 verification set, so closeout is no longer split between contract smoke and an external manual browser note
- updated the evidence and closeout generators plus README wording so release artifacts now describe `deterministic smoke 4종 + browser readiness + optional live validation` instead of carrying the older `browser E2E gap` language
- kept the change generator-first, then regenerated the tracked closeout documents, so release evidence stays reproducible instead of drifting through hand-edited markdown
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T00:00:00.000Z","id":"doclog_20260415170000_2a89d4","type":"devlog","updatedAt":"2026-04-15T00:00:00.000Z"} -->
## 2026-04-15 Execution v1 Closeout Surface

- date: 2026-04-15T00:00:00.000Z
- added `closeout:execution-v1` to generate a repo-tracked closeout checklist that sits one layer above raw evidence, turning deterministic smoke, optional live validation, and known browser E2E gaps into an operator-readable release status document
- kept the closeout script dependent on the existing evidence generator so branch, commit, smoke summary, and gap wording stay consistent instead of splitting into two parallel truth sources
- documented the closeout path in the README so execution-v1 can now be closed with `verify -> evidence -> closeout` instead of relying on terminal output and ad-hoc memory
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T12:30:00.000Z","id":"doclog_20260415123000_c3c5a1","type":"devlog","updatedAt":"2026-04-15T12:30:00.000Z"} -->
## 2026-04-15 Execution V1 Release Surface Pass

- date: 2026-04-15T12:30:00.000Z
- added a dedicated `v1 마감 상태` detail tab that surfaces execution v1 deterministic smoke, open closeout checklist items, live validation gaps, and the generated evidence/closeout markdown without leaving the operator console
- wired UI bootstrap to load release status alongside workspaces, missions, approvals, and providers so the closeout signal is immediately visible and can also feed output-stage closeout guidance
- kept the refresh path repo-local by reusing the existing closeout/evidence scripts from the server instead of inventing a second release-summary source, which preserves a single source of truth for v1 readiness
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T00:00:00.000Z","id":"doclog_20260415164500_0c5f7c","type":"devlog","updatedAt":"2026-04-15T00:00:00.000Z"} -->
## 2026-04-15 Execution v1 Evidence Artifact

- date: 2026-04-15T00:00:00.000Z
- added `evidence:execution-v1` so the deterministic execution verification summary is written into a repo-tracked Markdown artifact instead of only appearing in terminal JSON output
- the generated evidence file records branch, commit, deterministic smoke results, optional live validation results, and the remaining known gaps, which makes execution-v1 closeout reproducible for reviewers without re-reading devlog history
- kept the implementation layered on top of `verify:execution-v1`, so the evidence script reuses the same verification entry point rather than drifting into a second smoke contract
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T00:00:00.000Z","id":"doclog_20260415161000_284b52","type":"devlog","updatedAt":"2026-04-15T00:00:00.000Z"} -->
## 2026-04-15 Execution v1 Verification Entry Point

- date: 2026-04-15T00:00:00.000Z
- added `verify:execution-v1` as a single verification entry point that runs the deterministic execution smokes together instead of requiring operators to remember the execution-flow, execution-cli, and UI contract scripts separately
- added optional `--live-openai`, `--live-anthropic`, and `--live-local` flags so the same verification script can extend into provider-backed end-to-end execution evidence when credentials and adapters are available, while still skipping cleanly when env is missing
- documented the verification entry point in the README as the execution-v1 closeout path, including the distinction between deterministic local smoke and optional live provider validation
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T00:00:00.000Z","id":"doclog_20260415153000_f40d18","type":"devlog","updatedAt":"2026-04-15T00:00:00.000Z"} -->
## 2026-04-15 Execution CLI Contract Pass

- date: 2026-04-15T00:00:00.000Z
- added `mission execution preflight/start/stop/status/logs` commands so the one-time execution lease flow and foreground execution session lifecycle can be driven through the CLI as well as the operator console API
- added `smoke:execution-cli` to prove the end-to-end CLI path: reviewer-passed engineering mission, execution lease approval, foreground execution start, status polling, and log retrieval
- documented the execution command group in the README next to mission run examples so repo-local execution support and proposal-only fallback are visible without reading service code
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260414182000_5b3d11","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 Playwright Session Artifact Hygiene

- date: 2026-04-14T00:00:00.000Z
- ignored `.playwright-cli/` at the repo root so manual Playwright CLI snapshots and browser-session metadata stop polluting git status during UI verification work
- documented the ignore rule in the README next to the harness smoke guidance, making it explicit that browser verification artifacts are local operator state rather than source-of-record files
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260414131000_1f7a42","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 Harness Browse UI Contract Smoke

- date: 2026-04-14T00:00:00.000Z
- added a dedicated `smoke:ui-harness-browse` path that seeds a temporary workspace and mission, populates source-of-record and layered memory data, then validates the served harness surface through UI asset checks and browse API assertions
- validated the harness operator contract instead of only static payload shape: the smoke now checks document and memory filter, search, pagination, and reset semantics through the same mission-scoped endpoints the UI consumes
- in the same pass, embedded an inline SVG favicon so the served UI no longer requests `/favicon.ico`, removing unnecessary browser-console noise from future manual UI verification
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260414122500_93dc55","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 Harness Browse Context Chips

- date: 2026-04-14T00:00:00.000Z
- surfaced current harness browse conditions as compact chips so operators can see active search, scope/type filter, sort order, and page size without re-reading the summary sentence
- changed previous/next paging controls to use the active page size instead of hardcoded `12건`, which keeps the browse chrome consistent after the new page-size selector is changed
- disabled `필터 초기화` until the browse state actually deviates from default, reducing visual noise in the source-of-record and memory panels
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260414120500_4a5c3b","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 Harness Browse State Preservation

- date: 2026-04-14T00:00:00.000Z
- changed harness CRUD refresh flows so document and memory mutations reload the selected mission while preserving the current harness search, filter, sort, page size, and page position instead of resetting the entire browse surface
- added `페이지 크기` selectors and `필터 초기화` controls to both source-of-record and layered memory browsing, which makes the harness panel usable as an operator workbench instead of a fixed 12-row viewer
- kept the implementation within the existing local UI loop: no backend contract change was needed beyond the paging metadata added earlier, only mission refresh orchestration and browse-state helpers in app.js
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260414115000_1bb30f","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 Harness Browse Meta Contract

- date: 2026-04-14T00:00:00.000Z
- extended the harness browse summary contract so documents and memory now expose `hasPrev`, `hasNext`, `pageStart`, and `pageEnd` in addition to offset and page counts
- moved the UI away from interpreting raw offset math directly, which makes the browse layer easier to reason about and keeps the paging controls aligned with server-clamped offsets after filter or sort changes
- updated the harness panel copy to show `현재 범위 / 전체 검색 결과` semantics instead of only visible count, which gives operators a clearer sense of where they are inside long devlog and memory timelines
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260414114000_a8f241","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 Harness Offset Paging

- date: 2026-04-14T00:00:00.000Z
- replaced the old `limit only` harness browse flow with mission-scoped offset paging so document and memory exploration now move across fixed browse windows instead of inflating the payload on every `더 보기`
- added `offset` handling to both harness browse APIs and surfaced page/remaining counts in the UI, which makes larger tracked logs easier to scan without losing the single-screen operator flow
- changed the frontend from cumulative `더 보기` state to explicit `이전 12건 / 다음 12건` navigation, resetting browse position whenever search, filter, or sort changes to keep result interpretation predictable
- kept the implementation dependency-free and incremental: no new data store or pagination package was introduced, only service-level paging math, lightweight query routing, and browse-state wiring in the existing local UI
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260414110500_3c7b91","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 Harness Browse API Split

- date: 2026-04-14T00:00:00.000Z
- split harness document and memory browse into dedicated mission-scoped APIs so `showMission` no longer needs to ship the full tracked log and memory corpus on every selection
- moved document search/filter/sort/더 보기 onto `/harness/documents` and memory search/filter/sort/더 보기 onto `/harness/memory`, with the frontend now reloading those result sets instead of slicing large arrays locally
- reduced the default mission detail payload back to recent harness samples while preserving counts and summaries, which keeps the single-screen console flow intact but lowers payload growth pressure as tracked records accumulate
- kept the implementation dependency-free and incremental: no indexing package or pagination library was introduced, only service-level browse helpers and lightweight query routing in the existing local UI server
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260414101500_64c90e","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 Harness Browse Pagination and Sort

- date: 2026-04-14T00:00:00.000Z
- added sort controls and staged `더 보기` browsing for both source-of-record documents and layered memory entries so the harness tab no longer dumps the full filtered list at once
- kept the interaction local to the existing mission detail payload: search/filter still operate client-side, while sort mode and visible-count state now let operators scan large logs without losing the single-screen console flow
- aligned document and memory browse patterns so both surfaces now share the same `search → filter → sort → show more` mental model instead of diverging between recent-only memory and full document history
- kept the implementation dependency-free and render-local, which avoids introducing pagination endpoints before actual record volume or latency makes server-side indexing necessary
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260414100500_6b5f8e","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 Harness Memory Search and Filter

- date: 2026-04-14T00:00:00.000Z
- expanded the harness memory payload from recent snippets into full mission/workspace entry lists so the UI can curate layered memory instead of only sampling it
- added memory search plus `scope` and `kind` filters in the harness tab, letting operators narrow fact/decision/preference entries across mission and workspace memory from one surface
- reused the existing memory edit/delete flow and only widened the read model, so memory curation stays dependency-free and keeps the same CRUD contract already used by the add/edit forms
- kept recent-entry summaries intact for quick overview while moving the detailed memory browse experience to filterable client-side exploration inside the same harness panel
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260414094500_0f3a21","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 Harness Document Search and Filter

- date: 2026-04-14T00:00:00.000Z
- expanded the harness document registry from a recent-entry snapshot into a full tracked-entry surface so the UI can browse all source-of-record logs instead of only the latest six items
- added search and type filter controls for tracked document entries, letting operators narrow source logs by title, body, path, and `reference/devlog/incident` type from the same harness panel
- kept the backend contract minimal by extending mission harness payloads with `entries` and `trackedEntryCount` while preserving the existing `recentEntries` slice for lightweight summaries
- kept the implementation dependency-free and UI-local: no new package or search index was introduced, only client-side filtering on the tracked harness payload already available in mission detail
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260413210753_c24400","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 Harness Lens Integration

- date: 2026-04-14T00:00:00.000Z
- researched current harness patterns around Markdown-first document normalization, session-first agent runtime loops, and layered memory recall, then mapped only the directly usable pieces into the existing runtime instead of bolting on a parallel framework
- extended mission detail payloads with a dedicated `harness` summary that exposes source-of-record docs, recent mission/workspace memory, review and maintenance pressure, provider health drift, and lightweight operator recommendations
- added a new `하네스` tab to the lower workbench so operators can inspect document anchors, memory buildup, and operational loops from the same mission screen without leaving the guided workflow
- kept the implementation dependency-free: no new document conversion package was added yet, but the UI now makes the Markdown source-of-record rule explicit so later ingestion work can plug into an already visible harness surface
- pulled the top harness recommendation into the command header and setup stage so operators can jump straight to the blocking review/run/harness surface instead of hunting through the detail tabs first
- added a mission-scoped memory authoring form inside the harness tab so operators can persist fact / decision / preference context without leaving the console
- expanded layered memory authoring to workspace scope as well, so long-lived operating rules can be captured without overloading mission-scoped recall
- added a source-of-record document logging form inside the harness tab so Markdown working notes can be pushed into docs/reference, devlog, or incidents from the same mission surface
- added browser-side file intake for Markdown/txt/json notes so external working drafts can prefill the source-of-record form without introducing a new conversion dependency
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_3c9bf3","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Visual Density Polish

- date: 2026-04-09T00:00:00.000Z
- tightened the console from a soft card-heavy dashboard into a calmer operator workspace with lower shadow depth, denser spacing, and fewer competing emphasis treatments
- compressed the top status bar, step strip, and content surfaces so more of the actual working state fits into the first viewport without dropping the guided flow
- reduced visual noise across chips, cards, and buttons by lowering border weight, lightening surface contrast, and keeping cobalt as the single dominant action color
- pushed the UI closer to a restrained product control-plane feel rather than a marketing-style hero composition, while keeping the same single-screen operator structure intact
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_ede869","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Reference Playbook Integration

- date: 2026-04-09T00:00:00.000Z
- folded patterns from public agent repos into the operator surface as explicit playbooks instead of leaving them as undocumented inspiration
- added four setup-stage playbooks derived from staged pipeline, research-first, review-readiness, and verify-before-close operating models so users can start from a workflow intent instead of only a blank mission form
- added a review-readiness grid inspired by review dashboards and gate-driven agent workflows, making approval readiness visible as discrete `ready` or `blocked` signals before the user resolves actions or signs off
- kept these borrowings inside the existing mission form and review surfaces, so the UI gains stronger operator guidance without adding a new backend abstraction or extra navigation depth
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_dbd69b","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Sequential One-Screen Flow Pass

- date: 2026-04-09T00:00:00.000Z
- reworked the console again around an actual left-to-right operator sequence instead of a generic information surface, so users now move through `Setup → Run → Review → Output` inside one viewport
- moved the guided flow from a tall side stack into a compact top strip over the main workspace, which frees horizontal space for the active step content while keeping the full sequence always visible
- added a persistent `Recommended Next` state card plus done or ready step states, so the UI tells the operator what to do next instead of expecting them to infer the flow from raw panels
- changed mission selection to land on the currently recommended step rather than always forcing the run stage, which better matches completed missions, approval-pending missions, and output-ready missions
- tightened shell padding, heading scale, and panel density so the console reads more like a task-oriented product control plane and less like a document layout
- kept the dependency-free local server and existing mission APIs unchanged while shifting the frontend toward a more explicit operator journey
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_3faae7","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Single-Page Console Navigation

- date: 2026-04-09T00:00:00.000Z
- removed the old tabbed mission-detail model and rebuilt the workspace as one continuous operator surface, so objective, queue, artifact, timeline, and session history can be scanned without mode switching
- added a sidebar workspace menu plus a sticky in-workspace section ribbon, both wired to the same section targets and scroll-synced so operators can jump by function and still keep orientation while reading down the page
- regrouped the main surface by operator intent instead of data type: `Mission Snapshot`, `Action & Approval`, `Artifact Viewer`, `Timeline`, and `Sessions` now read as explicit product sections
- moved approval handling into the same action section as mission follow-up work, so reruns, reviewer follow-up resolution, and human approvals live in one operational queue instead of being split across the page
- cleaned up the UI language from tab-oriented terminology to section-oriented navigation, matching the new single-page information architecture and reducing operator confusion
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_660a7d","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Guided Operator Flow Redesign

- date: 2026-04-09T00:00:00.000Z
- replaced the section-stack console with a single-viewport guided operator flow, so the primary UI now reads as `Setup → Run → Review → Output` instead of a long document surface
- removed the oversized hero treatment and rebuilt the shell around a compact top status bar, a left mission rail, a center step canvas, and a persistent right inspector, improving scan speed and reducing dead space
- moved mission creation into the first guided step and made rerun, approval handling, and artifact reading successive stages in the same viewport, so operators can progress to a final output through explicit step choices
- kept timeline, session selection, and provider state visible within the same screen through internal panel scrolling rather than page-length stacking, preserving one-screen operability while retaining detail depth
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_4d94ba","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Console IA Refresh

- date: 2026-04-09T00:00:00.000Z
- rebuilt the operator console information architecture around a three-column product layout: dark navigation rail, mission workspace, and inspector, so the UI reads like an operations tool instead of a flat card stack
- replaced the previous control-plane styling with a lighter and more legible product surface, stronger typography hierarchy, calmer chrome, and one accent system so mission state, action pressure, and artifacts are easier to scan
- reworked mission detail rendering to foreground objective, constraints, latest session, approval counts, and reviewer signal before deeper history, reducing the amount of operator inference needed to understand the current mission state
- fixed UI flow issues while redesigning: workspace selection now scopes mission browsing and mission creation, selecting a mission returns to overview by default, and automatic artifact loading no longer steals focus from the current tab
- kept the dependency-free local server model and existing mission APIs intact while upgrading the frontend shell, so the console redesign does not increase production runtime complexity
- layered in inspiration from current public agent products by making prompt entry, trust checkpoints, and step observability explicit in the UI: hero signals, dispatch trust points, and a visible manager→planner→executor→reviewer lane now frame the mission surface
- kept the create panel open by default and upgraded empty states into action-oriented cards, so first-run users see what to do next instead of landing on dead surfaces
- added staged surface motion and active-step emphasis, so the console feels more product-like without introducing a frontend dependency stack
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_df3ce3","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Operator Console v0

- date: 2026-04-09T00:00:00.000Z
- added a local operator console served by a dependency-free Node HTTP server so missions no longer require terminal-only navigation for basic orchestration
- exposed JSON API routes for mission list/detail, session detail, mission creation, mission run, approval inbox, approval resolution, provider catalog, and artifact preview by reusing the existing `mission-service` and `store` surfaces instead of creating a parallel backend
- added a Korean-language frontend focused on operator visibility, with mission queue browsing, latest session status, approval action buttons, provider-aware reruns, and markdown artifact viewing in one console
- expanded the console with mission templates, mission-scoped action inbox, and mission timeline rendering so operators can create common planning missions faster and inspect follow-up pressure and execution chronology without returning to the CLI
- added direct operator actions in the console so mission-scoped reviewer follow-ups can be resolved from UI and retry-ready actions can trigger the recommended mission rerun without reconstructing commands in the terminal
- made timeline items session-aware so clicking a timeline event can jump the operator directly into the related session detail and artifact context
- documented the new `npm run ui` workflow and kept the implementation local-first with no new production dependencies
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_c87e70","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Default Provider Policy

- date: 2026-04-09T00:00:00.000Z
- changed `mission run` default provider resolution to prefer OpenAI when `OPENAI_API_KEY` is configured, while keeping `stub` as the automatic fallback for offline bootstrap and smoke testing
- aligned provider summary surfaces so the reported default provider now reflects the same runtime policy used by `mission run`
- documented Anthropic as an explicit comparison or fallback path instead of the operational default, matching the current stability findings from the PRD mission comparison
- corrected Anthropic runtime timeout to 45 seconds and kept OpenAI at 20 seconds, so provider-specific runtime limits match the current reliability envelope
- hardened Anthropic execution with JSON-like salvage, planner or executor fallback artifact generation, and reviewer prompt serialization fixes so provider comparison now reflects model behavior rather than obvious runtime wiring defects
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_f58768","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Local Bootstrap Command

- date: 2026-04-09T00:00:00.000Z
- added `scripts/bootstrap-local.mjs` and `npm run bootstrap:local` so first-run testing can create a workspace, create a starter mission, and execute the stub provider in one command
- made the bootstrap command return workspace, mission, and optional run payload as JSON so local inspection is immediate without digging into state files
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-07T00:00:00.000Z","id":"doclog_20260413210753_34c957","type":"devlog","updatedAt":"2026-04-07T00:00:00.000Z"} -->
## 2026-04-07 Specialist Follow-Up Remediation

- date: 2026-04-07T00:00:00.000Z
- added `action remediate-specialist-follow-up` so blocked or failed specialist branches can be resumed from the operator surface instead of requiring a manual `mission run` reconstruction
- reused the existing `runMission` resume path and `parallelGroupId` lineage contract, so remediation reruns only unresolved specialist branches while keeping prior completed specialist outputs and later merge behavior intact
- added deterministic smoke coverage for one failed `implementation` specialist branch that is remediated through the dedicated CLI command, proving same-group resume, `resumeFromRunId` preservation, merge completion, and follow-up queue clearance
- added provider context to specialist follow-up action items so generic provider filtering and remediation routing stay aligned with the same provider-aware command contract used elsewhere
- added `action specialist-follow-ups` as a dedicated read surface with `--provider`, `--workspace`, `--mission`, `--status`, and `--overdue` filters, so unresolved specialist branches can be triaged without reopening the full generic action inbox
- extended specialist follow-up items with persisted reminder state, so `action specialist-follow-ups --needs-reminder` can expose aging blocked/failed branches without relying only on overdue state
- added `action remind-specialist-follow-ups` plus persisted reminder records and `specialist-follow-up-reminded` timeline evidence, so follow-up re-notify pressure is auditable on mission/workspace/operator surfaces
- extended `action maintenance` and maintenance summaries so due specialist follow-up reminders are swept and counted alongside escalation, owner handoff, and provider attention reminder pressure
- linked specialist reminder aggregate fields into mission, workspace, and global summaries, so reminder needs, overdue count, latest reminder timestamp, and next reminder deadline can be read from the same summary surfaces already used for specialist run and merge state
- linked the same specialist reminder aggregate fields into workspace timeline and global operator timeline summaries, so operator chronology payloads can show current follow-up reminder pressure without reopening dedicated action surfaces
- extended generic action inbox summary with specialist follow-up provider, kind, status, and reminder aggregates, so mixed queue triage can distinguish specialist pressure without dropping into the dedicated specialist follow-up command
- extended `action log-overdue` response summary and incident markdown with specialist follow-up reminder aggregate, so overdue incident trails preserve the same specialist pressure context already available in queue summaries
- extended the same overdue incident payload with provider health drift provider and reason-code aggregate, so queue triage and incident documentation keep the same provider drift summary contract
- consolidated provider metadata into a shared provider catalog inspired by OpenHarness registry layering, so registry readiness rendering and adapter runtime defaults now derive from one source of truth instead of per-file literals
- added a typed `specialistHandoff` contract for specialist branches and threaded it through manager merge prompts, persisted agent runs, and specialist follow-up queue items, inspired by agency-agents handoff template discipline
- added `orchestration-profile:<id>` specialist presets and threaded profile metadata through mission/workspace/global/operator summaries plus latest parallel group state, so profile-driven fan-out stays explicit and auditable without reconstructing branch policy from raw constraints
- enforced orchestration profile quality gates at runtime, so manager merge now stops when required specialist signals are abandoned or missing and emits `specialist-quality-gate-blocked` plus gate-backed specialist follow-up items instead of silently merging incomplete branch sets
- linked orchestration profile retry policy into specialist follow-up priority, SLA, and reminder cadence so verification-heavy triad presets now create faster operator pressure than the default branch-resume policy
- added `overview profiles` and grouped orchestration profile usage, latest mission linkage, latest parallel group state, and specialist follow-up pressure under each preset so profile-driven runtime policy can be audited without walking mission-by-mission summaries
- extended `overview profiles` with specialist follow-up retry-policy, remediation-route, kind, and latest or next reminder aggregate so preset catalog output now exposes the actual recovery policy footprint, not just usage and open backlog counts
- extended `overview profiles` again with per-profile and top-level `healthDrift` status plus reason-code aggregate so orchestration presets with blocked quality gates or active follow-up pressure can be spotted as stable, watch, or follow-up-required directly from the catalog surface
- added `overview profiles --status` and `--drift-only` filters so unstable orchestration presets can be queried directly without post-processing the full catalog payload
- added `overview profiles --workspace` so one workspace can be audited for preset usage and preset-specific follow-up pressure without reading every mission or workspace summary that references those profiles
- promoted workspace usage aggregates into `overview profiles` summary so profile catalog output directly shows per-workspace preset footprint and mission volume
- promoted workspace health-drift aggregates into `overview profiles` summary so unstable preset pressure can be traced directly to the workspace that owns it
- added root-level `workspaceHealthDrift` to `overview profiles` so workspace-layer preset instability can be read as stable, watch, or follow-up-required directly from the catalog response
- added item-level `workspaceHealthDrift` to `overview profiles` so one preset can show which workspace currently owns the unstable branch or gate pressure
- added `overview profiles --workspace-usage-trend` plus per-item `workspaceUsageTrend`, so orchestration preset queries can slice monthly workspace footprint growth or decline separately from raw mission volume trend
- added root-level `workspaceUsageTrend` to `overview profiles`, so catalog responses expose the aggregate month-over-month workspace footprint status as a quick field
- added root-level `usageTrend` to `overview profiles`, so catalog responses expose the aggregate month-over-month mission volume status as a quick field alongside workspace footprint trend
- added combined `adoptionDrift` to `overview profiles` root and items, so orchestration preset adoption can be read from one status instead of manually combining mission volume and workspace footprint trends
- added `overview profiles --adoption-drift-status` and `--adoption-drift-reason-code`, so combined adoption drift can be sliced directly from the catalog query surface
- added root-level and summary-level adoption drift aggregates with reasonCodeCounts and latestUnusedAdoptionProfile, so orchestration preset adoption pressure can be triaged without reopening item payloads
- upgraded root-level `usageTrend` and `workspaceUsageTrend` to include profileCount, statusCounts, and latest unused profile linkage so usage quick fields are symmetric with adoption drift triage
- extended `workspaceUsageTrend` again with workspace-level aggregate maps, so `overview profiles` can show which workspace IDs and how many presets are driving growing or declining workspace footprint directly from the root quick field and summary
- added `latestGrowingWorkspace` and `latestDecliningWorkspace` to root `workspaceUsageTrend`, so the profile catalog can point directly to the most recent workspace driving footprint expansion or contraction
- added `latestWorkspaceId`, `latestWorkspaceName`, `latestWorkspaceProfileId`, and `latestWorkspaceStatus` to root `workspaceUsageTrend`, so the newest workspace footprint signal identity is readable from the quick field without opening nested workspace objects
- extended item-level `workspaceUsageTrend` with per-workspace status aggregate and latest workspace linkage, so one orchestration preset can show which workspace is currently growing or shrinking its footprint without reopening mission history
- added root-level `workspaceAdoptionDrift` to `overview profiles`, so workspace mission volume drift and preset footprint drift can now be triaged as one combined adoption signal directly from the catalog response
- extended each profile item with `workspaceAdoptionDrift`, so combined workspace adoption pressure is now readable inside one preset payload without reopening root workspace aggregates
- added `overview profiles --workspace-adoption-drift-status` and `--workspace-adoption-drift-reason-code`, so per-workspace combined adoption pressure can now be sliced directly from the profile catalog query surface
- added `workspaceAdoptionDriftProfileCounts` and `workspaceAdoptionDriftStatusCounts` to `overview profiles` summary so combined workspace adoption pressure can now be triaged with the same per-workspace map contract already used by workspace usage trend and workspace health drift
- extended root and summary `workspaceAdoptionDrift` with latest growing or declining profile and workspace linkage so combined workspace adoption pressure can now be triaged with the same latest-signal affordance already used by workspace usage trend
- added `workspaceAdoptionDriftCounts`, `workspaceAdoptionDriftReasonCodeCounts`, and `workspaceAdoptionDriftWorkspaceCount` to `overview profiles` summary so combined workspace adoption pressure can now be read directly from summary-grade aggregate fields without reopening the root quick field
- extended each profile item `workspaceAdoptionDrift` with `latestGrowingWorkspace` and `latestDecliningWorkspace` so direction-specific workspace adoption linkage is now readable inside one preset payload without reopening root aggregates
- added `workspaceAdoptionDriftMissionTrendStatusCounts`, `workspaceAdoptionDriftProfileFootprintTrendStatusCounts`, and `workspaceAdoptionDriftWorkspaceIdsByStatus` to `overview profiles` summary so summary-grade workspace adoption drift now mirrors the root quick field contract more closely
- added `workspaceAdoptionDriftStatus`, `workspaceAdoptionDriftReasonCodes`, and `workspaceAdoptionDriftLatestWorkspace` to `overview profiles` summary so quick workspace adoption drift signal is now readable from summary without reopening the root field
- added `workspaceUsageTrendStatus`, `workspaceUsageTrendWorkspaceCount`, `workspaceUsageTrendLatestGrowingWorkspace`, and `workspaceUsageTrendLatestDecliningWorkspace` to `overview profiles` summary so summary-grade workspace usage trend now carries the same quick signal affordance as the root field
- added `usageTrendStatus`, `usageTrendProfileCount`, `adoptionDriftStatus`, `adoptionDriftReasonCodes`, and `adoptionDriftLatestProfile` to `overview profiles` summary so profile-level usage and adoption quick signals are now readable from summary without reopening root fields
- added `healthDriftStatus`, `healthDriftReasonCodes`, `healthDriftLatestProfile`, `workspaceHealthDriftStatus`, `workspaceHealthDriftReasonCodes`, `workspaceHealthDriftLatestWorkspace`, and `workspaceHealthDriftWorkspaceCount` to `overview profiles` summary so health quick signals are now readable from summary without reopening root drift fields
- added `workspaceHealthDriftCounts` and `workspaceHealthDriftWorkspaceIdsByStatus` to `overview profiles` summary so workspace health drift now exposes the same aggregate distribution affordance in summary as in the root quick field
- added `workspaceHealthDriftReasonCodeCounts` to `overview profiles` summary so workspace health reason distribution is now readable from summary without reopening the root field
- added `workspaceUsageTrendWorkspaceIdsByStatus` and `workspaceUsageTrendWorkspaceStatusCounts` to `overview profiles` summary so workspace footprint distribution is now readable from summary without reopening the root field
- added `workspaceAdoptionDriftLatestGrowingWorkspace` and `workspaceAdoptionDriftLatestDecliningWorkspace` to `overview profiles` summary so workspace adoption direction is now readable from summary without reopening the root field
- added `workspaceAdoptionDriftLatestGrowingProfile` and `workspaceAdoptionDriftLatestDecliningProfile` to `overview profiles` summary so workspace adoption direction is now readable from summary with the same profile linkage as the root field
- added generic `latestProfile` to root and item-level `workspaceAdoptionDrift`, and mirrored it as `workspaceAdoptionDriftLatestProfile` in summary so the newest preset behind the current workspace adoption signal is now readable without inferring it from direction-specific latest links
- added `workspaceUsageTrend.latestWorkspace` to each profile item so per-preset workspace footprint trend can point to the latest workspace signal without relying only on direction-specific latest links
- added `workspaceUsageTrendLatestGrowingProfile`, `workspaceUsageTrendLatestDecliningProfile`, and `workspaceUsageTrendLatestUnusedProfile` to `overview profiles` summary so workspace footprint direction is now readable from summary with the same profile linkage as the root field
- added `workspaceUsageTrendLatestWorkspaceProfileId` and `workspaceUsageTrendLatestWorkspaceStatus` to `overview profiles` summary so the latest workspace footprint signal can be read without reopening nested workspace objects
- added `workspaceUsageTrendLatestWorkspaceId` and `workspaceUsageTrendLatestWorkspaceName` to `overview profiles` summary so the latest workspace footprint signal can be identified directly from the summary layer without reopening nested workspace objects
- added `usageTrendLatestGrowingProfile`, `usageTrendLatestDecliningProfile`, and `usageTrendLatestUnusedProfile` to `overview profiles` summary so mission-volume direction is now readable from summary with the same profile linkage as the root field
- added `adoptionDriftLatestGrowingProfile`, `adoptionDriftLatestDecliningProfile`, and `adoptionDriftLatestUnusedProfile` to `overview profiles` summary so combined adoption direction is now readable from summary with the same profile linkage as the root field
- added `healthDriftCounts`, `usageTrendStatusCounts`, and `adoptionDriftStatusCounts` to `overview profiles` summary so root quick-field status distribution is now readable from summary with the same naming contract
- added `workspaceUsageTrendProfileCount`, `workspaceUsageTrendProfileStatusCounts`, and `workspaceUsageTrendWorkspaceProfileCounts` to `overview profiles` summary so workspace footprint quick-field semantics are now readable from summary without guessing whether each count map is profile-scoped or workspace-scoped
- added `workspaceAdoptionDriftWorkspaceProfileCounts` and `workspaceAdoptionDriftWorkspaceStatusCounts` to `overview profiles` summary so combined workspace adoption maps are now readable with explicit workspace-scoped naming instead of reinterpreting legacy field names
- added `workspaceHealthDriftWorkspaceProfileCounts` and `workspaceHealthDriftWorkspaceStatusCounts` to `overview profiles` summary so workspace health maps are now readable with explicit workspace-scoped naming instead of reinterpreting legacy field names
- added `workspaceProfileCounts` and `workspaceStatusCounts` to root `workspaceHealthDrift` so workspace-level instability detail is now readable from the quick field itself without reopening summary-only aliases
- added `latestFollowUpRequiredWorkspace` and `latestWatchWorkspace` to root `workspaceHealthDrift` and matching summary aliases so the most recent unstable workspace is now readable by health direction without reopening aggregate maps
- added `latestFollowUpRequiredProfile` and `latestWatchProfile` to root `healthDrift` and matching summary aliases so the most recent unstable preset is now readable by health direction without reinterpreting generic latest-profile linkage
- added `latestStableProfile` and `latestStableWorkspace` to health quick fields and matching summary aliases so the most recent stable preset and stable workspace now use the same direction-aware contract as unstable health states
- added `latestProfile`, `latestFollowUpRequiredProfile`, `latestWatchProfile`, and `latestStableProfile` to each profile item `healthDrift` so item payloads now match the direction-aware linkage shape of the root health quick field
- added `workspaceProfileCounts` and `workspaceStatusCounts` to each profile item `workspaceHealthDrift` so item-level workspace health maps now match the root quick field contract
- added `overview profiles --workspace-drift-only` and `--workspace-status` so workspace-level unstable presets can be queried directly instead of filtering item payloads client-side
- added `overview profiles --reason-code` and `--workspace-reason-code` so preset drift can now be sliced by blocked quality gate versus open specialist follow-up cause without post-processing the full catalog payload
- added monthly usage buckets and monthly delta to `overview profiles` summary and item payloads so orchestration preset adoption trend can be read directly from the profile catalog surface
- added `overview profiles --usage-trend` plus per-item `usageTrend` so orchestration presets can now be queried by relative monthly adoption direction instead of manually interpreting bucket deltas
- switched specialist follow-up command hints to the dedicated remediation action and added profile-aware remediation route metadata, so fast verification policies now surface a concrete operator path instead of only a generic mission run fallback
- extended `action log-overdue` contract and smoke coverage so overdue `specialist-follow-up-required` items also enter the incident trail, keeping specialist pressure aligned with other tracked overdue operator classes
- threaded specialist remediation route metadata into persisted reminder records and overdue incident markdown, so retry policy, route urgency, and fallback command survive from queue triage into reminder and incident audit trails
- extended `action remind-specialist-follow-ups` summary with provider, specialist kind, retry policy, remediation route, and status aggregate so reminder execution output mirrors the same recovery-path metadata already visible in queue and incident surfaces
- extended maintenance execution summary and persisted maintenance run payloads with specialist retry policy and remediation route aggregate so maintenance sweep output keeps the same specialist recovery-path evidence as the dedicated reminder command
- extended maintenance history and maintenance overview bucket payloads with specialist retry policy and remediation route aggregate so day-level and latest-vs-previous maintenance trend views now preserve the same specialist recovery-path evidence as the raw maintenance run record
- extended maintenance history and maintenance overview with weeklyBuckets plus latestWeeklyBucketDelta, so maintenance trend can now be read at a coarser weekly rollup without losing specialist retry-policy and remediation-route evidence
- extended maintenance history and maintenance overview with monthlyBuckets plus latestMonthlyBucketDelta, so maintenance trend can now be read at monthly resolution without losing specialist retry-policy and remediation-route evidence
- promoted maintenance monthly trend quick fields into mission, workspace, and global summaries so top-level control-plane surfaces can read current month maintenance drift without reopening dedicated maintenance history or overview payloads
- linked the same maintenance monthly quick fields into workspace timeline and global operator timeline summaries, so chronology-first operator payloads can expose current month maintenance drift without reopening the maintenance read-model
- linked the same maintenance monthly quick fields into immediate `action maintenance` summary output, so sweep execution receipts can expose current month maintenance drift without reopening the maintenance history surface
- linked the same maintenance monthly quick fields into unified `action inbox` summary when maintenance-required pressure is present, so mixed queue triage can expose current month maintenance drift without reopening the maintenance history surface
- switched `action log-overdue` to reuse the same enriched overdue inbox summary and exposed maintenance monthly quick fields in incident markdown, so incident triage keeps the same maintenance drift contract as queue summaries
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-07T00:00:00.000Z","id":"doclog_20260413210753_eb0057","type":"devlog","updatedAt":"2026-04-07T00:00:00.000Z"} -->
## 2026-04-07 Provider Cost Telemetry

- date: 2026-04-07T00:00:00.000Z
- added `overview operator-timeline --provider-since` so the operator-facing chronology can carry the same recent provider window contract already used by provider, mission, workspace, and global overview surfaces
- linked recent provider counts, touched provider ids, latest recent provider event, and recent execution bucket trend into the global operator timeline summary without changing the default event stream contract
- added `workspace timeline --provider-since` so workspace-bound chronology can carry the same recent provider window contract and recent provider summary linkage as the other provider-aware timeline or overview surfaces
- added root-level `providerHealthDrift` to mission, workspace, and operator surfaces so provider drift can be inspected symmetrically without reading only summary linkage fields
- added `provider-health-drift-required` to action inbox so resolved provider failures that still leave monthly failed-execution drift can surface as explicit mission-owner follow-up work
- added `action provider-health-drift --overdue` so residual drift follow-up items can be queried directly by overdue state instead of only through generic inbox class filtering
- extended `action log-overdue` and its smoke coverage so overdue `provider-health-drift-required` items also enter the incident trail and escalation state
- added provider filtering to `action inbox` and `action log-overdue` so provider-specific attention and drift follow-up can be sliced from generic operator queues
- added `providerCounts` to generic action inbox summary so provider-scoped drift backlog can be read without leaving the unified queue surface
- added `action remediate-provider-attention` so pending or acknowledged provider failure attention can trigger a local-first re-probe or same-provider mission rerun without manually reconstructing the remediation command
- added optional pricing env parsing for OpenAI, Anthropic, and local adapters, then normalized `estimatedCostUsd` from execution token usage without changing the existing provider contract
- propagated estimated execution cost into persisted agent runs, provider execution history or timeline, unified provider events, pending provider attention failure context, provider overview, and mission or workspace or global summaries
- added deterministic cost telemetry smoke coverage for successful execution totals plus failed non-JSON execution persistence so cost evidence stays available on both completed and failed mission paths
- extended the same cost telemetry with `estimatedCostUsdByProviderId` and `estimatedCostUsdByRole` so one provider or one stage role can be identified as the primary spend source directly from existing read-models
- extended provider execution history summary with daily cost buckets and latest bucket delta so recent spend movement can be read from `provider activity` without re-aggregating timeline rows
- added `since` filtering to provider execution history and timeline so the same daily cost bucket contract can be used for recent-window execution slices without a separate endpoint
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-07T00:00:00.000Z","id":"doclog_20260413210753_0c1f09","type":"devlog","updatedAt":"2026-04-07T00:00:00.000Z"} -->
## 2026-04-07 Provider Retry Telemetry

- date: 2026-04-07T00:00:00.000Z
- extended the shared provider request wrapper to persist per-attempt `attemptHistory` and normalized `retryCount` across OpenAI, Anthropic, local, and stub probe or execution paths
- propagated retry metadata into provider probe history, provider execution activity, provider event timelines, provider attention items, and mission or workspace or global summaries so retry totals are visible without reopening raw state
- added deterministic retry telemetry smoke coverage for success-after-retry probe, success-after-retry execution stages, and retry-exhausted failed execution that opens provider attention with the same normalized attempt metadata
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-07T00:00:00.000Z","id":"doclog_20260413210753_6d5a63","type":"devlog","updatedAt":"2026-04-07T00:00:00.000Z"} -->
## 2026-04-07 Provider Telemetry Baseline

- date: 2026-04-07T00:00:00.000Z
- extended provider probe and execution records with `durationMs`, then propagated execution token usage as normalized `usageInputTokens`, `usageOutputTokens`, and `usageTotalTokens`
- linked telemetry into provider check, provider history, provider activity, provider events, provider overview, mission summary, workspace overview, and global overview so latency and token usage can be inspected without reopening raw state
- added `since` filtering to `provider events` so recent probe, execution, and attention chronology can be sliced without rebuilding a custom event window client-side
- added `overview providers --since` with a separate `recentWindow` summary so recent provider health can be queried without mutating the existing full-history overview aggregate
- added `overview global --provider-since` so the global control-plane can expose recent provider probe and execution activity through `providerRecentWindow` while preserving the default full-history provider aggregate
- added `workspace overview --provider-since` so workspace-bound provider execution and attention activity can be queried as `providerRecentWindow` without mutating the default workspace summary contract
- added `mission show --provider-since` and `mission timeline --provider-since` so mission-bound provider execution and attention activity can be queried as `providerRecentWindow` from the mission surface itself
- extended every `providerRecentWindow` payload with execution daily buckets and latest bucket delta so recent provider execution trend can be inspected without reopening full provider activity history
- extended every `providerRecentWindow` payload with weekly execution buckets and latest weekly delta so recent provider trend can also be read at a coarser weekly rollup
- extended every `providerRecentWindow` payload with monthly execution buckets and latest monthly delta so recent provider trend can also be read as a coarse month rollup from the same recent slice
- promoted the same recent monthly provider trend into mission or workspace or global or operator summary linkage so control-plane surfaces can read month-level direction without expanding nested bucket payloads
- promoted the same recent monthly provider trend into `overview providers` summary linkage as well, so provider-only control-plane reads stay symmetric with mission or workspace or global or operator summaries
- added provider health drift summaries to `overview providers` and `overview global`, combining current provider attention overdue or needs-reminder pressure with recent monthly execution drift in one read-model
- added deterministic telemetry smoke coverage with one local probe and one local mission run so duration and token usage propagation stay locked across provider, mission, workspace, and global surfaces
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-07T00:00:00.000Z","id":"doclog_20260413210753_767cee","type":"devlog","updatedAt":"2026-04-07T00:00:00.000Z"} -->
## 2026-04-07 Provider Hardening Baseline

- date: 2026-04-07T00:00:00.000Z
- added a shared provider failure envelope across probe and execution paths with fixed fields for `failureKind`, `recoverable`, `httpStatus`, `timedOut`, `attemptCount`, `providerResponseId`, and `rawMessage`
- moved OpenAI, Anthropic, and local adapters onto one shared timeout and bounded retry wrapper so transport or timeout or `429/5xx` retries stay aligned while `4xx` and parsing or schema failures remain deterministic no-retry paths
- hardened structured output parsing to accept only the first valid JSON object after text extraction, while empty output, prose-only output, and missing required fields now normalize into `empty-output`, `non-json-output`, and `schema-invalid`
- propagated normalized provider failure metadata into provider history, activity, events, attention, mission summary, workspace overview, global overview, and operator surfaces, then locked the contract with deterministic provider hardening smoke coverage
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-07T00:00:00.000Z","id":"doclog_20260413210753_8b12eb","type":"devlog","updatedAt":"2026-04-07T00:00:00.000Z"} -->
## 2026-04-07 Parallel Specialist Roles v1

- date: 2026-04-07T00:00:00.000Z
- added manager-controlled parallel specialist fan-out after planning, bounded to `research`, `implementation`, and `verification`, with child `agentRuns` carrying `parallelGroupId`, `parentRunId`, `resumeFromRunId`, `specialistKind`, and merge metadata
- added resumable failed or blocked specialist branches plus manager-controlled merge back into the standard executor or reviewer path so parallel work stays local-first and deterministic instead of introducing a separate queueing system
- surfaced `specialist-follow-up-required` into the unified action inbox and linked specialist branch or merge chronology into mission timeline, workspace timeline, global operator timeline, and mission or workspace or global summaries
- added deterministic smoke coverage for two-branch success merge, three-branch mixed completion, failed branch resume, blocked branch follow-up visibility, and summary or timeline propagation
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-07T00:00:00.000Z","id":"doclog_20260413210753_0ca894","type":"devlog","updatedAt":"2026-04-07T00:00:00.000Z"} -->
## 2026-04-07 Provider Attention Recovery

- date: 2026-04-07T00:00:00.000Z
- added derived `recovered` provider attention state so a newer successful probe or successful provider-backed mission run can close the latest failure pressure without requiring a manual resolution step first
- linked provider attention recovery into `provider check`, `overview providers`, `overview global`, `action provider-attention --status recovered`, mission summary, workspace summary, unified provider events, mission timeline, and workspace or global operator timeline
- added deterministic smoke coverage for one failed stub mission followed by a successful rerun on the same mission so recovery evidence stays locked across provider, mission, workspace, and global surfaces
- restored opened provider attention events into the unified provider event stream now that provider base-event assembly is separated, closing the earlier gap where current pending failures were missing from provider-only chronology
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_8958ca","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Provider Attention Reminders

- date: 2026-04-06T00:00:00.000Z
- added persisted provider attention reminder records plus `action remind-provider-attention`, so pending provider failures can be re-notified explicitly instead of only showing due or overdue state in read models
- linked provider attention reminder pressure into `provider check`, `overview providers`, `overview global`, mission timeline, workspace operator timeline, and the unified `action inbox --needs-reminder` slice
- extended `action maintenance` to sweep due provider attention reminders together with escalation and owner handoff reminders, and locked the new flow with deterministic smoke coverage for due reminder re-emission and maintenance integration
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_c411eb","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Provider Attention Aging Summary

- date: 2026-04-06T00:00:00.000Z
- extended provider status and provider overview surfaces with pending provider attention due and overdue metadata so aging provider failure pressure is visible without opening `action provider-attention` or the unified action inbox
- linked `pendingAttentionDueAt`, `pendingAttentionIsOverdue`, and `pendingAttentionSlaHours` into `provider check`, while `overview providers` and `overview global` now aggregate pending attention overdue count and next due timestamp
- strengthened provider overview smoke coverage by aging one failed anthropic probe into an overdue pending attention item and locking the same due timestamp across provider check, provider overview, and global overview
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_b01289","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Operator Timeline Provider Failure Trigger

- date: 2026-04-06T00:00:00.000Z
- extended workspace and global operator timeline with `provider-execution-failed` so the actual failure trigger is visible before provider attention acknowledgement or resolution events
- kept successful provider execution out of the operator timeline to preserve the operator-focused signal and avoid high-volume success noise
- strengthened operator timeline smoke coverage so workspace-bound failed reviewer execution and the later provider attention lifecycle are both locked on the same time axis
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_513376","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Mission Provider Audit Surface

- date: 2026-04-06T00:00:00.000Z
- extended `mission show` with mission-scoped provider execution and provider attention aggregates so one mission can report its own failed provider runs and attention lifecycle state
- extended `mission timeline` with `provider-execution-succeeded`, `provider-execution-failed`, `provider-attention-opened`, `provider-attention-acknowledged`, and `provider-attention-resolved` events
- strengthened mission timeline smoke coverage with a dedicated provider-failure mission so maintenance or escalation audit and provider audit both stay locked at mission scope
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_f36e7b","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Provider Attention Inbox

- date: 2026-04-06T00:00:00.000Z
- promoted latest failed provider probe or failed provider execution into `provider-attention-required` items inside the unified `action inbox`
- kept the contract read-model based so a later success event automatically clears the attention item without adding new persistence state
- added deterministic smoke coverage for one global probe failure and one workspace-bound execution failure, plus overview attention summary linkage
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_757188","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Provider Attention Acknowledgement

- date: 2026-04-06T00:00:00.000Z
- added `action provider-attention` and `action acknowledge-provider-attention` so provider failure attention can move from pending queue state into explicit acknowledged audit state
- persisted provider attention acknowledgements and linked them into `provider check`, `overview providers`, `overview global`, and `provider events --family attention`
- kept the lifecycle bounded so acknowledgement only clears the current latest failed provider event, while a newer provider failure still re-opens a fresh attention item
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_9cefe0","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Provider Attention Resolution

- date: 2026-04-06T00:00:00.000Z
- added `action resolve-provider-attention` so acknowledged provider failures can be explicitly closed instead of remaining in an indefinitely acknowledged audit bucket
- extended the unified provider event stream with `provider-attention-resolved` while preserving the earlier acknowledgement event for the same action
- linked resolved provider attention counts and latest resolution pointers into `provider check`, `overview providers`, and `overview global`
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_15c800","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Provider Attention Operator Timeline

- date: 2026-04-06T00:00:00.000Z
- added workspace and global operator timeline linkage for workspace-bound provider attention lifecycle events
- provider attention now appears as `provider-attention-opened`, `provider-attention-acknowledged`, and `provider-attention-resolved` alongside approval, reviewer follow-up, escalation, and maintenance events
- kept global provider probe failures on the provider event stream only, while workspace-bound execution failures are promoted into operator timeline because they map to a concrete workspace owner workflow
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_b80522","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Workspace Provider Attention Summary

- date: 2026-04-06T00:00:00.000Z
- extended `workspace overview` with workspace-scoped provider execution and provider attention aggregates so workspace owners can see failed execution pressure without jumping into provider-only commands
- linked latest failed execution and latest pending provider attention event into workspace summary while keeping global provider readiness as a separate top-level concern
- added deterministic smoke coverage for one workspace-bound failed provider execution so workspace overview regression now locks provider attention counts and latest pointers
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_299f74","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Provider Events

- date: 2026-04-06T00:00:00.000Z
- added `provider events` so probe and execution observability can be read as one chronological provider event stream instead of hopping between separate timelines
- linked latest provider event, latest probe event, and latest execution event into `overview providers` and `overview global`
- added deterministic smoke coverage for mixed skipped probe, successful probe, failed stub execution, and successful local execution in one unified stream
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_d2e01a","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Provider Execution Activity

- date: 2026-04-06T00:00:00.000Z
- added `provider activity` and `provider activity-timeline` so actual mission-stage success or failure can be inspected per provider on top of persisted `agentRuns`
- linked latest provider execution into `provider check`, `provider list`, `overview providers`, and `overview global` so readiness and real execution evidence can be read together
- added deterministic smoke coverage for mixed `stub` success or failure plus mocked `local` mission execution, including execution history and timeline filters
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_c7d6a1","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Provider Overview

- date: 2026-04-06T00:00:00.000Z
- added `overview providers` so provider readiness and persisted probe health can be inspected in one control-plane response instead of stitching together `provider list` and `provider history`
- linked provider summary into `overview global`, including configured or ready counts, unprobed count, and latest success, failure, skipped probe pointers
- added deterministic smoke coverage for mixed skipped, failed, and successful provider probes plus global overview linkage
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_3b70d6","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Provider Probe Timeline

- date: 2026-04-06T00:00:00.000Z
- added `provider timeline` so persisted provider probe records can be read as chronological success, failure, and skipped events instead of only raw history rows
- reused probe history filters for `--provider`, `--ok`, and `--attempted` so timeline and history slices stay aligned
- added deterministic smoke coverage for mixed successful and failed attempted probes plus timeline ordering and filtered failure slices
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_80fdfc","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Provider Probe History

- date: 2026-04-06T00:00:00.000Z
- persisted provider probe results into runtime state so readiness and reachability checks leave an audit trail instead of remaining transient CLI output
- added `provider history` plus latest-probe linkage on `provider list` and `provider check`, keeping current readiness and last connectivity result visible together
- added deterministic smoke coverage for missing-env persisted failure, mocked successful local probe persistence, and history filters
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_c661a8","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Provider Probe Surface

- date: 2026-04-06T00:00:00.000Z
- added `provider probe <id>` so operator workflows can distinguish missing env from actual endpoint reachability and model-list responses
- implemented lightweight `/models` probes for OpenAI, Anthropic, and local OpenAI-compatible runtimes, plus a deterministic in-process probe for `stub`
- added deterministic smoke coverage for non-attempted missing-env results and mocked successful probe responses across all implemented providers
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_030d48","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Provider Status Surface

- date: 2026-04-06T00:00:00.000Z
- added `provider list` and `provider check <id>` so operator-facing readiness can be inspected without creating or running a mission
- exposed implementation state, required env, missing env, default-provider status, and redacted effective configuration through the provider registry
- added deterministic smoke coverage for provider status queries with configured and unconfigured env paths
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_b701db","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Shared Structured Provider Utility

- date: 2026-04-06T00:00:00.000Z
- extracted shared structured-output prompt building, JSON parsing, numeric env parsing, and stage normalization into a provider utility module
- rewired `openai`, `anthropic`, and `local` adapters to use the same parsing and normalization path so provider behavior does not drift by copy-pasted implementations
- kept request-shape differences provider-local and validated the refactor with the existing provider smoke suite plus base mission regression smoke
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_0bc171","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Local Provider Adapter

- date: 2026-04-06T00:00:00.000Z
- added a `local` provider adapter for OpenAI-compatible local `/chat/completions` runtimes, with fast `LOCAL_PROVIDER_MODEL` validation and optional base-url/api-key overrides
- kept the structured JSON normalization path identical to `stub`, `openai`, and `anthropic` so provider-specific wiring does not fork the mission/session contract
- added deterministic smoke coverage for the missing-model path and mocked fetch success path so local runtime wiring can be validated without an actual local model server
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_1d5d65","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Anthropic Provider Adapter

- date: 2026-04-06T00:00:00.000Z
- added an Anthropic provider adapter backed by the Messages API contract, with fast `ANTHROPIC_API_KEY` validation and request wiring for `model`, `system`, `messages`, and `max_tokens`
- kept the current structured JSON contract identical to the OpenAI path so manager, planner, executor, and reviewer stage normalization does not fork by provider
- added deterministic smoke coverage for the missing-key path and mocked fetch success path so Anthropic wiring can be validated locally without a live API call
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_ffe07c","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Async Provider Runtime And OpenAI Adapter

- date: 2026-04-06T00:00:00.000Z
- made `runMission`, `runAgentStage`, and the CLI mission-run path async-safe so provider implementations can await network calls without a larger runtime rewrite
- added an OpenAI provider adapter backed by the Responses API contract, with fast `OPENAI_API_KEY` validation and response JSON parsing/normalization for manager, planner, executor, and reviewer stages
- added deterministic smoke coverage for the missing-key path and mocked fetch success path so provider wiring can be validated locally without live network access
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_09b364","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Maintenance Bucket Delta

- date: 2026-04-06T00:00:00.000Z
- added `latestBucketDelta` to maintenance-only summaries so the newest daily bucket can be compared against the immediately previous bucket without post-processing
- kept the delta contract derived from `dailyBuckets`, which avoids introducing a second parallel trend model and keeps maintenance audit math in one place
- extended maintenance history smoke coverage to lock negative and positive delta cases for full history, recent slices, and mission-scoped slices
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_ca2d26","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Maintenance Daily Buckets

- date: 2026-04-06T00:00:00.000Z
- added `dailyBuckets` to maintenance-only summary payloads so filtered maintenance history and overview can be read as small day-level aggregates without a separate reporting command
- kept the new bucket contract scoped to maintenance-specific surfaces only, avoiding unnecessary payload expansion in mission, workspace, and global summary contracts
- extended maintenance history smoke coverage to lock bucket ordering, per-day effective/no-op counts, and affected mission breadth into a deterministic contract
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_f1b57c","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Maintenance Since Filter

- date: 2026-04-06T00:00:00.000Z
- added `--since <iso-timestamp>` to `action maintenance-history` and `overview maintenance` so maintenance audit can be sliced by time window without inventing a separate trend endpoint
- kept the new filter run-history-only, leaving current maintenance pressure summary semantics unchanged while echoing the normalized timestamp through `filters.since`
- extended maintenance history smoke coverage with fixed maintenance run timestamps so workspace and mission time-window filtering stays deterministic
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_4fb488","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Maintenance Outcome Filters

- date: 2026-04-06T00:00:00.000Z
- added `--outcome <effective|no-op|impactful>` to `action maintenance-history` and `overview maintenance` so operators can directly slice sweep audit by run quality
- reused the same maintenance run classification helpers that feed the summary trend fields, keeping filtering semantics aligned with `effectiveRunCount`, `noOpRunCount`, and `impactRunCount`
- extended maintenance history smoke coverage to prove workspace-scope effective/no-op filters and mission-scope empty no-op filtering behave deterministically
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_1c314e","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Maintenance Run Trend Summary

- date: 2026-04-06T00:00:00.000Z
- extended maintenance-specific summaries with `effectiveRunCount`, `noOpRunCount`, `impactRunCount`, `latestEffectiveRun`, `latestNoOpRun`, and a short `recentRuns` trend window
- kept the existing affected mission breadth and missionImpact semantics intact so maintenance history can answer both scope and effectiveness questions from the same summary payload
- strengthened maintenance history smoke coverage to lock the first effective sweep, second no-op sweep, and recent run ordering into a deterministic contract
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_66a2b1","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Mission Maintenance History Linkback

- date: 2026-04-06T00:00:00.000Z
- extended `action maintenance-history --mission` and `overview maintenance --mission` to include related workspace-scope maintenance runs instead of only direct mission runs
- kept run-level breadth metadata intact while adding mission-specific `missionImpact*` summary fields so cross-mission sweeps do not hide the effect on the selected mission
- strengthened maintenance history smoke coverage to prove a workspace sweep appears in mission-scoped history/overview with correct run totals and mission-local reminder impact
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_d3a6d6","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Managed Runtime Kickoff

- date: 2026-04-06T00:00:00.000Z
- shifted the project from single-pass pack rendering to a managed multi-agent runtime
- established first-class runtime entities for sessions, agent runs, artifacts, approvals, and memory
- kept the implementation local-first and stub-provider based for deterministic development
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_b7becb","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Reviewer And Approval Hardening

- date: 2026-04-06T00:00:00.000Z
- added deliverable-aware reviewer rubric checks instead of relying on section presence alone
- added deterministic coverage for approval rejection and reviewer rubric failure
- kept the runtime local-first without introducing live provider dependencies
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_e61d11","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Approval Resume Evidence

- date: 2026-04-06T00:00:00.000Z
- changed approval approve handling to emit an `execution-ready-brief.md` handoff artifact instead of only flipping status
- split the approval approve path into its own deterministic smoke so the lifecycle now has stop, approve, and reject coverage
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_f529dd","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Mission Memory Carry-Forward

- date: 2026-04-06T00:00:00.000Z
- reviewer failures now persist mission-scoped fact memory
- approval decisions now persist mission-scoped decision memory
- reruns now prove that prior decision memory is injected back into manager context
- planner and executor now adapt rerun artifacts using prior mission memory instead of treating memory as display-only context
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_b6d981","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Session History Surface

- date: 2026-04-06T00:00:00.000Z
- added `session list <missionId>` and per-session summaries so reruns are directly inspectable
- extended `session show` to support `--session <sessionId>` for non-latest session inspection
- added deterministic coverage for multi-session history after reject-and-rerun
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_f70141","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Mission Timeline Surface

- date: 2026-04-06T00:00:00.000Z
- enriched `mission show` with mission-level summary counts
- added `mission timeline <missionId>` to aggregate session, approval, and memory events in chronological order
- added deterministic coverage for mission-level timeline inspection after reject-and-rerun
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_2f2e3f","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Workspace Overview Surface

- date: 2026-04-06T00:00:00.000Z
- added `workspace overview <workspaceId>` to aggregate mission, session, approval, and memory state across one workspace
- kept `workspace show` as the raw workspace lookup and separated the operational view into a dedicated overview command
- added deterministic coverage for mixed completed/awaiting/failed mission states in one workspace
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_473352","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Global Overview Surface

- date: 2026-04-06T00:00:00.000Z
- added `overview global` to aggregate all workspaces into one control-plane view
- included a pending approval inbox so cross-workspace human action items are visible without drilling into each workspace
- added deterministic coverage for multi-workspace global aggregation and inbox behavior
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_1767da","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Approval Inbox Surface

- date: 2026-04-06T00:00:00.000Z
- split the pending approval inbox into a dedicated `approval inbox` command instead of keeping it only as a nested global-overview field
- enriched inbox items with workspace, mission, session, and resolve-command context for operator use
- added deterministic coverage for inbox filtering and exclusion of resolved approvals
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_87fd4e","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Unified Action Inbox Surface

- date: 2026-04-06T00:00:00.000Z
- added `action inbox` as a broader operator queue that combines pending approvals with current reviewer follow-up items
- kept `approval inbox` intact and reused the same approval aggregation logic so approval-only and mixed-action surfaces stay consistent
- added deterministic coverage to prove resolved approvals stay out and reviewer-failed latest sessions show actionable rerun guidance
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_f7699e","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Action Classification

- date: 2026-04-06T00:00:00.000Z
- added explicit action classes so operator queues distinguish `awaiting-human-decision`, `retry-ready`, and `blocked`
- treated rejected approval outcomes as blocked follow-up items instead of silently dropping them from all operator surfaces
- added class-based filtering to `action inbox` so the queue can be used as a practical operational slice rather than a flat list
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_203043","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Action Dispatch Metadata

- date: 2026-04-06T00:00:00.000Z
- added `priority`, `recommendedOwner`, and `recommendedCommand` so action inbox items can be dispatched without re-deriving operator intent from raw mission state
- added priority/owner filtering and summary counts to make the queue usable for focused operational slices like “high-priority human approvals”
- kept the item contract backward-compatible by preserving `commandHint` while introducing the more explicit dispatch fields
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_a155b0","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Action SLA And Escalation

- date: 2026-04-06T00:00:00.000Z
- added `slaHours`, `dueAt`, `isOverdue`, and `escalationRule` so action inbox items can be managed as time-based operational obligations
- added `--overdue` filtering and overdue summary counts to make the queue usable for aging-based follow-up
- strengthened the deterministic smoke by rewriting temp state timestamps so overdue behavior is verified without depending on wall-clock timing
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_f1ec49","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Overdue Incident Logging

- date: 2026-04-06T00:00:00.000Z
- added an explicit `action log-overdue` command so overdue operational items can be promoted into the tracked incident trail instead of remaining query-only state
- reused the existing doc logging path and generated incident entries with filters, command hints, and escalation text for each overdue item
- added deterministic smoke coverage for logged, filtered, and no-op overdue logging behavior
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_e1d0da","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Escalated Inbox Lifecycle

- date: 2026-04-06T00:00:00.000Z
- added first-class escalation records so overdue action logging now persists open escalation state instead of only appending markdown incidents
- added `action escalated` and `action resolve-escalation` commands so escalations can be tracked and closed explicitly
- added deterministic smoke coverage for escalation dedupe, open/resolved filtering, and manual resolution notes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_a81446","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Escalation Pressure In Overviews

- date: 2026-04-06T00:00:00.000Z
- extended `workspace overview` and `overview global` so control-plane summaries now include escalation counts, open escalation ids, latest escalation context, and top-level escalated workspace visibility
- updated overview smokes to generate overdue escalation state before assertions so the top-level summaries are tested against real escalation records instead of empty defaults
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_6fd490","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Escalation Events In Mission Timeline

- date: 2026-04-06T00:00:00.000Z
- extended `mission timeline` so mission-scoped escalation open/resolved lifecycle is visible on the same chronological axis as sessions, approvals, and memory
- updated mission timeline smoke to create an overdue action, log it into escalation state, resolve it, and verify both timeline events plus mission summary escalation counts
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_d86a85","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Workspace And Global Operator Timeline

- date: 2026-04-06T00:00:00.000Z
- added workspace-level and global operator timeline surfaces that unify approval, reviewer follow-up, and escalation events into one operator-facing chronological stream
- kept mission timeline focused on mission scope while exposing broader operational history through `workspace timeline` and `overview operator-timeline`
- added deterministic smoke coverage for mixed workspace/global operator events and chronological ordering
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_399987","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Reviewer Follow-Up Resolution Lifecycle

- date: 2026-04-06T00:00:00.000Z
- added first-class reviewer follow-up records with open/resolved status so reviewer remediation no longer appears only as a derived failed-session artifact
- added `action reviewer-followups` and `action resolve-reviewer-follow-up` so operator workflows can inspect and explicitly close reviewer follow-up items
- persisted reviewer follow-up resolution notes back into mission memory so future reruns can see why a follow-up was closed
- extended mission, workspace, and global timeline coverage so reviewer follow-up closure is tracked alongside approval and escalation lifecycle events
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_770610","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Reviewer Follow-Up Resolution Taxonomy

- date: 2026-04-06T00:00:00.000Z
- added explicit reviewer follow-up resolution kinds so closure reasons are structured as `rerun-fixed`, `superseded`, `scope-reduced`, or `accepted-risk`
- extended `action reviewer-followups` with kind filtering and summary counts so resolved follow-ups can be sliced by remediation outcome
- updated mission memory and operator timeline details so closure events now preserve both taxonomy and free-text note
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_445620","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Accepted Risk Monitoring Policy

- date: 2026-04-06T00:00:00.000Z
- linked reviewer follow-up taxonomy to escalation policy so `accepted-risk` does not disappear after closure and instead opens a monitoring escalation automatically
- reused existing escalation overview and inbox surfaces instead of adding a parallel monitoring queue, keeping accepted-risk pressure visible at mission, workspace, and global level
- added deterministic smoke coverage to prove accepted-risk resolution creates an open escalation and that timeline plus overview surfaces reflect the policy outcome
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_21e018","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Monitoring Required Action Queue

- date: 2026-04-06T00:00:00.000Z
- surfaced open accepted-risk monitoring escalations back into `action inbox` as `monitoring-required` items so workspace-owner review appears in the main operator queue
- reused escalation dueAt and rule metadata for the reopened action item instead of synthesizing a second policy clock
- added deterministic overdue coverage by aging the monitoring escalation and verifying `action inbox --class monitoring-required --overdue`
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_b2d38b","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Escalation Tiering

- date: 2026-04-06T00:00:00.000Z
- added derived escalation tiers so open escalation pressure can be sliced as `normal`, `warning`, or `critical`, with resolved entries exposed as `resolved`
- extended `action escalated` with tier filtering and summary counts, and propagated tier counts into workspace, mission, and global overview summaries
- strengthened escalation smokes to verify both initial normal accepted-risk monitoring and aged critical escalation paths
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_64e97b","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Escalation Sync And Breach History

- date: 2026-04-06T00:00:00.000Z
- added `action sync-escalations` so tier transitions are persisted into runtime state instead of being only read-time derivations
- escalations now accumulate `breachCount`, `lastBreachAt`, `lastSyncedAt`, and `tierHistory` so operator severity has auditable history
- updated mission and overview summaries to surface escalation breach totals, and added deterministic sync smoke for `normal -> warning -> critical -> resolved`
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_f620aa","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Escalation Reminder Trail

- date: 2026-04-06T00:00:00.000Z
- added `action remind-escalations` so open escalation pressure can be re-issued through a local-first operator command without introducing external notification dependencies
- escalations now persist `reminderCount`, `lastReminderAt`, and `reminderHistory`, and mission/workspace/global summaries surface reminder totals alongside breach totals
- extended mission and operator timelines with `escalation-reminded` events and added deterministic smoke coverage for repeated reminders on an accepted-risk monitoring escalation
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_0f3470","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Escalation Reminder Due Policy

- date: 2026-04-06T00:00:00.000Z
- added cadence-derived reminder due state so escalations expose `nextReminderAt`, `needsReminder`, and `reminderCadenceHours` instead of forcing operators to infer re-notify timing manually
- extended `action escalated` with `--needs-reminder` and `action remind-escalations` with `--due` so the reminder queue can be sliced without re-sending every open escalation
- updated workspace/global summaries to surface `escalationNeedsReminderCount` and added deterministic smoke coverage for due-after-created and due-after-last-reminder transitions
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_35e76a","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Escalation Owner Chain

- date: 2026-04-06T00:00:00.000Z
- added derived effective owner escalation so repeated due monitoring pressure can move from the recorded owner to a higher operator without mutating the stored base owner
- extended `action escalated` and `action inbox` with `--effective-owner` filtering and surfaced effective owner counts in action/escalation summaries
- added deterministic smoke coverage to prove accepted-risk monitoring escalates from `workspace-owner` to `human-approver` after reminder issuance and renewed due state
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_0a8927","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Escalation Owner History

- date: 2026-04-06T00:00:00.000Z
- persisted owner chain transitions through `syncEscalations` so effective owner changes are recorded as stateful history instead of remaining read-time only derivations
- extended mission and operator timelines with `escalation-owner-changed` events and surfaced latest owner escalation timestamp plus owner transition totals in overview summaries
- added deterministic smoke coverage to prove owner history backfill, `workspace-owner -> human-approver` transition recording, and timeline visibility for accepted-risk monitoring escalation
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_8cb710","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Escalation Owner Handoff Queue

- date: 2026-04-06T00:00:00.000Z
- added a dedicated owner handoff queue so persisted owner transitions become actionable operator items instead of remaining timeline-only audit data
- added explicit `acknowledge-owner-handoff` handling and timeline visibility for owner handoff acknowledgement events, along with latest/pending handoff summary fields
- added deterministic smoke coverage for pending handoff discovery, acknowledgement, acknowledged queue visibility, and summary/timeline propagation
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_538f23","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Owner Handoff Due Pressure

- date: 2026-04-06T00:00:00.000Z
- extended pending owner handoffs with derived SLA, dueAt, and overdue state so acknowledgement pressure is visible without manually comparing transition timestamps
- added `action owner-handoffs --overdue` and propagated pending handoff overdue counts plus next due timestamp into mission, workspace, and global summaries
- updated owner handoff acknowledgement detail so overdue acknowledgements stay visible on the mission timeline instead of disappearing into a generic resolved note
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_778f2c","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Owner Handoff In Unified Action Inbox

- date: 2026-04-06T00:00:00.000Z
- reintroduced pending owner handoff work into the main `action inbox` as `handoff-required` so operators do not have to switch to a dedicated queue to see acknowledgement work
- excluded pending owner handoff escalations from the generic accepted-risk monitoring slice to avoid duplicate operator actions for the same escalation
- strengthened `smoke-action-inbox` to verify approval, reviewer follow-up, blocked follow-up, and owner handoff all coexist in the unified queue with correct counts, filters, and overdue state
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_ce4452","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Owner Handoff Reminder Policy

- date: 2026-04-06T00:00:00.000Z
- added local-first reminder cadence for pending owner handoffs so overdue acknowledgement work can be re-notified without relying on external integrations
- extended `action owner-handoffs` with `--needs-reminder` and added `action remind-owner-handoffs` so reminder candidates can be sliced and re-issued explicitly
- propagated owner handoff reminder counts, latest reminder timestamp, and next reminder timestamp into mission/workspace/global summaries and mission/operator timeline surfaces
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_c48f19","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Unified Action Reminder Slice

- date: 2026-04-06T00:00:00.000Z
- normalized owner handoff reminder metadata onto the unified `action inbox` item shape so `handoff-required` and `monitoring-required` actions share the same reminder semantics
- extended `action inbox` with `--needs-reminder` and reminder summary counts so the main operator queue can slice reminder work without switching to queue-specific commands
- strengthened smoke coverage to prove `--needs-reminder` works for both owner handoff work and accepted-risk monitoring escalations
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_5adffc","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Local Maintenance Sweep

- date: 2026-04-06T00:00:00.000Z
- added `action maintenance` as a repo-native local-first sweep that runs escalation sync plus due reminders for monitoring pressure and pending owner handoffs in one command
- suppressed duplicate generic escalation reminders for escalations that already have a pending owner handoff, so maintenance emits one reminder path per open operator obligation
- added deterministic mixed-queue smoke coverage to prove maintenance reminds one monitoring escalation and one owner handoff without double-reminding the same escalation
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_6eecd2","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Maintenance Run History

- date: 2026-04-06T00:00:00.000Z
- persisted `action maintenance` executions as first-class maintenance run records so local sweeps leave an audit trail even when they do not send any reminders
- added `action maintenance-history` and `overview maintenance` so operators can inspect latest sweep results, aggregate reminder totals, and no-op runs without reading raw state
- propagated maintenance run totals and latest run metadata into workspace/global overview so top-level control-plane surfaces now show maintenance activity as well as pressure
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_da35df","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Maintenance Required Action

- date: 2026-04-06T00:00:00.000Z
- surfaced current due maintenance pressure as a first-class `maintenance-required` item in the unified `action inbox`
- grouped due monitoring reminders and due owner handoff reminders into one workspace-scoped maintenance action so operators can launch the sweep without manually re-deriving scope
- extended maintenance history smoke coverage to verify the maintenance-required item appears before a sweep and disappears after the sweep clears due pressure
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_b70c50","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Maintenance Run In Operator Timeline

- date: 2026-04-06T00:00:00.000Z
- added `maintenance-run` events to workspace/global operator timeline so maintenance execution is visible alongside approval, follow-up, and escalation activity
- included run outcome detail such as sync count, reminded count, and no-op marker in the timeline event body
- extended operator timeline smoke coverage to verify a no-op maintenance sweep still leaves an auditable operator event
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_8acac1","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Maintenance Pressure Resolution Trail

- date: 2026-04-06T00:00:00.000Z
- extended maintenance run records with before/after pressure snapshots plus acknowledged/resolved/remaining counts so derived `maintenance-required` work leaves explicit audit evidence
- added `maintenance-required-acknowledged` and `maintenance-required-resolved` events to workspace/global operator timeline instead of letting maintenance pressure disappear silently after a sweep
- strengthened maintenance history smoke coverage to verify the first sweep acknowledges and clears one maintenance-required obligation while a second no-op sweep leaves no false resolution record
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_b8fc4f","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Mission Maintenance Audit Surface

- date: 2026-04-06T00:00:00.000Z
- propagated maintenance run totals and latest maintenance metadata into mission summary so a single mission can expose its own maintenance audit state without requiring workspace/global drill-down
- extended mission timeline with mission-scoped `maintenance-run`, `maintenance-required-acknowledged`, and `maintenance-required-resolved` events
- strengthened mission timeline smoke coverage to prove an overdue escalation can be reminded through mission-scoped maintenance before escalation resolution, while leaving explicit maintenance evidence in the mission audit stream
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_8c07c0","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Workspace Maintenance Linkback In Mission Timeline

- date: 2026-04-06T00:00:00.000Z
- linked workspace-scoped maintenance runs back to affected mission ids so a mission timeline can show indirect maintenance activity even when the sweep was executed at workspace scope
- kept maintenance-required acknowledgement and resolution events mission-scoped only, while mission timelines now render a mission-specific workspace maintenance detail built from affected escalation and handoff reminder counts
- updated mission timeline smoke coverage to switch from action maintenance with mission scope to action maintenance with workspace scope and verify that related maintenance evidence still appears on the mission audit surface
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_ba6b18","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Mission Maintenance Impact Summary

- date: 2026-04-06T00:00:00.000Z
- added combined maintenance impact fields to mission summary so direct mission maintenance totals and indirect workspace maintenance effects are both visible without replaying timeline events by hand
- kept direct maintenance aggregate semantics unchanged and introduced impact-only fields separately to avoid overcounting existing maintenanceRunCount and maintenanceTotalRemindedCount contracts
- extended mission timeline smoke coverage to assert the new impact totals for a workspace-scoped maintenance run that affects exactly one mission
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_39c73f","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Workspace And Global Maintenance Impact Breadth

- date: 2026-04-06T00:00:00.000Z
- added maintenance-affected mission breadth fields to workspace and global overview summaries so top-level control-plane surfaces can show how many missions recent sweeps actually touched
- kept existing maintenance total/reminder counters unchanged and exposed breadth as separate affected-mission metadata to avoid changing previous summary semantics
- extended workspace and global overview smoke coverage with maintenance sweeps so affected mission counts and latest impact run linkage are verified deterministically
- corrected workspace impact lookup so workspace overview also counts global maintenance sweeps and mission-scope sweeps that affected missions inside the workspace, instead of only runs that were launched with the workspace id directly
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_0a1d8c","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Maintenance History Impact Summary

- date: 2026-04-06T00:00:00.000Z
- extended maintenance history and maintenance overview summaries with affected mission breadth plus latest impact linkage so maintenance-specific audit surfaces can answer reach questions directly
- reused the same maintenance impact helper already used by mission and overview summaries instead of introducing a separate maintenance-history-only contract
- strengthened maintenance history smoke coverage to verify the first effective sweep touched exactly two missions while the later no-op sweep does not replace the latest impact run metadata
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_76dbb0","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Orchestration Profile Workspace Usage Summary Symmetry

- date: 2026-04-09T00:00:00.000Z
- promoted `workspaceUsageTrend` month-over-month comparison fields into `overview profiles` summary so `currentMonthStartDate`, `currentMonthWorkspaceCount`, `previousMonthStartDate`, `previousMonthWorkspaceCount`, and `workspaceCountDelta` are available without reopening the root quick field
- extended orchestration profile smoke coverage across root overview, mixed single-workspace overview, and second-workspace overview to verify the new summary aliases for growing and steady workspace footprint cases
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_60cfda","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Orchestration Profile Usage Summary Symmetry

- date: 2026-04-09T00:00:00.000Z
- promoted `usageTrend` month-over-month comparison fields into `overview profiles` summary so `currentMonthStartDate`, `currentMonthMissionCount`, `previousMonthStartDate`, `previousMonthMissionCount`, and `missionCountDelta` are available without reopening the root quick field
- extended orchestration profile smoke coverage across root overview, mixed single-workspace overview, and second-workspace overview to verify the new mission-volume summary aliases for growing and steady usage cases
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_1c0d0b","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Orchestration Profile Adoption Composition Summary Symmetry

- date: 2026-04-09T00:00:00.000Z
- promoted `adoptionDriftUsageTrendStatus` and `adoptionDriftWorkspaceUsageTrendStatus` into `overview profiles` summary so combined adoption status can be decomposed into mission-volume and workspace-footprint trend signals without reopening the root quick field
- extended orchestration profile smoke coverage across root overview, mixed single-workspace overview, and second-workspace overview to verify the new summary aliases for growing and steady combined adoption cases
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_9e2795","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Workspace Adoption Composition Symmetry

- date: 2026-04-09T00:00:00.000Z
- promoted `missionTrendStatus` and `profileFootprintTrendStatus` into root `workspaceAdoptionDrift` and mirrored them as `workspaceAdoptionDriftMissionTrendStatus` and `workspaceAdoptionDriftProfileFootprintTrendStatus` in summary so workspace-level combined adoption pressure can be decomposed into mission-volume and footprint trend sources without reopening count maps
- extended orchestration profile smoke coverage across root overview, mixed single-workspace overview, and second-workspace overview to verify the new workspace adoption composition aliases for growing and steady workspace cases
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_e81f03","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Trend Latest Linkage Symmetry

- date: 2026-04-09T00:00:00.000Z
- promoted generic `latestProfile` into `usageTrend` and `workspaceUsageTrend`, and generic `latestWorkspace` into `workspaceUsageTrend`, then mirrored them as summary aliases so trend consumers can resolve the newest preset or workspace without relying on direction-specific latest links only
- extended orchestration profile smoke coverage across root overview, mixed single-workspace overview, and second-workspace overview to verify the new generic latest linkage contract for mission-volume and workspace-footprint trends
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_9f7ad6","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Korean Single-Screen Operator Flow Polish

- date: 2026-04-09T00:00:00.000Z
- localized the operator console surface into Korean so navigation chrome, guided steps, empty states, and workflow helper copy read as a coherent product UI instead of an internal mixed-language tool
- tightened the single-screen operator flow around `미션 정하기 → 실행하기 → 검토하기 → 결과 보기` and aligned setup, review, artifact, session, and provider surfaces to that explicit user journey
- added display-only label translation for mission/session/action/approval statuses and common timeline event kinds so backend contract values can remain stable while the UI stays readable for Korean-speaking operators
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_8933fe","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Command Header And Detail Tabs Reframe

- date: 2026-04-09T00:00:00.000Z
- removed the always-open right inspector and rebuilt the console around a single main workspace with a sticky command header, explicit next-action banner, and stronger step navigation so operators can understand current state before scanning lower details
- split the lower half into dedicated detail tabs for `결과물`, `실행 기록`, `검토 이력`, and `입력값과 설정`, which keeps result reading, session tracing, and provider context on one screen without forcing a three-column scan
- updated mission queue copy and step summaries so Korean operators see natural task language like `지금 할 일`, `막힌 이유 / 상태`, `검토와 승인 처리가 필요합니다`, and `최종 결과를 확인하고 확정하세요` instead of having to infer meaning from dispersed system labels
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-10T00:00:00.000Z","id":"doclog_20260413210753_60ac9c","type":"devlog","updatedAt":"2026-04-10T00:00:00.000Z"} -->
## 2026-04-10 Command Surface Compression And Workspace Merge

- date: 2026-04-10T00:00:00.000Z
- merged the previous separated progress strip into the command header so mission identity, current action, and stage flow read as one operator control surface instead of two stacked dashboards
- introduced a single `workspace-shell` that groups `현재 단계 작업판` and `결과와 기록` into the same vertical working column, reducing scan distance and making the “choose → act → confirm” loop feel like one screen
- compressed rail density, inline status metrics, and detail tabs so the console shows more actionable state above the fold while keeping the Korean step flow and review/output surfaces intact
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-10T00:00:00.000Z","id":"doclog_20260413210753_7bfdd6","type":"devlog","updatedAt":"2026-04-10T00:00:00.000Z"} -->
## 2026-04-10 Mission Queue Scanability And Detail Context Bar

- date: 2026-04-10T00:00:00.000Z
- reshaped the left mission queue into a more operational inbox with queue counters, clearer `다음 액션` emphasis, and denser row metadata so users can judge what to open without parsing several separate cards
- added a `detail-contextbar` above the lower tabs so the selected mission, current detail mode, latest session, artifact count, and review state are visible before drilling into results or logs
- kept the single-screen flow intact while making the lower `결과와 기록` surface feel less like detached tabs and more like a contextual workbench tied to the currently selected mission/session
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-10T00:00:00.000Z","id":"doclog_20260413210753_64e1ca","type":"devlog","updatedAt":"2026-04-10T00:00:00.000Z"} -->
## 2026-04-10 Dark Inbox Rail And Unified Detail Strip Polish

- date: 2026-04-10T00:00:00.000Z
- restyled the left rail away from stacked white cards into a darker inbox-like list so selected missions and next actions scan faster against the control-plane background
- turned the lower result area into a flatter contextual strip by reducing card treatment around the detail context bar and tab labels, keeping current mode, session, artifact, and review state visible without adding another dashboard row
- added tab count labels for artifacts, runs, and reviews so the lower workbench communicates depth before the user opens each tab
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-10T00:00:00.000Z","id":"doclog_20260413210753_d0d0b1","type":"devlog","updatedAt":"2026-04-10T00:00:00.000Z"} -->
## 2026-04-10 Result-First Output Workbench

- date: 2026-04-10T00:00:00.000Z
- reworked `결과 보기` around a representative deliverable spotlight plus a separate closeout checklist so the final stage reads like “confirm the outcome” instead of another generic stage card
- widened the artifact detail view into an asymmetric result-first layout, keeping the deliverable body dominant while moving timeline and secondary context into a narrower companion pane
- tied the output checklist and detail context to the same artifact/session selection helpers so final result verification, review state, and run history stay synchronized across the lower workbench
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-10T00:00:00.000Z","id":"doclog_20260413210753_b06694","type":"devlog","updatedAt":"2026-04-10T00:00:00.000Z"} -->
## 2026-04-10 Mission Inbox Compression And Closeout Checklist Pass

- date: 2026-04-10T00:00:00.000Z
- compressed the left mission queue into a denser inbox row format with stage, updated time, objective summary, next action, and provider context so operators can choose the next mission without scanning multiple boxed chips
- changed the output-stage closeout surface from generic mini cards into indexed checklist rows, making the final confirmation path read as ordered verification work instead of parallel widgets
- added UI-only label cleanup for mission mode values and reused the latest reviewer or objective summary as the queue snippet so Korean operators see purpose-first copy before opening a mission
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-10T00:00:00.000Z","id":"doclog_20260413210753_b0878f","type":"devlog","updatedAt":"2026-04-10T00:00:00.000Z"} -->
## 2026-04-10 Command Header Compression Pass

- date: 2026-04-10T00:00:00.000Z
- reduced the top command header to three core metrics plus a shorter signal row so mission identity, review pressure, and latest run read faster without competing cards
- shortened the default mission subtitle and each stage panel description into more direct Korean utility copy, removing extra explanatory weight from the first viewport
- kept the same single-screen operator structure while lowering visual density in the first screen, so users can scan state and move into the active stage with less interpretation overhead
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-10T00:00:00.000Z","id":"doclog_20260413210753_afe51e","type":"devlog","updatedAt":"2026-04-10T00:00:00.000Z"} -->
## 2026-04-10 Unified Command Surface Pass

- date: 2026-04-10T00:00:00.000Z
- flattened the `지금 할 일` panel from stacked meta cards into a single decision block with inline status chips so the operator reads action, stage, and progress state in one pass
- turned the progress strip into a footer-style rail inside the same command surface by removing its separate card treatment and giving it a shared divider/background continuation
- shortened the progress rail helper copy and stage cards so the top viewport feels like one coordinated control surface instead of separate dashboard modules
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-10T00:00:00.000Z","id":"doclog_20260413210753_dd7cd8","type":"devlog","updatedAt":"2026-04-10T00:00:00.000Z"} -->
## 2026-04-10 Inbox Rail Compression Pass

- date: 2026-04-10T00:00:00.000Z
- reduced the left rail width, brand copy, queue counters, and mission row padding so the inbox stops competing with the main workspace for first-screen attention
- reshaped each mission row into a tighter operator list with one inline `다음 액션` line and a condensed context footer that combines mode and provider into a single chip-like label
- kept the queue readable for Korean PM and operations users while giving more horizontal room to the command header and result workbench
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-10T00:00:00.000Z","id":"doclog_20260413210753_66f2a3","type":"devlog","updatedAt":"2026-04-10T00:00:00.000Z"} -->
## 2026-04-10 Result Workbench Hierarchy Pass

- date: 2026-04-10T00:00:00.000Z
- widened the artifact-first split so the final deliverable body holds more horizontal space while the companion timeline and run context stay secondary
- tightened the lower detail shell chrome and promoted selected artifact metadata into a clearer title plus kind/path row, making the result area feel more like a reading surface than a generic tab panel
- added compact count badges and divider-based grouping to session detail so execution history, approvals, and artifact lists read as structured inspection lanes instead of same-weight card stacks
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-10T00:00:00.000Z","id":"doclog_20260413210753_2ebc4a","type":"devlog","updatedAt":"2026-04-10T00:00:00.000Z"} -->
<!-- document-log:start {"createdAt":"2026-04-16T02:00:00.000Z","id":"doclog_20260416020000_91a0b7","type":"devlog","updatedAt":"2026-04-16T02:00:00.000Z"} -->
## 2026-04-16 Recommendation Attention Filter Pass

- date: 2026-04-16T02:00:00.000Z
- added an `attention-only` release history filter so the operator can strip out successful actions and look only at blocked, failed, or confirmation-required events
- extended recommendation cards with `같은 문제 흐름 보기`, which applies the same scope/provider context plus the attention filter in one action and turns a generic suggestion into an immediate triage queue
- updated filtered empty-state handling so narrowing to attention outcomes does not look like the history feed disappeared or failed to load
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T01:40:00.000Z","id":"doclog_20260416014000_f30e39","type":"devlog","updatedAt":"2026-04-16T01:40:00.000Z"} -->
## 2026-04-16 Recommendation Flow Focus Pass

- date: 2026-04-16T01:40:00.000Z
- extended recommendation cards with `같은 flow 보기` so the operator can move directly from a suggested next action into the matching release-history triage context without first opening the raw history list
- made the action apply both focus and context filter at once, which turns the release tab flow into `recommendation -> pinned history -> narrowed scope/provider` instead of three separate manual steps
- kept the change client-side and state-local, preserving the release status API while shortening the operator path from summary badge to actionable forensic context
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T01:25:00.000Z","id":"doclog_20260416012500_8b18a2","type":"devlog","updatedAt":"2026-04-16T01:25:00.000Z"} -->
## 2026-04-16 Release History Context Filter Pass

- date: 2026-04-16T01:25:00.000Z
- added quick context filters for the focused release action so operators can narrow the history list to the same scope or provider without manually re-scanning every release row
- kept the filtering local to the release tab state and preserved the existing pinned focus flow, which means recommendation-driven triage now supports `jump -> pin -> inspect -> narrow` in one surface
- added explicit filter-clear controls and empty-state copy for filtered views so narrowing the list does not look like missing history or a data-loading bug
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T01:10:00.000Z","id":"doclog_20260416011000_2f4b67","type":"devlog","updatedAt":"2026-04-16T01:10:00.000Z"} -->
## 2026-04-16 Release History Focus Pin Pass

- date: 2026-04-16T01:10:00.000Z
- promoted release history focus from a temporary scroll target into a pinned triage state so the selected action stays at the top of the history list until the operator explicitly clears it
- added `이 기록 고정` and `포커스 해제` controls directly on history rows, which makes repeated release investigation less dependent on recommendation cards once the operator is already inside the history section
- kept the behavior client-side and non-destructive, preserving the release status API while making recommendation-driven investigation durable across rerenders and repeated status reloads
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T00:55:00.000Z","id":"doclog_20260416005500_4fd6aa","type":"devlog","updatedAt":"2026-04-16T00:55:00.000Z"} -->
## 2026-04-16 Release History Expand Pass

- date: 2026-04-16T00:55:00.000Z
- extended release action history rows with `상세 보기/닫기` so operators can inspect action id, outcome, scope, and provider without leaving the `v1 마감 상태` tab
- wired recommendation-driven `최근 기록 보기` to open the matching history row automatically, turning the existing jump/highlight behavior into a direct triage flow instead of a purely visual cue
- kept the change client-side and state-local so the release status API contract stays stable while the release tab becomes easier to navigate under repeated preflight/confirm cycles
<!-- document-log:end -->

## 2026-04-10 Review Decision Priority Pass

- date: 2026-04-10T00:00:00.000Z
- reordered the review detail area so human approvals appear before follow-up tasks, keeping the most blocking decision path at the front of the review workspace
- reframed the review summary into a decision spotlight with explicit approval count, follow-up count, latest session state, and primary next-action buttons so operators can tell what to clear first
- added approval and action callouts plus stronger visual separation for readiness checks, making the review stage read as a triage surface rather than three same-weight boxes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-10T00:00:00.000Z","id":"doclog_20260413210753_87f257","type":"devlog","updatedAt":"2026-04-10T00:00:00.000Z"} -->
## 2026-04-10 Mission Selection Bridge Pass

- date: 2026-04-10T00:00:00.000Z
- inserted a compact `선택한 미션` bridge strip above the stage workspace so the left inbox choice, the currently opened step, the next action, and the latest execution state read as one connected operator context
- strengthened the active mission row with `현재 작업 중` and `현재 작업판` cues, reducing the feeling that the queue selection and the central workbench are separate surfaces
- kept the change intentionally lightweight by reusing existing mission/session helpers instead of adding a new dashboard block, preserving the single-screen flow while improving selection-to-workspace linkage
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T00:00:00.000Z","id":"doclog_20260415105500_12e44a","type":"devlog","updatedAt":"2026-04-15T00:00:00.000Z"} -->
## 2026-04-15 View Breadcrumb Pass

- date: 2026-04-15T00:00:00.000Z
- extended the `선택한 미션` bridge strip with `현재 보기 / 세션 포커스 / 결과물 포커스` crumbs so operators can read the exact URL-synced navigation context without inspecting the query string
- reused existing mission/session/artifact selection state instead of introducing a new inspector block, keeping the single-screen flow intact while making deep-linked state visible
- kept the addition lightweight and text-first so the breadcrumb clarifies navigation context without competing with the main work surface
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T00:00:00.000Z","id":"doclog_20260415102000_24a51b","type":"devlog","updatedAt":"2026-04-15T00:00:00.000Z"} -->
## 2026-04-15 Share/Reset View Pass

- date: 2026-04-15T00:00:00.000Z
- added `현재 링크 복사` and `보기 초기화` actions to the top control surface so the new URL-synced operator state is immediately usable for sharing and quick recovery
- implemented a lightweight UI notice path instead of extra modal chrome, which keeps the single-screen work surface intact while still confirming copy/reset actions
- kept reset semantics narrow: it reopens the currently selected mission in its default recommended view or falls back to the first visible mission, rather than mutating any underlying mission data
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T00:00:00.000Z","id":"doclog_20260415091500_5c8b4e","type":"devlog","updatedAt":"2026-04-15T00:00:00.000Z"} -->
## 2026-04-15 Browser History Navigation Pass

- date: 2026-04-15T00:00:00.000Z
- split URL state writes into `push` for direct operator navigation and `replace` for internal refresh flows, so bookmarkable console state also participates in normal browser back/forward navigation
- added `popstate` restore on top of the existing query bootstrap logic, which lets mission, step, detail tab, session, and artifact context rewind without losing the single-screen operator workflow
- verified the served asset exports `pushState`/`popstate` handling and updated README copy to reflect refresh, sharing, and browser-history recovery behavior
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260414091500_3f2d41","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 URL State Sync Pass

- date: 2026-04-14T00:00:00.000Z
- added URL query sync for selected workspace, mission, step, detail tab, session, and artifact so the single-screen operator console can recover the same working context after refresh
- introduced URL-aware restore logic during bootstrap and let mission/session/artifact selection accept preferred targets, which avoids the default recommended-step jump overriding bookmarked state
- verified the served UI asset exports the new parse/write/restore helpers and that syntax and diff checks pass without widening the change beyond `app.js` and UI docs
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260413210753_5288a9","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 Harness Memory CRUD Pass

- date: 2026-04-14T00:00:00.000Z
- added mission and workspace memory PATCH/DELETE routes so layered memory is no longer add-only and operators can correct or remove stale fact/decision/preference entries without leaving the console
- wired the harness memory rows with `불러오기` and `삭제` actions plus edit-mode status copy and cancel controls, letting the existing forms switch between create and update flows with minimal extra chrome
- verified the full memory lifecycle by creating temporary mission/workspace entries, updating both, deleting both, and confirming the temporary ids were removed from `var/state.json`
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260413210753_d2511e","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 Source-Of-Record Document CRUD Pass

- date: 2026-04-14T00:00:00.000Z
- introduced tracked document-log blocks with stable `doclog_*` ids so harness document intake can support update and delete instead of remaining append-only markdown output
- extended the harness source panel with recent document entries plus `불러오기` and `삭제` actions, and added edit-mode status/cancel flow to the existing document log form
- verified the full document lifecycle by creating a temporary reference entry, moving it to `devlog` through PATCH, deleting it, and confirming the temporary id and content no longer exist in any docs file
<!-- document-log:end -->


<!-- document-log:start {"createdAt":"2026-04-13T21:08:46.781Z","id":"doclog_20260413210846_6ddcf8","type":"devlog","updatedAt":"2026-04-13T21:08:57.298Z"} -->
## 2026-04-14 Legacy Devlog Migration Pass

- date: 2026-04-13T21:08:57.298Z
- added a safe migration path that wraps historical append-only devlog sections into tracked document log blocks so older operating notes can be edited and deleted from the harness surface
- limited migration scope to devlog.md only, leaving reference-repos.md and incidents.md untouched because they are either curated reference structure or currently empty
- exposed the migration through the harness source panel and verified idempotency by migrating once, then confirming a second run returns migratedCount 0 while harness summary reports legacyDevlogCount 0 and trackedDevlogCount 106
<!-- document-log:end -->
