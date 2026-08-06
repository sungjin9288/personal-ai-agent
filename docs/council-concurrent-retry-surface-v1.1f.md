# Council Concurrent Retry Operator Surface v1.1f

## 상태

- contractVersion: `council-concurrent-retry-terminality-shadow-v1.1e`
- surface: additive read-only CLI, `GET`, and existing Council blueprint preview
- authority: `projection-only-not-authorized`
- retryDecision: `keep-retry-disabled`
- decision: `keep-dispatch-disabled`
- c13Boundary: `keep-stub-only`
- productionReadyClaim: `false`

v1.1f exposes the existing deterministic v1.1e retry terminality projection to an operator without turning the projection into a retry runtime. The core projection and its v1.1b–e source bindings remain unchanged.

## Surface

CLI:

```text
node src/cli.mjs council concurrent-retry-terminality-shadow \
  --role research --role implementation --role verification \
  --completion-event 'opening:research|attempt:opening:research:1|timeout' \
  --completion-event 'opening:implementation|attempt:opening:implementation:1|completed' \
  --completion-event 'opening:verification|attempt:opening:verification:1|completed' \
  --projected-retry-outcome 'opening:research|attempt:opening:research:2|completed'
```

The command accepts the same role and completion-event encoding as v1.1b, plus one exact `--projected-retry-outcome` value.

HTTP:

```text
GET /api/council/concurrent-retry-terminality-shadow
  ?role=research&role=implementation&role=verification
  &completionEvent=opening%3Aresearch%7Cattempt%3Aopening%3Aresearch%3A1%7Ctimeout
  &projectedRetryOutcome=opening%3Aresearch%7Cattempt%3Aopening%3Aresearch%3A2%7Ccompleted
```

The route stays behind the existing web authentication, RBAC, request registry, and mandatory request-audit flow. It performs no Council domain/store mutation; a request may only append the existing runtime request audit record.

The UI requests the default projection without scenario controls and renders projection status, any attempt 1 → virtual attempt 2 lineage, terminality and next barrier, `keep-retry-disabled`, and `keep-dispatch-disabled`. It exposes no retry, completion, dispatch, POST, or action button.

## Fail-closed rules

- malformed, empty, duplicate, stale, and unknown completion or projected-outcome values are rejected;
- a failed first blocker remains rejected without recoverability evidence;
- only a timeout blocker may expose the hypothetical attempt 2 candidate;
- completed retry opens the next same-wave barrier only after every sibling is completed;
- failed or timed-out attempt 2 is `retry-exhausted`; no attempt 3 or configurable retry budget exists;
- four through seven roles remain outside the deterministic envelope and never receive a retry lineage.

## Verification

```text
node --test test/council-concurrent-retry-surface.test.mjs test/council-blueprint-preview.test.mjs
npm run smoke:council-concurrent-retry-surface
npm run smoke:council-concurrent-retry-terminality-shadow
npm run smoke:ui-agent-blueprints
```

The focused surface smoke proves CLI/API parity, request-audit-only HTTP writes, CLI filesystem write count zero, outside-envelope denial, and zero retry/provider/model/network execution. The existing v1.1b–e core smokes remain required regression gates.

No external Provider, model, Ollama, C13 evaluator, worker, network, actual user data, scheduler, retry executor, or new dependency is used.
