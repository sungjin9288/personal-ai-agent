# Reference Repositories

## Working Rule

These repositories are design input. Patterns are borrowed deliberately and documented here before implementation. Code is not vendored by default.

## References

### fireauto
- source: https://github.com/imgompanda/fireauto
- borrowed: commandized workflow boundaries and explicit role naming
- rejected for now: repo-specific command sprawl before the core runtime stabilizes

### awesome-design-md
- source: https://github.com/VoltAgent/awesome-design-md
- borrowed: explicit design intent documents as agent context
- rejected for now: design-doc specialization before the core session and approval loop is mature

### claw-code
- source: https://github.com/ultraworkers/claw-code
- inspected: 2026-06-01, shallow clone into `/tmp/personal-ai-agent-reference.DTxitv/claw-code`
- borrowed: CLI harness discipline, `doctor`/parity mindset, build-from-source clarity, and provider/runtime separation mindset
- rejected for now: Rust harness rewrite, deprecated package assumptions, low-level harness replacement, and broader platform scope
- 2026-06-01 status: used as a secondary harness reference for [orchestration-backbone-v1.md](orchestration-backbone-v1.md), not as the runtime backbone

### openclaw/openclaw
- source: https://github.com/openclaw/openclaw
- inspected: 2026-06-01, shallow clone into `/tmp/personal-ai-agent-reference.DTxitv/openclaw`
- borrowed: local-first gateway/control plane, channel ingress and channel adapter model, session separation, workspace routing, pairing and permission posture, sandbox modes, tool/skill/plugin registry, provider gateway surface, operator status commands, and always-on assistant control-plane framing
- rejected for now: broad production messaging matrix, public always-on deployment claim, direct plugin vendoring, remote gateway exposure, voice/mobile companion scope, and treating sandboxing as a complete security boundary before target evidence
- 2026-06-01 status: OpenClaw is the primary backbone reference for [orchestration-backbone-v1.md](orchestration-backbone-v1.md); channel and gateway expansion remains disabled by default until identity, retention, support, and deployment evidence are present

### oh-my-codex
- source: https://github.com/Yeachan-Heo/oh-my-codex
- borrowed: thin orchestration layer over an existing agent workflow
- rejected for now: codex-specific assumptions as the only runtime model

### OpenSpace
- source: https://github.com/HKUDS/OpenSpace
- borrowed: skill quality and iterative improvement as a future direction
- rejected for now: automatic skill evolution before the managed path is stable

### everything-claude-code
- source: https://github.com/affaan-m/everything-claude-code
- borrowed: `agents / skills / hooks / rules` separation
- rejected for now: provider-specific conventions as hard requirements

### mrstack
- source: https://github.com/whynowlab/mrstack
- borrowed: persistent memory and always-on assistant mindset
- rejected for now: messaging channel integrations in v1

### claw-empire
- source: https://github.com/GreenSheep01201/claw-empire
- borrowed: stronger multi-agent operating model as a later-phase target
- rejected for now: full orchestration dashboard and company-simulation abstractions

### multi-agent-workflow
- source: https://github.com/junsungkim-lab/multi-agent-workflow
- borrowed: deterministic role sequencing and reviewer/checker framing
- rejected for now: deeper debate trees before the managed runtime is proven

### OpenHarness
- source: https://github.com/HKUDS/OpenHarness
- borrowed: explicit harness boundary, governance hooks, session-first orchestration
- rejected for now: Python-first rewrite and direct code vendoring

### harness/harness
- source: https://github.com/harness/harness
- inspected: 2026-04-30, shallow clone into `/tmp/personal-ai-agent-harness-scan` plus GitHub README check
- borrowed: pipeline-oriented execution boundary, artifact registry mindset, local runner/server separation, durable state volume warning, and explicit operator-facing DevOps surface framing
- rejected for now: Go/Gitness platform rewrite, hosted SCM, Gitspaces, containerized CI pipeline engine, artifact registry implementation, and Docker socket coupling inside the local agent runtime
- 2026-04-30 status: existing execution-v1 evidence/closeout/snapshot artifacts, runtime job/request registries, provider preflight matrix, approval gates, and release UI carry the harness operating model without vendoring Harness platform code
- inspected again: 2026-06-01, shallow clone into `/tmp/personal-ai-agent-reference.DTxitv/harness`
- 2026-06-01 status: retained as the artifact/runner/pipeline boundary reference for [orchestration-backbone-v1.md](orchestration-backbone-v1.md) and [self-improvement-engine-v1.md](self-improvement-engine-v1.md); no Go platform, Gitspaces, SCM, Docker-socket CI, or registry implementation is adopted

