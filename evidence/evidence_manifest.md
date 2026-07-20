# Evidence Manifest

## Summary

- Project: Personal AI Agent
- Generated at: 2026-07-17
- Project type: PoC / MVP 구현
- Evidence scope: local implementation and portfolio evidence for controlled RAG, approved feedback and personalization, fine-tuning readiness, bounded local training runtime, product permission surfaces, cost-free local training environment preflight, toolchain decision, acquisition request, private acquisition resolution, and acquisition execution-plan protocols, actual local answer-quality comparison, adversarial input boundaries, synthetic user-query intake, content-free local user-query evaluation, reviewer-action generalization, and the private actual-user evaluation protocol
- Source code modified: yes, the acquisition execution-plan CLI accepts only an approved private resolution, revalidates exact fields, integrity, expiration, current F2c.2 and F2c.3 bindings, and writes seven pending actions to a content-free 0600 private plan without changing public answer, permission, or runtime contracts
- New feature development: yes, an approved acquisition decision can now be converted into a fail-closed review plan without executing it; no actual owner decision is tracked, and installation, model download, resource canary, product permission, actual model training, external submission, activation, and rollout remain unexecuted or unauthorized

## Generated Evidence Files

### CLI Logs

- `evidence/cli-logs/npm-run-smoke.log`
- `evidence/cli-logs/bootstrap-local-runtime.log`
- `evidence/cli-logs/mission-show-runtime.log`
- `evidence/cli-logs/session-show-runtime.log`
- `evidence/cli-logs/approval-inbox-runtime.log`
- `evidence/cli-logs/learning-promotions-runtime.log`
- `evidence/cli-logs/execution-preflight-approval-runtime.log`
- `evidence/cli-logs/provider-adapter-structure.log`
- `evidence/cli-logs/provider-list.log`
- `evidence/cli-logs/overview-global.log`
- `evidence/cli-logs/release-blockers-hermes.log`
- `evidence/cli-logs/representative-release-demo-replay.log`

### API Responses

- `evidence/api-responses/api-health.json`
- `evidence/api-responses/api-meta.json`
- `evidence/api-responses/api-providers.json`
- `evidence/api-responses/api-execution-v1-status.json`

### Screenshots

- `evidence/screenshots/operator-console-home.png`
- `evidence/screenshots/representative-release-demo-preview.png`
- `evidence/screenshots/representative-release-demo-release-status.png`
- `evidence/screenshots/operator-surface-mission-run.png`
- `evidence/screenshots/operator-surface-provider-readiness.png`
- `evidence/screenshots/operator-surface-action-inbox.png`
- `evidence/screenshots/workspace-learning-operator-surface.png`
- `evidence/screenshots/user-learning-operator-surface.png`
- `evidence/screenshots/local-training-permission-surface.png`

### Output Artifacts

- `evidence/output-artifacts/execution-v1-evidence.md`
- `evidence/output-artifacts/execution-v1-handoff.md`
- `evidence/output-artifacts/release-readiness-v1.md`
- `evidence/output-artifacts/runtime-mission-artifact-list.log`
- `evidence/output-artifacts/representative-release-demo-summary.json`
- `evidence/output-artifacts/representative-release-demo-browser-e2e.json`
- `evidence/output-artifacts/operator-surface-demo-browser-report.json`
- `evidence/output-artifacts/local-embedding-model-qualification.json`
- `evidence/output-artifacts/local-retrieval-robustness.json`
- `evidence/output-artifacts/local-relevance-reranker-evaluation.json`
- `evidence/output-artifacts/local-reranker-resource-envelope.json`
- `evidence/output-artifacts/local-reranker-runtime-stability.json`
- `evidence/output-artifacts/local-relevance-shadow-integration.json`
- `evidence/output-artifacts/local-relevance-shadow-replay-full-query-baseline.json`
- `evidence/output-artifacts/local-relevance-shadow-replay.json`
- `evidence/output-artifacts/local-relevance-shadow-cache.json`
- `evidence/output-artifacts/local-relevance-shadow-cache-lifecycle.json`
- `evidence/output-artifacts/local-relevance-shadow-cache-process-isolation.json`
- `evidence/output-artifacts/local-relevance-shadow-cache-termination-soak.json`
- `evidence/output-artifacts/approved-learning-rag-feedback.json`
- `evidence/output-artifacts/approved-learning-feedback-quality.json`
- `evidence/output-artifacts/workspace-learning-personalization.json`
- `evidence/output-artifacts/workspace-learning-conflict-revocation.json`
- `evidence/output-artifacts/workspace-learning-operator-override.json`
- `evidence/output-artifacts/workspace-learning-operator-surface.json`
- `evidence/output-artifacts/local-user-learning-personalization.json`
- `evidence/output-artifacts/user-learning-conflict-revocation.json`
- `evidence/output-artifacts/user-learning-operator-override.json`
- `evidence/output-artifacts/user-learning-operator-surface.json`
- `evidence/output-artifacts/local-training-runtime-contract.json`
- `evidence/output-artifacts/local-training-permission-surface.json`
- `evidence/output-artifacts/local-training-environment-preflight.json`
- `evidence/output-artifacts/local-training-toolchain-decision.json`
- `evidence/output-artifacts/local-training-acquisition-request.json`
- `evidence/output-artifacts/local-training-acquisition-runtime-contract.json`
- `evidence/output-artifacts/local-training-acquisition-artifact-verification.json`
- `evidence/output-artifacts/local-training-post-acquisition-readiness.json`
- `evidence/output-artifacts/local-answer-quality-baseline.json`
- `evidence/output-artifacts/local-answer-composition-candidate.json`
- `evidence/output-artifacts/local-answer-composition-robustness.json`
- `evidence/output-artifacts/local-answer-composition-hardening.json`
- `evidence/output-artifacts/answer-input-boundary-evaluation.json`
- `evidence/output-artifacts/local-answer-composition-boundary-regression.json`
- `evidence/output-artifacts/user-query-evaluation-intake.json`
- `evidence/output-artifacts/local-user-query-quality.json`
- `evidence/output-artifacts/local-answer-review-action-generalization.json`

