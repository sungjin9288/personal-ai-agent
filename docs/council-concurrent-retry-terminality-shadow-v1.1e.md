# Council Concurrent Retry Terminality Shadow v1.1e

- status: deterministic/read-only retry terminality projection
- contractVersion: `council-concurrent-retry-terminality-shadow-v1.1e`
- retry lineage source: `council-concurrent-retry-lineage-shadow-v1.1d`
- productionReadyClaim: false
- C13 boundary: `keep-stub-only`

## Purpose

v1.1e reconstructs the canonical v1.1d result from the supplied role ids and v1.1b-normalized completion events, verifies exact JSON equality, and binds its SHA-256 digest plus the inherited v1.1b/v1.1c source binding. It accepts an optional `projectedRetryOutcome` only when it has exactly `attemptId`, `outcome`, and `stageId`; the outcome is one of `completed`, `failed`, or `timeout` and must bind the hypothetical attempt 2 record exactly.

The result remains a projection. It neither schedules nor runs a retry, dispatches a worker, opens a provider route, or changes a stored Council state.

## Terminality rules

- No event, all-completed, and four-through-seven-seat states preserve v1.1d's `awaiting-terminal-outcome`, `completed-without-retry`, and `outside-synthetic-envelope` outcomes.
- A failed attempt 1 blocker has no recoverability evidence. Any supplied hypothetical retry outcome is retained only as rejected input context; no attempt 2 candidate is accepted and the result is `retry-outcome-rejected`.
- A timeout blocker is the only attempt 2 candidate. Without its outcome, the result is `retry-outcome-pending`.
- A completed hypothetical timeout retry opens the next barrier only if every same-wave sibling completed. The next wave is then `projected-ready`; pending, failed, or timed-out siblings keep the barrier blocked.
- A completed retry in the reviewer wave has no next barrier and ends as `projection-complete`.
- A failed or timed-out hypothetical attempt 2 is `retry-exhausted`. The contract creates neither attempt 3 nor a configurable retry budget.

## Boundaries

Every result fixes `actualRetryAuthorized`, `actualRetryExecuted`, and `actualConcurrentDispatchQualified` to `false`; `retryDecision` remains `keep-retry-disabled` and `decision` remains `keep-dispatch-disabled`. Provider, model, model-download, Ollama, C13 evaluator, worker, network, filesystem-write, and store-write counts are zero.

This is a core-only contract. It adds no CLI command, HTTP route, UI control, store/schema field, mission/provider path, permission, approval, audit flow, C13 evaluator path, provider call, model call, Ollama call, worker, clock, network, filesystem, or store side effect. v1.1b, v1.1c, and v1.1d public results remain unchanged.

## Verification

Run `node --test test/council-concurrent-retry-terminality-shadow.test.mjs`, `npm run smoke:council-concurrent-retry-terminality-shadow`, `npm run smoke:council-concurrent-retry-lineage-shadow`, `npm run smoke:council-concurrent-envelope-shadow`, and `npm run smoke:council-concurrent-schedule-shadow`. The focused smoke repeats the pure projection ten times and verifies zero calls and writes. It does not invoke a provider, model, Ollama, C13 observation, worker, network, filesystem, or store.
