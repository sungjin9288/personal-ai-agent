# Personal AI Agent

Personal AI Agent is a local-first multi-agent engineering harness for planning, running, reviewing, and evidencing repository-based AI work.

It is built around a controlled operator workflow: the system keeps human approval, provider state, artifacts, and release evidence visible instead of hiding them behind an unbounded autonomous loop.

## Portfolio Overview

Current validated claim: `provider-scoped pilot-ready` for an OpenAI-backed local-first/self-hosted path.

This project is **not production-ready**, **not all-provider-complete**, and **not a hosted SaaS product**. The repository is public so the runtime shape, evidence trail, and forkable local harness can be reviewed directly.

### Why I Built This

AI-assisted engineering work often fails at the operational boundary, not at text generation. A useful agent workflow needs to answer practical questions:

- What did the agent read before acting?
- Which provider ran the task, and did it fail or fall back?
- Which actions require human approval?
- Where are the plan, execution output, review, and release evidence stored?
- Which readiness claims are supported by evidence, and which claims are blocked?

Personal AI Agent explores that boundary as a local-first harness for engineers and operators who want auditable AI execution without giving up control.

### What It Demonstrates

| Area | Implemented surface | Evidence |
|---|---|---|
| Managed agent workflow | Manager, planner, executor, reviewer, bounded specialist lanes, approval gates | `src/core/mission-service.mjs`, `src/harness/runtime-harness.mjs`, `npm run smoke:execution-flow` |
| Operator control plane | CLI, local web UI/API, action inbox, provider overview, release overview | `src/cli.mjs`, `src/web/server.mjs`, `npm run smoke:ui-execution-console` |
| Provider reliability | Provider registry, preflight, fallback policy, attention remediation, provider telemetry | `src/providers/*`, `npm run smoke:provider-fallback-policy`, `npm run smoke:provider-attention-remediation` |
| Evidence workflow | Release status, closeout, handoff, snapshot, pilot export package | `npm run smoke:execution-v1-status`, `npm run smoke:pilot-export-package` |
| Portfolio demo | Credential-free release readiness walkthrough with replay log, screenshot evidence, and operator surface support map | `npm run smoke:representative-demo`, `npm run smoke:representative-demo-evidence`, `npm run smoke:operator-surface-demo-evidence` |

### Why Fork This

Fork this repo if you want a practical starting point for:

- building a local-first agent control plane around your own repositories
- experimenting with provider adapters behind one execution contract
- turning agent runs into reviewable artifacts instead of chat-only output
- designing approval gates, release blockers, and evidence packages for AI-assisted engineering
- studying how to keep portfolio and release claims honest with deterministic smoke scripts

The project deliberately favors inspectable Node.js modules, file-backed state, and explicit smoke commands over a heavy platform stack.

Contributor path:

- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)
- Fork onboarding: [docs/fork-onboarding-v1.md](docs/fork-onboarding-v1.md)
- Security policy: [SECURITY.md](SECURITY.md)
- Support: [SUPPORT.md](SUPPORT.md)
- Changelog: [CHANGELOG.md](CHANGELOG.md)
- Issue handoff: blank issues are disabled; use the bug report template and attach sanitized `npm run doctor:summary` output to the `Doctor diagnostics summary` field for setup or provider wiring reports.

### Quick Replay

The default replay path does not require external provider credentials. For a single command, run:

```bash
npm run demo:local
```

The command runs the local bootstrap, representative demo checks, release artifact hygiene smoke, and pilot export package smoke in sequence.

Manual replay:

```bash
npm run bootstrap:local
npm run smoke:representative-demo
npm run smoke:representative-demo-evidence
npm run smoke:execution-v1-status
npm run smoke:pilot-export-package
```

Representative demo evidence:

