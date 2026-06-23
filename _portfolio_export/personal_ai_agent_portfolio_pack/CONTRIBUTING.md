# Contributing

Thanks for taking a look at Personal AI Agent. This repository is intentionally local-first and evidence-driven, so contributions should preserve the same operating style: small changes, explicit boundaries, and repeatable verification.

## Project Boundary

Current validated claim: `provider-scoped pilot-ready` for an OpenAI-backed local-first/self-hosted path.

Do not describe this project as production-ready, all-provider-complete, or a hosted SaaS product. The current public demo is the credential-free representative replay and evidence package, not a public hosted demo URL.

## Local Setup

Use the credential-free path first:

```bash
git clone https://github.com/sungjin9288/personal-ai-agent.git
cd personal-ai-agent
cp .env.example .env
npm run bootstrap:local
npm run demo:local -- --plan
```

The runtime reads `process.env` directly and does not load `.env` automatically. The default stub provider works without credentials.

Start the local operator console:

```bash
npm run ui
```

## Contributor Workflow

1. Keep the change focused on one behavior, doc surface, or evidence flow.
2. Prefer existing service, provider, smoke, and evidence patterns before adding new abstractions.
3. Keep generated runtime state under `var/` out of commits.
4. Never commit `.env`, provider credentials, local temp paths, or machine-specific artifacts.
5. Update smoke coverage when a README, release evidence, provider boundary, or portfolio claim changes.

## Verification Checklist

For documentation or onboarding changes:

```bash
npm run smoke:changelog
npm run smoke:contributor-onboarding
npm run smoke:env-example
npm run smoke:demo-local
npm run smoke:readme-portfolio-overview
npm run smoke:portfolio-docs-claim-boundary
npm run smoke:release-artifact-hygiene
```

For provider, release, or evidence changes, also run the relevant focused smoke commands from `package.json`. The PR template lists the Provider smoke CI command set that must stay green.

## Claim Rules

- Use evidence-backed wording only.
- Keep `productionReadyClaim: false` boundaries intact unless the required target evidence is added and verified.
- Keep public demo wording explicit: there is no public hosted demo URL.
- When adding metrics, include the command, log, or method used to produce them in the same documentation area.

## Pull Request Notes

Every PR should explain:

- what changed
- why it changed
- how it was verified
- whether runtime behavior, provider behavior, release evidence, or portfolio claims are affected

Use the checklist in `.github/pull_request_template.md` as the baseline. Add focused verification when your change touches a narrower subsystem.

## Issues And Security Reports

- Use `.github/ISSUE_TEMPLATE/bug_report.yml` for reproducible bugs.
- Use `.github/ISSUE_TEMPLATE/security_report.yml` for security concerns that can be described publicly without secrets.
- Read [SECURITY.md](SECURITY.md) before filing security reports.
- Never paste provider credentials, customer data, private repository data, or machine-local paths into public issues.
