# Architecture Code Walkthrough v1

- status: code-walkthrough-current
- productionReadyClaim: false
- scope: local-first CLI/web runtime, mission composition, mission catalog and run services, runtime harness, provider registry, local store, smoke/evidence pipeline
- relatedReadme: [README.md](../README.md)
- relatedEvidenceGallery: [evidence-gallery.md](evidence-gallery.md)
- relatedRuntimeEvidence: [agent-runtime-evidence.md](agent-runtime-evidence.md)
- relatedDemo: [demo-evidence-index-v1.md](demo-evidence-index-v1.md)

## Purpose

This walkthrough gives reviewers a code-level path through the repository without implying hosted deployment, production readiness, all-provider live validation, or real customer metrics.

The intended use is interview preparation, fork onboarding, and reviewer navigation. It should help a reader move from the README architecture diagram into the exact files that own mission lifecycle, provider execution, web API routing, persistence, and evidence verification.

## Runtime Map

```text
Operator
  -> CLI (`src/cli.mjs`) or local Web UI/API (`src/web/server.mjs`, `src/web/public/*`)
  -> Mission Composition Facade (`src/core/mission-service.mjs`)
  -> Mission Catalog (`src/core/mission-catalog-service.mjs`) or Mission Run (`src/core/mission-run-service.mjs`)
  -> Runtime Harness (`src/harness/runtime-harness.mjs`)
  -> Agent roles and optional specialist lanes (`src/agents/*`, `src/packs/*`)
  -> Provider Registry (`src/providers/index.mjs`)
  -> Provider Adapter (`src/providers/*-provider.mjs`)
  -> Local Store (`src/core/store.mjs`)
  -> Mission artifacts, release evidence, smoke reports, and portfolio package
```

## Code Walkthrough

| Step | File | Symbol or surface | What to inspect | Evidence |
|---|---|---|---|---|
| 1. CLI entry | `src/cli.mjs` | command dispatch surface | Workspace, mission, provider, approval, action, overview, and execution commands call the shared service layer | `npm run smoke`, `evidence/cli-logs/npm-run-smoke.log` |
| 2. Web/API entry | `src/web/server.mjs` | `handleApi`, `http.createServer` | Local API routes expose health, meta, workspaces, missions, providers, actions, approvals, and execution-v1 release surfaces | `evidence/api-responses/api-health.json`, `evidence/api-responses/api-providers.json` |
| 3. Mission composition | `src/core/mission-service.mjs` | `createMissionService` | Dependencies are assembled once and the stable public facade delegates catalog, run, provider, action, execution, and read-model work | `evidence/cli-logs/mission-show-runtime.log` |
| 4. Mission catalog | `src/core/mission-catalog-service.mjs` | `createMissionCatalogService` | Workspace, mission, and attachment validation and persistence keep gateway-event binding order explicit | `npm run smoke:mission-attachments` |
| 5. Mission run | `src/core/mission-run-service.mjs` | `createMissionRunService`, `runMission`, `resolveApproval` | Manager, planner, specialist, executor, reviewer, provider fallback, approval, and closeout state transitions are coordinated here | `evidence/cli-logs/session-show-runtime.log` |
| 6. Runtime harness | `src/harness/runtime-harness.mjs` | `createRuntimeHarness` | Session, agent run, approval primitives, memory entries, and prompt, retrieval, and output artifact writes are persisted here | `evidence/cli-logs/session-show-runtime.log` |
| 7. Provider registry | `src/providers/index.mjs` | `createProviderRegistry` | Stub, OpenAI, Anthropic, local OpenAI-compatible, and Hermes-compatible providers are selected behind one contract | `evidence/cli-logs/provider-list.log`, `evidence/api-responses/api-providers.json` |
| 8. Local persistence | `src/core/store.mjs` | `createStore` | JSON-backed state and file artifacts provide a reproducible local-first source of record | `evidence/output-artifacts/runtime-mission-artifact-list.log` |
| 9. Evidence pipeline | `scripts/smoke-*.mjs`, `scripts/build-*.mjs` | smoke and evidence commands | Deterministic scripts verify README claims, demo evidence, release hygiene, pilot export, and portfolio ZIP freshness | `npm run smoke:demo-local`, `npm run smoke:portfolio-zip` |

## Request Flow

```text
1. Operator creates or selects a workspace.
2. Operator creates a mission through CLI or `/api/missions`.
3. Mission composition delegates creation to the catalog service, which stores attachments before binding the gateway event.
4. Mission composition delegates execution to the run service, which advances stages and records prompt and retrieval evidence through the runtime harness.
5. Mission run service calls the configured provider selected through the provider registry.
6. Provider adapter returns normalized output or a failure envelope.
7. Mission run service records output, approval, and closeout state through the runtime harness and local store.
8. CLI/web read models expose mission status, artifacts, provider events, approvals, and release evidence.
9. Smoke/evidence scripts verify the surfaces without requiring a hosted deployment.
```

## What To Explain In An Interview

- Why the system is a managed multi-agent harness instead of an unbounded autonomous loop.
- How `createMissionService` preserves one public facade while delegating catalog and run ownership to focused services.
- How `createMissionCatalogService` and `createMissionRunService` keep persistence and lifecycle state transitions independently reviewable.
- How `createRuntimeHarness` turns role execution into persisted session artifacts.
- How `createProviderRegistry` keeps provider-specific configuration and failure handling behind one contract.
- How `createStore` keeps the MVP reproducible without introducing a database dependency.
- How smoke scripts prevent README, demo, portfolio, and release claims from drifting beyond evidence.

## Safe Claim Boundary

Safe to claim:

- Local-first CLI/web MVP exists.
- Mission/session/artifact/approval/provider surfaces are implemented.
- Stub-backed replay and representative demo evidence are credential-free.
- OpenAI-backed local-first/self-hosted pilot readiness is scoped by release docs.
- Portfolio ZIP and pilot export manifest are regenerated and smoke-checked.

Do not claim:

- Hosted SaaS availability.
- Production-ready deployment.
- All-provider live validation.
- Published public demo URL.
- Published recorded walkthrough URL.
- Real pilot feedback, operating metrics, or customer impact numbers.

## Verification

```bash
npm run smoke:architecture-code-walkthrough
npm run smoke:readme-portfolio-overview
npm run smoke:portfolio-zip
npm run smoke:pilot-export-package
```

This walkthrough is current only when `npm run smoke:architecture-code-walkthrough` passes and the referenced files still contain the expected exported symbols or API surfaces.
