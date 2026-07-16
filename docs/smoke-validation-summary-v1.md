# Smoke Validation Summary v1

- status: smoke-validation-summary-current
- localDate: 2026-06-23
- productionReadyClaim: false
- allProviderComplete: false
- publicHostedDemoUrl: none
- verificationMode: deterministic local smoke summary
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
| Approved training record | `npm run smoke:approved-training-record` | Verifies actual local approval lifecycle, reviewer and artifact lineage, sanitized example safety checks, deterministic hashes, accepted-risk governance, and externalSubmissionAuthorized=false boundary |
| Training dataset quality gate | `npm run smoke:training-dataset-quality` | Verifies deterministic content, lineage, and near-response deduplication, mission-scoped train/validation split, leakage checks, content-free manifest, and fineTuningExecutionAuthorized=false boundary |
| Fine-tuning readiness export | `npm run smoke:fine-tuning-readiness` | Verifies provider-neutral train/validation JSONL, dataset and Q1 baseline binding, reviewer-pending evaluation manifest, file replay, and externalSubmissionAuthorized=false boundary |
| Candidate model evaluation gate | `npm run smoke:candidate-model-evaluation` | Verifies same-suite fixture candidate comparison, evidence binding, pass and regression decisions, keep-baseline rollback, and activationAuthorized=false boundary |
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
npm run smoke:approved-training-record
npm run smoke:training-dataset-quality
npm run smoke:fine-tuning-readiness
npm run smoke:candidate-model-evaluation
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
