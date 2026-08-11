# Engineering Approval Workflow Rehearsal v1

- status: verified-deterministic-rehearsal
- captureCommit: `a7870fac0b59ed151c47180c99686aae2aa14311`
- scenario: scenario-2-engineering-mission-with-approval
- providerMode: stub
- participantCount: 0
- humanApprovalCollected: false
- humanFeedbackCollected: false
- externalProviderCalls: 0
- providerCostUsd: 0
- productionReadyClaim: false
- canonicalArtifact: `evidence/output-artifacts/engineering-approval-workflow-rehearsal.json`

## What Was Replayed

The rehearsal creates an isolated temporary runtime and an empty target workspace, then uses the real CLI to create and run the documented Scenario 2 engineering mission. It inspects mission show, mission timeline, approval inbox, action inbox, and session state before resolving one fixture-only approval. The observed role order is manager, planner, executor, and reviewer; the mission moves from `awaiting_approval` to `completed`, and the pending approval count moves from one to zero.

The fixture approval exists only to exercise the deterministic handoff path. It is not human approval evidence. The runtime root is removed after the replay, the target workspace digest is unchanged, and only content-free hashes and bounded booleans are retained.

## Replay

```bash
npm run rehearse:engineering-approval
npm run smoke:engineering-approval
```

The canonical artifact is regenerated only when intentionally binding a reviewed implementation commit:

```bash
npm run evidence:engineering-approval -- --capture-commit <40-character-commit>
```

## Claim Boundary

- not human approval evidence
- not participant feedback evidence
- not a generalizable result
- not productivity evidence
- not external-provider validation
- not deployment or production evidence

The existing n=1 sanitized pilot record remains separate. This rehearsal does not change or close the four external provider, target architecture, and hosted deployment blockers.
