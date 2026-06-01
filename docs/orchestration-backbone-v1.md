# Orchestration Backbone v1

- status: orchestration-backbone-current
- localDate: 2026-06-01
- designInput: OpenClaw-style gateway/control plane, Claw Code-style CLI harness discipline, Harness-style artifact and runner boundary
- pairedEngine: [self-improvement-engine-v1.md](self-improvement-engine-v1.md)
- relatedReferences: [reference-repos.md](reference-repos.md)
- relatedProductPlan: [product-plan-v1.md](product-plan-v1.md)
- relatedSecurity: [security-model-v1.md](security-model-v1.md)
- relatedRunbook: [operator-runbook-v1.md](operator-runbook-v1.md)
- productionReadyClaim: false

## Decision Boundary

This document defines the local orchestration backbone for the personal AI runtime. The backbone is the gateway and control plane that owns channel ingress, identity/session binding, workspace routing, tool permissions, sandbox policy, provider routing, and evidence events.

The target shape is OpenClaw as the backbone and Hermes-style learning as an engine attached behind it. The backbone must stay stable even when memory, skills, providers, or self-improvement policies change.

This is a design contract, not a production-ready claim. It does not approve hosted SaaS, always-on public messaging, unbounded remote execution, or direct vendoring from the reference repositories.

## Adopted Reference Inputs

| Reference | Adopted pattern | Rejected or deferred pattern |
| --- | --- | --- |
| OpenClaw | Local-first gateway, channel adapters, session separation, workspace routing, permissions, sandbox modes, tools/skills/plugin registry, provider gateway surface, operator status commands | Direct production channel matrix, public always-on deployment claim, plugin vendoring, and broad remote gateway exposure before target evidence |
| Claw Code | CLI harness discipline, `doctor`/parity mindset, build-from-source clarity, provider/runtime separation | Rust harness rewrite, deprecated package assumptions, and replacing the Node runtime |
| Harness | Pipeline boundary, artifact registry mindset, local runner/server separation, durable state warning, operator-facing DevOps surface | Go/Gitness platform adoption, hosted SCM, Gitspaces, Docker-socket-coupled CI engine, and artifact registry implementation inside v1 |
| Hermes Agent | Gateway compatibility, provider-aware model switching, interrupt/approval cues, and subagent routing signals consumed by the backbone | Hermes process ownership, Python app vendoring, broad messaging gateway matrix, automatic skill mutation, and remote terminal backends in the backbone |

## Backbone Responsibilities

| Responsibility | Required behavior | Evidence surface |
| --- | --- | --- |
| Channel ingress | Normalize CLI, web, scheduled, and future message-channel inputs into a single gateway event shape | mission timeline, workspace timeline, operator timeline |
| Identity and session binding | Bind every event to an identity context, session id, workspace id, mission id, and source surface before memory lookup | session history, runtime isolation evidence |
| Workspace routing | Route work to an explicit workspace and orchestration profile instead of sharing implicit global context | orchestration profile overview, workspace overview |
| Permission policy | Decide whether a requested tool, file, provider, channel, or remediation action is allowed, approval-required, or denied | approval inbox, action inbox, provider attention events |
| Sandbox policy | Apply the least permissive execution mode that can complete the work and record the selected boundary | runtime isolation, target deployment contract |
| Tool and skill registry | Expose tools as actions and skills as instructions with versioned metadata, owners, and enablement policy | reference adoption smoke, mission quality gate |
| Provider routing | Apply provider selection, preflight state, fallback policy, stop condition, retry lineage, and telemetry | provider events, fallback summary, provider timeline |
| Evidence routing | Emit all material control-plane decisions to durable artifacts without raw secrets, private endpoint credentials, or customer payloads | release artifact hygiene, execution-v1 evidence |

## Routing Model

```text
surface input
  -> gateway event
  -> identity/session binding
  -> workspace route
  -> orchestration profile
  -> permission and sandbox decision
  -> provider route and fallback policy
  -> mission execution
  -> reviewer/quality gate
  -> timeline, provider event, artifact, and follow-up record
```