- Demo evidence index: [docs/demo-evidence-index-v1.md](docs/demo-evidence-index-v1.md)
- preview image: `evidence/screenshots/representative-release-demo-preview.png`
- replay log: `evidence/cli-logs/representative-release-demo-replay.log`
- summary: `evidence/output-artifacts/representative-release-demo-summary.json`
- screenshot: `evidence/screenshots/representative-release-demo-release-status.png`
- walkthrough: [docs/demo-scenarios-v1.md](docs/demo-scenarios-v1.md)
- Recorded walkthrough script: [docs/recorded-walkthrough-v1.md](docs/recorded-walkthrough-v1.md)
- operator surface support map: [docs/operator-surface-demo-evidence-v1.md](docs/operator-surface-demo-evidence-v1.md)
- Provider failure recovery demo: [docs/provider-failure-recovery-demo-v1.md](docs/provider-failure-recovery-demo-v1.md)
- Memory retrieval quality fixture: [docs/memory-retrieval-quality-fixture-v1.md](docs/memory-retrieval-quality-fixture-v1.md)
- ML/RAG and fine-tuning development plan: [docs/ml-rag-development-plan-v1.md](docs/ml-rag-development-plan-v1.md)
- Smoke validation summary: [docs/smoke-validation-summary-v1.md](docs/smoke-validation-summary-v1.md)
- External evidence blockers: [docs/external-evidence-blockers-v1.md](docs/external-evidence-blockers-v1.md)
- operator surface screenshots: `evidence/screenshots/operator-surface-mission-run.png`, `evidence/screenshots/operator-surface-provider-readiness.png`, `evidence/screenshots/operator-surface-action-inbox.png`
- operator surface refresh command: `npm run evidence:operator-surface-demo`
- There is no public hosted demo URL.

![Representative demo preview](evidence/screenshots/representative-release-demo-preview.png)

### Status Boundary

| Status | Current state |
|---|---|
| Local-first CLI/web MVP | Implemented and smoke-tested |
| OpenAI-backed local-first pilot | Supported inside the documented pilot boundary |
| Local provider pilot proof | Archived for the configured local rehearsal boundary |
| Anthropic live validation | Blocked by provider account billing/credit evidence |
| Hermes live validation | Blocked until target Hermes provider architecture/model evidence is supplied |
| Hosted SaaS / production deployment | Not implemented; target evidence only |
| Production-ready claim | Explicitly blocked |

Provider readiness matrix: [docs/provider-readiness-matrix-v1.md](docs/provider-readiness-matrix-v1.md)

## Representative Demo

`Representative Demo: Release Readiness Evidence Walkthrough` is the default portfolio demo. It is credential-free and demonstrates the local-first harness through release evidence, provider blockers, handoff readiness, and pilot export packaging without claiming production readiness.

```bash
npm run demo:local
```

The one-command demo currently runs:

- `npm run bootstrap:local`
- `npm run smoke:representative-demo`
- `npm run smoke:representative-demo-evidence`
- `npm run smoke:demo-evidence-index`
- `npm run smoke:recorded-walkthrough`
- `npm run smoke:release-artifact-hygiene`
- `npm run smoke:portfolio-zip`
- `npm run smoke:pilot-export-package`

Use `npm run demo:local -- --plan` to print the command plan without executing it.

## Features

- Workspace and mission model for repository-based work
- Managed role flow for planning, execution, review, and handoff
- Optional specialist lanes for research, implementation, verification, design, and documentation work
- Provider registry for `stub`, OpenAI, Anthropic, OpenAI-compatible local providers, and Hermes-compatible providers
- Approval, action inbox, rollback/log, and provider attention surfaces
- Local web console and CLI over the same service layer
- Light and dark console themes with a system-preference default and a persisted manual toggle
- File-backed runtime state and mission artifacts under `var/`
- Deterministic smoke scripts for execution, provider behavior, release evidence, portfolio claim boundaries, and artifact hygiene

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | JavaScript, Node.js ESM |
| CLI | `src/cli.mjs` |
| Web/API | Node HTTP server in `src/web/server.mjs` |
| UI | Vanilla HTML/CSS/JS in `src/web/public/*` |
| Storage | Local JSON state and file artifacts |
| Providers | Stub, OpenAI Responses API, Anthropic Messages API, OpenAI-compatible local provider, Hermes-compatible adapter |
| Verification | `scripts/smoke-*.mjs`, evidence builders, GitHub Actions provider smoke |

## Architecture

