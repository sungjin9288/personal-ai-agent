# Target Support Architecture v1

- status: local-target-support-architecture-current
- localDate: 2026-05-06
- decision: do-not-claim-target-support-readiness-without-approved-target-evidence
- scope: target support staffing, queue, communication, audit, escalation, on-call handoff, and incident review architecture decision contract
- productionReadyClaim: false
- targetSupportApproved: false
- relatedCustomerSupportOperations: [customer-support-operations-v1.md](customer-support-operations-v1.md)
- relatedSupportEscalationReview: [support-escalation-review-v1.md](support-escalation-review-v1.md)
- relatedTargetSupportOperations: [target-support-operations-v1.md](target-support-operations-v1.md)
- relatedIncidentSlo: [incident-slo-v1.md](incident-slo-v1.md)
- relatedProductionSloOperating: [production-slo-operating-v1.md](production-slo-operating-v1.md)
- relatedTargetSloArchitecture: [target-slo-architecture-v1.md](target-slo-architecture-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedTargetEnvironmentEvidenceIntake: [target-environment-evidence-intake-v1.md](target-environment-evidence-intake-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Decision Boundary

This record defines the target support architecture decision and evidence requirements that must be satisfied before describing the system as production-grade for staffed support coverage, support queue routing, customer communication, ticket audit history, escalation ownership, on-call handoff, or incident review governance.

It is not staffed support implementation, not ticketing system proof, not 24/7 coverage proof, not customer communication history, not on-call rota proof, not incident review governance proof, not contractual SLA approval, and not permission to claim `production-ready`.

The current approved path remains OpenAI-scoped self-hosted/local-first pilot. Target support readiness remains blocked until a replacement architecture decision is approved and target evidence is generated from the approved production-like or hosted environment.

## Support Decision Areas

| Area | Required Target Decision Before Support Claim | Current Position | Status |
| --- | --- | --- | --- |
| Staffing model | named support owner, coverage window, primary/secondary rota, backup policy, timezone policy, and absence handling | local support gates define roles without staffed target rota proof | blocked |
| Support queue platform | ticketing system, queue identifier, severity mapping, routing rule, retry path, and queue owner | local intake classes exist without target ticket queue evidence | blocked |
| Severity and routing policy | SEV mapping, acknowledgement target, escalation timeout, incident commander handoff, and customer impact rule | incident policy and support review exist without target acknowledgement history | blocked |
| Customer communication boundary | approved customer channel, update cadence, message owner, approval path, status route, and closure rule | local communication templates exist without customer-visible target history | blocked |
| Ticket audit and retention | ticket lifecycle audit, assignment history, update history, redaction rule, retention period, and evidence owner | local evidence packet requirements exist without target ticket audit export | blocked |
| On-call handoff | primary/secondary handoff, acknowledgement timestamp, missed-ack rule, paging fallback, and handoff log retention | target support operations define requirements without staffed handoff proof | blocked |
| Incident commander ownership | incident commander assignment, decision authority, mitigation owner, rollback owner, and customer communication owner | pilot incident policy exists without target incident command proof | blocked |
| Escalation and backup coverage | engineering escalation, provider escalation, executive/customer escalation, backup owner, and failure fallback | support escalation review defines routes without target escalation execution history | blocked |
| Support data handling | customer data redaction, secret redaction, provider transcript handling, ticket attachment rules, and access audit | artifact hygiene gates exist without target support data access proof | blocked |
| Incident review governance | review cadence, corrective action owner, due date, customer impact summary, closure decision, and evidence retention | incident review requirements exist without target review governance history | blocked |

## Required Evidence Packet

Any future target support approval must include:

- staffing model proof with support owner, coverage window, primary rota, secondary rota, backup policy, timezone coverage, and absence handling
- support queue proof with ticketing system, queue identifier, severity mapping, routing rule, retry path, queue owner, and access policy
- severity routing proof with acknowledgement target, escalation timeout, incident commander handoff, customer impact rule, and audit record
- customer communication proof with approved channel, update cadence, message owner, approval path, status route, customer-visible timestamp, and closure message
- ticket audit proof with lifecycle history, assignment history, customer-visible update history, redaction result, retention period, and evidence owner
- on-call handoff proof with primary owner, secondary owner, acknowledgement timestamp, missed-ack rule, paging fallback, and handoff log
- incident commander proof with assignment record, decision authority, mitigation owner, rollback owner, and communication owner
- escalation proof with engineering escalation, provider escalation, executive/customer escalation, backup owner, retry history, and failure fallback
- support data handling proof with secret redaction, customer data redaction, provider transcript handling, attachment rule, access audit, and hygiene result
- incident review governance proof with review cadence, corrective action owner, due date, customer impact summary, closure decision, and evidence retention
- migration plan from local customer support operations, support escalation review, and target support operations gates to approved target support architecture
- explicit containment plan for missed acknowledgement, queue misrouting, customer communication failure, ticket audit gaps, and unstaffed escalation

## Release Blocker Closure Linkage

| Blocker | Architecture Stop Condition | Shared Operations Stop Condition | Boundary Stop Condition | Closure Verifications | Required Proofs | Required Commands | Required Evidence Docs | Production Claim |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| target support architecture | target-support-architecture-missing | target-support-operations-missing | target-support-boundary-missing-or-mismatched | 3 | 15 | 11 | 5 | blocked |

Target support architecture owns the support decision proof. Target support operations owns the staffed operational proof. Target deployment contract and target environment evidence intake own the same-boundary support evidence verification. Keep `productionReadyClaim: false` and `targetSupportApproved: false` until linked closure verifications have target support architecture approval proof, staffed support coverage proof, support queue routing proof, customer communication proof, ticket audit proof, on-call handoff proof, incident commander proof, escalation and backup proof, support data handling proof, incident review governance proof, migration and containment proof, release artifact hygiene result, production readiness gate result, and regenerated execution-v1 snapshot evidence from the same approved target boundary.

## Required Commands

```bash
npm run smoke:target-support-architecture
npm run smoke:customer-support-operations
npm run smoke:support-escalation-review
npm run smoke:target-support-operations
npm run smoke:incident-slo-policy
npm run smoke:production-slo-operating
npm run smoke:target-slo-architecture
npm run smoke:target-deployment-contract
npm run smoke:target-environment-evidence-intake
npm run smoke:production-readiness-gate
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

This gate is acceptable only when the target support decision areas, required evidence packet, required commands, and production gap are present, and the document keeps `productionReadyClaim: false` and `targetSupportApproved: false`.

## Production Gap

This is a local target support architecture contract. It does not approve target support readiness, implement a staffed support rota, prove a target ticketing system, prove customer communication history, prove on-call handoff, prove incident review governance, approve contractual support terms, or satisfy target environment production evidence.

Target support readiness remains blocked until a replacement architecture decision is approved, implementation is completed, target evidence is generated from the approved production-like or hosted environment, and release evidence is regenerated with `productionReadyClaim` still false until every mandatory production control passes.
