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
- Size: `2,240,596 bytes`
- SHA-256: `7763c5f43e771198b360d1f85cdf57baec140b322910d4912abd2848f291c1fd`

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