```text
Operator
  -> CLI or local Web UI/API
  -> Mission Service
  -> Runtime Harness
  -> Agent roles and optional specialist lanes
  -> Provider Registry
  -> Provider Adapter
  -> Local Store and Mission Artifacts
  -> Evidence Docs, Handoff, Release Readiness
```

Key modules:

- `src/cli.mjs`: command surface for workspaces, missions, providers, approvals, actions, and overviews
- `src/web/server.mjs`: local operator API and web console
- `src/core/mission-service.mjs`: mission lifecycle, state coordination, and artifact wiring
- `src/harness/runtime-harness.mjs`: role execution, session handling, approval/artifact lifecycle
- `src/providers/index.mjs`: provider registry and execution contract
- `src/core/store.mjs`: local JSON-backed persistence

Architecture code walkthrough: [docs/architecture-code-walkthrough-v1.md](docs/architecture-code-walkthrough-v1.md)

Reference architecture notes:

- OpenClaw as the orchestration backbone: [docs/orchestration-backbone-v1.md](docs/orchestration-backbone-v1.md) defines the gateway/session/workspace/permission/sandbox routing contract, including the channel adapter seam and `externalMessagingEnabled=false` boundary.
- Hermes-style self-improvement engine: [docs/self-improvement-engine-v1.md](docs/self-improvement-engine-v1.md) defines the approved learning loop behind reviewer, approval, memory scope, and evidence gates.

## Key Design Decisions

- **Local-first by default**: the harness can be replayed with the stub provider before any external API key is configured.
- **Operator control over autonomy**: risky execution paths are modeled through approvals, action queues, and release blockers.
- **Provider boundaries are explicit**: provider readiness, fallback, account blockers, and target evidence are visible instead of collapsed into one success label.
- **Evidence is a first-class output**: smoke scripts and generated artifacts are part of the product surface, not an afterthought.
- **Claims stay bounded**: pilot readiness, hosted deployment, and provider validation are separated so the README does not overstate maturity.

## Getting Started

Clone the repo and run the credential-free local bootstrap:

```bash
git clone https://github.com/sungjin9288/personal-ai-agent.git
cd personal-ai-agent
npm run bootstrap:local
```

Start the local operator console:

```bash
npm run ui
```

By default the server starts on `127.0.0.1:4317`. If that port is already in use, the server chooses the next available port and writes the actual URL to `var/server.json`.

Register another workspace:

```bash
node src/cli.mjs workspace add /absolute/path/to/repo --name my-repo
node src/cli.mjs workspace list
```

Create a mission:

```bash
node src/cli.mjs mission create \
  --workspace workspace_xxx \
  --mode engineering \
  --title "Stabilize release smoke" \
  --objective "Produce a bounded implementation proposal" \
  --constraints "Keep blast radius small|Preserve release evidence flow"
```

Run a mission with the default stub provider:

```bash
node src/cli.mjs mission run mission_xxx --provider stub
node src/cli.mjs mission show mission_xxx
```

CLI-first local-first personal AI agent flows remain supported for both engineering and knowledge work. The web console is an operator surface over the same runtime model.

## Provider Configuration

The stub provider works without credentials. External provider paths use environment variables that are referenced in `src/providers/provider-catalog.mjs`, `src/providers/*`, and `src/web/server.mjs`.

Use `.env.example` as the local configuration template:

```bash
cp .env.example .env
```

The runtime reads `process.env` directly and does not load `.env` automatically. Export values in your shell or use your own dotenv loader if you choose to keep a local `.env` file. The default stub provider works without credentials.

Run the local diagnostics before filing setup or provider configuration issues:

```bash
npm run doctor
npm run doctor:summary
```

Public setup and provider reports should use `.github/ISSUE_TEMPLATE/bug_report.yml`. Paste only sanitized `npm run doctor:summary` output into the `Doctor diagnostics summary` field; do not include secrets, provider credentials, private data, or machine-local paths.

