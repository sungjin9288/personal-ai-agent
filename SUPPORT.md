# Support

Personal AI Agent is a local-first PoC/MVP harness. It does not currently operate a public hosted service, production support desk, paid support channel, or public hosted demo URL.

Use this guide to route support requests without exposing secrets or overstating the project boundary.

## Before Opening An Issue

Run the credential-free checks first when they apply:

```bash
npm run demo:local
npm run doctor
npm run doctor:summary
npm run smoke:doctor
npm run smoke:ui-doctor-surface
npm run smoke:support-policy
npm run smoke:env-example
npm run smoke:contributor-onboarding
npm run smoke:changelog
npm run smoke:portfolio-zip
```

For release, evidence, or portfolio package questions, also run:

```bash
npm run smoke:release-artifact-hygiene
npm run smoke:pilot-export-package
npm run smoke:portfolio-zip
```

## Where To Ask

GitHub blank issues are disabled so public reports keep the safety checklist, support route, and diagnostic context attached. Use the bug report or security report template instead of opening an unstructured issue.

| Need | Route | Include |
|---|---|---|
| Local setup, fork onboarding, or documentation issue | GitHub bug report | command, expected result, actual result, relevant smoke output |
| Provider configuration question | GitHub bug report | provider name, command run, sanitized environment variable names, no values |
| Release evidence or portfolio package issue | GitHub bug report | affected file, smoke command, archive or manifest detail |
| Security concern | Security report path in [SECURITY.md](SECURITY.md) | minimal public summary only, no secrets or private data |
| Contribution process question | [CONTRIBUTING.md](CONTRIBUTING.md) and GitHub issue | proposed change scope and verification plan |

## Public Issue Safety

Do not include:

- provider API keys, tokens, passwords, or secret values
- private repository content, customer data, or proprietary prompts
- screenshots that reveal secrets or local filesystem details
- machine-local paths from your environment

If sensitive detail is required, open a minimal public issue and state that private detail is available through an appropriate non-public channel. Do not paste the sensitive detail into GitHub Issues.

## Current Boundaries

- Current validated claim: `provider-scoped pilot-ready`.
- `productionReadyClaim: false` remains the release evidence boundary.
- The repository is not production-ready, not all-provider-complete, and not a hosted SaaS product.
- There is no public hosted demo URL; use the credential-free local replay and recorded evidence package.

## Maintainer Expectations

Support is best-effort through repository issues and review comments. There is no response-time SLA.

High-signal reports are easier to review when they include:

- the exact command that failed
- the smallest credential-free reproduction
- the smoke command already run
- whether the issue affects runtime behavior, provider configuration, release evidence, documentation, or portfolio packaging
