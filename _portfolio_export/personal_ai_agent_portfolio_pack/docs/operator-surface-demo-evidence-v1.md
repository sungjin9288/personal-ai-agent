# Operator Surface Demo Evidence v1

- status: portfolio-evidence-current
- scope: representative demo support evidence for mission, provider, action, and operator surfaces
- primaryDemo: [demo-scenarios-v1.md](demo-scenarios-v1.md)
- claimBoundary: evidence-backed local-first/self-hosted pilot support only
- productionReadyClaim: false

## Purpose

The representative release readiness demo is the default portfolio walkthrough. This document keeps the supporting operator surfaces explicit so the project can be explained beyond the release tab without implying a hosted demo or production-ready deployment.

The support surfaces are:

- mission run and session evidence
- provider readiness and blocker evidence
- action, approval, and remediation evidence
- operator API and UI evidence

## Evidence Map

| Surface | Primary Evidence | What It Proves | Boundary |
|---|---|---|---|
| Mission run | `evidence/cli-logs/bootstrap-local-runtime.log`, `evidence/cli-logs/mission-show-runtime.log`, `evidence/cli-logs/session-show-runtime.log` | A local mission can create a session, produce managed artifacts, and expose mission/session read models | Stub/local deterministic evidence, not a live customer workload |
| Mission artifacts | `evidence/output-artifacts/runtime-mission-artifact-list.log` | Prompt, plan, deliverable, reviewer, and learning candidate artifacts are persisted | Portfolio evidence package does not include source code or raw secrets |
| Provider readiness | `evidence/cli-logs/provider-list.log`, `evidence/api-responses/api-providers.json` | Provider catalog, configuration state, capability metadata, attention status, and missing-env handling are visible | Provider availability is scoped by current credentials and target evidence gates |
| Provider blockers | `evidence/cli-logs/release-blockers-hermes.log`, `docs/production-provider-readiness-v1.md` | Hermes and other target-provider blockers are stop conditions rather than hidden failures | No Hermes or all-provider live-ready claim |
| Action and approval | `evidence/cli-logs/approval-inbox-runtime.log`, `evidence/cli-logs/learning-promotions-runtime.log`, `evidence/cli-logs/execution-preflight-approval-runtime.log` | Operator review, learning-promotion approval, and blocked direct execution paths are visible | Approval evidence is local pilot evidence, not hosted workflow compliance |
| Operator API | `evidence/api-responses/api-health.json`, `evidence/api-responses/api-meta.json`, `evidence/api-responses/api-execution-v1-status.json` | Local web API exposes health, auth/RBAC/tenant metadata, and release status without secrets | API evidence is local-server evidence, not public hosted availability |
| Operator UI | `evidence/screenshots/operator-console-home.png`, `evidence/screenshots/representative-release-demo-release-status.png`, `evidence/screenshots/operator-surface-mission-run.png`, `evidence/screenshots/operator-surface-provider-readiness.png`, `evidence/screenshots/operator-surface-action-inbox.png` | The local operator console, release status walkthrough, mission run surface, provider readiness surface, and action inbox surface render through browser automation | Screenshots are local pilot evidence and do not imply public hosted availability |
| Browser evidence report | `evidence/output-artifacts/operator-surface-demo-browser-report.json` | Screenshot dimensions, hashes, active UI step/tab state, provider card count, and action item count are captured for the operator surface walkthrough | Report uses generated local mission ids only and keeps `productionReadyClaim: false` |

## Portfolio Talk Track

1. Start with `Representative Demo: Release Readiness Evidence Walkthrough`.
2. Show the release evidence and immutable snapshot first.
3. Use this document to answer follow-up questions about the supporting operator surfaces.
4. For mission execution, cite the mission/session CLI logs and runtime artifact list.
5. For provider readiness, cite the provider list/API response and blocker handoff.
6. For action handling, cite approval inbox, learning promotion, and execution preflight evidence.
7. Close with the boundary: this supports a provider-scoped local-first pilot explanation, not a hosted SaaS or production-ready claim.

## Captured Browser Evidence

- Mission creation/run browser screenshot: `evidence/screenshots/operator-surface-mission-run.png`
- Provider readiness browser screenshot: `evidence/screenshots/operator-surface-provider-readiness.png`
- Action inbox browser screenshot: `evidence/screenshots/operator-surface-action-inbox.png`
- Browser capture report: `evidence/output-artifacts/operator-surface-demo-browser-report.json`

Refresh command:

```bash
npm run evidence:operator-surface-demo
```

## Follow-Up Evidence Gaps

- Recorded walkthrough or private hosted demo URL
- Actual pilot feedback and metric evidence

These gaps should stay visible until captured. They do not block the current representative demo because the release readiness walkthrough and operator surface support evidence already have screenshot, replay log, browser report, and smoke evidence.

## Verification

Run:

```bash
npm run smoke:operator-surface-demo-evidence
```

The smoke verifies that this document, the demo catalog, the evidence gallery, implementation evidence, evidence manifest, browser report, and screenshots all reference the same mission/provider/action support files without adding production-ready or hosted-demo claims.