| Provider | Core environment variables |
|---|---|
| OpenAI | `OPENAI_API_KEY`, optional `OPENAI_MODEL`, `OPENAI_BASE_URL`, `OPENAI_RUN_TIMEOUT_MS` |
| Anthropic | `ANTHROPIC_API_KEY`, optional `ANTHROPIC_MODEL`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_VERSION` |
| OpenAI-compatible local | `LOCAL_PROVIDER_MODEL`, optional `LOCAL_PROVIDER_BASE_URL`, `LOCAL_PROVIDER_API_KEY`, `LOCAL_PROVIDER_MAX_TOKENS`, `LOCAL_PROVIDER_PROBE_TIMEOUT_MS`, `LOCAL_PROVIDER_RUN_TIMEOUT_MS` |
| Hermes-compatible | `HERMES_PROVIDER_MODEL`, optional `HERMES_PROVIDER_BASE_URL`, `HERMES_PROVIDER_API_KEY`, `HERMES_PROVIDER_MAX_TOKENS` |
| Web auth and tenancy | `PERSONAL_AI_AGENT_WEB_AUTH_MODE`, `PERSONAL_AI_AGENT_WEB_AUTH_TOKEN`, `PERSONAL_AI_AGENT_RBAC_MODE`, `PERSONAL_AI_AGENT_OIDC_*`, `PERSONAL_AI_AGENT_TENANT_*` |

Provider checks:

```bash
node src/cli.mjs provider list
node src/cli.mjs provider check openai
node src/cli.mjs provider probe openai
```

## Testing

Full local sweep (all deterministic smoke scripts, excluding the two Playwright browser e2e checks; exits non-zero on any failure):

```bash
npm run smoke:all
```

CI-safe documentation gate subset (the target/enterprise gates with no git-history dependency; also run by the `Docs gate smokes` GitHub Actions workflow):

```bash
npm run smoke:docs-gates
```

Recommended public-readiness checks:

```bash
npm run package:pilot-export
npm run smoke:doctor
npm run smoke:ui-doctor-surface
npm run smoke:changelog
npm run smoke:support-policy
npm run smoke:contributor-onboarding
npm run smoke:env-example
npm run smoke:demo-local
npm run smoke:demo-evidence-index
npm run smoke:recorded-walkthrough
npm run smoke:architecture-code-walkthrough
npm run smoke:provider-readiness-matrix
npm run smoke:provider-failure-recovery-demo
npm run smoke:memory-retrieval-quality-fixture
npm run smoke:answer-quality-evaluation
npm run smoke:retrieval-corpus-contract
npm run smoke:retrieval-quality-evaluation
npm run smoke:semantic-retrieval-experiment
npm run smoke:retrieval-reranking-experiment
npm run smoke:smoke-validation-summary
npm run smoke:external-evidence-blockers
npm run smoke:readme-portfolio-overview
npm run smoke:portfolio-docs-claim-boundary
npm run smoke:representative-demo-evidence
npm run smoke:operator-surface-demo-evidence
npm run smoke:pilot-export-package
npm run smoke:portfolio-zip
npm run smoke:release-artifact-hygiene
```

Runtime and provider checks:

```bash
npm run smoke
npm run smoke:execution-flow
npm run smoke:target-provider-operations
npm run smoke:provider-fallback-policy
npm run smoke:provider-attention-remediation
npm run smoke:ui-execution-console
```

Production provider readiness rehearsal and gates:

```bash
npm run rehearsal:production-provider-readiness
npm run smoke:production-provider-readiness
npm run smoke:target-provider-evidence-intake
```

Support and incident review gates:

```bash
npm run smoke:support-escalation-review
npm run smoke:customer-support-operations
npm run smoke:incident-slo-policy
```

Target and enterprise evidence gates (each keeps `productionReadyClaim: false` or its target-approval flag `false`; they verify that the required evidence structure is present, not that production is achieved):

```bash
npm run smoke:target-deployment-contract
npm run smoke:target-environment-evidence-intake
npm run smoke:hosted-saas-architecture-decision
npm run smoke:hosted-identity-session-architecture
npm run smoke:hosted-tenant-isolation-architecture
npm run smoke:target-identity-session-operations
npm run smoke:target-tenant-isolation-operations
npm run smoke:identity-session-admin
npm run smoke:tenant-storage-admin
npm run smoke:secret-management
npm run smoke:target-secret-manager
npm run smoke:target-secret-manager-architecture
npm run smoke:observability-telemetry
npm run smoke:target-observability-architecture
npm run smoke:target-observability-operations
npm run smoke:target-slo-architecture
npm run smoke:target-slo-operations
npm run smoke:retention-delete-policy
npm run smoke:target-data-lifecycle-architecture
npm run smoke:target-retention-operations
npm run smoke:target-backup-operations
npm run smoke:target-support-architecture
npm run smoke:target-support-operations
npm run smoke:target-provider-evidence-intake
npm run smoke:target-openai-provider-account
npm run smoke:target-anthropic-provider-account
npm run smoke:target-local-provider-architecture
npm run smoke:target-hermes-provider-architecture
npm run smoke:target-clean-deployment-architecture
npm run smoke:target-clean-deployment-operations
npm run smoke:production-enterprise-controls
```

Local target/production rehearsals that regenerate the evidence for the gates above (all keep `productionReadyClaim: false`):

```bash
npm run rehearsal:production-enterprise-controls
npm run rehearsal:production-slo-operating
npm run smoke:production-slo-operating
npm run rehearsal:production-retention-operating
npm run smoke:production-retention-operating
npm run rehearsal:clean-deployment-release
npm run smoke:clean-deployment-release
npm run drill:production-like-release
npm run smoke:production-like-release-drill
```

Target and enterprise evidence documents verified by the gates above (each keeps its target-approval flag `false` and does not claim production readiness):

- [docs/hosted-saas-architecture-decision-v1.md](docs/hosted-saas-architecture-decision-v1.md)
- [docs/hosted-identity-session-architecture-v1.md](docs/hosted-identity-session-architecture-v1.md)
- [docs/hosted-tenant-isolation-architecture-v1.md](docs/hosted-tenant-isolation-architecture-v1.md)
- [docs/target-identity-session-operations-v1.md](docs/target-identity-session-operations-v1.md)
- [docs/target-tenant-isolation-operations-v1.md](docs/target-tenant-isolation-operations-v1.md)
- [docs/target-secret-manager-architecture-v1.md](docs/target-secret-manager-architecture-v1.md)
- [docs/target-observability-architecture-v1.md](docs/target-observability-architecture-v1.md)
- [docs/target-slo-architecture-v1.md](docs/target-slo-architecture-v1.md)
- [docs/target-slo-operations-v1.md](docs/target-slo-operations-v1.md)
- [docs/target-data-lifecycle-architecture-v1.md](docs/target-data-lifecycle-architecture-v1.md)
- [docs/target-clean-deployment-architecture-v1.md](docs/target-clean-deployment-architecture-v1.md)
- [docs/target-clean-deployment-operations-v1.md](docs/target-clean-deployment-operations-v1.md)
- [docs/target-environment-evidence-intake-v1.md](docs/target-environment-evidence-intake-v1.md)
- [docs/target-provider-evidence-intake-v1.md](docs/target-provider-evidence-intake-v1.md)
- [docs/target-openai-provider-account-v1.md](docs/target-openai-provider-account-v1.md)
- [docs/target-anthropic-provider-account-v1.md](docs/target-anthropic-provider-account-v1.md)
- [docs/target-local-provider-architecture-v1.md](docs/target-local-provider-architecture-v1.md)
- [docs/target-hermes-provider-architecture-v1.md](docs/target-hermes-provider-architecture-v1.md)
- [docs/target-support-architecture-v1.md](docs/target-support-architecture-v1.md)

Provider account and hosted-control target gates prove that the required evidence structure is present while keeping their approval flags `false`:

- hosted identity session architecture evidence can be verified with `npm run smoke:hosted-identity-session-architecture`; it proves customer IdP onboarding proof, user lifecycle proof, session lifecycle proof, role administration proof, permission propagation proof, immutable audit export proof, break-glass governance proof, support impersonation proof, compliance and retention proof, migration plan, rollback, lockout recovery, customer access containment, release artifact hygiene, and regenerated execution snapshot evidence requirements are present, but it keeps `hostedIdentitySessionApproved: false`
- target secret manager architecture evidence can be verified with `npm run smoke:target-secret-manager-architecture`; it proves approved platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage review proof, disaster recovery proof, migration plan, rollback, lockout recovery, credential containment, release artifact hygiene, and regenerated execution snapshot evidence requirements are present, but it keeps `targetSecretManagerApproved: false`
- local target provider evidence intake can be verified with `npm run smoke:target-provider-evidence-intake`; it proves provider account approval proof, target secret injection proof, target-boundary live validation proof, quota and cost guard proof, model and endpoint pinning proof, fallback route proof, and blocker closure verification proof requirements are present, but it does not provide target provider account remediation or production live validation proof
- target OpenAI provider account evidence can be verified with `npm run smoke:target-openai-provider-account`; it proves account ownership proof, billing and quota proof, API key and secret injection proof, OPENAI_MODEL model access proof, provider terms and customer approval proof, usage and cost guard proof, target-boundary OpenAI live validation, telemetry proof, fallback and stop-condition proof, renewal and review audit proof, release artifact hygiene, and regenerated execution snapshot evidence requirements are present, but it keeps `targetOpenAIProviderApproved: false`
- target Anthropic provider account evidence can be verified with `npm run smoke:target-anthropic-provider-account`; it proves account ownership proof, billing and credit remediation proof, API key and secret injection proof, ANTHROPIC_MODEL model access proof, provider terms and customer approval proof, quota and spend guard proof, target-boundary Anthropic live validation, telemetry proof, fallback and stop-condition proof, remediation audit proof, release artifact hygiene, and regenerated execution snapshot evidence requirements are present, but it keeps `targetAnthropicProviderApproved: false`
- target local provider architecture evidence can be verified with `npm run smoke:target-local-provider-architecture`; it proves endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof, target-boundary local provider live validation, release artifact hygiene, and regenerated execution snapshot evidence requirements are present, but it keeps `targetLocalProviderApproved: false`
- target Hermes provider architecture evidence can be verified with `npm run smoke:target-hermes-provider-architecture`; it proves endpoint ownership proof, HERMES_PROVIDER_MODEL model pinning proof, target secret injection proof, tool-call parsing proof, session lifecycle proof, data and transcript policy proof, quota and rate guard proof, telemetry proof, fallback and stop-condition proof, customer approval proof, target-boundary Hermes live validation, release artifact hygiene, and regenerated execution snapshot evidence requirements are present, but it keeps `targetHermesProviderApproved: false`

The repository also includes many narrower smoke scripts in `package.json` for provider operations, release blocker handoff, UI flows, retention, backup, identity/session, tenant isolation, observability, and target evidence gates.

## Release And Evidence

- Current public release: [v0.1.0](https://github.com/sungjin9288/personal-ai-agent/releases/tag/v0.1.0)
- Release asset: `personal_ai_agent_portfolio_pack.zip`
- Changelog: [CHANGELOG.md](CHANGELOG.md)
- Portfolio manifest: [portfolio_manifest.md](portfolio_manifest.md)
- Evidence checklist: [docs/evidence-checklist.md](docs/evidence-checklist.md)
- Release readiness decision: [docs/release-readiness-v1.md](docs/release-readiness-v1.md)
- Demo evidence index: [docs/demo-evidence-index-v1.md](docs/demo-evidence-index-v1.md)
- Recorded walkthrough script: [docs/recorded-walkthrough-v1.md](docs/recorded-walkthrough-v1.md)
- Architecture code walkthrough: [docs/architecture-code-walkthrough-v1.md](docs/architecture-code-walkthrough-v1.md)
- Provider readiness matrix: [docs/provider-readiness-matrix-v1.md](docs/provider-readiness-matrix-v1.md)
- Provider failure recovery demo: [docs/provider-failure-recovery-demo-v1.md](docs/provider-failure-recovery-demo-v1.md)
- Memory retrieval quality fixture: [docs/memory-retrieval-quality-fixture-v1.md](docs/memory-retrieval-quality-fixture-v1.md)
- ML/RAG and fine-tuning development plan: [docs/ml-rag-development-plan-v1.md](docs/ml-rag-development-plan-v1.md)
- Smoke validation summary: [docs/smoke-validation-summary-v1.md](docs/smoke-validation-summary-v1.md)
- External evidence blockers: [docs/external-evidence-blockers-v1.md](docs/external-evidence-blockers-v1.md)
- Fork onboarding: [docs/fork-onboarding-v1.md](docs/fork-onboarding-v1.md)
- Security policy: [SECURITY.md](SECURITY.md)
- Support policy: [SUPPORT.md](SUPPORT.md)
- Target provider operations gate: [docs/target-provider-operations-v1.md](docs/target-provider-operations-v1.md)
- Operator runbook: [docs/operator-runbook-v1.md](docs/operator-runbook-v1.md)
- Self-hosted pilot guide: [docs/deployment-pilot-v1.md](docs/deployment-pilot-v1.md)

## Project Map

```text
src/
  agents/       role prompts
  core/         services, policies, store, retrieval, release readiness
  harness/      runtime execution harness
  packs/        engineering and knowledge mission packs
  providers/    provider adapters and registry
  web/          local web server and operator UI