### Claude Code Harness
- source: https://claude-code-harness-ko.vercel.app/read/preface
- inspected: 2026-04-30, preface/navigation page captured into `/tmp/personal-ai-agent-reference-scan-claude-preface.html`
- borrowed: agent loop, tool orchestration, permissions/hooks, context management, skills/plugins, subagent orchestration, prompt-cache/context-compression, and fail-closed engineering as review criteria
- rejected for now: provider-specific Claude Code internals, prompt corpus import, and unsupported claims of exact Claude Code behavioral parity
- 2026-04-30 status: current runtime maps those ideas to manager/planner/executor/reviewer flow, approval and remediation inboxes, source-of-record docs, retrieval/fact memory, provider boundaries, deterministic smoke gates, and release handoff evidence

### ima2-gen
- source: https://github.com/lidge-jun/ima2-gen
- inspected: 2026-04-27, shallow clone commit `3f12b50`
- borrowed: local server discovery file, port fallback, request-id logging, active/terminal job registry, session-aware history, graph version conflict handling, and support-safe doctor/status surfaces
- rejected for now: image-generation product scope, OAuth image backend, SQLite/gallery storage migration, and React/Vite UI rewrite

### CL4R1T4S
- source: https://github.com/elder-plinius/CL4R1T4S
- inspected: 2026-04-27, shallow clone commit `1a55b8a`
- borrowed: prompt-transparency corpus as an offline red-team fixture idea for instruction-boundary tests
- rejected for now: direct prompt corpus import, runtime ingestion, and UI exposure because the repository is mostly prompt dumps, uses AGPL-3.0, and its README includes prompt-injection style text that must not enter normal agent context
- 2026-04-27 status: offline fixture smoke added; manager prompt/context now label attachments, memory, retrieved context, and previous artifacts as untrusted data, retrieval artifacts preserve adversarial memory only as quoted context, while final deliverables summarize attached inputs by metadata only instead of replaying raw adversarial text

### MemPalace
- source: https://github.com/MemPalace/mempalace
- inspected: 2026-04-27, shallow clone commit `9dbb4ce`
- borrowed: local-first verbatim memory principle, pluggable backend contract, scoped memory organization, hybrid semantic + BM25 ranking, neighbor chunk expansion, temporal knowledge graph with provenance, and session auto-save hook concept
- rejected for now: Python/ChromaDB runtime dependency, MCP server wholesale adoption, benchmark claims as product claims, and direct vector-store migration before the current Node JSON store has a stable adapter seam
- 2026-04-27 status: retrieval service seam, BM25 ranking, bounded neighbor expansion, JSON-backed fact graph node adapter, minimal shared-keyword temporal edges, and harness fact graph preview surface are implemented; semantic vectors, ChromaDB, richer graph reasoning, and background auto-save hooks remain deferred

### MarkItDown
- source: https://github.com/microsoft/markitdown
- inspected: 2026-04-27, shallow clone commit `a51f725`
- borrowed: Markdown-normalized document ingestion, format-specific converter registry, optional plugin model, local-only MCP conversion boundary, and explicit file-conversion security warnings
- rejected for now: full Python package embedding inside the Node runtime, broad network/URI conversion, all optional dependencies, and OCR/LLM vision paths until attachment conversion has a narrow allowlist and sandbox boundary

### free-claude-code
- source: https://github.com/Alishahryar1/free-claude-code
- inspected: 2026-04-27, shallow clone commit `19ce656`
- borrowed: provider/model routing catalog, provider-scoped proactive and reactive rate-limit guard, concurrency cap, model capability/thinking metadata, and cheap local optimization handlers for trivial requests
- rejected for now: Claude API bypass/proxy positioning, Python 3.14 FastAPI runtime, messaging bots, remote autonomous coding scope, and heuristic tool-call repair as a default path
- 2026-04-27 status: provider catalog now exposes capability metadata and provider rate-limit defaults; provider runtime requests pass through a provider-scoped proactive window, reactive 429 block, and concurrency guard with `smoke:provider-capability-rate-guard` coverage

