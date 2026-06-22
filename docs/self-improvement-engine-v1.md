# Self Improvement Engine v1

- status: self-improvement-engine-current
- localDate: 2026-06-01
- designInput: Hermes Agent-style learning loop, Loop Engineering verification cycle, memory nudges, skill/template promotion, trajectory compression, and quality feedback
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

## Loop Engineering Cycle

The self-improvement engine maps Loop Engineering into a reviewable learning cycle: observe mission and provider outcomes, classify success or failure patterns, reflect on reusable lessons, propose scoped memory/skill/template/provider-policy updates, approve or reject through a human gate, promote only after verification, and retain or expire the lesson by policy.

The engine must never turn a failed verification into silent iteration. Unsafe, incomplete, cross-scope, or unreviewed learning becomes a stop-condition and re-enters the action inbox. This keeps Hermes-style continuous improvement useful without allowing autonomous promotion, uncontrolled skill mutation, or global memory pollution.

## Adopted Reference Inputs

| Reference | Adopted pattern | Rejected or deferred pattern |
| --- | --- | --- |
| Hermes Agent | Agent-curated memory, periodic nudges, skill creation from repeated work, skill improvement during use, session search/summarization, model switching metadata, subagent and automation signals, trajectory compression mindset | Uncontrolled automatic skill mutation, cross-scope memory sharing, broad messaging gateway ownership, remote terminal backends, RL/data generation pipeline, and Python app vendoring |
| Loop Engineering | Discover/plan/execute/verify/iterate feedback cycle, closed-loop default, maker/checker separation, memory-backed iteration, and explicit stop conditions | Open-loop self-improvement, hidden cost-unbounded retries, approval-free promotion, and using loops to avoid understanding the underlying work |
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

## Provider Fallback Lessons

Provider fallback runs create review-only provider lessons when the fallback attempt set includes provider failure metadata. The candidate evidence records sanitized fallback attempts, `providerFallbackPolicy`, stop-reason counts, selected fallback provider, primary provider, final status, provider failure kind, and recoverability signal without copying raw provider error text into the fallback summary.

Fallback metadata alone does not reclassify deterministic reviewer failures as provider lessons. If a fallback plan stops with `no-provider-failure-metadata`, the existing quality regression or failure pattern classification remains intact while the fallback stop reason is still attached as evidence.

## Promotion Queue Operations

Learning candidates are review-only by default. Each candidate records `retention.policy: pending-review-expires-unpromoted`, `retention.reviewTtlHours: 168`, and an explicit `retention.expiresAt` timestamp so unresolved proposals do not stay actionable forever.

Operators can inspect the queue with:

```bash
npm run smoke:learning-promotion-queue
node src/cli.mjs action learning-promotions --mission <missionId>
node src/cli.mjs action learning-promotions --mission <missionId> --status operator-active
```

Operators can expire pending review items without promoting them:

```bash
node src/cli.mjs action expire-learning-promotions --mission <missionId> --before <iso-timestamp> --note "<reason>"
```

Operators can rollback an approved or promoted item. For memory promotion, rollback deletes the generated scoped memory entry and records `promotionRollback.memoryRollbackStatus` on the candidate:

```bash
node src/cli.mjs action rollback-learning-promotion <learningCandidateId> --note "<reason>"
```

The web operator action inbox uses the same service contract through `/api/actions/learning-promotions/:learningCandidateId/resolve`, `/api/actions/learning-promotions/:learningCandidateId/rollback`, `/api/actions/learning-promotions/:learningCandidateId/remind`, and `/api/actions/learning-promotions/expire`. The UI intentionally keeps promotion manual: pending items expose approve, reject, and expire actions; promoted or approved items expose rollback only when `rollbackEligible` is true, and `verification-blocked` items expose stop-condition reminder and reject-only remediation actions. Resolved terminal states are excluded from the default operator surface through the `promotionStatus=operator-active` action inbox filter.

The web `/api/actions` route also accepts the same action inbox triage filters used by the CLI, including `actionClass`, `needsReminderOnly=true`, and `overdueOnly=true`. The browser UI keeps the full action payload for global counts while showing a filtered action view for `all`, `needs-reminder`, or `overdue`, so reminder triage does not overwrite the mission's total open-action state.

## Learning Candidate Audit Surface

`overview learning-candidates` exposes learning candidates as a read-only operator audit packet without enabling autonomous promotion. It filters by workspace, mission, session, promotion status, record type, proposed target, scope, provider, provider fallback policy, gateway event route, and timestamp.

The audit summary keeps Hermes-style self-improvement bounded by reporting promotion state, retention/expiration policy, rollback eligibility, provider fallback lesson evidence, provider failure taxonomy, gateway event bindings, scope-lock counters, approval-required counters, and no-raw-secrets/no-raw-customer-payload safety counters. It also keeps `autonomousPromotionEnabled=false` and `productionReadyClaim=false` so the overview remains an inspection surface, not a mutation path.

## Learning Promotion Verification Gate

Resolved learning promotions now write a deterministic `promotionVerification` packet to the `learningCandidate` record and artifact. The packet records `schemaVersion`, verification id, status, stop reason, check counts, verification type, target, scope, evidence bindings, `autonomousPromotionEnabled=false`, `productionReadyClaim=false`, and a concrete rollback target.

