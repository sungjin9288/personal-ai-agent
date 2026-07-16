# Evidence Gallery

## 1. CLI Evidence

| Evidence | File | What It Shows |
|---|---|---|
| Base smoke | `evidence/cli-logs/npm-run-smoke.log` | local smoke flow, generated mission ids, approval id, `exit_code=0` |
| Bootstrap mission run | `evidence/cli-logs/bootstrap-local-runtime.log` | mission/session creation, stub provider run, reviewer pass, artifact ids |
| Mission show | `evidence/cli-logs/mission-show-runtime.log` | mission read model after run completion |
| Session show | `evidence/cli-logs/session-show-runtime.log` | completed session lifecycle and persisted agent run ids |
| Approval inbox | `evidence/cli-logs/approval-inbox-runtime.log` | action/approval surface can be queried for pending operator decisions |
| Learning promotion gate | `evidence/cli-logs/learning-promotions-runtime.log` | human-approver review gate for generated learning candidate |
| Execution preflight boundary | `evidence/cli-logs/execution-preflight-approval-runtime.log` | direct execution intentionally blocked for knowledge-mode mission |
| Provider adapter structure | `evidence/cli-logs/provider-adapter-structure.log` | provider adapter exports, catalog fields, registry flow |
| Provider list | `evidence/cli-logs/provider-list.log` | provider registry exposes implemented provider metadata |
| Global overview | `evidence/cli-logs/overview-global.log` | local runtime read model can summarize workspaces/missions |
| Hermes blocker handoff | `evidence/cli-logs/release-blockers-hermes.log` | provider production blockers are explicit rather than hidden |
| Representative release demo replay | `evidence/cli-logs/representative-release-demo-replay.log` | credential-free demo replay for status, snapshot, handoff, hygiene, and pilot export |
| Operator surface support map | `docs/operator-surface-demo-evidence-v1.md` | mission/provider/action evidence map for portfolio follow-up questions |

## 2. API Evidence

| Evidence | File | What It Shows |
|---|---|---|
| Health endpoint | `evidence/api-responses/api-health.json` | local web server health and runtime status |
| Meta endpoint | `evidence/api-responses/api-meta.json` | auth/RBAC/tenant mode metadata |
| Providers endpoint | `evidence/api-responses/api-providers.json` | provider readiness and configuration metadata without secret values |
| Execution v1 status | `evidence/api-responses/api-execution-v1-status.json` | release/evidence status surface |

## 3. Screenshot Evidence

| Evidence | File | What It Shows |
|---|---|---|
| Operator console home | `evidence/screenshots/operator-console-home.png` | local web operator console loaded through Playwright |
| Representative release demo preview | `evidence/screenshots/representative-release-demo-preview.png` | compact release readiness preview for README and portfolio review |
| Representative release demo status | `evidence/screenshots/representative-release-demo-release-status.png` | release readiness walkthrough final browser state |
| Operator mission run | `evidence/screenshots/operator-surface-mission-run.png` | selected mission run surface with session, execution, and artifact state |
| Operator provider readiness | `evidence/screenshots/operator-surface-provider-readiness.png` | provider readiness cards and fallback event audit surface |
| Operator action inbox | `evidence/screenshots/operator-surface-action-inbox.png` | action inbox follow-up item, approval state, and review readiness surface |

## 4. Architecture Evidence

