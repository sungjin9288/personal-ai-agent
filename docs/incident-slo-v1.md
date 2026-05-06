# Incident And SLO Policy v1

- status: pilot-policy-source-of-record
- localDate: 2026-05-04
- scope: self-hosted local-first pilot
- relatedPlan: [product-plan-v1.md](product-plan-v1.md)
- relatedSecurity: [security-model-v1.md](security-model-v1.md)
- relatedRunbook: [operator-runbook-v1.md](operator-runbook-v1.md)
- relatedProductionSloOperating: [production-slo-operating-v1.md](production-slo-operating-v1.md)
- relatedTargetSloArchitecture: [target-slo-architecture-v1.md](target-slo-architecture-v1.md)
- relatedEvidence: [execution-v1-evidence.md](execution-v1-evidence.md), [execution-v1-handoff.md](execution-v1-handoff.md)

## Policy Position

This policy defines pilot incident triage and SLO evidence for the local-first harness. It is sufficient for controlled OpenAI-scoped pilot operation, but it is not a production SLO/SLA commitment.

Production readiness still requires customer-approved SLO/SLA terms, on-call ownership, production deployment telemetry, incident review cadence, and clean production-like release evidence.

## Severity Levels

| Severity | Trigger | Initial Response Target | Update Cadence | Owner |
| --- | --- | --- | --- | --- |
| SEV1 | credential leak, customer data exposure, destructive action without approval, release artifact hygiene failure | 1 hour | every 2 hours until contained | admin + human-approver |
| SEV2 | live provider outage or repeated execution failure blocking pilot workflow | 4 hours | every business day until resolved | operator + workspace-owner |
| SEV3 | deterministic smoke failure, overdue approval, blocked specialist follow-up, stale release evidence | 1 business day | every 2 business days | operator |
| SEV4 | documentation gap, non-blocking handoff improvement, demo polish issue | 3 business days | weekly | mission-owner |

## Pilot SLO Targets

- deterministic execution-v1 verification should remain `8/8` before pilot demo or handoff
- release artifact hygiene should report `secretFindingCount=0` and `machinePathFindingCount=0`
- OpenAI-backed live validation evidence should remain archived when claiming the current pilot label
- critical overdue actions should be triaged or logged as accepted risk before external sharing
- runtime data export/delete verification should pass before claiming lifecycle procedure readiness

## Incident Entry Criteria

Create or update an incident record when any of the following is true:

- release artifact hygiene detects a credential or machine-local path leak
- provider live validation fails for a provider included in the claimed readiness scope
- deterministic release verification fails
- execution starts without expected approval or RBAC enforcement is bypassed in enforced mode
- runtime data export/delete verification fails during pilot cleanup
- an overdue critical action remains unresolved before handoff

## Response Workflow

1. Stop external sharing if the issue may expose credentials, customer data, or misleading readiness claims.
2. Capture the failing command, release artifact path, mission id, provider id, and current commit.
3. Run the narrowest relevant smoke or CLI query listed below.
4. Record the incident in `docs/incidents.md` through `action log-overdue` or a tracked incident document entry.
5. Assign owner and next review time using the severity table.
6. Regenerate evidence, closeout, handoff, and snapshot only after the fix is verified.

## Required Triage Commands

Release status:

```bash
npm run smoke:execution-v1-status
npm run smoke:execution-v1-snapshot
npm run smoke:production-readiness-gate
```

Artifact hygiene:

```bash
npm run smoke:release-artifact-hygiene
```

Runtime lifecycle:

```bash
npm run smoke:runtime-data-lifecycle
```

Production-like SLO operating rehearsal:

```bash
npm run rehearsal:production-slo-operating
npm run smoke:production-slo-operating
npm run smoke:target-slo-architecture
```

Provider scope:

```bash
npm run preflight:execution-v1:all
npm run live:execution-v1:openai
```

Action and escalation queues:

```bash
node src/cli.mjs action inbox --overdue
node src/cli.mjs action log-overdue
node src/cli.mjs action maintenance --note "Sweep due incident and reminder pressure"
node src/cli.mjs action escalated --status open
```

## Evidence Requirements

Every incident handoff must include:

- incident severity and owner
- current branch and commit
- affected workspace, mission, provider, or artifact path
- failed command and exact failure class
- mitigation performed
- verification commands and pass/fail result
- whether release evidence was regenerated
- accepted risk, if any
- next review date

## Closure Criteria

An incident can close only when:

- immediate containment is complete
- impacted release or runtime state is verified
- evidence or handoff is regenerated when the release claim changed
- owner records a resolution note
- any accepted risk has a follow-up owner and review date

## Production Gap

This policy is a pilot operating policy. It does not yet provide:

- contractual SLA terms
- staffed production on-call rotation
- external customer status page
- deployment-level telemetry from a production environment
- post-incident review governance for a hosted control plane

Therefore production-ready must remain blocked until production SLO/SLA operating evidence is generated from the target deployment model.

The current local rehearsal evidence is tracked in [production-slo-operating-v1.md](production-slo-operating-v1.md), and the target SLO approval boundary is tracked in [target-slo-architecture-v1.md](target-slo-architecture-v1.md). They prove that pilot SLO operating checks and target SLO/SLA decision requirements are replayable locally, but they are not customer production SLO/SLA evidence.
