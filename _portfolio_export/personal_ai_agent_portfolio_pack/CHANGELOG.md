# Changelog

All notable public-facing changes are tracked here. This project follows an evidence-first release style: changelog entries should describe verified repository state, not aspirational claims.

## Unreleased

- Added an independent local training process supervisor for an actual Node fixture child. It revalidates exact approval and permission state before spawn, periodically while running, and before result acceptance; revocation and timeout terminate the detached POSIX process group while its direct leader is live, late signals are withheld, and cleanup requires leader close plus confirmed group absence. The MLX adapter binds the supervisor contract but does not invoke it, so actual MLX execution, installation, download, training, rollout, external provider calls, and production claims remain false.
- Added content-free static training runtime closure provenance for the MLX-LM fixture adapter. The contract pins one interpreter, one entrypoint, the reachable allowlisted Python module graph, and exact file bytes, then revalidates them before workspace creation and fixture invocation. Dynamic and native dependency closure, verify-to-exec, actual process execution, installation, download, training, rollout, external provider calls, and production claims remain false.
- Added owner-only durable recovery for the MLX-LM fixture adapter. Success and failure cleanup now resume from explicit states, verify exact candidate bytes, remove workspaces before rollback, and use an immutable claim-edge CAS so concurrent retriers have one winner. Actual process execution, dependency installation, model download, training, rollout, external provider calls, and production claims remain false.
- Added a non-authorizing MLX-LM LoRA fixture adapter that binds the approved F1 packet to pinned local artifacts, exact train/valid bytes, fixed offline invocation, and atomic candidate publication. The adapter cannot create a recorded training run or candidate-evaluation readiness; actual installation, model download, process execution, training, rollout, and production claims remain false.
- Exported one successful private host-restart rehearsal as a content-free F2c.19 receipt. The export path revalidated changed-boot recovery and idempotent result binding; the tracked projection records that operator result while excluding raw boot identity, private state hashes, and paths. Public smoke validates the projection contract, not the private restart independently. Evaluator relaunch, model evaluation, training, rollout, external provider calls, and production readiness remain false.
- Added a private manual host-restart rehearsal for the F2c.17 workspace recovery primitive. Prepare creates one owner-only synthetic `spawning` lease without rebooting or launching an evaluator; resume requires a changed reliable boot identity, expiry, and one exact prior-boot recovery. Tracked evidence injects the boot transition and keeps `actualHostRestartObserved: false`; same-user TOCTOU, OS isolation, actual model evaluation, training, rollout, and production readiness remain unverified.
- Added a host-boot-bound v2 lease for local candidate evaluation workspaces. Recovery now removes an expired `spawning` workspace only when a reliable kernel boot identity proves it came from a prior boot; same-boot, legacy, unavailable-identity, and unsafe states remain preserved. The tracked replay simulates the boot transition and does not claim an observed host restart, escaped-session containment, actual model evaluation, rollout, or production readiness.
- Added a detached POSIX process-group lifecycle for local candidate evaluation. Timeout and output overflow now wait for leader close and group absence before workspace cleanup, while late or unknown quiescence preserves the `spawning` workspace and emits no completed run evidence. OS restart recovery, escaped sessions, OS resource and network isolation, actual model evaluation, rollout, and production readiness remain unverified.
- Bound local candidate evaluation admission to the exact F1 suite bytes and moved evaluator input into a temporary workspace containing only the admitted suite and manifest-listed candidate files.
- Added pre-run and post-run candidate and suite verification, combined disk-envelope enforcement, source-workspace exclusion, and cleanup-before-evidence guards. The tracked replay remains fixture-only; evaluator executable provenance, OS resource and network isolation, actual model evaluation, rollout, and production claims remain unverified.
- Added a fixture-only post-acquisition readiness gate that binds artifact verification to owner-reviewed provenance, closed egress, an offline resource canary, and the existing product permission evidence without authorizing training.
- Added fail-closed checks for evidence integrity, owner and timestamp binding, artifact bytes, approved runtime, permission ordering, and exact license, egress, and resource hashes. All actual acquisition, review, canary, permission, training, rollout, and production claims remain false in tracked evidence.
- Added an independent local-training acquisition artifact verifier that rechecks the current approval, request, toolchain pins, exact plan, and F2c.6 run before reading bounded manifests and hashing regular files inside the approved repository root.
- Added deterministic real-filesystem fixture evidence for path containment, symlink refusal, manifest pinning, file and adapter hash binding, and resource-envelope enforcement. The verifier does not treat observed files as acquisition provenance: no actual dependency installation, model download, training, external provider call, rollout, or production claim was performed.
- Added a dependency-injected local-training acquisition runtime contract that revalidates the current approval, request, toolchain decision, and exact seven-step plan before delegating to an adapter.
- Added deterministic fixture evidence for payload minimization, ordered result validation, tamper and expiry refusal, and unsupported-output blocking. Adapter-reported installation or download remains independently unverified; no dependency installation, model download, training, external provider call, rollout, or production claim was performed.
- Added a private actual-user query evaluation protocol that rejects tracked paths, symlinks, oversized inputs, and stale consent before local model execution.
- Actual-data runs now bind the Q7 v5 review-action baseline and re-read the dataset and content-free intake before every model call. Fake loopback tests prove protocol execution and mid-run withdrawal only; no actual user data was provided or evaluated, and quality, activation, training, rollout, and production claims remain unchanged.
- Added a v5 review-action generalization candidate that requires summary-only objectives to retain an evidence-bound owner and trigger when both are present.
- Replayed the same installed `qwen2.5:3b` with unchanged thresholds: Q4 remained `10/10` and the synthetic Q6 suite moved from `11/12` to `12/12`. The current answer path, training, activation, rollout, actual-user quality, and production claims remain unchanged.
- Added a cloud-disabled local user-query evaluation runner that binds the Q5 consent and de-identification intake to the exact Q4 model, runtime, v4 prompt, and unchanged quality thresholds. The synthetic 12-case replay passed 11 cases and retained one `invalid-review-action` failure, so activation and the current answer path remain unchanged.
- Kept query, evidence, expected terms, model responses, and raw error messages out of tracked Q6 evidence. Only content hashes, metrics, bounded failure taxonomy, and domain/language summaries are retained.
- Added a pure 14-case input boundary covering Unicode normalization, format controls, split-letter directives, English, Korean, Japanese, and Spanish while preserving all safe controls exactly.
- Replayed the same installed `qwen2.5:3b` and Q4 suite with v4. An initial safe `2.2` identifier regression remained failed at `9/10`; the boundary splitter and canonical evidence comparison were corrected, and the final unchanged-threshold run passed `10/10`.
- Added a content-free user-query evaluation intake contract and a 12-record synthetic dry run spanning six domains and four languages. Actual user data, training, fine-tuning submission, external transfer, provider input, activation, and production claims remain disabled.
- Added a 10-case local answer-composition robustness suite covering Q3 regression, Korean, multiple domains, bounded eight-source context, and objective/evidence prompt injection without sending evaluator terms to the model.
- Preserved the actual v2 `9/10` result and one canary match as a failed baseline, then added a deterministic instruction boundary with raw/sanitized hash and removal-count evidence.
- Replayed the same installed `qwen2.5:3b` with v3; all `10/10` cases and five scenarios passed, forbidden-term matches moved from `1` to `0`, and no quality metric regressed while answer-path activation, training, rollout, and production claims stayed disabled.
- Added an evidence-first local answer composition candidate that separates summary, source-bound claims, and reviewer action without passing required terms, golden answers, or thresholds to the model.
- Replayed the same installed `qwen2.5:3b`, retrieval results, and Q1 gate; controlled case pass improved from `0.0` to `1.0` and required-term coverage from `0.6667` to `1.0` with citation metrics unchanged.
- Bound the content-free candidate evidence to the Q2 baseline hash, model digest, fixture, prompt, cases, and thresholds while leaving the current answer path, activation, training, rollout, and production claims unchanged.
- Added a loopback-only structured Ollama answer generator and content-free evidence contract that keep Q1 required terms and golden answers out of model input.
- Evaluated the already-installed `qwen2.5:3b` against both Q1 cases without model download, trainer installation, external provider calls, or training; retrieval and citation gates passed, but required-term coverage was `0.6667` in both cases.
- Recorded the actual regression as `keep-current-answer-path` without lowering thresholds, authorizing activation, or changing the existing answer path.
- Added a content-free local-training product permission contract that binds exact fine-tuning readiness, base model, trainer, expiration, license, OS egress, resource limits, approval owner, and rollback owner without starting model training.
- Added a cost-free local-training environment preflight that verifies the installed model artifact, manifest, license metadata, F1 readiness binding, system capacity, trainer availability, and F2b governance prerequisites before any process can request training. The current evidence stops before training because the trainable source model, supported trainer, independent environment reviews, approved product permission, and rollback owner are absent.
- Added a hash-bound local-training toolchain decision packet that selects pinned MLX-LM LoRA and an immutable Apache-2.0 Qwen2.5-1.5B safetensors source for the observed Apple Silicon environment. The packet confirms the local Python, `venv`, and `uv` prerequisites while preserving explicit approval gates for installation, download, license review, acquisition egress, resource canary ownership, rollback ownership, and post-install product permission.
- Added a tamper-evident local-training acquisition request that binds the selected toolchain, a repository-relative mutable root, five required owner roles, seven ordered actions, and proposed resource caps. The tracked request remains pending review and grants no installation, download, training, rollout, external submission, or production authority.
- Added a private local-training acquisition resolution CLI that accepts one exact operator decision file, revalidates the current toolchain and request, records one content-free resolution per request under Git-ignored `var/` history, and refuses tracked or symbolic-link decision input. The CLI does not install dependencies, download models, start training, authorize rollout, or write actual owner decisions into tracked evidence.
- Added a private local-training acquisition execution-plan CLI that accepts only a current approved resolution, revalidates its exact fields, approval integrity, expiration, toolchain pins, and current request binding, then records the seven ordered actions as pending without executing them. Rejected, expired, tampered, tracked, symbolic-link, stale-request, and duplicate inputs fail before a new plan can be written.
- Connected permission request, approval, read, and revocation to the existing approval inbox, CLI, HTTP RBAC, tenant checks, gateway audit, and actual local Chromium surface while keeping raw readiness in a private session file.
- Preserved `actualModelTrainingExecuted: false`, external submission and rollout denial, and the requirement that a future training caller re-read current permission before process spawn.
- Connected verified local-user override state to the existing learning-promotion action inbox without adding a new action type, store collection, or dependency.
- Added candidate-tenant-checked HTTP set and clear routes, sanitized mutation responses, user summary counts, audit hash display, and bounded browser controls.
- Verified local HTTP and actual Chromium not-set→active→expired→cleared lifecycle while keeping external provider calls, model training, hosted tenant validation, multi-user validation, and production claims disabled.
- Aligned portfolio case study, project card, interview story, and resume bullets with completed mission/provider/action operator surface browser evidence.
- Replaced stale future screenshot wording with scoped references to `evidence/screenshots/operator-surface-*.png`, `evidence/output-artifacts/operator-surface-demo-browser-report.json`, and the remaining non-public-demo gaps.
- Added a recorded walkthrough script and smoke guard so future private/public demo video URLs can be added only after evidence, hygiene, and access checks pass.
- Added an architecture code walkthrough and symbol smoke guard so reviewers can navigate CLI/web, mission service, runtime harness, provider registry, local store, and evidence scripts from verified source paths.
- Added a provider readiness matrix and catalog smoke guard to separate adapter implementation, pilot evidence, target provider blockers, and safe multi-provider claims.
- Added a provider failure recovery demo and smoke guard to document attention remediation, fallback policy, timeline/event audit, and claim boundaries.
- Added a memory retrieval quality fixture and smoke guard to document retrieval ranking signals, source diversity, fact graph provenance, revision lifecycle, and instruction-boundary handling.
- Added a credential-free answer quality evaluator and regression fixture for retrieval hit, citation grounding, required content, irrelevant source, and reviewer verdict checks.
- Added a deterministic RAG corpus contract for memory, attachment, and fact source revision, chunk identity, content hash, scope, and provenance without changing serialized retrieval payloads.
- Added a credential-free retrieval evaluation gate for controlled precision, recall, noise, source diversity, and frozen lexical/BM25/phrase baseline comparison.
- Added a bounded local-command embedding protocol and scope-locked semantic retrieval experiment without enabling the mission runtime path.
- Added a deterministic semantic-plus-lexical reranking experiment with controlled tie quality comparison, measured local latency, and state-free baseline rollback without enabling the mission runtime path.
- Added an explicit local semantic-and-lexical mission retrieval runtime with exact lexical default parity, scope refusal, failure-before-provider behavior, and state-free configuration rollback without claiming real embedding model validation.
- Added loopback-only Ollama embedding qualification for installed qwen2.5 0.5B, 1.5B, and 3B models, recording the 3B controlled-suite quality pass while keeping activation blocked on license, egress, resource, and rollback-owner governance.
- Added a 15-case local retrieval robustness evaluation for the selected qwen2.5 3B candidate, recording hard-negative and query-variation regression and enforcing failed-keep-lexical without weakening thresholds or authorizing activation.
- Added an independent local relevance reranker evaluation using repeated structured qwen2.5 3B scoring, recording a controlled 15-case quality pass while keeping runtime activation and governance approval blocked.
- Added a local reranker resource envelope using a preflight-checked lexical top-2 shortlist, recording R8 quality parity, lower inference count and p50/p95/total latency, the loaded-model footprint, and the observed maximum-latency regression while keeping runtime activation blocked.
- Added a bounded local reranker runtime stability evaluation covering confirmed Ollama-model-absent cold state, three warm runs, and two concurrent client workers with 360 inference quality/resource parity while leaving OS cold boot, production parallelism, long-duration soak, thermal behavior, and runtime activation unproven.
- Connected the R10-bound scorer to one controlled four-role stub mission as an observation-only shadow path while preserving lexical provider input, store shape, artifacts, public contracts, and fail-open behavior.
- Replayed 3 controlled scenarios, 15 stub missions, and 60 role observations; retained the full-query 12/15 hard-negative failure as evidence, corrected the scorer query to the qualified mission-objective contract, and passed 15/15 without enabling provider input or production claims.
- Added a content-free 64-entry process-local shadow score cache with exact model, prompt, query, and document binding; the controlled replay retained 15/15 while reducing 120 score requests to 30 model inferences with 90 hits, and disclosed the observed maximum-latency regression without enabling provider input.
- Added generation-based invalidation and rollback close to the shadow score cache; an 8-entry actual replay retained 15/15 with 22 LRU evictions, while a concurrent local probe dropped a pre-invalidation stale result and closed with zero entries without enabling provider input.
- Added bounded child-process cache isolation evidence; two concurrent workers and one restarted worker each began with an empty cache, performed one local inference and one process-local hit, inherited no parent environment, and closed with zero entries without enabling provider input.
- Added forced-termination recovery and bounded cache soak evidence; a warm child exited by SIGKILL, a recovery child inferred again from an empty cache, and a 16-entry cache processed 48 unique pairs plus 16 hits within recorded heap/RSS regression limits without enabling provider input.
- Added an approved learning RAG feedback evaluation; one mission-scoped promotion changed the next retrieval, planner, and deliverable with reviewer pass preserved, then rollback removed the memory and restored exact baseline planner and deliverable hashes without external provider calls.
- Expanded approved learning feedback evaluation to three same-workspace missions and nine stub sessions; the controlled Q1 gate changed from 0/3 before promotion to 3/3 after promotion and returned to 0/3 after rollback, while every case excluded two foreign mission memories and preserved reviewer pass without external provider calls.
- Added explicit mission-to-workspace learning authorization and a controlled workspace-personalization replay; one sibling mission applied the approved decision, a foreign workspace retained zero exposure, timeline audit order was preserved, and rollback restored exact baseline artifacts without external provider calls.
- Added deterministic latest-revision selection for conflicting retrieval-selected workspace decisions; an eight-session local replay verified newer-only provider exposure, exact older fallback after revocation, exact baseline restoration after full rollback, foreign-workspace isolation, and content-free selection evidence without external provider calls.
- Added permission-bound workspace learning operator override with mandatory future expiration and audit note; an eight-session local replay verified active older selection, exact latest-revision fallback after expiry and clear, exact repin parity, foreign and unretrieved memory isolation, and content-free timeline evidence without external provider calls.
- Added a workspace learning operator surface to the existing action inbox; local HTTP and real Chromium replays verified content-free not-set, active, expired, and cleared state, tenant-checked set and clear mutations, sanitized responses, timeline history, and zero external provider calls.
- Added explicit mission-to-user learning authorization for tenant-free local workspaces and applied approved user decisions and preferences in the stub runtime; a seven-session replay verified sibling and cross-workspace failed-to-passed personalization, exact rollback parity, tenant-bound refusal, and zero external provider calls.
- Added deterministic latest-revision selection for conflicting retrieved local-user decisions; an eight-session replay across two tenant-free workspaces verified selected-only provider exposure, cross-workspace application, exact older fallback after newer revocation, exact baseline restoration after full rollback, and zero external provider calls.
- Added a permission-bound local-user learning operator override with mandatory future expiration and audit note; an eight-session replay across two tenant-free workspaces verified active older selection, cross-workspace application, exact latest-revision fallback after expiry and clear, exact repin parity, unretrieved-memory refusal, and zero external provider calls.
- Added an approved training record contract that requires reviewer pass, operator approval, promotion verification, mission-scoped artifact lineage, sanitized content checks, and deterministic hashes without authorizing external fine-tuning submission.
- Added a deterministic training dataset quality gate with content, lineage, and near-response deduplication, mission-scoped train/validation splitting, leakage checks, and content-free manifests without authorizing dataset export or fine-tuning execution.
- Added a provider-neutral fine-tuning readiness export with train/validation JSONL, Q1 answer-quality baseline binding, reviewer checklist, file digests, and rollback requirements without authorizing provider submission or training execution.
- Added a hash-bound local training runtime contract with a separate expiring approval, shell-free stdio transport, environment allowlisting, bounded input/output/timeout, content-free candidate artifact records, and deterministic failure guards without executing a model or authorizing rollout.
- Added a candidate model evaluation gate that compares fixture or recorded results against the same Q1 case set and thresholds, requires bound evidence, keeps rollout disabled, and returns keep-baseline on regression.
- Added a smoke validation summary and command guard to document the deterministic public-readiness verification baseline without expanding provider, hosted, or production claims.
- Added an external evidence blocker register and smoke guard to keep account, provider, demo URL, pilot feedback, metrics, and hosted deployment blockers explicit.