| Evidence | File | What It Shows |
|---|---|---|
| Current architecture | `evidence/architecture/current-architecture.mmd` | CLI/web/service/harness/provider/store relationship |
| Mission run sequence | `evidence/architecture/mission-run-sequence.mmd` | mission execution flow from operator to provider and store |
| Provider adapter structure | `evidence/architecture/provider-adapter-structure.mmd` | provider catalog and adapter registry relationship |
| Architecture code walkthrough | `docs/architecture-code-walkthrough-v1.md` | code-level path through CLI, web API, mission service, runtime harness, provider registry, store, and smoke evidence |
| Provider readiness matrix | `docs/provider-readiness-matrix-v1.md` | provider adapter implementation, required env, current blocker state, safe claim boundary, and next verification commands |
| Provider failure recovery demo | `docs/provider-failure-recovery-demo-v1.md` | provider execution failure, attention remediation, fallback policy, timeline/event audit, and claim boundary |
| Memory retrieval quality fixture | `docs/memory-retrieval-quality-fixture-v1.md` | retrieval ranking signals, source diversity, fact graph provenance, revision lifecycle, and instruction-boundary fixture |
| Answer quality evaluation foundation | `docs/ml-rag-development-plan-v1.md` | credential-free retrieval hit, citation grounding, required-content, and reviewer regression gate |
| RAG corpus contract | `src/core/retrieval-corpus.mjs` | deterministic memory, attachment, and fact source revision, chunk identity, content hash, scope, and provenance |
| Retrieval quality evaluation | `docs/ml-rag-development-plan-v1.md` | controlled precision, recall, noise, source diversity, frozen baseline replay, and ranking regression gate |
| Semantic retrieval experiment | `docs/ml-rag-development-plan-v1.md` | bounded local embedding command protocol, scope-locked cosine experiment, controlled synonym comparison, and inactive runtime boundary |
| Retrieval reranking experiment | `docs/ml-rag-development-plan-v1.md` | deterministic semantic+lexical scoring, controlled tie quality comparison, measured local latency, exact baseline rollback order, and inactive runtime boundary |
| Local semantic retrieval runtime | `docs/ml-rag-development-plan-v1.md` | explicit local-command mission opt-in, exact lexical default parity, scope refusal, failure-before-provider, and state-free rollback without real-model validation claims |
| Local embedding model qualification | `evidence/output-artifacts/local-embedding-model-qualification.json` | actual installed qwen2.5 0.5B·1.5B·3B same-suite comparison, model and license hashes, 3B quality pass, and governance-blocked activation |
| Local retrieval robustness | `evidence/output-artifacts/local-retrieval-robustness.json` | selected qwen2.5 3B model binding, 15-case query variation results, hard-negative failures, and failed-keep-lexical decision |
| Local relevance reranker | `evidence/output-artifacts/local-relevance-reranker-evaluation.json` | independent source scoring, repeat stability, 15-case and hard-negative quality pass, prior evidence binding, and governance-blocked activation |
| Local reranker resource envelope | `evidence/output-artifacts/local-reranker-resource-envelope.json` | lexical top-2 preflight, R8 quality parity, repeated latency and inference reduction, loaded-model footprint, maximum regression disclosure, and governance-blocked activation |
| Local reranker runtime stability | `evidence/output-artifacts/local-reranker-runtime-stability.json` | confirmed Ollama-model-absent cold state, three warm runs, two concurrent client workers, 360 inference quality/resource parity, bounded latency gates, and explicit OS cold boot·production parallelism·long soak·thermal limitations |
| Approved training record | `docs/ml-rag-development-plan-v1.md` | actual local approval lifecycle, reviewer and artifact lineage, sanitized example safety checks, deterministic hashes, accepted-risk governance, and no external submission authority |
| Training dataset quality gate | `docs/ml-rag-development-plan-v1.md` | deterministic content, lineage, and near-response deduplication, mission-scoped train/validation split, leakage checks, content-free manifest, and no fine-tuning execution authority |
| Fine-tuning readiness export | `docs/ml-rag-development-plan-v1.md` | provider-neutral train/validation JSONL, Q1 baseline binding, content-free evaluation manifest, reviewer and rollback requirements, and no provider submission authority |
| Candidate model evaluation gate | `docs/ml-rag-development-plan-v1.md` | same-case and threshold quality comparison, candidate evidence binding, fixture and recorded result distinction, regression rollback, and blocked rollout authority |
| Smoke validation summary | `docs/smoke-validation-summary-v1.md` | core public-readiness command list, replay block, and claim boundary for deterministic local verification |
| External evidence blockers | `docs/external-evidence-blockers-v1.md` | external account, provider, demo URL, pilot feedback, metrics, hosted deployment blocker register |

## 5. Output Artifact Evidence

| Evidence | File | What It Shows |
|---|---|---|
| Execution evidence | `evidence/output-artifacts/execution-v1-evidence.md` | existing execution-v1 verification evidence |
| Execution handoff | `evidence/output-artifacts/execution-v1-handoff.md` | existing operator handoff summary |
| Release readiness | `evidence/output-artifacts/release-readiness-v1.md` | pilot-ready boundary and production blockers |
| Runtime mission artifacts | `evidence/output-artifacts/runtime-mission-artifact-list.log` | prompt, plan, deliverable, reviewer, and learning candidate artifacts created by one mission run |
| Representative release demo summary | `evidence/output-artifacts/representative-release-demo-summary.json` | command list, commit, screenshot hash, and productionReadyClaim=false boundary for the representative demo |
| Representative release demo browser report | `evidence/output-artifacts/representative-release-demo-browser-e2e.json` | sanitized browser E2E report copied from the representative demo walkthrough |
| Operator surface demo browser report | `evidence/output-artifacts/operator-surface-demo-browser-report.json` | screenshot paths, dimensions, hashes, active UI states, provider count, and action item count for mission/provider/action surfaces |

## 6. Portfolio Usage Notes

- Use CLI/API/screenshot evidence to support “implemented local-first agent harness” claims.
- Use `docs/operator-surface-demo-evidence-v1.md` to connect mission/provider/action support evidence to the representative demo without implying a public hosted demo.
- Use `docs/architecture-code-walkthrough-v1.md` to explain the implementation path from CLI/web entrypoints to mission service, runtime harness, provider registry, local store, and evidence scripts.
- Use `docs/provider-readiness-matrix-v1.md` to separate adapter support, local pilot evidence, target provider evidence, and blocked provider claims.
- Use `docs/provider-failure-recovery-demo-v1.md` to explain provider failure recovery through attention actions, fallback policy, and auditable event timelines without implying all-provider live validation.
- Use `docs/memory-retrieval-quality-fixture-v1.md` to explain retrieval ranking, memory/fact provenance, and untrusted context boundaries without claiming benchmarked retrieval accuracy.
- Use `docs/smoke-validation-summary-v1.md` to cite the current deterministic public-readiness command set without implying hosted SaaS, production, or all-provider live validation.
- Use `docs/external-evidence-blockers-v1.md` to explain why Anthropic, Hermes, target local provider, demo URL, pilot feedback, metrics, and hosted deployment claims remain blocked until external evidence exists.
- Use release blocker evidence to avoid risky claims such as production-ready, hosted SaaS ready, or all-provider live validated.
- Use architecture diagrams in interviews to explain how CLI/web, mission service, runtime harness, provider registry, and local store interact.