### andrej-karpathy-skills
- source: https://github.com/forrestchang/andrej-karpathy-skills
- inspected: 2026-04-27, shallow clone commit `2c60614`
- borrowed: compact mission quality checklist around thinking before coding, simplicity, surgical changes, explicit assumptions, success criteria, and verification before closeout
- rejected for now: wholesale prompt import because the workspace already has AGENTS/process rules and needs a project-native checklist instead of duplicate global behavior text
- 2026-04-27 status: mission quality gate helper, stub planner/executor artifacts, external executor output normalization, and `smoke:mission-quality-gate` are implemented with Success Criteria, Assumptions, Minimal Change, and Verification sections

### hermes-agent
- source: https://github.com/NousResearch/hermes-agent
- inspected: 2026-04-27, shallow clone commit `3ff3dfb`
- borrowed: session source/context injection, persisted runtime status with PID/lock metadata, stale runtime cleanup patterns, scheduled job CRUD shape, session finalization hooks, and context compression as a later-stage memory pattern
- rejected for now: Python application rewrite, broad messaging gateway matrix, remote terminal backends, voice/RL extras, and automatic skill evolution before our managed runtime and verification artifacts are stable
- 2026-04-27 status: mission sessions now store CLI/web/service source context and prompts expose Session Source metadata; UI runtime writes `var/runtime-status.json`, reports stale previous runtime metadata through `/api/health`, and keeps server discovery linked to the runtime status file
- inspected again: 2026-04-29, shallow clone into `/tmp/hermes-agent`
- borrowed: Hermes-compatible `<tool_call>{...}</tool_call>` parser contract, unclosed tool-call tolerance, context-boundary system guidance, and OpenAI-compatible chat-completions adapter shape for Hermes-family runtimes
- rejected for now: Atropos/RL environment, Python terminal backend, messaging gateways, automatic skill evolution, and direct Hermes process lifecycle ownership inside this Node harness
- 2026-04-29 status: `hermes` provider is registered as a first-class provider ID with model/config visibility, `/models` probe support, structured JSON enforcement, optional bearer auth, Hermes tool-call parsing telemetry, and deterministic `smoke:hermes-provider` coverage
- inspected again: 2026-04-30, shallow clone into `/tmp/personal-ai-agent-reference-scan/hermes-agent` plus GitHub README/release scan
- borrowed: Hermes Agent's parallel subagent, provider-aware tool calling, memory/session lifecycle, approval/interrupt, background-task notification, model switching, plugin hook, and security-hardening patterns as metadata and UI selection guidance for the existing managed runtime
- rejected for now: vendoring the Python Hermes application, gateway matrix, remote terminal backends, cron delivery, automatic skill mutation, RL/data generation, and direct process ownership because those would expand the v1 blast radius beyond the Node local-first harness
- 2026-04-30 status: `engineering-full-spectrum` now carries `runtimeBlueprint=hermes-agent-full-spectrum`, `recommendedProvider=hermes`, and Hermes harness pattern metadata, and the UI exposes a dedicated `Hermes 에이전트` AI configuration card that selects the existing full-spectrum five-lane specialist profile without increasing the runtime's 9-agent surface cap
- inspected again: 2026-06-01, shallow clone into `/tmp/personal-ai-agent-reference.DTxitv/hermes-agent`
- borrowed: Hermes Agent's self-improving learning loop, agent-curated memory, periodic persistence nudges, skill creation from repeated work, skill improvement during use, session search/summarization, provider/model switching metadata, subagent and automation signals, trajectory compression mindset, and user-modeling caution as inputs for [self-improvement-engine-v1.md](self-improvement-engine-v1.md)
- rejected for now: uncontrolled automatic skill mutation, cross-scope memory sharing, remote terminal backends, broad messaging gateway ownership, RL/data generation pipeline, and Python process ownership
- 2026-06-01 status: Hermes is the engine reference only; OpenClaw-style backbone still owns gateway, session, workspace, permission, sandbox, provider routing, and evidence boundaries
- inspected again: 2026-06-22, Loop Engineering article from PyTorchKR discussion
- borrowed: prompt-to-loop framing, discover/plan/execute/verify/iterate cycle, closed-loop default for practical cost control, six operating foundations, maker/checker separation, and memory-backed iteration as UI and documentation guidance for the existing OpenClaw backbone plus Hermes engine architecture
- rejected for now: unbounded open-loop autonomy, cost-unbounded fleet loops, automatic skill mutation, broad connector enablement, and treating the loop as a substitute for engineering judgment
- inspected local PDFs: 2026-06-22, `book1-claude-code-en.pdf` and `book2-comparing-en.pdf`
- borrowed: Harness Engineering framing, prompt-as-control-plane input, query loop heartbeat, context governance as budget governance, recovery as a main path with circuit breakers, independent verification, state sovereignty, and local governance checklists
- rejected for now: vendoring Claude Code internals, copying CLAUDE.md hierarchy directly, adding hooks before stable baseline verification, and turning recovery or compaction into hidden autonomous loops

