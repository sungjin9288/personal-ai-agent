# Council Concurrent Envelope Shadow v1.1c

- status: deterministic/read-only structural projection
- contractVersion: `council-concurrent-envelope-shadow-v1.1c`
- sourceContractVersion: `council-concurrent-schedule-shadow-v1.1b`
- productionReadyClaim: false
- C13 boundary: `keep-stub-only`

## Purpose

v1.1c reads the existing v1.1b synthetic schedule and computes a fixed structural envelope. It assigns every scheduled stage `duration: 1 synthetic-tick` and `resource: 1 synthetic-slot`; these are not observed latency, memory, CPU, token, provider, or model measurements.

The output validates the exact v1.1b stage-to-wave structure, contract version, stage ids, dependencies, and fixed attempt records before calculating its own deterministic content digest. v1.1b does not publish an upstream digest; v1.1c's `contentDigest` identifies the validated source content and is not proof of an upstream digest verification. Contract, integrity, stage-set, attempt, unit, integer, or authority drift fails closed. The public input remains the existing repeated `roleIds` only.

## Fixed envelope

The default safety envelope is intentionally internal and fixed:

- `maxConcurrentStages: 3`
- `maxWaveResourceUnits: 3`
- `maxWaveLatencyTicks: 4`

For the canonical three-specialist triad, eight stages produce sequential latency `8`, wave latency `4`, sequential peak resource `1`, wave peak resource `3`, and max parallelism `3`. Four through seven specialists are valid role selections; they return `outside-default-synthetic-envelope` with the relevant fail-closed failure codes and still retain `decision: keep-dispatch-disabled`.

Every response sets `actualMeasurements`, `actualResourceMeasured`, `actualLatencyMeasured`, and `actualConcurrentDispatchQualified` to `false`. External provider, model, model-download, C13 evaluator, concurrent-worker, and network counts are all `0`.

## Read-only surfaces

- CLI: `node src/cli.mjs council concurrent-envelope-shadow --role research --role implementation --role verification`
- HTTP: `GET /api/council/concurrent-envelope-shadow?role=research&role=implementation&role=verification`
- UI: the existing Council preview fetches and renders the structural envelope beside the v1.1b schedule. It adds no action, POST route, store write, mission constraint, or runtime control.

The CLI dispatches before root, store, or mission initialization and creates no files. The GET route and UI only project the requested role selection; normal web runtime request-audit history is retained, but the route makes no domain/store mutation.

## Scope & Limitations

- This is not actual concurrent dispatch, worker orchestration, queueing, retry, provider execution, Ollama usage, C13 evaluation, or a runtime resource/latency measurement.
- The synthetic units must not be interpreted as capacity, cost, memory, CPU, token, or performance evidence.
- v1.1a/v1.1b payloads, permission, approval, audit, store, mission, provider, and C13 contracts are unchanged.
- `keep-stub-only`, `decision: keep-dispatch-disabled`, and `productionReadyClaim: false` remain in force.

## Verification

Run `node --test test/council-concurrent-envelope-shadow.test.mjs`, `npm run smoke:council-concurrent-envelope-shadow`, and `npm run smoke:ui-agent-blueprints`. The smoke proves CLI no-write and HTTP's expected request-audit-only change, including no domain/store mutation. The C13 actual evaluator is deliberately excluded.
