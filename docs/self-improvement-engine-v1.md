# Self Improvement Engine v1

- status: self-improvement-engine-current
- localDate: 2026-06-01
- designInput: Hermes Agent-style learning loop, memory nudges, skill/template promotion, trajectory compression, and quality feedback
- pairedBackbone: [orchestration-backbone-v1.md](orchestration-backbone-v1.md)
- relatedReferences: [reference-repos.md](reference-repos.md)
- relatedProductPlan: [product-plan-v1.md](product-plan-v1.md)
- relatedMemory: [retention-delete-v1.md](retention-delete-v1.md)
- relatedSecurity: [security-model-v1.md](security-model-v1.md)
- productionReadyClaim: false

## Decision Boundary

This document defines the Hermes-style self-improvement engine that attaches to the OpenClaw-style orchestration backbone. The engine observes mission outcomes, extracts candidate lessons, proposes memory/skill/template/provider updates, and routes those proposals through approval, reviewer, and evidence gates.

The engine does not own channel ingress, identity/session binding, workspace routing, permission policy, sandbox policy, or provider routing. Those remain backbone responsibilities.

This is a design contract, not an approval to run autonomous recursive self-improvement, mutate code without review, share memory across scopes, or promote unverified lessons into global behavior.

## Adopted Reference Inputs

| Reference | Adopted pattern | Rejected or deferred pattern |
| --- | --- | --- |
| Hermes Agent | Agent-curated memory, periodic nudges, skill creation from repeated work, skill improvement during use, session search/summarization, model switching metadata, subagent and automation signals, trajectory compression mindset | Uncontrolled automatic skill mutation, cross-scope memory sharing, broad messaging gateway ownership, remote terminal backends, RL/data generation pipeline, and Python app vendoring |
| OpenClaw | Gateway-owned session/channel/workspace separation that constrains what the learning engine can see and promote | Treating memory as a gateway replacement or letting learned state bypass permission/sandbox checks |
| Claw Code | `doctor`/parity discipline for checking whether learned behavior matches expected runtime capability | Rewriting the agent harness before learning controls are proven |
| Harness | Evidence packet, artifact retention, runner boundary, and promotion gate thinking | Turning the self-improvement engine into a CI/CD platform or artifact registry |

## Engine Loop

```text
observe
  -> classify
  -> reflect
  -> propose
  -> approve
  -> promote
  -> verify
  -> retain or expire
```

| Step | Required behavior |
| --- | --- |
| Observe | Read bounded mission artifacts, timelines, provider events, reviewer feedback, quality gate state, and explicit user preferences |
| Classify | Label the lesson as failure pattern, success pattern, memory candidate, skill candidate, template candidate, provider lesson, or quality regression |
| Reflect | Summarize the narrow reusable rule, supporting evidence, affected scope, confidence, and expiration condition |
| Propose | Create a reviewable update with owner, scope, source artifacts, privacy notes, and rollback path |
| Approve | Require approval for global memory, skill/template promotion, provider policy changes, or behavior that affects future users/workspaces |
| Promote | Write only to the approved scope and keep the previous version available for rollback |
| Verify | Run deterministic smoke, rerun, or targeted mission validation before treating the update as accepted |
| Retain or expire | Keep lessons only while they have a valid owner, scope, evidence trail, and retention class |

## Learning Record Types

| Record type | Description | Default scope |
| --- | --- | --- |
| Failure pattern | Repeated error, rejected reviewer output, provider fallback stop condition, or unresolved follow-up | workspace or mission family |
| Success pattern | Reusable plan, verification sequence, prompt shape, or artifact pattern that improved a mission | workspace |
| Memory candidate | Fact or preference that should be recalled later with provenance | user/workspace/session as approved |
| Skill candidate | Repeatable procedure that can become an instruction bundle with inputs, outputs, risks, and verification | workspace or repo |
| Template candidate | Reusable report, evidence packet, runbook, checklist, or command sequence | repo or product area |
| Provider lesson | Provider failure taxonomy, recoverability signal, fallback policy outcome, model capability note, or cost/rate guard lesson | provider family |
| Quality regression | Pattern that reduced correctness, security, test quality, artifact hygiene, or operator trust | global only after approval |

