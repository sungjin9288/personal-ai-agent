# Smoke Validation Summary v1

- status: smoke-validation-summary-current
- localDate: 2026-07-17
- productionReadyClaim: false
- allProviderComplete: false
- publicHostedDemoUrl: none
- verificationMode: deterministic local smoke summary
- lastFullSweep: 216/216 passed with `npm run smoke:all` on 2026-07-17
- relatedDemoEvidenceIndex: [demo-evidence-index-v1.md](demo-evidence-index-v1.md)
- relatedProviderReadinessMatrix: [provider-readiness-matrix-v1.md](provider-readiness-matrix-v1.md)
- relatedProviderFailureRecoveryDemo: [provider-failure-recovery-demo-v1.md](provider-failure-recovery-demo-v1.md)
- relatedMemoryRetrievalQualityFixture: [memory-retrieval-quality-fixture-v1.md](memory-retrieval-quality-fixture-v1.md)
- relatedMlRagDevelopmentPlan: [ml-rag-development-plan-v1.md](ml-rag-development-plan-v1.md)
- relatedPilotExportPackage: [pilot-export-package-v1.md](pilot-export-package-v1.md)

## Purpose

This summary gives reviewers one stable index for the core smoke commands used to support the README and portfolio claims. It is intentionally command-based: each row names the exact command that must pass before the related claim is used.

The safe claim is that the local deterministic verification suite passes for the documented local-first pilot and portfolio evidence boundary. This is not live all-provider validation, not hosted SaaS validation, and not production readiness evidence.

## Core Verification Matrix

