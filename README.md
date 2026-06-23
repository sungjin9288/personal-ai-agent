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
| Portfolio demo | Credential-free release readiness walkthrough with replay log and screenshot evidence | `npm run smoke:representative-demo`, `npm run smoke:representative-demo-evidence` |

### Why Fork This

Fork this repo if you want a practical starting point for:

- building a local-first agent control plane around your own repositories
- experimenting with provider adapters behind one execution contract
- turning agent runs into reviewable artifacts instead of chat-only output
- designing approval gates, release blockers, and evidence packages for AI-assisted engineering
- studying how to keep portfolio and release claims honest with deterministic smoke scripts

The project deliberately favors inspectable Node.js modules, file-backed state, and explicit smoke commands over a heavy platform stack.

### Quick Replay

The default replay path does not require external provider credentials.

```bash
npm run bootstrap:local
npm run smoke:representative-demo
npm run smoke:representative-demo-evidence
npm run smoke:execution-v1-status
npm run smoke:pilot-export-package
```

Representative demo evidence:

- replay log: `evidence/cli-logs/representative-release-demo-replay.log`
- summary: `evidence/output-artifacts/representative-release-demo-summary.json`
- screenshot: `evidence/screenshots/representative-release-demo-release-status.png`
- walkthrough: [docs/demo-scenarios-v1.md](docs/demo-scenarios-v1.md)

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

## Features

- Workspace and mission model for repository-based work
- Managed role flow for planning, execution, review, and handoff
- Optional specialist lanes for research, implementation, verification, design, and documentation work
- Provider registry for `stub`, OpenAI, Anthropic, OpenAI-compatible local providers, and Hermes-compatible providers
- Approval, action inbox, rollback/log, and provider attention surfaces
- Local web console and CLI over the same service layer
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

| Provider | Core environment variables |
|---|---|
| OpenAI | `OPENAI_API_KEY`, optional `OPENAI_MODEL`, `OPENAI_BASE_URL`, `OPENAI_RUN_TIMEOUT_MS` |
| Anthropic | `ANTHROPIC_API_KEY`, optional `ANTHROPIC_MODEL`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_VERSION` |
| OpenAI-compatible local | `LOCAL_PROVIDER_MODEL`, optional `LOCAL_PROVIDER_BASE_URL`, `LOCAL_PROVIDER_API_KEY`, `LOCAL_PROVIDER_MAX_TOKENS` |
| Hermes-compatible | `HERMES_PROVIDER_MODEL`, optional `HERMES_PROVIDER_BASE_URL`, `HERMES_PROVIDER_API_KEY`, `HERMES_PROVIDER_MAX_TOKENS` |
| Web auth and tenancy | `PERSONAL_AI_AGENT_WEB_AUTH_MODE`, `PERSONAL_AI_AGENT_WEB_AUTH_TOKEN`, `PERSONAL_AI_AGENT_RBAC_MODE`, `PERSONAL_AI_AGENT_OIDC_*`, `PERSONAL_AI_AGENT_TENANT_*` |

Provider checks:

```bash
node src/cli.mjs provider list
node src/cli.mjs provider check openai
node src/cli.mjs provider probe openai
```

## Testing

Recommended public-readiness checks:

```bash
npm run package:pilot-export
npm run smoke:readme-portfolio-overview
npm run smoke:portfolio-docs-claim-boundary
npm run smoke:representative-demo-evidence
npm run smoke:pilot-export-package
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

The repository also includes many narrower smoke scripts in `package.json` for provider operations, release blocker handoff, UI flows, retention, backup, identity/session, tenant isolation, observability, and target evidence gates.

## Release And Evidence

- Current public release: [v0.1.0](https://github.com/sungjin9288/personal-ai-agent/releases/tag/v0.1.0)
- Release asset: `personal_ai_agent_portfolio_pack.zip`
- Portfolio manifest: [portfolio_manifest.md](portfolio_manifest.md)
- Evidence checklist: [docs/evidence-checklist.md](docs/evidence-checklist.md)
- Release readiness decision: [docs/release-readiness-v1.md](docs/release-readiness-v1.md)
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
- Customer usage metrics, cost reduction claims, and production SLA claims are intentionally not included because this repository does not contain supporting evidence for them.

## Links

- Repository: [github.com/sungjin9288/personal-ai-agent](https://github.com/sungjin9288/personal-ai-agent)
- Release: [v0.1.0](https://github.com/sungjin9288/personal-ai-agent/releases/tag/v0.1.0)
- Demo walkthrough: [docs/demo-scenarios-v1.md](docs/demo-scenarios-v1.md)
- Project card: [docs/project-card.md](docs/project-card.md)
- Case study: [docs/case-study.md](docs/case-study.md)