The verification gate runs for both approve and reject decisions. Memory approval records `rollbackTarget.action=delete-memory-entry` with the generated memory id; non-memory approval and rejection record `rollbackTarget.action=ignore-learning-candidate-decision` so operators can audit why no state mutation must be undone. `overview learning-candidates` summarizes verification status/type/stop-reason counts, and mission timelines attach the verification id, status, type, and stop reason to promotion approval or rejection events.

## Learning Promotion Stop Conditions

Promotion verification now runs before memory mutation. If a requested approve or reject decision fails verification, the candidate is recorded as `promotionStatus=verification-blocked`, `promotionDecision.decision=blocked`, and `promotionStopCondition.status=blocked` with the verification stop reason. Memory approval is not written until the pre-mutation verification passes, so safety failures such as `noRawSecrets=false`, missing evidence, missing review gates, or scope-lock drift become stop-conditions instead of partially promoted lessons.

The stop-condition remains auditable through `overview learning-candidates`, `action learning-promotions --status verification-blocked`, `action inbox --class blocked`, `learning-candidate.json`, and mission timeline event `learning-candidate-promotion-verification-blocked`. `promotionStatus=operator-active` includes `verification-blocked` candidates so the CLI and web action inbox do not hide failed verification work. Blocked items are classified as `actionClass=blocked`, carry `promotionStopReason`, expose `stopConditionRejectCommand`, and recommend a reject-only remediation command:

```bash
node src/cli.mjs action resolve-learning-promotion <learningCandidateId> --decision reject --target <target> --scope <scope> --note "<reason>"
```

Blocked learning promotion stop-conditions also carry `reminderCadenceHours=12`, `nextReminderAt`, `needsReminder`, `lastReminderAt`, and `reminderHistory` so failed verification work does not disappear from operator cadence. Due reminders are visible through the blocked inbox reminder filter and can be recorded without resolving the stop-condition:

```bash
node src/cli.mjs action inbox --mission <missionId> --class blocked --needs-reminder
node src/cli.mjs action remind-learning-promotion-stop-conditions --mission <missionId> --due --note "<reason>"
```

Each reminder is appended to `promotionStopCondition.reminders`, mirrored into `learning-candidate.json`, summarized in `overview learning-candidates`, and emitted as mission timeline event `learning-candidate-promotion-stop-condition-reminded`. The web action inbox uses `/api/actions/learning-promotions/:learningCandidateId/remind` for the same candidate-scoped reminder path so one due stop-condition button does not remind every blocked item in the same mission.

Rejecting a `verification-blocked` item closes the stop-condition without mutating memory. The candidate becomes `promotionStatus=rejected`, keeps the original blocked decision and failed `promotionVerification`, records `promotionStopCondition.status=resolved`, and adds timeline event `learning-candidate-promotion-stop-condition-resolved`. The audit summary reports `promotionStopConditionCount`, stop-condition reason counts, failed verification counts, and verification stop-reason counts while keeping `autonomousPromotionEnabled=false` and `productionReadyClaim=false`.

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
npm run smoke:learning-candidate-audit-surface
npm run smoke:learning-promotion-verification-gate
npm run smoke:learning-promotion-verification-stop-condition
node src/cli.mjs action inbox --mission <missionId> --class blocked --needs-reminder
node src/cli.mjs action remind-learning-promotion-stop-conditions --mission <missionId> --due --note "<reason>"
npm run smoke:ui-learning-promotion-surface
npm run smoke:retrieval-memory
npm run smoke:fact-graph-memory
npm run smoke:memory-rerun
npm run smoke:mission-quality-gate
npm run smoke:orchestration-profiles
npm run smoke:specialist-follow-up-inbox
npm run smoke:provider-fallback-policy
npm run smoke:provider-fallback-learning-lessons
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
3. Add deterministic smoke coverage for memory promotion, rejected promotion, rollback, and expiration. Memory promotion, rejected promotion, rollback execution, and expiration policy are covered by `smoke:learning-promotion-queue`.
4. Add provider fallback lesson extraction from provider events and stop-condition timelines. Provider fallback attempts with provider failure metadata now update learning candidates as provider-policy lessons with sanitized policy, stop reason, selected fallback provider, and recoverability evidence, backed by `smoke:provider-fallback-learning-lessons`.
5. Add an operator surface that shows learning candidates without enabling automatic promotion by default. The web action inbox now renders learning candidates with manual approve, reject, expire, and rollback controls, backed by `smoke:ui-learning-promotion-surface`.
6. Add a read-only operator audit surface for learning candidates. `overview learning-candidates` now summarizes promotion status, record type, target, scope, provider fallback lessons, retention/expiration policy, rollback eligibility, gateway event bindings, and safety counters without enabling autonomous promotion, backed by `smoke:learning-candidate-audit-surface`.
7. Add a deterministic verification gate for resolved learning promotions. Approve and reject decisions now store `promotionVerification` with check counts, stop reason, evidence bindings, and rollback target, and expose that verification in audit records and mission timelines, backed by `smoke:learning-promotion-verification-gate`.
8. Add a stop-condition path for failed promotion verification. Unsafe or incomplete promotion decisions now become `verification-blocked` candidates before memory mutation, with `promotionStopCondition` evidence, audit summary counts, queue visibility, and mission timeline events, backed by `smoke:learning-promotion-verification-stop-condition`.
