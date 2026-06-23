# Provider Failure Recovery Demo v1

- status: provider-failure-recovery-demo-current
- productionReadyClaim: false
- publicHostedDemoUrl: none
- credentialFreeReplay: yes
- scope: provider execution failure, provider attention inbox, fallback remediation, timeline/event audit, claim boundary
- relatedProviderReadinessMatrix: [provider-readiness-matrix-v1.md](provider-readiness-matrix-v1.md)
- relatedOperatorSurfaceEvidence: [operator-surface-demo-evidence-v1.md](operator-surface-demo-evidence-v1.md)
- relatedDemoEvidenceIndex: [demo-evidence-index-v1.md](demo-evidence-index-v1.md)

## Purpose

This demo explains the provider failure recovery path in reviewer-friendly terms. It is grounded in deterministic smoke scripts that exercise provider fallback and provider attention remediation without requiring external provider credentials.

The safe claim is that the local harness can surface provider execution failures, recommend fallback remediation, retry through a configured fallback provider, and expose the result through mission timelines and provider event filters. It is not evidence that every external provider has been live validated, that hosted SaaS operations are ready, or that production provider operations are approved.

## Demo Story

| Step | Operator question | Verified surface | Evidence command |
|---:|---|---|---|
| 1 | What happens when the primary provider cannot run? | Mission execution records a failed primary provider attempt with provider failure metadata | `npm run smoke:provider-fallback-policy` |
| 2 | Can the operator see the follow-up action? | Provider attention inbox exposes the failed provider action, recommended remediation command, fallback provider, and policy options | `npm run smoke:provider-attention-remediation` |
| 3 | Can fallback recover the mission? | Remediation reruns the mission with `stub` as fallback and records `fallbackUsed: true` | `npm run smoke:provider-attention-remediation` |
| 4 | Can stricter policy stop unsafe fallback? | `recoverable-provider-failure-only` stops on non-recoverable config failures and records `non-recoverable-provider-failure` | `npm run smoke:provider-attention-remediation` |
| 5 | Can a reviewer audit what happened? | Mission timeline and provider event filters expose attempted/used fallback events, stop reasons, provider ids, and policy counts | `npm run smoke:provider-attention-remediation` |

## Verified Paths

The current deterministic evidence covers these local paths:

- Anthropic configuration failure falls back to `stub` under `provider-failure-only`.
- OpenAI transport failure falls back to `stub` under `recoverable-provider-failure-only`.
- Anthropic configuration failure is blocked under `recoverable-provider-failure-only` because the failure is non-recoverable.
- Provider attention remediation exposes `fallbackRecommendedCommand` and `recoverableFallbackRecommendedCommand`.
- Mission timeline exposes `provider-fallback-attempted` and `provider-fallback-used`.
- Provider event filters expose `--family fallback`, `--fallback-policy recoverable-provider-failure-only`, and `--fallback-stop-reason non-recoverable-provider-failure`.

## Replay Commands

```bash
npm run smoke:provider-failure-recovery-demo
npm run smoke:provider-fallback-policy
npm run smoke:provider-attention-remediation
npm run smoke:provider-events
```

For the broader public-readiness replay, run:

```bash
npm run smoke:readme-portfolio-overview
npm run smoke:provider-readiness-matrix
npm run smoke:operator-surface-demo-evidence
```

## Interview Walkthrough

1. Start with the provider registry and readiness matrix: adapters exist, but readiness claims are provider-specific.
2. Show the failure path: a primary provider run can fail with provider failure metadata instead of disappearing into a generic task failure.
3. Show operator control: the provider attention inbox turns the failure into a visible remediation action.
4. Show fallback policy: `provider-failure-only` allows fallback after provider failure, while `recoverable-provider-failure-only` blocks non-recoverable config failures.
5. Show auditability: mission timelines and provider events preserve provider ids, policy ids, stop reasons, and fallback-used state.
6. Close with the boundary: this is deterministic local evidence for the recovery workflow, not a claim that external provider operations are complete.

## Safe Claim Boundary

Safe to claim:

- Provider failure recovery is implemented for the local harness and covered by deterministic smoke evidence.
- Provider attention remediation can recommend and run fallback reruns.
- Fallback policy decisions are auditable through mission timeline and provider event surfaces.
- The demo remains credential-free because provider failures are simulated through missing config or local closed endpoints.

Do not claim:

- All providers have been live validated.
- Anthropic readiness is complete.
- Hermes live readiness is complete.
- Target local provider production readiness is complete.
- Hosted SaaS provider recovery is available.
- Production-ready provider operations are approved.
- Customer SLA, cost, or incident metrics are proven.

## Acceptance Rule

This demo is current only when `npm run smoke:provider-failure-recovery-demo`, `npm run smoke:provider-fallback-policy`, and `npm run smoke:provider-attention-remediation` pass, README links this document, and the release evidence continues to keep `productionReadyClaim: false`.