### openscreen
- source: https://github.com/siddharthvaddem/openscreen
- inspected: 2026-04-27, shallow clone commit `1fefde8`
- borrowed: evidence-artifact mindset for visual records, safe media/project path allowlisting, export progress metadata, and manifest-style recording session state
- rejected for now: Electron recording/editor stack, PixiJS timeline, browser media pipeline, desktop permission handling, and large media dependencies in the agent core

### rtk
- source: https://github.com/rtk-ai/rtk
- inspected: 2026-04-27, shallow clone commit `80a6fe6`
- borrowed: token-aware command output compaction, raw-log-preserving summaries, missed-savings discovery reports, command-specific compactors for tests/builds/logs/diffs, and measurable token-savings metadata
- rejected for now: Rust binary dependency, automatic shell hook installation, transparent command rewriting, and replacing normal developer commands with proxy commands
- 2026-04-27 status: Node-native output compaction service, `artifact compact-output` CLI, compact Markdown artifact metadata, and `smoke:output-compaction` are implemented; shell hooks, command rewriting, and Rust dependency remain rejected

## Current Borrowed Set

- managed multi-agent role order
- provider abstraction boundary
- harness-level approval and memory hooks
- OpenClaw-style gateway/session/workspace/channel/permission/sandbox backbone
- Hermes-style scoped self-improvement engine behind approval, reviewer, and evidence gates
- Loop Engineering closed-loop discover/plan/execute/verify/iterate surface with automations, worktrees, skills, connectors, subagents, and memory as explicit operating foundations
- Harness Engineering guardrails for control plane, query heartbeat, context budget, recovery branch governance, independent verification, and local governance
- repo-native strategy and incident documentation

## 2026-04-27 External Reference Review

### Current Project Fit

- runtime: Node.js ESM local-first agent runtime with CLI, web UI, provider adapters, mission attachments, lexical retrieval, source-of-record docs, and deterministic smoke evidence
- existing gap: mission attachments are text-first and extension-limited, retrieval is lexical rather than semantic/hybrid, while runtime observability now has durable request and release-job registries but still lacks a full worker queue for asynchronous background execution
- constraint: do not vendor external implementations by default; borrow patterns behind small adapter seams and keep verification deterministic

### Best Immediate Candidates

1. MarkItDown-style attachment conversion
   - Why: directly extends the existing `missionAttachments` and retrieval preview flow without changing the managed-agent runtime.
   - Proposed shape: add a `document-conversion` service that accepts local files from a strict allowlist and stores converted Markdown as the attachment `promptContent`.
   - Initial scope: `.pdf`, `.docx`, `.pptx`, `.xlsx`, `.csv`, `.html`, `.json`, `.txt`, `.md`; no URL conversion and no OCR by default.
   - Verification: add CLI and UI smoke cases proving converted Markdown is included in retrieval preview and session retrieval artifacts.
   - 2026-04-27 status: CLI-local optional converter adapter and UI browser-upload conversion are implemented without production dependency; URL conversion and OCR remain deferred.

2. MemPalace-style retrieval adapter seam
   - Why: current retrieval logic is embedded in `mission-service.mjs`; a small adapter interface lets us improve ranking without forcing ChromaDB or Python into v1.
   - Proposed shape: extract lexical scoring into `src/core/retrieval-service.mjs` with a typed result contract similar to MemPalace's backend abstraction.
   - Initial scope: keep JSON store and lexical scoring, then add BM25 candidate rerank and adjacent chunk expansion for attachments.
   - Verification: extend `npm run smoke:retrieval-memory` with ranking, dedupe, and neighbor-chunk assertions.
   - 2026-04-27 status: retrieval service seam, BM25 rerank, deterministic phrase/proximity boost, soft source-diversity cap, auditable score fields, matched-term explainability metadata, and bounded neighbor chunk expansion are implemented without adding ChromaDB or Python dependencies.