| Area | Command | Evidence boundary |
|---|---|---|
| Pilot export package | `npm run package:pilot-export` | Regenerates the manifest-only pilot export package with repository-relative paths |
| Doctor diagnostics | `npm run smoke:doctor` | Verifies local setup diagnostics and required files/scripts |
| Web doctor surface | `npm run smoke:ui-doctor-surface` | Verifies the local web diagnostics surface without a hosted URL |
| Changelog metadata | `npm run smoke:changelog` | Verifies current release artifact size and SHA-256 references |
| Support policy | `npm run smoke:support-policy` | Verifies public support boundary and issue routing |
| Contributor onboarding | `npm run smoke:contributor-onboarding` | Verifies fork/onboarding guidance and non-hosted-demo boundaries |
| Environment example | `npm run smoke:env-example` | Verifies documented environment keys remain aligned |
| Local demo replay | `npm run smoke:demo-local` | Verifies the credential-free local replay command plan |
| Demo evidence index | `npm run smoke:demo-evidence-index` | Verifies replay log, summary, screenshot, and browser report references |
| Recorded walkthrough | `npm run smoke:recorded-walkthrough` | Verifies recording script readiness and no-hosted-demo boundary |
| Architecture walkthrough | `npm run smoke:architecture-code-walkthrough` | Verifies code walkthrough symbols and source paths |
| Provider readiness | `npm run smoke:provider-readiness-matrix` | Verifies provider catalog, env keys, blockers, and safe claim boundary |
| Provider recovery | `npm run smoke:provider-failure-recovery-demo` | Verifies fallback/remediation demo linkage and claim boundary |
| Memory quality fixture | `npm run smoke:memory-retrieval-quality-fixture` | Verifies retrieval ranking, fact graph provenance, and instruction-boundary fixture linkage |
| Answer quality evaluation | `npm run smoke:answer-quality-evaluation` | Verifies credential-free retrieval, citation, required-content, and reviewer regression gates |
| Retrieval corpus contract | `npm run smoke:retrieval-corpus-contract` | Verifies deterministic memory, attachment, and fact corpus identity, revision, scope, hash, and provenance |
| Retrieval quality evaluation | `npm run smoke:retrieval-quality-evaluation` | Verifies controlled precision, recall, noise, source diversity, frozen baseline replay, and candidate regression rejection |
| Semantic retrieval experiment | `npm run smoke:semantic-retrieval-experiment` | Verifies bounded local embedding protocol, scope lock, controlled synonym comparison, and runtimeActivation=false boundary |
| Retrieval reranking experiment | `npm run smoke:retrieval-reranking-experiment` | Verifies deterministic semantic+lexical scoring, controlled tie quality comparison, measured local latency, exact rollback order, and runtimeActivation=false boundary |
| Local semantic retrieval runtime | `npm run smoke:semantic-retrieval-runtime` | Verifies default lexical parity, explicit local opt-in, mission scope lock, semantic+lexical selection, failure-before-provider, and state-free rollback |
| Local embedding model qualification | `npm run smoke:local-embedding-model-qualification` | Verifies recorded actual qwen2.5 comparison integrity, 3B controlled-suite quality pass, governance blockers, activationAuthorized=false, and lexical rollback |
| Local retrieval robustness | `npm run smoke:local-retrieval-robustness` | Verifies recorded 15-case query variation coverage, selected model binding, hard-negative regression, content-free integrity, and failed-keep-lexical decision |
| Local relevance reranker | `npm run smoke:local-relevance-reranker` | Verifies independent pair scoring, repeated score stability, 15-case and hard-negative pass, content-free evidence, and governance-blocked activation |
| Local reranker resource envelope | `npm run smoke:local-reranker-resource-envelope` | Verifies top-2 expected-source preflight, R8 quality parity, inference and p50/p95/total reduction, loaded-model footprint, maximum regression disclosure, and governance-blocked activation |
| Local reranker runtime stability | `npm run smoke:local-reranker-runtime-stability` | Verifies cold 1, warm 3, concurrent client worker 2, 360 inference quality/resource parity, bounded latency gates, and explicit production parallelism, long-soak, and thermal limitations |
| Local relevance shadow integration | `npm run smoke:local-relevance-shadow-integration` | Verifies four-role stub mission observation, exact lexical provider input preservation, content-free evidence, store isolation, and scorer-failure fail-open |
| Multi-scenario shadow replay | `npm run smoke:local-relevance-shadow-replay` | Verifies 3 scenarios, 15 stub missions, 60 role observations, retained full-query hard-negative failure, mission-objective query correction, content-free evidence, and inactive provider path |
| Bounded shadow score cache | `npm run smoke:local-relevance-shadow-cache` | Verifies exact model·prompt·query·document binding, 64-entry process-local LRU, 120 requests to 30 model inferences, 90 hits, 15/15 quality parity, content-free entries, maximum-latency regression disclosure, and inactive provider path |
| Shadow cache lifecycle stress | `npm run smoke:local-relevance-shadow-cache-lifecycle` | Verifies 8-entry actual eviction, 22 LRU removals, 15/15 quality parity, concurrent in-flight join, generation invalidation, stale-result drop, fresh refill, rollback close, content-free evidence, and inactive provider path |
| Shadow cache process isolation | `npm run smoke:local-relevance-shadow-cache-process-isolation` | Verifies two concurrent child processes and one restarted process each begin with an empty cache, perform one inference and one local hit, retain distinct process identity, inherit no parent environment, close with zero entries, and keep provider activation blocked |
| Shadow cache termination and soak | `npm run smoke:local-relevance-shadow-cache-termination-soak` | Verifies warm-before-kill state, observed SIGKILL, cold recovery inference and score parity, exact 48-pair/16-entry soak metrics, heap/RSS regression limits, content-free evidence, and blocked provider activation |
| Approved learning RAG feedback | `npm run smoke:approved-learning-rag-feedback` | Verifies explicit mission-memory approval, retrieval source and content-hash lineage, planner/deliverable adaptation, reviewer pass, rollback deletion, exact baseline artifact parity, and no external provider call |
| Multi-scenario learning feedback quality | `npm run smoke:approved-learning-feedback-quality` | Verifies three same-workspace mission feedback loops, Q1 case pass 0/3 to 3/3 to 0/3, two foreign-memory exclusions per promoted case, nine distinct sessions, reviewer pass, content-free evidence, and exact rollback parity |
| Workspace learning personalization | `npm run smoke:workspace-learning-personalization` | Verifies explicit mission-to-workspace authorization, sibling application, foreign-workspace isolation, seven distinct sessions, timeline audit ordering, content-free evidence, and exact rollback parity |
| Workspace learning conflict and revocation | `npm run smoke:workspace-learning-conflict-revocation` | Verifies latest-revision selection from two retrieved workspace decisions, selected-only provider exposure, exact older fallback after newer revocation, exact baseline restoration after full rollback, foreign-workspace isolation, eight distinct sessions, and content-free evidence |
| Workspace learning operator override | `npm run smoke:workspace-learning-operator-override` | Verifies verified-promotion permission evidence, future expiration, CLI set, service repin and clear, retrieved-only authority, exact latest fallback, foreign isolation, timeline order, eight distinct sessions, and content-free evidence |
| Workspace learning operator surface | `npm run smoke:workspace-learning-operator-surface` | Verifies hash-bound Chromium evidence, content-free state, tenant-checked HTTP set and clear routes, sanitized response guards, active·expired·cleared UI lifecycle, and productionReadyClaim=false |
| Local user learning personalization | `npm run smoke:local-user-learning-personalization` | Verifies explicit mission-to-user authorization, tenant-bound refusal, sibling and cross-workspace user decision application, seven distinct local stub sessions, content-free audit lineage, and exact rollback parity |
| User learning conflict and revocation | `npm run smoke:user-learning-conflict-revocation` | Verifies latest-revision selection from two retrieved local-user decisions, selected-only provider exposure in two workspaces, exact older fallback after newer revocation, full baseline restoration, eight distinct sessions, and content-free evidence |
| User learning operator override | `npm run smoke:user-learning-operator-override` | Verifies permission-complete tenant-free source promotion, CLI set, service repin and clear, retrieved-only authority, cross-workspace older selection, exact latest fallback after expiry and clear, timeline order, eight distinct sessions, and content-free evidence |
| User learning operator surface | `npm run smoke:user-learning-operator-surface` | Verifies hash-bound Chromium evidence, content-free user state, candidate-tenant-checked HTTP set and clear routes, sanitized responses, active·expired·cleared UI lifecycle, and productionReadyClaim=false |
| Approved training record | `npm run smoke:approved-training-record` | Verifies actual local approval lifecycle, reviewer and artifact lineage, sanitized example safety checks, deterministic hashes, accepted-risk governance, and externalSubmissionAuthorized=false boundary |
| Training dataset quality gate | `npm run smoke:training-dataset-quality` | Verifies deterministic content, lineage, and near-response deduplication, mission-scoped train/validation split, leakage checks, content-free manifest, and fineTuningExecutionAuthorized=false boundary |
| Fine-tuning readiness export | `npm run smoke:fine-tuning-readiness` | Verifies provider-neutral train/validation JSONL, dataset and Q1 baseline binding, reviewer-pending evaluation manifest, file replay, and externalSubmissionAuthorized=false boundary |
| Local training runtime contract | `npm run smoke:local-training-runtime` | Verifies exact F1 and expiring approval binding, current permission and post-acquisition admission revalidation before spawn, shell-free local stdio, secret environment filtering, input/output/timeout bounds, strict content-free candidate output, store invariance, and actualModelTrainingExecuted=false boundary |
| Local training product permission surface | `npm run smoke:local-training-permission-surface` | Verifies CLI request, action inbox aggregation, approver-only HTTP approval and revocation, tenant isolation, ordered gateway audit, private readiness storage, and actualModelTrainingExecuted=false boundary |
| Local training permission evidence | `npm run smoke:local-training-permission-evidence` | Verifies the tracked content-free replay hash, actual Chromium screenshot hash, zero browser console errors, and productionReadyClaim=false boundary |
| Local training environment preflight | `npm run smoke:local-training-environment-preflight` | Verifies current local GGUF, manifest, license metadata, F1 readiness, system capacity, supported trainer, product permission, independent review, and rollback-owner checks; enforces the seven current blockers and actualModelTrainingExecuted=false boundary |
| Local training toolchain decision | `npm run smoke:local-training-toolchain-decision` | Verifies immutable MLX-LM and Qwen source revisions, Apple Silicon·Python·uv prerequisites, LoRA/chat JSONL/offline selection, seven explicit acquisition approvals, and no install, download, training, or rollout boundary |
| Local training acquisition request | `npm run smoke:local-training-acquisition-request` | Verifies exact F2c.2 binding, request integrity, five owner roles, seven ordered actions, repository-relative mutable root, proposed-not-measured resource caps, and no acquisition, install, download, training, rollout, or external submission authority |
| Local training acquisition resolution | `npm run smoke:local-training-acquisition-resolution` | Verifies exact private decision fields, tracked and symbolic-link refusal, current toolchain and request revalidation, one content-free private resolution per request, acquisition-only approval, and no install, download, training, rollout, or external submission execution |
| Local training acquisition execution plan | `npm run smoke:local-training-acquisition-execution-plan` | Verifies approved private resolution input, exact fields, approval integrity, expiry, current request and toolchain binding, seven ordered pending actions, 0600 private output, and no installation, download, training, rollout, or external submission execution |
| Local training acquisition runtime contract | `npm run smoke:local-training-acquisition-runtime` | Verifies current approval·request·toolchain·exact plan binding, content-free adapter input, ordered result validation, tamper·expiry·stale·unsupported-output refusal, independently unverified adapter reports, and no actual installation, download, training, external call, or rollout |
| Local training acquisition artifact verification | `npm run smoke:local-training-acquisition-artifact-verification` | Verifies current authority and run binding, approved-root containment, regular-file and symlink guards, exact manifest pins, streamed file hashes, adapter artifact-set binding, resource limits, content-free fixture evidence, and no actual acquisition provenance, installation, download, training, external call, or rollout |
| Local training post-acquisition readiness | `npm run smoke:local-training-post-acquisition-readiness` | Verifies fixture-only provenance, egress closure, offline artifact resource canary, and post-review product permission evidence binding while keeping all actual gates, training, external submission, rollout, and production claims false |
| Local training candidate artifact verification | `npm run smoke:local-training-candidate-artifact-verification` | Verifies fixed candidate-root containment, complete manifest inventory, regular-file and symlink guards, streamed SHA-256, F2c.9 run binding, current permission disk envelope, content-free evidence, and false actual-training, evaluation, rollout, and production claims |
| Local candidate evaluation admission | `npm run smoke:local-candidate-evaluation-admission` | Verifies recorded artifact verification, current permission, explicit no-revocation, exact F1 suite bytes and case·threshold binding, current CPU·memory·disk·runtime envelope, bounded request window, content-free operator metadata, local-evaluation-only authority, and false actual-evaluation, training, rollout, and production claims |
| Local candidate evaluation runtime | `npm run smoke:local-candidate-evaluation-runtime` | Verifies current authority revalidation, manifest-listed candidate snapshot, exact suite bytes, pre/post input hashes, cleanup-before-evidence, evaluator identity, allowlisted local stdio, bounded time and I/O, canonical content-free quality summary, O1a run lineage, fixture-only execution, caller-owned executable provenance and OS resource·network isolation, and blocked training, rollout, and production claims |
| Local candidate evaluation input view | `npm run smoke:local-candidate-evaluation-input-view` | Verifies the F2c.13 exact-suite-byte binding, bounded read-only temporary candidate view, source-workspace exclusion, post-execution candidate and suite verification, content-free run record, cleanup completion, and false production claim |
| F2c.14 Evaluator bundle provenance | `npm run smoke:local-candidate-evaluator-provenance` | Verifies request·admission-bound executable SHA-256 and static ESM module·resource inventory, snapshot entry execution, pre/post source and snapshot verification, content-free run hashes, and the caller-owned OS isolation boundary |
| F2c.15 Pre-spawn workspace recovery | `npm run smoke:local-candidate-evaluation-workspace-recovery` | Verifies owner-only namespace and exact leases, current-authority-first ordering, `expired + dead PID + preparing` recovery, active·unknown·spawning·unsafe preservation, atomic claim resume, bounded deletion, and false post-spawn cleanup and production claims |
| F2c.16 Post-spawn evaluator process lifecycle | `npm run smoke:local-candidate-evaluation-process-lifecycle` | Verifies detached POSIX process groups, bounded-failure descendant termination, close and group-absence proof before cleanup, no late signal after leader close, content-free run v5 lifecycle binding, and fail-closed workspace preservation |
| Candidate model evaluation gate | `npm run smoke:candidate-model-evaluation` | Verifies same-suite fixture candidate comparison, evidence binding, pass and regression decisions, keep-baseline rollback, and activationAuthorized=false boundary |
| Actual local answer-quality baseline | `npm run smoke:local-answer-quality-baseline` | Verifies actual installed qwen2.5:3b Q1 evidence integrity, content-free observations, required-term regression, keep-current decision, and no training or activation authority |
| Evidence-first answer composition candidate | `npm run smoke:local-answer-composition-candidate` | Verifies same-model Q1 improvement, source-complete claims, reviewer action, baseline and prompt binding, content-free evidence, unchanged answer path, and blocked activation |
| Answer composition robustness baseline | `npm run smoke:local-answer-composition-robustness` | Verifies same-model 10-case expansion, actual 9/10 failure, one canary match, content-free evidence, keep-current decision, and blocked activation |
| Answer composition robustness hardening | `npm run smoke:local-answer-composition-hardening` | Verifies deterministic instruction removal, raw/sanitized hash binding, 10/10 case pass, canary 1→0, no metric regression, unchanged answer path, and blocked activation |
| Answer input boundary | `npm run smoke:answer-input-boundary` | Verifies 7 Unicode·multilingual·split-letter attacks and 7 safe controls, exact preservation, content-free evidence, and no actual user data |
| Answer composition boundary regression | `npm run smoke:local-answer-composition-boundary-regression` | Verifies the same installed model and Q4 suite retain 10/10 after safe identifier correction, with unchanged thresholds, answer path, and activation |
| User-query evaluation intake | `npm run smoke:user-query-evaluation-intake` | Verifies synthetic consent, de-identification, retention, six-domain and four-language coverage without raw query storage, training, or provider-input authority |
| Local user-query quality | `npm run smoke:local-user-query-quality` | Verifies the exact local model/runtime/prompt/intake binding, 11/12 synthetic stop condition, bounded `invalid-review-action` evidence, raw-content exclusion, and unchanged answer path |
| Reviewer action generalization | `npm run smoke:local-answer-review-action-generalization` | Verifies v5 prompt binding, Q4 10/10 parity, synthetic Q6 12/12, content-free evidence, unchanged thresholds, and no answer-path activation |
| Actual user-query evaluation readiness | `npm run smoke:actual-user-query-evaluation-readiness` | Verifies private-path intake, tracked-path refusal, Q7 v5 selection, per-case authorization reload, withdrawal fail-closed, and unchanged actual-data and activation claims |
| README overview | `npm run smoke:readme-portfolio-overview` | Verifies README public-readiness command list and portfolio overview order |
| External evidence blockers | `npm run smoke:external-evidence-blockers` | Verifies external account, provider, demo URL, pilot feedback, metrics, and hosted deployment blockers remain explicit |
| Portfolio claim boundary | `npm run smoke:portfolio-docs-claim-boundary` | Verifies portfolio docs do not overclaim unsupported capabilities |
| Representative demo evidence | `npm run smoke:representative-demo-evidence` | Verifies representative demo summary and evidence artifacts |
| Operator surface evidence | `npm run smoke:operator-surface-demo-evidence` | Verifies mission/provider/action browser evidence map |
| Pilot export validation | `npm run smoke:pilot-export-package` | Verifies pilot export package file list, hashes, and claim boundary |
| Portfolio ZIP | `npm run smoke:portfolio-zip` | Verifies ZIP integrity, required entries, metadata, and hygiene safety |
| Release artifact hygiene | `npm run smoke:release-artifact-hygiene` | Verifies release artifacts have zero secret and machine-local path findings |