## v0.1.0 - 2026-06-23

Initial public portfolio release for the local-first Personal AI Agent harness.

Validated boundary:

- Claim: `provider-scoped pilot-ready` for an OpenAI-backed local-first/self-hosted path.
- `productionReadyClaim: false` remains in release evidence.
- The project is not all-provider-complete and is not a hosted SaaS product.
- There is no public hosted demo URL; the current demo is a credential-free recorded local replay and evidence package.

Public release artifact:

- Release: [v0.1.0](https://github.com/sungjin9288/personal-ai-agent/releases/tag/v0.1.0)
- Asset: `personal_ai_agent_portfolio_pack.zip`
- Size and SHA-256 are tracked in the repository root `portfolio_manifest.md` after the ZIP is generated.

Included public surfaces:

- Professional README with scoped portfolio overview, representative demo preview, setup, testing, release evidence, and limitations.
- Credential-free `npm run doctor` diagnostics for local setup, required file/script checks, provider configuration status, and `.env.example` coverage.
- Credential-free `/api/doctor` and operator console local diagnostics summary backed by `npm run smoke:ui-doctor-surface`.
- Credential-free `npm run demo:local` replay path.
- Demo evidence index, preview screenshot, replay log, summary JSON, and browser E2E evidence references.
- `.env.example` and `smoke:env-example` for local provider/runtime configuration onboarding.
- `CONTRIBUTING.md`, fork onboarding guide, `SECURITY.md`, `SUPPORT.md`, and GitHub issue templates.
- `smoke:support-policy` for setup, provider configuration, release evidence, and public issue safety routing.
- Provider smoke CI gates for fallback, attention remediation, provider events, provider overview, target provider operations, release hygiene, and public onboarding checks.
- Manifest-only pilot export package and release artifact hygiene checks.

Verification baseline:

```bash
npm run package:pilot-export
npm run smoke:doctor
npm run smoke:ui-doctor-surface
npm run smoke:changelog
npm run smoke:portfolio-zip
npm run smoke:contributor-onboarding
npm run smoke:env-example
npm run smoke:demo-local
npm run smoke:demo-evidence-index
npm run smoke:readme-portfolio-overview
npm run smoke:portfolio-docs-claim-boundary
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```
