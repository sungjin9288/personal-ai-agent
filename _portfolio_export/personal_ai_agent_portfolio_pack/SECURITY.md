# Security Policy

Personal AI Agent is a local-first PoC/MVP harness. It is not a hosted SaaS product and should not be treated as production-ready.

## Supported Scope

Security review currently applies to the public repository source, local runtime behavior, documentation, smoke scripts, and release evidence artifacts.

The project does not currently operate a public hosted service, so there is no production service endpoint or hosted interactive demo to test. The public recorded walkthrough is a static GitHub release asset and remains inside the documented local replay boundary.

## Reporting A Security Issue

Open a GitHub issue using the security report template when the report can be shared publicly without secrets. Do not include provider API keys, tokens, private repository data, customer data, or machine-local paths.

If a report contains sensitive material, do not paste it into an issue. Instead, open a minimal issue that describes the affected area and states that sensitive details are available privately.

For non-security support, setup, provider configuration, or release evidence questions, use [SUPPORT.md](SUPPORT.md) instead of the security report path.

## What To Include

- affected command, script, or document
- local reproduction steps using credential-free flows when possible
- expected behavior and observed behavior
- whether the issue affects runtime behavior, provider handling, release evidence, or documentation claims
- any relevant smoke command result

## Out Of Scope

- testing a non-existent hosted interactive demo or production endpoint
- claims that require production deployment evidence not present in this repository
- reports that require real provider credentials to be posted publicly
- third-party service vulnerabilities outside this repository

## Baseline Checks

Before reporting, run the relevant local checks when practical:

```bash
npm run smoke:contributor-onboarding
npm run smoke:env-example
npm run smoke:demo-local
npm run smoke:release-artifact-hygiene
```

Provider-specific reports should also include the relevant provider smoke or preflight command when the command can run without exposing secrets.
