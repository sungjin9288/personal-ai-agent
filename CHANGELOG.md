# Changelog

All notable public-facing changes are tracked here. This project follows an evidence-first release style: changelog entries should describe verified repository state, not aspirational claims.

## Unreleased

- No unreleased changes yet.

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
- Size: `410,200 bytes`
- SHA-256: `072286dd4c8d0988d4242f4d0ed96a56db1ce434b4e9eb81c54f4e04e7a2045a`

Included public surfaces:

- Professional README with scoped portfolio overview, representative demo preview, setup, testing, release evidence, and limitations.
- Credential-free `npm run demo:local` replay path.
- Demo evidence index, preview screenshot, replay log, summary JSON, and browser E2E evidence references.
- `.env.example` and `smoke:env-example` for local provider/runtime configuration onboarding.
- `CONTRIBUTING.md`, fork onboarding guide, `SECURITY.md`, and GitHub issue templates.
- Provider smoke CI gates for fallback, attention remediation, provider events, provider overview, target provider operations, release hygiene, and public onboarding checks.
- Manifest-only pilot export package and release artifact hygiene checks.

Verification baseline:

```bash
npm run package:pilot-export
npm run smoke:changelog
npm run smoke:contributor-onboarding
npm run smoke:env-example
npm run smoke:demo-local
npm run smoke:demo-evidence-index
npm run smoke:readme-portfolio-overview
npm run smoke:portfolio-docs-claim-boundary
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```
