# Pilot Onboarding v1

- status: draft-source-of-record
- localDate: 2026-05-04
- scope: customer or company pilot onboarding
- relatedPlan: [product-plan-v1.md](product-plan-v1.md)
- relatedSecurity: [security-model-v1.md](security-model-v1.md)
- relatedRunbook: [operator-runbook-v1.md](operator-runbook-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedEvidence: [execution-v1-evidence.md](execution-v1-evidence.md), [execution-v1-handoff.md](execution-v1-handoff.md)

## Onboarding Goal

The pilot should prove that a company can use the local-first multi-agent harness to run a bounded engineering workflow with clear context, explicit approval, provider readiness checks, evidence generation, and handoff.

The onboarding goal is not to prove production SaaS readiness. The current release should be described as `provider-scoped pilot ready for OpenAI-backed local-first path`: OpenAI and configured local provider live validation are archived, Anthropic is blocked by provider account credit/billing, Hermes requires approved runtime endpoint and model configuration, and target local provider architecture still requires approved target-boundary endpoint/model, network isolation, telemetry, quota/resource guard, and local provider live validation evidence before any production provider claim.

## Who Should Attend

- pilot owner: decides whether the pilot is successful
- operator: runs CLI/UI, creates missions, regenerates evidence
- approver: approves or rejects risky execution
- admin: manages workspace access, environment configuration, export/delete policy
- engineering participant: supplies the first real workflow and reviews output usefulness
- security reviewer: checks data boundary, credential handling, and artifact export policy

Minimum pilot group:

- one operator
- one approver
- one engineering participant
- one admin or security reviewer

## Pre-Onboarding Checklist

- [ ] pilot owner is named
- [ ] operator, approver, admin, and reviewer responsibilities are assigned
- [ ] approved pilot workspace is selected
- [ ] pilot data boundary is agreed
- [ ] provider usage policy is agreed
- [ ] live provider credentials are either approved or intentionally deferred
- [ ] `docs/security-model-v1.md` has been reviewed
- [ ] `docs/deployment-pilot-v1.md` has been followed
- [ ] `docs/operator-runbook-v1.md` is available during the session
- [ ] no raw secrets are included in mission attachments

## Day 0 Preparation

Operator prepares:

```bash
npm run bootstrap:local
npm run smoke
npm run smoke:execution-v1-status
npm run smoke:execution-v1-snapshot
npm run smoke:execution-v1-handoff
npm run preflight:execution-v1:all
```

Admin prepares:

- approved workspace path
- provider credential decision
- local provider or Hermes endpoint decision, if applicable
- export destination for final handoff package
- cleanup decision for local runtime state after pilot

Approver prepares:

- approval criteria
- allowed workspace actions
- blocked actions
- accepted-risk escalation policy

Engineering participant prepares:

- one bounded workflow
- expected deliverable
- success criteria
- representative docs/logs that can be safely attached

## First Session Agenda

1. Confirm pilot scope and non-scope.
2. Review security model and data boundary.
3. Confirm provider plan: stub-only, archived OpenAI proof, one new live provider, or multiple live providers.
4. Register approved workspace.
5. Start operator UI.
6. Create first mission.
7. Run the mission with stub or approved provider.
8. Resolve approval if generated.
9. Review output, action inbox, and mission timeline.
10. Regenerate evidence, closeout, handoff, and snapshot if the result is used for handoff.
11. Run artifact hygiene scans.
12. Record pilot outcome and next step.

## First Demo Mission

Recommended first mission:

```text
Title: Verify release readiness for pilot workspace
Objective: Produce an evidence-backed release readiness summary for the approved workspace.
Constraints:
- Keep blast radius small.
- Do not commit, push, deploy, or mutate production systems.
- Require verification before closeout.
- Separate assumptions, risks, and next actions.
Deliverable:
- Readiness summary
- Verification checklist
- Follow-up action list
```

CLI example:

```bash
node src/cli.mjs mission create \
  --workspace workspace_xxx \
  --mode engineering \
  --title "Verify release readiness for pilot workspace" \
  --objective "Produce an evidence-backed release readiness summary for the approved workspace" \
  --constraints "Keep blast radius small|Do not commit push or deploy|Require verification before closeout|Separate assumptions risks and next actions"
```

Run safely with stub first:

```bash
node src/cli.mjs mission run mission_xxx --provider stub
```

Then inspect:

```bash
node src/cli.mjs mission show mission_xxx
node src/cli.mjs mission timeline mission_xxx
node src/cli.mjs action inbox --mission mission_xxx
```

## Provider Onboarding Path

Use this only after the stub path is understood.

1. Run aggregate preflight.

```bash
npm run preflight:execution-v1:all
```

2. Choose one approved provider for the first new live validation. OpenAI already has archived proof in the current evidence pack unless the operator intentionally refreshes it.

3. Inject approved env/configuration in the deployment shell.

4. Run the provider live validation.

```bash
npm run live:execution-v1:openai
npm run live:execution-v1:anthropic
npm run live:execution-v1:local
npm run live:execution-v1:hermes
```

5. Regenerate evidence after live validation using the selected live provider flag.

```bash
node scripts/build-execution-v1-evidence.mjs --live-openai
npm run closeout:execution-v1 -- --reuse-existing-evidence
npm run handoff:execution-v1
npm run snapshot:execution-v1
```

Use `--live-anthropic`, `--live-local`, or `--live-hermes` only when that provider is approved and configured. Do not run deterministic-only evidence generation when preserving archived live proof matters.

Provider onboarding success:

- selected provider preflight is not blocked
- live validation completes
- refreshed evidence records the validation
- no credential leaks appear in shareable artifacts

Provider onboarding failure:

- keep failure evidence
- do not expand provider-backed readiness beyond the providers with archived successful live proof
- decide whether to retry, switch provider, or continue as deterministic-only pilot

## UI Walkthrough

Operator should show:

- workspace and mission queue
- mission setup and AI configuration cards
- run result and session history
- reviewer output and approval inbox
- action inbox and escalation pressure
- harness memory and source-of-record surfaces
- `v1 마감 상태` tab
- provider preflight cards
- evidence, closeout, handoff, and snapshot status

Participant should answer:

- was the mission objective clear?
- was the output useful enough to review?
- was the approval point understandable?
- could the evidence be handed to another operator?
- which missing feature blocks broader usage?

## Success Criteria

Pilot onboarding is successful when:

- participants understand product scope and non-scope
- approved workspace is registered
- first mission is created and run
- mission output is reviewed by a human participant
- approval behavior is demonstrated or explicitly marked not applicable
- action inbox and mission timeline are inspected
- evidence/handoff artifacts are understood
- artifact hygiene scan passes before sharing
- next pilot workflow is selected

## Stop Conditions

Stop the onboarding session if:

- deterministic smoke fails
- approved workspace path is unclear
- mission requires production mutation without approval
- raw credentials appear in prompt, attachment, docs, or output
- participant asks to use unapproved provider or data
- release artifacts show real secret or unintended machine-local path
- operator cannot explain the current release label and remaining gaps

## Pilot Outcome Template

Use this at the end of the session.

```text
Pilot date:
Pilot owner:
Operator:
Approver:
Workspace:
Provider mode:
Mission:
Result:
Evidence path:
Handoff path:
Open actions:
Accepted risks:
Decision:
Next workflow:
```

Decision values:

- continue deterministic-only pilot
- continue OpenAI-scoped pilot
- run one-provider live validation
- expand to additional workflow
- pause for security review
- stop pilot

## Common Questions

Q: Can we claim this is production-ready after onboarding?

A: No. Onboarding proves controlled pilot usability. OpenAI live evidence exists for the current scoped pilot, but production readiness still requires expanded provider evidence where applicable, enforced enterprise controls, retention/export/delete verification, and final release decision.

Q: Can we use real company code?

A: Yes, only if the workspace is approved for the pilot and provider/data boundary is agreed. Stub-only runs keep model-provider exposure out of scope.

Q: Can the agent commit or push?

A: Not by default. Commit/push is outside this onboarding flow and requires explicit operator instruction and repository policy approval.

Q: Can multiple teams share one pilot runtime?

A: Not for v1 pilot. Use one isolated runtime state per customer or company pilot to avoid cross-team or cross-customer data mixing.

## Current Status

This onboarding guide is sufficient for a controlled OpenAI-backed local-first pilot session with configured local provider rehearsal evidence archived.

The remaining blockers are Anthropic billing/account remediation, Hermes runtime configuration, target local provider architecture evidence for target-boundary endpoint/model, network isolation, telemetry, quota/resource guard, local provider live validation, and target clean deployment controls for source provenance, artifact registry, dependency installation, runtime bootstrap, secret injection, environment boundary, smoke/health verification, rollback/recovery, release approval, and failed-deployment containment.
