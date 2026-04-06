# ADR-001: Runtime And Agent Shape

## Status

Accepted

## Decision

- runtime stays Node.js ESM
- the product remains CLI-first for v1
- v1 agent shape is managed multi-agent: `manager -> planner -> executor -> reviewer`
- risky actions require explicit approval before completion

## Context

The product must support coding, planning, decision support, and documentation without taking on a high-complexity platform rewrite at the start.

## Consequences

- faster local iteration and lower bootstrap cost
- clean room for provider adapters behind a stable contract
- explicit governance hooks before risky execution
- autonomous swarm work is deferred until the managed path is stable
