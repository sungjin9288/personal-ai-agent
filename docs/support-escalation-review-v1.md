# Support Escalation Review v1

- status: local-support-escalation-review-current
- localDate: 2026-05-05
- scope: self-hosted OpenAI-scoped pilot support escalation audit and incident review rehearsal
- productionReadyClaim: false
- relatedCustomerSupportOperations: [customer-support-operations-v1.md](customer-support-operations-v1.md)
- relatedIncidentSlo: [incident-slo-v1.md](incident-slo-v1.md)
- relatedObservabilityTelemetry: [observability-telemetry-v1.md](observability-telemetry-v1.md)
- relatedTargetSloArchitecture: [target-slo-architecture-v1.md](target-slo-architecture-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)

## Decision Boundary

This document defines the local pilot evidence required before a support escalation, accepted risk, or incident review can be shared with a customer.

It proves that escalation routes, audit packet contents, incident review cadence, customer update rules, and closure checks are explicitly documented for a controlled self-hosted pilot.

It is not staffed production support evidence, not a contractual SLA, not an external ticketing system export, not 24/7 on-call proof, and not permission to claim `production-ready`.

Production-ready remains blocked until the approved target environment proves staffed support ownership, customer communication routing, support audit history, incident review cadence, and on-call escalation evidence.

## Escalation Routes

| Route | Trigger | Required Owner | Evidence Packet |
| --- | --- | --- | --- |
| SEV1 customer-impacting incident | credential exposure, customer data exposure, destructive execution, or unapproved external sharing | incident commander | containment notice, affected scope, mitigation, next update time |
| SEV2 pilot blocker | provider failure, release evidence stale state, auth denial, tenant isolation concern, or restore failure | support owner | failed command, blocker class, owner, target fix window |
| SEV3 operational follow-up | documentation gap, accepted risk, delayed provider validation, or non-blocking support request | evidence owner | risk note, evidence path, next review date |
| SEV4 backlog item | wording, demo polish, runbook clarification, or low-risk process update | technical operator | backlog note and verification owner |

## Audit Packet Requirements

Every escalated support update must include:

- branch and commit
- release label and deployment boundary
- severity and escalation route
- customer-visible impact summary
- failed command or blocker class
- affected provider, workspace, mission, artifact, or runtime root class
- artifact hygiene result
- evidence, closeout, handoff, snapshot, and pilot export package status
- owner and next update time
- mitigation, accepted risk, or closure decision

## Incident Review Cadence

| Review | Timing | Required Inputs | Output |
| --- | --- | --- | --- |
| Initial triage | same business day for SEV2-SEV4, within 1 hour for SEV1 | support intake class, severity, failed command | owner, containment state, next update time |
| Customer update | each promised update window until closure | current blocker state, changed evidence status, mitigation | customer-safe summary and next review date |
| Closure review | before marking resolved | rerun commands, artifact hygiene, updated evidence paths | closure note and residual risk |
| Monthly pilot review | every active pilot month | support audit packet list, accepted risks, open blockers | continuation, pause, or production-readiness stop decision |

## Customer Update Rules

- use only the validated release label: `provider-scoped pilot ready for OpenAI-backed local-first path`
- state whether the issue affects deterministic checks, OpenAI live validation, optional providers, local runtime evidence, or target deployment evidence
- never include raw credentials, machine-local paths, provider transcript secrets, or unredacted runtime state
- include the next update time, owner, and evidence paths
- keep `productionReadyClaim: false` unless target production evidence exists and the release label is explicitly changed

## Required Commands

```bash
npm run smoke:support-escalation-review
npm run smoke:customer-support-operations
npm run smoke:incident-slo-policy
npm run smoke:observability-telemetry
npm run smoke:target-slo-architecture
npm run smoke:release-artifact-hygiene
npm run smoke:production-readiness-gate
```

## Acceptance Rule

This gate is acceptable only when escalation routes, audit packet requirements, incident review cadence, customer update rules, required commands, and production gap are present and the document keeps `productionReadyClaim: false`.

## Production Gap

This is local pilot support escalation and incident review evidence. It does not prove staffed production support coverage, external customer ticketing history, audited support history, production on-call rotation, or incident review governance from a target deployment.

Support escalation and incident review remain blocked for production-ready claims until support audit history, staffed ownership, and customer communication evidence are captured from the approved production-like or hosted target environment.