### Architecture

- `evidence/architecture/current-architecture.mmd`
- `evidence/architecture/mission-run-sequence.mmd`
- `evidence/architecture/provider-adapter-structure.mmd`

### Documentation

- `docs/implementation-evidence.md`
- `docs/evidence-checklist.md`
- `docs/evidence-gallery.md`
- `docs/agent-runtime-evidence.md`
- `docs/operator-surface-demo-evidence-v1.md`
- `docs/recorded-walkthrough-v1.md`
- `docs/architecture-code-walkthrough-v1.md`
- `docs/provider-readiness-matrix-v1.md`
- `docs/provider-failure-recovery-demo-v1.md`
- `docs/memory-retrieval-quality-fixture-v1.md`
- `docs/actual-user-query-evaluation-v1.md`
- `docs/smoke-validation-summary-v1.md`
- `docs/external-evidence-blockers-v1.md`

## Verified Features

- Full deterministic smoke sweep: 216/216 passed with `npm run smoke:all` on 2026-07-17; browser E2E commands remain separately replayed as listed below
- CLI smoke flow: verified with `npm run smoke`
- Mission/session creation: verified with `scripts/bootstrap-local.mjs --run --provider stub`
- Session-scoped artifact generation: verified with runtime mission artifact list
- Approval/review gate: verified with learning promotion queue and execution preflight boundary
- Provider adapter structure: verified with provider source map and provider registry status
- Provider registry/status: verified with CLI and `/api/providers`
- Global overview: verified with CLI
- Release blocker handoff: verified with CLI
- Representative release readiness demo: verified with `npm run evidence:representative-demo` and `npm run smoke:representative-demo-evidence`
- Operator surface demo evidence: verified with `npm run smoke:operator-surface-demo-evidence`
- Operator surface browser screenshots: generated with `npm run evidence:operator-surface-demo`
- Recorded walkthrough script: verified with `npm run smoke:recorded-walkthrough`
- Architecture code walkthrough: verified with `npm run smoke:architecture-code-walkthrough`
- Provider readiness matrix: verified with `npm run smoke:provider-readiness-matrix`
- Provider failure recovery demo: verified with `npm run smoke:provider-failure-recovery-demo`
- Memory retrieval quality fixture: verified with `npm run smoke:memory-retrieval-quality-fixture`
- Answer quality evaluation foundation: verified with `npm run smoke:answer-quality-evaluation`
- RAG corpus contract: verified with `npm run smoke:retrieval-corpus-contract`
- Retrieval quality evaluation: verified with `npm run smoke:retrieval-quality-evaluation`
- Semantic retrieval experiment: verified with `npm run smoke:semantic-retrieval-experiment`
- Retrieval reranking experiment: verified with `npm run smoke:retrieval-reranking-experiment`
- Local semantic retrieval runtime: verified with `npm run smoke:semantic-retrieval-runtime`
- Local embedding model qualification: verified with `npm run smoke:local-embedding-model-qualification`
- Local retrieval robustness: verified with `npm run smoke:local-retrieval-robustness`
- Local relevance reranker: verified with `npm run smoke:local-relevance-reranker`
- Local reranker resource envelope: verified with `npm run smoke:local-reranker-resource-envelope`
- Local reranker runtime stability: verified with `npm run smoke:local-reranker-runtime-stability`
- Local relevance shadow integration: verified with `npm run smoke:local-relevance-shadow-integration`
- Multi-scenario shadow replay: verified with `npm run smoke:local-relevance-shadow-replay`
- Bounded shadow score cache: verified with `npm run smoke:local-relevance-shadow-cache`
- Shadow cache lifecycle stress: verified with `npm run smoke:local-relevance-shadow-cache-lifecycle`
- Shadow cache process isolation: verified with `npm run smoke:local-relevance-shadow-cache-process-isolation`
- Shadow cache termination and soak: verified with `npm run smoke:local-relevance-shadow-cache-termination-soak`
- Approved learning RAG feedback: verified with `npm run smoke:approved-learning-rag-feedback`
- Multi-scenario learning feedback quality: verified with `npm run smoke:approved-learning-feedback-quality`
- Workspace learning personalization: verified with `npm run smoke:workspace-learning-personalization`
- Workspace learning conflict and revocation: verified with `npm run smoke:workspace-learning-conflict-revocation`
- Workspace learning operator override: verified with `npm run smoke:workspace-learning-operator-override`
- Workspace learning operator surface: verified with `npm run smoke:workspace-learning-operator-surface` and local browser replay `npm run smoke:workspace-learning-operator-surface-browser`
- Local user learning personalization: verified with `npm run smoke:local-user-learning-personalization`
- User learning conflict and revocation: verified with `npm run smoke:user-learning-conflict-revocation`
- User learning operator override: verified with `npm run smoke:user-learning-operator-override`
- User learning operator surface: verified with `npm run smoke:user-learning-operator-surface` and local browser replay `npm run smoke:user-learning-operator-surface-browser`
- Approved training record: verified with `npm run smoke:approved-training-record`
- Training dataset quality gate: verified with `npm run smoke:training-dataset-quality`
- Fine-tuning readiness export: verified with `npm run smoke:fine-tuning-readiness`
- Local training runtime contract: verified with `npm run smoke:local-training-runtime`
- Local training product permission surface: verified with `npm run smoke:local-training-permission-surface`, `npm run smoke:local-training-permission-evidence`, and local browser replay `npm run smoke:local-training-permission-surface-browser`
- Local training environment preflight: verified with `npm run smoke:local-training-environment-preflight`
- Local training toolchain decision: verified with `npm run smoke:local-training-toolchain-decision`
- Local training acquisition request: verified with `npm run smoke:local-training-acquisition-request`
- Local training acquisition resolution protocol: verified with `npm run smoke:local-training-acquisition-resolution`
- Local training acquisition execution plan: verified with `npm run smoke:local-training-acquisition-execution-plan`
- Local training acquisition runtime contract: verified with `npm run smoke:local-training-acquisition-runtime`
- Local training acquisition artifact verification: verified with `npm run smoke:local-training-acquisition-artifact-verification`
- Local training post-acquisition readiness: verified with `npm run smoke:local-training-post-acquisition-readiness`
- Local training candidate artifact verification: verified with `npm run smoke:local-training-candidate-artifact-verification`
- Local candidate evaluation admission: verified with `npm run smoke:local-candidate-evaluation-admission`
- Candidate model evaluation gate: verified with `npm run smoke:candidate-model-evaluation`
- Actual local answer-quality baseline: verified with `npm run smoke:local-answer-quality-baseline`
- Evidence-first answer composition candidate: verified with `npm run smoke:local-answer-composition-candidate`
- Answer composition robustness baseline: verified with `npm run smoke:local-answer-composition-robustness`
- Answer composition robustness hardening: verified with `npm run smoke:local-answer-composition-hardening`
- Answer input boundary evaluation: verified with `npm run smoke:answer-input-boundary`
- Answer composition boundary regression: verified with `npm run smoke:local-answer-composition-boundary-regression`
- User-query evaluation intake dry run: verified with `npm run smoke:user-query-evaluation-intake`
- Local user-query quality stop condition: verified with `npm run smoke:local-user-query-quality`
- Reviewer action generalization candidate: verified with `npm run smoke:local-answer-review-action-generalization`
- Actual user-query evaluation protocol: verified with `npm run smoke:actual-user-query-evaluation-readiness`; actual user data and quality remain unverified
- Smoke validation summary: verified with `npm run smoke:smoke-validation-summary`
- External evidence blockers: verified with `npm run smoke:external-evidence-blockers`
- Web API health/meta/providers/execution status: verified with `curl`
- Web operator console: verified with Playwright screenshot
- Architecture/sequence evidence: generated from inspected code structure

## Verification Needed

- Anthropic live validation
- Hermes live validation
- Hosted SaaS production readiness
- Hosted tenant isolation
- Production secret manager and observability/SLO operations
- Public demo URL
- Published recorded walkthrough URL

## Sensitive Information Check

- `.env` included: no
- API key pattern found in evidence text files: no
- private key pattern found in evidence text files: no
- `node_modules/` included: no
- `.git/` included: no
- source folders such as `src/`, `app/`, `backend/`, `frontend/` included in evidence package: no
- local user path handling: text evidence files were sanitized to `/Users/<user>`

## Portfolio Zip

- Updated zip path: `_portfolio_export/personal_ai_agent_portfolio_pack.zip`
- Expected package root: `personal_ai_agent_portfolio_pack/`
- Evidence included in zip: yes