scripts/        smoke tests and evidence builders
docs/           product, security, runbook, deployment, release evidence
evidence/       replay logs, screenshots, summaries, architecture artifacts
```

## Scope & Limitations

- This is a PoC/MVP local-first harness, not a hosted SaaS product.
- Production-ready claim is explicitly blocked by the release readiness documents.
- Anthropic live validation is blocked until provider account billing/credit evidence is supplied.
- Hermes live validation is blocked until target Hermes provider architecture, model, endpoint, parsing, session, telemetry, fallback, and approval evidence are supplied.
- The local target provider operations can be verified with `npm run smoke:target-provider-operations`; it proves provider account approval proof, target secret injection proof, target-boundary live validation proof, model and endpoint pinning proof, quota, cost, and resource guard proof, fallback and disable path proof, provider fallback runtime audit proof, telemetry proof, incident triage proof, data and transcript handling proof, remediation and renewal review proof, and evidence retention proof requirements are present.
- The target local provider architecture still requires endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof with mission id, execution session id, provider response id or equivalent, retry lineage, artifact provenance, and handoff reference, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, provider operations proof, target-boundary live:execution-v1:local proof, release artifact hygiene result, and regenerated execution snapshot evidence.
- Hosted identity/session, hosted tenant isolation, target secret manager, target observability/SLO, and production clean deployment remain target evidence work.
- There is no public hosted demo URL. The current demo is the credential-free representative replay and evidence package.
- The recorded walkthrough is currently a recording script and acceptance checklist, not a published video URL.
- Customer usage metrics, cost reduction claims, and production SLA claims are intentionally not included because this repository does not contain supporting evidence for them.
- Answer quality evaluation is a credential-free deterministic fixture, not proof of general model accuracy, fine-tuning gain, or production RAG quality.

## Links

- Repository: [github.com/sungjin9288/personal-ai-agent](https://github.com/sungjin9288/personal-ai-agent)
- Release: [v0.1.0](https://github.com/sungjin9288/personal-ai-agent/releases/tag/v0.1.0)
- Demo walkthrough: [docs/demo-scenarios-v1.md](docs/demo-scenarios-v1.md)
- Recorded walkthrough script: [docs/recorded-walkthrough-v1.md](docs/recorded-walkthrough-v1.md)
- Architecture code walkthrough: [docs/architecture-code-walkthrough-v1.md](docs/architecture-code-walkthrough-v1.md)
- Provider readiness matrix: [docs/provider-readiness-matrix-v1.md](docs/provider-readiness-matrix-v1.md)
- Provider failure recovery demo: [docs/provider-failure-recovery-demo-v1.md](docs/provider-failure-recovery-demo-v1.md)
- Memory retrieval quality fixture: [docs/memory-retrieval-quality-fixture-v1.md](docs/memory-retrieval-quality-fixture-v1.md)
- ML/RAG and fine-tuning development plan: [docs/ml-rag-development-plan-v1.md](docs/ml-rag-development-plan-v1.md)
- Smoke validation summary: [docs/smoke-validation-summary-v1.md](docs/smoke-validation-summary-v1.md)
- External evidence blockers: [docs/external-evidence-blockers-v1.md](docs/external-evidence-blockers-v1.md)
- Project card: [docs/project-card.md](docs/project-card.md)
- Case study: [docs/case-study.md](docs/case-study.md)