3. ima2-gen-style runtime discovery and job observability
   - Why: our UI and CLI would benefit from a small advertised server file and request/session correlation without broad architecture changes.
   - Proposed shape: write `var/server.json` when `npm run ui` starts, expose `/api/health` with active port/path metadata, and add request IDs to non-sensitive API logs.
   - Initial scope: port fallback and health/status only; no migration to SQLite job registry.
   - Verification: add smoke coverage for dynamic port discovery and response `X-Request-Id`.
   - 2026-04-27 status: `var/server.json`, port fallback, `/api/health`, `X-Request-Id`, durable `var/runtime-requests.json`, durable `var/runtime-jobs.json`, `/api/runtime/requests`, `/api/runtime/jobs`, stale active request/job recovery, hero/release runtime metrics, release-tab runtime job history, header metric surfacing, and `smoke:runtime-discovery` are implemented; full async worker queue remains deferred.

### Conditional Candidates

- MemPalace richer temporal edge reasoning: useful for long-lived facts, owner transitions, provider incidents, and mission decisions, but the first step is now limited to JSON-backed fact nodes plus deterministic shared-keyword edges with provenance. Do not adopt Python/ChromaDB as a core dependency yet.
- MemPalace auto-save hooks: conceptually useful for session closeout, but this repo already has explicit release evidence and artifact pipelines. Prefer explicit `snapshot:execution-v1` integration before background hooks.
- MarkItDown OCR plugin: useful later for scanned PDFs and screenshots, but it requires an LLM vision path and should stay behind an explicit approval/config gate.
- ima2-gen graph/session conflict handling: useful if mission workbench editing becomes collaborative or multi-tab mutable; not urgent for current read-mostly release surfaces.

### Not Recommended

- CL4R1T4S direct ingestion: not suitable as a runtime dependency or normal retrieval corpus. It is AGPL-3.0 and contains prompt-injection-like text; if used at all, keep it as an isolated offline red-team fixture with no automatic prompt inclusion.
- Direct vendoring from any of the four repositories: all useful ideas can be implemented as small native Node seams with lower blast radius.

### Suggested Implementation Order

1. Add a native `retrieval-service` extraction first so the existing lexical retrieval has a clean contract.
2. Add MarkItDown-compatible conversion as an optional local preprocessor for mission attachments, using a child-process boundary rather than importing Python into the Node process.
3. Add BM25 reranking and neighbor chunk expansion to retrieval over converted Markdown.
4. Add `var/server.json`, port fallback, request-id response headers, and status smoke coverage.
5. Add a CL4R1T4S-inspired offline instruction-boundary fixture that verifies adversarial attachment text remains quoted context and is not replayed in final deliverables.
6. Add JSON-backed fact graph nodes for `kind=fact` memory with provenance, revision history, and active/retired lifecycle.
7. Add deterministic shared-keyword fact edges within the same scope so related facts can be inspected without vector search or graph DB dependencies.
8. Revisit richer temporal graph reasoning only after converted documents, retrieval ranking, fact-node lifecycle, and deterministic edge lifecycle are stable.

## 2026-04-27 External Reference Review Round 2

### Current Project Fit

- runtime: Node.js ESM local-first agent runtime with managed roles, smoke scripts, CLI/web surfaces, JSON-backed state, optional document conversion, fact graph memory, and lightweight runtime discovery
- external input: six repositories were shallow-cloned into `/tmp/personal-ai-agent-reference-repos-round2` and inspected through README files, manifests, and representative implementation files
- constraint: patterns can be adapted, but direct vendoring is not appropriate because the useful ideas are cross-cutting runtime behaviors rather than drop-in modules

### Strongest Candidates

1. rtk-style output compaction
   - Why: this project already produces smoke, build, runtime, and mission artifacts that can become token-heavy while still needing auditability.
   - Proposed shape: add a Node-native output compaction service that keeps raw output paths intact, stores compact summaries, detects failures/warnings, and records estimated token savings.
   - Initial scope: summarize smoke output, runtime request summaries, provider transcript excerpts, and release evidence logs. Do not install shell hooks or rewrite user commands.
   - Verification: add a deterministic smoke fixture with repeated logs, warnings, errors, and long successful output to prove raw output is preserved and compact output is bounded.

