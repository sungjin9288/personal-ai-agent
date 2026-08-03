# Council Concurrent Retry Lineage Shadow v1.1d

- status: deterministic/read-only retry lineage projection
- contractVersion: `council-concurrent-retry-lineage-shadow-v1.1d`
- schedule source: `council-concurrent-schedule-shadow-v1.1b`
- envelope source: `council-concurrent-envelope-shadow-v1.1c`
- productionReadyClaim: false
- C13 boundary: `keep-stub-only`

## Purpose

v1.1d reads a canonical v1.1b completion projection and its matching v1.1c structural envelope. It verifies both sources by reconstructing their canonical content and binds the selected role ids, canonical completion-event digest, schedule digest, and envelope digest before projecting one possible retry lineage.

The projection is limited to the canonical first failed or timed-out stage. It records the existing attempt 1 / retry 0 record and a hypothetical attempt 2 / retry 1 record. The projected record is always `projection-only-not-authorized`; it neither schedules nor runs that attempt.

## States

- `awaiting-terminal-outcome`: no blocker exists and the schedule is not complete.
- `completed-without-retry`: every scheduled stage completed.
- `retry-lineage-projected`: the canonical first failed or timed-out blocker has one hypothetical lineage.
- `outside-synthetic-envelope`: four through seven specialists exceed the fixed v1.1c default envelope. No retry lineage is projected.

Same-wave completion input is canonicalized by v1.1b stage order. A failed research opening therefore remains the first blocker even when a later opening timeout is supplied first. Invalid, stale, duplicate, and barrier-breaking events retain v1.1b's fail-closed validation.

## Boundaries

Every result fixes `actualRetryAuthorized`, `actualRetryExecuted`, and `actualConcurrentDispatchQualified` to `false`; `retryDecision` remains `keep-retry-disabled` and `decision` remains `keep-dispatch-disabled`. Provider, model, model-download, C13 evaluator, worker, network, filesystem-write, and store-write counts are zero.

This is a core-only contract. It adds no CLI command, HTTP route, UI control, store/schema field, audit flow, mission/provider path, permission, approval, or C13 evaluator path. v1.1a, v1.1b, and v1.1c payloads are unchanged.

## Verification

Run `node --test test/council-concurrent-retry-lineage-shadow.test.mjs`, `npm run smoke:council-concurrent-retry-lineage-shadow`, `npm run smoke:council-concurrent-schedule-shadow`, and `npm run smoke:council-concurrent-envelope-shadow`. The focused smoke repeats the pure projection ten times and verifies zero calls and writes. It does not invoke a provider, model, Ollama, C13 observation, worker, network, or filesystem store.
