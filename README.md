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
- Actual user-query evaluation protocol: [docs/actual-user-query-evaluation-v1.md](docs/actual-user-query-evaluation-v1.md)
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
npm run smoke:semantic-retrieval-runtime
npm run smoke:local-embedding-model-qualification
npm run smoke:local-retrieval-robustness
npm run smoke:local-relevance-reranker
npm run smoke:local-reranker-resource-envelope
npm run smoke:local-reranker-runtime-stability
npm run smoke:local-relevance-shadow-integration
npm run smoke:local-relevance-shadow-replay
npm run smoke:local-relevance-shadow-cache
npm run smoke:local-relevance-shadow-cache-lifecycle
npm run smoke:local-relevance-shadow-cache-process-isolation
npm run smoke:local-relevance-shadow-cache-termination-soak
npm run smoke:approved-learning-rag-feedback
npm run smoke:approved-learning-feedback-quality
npm run smoke:workspace-learning-personalization
npm run smoke:workspace-learning-conflict-revocation
npm run smoke:workspace-learning-operator-override
npm run smoke:workspace-learning-operator-surface
npm run smoke:local-user-learning-personalization
npm run smoke:user-learning-conflict-revocation
npm run smoke:user-learning-operator-override
npm run smoke:user-learning-operator-surface
npm run smoke:approved-training-record
npm run smoke:training-dataset-quality
npm run smoke:fine-tuning-readiness
npm run smoke:fine-tuning-data-sufficiency
npm run smoke:fine-tuning-data-collection-plan
npm run smoke:fine-tuning-data-intake-request
npm run smoke:fine-tuning-data-intake-resolution
npm run smoke:local-training-runtime
npm run smoke:local-training-permission-surface
npm run smoke:local-training-permission-evidence
npm run smoke:local-training-environment-preflight
npm run smoke:local-training-toolchain-decision
npm run smoke:local-training-acquisition-request
npm run smoke:local-training-acquisition-resolution
npm run smoke:local-training-acquisition-execution-plan
npm run smoke:local-training-acquisition-runtime
npm run smoke:local-training-acquisition-artifact-verification
npm run smoke:local-training-post-acquisition-readiness
npm run smoke:mlx-lm-lora-training-adapter
npm run smoke:local-training-runtime-closure-provenance
npm run smoke:local-training-process-supervisor
npm run smoke:local-training-os-isolation
npm run smoke:local-training-runtime-exec-observation
npm run smoke:local-training-runtime-image-provenance
npm run smoke:local-training-darwin-suspended-exec
npm run smoke:local-training-candidate-artifact-verification
npm run smoke:local-candidate-evaluation-admission
npm run smoke:local-candidate-evaluation-runtime
npm run smoke:local-candidate-evaluation-input-view
npm run smoke:local-candidate-evaluation-workspace-recovery
npm run smoke:local-candidate-evaluation-process-lifecycle
npm run smoke:local-candidate-evaluation-host-boot-recovery
npm run smoke:local-candidate-evaluation-host-restart-rehearsal
npm run smoke:local-candidate-evaluation-host-restart-receipt
npm run smoke:local-candidate-evaluator-provenance
npm run smoke:candidate-model-evaluation
npm run smoke:local-answer-quality-baseline
npm run smoke:local-answer-composition-candidate
npm run smoke:local-answer-composition-robustness
npm run smoke:local-answer-composition-hardening
npm run smoke:answer-input-boundary
npm run smoke:local-answer-composition-boundary-regression
npm run smoke:user-query-evaluation-intake
npm run smoke:local-user-query-quality
npm run smoke:local-answer-review-action-generalization
npm run smoke:actual-user-query-evaluation-readiness
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
- The current fine-tuning packet is structurally reviewable but fails the cost-free data sufficiency gate: 4 accepted examples, a 3/1 train-validation split, 4 mission scopes, and 2 passing baseline cases. The initial 20/16/4, 10-scope, and 10-case policy is a development stop condition, not a model-quality or production-performance claim (`npm run smoke:fine-tuning-data-sufficiency`). Candidate review, training, provider submission, and rollout remain unauthorized.
- The reviewed-data collection plan converts those deficits into one non-overlapping minimum of 16 additional reviewed examples, including 6 new mission scopes, plus 8 separate answer-quality baseline cases (`npm run smoke:fine-tuning-data-collection-plan`). It stores no training content, creates no synthetic records, and grants no collection, candidate-review, training, submission, or rollout authority.
- The reviewed-data intake request binds that plan to a time-limited, content-free owner review packet with five explicit data-handling roles (`npm run smoke:fine-tuning-data-intake-request`). It records no owner decision or source data and grants no collection, candidate-review, training, submission, or rollout authority.
- The reviewed-data intake resolution protocol accepts one owner-only private decision file, revalidates the current F1.1–F1.3 chain, and records only ordered owner-role attestations plus evidence-reference and reason hashes in private `var/` history (`npm run smoke:fine-tuning-data-intake-resolution`). It does not authenticate owner identity or inspect evidence content, so the repository and private resolution make no actual owner-decision or independently verified evidence claim. Even unanimous attestation permits only a later private collection plan; data collection, candidate review, training, provider submission, rollout, and production claims remain unauthorized.
- The answer-quality and retrieval fixtures are not general benchmarks. `qwen2.5:3b` semantic+lexical scoring regressed to 0.5333 against the lexical baseline's 0.6667 on the recorded 15-case suite, while independent local relevance scoring reached 1.0 with repeat-stable scores (`npm run smoke:local-relevance-reranker`). The evaluation-only lexical top-2 shortlist preserved that result while reducing recorded inference count from 90 to 60; its maximum observation increased from 1462.735ms to 1643.582ms (`npm run smoke:local-reranker-resource-envelope`). A separate six-run observation retained the same quality and resource footprint across one Ollama-model-absent cold, three warm, and two concurrent-client runs; warm p95 drift was -0.66% and concurrent p95 was 1.5622 times warm p95 (`npm run smoke:local-reranker-runtime-stability`). R11 first connected the scorer to one four-role stub mission without changing lexical provider input (`npm run smoke:local-relevance-shadow-integration`). R12 then replayed 3 controlled scenarios, 15 missions, and 60 role observations. The full retrieval query passed 12/15 and failed every hard-negative case; keeping the qualified scorer query on the mission objective passed 15/15 and changed 16 of 60 lexical top-1 decisions to the expected source (`npm run smoke:local-relevance-shadow-replay`). R13 retained 15/15 while a 64-entry process-local score cache reduced 120 requests to 30 model inferences with 90 exact-pair hits; total observation latency changed from 51406.590ms to 13939.543ms, while the maximum increased from 938.621ms to 1992.079ms (`npm run smoke:local-relevance-shadow-cache`). R14 repeated 15/15 with an 8-entry cache, recording 22 LRU evictions, one stale in-flight result drop after invalidation, fresh refill, and rollback close with zero remaining entries (`npm run smoke:local-relevance-shadow-cache-lifecycle`). R15 ran the same bound input through two concurrent child processes and one restarted child process; every process made one cold inference, served one local cache hit, inherited zero parent environment keys, returned the same score, and closed with zero entries (`npm run smoke:local-relevance-shadow-cache-process-isolation`). R16 observed a warm worker terminated by SIGKILL, proved the recovery worker inferred again from an empty cache, and ran 48 unique pairs plus 16 recent-pair hits through a 16-entry cache with 32 evictions; recorded heap and RSS growth stayed below the local 64 MiB and 128 MiB regression limits (`npm run smoke:local-relevance-shadow-cache-termination-soak`). P1 then replayed one stub mission before approval, after a verified mission-memory promotion, and after rollback: retrieval matched four terms, the planner moved from three to four steps, reviewer pass remained stable, and rollback restored exact baseline planner and deliverable hashes (`npm run smoke:approved-learning-rag-feedback`). P2 repeated that lifecycle for three same-workspace missions while all three approved memories existed: the controlled Q1 case pass changed from 0/3 to 3/3 and returned to 0/3 after rollback; each promoted case excluded both foreign mission-memory candidates, kept reviewer failure and external provider calls at zero, and restored exact baseline planner and deliverable hashes (`npm run smoke:approved-learning-feedback-quality`). These numbers apply only to the recorded fixtures. OS page-cache cold boot, production server parallelism, production supervisor and worker-pool lifecycle, shared cache, killed-process cleanup, OS restart, long-duration soak or repeated soak, thermal behavior, actual model replacement, actual user-query quality, cross-mission generalization, workspace or user personalization, general answer-quality improvement, actual model training, and provider-input activation remain unproven. Activation is blocked on license, OS-level egress isolation, approved resource, concurrency and latency limits, cache and rollback ownership, and explicit approval.
- P3 validates one controlled workspace-personalization path only. After a separate local-operator mission-to-workspace authorization, one sibling mission changed from three to four planner steps and moved from failed to passed on the fixture gate; rollback restored its exact baseline, while an identical objective in another workspace retained zero memory exposure and exact planner/deliverable hashes across all phases (`npm run smoke:workspace-learning-personalization`). This does not establish general cross-mission learning, general workspace or user personalization, actual model training, or production readiness.
- P4 validates deterministic conflict selection and revocation fallback for approved workspace decisions. In a credential-free replay across two workspaces, four missions, and eight distinct stub sessions, two retrieval-selected decisions resolved to the newer revision only; revoking it through the existing rollback action restored the exact older-only planner, deliverable, and quality hashes, and revoking both restored the exact baseline. The foreign workspace retained zero exposure (`npm run smoke:workspace-learning-conflict-revocation`). This is a fixed latest-revision policy, not learned conflict resolution, general personalization, actual model training, or production readiness.
- P5 validates a bounded local-operator override on top of the P4 default. Across two workspaces, four missions, and eight distinct stub sessions, the default newer decision changed to the older retrieved decision only while an approved override was active; expiration and explicit clear each restored the exact newer planner, deliverable, and quality hashes, repin restored the exact older result, and the foreign workspace retained zero exposure (`npm run smoke:workspace-learning-operator-override`). The override cannot inject unretrieved or foreign memory. This does not establish automatic preference learning, semantic conflict resolution, general personalization, actual model training, or production readiness.
- P6 exposes that bounded override through the existing action inbox. The local HTTP replay covers not-set, active, expired, and cleared states with content-free summaries and mutation responses, while a real local Chromium run clicks set and clear controls and preserves the screenshot plus hash-bound evidence (`npm run smoke:workspace-learning-operator-surface`, browser replay: `npm run smoke:workspace-learning-operator-surface-browser`). RBAC, candidate tenant access, promotion verification, scope authorization, secret blocking, and timeline history remain enforced. This does not establish automatic preference learning, model training, external provider validation, or production readiness.
- P7 validates one controlled local single-user personalization path. After explicit mission-to-user authorization, one approved decision is applied to a sibling mission and a mission in another tenant-free local workspace; both move from failed to passed on the fixture gate, and rollback restores their exact baseline planner, deliverable, and quality hashes across seven distinct stub sessions (`npm run smoke:local-user-learning-personalization`). Tenant-bound workspaces cannot authorize this global user scope, and user facts are not injected. This does not establish hosted user personalization, multi-user isolation, general personalization, actual model training, external provider behavior, or production readiness.
- P8 resolves simultaneous retrieved local-user decisions with a fixed latest-revision policy. Across two tenant-free local workspaces, four missions, and eight distinct stub sessions, only the newer decision reaches provider context in both target workspaces; revoking it restores the exact older-only planner, deliverable, and quality hashes, and revoking both restores the exact baseline (`npm run smoke:user-learning-conflict-revocation`). User preferences remain outside this conflict filter. This is deterministic policy behavior, not learned semantic conflict resolution, hosted or multi-user personalization, actual model training, external provider validation, or production readiness.
- P9 adds a bounded local-operator override for verified user decisions without weakening P8's default. Across two tenant-free local workspaces, four missions, and eight distinct stub sessions, an active older-decision override applies only when that memory is retrieved; expiration and clear restore exact newer baseline artifacts and quality, while repin restores the exact older result (`npm run smoke:user-learning-operator-override`). The source promotion must be tenant-free and permission-complete, and notes are secret/customer-payload checked. This does not establish automatic preference learning, hosted or multi-user personalization, learned conflict resolution, actual model training, external provider validation, or production readiness.
- P10 exposes the bounded local-user override through the existing action inbox. A local HTTP replay covers not-set, active, expired, and cleared states with content-free summaries, sanitized responses, and ordered timeline events; a real local Chromium replay clicks the user set and clear controls and preserves hash-bound screenshot evidence (`npm run smoke:user-learning-operator-surface`, browser replay: `npm run smoke:user-learning-operator-surface-browser`). RBAC, candidate tenant access, tenant-free source validation, permission evidence, note safety, and artifact history remain enforced. This does not establish automatic preference learning, hosted or multi-user personalization, model training, external provider validation, or production readiness.
- F2b exposes bounded local-training permission through the existing approval inbox. The local replay verifies CLI request, approver-only HTTP approval and revocation, tenant isolation, ordered gateway audit, and an actual Chromium approval action with content-free evidence (`npm run smoke:local-training-permission-surface`, browser replay: `npm run smoke:local-training-permission-surface-browser`). Approval records owner-attested license, OS egress, resource, and rollback evidence hashes; it does not independently verify the environment, start training, authorize rollout, or establish production readiness. A training caller must re-read the current permission and revocation state; F2c.9 makes the runtime reject a previously exported execution approval when that current state is missing or changed.
- F2c.1 inspects the current local training environment without network access or dependency installation. The tracked preflight verifies the installed `qwen2.5:3b` GGUF, manifest, and license metadata hashes, while keeping training stopped because no trainable source model, supported trainer, approved product permission, independent environment reviews, or rollback owner is present (`npm run smoke:local-training-environment-preflight`). No model training or rollout was performed.
- F2c.2 selects a pinned acquisition candidate without installing it: MLX-LM LoRA 0.31.3 with the immutable Apache-2.0 `Qwen/Qwen2.5-1.5B-Instruct` source revision. The packet verifies current Apple Silicon, Python, `venv`, and `uv` prerequisites, then stops for seven explicit install, download, license, egress, resource, rollback, and product-permission decisions (`npm run smoke:local-training-toolchain-decision`). No dependency, model, training process, or rollout was created.
- F2c.3 turns that candidate into a hash-bound acquisition request without executing it. The request fixes five owner roles, seven ordered actions, a repository-relative mutable root, and proposed—not measured or approved—caps of two concurrent downloads, 8 GiB download, 16 GiB disk, and one hour (`npm run smoke:local-training-acquisition-request`). Its current state is `pending-owner-review`; even a future approval authorizes acquisition only, while training, external submission, rollout, and production claims remain denied.
- F2c.4 adds the operator-owned resolution surface without inventing an approval. `npm run resolve:local-training-acquisition -- --decision <private-json-path>` accepts one exact decision file from Git-ignored `var/` or outside the repository, rechecks the current F2c.2 pins, and writes one content-free resolution per request under private `var/` history (`npm run smoke:local-training-acquisition-resolution`). The tracked state remains unapproved; approval would authorize acquisition only, never installation already performed, training, external submission, rollout, or production readiness.
- F2c.5 makes an approved resolution reviewable as an execution plan without executing it. `npm run plan:local-training-acquisition-execution -- --resolution <private-json-path>` rechecks exact fields, current request and toolchain binding, approval integrity, and expiration before writing seven ordered `pending` steps under private `var/` history (`npm run smoke:local-training-acquisition-execution-plan`). Rejection, tampering, stale input, or expiry writes no plan; a plan is not installation, download, training, rollout, or production authority.
- F2c.6 adds the runtime boundary between an approved plan and a caller-owned acquisition adapter (`npm run smoke:local-training-acquisition-runtime`). It revalidates approval, request, toolchain, and exact step order, passes content-free metadata without owner or reason text, and rejects result drift or unsupported output. The tracked replay is fixture-only: adapter reports are not independent installation or download evidence, and no dependency installation, model download, training, external provider call, rollout, or production claim was performed.
- F2c.7 independently verifies the artifact-set contract produced after that runtime boundary (`npm run smoke:local-training-acquisition-artifact-verification`). It revalidates the current authority and run, rejects path escape and symlinks, checks exact trainer and source-model pins, streams every file hash, binds both manifest hashes to the adapter report, and enforces the approved byte envelope. The tracked replay creates only temporary fixture files: artifact observation does not prove acquisition provenance, and no actual installation, download, training, external provider call, rollout, or production claim was performed.
- F2c.8 binds acquisition provenance, independently reviewed egress closure, an offline artifact resource canary, and the existing post-install product permission into one readiness decision (`npm run smoke:local-training-post-acquisition-readiness`). The permission must follow all three reviews and carry their exact license, egress, and resource evidence hashes. The tracked replay is fixture-only: all four actual gates remain open, explicit training readiness is false, and no installation, download, training, external provider call, rollout, or production claim was performed.
- F2c.9 requires recorded F2c.8 readiness, the exact F1 training target, current product permission, and an explicit no-revocation state before the local runtime can spawn a `local-model-training` process (`npm run smoke:local-training-runtime`). The run record keeps only admission ids and hashes. The tracked replay uses temporary artifacts and a fixture child process; it performs no installation, download, owner review, actual model training, external provider call, rollout, or production activation.
- F2c.10 independently verifies the candidate artifact set reported by that runtime (`npm run smoke:local-training-candidate-artifact-verification`). It accepts only the fixed `var/local-training/candidates/<approval-id>/` root, requires a complete sorted manifest, rejects unlisted files and symlinks, streams every file hash, binds the aggregate hash to the admitted run, and enforces the current permission disk limit. The tracked replay uses temporary files, so actual candidate observation, training provenance, evaluation authority, rollout, and production claims remain false.
- F2c.11 adds an explicit local candidate evaluation request and admission boundary (`npm run smoke:local-candidate-evaluation-admission`). Only a recorded F2c.10 artifact verification can enter it; the current permission, explicit no-revocation state, F1 case set, thresholds, artifact identity, resource envelope, and time window are revalidated before bounded local evaluation is authorized. The tracked replay starts no model process, so actual candidate observation, model evaluation, training provenance, rollout, and production claims remain false.
- F2c.12 adds the bounded local candidate evaluation runtime (`npm run smoke:local-candidate-evaluation-runtime`). It rechecks current authority, runs an evaluator through allowlisted local stdio with shell disabled and bounded time and I/O, rejects raw answer output, and binds the canonical quality summary to an O1a evidence record.
- F2c.13 hardens that runtime with an immutable evaluation input view (`npm run smoke:local-candidate-evaluation-input-view`). The request binds the exact F1 suite bytes, the runtime copies only manifest-listed candidate files into a temporary read-only workspace, verifies candidate and suite hashes before and after successful execution, rechecks current authority after verification, and removes the workspace before returning evidence.
- F2c.14 binds the evaluator executable and static module/resource bundle to request, admission, and run evidence (`npm run smoke:local-candidate-evaluator-provenance`). The child starts from a hash-bound read-only snapshot entry rather than the source workspace, and source plus snapshot provenance is checked before and after execution. The tracked replay remains fixture-simulated; executable hash-to-exec TOCTOU, OS-enforced CPU, memory, process, and network isolation, abrupt host cleanup, actual model evaluation, and rollout remain outside this claim.
- F2c.15 Pre-spawn workspace recovery uses an owner-only namespace and hash-bound lease after current authority, evaluator, and candidate revalidation (`npm run smoke:local-candidate-evaluation-workspace-recovery`). It atomically claims and then boundedly removes only `expired + dead PID + preparing` workspaces while preserving live, unknown, spawning, malformed, or unsafe entries. Post-spawn process-tree and OS restart cleanup, same-user TOCTOU resistance, actual model evaluation, rollout, and production readiness remain outside this claim.
- F2c.16 Post-spawn evaluator process lifecycle runs the evaluator as a detached POSIX process group and waits for leader close plus group absence before deleting its workspace or producing run evidence (`npm run smoke:local-candidate-evaluation-process-lifecycle`). Timeout and output overflow terminate the group while the direct leader handle is still live. A late, unknown, or still-live group is never signalled after leader close; its `spawning` workspace is preserved. OS restart recovery, escaped sessions, same-user TOCTOU resistance, OS resource and network isolation, actual model evaluation, rollout, and production readiness remain outside this claim.
- F2c.17 Host boot identity recovery binds new workspace leases to a SHA-256 hash derived from the Linux kernel boot ID or macOS `kern.boottime` (`npm run smoke:local-candidate-evaluation-host-boot-recovery`). It atomically removes only `expired + prior boot + spawning` v2 workspaces and never signals an old PID or process group. Same-boot and v1 `spawning` leases, unavailable identity, unexpired leases, and unsafe trees remain preserved. The replay uses two injected boot identities; `actualHostRestartObserved: false`, escaped-session containment, same-user TOCTOU resistance, OS resource and network isolation, actual model evaluation, rollout, and production readiness remain outside this claim.
- F2c.18 Manual host restart rehearsal adds a private two-command operator path around that recovery primitive. `npm run prepare:local-candidate-evaluation-host-restart-rehearsal` creates one owner-only synthetic `spawning` lease and exits without rebooting or launching an evaluator. After an operator restart and lease expiry, `npm run resume:local-candidate-evaluation-host-restart-rehearsal -- --id <rehearsal-id>` accepts only a changed reliable boot identity and one exact recovered lease. No-follow directory hardening prevents symlink target mutation, prepare and resume must both use the kernel reader before an actual restart can be claimed, and a durable intent plus atomic result makes receipt completion idempotent. Same-boot, unavailable, unexpired, tampered, symlinked, or extra-tree state is preserved. Tracked evidence uses injected identities and keeps `actualHostRestartObserved: false`; a real receipt remains private under `var/`. This is not evaluator resumption, hostile same-user TOCTOU resistance, OS isolation, actual model evaluation, training, rollout, or production readiness.
- F2c.19 Actual host restart receipt records the successful private rehearsal without publishing its boot identity, session hash, recovery hash, or path. `npm run export:local-candidate-evaluation-host-restart-receipt -- --id <rehearsal-id>` replays the idempotent private resume, requires an actual changed-boot recovery, and writes only the public rehearsal ID, result hash, recovery booleans, and claim boundary. The tracked projection has `actualHostRestartReceiptRecorded: true`; its public smoke validates projection integrity and claim boundaries, while independent restart re-verification still requires the Git-ignored private source. Evaluator relaunch, model evaluation, training, candidate authorization, rollout, external provider calls, and production readiness remain false (`npm run smoke:local-candidate-evaluation-host-restart-receipt`).
- F2c.20 connects the approved F1 packet to a pinned MLX-LM LoRA adapter seam without enabling actual training. The fixture replay verifies exact `train.jsonl` and `valid.jsonl` bytes, fixed local-only argv, an offline non-inherited environment, complete acquisition inventory, custom-model-code refusal, and atomic candidate manifest publication (`npm run smoke:mlx-lm-lora-training-adapter`). Actual MLX process execution remains blocked until OS-enforced egress, resource, process-tree, revocation-monitoring, native dependency, and verify-to-exec guards are implemented; installation, model download, training, rollout, and production claims remain false.
- F2c.21 adds durable failure recovery without authorizing training. An owner-only ledger binds each operation to approval, readiness, artifact verification, and adapter hashes; atomic phases require workspace cleanup before candidate rollback, and an exact rollback-owner request resumes partial cleanup idempotently (`npm run smoke:local-training-failure-recovery`). The tracked fixture also verifies that raw paths, training text, and failure messages are not persisted. Same-user TOCTOU and OS process, network, and resource isolation remain outside this claim, so actual process, installation, download, training, rollout, and production claims remain false.
- F2c.22 binds a manifest-owned interpreter, Python entrypoint, statically resolved allowlisted fixture module graph, and exact file bytes into a content-free provenance hash (`npm run smoke:local-training-runtime-closure-provenance`). The adapter reinspects that inventory before workspace creation and immediately before the fixture invocation, uses the pinned interpreter directly with `-E -S -B`, and does not inherit `PATH`, `PYTHONPATH`, or any `PYTHON*` value. This is static fixture provenance only: arbitrary dynamic Python behavior, native dependency closure, and verify-to-exec remain false, so no process, installation, download, training, rollout, provider, or production claim is enabled.
- F2c.23 adds an independent local fixture process supervisor without enabling MLX execution (`npm run smoke:local-training-process-supervisor`). It checks the exact approval and permission before spawn, periodically while the process is live, and before accepting the result; revocation, timeout, and bounded I/O failures terminate the detached POSIX process group while its direct leader is live. Workspace cleanup is authorized only after the leader closes and group absence is confirmed; a late or unknown group state preserves the workspace without signaling a potentially reused group ID. The MLX adapter is bound to the supervisor contract but is not integrated with it, so actual MLX process, installation, download, training, rollout, provider, and production claims remain false.
- F2c.24 adds a cost-free Darwin fixture preflight for OS-level network and resource controls (`npm run smoke:local-training-os-isolation`). An unsandboxed loopback control proves the fixture can open local sockets, then the same fixture under `/usr/bin/sandbox-exec` must fail both connect and listen operations. A Python standard-library wrapper applies exact POSIX CPU, file-size, open-file, and core-dump limits before `execve`, and the child must demonstrate each observable limit. This is a Darwin fixture claim, not portable production isolation: the address-space probe remains unavailable on the current host, MLX unified-memory enforcement and MLX OS-isolation integration remain false, and no MLX process, installation, download, training, provider call, rollout, or deployment was performed.
- F2c.25 adds a cost-free Darwin runtime exec observation without authorizing MLX execution (`npm run smoke:local-training-runtime-exec-observation`). The parent inspects the Node executable, observer entry, and fixed bootstrap files before launch; the sandboxed child reports its own executable and entry hashes plus content-free loaded-image and module-set hashes; the parent then reinspects the files and accepts only an exact identity match. This proves one actual fixture observation, not prevention of mutation before the child report: late lazy loading, shared-cache image bytes, same-user TOCTOU resistance, MLX native closure, and MLX verify-to-exec remain false. No dependency installation, model download, training, Provider call, rollout, or deployment was performed.
- F2c.26 adds cost-free runtime image provenance for the actual Darwin fixture (`npm run smoke:local-training-runtime-image-provenance`). While the sandboxed child is alive, the parent confirms every reported image through `vmmap`, independently matches standalone file bytes, and binds shared-cache image UUIDs to a stable strictly signed cache-file identity set. Tracked evidence stores only counts and hashes. This does not prove exact equality with every VM mapping, late-load closure, shared-cache subfile byte hashing, same-user mutation resistance, or the MLX native image set; actual MLX execution, installation, download, training, Provider calls, rollout, and deployment remain false.
- F2c.27 adds a cost-free Darwin suspended verify-to-exec primitive without enabling MLX execution (`npm run smoke:local-training-darwin-suspended-exec`). A root-owned strictly signed interpreter runs a descriptor-bound broker, which starts the target with `POSIX_SPAWN_START_SUSPENDED` and compares the kernel-observed `csops` CDHash before `SIGCONT`. The child entrypoint is also descriptor-bound: replacing its filename after `O_NOFOLLOW` open still executes and self-hashes the original bytes. A mismatched CDHash is killed before resume and cannot create its marker. This validates one fixture executable and entrypoint, not the acquired MLX interpreter, MLX entrypoint, or any post-resume dynamic/native load; `verifyToExecClosed`, actual MLX execution, installation, download, training, Provider calls, rollout, and deployment remain false.
- Q2 runs the already-installed `qwen2.5:3b` against the two Q1 answer cases without model download, external provider calls, golden-answer text, or required-term prompt injection. Retrieval and citation metrics passed, but required-term coverage was `0.6667` in both cases against the `1.0` gate, so the tracked decision is `keep-current-answer-path` (`npm run smoke:local-answer-quality-baseline`). This is an actual local base-model evaluation, not training, qualification, activation, or production readiness.
- Q3 evaluates an evidence-first composition candidate on the same model, retrieval results, case set, and thresholds. It separates summary, source-bound claims, and reviewer action without receiving required terms or golden answers; the controlled case pass rate moved from `0.0` to `1.0` and required-term coverage from `0.6667` to `1.0` with no citation regression (`npm run smoke:local-answer-composition-candidate`). This result is limited to two fixtures, and the current answer path, model training, activation, rollout, and production claims remain unchanged.
- Q4 extends the same installed model to 10 controlled cases covering Q3 regression, Korean, multiple domains, bounded eight-source context, and objective/evidence prompt injection. The v2 robustness baseline passed `9/10` with one canary match; a v3 deterministic instruction boundary passed `10/10` and reduced forbidden-term matches from `1` to `0` without metric regression (`npm run smoke:local-answer-composition-robustness`, `npm run smoke:local-answer-composition-hardening`). This does not establish general answer quality or broad prompt-injection resistance, and the current answer path, model training, activation, rollout, and production claims remain unchanged.
- Q5 isolates Unicode, format-control, split-letter, and multilingual instruction handling in a pure 14-case input boundary. The same installed model and Q4 suite passed `10/10` after a real `2.2` safe-text regression was fixed without lowering thresholds (`npm run smoke:answer-input-boundary`, `npm run smoke:local-answer-composition-boundary-regression`). A separate 12-record, six-domain, four-language intake is synthetic only (`npm run smoke:user-query-evaluation-intake`): no actual user queries, broad prompt-injection resistance, training, activation, rollout, or production claim is established.
- Q6 used that intake with the same installed `qwen2.5:3b`, v4 prompt, loopback runtime, and unchanged all-pass thresholds. The synthetic replay passed `11/12`; one English incident-operations case failed because the model returned a placeholder reviewer action. The runner retained only hashes, aggregate metrics, and `invalid-review-action`, then kept the current answer path unchanged (`npm run smoke:local-user-query-quality`). This is a recorded stop condition, not proof of actual user-query quality.
- Q7 isolates that failure in a v5 review-action candidate. Summary-only objectives now require an evidence-bound owner and trigger when both are present; the same installed model retained Q4 at `10/10` and moved the synthetic Q6 suite from `11/12` to `12/12` without changing thresholds (`npm run smoke:local-answer-review-action-generalization`). The tracked artifact contains only hashes and metrics, and the current answer path, training, activation, rollout, actual-user quality, and production claims remain unchanged.
- Q8 makes the next actual-user evaluation path executable without adding data to the repository. The intake CLI rejects tracked paths, unsafe links, oversized files, and non-owner-only actual-data files; actual runs use no-follow reads, atomic `0600` private outputs, the frozen Q6·Q7 all-pass threshold, the Q7 v5 baseline, and consent/retention reload before every model call (`npm run smoke:actual-user-query-evaluation-readiness`). Fake loopback tests verify the protocol and mid-run withdrawal boundary only. No actual user data or evaluation was used, and answer-path activation, training, rollout, actual-user quality, and production claims remain unchanged.

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
- Actual user-query evaluation protocol: [docs/actual-user-query-evaluation-v1.md](docs/actual-user-query-evaluation-v1.md)
- Smoke validation summary: [docs/smoke-validation-summary-v1.md](docs/smoke-validation-summary-v1.md)
- External evidence blockers: [docs/external-evidence-blockers-v1.md](docs/external-evidence-blockers-v1.md)
- Project card: [docs/project-card.md](docs/project-card.md)
- Case study: [docs/case-study.md](docs/case-study.md)