## Replay Block

```bash
npm run package:pilot-export
npm run smoke:doctor
npm run smoke:ui-doctor-surface
npm run smoke:changelog
npm run smoke:support-policy
npm run smoke:contributor-onboarding
npm run smoke:env-example
npm run smoke:demo-local
npm run smoke:demo-evidence-index
npm run smoke:recorded-walkthrough
npm run smoke:architecture-code-walkthrough
npm run smoke:provider-readiness-matrix
npm run smoke:provider-failure-recovery-demo
npm run smoke:memory-retrieval-quality-fixture
npm run smoke:answer-quality-evaluation
npm run smoke:retrieval-corpus-contract
npm run smoke:retrieval-quality-evaluation
npm run smoke:semantic-retrieval-experiment
npm run smoke:retrieval-reranking-experiment
npm run smoke:semantic-retrieval-runtime
npm run smoke:local-embedding-model-qualification
npm run smoke:local-retrieval-robustness
npm run smoke:local-relevance-reranker
npm run smoke:local-reranker-resource-envelope
npm run smoke:local-reranker-runtime-stability
npm run smoke:local-relevance-shadow-integration
npm run smoke:local-relevance-shadow-replay
npm run smoke:local-relevance-shadow-cache
npm run smoke:local-relevance-shadow-cache-lifecycle
npm run smoke:local-relevance-shadow-cache-process-isolation
npm run smoke:local-relevance-shadow-cache-termination-soak
npm run smoke:approved-learning-rag-feedback
npm run smoke:approved-learning-feedback-quality
npm run smoke:workspace-learning-personalization
npm run smoke:workspace-learning-conflict-revocation
npm run smoke:workspace-learning-operator-override
npm run smoke:workspace-learning-operator-surface
npm run smoke:local-user-learning-personalization
npm run smoke:user-learning-conflict-revocation
npm run smoke:user-learning-operator-override
npm run smoke:user-learning-operator-surface
npm run smoke:approved-training-record
npm run smoke:training-dataset-quality
npm run smoke:fine-tuning-readiness
npm run smoke:local-training-runtime
npm run smoke:local-training-permission-surface
npm run smoke:local-training-permission-evidence
npm run smoke:local-training-environment-preflight
npm run smoke:local-training-toolchain-decision
npm run smoke:local-training-acquisition-request
npm run smoke:local-training-acquisition-resolution
npm run smoke:local-training-acquisition-execution-plan
npm run smoke:local-training-acquisition-runtime
npm run smoke:local-training-acquisition-artifact-verification
npm run smoke:local-training-post-acquisition-readiness
npm run smoke:local-training-candidate-artifact-verification
npm run smoke:local-candidate-evaluation-admission
npm run smoke:local-candidate-evaluation-runtime
npm run smoke:local-candidate-evaluation-input-view
npm run smoke:local-candidate-evaluation-workspace-recovery
npm run smoke:local-candidate-evaluation-process-lifecycle
npm run smoke:local-candidate-evaluator-provenance
npm run smoke:candidate-model-evaluation
npm run smoke:local-answer-quality-baseline
npm run smoke:local-answer-composition-candidate
npm run smoke:local-answer-composition-robustness
npm run smoke:local-answer-composition-hardening
npm run smoke:answer-input-boundary
npm run smoke:local-answer-composition-boundary-regression
npm run smoke:user-query-evaluation-intake
npm run smoke:local-user-query-quality
npm run smoke:local-answer-review-action-generalization
npm run smoke:actual-user-query-evaluation-readiness
npm run smoke:smoke-validation-summary
npm run smoke:external-evidence-blockers
npm run smoke:readme-portfolio-overview
npm run smoke:portfolio-docs-claim-boundary
npm run smoke:representative-demo-evidence
npm run smoke:operator-surface-demo-evidence
npm run smoke:pilot-export-package
npm run smoke:portfolio-zip
npm run smoke:release-artifact-hygiene
```

## Safe Claim Boundary

Safe to claim:

- The listed deterministic local smoke commands are the public-readiness verification baseline.
- The smoke summary supports a local-first, provider-scoped pilot evidence boundary.
- Artifact hygiene covers the current release documentation and execution snapshot references.
- Portfolio ZIP metadata is checked by command, not copied by hand.

Do not claim:

- All providers are live validated.
- Hosted SaaS validation is complete.
- Production readiness is approved.
- External pilot feedback or customer metrics are proven.
- Anthropic, Hermes, or target local provider production readiness is complete.

## Acceptance Rule

This summary is current only when `npm run smoke:smoke-validation-summary`, `npm run smoke:readme-portfolio-overview`, `npm run smoke:portfolio-zip`, and `npm run smoke:release-artifact-hygiene` pass, and the README public-readiness command list contains every command in the replay block above.
