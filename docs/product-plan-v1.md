# Product Plan v1

- status: draft-source-of-record
- localDate: 2026-05-04
- milestone: execution-v1 product planning completion
- implementationBaseline: provider-scoped pilot ready for OpenAI-backed local-first path
- relatedEvidence: [execution-v1-evidence.md](execution-v1-evidence.md), [execution-v1-closeout.md](execution-v1-closeout.md), [execution-v1-handoff.md](execution-v1-handoff.md)
- relatedSecurity: [security-model-v1.md](security-model-v1.md)
- relatedOrchestrationBackbone: [orchestration-backbone-v1.md](orchestration-backbone-v1.md)
- relatedSelfImprovementEngine: [self-improvement-engine-v1.md](self-improvement-engine-v1.md)
- relatedRunbook: [operator-runbook-v1.md](operator-runbook-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedOnboarding: [pilot-onboarding-v1.md](pilot-onboarding-v1.md)
- relatedDemoScenarios: [demo-scenarios-v1.md](demo-scenarios-v1.md)
- relatedIncidentSlo: [incident-slo-v1.md](incident-slo-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Product Thesis

이 제품은 다른 회사의 개발팀과 운영팀이 자기 저장소와 내부 문서를 기준으로 `계획 -> 실행 -> 검토 -> 증거화 -> 운영 handoff`를 반복할 수 있게 하는 local-first multi-agent engineering harness이다.

핵심 차별점은 autonomous swarm이 아니라, 사람이 통제할 수 있는 managed multi-agent runtime이다. manager, planner, executor, reviewer, specialist lane, provider guard, approval gate, retrieval memory, fact graph, execution evidence, immutable release snapshot이 하나의 운영 루프로 묶여야 한다.

다음 개발 방향은 OpenClaw as the orchestration backbone and Hermes-style self-improvement engine이다. OpenClaw-style backbone은 gateway, channel ingress, session separation, workspace routing, permission policy, sandbox policy, provider route, and evidence event를 안정적으로 소유하고, Hermes-style engine은 그 뒤에서 memory, skill/template promotion, provider lesson, quality regression, and learning candidate를 제안하되 approval/reviewer/evidence boundary를 통과해야 한다.

현재 channel adapter seam은 manifest-only 단계로 둔다. CLI/web 같은 local control-plane 입력만 enabled adapter로 노출하고, Slack/Telegram/WhatsApp/Discord/email 같은 external messaging adapter는 `channel-adapter-disabled-by-default` stop reason과 `externalMessagingEnabled=false` 상태로 pairing, identity binding, workspace routing, retention, permission, sandbox, support boundary evidence가 준비될 때까지 비활성화한다.

## Target Users

- engineering lead: 릴리즈, 검증, 코드 변경 계획, 리스크 판단을 evidence 기반으로 관리한다.
- platform/operator: provider 상태, 실행 이력, approval, escalation, maintenance, handoff를 추적한다.
- implementation engineer: 미션 단위로 작업 계획, 실행 결과, reviewer feedback, 후속 조치를 확인한다.
- enterprise buyer: 보안, audit, data boundary, self-hosting 가능성을 기준으로 도입 여부를 판단한다.

## Primary Use Cases

1. Release readiness check
   - 입력: 저장소, 변경 범위, 검증 명령, release criteria
   - 출력: evidence, closeout, handoff, immutable snapshot
   - 성공 기준: deterministic smoke가 통과하고 OpenAI archived proof와 remaining provider blockers가 명확히 표시된다.

2. Engineering mission execution
   - 입력: objective, constraints, attachments, selected provider, orchestration profile
   - 출력: manager/planner/executor/reviewer artifact, approval record, session history
   - 성공 기준: risky execution은 approval 없이는 완료되지 않고, reviewer 결과가 다음 action으로 연결된다.

3. Multi-specialist analysis
   - 입력: research, implementation, verification, design, documentation lane이 필요한 복합 과제
   - 출력: parallel specialist handoff, quality gate, follow-up inbox
   - 성공 기준: specialist branch 상태와 merge/retry/follow-up 경로가 operator surface에서 추적된다.

4. Provider-backed runtime validation
   - 입력: OpenAI, Anthropic, local, Hermes provider configuration
   - 출력: provider live validation result, cost/usage telemetry, preflight matrix
   - 성공 기준: passed provider, missing env, provider-account failure, runtime failure가 구분되고 provider별 recovery route가 남는다.

5. Document and memory grounded workflow
   - 입력: Markdown/text/JSON/log/source attachment, optional MarkItDown-compatible document conversion, mission/workspace memory
   - 출력: retrieval preview, retrieval artifact, fact graph, provenance
   - 성공 기준: agent output이 실제로 어떤 source를 읽었는지 evidence로 추적된다.

## MVP Scope

- Local-first Node.js ESM runtime
- CLI and operator web UI
- Managed role order: `manager -> planner -> executor -> reviewer`
- Optional parallel specialists with bounded profile selection
- Provider abstraction for stub, OpenAI, Anthropic, local, Hermes
- Provider preflight, live helper, telemetry, rate/concurrency guard
- Approval gates for risky execution
- Mission/session/artifact persistence under local runtime state
- Source-of-record docs, release evidence, closeout, handoff, immutable snapshot
- Text-first attachment ingestion, optional document conversion boundary, retrieval memory
- Fact memory with provenance and revision lifecycle
- Browser E2E and deterministic smoke verification
- OpenClaw-style orchestration backbone documented in [orchestration-backbone-v1.md](orchestration-backbone-v1.md)
- Manifest-only channel adapter seam with external messaging disabled by default
- Hermes-style self-improvement engine documented in [self-improvement-engine-v1.md](self-improvement-engine-v1.md)

## Explicit Non-Scope For v1

- Hosted multi-tenant SaaS control plane
- Direct remote terminal ownership across customer infrastructure
- Automatic code push, deployment, or production mutation without approval
- Autonomous unbounded swarm or recursive self-improving agents
- Self-improvement that bypasses session separation, workspace scope, approval, reviewer judgment, permission policy, sandbox policy, or evidence gates
- Full vector database dependency as a required runtime component
- OCR or vision-based document understanding as a default ingestion path
- Vendor-specific Claude Code or Hermes application parity claims
- Direct vendoring of external reference repository code

## Enterprise Readiness Checklist

- [x] Local-first execution boundary documented
- [x] Approval gate and reviewer loop implemented
- [x] Deterministic evidence and snapshot artifacts implemented
- [x] Provider preflight distinguishes missing configuration from code readiness
- [x] Production provider readiness rehearsal gate implemented
- [x] Target OpenAI provider account gate implemented
- [x] Target Anthropic provider account gate implemented
- [x] Target local provider architecture gate implemented
- [x] Target provider evidence intake gate implemented
- [x] Target provider operations gate implemented
- [x] Mission-level provider fallback policy implemented
- [x] Policy-aware provider fallback stop conditions implemented
- [x] Mission-level provider fallback audit timeline implemented
- [x] Workspace/operator provider fallback audit timeline implemented
- [x] Provider-scoped fallback audit event surface implemented
- [x] Target provider fallback runtime audit gate implemented
- [x] Provider attention fallback remediation path implemented
- [x] Release blocker handoff CLI surface implemented
- [x] Release blocker handoff API surface implemented
- [x] Provider attention fallback command guidance implemented
- [x] Target Hermes provider architecture gate implemented
- [x] Target deployment contract gate implemented
- [x] Target environment evidence intake gate implemented
- [x] Hosted SaaS architecture decision gate implemented
- [x] Hosted identity session architecture gate implemented
- [x] Target identity session operations gate implemented
- [x] Hosted tenant isolation architecture gate implemented
- [x] Target tenant isolation operations gate implemented
- [x] Reference adoption regression gate implemented
- [x] Live OpenAI validation archived
- [ ] Live Anthropic validation archived
- [x] Live local provider validation archived
- [ ] Live Hermes validation archived
- [x] Tenant/workspace isolation policy documented
- [x] Self-hosted runtime isolation smoke implemented
- [x] OIDC tenant-claim API workspace/mission isolation gate implemented
- [x] Tenant storage administration gate implemented
- [x] RBAC role matrix documented
- [x] Optional web API RBAC enforcement gate implemented
- [x] Optional shared-secret web auth gate implemented
- [x] Optional OIDC/JWKS web auth and token-claim RBAC gate implemented
- [x] Identity session administration gate implemented
- [x] Production enterprise controls rehearsal gate implemented
- [x] Secret handling policy documented
- [x] Target secret manager architecture gate implemented
- [x] Target secret manager gate implemented
- [x] Target observability architecture gate implemented
- [x] Release artifact credential/path hygiene gate implemented
- [x] Target observability operations gate implemented
- [x] Target SLO architecture gate implemented
- [x] Target SLO operations gate implemented
- [x] Target clean deployment architecture gate implemented
- [x] Target clean deployment operations gate implemented
- [x] Audit log retention policy documented
- [x] Data export/delete policy documented
- [x] Target data lifecycle architecture gate implemented
- [x] Runtime data lifecycle export/delete verification gate implemented
- [x] Tenant-scoped runtime data export/delete verification gate implemented
- [x] Backup/restore drill verification gate implemented
- [x] Target retention operations gate implemented
- [x] Target backup operations gate implemented
- [x] OpenClaw-style orchestration backbone documented
- [x] Hermes-style self-improvement engine documented
- [x] Target support operations gate implemented
- [x] Target support architecture gate implemented
- [x] Retention/delete policy gate implemented
- [x] Production retention operating rehearsal gate implemented
- [x] Production SLO operating rehearsal gate implemented
- [x] Clean deployment release rehearsal gate implemented
- [x] Incident and SLO policy documented
- [x] Pilot export package manifest implemented
- [x] Tool permission model documented
- [x] Threat model documented
- [x] Pilot onboarding guide documented

## Product Readiness Levels

### Internal Alpha

Criteria:

- deterministic smoke gate is green
- local stub provider flow works
- evidence, closeout, handoff, and snapshot regenerate successfully
- known live-provider gaps are documented

Current status: achieved.

### Pilot Ready

Criteria:

- at least one real provider live validation is archived
- operator can run one end-to-end customer-like scenario from onboarding guide
- security boundary, secret handling, and approval model are documented
- known operational failure modes have triage steps

Current status: achieved only for the OpenAI-backed local-first/self-hosted pilot boundary, with archived local provider validation evidence for the configured local rehearsal. Anthropic and Hermes validation remain outside the achieved scope, and target local provider architecture remains a production gate.

### Production Ready

Criteria:

- all supported production providers pass live validation in the target deployment model
- RBAC, audit, retention, export/delete, and secret handling are documented and verified
- deployment model is repeatable from a clean environment
- SLO/SLA and incident response policy exist
- customer handoff pack is complete

Current status: not achieved. This should not be claimed until expanded provider validation and enterprise controls are closed.

## Deployment Model Decision

Recommended v1 deployment model: self-hosted local-first pilot.

Rationale:

- current architecture already persists runtime state locally and avoids mandatory hosted services
- provider credentials remain operator-controlled
- deterministic evidence can be shared without exposing live secrets
- enterprise adoption can start with a bounded pilot before SaaS tenancy is designed

Deferred models:

- cloud-managed SaaS: requires tenant isolation, billing, centralized auth, hosted storage, support operations
- hybrid control plane: requires secure agent registration, remote job dispatch, fleet observability, policy distribution

## Operating Metrics

- mission completion rate
- reviewer rejection rate
- approval wait time
- provider preflight readiness count
- provider live validation pass/fail count
- execution timeout count
- specialist follow-up open count
- unresolved escalation count
- evidence regeneration success rate
- cost per provider-backed mission

## Planning Completion Checklist

- [x] Product thesis and target users documented
- [x] Primary customer use cases documented
- [x] MVP scope and non-scope documented
- [x] Readiness levels documented
- [x] Enterprise readiness checklist documented
- [x] Live provider validation evidence archived
- [x] Enterprise security model written
- [x] Operator runbook written
- [x] Pilot deployment guide written
- [x] Pilot onboarding guide written
- [x] Customer demo scenario written
- [x] Release decision recorded as provider-scoped pilot-ready with production-ready explicitly blocked
- [x] Customer support operations gate implemented
- [x] Support escalation review gate implemented
- [x] Secret management gate implemented
- [x] Observability telemetry gate implemented

## Recommended Step Plan

1. Broaden live validation coverage beyond the archived OpenAI/local pilot proof.
   - run `npm run preflight:execution-v1:all`
   - resolve Anthropic account billing/credit blocker
   - attach target local provider architecture evidence for endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof with mission id, execution session id, provider response id or equivalent, retry lineage, artifact provenance, and handoff reference, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, provider operations proof, target-boundary live:execution-v1:local proof, release artifact hygiene result, and regenerated execution snapshot evidence
   - attach target Hermes provider architecture evidence for endpoint ownership proof, HERMES_PROVIDER_MODEL model pinning proof, target secret injection proof, tool-call parsing proof, session lifecycle proof with mission id, execution session id, provider response id, retry lineage, artifact provenance, and handoff reference, data and transcript policy proof, quota and rate guard proof, telemetry proof, fallback and stop-condition proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, customer approval proof, provider operations proof, target-boundary live:execution-v1:hermes proof, release artifact hygiene result, and regenerated execution snapshot evidence
   - inspect provider-scoped blocker handoff with `node src/cli.mjs overview release-blockers --provider hermes`, `node src/cli.mjs overview release-blockers --provider local`, `/api/execution-v1/release-blockers?provider=hermes`, or the release tab `API 링크 복사` action before attaching closing evidence; release tab copy bundles preserve the active provider filter across slice summary, package, closure checklist, closure matrix, target evidence packet, handoff, commands, and evidence bundles, and `--without-shared`, `withoutShared=true`, `includeShared=false`, or the release tab `provider-only API 링크 복사` / `provider-only package 복사` / `provider-only target packet 복사` / `provider-only manifest 복사` / `provider-only sanitized 복사` / `provider-only boundary 복사` / `provider-only command log 복사` / `provider-only decision 복사` / `provider-only disposition 복사` / `provider-only refresh 복사` actions should be used only when the shared provider-operations closure row is intentionally handled elsewhere
   - run `npm run live:execution-v1:anthropic`
   - run `npm run live:execution-v1:local`
   - run `npm run live:execution-v1:hermes`
   - run selected-provider evidence refresh with `node scripts/build-execution-v1-evidence.mjs --live-<provider>` only when intentionally replacing that provider proof
   - run `npm run refresh:execution-v1-artifacts` after each intentional provider proof refresh or source-of-record change so closeout, handoff, provider readiness, immutable snapshot, and pilot export package stay aligned while preserving archived live proof by default

2. Harden enterprise production controls.
   - replace local shared-secret auth with identity-backed RBAC or bind to a verified deployment-level RBAC control
   - verify tenant/runtime isolation beyond pilot policy
   - verify retention, export, delete, incident, and SLO procedures
   - generate release evidence from a clean production-like deployment path

3. Maintain the customer-facing pilot pack.
   - `docs/security-model-v1.md`
   - `docs/operator-runbook-v1.md`
   - `docs/deployment-pilot-v1.md`
   - `docs/pilot-onboarding-v1.md`
   - `docs/demo-scenarios-v1.md`
   - `docs/release-readiness-v1.md`

4. Update release decision only after evidence changes.
   - if no real provider validation is archived: declare `internal alpha`
   - if one or more real providers pass and operation docs exist: declare `pilot-ready`
   - if all supported providers and enterprise controls are validated: declare `production-ready`

## Current Decision

The project should currently be described as `provider-scoped pilot ready for OpenAI-backed local-first path`.

It should not yet be described as production-ready for other companies because Anthropic/Hermes validation, target local provider architecture evidence, enforced enterprise controls, and production-like deployment evidence are not complete.