The backbone owns this routing order. The self-improvement engine may propose a better memory, skill, template, provider rule, or follow-up, but it must not bypass session binding, permission policy, sandbox policy, reviewer judgment, or release evidence gates.

Backbone evidence routing must make the route inspectable from mission, workspace, operator, and provider views without copying raw secrets or customer payloads into artifacts.

## Session And Channel Rules

1. Session separation comes before memory lookup.
2. Channel identity and workspace identity must remain explicit on every event.
3. A memory learned in one scope cannot silently become a global rule.
4. Channel adapters must be disabled by default until pairing, identity, retention, and support boundaries are documented.
5. Message delivery failures are channel events, not agent reasoning failures.
6. Operator commands must be able to show the route, source surface, provider, fallback policy, and stop reason for a mission.

## Permission And Sandbox Rules

| Rule | Required behavior |
| --- | --- |
| Deny by default | Unknown tools, channels, providers, external endpoints, and file roots are denied until explicitly configured |
| Approval before risk | File mutation, provider remediation, external dispatch, deployment, data export, and destructive actions require explicit approval or a documented operating gate |
| Sandbox is a boundary signal | Sandbox mode reduces blast radius but is not treated as a complete security wall |
| Secrets stay outside artifacts | Evidence records aliases, owners, and proof summaries, not raw credentials or private endpoint strings |
| Recovery is explicit | Provider fallback records fallback policy, selected fallback provider, stop condition, recoverability, and operator-visible reason |

## Backbone Interfaces

| Interface | Purpose | Initial implementation posture |
| --- | --- | --- |
| `gatewayEvent` | Normalized input from CLI, web, schedules, and future message channels | Extend current mission/session metadata before adding new channels |
| `identitySessionContext` | Identity, workspace, mission, role, and surface binding | Keep local-first and tenant-aware gates explicit |
| `permissionDecision` | Allow, deny, or approval-required outcome for tools and provider actions | Reuse approval/action/provider attention inbox patterns |
| `sandboxDecision` | Execution mode, denied capabilities, and evidence note | Keep deterministic smoke coverage before expanding execution backends |
| `providerRouteDecision` | Provider, model, fallback policy, retry lineage, stop reason, and telemetry key | Reuse provider fallback policy and provider events surfaces |
| `evidenceEvent` | Durable event for timeline, operator views, release evidence, and support handoff | Preserve artifact hygiene and no-secret rules |

## Required Commands

```bash
npm run smoke:openclaw-hermes-orchestration-docs
npm run smoke:orchestration-profiles
npm run smoke:runtime-isolation
npm run smoke:provider-fallback-policy
npm run smoke:provider-events
npm run smoke:mission-timeline
npm run smoke:workspace-timeline
npm run smoke:operator-timeline
npm run smoke:target-deployment-contract
npm run smoke:release-artifact-hygiene
npm run smoke:production-readiness-gate
```

## Acceptance Rule

The backbone direction is accepted only when the source-of-record docs, reference registry, README, and smoke gate all agree that OpenClaw-style orchestration owns gateway/session/workspace/channel/permission/sandbox routing while Hermes-style self-improvement stays behind approval, memory scope, reviewer, and evidence boundaries.

## Production Gap

This document does not prove production readiness. Before any production or hosted claim, the project still needs approved target environment evidence, identity/session operations evidence, tenant isolation evidence, provider live validation evidence, target secret manager evidence, observability/SLO evidence, support operations evidence, clean deployment evidence, and regenerated execution-v1 artifacts.

## Next Implementation Slices

1. Define a normalized `gatewayEvent` schema for CLI, web, schedule, and future channel ingress.
2. Add a policy-owned permission decision record that can be reused by tools, provider remediation, and channel actions.
3. Attach sandbox decisions to mission timelines and operator timelines.
4. Extend provider fallback events so the route can be inspected from mission, workspace, operator, and provider views.
5. Add an adapter seam for future channel connectors without enabling external messaging by default.