## Promotion Rules

| Promotion target | Minimum evidence | Required guard |
| --- | --- | --- |
| Session memory | Source artifact and mission id | Must not leak across sessions unless explicitly promoted |
| Workspace memory | Repeated value or explicit user confirmation | Workspace owner or operator approval |
| Global memory | Cross-workspace evidence and no privacy conflict | Manual approval, rollback path, and retention class |
| Skill | At least one successful use, one risk note, and one verification command | Reviewer approval and smoke or rerun evidence |
| Template or playbook | Concrete example, expected inputs/outputs, and failure handling | Artifact hygiene and owner review |
| Provider policy | Provider event evidence, fallback policy id, stop reason, and recoverability signal | Provider operations gate and customer impact rule |
| Automation | Schedule, owner, delivery target, stop rule, and audit event | Approval gate and operator-visible disable path |

## Memory And Privacy Rules

1. Session memory, workspace memory, user preference, provider lesson, and global operating rule are separate stores or separately labeled records.
2. A lesson learned from private customer data cannot become global text.
3. Memory promotion must preserve source artifact references but not raw secrets, tokens, billing identifiers, private endpoint credentials, or customer personal data.
4. Retrieval may suggest context, but reviewer and quality gates decide whether the learned pattern is safe to reuse.
5. Expiration and delete requests must remove or retire learned records from the applicable scope.
6. Failed predictions become quality regression records instead of silently updating future behavior.

## Self-Improvement Safety Rules

| Risk | Required containment |
| --- | --- |
| Bad lesson compounding | Store confidence, evidence count, owner, verification result, and rollback target |
| Global memory pollution | Require manual promotion, scope label, retention class, and privacy review |
| Unreviewed skill mutation | Write proposed skill deltas as reviewable artifacts before enabling them |
| Provider policy drift | Require fallback policy id, stop reason, recoverable flag, customer impact rule, and provider operations evidence |
| Hidden automation | Require schedule owner, delivery route, next run, last result, and disable command |
| Self-modifying code | Treat as normal code change through branch, test, review, and release evidence |

## Required Commands

```bash
npm run smoke:openclaw-hermes-orchestration-docs
npm run smoke:gateway-event-learning-candidate
npm run smoke:learning-promotion-queue
npm run smoke:retrieval-memory
npm run smoke:fact-graph-memory
npm run smoke:memory-rerun
npm run smoke:mission-quality-gate
npm run smoke:orchestration-profiles
npm run smoke:specialist-follow-up-inbox
npm run smoke:provider-fallback-policy
npm run smoke:provider-events
npm run smoke:release-artifact-hygiene
npm run smoke:production-readiness-gate
```

## Acceptance Rule

The self-improvement direction is accepted only when learned behavior remains scoped, reviewable, reversible, and evidence-backed. The engine may recommend memory, skill, template, automation, or provider policy changes, but the backbone still controls identity/session/workspace/channel/permission/sandbox routing.

## Production Gap

This document does not prove production readiness or continuous learning safety in a customer environment. Before production use, the project still needs target data lifecycle evidence, target provider operations evidence, identity/session operations evidence, tenant isolation evidence, retention/export/delete proof, support escalation proof, observability/SLO evidence, clean deployment evidence, and regenerated execution-v1 artifacts.

## Next Implementation Slices

1. Add a `learningCandidate` artifact that can be emitted from mission closeout and reviewer feedback. Mission terminal states now emit review-only `learningCandidate` records and `learning-candidate.json` artifacts; promotion remains manual and scope-locked.
2. Add a scoped promotion queue for memory, skill, template, provider policy, and automation proposals. Pending `learningCandidate` records now appear as human-decision queue items, and approve/reject decisions stay scope-locked.
3. Add deterministic smoke coverage for memory promotion, rejected promotion, rollback, and expiration. Memory promotion and rejected promotion are covered; rollback execution and expiration policy remain future slices.
4. Add provider fallback lesson extraction from provider events and stop-condition timelines.
5. Add an operator surface that shows learning candidates without enabling automatic promotion by default.