2. free-claude-code-style provider routing and rate guard
   - Why: our provider boundary exists, but model/provider selection and backoff behavior should become explicit before adding more real providers.
   - Proposed shape: add a provider capability catalog and provider-scoped limiter with proactive rolling-window throttle, reactive 429 cool-down, and max-concurrency guard.
   - Initial scope: local config and metadata only; no Claude-compatible proxy and no provider bypass behavior.
   - Verification: add a provider-routing smoke that proves model aliases resolve deterministically and simulated 429 responses trigger blocked state without making network calls.

3. hermes-agent-style session/runtime context
   - Why: our runtime discovery file is useful, but session origin, request delivery context, runtime lock/state, and scheduled jobs are still thin.
   - Proposed shape: enrich manager prompt context with explicit local/web/CLI source metadata, persist runtime state beside `var/server.json`, and introduce a small scheduled job model for maintenance sweeps.
   - Initial scope: source metadata and runtime status first; cron/job CRUD only after output compaction and provider guard land.
   - Verification: extend runtime smoke to prove source metadata is present in prompt artifacts and stale runtime metadata is handled safely.

4. andrej-karpathy-skills-style mission quality gate
   - Why: the repo is process guidance rather than code, but its checklist maps cleanly to our managed mission artifacts.
   - Proposed shape: add a compact `successCriteria`, `assumptions`, `minimalChange`, and `verification` section to mission planning/closeout artifacts instead of importing prompt text wholesale.
   - Verification: add a smoke that checks managed mission artifacts include these fields for non-trivial runs.

### Conditional Candidates

- OpenScreen visual evidence manifest: useful for release-evidence UX if we add screenshot/video attachments, but not as an Electron recorder. Adopt only the safe path allowlist and artifact metadata concepts.
- MarkItDown plugin/status discovery: the main conversion adapter now exposes converter capability diagnostics, disabled reason details, and explicit local-only security defaults. URL conversion and OCR remain deferred behind a future approval/config gate.
- Hermes context compression and skill lifecycle: valuable once session history grows, but it should follow deterministic retrieval/fact-graph behavior rather than replace it.

### Not Recommended

- Do not vendor `free-claude-code` or implement its Claude-bypass/proxy product surface.
- Do not import Hermes messaging gateways, remote terminal backends, voice, RL, or automatic skill mutation into the current core.
- Do not adopt OpenScreen's Electron/Pixi/media stack for the agent runtime.
- Do not install RTK shell hooks or transparently rewrite developer commands.
- Do not enable MarkItDown URL conversion or OCR/vision paths without an explicit allowlist and approval/config gate.

### Suggested Implementation Order

1. Add output compaction for smoke/runtime/provider logs, preserving raw artifacts for audit.
   - 2026-04-27 status: implemented as a Node-native output compaction service plus CLI artifact writer and deterministic smoke coverage.
2. Add provider capability catalog and provider-scoped rate guard behind the existing provider abstraction.
   - 2026-04-27 status: implemented as provider capability metadata plus provider-scoped rate guard for OpenAI, Anthropic, and local providers.
3. Add mission quality-gate fields to managed mission planning and closeout artifacts.
   - 2026-04-27 status: implemented as a reusable Mission Quality Gate section in planner/executor artifacts and external executor normalization.
4. Enrich runtime/session metadata with source context and safer stale-runtime handling.
   - 2026-04-27 status: implemented through session source context, prompt source metadata, runtime status file, stale previous-runtime detection, and runtime discovery smoke coverage.
5. Add converter capability diagnostics for the existing MarkItDown-compatible adapter.
   - 2026-04-27 status: implemented through `converter diagnostics`, `/api/converter/diagnostics`, supported-extension metadata, local-only security flags, and deterministic smoke coverage for available/missing converters.
6. Add visual evidence manifests only if screenshots/videos become first-class release artifacts.
   - 2026-04-27 status: implemented for the existing execution-v1 browser screenshot/report artifacts through a local-only visual evidence manifest, safe artifact-root allowlist, sha256/dimension metadata, release evidence integration, and deterministic smoke coverage.
