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
