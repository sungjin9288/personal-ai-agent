# Demo Scenarios v1

- status: draft-source-of-record
- localDate: 2026-05-04
- scope: customer or company pilot demo catalog
- relatedPlan: [product-plan-v1.md](product-plan-v1.md)
- relatedOnboarding: [pilot-onboarding-v1.md](pilot-onboarding-v1.md)
- relatedRunbook: [operator-runbook-v1.md](operator-runbook-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedEvidence: [execution-v1-evidence.md](execution-v1-evidence.md), [execution-v1-handoff.md](execution-v1-handoff.md)

## Demo Goal

The demo catalog proves the product through concrete operator-visible workflows, not abstract claims. Each scenario should show a bounded task, explicit controls, evidence, and a decision point.

The demo may claim OpenAI-scoped local-first pilot readiness when it uses the archived evidence pack. It must not claim production readiness or all-provider completeness because OpenAI and configured local provider live validation are archived only for the pilot boundary, Anthropic is blocked by provider billing/account credits, Hermes requires target Hermes provider architecture evidence for endpoint ownership proof, HERMES_PROVIDER_MODEL model pinning proof, target secret injection proof, tool-call parsing proof, session lifecycle proof, data and transcript policy proof, quota and rate guard proof, telemetry proof, fallback and stop-condition proof, customer approval proof, target-boundary npm run live:execution-v1:hermes pass, release artifact hygiene result, and regenerated execution snapshot evidence, and target local provider architecture still requires endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof, target-boundary npm run live:execution-v1:local pass, release artifact hygiene result, and regenerated execution snapshot evidence.

## Demo Principles

- start with stub or deterministic flows before live providers
- use approved workspaces only
- keep each mission small enough to inspect in one session
- avoid raw secrets in prompts, attachments, output, or docs
- show evidence and handoff surfaces after each meaningful workflow
- separate successful completion from known gaps

## Scenario 1: Release Readiness

Purpose:

- show that the harness can verify its own execution-v1 release state with reproducible evidence.

Best audience:

- engineering lead
- platform/operator
- security reviewer

Preparation:

```bash
npm run smoke
npm run smoke:execution-v1-status
npm run smoke:execution-v1-snapshot
npm run smoke:execution-v1-handoff
npm run preflight:execution-v1:all
```

Demo flow:

1. Open the operator UI.
2. Navigate to `결과와 기록 -> v1 마감 상태`.
3. Show deterministic status, reference adoption readiness, runtime summary, provider cards, evidence, closeout, handoff, and snapshot status.
4. Regenerate release artifacts if the current surface changed. Preserve archived live proof unless intentionally refreshing provider evidence.

```bash
npm run closeout:execution-v1 -- --reuse-existing-evidence
npm run handoff:execution-v1
npm run snapshot:execution-v1
```

If live provider proof is intentionally refreshed, run the selected live evidence command first:

```bash
node scripts/build-execution-v1-evidence.mjs --live-openai
```

5. Re-run status and snapshot smoke.

```bash
npm run smoke:execution-v1-status
npm run smoke:execution-v1-snapshot
```

Success criteria:

- deterministic execution-v1 checks pass
- handoff generator passes
- snapshot smoke passes
- provider scope and gaps are shown explicitly: OpenAI and configured local provider archived for the pilot boundary, Anthropic billing/account blocker if still unresolved, Hermes target provider architecture evidence for endpoint ownership proof, HERMES_PROVIDER_MODEL model pinning proof, target secret injection proof, tool-call parsing proof, session lifecycle proof, data and transcript policy proof, quota and rate guard proof, telemetry proof, fallback and stop-condition proof, customer approval proof, target-boundary live validation, release artifact hygiene, and regenerated execution snapshot still required before any provider claim, and target local provider architecture evidence for endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof, target-boundary local live validation, release artifact hygiene, and regenerated execution snapshot still required for production claims
- evidence and handoff are readable by a second operator

Stop criteria:

- deterministic smoke fails
- snapshot is stale or missing
- artifact hygiene scan finds real secret material

## Scenario 2: Engineering Mission With Approval

Purpose:

- show managed multi-agent flow from mission creation through reviewer output and approval handling.

Best audience:

- engineering participant
- approver
- engineering lead

Mission:

```text
Title: Prepare bounded implementation plan
Objective: Produce a small implementation plan with assumptions, success criteria, verification, and approval boundary.
Constraints:
- Keep blast radius small.
- Do not commit, push, deploy, or mutate production systems.
- Require verification before closeout.
```

CLI setup:

```bash
node src/cli.mjs mission create \
  --workspace workspace_xxx \
  --mode engineering \
  --title "Prepare bounded implementation plan" \
  --objective "Produce a small implementation plan with assumptions success criteria verification and approval boundary" \
  --constraints "Keep blast radius small|Do not commit push or deploy|Require verification before closeout"
```

Run:

```bash
node src/cli.mjs mission run mission_xxx --provider stub
```

Inspect:

```bash
node src/cli.mjs mission show mission_xxx
node src/cli.mjs mission timeline mission_xxx
node src/cli.mjs approval inbox
node src/cli.mjs action inbox --mission mission_xxx
```

Optional approval demo:

```bash
node src/cli.mjs approval resolve approval_xxx --decision approve --reason "Approved for bounded local execution"
```

Success criteria:

- mission has manager, planner, executor, and reviewer artifacts
- assumptions, success criteria, and verification are visible
- risky execution requires explicit approval when applicable
- action inbox and timeline show the current operator state

Stop criteria:

- mission objective is vague
- approval request is too broad to understand
- output suggests unapproved commit, push, deploy, or production mutation

## Scenario 3: Provider Validation And Readiness

Purpose:

- show that provider-backed operation has explicit preflight, missing-env handling, live validation, and evidence refresh.

Best audience:

- platform/operator
- admin
- security reviewer

Preflight:

```bash
npm run preflight:execution-v1:all
```

Demo path A, archived OpenAI-scoped pilot evidence:

- show the current evidence/handoff release label
- show OpenAI live validation as archived
- show configured local provider live validation as archived for the pilot boundary
- show Anthropic provider-account blocker if still unresolved
- show Hermes target provider architecture evidence gap and target-boundary live validation requirement if still unapproved
- show target local provider architecture evidence for endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof, target-boundary local live validation, release artifact hygiene, and regenerated execution snapshot as still required before production claims
- explain that production readiness and all-provider completeness are not claimed

Demo path B, deterministic-only:

- show `blockedCount: 0`
- show `missingEnvCount`
- show provider-specific `missingEnvCommand`
- explain that provider-backed readiness is not claimed yet

Demo path C, approved live provider refresh:

```bash
export OPENAI_RUN_TIMEOUT_MS=60000 OPENAI_API_KEY="..."
npm run live:execution-v1:openai
```

or:

```bash
export ANTHROPIC_API_KEY="..."
npm run live:execution-v1:anthropic
```

or:

```bash
export LOCAL_PROVIDER_BASE_URL="..." LOCAL_PROVIDER_MODEL="..."
npm run live:execution-v1:local
```

or:

```bash
export HERMES_PROVIDER_MODEL="..." HERMES_PROVIDER_BASE_URL="..."
npm run live:execution-v1:hermes
```

After live validation, refresh evidence with the selected live provider flag:

```bash
node scripts/build-execution-v1-evidence.mjs --live-openai
npm run closeout:execution-v1 -- --reuse-existing-evidence
npm run handoff:execution-v1
npm run snapshot:execution-v1
```

Use the matching selected provider flag when refreshing Anthropic, local, or Hermes. Do not run deterministic-only evidence generation when preserving archived live proof matters.

Success criteria:

- preflight distinguishes missing env from blocked deterministic prerequisites
- selected live provider succeeds or produces clear failure evidence
- refreshed evidence records live validation status
- credential values are not written to docs or artifacts

Stop criteria:

- provider credential is not approved
- participant wants to send unapproved customer data to external provider
- live validation fails and no triage owner is assigned

## Scenario 4: Document And Memory Grounding

Purpose:

- show that the harness can ground a mission in approved attachments and memory, then expose retrieval evidence.

Best audience:

- engineering participant
- knowledge/documentation owner
- security reviewer

Preparation:

- choose a non-secret Markdown, text, JSON, log, or source file
- optionally configure `PERSONAL_AI_AGENT_MARKITDOWN_BIN` for supported document conversion
- add a workspace or mission memory entry in the UI, or use existing pilot-safe context

Mission:

```text
Title: Summarize pilot-safe release context
Objective: Use approved attached context to produce a concise readiness summary and list missing evidence.
Constraints:
- Use only approved pilot context.
- Identify assumptions.
- Cite which source context was used.
```

Run:

```bash
node src/cli.mjs mission run mission_xxx --provider stub
```

UI walkthrough:

1. Open mission setup.
2. Show `AI가 지금 읽는 자료`.
3. Show retrieval preview.
4. Run mission.
5. Open retrieval artifact from result/session artifacts.
6. Show harness memory and source-of-record surfaces.

Verification commands:

```bash
npm run smoke:retrieval-memory
npm run smoke:fact-graph-memory
npm run smoke:document-conversion
```

Success criteria:

- only approved context is used
- retrieval source labels are visible
- retrieval artifact can be opened after run
- fact memory provenance is inspectable when fact memory is used

Stop criteria:

- attachment includes secrets
- converted document contains unapproved production data
- agent output treats untrusted attachment instructions as operator instructions

## Scenario 5: Multi-Specialist Analysis

Purpose:

- show bounded parallel specialist lanes and quality-gated merge behavior without claiming unbounded autonomous swarm behavior.

Best audience:

- engineering lead
- implementation engineer
- reviewer

Mission:

```text
Title: Analyze pilot change from multiple perspectives
Objective: Produce research, implementation, verification, design, and documentation notes for a bounded pilot change.
Constraints:
- Use orchestration-profile:engineering-full-spectrum.
- Preserve approval and reviewer gates.
- Do not mutate production systems.
```

CLI setup:

```bash
node src/cli.mjs mission create \
  --workspace workspace_xxx \
  --mode engineering \
  --title "Analyze pilot change from multiple perspectives" \
  --objective "Produce research implementation verification design and documentation notes for a bounded pilot change" \
  --constraints "orchestration-profile:engineering-full-spectrum|Preserve approval and reviewer gates|Do not mutate production systems"
```

Run:

```bash
node src/cli.mjs mission run mission_xxx --provider stub
```

Inspect:

```bash
node src/cli.mjs mission show mission_xxx
node src/cli.mjs overview profiles
node src/cli.mjs action specialist-follow-ups --mission mission_xxx
```

Verification:

```bash
npm run smoke:orchestration-profiles
npm run smoke:parallel-specialists
npm run smoke:reference-adoptions
```

Success criteria:

- specialist lanes are bounded and inspectable
- profile metadata is visible
- quality gate or follow-up behavior is visible when specialist work is incomplete
- merge does not bypass reviewer/approval semantics

Stop criteria:

- audience expects unbounded autonomous swarm
- output cannot explain which lane produced which handoff
- unresolved specialist follow-up is ignored instead of triaged

## Recommended Demo Order

1. Release Readiness
2. Engineering Mission With Approval
3. Document And Memory Grounding
4. Multi-Specialist Analysis
5. Provider Validation And Readiness

Rationale:

- deterministic trust should come before provider-backed claims
- approval and evidence should be understood before specialist complexity
- provider validation should be last unless the pilot explicitly starts with live model proof

## Demo Outcome Template

```text
Demo date:
Audience:
Workspace:
Provider mode:
Scenarios shown:
Scenarios skipped:
Evidence path:
Handoff path:
Open actions:
Accepted risks:
Success criteria met:
Stop criteria hit:
Decision:
Next scenario:
```

Decision values:

- continue pilot
- run provider live validation
- add customer-specific workflow
- pause for security review
- stop pilot

## Current Status

This scenario catalog is sufficient for a controlled customer or company pilot demo.

The remaining blockers are Anthropic billing/account remediation, target Hermes provider architecture evidence for endpoint ownership proof, HERMES_PROVIDER_MODEL model pinning proof, target secret injection proof, tool-call parsing proof, session lifecycle proof, data and transcript policy proof, quota and rate guard proof, telemetry proof, fallback and stop-condition proof, customer approval proof, target-boundary Hermes live validation, release artifact hygiene, regenerated execution snapshot, target local provider architecture evidence for endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof, target-boundary local live validation, release artifact hygiene, regenerated execution snapshot, and target clean deployment controls for source provenance, artifact registry, dependency installation, runtime bootstrap, secret injection, environment boundary, smoke/health verification, rollback/recovery, release approval, and failed-deployment containment.
