# Fork Onboarding v1

- status: current
- audience: developers evaluating or forking the local-first harness
- publicHostedDemoUrl: none
- productionReadyClaim: false
- relatedReadme: [README.md](../README.md)
- relatedContributing: [CONTRIBUTING.md](../CONTRIBUTING.md)
- relatedEnvTemplate: [.env.example](../.env.example)
- relatedDemoEvidence: [demo-evidence-index-v1.md](demo-evidence-index-v1.md)

## Goal

This guide gives fork maintainers a short path from clone to verified local replay without external provider credentials.

It is not a deployment guide and does not add a hosted demo. For pilot deployment boundaries, use [deployment-pilot-v1.md](deployment-pilot-v1.md).

## Fast Path

```bash
git clone https://github.com/sungjin9288/personal-ai-agent.git
cd personal-ai-agent
cp .env.example .env
npm run bootstrap:local
npm run demo:local
```

Expected boundary:

- the stub provider path works without credentials
- `.env` is ignored by git
- `demo:local` verifies the representative demo contract and evidence links
- release artifact hygiene checks for secrets and machine-local paths
- production readiness and public hosted demo claims remain blocked

## Recommended First Changes

| Goal | Small change | Verification |
|---|---|---|
| Rename the local workspace | use `node src/cli.mjs workspace add` with a local path | `node src/cli.mjs workspace list` |
| Try the operator console | run `npm run ui` | open the local URL from `var/server.json` |
| Review provider setup | edit shell exports or local dotenv loader outside runtime code | `npm run smoke:env-example` |
| Update docs or evidence links | change README/docs and keep claim boundary explicit | `npm run smoke:readme-portfolio-overview` and `npm run smoke:portfolio-docs-claim-boundary` |
| Add provider behavior | reuse `src/providers/*` and provider smoke patterns | focused provider smoke plus Provider smoke CI set |

## Do Not Commit

- `.env`
- provider API keys or tokens
- files under `var/`
- `node_modules/`
- local temp paths
- screenshots or logs that expose machine-specific paths

## Public Claim Boundary

Forks should keep these statements true until their own evidence says otherwise:

- This is a local-first PoC/MVP harness.
- There is no public hosted demo URL unless the URL is deployed and access-verified.
- The representative demo is a credential-free local replay.
- Production readiness requires target deployment, identity/session, tenant isolation, secret management, observability/SLO, provider, and release evidence.

## Fork Readiness Smoke

```bash
npm run smoke:contributor-onboarding
npm run smoke:env-example
npm run smoke:demo-local
npm run smoke:release-artifact-hygiene
```

Use this as the baseline before changing runtime behavior.
