# Customer Support Operations v1

- status: local-support-operations-current
- localDate: 2026-05-05
- scope: self-hosted OpenAI-scoped pilot support operations and customer handoff rehearsal
- productionReadyClaim: false
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedIncidentSlo: [incident-slo-v1.md](incident-slo-v1.md)
- relatedRunbook: [operator-runbook-v1.md](operator-runbook-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)

## Decision Boundary

This document defines the support operating contract for a controlled self-hosted pilot. It proves that support ownership, intake routing, escalation paths, customer communications, and handoff evidence are explicitly documented before a pilot package is shared.

It is not staffed production support evidence, not a contractual SLA, not a customer status page, not 24/7 on-call coverage, and not permission to claim `production-ready`.

Production-ready remains blocked until the approved target deployment has staffed support coverage, customer-approved communication channels, incident review cadence, support audit history, and escalation evidence from the actual operating environment.

## Support Roles

| Role | Responsibility | Required Evidence |
| --- | --- | --- |
| Support owner | Owns pilot support commitments, customer expectation setting, and unresolved support risk acceptance | named owner in pilot handoff |
| Technical operator | Runs local diagnostics, smoke gates, provider preflight, evidence refresh, and cleanup commands | command results and affected commit |
| Incident commander | Coordinates SEV1/SEV2 response and external sharing stop decisions | incident record with severity and containment note |
| Customer contact | Receives pilot updates, incident notices, and closure summaries | approved contact route in handoff |
| Evidence owner | Regenerates and validates release evidence before support status changes | evidence path, snapshot path, and artifact hygiene result |

## Support Intake Classes

| Class | Trigger | Initial Response Target | Required First Action |
| --- | --- | --- | --- |
| Access or auth issue | UI/API access denied, RBAC role mismatch, tenant claim mismatch | 1 business day | run auth/RBAC or tenant isolation smoke |
| Provider execution issue | OpenAI/Anthropic/local/Hermes execution fails or preflight changes state | 1 business day | run provider preflight and narrow live command only when approved |
| Data lifecycle issue | export, delete, backup, restore, or cleanup evidence is disputed | 1 business day | run retention, tenant lifecycle, and backup/restore smoke |
| Release evidence issue | release docs are stale, snapshot mismatches, or artifact hygiene fails | same business day | stop external sharing and run release hygiene/status gates |
| Incident or security issue | credential exposure, customer data exposure, destructive action, or unapproved sharing | 1 hour | follow SEV1 incident workflow and stop external sharing |

## Escalation Matrix

| Severity | Escalate To | Required Communication |
| --- | --- | --- |
| SEV1 | support owner, incident commander, admin, customer contact | containment notice, impact summary, next update time |
| SEV2 | support owner, technical operator, customer contact | blocker summary, mitigation path, next business-day update |
| SEV3 | technical operator, evidence owner | failed command, owner, target fix window |
| SEV4 | support owner or evidence owner | documentation or polish backlog note |

## Customer Communication Rules

- communicate only the validated release label: `provider-scoped pilot ready for OpenAI-backed local-first path`
- include whether the issue affects deterministic local checks, OpenAI live validation, optional provider expansion, or target deployment evidence
- never share raw provider credentials, local machine paths, shell history, or unredacted runtime state
- use artifact hygiene before sharing any support packet
- include next review date and owner for every accepted risk

## Pilot Handoff Checklist

- confirm support owner, technical operator, incident commander, customer contact, and evidence owner
- confirm the approved customer workspace path and runtime root boundary
- confirm provider scope and whether optional Anthropic/Hermes validation or target local provider architecture approval is excluded or pending
- attach execution evidence, closeout, handoff, release snapshot, pilot package manifest, and readiness decision
- record known blockers and accepted risks without changing `productionReadyClaim: false`
- define the first support review date after pilot start

## Required Commands

```bash
npm run smoke:customer-support-operations
npm run smoke:incident-slo-policy
npm run smoke:production-readiness-gate
npm run smoke:release-artifact-hygiene
npm run smoke:execution-v1-status
```

## Evidence Requirements

Every support handoff or incident update must include:

- current branch and commit
- release label and deployment boundary
- affected workspace, mission, provider, artifact, or runtime root class
- failed command and failure class
- owner and next update time
- mitigation or accepted risk
- verification commands and pass/fail result
- whether execution evidence, handoff, snapshot, or pilot export package changed

## Acceptance Rule

This gate is acceptable only when support roles, intake classes, escalation matrix, customer communication rules, handoff checklist, required commands, evidence requirements, and production gap are present and the document keeps `productionReadyClaim: false`.

## Production Gap

This is local pilot support operating evidence. It does not prove staffed production support, customer contractual SLA coverage, external status page operation, production incident review governance, or audited support ticket history from a target deployment.

Customer support operations remain blocked for production-ready claims until support coverage and incident communications are proven in the approved production-like or hosted target environment.
