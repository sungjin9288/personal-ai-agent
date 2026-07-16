# Changelog

All notable public-facing changes are tracked here. This project follows an evidence-first release style: changelog entries should describe verified repository state, not aspirational claims.

## Unreleased

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
- Added an approved training record contract that requires reviewer pass, operator approval, promotion verification, mission-scoped artifact lineage, sanitized content checks, and deterministic hashes without authorizing external fine-tuning submission.
- Added a deterministic training dataset quality gate with content, lineage, and near-response deduplication, mission-scoped train/validation splitting, leakage checks, and content-free manifests without authorizing dataset export or fine-tuning execution.
- Added a provider-neutral fine-tuning readiness export with train/validation JSONL, Q1 answer-quality baseline binding, reviewer checklist, file digests, and rollback requirements without authorizing provider submission or training execution.
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
- Size: `2,300,062 bytes`
- SHA-256: `ab14884bace5382de750942ef9bcd70e02b61301fd4fd05f6086eba4fae981c2`

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
