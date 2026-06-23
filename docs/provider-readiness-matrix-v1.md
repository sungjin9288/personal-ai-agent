# Provider Readiness Matrix v1

- status: provider-readiness-matrix-current
- productionReadyClaim: false
- allProviderComplete: false
- scope: provider adapter inventory, local pilot validation boundary, blocker state, required env, next verification commands
- relatedProviderCatalog: `src/providers/provider-catalog.mjs`
- relatedProviderRegistry: `src/providers/index.mjs`
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedTargetProviderOperations: [target-provider-operations-v1.md](target-provider-operations-v1.md)

## Purpose

This matrix separates provider adapter implementation from provider readiness claims. It is intended for README, portfolio, interview, and fork-review use so the project can describe multi-provider support without implying all-provider live validation or production readiness.

The current safe claim remains `provider-scoped pilot-ready` for the OpenAI-backed local-first/self-hosted path. Local provider proof is archived for the configured pilot boundary, but target local provider production approval remains blocked until target architecture evidence is supplied.

## Current Matrix

| Provider | Adapter implemented | Required env | Transport | Current readiness state | Safe claim | Blocker / next evidence |
|---|---:|---|---|---|---|---|
| `stub` | yes | none | `deterministic-local` | Credential-free deterministic local replay verified by smoke/demo evidence | Safe default provider for local replay and portfolio walkthrough | None for local replay; not external provider validation |
| `openai` | yes | `OPENAI_API_KEY` | `responses-api` | OpenAI-backed local-first/self-hosted pilot evidence exists inside the documented boundary | Safe only as `provider-scoped pilot-ready` for OpenAI-backed local-first/self-hosted path | Target OpenAI provider account approval and target-boundary operations evidence still required before production claims |
| `anthropic` | yes | `ANTHROPIC_API_KEY` | `messages-api` | Adapter exists, but live validation is blocked by provider account billing/credit evidence | Safe to claim adapter support only; do not claim Anthropic readiness | Resolve billing/credit/account evidence, then rerun `npm run live:execution-v1:anthropic` and refresh release evidence |
| `local` | yes | `LOCAL_PROVIDER_MODEL` | `openai-compatible-chat-completions` | Configured local provider pilot proof is archived, but target local provider architecture approval remains blocked | Safe only as archived configured local pilot boundary evidence, not production local provider readiness | Provide endpoint ownership, model pinning, network isolation, transcript policy, quota/resource guard, telemetry, fallback approval, target-boundary `npm run live:execution-v1:local`, release hygiene, and regenerated snapshot evidence |
| `hermes` | yes | `HERMES_PROVIDER_MODEL` | `openai-compatible-hermes-chat-completions` | Hermes-compatible adapter exists, but live readiness is blocked until target Hermes provider architecture evidence is supplied | Safe to claim Hermes-compatible adapter and parser surface only; do not claim Hermes live readiness | Provide endpoint ownership, model pinning, target secret injection, tool-call parsing proof, session provenance, transcript policy, quota/rate guard, telemetry, fallback/stop-condition proof, customer approval, target-boundary `npm run live:execution-v1:hermes`, release hygiene, and regenerated snapshot evidence |

## Provider Catalog Grounding

This matrix is grounded in `src/providers/provider-catalog.mjs` and `src/providers/index.mjs`.

Provider ids expected by the registry:

- `stub`
- `openai`
- `anthropic`
- `local`
- `hermes`

Provider readiness should be interpreted in layers:

1. Adapter implemented: source adapter is registered behind `createProviderRegistry`.
2. Configurable: required environment variables are known and can be inspected without exposing secret values.
3. Local/demo verified: deterministic smoke or archived local pilot evidence exists.
4. Target-boundary validated: provider-specific account or architecture evidence plus target live validation exists.
5. Production claim allowed: blocked for this repository until every target evidence gate is satisfied.

## Verification Commands

```bash
npm run smoke:provider-readiness-matrix
npm run smoke:provider-overview
npm run smoke:provider-fallback-policy
npm run smoke:target-provider-operations
npm run smoke:production-provider-readiness
npm run smoke:release-artifact-hygiene
```

Provider-specific live commands must be run only when the required account, model, endpoint, approval, and secret handling evidence exists:

```bash
npm run live:execution-v1:openai
npm run live:execution-v1:anthropic
npm run live:execution-v1:local
npm run live:execution-v1:hermes
```

## Safe Claim Boundary

Safe to claim:

- Provider registry supports `stub`, OpenAI, Anthropic, local OpenAI-compatible, and Hermes-compatible adapters.
- Stub local replay is credential-free.
- OpenAI-backed local-first/self-hosted pilot readiness is scoped and evidence-backed.
- Local provider proof is archived for the configured pilot boundary only.
- Anthropic and Hermes readiness remain blocked by explicit evidence gaps.

Do not claim:

- All-provider live validation complete.
- Hosted SaaS readiness.
- Production-ready provider operations.
- Anthropic readiness.
- Hermes live readiness.
- Target local provider production readiness.
- Provider cost savings, SLA, or customer impact metrics.

## Acceptance Rule

This matrix is current only when `npm run smoke:provider-readiness-matrix` passes, every provider id in `src/providers/provider-catalog.mjs` has exactly one row above, required environment variables match the catalog, and the release readiness document still keeps `productionReadyClaim: false`.
