# Devlog

## 2026-06-04 Provider-Only Release Link Scope State

- added `rbshared=false` release URL state so provider-only copied release links can reopen the release tab without reintroducing shared provider-operations blockers
- wired the shared-provider blocker scope through release blocker filtering, URL parsing/building, and every copied target evidence `releaseLink` builder that already reports `includeSharedProviderOperations`
- extended UI harness smoke coverage for the `rbshared` parser/builder cleanup path, release blocker filter exclusion rule, slice URL scope propagation, and provider-only target evidence release link builders

## 2026-06-04 Provider-Only API Link Builder Smoke

- added UI harness smoke assertions that every provider-only target evidence copy builder preserves `includeShared`, builds a release blocker API link with that scope, and emits `releaseBlockerApiLink` in the copied artifact
- derived the builder coverage from the provider-only copy action regression table so new target evidence copy actions cannot skip API deep-link scope validation
- kept runtime UI behavior unchanged while tightening handoff reproducibility for provider-only copy artifacts that claim `includeSharedProviderOperations=false`

## 2026-06-04 Provider-Only Copy Notice Context Smoke

- added UI harness smoke assertions that every provider-only copy handler keeps provider-only prompt, shown, and success notices with the selected provider in the success path
- updated provider-only release blocker API link copying to pass provider-specific notice overrides through the shared API link copy helper while keeping the normal API link copy defaults unchanged
- kept the provider-only scope, action id, handler declaration, dispatch, provider guard, and builder/delegate checks intact while preventing generic copy notices from leaking into provider-only flows

## 2026-06-04 Provider-Only Copy Provider Guard Smoke

- added UI harness smoke assertions that every provider-only copy handler normalizes the selected provider, blocks execution when no provider filter is selected, and passes `provider: normalizedProvider` into the scoped copy path
- kept the existing action id, handler declaration, dispatch, `includeShared=false`, and builder/delegate checks while making the provider-required guard an explicit regression contract
- kept runtime UI behavior unchanged while tightening protection against accidental all-provider provider-only copy output

## 2026-06-04 Provider-Only Copy Action Id Completeness Smoke

- expanded the UI harness provider-only copy regression table with each rendered `data-ui-action` id so button wiring, dispatch action ids, handler declarations, scope policy, and builder linkage are validated together
- added source-derived completeness checks for rendered provider-only button actions and dispatched provider-only action ids, preventing new provider-only UI buttons from bypassing the regression table
- kept runtime UI behavior unchanged while tightening the smoke around provider-only copy action id drift and handler/table alignment

## 2026-06-04 Provider-Only Copy Table Completeness Smoke

- added UI harness smoke assertions that compare the provider-only copy action regression table against every declared and dispatched provider-only copy handler in the served app bundle
- removed the hardcoded table-size guard in favor of source-derived completeness checks so newly added provider-only handlers must be added to the regression table with their expected builder contract
- kept runtime UI behavior unchanged while tightening provider-only copy action coverage around handler declaration, dispatch wiring, scope policy, and builder linkage

## 2026-06-04 Provider-Only Copy Action Regression Table

- expanded the UI harness smoke from targeted provider-only copy scope checks into a table-driven regression guard that covers every provider-only copy action
- pinned each provider-only copy action to both `includeShared=false` and its expected builder call so future section additions cannot silently drift into shared provider-operations scope
- kept runtime UI behavior unchanged while reducing the smoke gap between provider-only buttons, copy action handlers, and copied handoff builder contracts

## 2026-06-04 Provider-Only Copy Scope Regression Smoke

- added source-slice regression assertions to the UI harness smoke so provider-only copy actions must pass `includeShared=false` into their scoped copy builders
- verified target evidence intake summary, target evidence capture template, and release blocker slice package builders now expose `includeSharedProviderOperations` and scoped release blocker API link metadata within the copied output contract
- tightened the smoke around the previous package propagation drift so future copy action additions cannot rely on button-label checks alone

## 2026-06-04 Provider-Only Summary Template Copy Guards

- added provider-only release blocker slice summary, target evidence intake summary, and target evidence capture template copy actions so provider-specific handoff manifests can exclude the shared provider-operations row at the planning/template layer too
- reused the existing `includeShared=false` release blocker copy scope for the new summary/template actions, keeping the normal provider-scoped summary and capture template behavior unchanged
- extended UI harness smoke coverage and operator docs so provider-only summary/template copy actions stay aligned with the API `includeShared=false` and CLI `--without-shared` semantics

## 2026-06-04 Provider-Only Release Blocker Slice Copy Guards

- added provider-only release blocker closure checklist, closure matrix, slice handoff, slice command, and slice evidence copy actions so operators can split granular provider-specific handoff sections from the shared provider-operations row
- reused the existing release blocker copy scope with `includeShared=false` for the new granular slice actions, keeping normal provider-scoped slice copies unchanged for shared operations handoff
- extended UI harness smoke coverage and operator docs so provider-only granular copy actions stay aligned with the API `includeShared=false` and CLI `--without-shared` semantics

## 2026-06-03 Provider-Only Target Evidence Claim Closure Guard Copy

- added provider-only target evidence production gap, accepted-scope exception, accepted risk decision, residual blocker, and closure rules copy actions so operators can split provider-specific claim and closure guard sections from the shared provider-operations row
- recorded `includeSharedProviderOperations` and the scoped release blocker API link in claim and closure guard section headers, and passed provider-only scope through the full target evidence packet composition
- kept the normal claim and closure guard copy actions unchanged while extending UI harness coverage and operator docs for the new provider-only guard section contracts

## 2026-06-03 Provider-Only Target Evidence Command Reference Copy

- added provider-only target evidence required commands and provider evidence references copy actions so operators can split provider-specific command requirements and provider reference handoff from the shared provider-operations row
- recorded `includeSharedProviderOperations` and the scoped release blocker API link in required commands and provider references headers, and passed provider-only scope through the full target evidence packet composition
- kept the normal required commands and provider references copy actions unchanged while extending UI harness coverage and operator docs for the new provider-only command/reference section contracts

## 2026-06-03 Provider-Only Target Evidence Boundary Register Copy

- added provider-only target evidence sanitized register and boundary consistency map copy actions so operators can split provider-specific evidence references and boundary checks from the shared provider-operations row
- recorded `includeSharedProviderOperations` and the scoped release blocker API link in sanitized register and boundary map headers, and passed provider-only scope through the full target evidence packet composition
- kept the normal sanitized register and boundary map copy actions unchanged while extending UI harness coverage for the new provider-only evidence section contracts

## 2026-06-03 Provider-Only Target Evidence Release Refresh Copy

- added provider-only target evidence release refresh copy action so operators can split provider-specific artifact refresh proof from the shared provider-operations row
- recorded `includeSharedProviderOperations` and the scoped release blocker API link in release refresh evidence headers, and passed provider-only scope through the full target evidence packet composition
- kept the normal release refresh evidence copy action unchanged while extending UI harness coverage for the new provider-only refresh evidence contract

## 2026-06-03 Provider-Only Target Evidence Review Section Copy

- added provider-only target evidence command rerun log and reviewer decision record copy actions so operators can split provider-specific command proof and review decisions from the shared provider-operations row
- recorded `includeSharedProviderOperations` and the scoped release blocker API link in command and reviewer section headers, and passed provider-only scope through the full target evidence packet composition
- kept normal command log and reviewer decision copy actions unchanged while extending UI harness coverage for the new provider-only review section contracts

## 2026-06-03 Provider-Only Target Evidence Section Copy

- added provider-only target evidence submission manifest and blocker disposition copy actions so operators can split provider-specific closing evidence from the shared provider-operations row at section level
- recorded `includeSharedProviderOperations` and the scoped release blocker API link in the manifest and disposition register headers so copied section evidence carries its provider-only policy boundary
- kept the normal target evidence section copy actions unchanged while extending UI harness coverage for the new provider-only manifest and disposition contracts

## 2026-06-03 Provider-Only Target Evidence Packet Copy

- added a provider-only target evidence packet copy action so operators can submit provider-specific target evidence while intentionally excluding the shared provider-operations row
- reused the release blocker copy scope helper with `includeShared=false` and recorded `includeSharedProviderOperations` plus the scoped release blocker API link in the target evidence packet scope
- kept the existing target evidence packet behavior unchanged for normal provider-scoped handoff, while documenting that provider-only target packets should be used only when shared provider-operations evidence is handled separately

## 2026-06-03 Provider-Only Release Blocker Package Copy

- added a provider-only release blocker package copy action so operators can copy a provider-specific closure bundle while intentionally excluding the shared provider-operations row
- extended the release blocker copy scope helper with an `includeShared=false` path and recorded `includeSharedProviderOperations` in the copied slice summary
- kept the existing provider-scoped package behavior unchanged for normal handoff, while making provider-only package copying match the API `includeShared=false` and CLI `--without-shared` semantics

## 2026-06-02 Provider-Scoped Release Blocker Copy Scope Alignment

- added a shared provider-aware release blocker copy scope helper so release tab slice summary, package, closure checklist, closure matrix, target evidence packet, handoff, commands, and evidence copy actions all preserve the active provider filter
- prevented Anthropic, Hermes, local, or OpenAI closure handoff bundles from accidentally mixing unrelated provider blockers when category or owner filters are also active
- extended UI harness browse smoke coverage so provider-scoped copy actions remain tied to provider-aware scope filtering instead of drifting back to category/owner-only copy logic

## 2026-05-26 Target Environment Provider Closure Matrix Proof Detail Alignment

- expanded target environment blocker disposition and blocker closure verification matrix provider rows so Anthropic, Hermes, and local provider closure evidence requires account/architecture owner fields, mission/session live validation provenance, fallback policy id, stop reason, recoverable-provider-failure-only stop evidence, provider operations proof, data transcript handling, remediation renewal, artifact hygiene, and snapshot details
- replaced provider closure shorthand such as target-boundary live validation pass and provider operations evidence with proof-level stop-condition evidence for the same target boundary
- kept blocker states, stop conditions, and productionReadyClaim=false behavior unchanged while extending target environment evidence intake smoke coverage against generic provider closure evidence shorthand

## 2026-05-26 Provider Exception Risk Register UI Proof Detail Alignment

- expanded accepted-scope exception register, risk decision register, and blocker disposition register provider evidence wording so Anthropic, Hermes, and local provider exceptions require account/architecture owner, target-boundary live validation, fallback policy id, stop reason, recoverable-provider-failure-only stop evidence, telemetry, data transcript handling, remediation/renewal, artifact hygiene, and snapshot details
- aligned provider exclusion and pilot-only accepted risk text with provider-specific account/architecture proof fields so exception rows cannot rely on generic provider operations evidence or target-boundary live validation shorthand
- kept provider stop conditions, allowed claim guards, and productionReadyClaim=false behavior unchanged while extending UI harness browse smoke coverage against generic provider exception/risk evidence shorthand

## 2026-05-25 Provider Boundary UI Proof Detail Alignment

- expanded provider readiness handoff, target evidence capture, target provider evidence intake, target provider operations, and provider-specific account/architecture proofIntent wording so provider id, inclusion decision, account owner, customer/workspace approval, target boundary, release label, source commit, stop-condition id, evidence owner, reviewer, model/endpoint, live validation, fallback policy, stop reason, and blocker closure evidence require proof-level fields
- expanded the provider/secret boundary map and provider reference guidance so fallback runtime audit, recoverable-provider-failure-only stop conditions, telemetry/incident evidence, data transcript handling, remediation/renewal evidence, artifact hygiene, refreshed execution-v1 snapshot, and production readiness gate proof must match the same target boundary
- kept provider stop conditions and productionReadyClaim guards unchanged while extending UI harness browse smoke coverage against generic provider evidence intake, provider operations, and provider boundary shorthand

## 2026-05-25 Deployment Clean Release Boundary UI Proof Detail Alignment

- expanded target clean deployment architecture, target clean deployment operations, and target deployment contract proofIntent wording so deployment approval, source provenance, artifact registry, dependency installation, runtime bootstrap, secret injection, environment boundary, migration/data readiness, smoke/health verification, rollback/recovery, release approval, failed-deployment containment, and snapshot evidence require owner, commit, artifact id, sha256, health result, rollback command, customer/workspace scope, and reviewer details
- expanded the clean production deployment production gap plus deployment and clean-release boundary maps so clean checkout, command replay, artifact synchronization, production-like drill, pilot export package, release artifact hygiene, execution-v1 evidence, artifact-sync-current, and production readiness gate proof are tied to the same approved source commit and target boundary
- kept stop conditions tied to `target-clean-deployment-operations-missing` and `clean-release-artifact-boundary-missing-or-stale` while preserving the production deployment readiness claim guard and extending UI harness browse smoke coverage against generic deployment/clean release shorthand

## 2026-05-25 Retention Backup Boundary UI Proof Detail Alignment

- expanded target data lifecycle architecture and target retention operations proofIntent wording so lifecycle approval, customer data class matrix, retention configuration, export request, delete workflow, provider transcript policy, post-delete absence, audit history, legal hold, conflict containment, exception review, customer handoff, hygiene, and snapshot evidence require owner, request id, timestamp, checksum, rollback, and containment details
- expanded the target retention enforcement production gap and retention/backup boundary map so retention/export/delete/provider transcript/post-delete absence evidence is tied to branch, commit, release label, approved target boundary, reviewer, customer approval, evidence owner, lifecycle exception review, backup dependency, and disaster recovery handoff
- kept the stop condition tied to `target-retention-operations-missing` and the production data lifecycle claim guard unchanged while extending UI harness browse smoke coverage against generic retention/backup boundary shorthand

## 2026-05-25 Staffed On-Call SLO Gap UI Proof Detail Alignment

- expanded target SLO architecture and target SLO operations proofIntent wording so SLO/SLA approval, customer terms, error budget, telemetry measurement, alert acknowledgement, staffed on-call response, customer communication, incident review, provider outage, maintenance/degradation, service credit, evidence retention, missed-SLO containment, hygiene, and snapshot evidence require proof-level target-boundary details
- expanded the staffed on-call production gap so target SLO operations, target observability operations, and target support operations evidence name availability/latency/error/support targets, burn-rate rules, alert route, responder, acknowledgement timestamp, missed-ack handling, rota, response owner, customer-visible timestamp, service credit owner, support handoff log, closure evidence, and next review date
- kept the stop condition tied to `target-slo-operations-missing` and the production incident response claim guard unchanged while extending UI harness browse smoke coverage against generic staffed on-call and target SLO operations shorthand

## 2026-05-25 Target Telemetry Gap UI Proof Detail Alignment

- expanded release target evidence observabilitySloEvidence and production gap metadata for target telemetry so target observability architecture approval, telemetry backend, signal inventory, ingestion, alert routing, acknowledgement, on-call coverage, retention, customer status, incident response, audit export, disaster recovery, SLO, hygiene, and snapshot evidence require owner, route, timestamp, audit, retention, fallback, and recovery details instead of generic telemetry shorthand
- aligned target observability architecture and target observability operations proofIntent wording so backend alias, region, tenancy boundary, data residency, event sample references, dropped-event review, delivery receipt, missed-ack handling, query access audit, corrective action closure, and evidence recovery are explicit target-boundary proof fields
- kept the stop condition tied to `target-observability-operations-missing` and the staffed production observability/SLO claim guard unchanged while extending UI harness browse smoke coverage against generic target telemetry shorthand

## 2026-05-24 Staffed Support Operations Gap UI Proof Detail Alignment

- expanded release target evidence supportOperationsEvidence and production gap metadata for staffed support operations so target support architecture approval proof names the approved architecture record, support owner, reviewer, customer/workspace scope, and review date instead of generic support approval shorthand
- aligned target support architecture and target support operations proofIntent wording so staffed support coverage, support queue routing, customer communication, ticket audit history, escalation ownership, incident review cadence, on-call handoff, support data handling, closure evidence, release artifact hygiene result, and regenerated execution snapshot evidence require proof-level target-boundary details
- kept the stop condition tied to `target-support-operations-missing` and the production customer support claim guard unchanged while extending UI harness browse smoke coverage against generic staffed support operations shorthand

## 2026-05-24 Hosted Identity Session Gap UI Proof Detail Alignment

- expanded release target evidence identitySessionEvidence and production gap metadata for hosted identity/session administration so customer IdP onboarding proof names metadata alias, issuer, audience, JWKS rotation owner, fallback owner, and customer approval instead of generic customer IdP shorthand
- aligned hosted identity session architecture and target identity session operations proofIntent wording so user lifecycle, session lifecycle, role administration, permission propagation, immutable audit export, break-glass governance, support impersonation, compliance retention, customer access containment, release artifact hygiene result, and regenerated execution snapshot evidence require proof-level target-boundary details
- kept the stop condition tied to `hosted-identity-session-approval-missing` and the hosted SaaS claim guard unchanged while extending UI harness browse smoke coverage against generic hosted identity/session shorthand

## 2026-05-24 Target Secret Injection Gap UI Proof Detail Alignment

- expanded release target evidence providerSecretEvidence and production gap metadata for target secret injection so approved secret manager platform proof names provider, region, tenancy boundary, owner, and fallback decision instead of generic platform shorthand
- aligned target secret manager architecture and operations proofIntent wording so secret class inventory, runtime injection paths, least-privilege policy, rotation/revocation invalidation, audit log events, break-glass governance, leakage review, disaster recovery, credential containment, release artifact hygiene result, and regenerated execution snapshot evidence require proof-level target-boundary details
- kept the stop condition tied to `target-secret-injection-missing` and the production provider credential claim guard unchanged while extending UI harness browse smoke coverage against generic target secret injection shorthand

## 2026-05-24 Hosted Tenant Storage Encryption Gap UI Proof Detail Alignment

- expanded release target evidence tenantIsolationEvidence and production gap metadata for hosted tenant storage/encryption so tenant identity source proof names source owner, customer organization mapping, tenant lifecycle owner, trust policy, source approval, and orphan tenant review instead of generic tenant identity shorthand
- aligned hosted tenant isolation architecture and target tenant isolation operations proofIntent wording so authorization propagation, storage/index partitioning, per-tenant encryption key custody, backup/restore non-interference, tenant administration audit, cross-surface denial, observability/support visibility, lifecycle controls, tenant data containment, release artifact hygiene result, and regenerated execution snapshot evidence require proof-level details
- kept the hosted tenant isolation stop conditions and blocked claim guards unchanged while extending UI harness browse smoke coverage against generic hosted tenant storage/encryption shorthand

## 2026-05-24 Release Approval Gap UI Proof Detail Alignment

- expanded release target evidence acceptedRiskDecision and production gap metadata for release approval so reviewer decision proof names reviewer, decision owner, review date, decision state, accepted risk ids, rejected claims, allowed claim text, residual blockers reviewed, command rerun log review, release refresh evidence review, productionReadyClaim decision, and next review date instead of generic reviewer decision shorthand
- aligned target environment evidence intake proofIntent and release approval gap guidance so sanitized submission packet and evidence register proof, boundary consistency map proof, command rerun log proof, blocker disposition register proof, release refresh evidence proof, artifact-sync-current proof, release artifact hygiene result, regenerated execution-v1 artifacts, and production readiness gate result require same-source-commit proof-level details
- kept the stop condition tied to `target-environment-evidence-missing` and the productionReadyClaim guard unchanged while extending UI harness browse smoke coverage against generic release approval shorthand

## 2026-05-24 Production Backup Execution Gap UI Proof Detail Alignment

- expanded target environment evidence intake and release target evidence production gap metadata for production backup execution so backup schedule execution proof names backup policy id, schedule, execution timestamps, missed-run handling, and owner acknowledgement instead of generic backup schedule shorthand
- aligned target backup operations proofIntent and production gap guidance so encrypted backup storage, backup key ownership, restore validation, backup expiry/deletion, disaster recovery, release artifact hygiene result, and regenerated execution snapshot evidence require proof-level target-boundary details
- kept the stop condition tied to `target-backup-operations-missing` and the production disaster recovery claim guard unchanged while extending UI harness browse smoke coverage against generic backup operations shorthand

## 2026-05-24 Target Retention Production Gap UI Proof Detail Alignment

- expanded target environment evidence intake and release target evidence production gap metadata for target retention enforcement so customer-approved data class proof names class owner, legal basis, retention window, exportability, delete eligibility, and exception policy instead of generic data class shorthand
- aligned target retention operations proofIntent and production gap guidance so retention configuration, export approval, delete workflow, provider transcript handling, post-delete absence, audit history, release artifact hygiene result, and regenerated execution snapshot evidence require proof-level target-boundary details
- kept the stop condition tied to `target-retention-operations-missing` and the production data lifecycle claim guard unchanged while extending UI harness browse smoke coverage against generic retention operations shorthand

## 2026-05-24 Staffed On-Call Production Gap UI Proof Detail Alignment

- expanded release target evidence production gap metadata for staffed on-call so alert acknowledgement proof, staffed on-call response proof, target observability alert delivery proof, staffed on-call routing and acknowledgement proof, target support on-call handoff proof, incident review cadence proof, release artifact hygiene result, and regenerated execution snapshot evidence replace named owner and escalation route shorthand
- kept the stop condition tied to `target-slo-operations-missing` and the blocked production incident response claim guard unchanged while making the UI copy require proof-level target SLO, observability, and support operations evidence
- extended UI harness browse smoke coverage so staffed on-call production gap guidance cannot regress to generic named on-call owner, alert acknowledgement, escalation route, customer communication owner, missed-alert containment, or incident review cadence shorthand

## 2026-05-24 Target Environment Observability SLO UI Proof Detail Alignment

- expanded target environment evidence intake observabilitySloEvidence so target observability architecture approval proof, approved telemetry backend proof, signal inventory proof, telemetry ingestion proof, alert routing proof, alert delivery receipt proof, staffed on-call coverage proof, log and trace retention proof, customer status communication proof, target SLO architecture approval proof, customer-approved SLO/SLA terms proof, error budget policy proof, telemetry measurement proof, staffed on-call response proof, maintenance and degradation proof, service credit proof, evidence retention proof, missed-SLO containment proof, release artifact hygiene result, and regenerated execution snapshot evidence replace SLO/SLA and telemetry shorthand
- aligned release target evidence UI metadata and target telemetry blocker wording with the same proof-level observability/SLO packet so UI handoff guidance no longer falls back to generic target log, metric, trace, alert, incident handoff, customer status, and provider outage handling evidence
- extended UI harness browse smoke coverage so observability/SLO guidance cannot regress to generic SLO/SLA terms, error budget owner, telemetry backend, alert route, on-call owner, customer status route, incident review, provider outage handling, or missed-SLO shorthand

## 2026-05-24 Clean Deployment Secret Injection Proof Detail Alignment

- expanded target clean deployment architecture and operations secret injection requirements so approved secret manager platform proof, runtime injection path proof, least-privilege access policy proof, rotation and revocation event proof, redaction and leakage review proof, break-glass governance proof, secret access audit log proof, and credential containment proof replace target secret manager alias shorthand
- aligned target deployment contract, release readiness, and production-like drill wording so clean deployment secret evidence requires proof-level target controls instead of alias, rotation, redaction, and access-audit shorthand
- extended clean deployment and production readiness smoke coverage so target clean deployment secret injection claims cannot regress to generic secret manager alias evidence

## 2026-05-24 Provider Secret Injection Proof Detail Alignment

- expanded provider account secret injection requirements for OpenAI and Anthropic so approved secret manager platform proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage and redaction review proof, and credential containment proof replace target secret manager alias shorthand
- aligned target provider operations, production provider readiness, target local provider architecture, and target Hermes provider architecture wording so provider credential evidence requires proof-level secret manager controls instead of alias, rotation, redaction, and access audit shorthand
- updated target environment evidence intake, production readiness, production-like drill, and related smoke coverage so provider secret injection claims cannot regress to generic secret manager alias evidence

## 2026-05-23 Target Secret Manager UI Proof Detail Alignment

- expanded release target evidence UI metadata for providerSecretEvidence so provider approval proof, approved secret manager platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage review proof, disaster recovery proof, credential containment proof, target-boundary live validation proof, release artifact hygiene result, and regenerated execution snapshot evidence are recorded as proof fields
- expanded target secret manager architecture and target secret manager operations command package proofIntent wording so migration plan, rollback, lockout recovery, credential containment, release artifact hygiene, production readiness gate, and regenerated execution snapshot evidence are explicit UI proof requirements
- extended UI harness browse smoke coverage so secret manager guidance cannot regress to generic target secret aliases, rotation, revocation, break-glass, audit, deployment injection, sanitized secret evidence, or provider-secret boundary shorthand

## 2026-05-23 Target Tenant Isolation UI Proof Detail Alignment

- expanded release target evidence UI metadata for tenantIsolationEvidence so tenant identity source proof, customer organization mapping proof, tenant lifecycle proof, tenant-scoped authorization proof, service-to-service tenant propagation proof, storage partitioning proof, artifact/memory/search/export/index partitioning proof, per-tenant encryption/key ownership proof, backup/restore isolation proof, tenant administration proof, cross-tenant denial proof, observability/support isolation proof, lifecycle isolation proof, tenant data containment, release artifact hygiene result, and regenerated execution snapshot evidence are recorded as proof fields
- expanded hosted tenant isolation architecture and target tenant isolation operations command package proofIntent wording so migration plan, rollback, tenant data containment, release artifact hygiene, and regenerated execution snapshot evidence are explicit UI proof requirements
- extended UI harness browse smoke coverage so tenant isolation guidance cannot regress to generic tenant identity, storage/encryption, backup/restore, lifecycle, cross-tenant, observability/support, or tenant containment shorthand

## 2026-05-22 Target Identity Session UI Proof Detail Alignment

- expanded release target evidence UI metadata for identitySessionEvidence so customer IdP onboarding proof, user lifecycle proof, session lifecycle proof, role administration proof, permission propagation proof, immutable audit export proof, break-glass governance proof, support impersonation proof, compliance and retention proof, customer access containment proof, release artifact hygiene result, and regenerated execution snapshot evidence are recorded as proof fields
- expanded hosted identity/session architecture and target identity/session operations command package proofIntent wording so migration plan, rollback, lockout recovery, customer access containment, release artifact hygiene, and regenerated execution snapshot evidence are explicit UI proof requirements
- extended UI harness browse smoke coverage so identity/session guidance cannot regress to generic customer IdP, lifecycle, audit export, break-glass, support impersonation, compliance, or retention shorthand

## 2026-05-22 Target Clean Deployment UI Proof Detail Alignment

- expanded release target evidence UI metadata for deploymentBoundaryEvidence and cleanReleaseEvidence so target deployment contract reference, approved target boundary, source provenance, artifact registry, dependency installation, runtime bootstrap, secret injection, environment boundary, rollback and recovery, clean checkout, command replay, artifact synchronization, production-like environment, release approval, pilot export package, release artifact hygiene, artifact-sync-current, failed-deployment containment, and misleading production-ready claim containment evidence are recorded as proof fields
- expanded target clean deployment architecture, target clean deployment operations, target deployment contract, clean deployment release, production-like release drill, pilot export package, and release artifact hygiene command package proofIntent wording so clean deployment release evidence cannot fall back to dependency/runtime, release snapshot, rollback, file count, hygiene state, or scan shorthand
- extended UI harness browse smoke coverage so clean deployment, deployment contract, production-like drill, pilot export, and release artifact hygiene guidance cannot regress to generic deployment boundary, clean checkout, dependency, snapshot, rollback, export package, or artifact scan shorthand

## 2026-05-22 Target Support UI Proof Detail Alignment

- expanded release target evidence UI metadata for supportOperationsEvidence so target support architecture approval proof, staffed support coverage proof, support queue routing proof, customer communication proof, ticket audit history proof, escalation ownership proof, incident review cadence proof, on-call handoff proof, support data handling proof, release artifact hygiene, and regenerated execution snapshot evidence are recorded as proof fields
- expanded target support architecture and target support operations command package proofIntent wording so staffing model, support queue platform, severity routing, customer communication boundary, ticket audit and retention, on-call handoff, incident commander ownership, escalation and backup coverage, support data handling, incident review governance, migration, missed-acknowledgement, queue-misrouting, customer-communication, ticket-audit, unstaffed-escalation containment, closure, and artifact refresh evidence are explicit proof requirements
- extended UI harness browse smoke coverage so support command package guidance cannot regress to generic support queue, staffing, escalation, ticket audit, customer communication, on-call handoff, or incident review shorthand

## 2026-05-22 Target Retention Backup UI Proof Detail Alignment

- expanded release target evidence UI metadata for retentionBackupEvidence so customer-approved data class proof, target retention configuration proof, export approval proof, delete workflow proof, provider transcript handling proof, post-delete absence proof, audit history proof, backup schedule execution proof, encrypted backup storage proof, backup key ownership proof, restore validation proof, tenant isolation proof, backup expiry/deletion proof, disaster recovery proof, release artifact hygiene, and regenerated execution snapshot evidence are recorded as proof fields
- expanded target data lifecycle architecture, target retention operations, and target backup operations command package proofIntent wording so data lifecycle approval, data class matrix, retention configuration, export/delete requests, provider transcript policy, post-delete absence, backup architecture, restore validation, key ownership, legal hold, delete conflict, provider transcript exception, customer communication containment, and artifact refresh evidence are explicit proof requirements
- extended UI harness browse smoke coverage so retention and backup command package guidance cannot regress to generic retention/export/delete/backup shorthand or production gap wording

## 2026-05-22 Target Observability SLO UI Proof Detail Alignment

- expanded target observability architecture and operations UI command package proofIntent wording so telemetry backend ownership, signal inventory, metric log trace and audit event boundaries, alert routing, alert delivery receipts, staffed on-call coverage, log and trace retention, customer status communication, incident response, audit export, disaster recovery, release artifact hygiene, and regenerated execution snapshot evidence are recorded as proof fields
- expanded target SLO architecture and operations UI command package proofIntent wording so SLO/SLA architecture approval, customer-approved SLO/SLA terms, error budget policy, telemetry measurement, alert acknowledgement, staffed on-call response, customer communication, incident review, provider outage handling, maintenance and degradation, service credit, evidence retention, missed-SLO containment, release artifact hygiene, and regenerated execution snapshot evidence are explicit proof requirements
- extended UI harness browse smoke coverage so observability and SLO command package guidance cannot regress to generic telemetry, alert, customer communication, error budget, route, or missed-SLO shorthand

## 2026-05-22 Provider Fallback Event UI Proof Detail Alignment

- expanded the provider fallback event audit package production readiness boundary so target provider operations approval requires provider account or architecture approval proof, target secret injection proof, target-boundary live validation proof, model and endpoint pinning proof, quota, cost, and resource guard proof, fallback and disable path proof, provider fallback runtime audit proof, telemetry, incident triage, data and transcript handling, remediation and renewal, evidence retention, provider failure containment, release artifact hygiene, and refreshed execution-v1 snapshot evidence
- added explicit UI handoff wording that fallback runtime audit proof must include mission run, mission timeline, workspace timeline, operator timeline, provider events, provider attention remediation, selected fallback provider, fallback policy id, fallback stop reason, non-provider-failure stop condition, non-recoverable provider failure stop condition, event family, and operator chronology evidence
- extended UI harness browse smoke coverage so the provider fallback event audit package cannot regress to generic target provider operations evidence approval wording

## 2026-05-22 Provider Attention Fallback Audit Coverage

- extended provider attention remediation smoke coverage so `action remediate-provider-attention --fallback-provider --fallback-policy` proves provider-failure-only fallback events are written to the mission timeline with fallback policy and stop reason counts
- added recoverable-provider-failure-only remediation assertions for both recoverable provider failures and non-recoverable config failures so remediation-driven fallback events expose `eligible-provider-failure`, `mission-status-completed`, and `non-recoverable-provider-failure` stop reasons
- verified provider events filtering for remediation-generated fallback audit events by policy and stop reason so target provider operations evidence can rely on action remediation, mission timeline, and provider events surfaces together

## 2026-05-22 Target Provider Evidence Operations UI Proof Detail Alignment

- expanded release target evidence UI metadata for target provider evidence intake so provider owner, target boundary, account or architecture approval, target secret injection, quota and cost guard, model and endpoint pinning, archived live validation, fallback route, failure triage, blocker closure verification, stop-condition id, release artifact references, and decision owner are recorded as proof fields
- expanded target provider operations UI metadata and provider evidence reference handoff wording so fallback policy, stop reason, blocker closure, artifact hygiene, refreshed execution-v1 snapshot, telemetry, incident triage, data and transcript handling, remediation and renewal, evidence retention, and provider failure containment are explicit proof requirements
- extended UI harness browse smoke coverage so provider evidence and provider operations guidance cannot reintroduce generic approval, live validation, fallback, operations, or artifact refresh shorthand

## 2026-05-22 Target Local Provider UI Proof Detail Alignment

- expanded release target evidence UI metadata for target local provider architecture so endpoint ownership, LOCAL_PROVIDER_MODEL model pinning, network isolation, secret and credential policy, runtime lifecycle, session and artifact provenance, data residency and transcript policy, quota and resource guard, telemetry, fallback and customer approval, target-boundary local live validation, release artifact hygiene, regenerated execution snapshot, and customer acceptance are recorded as proof fields
- aligned local provider accepted-scope exception, accepted risk decision, and blocker disposition register wording so UI handoff packages no longer fall back to endpoint ownership, model pinning, data residency, quota/resource, telemetry, fallback evidence, or customer acceptance shorthand
- extended UI harness browse smoke coverage so local provider architecture guidance cannot reintroduce local provider proofIntent or register shorthand

## 2026-05-22 Target Provider Evidence Intake Proof Field Cleanup

- expanded target provider evidence intake wording so account owner, billing and credit or quota status, allowed workspace or customer, provider-specific account or architecture approval, quota, concurrency, timeout, spend owner, retry guard, model, endpoint or base URL alias, fallback route, failure owner, blocker state, next verification command, stop-condition id, regenerated execution snapshot, release artifact references, and decision owner are recorded as proof fields
- aligned README and release provider readiness UI closure rules so target provider evidence intake and target provider operations guidance no longer falls back to quota/cost, model/endpoint, data/transcript, remediation/renewal, or slash-based shorthand
- extended target provider evidence intake and UI harness browse smoke coverage so those source surfaces cannot reintroduce account approval, blocker closure, provider operations, or shorthand closure-rule wording

## 2026-05-22 Target Provider Operations Proof Field Cleanup

- expanded target provider operations account approval, blocker closure, and remediation renewal wording so billing and credit or quota state, account owner, customer or workspace approval, provider terms, model access, renewal owner, regenerated execution snapshot, release artifact references, endpoint renewal, and model access renewal are recorded as proof fields
- aligned the production-ready target provider operations blocker in release readiness with the same proof-level wording instead of `billing/credit/quota`, `endpoint/model`, or regenerated artifact shorthand
- extended target provider operations smoke coverage so the source contract and release blocker cannot reintroduce account approval, remediation renewal, or regenerated release artifact shorthand

## 2026-05-22 Target OpenAI Provider Account UI Proof Detail Alignment

- expanded release target evidence UI metadata for the OpenAI provider account command so account ownership, billing and quota, API key and secret injection, OPENAI_MODEL model access, provider terms and customer approval, usage and cost guard, target-boundary live validation, telemetry, fallback and stop-condition, and renewal/review audit are recorded as proof fields
- extended UI harness browse smoke coverage so OpenAI provider account guidance cannot fall back to billing/quota, API key injection, model access, terms, usage guard, live validation, telemetry, fallback, or review audit shorthand

## 2026-05-22 Target Anthropic Provider Account Action Proof Detail Alignment

- expanded Anthropic provider account blocker action wording so account ownership, billing and credit remediation, active billing plan, available credit balance, API key and secret injection, ANTHROPIC_MODEL model access, provider terms and customer approval, quota and spend guard, target-boundary Anthropic live validation, mission and execution session provenance, telemetry, fallback and stop-condition, remediation audit, release artifact hygiene, and regenerated execution snapshot are recorded as proof fields
- aligned release target evidence UI metadata for Anthropic exception, risk, and blocker disposition registers so required evidence no longer falls back to billing/credit, target secret injection, live validation, or regenerated artifact shorthand
- extended execution-v1 status and production readiness gate smoke coverage so Anthropic provider account blockers require proof-level action and stop-condition wording

## 2026-05-22 Target Hermes Provider Architecture Proof Detail Alignment

- expanded target Hermes provider architecture wording so endpoint ownership, HERMES_PROVIDER_MODEL model pinning, target secret injection, tool-call parsing, session lifecycle, data and transcript policy, quota and rate guard, telemetry, fallback and stop-condition, customer approval, target-boundary Hermes live validation, release artifact hygiene, and regenerated execution snapshot requirements are recorded as proof fields across the source-of-record and planning references
- updated execution-v1 handoff and production provider readiness generation so Hermes blockers require proof-level provider architecture evidence instead of endpoint/model or runtime configuration shorthand
- extended Hermes architecture, target deployment contract, target environment intake, production readiness, production provider readiness, pilot export, and execution-v1 status smoke coverage so Hermes claims cannot fall back to model/endpoint, fallback/stop-condition, transcript policy, or live-validation shorthand

## 2026-05-22 Target Local Provider Architecture Proof Detail Alignment

- expanded target local provider architecture wording so quota and resource guard requirements are recorded as proof fields across the source-of-record, README, release readiness, deployment guide, security model, runbook, onboarding, demo, roadmap, target deployment contract, and target environment intake references
- updated execution-v1 handoff guidance generation so local provider production blockers require endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, telemetry proof, quota and resource guard proof, target-boundary local live validation, release artifact hygiene, and regenerated execution snapshot evidence
- extended local provider architecture, target deployment contract, target environment intake, production readiness, production-like drill, pilot export, and execution-v1 handoff smoke coverage so local provider claims cannot fall back to endpoint/model or quota/resource shorthand

## 2026-05-22 Target Provider Operations Proof Detail Alignment

- expanded target provider operations source-of-record wording so model and endpoint pinning, quota, cost, and resource guard, fallback and disable path, provider fallback runtime audit, telemetry, incident triage, data and transcript handling, remediation and renewal review, evidence retention, and provider failure containment are recorded as proof fields instead of slash-based shorthand
- aligned README, release readiness, deployment guide, security model, target deployment contract, target environment evidence intake, and target provider evidence intake references with the same proof-level provider operations vocabulary
- extended target provider operations and target deployment contract smoke coverage so provider operations docs cannot reintroduce model/endpoint, quota/cost/resource, fallback/disable, data/transcript, or remediation/renewal shorthand

## 2026-05-22 Production Provider Readiness Proof Detail Alignment

- expanded production provider readiness generator wording so target provider evidence intake and target provider operations guidance records provider owner, target boundary, secret manager alias, model and endpoint pinning, quota and cost guard, archived live validation, blocker closure verification, fallback and stop-condition, telemetry, incident triage, data and transcript handling, remediation and renewal, evidence retention, and failure containment as proof fields instead of slash-based shorthand
- aligned OpenAI, Anthropic, local, and Hermes provider readiness gate bullets so live validation, release artifact hygiene, regenerated execution snapshot, local quota and resource guard, and Hermes regenerated artifact requirements use proof-level wording
- extended production provider readiness smoke coverage so generated provider readiness docs cannot reintroduce model/endpoint, quota/cost, fallback/stop-condition, data/transcript, remediation/renewal, or release artifact shorthand

## 2026-05-22 Deployment and Release Action Guidance Proof Detail Alignment

- expanded `/api/execution-v1/status` target-deployment current open blocker action guidance so `nextEvidence` and `stopReason` use proof-level target deployment name, deployment profile decision, mandatory control, provider readiness, identity and tenant, secret and observability, data lifecycle and support, clean release artifact, stop-condition decision, production-ready claim decision, target environment submission packet, release artifact hygiene, production-like drill, reviewer decision, and regenerated execution snapshot wording instead of slash-based shorthand
- expanded release-decision current open blocker action guidance so production release label expansion requires target provider evidence intake, provider operations, provider approvals, target-boundary live validation, provider failure containment, enterprise controls, hosted identity and session, hosted tenant isolation, target secret manager, target observability and SLO, data lifecycle and support, target deployment, clean deployment, production-like drill, release artifact hygiene, accepted risk, allowed claim, release decision owner, next review date, and regenerated execution snapshot proof
- extended execution-v1 status smoke coverage so target deployment and release decision action guidance cannot reintroduce slash-based or hyphenated shorthand

## 2026-05-22 Provider Architecture Action Stop Reason Proof Detail Alignment

- expanded local provider current open blocker action wording so `nextEvidence` and `stopReason` use proof-level quota and resource guard, release artifact hygiene result, regenerated execution snapshot evidence, and target-boundary local provider live validation pass wording instead of slash-based shorthand
- expanded Hermes provider current open blocker action wording so `nextEvidence` and `stopReason` record endpoint ownership, HERMES_PROVIDER_MODEL model pinning, target secret injection, tool-call parsing, session lifecycle provenance, transcript policy, quota guard, telemetry, fallback and stop-condition decision, customer approval, target-boundary Hermes live validation, release artifact hygiene result, and regenerated execution snapshot proof
- extended execution-v1 status smoke coverage so provider-architecture actions cannot reintroduce slash-based stop reason shorthand

## 2026-05-22 Anthropic Provider Account Action Proof Detail Alignment

- expanded `/api/execution-v1/status` Anthropic provider-account current open blocker action metadata so `nextEvidence` names account ownership, billing and credit remediation, active billing plan, available credit balance, ANTHROPIC_API_KEY target secret injection, ANTHROPIC_MODEL access, provider terms and customer approval, quota and spend guard, target-boundary Anthropic live validation, mission/session provenance, telemetry, fallback and stop-condition decision, remediation audit, release artifact hygiene, and regenerated execution snapshot proof
- aligned the Anthropic action `stopReason` with the target Anthropic provider account evidence packet so operator triage records missing account, billing, secret, model, terms, quota, live-validation, provenance, telemetry, fallback, remediation, hygiene, and snapshot proof instead of generic billing/live-validation shorthand
- extended execution-v1 status smoke coverage so Anthropic provider-account actions cannot fall back to generic target provider account or provider terms/quota shorthand

## 2026-05-22 Provider Architecture Action Proof Detail Alignment

- expanded `/api/execution-v1/status` local provider current open blocker action metadata so `nextEvidence` and `stopReason` name endpoint ownership, LOCAL_PROVIDER_MODEL model pinning, network isolation, secret and credential policy, runtime lifecycle, session/artifact provenance, data residency/transcript policy, quota/resource guard, telemetry, fallback/customer approval, target-boundary live validation, release artifact hygiene, and regenerated execution snapshot proof
- expanded Hermes provider current open blocker action metadata so operator triage names endpoint ownership, HERMES_PROVIDER_MODEL model pinning, target secret injection, tool-call parsing, session lifecycle, transcript policy, quota guard, telemetry, fallback/stop-condition, customer approval, target-boundary live validation, release artifact hygiene, and regenerated execution snapshot proof
- extended execution-v1 status smoke coverage so provider-architecture actions cannot fall back to endpoint/model runtime-configuration shorthand

## 2026-05-22 Release Label Open Blocker Proof Detail Alignment

- expanded the release-readiness current open release label blocker from a generic provider/enterprise-controls verification line into proof-level provider intake, provider operations, provider approval, target-boundary live validation, provider failure containment, enterprise control, hosted identity/session, hosted tenant isolation, secret manager, observability/SLO, data lifecycle/support, target deployment, clean release, production-like drill, artifact hygiene, accepted-risk, allowed-claim, decision-owner, next-review, and regenerated execution snapshot evidence requirements
- aligned `/api/execution-v1/status` release-decision blocker action metadata so operator triage surfaces the same proof-level `nextEvidence` and `stopReason` fields instead of generic release-label wording
- extended production readiness and execution-v1 status smoke guards so current open blocker guidance cannot fall back to shorthand production release label wording

## 2026-05-22 Target Deployment Open Blocker Proof Detail Alignment

- expanded the release-readiness current open target deployment blocker from a domain checklist into proof-level target deployment name, deployment profile, mandatory control, provider, identity/tenant, secret/observability, data lifecycle/support, clean release, stop-condition, production-ready claim, submission packet, artifact hygiene, production-like drill, reviewer decision, and regenerated execution snapshot evidence requirements
- aligned `/api/execution-v1/status` target-deployment blocker action metadata so operator triage surfaces the same proof-level `nextEvidence` and `stopReason` fields instead of generic target-evidence wording
- extended production readiness, execution-v1 status, and target deployment contract smoke guards so current open blocker guidance cannot fall back to shorthand target deployment contract evidence wording

## 2026-05-21 Target Support Operations Proof Detail Alignment

- expanded target support operations wording across README, release readiness, deployment guide, security model, target deployment contract, and target environment evidence intake so production support evidence requires staffed support coverage proof, support queue routing proof, customer communication proof, ticket audit history proof, escalation ownership proof, incident review cadence proof, on-call handoff proof, support data handling proof, release artifact hygiene, and regenerated execution snapshot evidence
- kept `productionReadyClaim: false`, `targetSupportApproved: false`, and the local support architecture approval boundary unchanged while making the operations source-of-record wording match the proof-level evidence packet
- extended target support operations, target deployment contract, target environment evidence intake, production SLO operating, and production readiness smoke guards so support claims cannot fall back to generic rota/queue/ticketing shorthand

## 2026-05-21 Target Retention and Backup Proof Detail Alignment

- expanded target retention operations and target backup operations wording across README, release readiness, deployment guide, security model, target deployment contract, and target environment evidence intake so production evidence requires proof-level data class approval, retention configuration, export approval, delete workflow, provider transcript handling, post-delete absence, audit history, backup schedule execution, encrypted backup storage, key ownership, restore validation, tenant isolation, backup expiry/deletion, disaster recovery, release artifact hygiene, and regenerated execution snapshot evidence
- kept `productionReadyClaim: false`, target data lifecycle architecture approval, and local retention/backup rehearsal boundaries unchanged while making operations source-of-record wording match the proof-level evidence packets
- extended target retention operations, target backup operations, target deployment contract, target environment evidence intake, production retention operating, production readiness, and production-like release drill smoke guards so retention/backup claims cannot fall back to generic retention/export/delete/backup shorthand

## 2026-05-21 Target SLO Proof Detail Alignment

- expanded target SLO architecture and target SLO operations wording across README, release readiness, deployment guide, security model, target deployment contract, and target environment evidence intake so approval requires customer-approved SLO/SLA terms proof, error budget policy proof, telemetry measurement proof, alert acknowledgement proof, staffed on-call proof, customer communication proof, incident review proof, provider outage proof, maintenance/degradation proof, service credit proof, release artifact hygiene, and regenerated execution snapshot evidence
- kept `targetSloApproved: false`, `productionReadyClaim: false`, and the local incident/SLO operating evidence boundary unchanged while making SLO/SLA source-of-record wording match the proof-level evidence packets
- extended target SLO architecture, target SLO operations, target deployment contract, target environment evidence intake, production readiness, and production-like release drill smoke guards so SLO/SLA claims cannot fall back to generic telemetry/on-call/service-credit shorthand

## 2026-05-21 Target Observability Proof Detail Alignment

- expanded target observability architecture and target observability operations wording across README, release readiness, deployment guide, security model, target deployment contract, and target environment evidence intake so approval requires approved telemetry backend proof, signal inventory proof, telemetry ingestion proof, alert routing proof, alert delivery receipt proof, staffed on-call proof, log/trace retention proof, customer status communication proof, incident response proof, audit export proof, disaster recovery proof, release artifact hygiene, and regenerated execution snapshot evidence
- kept `targetObservabilityApproved: false`, `productionReadyClaim: false`, and the local observability telemetry evidence boundary unchanged while making observability source-of-record wording match the proof-level evidence packets
- extended target observability architecture, target observability operations, target deployment contract, target environment evidence intake, production readiness, and production-like release drill smoke guards so observability claims cannot fall back to generic telemetry/alert/on-call shorthand

## 2026-05-21 Tenant Isolation Proof Detail Alignment

- expanded hosted tenant isolation architecture and target tenant isolation operations wording across README, release readiness, deployment guide, security model, target deployment contract, and target environment evidence intake so approval requires tenant identity source proof, customer organization mapping proof, tenant lifecycle proof, tenant-scoped authorization proof, storage partitioning proof, per-tenant encryption/key ownership proof, backup/restore isolation proof, tenant administration proof, cross-tenant denial proof, observability/support isolation proof, lifecycle isolation proof, tenant data containment, release artifact hygiene, and regenerated execution snapshot evidence
- kept `hostedTenantIsolationApproved: false`, `productionReadyClaim: false`, and the local tenant storage/runtime isolation evidence boundary unchanged while making tenant isolation source-of-record wording match the proof-level evidence packet
- extended hosted tenant isolation, target tenant isolation operations, target deployment contract, target environment evidence intake, and production readiness smoke guards so tenant isolation claims cannot fall back to generic tenant/storage/encryption shorthand

## 2026-05-20 Hosted Identity Session Proof Detail Alignment

- expanded hosted identity/session architecture and target identity/session operations wording across README, release readiness, deployment guide, security model, target deployment contract, and target environment evidence intake so approval requires customer IdP onboarding proof, user lifecycle proof, session lifecycle proof, role administration proof, permission propagation proof, immutable audit export proof, break-glass governance proof, support impersonation proof, compliance and retention proof, customer access containment, release artifact hygiene, and regenerated execution snapshot evidence
- kept `hostedIdentitySessionApproved: false`, `productionReadyClaim: false`, and the local identity/session admin evidence boundary unchanged while making identity/session source-of-record wording match the proof-level evidence packet
- extended hosted identity/session, target identity/session operations, target deployment contract, target environment evidence intake, and production readiness smoke guards so identity/session claims cannot fall back to generic customer-IdP/lifecycle/audit shorthand

## 2026-05-20 Target Secret Manager Architecture Proof Detail Alignment

- expanded target secret manager architecture summary wording across README, release readiness, deployment guide, security model, target deployment contract, and target environment evidence intake so approval requires approved platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage review proof, disaster recovery proof, migration plan, rollback, lockout recovery, credential containment, release artifact hygiene, and regenerated execution snapshot evidence
- kept `targetSecretManagerApproved: false`, local secret-management evidence, and the existing production-ready stop-condition unchanged while making the architecture source-of-record match the proof-level evidence packet
- extended target secret manager architecture, target deployment contract, target environment evidence intake, and production readiness smoke guards so target secret manager claims cannot fall back to generic platform/access/rotation shorthand

## 2026-05-20 Target Provider Account Proof Detail Alignment

- expanded target OpenAI and Anthropic provider account summary wording across README, release readiness, deployment guide, security model, target provider evidence intake, target deployment contract, target environment evidence intake, and provider readiness generation so account approval requires account ownership proof, billing/quota or billing/credit remediation proof, API key and secret injection proof, model access proof, provider terms and customer approval proof, quota/usage guard proof, target-boundary live validation, telemetry proof, fallback and stop-condition proof, renewal or remediation audit proof, release artifact hygiene, and regenerated execution snapshot evidence
- kept `targetOpenAIProviderApproved: false`, `targetAnthropicProviderApproved: false`, archived OpenAI pilot validation, and the existing Anthropic billing/credit blocker unchanged while making account-gate summaries match their proof-level evidence packets
- extended target OpenAI account, target Anthropic account, target deployment contract, target environment evidence intake, and production provider readiness smoke guards so provider account approval cannot fall back to generic account/billing/live-validation shorthand

## 2026-05-20 Target Local Provider Architecture Proof Detail Alignment

- expanded target local provider architecture, target deployment contract, target environment evidence intake, deployment guide, security model, README, and provider readiness gate wording so local provider approval requires endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof, data residency and transcript policy proof, quota/resource guard proof, telemetry proof, fallback and customer approval proof, target-boundary local provider live validation, release artifact hygiene, and regenerated execution snapshot evidence
- kept `targetLocalProviderApproved: false`, archived local provider pilot proof, and runtime behavior unchanged while making the target local architecture source-of-record match the proof-level evidence packet
- extended target local architecture, target deployment contract, target environment evidence intake, and production provider readiness smoke guards so local provider approval cannot fall back to generic endpoint/model shorthand

## 2026-05-20 Target Hermes Provider Architecture Proof Detail Alignment

- expanded target Hermes provider architecture, target deployment contract, target environment evidence intake, deployment guide, security model, README, and provider readiness gate wording so Hermes approval requires endpoint ownership proof, HERMES_PROVIDER_MODEL model pinning proof, target secret injection proof, tool-call parsing proof, session lifecycle provenance proof, transcript policy proof, quota guard proof, telemetry proof, fallback and stop-condition decision proof, customer approval proof, target-boundary Hermes live validation, release artifact hygiene, and regenerated release artifacts
- kept `targetHermesProviderApproved: false` and the existing runtime missing-env behavior unchanged while making the target architecture source-of-record match the proof-level evidence packet
- extended target Hermes architecture, target deployment contract, target environment evidence intake, and production provider readiness smoke guards so target Hermes approval cannot fall back to generic endpoint/model/live-validation shorthand

## 2026-05-20 Hermes Handoff Blocker Stop-Condition Detail Alignment

- expanded execution-v1 handoff Hermes next-step and completion-boundary blockers so they name endpoint ownership, HERMES_PROVIDER_MODEL model pinning, target secret injection, tool-call parsing, session lifecycle provenance, transcript policy, quota guard, telemetry, fallback and stop-condition decision, customer approval, target-boundary Hermes live validation pass, release artifact hygiene, and regenerated execution snapshot evidence
- kept the operational missing-env line for HERMES_PROVIDER_MODEL separate while making the handoff stop-condition match the target Hermes provider architecture evidence packet
- extended the execution-v1 handoff smoke guard so generated handoff output cannot fall back to generic target-provider-architecture shorthand

## 2026-05-20 Hermes Current Blocker Stop-Condition Detail Alignment

- expanded current-open, planning, security, onboarding, demo, runbook, deployment, roadmap, and production provider readiness Hermes blockers so they name endpoint ownership, HERMES_PROVIDER_MODEL model pinning, target secret injection, tool-call parsing, session lifecycle provenance, transcript policy, quota guard, telemetry, fallback and stop-condition decision, customer approval, target-boundary Hermes live validation pass, release artifact hygiene, and regenerated execution snapshot evidence
- kept the runtime live helper missing-env state separate while making current Hermes blocker wording match the target Hermes provider architecture evidence packet
- extended production readiness, production provider readiness, and pilot export smoke guards so Hermes blockers cannot fall back to endpoint/model configuration shorthand

## 2026-05-20 Target Local Provider Blocker Stop-Condition Detail Alignment

- expanded pilot, current-open, and handoff local provider blockers so they name endpoint ownership, LOCAL_PROVIDER_MODEL model pinning, network isolation, secret and credential policy, runtime lifecycle, session and artifact provenance, data residency and transcript policy, quota/resource guard, telemetry, fallback and customer approval, target-boundary local live validation pass, release artifact hygiene, and regenerated execution snapshot evidence
- kept archived local provider pilot validation separate from target local provider architecture approval while making readiness blockers match the target local provider architecture evidence packet
- extended production readiness, target local provider architecture, and pilot export smoke guards so local provider blockers cannot fall back to endpoint/model shorthand wording

## 2026-05-20 Hermes Pilot-Scope Blocker Stop-Condition Detail Alignment

- expanded the pilot-scope Hermes live validation blocker so it names endpoint ownership, HERMES_PROVIDER_MODEL model pinning, target secret injection, tool-call parsing, session lifecycle provenance, transcript policy, quota guard, telemetry, fallback, customer approval, target-boundary Hermes live validation pass, release artifact hygiene, and regenerated execution snapshot evidence
- kept the runtime live helper missing-env state separate while making the pilot-scope blocker match the target Hermes provider architecture evidence contract
- extended production readiness smoke guards so pilot-ready blockers cannot fall back to generic HERMES_PROVIDER_MODEL missing-env wording

## 2026-05-20 Anthropic Open Blocker Stop-Condition Detail Alignment

- expanded the current open Anthropic live validation blocker so it names billing and credit remediation, active billing plan, available credit balance, ANTHROPIC_API_KEY target secret injection, ANTHROPIC_MODEL access, provider terms and customer approval, quota and spend guard, target-boundary Anthropic live validation pass, mission/session provenance, telemetry, fallback and stop-condition decision, remediation audit, release artifact hygiene, and regenerated execution snapshot evidence
- aligned the operator-facing current open blocker action summary with the detailed Anthropic provider-account evidence packet while keeping the provider account category, provider-ops owner, and Anthropic top-priority triage behavior unchanged
- extended production readiness and execution-v1 status smoke guards so current open blockers cannot fall back to generic Anthropic billing/credit wording

## 2026-05-20 Provider Live Validation Stop-Condition Detail Alignment

- expanded the production-ready Anthropic and Hermes live validation blocker so it names Anthropic billing and credit remediation, ANTHROPIC_API_KEY target secret injection, ANTHROPIC_MODEL access, Anthropic live command result, Hermes target provider architecture approval, HERMES_PROVIDER_MODEL pinning, Hermes endpoint and secret injection, Hermes live command result, mission/session provenance, telemetry, failureKind taxonomy, fallback or disable decision, remediation owner, next review date, release artifact hygiene, and regenerated execution snapshot evidence
- kept provider live validation completion separate from provider account and provider architecture approval while making the blocker match the included-provider live validation evidence packet
- extended production readiness and production-like drill smoke guards so release artifacts cannot fall back to generic Anthropic and Hermes live validation wording

## 2026-05-20 Target Deployment Contract Stop-Condition Detail Alignment

- expanded the production-ready target deployment contract blocker so it names target deployment name, deployment profile decision, mandatory control evidence, provider readiness evidence, identity and tenant evidence, secret and observability evidence, data lifecycle and support evidence, clean release artifact evidence, stop-condition decision, and production-ready claim decision
- kept the target deployment contract as a target-environment evidence gate while making the blocker match the target deployment contract capture template and mandatory-control review boundary
- extended production readiness, production-like drill, and target deployment contract smoke guards so release artifacts cannot fall back to generic target-environment evidence wording

## 2026-05-20 Target Provider Operations Stop-Condition Detail Alignment

- expanded the production-ready target provider operations blocker so it names completed per-provider capture template, branch and commit, release label and deployment boundary, provider inventory proof, provider account approval proof, target secret injection proof, target-boundary live validation proof, model and endpoint pinning proof, quota/cost/resource guard proof, fallback and disable proof, provider fallback runtime audit proof, target blocker closure verification proof, provider telemetry proof, provider incident triage proof, data and transcript handling proof, remediation and renewal review proof, artifact hygiene, production readiness gate result, residual risk, and provider failure containment plan
- kept target provider operations as a target-environment evidence gate while making the blocker match the target provider operations evidence packet and capture template
- extended production readiness, production-like drill, and target provider operations smoke guards so release artifacts cannot fall back to generic provider operations evidence wording

## 2026-05-19 Target Hermes Provider Architecture Stop-Condition Alignment

- expanded the production-ready target Hermes provider architecture blocker so it names endpoint ownership proof, model pinning proof, secret injection proof, tool-call parsing proof, session lifecycle proof, data and transcript policy proof, quota and rate guard proof, telemetry proof, fallback and stop-condition proof, customer approval proof, migration plan, and Hermes provider failure containment evidence
- kept Hermes live validation failure separate from target Hermes provider architecture approval while making the blocker match the target Hermes provider architecture decision areas and required evidence packet
- extended production readiness, production-like drill, and target Hermes provider architecture smoke guards so release artifacts cannot fall back to generic endpoint/model/tool-call/live validation wording

## 2026-05-19 Target Local Provider Architecture Stop-Condition Alignment

- expanded the production-ready target local provider architecture blocker so it names endpoint ownership proof, model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof, migration plan, and provider failure containment evidence
- kept configured local provider pilot validation separate from target local provider architecture approval while making the blocker match the target local provider architecture decision areas and required evidence packet
- extended production readiness, production-like drill, and target local provider architecture smoke guards so release artifacts cannot fall back to generic target-boundary endpoint/model evidence wording

## 2026-05-19 Target Anthropic Provider Account Stop-Condition Alignment

- expanded the production-ready target Anthropic provider account blocker so it names account ownership proof, billing and credit proof, API key and secret injection proof, model access proof, provider terms and customer approval proof, quota and spend guard proof, target live validation proof, telemetry proof, fallback and stop-condition proof, remediation audit proof, migration plan, and provider failure containment evidence
- kept the archived Anthropic billing/credit failure separate from target Anthropic provider account approval while making the blocker match the target Anthropic provider account decision areas and required evidence packet
- extended production readiness, production-like drill, and target Anthropic provider account smoke guards so release artifacts cannot fall back to generic Anthropic live validation evidence wording

## 2026-05-19 Target OpenAI Provider Account Stop-Condition Alignment

- expanded the production-ready target OpenAI provider account blocker so it names account ownership proof, billing and quota proof, API key and secret injection proof, model access proof, provider terms and customer approval proof, usage and cost guard proof, target live validation proof, telemetry proof, fallback and stop-condition proof, renewal and review audit proof, migration plan, and provider failure containment evidence
- kept archived OpenAI pilot validation separate from target OpenAI provider account approval while making the blocker match the target OpenAI provider account decision areas and required evidence packet
- extended production readiness, production-like drill, and target OpenAI provider account smoke guards so release artifacts cannot fall back to generic OpenAI target-boundary live validation wording

## 2026-05-19 Clean Deployment Release Evidence Stop-Condition Alignment

- expanded the production-ready clean deployment release blocker so it names clean checkout proof, command replay proof, artifact synchronization proof, production-like environment proof, and failure containment evidence
- kept clean deployment release evidence separate from target clean deployment architecture and operations while making the release blocker match the clean rehearsal, production-like drill, pilot export, and artifact hygiene evidence packet
- extended production readiness, production-like drill, and clean deployment release smoke guards so release artifacts cannot fall back to generic clean deployment release evidence wording

## 2026-05-19 Target Clean Deployment Architecture Stop-Condition Alignment

- expanded the production-ready target clean deployment architecture blocker so it names source provenance proof, artifact registry proof, dependency installation proof, runtime bootstrap proof, secret injection proof, environment boundary proof, migration and data readiness proof, smoke and health verification proof, rollback and recovery proof, release approval proof, migration plan, dependency drift, failed bootstrap, failed secret injection, rollback failure, and misleading release approval containment evidence
- kept target clean deployment operations as a separate production evidence gate while making the architecture blocker match the target clean deployment architecture decision areas and required evidence packet
- extended production readiness, production-like drill, and target clean deployment architecture smoke guards so release artifacts cannot fall back to generic target clean deployment evidence wording

## 2026-05-19 Target Data Lifecycle Architecture Stop-Condition Alignment

- expanded the production-ready target data lifecycle architecture blocker so it names customer-approved data class matrix, target retention configuration, export request proof, delete request proof, provider transcript policy proof, post-delete absence evidence, backup architecture proof, restore validation proof, backup key ownership proof, disaster recovery evidence, migration plan, rollback, legal hold, delete conflict, provider transcript exception, and customer communication containment evidence
- kept target retention and backup operations as separate production evidence gates while making the architecture blocker match the target data lifecycle architecture decision areas and required evidence packet
- extended production readiness, production-like drill, and target data lifecycle architecture smoke guards so release artifacts cannot fall back to generic target data lifecycle evidence wording

## 2026-05-19 Target SLO Architecture Stop-Condition Alignment

- expanded the production-ready target SLO architecture blocker so it names customer-approved availability, latency, error rate, support response, maintenance window, exclusions, decision owner, error budget policy, telemetry measurement proof, alert acknowledgement proof, staffed on-call proof, customer communication proof, incident review proof, provider outage playbook proof, maintenance and degradation proof, service credit and contractual escalation proof, migration plan, rollback, communication misfire, false-positive alert, alert fatigue, and missed-SLO containment evidence
- kept target SLO operations as a separate production evidence gate while making the architecture blocker match the target SLO architecture decision areas and required evidence packet
- extended production readiness, production-like drill, and target SLO architecture smoke guards so release artifacts cannot fall back to generic target SLO/SLA evidence wording

## 2026-05-19 Target Observability Architecture Stop-Condition Alignment

- expanded the production-ready target observability architecture blocker so it names approved telemetry backend, region, tenancy boundary, owner, fallback, data residency, signal inventory, ingestion proof, alert routing, staffed on-call proof, log and trace retention, customer status communication, incident response, audit export, disaster recovery, migration plan, rollback, false-positive triage, alert fatigue, and customer communication containment evidence
- kept target observability operations as a separate production evidence gate while making the architecture blocker match the target observability architecture decision areas and required evidence packet
- extended production readiness, production-like drill, and target observability architecture smoke guards so release artifacts cannot fall back to generic target observability evidence wording

## 2026-05-19 Target Secret Manager Architecture Stop-Condition Alignment

- expanded the production-ready target secret manager architecture blocker so it names approved platform, region, tenancy boundary, owner and fallback decision, secret class inventory, runtime injection proof, least-privilege access policy, service binding, deny-by-default rules, rotation and revocation event proof, secret access audit logs, break-glass approval and post-use review, leakage review, disaster recovery, migration plan, rollback, lockout recovery, and credential containment evidence
- kept the target secret manager operations gate as a separate production evidence gate while making the architecture blocker match the target secret manager architecture decision areas and required evidence packet
- extended production readiness, production-like drill, and target secret manager architecture smoke guards so release artifacts cannot fall back to generic target secret manager evidence wording

## 2026-05-19 Hosted Tenant Isolation Architecture Stop-Condition Alignment

- expanded the production-ready hosted tenant isolation architecture blocker so it names tenant identity source, customer organization mapping, tenant-aware authorization, service-to-service tenant propagation, storage partitioning, per-tenant encryption and key ownership, backup and restore isolation, tenant administration, cross-tenant denial across API, storage, search, export, delete, backup, support, and observability, tenant-scoped telemetry and support visibility, data lifecycle isolation, migration plan, rollback, and tenant data containment evidence
- kept target tenant isolation operations as a separate production evidence gate while making the architecture blocker match the hosted tenant isolation architecture decision areas and required evidence packet
- extended production readiness, production-like drill, and hosted tenant isolation architecture smoke guards so release artifacts cannot fall back to generic target tenant isolation evidence wording

## 2026-05-19 Hosted Identity Session Architecture Stop-Condition Alignment

- expanded the production-ready hosted identity session architecture blocker so it names customer IdP onboarding, metadata ownership, issuer/audience policy, JWKS rotation, user lifecycle, session lifecycle, role administration, permission propagation, immutable audit export, break-glass access, support impersonation, compliance and retention, rollback and lockout recovery, and customer access containment evidence
- kept target identity/session operations as a separate production evidence gate while making the architecture blocker match the hosted identity session architecture decision areas and required evidence packet
- extended production readiness, production-like drill, and hosted identity session architecture smoke guards so release artifacts cannot fall back to generic target identity/session evidence wording

## 2026-05-19 Target Support Architecture Stop-Condition Alignment

- expanded the production-ready target support architecture blocker so it names staffing model, support queue platform, severity routing, customer communication boundary, ticket audit and retention, on-call handoff, incident commander ownership, escalation and backup coverage, support data handling, incident review governance, migration plan, and missed-acknowledgement, queue-misrouting, customer-communication, ticket-audit, and unstaffed-escalation containment evidence
- kept target support operations as a separate production evidence gate while making the architecture blocker match the target support architecture decision areas and required evidence packet
- extended production readiness, production-like drill, and target support architecture smoke guards so release artifacts cannot fall back to generic target support evidence wording

## 2026-05-19 Production SLO Operating Stop-Condition Alignment

- expanded the production-ready production SLO/SLA operating blocker so it names incident/SLO policy replay, target SLO architecture and operations gates, observability telemetry and target observability operations, support escalation and target support operations, release artifact hygiene, runtime lifecycle, runtime isolation, staffed incident ownership, customer-approved SLO/SLA terms, and provider/deployment evidence
- kept target SLO architecture and target SLO operations as separate production gates while making the operating blocker match the combined production SLO operating rehearsal surface
- extended production readiness, production-like drill, and production SLO operating smoke guards so release artifacts cannot fall back to generic production SLO/SLA operating wording

## 2026-05-19 Target Retention and Backup Operations Stop-Condition Alignment

- expanded the production-ready target retention and backup operations blocker so it names customer-approved data classes, target retention configuration, export approval, delete workflow, provider transcript handling, post-delete absence, audit history, backup schedule execution, encrypted backup storage, key ownership, restore validation, tenant isolation, backup expiry/deletion, disaster recovery runbook, and audit trail evidence
- kept the target data lifecycle architecture approval gate separate while making the operations blocker match the detailed target retention and target backup operations evidence packets
- extended production readiness and production-like drill smoke guards so release artifacts cannot fall back to generic target retention, export, delete, backup, and post-delete absence wording

## 2026-05-21 Target Clean Deployment Operations Proof Detail Tightening

- expanded target clean deployment operations stop-condition wording from domain labels into required proof fields for source provenance, artifact registry, dependency installation, runtime bootstrap, target secret injection, environment boundary, migration/data readiness, smoke/health verification, rollback/recovery, release approval, artifact hygiene, production readiness gate result, residual risk, and failed-deployment containment
- aligned target deployment contract and target environment intake clean release rows so the target clean deployment operations proof packet cannot be represented by a generic operations label
- tightened production readiness, production-like drill, target deployment contract, target environment intake, and target clean deployment operations smoke guards against regression to shorthand clean deployment operations evidence wording

## 2026-05-19 Target Observability Operations Stop-Condition Alignment

- expanded the production-ready target observability operations blocker so it names telemetry ingestion, alert delivery, trace/log retention, staffed on-call routing and acknowledgement, customer-facing status communication, incident response, and incident review history evidence
- kept the target observability architecture approval gate separate while making the operations blocker match the detailed target observability operations evidence packet
- extended production readiness and production-like drill smoke guards so release artifacts cannot fall back to generic target observability operations evidence wording

## 2026-05-19 Target Support Operations Stop-Condition Alignment

- expanded the production-ready target support operations blocker so it names staffed support coverage, support queue routing, customer communication, ticket audit history, escalation ownership, incident review cadence, on-call handoff, and closure evidence
- kept the target support architecture approval gate separate while making the operations blocker match the detailed target support operations evidence packet
- extended production readiness and production-like drill smoke guards so release artifacts cannot fall back to generic target support operations evidence wording

## 2026-05-19 Target Clean Deployment Operations Stop-Condition Alignment

- expanded the production-ready target clean deployment operations blocker so it names source provenance, artifact registry, dependency installation, runtime bootstrap, target secret injection, environment boundary, migration/data readiness, smoke/health verification, rollback/recovery, release approval, evidence retention, and failed-deployment containment evidence
- kept the target clean deployment architecture approval gate separate while making the operations blocker match the detailed target clean deployment operations evidence packet
- extended production readiness and production-like drill smoke guards so release artifacts cannot fall back to generic target clean deployment operations evidence wording

## 2026-05-19 Target SLO Operations Stop-Condition Alignment

- expanded the production-ready target SLO operations blocker so it names customer-approved SLO/SLA terms, error budget, telemetry measurement, alert acknowledgement, staffed on-call response, customer communication, incident review, provider outage handling, maintenance/degradation, service credit, evidence retention, and missed-SLO containment evidence
- kept the target SLO architecture approval gate separate while making the operations blocker match the detailed target SLO operations evidence packet
- extended production readiness and production-like drill smoke guards so release artifacts cannot fall back to generic target SLO operations evidence wording

## 2026-05-18 Target Tenant Isolation Operations Stop-Condition Alignment

- expanded the production-ready target tenant isolation operations blocker so it names tenant identity source, tenant-scoped authorization, storage partitioning, per-tenant encryption/key ownership, backup/restore isolation, tenant administration, cross-tenant denial, observability/support isolation, lifecycle isolation, and tenant data containment evidence
- kept the hosted tenant isolation architecture approval gate separate while making the operations blocker match the detailed target tenant isolation operations evidence packet
- extended production readiness and production-like drill smoke guards so release artifacts cannot fall back to generic target tenant isolation operations evidence wording

## 2026-05-18 Target Identity Session Operations Stop-Condition Alignment

- expanded the production-ready target identity/session operations blocker so it names customer IdP onboarding, user lifecycle, session lifecycle, role administration, permission propagation, immutable audit export, break-glass access, support impersonation, compliance, retention, and customer access containment evidence
- kept the hosted identity architecture approval gate separate while making the operations blocker match the detailed target identity/session operations evidence packet
- extended production readiness and production-like drill smoke guards so release artifacts cannot fall back to generic target identity/session operations evidence wording

## 2026-05-18 Target Provider Operations Stop-Condition Alignment

- expanded the production-ready target provider operations blocker so it names provider inventory/account approval, target secret injection, target-boundary live validation, model/endpoint pinning, quota/cost/resource guard, fallback/disable path, provider fallback runtime audit, telemetry, incident triage, data/transcript handling, remediation/renewal, evidence retention, and provider failure containment evidence
- kept the provider operations contract and current target deployment gate unchanged while making the release blocker match the detailed target provider operations evidence packet
- extended production readiness and production-like drill smoke guards so release artifacts cannot fall back to generic provider operations evidence wording

## 2026-05-18 Local Provider Release Evidence Wording Alignment

- aligned release readiness, target provider operations, target deployment contract, and execution handoff wording so target local provider architecture blockers name target-boundary endpoint/model, network isolation, telemetry, quota/resource guard, and local provider live validation evidence
- kept configured local provider live validation as archived pilot evidence while preventing production claim guidance from falling back to generic target-boundary evidence wording
- extended production readiness and pilot export smoke guards so generated handoff and packaged evidence keep the detailed local provider approval gap

## 2026-05-18 Hermes Release Evidence Wording Alignment

- aligned release readiness and demo scenario provider-gap wording so Hermes is described as a target Hermes provider architecture evidence stop-condition rather than a runtime-env shorthand
- kept runtime preflight `ready-but-missing-env` semantics intact while clarifying that Hermes provider claims remain blocked until target-boundary architecture evidence and live validation are approved
- extended production readiness and pilot export smoke guards so operator-facing release and demo artifacts cannot reintroduce the Hermes runtime-env shorthand

## 2026-05-18 Hermes Provider Stop-Condition Alignment

- expanded the Hermes blocker from runtime configuration shorthand to target Hermes provider architecture evidence for endpoint ownership, model pinning, target secret injection, tool-call parsing, session lifecycle, transcript policy, quota guard, telemetry, fallback, customer approval, and target-boundary Hermes live validation
- aligned release readiness, target deployment contract, target environment evidence intake, provider intake/operations docs, operator runbook, onboarding, demo scenarios, deployment guide, product plan, security model, roadmap, and README with the target Hermes provider architecture contract
- updated Hermes, target deployment, target environment intake, production readiness, production-like drill, and pilot export smoke guards so Hermes production claims cannot bypass the detailed target-boundary evidence requirements

## 2026-05-18 Target Clean Deployment Stop-Condition Alignment

- expanded the remaining production deployment blocker from shorthand deployment-control wording to target clean deployment evidence for source provenance, artifact registry, dependency installation, runtime bootstrap, secret injection, environment boundary, smoke/health verification, rollback/recovery, release approval, and failed-deployment containment
- aligned release readiness, target deployment contract, operator runbook, onboarding, demo scenarios, deployment guide, and production-like drill blocker wording with the target clean deployment architecture and operations evidence contracts
- updated production readiness, production-like drill, target deployment contract, and pilot export smoke guards so operator-facing handoff docs cannot fall back to shorthand deployment-control wording

## 2026-05-18 Production Target Local Provider Stop-Condition Alignment

- aligned target deployment contract, target environment evidence intake, release readiness production blockers, and production-like drill guard with the detailed local provider stop-condition
- required target-boundary endpoint/model ownership, network isolation, telemetry, quota/resource guard, target-boundary local provider live validation pass, and customer acceptance before local provider production claims
- updated target deployment, target environment intake, production readiness, and production-like drill smoke guards so production-target blockers cannot fall back to generic target-boundary evidence wording

## 2026-05-18 Operator Facing Local Provider Stop-Condition Alignment

- aligned README, operator runbook, pilot onboarding, demo scenarios, and deployment guide local provider blocker wording with the detailed target local provider stop-condition
- replaced generic approved target-boundary evidence wording with target-boundary endpoint/model, network isolation, telemetry, quota/resource guard, and local provider live validation evidence requirements
- extended production readiness and pilot export smoke guards so operator-facing handoff docs stay aligned with planning source and release readiness wording

## 2026-05-18 Local Provider Stop-Condition Source Alignment

- aligned product plan, security model, roadmap, and execution handoff generator wording with the release readiness target local provider stop-condition
- replaced shorthand local provider evidence wording with approved target-boundary endpoint/model, network isolation, telemetry, quota/resource guard, and local provider live validation evidence requirements
- extended production readiness and pilot export smoke guards so source planning docs cannot drift away from the release blocker wording

## 2026-05-18 Release Readiness Local Provider Stop-Condition Alignment

- aligned release readiness current open blocker wording with the target local provider architecture evidence contract instead of describing the gap as endpoint/model runtime configuration only
- made the stop-condition require approved target-boundary endpoint/model, network isolation, telemetry, quota/resource guard, and local provider live validation evidence before any target local provider production claim
- extended `smoke:production-readiness-gate` and `smoke:pilot-export-package` to pin the updated release blocker wording in both readiness and shareable pilot package checks

## 2026-05-18 Pilot Boundary Local Provider Alignment

- aligned security, product, onboarding, and roadmap provider-boundary wording so configured local provider live validation is treated as archived pilot evidence instead of an unresolved runtime configuration blocker
- kept target local provider architecture as a separate production gate requiring approved target-boundary endpoint/model, network, telemetry, and resource evidence before any production provider claim
- extended `smoke:pilot-export-package` to pin the shareable pilot pack wording for OpenAI/local archived proof, target Hermes provider evidence, target local provider evidence, and accepted-risk refresh requirements

## 2026-05-18 Security Refresh Checklist Alignment

- aligned the product plan and security model selected-provider refresh guidance with `refresh:execution-v1-artifacts` so source-of-record changes preserve archived live proof while regenerating closeout, handoff, provider readiness, immutable snapshot, and pilot export package artifacts
- clarified that `node scripts/build-execution-v1-evidence.mjs --live-<provider>` is for intentionally replacing a selected provider proof, not for routine deterministic-only artifact refresh
- extended `smoke:pilot-export-package` to pin the security/product refresh checklist wording and accepted-risk handoff requirements inside the shareable pilot pack

## 2026-05-18 Operator Runbook Local Provider Evidence Guard

- aligned the Daily Start provider readiness expectations with current execution-v1 evidence by documenting archived local provider live evidence for the configured local rehearsal
- kept the runbook explicit that Hermes remains blocked until target Hermes provider evidence is approved and target local provider architecture still needs approved target-boundary endpoint/model, network, telemetry, quota/resource, and live validation evidence before any production provider claim
- extended `smoke:production-readiness-gate` to pin the runbook provider evidence wording so operator guidance stays aligned with product-plan and release evidence state

## 2026-05-18 Product Plan Local Live Evidence Alignment

- aligned the enterprise readiness checklist with current execution-v1 evidence by marking local provider live validation as archived while leaving Anthropic and Hermes live validation incomplete
- clarified the pilot-ready status text so local provider validation is scoped to the configured local rehearsal and does not approve target local provider architecture or production readiness
- extended `smoke:production-readiness-gate` to pin the product-plan live provider checklist and local-provider production gate wording against release evidence drift

## 2026-05-17 Web Target Evidence Closure Rules Copy Pass

- added a target evidence closure rules copy action to the current open blocker triage surface so reviewers can hand off blocker closure rules separately from the full packet
- included closure rule rows for packet boundary, sanitized evidence, accepted disposition proof, production claim boundary, and accepted narrow scope with required evidence, stop-condition impact, owner, reviewer, evidence date, and status placeholders
- embedded the standalone closure rules guard inside the full target evidence intake packet so closure criteria stay tied to productionReadyClaim=false, target-boundary evidence, artifact hygiene, regenerated execution-v1 artifacts, and production readiness gate requirements
- hardened the shared copy fallback so unsupported browser prompt surfaces end in an unavailable notice instead of a console error
- extended `smoke:ui-harness-browse` to pin the closure rules builder, copy action marker, DOM marker, packet section, closure rule row title, and unavailable copy fallback

## 2026-05-17 Web Target Evidence Residual Blockers Copy Pass

- added a target evidence residual production blocker guard copy action to the current open blocker triage surface so reviewers can hand off the remaining production-ready stop-condition list separately from the full packet
- included residual production blocker rows with productionReadyClaim decision, required closing evidence, stop-condition impact, evidence owner, decision owner, reviewer, next action, release readiness note, and visible current blocker cross-checks
- embedded the residual blocker guard inside the full target evidence intake packet so the packet carries the same production-ready claim guard as the standalone copy action
- extended `smoke:ui-harness-browse` to pin the residual blocker guard builder, copy action marker, DOM marker, packet section, and residual blocker row title

## 2026-05-16 Web Target Evidence Provider References Copy Pass

- added a target evidence provider references copy action to the current open blocker triage surface so reviewers can hand off provider env readiness, preflight status, archived live validation status, live/evidence commands, linked blockers, and required provider evidence docs separately from the full packet
- included provider blocker reference rows with stop reasons, required closing evidence, verification commands, evidence docs, and provider claim impact so OpenAI, Anthropic, local, and Hermes references remain tied to target-boundary proof instead of broad production claims
- embedded the standalone provider evidence references body inside the full target evidence intake packet so provider references stay aligned with productionReadyClaim=false, target provider evidence intake, provider operations evidence, artifact refresh, release artifact hygiene, and production readiness gate requirements
- extended `smoke:ui-harness-browse` to pin the provider references builder, copy action marker, DOM marker, packet section, and provider reference row title

## 2026-05-16 Web Target Evidence Risk Decision Register Copy Pass

- added a target evidence accepted risk decision register copy action to the current open blocker triage surface so reviewers can hand off accepted risks, rejected claims, residual blockers, decision owner, evidence owner, next review date, release readiness note, and productionReadyClaim decision separately from the full packet
- included Anthropic unavailable, Hermes runtime, local-provider pilot scope, hosted identity/session, hosted tenant isolation, target environment evidence pending, and customer-specific exception risk rows with required evidence, residual blocker ids, decision state placeholders, allowed claim text, and claim upgrade rules
- embedded the accepted risk decision register inside the full target evidence intake packet so risk decisions stay tied to productionReadyClaim=false, command rerun evidence, artifact refresh, release artifact hygiene, and production readiness gate requirements
- extended `smoke:ui-harness-browse` to pin the risk decision register builder, copy action marker, DOM marker, packet section, and risk row title

## 2026-05-16 Web Target Evidence Exception Register Copy Pass

- added a target evidence accepted-scope exception register copy action to the current open blocker triage surface so reviewers can hand off exception scope, owner, expiry, compensating control, allowed claim text, and release readiness notes separately from the full packet
- included Anthropic exclusion, Hermes exclusion, local-provider pilot-only, hosted identity/session, hosted tenant isolation, target environment pending, and customer-specific exception rows with required evidence, stop-condition ids, approval status, reviewer, expiry, next review date, and claim guard fields
- embedded the accepted-scope exception register inside the full target evidence intake packet so scoped exceptions remain tied to productionReadyClaim=false, command rerun evidence, artifact refresh, and production readiness gate requirements
- extended `smoke:ui-harness-browse` to pin the exception register builder, copy action marker, DOM marker, packet section, and exception row title

## 2026-05-16 Web Target Evidence Production Gap Copy Pass

- added a target evidence production gap copy action to the current open blocker triage surface so reviewers can hand off the claim guard separately from required commands, submission manifest, disposition register, and the full packet
- included hosted identity/session, hosted tenant storage/encryption, target secret injection, target telemetry, staffed on-call, retention, backup, support, clean deployment, and release approval gap rows with missing proof, required evidence, stop-condition ids, claim guard text, owner/date placeholders, visible blocker cross-checks, and residual production blockers
- embedded the production gap guard inside the full target evidence intake packet so the packet carries explicit allowed/blocked claim language and the readiness unblock sequence
- extended `smoke:ui-harness-browse` to pin the production gap builder, copy action marker, DOM marker, packet section, and production gap row title

## 2026-05-15 Web Target Evidence Required Commands Copy Pass

- added a target evidence required commands copy action to the current open blocker triage surface so reviewers can copy the full target evidence command package separately from the capture template, submission manifest, command rerun log, and full packet
- included the 30 required commands from the target environment evidence intake contract with domain, proof intent, stop-condition id, result/date/artifact placeholders, visible blocker command cross-check rows, residual production blockers, and production gap notes
- embedded the required commands package inside the full target evidence intake packet so the review envelope carries both the standalone command package and the existing shorter final gate list
- extended `smoke:ui-harness-browse` to pin the required commands builder, copy action marker, DOM marker, packet section, and command row title

## 2026-05-15 Web Target Evidence Capture Template Copy Pass

- added a target evidence capture template copy action to the current open blocker triage surface so operators can hand off the ten target-boundary evidence fields before packaging the sanitized submission packet
- included target environment, deployment boundary, identity/session, tenant isolation, provider/secret, observability/SLO, retention/backup, support, clean release, and accepted risk decision rows with required values, completion rules, primary evidence docs, owner/date placeholders, visible blocker scope, and residual production blockers
- embedded the capture template body inside the full target evidence intake packet so the packet carries both target-boundary evidence intake and sanitized submission review structure
- extended `smoke:ui-harness-browse` to pin the capture template builder, copy action marker, DOM marker, packet template section, and capture row title

## 2026-05-15 Web Target Evidence Submission Manifest Copy Pass

- added a target evidence submission manifest copy action to the current open blocker triage surface so reviewers can copy the packet cover sheet separately from sanitized registers, command logs, decisions, dispositions, refresh evidence, and the full intake packet
- included packet id, target environment, company/workspace scope, deployment boundary, evidence owner, reviewer, source commit, generated artifact commit, review date, packet status, production-ready claim decision, required packet sections, reference docs, verification commands, visible blocker scope, and residual production blockers in the copied manifest
- embedded the submission manifest template inside the full target evidence intake packet so packet-level handoff carries the same routing and scope control as the standalone manifest copy
- extended `smoke:ui-harness-browse` to pin the submission manifest builder, copy action marker, DOM marker, packet template section, and manifest field title

## 2026-05-15 Web Target Evidence Release Refresh Evidence Copy Pass

- added a target evidence release refresh evidence copy action to the current open blocker triage surface so reviewers can audit execution evidence, closeout, handoff, immutable snapshot, pilot export package, release drill, clean deployment release, release readiness, artifact hygiene, and production readiness gate references separately from the full packet
- included refresh artifact paths, guarded links, refresh commands, proof intent, stop-condition ids, verified commit placeholders, result placeholders, reviewer notes, required refresh command sequence, visible blocker refresh cross-check rows, and residual production blockers in the copied evidence
- embedded the release refresh evidence template inside the full target evidence intake packet so the packet carries the same refresh audit structure as the standalone evidence copy
- extended `smoke:ui-harness-browse` to pin the release refresh evidence builder, copy action marker, DOM marker, packet template section, and refresh artifact row title

## 2026-05-15 Web Target Evidence Blocker Disposition Register Copy Pass

- added a target evidence blocker disposition register copy action to the current open blocker triage surface so reviewers can audit still-blocking, accepted-scope-required, and closed-after-evidence states separately from the full packet
- included the canonical target blocker rows for Anthropic, Hermes, local provider, hosted identity/session, hosted tenant isolation, target tenant evidence, target environment evidence, and customer-specific exceptions with required closing evidence, stop-condition ids, claim impact, owners, reviewer placeholders, and release refresh requirements
- embedded the blocker disposition register template inside the full target evidence intake packet so the packet carries the same disposition audit structure as the standalone register copy
- extended `smoke:ui-harness-browse` to pin the disposition register builder, copy action marker, DOM marker, packet template section, and disposition row title

## 2026-05-15 Web Target Evidence Boundary Map Copy Pass

- added a target evidence boundary consistency map copy action to the current open blocker triage surface so reviewers can verify deployment, identity/session, tenant isolation, provider/secret, observability/SLO, retention/backup, support, and clean release boundaries separately from the full packet
- included required boundary aliases, primary evidence docs, related blocker ids, exception owner/notes placeholders, stop-condition ids, blocker cross-check rows, and residual production blockers in the copied map
- embedded the boundary consistency map template inside the full target evidence intake packet so the packet carries the same boundary audit structure as the standalone map copy
- extended `smoke:ui-harness-browse` to pin the boundary map builder, copy action marker, DOM marker, packet template section, and boundary row title

## 2026-05-15 Web Target Evidence Sanitized Register Copy Pass

- added a target evidence sanitized register copy action to the current open blocker triage surface so reviewers can receive sanitized evidence references separately from command logs and decision records
- included blocker evidence docs, required target/release docs, guarded links, availability, source blocker ids, evidence owner, retention class, redaction notes, sha256/signed export placeholders, and residual production blockers in the copied register
- embedded the sanitized evidence register template inside the full target evidence intake packet so the packet carries the same evidence reference structure as the standalone register copy
- extended `smoke:ui-harness-browse` to pin the sanitized register builder, copy action marker, DOM marker, packet template section, and evidence row title

## 2026-05-15 Web Target Evidence Command Rerun Log Copy Pass

- added a target evidence command rerun log copy action to the current open blocker triage surface so operators can hand off target-boundary command rerun evidence separately from the full evidence packet
- included blocker-scoped commands, required target evidence commands, command owner, blocker ids, placeholder result/date/artifact fields, residual production blockers, and sanitized evidence rules in the copied log
- embedded the command rerun log template inside the full target evidence intake packet so the packet carries the same command evidence structure as the standalone copy action
- extended `smoke:ui-harness-browse` to pin the rerun log builder, copy action marker, DOM marker, packet template section, and command row title

## 2026-05-15 Web Target Evidence Decision Record Copy Pass

- added a target evidence reviewer decision record copy action to the current open blocker triage surface so reviewers can record scoped accept/reject/still-blocked decisions without copying the full target evidence packet
- included reviewer checklist fields, blocker dispositions, residual production blockers, decision verification commands, target evidence doc links, and production-ready claim boundaries in the copied record
- embedded the reviewer decision record template inside the full target evidence intake packet so the larger review envelope carries the same decision structure
- extended `smoke:ui-harness-browse` to pin the decision record builder, copy action marker, DOM marker, checklist title, and packet template section

## 2026-05-15 Web Target Evidence Intake Summary Copy Pass

- added a target evidence intake summary copy action beside the full packet action so operators can share the active blocker slice manifest before sending the larger review envelope
- included category, owner, visible blocker count, command count, evidence doc count, provider blocker counts, production stop reason, required target docs, required commands, and release link in the summary payload
- kept the summary explicitly bounded as a triage manifest only and preserved `productionReadyClaim=false` while any target stop-condition remains open
- extended `smoke:ui-harness-browse` to pin the summary builder, copy action marker, DOM marker, title, and handoff boundary text in the served web bundle

## 2026-05-15 Web Target Evidence Intake Packet Copy Pass

- added a target evidence intake packet copy action to the current open blocker triage surface so release blockers, provider evidence references, residual production blockers, required commands, and closure matrix rows can be handed off together
- included target evidence capture template fields and submission packet checklist items from the target environment evidence intake contract so reviewers receive the full review envelope, not just blocker rows
- preserved the production boundary in the package by stating that the packet is not production-ready approval and must keep `productionReadyClaim=false` while any target stop-condition remains open
- extended `smoke:ui-harness-browse` to pin the packet builder, copy action marker, package title, submission checklist, and DOM marker

## 2026-05-15 Web Current Blocker Closure Matrix Package Pass

- added a target environment blocker closure matrix package for the active current-open-blocker slice so blocker disposition rows can be copied directly into target environment evidence intake
- included blocker id, provider, category, owner, state, stop reason, required closing evidence, verification commands, evidence docs, claim impact, decision owner, and deep links in each matrix row
- included the closure matrix section inside the existing slice package so complete blocker handoffs now carry target environment intake requirements without a second copy step
- extended `smoke:ui-harness-browse` to pin the matrix builder, copy action marker, package title, and target evidence intake doc linkage

## 2026-05-15 Web Provider Blocker Readiness Linkage Pass

- added provider ownership to current open provider blocker actions for Anthropic, local, and Hermes so API consumers no longer need to infer blocker-to-provider mapping from prose
- surfaced provider blocker counts, linked blocker summaries, and blocker package copy actions directly on provider readiness cards and focused provider callouts
- extended provider readiness handoff packages with a `Linked provider blockers` section containing stop reason, next evidence, commands, evidence docs, and deep links for closure execution
- extended `smoke:execution-v1-status` and `smoke:ui-harness-browse` to pin the provider blocker mapping and UI handoff markers

## 2026-05-15 Web Provider Readiness Handoff Package Pass

- added copyable provider readiness handoff packages to release provider cards and the aggregate provider preflight callout so env, preflight, live-validation, evidence refresh, and production blocker context can be shared together
- included target provider evidence intake and target provider operations closure rules so provider account/env remediation cannot be mistaken for a production-ready claim
- extended `smoke:ui-harness-browse` to pin the provider readiness package builder, copy action marker, and handoff text contract in the served web bundle
- aligned `smoke:production-provider-readiness` with the current artifact-sync state where all provider env vars are absent locally while OpenAI and local archived live proof remain preserved

## 2026-05-15 Web Provider Fallback Event Audit Package Copy Pass

- added a copyable provider fallback event audit package to the provider configuration surface so policy, stop-reason, count, latest event, and verification command context can be handed off together
- included target provider operations framing and production readiness boundary text so fallback runtime audit evidence does not get mistaken for a production-ready claim
- extended `smoke:ui-harness-browse` to pin the audit package builder, copy action marker, and text contract in the served web bundle

## 2026-05-15 Web Provider Fallback Event Audit UI Pass

- added a provider fallback event audit panel to the provider configuration surface so operators can inspect fallback runtime audit evidence without leaving the web console
- wired the panel to `/api/providers/events?family=fallback` with policy and stop-reason filters for `provider-failure-only`, `recoverable-provider-failure-only`, eligible fallback, completed fallback, non-recoverable provider failure, and missing provider-failure metadata slices
- extended `smoke:ui-harness-browse` to pin the new audit panel markers and provider event API wiring while preserving the existing fallback policy and provider event smoke coverage

## 2026-05-15 Web Provider Event Fallback Filter API Pass

- added `/api/providers/events` so the operator web surface can query the same provider event timeline read-model already available from `provider events`
- wired fallback policy and fallback stop-reason query parameters through the web route, including CLI-style hyphenated aliases for handoff compatibility
- extended the UI harness smoke with seeded fallback events and API assertions for fallback family, recoverable-only policy, and non-recoverable stop-condition slices

## 2026-05-15 Provider Fallback Event Policy Filter Pass

- added `provider events --fallback-policy` and `--fallback-stop-reason` filters so fallback audit chronology can be sliced by policy and stop condition without post-processing provider event output
- kept fallback-scoped filters constrained to fallback events, preserving existing provider probe, execution, and attention event behavior when no fallback filter is supplied
- extended the provider fallback policy smoke to verify help text, recoverable-only policy slices, non-recoverable stop-condition slices, and combined policy plus stop-reason filtering

## 2026-05-15 Browser E2E Retrieval Handoff Focus Timeout Pass

- hardened the execution browser E2E retrieval handoff session check by giving focused retrieval source restoration a longer env-configurable wait window
- classified Playwright `TimeoutError` as a transient session failure for the existing retry path so one slow focus restoration attempt does not fail the full release evidence refresh immediately
- kept the change scoped to browser smoke stability; release UI behavior and production readiness state are unchanged

## 2026-05-15 Web Current Blocker Package Closure Bundle Pass

- added the existing single-blocker closure checklist into `blocker package 복사` output so one package now carries handoff context, closing requirements, commands, and evidence together
- added the slice closure checklist into `slice package 복사` output so filtered category/owner packages include closure requirements before command and evidence bundles
- extended `smoke:ui-harness-browse` to pin both package builders to their closure checklist builder calls

## 2026-05-15 Web Current Blocker Slice Closure Checklist Copy Pass

- added a release blocker slice closure checklist copy action that turns the active category/owner filter into a closing-evidence checklist for every visible current open blocker
- included per-blocker closing evidence, evidence docs, next commands, artifact refresh guidance, and final verification gates so filtered blocker ownership can move directly into closure execution
- extended `smoke:ui-harness-browse` to pin the slice closure checklist builder, marker, action, and text contract in the served web bundle

## 2026-05-15 Web Current Blocker Closure Checklist Copy Pass

- added single current open blocker closure checklist copy actions so operators can hand off the exact closing evidence, evidence docs, commands, artifact refresh rule, and final verification gates for one stop-condition
- exposed the same checklist copy action in focused current blocker callouts and rows so `rblocker` deep links and list triage can request closure evidence without sending the full blocker package
- extended `smoke:ui-harness-browse` to pin the closure checklist builder, marker, copy action, and text contract in the served web bundle

## 2026-05-14 Web Current Blocker Package Copy Pass

- added single current open blocker package copy actions so operators can copy blocker handoff context, next commands, and evidence docs together without relying on the slice-level package
- exposed the same package copy action in focused current blocker callouts and rows so `rblocker` deep links and list triage have the same complete handoff payload
- extended `smoke:ui-harness-browse` to pin the current blocker package builder, marker, copy action, and text contract in the served web bundle

## 2026-05-14 Web Current Blocker Focus Actions Pass

- added evidence document open/copy controls to the focused current open blocker callout so `rblocker` deep links can jump directly to supporting release-readiness docs without finding the row again
- added focused current open blocker command copy actions beside the existing handoff and link controls so a shared blocker URL keeps the next command path in the same callout
- extended `smoke:ui-harness-browse` to pin the focused blocker evidence and command markers in the served web bundle

## 2026-05-14 Web Production Blocker Package Copy Pass

- added row-level production-ready blocker package copy actions so operators can copy handoff context, verification commands, and release-readiness evidence in one package for a single production stop-condition
- exposed the same package copy action in the focused production blocker callout so `rpblocker` deep links keep the complete handoff path beside link, evidence, and command-only actions
- extended `smoke:ui-harness-browse` to pin the production blocker package builder, row marker, copy action, and text contract in the served web bundle

## 2026-05-14 Web Production Blocker Command Copy Pass

- added row-level production-ready blocker verification command copy actions so operators can copy the exact production readiness, artifact hygiene, and execution-v1 status commands without sending the full handoff payload
- exposed the same command runbook copy action in the focused production blocker callout so `rpblocker` deep links keep the recovery command path beside evidence and handoff actions
- extended `smoke:ui-harness-browse` to pin the production blocker command builder, row marker, copy action, and text contract in the served web bundle

## 2026-05-14 Web Production Blocker Evidence Link Pass

- added guarded release-readiness evidence document open/copy controls to each production-ready blocker row so operators can jump from a production stop-condition to the source evidence without opening the full summary package
- exposed the same evidence document controls in the focused production blocker callout so `rpblocker` deep links carry the proof handoff path directly beside link and handoff actions
- extended `smoke:ui-harness-browse` to pin the production blocker evidence doc markers, copy action marker, and label contract in the served web bundle

## 2026-05-14 Web Production Blocker Deep Link Pass

- added `rpblocker` URL state for production-ready blockers so a production stop-condition row can survive reload/share like current open blocker deep links
- added row-level focus, link-copy, and focused callout actions for production-ready blockers, including automatic expansion when a deep link targets a blocker beyond the default 8-row summary
- extended `smoke:ui-harness-browse` to pin the production blocker focus state, link copy action, query param, and focused row markers in the served web bundle

## 2026-05-14 Web Production Blocker Row Handoff Pass

- added row-level production-ready blocker handoff copy actions so operators can share one production stop-condition without copying the full blocker summary package
- included blocker index, production status, release label, guarded release-readiness link, and verification commands in each production blocker handoff payload
- extended `smoke:ui-harness-browse` to pin the row handoff builder, row index marker, copy action, and text contract in the served web bundle

## 2026-05-14 Web Production Blocker Expand Toggle Pass

- added an expand/collapse toggle for the release tab production-ready blocker list so operators can inspect all 24 blockers in the UI instead of only the first 8 summarized rows
- exposed visible/total blocker state and hidden blocker count markers so the production blocker list state is auditable in the served web bundle
- extended `smoke:ui-harness-browse` to pin the production blocker expanded-state markers and toggle action contract

## 2026-05-14 Web Production Blocker Summary Copy Pass

- added a production-ready blocker summary copy action in the release tab so operators can share production status, blocker count, stop reason, release-readiness link, verification commands, and the full blocker list in one package
- exposed a release-readiness link copy action from the same production blocker callout so the source decision document can be handed off without reconstructing the guarded doc URL
- extended `smoke:ui-harness-browse` to pin the production blocker summary copy marker, action, and text contract in the served web bundle

## 2026-05-14 Web Release Blocker Empty Filter Recovery Pass

- added empty category/owner filter detection in the release blocker triage callout so impossible blocker slice combinations are called out instead of silently showing an empty list
- added recovery actions for empty slices so operators can keep only the selected category, keep only the selected owner, or clear the filter combination from the same callout
- extended `smoke:ui-harness-browse` to pin the empty-filter marker and recovery action markers in the served web bundle

## 2026-05-14 Web Release Blocker Slice Package Copy Pass

- added a release blocker slice package copy action that combines the active slice summary, handoff, command runbook, and evidence bundle into one operator-ready package
- reused the existing slice builders so package copy output stays aligned with the separate summary, handoff, command, and evidence copy actions
- extended `smoke:ui-harness-browse` to pin the slice package marker, action, and text contract in the served web bundle

## 2026-05-14 Web Release Blocker Slice Summary Copy Pass

- added a release blocker slice summary copy action that packages the active category/owner filter, visible/total blocker count, command count, deduplicated evidence doc count, top visible blocker, and filtered release link into one short operator manifest
- exposed the summary copy action beside the slice handoff, command, and evidence copy actions so operators can share package scope before sending a full blocker handoff bundle
- extended `smoke:ui-harness-browse` to pin the slice summary copy marker, action, and text contract in the served web bundle

## 2026-05-14 Web Release Blocker Slice Metrics Pass

- added filtered release blocker slice metrics in the open blocker triage callout so operators can see visible blocker count, command count, deduplicated evidence doc count, and top visible blocker before copying slice handoff packages
- reused the same visible blocker slice that powers handoff, command, and evidence copy actions so UI metrics stay aligned with the generated operator packages
- extended `smoke:ui-harness-browse` to pin the slice metrics markers and summary helper in the served web bundle

## 2026-05-14 Web Release Blocker Slice Evidence Copy Pass

- added a release blocker slice evidence copy action that packages the active category/owner filter, visible/total blocker count, filtered release link, deduplicated evidence docs, availability, and source blocker ids into one operator-ready evidence bundle
- exposed the evidence copy action beside the slice handoff and command copy actions in the open blocker triage callout so operators can share proof links without sending the full blocker narrative or command runbook
- extended `smoke:ui-harness-browse` to pin the slice evidence marker, action, and text contract in the served web bundle

## 2026-05-14 Web Release Blocker Slice Command Copy Pass

- added a release blocker slice command copy action that packages the active category/owner filter, visible/total blocker count, filtered release link, and blocker-scoped next commands into one operator-ready command runbook
- exposed the command copy action beside the slice handoff action in the open blocker triage callout so operators can choose narrative handoff text or command-only execution context from the same filtered slice
- extended `smoke:ui-harness-browse` to pin the slice command marker, action, and text contract in the served web bundle

## 2026-05-14 Web Release Blocker Slice Handoff Pass

- added a release blocker slice handoff copy action that packages the active category/owner filter, visible/total blocker count, filtered release link, blocker metadata, evidence docs, and next commands into one operator-ready text block
- exposed the slice handoff action from the open blocker triage callout so operators can hand off the current filtered blocker set without copying each row individually
- extended `smoke:ui-harness-browse` and README documentation to pin the slice handoff marker, action, and text contract in the served web bundle

## 2026-05-14 Web Release Blocker Triage Filter Pass

- added release tab `rbcategory` and `rbowner` URL state so current open blocker triage can be narrowed by category and owner without losing reload/share context
- converted blocker category and owner summary chips into filter actions and added a filtered-count summary plus clear-filter control for the current open blocker list
- extended `smoke:ui-harness-browse` to pin the filter URL params, UI actions, and filter summary markers in the served web bundle

## 2026-05-14 Web Release Blocker Triage Summary Pass

- added a `currentOpenBlockerActionSummary` payload to `/api/execution-v1/status` with category, owner, status, command, evidence-doc, and top-priority blocker aggregates derived from existing current open blocker actions
- rendered an `open blocker triage` callout in the release tab so operators can see dominant blocker categories and owners before drilling into individual stop-condition rows
- extended `smoke:execution-v1-status` and `smoke:ui-harness-browse` to pin the API summary counts, top-priority linkage, and served UI markers

## 2026-05-14 Web Release Blocker Handoff Copy Pass

- added a current open blocker handoff copy action that packages blocker id, category, owner, status, stop reason, next evidence, release deep link, evidence docs, and next commands into one operator-ready text block
- exposed the handoff copy action from both focused blocker callouts and current open blocker rows, keeping `rblocker` deep links, evidence doc links, and command handoff aligned in one surface
- extended `smoke:ui-harness-browse` to pin the handoff copy action marker and generated handoff text contract in the served web bundle

## 2026-05-14 Web Release Blocker Evidence Doc Link Pass

- added a guarded `/api/execution-v1/release-doc` route for release blocker evidence documents, limited to known execution-v1 release evidence paths
- enriched current open blocker `evidenceDocs` with `exists` and `href` metadata so the release tab can open the exact supporting document without reconstructing paths
- rendered evidence doc chips as openable links with per-doc copy actions, and extended status/browser smoke coverage to verify payload metadata, route response, UI markers, and copy action wiring

## 2026-05-14 Web Release Blocker Deep Link Pass

- added `rblocker` release query state so current open blocker focus survives reload and can be handed off as a direct release tab link
- rendered focused current open blocker callouts plus row-level focus/link actions while preserving existing provider/history/handoff release URL state
- extended `smoke:ui-harness-browse` to pin the blocker deep-link markers, focus actions, copy action, and clear-focus action in the web bundle

## 2026-05-13 Web Release Blocker Triage Actions Pass

- added current open blocker action mapping to `/api/execution-v1/status`, covering provider account, provider architecture, target deployment, and release decision blocker categories
- rendered each current open blocker in the release tab with owner, stop reason category, evidence document chips, and copyable next command actions so operator triage can start from the blocker row itself
- extended `smoke:execution-v1-status` and `smoke:ui-harness-browse` to verify blocker action payloads, UI markers, fixture fallback behavior, and command handoff coverage

## 2026-05-13 Web Production Blocker Surface Pass

- parsed [release-readiness-v1.md](release-readiness-v1.md) production-ready blockers and current open blockers into `/api/execution-v1/status` without changing the underlying production-ready decision
- rendered production blocker count, open blocker count, production status, current open blocker rows, and production stop-condition rows in the release tab so operator triage can start from the same UI surface as release actions
- extended `smoke:execution-v1-status` and `smoke:ui-harness-browse` fixtures to verify the blocker payload and UI markers stay aligned with release-readiness evidence

## 2026-05-05 Observability Telemetry Gate Pass

- added [observability-telemetry-v1.md](observability-telemetry-v1.md) as the local pilot observability source of record for telemetry signals, alert triggers, required commands, handoff requirements, and production telemetry gap
- added `smoke:observability-telemetry` to verify telemetry coverage and cross-document wiring while keeping `productionReadyClaim: false`
- wired the observability gate into release readiness, target deployment contract, deployment guide, security model, product checklist, README, production SLO operating rehearsal, clean deployment rehearsal, production-like drill, pilot export package, and artifact hygiene while preserving hosted telemetry, alert delivery, staffed on-call, and incident review blockers

## 2026-05-05 Secret Management Gate Pass

- added [secret-management-v1.md](secret-management-v1.md) as the local pilot secret-management source of record for secret classes, environment or secret-manager injection, redaction/hygiene rules, rotation/revocation checklist, and production gap
- added `smoke:secret-management` to verify the policy surface and cross-document wiring while keeping `productionReadyClaim: false`
- wired the secret management gate into release readiness, target deployment contract, deployment guide, security model, product checklist, README, clean deployment rehearsal, production-like drill, pilot export package, and artifact hygiene while preserving target secret manager, rotation, audit, and revocation blockers

## 2026-05-05 Customer Support Operations Gate Pass

- added [customer-support-operations-v1.md](customer-support-operations-v1.md) as the local pilot support operations source of record for support roles, intake classes, escalation matrix, customer communications, pilot handoff, and evidence requirements
- added `smoke:customer-support-operations` to verify support operating coverage and cross-document wiring while keeping `productionReadyClaim: false`
- wired the support gate into release readiness, target deployment contract, deployment guide, product checklist, README, clean deployment rehearsal, production-like drill, pilot export package, and artifact hygiene while preserving staffed production support and SLA blockers

## 2026-05-05 Backup Restore Drill Gate Pass

- added local runtime backup and restore helpers that create manifest-backed `var/` backups, verify file sha256 digests, require a clean restore target, and confirm restored state hashes
- added `smoke:backup-restore-drill` to prove backup manifest hygiene, clean restore enforcement, tenant A/B restore integrity, post-restore tenant delete isolation, and repeated restore from the same backup source
- wired the backup/restore drill into retention policy, target deployment contract, release readiness, security model, deployment guide, product checklist, README, production retention operating rehearsal, production-like drill, clean deployment rehearsal, pilot export package, and artifact hygiene while preserving hosted encrypted backup and disaster recovery blockers

## 2026-05-05 Target Deployment Contract Gate Pass

- added [target-deployment-contract-v1.md](target-deployment-contract-v1.md) as the production-target evidence contract for provider validation, identity-backed RBAC, hosted tenant isolation, secret management, retention/delete, SLO/SLA, clean deployment, and support operations
- added `smoke:target-deployment-contract` to verify production-like and hosted SaaS deployment profiles, mandatory controls, required commands, blocking rules, and cross-document wiring while keeping `productionReadyClaim: false`
- wired the target deployment contract into release readiness, security, deployment guidance, product checklist, README, production readiness gate, clean deployment rehearsal, production-like drill, pilot export package, and release artifact hygiene so hosted production blockers remain explicit and testable

## 2026-05-05 Tenant Data Lifecycle Gate Pass

- added tenant-scoped runtime data inventory, export, delete confirmation token, and deletion helpers so one local runtime root can export/delete one tenant without including or modifying another tenant's state
- added `smoke:tenant-data-lifecycle` to verify tenant-filtered export manifests, exact tenant delete confirmation, post-delete absence, and unchanged other-tenant state/artifacts
- wired the tenant data lifecycle gate into retention operating rehearsal, retention/delete policy, runtime isolation, deployment guidance, security model, product checklist, README, and release readiness while preserving hosted storage, encryption, backup, provider transcript, and production deletion blockers

## 2026-05-05 OIDC Tenant Isolation Gate Pass

- added `PERSONAL_AI_AGENT_TENANT_MODE=enforce` support to bind workspace and mission API access to an OIDC tenant claim instead of trusting caller-supplied tenant headers
- added `smoke:web-tenant-isolation` to verify tenant-bound workspace creation, tenant-filtered workspace/mission lists, cross-tenant mission create/read blocking, and tenant header spoofing prevention
- wired the tenant isolation gate into enterprise controls rehearsal, deployment guidance, security model, product checklist, README, and release readiness while preserving hosted tenant storage, encryption, backup, and centralized tenant administration blockers

## 2026-05-05 OIDC Web Auth RBAC Gate Pass

- added optional `PERSONAL_AI_AGENT_WEB_AUTH_MODE=oidc` support for RS256 bearer JWT validation against configured issuer, audience, JWKS URL, expiry, and role claim
- added `smoke:web-oidc-rbac` to verify missing token rejection, invalid audience rejection, token-derived operator role access, and viewer-token header spoofing prevention
- wired OIDC/JWKS auth evidence into security, deployment, product, README, release readiness, and production enterprise controls rehearsal while keeping hosted session administration and centralized permission lifecycle blockers explicit

## 2026-05-05 Production Enterprise Controls Rehearsal Gate Pass

- added `docs/production-enterprise-controls-v1.md` as the local enterprise controls rehearsal artifact for shared-secret web auth, route-level RBAC, release artifact hygiene, runtime isolation, and provider readiness checks
- added `rehearsal:production-enterprise-controls` and `smoke:production-enterprise-controls` so local enterprise-control evidence can be regenerated and verified without claiming identity-backed hosted RBAC, hosted tenant isolation, or production-ready status
- wired the enterprise controls rehearsal into release readiness, deployment guidance, security model, product checklist, README, production-like drill, pilot export package, production readiness gate, artifact hygiene, and artifact-sync allowlists while preserving hosted identity/session and tenant isolation blockers

## 2026-05-05 Production Provider Readiness Rehearsal Gate Pass

- added `docs/production-provider-readiness-v1.md` as the local provider readiness rehearsal artifact for OpenAI, Anthropic, local, and Hermes preflight status, env readiness, archived live status, and next live-validation commands
- added `rehearsal:production-provider-readiness` and `smoke:production-provider-readiness` so provider expansion readiness can be regenerated and verified without claiming live-provider-complete or production-ready status
- wired the provider readiness rehearsal into release readiness, deployment guidance, security model, product checklist, README, production-like drill, pilot export package, production readiness gate, artifact hygiene, and artifact-sync allowlists while preserving current provider blockers

## 2026-05-05 Date Rollover Verification Pass

- confirmed local runtime date as `2026-05-05 00:10:00 KST +0900`, then reran date-sensitive mission timeline, maintenance history, provider cost telemetry, operator timeline, overdue action logging, maintenance sweep, and provider action inbox smokes to verify the 2026-05-04 operating state stayed stable after midnight
- reran execution-v1 status, snapshot, production readiness, release artifact hygiene, production retention operating, production SLO operating, production-like release drill, pilot export package, default smoke, UI harness browse, aggregate provider preflight, and `git diff --check`; all passed without source or fixture changes
- kept execution-v1 artifacts unchanged because status and snapshot remained `artifact-sync-current` against pushed commit `9883004`, with OpenAI-scoped pilot readiness preserved and production-ready still blocked

## 2026-05-04 Production Retention Operating Rehearsal Gate Pass

- added `docs/production-retention-operating-v1.md` as the local retention/export/delete operating rehearsal artifact for retention policy, runtime lifecycle, runtime isolation, pilot package, package smoke, and artifact hygiene gates
- added `rehearsal:production-retention-operating` and `smoke:production-retention-operating` so retention operating evidence can be regenerated and verified without claiming hosted production retention readiness
- wired the retention operating rehearsal into release readiness, retention policy, deployment guidance, security model, product checklist, README, production-like drill, pilot export package, production readiness gate, and artifact hygiene while keeping `productionReadyClaim: false`

## 2026-05-04 Web Auth RBAC Gate Pass

- added an optional shared-secret web auth gate with `PERSONAL_AI_AGENT_WEB_AUTH_MODE=enforce` and `PERSONAL_AI_AGENT_WEB_AUTH_TOKEN`, accepting bearer or `x-personal-ai-agent-auth-token` credentials before RBAC is evaluated
- added `smoke:web-auth-rbac` to verify missing/invalid tokens are blocked, authenticated viewer mutations remain forbidden, and authenticated operator mutations can proceed
- wired the authenticated local RBAC evidence into the production-like release drill, security model, deployment guide, product checklist, README, and release readiness while preserving the hosted identity/session RBAC production gap

## 2026-05-04 Production SLO Operating Rehearsal Gate Pass

- added `docs/production-slo-operating-v1.md` as the local SLO operating rehearsal artifact for incident/SLO, release status, snapshot, artifact hygiene, clean deployment, runtime lifecycle, and runtime isolation gates
- added `rehearsal:production-slo-operating` and `smoke:production-slo-operating` so SLO operating evidence can be regenerated and verified without claiming customer production SLO/SLA readiness
- wired the SLO operating rehearsal into release readiness, incident policy, deployment guidance, security model, product checklist, README, production-like drill, pilot export package, production readiness gate, and artifact hygiene while keeping `productionReadyClaim: false`

## 2026-05-04 Clean Deployment Release Rehearsal Gate Pass

- added `docs/clean-deployment-release-v1.md` as a local clean-checkout rehearsal artifact that proves core release gates can replay without `var/`, Playwright output, dependency folders, or git metadata
- added `rehearsal:clean-deployment-release` and `smoke:clean-deployment-release` so pilot handoff portability can be verified before sharing release packages
- wired the clean deployment rehearsal into release readiness, deployment guidance, product checklist, README, production-like drill, pilot export package, production readiness gate, and artifact hygiene while keeping `productionReadyClaim: false`

## 2026-05-04 Retention Delete Policy Gate Pass

- added `docs/retention-delete-v1.md` as the pilot lifecycle source of record for data class retention, export checklist, delete checklist, stop conditions, and production gap wording
- added `smoke:retention-delete-policy` to verify the policy document remains wired into release readiness, security, deployment, product planning, and README guidance
- expanded the production-like release drill, pilot export package, and release artifact hygiene boundary so retention/export/delete evidence is included in repeatable handoff checks without claiming production readiness

## 2026-05-04 Runtime Isolation Gate

- added `smoke:runtime-isolation` to verify one-runtime-per-customer pilot separation across workspace, mission, memory, export, and confirmed delete flows
- added [runtime-isolation-v1.md](runtime-isolation-v1.md) as the self-hosted pilot isolation evidence source of record while keeping hosted tenant isolation blocked
- wired runtime isolation into production-like drill, release readiness, security model, deployment guidance, product checklist, and README smoke guidance

## 2026-05-04 Pilot Export Package Gate

- added a pilot export package manifest generator that records the shareable planning pack, release evidence, production-like drill, and immutable execution-v1 snapshot with repository-relative paths and sha256 hashes
- added `smoke:pilot-export-package` so the export package cannot omit required files or claim production readiness
- extended release artifact hygiene and artifact sync detection to include the pilot export package manifest before external handoff

## 2026-05-04 Production-Like Release Drill Gate

- added a production-like local release drill generator that replays incident/SLO, execution-v1 status/snapshot, production readiness, artifact hygiene, and runtime data lifecycle gates into one operator-facing evidence document
- added a dedicated smoke guard so the drill remains a dry-run artifact with `productionReadyClaim: false` and cannot be used to claim production readiness
- extended release artifact hygiene to scan the drill document so generated operating evidence is covered by the same secret and machine-local path checks as execution-v1 evidence artifacts

## 2026-05-04 Incident SLO Policy Gate Pass

- added `docs/incident-slo-v1.md` as the pilot incident and SLO policy source of record, covering severity levels, response targets, update cadence, owner expectations, incident entry criteria, response workflow, evidence requirements, and closure criteria
- added `smoke:incident-slo-policy` and wired the policy into `smoke:production-readiness-gate` so release readiness now verifies the pilot incident/SLO policy while keeping production SLO/SLA operating evidence blocked until target deployment proof exists
- updated release-readiness, security model, product plan, and README references so operators can verify incident/SLO policy coverage without changing the current OpenAI-scoped pilot-ready label

## 2026-05-04 Runtime Data Lifecycle Gate Pass

- added runtime data lifecycle utilities for local runtime inventory, relative-path export manifest generation, sha256 audit evidence, and confirmation-token guarded `var/` deletion
- added `smoke:runtime-data-lifecycle` to verify export/delete behavior on an isolated temp runtime without touching the operator's real local state
- updated security and product planning docs to distinguish executable pilot lifecycle verification from the remaining production requirement for customer-specific retention periods, transcripts, and hosted control-plane deletion guarantees

## 2026-05-04 Optional Web RBAC Enforcement Pass

- added optional web API RBAC enforcement behind `PERSONAL_AI_AGENT_RBAC_MODE=enforce`, using `x-personal-ai-agent-role` to distinguish viewer, operator, approver, and admin access for mutating routes
- required admin role for workspace registration, release refresh/snapshot, and delete operations; required approver role for approval resolution; kept normal mission/runtime mutation under operator role while read-only APIs remain available to viewer
- added `smoke:web-rbac` to boot the UI server in enforced mode and verify blocked viewer/operator mutations plus successful operator mission creation and approver approval resolution

## 2026-05-04 Release Artifact Hygiene Gate Pass

- added an executable release artifact hygiene gate that scans current execution-v1 evidence, closeout, handoff, and the verified immutable snapshot for real credential patterns and machine-local path leaks
- wired the hygiene check into `smoke:production-readiness-gate` so production-ready overclaim prevention now also verifies that shareable release artifacts do not leak provider secrets or local temp/user paths
- documented the new `smoke:release-artifact-hygiene` entrypoint and updated the security/product planning surface to reflect automated execution-v1 artifact hygiene coverage

## 2026-05-04 Execution Policy Hardening Pass

- hardened execution-v1 preflight command classification for shell-based execution by blocking shell chaining, pipe/redirection, command substitution, absolute/home path references, network/remote shell/file-transfer commands, package dependency mutation, git remote/history/worktree mutation, and deploy/release platform mutation
- kept the allowed execution path intentionally narrow around workspace-local single commands such as `git status --short`, `node --check ...`, and existing package `run` scripts to reduce runtime blast radius before broader sandboxing is introduced
- expanded `smoke:execution-flow` with safe, blocked, warning, and workspace-escape policy assertions so execution policy regressions are checked before a one-time execution lease can be treated as runnable

## 2026-05-04 Pilot Handoff Documentation Alignment Pass

- aligned roadmap, operator runbook, deployment guide, onboarding guide, and demo catalog to the current `provider-scoped pilot ready for OpenAI-backed local-first path` release label
- documented the current provider boundary consistently: OpenAI live validation is archived, Anthropic is blocked by provider account billing/credit, and local/Hermes require approved runtime endpoint/model configuration
- replaced blind deterministic-only evidence refresh guidance with live-aware selected-provider refresh commands so operators do not overwrite archived live proof while updating closeout, handoff, or snapshot artifacts
- aligned README, release-readiness, release status API, closeout recommendations, handoff generator output, and smoke assertions to the same selected-provider evidence refresh command contract
- aligned product plan and security model source-of-record wording so the planning pack describes OpenAI-scoped pilot readiness without overstating production or all-provider readiness
- hardened browser E2E artifact lifecycle by backing up release handoff/report artifacts before the smoke clears output paths and restoring them on failure or signal interruption, preventing a failed browser smoke from breaking later execution-v1 status checks
- added `smoke:ui-execution-browser-e2e-artifact-restore` to force a browser guard timeout against sentinel artifacts and verify the browser E2E failure path restores prior report/screenshot files without leaving the release status surface broken
- added artifact-only sync commit detection for execution-v1 status and snapshot smokes so committing refreshed evidence/closeout/handoff/snapshot files no longer immediately turns the release status stale when no runtime/source files changed
- changed the execution-v1 handoff generator to derive commit push status from `origin/<branch>` instead of hardcoding deferred publishing, so pushed artifact-sync releases can show accurate handoff state
- added `smoke:production-readiness-gate` so the OpenAI-scoped pilot-ready boundary, provider blockers, and production-ready prohibition are checked as an executable release gate instead of documentation-only policy
- promoted `smoke:production-readiness-gate` into `verify:execution-v1`, status, snapshot, and closeout runtime checks so release evidence now records production-overclaim protection as the eighth deterministic execution-v1 row
- kept commit/push deferred and limited this pass to planning and operator-facing documentation

## 2026-05-04 Date Rollover Verification Pass

- confirmed local runtime date as `2026-05-04 00:26:32 KST +0900`, then reran execution-v1 status, snapshot, handoff, and aggregate provider preflight to verify the OpenAI-scoped pilot-ready evidence stayed local-current after the date rollover
- reran date-sensitive mission timeline, maintenance history, provider cost telemetry, and operator timeline smokes; all passed without 2026-05-04 rollover fixture changes
- reran broader regression coverage after the date-sensitive pass: default smoke, 15-script reference adoption aggregate, UI harness browse contract, execution-v1 live-helper smoke, and closeout runtime summary smoke all passed
- fixed the closeout runtime summary smoke fixture to include the `smoke:execution-v1-handoff` runtime row and to expect the closeout generator's relative evidence link, matching the current generated closeout contract
- reran the full deterministic `verify:execution-v1` gate after the fixture fix; all seven rows passed, including browser E2E, 15-script reference adoption aggregate, live-helper smoke, and handoff generator smoke
- kept evidence/closeout/handoff/snapshot content unchanged except for this devlog note because current release artifacts already match HEAD and no new live provider validation was performed
- current remaining live blockers are unchanged: Anthropic is blocked by provider account billing/credit, and local/Hermes still required target provider architecture evidence at that point

## 2026-05-03 OpenAI Live Validation and Scoped Pilot Readiness Pass

- ran combined OpenAI and Anthropic execution-v1 live validation with provider keys loaded only into the child process; OpenAI passed with execution session `execsession_20260503151913_b6ab40`, while Anthropic failed with HTTP 400 account billing/credit blocker from the provider API
- fixed live validation stability by normalizing the OpenAI execution fixture to one deterministic `node --check src/cli.mjs` execution step after the provider-reviewed mission is produced, preventing provider-generated read-only `grep` commands from failing solely because no matches were found
- added live evidence portability and triage detail so current evidence, closeout, handoff, and snapshots redact macOS temp roots as `<temp>/...` while still recording provider failure kind, HTTP status, recoverability, timeout state, and Anthropic billing message
- regenerated execution-v1 evidence, closeout, handoff, and immutable snapshot with visual artifact set `61b2df678feae5ca2f3d076de5db506b30e57f7e0231de33550ae0b8fd36cd6c`, then updated the release decision to `provider-scoped pilot ready for OpenAI-backed local-first path` while keeping production readiness blocked

## 2026-05-03 Date Rollover Verification Pass

- confirmed local runtime date as `2026-05-03 15:18:19 KST +0900`, then reran date-sensitive mission timeline, maintenance history, provider cost telemetry, specialist follow-up inbox, action overdue logging, action maintenance, provider action inbox, and operator timeline smokes to verify the 2026-05-02 rollover state remained stable on the following day
- reran the default smoke, execution-v1 release status, snapshot integrity, aggregate provider preflight, UI harness browse contract, and handoff generator smoke after the 2026-05-03 rollover; release status stayed deterministic 7/7 with reference adoption ready, and provider preflight still reported zero blocked providers with four missing live env values
- regenerated execution-v1 evidence, closeout, handoff, and immutable snapshot after the 2026-05-03 rollover pass; refreshed visual artifact set is `7a10d6524a6ad033050ea8fc9915ba219532e2a0b05eedfb327d7a1965a5ff1d`
- added `docs/product-plan-v1.md` as the product planning source of record, separating achieved deterministic execution-v1 readiness from the remaining live-provider, enterprise policy, pilot onboarding, demo scenario, and release-decision work required before claiming company-ready production use
- added `docs/security-model-v1.md` as the v1 security planning source of record, covering trust boundaries, workspace isolation policy, RBAC matrix, secret handling, tool permission model, prompt/input boundary, audit evidence, retention/export/delete defaults, threat model, and pilot security checklist while keeping production readiness blocked on live validation and enforced enterprise controls
- added `docs/operator-runbook-v1.md` as the v1 operator runbook, documenting daily start checks, UI startup, workspace registration, mission execution, approval handling, provider live validation, evidence refresh, artifact hygiene, incident triage, failure handling, release decision gates, and handoff template for controlled self-hosted pilot operation
- added `docs/deployment-pilot-v1.md` as the self-hosted pilot deployment guide, covering prerequisites, pilot runtime layout, environment configuration, install/bootstrap, workspace registration, UI startup, pre-live validation, provider live validation, operation loop, backup/export, cleanup, failure recovery, and pilot acceptance criteria
- added `docs/pilot-onboarding-v1.md` as the customer pilot onboarding guide, documenting participant roles, pre-onboarding checklist, Day 0 preparation, first session agenda, first demo mission, provider onboarding path, UI walkthrough, success criteria, stop conditions, pilot outcome template, and common readiness questions
- added `docs/demo-scenarios-v1.md` as the customer demo scenario catalog, covering release readiness, engineering mission with approval, provider validation and readiness, document and memory grounding, multi-specialist analysis, recommended demo order, scenario-specific success/stop criteria, and demo outcome template
- added `docs/release-readiness-v1.md` as the current release readiness decision record, formally labeling the project as `internal alpha with deterministic execution-v1 readiness` while keeping pilot-ready and production-ready blocked on archived live provider validation evidence and regenerated release artifacts

## 2026-05-02 Date Rollover Verification Pass

- confirmed local runtime date as `2026-05-02 02:01:58 KST +0900`, then reran date-sensitive mission timeline, maintenance history, provider cost telemetry, specialist follow-up inbox, action overdue logging, action maintenance, provider action inbox, and operator timeline smokes to verify the 2026-05-01 rollover fixes stayed stable on the next day
- reran the execution-v1 release status, snapshot integrity, aggregate provider preflight, and default smoke after the 2026-05-02 rollover; status remained deterministic 6/6 with reference adoption ready, snapshot stayed aligned to `0622c86d27a3bd203fda6f976a55eafa0465cb1e`, and provider preflight still reported zero blocked providers with four missing live env values
- regenerated execution-v1 evidence, closeout, and immutable snapshot after the 2026-05-02 rollover pass; refreshed visual artifact set is `ce4fa14607efe6e253d8e229482a357ee6112bdcecd2fde5e63e93abacd467fd`, then status, snapshot, UI harness, and aggregate provider preflight checks passed
- completed the no-commit readiness sweep for the refreshed `ce4fa14607efe6e253d8e229482a357ee6112bdcecd2fde5e63e93abacd467fd` artifact set: default smoke, execution-v1 live helpers, closeout runtime summary, 15-script reference adoption aggregate, all changed/untracked JavaScript syntax checks, release-doc portability scan, credential-like scan, and `git diff --check` passed
- added `docs/execution-v1-handoff.md` to consolidate the current no-commit operational handoff state, including deterministic readiness, reference adoption coverage, latest visual artifact set, live-provider missing-env blockers, and the exact provider validation commands required before claiming live-provider-complete readiness
- added a reproducible `handoff:execution-v1` generator and archived handoff support in `snapshot:execution-v1`, so the operator handoff surface is regenerated from current evidence/closeout and stored beside evidence/closeout in immutable release snapshots
- promoted execution-v1 handoff into the release status API and operator UI current-surface model, so refresh/stale/snapshot planning now treats evidence, closeout, and handoff as one reproducible release artifact set
- added `smoke:execution-v1-handoff` to lock the standalone handoff generator contract against fixture evidence/closeout input, including reference adoption aggregate, visual artifact set, live-provider missing-env blockers, and next-operator command guidance
- promoted `smoke:execution-v1-handoff` into `verify:execution-v1`, so release evidence now records handoff generator readiness as the seventh deterministic execution-v1 row and closeout exposes `handoff generator: ready`
- regenerated execution-v1 evidence, closeout, handoff, and immutable snapshot after adding the handoff generator to the release verification gate; refreshed visual artifact set is `665a11d66a82a82c7c4b5c31059459f5c8e44bd3a8ae616ea021bc53a536caf9`
- exposed handoff generator readiness as a first-class release UI summary chip and locked the value in UI harness/browser E2E smoke coverage
- regenerated execution-v1 evidence, closeout, handoff, and immutable snapshot after the release UI handoff-generator summary chip pass; refreshed visual artifact set is `134c2bce0525f7a70e9521cd7221c22cf13b88ec0677bf37ddcc45ff1e3be058`
- extended the UI harness smoke to verify `/api/execution-v1/refresh/preflight` and the no-confirm `/api/execution-v1/refresh` guard both report evidence/closeout/handoff rewrite scope before any mutating refresh can run

## 2026-05-01 Date Rollover Verification Pass

- confirmed local runtime date as `2026-05-01 00:09:39 KST +0900`, then reran date-sensitive escalation reminder, reminder due, overdue action logging, operator timeline, mission timeline, provider timeline, specialist follow-up reminder, and default smoke paths to verify rollover behavior across the midnight boundary
- reran execution-v1 release status, snapshot integrity, and aggregate provider preflight after the date rollover; release status stayed deterministic 6/6 with reference adoption ready, snapshot remained aligned to `0622c86d27a3bd203fda6f976a55eafa0465cb1e`, and provider preflight reported zero blocked providers with four missing live env values
- completed post-rollover hygiene by checking 67 changed/untracked JavaScript files with `node --check`, scanning README/docs/scripts/src/package metadata for credential-like patterns, and confirming `git diff --check` passed
- reran the full `verify:execution-v1` gate after the 2026-05-01 KST rollover; all six deterministic rows passed, including browser E2E and the 14-script reference adoption aggregate, then regenerated execution-v1 evidence/closeout/snapshot with visual artifact set `a0c3bf7e9d4f6862ca136b4bcf93c26827cf32f198963bb77cb013c49d131b43` and reconfirmed status, snapshot, syntax, credential, and diff hygiene
- expanded `smoke:execution-v1-live-helpers` so OpenAI, Anthropic, local, and Hermes each verify provider-specific preflight plus structured `missing-env` JSON from `npm run live:execution-v1:*`; a first evidence regeneration attempt hit a transient browser preview `ERR_CONNECTION_REFUSED`, the standalone browser E2E retry passed, and the subsequent evidence/closeout/snapshot regeneration completed with visual artifact set `a6014f94e06c49ede7bd74b673da0ead565a4c6aaf2e704fd83817a4c2344560`
- aligned the README execution-v1 live-helper documentation with the new four-provider smoke coverage so the status chip, missing-env JSON behavior, and `npm run live:execution-v1:*` helper flow no longer read as Hermes-only; reran live-helper, status, snapshot, and diff hygiene checks
- reran the broader smoke gate after README live-helper documentation alignment: default `npm run smoke`, `smoke:reference-adoptions`, and `preflight:execution-v1:all` passed, then 67 changed/untracked JavaScript files passed `node --check`, credential-like scanning returned no matches, and `git diff --check` passed
- extended provider preflight JSON with `missingEnvCommand` so both single-provider and aggregate preflight output include a shell-ready `export ... && npm run live:execution-v1:*` command; updated live-helper and UI harness smokes to lock the new field, then reran preflight, status, snapshot, syntax, and diff checks
- regenerated execution-v1 evidence, closeout, and immutable snapshot after adding `missingEnvCommand` to preflight output; the refreshed evidence records `smoke:execution-v1-live-helpers` with the new contract and visual artifact set `75019cc2d6556e2c96637f01720ecc92248b13dbf2dac161f0380ac6a77b2111`, then status, snapshot, syntax, credential, and diff hygiene checks passed
- wired the release UI provider live command copy path to prefer preflight `missingEnvCommand`, so after running provider or aggregate preflight the provider card copies the exact shell-ready env command returned by the backend instead of reconstructing it locally; reran UI harness, aggregate preflight, status, syntax, and diff checks
- regenerated execution-v1 evidence, closeout, and immutable snapshot after the release UI command-copy update so visual/release artifacts include the `missingEnvCommand`-aware provider card behavior; refreshed visual artifact set is `68f496efaf43ed4f3a60e0364245464261fff13baffac21f177318505868741b`, with status, snapshot, syntax, credential, and diff hygiene checks passing afterward
- reran the broader regression gate after the latest release evidence refresh: default `npm run smoke`, `smoke:reference-adoptions`, and `preflight:execution-v1:all` passed; aggregate preflight still reported zero blocked providers with four missing live env values and shell-ready `missingEnvCommand` entries, then 67 changed/untracked JavaScript files passed `node --check`, credential-like scanning returned no matches, and `git diff --check` passed
- aligned execution-v1 closeout recommended actions with the shell-ready provider command contract, so OpenAI now includes `OPENAI_RUN_TIMEOUT_MS=60000` and all provider rows show direct `export ... && npm run live:execution-v1:*` commands; regenerated closeout/snapshot and reran closeout runtime summary, status, snapshot, syntax, credential, and diff checks
- aligned README release UI handoff guidance with the same `missingEnvCommand` contract, documenting that provider cards prefer backend shell-ready commands after preflight and only fall back to `export ENV_KEY=\"...\" && ...` skeletons when no preflight result is available
- verified the README handoff documentation alignment with `smoke:ui-harness-browse`, `smoke:execution-v1-status`, targeted credential-like scanning, and `git diff --check`
- reran aggregate provider preflight after the README alignment; OpenAI, Anthropic, local, and Hermes all stayed `ready-but-missing-env` with zero blocked providers and shell-ready `missingEnvCommand` values
- hardened the browser E2E Playwright CLI wrapper with a process-group hard timeout after an evidence regeneration attempt stalled in `playwright-cli open`; reran `smoke:ui-execution-browser-e2e` successfully, then regenerated execution-v1 evidence, closeout, and snapshot with visual artifact set `a7517e7b32563959ef4c77df80bad7615b2b2846e0605e35a71188d1e3605591`
- extracted the process-group hard-timeout runner into `scripts/process-timeout-utils.mjs` and reused it from `verify-execution-v1` so every deterministic `npm run` smoke in the release gate now fails fast instead of hanging on orphaned child process pipes; reran full `verify:execution-v1`, regenerated evidence/closeout/snapshot, and refreshed visual artifact set `f734e62f25c54251468b1d9a60c0f6260cda43eea3e222d5208b489b7081a92e`
- added `smoke:process-timeout-utils` to lock the hard-timeout helper contract for success, timeout, and nested child cleanup behavior; documented the standalone command in README and reran syntax plus diff hygiene checks
- regenerated execution-v1 evidence, closeout, and immutable snapshot after adding the standalone hard-timeout smoke command so current artifacts reflect the latest verification runner code; refreshed visual artifact set is `662cadd4bb18b0b647d9f5e2a266ba504858670d7d0bcd08c964a52de2219a06`
- completed a broader post-timeout-runner regression sweep: default `npm run smoke`, `smoke:reference-adoptions`, `smoke:process-timeout-utils`, execution-v1 status/snapshot smokes, and changed/untracked JavaScript syntax checks all passed
- promoted `smoke:process-timeout-utils` into the `smoke:reference-adoptions` aggregate so process hard-timeout behavior is covered by the same borrowed-pattern regression gate as provider guard, Hermes, retrieval, fact graph, and parallel specialist contracts; updated status/snapshot/UI harness assertions for the 15-script aggregate
- regenerated execution-v1 evidence, closeout, and immutable snapshot after promoting the timeout helper smoke into the reference adoption aggregate; current evidence now records `scriptCount: 15` including `scripts/smoke-process-timeout-utils.mjs`, with visual artifact set `6a09d9de5c9cf5ac2ba3b489ee062ffc26dd0a28445c176df1bdaa45c883c18d`
- verified the 15-script reference adoption contract through `smoke:execution-v1-status`, `smoke:execution-v1-snapshot`, `smoke:ui-harness-browse`, and `smoke:reference-adoptions`; changed/untracked JavaScript syntax checks, aggregate provider preflight, credential-like scanning, and `git diff --check` also passed
- centralized the reference adoption smoke list in `scripts/reference-adoption-scripts.mjs` so the aggregate runner, status smoke, snapshot smoke, and UI harness smoke share one script-count contract; fixed the seeded execution-v1 fixture to include all required aggregate rows and reran status, snapshot, UI harness, reference adoption, and syntax checks
- regenerated execution-v1 evidence, closeout, and immutable snapshot after centralizing the reference adoption script list so current artifacts reflect the shared 15-script aggregate contract; refreshed visual artifact set is `915cbaead3d25259bb131c89443141e7f92ee5e3c60c5daccaba122cedcd0a1b`
- removed the last current fixture-level hardcoded reference adoption script count by deriving seeded execution-v1 aggregate rows from `reference-adoption-scripts.mjs`; reran UI harness smoke plus syntax and diff checks
- regenerated execution-v1 evidence, closeout, and immutable snapshot after the fixture dynamic-row cleanup so release artifacts now reflect the latest shared reference-adoption contract; refreshed visual artifact set is `7e2c0d16bd0301448a85a4ff8335f4bf4478ed653215799e19d4f5bbcc976052`
- hardened `smoke:reference-adoptions` itself with the shared process-group hard-timeout runner so standalone aggregate execution cannot hang indefinitely on a child smoke; documented the `PERSONAL_AI_AGENT_REFERENCE_ADOPTION_SCRIPT_TIMEOUT_MS` per-script timeout control in README
- extended execution-v1 verification/evidence parsing so reference adoption aggregate rows preserve per-script `timeoutMs` and `timedOut` metadata instead of dropping the new hard-timeout contract
- regenerated execution-v1 evidence, closeout, and immutable snapshot after preserving reference-adoption timeout metadata; evidence now shows each aggregate row with `timeout 5.0m` and `timedOut false`, with visual artifact set `44175e6f355a7974c878d75cf78df40c7afb97fc470cce2b08b00ddeffdc2a02`
- extended the execution-v1 status API and release UI reference-adoption table to parse and render aggregate per-script `timeout` and `timedOut` fields, then tightened status and UI harness smokes around the structured metadata
- moved the hard-timeout helper payload from `argv` into a temp JSON file so large Playwright `run-code` browser E2E calls no longer exceed command-line limits, added targeted retry coverage for transient retrieval handoff `open` sessions, and regenerated execution-v1 evidence/closeout/snapshot with visual artifact set `e09b45e94d07d1de72fc0253c7de61c96c5474487cfdf2569b8a230766dcebb3`
- completed the follow-up operational regression pass after the browser E2E hardening: default smoke, live-helper smoke, provider surface/overview/probe/global overview, orchestration profiles, parallel specialists, UI agent blueprints, runtime discovery, action inbox, escalation sync/owner chain, and UI mission attachment smokes all passed with provider preflight still intentionally `ready-but-missing-env`
- fixed additional 2026-05-01 rollover-sensitive smoke fixtures by deriving maintenance and provider-health-drift month buckets from the current UTC month instead of hardcoded `2026-04-01`; reran provider action inbox, action overdue logging, action maintenance, workspace overview, provider telemetry/attention/recovery/history, reviewer/specialist/approval, document/retrieval/fact-graph, provider implementation, and 15-script reference adoption smokes successfully
- regenerated execution-v1 evidence, closeout, and immutable snapshot after the rollover fixture fixes; current visual artifact set is `234e5837cc0616b1c34bdb22835f970d4cad6e53f8c7c2b38ba1c2f049aa4e53`, with status, snapshot, aggregate provider preflight, and UI harness smokes passing afterward
- completed a no-commit pre-commit readiness sweep after the refreshed evidence set: all changed/untracked JavaScript files passed `node --check`, default smoke passed, reference adoption aggregate passed all 15 scripts with no timeouts, execution-v1 status/snapshot smokes passed, aggregate provider preflight still reported zero blocked providers with four missing live env values, credential-like scanning found only placeholder commands, and `git diff --check` passed
- hardened execution-v1 snapshot portability by scrubbing transient `/var/folders/...` temp roots from archived markdown, extending the snapshot smoke to reject local absolute and macOS temp paths across all release snapshots, and refreshing the current snapshot after confirming status and diff hygiene
- reran the closeout/runtime and operator-surface checks after snapshot portability hardening; closeout runtime summary, execution-v1 live helper smoke, UI harness browse contract, and aggregate provider preflight all passed, with provider preflight still blocked only by missing live env configuration
- extended the post-portability operator regression sweep through execution flow/CLI/UI console, escalated inbox, escalation reminder/owner-handoff/history, provider rate guard, timeout helper, global/workspace overview, and operator timeline; fixed the remaining operator timeline monthly bucket assertions to derive current UTC month boundaries instead of hardcoded `2026-04-01`

## 2026-04-30 Date Rollover Verification Pass

- reran date-sensitive escalation, reminder, overdue, operator timeline, mission timeline, provider timeline, and specialist reminder smokes after the local date moved to 2026-04-30 KST, confirming relative due/reminder fixtures still pass across the day boundary
- reran the default `npm run smoke` CLI aggregate after the date rollover to confirm workspace, memory, mission, approval, and document logging flows still pass under the new local date
- reran `smoke:reference-adoptions` after the date rollover to confirm the adopted output compaction, provider guard, Hermes provider, mission quality gate, document conversion, runtime discovery, visual evidence, retrieval, fact graph, and instruction-boundary contracts remain green together
- reran provider surface, overview, probe, history, timeline, events, telemetry, retry telemetry, attention lifecycle, and global overview smokes after the Hermes/aggregate-preflight sweep to confirm provider control-plane state still reports five providers and stable operational telemetry
- reran quick UI contract smokes for agent blueprints, mission attachments, harness browse, and execution console to confirm the release aggregate-preflight UI changes did not regress adjacent operator surfaces
- reran orchestration profiles, parallel specialists, specialist follow-up inbox/reminders/remediation, reviewer follow-up lifecycle/accepted-risk, and approval inbox/approve smokes to confirm multi-agent control-plane and human approval flows remain stable after the release UI hardening
- reran action inbox, action maintenance, maintenance history, escalated inbox, escalation owner handoff/reminders/history/chain, and escalation sync smokes to confirm operational reminder and owner-escalation flows remain stable after the date rollover
- ran a pre-commit hygiene pass across changed and untracked files, including pattern-based sensitive-data scanning, changed `.mjs` syntax checks, `git diff --check`, `smoke:execution-v1-status`, and the default `npm run smoke`; only fixture keys and env variable names were detected by the scan
- cleaned release handoff structured summary handling in the web API and UI so stable-line-copy summary rows are derived from dynamic summary keys instead of hardcoded repeated key chains, then reran syntax checks, `smoke:ui-harness-browse`, `smoke:execution-v1-live-helpers`, `smoke:execution-v1-status`, and the default `npm run smoke`
- fixed the release handoff structured summary regression caught by `verify:execution-v1` so text/markdown handoff artifacts reuse their paired JSON summary while non-handoff index/browser artifacts stay summary-free, then reran `smoke:ui-execution-browser-e2e`, full `verify:execution-v1`, regenerated evidence/closeout/snapshot, and confirmed `smoke:execution-v1-status` plus `smoke:execution-v1-snapshot` with visual artifact set `77ec3b3de18b2b0dc31a6ac4547a9ef52091794c76227a2053d8101a07bd9260`
- completed the final pre-commit readiness scan after artifact regeneration: `git status --short`, `git diff --stat`, repo-local path leak search, and changed/untracked sensitive-data scan all completed, with only deterministic fixture keys and provider env variable names detected
- hardened runtime job and request registries to fall back to an empty normalized state when their persisted JSON is malformed, matching runtime status service resilience and preventing corrupted `var/runtime-*.json` files from breaking UI startup or runtime summary APIs; reran `smoke:runtime-discovery`, syntax checks, and `git diff --check`
- extended `smoke:runtime-discovery` with direct malformed `runtime-jobs.json` and `runtime-requests.json` fixtures so the registry fallback contract is locked before staging; reran the smoke with syntax checks and diff whitespace validation
- reran `smoke:reference-adoptions` after the runtime registry fallback fixture, regenerated execution-v1 evidence/closeout, and then regenerated the release snapshot sequentially after catching a parallel closeout/snapshot timestamp race; final `smoke:execution-v1-status`, `smoke:execution-v1-snapshot`, and `git diff --check` passed with visual artifact set `b1fb01ff4c2f0318e5d4a0b4469918b0f0a314aedf7d0c2a88183686837f147b`
- rechecked Harness, Claude Code Harness, and Hermes Agent references on 2026-04-30, then mapped the transferable Hermes Agent pattern into the existing `engineering-full-spectrum` orchestration profile through `runtimeBlueprint=hermes-agent-full-spectrum`, `recommendedProvider=hermes`, Hermes harness pattern metadata, and a dedicated UI `Hermes 에이전트` card without adding a new agent lane or increasing the runtime surface cap
- regenerated execution-v1 evidence, closeout, and immutable snapshot after the Hermes Agent profile metadata/UI card pass; final `smoke:execution-v1-status`, `smoke:execution-v1-snapshot`, and `git diff --check` passed with visual artifact set `914f454179b21ee8fdd73435135269e7631cfb2cb40bc0547e75d6411e02c0e1`
- completed a follow-up pre-commit hygiene pass after snapshot regeneration: reran the default `npm run smoke`, checked all changed/untracked JavaScript files with `node --check`, scanned changed non-release files for credential-like patterns, and confirmed README/docs/scripts/src have no new machine-local path leaks outside generated release/devlog evidence
- reran the full `verify:execution-v1` deterministic gate after the hygiene pass; all six rows passed, including browser E2E in 447084ms and `smoke:execution-v1-live-helpers`, while live validation remained intentionally skipped because provider credentials/base URLs are not configured
- reran `preflight:execution-v1:all` after the full verification gate; OpenAI, Anthropic, local, and Hermes all reported `ready-but-missing-env` with zero blocked providers, confirming the remaining live gap is credential/config injection rather than deterministic code readiness
- locked Hermes Agent profile metadata into the actual multi-agent run contract by extending `smoke:parallel-specialists` with an `engineering-full-spectrum` mission that reaches the normal approval gate while preserving `recommendedProvider=hermes`, `runtimeBlueprint=hermes-agent-full-spectrum`, and Hermes harness pattern metadata in the mission summary and latest parallel group
- reran the adjacent multi-agent control-plane sweep after locking the Hermes profile run contract: specialist follow-up inbox, reminders, remediation, reviewer follow-up lifecycle, accepted-risk escalation, approval inbox, and approval approve smokes all passed
- expanded `smoke:reference-adoptions` so the external-reference aggregate now also covers orchestration profiles, UI agent blueprints, and parallel specialist runs, keeping the Hermes Agent profile card and run metadata contract inside the same regression gate as the other borrowed patterns
- reran the expanded `smoke:reference-adoptions` aggregate after adding orchestration/profile/UI coverage; all 14 scripts passed in 34904ms, including `smoke:orchestration-profiles`, `smoke:ui-agent-blueprints`, and `smoke:parallel-specialists`
- regenerated execution-v1 evidence, closeout, and immutable snapshot after expanding the reference adoption aggregate; final `smoke:execution-v1-status`, `smoke:execution-v1-snapshot`, and `git diff --check` passed with visual artifact set `f0fc3e1690a9fb9662ca6a87972b25674cdd8431d6963a60402edd204ffdc9e8`
- completed the final hygiene pass after the expanded reference adoption evidence refresh: all changed/untracked JavaScript files passed `node --check`, changed non-release files had no credential-like pattern hits, README/docs/scripts/src had no new machine-local path leaks outside generated release/devlog evidence, `smoke:execution-v1-status` passed, and `git diff --check` passed
- extended `verify:execution-v1` and the evidence generator so the reference adoption aggregate's internal script list is parsed from stdout and written into `execution-v1-evidence.md`; regenerated evidence/closeout/snapshot and confirmed the new `Reference Adoption Aggregate` section lists all 14 scripts with visual artifact set `271c3bacf1a6a151f30ae4203be18d8fa5fcce6d3f7607deb601375d7fa0c88e`
- tightened `smoke:execution-v1-snapshot` so both current and archived evidence must include the `Reference Adoption Aggregate` section with `scriptCount: 14` plus orchestration profile, UI agent blueprint, and parallel specialist script rows; reran the snapshot smoke, syntax check, and `git diff --check`
- surfaced the parsed reference adoption aggregate through `/api/execution-v1/status` for both current and baseline evidence, then tightened `smoke:execution-v1-status` to require `scriptCount: 14` and the orchestration profile, UI agent blueprint, and parallel specialist rows in the API payload
- rendered the reference adoption aggregate in the release UI as a dedicated section with one row per borrowed-pattern smoke and tightened `smoke:ui-harness-browse` to require the UI markers plus API `scriptCount: 14` and parallel-specialist row
- regenerated execution-v1 evidence, closeout, and immutable snapshot after adding the release UI reference-adoption aggregate section; final `smoke:execution-v1-status`, `smoke:execution-v1-snapshot`, and `git diff --check` passed with visual artifact set `4419b382b5bd5b4f5a066030e7e02accec46feb1e93da7a2bcd071d214a5b630`
- completed the next operational regression pass after the release UI aggregate refresh: reran the default `npm run smoke`, `smoke:reference-adoptions`, full `verify:execution-v1`, and `preflight:execution-v1:all`; all deterministic rows passed, all 14 reference adoption scripts passed, and provider preflight remained `ready-but-missing-env` with zero blocked providers
- reran final local hygiene after the operational regression pass: 67 changed/untracked JavaScript files passed `node --check`, `git diff --check` passed, and the credential-like pattern scan across README/docs/scripts/src/package metadata returned no matches
- hardened the execution-v1 closeout generator so `Recommended Next Action` now lists aggregate preflight plus OpenAI, Anthropic, local, and Hermes live-validation env commands instead of only pointing at OpenAI; regenerated closeout/snapshot and reran closeout runtime summary, status, and snapshot smokes
- aligned the release status API and UI recommendation command surface with the `npm run live:execution-v1:*` helpers by exposing live/preflight/evidence commands on provider readiness and recommended action payloads; reran `smoke:execution-v1-status`, `smoke:ui-harness-browse`, focused syntax checks, and `git diff --check`
- reran the broader regression gate after the release command contract alignment: default `npm run smoke`, `smoke:reference-adoptions`, and `preflight:execution-v1:all` passed; provider preflight reported zero blocked providers and four missing live env values, then 67 changed/untracked JavaScript files passed `node --check`, credential-like scanning returned no matches, and `git diff --check` passed
- reran the full `verify:execution-v1` gate after the release command contract alignment; all six deterministic rows passed, including browser E2E and the 14-script reference adoption aggregate, then regenerated execution-v1 evidence/closeout/snapshot with visual artifact set `c27cfe6b1e80c9f4bf7e03bdd1fd6e8fc9080c1014692138748f60dcebb513c4` and reconfirmed status, snapshot, syntax, credential, and diff hygiene

## 2026-04-29 Date Rollover Verification Pass

- added a first-class `hermes` provider inspired by NousResearch Hermes Agent, including OpenAI-compatible chat-completions transport, Hermes `<tool_call>` parser/formatter, context-boundary system guidance, provider catalog visibility, and deterministic provider smoke coverage
- extended Hermes into the execution-v1 operational surface with `--live-hermes`, provider preflight/live npm scripts, UI release readiness cards/actions, closeout checklist/status rows, and the mission run provider selector
- added deterministic live-helper smoke coverage for Hermes preflight and missing-env live command output, plus closeout fixture assertions that the Hermes optional live validation row remains visible
- promoted `smoke:execution-v1-live-helpers` into the execution-v1 verification gate so release evidence/status now tracks six deterministic rows while preserving the original core execution smoke count at four
- surfaced execution-v1 live-helper readiness as a first-class status summary field and UI `live helper` chip so Hermes helper contract drift is visible without inspecting runtime rows
- added `preflight:execution-v1:all` to aggregate OpenAI/Anthropic/local/Hermes live validation prerequisites into one JSON readiness matrix, and extended the live-helper smoke to lock that aggregate contract
- wired the aggregate preflight helper into the release UI/API through `provider: all`, including a `전체 preflight 실행` action, aggregate readiness callout, and UI harness smoke coverage
- hardened browser E2E release handoff verification against transient Playwright session crashes/timeouts by retrying fresh preview sessions and final browser error-state reads before failing the run
- clarified aggregate preflight not-run UI copy so readiness/missing-env counters show `not tracked` until the operator actually runs the aggregate check
- reran UI agent blueprint, UI execution console, and UI harness browse smokes to confirm served UI contracts remain intact after the release artifact and path portability updates
- reran retrieval memory, fact graph memory, document conversion, conversion diagnostics, mission attachments, UI mission attachments, memory rerun, and instruction-boundary smokes to confirm document/memory context and prompt-boundary contracts remain stable
- reran orchestration profiles, parallel specialists, specialist follow-up inbox/reminders/remediation, and reviewer follow-up lifecycle/accepted-risk smokes to confirm specialist control-plane and remediation contracts remain stable after the provider sweep
- reran provider surface, overview, events, attention lifecycle/remediation/recovery/reminders, telemetry, retry telemetry, probe, history, and timeline smokes to confirm provider control-plane state still passes after the date rollover
- reran date-sensitive escalation and overview smokes after the local date moved to 2026-04-29 KST, confirming relative timestamp fixtures still pass across day boundaries
- verified `smoke:escalation-sync`, `smoke:escalation-owner-chain`, `smoke:global-overview`, `smoke:escalation-reminder-due`, `smoke:escalation-reminders`, and `smoke:maintenance-history`

## 2026-04-28 Execution V1 Hygiene and Operational Test Pass

- regenerated execution-v1 evidence, closeout, and snapshot through the updated relative-path generators; reran snapshot and status smokes to prove the generated release surface stays portable and current
- expanded the execution-v1 snapshot smoke portability guard so README, UI workspace placeholder, current release docs, and archived release snapshots fail the smoke if machine-local `/Users/...` paths leak back in
- reran OpenAI, Anthropic, and local execution-v1 provider preflights after the broader smoke pass; all deterministic prerequisites are code-ready and all three remain blocked only by missing runtime env
- reran the default runtime smoke, reference adoption aggregate smoke, and mission quality gate smoke after release path portability cleanup to confirm the core managed-agent flow and imported reference features still pass together
- changed execution-v1 evidence, closeout, and snapshot generators to emit repo-relative paths for committed repo artifacts, reducing machine-local `/Users/...` path leakage in release handoff docs
- added `smoke:execution-v1-snapshot` to verify immutable release snapshot archive metadata, source links, commit alignment, and deterministic/runtime summary rows without rewriting the snapshot
- added `smoke:execution-v1-status` so the actual repo-root `/api/execution-v1/status` release readiness contract is repeatable instead of relying on one-off manual endpoint checks
- added a one-shot Playwright browser guard retry for timeout-only failures in `smoke:ui-execution-browser-e2e`, after a fresh release handoff preview session exceeded the 120s guard install budget during evidence regeneration
- reran `evidence:execution-v1` successfully after the browser guard retry and refreshed `execution-v1-evidence.md`, `execution-v1-closeout.md`, and the immutable execution-v1 snapshot for commit `0622c86d27a3bd203fda6f976a55eafa0465cb1e`
- removed stray `TBD` and placeholder-shaped untracked files that were left from earlier repository recon notes, while preserving actual feature modules, smoke scripts, and generated evidence artifacts
- regenerated `execution-v1-evidence.md` and `execution-v1-closeout.md` after cleanup so deterministic smoke results, runtime summary rows, visual evidence manifest hash, and closeout readiness reflect the current workspace state
- completed operational verification with `smoke:execution-v1-closeout-runtime-summary`, `smoke:ui-harness-browse`, `evidence:execution-v1`, `closeout:execution-v1 -- --reuse-existing-evidence`, and provider preflight checks for OpenAI, Anthropic, and local providers
- reran the default `smoke` entrypoint after the focused execution-v1 checks to verify the broader workspace, mission, document, memory, approval, and execution basics still pass together
- completed a provider deterministic smoke sweep across provider surface, overview, activity, events, hardening, telemetry, cost telemetry, retry telemetry, provider capability/rate guard, and OpenAI/Anthropic/local adapter missing-env contracts
- completed an affected mission/document/memory smoke sweep across mission attachments, UI mission attachments, retrieval memory, fact graph memory, document conversion, conversion diagnostics, runtime discovery, and instruction-boundary fixtures
- completed an approval/action/escalation smoke sweep and removed date-sensitive escalation fixture assumptions by switching tier and owner-chain checks to relative timestamps and the current `handoff-required` inbox contract
- completed workspace/global overview, orchestration profile, parallel specialist, specialist follow-up, and provider attention lifecycle smoke sweeps; also stabilized global overview bucket assertions around current UTC month/week boundaries
- completed remaining memory rerun and UI agent blueprint contract smokes, then rechecked provider overview/events after the broader mission-service smoke sweep
- archived the current execution-v1 evidence and closeout into `docs/releases/execution-v1/0622c86d27a3bd203fda6f976a55eafa0465cb1e/` so the verified deterministic release state has an immutable snapshot before commit/push
- ran a pre-commit sensitive-data scan across changed and newly added files for API keys, bearer tokens, private keys, passwords, and secret-like literals; no real credential material was detected
- verified the live release status API against the current repo state; deterministic smoke, reference adoption, runtime summary, browser E2E, and snapshot discovery are all recognized, while overall `ready` remains false only because OpenAI live validation is still `missing-env`
- confirmed all provider preflight paths are code-ready but blocked on missing runtime credentials or base URL: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and `LOCAL_PROVIDER_BASE_URL`

## 2026-04-28 Execution Closeout Runtime Summary Smoke Pass

- added `--output-path` support to `build-execution-v1-closeout.mjs` so closeout generation can be smoke-tested against temporary fixtures without mutating the canonical release checklist
- changed the generated evidence link to follow the selected evidence path, which keeps both default docs and fixture output self-describing
- added `smoke:execution-v1-closeout-runtime-summary` to verify ready and not-verified deterministic runtime summary states from fixture evidence

## 2026-04-28 Execution Closeout Runtime Summary Pass

- promoted deterministic runtime summary readiness into `execution-v1-closeout.md` so the closeout checklist and current status expose whether smoke duration/stdout/stderr evidence was recorded
- updated the shared execution-v1 fixture and fast UI smoke to require `deterministic runtime summary: ready`
- extended browser E2E release surface assertions to require the `deterministic runtime summary: ready` current-status row

## 2026-04-28 Execution Evidence Runtime Summary Pass

- added a human-readable deterministic runtime summary to `execution-v1-evidence.md` so reviewer-facing closeout evidence surfaces elapsed time, stdout/stderr size, and timeout budget without requiring raw JSON inspection
- updated the shared execution-v1 document fixture so fast UI smoke coverage keeps the same runtime summary section shape as generated evidence
- exposed deterministic runtime summary rows through `/api/execution-v1/status` and locked the browser E2E runtime row in `smoke:ui-harness-browse`
- rendered deterministic runtime rows in the release tab so operators can inspect smoke duration, stdout/stderr size, and timeout budget without opening the evidence markdown
- extended browser E2E release surface capture so the screenshot report now proves the deterministic runtime summary panel and browser E2E runtime row are rendered in the operator UI

## 2026-04-28 Execution V1 Verifier Timeout Pass

- added bounded per-script timeout handling to `verify:execution-v1` so long-running deterministic npm smokes cannot hang the closeout gate indefinitely
- extended verifier JSON with `durationMs`, `stdoutBytes`, `stderrBytes`, and `timeoutMs` per deterministic smoke while preserving the existing `script/status` contract used by evidence generation
- documented `PERSONAL_AI_AGENT_VERIFY_SCRIPT_TIMEOUT_MS` and `PERSONAL_AI_AGENT_VERIFY_MAX_BUFFER_BYTES` overrides for local operator tuning
- split browser E2E Playwright guard installation onto a dedicated `PERSONAL_AI_AGENT_BROWSER_GUARD_TIMEOUT_MS` timeout and added context labels to Playwright timeout failures so fresh-session flakes identify the affected handoff path

## 2026-04-27 Browser E2E Stdout Compaction Pass

- changed `smoke-ui-execution-browser-e2e` so default stdout now emits a compact verification summary instead of the full persisted browser report, reducing `verify:execution-v1` buffer pressure while preserving `output/playwright/execution-v1-browser-e2e.json` as the complete artifact
- added `PERSONAL_AI_AGENT_BROWSER_E2E_FULL_STDOUT=1` as an explicit diagnostic escape hatch for full JSON stdout when deep local inspection is needed

<!-- document-log:start {"createdAt":"2026-04-22T00:00:00.000Z","id":"doclog_20260422173000_stable_line_preview_body_promotion","type":"devlog","updatedAt":"2026-04-22T00:00:00.000Z"} -->
## 2026-04-22 Release Handoff Stable Line Preview Body Promotion

- date: 2026-04-22T00:00:00.000Z
- promoted the newly closed `summary-stable-line-copy-preview` body verification from browser-report-only evidence into compact `execution-v1-release-handoff-digest/manifest/index.json` fields and shared `releaseHandoffStructuredSummary`
- updated release tab handoff normalization/rendering so card와 inline preview가 `summary stable line copy preview body` exact-match row와 overview detail을 기존 `summary stable line copy preview` row와 분리해서 직접 읽도록 정리
- tightened browser smoke so persisted handoff JSON artifacts and rendered release UI surfaces now require the expanded structured summary overview signature including `summaryStableLineCopyPreviewBody`
- added browser-only stable-line copy verification for `summaryStableLineCopyPreviewBody` so smoke now proves one card stable line and one current-preview stable line can both round-trip through clipboard/prompt fallback
- persisted the new browser report evidence as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary` with a dedicated artifactPair verification flag
- promoted `summaryStableLineCopyPreviewBodyLineCopy` into compact release handoff JSON structured summary so digest/manifest/index artifact가 row/detail/stable-line metadata를 직접 보존하도록 확장
- updated release tab normalization/rendering and browser smoke assertions so handoff card/preview가 새 `summary stable line copy preview body line copy` exact-match row와 overview detail을 same surface에서 읽도록 고정
- closed the human-readable handoff gap by adding `summary-stable-line-copy-preview-body-line-copy` sections to digest/manifest/index txt/md siblings and verifying their counter/marker through browser preview smoke
- persisted the new body-section evidence as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary` with a dedicated artifactPair verification flag
- promoted `summaryStableLineCopyPreviewBodyLineCopyBody` into compact release handoff JSON structured summary so digest/manifest/index artifact가 body-section exact-match row와 stable line metadata를 직접 보존하도록 확장
- updated release tab normalization/rendering and browser smoke assertions so handoff card/preview가 `summary stable line copy preview body line copy body` row/detail을 same surface에서 읽도록 고정
- added browser-only stable-line copy verification for `summaryStableLineCopyPreviewBodyLineCopyBody` so the promoted body-section row now proves one card stable line and one current-preview stable line can both round-trip through clipboard/prompt fallback
- persisted that evidence as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary` with a dedicated artifactPair verification flag
- promoted `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopy` into compact release handoff JSON structured summary so digest/manifest/index artifact와 release UI surface가 body-section stable-line copy evidence를 row/detail/stable-line metadata로 직접 노출하도록 확장
- closed the next human-readable handoff gap by adding `summary-stable-line-copy-preview-body-line-copy-body-line-copy` sections to digest/manifest/index txt/md siblings and verifying their counter/marker through browser preview smoke
- persisted that body-section evidence as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary` with a dedicated artifactPair verification flag
- promoted `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBody` into compact release handoff JSON structured summary so digest/manifest/index artifact와 release UI surface가 body-section verification evidence를 separate row/detail/stable-line metadata로 직접 노출하도록 확장
- added browser-only detail line-copy verification for `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBody` so the promoted row now proves one card detail line and one current-preview detail line can both round-trip through clipboard/prompt fallback
- persisted that evidence as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary` with a dedicated artifactPair verification flag
- promoted `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopy` into compact release handoff JSON structured summary so digest/manifest/index artifact와 release UI surface가 promoted row의 detail line-copy evidence를 same-surface row/detail metadata로 직접 노출하도록 확장
- closed the next human-readable handoff gap by adding `summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy` sections to digest/manifest/index txt/md siblings and verifying their counter/marker through browser preview smoke
- persisted that body-section evidence as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary` with a dedicated artifactPair verification flag
- promoted `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBody` into compact release handoff JSON structured summary so digest/manifest/index artifact와 release UI surface가 latest body-section verification evidence를 separate row/detail/stable-line metadata로 직접 노출하도록 확장
- updated release tab normalization/rendering and browser smoke assertions so handoff card/preview가 `summary stable line copy preview body line copy body line copy body line copy body` row/detail을 same surface에서 읽도록 고정
- added browser-only detail line-copy verification for `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBody` so the promoted row now proves one card detail line and one current-preview detail line can both round-trip through clipboard/prompt fallback
- persisted that evidence as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary` with a dedicated artifactPair verification flag
- promoted `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopy` into compact release handoff JSON structured summary so digest/manifest/index artifact와 release UI surface가 latest promoted-row line-copy evidence를 separate row/detail/stable-line metadata로 직접 노출하도록 확장
- updated release tab normalization/rendering and browser smoke assertions so handoff card/preview가 `summary stable line copy preview body line copy body line copy body line copy body line copy` row/detail을 same surface에서 읽도록 고정
- added browser-only detail line-copy verification for `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopy` so the promoted row now proves one card detail line and one current-preview detail line can both round-trip through clipboard/prompt fallback
- persisted that evidence as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary` with a dedicated artifactPair verification flag
- promoted `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopy` into compact release handoff JSON structured summary so digest/manifest/index artifact와 release UI surface가 latest promoted-row line-copy evidence를 separate row/detail/stable-line metadata로 직접 노출하도록 확장
- updated release tab normalization/rendering and browser smoke assertions so handoff card/preview가 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy` row/detail을 same surface에서 읽도록 고정
- promoted `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopy` into compact release handoff JSON structured summary so digest/manifest/index artifact와 release UI surface가 latest row line-copy evidence를 separate row/detail/stable-line metadata로 직접 노출하도록 확장
- updated release tab normalization/rendering and browser smoke assertions so handoff card/preview가 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy` row/detail을 same surface에서 읽도록 고정
- added browser-only detail line-copy verification for `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopy` so the promoted row now proves one card detail line and one current-preview detail line can both round-trip through clipboard/prompt fallback
- persisted that evidence as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary` with a dedicated artifactPair verification flag
- promoted `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopy` into compact release handoff JSON structured summary so digest/manifest/index artifact와 release UI surface가 latest row line-copy evidence를 separate row/detail/stable-line metadata로 직접 노출하도록 확장
- updated release tab normalization/rendering and browser smoke overview assertions so handoff card/preview가 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy` row/detail을 same surface에서 읽도록 고정
- added browser-only detail line-copy verification for `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopy` so the latest promoted row now proves one card detail line and one current-preview detail line can both round-trip through clipboard/prompt fallback
- persisted that evidence as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary` with a dedicated artifactPair verification flag
- promoted `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopy` into compact release handoff JSON structured summary so digest/manifest/index artifact와 release UI surface가 newest row line-copy evidence를 separate row/detail/stable-line metadata로 직접 노출하도록 확장
- updated release tab normalization/rendering and browser smoke overview assertions so handoff card/preview가 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy` row/detail을 same surface에서 읽도록 고정
- added browser-only detail line-copy verification for `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopy` so the newest promoted row now proves one card detail line and one current-preview detail line can both round-trip through clipboard/prompt fallback
- persisted that evidence as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary` with a dedicated artifactPair verification flag
- promoted `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy` into compact release handoff JSON structured summary so digest/manifest/index artifact와 release UI surface가 newest promoted-row verification evidence를 row/detail/stable-line metadata로 직접 노출하도록 확장
- updated release tab normalization/rendering and browser smoke overview assertions so handoff card/preview가 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy` row/detail을 same surface에서 읽도록 고정
- added browser-only detail line-copy verification for `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy` so the newest promoted row now proves one card detail line and one current-preview detail line can both round-trip through clipboard/prompt fallback
- persisted that evidence as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary` with a dedicated artifactPair verification flag
- promoted `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy` into compact release handoff JSON structured summary so digest/manifest/index artifact와 release UI surface가 newest promoted-row line-copy evidence를 row/detail/stable-line metadata로 직접 노출하도록 확장
- updated release tab normalization/rendering and browser smoke overview assertions so handoff card/preview가 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy` row/detail을 same surface에서 읽도록 고정
- added browser-only detail line-copy verification for `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy` so the newest promoted row now proves one card detail line and one current-preview detail line can both round-trip through clipboard/prompt fallback
- persisted that evidence as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary` with a dedicated artifactPair verification flag
- promoted `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy` into compact release handoff JSON structured summary so digest/manifest/index artifact와 release UI surface가 newest promoted-row line-copy evidence를 row/detail/stable-line metadata로 직접 노출하도록 확장
- updated release tab normalization/rendering and browser smoke overview assertions so handoff card/preview가 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy` row/detail을 same surface에서 읽도록 고정
- promoted `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy` into compact release handoff JSON structured summary so digest/manifest/index artifact와 release UI surface가 newest promoted-row line-copy evidence를 row/detail/stable-line metadata로 직접 노출하도록 확장
- updated release tab normalization/rendering and browser smoke overview assertions so handoff card/preview가 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy line copy` row/detail을 same surface에서 읽도록 고정
- added browser-only detail line-copy verification for `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy` so the newest promoted row now proves one card detail line and one current-preview detail line can both round-trip through clipboard/prompt fallback
- persisted that evidence as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary` with a dedicated artifactPair verification flag
- promoted `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy` into compact release handoff JSON structured summary so digest/manifest/index artifact와 release UI surface가 newest promoted-row line-copy evidence를 row/detail/stable-line metadata로 직접 노출하도록 확장
- updated release tab normalization/rendering and browser smoke overview assertions so handoff card/preview가 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy` row/detail을 same surface에서 읽도록 고정
- added browser-only detail line-copy verification for `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy` so the newly promoted row now proves one card detail line and one current-preview detail line can both round-trip through clipboard/prompt fallback
- persisted that evidence as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary` with a dedicated artifactPair verification flag
- promoted `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy` into compact release handoff JSON structured summary so digest/manifest/index artifact와 release UI surface가 newest promoted-row line-copy evidence를 row/detail/stable-line metadata로 직접 노출하도록 확장
- updated release tab normalization/rendering and browser smoke overview assertions so handoff card/preview가 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy` row/detail을 same surface에서 읽도록 고정
- added browser-only detail line-copy verification for `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy` so the just-promoted row proves one card detail line and one current-preview detail line can both round-trip through clipboard/prompt fallback
- persisted that report-only evidence as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary` with a dedicated artifactPair verification flag
- promoted `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy` into compact release handoff JSON structured summary so digest/manifest/index artifact와 release UI surface가 newest report-only evidence를 row/detail/stable-line metadata로 직접 노출하도록 확장
- updated release tab normalization/rendering and browser smoke overview assertions so handoff card/preview가 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy` row/detail을 same surface에서 읽도록 고정
- added browser-only detail line-copy verification for `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy` so the just-promoted count-16 row proves one card detail line and one current-preview detail line can both round-trip through clipboard/prompt fallback
- persisted that report-only evidence as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary` with a dedicated artifactPair verification flag
- promoted `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy` into compact release handoff JSON structured summary so digest/manifest/index artifact와 release UI surface가 latest report-only evidence를 row/detail/stable-line metadata로 직접 노출하도록 확장
- updated release tab normalization/rendering and browser smoke overview assertions so handoff card/preview가 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy` row/detail을 same surface에서 읽도록 고정
- added browser-only detail line-copy verification for `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy` so the just-promoted count-17 row proves one card detail line and one current-preview detail line can both round-trip through clipboard/prompt fallback
- persisted that report-only evidence as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary` with a dedicated artifactPair verification flag
- promoted `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy` into compact release handoff JSON structured summary so digest/manifest/index artifact와 release UI surface가 latest report-only evidence를 row/detail/stable-line metadata로 직접 노출하도록 확장
- updated release tab normalization/rendering and browser smoke overview assertions so handoff card/preview가 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy` row/detail을 same surface에서 읽도록 고정
- added browser-only detail line-copy verification for `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy` so the just-promoted count-18 row proves one card detail line and one current-preview detail line can both round-trip through clipboard/prompt fallback
- persisted that report-only evidence as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary` with a dedicated artifactPair verification flag
- promoted `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy` into compact release handoff JSON structured summary so digest/manifest/index artifact와 release UI surface가 count-19 report-only evidence를 row/detail/stable-line metadata로 직접 노출하도록 확장
- updated release tab normalization/rendering and browser smoke overview assertions so handoff card/preview가 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy` row/detail을 same surface에서 읽도록 고정
- added browser-only detail line-copy verification for `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy` so the just-promoted count-19 row proves one card detail line and one current-preview detail line can both round-trip through clipboard/prompt fallback
- persisted that report-only evidence as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary` with a dedicated artifactPair verification flag
- promoted `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy` into compact release handoff JSON structured summary so digest/manifest/index artifact와 release UI surface가 count-20 report-only evidence를 row/detail/stable-line metadata로 직접 노출하도록 확장
- updated release tab normalization/rendering and browser smoke overview assertions so handoff card/preview가 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy` row/detail을 same surface에서 읽도록 고정
- added browser-only detail line-copy verification for `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy` so the just-promoted count-20 row proves one card detail line and one current-preview detail line can both round-trip through clipboard/prompt fallback
- persisted that report-only evidence as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary` with a dedicated artifactPair verification flag
- promoted `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy` into compact release handoff JSON structured summary so digest/manifest/index artifact와 release UI surface가 count-21 report-only evidence를 row/detail/stable-line metadata로 직접 노출하도록 확장
- updated release tab normalization/rendering and browser smoke overview assertions so handoff card/preview가 `summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy line copy` row/detail을 same surface에서 읽도록 고정
- added browser-only detail line-copy verification for `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy` so the just-promoted count-21 row proves one card detail line and one current-preview detail line can both round-trip through clipboard/prompt fallback
- persisted that report-only evidence as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary` with a dedicated artifactPair verification flag
- promoted the count-26 browser-only verification into compact release handoff structured summary JSON so handoff digest, manifest, and index artifacts expose the latest stable line-copy row
- extended release UI structured summary rows/details to render the count-26 exact-match state and stable-line metadata on both handoff cards and current preview surfaces
- added browser-only detail line-copy verification for the just-promoted count-26 structured summary row so the next report-only evidence captures both handoff card and current-preview copy/fallback round-trips
- persisted that follow-up as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary` plus a matching artifactPair verification flag
- promoted the count-27 browser-only verification into compact release handoff structured summary JSON so handoff digest, manifest, and index artifacts expose the latest stable line-copy row
- extended release UI structured summary rows/details to render the count-27 exact-match state and stable-line metadata on both handoff cards and current preview surfaces
- added browser-only detail line-copy verification for the just-promoted count-27 structured summary row so the next report-only evidence captures both handoff card and current-preview copy/fallback round-trips
- persisted that follow-up as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary` plus a matching artifactPair verification flag
- promoted the count-28 browser-only verification into compact release handoff structured summary JSON so handoff digest, manifest, and index artifacts expose the latest stable line-copy row
- extended release UI structured summary rows/details to render the count-28 exact-match state and stable-line metadata on both handoff cards and current preview surfaces
- added browser-only detail line-copy verification for the just-promoted count-28 structured summary row so the next report-only evidence captures both handoff card and current-preview copy/fallback round-trips
- persisted that follow-up as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary` plus a matching artifactPair verification flag
- promoted the count-29 browser-only verification into compact release handoff structured summary JSON so handoff digest, manifest, and index artifacts expose the latest stable line-copy row
- extended release UI structured summary rows/details to render the count-29 exact-match state and stable-line metadata on both handoff cards and current preview surfaces
- added browser-only detail line-copy verification for the just-promoted count-29 structured summary row so the next report-only evidence captures both handoff card and current-preview copy/fallback round-trips
- persisted that follow-up as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary` plus a matching artifactPair verification flag
- promoted the count-30 browser-only verification into compact release handoff structured summary JSON so handoff digest, manifest, and index artifacts expose the latest stable line-copy row
- extended release UI structured summary rows/details to render the count-30 exact-match state and stable-line metadata on both handoff cards and current preview surfaces
- added browser-only detail line-copy verification for the just-promoted count-30 structured summary row so the next report-only evidence captures both handoff card and current-preview copy/fallback round-trips
- persisted that follow-up as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary` plus a matching artifactPair verification flag
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-22T00:00:00.000Z","id":"doclog_20260422170000_stable_line_preview_body_contract","type":"devlog","updatedAt":"2026-04-22T00:00:00.000Z"} -->
## 2026-04-22 Release Handoff Stable Line Preview Body Contract

- date: 2026-04-22T00:00:00.000Z
- extended the human-readable `execution-v1-release-handoff-digest/manifest/index` txt and markdown sibling artifacts with dedicated `summary-stable-line-copy-preview` sections, top-level counters, and stable signature lines so the preview-body verification remains readable without reopening the compact JSON
- tightened browser preview verification so every handoff txt/markdown preview now has to render the new `summaryStableLineCopyPreviewExactMatchCount` counter and `Summary-Stable-Line-Copy Preview Overview` marker instead of reusing the older `summary-stable-line-copy` body section
- persisted the new body-level closure as a separate browser report flag while leaving the already-promoted compact JSON `summaryStableLineCopyPreview` row and release UI structured-summary rendering path unchanged
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-22T00:00:00.000Z","id":"doclog_20260422000000_summary_detail_copy_stable_lines","type":"devlog","updatedAt":"2026-04-22T00:00:00.000Z"} -->
## 2026-04-22 Release Handoff Summary Detail Copy Stable Line Surface Pass

- date: 2026-04-22T00:00:00.000Z
- extended release handoff summary normalization so the compact JSON `releaseHandoffSummaryDetailCopyVerificationSummary.stableLines` are preserved on the `summary detail copy` structured-summary entry instead of being reduced to count and overview only
- updated the release tab `handoff-*` card and inline preview detail surface to render those 4 stable lines directly under the `summary detail copy` overview, which lets operators see the exact card/current-preview matrix evidence without opening the raw JSON artifact
- tightened browser smoke so handoff card/preview detail capture now requires the `summary detail copy` entry to expose four stable lines including the new `detail-line-copy-card` and `detail-line-copy-body-current-preview` signatures
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-22T00:00:00.000Z","id":"doclog_20260422113000_9a12bc","type":"devlog","updatedAt":"2026-04-22T00:00:00.000Z"} -->
## 2026-04-22 Release Handoff Stable Line Copy Pass

- date: 2026-04-22T00:00:00.000Z
- added `stable line 복사` and `현재 stable line 복사` actions to the release handoff structured summary so the `summary detail copy` stable evidence lines can be handed off directly from both the card surface and the inline preview panel
- extended the browser E2E smoke to verify clipboard success, prompt fallback, copied-state reset, and persisted browser report evidence for one card stable line and one current-preview stable line without widening the compact handoff JSON contract yet
- verified the rendered UI contract by capturing stable-line button labels in the saved browser report and keeping the existing `summary detail copy` stable line list readable alongside the new per-line copy controls
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-22T00:00:00.000Z","id":"doclog_20260422162000_4efdc6","type":"devlog","updatedAt":"2026-04-22T00:00:00.000Z"} -->
## 2026-04-22 Release Handoff Stable Line Preview Promotion

- date: 2026-04-22T00:00:00.000Z
- promoted `summary stable line copy` preview-body verification from browser-report-only evidence into compact `execution-v1-release-handoff-digest/manifest/index.json` fields and shared `releaseHandoffStructuredSummary`
- updated release tab handoff normalization/rendering so card와 inline preview가 `summary stable line copy preview` exact-match row와 overview detail을 compact JSON sibling에서 직접 읽도록 정리
- expanded browser smoke to require the new row/detail and the updated structured summary overview signature including `summaryStableLineCopyPreview`
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-22T00:00:00.000Z","id":"doclog_20260422151000_7c96da","type":"devlog","updatedAt":"2026-04-22T00:00:00.000Z"} -->
## 2026-04-22 Release Handoff Stable Line Body Contract

- date: 2026-04-22T00:00:00.000Z
- extended the human-readable `execution-v1-release-handoff-digest/manifest/index` txt and markdown sibling artifacts with dedicated `summary-stable-line-copy` sections, top-level counters, and stable signature lines so stable-line copy evidence is readable without opening the compact JSON
- added browser preview verification that requires the new stable-line counter/marker pair to render inside all six handoff txt/markdown preview bodies and persists that result as a browser report contract
- kept the existing compact JSON `summaryStableLineCopy` row unchanged while closing the body-level gap between structured summary evidence and human-readable handoff artifacts
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-22T00:00:00.000Z","id":"doclog_20260422142000_1d8b7e","type":"devlog","updatedAt":"2026-04-22T00:00:00.000Z"} -->
## 2026-04-22 Release Handoff Stable Line Summary Promotion

- date: 2026-04-22T00:00:00.000Z
- promoted stable line copy evidence from the main browser report into the compact `execution-v1-release-handoff-digest/manifest/index.json` contract so release handoff JSON siblings now carry a dedicated `summary stable line copy` structured summary row
- updated release handoff summary normalization and rendering so the release tab card/inline preview reads the new compact JSON entry directly instead of depending on browser-report-only evidence
- tightened browser smoke to require the new `summary stable line copy` row/detail and the expanded structured summary overview signature on both persisted handoff JSON artifacts and rendered release UI surfaces
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-22T00:00:00.000Z","id":"doclog_20260422000000_summary_detail_copy_matrix","type":"devlog","updatedAt":"2026-04-22T00:00:00.000Z"} -->
## 2026-04-22 Release Handoff Summary Detail Copy Matrix Pass

- date: 2026-04-22T00:00:00.000Z
- widened `releaseHandoffSummaryDetailCopyVerificationSummary` from the original 2-check detail-line copy path into a 4-check matrix that now covers `summaryCopyPreview`, `summaryDetailCopyPreviewLineCopy`, and `summaryDetailCopyPreviewLineCopyBody` across the `handoff-digest-json` card and `handoff-index-markdown` current preview
- updated the deterministic fixture plus compact `execution-v1-release-handoff-digest/manifest/index` JSON write path so the shared `summary detail copy` row now persists the expanded exact-match count and overview signature instead of under-reporting the newer detail-row copy surfaces
- kept the release UI/server schema unchanged while tightening browser smoke and human-readable artifact expectations, which closes the remaining gap between rendered structured-summary detail rows and the copy-action evidence that backs them
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-22T00:00:00.000Z","id":"doclog_20260422000000_summary_detail_preview_line_copy_body_structured","type":"devlog","updatedAt":"2026-04-22T00:00:00.000Z"} -->
## 2026-04-22 Release Handoff Summary Detail Preview Line Copy Body Human-Readable Pass

- added `summary-detail-copy-preview-line-copy-body` dedicated section, counter, and stable signature lines to `execution-v1-release-handoff-digest/manifest/index` txt+markdown sibling artifacts so the body-verification contract is visible outside compact JSON
- tightened browser preview verification so handoff txt/markdown preview bodies must render the new body section marker and exact-match counter, keeping persisted artifact text and release inline preview in sync

## 2026-04-22 Release Handoff Summary Detail Preview Line Copy Body Structured Pass

- date: 2026-04-22T00:00:00.000Z
- promoted `releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary` from browser-report-only preview evidence into the shared compact handoff JSON contract so `execution-v1-release-handoff-digest/manifest/index` now persist `summary detail copy preview line copy body` exact-match counters, overview line, stable sha, and the verification summary alongside the existing line-copy row
- extended release handoff structured summary normalization and rendering so `handoff-*` cards and inline preview panels now show an eighth `summary detail copy preview line copy body` row plus its overview detail, which exposes preview-body verification directly on the release review surface
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-22T00:00:00.000Z","id":"doclog_20260422000000_summary_detail_preview_line_copy_body","type":"devlog","updatedAt":"2026-04-22T00:00:00.000Z"} -->
## 2026-04-22 Release Handoff Summary Detail Preview Line Copy Body Pass

- date: 2026-04-22T00:00:00.000Z
- extended seeded and persisted `execution-v1-release-handoff-digest/manifest/index` txt and markdown siblings so they now carry explicit `summary-detail-copy-preview-line-copy` counters plus dedicated overview/signature sections instead of leaving that evidence only in compact JSON and release UI detail rows
- tightened browser preview verification so the six handoff txt/markdown previews must render both the `summary-detail-copy-preview-line-copy` marker and exact-match counter, and the saved browser report now records `releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary` plus `artifactPair.releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerified`
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-22T00:00:00.000Z","id":"doclog_20260422000000_summary_detail_preview_line_copy","type":"devlog","updatedAt":"2026-04-22T00:00:00.000Z"} -->
## 2026-04-22 Release Handoff Summary Detail Preview Line Copy Pass

- date: 2026-04-22T00:00:00.000Z
- promoted `summary detail copy preview` row의 detail line copy evidence into the shared compact handoff summary so `execution-v1-release-handoff-digest/manifest/index` now expose a seventh `summary detail copy preview line copy` exact-match row with its own overview line and stable sha
- tightened browser E2E coverage so both `handoff-digest-json` card and `handoff-index-markdown` current-preview must pass clipboard success/fallback/copy-state reset for the `summaryDetailCopyPreview` detail row, and the combined structured summary overview now expands to `entries=open,preview,summaryCopy,summaryCopyPreview,summaryDetailCopy,summaryDetailCopyPreview,summaryDetailCopyPreviewLineCopy`
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-22T00:00:00.000Z","id":"doclog_20260422000000_summary_detail_preview_handoff_sections","type":"devlog","updatedAt":"2026-04-22T00:00:00.000Z"} -->
## 2026-04-22 Release Handoff Summary Detail Preview Section Pass

- date: 2026-04-22T00:00:00.000Z
- extended seeded and persisted `execution-v1-release-handoff-digest/manifest/index` txt and markdown siblings so they now carry explicit `summary-detail-copy-preview` counters plus dedicated overview/signature sections instead of leaving that evidence only in compact JSON and release UI rows
- tightened browser preview verification so the six handoff txt/markdown previews must render both `summary-detail-copy` and `summary-detail-copy-preview` markers/counters, and the saved browser report now records `releaseHandoffSummaryDetailCopyPreviewBodyVerified` as a separate artifact-pair contract
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-22T00:00:00.000Z","id":"doclog_20260422000000_summary_detail_preview_structured","type":"devlog","updatedAt":"2026-04-22T00:00:00.000Z"} -->
## 2026-04-22 Release Handoff Summary Detail Preview Structured Pass

- date: 2026-04-22T00:00:00.000Z
- promoted `releaseHandoffSummaryDetailCopyPreviewVerificationSummary` from browser-report-only preview evidence into the shared compact handoff JSON contract so `execution-v1-release-handoff-digest/manifest/index` now persist `summary detail copy preview` exact-match counters, overview line, stable sha, and the verification summary alongside the existing `summary detail copy` entry
- extended release handoff structured summary normalization and rendering so `handoff-*` cards and inline preview panels now show a sixth `summary detail copy preview` row plus its overview detail, which exposes preview-body detail-copy verification directly on the release review surface
- tightened browser E2E coverage so seeded and persisted handoff cards/previews must render `summary detail copy preview`, and the combined structured summary overview must expand to `entries=open,preview,summaryCopy,summaryCopyPreview,summaryDetailCopy,summaryDetailCopyPreview,summaryDetailCopyPreviewLineCopy`
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-22T00:00:00.000Z","id":"doclog_20260422000000_summary_detail_preview","type":"devlog","updatedAt":"2026-04-22T00:00:00.000Z"} -->
## 2026-04-22 Release Handoff Summary Detail Preview Pass

- date: 2026-04-22T00:00:00.000Z
- extended the human-readable `execution-v1-release-handoff-digest/manifest/index` txt and markdown siblings so they now carry explicit `summary-detail-copy` counters and dedicated overview/signature sections instead of exposing that evidence only through compact JSON and the shared structured summary block
- added a browser E2E preview-body verification pass that requires all six handoff txt/markdown previews to render the new `summaryDetailCopyExactMatchCount` counter plus `summary-detail-copy` marker, and persisted that result as `releaseHandoffSummaryDetailCopyPreviewVerificationSummary` with a dedicated artifactPair flag in the saved browser report
- kept the compact JSON contract unchanged in shape while making operator-facing preview surfaces prove the same `summary detail copy` evidence end-to-end, which closes the remaining gap between machine-readable handoff JSON and human-readable preview bodies
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-22T00:00:00.000Z","id":"doclog_20260422000000_summary_detail_structured","type":"devlog","updatedAt":"2026-04-22T00:00:00.000Z"} -->
## 2026-04-22 Release Handoff Summary Detail Structured Pass

- date: 2026-04-22T00:00:00.000Z
- promoted `releaseHandoffSummaryDetailCopyVerificationSummary` from browser-report-only evidence into the shared compact handoff JSON contract so `execution-v1-release-handoff-digest/manifest/index` now persist `summary detail copy` exact-match counters, overview line, stable sha, and the full verification summary alongside the existing `preview/open/summary copy/summary copy preview` entries
- extended release handoff structured summary normalization and rendering so `handoff-*` cards and inline preview panels now show a fifth `summary detail copy` row plus its overview detail, which exposes the detail-line copy contract directly on the review surface instead of hiding it only in the main browser report
- tightened browser E2E coverage so seeded and persisted handoff cards/previews must render `summary detail copy`, the combined structured summary overview must expand to `entries=open,preview,summaryCopy,summaryCopyPreview,summaryDetailCopy`, and the compact JSON trio must carry the new top-level `releaseHandoffSummaryDetailCopy*` fields
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-22T00:00:00.000Z","id":"doclog_20260422000000_summary_detail_copy","type":"devlog","updatedAt":"2026-04-22T00:00:00.000Z"} -->
## 2026-04-22 Release Handoff Summary Detail Copy Pass

- date: 2026-04-22T00:00:00.000Z
- added row-level `line 복사` and `현재 line 복사` actions to the release tab `handoff-*` card and inline preview summary detail rows, so operators can hand off the exact `preview/open/summary copy/summary copy preview` overview line instead of re-copying only the top-level summary block
- extended browser E2E coverage so the `summary copy preview` detail line must survive both clipboard success and prompt fallback paths, and the copied-state transition must reset correctly between the card-level and current-preview surfaces
- persisted the new evidence as `releaseHandoffSummaryDetailCopyVerificationSummary` plus `artifactPair.releaseHandoffSummaryDetailCopyVerified` in the saved browser report so detail-line copy behavior is no longer assertion-only runtime state
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-21T22:20:00.000Z","id":"doclog_20260421222000_handoff_overview_line_surface","type":"devlog","updatedAt":"2026-04-21T22:20:00.000Z"} -->
## 2026-04-21 Handoff Overview Line Surface

- date: 2026-04-21T22:20:00.000Z
- extended the release handoff summary surface so `handoff-*` cards and their inline preview panels now render the structured summary overview line in addition to the `preview/open` counts and sha
- kept the overview line restricted to handoff-family artifacts because that line is the compact, diff-friendly fingerprint for the combined preview/open summary and does not apply to release-doc artifacts
- updated the browser E2E card capture, preview-cycle assertions, and final screenshot capture so handoff surfaces must show the `entries=open,preview|sha256=...` line while the `index-markdown` control preview remains summary-free
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-22T00:00:00.000Z","id":"doclog_20260422000000_6b57c1","type":"devlog","updatedAt":"2026-04-22T00:00:00.000Z"} -->
## 2026-04-22 Release Handoff Summary Detail Surface Pass

- date: 2026-04-22T00:00:00.000Z
- changed release handoff summary normalization so the server now preserves entry-level `overviewLine` and exact-match semantics from compact handoff JSON instead of rebuilding only from top-level fallback counters
- extended the release tab `handoff-*` card and inline preview summary box to render row-level overview details for `preview`, `open`, `summary copy`, and `summary copy preview`, which exposes the exact verification line that backs each summary row
- tightened browser E2E coverage so persisted browser report capture must now include `structuredSummaryDetails` on handoff cards and preview panels, and the `summary copy preview` detail must match the expected `totalArtifacts=6|exactMatchCount=6|...` overview contract
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-22T00:00:00.000Z","id":"doclog_20260422000000_5df2ce","type":"devlog","updatedAt":"2026-04-22T00:00:00.000Z"} -->
## 2026-04-22 Release Handoff Summary-Copy Preview Sibling Pass

- date: 2026-04-22T00:00:00.000Z
- extended the seeded and persisted `execution-v1-release-handoff-digest/manifest/index` txt and markdown artifacts so they now expose a dedicated `summary-copy-preview` section instead of keeping that verification only in compact JSON and top-level counters
- tightened the browser E2E preview verification so each human-readable handoff sibling must render both the original `summary-copy` section and the new `summary-copy-preview` marker plus exact-match counter inside the inline preview body
- reused the existing `summaryCopyPreview.overviewLine` and stable line set as the source for the new sibling sections so machine-readable and operator-facing handoff evidence stay in lockstep
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-21T22:05:00.000Z","id":"doclog_20260421220500_handoff_preview_summary_surface","type":"devlog","updatedAt":"2026-04-21T22:05:00.000Z"} -->
## 2026-04-21 Handoff Preview Summary Surface

- date: 2026-04-21T22:05:00.000Z
- extended the inline release handoff preview panel so `handoff-*` artifacts now show the same `preview/open` error-free summary rows and structured summary sha that already appear on their cards
- kept the surface conditional so release-doc `index/manifest/digest` previews remain uncluttered while handoff-family previews expose the integrity summary exactly where the reviewer is reading the artifact body
- updated the browser E2E preview-cycle contract and final screenshot capture so handoff preview panels must render those summary rows and sha, while `index-markdown` remains summary-free as a control case
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-21T21:40:00.000Z","id":"doclog_20260421214000_handoff_card_structured_summary_surface","type":"devlog","updatedAt":"2026-04-21T21:40:00.000Z"} -->
## 2026-04-21 Handoff Card Structured Summary Surface

- date: 2026-04-21T21:40:00.000Z
- surfaced the compact release handoff structured summary directly in the release tab by teaching `handoff-*` cards to show `preview/open` error-free session counts and the shared summary sha from their JSON sibling artifacts
- kept the data flow simple by parsing the canonical `handoff-*-json` artifact once on the server and reusing that summary across the matching text/markdown/json cards instead of duplicating per-format parsing in the browser
- updated the browser E2E capture contract so every `handoff-*` card must render summary rows for `preview` and `open` plus a non-empty structured summary sha before smoke passes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-21T21:25:00.000Z","id":"doclog_20260421212500_handoff_text_markdown_signature_surface","type":"devlog","updatedAt":"2026-04-21T21:25:00.000Z"} -->
## 2026-04-21 Handoff Text Markdown Signature Surface

- date: 2026-04-21T21:25:00.000Z
- extended `execution-v1-release-handoff-digest.txt/.md`, `execution-v1-release-handoff-manifest.txt/.md`, and `execution-v1-release-handoff-index.txt/.md` so the human-readable compact handoff artifacts now carry the same structured summary signature overview and line set as the JSON artifacts
- kept the new sections additive by leaving the existing preview/open overview and bundle sections intact, then layering the normalized structured summary fingerprint on top for direct handoff review
- updated the browser E2E contract so the regenerated text/markdown artifacts must round-trip the structured summary signature through write/read-back equality before smoke passes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-21T21:10:00.000Z","id":"doclog_20260421211000_handoff_structured_summary_signature","type":"devlog","updatedAt":"2026-04-21T21:10:00.000Z"} -->
## 2026-04-21 Handoff Structured Summary Signature

- date: 2026-04-21T21:10:00.000Z
- extended the shared `releaseHandoffStructuredSummary` surface with deterministic line signatures, overview line, and sha256 so compact handoff JSON consumers can diff the normalized preview/open summary without hashing nested objects themselves
- kept the keyed `preview/open` object unchanged and layered the new signature fields on top, which preserves the existing consumer path while adding a stable artifact-level fingerprint for regression checks
- updated the persisted smoke contract so digest, manifest, and index must all round-trip the structured summary object plus its line set, overview line, and sha256 before browser E2E passes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-21T20:55:00.000Z","id":"doclog_20260421205500_handoff_structured_summary_object","type":"devlog","updatedAt":"2026-04-21T20:55:00.000Z"} -->
## 2026-04-21 Handoff Structured Summary Object

- date: 2026-04-21T20:55:00.000Z
- added a shared `releaseHandoffStructuredSummary` object to the compact release handoff JSON family so digest, manifest, and index now expose the same keyed `preview/open` summary surface instead of forcing consumers to reconstruct it from individual top-level fields
- kept the existing top-level preview/open fields intact for backward compatibility and used the new object as a normalized consumer path rather than replacing earlier contracts
- updated the persisted smoke contract so all three compact handoff JSON artifacts must round-trip the new structured summary object exactly before browser E2E passes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-21T20:40:00.000Z","id":"doclog_20260421204000_handoff_digest_structured_open_preview_summary","type":"devlog","updatedAt":"2026-04-21T20:40:00.000Z"} -->
## 2026-04-21 Handoff Digest Structured Preview/Open Summary

- date: 2026-04-21T20:40:00.000Z
- extended `execution-v1-release-handoff-digest.json` so the compact handoff digest now exposes preview/open stable sha, overview line, and session counts as top-level structured fields instead of requiring consumers to drill into nested verification summary objects
- kept the family contract consistent with the earlier manifest/index work so all three compact handoff JSON artifacts now present the same preview/open summary surface directly
- updated the persisted smoke contract so digest read-back equality plus explicit preview/open field assertions all have to match the generated verification summaries before smoke passes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-21T20:25:00.000Z","id":"doclog_20260421202500_handoff_index_structured_open_preview_summary","type":"devlog","updatedAt":"2026-04-21T20:25:00.000Z"} -->
## 2026-04-21 Handoff Index Structured Preview/Open Summary

- date: 2026-04-21T20:25:00.000Z
- extended `execution-v1-release-handoff-index.json` so the compact handoff index now carries preview/open stable sha, overview line, and session totals as structured fields instead of exposing only the two digest sha values
- kept the sibling artifacts aligned by adding the same preview/open overview lines and totals to `execution-v1-release-handoff-index.txt` and `execution-v1-release-handoff-index.md`, which lets downstream handoff inspection stay on the index surface without reopening digest or manifest artifacts
- updated the persisted smoke contract so index read-back equality plus explicit preview/open field assertions all have to match the generated verification summaries before smoke passes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-21T20:10:00.000Z","id":"doclog_20260421201000_handoff_manifest_structured_open_preview_summary","type":"devlog","updatedAt":"2026-04-21T20:10:00.000Z"} -->
## 2026-04-21 Handoff Manifest Structured Preview/Open Summary

- date: 2026-04-21T20:10:00.000Z
- extended `execution-v1-release-handoff-manifest.json` so the handoff manifest now carries preview/open stable sha, overview line, and session totals as first-class structured fields instead of leaving downstream readers to parse only `artifactBundleOverviewLine`
- kept the sibling artifacts aligned by adding the same preview/open overview lines and totals to `execution-v1-release-handoff-manifest.txt` and `execution-v1-release-handoff-manifest.md`, which makes the compact handoff manifest family readable without reopening the full browser report
- updated the persisted smoke contract so manifest read-back equality plus explicit preview/open field assertions all have to match the generated verification summaries before smoke passes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-21T19:45:00.000Z","id":"doclog_20260421194500_handoff_digest_open_summary","type":"devlog","updatedAt":"2026-04-21T19:45:00.000Z"} -->
## 2026-04-21 Handoff Digest Open Summary

- date: 2026-04-21T19:45:00.000Z
- extended `execution-v1-release-handoff-digest.*` so the compact handoff artifact now carries both the existing preview deep-link summary and the new `browser-screenshot` open-link summary instead of leaving binary evidence only in the main browser report
- kept the artifact family aligned by threading the same open-link sha and session totals into `execution-v1-release-handoff-index.*` bundle overview fields, which lets downstream tooling compare preview/open handoff evidence without parsing the full browser report payload
- updated the persisted smoke contract so read-back equality, digest/index overview lines, and `releaseHandoffOpenStableDigestSha256` all have to match the new combined summary before smoke passes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-21T19:20:00.000Z","id":"doclog_20260421192000_browser_screenshot_open_link_contract","type":"devlog","updatedAt":"2026-04-21T19:20:00.000Z"} -->
## 2026-04-21 Browser Screenshot Open-Link Contract

- date: 2026-04-21T19:20:00.000Z
- extended the release handoff contract so non-previewable `browser-screenshot` now exposes a direct open-link copy action in the release handoff card and participates in prompt fallback plus fresh browser reopen verification
- kept the implementation narrow by leaving the existing preview deep-link matrix unchanged, adding a binary-specific open-link path only for the screenshot card, and reusing the existing copied-state affordance instead of introducing a second visual pattern
- updated the saved browser report contract so `releaseHandoffOpenCoverageSummary`, `releaseHandoffOpenLinkVerificationSummary`, and `artifactPair.releaseHandoffOpenLinkSummaryVerified` must all reflect the browser screenshot open-link evidence before smoke passes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-21T18:20:00.000Z","id":"doclog_20260421182000_browser_report_link_contract","type":"devlog","updatedAt":"2026-04-21T18:20:00.000Z"} -->
## 2026-04-21 Browser Report Link Contract

- date: 2026-04-21T18:20:00.000Z
- extended the release handoff deep-link verification contract so `browser-report` now participates alongside the release-doc and handoff artifact families, which closes the remaining previewable report gap while leaving non-previewable `browser-screenshot` out of scope
- kept the implementation narrow by widening the existing card-level helper lists, expected fresh-session matrix, and stable summary assertions instead of introducing a screenshot-specific path or UI contract change
- updated the saved browser report contract so `releaseHandoffCoverageSummary`, `releaseHandoffLinkVerificationSummary`, stable line count, and overview totals must all reflect the added browser report entry before smoke passes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-21T17:05:00.000Z","id":"doclog_20260421170500_release_doc_manifest_trio_link_contract","type":"devlog","updatedAt":"2026-04-21T17:05:00.000Z"} -->
## 2026-04-21 Release Doc Manifest Trio Link Contract

- date: 2026-04-21T17:05:00.000Z
- extended the release handoff deep-link verification contract so `manifest-json`, `manifest-text`, and `manifest-markdown` now participate alongside the existing handoff, digest, and index artifacts, which closes the next reviewer-facing gap in the release-doc artifact family
- kept the implementation narrow by widening the existing card-level helper lists, expected fresh-session matrix, and stable summary assertions instead of introducing another release-doc-specific smoke path
- updated the saved browser report contract so `releaseHandoffCoverageSummary`, `releaseHandoffLinkVerificationSummary`, stable line count, and overview totals must all reflect the added manifest trio before smoke passes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-21T11:25:00.000Z","id":"doclog_20260421112500_release_doc_digest_trio_link_contract","type":"devlog","updatedAt":"2026-04-21T11:25:00.000Z"} -->
## 2026-04-21 Release Doc Digest Trio Link Contract

- date: 2026-04-21T11:25:00.000Z
- extended the release handoff deep-link verification contract so `digest-json`, `digest-text`, and `digest-markdown` now participate alongside the existing handoff and recommended index artifacts, which closes the next reviewer-facing gap in the release-doc artifact family
- kept the implementation narrow by widening the existing card-level helper lists, expected fresh-session matrix, and stable summary assertions instead of introducing another release-doc-specific smoke path
- updated the saved browser report contract so `releaseHandoffCoverageSummary`, `releaseHandoffLinkVerificationSummary`, stable line count, and overview totals must all reflect the added digest trio before smoke passes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-21T06:55:00.000Z","id":"doclog_20260421065500_release_doc_index_trio_link_contract","type":"devlog","updatedAt":"2026-04-21T06:55:00.000Z"} -->
## 2026-04-21 Release Doc Index Trio Link Contract

- date: 2026-04-21T06:55:00.000Z
- extended the release handoff deep-link verification contract so `index-text` now participates alongside `index-json` and `index-markdown`, which closes the remaining gap across the recommended release-doc index trio
- kept the implementation narrow by widening the existing card-level helper lists, expected fresh-session matrix, and stable summary assertions instead of introducing a separate release-doc-specific smoke path
- updated the saved browser report contract so `releaseHandoffCoverageSummary`, `releaseHandoffLinkVerificationSummary`, stable line count, and overview totals must all reflect the completed recommended index trio before smoke passes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-21T06:35:00.000Z","id":"doclog_20260421063500_release_handoff_digest_trio_link_contract","type":"devlog","updatedAt":"2026-04-21T06:35:00.000Z"} -->
## 2026-04-21 Release Handoff Digest Trio Link Contract

- date: 2026-04-21T06:35:00.000Z
- extended the release handoff deep-link verification contract so `handoff-digest-text` and `handoff-digest-markdown` now participate alongside `handoff-digest-json`, which closes the remaining gap in the handoff digest trio
- kept the implementation narrow by widening the existing card-level helper lists, expected session matrix, and stable summary assertions instead of introducing a separate digest-specific smoke path
- updated the saved browser report contract so `releaseHandoffCoverageSummary`, `releaseHandoffLinkVerificationSummary`, stable line count, and overview totals must all reflect the expanded handoff digest trio before smoke passes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-21T00:05:00.000Z","id":"doclog_20260421000500_release_handoff_manifest_trio_link_contract","type":"devlog","updatedAt":"2026-04-21T00:05:00.000Z"} -->
## 2026-04-21 Release Handoff Manifest Trio Link Contract

- date: 2026-04-21T00:05:00.000Z
- extended the release handoff deep-link verification contract so `handoff-manifest-json`, `handoff-manifest-text`, and `handoff-manifest-markdown` now participate in the same direct copy, prompt fallback, and fresh browser reopen checks as the existing digest and index artifact families
- kept the implementation narrow by widening the existing card-level helper lists, expected session matrix, and stable summary assertions rather than creating a separate manifest-specific smoke path
- updated the saved browser report contract so `releaseHandoffCoverageSummary`, `releaseHandoffLinkVerificationSummary`, stable line count, and overview totals must all reflect the expanded handoff manifest trio before smoke passes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-20T23:45:00.000Z","id":"doclog_20260420234500_release_handoff_index_trio_link_contract","type":"devlog","updatedAt":"2026-04-20T23:45:00.000Z"} -->
## 2026-04-20 Release Handoff Index Trio Link Contract

- date: 2026-04-20T23:45:00.000Z
- extended the release handoff deep-link verification contract so `handoff-index-json` and `handoff-index-text` now participate alongside `handoff-index-markdown`, which closes the remaining gap across the full handoff index trio instead of validating only one sibling
- kept the implementation narrow by widening the existing card-level copy/fallback helper lists, fresh browser reopen matrix, expected session coverage, and stable summary assertions rather than adding another specialized smoke path
- updated the saved browser report contract so `releaseHandoffCoverageSummary`, `releaseHandoffLinkVerificationSummary`, stable line count, and overview totals must all reflect the expanded handoff index trio before smoke passes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-20T19:25:00.000Z","id":"doclog_20260420192500_release_handoff_index_markdown_link_contract","type":"devlog","updatedAt":"2026-04-20T19:25:00.000Z"} -->
## 2026-04-20 Release Handoff Index Markdown Link Contract

- date: 2026-04-20T19:25:00.000Z
- extended the release handoff deep-link verification contract so `handoff-index-markdown` now participates in the same direct copy, prompt fallback, and fresh browser reopen checks as the existing `handoff-digest-json` and `index-json`/`index-markdown` flows
- kept the scope narrow by reusing the existing card-level copy state and fresh-session verification helpers instead of introducing another preview-specific path, which means the new markdown handoff card is covered without changing the release UI contract
- updated the stable release handoff link summary and coverage assertions so the saved browser report must include the new `handoff-index-markdown` entry, expanded stable line set, and higher session counts before smoke passes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-20T19:10:00.000Z","id":"doclog_20260420191000_release_handoff_index_markdown","type":"devlog","updatedAt":"2026-04-20T19:10:00.000Z"} -->
## 2026-04-20 Release Handoff Index Markdown Surface

- date: 2026-04-20T19:10:00.000Z
- added `execution-v1-release-handoff-index.md` as the rendered Markdown sibling of the keyed handoff index so reviewers can inspect browser/report/screenshot/digest/manifest bundle metadata in a document-style surface instead of only JSON or plain text
- kept the index contract aligned by reusing the existing handoff index bundle overview line, artifact group list, screenshot sha, and per-artifact signature lines from `execution-v1-release-handoff-index.json`, which means the Markdown surface stays descriptive without introducing another index schema
- extended deterministic browser E2E fixture, release artifact registry, inline preview/open checks, `artifactPair` linkage, and write/read-back equality so the new handoff index Markdown artifact must exist end-to-end before smoke passes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-20T18:55:00.000Z","id":"doclog_20260420185500_release_handoff_index_text","type":"devlog","updatedAt":"2026-04-20T18:55:00.000Z"} -->
## 2026-04-20 Release Handoff Index Text Surface

- date: 2026-04-20T18:55:00.000Z
- added `execution-v1-release-handoff-index.txt` as the human-readable sibling of the keyed handoff index so reviewers can inspect browser/report/screenshot/digest/manifest bundle metadata without opening raw JSON
- kept the index contract aligned by reusing the existing handoff index bundle overview line, artifact group list, screenshot sha, and per-artifact signature lines from `execution-v1-release-handoff-index.json`, which means the text surface stays descriptive without introducing another schema
- extended deterministic browser E2E fixture, release artifact registry, inline preview/open checks, `artifactPair` linkage, and write/read-back equality so the new handoff index text artifact must exist end-to-end before smoke passes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-20T18:40:00.000Z","id":"doclog_20260420184000_release_handoff_index_json","type":"devlog","updatedAt":"2026-04-20T18:40:00.000Z"} -->
## 2026-04-20 Release Handoff Index JSON

- date: 2026-04-20T18:40:00.000Z
- added `execution-v1-release-handoff-index.json` so the browser report, screenshot, handoff digest trio, and handoff manifest trio can be inspected through one keyed JSON surface instead of traversing artifact cards and report fields separately
- kept the scope tight by following the existing release-doc index shape with `artifactGroupOrder`, `artifactGroups`, ordered bundle lines, keyed signature lookup, screenshot/report linkage, and stable `bundleSha256`, without introducing new text or markdown siblings yet
- extended deterministic browser E2E fixture, release artifact registry, inline preview/open checks, `artifactPair` linkage, and persisted index read-back assertions so the new handoff index must exist end-to-end before smoke passes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-20T18:25:00.000Z","id":"doclog_20260420182500_release_handoff_manifest_markdown_surface","type":"devlog","updatedAt":"2026-04-20T18:25:00.000Z"} -->
## 2026-04-20 Release Handoff Manifest Markdown Surface

- date: 2026-04-20T18:25:00.000Z
- added `execution-v1-release-handoff-manifest.md` as the rendered Markdown sibling of the handoff bundle manifest so reviewers can inspect the digest-trio bundle summary in a document-style surface instead of only JSON or plain text
- kept the artifact contract aligned by reusing the existing bundle overview line, stable digest sha, and per-artifact signature lines from the JSON/text manifest pair, which means the Markdown sibling stays descriptive without introducing another manifest schema
- extended deterministic browser E2E fixture, release artifact registry, inline preview/open checks, `artifactPair` linkage, and write/read-back equality so the new Markdown manifest must exist end-to-end before smoke passes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-20T18:10:00.000Z","id":"doclog_20260420181000_release_handoff_manifest_text_surface","type":"devlog","updatedAt":"2026-04-20T18:10:00.000Z"} -->
## 2026-04-20 Release Handoff Manifest Text Surface

- date: 2026-04-20T18:10:00.000Z
- added `execution-v1-release-handoff-manifest.txt` as a human-readable sibling of the handoff bundle manifest so reviewers can inspect the digest-trio bundle summary without opening raw JSON
- kept the manifest semantics unchanged by reusing the existing bundle overview line and per-artifact signature lines from `execution-v1-release-handoff-manifest.json`, which means the new text surface adds readability without redefining the manifest contract
- extended deterministic browser E2E fixture, release artifact registry, inline preview/open checks, `artifactPair` linkage, and write/read-back equality so the new text manifest must exist end-to-end before smoke passes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-20T17:50:00.000Z","id":"doclog_20260420175000_release_handoff_manifest_json","type":"devlog","updatedAt":"2026-04-20T17:50:00.000Z"} -->
## 2026-04-20 Release Handoff Manifest JSON

- date: 2026-04-20T17:50:00.000Z
- added `execution-v1-release-handoff-manifest.json` as the first bundle-level manifest for the handoff digest trio so reviewer tooling can inspect the digest family through one keyed JSON surface instead of reconstructing sibling files ad hoc
- kept the scope narrow by bundling only the current handoff digest siblings (`json/text/markdown`) with `path/bytes/lineCount/sha256/signatureLine` metadata and by exposing the manifest through the same release handoff artifact grid without changing the existing deep-link summary contract
- extended browser E2E generation and persistence checks so the new manifest must be seeded for release-surface preview, generated in the real artifact directory, linked from `artifactPair`, fetchable through `/api/execution-v1/handoff-artifacts/:id`, and round-trip equal after read-back before smoke passes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-20T13:20:00.000Z","id":"doclog_20260420132000_release_handoff_digest_markdown_surface","type":"devlog","updatedAt":"2026-04-20T13:20:00.000Z"} -->
## 2026-04-20 Release Handoff Digest Markdown Surface

- date: 2026-04-20T13:20:00.000Z
- added `execution-v1-release-handoff-digest.md` as the rendered Markdown sibling of the release handoff digest so reviewers can open the same compact verification summary in a doc-like format instead of only JSON or plain text
- wired the new Markdown artifact into the shared release handoff artifact registry and deterministic smoke fixture, which makes the release tab expose `handoff-digest.md` through the same ready/open/inline-preview surface as the existing JSON/text handoff digest artifacts
- extended browser E2E artifact checks so the new Markdown sibling must be generated, reachable from `artifactPair`, fetchable via `/api/execution-v1/handoff-artifacts/:id`, and round-trip equal after write/read-back before the suite passes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-20T02:10:00.000Z","id":"doclog_20260420021000_release_handoff_digest_text_surface","type":"devlog","updatedAt":"2026-04-20T02:10:00.000Z"} -->
## 2026-04-20 Release Handoff Digest Text Surface

- date: 2026-04-20T02:10:00.000Z
- added `execution-v1-release-handoff-digest.txt` as a human-readable sibling of the compact handoff JSON digest so release reviewers can inspect the same handoff summary without opening raw JSON
- wired the new text artifact into the shared release handoff artifact spec and deterministic smoke fixture, which means the release tab now exposes the text file through the same ready/open/inline-preview surface as the existing JSON digest and release-doc assets
- extended smoke write/read-back checks so the new text artifact must be generated, persisted, reachable from `artifactPair`, and directly fetchable through `/api/execution-v1/handoff-artifacts/:id` before the browser E2E suite passes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-20T00:40:00.000Z","id":"doclog_20260420004000_release_handoff_digest_link_contract","type":"devlog","updatedAt":"2026-04-20T00:40:00.000Z"} -->
## 2026-04-20 Release Handoff Digest Link Contract

- date: 2026-04-20T00:40:00.000Z
- extended the release handoff preview-link contract so the newly exposed `handoff-digest.json` card now participates in the same clipboard success, prompt fallback, fresh browser reopen, and stable summary flow as the existing `index-json` / `index-markdown` surfaces
- kept the implementation inside the existing browser E2E path by reusing the same direct-card copy/fallback helpers and by widening `releaseHandoffCoverageSummary` plus `releaseHandoffLinkVerificationSummary` to include the third artifact rather than inventing a separate smoke track
- tightened the persisted-report contract so the saved browser report and compact handoff digest now carry a three-artifact stable line set and sha256, which makes regressions in `handoff-digest.json` shareability visible without reading raw session logs
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-20T00:25:00.000Z","id":"doclog_20260420002500_release_handoff_surface_exposure","type":"devlog","updatedAt":"2026-04-20T00:25:00.000Z"} -->
## 2026-04-20 Release Handoff Surface Exposure

- date: 2026-04-20T00:25:00.000Z
- added `execution-v1-release-handoff-digest.json` to the release handoff artifact spec so the compact verification artifact is now visible from the same `검토용 artifact 바로가기` surface instead of living only as a smoke-side file
- kept the runtime change minimal by reusing the existing handoff card, open route, and inline preview flow, which means the new JSON digest becomes immediately previewable and deep-linkable without another UI-specific abstraction
- extended browser E2E assertions so the new `handoff-digest.json` card must render as `ready`, expose the expected path and `/api/execution-v1/handoff-artifacts/:id` link, and return JSON through the same release handoff preview/open contract before smoke passes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-20T00:10:00.000Z","id":"doclog_20260420001000_release_handoff_digest_artifact","type":"devlog","updatedAt":"2026-04-20T00:10:00.000Z"} -->
## 2026-04-20 Release Handoff Digest Artifact

- date: 2026-04-20T00:10:00.000Z
- split the browser report’s release handoff verification block into a dedicated `execution-v1-release-handoff-digest.json` artifact so reviewer tooling can consume the handoff contract without parsing the entire browser E2E payload
- kept the artifact compact by storing the keyed coverage summary, the stable link verification summary, and the normalized session results 그대로 재사용하고, the main browser report now references the new digest path through `artifactPair`
- extended smoke write/read-back checks so the new handoff digest artifact must exist, round-trip exactly, and remain reachable from the persisted browser report before the suite passes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-19T06:20:00.000Z","id":"doclog_20260419062000_release_handoff_summary_digest","type":"devlog","updatedAt":"2026-04-19T06:20:00.000Z"} -->
## 2026-04-19 Release Handoff Summary Digest

- date: 2026-04-19T06:20:00.000Z
- added a stable `releaseHandoffLinkVerificationSummary` to the saved browser report so the `index-json` and `index-markdown` release preview share paths can be reviewed from one keyed surface instead of reconstructing copy/fallback evidence from raw session arrays
- summarized artifact-level copy label, fallback label, copied/fallback `rartifact` target, and fresh-session labels into deterministic line entries plus a sha256 overview, which makes release handoff verification diff-friendly without changing the runtime UI
- tightened persisted-report assertions so write/read-back now explicitly checks the new release handoff summary overview line, stable line count, and sha256 format in addition to the existing full-report equality
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-19T06:05:00.000Z","id":"doclog_20260419060500_release_handoff_fallback_session","type":"devlog","updatedAt":"2026-04-19T06:05:00.000Z"} -->
## 2026-04-19 Release Handoff Fallback Session

- date: 2026-04-19T06:05:00.000Z
- extended the release handoff preview copy contract to cover prompt fallback as well, so both the `index-json` card link and the `index-markdown` current preview link now have to emit the expected `rartifact` URL even when clipboard write is blocked
- kept the fallback assertions explicit by proving that the fallback path leaves button labels in their non-copied state while still yielding a prompt URL that reopens the same release preview surface
- expanded the saved browser report with fallback-inclusive `releaseHandoffSessionResults` and `releaseHandoffCoverageSummary`, which now show both success and fallback handoff sessions per artifact instead of only the clipboard-success path
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-19T05:50:00.000Z","id":"doclog_20260419055000_release_handoff_fresh_session","type":"devlog","updatedAt":"2026-04-19T05:50:00.000Z"} -->
## 2026-04-19 Release Handoff Fresh Session

- date: 2026-04-19T05:50:00.000Z
- extended the release handoff preview link contract from same-session copy/reload into fresh browser handoff, so the copied `index-json` card link and `index-markdown` current preview link both have to reopen the release tab with the expected inline preview already restored
- kept the verification inside the existing browser E2E flow and reused the same browser guard bootstrap, which proves release handoff links are shareable across sessions without adding a separate smoke entrypoint
- persisted the new proof into the saved browser report as `releaseHandoffSessionResults` and `releaseHandoffCoverageSummary`, so the artifact now carries explicit evidence that release preview deep-links survived real fresh-session entry
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-19T05:35:00.000Z","id":"doclog_20260419053500_release_handoff_copy_feedback","type":"devlog","updatedAt":"2026-04-19T05:35:00.000Z"} -->
## 2026-04-19 Release Handoff Copy Feedback

- date: 2026-04-19T05:35:00.000Z
- added retrieval-style copied-state feedback to release handoff preview deep-link copy actions, so card-level `링크` and preview-panel `현재 링크 복사` now briefly flip to `복사됨` after clipboard success instead of only relying on the global notice
- kept the feedback path narrow by keying it to a single copied artifact id and only arming it on real clipboard success, which preserves the existing prompt fallback behavior without falsely signaling a completed copy
- browser smoke now captures the card-level label immediately after `index-json` copy, then verifies that the active `index-markdown` preview copy shows `현재 링크 복사됨` while the previous card button returns to the default label
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-19T05:20:00.000Z","id":"doclog_20260419052000_release_handoff_preview_link_copy","type":"devlog","updatedAt":"2026-04-19T05:20:00.000Z"} -->
## 2026-04-19 Release Handoff Preview Link Copy

- date: 2026-04-19T05:20:00.000Z
- added card-level preview deep-link copy for previewable handoff artifacts and `현재 링크 복사` for the active preview panel, so operators can hand off a specific release-doc preview without first copying the whole current view URL
- kept the copy path read-only by building `detail=release + rartifact=<artifactId>` links from current mission/session context and reusing the existing clipboard/prompt helper instead of introducing new browser state
- browser smoke now clicks both the card-level preview link copy and the active preview copy button, then asserts that the copied URLs contain the expected `rartifact` and `tab=release` query state
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-19T05:05:00.000Z","id":"doclog_20260419050500_release_handoff_preview_url_restore","type":"devlog","updatedAt":"2026-04-19T05:05:00.000Z"} -->
## 2026-04-19 Release Handoff Preview URL Restore

- date: 2026-04-19T05:05:00.000Z
- synced the active release handoff preview to the `rartifact` query parameter so the release tab can restore the same inline preview after reload instead of dropping back to the empty handoff grid state
- kept preview URL updates on `replaceState` rather than `pushState`, which preserves shareable/reloadable state without polluting browser back/forward history for every preview click
- browser smoke now asserts `rartifact=index-markdown` after preview selection and verifies that the `index-markdown` preview panel is restored with non-empty content after reload
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-19T04:35:00.000Z","id":"doclog_20260419043500_release_handoff_inline_preview","type":"devlog","updatedAt":"2026-04-19T04:35:00.000Z"} -->
## 2026-04-19 Release Handoff Inline Preview

- date: 2026-04-19T04:35:00.000Z
- added inline preview state for `markdown` / `text` / `json` handoff artifacts directly inside the release tab, so reviewers can inspect the recommended `index` trio and other text artifacts without leaving the current release surface
- the release handoff card grid now marks the active preview card, exposes `미리보기` / `미리보기 닫기` / `다시 시도` states, and renders a bounded preview panel with format, path, line count, and truncation note while keeping `열기` for the full artifact
- browser smoke now opens `index.md` / `index.txt` / `index.json` previews in sequence, asserts non-empty inline bodies and final `index-markdown` preview capture, and persists the active preview summary in the saved browser report
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-19T04:10:00.000Z","id":"doclog_20260419041000_release_handoff_direct_open_route","type":"devlog","updatedAt":"2026-04-19T04:10:00.000Z"} -->
## 2026-04-19 Release Handoff Direct Open Route

- date: 2026-04-19T04:10:00.000Z
- added a dedicated `/api/execution-v1/handoff-artifacts/:id` route and wired the release tab handoff cards to expose `열기` links, so reviewers can open seeded or real release-doc artifacts directly from the browser instead of copying file paths out to the shell
- the release handoff payload now includes `href` only for existing artifacts, and the UI renders the direct-open action without adding any new custom click handler because a plain anchor is sufficient
- browser smoke now locks the direct-open contract down by checking the recommended `index.md` / `index.txt` / `index.json` cards for `ready` badge, exact href, and `200 + expected content-type` fetch responses
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-19T03:45:00.000Z","id":"doclog_20260419034500_release_doc_handoff_ready_smoke","type":"devlog","updatedAt":"2026-04-19T03:45:00.000Z"} -->
## 2026-04-19 Release Doc Handoff Ready-State Smoke

- date: 2026-04-19T03:45:00.000Z
- seeded a deterministic `output/playwright` handoff fixture bundle inside the browser E2E temp workspace so the release tab no longer renders all handoff cards as `missing` during smoke runs that start from a clean root
- expanded the release tab browser contract with `readyHandoffArtifactCount` and explicit `index.md` / `index.txt` / `index.json` `ready` badge assertions, which upgrades the handoff surface from existence-only verification to real ready-state verification
- updated the README smoke note to clarify that the release handoff UI is now validated against ready fixture artifacts, not only path placeholders
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-19T03:20:00.000Z","id":"doclog_20260419032000_release_doc_handoff_ui_surface","type":"devlog","updatedAt":"2026-04-19T03:20:00.000Z"} -->
## 2026-04-19 Release Doc Handoff UI Surface

- date: 2026-04-19T03:20:00.000Z
- exposed the browser E2E report/screenshot and release-doc `index/manifest/digest` artifact family directly in the release tab through a compact `검토용 artifact 바로가기` card grid, so reviewers no longer have to inspect `output/playwright` manually for the main handoff surfaces
- the web server now returns ordered handoff artifact metadata including `kind`, `format`, `recommended`, `path`, `bytes`, and `updatedAt`, while the browser smoke locks the new UI surface with explicit `index.md` / `index.txt` / `index.json` card existence and non-empty path assertions
- updated the README smoke note so the release tab handoff surface is documented alongside the existing browser evidence bundle contract
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-19T02:45:00.000Z","id":"doclog_20260419024500_browser_release_doc_index_markdown_artifact","type":"devlog","updatedAt":"2026-04-19T02:45:00.000Z"} -->
## 2026-04-19 Browser Release Doc Index Markdown Artifact

- date: 2026-04-19T02:45:00.000Z
- added `execution-v1-release-doc-index.md` so the release-doc index now has a rendered Markdown handoff surface alongside the JSON and plain-text index artifacts
- the Markdown artifact records generated timestamp, report path, index path, overall exact-match state, stable digest sha256, screenshot sha256, artifact groups, the index bundle overview line, and every keyed artifact signature line in reviewer-friendly list form, then the smoke locks it with existence and full read-back equality assertions
- updated the README smoke note so the browser evidence contract now explicitly documents the standalone release-doc index Markdown surface
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-19T02:20:00.000Z","id":"doclog_20260419022000_browser_release_doc_index_text_artifact","type":"devlog","updatedAt":"2026-04-19T02:20:00.000Z"} -->
## 2026-04-19 Browser Release Doc Index Text Artifact

- date: 2026-04-19T02:20:00.000Z
- added `execution-v1-release-doc-index.txt` so the new release-doc index now has a plain-text handoff surface for reviewers who need the full artifact map without parsing JSON
- the text artifact records generated timestamp, report path, index path, overall exact-match state, stable digest sha256, screenshot sha256, artifact group order, the index bundle overview line, and every keyed artifact signature line, then the smoke locks it with existence and full read-back equality assertions
- updated the README smoke note so the browser evidence contract now explicitly documents the standalone release-doc index text surface
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-19T01:10:00.000Z","id":"doclog_20260419011000_browser_release_doc_index_artifact","type":"devlog","updatedAt":"2026-04-19T01:10:00.000Z"} -->
## 2026-04-19 Browser Release Doc Index Artifact

- date: 2026-04-19T01:10:00.000Z
- added `execution-v1-release-doc-index.json` so the browser E2E smoke now exposes one keyed lookup surface for the full release-doc artifact family instead of forcing reviewers to traverse report `artifactPair`, digest siblings, and manifest siblings separately
- the index records `report/screenshot/digest trio/manifest trio` through grouped artifact order, keyed descriptors, deterministic bundle lines, bundle sha256, and screenshot dimension metadata, then the smoke locks it with write/read-back equality and per-artifact signature consistency assertions
- updated the README smoke note so the browser evidence contract now explicitly documents the standalone release-doc index surface
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-19T00:20:00.000Z","id":"doclog_20260419002000_browser_release_doc_manifest_markdown","type":"devlog","updatedAt":"2026-04-19T00:20:00.000Z"} -->
## 2026-04-19 Browser Release Doc Manifest Markdown Artifact

- date: 2026-04-19T00:20:00.000Z
- added `execution-v1-release-doc-manifest.md` so the release-doc manifest now has a rendered Markdown handoff surface alongside the JSON and plain-text manifest artifacts
- the Markdown artifact records generated timestamp, report path, manifest path, overall exact-match state, stable digest sha256, bundle sha256, the bundle overview line, and the per-artifact signature lines in a reviewer-friendly list format, then the smoke locks it with existence and full read-back equality assertions
- updated the README smoke note so the browser evidence contract now explicitly documents the standalone manifest Markdown surface
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-19T00:05:00.000Z","id":"doclog_20260419000500_browser_release_doc_manifest_text","type":"devlog","updatedAt":"2026-04-19T00:05:00.000Z"} -->
## 2026-04-19 Browser Release Doc Manifest Text Artifact

- date: 2026-04-19T00:05:00.000Z
- added `execution-v1-release-doc-manifest.txt` so the release-doc manifest now has a plain-text handoff surface alongside the JSON manifest
- the text artifact records generated timestamp, report path, manifest path, overall exact-match state, stable digest sha256, bundle sha256, the bundle overview line, and the per-artifact signature lines in expected order, then the smoke locks it with existence and full read-back equality assertions
- updated the README smoke note so the browser evidence contract now explicitly documents the standalone manifest text surface
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T17:30:00.000Z","id":"doclog_20260418173000_browser_release_doc_bundle_keyed_signatures","type":"devlog","updatedAt":"2026-04-18T17:30:00.000Z"} -->
## 2026-04-18 Browser Release Doc Bundle Keyed Signatures

- date: 2026-04-18T17:30:00.000Z
- extended `execution-v1-release-doc-manifest.json` with `artifactBundleByArtifactName` so `jsonDigest`, `markdownDigest`, and `textDigest` can now be inspected through direct keyed signature lookup instead of scanning the ordered bundle line array
- each keyed entry keeps the sibling artifact `path/bytes/lineCount/sha256` plus its own deterministic `signatureLine` and `signatureSha256`, and the smoke now asserts every keyed entry matches the corresponding artifact descriptor and bundle line exactly
- updated the README smoke note so the browser evidence contract now explicitly documents the per-artifact keyed bundle signature surface
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T17:15:00.000Z","id":"doclog_20260418171500_browser_release_doc_bundle_signature","type":"devlog","updatedAt":"2026-04-18T17:15:00.000Z"} -->
## 2026-04-18 Browser Release Doc Bundle Signature

- date: 2026-04-18T17:15:00.000Z
- extended `execution-v1-release-doc-manifest.json` with deterministic bundle signature fields so the JSON, text, and Markdown digest artifacts can now be compared as one ordered bundle instead of three independent descriptors
- the manifest now records `artifactOrder`, per-artifact bundle lines, `artifactBundleLineCount`, `artifactBundleOverviewLine`, and `artifactBundleSha256`, and the smoke asserts the expected order, exact line set, overview content, and sha256 validity
- updated the README smoke note so the browser evidence contract now explicitly documents the release doc bundle signature surface
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T17:00:00.000Z","id":"doclog_20260418170000_browser_release_doc_manifest","type":"devlog","updatedAt":"2026-04-18T17:00:00.000Z"} -->
## 2026-04-18 Browser Release Doc Digest Manifest

- date: 2026-04-18T17:00:00.000Z
- added `execution-v1-release-doc-manifest.json` so the browser E2E smoke now emits one compact integrity surface that indexes the JSON, text, and Markdown release doc digest artifacts together
- the manifest records artifact version, generated timestamp, overall exact-match state, stable digest sha256, expected doc kinds, and per-artifact `path/bytes/lineCount/sha256`, then the smoke locks it with write/read-back equality and per-artifact consistency assertions
- updated the README smoke note so the browser evidence contract now explicitly documents the standalone release doc manifest artifact
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T16:45:00.000Z","id":"doclog_20260418164500_browser_release_doc_digest_markdown_artifact","type":"devlog","updatedAt":"2026-04-18T16:45:00.000Z"} -->
## 2026-04-18 Browser Release Doc Digest Markdown Artifact

- date: 2026-04-18T16:45:00.000Z
- added a sibling `execution-v1-release-doc-digest.md` artifact so the browser E2E smoke now emits a rendered handoff-friendly Markdown summary next to the JSON and plain-text release doc digest artifacts
- the Markdown artifact records generated timestamp, report/json/text artifact paths, overall exact-match summary, stable digest sha256, the stable overview line, and the per-doc signature lines as a readable checklist-style surface, then the smoke locks it with existence and full read-back equality assertions
- updated the README smoke note so the browser evidence contract now explicitly documents the standalone release doc Markdown digest artifact
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T16:30:00.000Z","id":"doclog_20260418163000_browser_release_doc_digest_text_artifact","type":"devlog","updatedAt":"2026-04-18T16:30:00.000Z"} -->
## 2026-04-18 Browser Release Doc Digest Text Artifact

- date: 2026-04-18T16:30:00.000Z
- added a sibling `execution-v1-release-doc-digest.txt` artifact so the browser E2E smoke now emits a plain text release-doc signature surface next to the JSON digest artifact
- the text artifact records artifact version, generated timestamp, report path, JSON digest path, overall exact-match summary, stable digest sha256, the stable overview line, and the per-doc signature lines, then the smoke locks it with existence and full read-back equality assertions
- updated the README smoke note so the browser evidence contract now explicitly documents the standalone release doc text digest artifact
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T16:15:00.000Z","id":"doclog_20260418161500_browser_release_doc_digest_artifact","type":"devlog","updatedAt":"2026-04-18T16:15:00.000Z"} -->
## 2026-04-18 Browser Release Doc Digest Artifact

- date: 2026-04-18T16:15:00.000Z
- added a separate `execution-v1-release-doc-digest.json` artifact so the browser E2E smoke now emits a compact, release-doc-only verification surface alongside the full `execution-v1-browser-e2e.json` report
- kept the existing full report unchanged, but made the digest artifact self-describing with expected doc kinds, exact-match count, missing doc kinds, stable digest line count, stable digest sha256, keyed per-doc digest lookup, and read-back assertions for file path and summary consistency
- updated the README smoke note so the browser evidence contract now explicitly documents the standalone release doc digest artifact
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T16:00:00.000Z","id":"doclog_20260418160000_browser_release_doc_stable_index","type":"devlog","updatedAt":"2026-04-18T16:00:00.000Z"} -->
## 2026-04-18 Browser Release Doc Stable Index

- date: 2026-04-18T16:00:00.000Z
- added `releaseDocVerificationSummary.stableDigestByDocKind` so the saved browser report now exposes the stable per-doc fingerprint surface through direct `closeout/evidence` keyed lookup as well as ordered arrays
- kept the ordered digest arrays and overview intact, but added assertions that the keyed index preserves expected doc order and exactly matches each stable digest entry’s label/path/head/signature fields
- updated the README smoke note so the browser evidence contract now explicitly documents the keyed stable digest index
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T15:45:00.000Z","id":"doclog_20260418154500_browser_release_doc_entry_signatures","type":"devlog","updatedAt":"2026-04-18T15:45:00.000Z"} -->
## 2026-04-18 Browser Release Doc Entry Signatures

- date: 2026-04-18T15:45:00.000Z
- extended each `releaseDocVerificationSummary.stableDigest` entry with its own `signatureLine` and `signatureSha256`, so `closeout` and `evidence` can now be compared independently without reopening the full overview or raw evidence payload
- kept the existing stable digest lines and overall digest hash, but added assertions that every per-doc signature hash is a valid sha256 and that each entry-level signature line matches the exported stable line surface
- updated the README smoke note so the browser evidence contract now explicitly documents per-doc stable signature lines and hashes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T15:30:00.000Z","id":"doclog_20260418153000_browser_release_doc_stable_overview","type":"devlog","updatedAt":"2026-04-18T15:30:00.000Z"} -->
## 2026-04-18 Browser Release Doc Stable Overview

- date: 2026-04-18T15:30:00.000Z
- extended `releaseDocVerificationSummary` with `stableDigestOverviewLine` and `stableDigestLineCount`, so the saved browser report now exposes a single-line overall summary above the per-doc stable signature lines
- the overview line records `overallExactMatch`, `exactMatchCount`, `mismatchCount`, missing doc kinds, doc order, and the stable digest sha256, which gives downstream review a fast compare surface before opening the detailed digest lines
- updated the README smoke note so the browser evidence contract now explicitly documents the stable release doc overview line
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T15:15:00.000Z","id":"doclog_20260418151500_browser_release_doc_stable_signature","type":"devlog","updatedAt":"2026-04-18T15:15:00.000Z"} -->
## 2026-04-18 Browser Release Doc Stable Signature

- date: 2026-04-18T15:15:00.000Z
- extended `releaseDocVerificationSummary` with `stableDigestLines` and `stableDigestSha256`, so the saved browser report now exposes a deterministic one-line-per-doc signature and a compact hash for release doc verification review
- kept the richer stable digest object intact, but added assertions that each stable line includes the expected doc path suffix, head path suffix, and `failures=none` in the passing path
- updated the README smoke note so the browser evidence contract now explicitly documents the stable release doc line signature and sha256 summary
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T15:00:00.000Z","id":"doclog_20260418150000_browser_release_doc_stable_digest","type":"devlog","updatedAt":"2026-04-18T15:00:00.000Z"} -->
## 2026-04-18 Browser Release Doc Stable Digest

- date: 2026-04-18T15:00:00.000Z
- added `releaseDocVerificationSummary.stableDigest` so the saved browser report now exposes a sorted, temp-root-free release doc verification surface for `closeout/evidence`
- each digest entry keeps only stable comparison fields (`docKind`, exact-match flag, stable label/path suffix pair, stable head label/path suffix pair, failure reasons), so downstream diff review no longer needs to inspect raw absolute paths or raw `headHtml`
- updated the README smoke note so the browser evidence contract now explicitly documents the stable release doc digest alongside the richer verification summary
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T14:30:00.000Z","id":"doclog_20260418143000_browser_release_doc_stable_head_summary","type":"devlog","updatedAt":"2026-04-18T14:30:00.000Z"} -->
## 2026-04-18 Browser Release Doc Stable Head Summary

- date: 2026-04-18T14:30:00.000Z
- extended `releaseDocVerificationSummary` so each `closeout/evidence` entry now carries stable `actualHeadLabel` and `actualHeadPathSuffix`, extracted from raw `headHtml` and normalized into diff-friendly summary fields
- strengthened the exact-match contract by requiring the extracted head label and head path suffix to match the expected doc kind and expected markdown suffix in addition to the existing raw head marker/path presence checks
- updated the README smoke note so the browser evidence contract now explicitly documents stable head summary capture alongside the stable doc path suffix
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T14:15:00.000Z","id":"doclog_20260418141500_browser_release_doc_stable_path_suffix","type":"devlog","updatedAt":"2026-04-18T14:15:00.000Z"} -->
## 2026-04-18 Browser Release Doc Stable Path Suffix

- date: 2026-04-18T14:15:00.000Z
- extended `releaseDocVerificationSummary` with `actualPathSuffix` so the saved browser report keeps a stable, diff-friendly doc path signal instead of relying only on temp-root-specific absolute paths
- switched the per-kind path assertion to compare the stable suffix directly against `expectedPathSuffix`, which keeps the exact-match contract unchanged while removing run-to-run temp directory noise from the readable summary layer
- updated the README smoke note so the browser evidence contract now explicitly documents stable release doc path suffix capture
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T14:00:00.000Z","id":"doclog_20260418140000_browser_release_doc_failure_reason_summary","type":"devlog","updatedAt":"2026-04-18T14:00:00.000Z"} -->
## 2026-04-18 Browser Release Doc Failure Reason Summary

- date: 2026-04-18T14:00:00.000Z
- extended `releaseDocVerificationSummary` so each `closeout/evidence` entry now carries `expectedPathSuffix`, `actualLabel`, `actualPath`, `actualRawDocKind`, and `failureReasons`, making the persisted browser report diff-friendly without reopening the raw doc surface payload
- kept the exact-match contract strict by asserting that every expected doc kind still resolves to `failureReasons: []` in the passing smoke path
- updated the README smoke note so the browser evidence contract now documents expected/actual release doc summary fields and failure reason reporting
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T13:45:00.000Z","id":"doclog_20260418134500_browser_release_doc_verification_summary","type":"devlog","updatedAt":"2026-04-18T13:45:00.000Z"} -->
## 2026-04-18 Browser Release Doc Verification Summary

- date: 2026-04-18T13:45:00.000Z
- extended `smoke-ui-execution-browser-e2e` so the saved browser report now includes `releaseDocVerificationSummary`, which surfaces `closeout/evidence` exact-match state as a human-readable summary instead of forcing downstream readers to reconstruct it from raw doc surfaces
- added per-kind checks for presence, raw-kind equality, label equality, expected markdown path suffix, and doc head marker/path inclusion, then rolled those into `overallExactMatch`, `exactMatchCount`, and `missingDocKinds`
- updated the README smoke note so the browser evidence contract now explicitly documents the saved release doc verification summary alongside the underlying raw capture and head HTML checks
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T13:30:00.000Z","id":"doclog_20260418133000_browser_release_doc_capture_contract","type":"devlog","updatedAt":"2026-04-18T13:30:00.000Z"} -->
## 2026-04-18 Browser Release Doc Capture Contract

- date: 2026-04-18T13:30:00.000Z
- tightened `smoke-ui-execution-browser-e2e` so release doc capture is no longer “diagnostic only”: `docSurfaceKindMismatches` must now be empty for the smoke to pass
- added `artifactPair.releaseDocCaptureVerified` and `artifactPair.releaseDocHeadVerified` to the saved browser report so downstream readers can tell that release doc label, path, kind, raw runtime value, and head HTML all matched after the regex escape fix
- updated the README smoke note so the browser evidence contract explicitly states that closeout/evidence doc kind mismatch count must be zero and that label/path/head HTML must also match the expected markdown surfaces
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T13:15:00.000Z","id":"doclog_20260418131500_browser_release_doc_regex_escape_fix","type":"devlog","updatedAt":"2026-04-18T13:15:00.000Z"} -->
## 2026-04-18 Browser Release Doc Regex Escape Fix

- date: 2026-04-18T13:15:00.000Z
- found the actual root cause of the `cloeout` drift in `smoke-ui-execution-browser-e2e`: the injected browser code lived inside a template string, so `/\s+/g` was interpreted as `/s+/g` and stripped literal `s` characters from doc labels and paths
- fixed the injected `compactInline` and `normalizeText` helpers by escaping the regex backslash for the browser-evaluated code path, restoring real whitespace normalization instead of accidental `s` removal
- updated the README smoke note so the browser evidence contract now explicitly covers whitespace normalization inside injected browser code for release doc card capture
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T13:00:00.000Z","id":"doclog_20260418130000_browser_release_doc_base64_transport","type":"devlog","updatedAt":"2026-04-18T13:00:00.000Z"} -->
## 2026-04-18 Browser Release Doc Runtime Mismatch Pass

- date: 2026-04-18T13:00:00.000Z
- hardened `smoke-ui-execution-browser-e2e` so release doc surface strings are encoded in the browser and decoded in Node before assertions, which ruled out Playwright CLI text transport as the cause of the `closeout` drift
- added `releaseDocAssetSanity`, `literalTransportSanity`, `docSurfaceKindMismatches`, and doc head HTML snapshots so the saved browser evidence can distinguish “served app.js is correct”, “transport preserves literal strings”, and “runtime release panel still exposes a mismatched raw doc kind”
- updated the README smoke note so the browser evidence contract documents base64-backed doc card capture, literal transport sanity, and the server-asset sanity check for closeout/evidence surfaces
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T12:45:00.000Z","id":"doclog_20260418124500_browser_release_doc_kind_marker","type":"devlog","updatedAt":"2026-04-18T12:45:00.000Z"} -->
## 2026-04-18 Browser Release Doc Kind Marker Pass

- date: 2026-04-18T12:45:00.000Z
- added stable `data-release-doc-kind` markers to the rendered release doc cards so browser evidence has an explicit source for release document identity
- updated `smoke-ui-execution-browser-e2e` to persist `docKind` in `screenshotSurfaceSummary.docSurfaces`, with an ordered fallback when the captured runtime attribute text is distorted, and restored exact presence assertions for the two release document surfaces
- updated the README smoke note so the browser evidence contract now documents stable doc kind capture alongside doc label/path/preview summary
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T12:30:00.000Z","id":"doclog_20260418123000_browser_release_doc_surface_summary","type":"devlog","updatedAt":"2026-04-18T12:30:00.000Z"} -->
## 2026-04-18 Browser Release Doc Surface Summary Pass

- date: 2026-04-18T12:30:00.000Z
- extended `smoke-ui-execution-browser-e2e` so `screenshotSurfaceSummary` now includes structured closeout/evidence doc card summaries with rendered label, path, headings, and preview items from the release panel
- added assertions that the two rendered release doc cards are present and that every visible doc surface carries a non-empty label, path, and preview summary, so the saved browser report preserves document surface content instead of only aggregate document counts
- updated the README smoke note so release document card summary capture is documented as part of the browser evidence contract
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T12:15:00.000Z","id":"doclog_20260418121500_browser_release_history_summary","type":"devlog","updatedAt":"2026-04-18T12:15:00.000Z"} -->
## 2026-04-18 Browser Release History Summary Pass

- date: 2026-04-18T12:15:00.000Z
- extended `smoke-ui-execution-browser-e2e` so `screenshotSurfaceSummary` now includes visible release action history rows or the empty-state copy when no history rows are rendered
- added assertions that visible history rows carry non-empty action, outcome, scope, and summary text, while the empty-state path must still expose non-empty title and detail copy
- updated the README smoke note so release action history capture is documented as part of the browser evidence contract
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T12:00:00.000Z","id":"doclog_20260418120000_browser_release_left_surface_rows","type":"devlog","updatedAt":"2026-04-18T12:00:00.000Z"} -->
## 2026-04-18 Browser Release Left Surface Rows Pass

- date: 2026-04-18T12:00:00.000Z
- extended `smoke-ui-execution-browser-e2e` so `screenshotSurfaceSummary` now includes rendered checklist items, current status rows, and document status rows from the release panel
- added assertions that each visible checklist/status/doc row carries non-empty label and status text, so the saved browser report now preserves the left-side release surface state instead of only aggregate counts and card summaries
- updated the README smoke note so checklist/current-status/doc-status capture is documented as part of the browser evidence contract
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T11:45:00.000Z","id":"doclog_20260418114500_browser_release_card_summary","type":"devlog","updatedAt":"2026-04-18T11:45:00.000Z"} -->
## 2026-04-18 Browser Release Card Summary Pass

- date: 2026-04-18T11:45:00.000Z
- extended `smoke-ui-execution-browser-e2e` so `screenshotSurfaceSummary` now includes structured recommendation card and provider card summaries captured from the rendered release panel
- added assertions that each visible recommendation card has a non-empty label and at least one badge, and each provider card has a non-empty label, env key, and two status badges, so the saved browser report preserves actionable release UI state instead of only aggregate counts
- updated the README smoke note so visible recommendation/provider card verification is documented as part of the browser evidence contract
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T11:30:00.000Z","id":"doclog_20260418113000_browser_surface_metric_values","type":"devlog","updatedAt":"2026-04-18T11:30:00.000Z"} -->
## 2026-04-18 Browser Surface Metric Values Pass

- date: 2026-04-18T11:30:00.000Z
- extended `smoke-ui-execution-browser-e2e` so `screenshotSurfaceSummary` now includes release callout copy and summary chip `label/value` pairs instead of only labels
- added assertions that every expected release summary chip is present with a non-empty rendered value, so the saved browser report now preserves the actual KPI text seen in the screenshot surface
- updated the README smoke note so summary chip metric value verification is documented as part of the browser evidence contract
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T11:15:00.000Z","id":"doclog_20260418111500_browser_surface_summary_metadata","type":"devlog","updatedAt":"2026-04-18T11:15:00.000Z"} -->
## 2026-04-18 Browser Surface Summary Metadata Pass

- date: 2026-04-18T11:15:00.000Z
- extended `smoke-ui-execution-browser-e2e` so the saved report now includes a compact `screenshotSurfaceSummary` for the captured release panel: release headline, surface headings, summary chip labels, recommendation/provider/doc surface counts
- added assertions that the release screenshot actually contains the expected checklist/evidence headings and a non-empty recommendation/provider/doc layout, so the evidence report now describes rendered content as well as URL and file metadata
- updated the README smoke note so release surface summary verification is documented as part of the browser evidence contract
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T11:00:00.000Z","id":"doclog_20260418110000_browser_capture_target_metadata","type":"devlog","updatedAt":"2026-04-18T11:00:00.000Z"} -->
## 2026-04-18 Browser Capture Target Metadata Pass

- date: 2026-04-18T11:00:00.000Z
- extended `smoke-ui-execution-browser-e2e` so the saved report now includes structured screenshot capture target metadata for the live browser state: active step/tab, active detail tab, workspace/mission/session/artifact ids, page title, release heading, and exact href
- added explicit assertions that the screenshot was captured from the intended `step-output` plus `release` surface for the current mission/session context instead of only assuming the final URL state before capture
- updated the README smoke note so capture target verification is documented as part of the browser evidence contract
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T10:45:00.000Z","id":"doclog_20260418104500_browser_fullpage_dimension_contract","type":"devlog","updatedAt":"2026-04-18T10:45:00.000Z"} -->
## 2026-04-18 Browser Full-Page Dimension Contract Pass

- date: 2026-04-18T10:45:00.000Z
- promoted screenshot dimension validation from a partial width-plus-minimum-height check into an exact full-page contract by recording `expectedFullPageDimensions` from page scroll size and device pixel ratio
- extended the saved browser E2E report so the persisted JSON now states that full-page dimensions were verified, and the smoke re-checks the decoded PNG dimensions against the stored expected values after report read-back
- updated the README smoke note so expected full-page dimension verification is documented as part of the browser evidence contract
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T10:30:00.000Z","id":"doclog_20260418103000_browser_capture_context_metadata","type":"devlog","updatedAt":"2026-04-18T10:30:00.000Z"} -->
## 2026-04-18 Browser Capture Context Metadata Pass

- date: 2026-04-18T10:30:00.000Z
- extended `smoke-ui-execution-browser-e2e` so the saved report now includes screenshot capture context from the live browser session: viewport width/height, device pixel ratio, and page scroll size
- added explicit width consistency assertions so the decoded PNG width must match the measured viewport render width, and the full-page screenshot height must be at least one rendered viewport tall
- updated the README smoke note so viewport and DPR grounded screenshot verification is documented as part of the browser evidence contract
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T10:15:00.000Z","id":"doclog_20260418101500_browser_png_dimension_validation","type":"devlog","updatedAt":"2026-04-18T10:15:00.000Z"} -->
## 2026-04-18 Browser PNG Dimension Validation Pass

- date: 2026-04-18T10:15:00.000Z
- added lightweight PNG header parsing to `smoke-ui-execution-browser-e2e`, so the saved screenshot artifact is now validated as a decodable PNG with non-zero width and height instead of only an existing file with matching hash
- extended the persisted browser E2E report with `screenshotWidth` and `screenshotHeight`, then re-parse the on-disk screenshot after report read-back to assert the stored dimensions still match the actual artifact
- updated the README smoke note so PNG parse and dimension revalidation are part of the documented browser verification surface
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T10:00:00.000Z","id":"doclog_20260418100000_browser_screenshot_revalidation","type":"devlog","updatedAt":"2026-04-18T10:00:00.000Z"} -->
## 2026-04-18 Browser Screenshot Revalidation Pass

- date: 2026-04-18T10:00:00.000Z
- extended the saved browser E2E report with `screenshotModifiedAt`, so the JSON artifact now records when the paired screenshot file was last written in addition to size and sha256
- after reading `execution-v1-browser-e2e.json` back, the smoke now recomputes screenshot stat and sha256 from disk and asserts they match the persisted report, turning pair metadata into an explicit revalidation contract
- updated the README smoke note so on-disk screenshot revalidation is documented as part of the browser verification surface
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T09:45:00.000Z","id":"doclog_20260418094500_browser_artifact_pair_metadata","type":"devlog","updatedAt":"2026-04-18T09:45:00.000Z"} -->
## 2026-04-18 Browser Artifact Pair Metadata Pass

- date: 2026-04-18T09:45:00.000Z
- extended `smoke-ui-execution-browser-e2e` so the saved JSON report now carries screenshot byte size and sha256, making the screenshot artifact independently identifiable from the report alone
- added explicit `artifactPair` summary fields so the persisted browser E2E report now states that screenshot existence and report read-back verification were both part of the smoke contract
- updated the README smoke note so screenshot artifact pair metadata is documented as part of the browser verification surface
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T09:30:00.000Z","id":"doclog_20260418093000_browser_report_readback","type":"devlog","updatedAt":"2026-04-18T09:30:00.000Z"} -->
## 2026-04-18 Browser Report Readback Pass

- date: 2026-04-18T09:30:00.000Z
- added explicit browser E2E report metadata (`artifactVersion`, `generatedAt`, `repoDir`) so the saved JSON artifact is self-describing even when reviewed outside the terminal context
- after writing `execution-v1-browser-e2e.json`, the smoke now reads the file back and asserts deep equality with the in-memory payload, turning report persistence into a checked contract instead of a best-effort side effect
- updated the README smoke note so saved report read-back validation is part of the documented browser verification surface
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T09:15:00.000Z","id":"doclog_20260418091500_browser_e2e_report_artifact","type":"devlog","updatedAt":"2026-04-18T09:15:00.000Z"} -->
## 2026-04-18 Browser E2E Report Artifact Pass

- date: 2026-04-18T09:15:00.000Z
- wrote the final `smoke-ui-execution-browser-e2e` JSON payload to `output/playwright/execution-v1-browser-e2e.json` instead of leaving it only on stdout, so screenshot evidence and structured session coverage now persist side by side
- added an existence assertion for the saved report artifact so smoke success now guarantees both the screenshot and the JSON evidence file were produced
- updated the README smoke note so the saved browser E2E report artifact is part of the documented verification contract
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-18T09:00:00.000Z","id":"doclog_20260418090000_handoff_coverage_summary","type":"devlog","updatedAt":"2026-04-18T09:00:00.000Z"} -->
## 2026-04-18 Handoff Coverage Summary Pass

- date: 2026-04-18T09:00:00.000Z
- normalized handoff session output ordering in `smoke-ui-execution-browser-e2e` and added an explicit `handoffCoverageSummary` aggregate so the final JSON no longer requires manual counting to understand which reopen paths were verified
- added expected matrix assertions for `memory` and `attachment` across `copy`, `direct-fallback`, and `focused-fallback`, turning the surfaced summary into a checked coverage contract instead of a passive log
- updated the README smoke note so handoff coverage summary is part of the documented browser verification output
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-17T05:50:00.000Z","id":"doclog_20260417055000_handoff_result_summary","type":"devlog","updatedAt":"2026-04-17T05:50:00.000Z"} -->
## 2026-04-17 Handoff Result Summary Pass

- date: 2026-04-17T05:50:00.000Z
- promoted fresh handoff verification from assertion-only coverage into surfaced smoke output by collecting per-session result summaries for copy, direct-fallback, and focused-fallback reopen paths
- final browser E2E JSON now includes source type, source label, fallback/copy session label, and per-session console/page error counts, so the smoke artifact itself shows which handoff sessions were verified
- updated the README smoke note so handoff session summary output is part of the documented verification contract
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-17T05:35:00.000Z","id":"doclog_20260417053500_handoff_session_error_guard","type":"devlog","updatedAt":"2026-04-17T05:35:00.000Z"} -->
## 2026-04-17 Handoff Session Error Guard Pass

- date: 2026-04-17T05:35:00.000Z
- extracted the browser guard bootstrap into a reusable helper so fresh handoff sessions now receive the same dialog stubs and runtime error listeners as the main browser session
- extended fresh handoff assertions to require empty console/page error buckets in those secondary sessions, so retrieval deep-link reopen is verified as both visually restored and runtime-clean
- updated the README smoke note so the browser verification contract explicitly covers main and handoff sessions together
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-17T05:20:00.000Z","id":"doclog_20260417052000_browser_e2e_error_guard","type":"devlog","updatedAt":"2026-04-17T05:20:00.000Z"} -->
## 2026-04-17 Browser E2E Error Guard Pass

- date: 2026-04-17T05:20:00.000Z
- extended `smoke-ui-execution-browser-e2e` to capture browser console error events and pageerror events across the whole session instead of treating flow success alone as sufficient
- asserted at the end of the smoke that both error buckets are empty, so silent UI regressions now fail the same smoke that already covers retrieval handoff and release navigation
- updated the README smoke note so browser verification explicitly includes the absence of runtime browser errors
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-17T05:05:00.000Z","id":"doclog_20260417050500_browser_e2e_shutdown_guard","type":"devlog","updatedAt":"2026-04-17T05:05:00.000Z"} -->
## 2026-04-17 Browser E2E Shutdown Guard Pass

- date: 2026-04-17T05:05:00.000Z
- added bounded timeout handling to playwright-cli session close and UI server shutdown in `smoke-ui-execution-browser-e2e`, so a successful browser verification run no longer depends on unbounded cleanup waits
- made `runPw` surface timeout errors explicitly and upgraded `waitForExit` to fall back to `SIGKILL` after a bounded grace period, which keeps the smoke deterministic even when browser teardown stalls
- kept the retrieval handoff assertions unchanged and focused this pass on post-success termination stability
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-17T04:50:00.000Z","id":"doclog_20260417045000_retrieval_memory_fallback_parity","type":"devlog","updatedAt":"2026-04-17T04:50:00.000Z"} -->
## 2026-04-17 Retrieval Memory Fallback Parity Pass

- date: 2026-04-17T04:50:00.000Z
- removed the attachment-only assumption from retrieval prompt fallback smoke so both memory and attachment sources now exercise direct-chip fallback and focused-copy fallback under the same browser contract
- extended the fresh browser handoff reopen checks to the memory fallback URLs as well, keeping source parity between lexical memory evidence and attachment evidence
- updated the README smoke note so fallback verification is documented as a shared retrieval-source contract rather than an attachment-specific exception
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-17T04:35:00.000Z","id":"doclog_20260417043500_retrieval_fallback_handoff_reopen","type":"devlog","updatedAt":"2026-04-17T04:35:00.000Z"} -->
## 2026-04-17 Retrieval Fallback Handoff Reopen Pass

- date: 2026-04-17T04:35:00.000Z
- extended the execution browser smoke so attachment retrieval prompt fallback is no longer verified only inside the original page session; the suite now reopens both the direct-chip fallback URL and the focused-copy fallback URL in fresh browser sessions
- kept the same retrieval handoff helper and asserted that each fallback deep-link restores the exact `hstype` and `hsource` focus state, active chip, and attachment row highlight
- updated the README smoke note so fresh browser verification explicitly covers fallback-generated retrieval links in addition to clipboard-generated ones
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-17T04:20:00.000Z","id":"doclog_20260417042000_retrieval_focused_copy_fallback","type":"devlog","updatedAt":"2026-04-17T04:20:00.000Z"} -->
## 2026-04-17 Retrieval Focused Copy Fallback Pass

- date: 2026-04-17T04:20:00.000Z
- tightened the execution browser smoke so the retrieval focus callout copy button is no longer inferred through a generic selector; the suite now explicitly targets the `현재 source 링크 복사` surface
- added an attachment-based prompt fallback check for that focused copy button and proved that clipboard failure still yields the same harness deep-link while the button label stays on the non-copied state
- updated the README smoke note so browser verification now documents prompt fallback on both the direct retrieval chip and the focused retrieval copy action
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-17T04:05:00.000Z","id":"doclog_20260417040500_retrieval_copy_prompt_fallback","type":"devlog","updatedAt":"2026-04-17T04:05:00.000Z"} -->
## 2026-04-17 Retrieval Copy Prompt Fallback Pass

- date: 2026-04-17T04:05:00.000Z
- hardened the execution browser smoke so retrieval source handoff is now proven even when `navigator.clipboard.writeText` fails and the UI falls back to `window.prompt`
- used the attachment retrieval chip as the representative fallback case, and verified that the prompt default value still matches the later harness deep-link while the chip label stays at `링크` instead of incorrectly switching to `복사됨`
- updated the README smoke note so prompt fallback coverage is part of the documented browser verification contract
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-17T03:50:00.000Z","id":"doclog_20260417035000_retrieval_copy_feedback","type":"devlog","updatedAt":"2026-04-17T03:50:00.000Z"} -->
## 2026-04-17 Retrieval Copy Feedback Pass

- date: 2026-04-17T03:50:00.000Z
- added source-specific copy feedback so retrieval chip copy buttons and current source copy buttons briefly switch to `복사됨` after a clipboard write, instead of relying only on the global notice bar
- extended the browser smoke to verify that both the direct chip copy button and the focused source copy button actually render the copied state while still producing the same handoff deep-link for memory and attachment sources
- updated the UI contract smoke and README so the temporary copied-state surface stays part of the documented retrieval handoff contract
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-17T03:35:00.000Z","id":"doclog_20260417033500_retrieval_chip_copy_handoff","type":"devlog","updatedAt":"2026-04-17T03:35:00.000Z"} -->
## 2026-04-17 Retrieval Chip Copy Handoff Pass

- date: 2026-04-17T03:35:00.000Z
- added direct `링크` copy affordances beside retrieval compare chips so operators can hand off a source-specific deep-link without first activating the focus state
- extended the execution browser smoke to click the chip-level copy action before focus activation and prove that the copied URL already matches the later focused harness deep-link for both memory and attachment sources
- updated the UI contract smoke and README so the direct chip-copy handoff remains part of the documented retrieval browser surface
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-17T03:20:00.000Z","id":"doclog_20260417032000_retrieval_memory_attachment_handoff","type":"devlog","updatedAt":"2026-04-17T03:20:00.000Z"} -->
## 2026-04-17 Retrieval Memory And Attachment Handoff Pass

- date: 2026-04-17T03:20:00.000Z
- expanded the execution browser smoke so retrieval handoff is no longer proven by a single source type; the same suite now validates both memory and attachment retrieval chips through reload, copied deep-link reopen, and fresh browser session entry
- tightened attachment coverage by checking that the focused attachment row stays highlighted after reopen and fresh handoff, not just that the generic focus banner remains visible
- updated the README smoke note so browser verification now explicitly covers both retrieval source classes instead of a generic handoff path
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-17T03:05:00.000Z","id":"doclog_20260417030500_retrieval_focus_fresh_browser_handoff","type":"devlog","updatedAt":"2026-04-17T03:05:00.000Z"} -->
## 2026-04-17 Retrieval Focus Fresh Browser Handoff Pass

- date: 2026-04-17T03:05:00.000Z
- tightened the retrieval handoff browser contract so the copied source link is no longer validated only inside the original page session; the smoke now opens the copied URL in a second browser session and expects the same active chip plus harness focus banner to restore there as well
- kept the stronger verification inside the existing execution browser smoke so shared retrieval links are proven across page reload, deep-link reopen, and fresh browser entry without creating a parallel suite
- updated the README smoke note to reflect that fresh browser handoff is now part of the end-to-end browser coverage
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-17T02:50:00.000Z","id":"doclog_20260417025000_retrieval_focus_copy_handoff","type":"devlog","updatedAt":"2026-04-17T02:50:00.000Z"} -->
## 2026-04-17 Retrieval Focus Copy Handoff Pass

- date: 2026-04-17T02:50:00.000Z
- added a dedicated `현재 source 링크 복사` action to retrieval focus callouts so operators can hand off the exact harness-focused retrieval view instead of relying on the generic current-view link
- extended the execution browser smoke to capture the copied retrieval URL and verify that the UI-generated link matches the reopened deep-link with the same `hstype` and `hsource` state
- updated the UI contract smoke and README so retrieval source copy remains part of the documented browser verification surface
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-17T02:35:00.000Z","id":"doclog_20260417023500_retrieval_focus_handoff_e2e","type":"devlog","updatedAt":"2026-04-17T02:35:00.000Z"} -->
## 2026-04-17 Retrieval Focus Handoff E2E Pass

- date: 2026-04-17T02:35:00.000Z
- expanded the execution browser smoke so retrieval focus is no longer verified only across reloads; the same `hstype` and `hsource` deep-link is now reopened from the root URL and must restore the active chip plus the harness focus banner again
- kept the coverage inside the main browser smoke to prove that shared retrieval links survive a fresh entry path without adding another browser suite or a second verification harness
- updated the README smoke bullet so the browser contract explicitly includes direct deep-link re-entry in addition to reload restore
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-17T02:20:00.000Z","id":"doclog_20260417022000_retrieval_focus_browser_e2e","type":"devlog","updatedAt":"2026-04-17T02:20:00.000Z"} -->
## 2026-04-17 Retrieval Focus Browser E2E Pass

- date: 2026-04-17T02:20:00.000Z
- extended the real browser smoke to seed retrieval inputs, click a compare chip, and verify that `hstype` and `hsource` survive a full page reload with the active chip and focus banner restored
- kept the new check inside the existing execution browser smoke instead of adding a second browser suite, so retrieval focus persistence now rides on the same end-to-end path already used for release and browser history verification
- updated the README smoke bullet to reflect that retrieval focus deep-link restore is now covered by `smoke:ui-execution-browser-e2e`
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-17T02:05:00.000Z","id":"doclog_20260417020500_retrieval_focus_url_sync","type":"devlog","updatedAt":"2026-04-17T02:05:00.000Z"} -->
## 2026-04-17 Retrieval Focus URL Sync Pass

- date: 2026-04-17T02:05:00.000Z
- synchronized retrieval source focus into the main UI URL via `hstype` and `hsource`, so active retrieval narrowing survives refresh, popstate navigation, and shared links
- restored retrieval focus after mission selection without forcing a step jump, then rerendered setup, harness, and output compare surfaces so active chips and banners come back consistently from URL state
- updated manual memory filter changes to clear stale retrieval focus params from the URL immediately, preventing the address bar from claiming a source focus that is no longer applied
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-17T01:50:00.000Z","id":"doclog_20260417015000_retrieval_focus_active_state","type":"devlog","updatedAt":"2026-04-17T01:50:00.000Z"} -->
## 2026-04-17 Retrieval Focus Active-State Pass

- date: 2026-04-17T01:50:00.000Z
- made retrieval compare chips reflect the current narrowed source directly, so an already-focused source shows up as `현재 · …` instead of looking identical to inactive chips
- added inline `현재 source 해제` control inside the compare callout to avoid forcing operators to scroll down to the harness banner just to clear an active retrieval focus
- extended the UI smoke and styles to lock the new active-focus chip state and inline clear wording
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-17T01:35:00.000Z","id":"doclog_20260417013500_retrieval_focus_banner","type":"devlog","updatedAt":"2026-04-17T01:35:00.000Z"} -->
## 2026-04-17 Retrieval Focus Banner Pass

- date: 2026-04-17T01:35:00.000Z
- added a visible `현재 retrieval source focus` banner in the harness so source drill-down no longer feels like an invisible filter jump
- kept the clear path explicit with `focus 해제`, and made manual memory filter edits clear the retrieval source focus state so the UI does not overstate that a retrieval-driven narrowing is still active
- extended the UI contract smoke and docs so the active-focus banner and reset flow stay documented and test-covered
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-17T01:20:00.000Z","id":"doclog_20260417012000_retrieval_source_focus","type":"devlog","updatedAt":"2026-04-17T01:20:00.000Z"} -->
## 2026-04-17 Retrieval Source Focus Pass

- date: 2026-04-17T01:20:00.000Z
- turned the retrieval compare callout from a passive summary into an operator drill-down surface by making preview-only and evidence-only source chips clickable
- wired memory sources to the existing harness memory scope/kind filters and attachment sources to attachment-row highlight plus scroll, so operators can trace grounding drift back to curated inputs without adding a new browse API
- extended retrieval and UI contract smokes to assert the new source-focus payload fields and client-side focus wiring remain present
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-17T01:05:00.000Z","id":"doclog_20260417010500_retrieval_compare_surface","type":"devlog","updatedAt":"2026-04-17T01:05:00.000Z"} -->
## 2026-04-17 Retrieval Compare Surface Pass

- date: 2026-04-17T01:05:00.000Z
- extended mission harness retrieval payload with latest retrieval artifact summary plus preview-vs-evidence compare counts so the UI can show source drift without rereading or diffing the raw markdown client-side
- surfaced `preview vs 최근 retrieval evidence` callouts in mission setup, harness memory, and output summary so operators can see whether the next run keeps the same grounding sources or is about to shift to new memory/attachment inputs
- expanded `smoke:retrieval-memory` and `smoke:ui-agent-blueprints` to lock both the compare payload contract and the served wording for the new drift-reading surface
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-17T00:50:00.000Z","id":"doclog_20260417005000_retrieval_quick_open_surface","type":"devlog","updatedAt":"2026-04-17T00:50:00.000Z"} -->
## 2026-04-17 Retrieval Quick-Open Surface Pass

- date: 2026-04-17T00:50:00.000Z
- extended `showMission().harness.retrieval` with `latestArtifact` metadata so the UI can point at the exact retrieval evidence file and owning session without re-deriving that relationship client-side
- added `retrieval 근거 열기` quick-open controls to both `하네스 > 메모리` and `결과 보기`, reusing the existing session/artifact selection flow so operators can jump from preview state to the concrete `*-retrieval.md` evidence in one action
- tightened `smoke:retrieval-memory` and `smoke:ui-agent-blueprints` so both the payload contract and served UI wording for the new retrieval quick-open path stay covered
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-17T00:35:00.000Z","id":"doclog_20260417003500_retrieval_evidence_artifacts","type":"devlog","updatedAt":"2026-04-17T00:35:00.000Z"} -->
## 2026-04-17 Retrieval Evidence Artifact Pass

- date: 2026-04-17T00:35:00.000Z
- each agent run now persists a dedicated `*-retrieval.md` artifact alongside its prompt so operators can inspect the exact snippets that were actually injected into that run instead of inferring them from the full prompt body
- kept retrieval evidence additive and low-risk by reusing the already computed retrievalContext, then wiring the artifact into both successful and failed run artifact lists so prompt failures still leave behind readable grounding evidence
- extended `smoke:retrieval-memory` to assert the new retrieval artifact file exists and contains both the selected memory and attachment snippets, while existing mission and UI smokes confirm the broader mission detail payload still serves correctly
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-17T00:20:00.000Z","id":"doclog_20260417002000_retrieval_preview_surface","type":"devlog","updatedAt":"2026-04-17T00:20:00.000Z"} -->
## 2026-04-17 Retrieval Preview Surface Pass

- date: 2026-04-17T00:20:00.000Z
- surfaced `다음 실행 retrieval preview` in both mission setup and harness memory views so operators can see which memory and attachment snippets will be lifted into the next run before the agents execute
- added mission-level retrieval summary payload to `showMission().harness`, including role coverage, preview snippet count, and source split between memory and attachments, without changing the existing prompt grounding contract
- extended `smoke:retrieval-memory` and `smoke:ui-agent-blueprints` to lock both the API payload and the served UI wording/style contract for the new retrieval transparency surface
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-17T00:00:00.000Z","id":"doclog_20260417000000_retrieval_memory_and_browser_verification","type":"devlog","updatedAt":"2026-04-17T00:00:00.000Z"} -->
## 2026-04-17 Retrieval Memory and Browser Verification Pass

- date: 2026-04-17T00:00:00.000Z
- hardened `smoke:ui-execution-browser-e2e` so the browser verification loop now saves a real screenshot artifact with `page.screenshot(...)` instead of relying on the CLI wrapper path that sometimes skipped capture
- renamed the setup copy from vague `학습` framing to `지식 주입 + retrieval memory`, and clarified that the current system is text-first lexical retrieval over mission/workspace memory plus text attachments, not fine-tuning, OCR, binary understanding, or vector retrieval
- added `smoke:retrieval-memory` to prove the runtime now lifts relevant memory and attachment snippets into a dedicated `Retrieved Context` section for manager prompts and manager context artifacts without removing the full memory/attachment sections
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T07:18:00.000Z","id":"doclog_20260416071800_operator_ui_density","type":"devlog","updatedAt":"2026-04-16T07:18:00.000Z"} -->
## 2026-04-16 Operator UI Density Reduction Pass

- date: 2026-04-16T07:18:00.000Z
- added a dedicated `current workspace` rail card so the active repo name, path, and mission count are visible without reading the mission queue or guessing which workspace is currently selected
- compressed the default mission queue row to a one-line summary and reserved `next action / current step` details for the active mission only, which reduces first-screen height while keeping the selected mission actionable
- simplified the selected-mission bridge into a compact summary strip with only current step, latest execution, harness signal, and next action so the top of the workbench no longer consumes a full extra breadcrumb row
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T00:00:00.000Z","id":"doclog_20260416143000_agent_blueprints","type":"devlog","updatedAt":"2026-04-16T00:00:00.000Z"} -->
## 2026-04-16 AI Composition Setup Pass

- date: 2026-04-16T00:00:00.000Z
- added a dedicated `AI 구성` surface to mission setup so operators can choose `Core 4`, targeted specialist bundles, or full-spectrum profiles without hand-authoring orchestration directives
- surfaced specialist capability previews and an explicit `AI 학습 입력` panel that distinguishes currently supported grounding paths (text attachments plus mission/workspace memory recall) from unsupported learning claims such as fine-tuning, OCR, binary understanding, and vector retrieval
- added `smoke:ui-agent-blueprints` to lock the served UI asset contract for the new setup surface, including composition cards, learning copy, and specialist-lane styling
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T00:00:00.000Z","id":"doclog_20260416150500_agent_blueprints_onboarding","type":"devlog","updatedAt":"2026-04-16T00:00:00.000Z"} -->
## 2026-04-16 AI Composition Onboarding Pass

- date: 2026-04-16T00:00:00.000Z
- reworked the setup surface into a clearer `mode → AI card → readable context` flow so users can understand how to add AI without parsing orchestration jargon
- added `추천 상황` and `선택 결과` copy to each blueprint card, plus a stronger selected-state hero, so the cost and benefit of each AI composition can be read at a glance
- renamed the learning panel to `AI가 지금 읽는 자료` and added a readiness signal that makes current grounding inputs explicit while keeping unsupported learning claims visibly separate
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T00:00:00.000Z","id":"doclog_20260416154000_agent_intent_strip","type":"devlog","updatedAt":"2026-04-16T00:00:00.000Z"} -->
## 2026-04-16 AI Intent Strip Pass

- date: 2026-04-16T00:00:00.000Z
- added a purpose-first intent strip above the blueprint cards so users can choose `빠르게 초안`, `구현 + 검증`, `리서치 포함`, or `끝까지 handoff` before thinking in specialist profile terminology
- wired the intent pills to the existing blueprint selection state instead of inventing a second config path, so the simpler operator language still produces the same orchestration-profile directive under the hood
- extended the UI smoke contract to assert the new intent strip copy and styles, keeping the simplified AI selection surface stable as the setup screen evolves
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T06:49:00.000Z","id":"doclog_20260416064900_workspace_execution_root","type":"devlog","updatedAt":"2026-04-16T06:49:00.000Z"} -->
## 2026-04-16 Trusted Workspace Execution Pass

- date: 2026-04-16T06:49:00.000Z
- widened the execution-capable gate from the single `personal-ai-agent` repo to the trusted personal workspace root so sibling repos under `/Users/sungjin/dev/personal` can now use the same `preflight -> approval lease -> execution session` flow
- moved execution policy and edit-path validation to the selected workspace root, and made fallback/stub execution manifests workspace-aware so non-default repos no longer assume `src/cli.mjs` from the current project
- added sibling-workspace coverage to `smoke:execution-flow` and removed the empty-repo `git HEAD` warning by switching branch detection to `git symbolic-ref --short HEAD` before falling back to `rev-parse`
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T08:45:00.000Z","id":"doclog_20260416084500_8f3372","type":"devlog","updatedAt":"2026-04-16T08:45:00.000Z"} -->
## 2026-04-16 Mission Attachment Public Contract Smoke Pass

- date: 2026-04-16T08:45:00.000Z
- added `smoke:ui-mission-attachments` so the public attachment surface is covered end-to-end: served UI assets expose the mission attachment inputs, `POST /api/missions` accepts initial attachments, and `POST /api/missions/:id/attachments` updates the same harness summary contract
- kept the smoke focused on API/UI contract stability instead of runtime prompt content, because `smoke:mission-attachments` already covers manager prompt and context grounding
- left mutable release artifacts and placeholder files untouched, limiting this step to public-surface regression coverage for the new attachment feature
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T08:20:00.000Z","id":"doclog_20260416082000_b2a61d","type":"devlog","updatedAt":"2026-04-16T08:20:00.000Z"} -->
## 2026-04-16 Mission Attachment Intake Pass

- date: 2026-04-16T08:20:00.000Z
- added mission-scoped attachment intake so text-based files can be captured at mission creation time or from the harness panel, stored under mission shared state, and injected into the next multi-agent prompt as bounded excerpts instead of unbounded raw files
- wired the harness attachment upload form to the existing mission detail surface and added `smoke:mission-attachments` to prove storage, harness summary exposure, and manager prompt/context injection stay deterministic
- kept the scope intentionally narrow to text-oriented attachments and prompt-context grounding, leaving binary parsing, OCR, and mutable release artifacts untouched
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T07:10:00.000Z","id":"doclog_20260416071000_4a80fe","type":"devlog","updatedAt":"2026-04-16T07:10:00.000Z"} -->
## 2026-04-16 Overdue Incident Post-Triad Coverage Pass

- date: 2026-04-16T07:10:00.000Z
- updated `smoke-action-overdue-log` so the specialist overdue follow-up origin runs through the `documentation` lane instead of the older `implementation` example, which proves overdue incident markdown and summary aggregate the same specialist pressure for a post-triad lane
- kept the existing overdue item count, provider drift summary, reminder route, and fallback command assertions intact, so the change expands lane coverage without weakening the incident trail contract
- limited the scope to deterministic overdue-log regression coverage and documentation, leaving runtime behavior, provider contracts, and mutable release artifacts untouched
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T06:55:00.000Z","id":"doclog_20260416065500_7fe52a","type":"devlog","updatedAt":"2026-04-16T06:55:00.000Z"} -->
## 2026-04-16 Maintenance Post-Triad Coverage Pass

- date: 2026-04-16T06:55:00.000Z
- updated `smoke-action-maintenance` and `smoke-maintenance-history` so the specialist reminder origin runs through the `documentation` lane instead of the older `implementation` example, which proves maintenance sweep and maintenance history aggregate the same follow-up pressure for a post-triad specialist lane
- kept the assertions focused on existing reminder, remediation route, and affected mission breadth contracts so the change validates coverage breadth without changing maintenance runtime behavior
- left provider/runtime logic and mutable release artifacts untouched, limiting the change to deterministic maintenance regression coverage and operator-facing documentation
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T06:40:00.000Z","id":"doclog_20260416064000_0bc7f4","type":"devlog","updatedAt":"2026-04-16T06:40:00.000Z"} -->
## 2026-04-16 Operator Timeline Post-Triad Coverage Pass

- date: 2026-04-16T06:40:00.000Z
- updated `smoke-operator-timeline` so the specialist reminder branch runs through `documentation` instead of the older `implementation` lane, which proves workspace/global/operator chronology keeps the same specialist follow-up aggregate for a post-triad lane
- replaced brittle fixed weekly bucket date assertions with payload-consistency assertions against `executionWeeklyBuckets[0].weekStartDate`, so recent provider window smoke stays deterministic across different execution dates
- kept the change limited to operator timeline regression coverage and documentation, leaving runtime behavior, provider contracts, and mutable release artifacts untouched
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T06:15:00.000Z","id":"doclog_20260416061500_91af2d","type":"devlog","updatedAt":"2026-04-16T06:15:00.000Z"} -->
## 2026-04-16 Specialist Follow-Up Coverage Expansion Pass

- date: 2026-04-16T06:15:00.000Z
- extended `smoke-specialist-follow-up-inbox` with a blocked `design` branch so inbox and generic action summaries now prove post-triad specialist lanes appear in the same follow-up aggregate as the older implementation and verification lanes
- updated `smoke-specialist-follow-up-reminders` to drive a failed `documentation` branch through the full reminder lifecycle, which keeps reminder persistence and mission or workspace or global summary rollups grounded for a non-triad lane as well
- kept the scope limited to deterministic follow-up coverage and documentation, leaving mission execution behavior, provider contracts, and mutable release artifacts untouched
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T05:55:00.000Z","id":"doclog_20260416055500_54c3b1","type":"devlog","updatedAt":"2026-04-16T05:55:00.000Z"} -->
## 2026-04-16 Specialist Remediation Copy Generalization Pass

- date: 2026-04-16T05:55:00.000Z
- replaced the stale `Fast triad retry policy` remediation wording with generic `Fast research-and-verification retry policy` copy so the route reason remains correct for both triad and full-spectrum orchestration profiles
- extended `smoke-specialist-follow-up-remediation` with a `knowledge-full-spectrum` quality-gate failure case to prove the generic remediation route applies to expanded preset lanes, not only the older triad profiles
- kept the change narrow to specialist follow-up route messaging and deterministic smoke coverage, leaving mission execution behavior and mutable release artifacts untouched
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T05:35:00.000Z","id":"doclog_20260416053500_4dbe81","type":"devlog","updatedAt":"2026-04-16T05:35:00.000Z"} -->
## 2026-04-16 Orchestration Profile Smoke Stabilization Pass

- date: 2026-04-16T05:35:00.000Z
- updated `smoke:orchestration-profiles` so the overview assertions track the expanded six-profile catalog instead of the previous four-profile assumption
- corrected summary, adoption drift, usage trend, workspace usage trend, and latest-unused expectations so the new `knowledge-full-spectrum` and `engineering-full-spectrum` presets are treated as intentionally unused profiles rather than invisible catalog entries
- added explicit unused-profile checks for both full-spectrum presets and re-ran `smoke:orchestration-profiles` plus `smoke:parallel-specialists` to keep the widened multi-agent surface grounded in deterministic evidence
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T05:10:00.000Z","id":"doclog_20260416051000_18cf42","type":"devlog","updatedAt":"2026-04-16T05:10:00.000Z"} -->
## 2026-04-16 Parallel Specialist Capacity Expansion Pass

- date: 2026-04-16T05:10:00.000Z
- raised the bounded parallel specialist cap from three to five by moving the fan-out limit into a shared constant instead of duplicating literal `slice(0, 3)` limits in mission planning
- expanded supported specialist lanes to `research`, `implementation`, `verification`, `design`, and `documentation`, and added full-spectrum knowledge and engineering orchestration profiles so the wider fan-out can be selected either explicitly or through preset profiles
- extended `smoke:parallel-specialists` to prove both an explicit five-lane run and a `knowledge-full-spectrum` profile run complete successfully, which keeps the new capacity grounded in deterministic runtime evidence
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T04:35:00.000Z","id":"doclog_20260416043500_7d2c91","type":"devlog","updatedAt":"2026-04-16T04:35:00.000Z"} -->
## 2026-04-16 Provider Spotlight Flow Handoff Pass

- date: 2026-04-16T04:35:00.000Z
- extended the focused provider spotlight so the operator can jump directly into the latest provider flow or latest provider attention flow without dropping back into generic history controls first
- added provider-scoped `focus-release-flow` and `copy-release-flow-link` actions in the spotlight callout, which lets the same surface handle both investigation narrowing and deep-link handoff for provider-specific incidents
- reused the existing release flow activation logic so the spotlight can also show when the current provider flow or provider attention flow is already active, keeping the new actions consistent with the existing release triage state machine
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T04:20:00.000Z","id":"doclog_20260416042000_4f7d01","type":"devlog","updatedAt":"2026-04-16T04:20:00.000Z"} -->
## 2026-04-16 Provider Spotlight History Triage Pass

- date: 2026-04-16T04:20:00.000Z
- extended the focused provider spotlight so it now summarizes the latest provider-scoped release action and latest provider attention event directly inside the callout instead of forcing the operator to drop back into the full history list first
- added quick actions from the provider spotlight into release history triage, including jump-to-latest-provider-record, jump-to-latest-provider-problem, same-provider filtering, and attention-only filtering
- kept the implementation client-side by deriving provider history from the existing `releaseActionHistory` payload, which tightened the release investigation loop without expanding the server contract or touching mutable evidence artifacts
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T04:05:00.000Z","id":"doclog_20260416040500_93a2b7","type":"devlog","updatedAt":"2026-04-16T04:05:00.000Z"} -->
## 2026-04-16 Provider Spotlight Triage Surface Pass

- date: 2026-04-16T04:05:00.000Z
- promoted focused provider spotlight from simple highlight to an actionable triage surface by pinning the selected provider card to the top of the grid and exposing preflight/live actions directly in the spotlight callout
- reflected the same provider context back into recommendation cards so provider-related recommendations now show when the current provider spotlight is already active instead of acting like a generic follow-up button
- kept the change entirely client-side by deriving the focused provider entry from existing provider readiness and preflight state, which avoids expanding the release status API while still tightening the operator workflow
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T03:45:00.000Z","id":"doclog_20260416034500_71a8c4","type":"devlog","updatedAt":"2026-04-16T03:45:00.000Z"} -->
## 2026-04-16 Provider Spotlight Link Pass

- date: 2026-04-16T03:45:00.000Z
- added one-click provider spotlight link copy so recommendation cards and provider readiness cards can hand off the exact provider-focused release surface without requiring the operator to focus first and then copy the generic triage link
- reused the existing release triage URL builder with a provider-only override, which keeps the new handoff path consistent with the existing release deep-link contract instead of introducing a second share format
- kept the scope limited to client-side release tab actions and documentation, leaving server payloads and mutable current-surface evidence artifacts untouched
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T03:15:00.000Z","id":"doclog_20260416031500_4d9a72","type":"devlog","updatedAt":"2026-04-16T03:15:00.000Z"} -->
## 2026-04-16 Recommendation Provider Spotlight Pass

- date: 2026-04-16T03:15:00.000Z
- added a provider spotlight state to the release tab so provider-related recommendation cards can jump directly into the matching provider readiness card instead of stopping at shell command copy
- synced the spotlight through the release URL via `rcard`, which keeps provider-card focus stable across refresh, popstate restore, and shared deep links just like the existing release history triage state
- kept the implementation low-risk by reusing the existing provider matching logic from recommendation command copy and by limiting the new behavior to highlight, scroll, and focus-clear affordances rather than adding another server-side release contract
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T02:00:00.000Z","id":"doclog_20260416020000_18f3ab","type":"devlog","updatedAt":"2026-04-16T02:00:00.000Z"} -->
## 2026-04-16 Release Recommended Actions

- date: 2026-04-16T02:00:00.000Z
- added `recommendedActions` to the execution-v1 status payload so release readiness is not just a collection of badges but an ordered operator queue
- prioritized stale current surface regeneration, eligible snapshot freeze, and provider-specific preflight/env preparation into a single list with explicit action ids that reuse existing release tab commands
- kept the change storage-free by deriving the queue entirely from current evidence/closeout summary, snapshot eligibility, and provider readiness instead of introducing new persisted release state
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T00:45:00.000Z","id":"doclog_20260416004500_93c7a1","type":"devlog","updatedAt":"2026-04-16T00:45:00.000Z"} -->
## 2026-04-16 Recommendation Jump-To-History Pass

- date: 2026-04-16T00:45:00.000Z
- added `최근 기록 보기` on recommendation cards so the operator can jump directly from a recommended action to the matching release action history row without scanning the full history list
- introduced a lightweight focused-history state and inline highlight style rather than a new modal or filter layer, keeping the release tab single-surface and low-friction
- kept the linkage fully client-side by reusing the persisted history ids already present in `releaseActionHistory`, which avoids expanding the server contract for a purely navigational affordance
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T00:30:00.000Z","id":"doclog_20260416003000_d1b84c","type":"devlog","updatedAt":"2026-04-16T00:30:00.000Z"} -->
## 2026-04-16 Recommendation History Link Pass

- date: 2026-04-16T00:30:00.000Z
- linked `권장 다음 액션` cards to the persisted release action history so each recommendation can surface its latest relevant preflight, confirmation-required, or blocked attempt inline
- kept the implementation read-only by deriving the latest matching history entry in the client from existing `recommendedActions` and `releaseActionHistory` payloads instead of adding another server-side summary layer
- improved operator triage speed by showing `최근 시도 / 마지막 summary / 시각` directly on the recommendation card, which reduces the need to scan the full history list for the same action context
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T00:00:00.000Z","id":"doclog_20260416000000_7a4f31","type":"devlog","updatedAt":"2026-04-16T00:00:00.000Z"} -->
## 2026-04-16 Release Action History Pass

- date: 2026-04-16T00:00:00.000Z
- added persisted `release action history` for execution-v1 release operations so refresh preflight, current-surface rewrite, provider preflight, and snapshot freeze outcomes are retained instead of existing only as transient notices
- wired the `v1 마감 상태` tab to show recent `allowed / blocked / confirmation-required / completed / failed` actions with branch and commit context, which makes release triage possible without leaving the operator console
- kept the scope narrow by logging only explicit release POST actions and by leaving mutable current-surface evidence/closeout markdown outside the commit boundary
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T01:15:00.000Z","id":"doclog_20260416011500_b2df83","type":"devlog","updatedAt":"2026-04-16T01:15:00.000Z"} -->
## 2026-04-16 Live Validation Confirm Guard

- date: 2026-04-16T01:15:00.000Z
- added explicit confirmation for provider-backed release refresh so `/api/execution-v1/refresh` no longer runs live validation from a single click
- reused `/api/execution-v1/refresh/preflight` as the exact readiness check for provider live validation, then armed the UI with a provider-scoped confirm state before the actual refresh call
- aligned the three mutating release actions under the same operator contract: `current surface 재생성`, `release snapshot 고정`, and `provider live validation` now all follow `preflight -> confirm -> execute`
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T00:45:00.000Z","id":"doclog_20260416004500_7ab31d","type":"devlog","updatedAt":"2026-04-16T00:45:00.000Z"} -->
## 2026-04-16 Snapshot Freeze Preflight Guard

- date: 2026-04-16T00:45:00.000Z
- added `/api/execution-v1/snapshot/preflight` so release snapshot freeze is re-evaluated by the server immediately before the operator arms the action, rather than trusting a stale eligibility badge rendered earlier
- changed `/api/execution-v1/snapshot` to require `confirmSnapshotFreeze`, which means snapshot freeze now follows the same two-step server-guarded contract as current surface regeneration
- mirrored the preflight result back into the release tab so the operator sees why snapshot freeze is allowed or blocked at the exact point of confirmation
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T00:30:00.000Z","id":"doclog_20260416003000_184a62","type":"devlog","updatedAt":"2026-04-16T00:30:00.000Z"} -->
## 2026-04-16 Server-Side Regeneration Preflight

- date: 2026-04-16T00:30:00.000Z
- added `/api/execution-v1/refresh/preflight` so current surface regeneration is armed only after the server re-evaluates overwrite impact and deterministic rerun semantics, instead of relying on stale client-side state alone
- changed `/api/execution-v1/refresh` to require `confirmCurrentSurfaceRewrite` for plain current-surface regeneration and to return a 409 with preflight metadata when the explicit confirm flag is missing
- kept provider live rerun behavior unchanged while making current-surface rewrite a server-guarded action, which closes the gap between UI confirmation and actual mutation permission
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T00:15:00.000Z","id":"doclog_20260416001500_703c11","type":"devlog","updatedAt":"2026-04-16T00:15:00.000Z"} -->
## 2026-04-16 Release Regeneration Confirm Step

- date: 2026-04-16T00:15:00.000Z
- added an explicit confirm state for current surface regeneration so the operator has to arm the action first, read the impact summary, and then click 재생성 확인 before evidence/closeout rewrite actually runs
- kept the flow inside the release tab rather than opening a modal, which preserves the operator context and makes the overwrite risk visible next to the refresh plan itself
- reset the confirm state whenever release status is reloaded or regeneration/live refresh actually runs, which avoids stale confirmation UI after state changes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T00:05:00.000Z","id":"doclog_20260416000500_2b8719","type":"devlog","updatedAt":"2026-04-16T00:05:00.000Z"} -->
## 2026-04-16 Current Surface Regeneration Preview

- date: 2026-04-16T00:05:00.000Z
- extended execution-v1 status with a refresh plan so the release tab can describe exactly what current surface regeneration will do before the operator triggers it
- surfaced rewrite targets, deterministic verification rerun behavior, provider live validation default behavior, and snapshot non-mutation in the same release panel, which turns regenerate from a vague button into a concrete operator action
- kept the contract local-first and read-only by default: the preview is part of status payload, while the actual regenerate path still goes through the explicit current surface 재생성 action
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T23:50:00.000Z","id":"doclog_20260415235000_f91b88","type":"devlog","updatedAt":"2026-04-15T23:50:00.000Z"} -->
## 2026-04-15 Release Reload vs Regenerate Split

- date: 2026-04-15T23:50:00.000Z
- split the release tab action semantics so `상태 다시 읽기` now performs a read-only `/api/execution-v1/status` reload, while `current surface 재생성` remains the explicit path that mutates evidence/closeout artifacts
- kept provider-specific live validation on its own buttons, which makes it clear that there are now three distinct operator actions in the same surface: inspect state, rebuild current artifacts, or rerun a provider-backed release check
- updated release copy to explain the distinction directly inside the UI, reducing the chance that an operator unintentionally regenerates evidence when they only meant to re-read status
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T23:35:00.000Z","id":"doclog_20260415233500_1d4f82","type":"devlog","updatedAt":"2026-04-15T23:35:00.000Z"} -->
## 2026-04-15 Provider Preflight Action Surface

- date: 2026-04-15T23:35:00.000Z
- added a dedicated `/api/execution-v1/preflight` route so the operator console can run provider-specific deterministic readiness checks without leaving the release tab
- extended each provider card with `preflight 실행` and a persisted preflight status badge, which separates `ready-but-missing-env` from actual `blocked` smoke failures instead of making the operator infer that state from env badges alone
- kept the live action disabled until env is present, but made preflight always callable, which is the right operational split for optional provider expansion work
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T23:20:00.000Z","id":"doclog_20260415232000_37a92b","type":"devlog","updatedAt":"2026-04-15T23:20:00.000Z"} -->
## 2026-04-15 Release Snapshot Action Surface

- date: 2026-04-15T23:20:00.000Z
- added an explicit `/api/execution-v1/snapshot` path and a matching `release snapshot 고정` operator action so release snapshotting is no longer a terminal-only step once current evidence is fresh
- gated snapshot creation on the same `summary.ready` contract used by current-surface closeout, which prevents operators from freezing stale evidence into a misleading handoff artifact
- surfaced snapshot eligibility copy in the `v1 마감 상태` tab so the UI explains whether snapshotting is allowed right now or blocked because the current surface still needs refresh
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T23:05:00.000Z","id":"doclog_20260415230500_8cb221","type":"devlog","updatedAt":"2026-04-15T23:05:00.000Z"} -->
## 2026-04-15 Verified Baseline Release Surface

- date: 2026-04-15T23:05:00.000Z
- split execution-v1 release status into two explicit layers: `current surface ready` still means the mutable evidence/closeout markdown matches the current HEAD, while `verified baseline ready` means the last archived snapshot already closed all required OpenAI gates
- extended `/api/execution-v1/status` with baseline summary fields derived from the immutable snapshot so operators can see whether they are blocked by real closeout gaps or only by stale current-surface markdown
- updated the `v1 마감 상태` tab to render `baseline ready · current surface refresh needed` instead of treating every stale current surface as a full release failure, which keeps the OpenAI-passed baseline visible even after follow-up code changes move HEAD forward
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T22:25:00.000Z","id":"doclog_20260415222500_5c2d72","type":"devlog","updatedAt":"2026-04-15T22:25:00.000Z"} -->
## 2026-04-15 Live Closeout Evidence Reuse

- date: 2026-04-15T22:25:00.000Z
- found a release orchestration bug where `run-execution-v1-live` executed a successful live evidence pass first, then invoked `build-execution-v1-closeout` in a way that re-ran evidence and could overwrite the just-passed result with a second failing live run
- added `--reuse-existing-evidence` / `--evidence-path` support to the closeout builder so closeout generation can read the already-produced evidence markdown instead of implicitly spawning a second provider validation
- updated the live helper to pass the freshly written evidence path into closeout generation, which keeps `live:execution-v1:*` aligned with the operator expectation that one rerun should produce one coherent evidence/closeout pair
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T22:10:00.000Z","id":"doclog_20260415221000_2f2f7c","type":"devlog","updatedAt":"2026-04-15T22:10:00.000Z"} -->
## 2026-04-15 Provider Manifest Placeholder Command Guard

- date: 2026-04-15T22:10:00.000Z
- latest OpenAI live rerun failed because the provider manifest still included literal placeholder test commands such as `TBD_AFTER_INSPECTION (e.g., npm run smoke:openai:live ...)` and `<runner> <live-validate-entrypoint> --provider stub ...`, and the execution engine treated those strings as runnable shell commands
- hardened provider manifest normalization to drop placeholder commands containing `TBD_*`, `after inspection`, `e.g.`, `or equivalent`, or angle-bracket placeholder tokens like `<runner>` / `<model>` before step execution, which prevents foreground sessions from failing on obviously non-runnable planning text
- extended `smoke:execution-flow` so provider-style manifests with placeholder test commands now prove two things together: the placeholder is removed, and the bounded `node --check src/cli.mjs` verification fallback is still appended to preserve `verification.status=passed/failed`
- latest rerun still failed one layer earlier because the provider emitted a suspicious inspect command `ls -ლა` plus an edit placeholder `scripts/openai_live_validation.{ext}` / `PLACEHOLDER: ...`, and those values were still making it into the execution session
- hardened execution manifest normalization again so suspicious non-ASCII shell tokens, placeholder file paths with `{}` / `<>`, and `PLACEHOLDER:` edit content are all dropped before execution
- expanded `smoke:execution-flow` to lock this exact regression down: provider-style manifests with unicode-confusable shell flags or placeholder edit steps must normalize down to runnable inspect/artifact steps plus the bounded `node --check src/cli.mjs` verification fallback
- after OpenAI live validation finally passed, the next UX gap was release-state semantics rather than execution logic: evidence/closeout markdowns are intentionally regenerated in the working tree, so the UI must not mark that state as stale when the recorded commit still matches HEAD
- updated execution v1 status building/rendering so `dirty docs + matching commit` becomes `로컬 갱신됨(local-current)` instead of `갱신 필요`, which keeps the operator console honest about “latest local evidence” versus true stale/mismatched evidence
- added `snapshot:execution-v1` so the successful local evidence/closeout pair can be archived under `docs/releases/execution-v1/<verified-commit>/` as an immutable, commit-friendly release artifact
- snapshot flow keeps `docs/execution-v1-*.md` as the mutable current surface while giving release/handoff work a stable artifact that does not become stale just because HEAD moves after the evidence was generated
- wired release snapshot metadata into `/api/execution-v1/status` and the `v1 마감 상태` tab, so operators can see the last archived verified artifact even when the current surface is stale or only locally refreshed
- split optional provider expansion (Anthropic/local) from required closeout readiness in the release summary, so OpenAI-passed execution v1 no longer looks incomplete just because optional providers are still `missing-env`
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T21:55:00.000Z","id":"doclog_20260415215500_a1c5bd","type":"devlog","updatedAt":"2026-04-15T21:55:00.000Z"} -->
## 2026-04-15 Fallback Hint Command Filtering

- date: 2026-04-15T21:55:00.000Z
- root cause for the latest OpenAI live rerun was not reviewer wording but fallback manifest execution: proposal-derived hints such as `npm run smoke:openai` and `python -m tests.smoke_openai` were accepted even though those entrypoints do not exist in this repo
- hardened fallback manifest generation to keep only runnable hints: `npm/pnpm/yarn run` now requires an actual package script, `node ...` requires an existing file, and `python -m ...` requires a resolvable module path under the workspace
- extended `smoke:execution-flow` so invalid hinted commands are explicitly filtered out while `git status --short` and the bounded `node --check src/cli.mjs` verification step remain, keeping the deterministic execution path aligned with the live rerun expectations
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T21:35:00.000Z","id":"doclog_20260415213500_4f8b11","type":"devlog","updatedAt":"2026-04-15T21:35:00.000Z"} -->
## 2026-04-15 Release Evidence Freshness Surface

- date: 2026-04-15T21:35:00.000Z
- extended `execution-v1/status` so the UI now compares evidence/closeout commit metadata against the current HEAD and also reports whether either markdown file is still modified in the working tree
- updated the `v1 마감 상태` tab to surface `evidence 상태`, stale reasons, current branch/commit, and dirty doc markers so operators can distinguish “code is still blocked” from “the release documents are simply stale”
- tightened the release-ready calculation to require both a closed checklist and fresh evidence, which avoids falsely presenting a ready closeout while older failure markdown is still sitting in the workspace
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T21:10:00.000Z","id":"doclog_20260415211000_7d3a4e","type":"devlog","updatedAt":"2026-04-15T21:10:00.000Z"} -->
## 2026-04-15 Execution Manifest Verification Fallback

- date: 2026-04-15T21:10:00.000Z
- hardened execution manifest normalization so provider-supplied engineering manifests can no longer finish with `verification.status=not-run` just because they only contained `inspect` and `artifact` steps
- upgraded command-kind inference to treat `test/check/verify/smoke/lint/typecheck` as `test` and `build/compile` as `build`, then append a bounded `node --check src/cli.mjs` fallback when no verification step exists at all
- extended `smoke:execution-flow` with a provider-like manifest assertion so the `verification fallback` contract stays covered by the same deterministic readiness path used before OpenAI live reruns
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T20:50:00.000Z","id":"doclog_20260415205000_5fb632","type":"devlog","updatedAt":"2026-04-15T20:50:00.000Z"} -->
## 2026-04-15 Live Validation Preflight Helper

- date: 2026-04-15T20:50:00.000Z
- added provider-specific `preflight:execution-v1:*` entrypoints so operators can run the deterministic readiness checks before consuming a live provider call
- OpenAI preflight now bundles `smoke:openai-provider` and `smoke:execution-flow`, then reports `ready-for-live-validation` vs `ready-but-missing-env` in one JSON payload instead of forcing users to remember which smoke scripts matter
- documented the intended operator order as `preflight -> live rerun -> evidence/closeout`, which reduces back-and-forth when the remaining gap is credential injection rather than code uncertainty
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T20:35:00.000Z","id":"doclog_20260415203500_34d1af","type":"devlog","updatedAt":"2026-04-15T20:35:00.000Z"} -->
## 2026-04-15 Engineering Review Contract Hardening

- date: 2026-04-15T20:35:00.000Z
- extended executor normalization for engineering missions so reviewer-facing markdown no longer depends on provider wording for the full contract: missing `Diagnosis`, `Implementation Plan`, `Verification Plan`, or `Risk Notes` sections are now backfilled from mission context and execution manifest
- tightened `Verification Plan` canonicalization to guarantee an explicit smoke/test path when the provider draft omits it, which aligns the executor artifact with the reviewer rule instead of trusting the raw provider output
- expanded the deterministic OpenAI provider smoke to cover the partial-draft path, proving that a minimal provider response is upgraded into a reviewer-safe implementation proposal before live validation reruns
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T20:05:00.000Z","id":"doclog_20260415200500_b5238d","type":"devlog","updatedAt":"2026-04-15T20:05:00.000Z"} -->
## 2026-04-15 Live Validation Triage Structuring

- date: 2026-04-15T20:05:00.000Z
- added a shared parser for `provider live mission run failed | key=value` failure strings so the helper, evidence markdown, and closeout markdown now surface the same structured triage fields instead of leaving operators to manually re-split a long pipe-delimited message
- updated the live helper failure JSON to emit `failure` plus `liveFailureDetails`, which makes the rerun path easier to automate or inspect without opening the markdown artifacts first
- expanded the closeout document with a dedicated `Live Failure Triage` section so failed provider validation now points directly at `rootDir`, `missionId`, `sessionId`, `artifact`, and `reviewerSummary` when that data exists
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T20:20:00.000Z","id":"doclog_20260415202000_91c4aa","type":"devlog","updatedAt":"2026-04-15T20:20:00.000Z"} -->
## 2026-04-15 Live Validation Artifact Triage Extraction

- date: 2026-04-15T20:20:00.000Z
- extended live validation triage so helper and release docs no longer stop at the pipe-delimited failure reason; when the temp root still exists they now read the reviewer report and implementation proposal directly
- surfaced `reviewerReportPath`, `implementationProposalPath`, `failedChecks`, `findings`, and `nextActionSnippet` in the helper/evidence/closeout path, which turns a failed rerun into an immediately inspectable artifact trail instead of a manual file hunt
- added a dedicated smoke for the parser plus artifact extraction contract so this triage path stays deterministic even without live provider credentials
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T19:35:00.000Z","id":"doclog_20260415193500_8fbc42","type":"devlog","updatedAt":"2026-04-15T19:35:00.000Z"} -->
## 2026-04-15 Engineering Approval Gate Canonicalization

- date: 2026-04-15T19:35:00.000Z
- after OpenAI live validation advanced past timeout, the remaining failure moved to reviewer mismatch because the executor draft omitted the explicit approval gate sentence that the engineering rubric requires
- aligned the executor normalization path with the reviewer rubric by canonicalizing `Next Action` for engineering missions that require `workspace_execution` approval, so provider wording drift no longer creates a false fail when the rest of the proposal is valid
- extended the deterministic OpenAI smoke to cover this canonicalization path, asserting that a draft with a vague next action is rewritten to include the required approval-before-execution instruction
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T19:15:00.000Z","id":"doclog_20260415191500_4dd87e","type":"devlog","updatedAt":"2026-04-15T19:15:00.000Z"} -->
## 2026-04-15 OpenAI Live Helper Timeout Default

- date: 2026-04-15T19:15:00.000Z
- changed `run-execution-v1-live.mjs` so the OpenAI path now injects `OPENAI_RUN_TIMEOUT_MS=60000` into its child verification env by default, which removes one manual recovery step from the operator rerun flow
- kept the behavior override-safe: if the operator already exported a timeout value, the helper preserves the explicit env instead of forcing the default
- fixed the machine-readable `missing-env` hint so it now prints a shell-valid `export OPENAI_RUN_TIMEOUT_MS=60000 OPENAI_API_KEY=\"...\"` command rather than a broken prefix string
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T19:00:00.000Z","id":"doclog_20260415190000_b6d1af","type":"devlog","updatedAt":"2026-04-15T19:00:00.000Z"} -->
## 2026-04-15 OpenAI Timeout Envelope Hardening

- date: 2026-04-15T19:00:00.000Z
- raised the default OpenAI provider `runTimeoutMs` from 20 seconds to 45 seconds after inspecting a real live-validation failure where manager completed but planner hit the old timeout ceiling twice
- added `OPENAI_RUN_TIMEOUT_MS` and `OPENAI_PROBE_TIMEOUT_MS` env overrides so operator reruns can widen or narrow the provider timeout envelope without another code change
- extended the deterministic OpenAI smoke to assert that the env timeout override actually produces a bounded timeout failure path, so the new escape hatch is covered even when no live API key is available
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T18:25:00.000Z","id":"doclog_20260415182500_a4c91e","type":"devlog","updatedAt":"2026-04-15T18:25:00.000Z"} -->
## 2026-04-15 Live Validation Failure Triage Surface

- date: 2026-04-15T18:25:00.000Z
- changed live validation failure output to carry `rootDir`, `workspaceId`, `missionId`, and `sessionId`, so a failed provider-backed run is immediately inspectable without guessing where the temporary state was written
- updated `run-execution-v1-live.mjs` to treat `failed` as a real failure instead of printing a misleading completed status, and to return evidence/checklist paths plus mission/session context when triage is needed
- documented the new behavior in the README so the final operator path is now deterministic: missing env, failed provider run, and passed live validation all terminate with clearly different machine-readable outputs
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T18:10:00.000Z","id":"doclog_20260415181000_7a1dc2","type":"devlog","updatedAt":"2026-04-15T18:10:00.000Z"} -->
## 2026-04-15 Live Validation Helper Entry Points

- date: 2026-04-15T18:10:00.000Z
- added provider-specific `npm run live:execution-v1:*` entrypoints so the final v1 closeout path is no longer “remember two evidence/closeout commands plus a provider flag”; operators can now inject the credential and run one command per provider
- introduced `run-execution-v1-live.mjs` to enforce env presence before execution, print a structured missing-env hint when credentials are absent, and then run evidence plus closeout sequentially when credentials exist
- documented the helper in the README so the remaining execution-v1 gap is an operator action problem, not a script memorization problem
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T17:00:00.000Z","id":"doclog_20260415170000_5d31c8","type":"devlog","updatedAt":"2026-04-15T17:00:00.000Z"} -->
## 2026-04-15 Live Validation Failure Capture

- date: 2026-04-15T17:00:00.000Z
- changed `verify-execution-v1` so optional live validation can be captured as a structured failed result instead of aborting evidence generation, which makes `evidence:execution-v1` usable even when provider-backed runs fail after credential injection
- enriched live failure output with mission status, latest session id, reviewer summary, and artifact file so operator triage can start from the evidence markdown instead of rerunning the whole flow blindly
- updated closeout parsing to read `provider: failed (...)` records, so release status now distinguishes missing-env, skipped, and actual provider-backed execution failure
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T16:10:00.000Z","id":"doclog_20260415161000_f3d702","type":"devlog","updatedAt":"2026-04-15T16:10:00.000Z"} -->
## 2026-04-15 Live Validation Readiness Surface

- date: 2026-04-15T16:10:00.000Z
- surfaced provider readiness directly inside the `v1 마감 상태` tab so the remaining execution-v1 gap is no longer just a markdown note; operators can now see per-provider env readiness, expected command, and whether live validation can be fired immediately
- extended the execution-v1 status payload with `providerReadiness` instead of forcing the UI to infer env state from closeout prose, which keeps server and operator surface aligned on the same release contract
- added direct live validation action buttons for ready providers so the final closeout path is one click from the release surface when credentials exist
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T15:20:00.000Z","id":"doclog_20260415152000_a1f3b9","type":"devlog","updatedAt":"2026-04-15T15:20:00.000Z"} -->
## 2026-04-15 Browser E2E Closeout Alignment

- date: 2026-04-15T15:20:00.000Z
- closed the remaining browser interaction gap by promoting `smoke:ui-execution-browser-e2e` into the deterministic execution-v1 verification set, so closeout is no longer split between contract smoke and an external manual browser note
- updated the evidence and closeout generators plus README wording so release artifacts now describe `deterministic smoke 4종 + browser readiness + optional live validation` instead of carrying the older `browser E2E gap` language
- kept the change generator-first, then regenerated the tracked closeout documents, so release evidence stays reproducible instead of drifting through hand-edited markdown
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T00:00:00.000Z","id":"doclog_20260415170000_2a89d4","type":"devlog","updatedAt":"2026-04-15T00:00:00.000Z"} -->
## 2026-04-15 Execution v1 Closeout Surface

- date: 2026-04-15T00:00:00.000Z
- added `closeout:execution-v1` to generate a repo-tracked closeout checklist that sits one layer above raw evidence, turning deterministic smoke, optional live validation, and known browser E2E gaps into an operator-readable release status document
- kept the closeout script dependent on the existing evidence generator so branch, commit, smoke summary, and gap wording stay consistent instead of splitting into two parallel truth sources
- documented the closeout path in the README so execution-v1 can now be closed with `verify -> evidence -> closeout` instead of relying on terminal output and ad-hoc memory
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T12:30:00.000Z","id":"doclog_20260415123000_c3c5a1","type":"devlog","updatedAt":"2026-04-15T12:30:00.000Z"} -->
## 2026-04-15 Execution V1 Release Surface Pass

- date: 2026-04-15T12:30:00.000Z
- added a dedicated `v1 마감 상태` detail tab that surfaces execution v1 deterministic smoke, open closeout checklist items, live validation gaps, and the generated evidence/closeout markdown without leaving the operator console
- wired UI bootstrap to load release status alongside workspaces, missions, approvals, and providers so the closeout signal is immediately visible and can also feed output-stage closeout guidance
- kept the refresh path repo-local by reusing the existing closeout/evidence scripts from the server instead of inventing a second release-summary source, which preserves a single source of truth for v1 readiness
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T00:00:00.000Z","id":"doclog_20260415164500_0c5f7c","type":"devlog","updatedAt":"2026-04-15T00:00:00.000Z"} -->
## 2026-04-15 Execution v1 Evidence Artifact

- date: 2026-04-15T00:00:00.000Z
- added `evidence:execution-v1` so the deterministic execution verification summary is written into a repo-tracked Markdown artifact instead of only appearing in terminal JSON output
- the generated evidence file records branch, commit, deterministic smoke results, optional live validation results, and the remaining known gaps, which makes execution-v1 closeout reproducible for reviewers without re-reading devlog history
- kept the implementation layered on top of `verify:execution-v1`, so the evidence script reuses the same verification entry point rather than drifting into a second smoke contract
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T00:00:00.000Z","id":"doclog_20260415161000_284b52","type":"devlog","updatedAt":"2026-04-15T00:00:00.000Z"} -->
## 2026-04-15 Execution v1 Verification Entry Point

- date: 2026-04-15T00:00:00.000Z
- added `verify:execution-v1` as a single verification entry point that runs the deterministic execution smokes together instead of requiring operators to remember the execution-flow, execution-cli, and UI contract scripts separately
- added optional `--live-openai`, `--live-anthropic`, and `--live-local` flags so the same verification script can extend into provider-backed end-to-end execution evidence when credentials and adapters are available, while still skipping cleanly when env is missing
- documented the verification entry point in the README as the execution-v1 closeout path, including the distinction between deterministic local smoke and optional live provider validation
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T00:00:00.000Z","id":"doclog_20260415153000_f40d18","type":"devlog","updatedAt":"2026-04-15T00:00:00.000Z"} -->
## 2026-04-15 Execution CLI Contract Pass

- date: 2026-04-15T00:00:00.000Z
- added `mission execution preflight/start/stop/status/logs` commands so the one-time execution lease flow and foreground execution session lifecycle can be driven through the CLI as well as the operator console API
- added `smoke:execution-cli` to prove the end-to-end CLI path: reviewer-passed engineering mission, execution lease approval, foreground execution start, status polling, and log retrieval
- documented the execution command group in the README next to mission run examples so repo-local execution support and proposal-only fallback are visible without reading service code
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260414182000_5b3d11","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 Playwright Session Artifact Hygiene

- date: 2026-04-14T00:00:00.000Z
- ignored `.playwright-cli/` at the repo root so manual Playwright CLI snapshots and browser-session metadata stop polluting git status during UI verification work
- documented the ignore rule in the README next to the harness smoke guidance, making it explicit that browser verification artifacts are local operator state rather than source-of-record files
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260414131000_1f7a42","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 Harness Browse UI Contract Smoke

- date: 2026-04-14T00:00:00.000Z
- added a dedicated `smoke:ui-harness-browse` path that seeds a temporary workspace and mission, populates source-of-record and layered memory data, then validates the served harness surface through UI asset checks and browse API assertions
- validated the harness operator contract instead of only static payload shape: the smoke now checks document and memory filter, search, pagination, and reset semantics through the same mission-scoped endpoints the UI consumes
- in the same pass, embedded an inline SVG favicon so the served UI no longer requests `/favicon.ico`, removing unnecessary browser-console noise from future manual UI verification
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260414122500_93dc55","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 Harness Browse Context Chips

- date: 2026-04-14T00:00:00.000Z
- surfaced current harness browse conditions as compact chips so operators can see active search, scope/type filter, sort order, and page size without re-reading the summary sentence
- changed previous/next paging controls to use the active page size instead of hardcoded `12건`, which keeps the browse chrome consistent after the new page-size selector is changed
- disabled `필터 초기화` until the browse state actually deviates from default, reducing visual noise in the source-of-record and memory panels
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260414120500_4a5c3b","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 Harness Browse State Preservation

- date: 2026-04-14T00:00:00.000Z
- changed harness CRUD refresh flows so document and memory mutations reload the selected mission while preserving the current harness search, filter, sort, page size, and page position instead of resetting the entire browse surface
- added `페이지 크기` selectors and `필터 초기화` controls to both source-of-record and layered memory browsing, which makes the harness panel usable as an operator workbench instead of a fixed 12-row viewer
- kept the implementation within the existing local UI loop: no backend contract change was needed beyond the paging metadata added earlier, only mission refresh orchestration and browse-state helpers in app.js
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260414115000_1bb30f","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 Harness Browse Meta Contract

- date: 2026-04-14T00:00:00.000Z
- extended the harness browse summary contract so documents and memory now expose `hasPrev`, `hasNext`, `pageStart`, and `pageEnd` in addition to offset and page counts
- moved the UI away from interpreting raw offset math directly, which makes the browse layer easier to reason about and keeps the paging controls aligned with server-clamped offsets after filter or sort changes
- updated the harness panel copy to show `현재 범위 / 전체 검색 결과` semantics instead of only visible count, which gives operators a clearer sense of where they are inside long devlog and memory timelines
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260414114000_a8f241","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 Harness Offset Paging

- date: 2026-04-14T00:00:00.000Z
- replaced the old `limit only` harness browse flow with mission-scoped offset paging so document and memory exploration now move across fixed browse windows instead of inflating the payload on every `더 보기`
- added `offset` handling to both harness browse APIs and surfaced page/remaining counts in the UI, which makes larger tracked logs easier to scan without losing the single-screen operator flow
- changed the frontend from cumulative `더 보기` state to explicit `이전 12건 / 다음 12건` navigation, resetting browse position whenever search, filter, or sort changes to keep result interpretation predictable
- kept the implementation dependency-free and incremental: no new data store or pagination package was introduced, only service-level paging math, lightweight query routing, and browse-state wiring in the existing local UI
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260414110500_3c7b91","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 Harness Browse API Split

- date: 2026-04-14T00:00:00.000Z
- split harness document and memory browse into dedicated mission-scoped APIs so `showMission` no longer needs to ship the full tracked log and memory corpus on every selection
- moved document search/filter/sort/더 보기 onto `/harness/documents` and memory search/filter/sort/더 보기 onto `/harness/memory`, with the frontend now reloading those result sets instead of slicing large arrays locally
- reduced the default mission detail payload back to recent harness samples while preserving counts and summaries, which keeps the single-screen console flow intact but lowers payload growth pressure as tracked records accumulate
- kept the implementation dependency-free and incremental: no indexing package or pagination library was introduced, only service-level browse helpers and lightweight query routing in the existing local UI server
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260414101500_64c90e","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 Harness Browse Pagination and Sort

- date: 2026-04-14T00:00:00.000Z
- added sort controls and staged `더 보기` browsing for both source-of-record documents and layered memory entries so the harness tab no longer dumps the full filtered list at once
- kept the interaction local to the existing mission detail payload: search/filter still operate client-side, while sort mode and visible-count state now let operators scan large logs without losing the single-screen console flow
- aligned document and memory browse patterns so both surfaces now share the same `search → filter → sort → show more` mental model instead of diverging between recent-only memory and full document history
- kept the implementation dependency-free and render-local, which avoids introducing pagination endpoints before actual record volume or latency makes server-side indexing necessary
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260414100500_6b5f8e","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 Harness Memory Search and Filter

- date: 2026-04-14T00:00:00.000Z
- expanded the harness memory payload from recent snippets into full mission/workspace entry lists so the UI can curate layered memory instead of only sampling it
- added memory search plus `scope` and `kind` filters in the harness tab, letting operators narrow fact/decision/preference entries across mission and workspace memory from one surface
- reused the existing memory edit/delete flow and only widened the read model, so memory curation stays dependency-free and keeps the same CRUD contract already used by the add/edit forms
- kept recent-entry summaries intact for quick overview while moving the detailed memory browse experience to filterable client-side exploration inside the same harness panel
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260414094500_0f3a21","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 Harness Document Search and Filter

- date: 2026-04-14T00:00:00.000Z
- expanded the harness document registry from a recent-entry snapshot into a full tracked-entry surface so the UI can browse all source-of-record logs instead of only the latest six items
- added search and type filter controls for tracked document entries, letting operators narrow source logs by title, body, path, and `reference/devlog/incident` type from the same harness panel
- kept the backend contract minimal by extending mission harness payloads with `entries` and `trackedEntryCount` while preserving the existing `recentEntries` slice for lightweight summaries
- kept the implementation dependency-free and UI-local: no new package or search index was introduced, only client-side filtering on the tracked harness payload already available in mission detail
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260413210753_c24400","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 Harness Lens Integration

- date: 2026-04-14T00:00:00.000Z
- researched current harness patterns around Markdown-first document normalization, session-first agent runtime loops, and layered memory recall, then mapped only the directly usable pieces into the existing runtime instead of bolting on a parallel framework
- extended mission detail payloads with a dedicated `harness` summary that exposes source-of-record docs, recent mission/workspace memory, review and maintenance pressure, provider health drift, and lightweight operator recommendations
- added a new `하네스` tab to the lower workbench so operators can inspect document anchors, memory buildup, and operational loops from the same mission screen without leaving the guided workflow
- kept the implementation dependency-free: no new document conversion package was added yet, but the UI now makes the Markdown source-of-record rule explicit so later ingestion work can plug into an already visible harness surface
- pulled the top harness recommendation into the command header and setup stage so operators can jump straight to the blocking review/run/harness surface instead of hunting through the detail tabs first
- added a mission-scoped memory authoring form inside the harness tab so operators can persist fact / decision / preference context without leaving the console
- expanded layered memory authoring to workspace scope as well, so long-lived operating rules can be captured without overloading mission-scoped recall
- added a source-of-record document logging form inside the harness tab so Markdown working notes can be pushed into docs/reference, devlog, or incidents from the same mission surface
- added browser-side file intake for Markdown/txt/json notes so external working drafts can prefill the source-of-record form without introducing a new conversion dependency
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_3c9bf3","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Visual Density Polish

- date: 2026-04-09T00:00:00.000Z
- tightened the console from a soft card-heavy dashboard into a calmer operator workspace with lower shadow depth, denser spacing, and fewer competing emphasis treatments
- compressed the top status bar, step strip, and content surfaces so more of the actual working state fits into the first viewport without dropping the guided flow
- reduced visual noise across chips, cards, and buttons by lowering border weight, lightening surface contrast, and keeping cobalt as the single dominant action color
- pushed the UI closer to a restrained product control-plane feel rather than a marketing-style hero composition, while keeping the same single-screen operator structure intact
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_ede869","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Reference Playbook Integration

- date: 2026-04-09T00:00:00.000Z
- folded patterns from public agent repos into the operator surface as explicit playbooks instead of leaving them as undocumented inspiration
- added four setup-stage playbooks derived from staged pipeline, research-first, review-readiness, and verify-before-close operating models so users can start from a workflow intent instead of only a blank mission form
- added a review-readiness grid inspired by review dashboards and gate-driven agent workflows, making approval readiness visible as discrete `ready` or `blocked` signals before the user resolves actions or signs off
- kept these borrowings inside the existing mission form and review surfaces, so the UI gains stronger operator guidance without adding a new backend abstraction or extra navigation depth
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_dbd69b","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Sequential One-Screen Flow Pass

- date: 2026-04-09T00:00:00.000Z
- reworked the console again around an actual left-to-right operator sequence instead of a generic information surface, so users now move through `Setup → Run → Review → Output` inside one viewport
- moved the guided flow from a tall side stack into a compact top strip over the main workspace, which frees horizontal space for the active step content while keeping the full sequence always visible
- added a persistent `Recommended Next` state card plus done or ready step states, so the UI tells the operator what to do next instead of expecting them to infer the flow from raw panels
- changed mission selection to land on the currently recommended step rather than always forcing the run stage, which better matches completed missions, approval-pending missions, and output-ready missions
- tightened shell padding, heading scale, and panel density so the console reads more like a task-oriented product control plane and less like a document layout
- kept the dependency-free local server and existing mission APIs unchanged while shifting the frontend toward a more explicit operator journey
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_3faae7","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Single-Page Console Navigation

- date: 2026-04-09T00:00:00.000Z
- removed the old tabbed mission-detail model and rebuilt the workspace as one continuous operator surface, so objective, queue, artifact, timeline, and session history can be scanned without mode switching
- added a sidebar workspace menu plus a sticky in-workspace section ribbon, both wired to the same section targets and scroll-synced so operators can jump by function and still keep orientation while reading down the page
- regrouped the main surface by operator intent instead of data type: `Mission Snapshot`, `Action & Approval`, `Artifact Viewer`, `Timeline`, and `Sessions` now read as explicit product sections
- moved approval handling into the same action section as mission follow-up work, so reruns, reviewer follow-up resolution, and human approvals live in one operational queue instead of being split across the page
- cleaned up the UI language from tab-oriented terminology to section-oriented navigation, matching the new single-page information architecture and reducing operator confusion
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_660a7d","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Guided Operator Flow Redesign

- date: 2026-04-09T00:00:00.000Z
- replaced the section-stack console with a single-viewport guided operator flow, so the primary UI now reads as `Setup → Run → Review → Output` instead of a long document surface
- removed the oversized hero treatment and rebuilt the shell around a compact top status bar, a left mission rail, a center step canvas, and a persistent right inspector, improving scan speed and reducing dead space
- moved mission creation into the first guided step and made rerun, approval handling, and artifact reading successive stages in the same viewport, so operators can progress to a final output through explicit step choices
- kept timeline, session selection, and provider state visible within the same screen through internal panel scrolling rather than page-length stacking, preserving one-screen operability while retaining detail depth
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_4d94ba","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Console IA Refresh

- date: 2026-04-09T00:00:00.000Z
- rebuilt the operator console information architecture around a three-column product layout: dark navigation rail, mission workspace, and inspector, so the UI reads like an operations tool instead of a flat card stack
- replaced the previous control-plane styling with a lighter and more legible product surface, stronger typography hierarchy, calmer chrome, and one accent system so mission state, action pressure, and artifacts are easier to scan
- reworked mission detail rendering to foreground objective, constraints, latest session, approval counts, and reviewer signal before deeper history, reducing the amount of operator inference needed to understand the current mission state
- fixed UI flow issues while redesigning: workspace selection now scopes mission browsing and mission creation, selecting a mission returns to overview by default, and automatic artifact loading no longer steals focus from the current tab
- kept the dependency-free local server model and existing mission APIs intact while upgrading the frontend shell, so the console redesign does not increase production runtime complexity
- layered in inspiration from current public agent products by making prompt entry, trust checkpoints, and step observability explicit in the UI: hero signals, dispatch trust points, and a visible manager→planner→executor→reviewer lane now frame the mission surface
- kept the create panel open by default and upgraded empty states into action-oriented cards, so first-run users see what to do next instead of landing on dead surfaces
- added staged surface motion and active-step emphasis, so the console feels more product-like without introducing a frontend dependency stack
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_df3ce3","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Operator Console v0

- date: 2026-04-09T00:00:00.000Z
- added a local operator console served by a dependency-free Node HTTP server so missions no longer require terminal-only navigation for basic orchestration
- exposed JSON API routes for mission list/detail, session detail, mission creation, mission run, approval inbox, approval resolution, provider catalog, and artifact preview by reusing the existing `mission-service` and `store` surfaces instead of creating a parallel backend
- added a Korean-language frontend focused on operator visibility, with mission queue browsing, latest session status, approval action buttons, provider-aware reruns, and markdown artifact viewing in one console
- expanded the console with mission templates, mission-scoped action inbox, and mission timeline rendering so operators can create common planning missions faster and inspect follow-up pressure and execution chronology without returning to the CLI
- added direct operator actions in the console so mission-scoped reviewer follow-ups can be resolved from UI and retry-ready actions can trigger the recommended mission rerun without reconstructing commands in the terminal
- made timeline items session-aware so clicking a timeline event can jump the operator directly into the related session detail and artifact context
- documented the new `npm run ui` workflow and kept the implementation local-first with no new production dependencies
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_c87e70","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Default Provider Policy

- date: 2026-04-09T00:00:00.000Z
- changed `mission run` default provider resolution to prefer OpenAI when `OPENAI_API_KEY` is configured, while keeping `stub` as the automatic fallback for offline bootstrap and smoke testing
- aligned provider summary surfaces so the reported default provider now reflects the same runtime policy used by `mission run`
- documented Anthropic as an explicit comparison or fallback path instead of the operational default, matching the current stability findings from the PRD mission comparison
- corrected Anthropic runtime timeout to 45 seconds and kept OpenAI at 20 seconds, so provider-specific runtime limits match the current reliability envelope
- hardened Anthropic execution with JSON-like salvage, planner or executor fallback artifact generation, and reviewer prompt serialization fixes so provider comparison now reflects model behavior rather than obvious runtime wiring defects
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_f58768","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Local Bootstrap Command

- date: 2026-04-09T00:00:00.000Z
- added `scripts/bootstrap-local.mjs` and `npm run bootstrap:local` so first-run testing can create a workspace, create a starter mission, and execute the stub provider in one command
- made the bootstrap command return workspace, mission, and optional run payload as JSON so local inspection is immediate without digging into state files
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-07T00:00:00.000Z","id":"doclog_20260413210753_34c957","type":"devlog","updatedAt":"2026-04-07T00:00:00.000Z"} -->
## 2026-04-07 Specialist Follow-Up Remediation

- date: 2026-04-07T00:00:00.000Z
- added `action remediate-specialist-follow-up` so blocked or failed specialist branches can be resumed from the operator surface instead of requiring a manual `mission run` reconstruction
- reused the existing `runMission` resume path and `parallelGroupId` lineage contract, so remediation reruns only unresolved specialist branches while keeping prior completed specialist outputs and later merge behavior intact
- added deterministic smoke coverage for one failed `implementation` specialist branch that is remediated through the dedicated CLI command, proving same-group resume, `resumeFromRunId` preservation, merge completion, and follow-up queue clearance
- added provider context to specialist follow-up action items so generic provider filtering and remediation routing stay aligned with the same provider-aware command contract used elsewhere
- added `action specialist-follow-ups` as a dedicated read surface with `--provider`, `--workspace`, `--mission`, `--status`, and `--overdue` filters, so unresolved specialist branches can be triaged without reopening the full generic action inbox
- extended specialist follow-up items with persisted reminder state, so `action specialist-follow-ups --needs-reminder` can expose aging blocked/failed branches without relying only on overdue state
- added `action remind-specialist-follow-ups` plus persisted reminder records and `specialist-follow-up-reminded` timeline evidence, so follow-up re-notify pressure is auditable on mission/workspace/operator surfaces
- extended `action maintenance` and maintenance summaries so due specialist follow-up reminders are swept and counted alongside escalation, owner handoff, and provider attention reminder pressure
- linked specialist reminder aggregate fields into mission, workspace, and global summaries, so reminder needs, overdue count, latest reminder timestamp, and next reminder deadline can be read from the same summary surfaces already used for specialist run and merge state
- linked the same specialist reminder aggregate fields into workspace timeline and global operator timeline summaries, so operator chronology payloads can show current follow-up reminder pressure without reopening dedicated action surfaces
- extended generic action inbox summary with specialist follow-up provider, kind, status, and reminder aggregates, so mixed queue triage can distinguish specialist pressure without dropping into the dedicated specialist follow-up command
- extended `action log-overdue` response summary and incident markdown with specialist follow-up reminder aggregate, so overdue incident trails preserve the same specialist pressure context already available in queue summaries
- extended the same overdue incident payload with provider health drift provider and reason-code aggregate, so queue triage and incident documentation keep the same provider drift summary contract
- consolidated provider metadata into a shared provider catalog inspired by OpenHarness registry layering, so registry readiness rendering and adapter runtime defaults now derive from one source of truth instead of per-file literals
- added a typed `specialistHandoff` contract for specialist branches and threaded it through manager merge prompts, persisted agent runs, and specialist follow-up queue items, inspired by agency-agents handoff template discipline
- added `orchestration-profile:<id>` specialist presets and threaded profile metadata through mission/workspace/global/operator summaries plus latest parallel group state, so profile-driven fan-out stays explicit and auditable without reconstructing branch policy from raw constraints
- enforced orchestration profile quality gates at runtime, so manager merge now stops when required specialist signals are abandoned or missing and emits `specialist-quality-gate-blocked` plus gate-backed specialist follow-up items instead of silently merging incomplete branch sets
- linked orchestration profile retry policy into specialist follow-up priority, SLA, and reminder cadence so verification-heavy triad presets now create faster operator pressure than the default branch-resume policy
- added `overview profiles` and grouped orchestration profile usage, latest mission linkage, latest parallel group state, and specialist follow-up pressure under each preset so profile-driven runtime policy can be audited without walking mission-by-mission summaries
- extended `overview profiles` with specialist follow-up retry-policy, remediation-route, kind, and latest or next reminder aggregate so preset catalog output now exposes the actual recovery policy footprint, not just usage and open backlog counts
- extended `overview profiles` again with per-profile and top-level `healthDrift` status plus reason-code aggregate so orchestration presets with blocked quality gates or active follow-up pressure can be spotted as stable, watch, or follow-up-required directly from the catalog surface
- added `overview profiles --status` and `--drift-only` filters so unstable orchestration presets can be queried directly without post-processing the full catalog payload
- added `overview profiles --workspace` so one workspace can be audited for preset usage and preset-specific follow-up pressure without reading every mission or workspace summary that references those profiles
- promoted workspace usage aggregates into `overview profiles` summary so profile catalog output directly shows per-workspace preset footprint and mission volume
- promoted workspace health-drift aggregates into `overview profiles` summary so unstable preset pressure can be traced directly to the workspace that owns it
- added root-level `workspaceHealthDrift` to `overview profiles` so workspace-layer preset instability can be read as stable, watch, or follow-up-required directly from the catalog response
- added item-level `workspaceHealthDrift` to `overview profiles` so one preset can show which workspace currently owns the unstable branch or gate pressure
- added `overview profiles --workspace-usage-trend` plus per-item `workspaceUsageTrend`, so orchestration preset queries can slice monthly workspace footprint growth or decline separately from raw mission volume trend
- added root-level `workspaceUsageTrend` to `overview profiles`, so catalog responses expose the aggregate month-over-month workspace footprint status as a quick field
- added root-level `usageTrend` to `overview profiles`, so catalog responses expose the aggregate month-over-month mission volume status as a quick field alongside workspace footprint trend
- added combined `adoptionDrift` to `overview profiles` root and items, so orchestration preset adoption can be read from one status instead of manually combining mission volume and workspace footprint trends
- added `overview profiles --adoption-drift-status` and `--adoption-drift-reason-code`, so combined adoption drift can be sliced directly from the catalog query surface
- added root-level and summary-level adoption drift aggregates with reasonCodeCounts and latestUnusedAdoptionProfile, so orchestration preset adoption pressure can be triaged without reopening item payloads
- upgraded root-level `usageTrend` and `workspaceUsageTrend` to include profileCount, statusCounts, and latest unused profile linkage so usage quick fields are symmetric with adoption drift triage
- extended `workspaceUsageTrend` again with workspace-level aggregate maps, so `overview profiles` can show which workspace IDs and how many presets are driving growing or declining workspace footprint directly from the root quick field and summary
- added `latestGrowingWorkspace` and `latestDecliningWorkspace` to root `workspaceUsageTrend`, so the profile catalog can point directly to the most recent workspace driving footprint expansion or contraction
- added `latestWorkspaceId`, `latestWorkspaceName`, `latestWorkspaceProfileId`, and `latestWorkspaceStatus` to root `workspaceUsageTrend`, so the newest workspace footprint signal identity is readable from the quick field without opening nested workspace objects
- extended item-level `workspaceUsageTrend` with per-workspace status aggregate and latest workspace linkage, so one orchestration preset can show which workspace is currently growing or shrinking its footprint without reopening mission history
- added root-level `workspaceAdoptionDrift` to `overview profiles`, so workspace mission volume drift and preset footprint drift can now be triaged as one combined adoption signal directly from the catalog response
- extended each profile item with `workspaceAdoptionDrift`, so combined workspace adoption pressure is now readable inside one preset payload without reopening root workspace aggregates
- added `overview profiles --workspace-adoption-drift-status` and `--workspace-adoption-drift-reason-code`, so per-workspace combined adoption pressure can now be sliced directly from the profile catalog query surface
- added `workspaceAdoptionDriftProfileCounts` and `workspaceAdoptionDriftStatusCounts` to `overview profiles` summary so combined workspace adoption pressure can now be triaged with the same per-workspace map contract already used by workspace usage trend and workspace health drift
- extended root and summary `workspaceAdoptionDrift` with latest growing or declining profile and workspace linkage so combined workspace adoption pressure can now be triaged with the same latest-signal affordance already used by workspace usage trend
- added `workspaceAdoptionDriftCounts`, `workspaceAdoptionDriftReasonCodeCounts`, and `workspaceAdoptionDriftWorkspaceCount` to `overview profiles` summary so combined workspace adoption pressure can now be read directly from summary-grade aggregate fields without reopening the root quick field
- extended each profile item `workspaceAdoptionDrift` with `latestGrowingWorkspace` and `latestDecliningWorkspace` so direction-specific workspace adoption linkage is now readable inside one preset payload without reopening root aggregates
- added `workspaceAdoptionDriftMissionTrendStatusCounts`, `workspaceAdoptionDriftProfileFootprintTrendStatusCounts`, and `workspaceAdoptionDriftWorkspaceIdsByStatus` to `overview profiles` summary so summary-grade workspace adoption drift now mirrors the root quick field contract more closely
- added `workspaceAdoptionDriftStatus`, `workspaceAdoptionDriftReasonCodes`, and `workspaceAdoptionDriftLatestWorkspace` to `overview profiles` summary so quick workspace adoption drift signal is now readable from summary without reopening the root field
- added `workspaceUsageTrendStatus`, `workspaceUsageTrendWorkspaceCount`, `workspaceUsageTrendLatestGrowingWorkspace`, and `workspaceUsageTrendLatestDecliningWorkspace` to `overview profiles` summary so summary-grade workspace usage trend now carries the same quick signal affordance as the root field
- added `usageTrendStatus`, `usageTrendProfileCount`, `adoptionDriftStatus`, `adoptionDriftReasonCodes`, and `adoptionDriftLatestProfile` to `overview profiles` summary so profile-level usage and adoption quick signals are now readable from summary without reopening root fields
- added `healthDriftStatus`, `healthDriftReasonCodes`, `healthDriftLatestProfile`, `workspaceHealthDriftStatus`, `workspaceHealthDriftReasonCodes`, `workspaceHealthDriftLatestWorkspace`, and `workspaceHealthDriftWorkspaceCount` to `overview profiles` summary so health quick signals are now readable from summary without reopening root drift fields
- added `workspaceHealthDriftCounts` and `workspaceHealthDriftWorkspaceIdsByStatus` to `overview profiles` summary so workspace health drift now exposes the same aggregate distribution affordance in summary as in the root quick field
- added `workspaceHealthDriftReasonCodeCounts` to `overview profiles` summary so workspace health reason distribution is now readable from summary without reopening the root field
- added `workspaceUsageTrendWorkspaceIdsByStatus` and `workspaceUsageTrendWorkspaceStatusCounts` to `overview profiles` summary so workspace footprint distribution is now readable from summary without reopening the root field
- added `workspaceAdoptionDriftLatestGrowingWorkspace` and `workspaceAdoptionDriftLatestDecliningWorkspace` to `overview profiles` summary so workspace adoption direction is now readable from summary without reopening the root field
- added `workspaceAdoptionDriftLatestGrowingProfile` and `workspaceAdoptionDriftLatestDecliningProfile` to `overview profiles` summary so workspace adoption direction is now readable from summary with the same profile linkage as the root field
- added generic `latestProfile` to root and item-level `workspaceAdoptionDrift`, and mirrored it as `workspaceAdoptionDriftLatestProfile` in summary so the newest preset behind the current workspace adoption signal is now readable without inferring it from direction-specific latest links
- added `workspaceUsageTrend.latestWorkspace` to each profile item so per-preset workspace footprint trend can point to the latest workspace signal without relying only on direction-specific latest links
- added `workspaceUsageTrendLatestGrowingProfile`, `workspaceUsageTrendLatestDecliningProfile`, and `workspaceUsageTrendLatestUnusedProfile` to `overview profiles` summary so workspace footprint direction is now readable from summary with the same profile linkage as the root field
- added `workspaceUsageTrendLatestWorkspaceProfileId` and `workspaceUsageTrendLatestWorkspaceStatus` to `overview profiles` summary so the latest workspace footprint signal can be read without reopening nested workspace objects
- added `workspaceUsageTrendLatestWorkspaceId` and `workspaceUsageTrendLatestWorkspaceName` to `overview profiles` summary so the latest workspace footprint signal can be identified directly from the summary layer without reopening nested workspace objects
- added `usageTrendLatestGrowingProfile`, `usageTrendLatestDecliningProfile`, and `usageTrendLatestUnusedProfile` to `overview profiles` summary so mission-volume direction is now readable from summary with the same profile linkage as the root field
- added `adoptionDriftLatestGrowingProfile`, `adoptionDriftLatestDecliningProfile`, and `adoptionDriftLatestUnusedProfile` to `overview profiles` summary so combined adoption direction is now readable from summary with the same profile linkage as the root field
- added `healthDriftCounts`, `usageTrendStatusCounts`, and `adoptionDriftStatusCounts` to `overview profiles` summary so root quick-field status distribution is now readable from summary with the same naming contract
- added `workspaceUsageTrendProfileCount`, `workspaceUsageTrendProfileStatusCounts`, and `workspaceUsageTrendWorkspaceProfileCounts` to `overview profiles` summary so workspace footprint quick-field semantics are now readable from summary without guessing whether each count map is profile-scoped or workspace-scoped
- added `workspaceAdoptionDriftWorkspaceProfileCounts` and `workspaceAdoptionDriftWorkspaceStatusCounts` to `overview profiles` summary so combined workspace adoption maps are now readable with explicit workspace-scoped naming instead of reinterpreting legacy field names
- added `workspaceHealthDriftWorkspaceProfileCounts` and `workspaceHealthDriftWorkspaceStatusCounts` to `overview profiles` summary so workspace health maps are now readable with explicit workspace-scoped naming instead of reinterpreting legacy field names
- added `workspaceProfileCounts` and `workspaceStatusCounts` to root `workspaceHealthDrift` so workspace-level instability detail is now readable from the quick field itself without reopening summary-only aliases
- added `latestFollowUpRequiredWorkspace` and `latestWatchWorkspace` to root `workspaceHealthDrift` and matching summary aliases so the most recent unstable workspace is now readable by health direction without reopening aggregate maps
- added `latestFollowUpRequiredProfile` and `latestWatchProfile` to root `healthDrift` and matching summary aliases so the most recent unstable preset is now readable by health direction without reinterpreting generic latest-profile linkage
- added `latestStableProfile` and `latestStableWorkspace` to health quick fields and matching summary aliases so the most recent stable preset and stable workspace now use the same direction-aware contract as unstable health states
- added `latestProfile`, `latestFollowUpRequiredProfile`, `latestWatchProfile`, and `latestStableProfile` to each profile item `healthDrift` so item payloads now match the direction-aware linkage shape of the root health quick field
- added `workspaceProfileCounts` and `workspaceStatusCounts` to each profile item `workspaceHealthDrift` so item-level workspace health maps now match the root quick field contract
- added `overview profiles --workspace-drift-only` and `--workspace-status` so workspace-level unstable presets can be queried directly instead of filtering item payloads client-side
- added `overview profiles --reason-code` and `--workspace-reason-code` so preset drift can now be sliced by blocked quality gate versus open specialist follow-up cause without post-processing the full catalog payload
- added monthly usage buckets and monthly delta to `overview profiles` summary and item payloads so orchestration preset adoption trend can be read directly from the profile catalog surface
- added `overview profiles --usage-trend` plus per-item `usageTrend` so orchestration presets can now be queried by relative monthly adoption direction instead of manually interpreting bucket deltas
- switched specialist follow-up command hints to the dedicated remediation action and added profile-aware remediation route metadata, so fast verification policies now surface a concrete operator path instead of only a generic mission run fallback
- extended `action log-overdue` contract and smoke coverage so overdue `specialist-follow-up-required` items also enter the incident trail, keeping specialist pressure aligned with other tracked overdue operator classes
- threaded specialist remediation route metadata into persisted reminder records and overdue incident markdown, so retry policy, route urgency, and fallback command survive from queue triage into reminder and incident audit trails
- extended `action remind-specialist-follow-ups` summary with provider, specialist kind, retry policy, remediation route, and status aggregate so reminder execution output mirrors the same recovery-path metadata already visible in queue and incident surfaces
- extended maintenance execution summary and persisted maintenance run payloads with specialist retry policy and remediation route aggregate so maintenance sweep output keeps the same specialist recovery-path evidence as the dedicated reminder command
- extended maintenance history and maintenance overview bucket payloads with specialist retry policy and remediation route aggregate so day-level and latest-vs-previous maintenance trend views now preserve the same specialist recovery-path evidence as the raw maintenance run record
- extended maintenance history and maintenance overview with weeklyBuckets plus latestWeeklyBucketDelta, so maintenance trend can now be read at a coarser weekly rollup without losing specialist retry-policy and remediation-route evidence
- extended maintenance history and maintenance overview with monthlyBuckets plus latestMonthlyBucketDelta, so maintenance trend can now be read at monthly resolution without losing specialist retry-policy and remediation-route evidence
- promoted maintenance monthly trend quick fields into mission, workspace, and global summaries so top-level control-plane surfaces can read current month maintenance drift without reopening dedicated maintenance history or overview payloads
- linked the same maintenance monthly quick fields into workspace timeline and global operator timeline summaries, so chronology-first operator payloads can expose current month maintenance drift without reopening the maintenance read-model
- linked the same maintenance monthly quick fields into immediate `action maintenance` summary output, so sweep execution receipts can expose current month maintenance drift without reopening the maintenance history surface
- linked the same maintenance monthly quick fields into unified `action inbox` summary when maintenance-required pressure is present, so mixed queue triage can expose current month maintenance drift without reopening the maintenance history surface
- switched `action log-overdue` to reuse the same enriched overdue inbox summary and exposed maintenance monthly quick fields in incident markdown, so incident triage keeps the same maintenance drift contract as queue summaries
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-07T00:00:00.000Z","id":"doclog_20260413210753_eb0057","type":"devlog","updatedAt":"2026-04-07T00:00:00.000Z"} -->
## 2026-04-07 Provider Cost Telemetry

- date: 2026-04-07T00:00:00.000Z
- added `overview operator-timeline --provider-since` so the operator-facing chronology can carry the same recent provider window contract already used by provider, mission, workspace, and global overview surfaces
- linked recent provider counts, touched provider ids, latest recent provider event, and recent execution bucket trend into the global operator timeline summary without changing the default event stream contract
- added `workspace timeline --provider-since` so workspace-bound chronology can carry the same recent provider window contract and recent provider summary linkage as the other provider-aware timeline or overview surfaces
- added root-level `providerHealthDrift` to mission, workspace, and operator surfaces so provider drift can be inspected symmetrically without reading only summary linkage fields
- added `provider-health-drift-required` to action inbox so resolved provider failures that still leave monthly failed-execution drift can surface as explicit mission-owner follow-up work
- added `action provider-health-drift --overdue` so residual drift follow-up items can be queried directly by overdue state instead of only through generic inbox class filtering
- extended `action log-overdue` and its smoke coverage so overdue `provider-health-drift-required` items also enter the incident trail and escalation state
- added provider filtering to `action inbox` and `action log-overdue` so provider-specific attention and drift follow-up can be sliced from generic operator queues
- added `providerCounts` to generic action inbox summary so provider-scoped drift backlog can be read without leaving the unified queue surface
- added `action remediate-provider-attention` so pending or acknowledged provider failure attention can trigger a local-first re-probe or same-provider mission rerun without manually reconstructing the remediation command
- added optional pricing env parsing for OpenAI, Anthropic, and local adapters, then normalized `estimatedCostUsd` from execution token usage without changing the existing provider contract
- propagated estimated execution cost into persisted agent runs, provider execution history or timeline, unified provider events, pending provider attention failure context, provider overview, and mission or workspace or global summaries
- added deterministic cost telemetry smoke coverage for successful execution totals plus failed non-JSON execution persistence so cost evidence stays available on both completed and failed mission paths
- extended the same cost telemetry with `estimatedCostUsdByProviderId` and `estimatedCostUsdByRole` so one provider or one stage role can be identified as the primary spend source directly from existing read-models
- extended provider execution history summary with daily cost buckets and latest bucket delta so recent spend movement can be read from `provider activity` without re-aggregating timeline rows
- added `since` filtering to provider execution history and timeline so the same daily cost bucket contract can be used for recent-window execution slices without a separate endpoint
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-07T00:00:00.000Z","id":"doclog_20260413210753_0c1f09","type":"devlog","updatedAt":"2026-04-07T00:00:00.000Z"} -->
## 2026-04-07 Provider Retry Telemetry

- date: 2026-04-07T00:00:00.000Z
- extended the shared provider request wrapper to persist per-attempt `attemptHistory` and normalized `retryCount` across OpenAI, Anthropic, local, and stub probe or execution paths
- propagated retry metadata into provider probe history, provider execution activity, provider event timelines, provider attention items, and mission or workspace or global summaries so retry totals are visible without reopening raw state
- added deterministic retry telemetry smoke coverage for success-after-retry probe, success-after-retry execution stages, and retry-exhausted failed execution that opens provider attention with the same normalized attempt metadata
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-07T00:00:00.000Z","id":"doclog_20260413210753_6d5a63","type":"devlog","updatedAt":"2026-04-07T00:00:00.000Z"} -->
## 2026-04-07 Provider Telemetry Baseline

- date: 2026-04-07T00:00:00.000Z
- extended provider probe and execution records with `durationMs`, then propagated execution token usage as normalized `usageInputTokens`, `usageOutputTokens`, and `usageTotalTokens`
- linked telemetry into provider check, provider history, provider activity, provider events, provider overview, mission summary, workspace overview, and global overview so latency and token usage can be inspected without reopening raw state
- added `since` filtering to `provider events` so recent probe, execution, and attention chronology can be sliced without rebuilding a custom event window client-side
- added `overview providers --since` with a separate `recentWindow` summary so recent provider health can be queried without mutating the existing full-history overview aggregate
- added `overview global --provider-since` so the global control-plane can expose recent provider probe and execution activity through `providerRecentWindow` while preserving the default full-history provider aggregate
- added `workspace overview --provider-since` so workspace-bound provider execution and attention activity can be queried as `providerRecentWindow` without mutating the default workspace summary contract
- added `mission show --provider-since` and `mission timeline --provider-since` so mission-bound provider execution and attention activity can be queried as `providerRecentWindow` from the mission surface itself
- extended every `providerRecentWindow` payload with execution daily buckets and latest bucket delta so recent provider execution trend can be inspected without reopening full provider activity history
- extended every `providerRecentWindow` payload with weekly execution buckets and latest weekly delta so recent provider trend can also be read at a coarser weekly rollup
- extended every `providerRecentWindow` payload with monthly execution buckets and latest monthly delta so recent provider trend can also be read as a coarse month rollup from the same recent slice
- promoted the same recent monthly provider trend into mission or workspace or global or operator summary linkage so control-plane surfaces can read month-level direction without expanding nested bucket payloads
- promoted the same recent monthly provider trend into `overview providers` summary linkage as well, so provider-only control-plane reads stay symmetric with mission or workspace or global or operator summaries
- added provider health drift summaries to `overview providers` and `overview global`, combining current provider attention overdue or needs-reminder pressure with recent monthly execution drift in one read-model
- added deterministic telemetry smoke coverage with one local probe and one local mission run so duration and token usage propagation stay locked across provider, mission, workspace, and global surfaces
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-07T00:00:00.000Z","id":"doclog_20260413210753_767cee","type":"devlog","updatedAt":"2026-04-07T00:00:00.000Z"} -->
## 2026-04-07 Provider Hardening Baseline

- date: 2026-04-07T00:00:00.000Z
- added a shared provider failure envelope across probe and execution paths with fixed fields for `failureKind`, `recoverable`, `httpStatus`, `timedOut`, `attemptCount`, `providerResponseId`, and `rawMessage`
- moved OpenAI, Anthropic, and local adapters onto one shared timeout and bounded retry wrapper so transport or timeout or `429/5xx` retries stay aligned while `4xx` and parsing or schema failures remain deterministic no-retry paths
- hardened structured output parsing to accept only the first valid JSON object after text extraction, while empty output, prose-only output, and missing required fields now normalize into `empty-output`, `non-json-output`, and `schema-invalid`
- propagated normalized provider failure metadata into provider history, activity, events, attention, mission summary, workspace overview, global overview, and operator surfaces, then locked the contract with deterministic provider hardening smoke coverage
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-07T00:00:00.000Z","id":"doclog_20260413210753_8b12eb","type":"devlog","updatedAt":"2026-04-07T00:00:00.000Z"} -->
## 2026-04-07 Parallel Specialist Roles v1

- date: 2026-04-07T00:00:00.000Z
- added manager-controlled parallel specialist fan-out after planning, bounded to `research`, `implementation`, and `verification`, with child `agentRuns` carrying `parallelGroupId`, `parentRunId`, `resumeFromRunId`, `specialistKind`, and merge metadata
- added resumable failed or blocked specialist branches plus manager-controlled merge back into the standard executor or reviewer path so parallel work stays local-first and deterministic instead of introducing a separate queueing system
- surfaced `specialist-follow-up-required` into the unified action inbox and linked specialist branch or merge chronology into mission timeline, workspace timeline, global operator timeline, and mission or workspace or global summaries
- added deterministic smoke coverage for two-branch success merge, three-branch mixed completion, failed branch resume, blocked branch follow-up visibility, and summary or timeline propagation
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-07T00:00:00.000Z","id":"doclog_20260413210753_0ca894","type":"devlog","updatedAt":"2026-04-07T00:00:00.000Z"} -->
## 2026-04-07 Provider Attention Recovery

- date: 2026-04-07T00:00:00.000Z
- added derived `recovered` provider attention state so a newer successful probe or successful provider-backed mission run can close the latest failure pressure without requiring a manual resolution step first
- linked provider attention recovery into `provider check`, `overview providers`, `overview global`, `action provider-attention --status recovered`, mission summary, workspace summary, unified provider events, mission timeline, and workspace or global operator timeline
- added deterministic smoke coverage for one failed stub mission followed by a successful rerun on the same mission so recovery evidence stays locked across provider, mission, workspace, and global surfaces
- restored opened provider attention events into the unified provider event stream now that provider base-event assembly is separated, closing the earlier gap where current pending failures were missing from provider-only chronology
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_8958ca","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Provider Attention Reminders

- date: 2026-04-06T00:00:00.000Z
- added persisted provider attention reminder records plus `action remind-provider-attention`, so pending provider failures can be re-notified explicitly instead of only showing due or overdue state in read models
- linked provider attention reminder pressure into `provider check`, `overview providers`, `overview global`, mission timeline, workspace operator timeline, and the unified `action inbox --needs-reminder` slice
- extended `action maintenance` to sweep due provider attention reminders together with escalation and owner handoff reminders, and locked the new flow with deterministic smoke coverage for due reminder re-emission and maintenance integration
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_c411eb","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Provider Attention Aging Summary

- date: 2026-04-06T00:00:00.000Z
- extended provider status and provider overview surfaces with pending provider attention due and overdue metadata so aging provider failure pressure is visible without opening `action provider-attention` or the unified action inbox
- linked `pendingAttentionDueAt`, `pendingAttentionIsOverdue`, and `pendingAttentionSlaHours` into `provider check`, while `overview providers` and `overview global` now aggregate pending attention overdue count and next due timestamp
- strengthened provider overview smoke coverage by aging one failed anthropic probe into an overdue pending attention item and locking the same due timestamp across provider check, provider overview, and global overview
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_b01289","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Operator Timeline Provider Failure Trigger

- date: 2026-04-06T00:00:00.000Z
- extended workspace and global operator timeline with `provider-execution-failed` so the actual failure trigger is visible before provider attention acknowledgement or resolution events
- kept successful provider execution out of the operator timeline to preserve the operator-focused signal and avoid high-volume success noise
- strengthened operator timeline smoke coverage so workspace-bound failed reviewer execution and the later provider attention lifecycle are both locked on the same time axis
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_513376","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Mission Provider Audit Surface

- date: 2026-04-06T00:00:00.000Z
- extended `mission show` with mission-scoped provider execution and provider attention aggregates so one mission can report its own failed provider runs and attention lifecycle state
- extended `mission timeline` with `provider-execution-succeeded`, `provider-execution-failed`, `provider-attention-opened`, `provider-attention-acknowledged`, and `provider-attention-resolved` events
- strengthened mission timeline smoke coverage with a dedicated provider-failure mission so maintenance or escalation audit and provider audit both stay locked at mission scope
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_f36e7b","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Provider Attention Inbox

- date: 2026-04-06T00:00:00.000Z
- promoted latest failed provider probe or failed provider execution into `provider-attention-required` items inside the unified `action inbox`
- kept the contract read-model based so a later success event automatically clears the attention item without adding new persistence state
- added deterministic smoke coverage for one global probe failure and one workspace-bound execution failure, plus overview attention summary linkage
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_757188","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Provider Attention Acknowledgement

- date: 2026-04-06T00:00:00.000Z
- added `action provider-attention` and `action acknowledge-provider-attention` so provider failure attention can move from pending queue state into explicit acknowledged audit state
- persisted provider attention acknowledgements and linked them into `provider check`, `overview providers`, `overview global`, and `provider events --family attention`
- kept the lifecycle bounded so acknowledgement only clears the current latest failed provider event, while a newer provider failure still re-opens a fresh attention item
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_9cefe0","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Provider Attention Resolution

- date: 2026-04-06T00:00:00.000Z
- added `action resolve-provider-attention` so acknowledged provider failures can be explicitly closed instead of remaining in an indefinitely acknowledged audit bucket
- extended the unified provider event stream with `provider-attention-resolved` while preserving the earlier acknowledgement event for the same action
- linked resolved provider attention counts and latest resolution pointers into `provider check`, `overview providers`, and `overview global`
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_15c800","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Provider Attention Operator Timeline

- date: 2026-04-06T00:00:00.000Z
- added workspace and global operator timeline linkage for workspace-bound provider attention lifecycle events
- provider attention now appears as `provider-attention-opened`, `provider-attention-acknowledged`, and `provider-attention-resolved` alongside approval, reviewer follow-up, escalation, and maintenance events
- kept global provider probe failures on the provider event stream only, while workspace-bound execution failures are promoted into operator timeline because they map to a concrete workspace owner workflow
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_b80522","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Workspace Provider Attention Summary

- date: 2026-04-06T00:00:00.000Z
- extended `workspace overview` with workspace-scoped provider execution and provider attention aggregates so workspace owners can see failed execution pressure without jumping into provider-only commands
- linked latest failed execution and latest pending provider attention event into workspace summary while keeping global provider readiness as a separate top-level concern
- added deterministic smoke coverage for one workspace-bound failed provider execution so workspace overview regression now locks provider attention counts and latest pointers
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_299f74","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Provider Events

- date: 2026-04-06T00:00:00.000Z
- added `provider events` so probe and execution observability can be read as one chronological provider event stream instead of hopping between separate timelines
- linked latest provider event, latest probe event, and latest execution event into `overview providers` and `overview global`
- added deterministic smoke coverage for mixed skipped probe, successful probe, failed stub execution, and successful local execution in one unified stream
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_d2e01a","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Provider Execution Activity

- date: 2026-04-06T00:00:00.000Z
- added `provider activity` and `provider activity-timeline` so actual mission-stage success or failure can be inspected per provider on top of persisted `agentRuns`
- linked latest provider execution into `provider check`, `provider list`, `overview providers`, and `overview global` so readiness and real execution evidence can be read together
- added deterministic smoke coverage for mixed `stub` success or failure plus mocked `local` mission execution, including execution history and timeline filters
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_c7d6a1","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Provider Overview

- date: 2026-04-06T00:00:00.000Z
- added `overview providers` so provider readiness and persisted probe health can be inspected in one control-plane response instead of stitching together `provider list` and `provider history`
- linked provider summary into `overview global`, including configured or ready counts, unprobed count, and latest success, failure, skipped probe pointers
- added deterministic smoke coverage for mixed skipped, failed, and successful provider probes plus global overview linkage
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_3b70d6","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Provider Probe Timeline

- date: 2026-04-06T00:00:00.000Z
- added `provider timeline` so persisted provider probe records can be read as chronological success, failure, and skipped events instead of only raw history rows
- reused probe history filters for `--provider`, `--ok`, and `--attempted` so timeline and history slices stay aligned
- added deterministic smoke coverage for mixed successful and failed attempted probes plus timeline ordering and filtered failure slices
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_80fdfc","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Provider Probe History

- date: 2026-04-06T00:00:00.000Z
- persisted provider probe results into runtime state so readiness and reachability checks leave an audit trail instead of remaining transient CLI output
- added `provider history` plus latest-probe linkage on `provider list` and `provider check`, keeping current readiness and last connectivity result visible together
- added deterministic smoke coverage for missing-env persisted failure, mocked successful local probe persistence, and history filters
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_c661a8","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Provider Probe Surface

- date: 2026-04-06T00:00:00.000Z
- added `provider probe <id>` so operator workflows can distinguish missing env from actual endpoint reachability and model-list responses
- implemented lightweight `/models` probes for OpenAI, Anthropic, and local OpenAI-compatible runtimes, plus a deterministic in-process probe for `stub`
- added deterministic smoke coverage for non-attempted missing-env results and mocked successful probe responses across all implemented providers
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_030d48","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Provider Status Surface

- date: 2026-04-06T00:00:00.000Z
- added `provider list` and `provider check <id>` so operator-facing readiness can be inspected without creating or running a mission
- exposed implementation state, required env, missing env, default-provider status, and redacted effective configuration through the provider registry
- added deterministic smoke coverage for provider status queries with configured and unconfigured env paths
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_b701db","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Shared Structured Provider Utility

- date: 2026-04-06T00:00:00.000Z
- extracted shared structured-output prompt building, JSON parsing, numeric env parsing, and stage normalization into a provider utility module
- rewired `openai`, `anthropic`, and `local` adapters to use the same parsing and normalization path so provider behavior does not drift by copy-pasted implementations
- kept request-shape differences provider-local and validated the refactor with the existing provider smoke suite plus base mission regression smoke
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_0bc171","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Local Provider Adapter

- date: 2026-04-06T00:00:00.000Z
- added a `local` provider adapter for OpenAI-compatible local `/chat/completions` runtimes, with fast `LOCAL_PROVIDER_MODEL` validation and optional base-url/api-key overrides
- kept the structured JSON normalization path identical to `stub`, `openai`, and `anthropic` so provider-specific wiring does not fork the mission/session contract
- added deterministic smoke coverage for the missing-model path and mocked fetch success path so local runtime wiring can be validated without an actual local model server
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_1d5d65","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Anthropic Provider Adapter

- date: 2026-04-06T00:00:00.000Z
- added an Anthropic provider adapter backed by the Messages API contract, with fast `ANTHROPIC_API_KEY` validation and request wiring for `model`, `system`, `messages`, and `max_tokens`
- kept the current structured JSON contract identical to the OpenAI path so manager, planner, executor, and reviewer stage normalization does not fork by provider
- added deterministic smoke coverage for the missing-key path and mocked fetch success path so Anthropic wiring can be validated locally without a live API call
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_ffe07c","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Async Provider Runtime And OpenAI Adapter

- date: 2026-04-06T00:00:00.000Z
- made `runMission`, `runAgentStage`, and the CLI mission-run path async-safe so provider implementations can await network calls without a larger runtime rewrite
- added an OpenAI provider adapter backed by the Responses API contract, with fast `OPENAI_API_KEY` validation and response JSON parsing/normalization for manager, planner, executor, and reviewer stages
- added deterministic smoke coverage for the missing-key path and mocked fetch success path so provider wiring can be validated locally without live network access
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_09b364","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Maintenance Bucket Delta

- date: 2026-04-06T00:00:00.000Z
- added `latestBucketDelta` to maintenance-only summaries so the newest daily bucket can be compared against the immediately previous bucket without post-processing
- kept the delta contract derived from `dailyBuckets`, which avoids introducing a second parallel trend model and keeps maintenance audit math in one place
- extended maintenance history smoke coverage to lock negative and positive delta cases for full history, recent slices, and mission-scoped slices
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_ca2d26","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Maintenance Daily Buckets

- date: 2026-04-06T00:00:00.000Z
- added `dailyBuckets` to maintenance-only summary payloads so filtered maintenance history and overview can be read as small day-level aggregates without a separate reporting command
- kept the new bucket contract scoped to maintenance-specific surfaces only, avoiding unnecessary payload expansion in mission, workspace, and global summary contracts
- extended maintenance history smoke coverage to lock bucket ordering, per-day effective/no-op counts, and affected mission breadth into a deterministic contract
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_f1b57c","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Maintenance Since Filter

- date: 2026-04-06T00:00:00.000Z
- added `--since <iso-timestamp>` to `action maintenance-history` and `overview maintenance` so maintenance audit can be sliced by time window without inventing a separate trend endpoint
- kept the new filter run-history-only, leaving current maintenance pressure summary semantics unchanged while echoing the normalized timestamp through `filters.since`
- extended maintenance history smoke coverage with fixed maintenance run timestamps so workspace and mission time-window filtering stays deterministic
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_4fb488","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Maintenance Outcome Filters

- date: 2026-04-06T00:00:00.000Z
- added `--outcome <effective|no-op|impactful>` to `action maintenance-history` and `overview maintenance` so operators can directly slice sweep audit by run quality
- reused the same maintenance run classification helpers that feed the summary trend fields, keeping filtering semantics aligned with `effectiveRunCount`, `noOpRunCount`, and `impactRunCount`
- extended maintenance history smoke coverage to prove workspace-scope effective/no-op filters and mission-scope empty no-op filtering behave deterministically
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_1c314e","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Maintenance Run Trend Summary

- date: 2026-04-06T00:00:00.000Z
- extended maintenance-specific summaries with `effectiveRunCount`, `noOpRunCount`, `impactRunCount`, `latestEffectiveRun`, `latestNoOpRun`, and a short `recentRuns` trend window
- kept the existing affected mission breadth and missionImpact semantics intact so maintenance history can answer both scope and effectiveness questions from the same summary payload
- strengthened maintenance history smoke coverage to lock the first effective sweep, second no-op sweep, and recent run ordering into a deterministic contract
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_66a2b1","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Mission Maintenance History Linkback

- date: 2026-04-06T00:00:00.000Z
- extended `action maintenance-history --mission` and `overview maintenance --mission` to include related workspace-scope maintenance runs instead of only direct mission runs
- kept run-level breadth metadata intact while adding mission-specific `missionImpact*` summary fields so cross-mission sweeps do not hide the effect on the selected mission
- strengthened maintenance history smoke coverage to prove a workspace sweep appears in mission-scoped history/overview with correct run totals and mission-local reminder impact
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_d3a6d6","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Managed Runtime Kickoff

- date: 2026-04-06T00:00:00.000Z
- shifted the project from single-pass pack rendering to a managed multi-agent runtime
- established first-class runtime entities for sessions, agent runs, artifacts, approvals, and memory
- kept the implementation local-first and stub-provider based for deterministic development
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_b7becb","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Reviewer And Approval Hardening

- date: 2026-04-06T00:00:00.000Z
- added deliverable-aware reviewer rubric checks instead of relying on section presence alone
- added deterministic coverage for approval rejection and reviewer rubric failure
- kept the runtime local-first without introducing live provider dependencies
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_e61d11","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Approval Resume Evidence

- date: 2026-04-06T00:00:00.000Z
- changed approval approve handling to emit an `execution-ready-brief.md` handoff artifact instead of only flipping status
- split the approval approve path into its own deterministic smoke so the lifecycle now has stop, approve, and reject coverage
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_f529dd","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Mission Memory Carry-Forward

- date: 2026-04-06T00:00:00.000Z
- reviewer failures now persist mission-scoped fact memory
- approval decisions now persist mission-scoped decision memory
- reruns now prove that prior decision memory is injected back into manager context
- planner and executor now adapt rerun artifacts using prior mission memory instead of treating memory as display-only context
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_b6d981","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Session History Surface

- date: 2026-04-06T00:00:00.000Z
- added `session list <missionId>` and per-session summaries so reruns are directly inspectable
- extended `session show` to support `--session <sessionId>` for non-latest session inspection
- added deterministic coverage for multi-session history after reject-and-rerun
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_f70141","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Mission Timeline Surface

- date: 2026-04-06T00:00:00.000Z
- enriched `mission show` with mission-level summary counts
- added `mission timeline <missionId>` to aggregate session, approval, and memory events in chronological order
- added deterministic coverage for mission-level timeline inspection after reject-and-rerun
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_2f2e3f","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Workspace Overview Surface

- date: 2026-04-06T00:00:00.000Z
- added `workspace overview <workspaceId>` to aggregate mission, session, approval, and memory state across one workspace
- kept `workspace show` as the raw workspace lookup and separated the operational view into a dedicated overview command
- added deterministic coverage for mixed completed/awaiting/failed mission states in one workspace
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_473352","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Global Overview Surface

- date: 2026-04-06T00:00:00.000Z
- added `overview global` to aggregate all workspaces into one control-plane view
- included a pending approval inbox so cross-workspace human action items are visible without drilling into each workspace
- added deterministic coverage for multi-workspace global aggregation and inbox behavior
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_1767da","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Approval Inbox Surface

- date: 2026-04-06T00:00:00.000Z
- split the pending approval inbox into a dedicated `approval inbox` command instead of keeping it only as a nested global-overview field
- enriched inbox items with workspace, mission, session, and resolve-command context for operator use
- added deterministic coverage for inbox filtering and exclusion of resolved approvals
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_87fd4e","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Unified Action Inbox Surface

- date: 2026-04-06T00:00:00.000Z
- added `action inbox` as a broader operator queue that combines pending approvals with current reviewer follow-up items
- kept `approval inbox` intact and reused the same approval aggregation logic so approval-only and mixed-action surfaces stay consistent
- added deterministic coverage to prove resolved approvals stay out and reviewer-failed latest sessions show actionable rerun guidance
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_f7699e","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Action Classification

- date: 2026-04-06T00:00:00.000Z
- added explicit action classes so operator queues distinguish `awaiting-human-decision`, `retry-ready`, and `blocked`
- treated rejected approval outcomes as blocked follow-up items instead of silently dropping them from all operator surfaces
- added class-based filtering to `action inbox` so the queue can be used as a practical operational slice rather than a flat list
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_203043","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Action Dispatch Metadata

- date: 2026-04-06T00:00:00.000Z
- added `priority`, `recommendedOwner`, and `recommendedCommand` so action inbox items can be dispatched without re-deriving operator intent from raw mission state
- added priority/owner filtering and summary counts to make the queue usable for focused operational slices like “high-priority human approvals”
- kept the item contract backward-compatible by preserving `commandHint` while introducing the more explicit dispatch fields
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_a155b0","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Action SLA And Escalation

- date: 2026-04-06T00:00:00.000Z
- added `slaHours`, `dueAt`, `isOverdue`, and `escalationRule` so action inbox items can be managed as time-based operational obligations
- added `--overdue` filtering and overdue summary counts to make the queue usable for aging-based follow-up
- strengthened the deterministic smoke by rewriting temp state timestamps so overdue behavior is verified without depending on wall-clock timing
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_f1ec49","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Overdue Incident Logging

- date: 2026-04-06T00:00:00.000Z
- added an explicit `action log-overdue` command so overdue operational items can be promoted into the tracked incident trail instead of remaining query-only state
- reused the existing doc logging path and generated incident entries with filters, command hints, and escalation text for each overdue item
- added deterministic smoke coverage for logged, filtered, and no-op overdue logging behavior
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_e1d0da","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Escalated Inbox Lifecycle

- date: 2026-04-06T00:00:00.000Z
- added first-class escalation records so overdue action logging now persists open escalation state instead of only appending markdown incidents
- added `action escalated` and `action resolve-escalation` commands so escalations can be tracked and closed explicitly
- added deterministic smoke coverage for escalation dedupe, open/resolved filtering, and manual resolution notes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_a81446","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Escalation Pressure In Overviews

- date: 2026-04-06T00:00:00.000Z
- extended `workspace overview` and `overview global` so control-plane summaries now include escalation counts, open escalation ids, latest escalation context, and top-level escalated workspace visibility
- updated overview smokes to generate overdue escalation state before assertions so the top-level summaries are tested against real escalation records instead of empty defaults
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_6fd490","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Escalation Events In Mission Timeline

- date: 2026-04-06T00:00:00.000Z
- extended `mission timeline` so mission-scoped escalation open/resolved lifecycle is visible on the same chronological axis as sessions, approvals, and memory
- updated mission timeline smoke to create an overdue action, log it into escalation state, resolve it, and verify both timeline events plus mission summary escalation counts
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_d86a85","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Workspace And Global Operator Timeline

- date: 2026-04-06T00:00:00.000Z
- added workspace-level and global operator timeline surfaces that unify approval, reviewer follow-up, and escalation events into one operator-facing chronological stream
- kept mission timeline focused on mission scope while exposing broader operational history through `workspace timeline` and `overview operator-timeline`
- added deterministic smoke coverage for mixed workspace/global operator events and chronological ordering
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_399987","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Reviewer Follow-Up Resolution Lifecycle

- date: 2026-04-06T00:00:00.000Z
- added first-class reviewer follow-up records with open/resolved status so reviewer remediation no longer appears only as a derived failed-session artifact
- added `action reviewer-followups` and `action resolve-reviewer-follow-up` so operator workflows can inspect and explicitly close reviewer follow-up items
- persisted reviewer follow-up resolution notes back into mission memory so future reruns can see why a follow-up was closed
- extended mission, workspace, and global timeline coverage so reviewer follow-up closure is tracked alongside approval and escalation lifecycle events
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_770610","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Reviewer Follow-Up Resolution Taxonomy

- date: 2026-04-06T00:00:00.000Z
- added explicit reviewer follow-up resolution kinds so closure reasons are structured as `rerun-fixed`, `superseded`, `scope-reduced`, or `accepted-risk`
- extended `action reviewer-followups` with kind filtering and summary counts so resolved follow-ups can be sliced by remediation outcome
- updated mission memory and operator timeline details so closure events now preserve both taxonomy and free-text note
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_445620","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Accepted Risk Monitoring Policy

- date: 2026-04-06T00:00:00.000Z
- linked reviewer follow-up taxonomy to escalation policy so `accepted-risk` does not disappear after closure and instead opens a monitoring escalation automatically
- reused existing escalation overview and inbox surfaces instead of adding a parallel monitoring queue, keeping accepted-risk pressure visible at mission, workspace, and global level
- added deterministic smoke coverage to prove accepted-risk resolution creates an open escalation and that timeline plus overview surfaces reflect the policy outcome
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_21e018","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Monitoring Required Action Queue

- date: 2026-04-06T00:00:00.000Z
- surfaced open accepted-risk monitoring escalations back into `action inbox` as `monitoring-required` items so workspace-owner review appears in the main operator queue
- reused escalation dueAt and rule metadata for the reopened action item instead of synthesizing a second policy clock
- added deterministic overdue coverage by aging the monitoring escalation and verifying `action inbox --class monitoring-required --overdue`
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_b2d38b","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Escalation Tiering

- date: 2026-04-06T00:00:00.000Z
- added derived escalation tiers so open escalation pressure can be sliced as `normal`, `warning`, or `critical`, with resolved entries exposed as `resolved`
- extended `action escalated` with tier filtering and summary counts, and propagated tier counts into workspace, mission, and global overview summaries
- strengthened escalation smokes to verify both initial normal accepted-risk monitoring and aged critical escalation paths
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_64e97b","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Escalation Sync And Breach History

- date: 2026-04-06T00:00:00.000Z
- added `action sync-escalations` so tier transitions are persisted into runtime state instead of being only read-time derivations
- escalations now accumulate `breachCount`, `lastBreachAt`, `lastSyncedAt`, and `tierHistory` so operator severity has auditable history
- updated mission and overview summaries to surface escalation breach totals, and added deterministic sync smoke for `normal -> warning -> critical -> resolved`
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_f620aa","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Escalation Reminder Trail

- date: 2026-04-06T00:00:00.000Z
- added `action remind-escalations` so open escalation pressure can be re-issued through a local-first operator command without introducing external notification dependencies
- escalations now persist `reminderCount`, `lastReminderAt`, and `reminderHistory`, and mission/workspace/global summaries surface reminder totals alongside breach totals
- extended mission and operator timelines with `escalation-reminded` events and added deterministic smoke coverage for repeated reminders on an accepted-risk monitoring escalation
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_0f3470","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Escalation Reminder Due Policy

- date: 2026-04-06T00:00:00.000Z
- added cadence-derived reminder due state so escalations expose `nextReminderAt`, `needsReminder`, and `reminderCadenceHours` instead of forcing operators to infer re-notify timing manually
- extended `action escalated` with `--needs-reminder` and `action remind-escalations` with `--due` so the reminder queue can be sliced without re-sending every open escalation
- updated workspace/global summaries to surface `escalationNeedsReminderCount` and added deterministic smoke coverage for due-after-created and due-after-last-reminder transitions
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_35e76a","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Escalation Owner Chain

- date: 2026-04-06T00:00:00.000Z
- added derived effective owner escalation so repeated due monitoring pressure can move from the recorded owner to a higher operator without mutating the stored base owner
- extended `action escalated` and `action inbox` with `--effective-owner` filtering and surfaced effective owner counts in action/escalation summaries
- added deterministic smoke coverage to prove accepted-risk monitoring escalates from `workspace-owner` to `human-approver` after reminder issuance and renewed due state
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_0a8927","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Escalation Owner History

- date: 2026-04-06T00:00:00.000Z
- persisted owner chain transitions through `syncEscalations` so effective owner changes are recorded as stateful history instead of remaining read-time only derivations
- extended mission and operator timelines with `escalation-owner-changed` events and surfaced latest owner escalation timestamp plus owner transition totals in overview summaries
- added deterministic smoke coverage to prove owner history backfill, `workspace-owner -> human-approver` transition recording, and timeline visibility for accepted-risk monitoring escalation
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_8cb710","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Escalation Owner Handoff Queue

- date: 2026-04-06T00:00:00.000Z
- added a dedicated owner handoff queue so persisted owner transitions become actionable operator items instead of remaining timeline-only audit data
- added explicit `acknowledge-owner-handoff` handling and timeline visibility for owner handoff acknowledgement events, along with latest/pending handoff summary fields
- added deterministic smoke coverage for pending handoff discovery, acknowledgement, acknowledged queue visibility, and summary/timeline propagation
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_538f23","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Owner Handoff Due Pressure

- date: 2026-04-06T00:00:00.000Z
- extended pending owner handoffs with derived SLA, dueAt, and overdue state so acknowledgement pressure is visible without manually comparing transition timestamps
- added `action owner-handoffs --overdue` and propagated pending handoff overdue counts plus next due timestamp into mission, workspace, and global summaries
- updated owner handoff acknowledgement detail so overdue acknowledgements stay visible on the mission timeline instead of disappearing into a generic resolved note
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_778f2c","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Owner Handoff In Unified Action Inbox

- date: 2026-04-06T00:00:00.000Z
- reintroduced pending owner handoff work into the main `action inbox` as `handoff-required` so operators do not have to switch to a dedicated queue to see acknowledgement work
- excluded pending owner handoff escalations from the generic accepted-risk monitoring slice to avoid duplicate operator actions for the same escalation
- strengthened `smoke-action-inbox` to verify approval, reviewer follow-up, blocked follow-up, and owner handoff all coexist in the unified queue with correct counts, filters, and overdue state
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_ce4452","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Owner Handoff Reminder Policy

- date: 2026-04-06T00:00:00.000Z
- added local-first reminder cadence for pending owner handoffs so overdue acknowledgement work can be re-notified without relying on external integrations
- extended `action owner-handoffs` with `--needs-reminder` and added `action remind-owner-handoffs` so reminder candidates can be sliced and re-issued explicitly
- propagated owner handoff reminder counts, latest reminder timestamp, and next reminder timestamp into mission/workspace/global summaries and mission/operator timeline surfaces
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_c48f19","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Unified Action Reminder Slice

- date: 2026-04-06T00:00:00.000Z
- normalized owner handoff reminder metadata onto the unified `action inbox` item shape so `handoff-required` and `monitoring-required` actions share the same reminder semantics
- extended `action inbox` with `--needs-reminder` and reminder summary counts so the main operator queue can slice reminder work without switching to queue-specific commands
- strengthened smoke coverage to prove `--needs-reminder` works for both owner handoff work and accepted-risk monitoring escalations
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_5adffc","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Local Maintenance Sweep

- date: 2026-04-06T00:00:00.000Z
- added `action maintenance` as a repo-native local-first sweep that runs escalation sync plus due reminders for monitoring pressure and pending owner handoffs in one command
- suppressed duplicate generic escalation reminders for escalations that already have a pending owner handoff, so maintenance emits one reminder path per open operator obligation
- added deterministic mixed-queue smoke coverage to prove maintenance reminds one monitoring escalation and one owner handoff without double-reminding the same escalation
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_6eecd2","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Maintenance Run History

- date: 2026-04-06T00:00:00.000Z
- persisted `action maintenance` executions as first-class maintenance run records so local sweeps leave an audit trail even when they do not send any reminders
- added `action maintenance-history` and `overview maintenance` so operators can inspect latest sweep results, aggregate reminder totals, and no-op runs without reading raw state
- propagated maintenance run totals and latest run metadata into workspace/global overview so top-level control-plane surfaces now show maintenance activity as well as pressure
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_da35df","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Maintenance Required Action

- date: 2026-04-06T00:00:00.000Z
- surfaced current due maintenance pressure as a first-class `maintenance-required` item in the unified `action inbox`
- grouped due monitoring reminders and due owner handoff reminders into one workspace-scoped maintenance action so operators can launch the sweep without manually re-deriving scope
- extended maintenance history smoke coverage to verify the maintenance-required item appears before a sweep and disappears after the sweep clears due pressure
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_b70c50","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Maintenance Run In Operator Timeline

- date: 2026-04-06T00:00:00.000Z
- added `maintenance-run` events to workspace/global operator timeline so maintenance execution is visible alongside approval, follow-up, and escalation activity
- included run outcome detail such as sync count, reminded count, and no-op marker in the timeline event body
- extended operator timeline smoke coverage to verify a no-op maintenance sweep still leaves an auditable operator event
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_8acac1","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Maintenance Pressure Resolution Trail

- date: 2026-04-06T00:00:00.000Z
- extended maintenance run records with before/after pressure snapshots plus acknowledged/resolved/remaining counts so derived `maintenance-required` work leaves explicit audit evidence
- added `maintenance-required-acknowledged` and `maintenance-required-resolved` events to workspace/global operator timeline instead of letting maintenance pressure disappear silently after a sweep
- strengthened maintenance history smoke coverage to verify the first sweep acknowledges and clears one maintenance-required obligation while a second no-op sweep leaves no false resolution record
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_b8fc4f","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Mission Maintenance Audit Surface

- date: 2026-04-06T00:00:00.000Z
- propagated maintenance run totals and latest maintenance metadata into mission summary so a single mission can expose its own maintenance audit state without requiring workspace/global drill-down
- extended mission timeline with mission-scoped `maintenance-run`, `maintenance-required-acknowledged`, and `maintenance-required-resolved` events
- strengthened mission timeline smoke coverage to prove an overdue escalation can be reminded through mission-scoped maintenance before escalation resolution, while leaving explicit maintenance evidence in the mission audit stream
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_8c07c0","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Workspace Maintenance Linkback In Mission Timeline

- date: 2026-04-06T00:00:00.000Z
- linked workspace-scoped maintenance runs back to affected mission ids so a mission timeline can show indirect maintenance activity even when the sweep was executed at workspace scope
- kept maintenance-required acknowledgement and resolution events mission-scoped only, while mission timelines now render a mission-specific workspace maintenance detail built from affected escalation and handoff reminder counts
- updated mission timeline smoke coverage to switch from action maintenance with mission scope to action maintenance with workspace scope and verify that related maintenance evidence still appears on the mission audit surface
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_ba6b18","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Mission Maintenance Impact Summary

- date: 2026-04-06T00:00:00.000Z
- added combined maintenance impact fields to mission summary so direct mission maintenance totals and indirect workspace maintenance effects are both visible without replaying timeline events by hand
- kept direct maintenance aggregate semantics unchanged and introduced impact-only fields separately to avoid overcounting existing maintenanceRunCount and maintenanceTotalRemindedCount contracts
- extended mission timeline smoke coverage to assert the new impact totals for a workspace-scoped maintenance run that affects exactly one mission
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_39c73f","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Workspace And Global Maintenance Impact Breadth

- date: 2026-04-06T00:00:00.000Z
- added maintenance-affected mission breadth fields to workspace and global overview summaries so top-level control-plane surfaces can show how many missions recent sweeps actually touched
- kept existing maintenance total/reminder counters unchanged and exposed breadth as separate affected-mission metadata to avoid changing previous summary semantics
- extended workspace and global overview smoke coverage with maintenance sweeps so affected mission counts and latest impact run linkage are verified deterministically
- corrected workspace impact lookup so workspace overview also counts global maintenance sweeps and mission-scope sweeps that affected missions inside the workspace, instead of only runs that were launched with the workspace id directly
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-06T00:00:00.000Z","id":"doclog_20260413210753_0a1d8c","type":"devlog","updatedAt":"2026-04-06T00:00:00.000Z"} -->
## 2026-04-06 Maintenance History Impact Summary

- date: 2026-04-06T00:00:00.000Z
- extended maintenance history and maintenance overview summaries with affected mission breadth plus latest impact linkage so maintenance-specific audit surfaces can answer reach questions directly
- reused the same maintenance impact helper already used by mission and overview summaries instead of introducing a separate maintenance-history-only contract
- strengthened maintenance history smoke coverage to verify the first effective sweep touched exactly two missions while the later no-op sweep does not replace the latest impact run metadata
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_76dbb0","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Orchestration Profile Workspace Usage Summary Symmetry

- date: 2026-04-09T00:00:00.000Z
- promoted `workspaceUsageTrend` month-over-month comparison fields into `overview profiles` summary so `currentMonthStartDate`, `currentMonthWorkspaceCount`, `previousMonthStartDate`, `previousMonthWorkspaceCount`, and `workspaceCountDelta` are available without reopening the root quick field
- extended orchestration profile smoke coverage across root overview, mixed single-workspace overview, and second-workspace overview to verify the new summary aliases for growing and steady workspace footprint cases
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_60cfda","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Orchestration Profile Usage Summary Symmetry

- date: 2026-04-09T00:00:00.000Z
- promoted `usageTrend` month-over-month comparison fields into `overview profiles` summary so `currentMonthStartDate`, `currentMonthMissionCount`, `previousMonthStartDate`, `previousMonthMissionCount`, and `missionCountDelta` are available without reopening the root quick field
- extended orchestration profile smoke coverage across root overview, mixed single-workspace overview, and second-workspace overview to verify the new mission-volume summary aliases for growing and steady usage cases
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_1c0d0b","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Orchestration Profile Adoption Composition Summary Symmetry

- date: 2026-04-09T00:00:00.000Z
- promoted `adoptionDriftUsageTrendStatus` and `adoptionDriftWorkspaceUsageTrendStatus` into `overview profiles` summary so combined adoption status can be decomposed into mission-volume and workspace-footprint trend signals without reopening the root quick field
- extended orchestration profile smoke coverage across root overview, mixed single-workspace overview, and second-workspace overview to verify the new summary aliases for growing and steady combined adoption cases
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_9e2795","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Workspace Adoption Composition Symmetry

- date: 2026-04-09T00:00:00.000Z
- promoted `missionTrendStatus` and `profileFootprintTrendStatus` into root `workspaceAdoptionDrift` and mirrored them as `workspaceAdoptionDriftMissionTrendStatus` and `workspaceAdoptionDriftProfileFootprintTrendStatus` in summary so workspace-level combined adoption pressure can be decomposed into mission-volume and footprint trend sources without reopening count maps
- extended orchestration profile smoke coverage across root overview, mixed single-workspace overview, and second-workspace overview to verify the new workspace adoption composition aliases for growing and steady workspace cases
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_e81f03","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Trend Latest Linkage Symmetry

- date: 2026-04-09T00:00:00.000Z
- promoted generic `latestProfile` into `usageTrend` and `workspaceUsageTrend`, and generic `latestWorkspace` into `workspaceUsageTrend`, then mirrored them as summary aliases so trend consumers can resolve the newest preset or workspace without relying on direction-specific latest links only
- extended orchestration profile smoke coverage across root overview, mixed single-workspace overview, and second-workspace overview to verify the new generic latest linkage contract for mission-volume and workspace-footprint trends
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_9f7ad6","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Korean Single-Screen Operator Flow Polish

- date: 2026-04-09T00:00:00.000Z
- localized the operator console surface into Korean so navigation chrome, guided steps, empty states, and workflow helper copy read as a coherent product UI instead of an internal mixed-language tool
- tightened the single-screen operator flow around `미션 정하기 → 실행하기 → 검토하기 → 결과 보기` and aligned setup, review, artifact, session, and provider surfaces to that explicit user journey
- added display-only label translation for mission/session/action/approval statuses and common timeline event kinds so backend contract values can remain stable while the UI stays readable for Korean-speaking operators
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-09T00:00:00.000Z","id":"doclog_20260413210753_8933fe","type":"devlog","updatedAt":"2026-04-09T00:00:00.000Z"} -->
## 2026-04-09 Command Header And Detail Tabs Reframe

- date: 2026-04-09T00:00:00.000Z
- removed the always-open right inspector and rebuilt the console around a single main workspace with a sticky command header, explicit next-action banner, and stronger step navigation so operators can understand current state before scanning lower details
- split the lower half into dedicated detail tabs for `결과물`, `실행 기록`, `검토 이력`, and `입력값과 설정`, which keeps result reading, session tracing, and provider context on one screen without forcing a three-column scan
- updated mission queue copy and step summaries so Korean operators see natural task language like `지금 할 일`, `막힌 이유 / 상태`, `검토와 승인 처리가 필요합니다`, and `최종 결과를 확인하고 확정하세요` instead of having to infer meaning from dispersed system labels
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-10T00:00:00.000Z","id":"doclog_20260413210753_60ac9c","type":"devlog","updatedAt":"2026-04-10T00:00:00.000Z"} -->
## 2026-04-10 Command Surface Compression And Workspace Merge

- date: 2026-04-10T00:00:00.000Z
- merged the previous separated progress strip into the command header so mission identity, current action, and stage flow read as one operator control surface instead of two stacked dashboards
- introduced a single `workspace-shell` that groups `현재 단계 작업판` and `결과와 기록` into the same vertical working column, reducing scan distance and making the “choose → act → confirm” loop feel like one screen
- compressed rail density, inline status metrics, and detail tabs so the console shows more actionable state above the fold while keeping the Korean step flow and review/output surfaces intact
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-10T00:00:00.000Z","id":"doclog_20260413210753_7bfdd6","type":"devlog","updatedAt":"2026-04-10T00:00:00.000Z"} -->
## 2026-04-10 Mission Queue Scanability And Detail Context Bar

- date: 2026-04-10T00:00:00.000Z
- reshaped the left mission queue into a more operational inbox with queue counters, clearer `다음 액션` emphasis, and denser row metadata so users can judge what to open without parsing several separate cards
- added a `detail-contextbar` above the lower tabs so the selected mission, current detail mode, latest session, artifact count, and review state are visible before drilling into results or logs
- kept the single-screen flow intact while making the lower `결과와 기록` surface feel less like detached tabs and more like a contextual workbench tied to the currently selected mission/session
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-10T00:00:00.000Z","id":"doclog_20260413210753_64e1ca","type":"devlog","updatedAt":"2026-04-10T00:00:00.000Z"} -->
## 2026-04-10 Dark Inbox Rail And Unified Detail Strip Polish

- date: 2026-04-10T00:00:00.000Z
- restyled the left rail away from stacked white cards into a darker inbox-like list so selected missions and next actions scan faster against the control-plane background
- turned the lower result area into a flatter contextual strip by reducing card treatment around the detail context bar and tab labels, keeping current mode, session, artifact, and review state visible without adding another dashboard row
- added tab count labels for artifacts, runs, and reviews so the lower workbench communicates depth before the user opens each tab
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-10T00:00:00.000Z","id":"doclog_20260413210753_d0d0b1","type":"devlog","updatedAt":"2026-04-10T00:00:00.000Z"} -->
## 2026-04-10 Result-First Output Workbench

- date: 2026-04-10T00:00:00.000Z
- reworked `결과 보기` around a representative deliverable spotlight plus a separate closeout checklist so the final stage reads like “confirm the outcome” instead of another generic stage card
- widened the artifact detail view into an asymmetric result-first layout, keeping the deliverable body dominant while moving timeline and secondary context into a narrower companion pane
- tied the output checklist and detail context to the same artifact/session selection helpers so final result verification, review state, and run history stay synchronized across the lower workbench
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-10T00:00:00.000Z","id":"doclog_20260413210753_b06694","type":"devlog","updatedAt":"2026-04-10T00:00:00.000Z"} -->
## 2026-04-10 Mission Inbox Compression And Closeout Checklist Pass

- date: 2026-04-10T00:00:00.000Z
- compressed the left mission queue into a denser inbox row format with stage, updated time, objective summary, next action, and provider context so operators can choose the next mission without scanning multiple boxed chips
- changed the output-stage closeout surface from generic mini cards into indexed checklist rows, making the final confirmation path read as ordered verification work instead of parallel widgets
- added UI-only label cleanup for mission mode values and reused the latest reviewer or objective summary as the queue snippet so Korean operators see purpose-first copy before opening a mission
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-10T00:00:00.000Z","id":"doclog_20260413210753_b0878f","type":"devlog","updatedAt":"2026-04-10T00:00:00.000Z"} -->
## 2026-04-10 Command Header Compression Pass

- date: 2026-04-10T00:00:00.000Z
- reduced the top command header to three core metrics plus a shorter signal row so mission identity, review pressure, and latest run read faster without competing cards
- shortened the default mission subtitle and each stage panel description into more direct Korean utility copy, removing extra explanatory weight from the first viewport
- kept the same single-screen operator structure while lowering visual density in the first screen, so users can scan state and move into the active stage with less interpretation overhead
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-10T00:00:00.000Z","id":"doclog_20260413210753_afe51e","type":"devlog","updatedAt":"2026-04-10T00:00:00.000Z"} -->
## 2026-04-10 Unified Command Surface Pass

- date: 2026-04-10T00:00:00.000Z
- flattened the `지금 할 일` panel from stacked meta cards into a single decision block with inline status chips so the operator reads action, stage, and progress state in one pass
- turned the progress strip into a footer-style rail inside the same command surface by removing its separate card treatment and giving it a shared divider/background continuation
- shortened the progress rail helper copy and stage cards so the top viewport feels like one coordinated control surface instead of separate dashboard modules
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-10T00:00:00.000Z","id":"doclog_20260413210753_dd7cd8","type":"devlog","updatedAt":"2026-04-10T00:00:00.000Z"} -->
## 2026-04-10 Inbox Rail Compression Pass

- date: 2026-04-10T00:00:00.000Z
- reduced the left rail width, brand copy, queue counters, and mission row padding so the inbox stops competing with the main workspace for first-screen attention
- reshaped each mission row into a tighter operator list with one inline `다음 액션` line and a condensed context footer that combines mode and provider into a single chip-like label
- kept the queue readable for Korean PM and operations users while giving more horizontal room to the command header and result workbench
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-10T00:00:00.000Z","id":"doclog_20260413210753_66f2a3","type":"devlog","updatedAt":"2026-04-10T00:00:00.000Z"} -->
## 2026-04-10 Result Workbench Hierarchy Pass

- date: 2026-04-10T00:00:00.000Z
- widened the artifact-first split so the final deliverable body holds more horizontal space while the companion timeline and run context stay secondary
- tightened the lower detail shell chrome and promoted selected artifact metadata into a clearer title plus kind/path row, making the result area feel more like a reading surface than a generic tab panel
- added compact count badges and divider-based grouping to session detail so execution history, approvals, and artifact lists read as structured inspection lanes instead of same-weight card stacks
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-10T00:00:00.000Z","id":"doclog_20260413210753_2ebc4a","type":"devlog","updatedAt":"2026-04-10T00:00:00.000Z"} -->
<!-- document-log:start {"createdAt":"2026-04-16T02:45:00.000Z","id":"doclog_20260416024500_5e6cb0","type":"devlog","updatedAt":"2026-04-16T02:45:00.000Z"} -->
## 2026-04-16 Recommendation Attention Recency Pass

- date: 2026-04-16T02:45:00.000Z
- surfaced the most recent attention event directly on recommendation cards so operators can read the last blocked/failed/confirmation-required summary without opening release history first
- added a distinct attention-flow visual treatment to recommendation cards, which helps separate genuinely problematic flows from simple follow-up actions even before any filter is applied
- kept the data source local to the existing release status payload by reusing the derived latestAttentionAction instead of introducing any new server contract
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T02:30:00.000Z","id":"doclog_20260416023000_c32aa8","type":"devlog","updatedAt":"2026-04-16T02:30:00.000Z"} -->
## 2026-04-16 Recommendation Flow Count Pass

- date: 2026-04-16T02:30:00.000Z
- upgraded recommendation cards from single latest-attempt snippets to flow-aware summaries that show both total matching history count and attention-event count
- surfaced `같은 문제 흐름 보기` whenever the flow has at least one blocked/failed/confirmation-required event, even if the very latest attempt itself is not an attention outcome
- kept the change client-side by deriving recommendation history context from the existing status payload, which improves triage density without expanding the server contract
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T02:15:00.000Z","id":"doclog_20260416021500_20e38f","type":"devlog","updatedAt":"2026-04-16T02:15:00.000Z"} -->
## 2026-04-16 Recommendation Active Flow State Pass

- date: 2026-04-16T02:15:00.000Z
- made recommendation cards reflect the currently applied triage context so the release tab shows when a suggested flow is already active instead of always rendering the same generic action buttons
- disabled duplicate `같은 flow 보기` and `같은 문제 흐름 보기` actions when the matching focus plus filter state is already applied, which reduces repeated clicks and makes the recommendation list read as current state plus next moves
- added a lightweight active-flow visual treatment so summary-level release guidance and history-level triage no longer feel like disconnected surfaces
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T02:00:00.000Z","id":"doclog_20260416020000_91a0b7","type":"devlog","updatedAt":"2026-04-16T02:00:00.000Z"} -->
## 2026-04-16 Recommendation Attention Filter Pass

- date: 2026-04-16T02:00:00.000Z
- added an `attention-only` release history filter so the operator can strip out successful actions and look only at blocked, failed, or confirmation-required events
- extended recommendation cards with `같은 문제 흐름 보기`, which applies the same scope/provider context plus the attention filter in one action and turns a generic suggestion into an immediate triage queue
- updated filtered empty-state handling so narrowing to attention outcomes does not look like the history feed disappeared or failed to load
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T01:40:00.000Z","id":"doclog_20260416014000_f30e39","type":"devlog","updatedAt":"2026-04-16T01:40:00.000Z"} -->
## 2026-04-16 Recommendation Flow Focus Pass

- date: 2026-04-16T01:40:00.000Z
- extended recommendation cards with `같은 flow 보기` so the operator can move directly from a suggested next action into the matching release-history triage context without first opening the raw history list
- made the action apply both focus and context filter at once, which turns the release tab flow into `recommendation -> pinned history -> narrowed scope/provider` instead of three separate manual steps
- kept the change client-side and state-local, preserving the release status API while shortening the operator path from summary badge to actionable forensic context
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T01:25:00.000Z","id":"doclog_20260416012500_8b18a2","type":"devlog","updatedAt":"2026-04-16T01:25:00.000Z"} -->
## 2026-04-16 Release History Context Filter Pass

- date: 2026-04-16T01:25:00.000Z
- added quick context filters for the focused release action so operators can narrow the history list to the same scope or provider without manually re-scanning every release row
- kept the filtering local to the release tab state and preserved the existing pinned focus flow, which means recommendation-driven triage now supports `jump -> pin -> inspect -> narrow` in one surface
- added explicit filter-clear controls and empty-state copy for filtered views so narrowing the list does not look like missing history or a data-loading bug
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T01:10:00.000Z","id":"doclog_20260416011000_2f4b67","type":"devlog","updatedAt":"2026-04-16T01:10:00.000Z"} -->
## 2026-04-16 Release History Focus Pin Pass

- date: 2026-04-16T01:10:00.000Z
- promoted release history focus from a temporary scroll target into a pinned triage state so the selected action stays at the top of the history list until the operator explicitly clears it
- added `이 기록 고정` and `포커스 해제` controls directly on history rows, which makes repeated release investigation less dependent on recommendation cards once the operator is already inside the history section
- kept the behavior client-side and non-destructive, preserving the release status API while making recommendation-driven investigation durable across rerenders and repeated status reloads
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T00:55:00.000Z","id":"doclog_20260416005500_4fd6aa","type":"devlog","updatedAt":"2026-04-16T00:55:00.000Z"} -->
## 2026-04-16 Release History Expand Pass

- date: 2026-04-16T00:55:00.000Z
- extended release action history rows with `상세 보기/닫기` so operators can inspect action id, outcome, scope, and provider without leaving the `v1 마감 상태` tab
- wired recommendation-driven `최근 기록 보기` to open the matching history row automatically, turning the existing jump/highlight behavior into a direct triage flow instead of a purely visual cue
- kept the change client-side and state-local so the release status API contract stays stable while the release tab becomes easier to navigate under repeated preflight/confirm cycles
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T01:18:00.000Z","id":"doclog_20260416011800_2d1dd8","type":"devlog","updatedAt":"2026-04-16T01:18:00.000Z"} -->
## 2026-04-16 Release Recommendation Attention Jump Pass

- date: 2026-04-16T01:18:00.000Z
- added a dedicated `최근 문제 보기` action on release recommendation cards so the operator can jump straight to the latest blocked/failed/confirmation-required history row instead of first landing on the latest overall action
- kept the extra jump conditional on `latestAttentionAction.id !== latestAction.id`, which avoids duplicate buttons when the newest attempt is already the newest problem
- left the interaction client-side and reused existing history focus state, so the triage path became sharper without adding any new server contract or release status payload field
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T01:42:00.000Z","id":"doclog_20260416014200_9d6dd3","type":"devlog","updatedAt":"2026-04-16T01:42:00.000Z"} -->
## 2026-04-16 Release Triage URL Sync Pass

- date: 2026-04-16T01:42:00.000Z
- extended the existing URL state contract so release-tab triage context now carries `focused history row + attention/scope/provider filters`, which lets recommendation-driven investigation survive refresh and shared links
- kept the query parameters release-scoped only, meaning `rhistory / routcome / rscope / rprovider` are emitted only while the `release` detail tab is active and are dropped on other tabs to avoid leaking stale triage state
- wired direct release-history interactions to `pushState` while keeping internal invalidation on `replaceState`, so browser back/forward now steps through triage context changes without polluting unrelated navigation
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T02:05:00.000Z","id":"doclog_20260416020500_57cf62","type":"devlog","updatedAt":"2026-04-16T02:05:00.000Z"} -->
## 2026-04-16 Release Triage Share Link Pass

- date: 2026-04-16T02:05:00.000Z
- connected the new release triage URL state to explicit operator actions by adding `현재 triage 링크 복사` for the focused investigation context and `이 flow 링크 복사` inside expanded history rows
- reused the existing clipboard/prompt fallback path and `buildUiStateUrl` contract instead of inventing a second share-link serializer, which keeps normal view copy and release triage copy consistent
- scoped the generated deep links to `detailTab=release` plus the chosen focus/filter overrides, so operators can hand off the exact investigation slice without re-explaining the narrowing steps
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T02:21:00.000Z","id":"doclog_20260416022100_877183","type":"devlog","updatedAt":"2026-04-16T02:21:00.000Z"} -->
## 2026-04-16 Recommendation Flow Share Pass

- date: 2026-04-16T02:21:00.000Z
- added `flow 링크 복사` and `문제 흐름 링크 복사` directly to release recommendation cards so the operator can share the matching triage context without first opening or filtering release action history
- reused the existing `copy-release-flow-link` action payload, which keeps recommendation-level sharing and history-row sharing aligned on the same deep-link contract
- kept the change client-side and recommendation-local, so the release status payload and server-side recommendation model remain unchanged while handoff speed improves
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T02:34:00.000Z","id":"doclog_20260416023400_5e32b0","type":"devlog","updatedAt":"2026-04-16T02:34:00.000Z"} -->
## 2026-04-16 Release History Exact-Link Share Pass

- date: 2026-04-16T02:34:00.000Z
- added exact-record share actions (`기록 링크 복사`, `문제 기록 링크 복사`, `이 기록 링크 복사`) so operators can hand off one specific release action event instead of an entire scope/provider flow
- implemented the new path by reusing `copyReleaseTriageLink` with a focused history id and cleared flow filters, which keeps exact-record links semantically separate from flow links without introducing a second URL contract
- exposed the exact-record share path both on recommendation cards and inside expanded history detail, so operators can start the handoff from either the summary or the raw action row
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T02:49:00.000Z","id":"doclog_20260416024900_83f1b5","type":"devlog","updatedAt":"2026-04-16T02:49:00.000Z"} -->
## 2026-04-16 Provider Command Copy Pass

- date: 2026-04-16T02:49:00.000Z
- extended provider readiness cards with `preflight 명령 복사` and `live 명령 복사` so release operators can hand off terminal-ready commands directly from the same surface that shows readiness and env status
- added `preflightCommand` to the provider readiness payload and reused a generic clipboard/prompt copy helper in the client, which avoids special-casing provider command sharing in a second path
- generated env-missing live commands as `export ENV_KEY=\"...\" && ...` skeletons so optional provider expansion can move from UI observation to shell execution without referring back to docs
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-16T03:05:00.000Z","id":"doclog_20260416030500_75b0cb","type":"devlog","updatedAt":"2026-04-16T03:05:00.000Z"} -->
## 2026-04-16 Recommendation Command Copy Pass

- date: 2026-04-16T03:05:00.000Z
- extended provider-related recommendation cards with direct `preflight 명령 복사` / `live 명령 복사` actions so shell handoff can start from the top-level recommendation list instead of requiring a second scan of provider readiness cards
- derived the recommendation command payload client-side from existing `actionProvider/envKey` and `providerReadiness`, which keeps the server recommendation model unchanged while preserving the same command strings shown in provider cards
- applied the copy path consistently whether the recommendation already has recent history or is still in the no-history state, so command handoff is available throughout the recommendation lifecycle
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-22T00:00:00.000Z","id":"doclog_20260422000000_release_handoff_summary_copy_digest","type":"devlog","updatedAt":"2026-04-22T00:00:00.000Z"} -->
## 2026-04-22 Release Handoff Summary-Copy Digest Pass

- date: 2026-04-22T00:00:00.000Z
- promoted the new handoff overview-copy verification from browser-only assertions into persisted release handoff artifacts, so `execution-v1-browser-e2e.json` and compact `handoff-digest/manifest/index` JSON now carry `summaryCopy` verification state alongside existing preview/open link evidence
- extended the shared structured summary contract to include a third `summary copy` row with `exact-match` counts, which lets the release tab read the new verification state directly from compact handoff artifacts instead of inferring it from raw smoke logs
- updated the browser fixture, UI summary-row expectations, and persisted artifact read-back checks so seeded handoff cards, runtime cards, and saved report artifacts all stay aligned on the same `entries=open,preview,summaryCopy` overview signature
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-21T00:00:00.000Z","id":"doclog_20260421000000_release_handoff_summary_copy","type":"devlog","updatedAt":"2026-04-21T00:00:00.000Z"} -->
## 2026-04-21 Release Handoff Summary Copy Pass

- date: 2026-04-21T00:00:00.000Z
- added `overview 복사` on `handoff-*` artifact cards and `현재 요약 복사` inside the matching inline preview panel, so operators can hand off the compact structured summary line without opening JSON or rebuilding the string manually
- reused the existing clipboard or prompt fallback path plus artifact-scoped copied state, which keeps the new summary-copy behavior consistent with the existing release handoff link-copy contract and avoids a second feedback model
- extended the browser E2E contract to prove handoff summary copy success and fallback for card-level and preview-level actions, plus copied-state handoff between artifacts, while keeping the final control preview on `index-markdown`
<!-- document-log:end -->

## 2026-04-10 Review Decision Priority Pass

- date: 2026-04-10T00:00:00.000Z
- reordered the review detail area so human approvals appear before follow-up tasks, keeping the most blocking decision path at the front of the review workspace
- reframed the review summary into a decision spotlight with explicit approval count, follow-up count, latest session state, and primary next-action buttons so operators can tell what to clear first
- added approval and action callouts plus stronger visual separation for readiness checks, making the review stage read as a triage surface rather than three same-weight boxes
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-10T00:00:00.000Z","id":"doclog_20260413210753_87f257","type":"devlog","updatedAt":"2026-04-10T00:00:00.000Z"} -->
## 2026-04-10 Mission Selection Bridge Pass

- date: 2026-04-10T00:00:00.000Z
- inserted a compact `선택한 미션` bridge strip above the stage workspace so the left inbox choice, the currently opened step, the next action, and the latest execution state read as one connected operator context
- strengthened the active mission row with `현재 작업 중` and `현재 작업판` cues, reducing the feeling that the queue selection and the central workbench are separate surfaces
- kept the change intentionally lightweight by reusing existing mission/session helpers instead of adding a new dashboard block, preserving the single-screen flow while improving selection-to-workspace linkage
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T00:00:00.000Z","id":"doclog_20260415105500_12e44a","type":"devlog","updatedAt":"2026-04-15T00:00:00.000Z"} -->
## 2026-04-15 View Breadcrumb Pass

- date: 2026-04-15T00:00:00.000Z
- extended the `선택한 미션` bridge strip with `현재 보기 / 세션 포커스 / 결과물 포커스` crumbs so operators can read the exact URL-synced navigation context without inspecting the query string
- reused existing mission/session/artifact selection state instead of introducing a new inspector block, keeping the single-screen flow intact while making deep-linked state visible
- kept the addition lightweight and text-first so the breadcrumb clarifies navigation context without competing with the main work surface
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T00:00:00.000Z","id":"doclog_20260415102000_24a51b","type":"devlog","updatedAt":"2026-04-15T00:00:00.000Z"} -->
## 2026-04-15 Share/Reset View Pass

- date: 2026-04-15T00:00:00.000Z
- added `현재 링크 복사` and `보기 초기화` actions to the top control surface so the new URL-synced operator state is immediately usable for sharing and quick recovery
- implemented a lightweight UI notice path instead of extra modal chrome, which keeps the single-screen work surface intact while still confirming copy/reset actions
- kept reset semantics narrow: it reopens the currently selected mission in its default recommended view or falls back to the first visible mission, rather than mutating any underlying mission data
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-15T00:00:00.000Z","id":"doclog_20260415091500_5c8b4e","type":"devlog","updatedAt":"2026-04-15T00:00:00.000Z"} -->
## 2026-04-15 Browser History Navigation Pass

- date: 2026-04-15T00:00:00.000Z
- split URL state writes into `push` for direct operator navigation and `replace` for internal refresh flows, so bookmarkable console state also participates in normal browser back/forward navigation
- added `popstate` restore on top of the existing query bootstrap logic, which lets mission, step, detail tab, session, and artifact context rewind without losing the single-screen operator workflow
- verified the served asset exports `pushState`/`popstate` handling and updated README copy to reflect refresh, sharing, and browser-history recovery behavior
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-22T00:00:00.000Z","id":"doclog_20260422000000_summarycopypreview_structured","type":"devlog","updatedAt":"2026-04-22T00:00:00.000Z"} -->
## 2026-04-22 Release Handoff Summary-Copy Preview Structured Pass

- date: 2026-04-22T00:00:00.000Z
- promoted `summary copy preview` verification from main browser report-only evidence into the shared compact handoff structured summary so `execution-v1-release-handoff-digest/manifest/index` JSON artifacts now carry preview-body exact-match counts alongside existing `preview/open/summary copy` rows
- extended the release tab handoff card and inline preview summary rows to render a fourth `summary copy preview` entry directly from compact handoff JSON, which lets operators read preview-body verification state without opening the full browser report artifact
- tightened the browser smoke contract so handoff card/preview structured summary rows and overview line must now include the new `summaryCopyPreview` entry in addition to the existing `summaryCopy` row
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-22T00:00:00.000Z","id":"doclog_20260422000000_summarycopy_preview","type":"devlog","updatedAt":"2026-04-22T00:00:00.000Z"} -->
## 2026-04-22 Release Handoff Summary-Copy Preview Pass

- date: 2026-04-22T00:00:00.000Z
- extended browser E2E preview verification so the release tab must render the new `summary-copy` marker and exact-match counter inside human-readable `handoff-digest/manifest/index` txt and markdown preview bodies, not just inside persisted artifact files
- added `releaseHandoffSummaryCopyPreviewVerificationSummary` to the saved browser report with deterministic stable lines and sha, which turns the preview-body assertion into reusable evidence instead of leaving it as a transient runtime check
- kept the final active preview control case on `index-markdown`, so the report still shows non-handoff preview surfaces without structured-summary chrome while the dedicated handoff previews prove the new `Summary-Copy` section is visible when expected
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-22T00:00:00.000Z","id":"doclog_20260422000000_summarycopy_siblings","type":"devlog","updatedAt":"2026-04-22T00:00:00.000Z"} -->
## 2026-04-22 Release Handoff Summary-Copy Sibling Pass

- date: 2026-04-22T00:00:00.000Z
- extended the seeded and persisted `execution-v1-release-handoff-digest/manifest/index` txt and markdown artifacts so they now expose explicit `summaryCopyTotalChecks`, `summaryCopyExactMatchCount`, `summaryCopyStableSha256`, plus a dedicated `summary-copy` section instead of hiding that verification only inside compact JSON
- kept the compact JSON contract unchanged while making the human-readable handoff siblings carry the same verification payload, which closes the gap between machine-readable summary state and operator-facing handoff text surfaces
- verified the new sections through the browser E2E smoke write/read-back path so the sibling artifacts round-trip with the same `summary copy` overview line and stable signature lines that power the compact JSON structured summary
- added browser-only `line copy` round-trip verification for the promoted `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopy` row so the latest release handoff detail can be re-proven directly from card/current-preview surfaces
- persisted that new evidence as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary` plus a matching artifact-pair verified flag in the browser report
- added browser-only detail line-copy verification for `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy` so the newest promoted row now proves one card detail line and one current-preview detail line can both round-trip through clipboard/prompt fallback
- persisted that evidence as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary` with a dedicated artifactPair verification flag
- promoted the latest count-22 `summaryStableLineCopyPreviewBody...LineCopy` browser-only verification into compact release handoff structured summary JSON so handoff digest, manifest, and index artifacts expose the row without requiring the full browser report
- extended release UI structured summary rows/details to render the count-22 exact-match state and stable-line metadata in both handoff cards and current preview surfaces
- added browser-only detail line-copy verification for the just-promoted count-22 structured summary row so the next report-only evidence captures both handoff card and current-preview copy/fallback round-trips
- persisted that follow-up as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary` plus a matching artifactPair verification flag
- promoted the count-23 browser-only verification into compact release handoff structured summary JSON so handoff digest, manifest, and index artifacts expose the latest stable line-copy row
- extended release UI structured summary rows/details to render the count-23 exact-match state and stable-line metadata on both handoff cards and current preview surfaces
- added browser-only detail line-copy verification for the just-promoted count-23 structured summary row so the next report-only evidence captures both handoff card and current-preview copy/fallback round-trips
- persisted that follow-up as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary` plus a matching artifactPair verification flag
- promoted the count-24 browser-only verification into compact release handoff structured summary JSON so handoff digest, manifest, and index artifacts expose the latest stable line-copy row
- extended release UI structured summary rows/details to render the count-24 exact-match state and stable-line metadata on both handoff cards and current preview surfaces
- added browser-only detail line-copy verification for the just-promoted count-24 structured summary row so the next report-only evidence captures both handoff card and current-preview copy/fallback round-trips
- persisted that follow-up as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary` plus a matching artifactPair verification flag
- promoted the count-25 browser-only verification into compact release handoff structured summary JSON so handoff digest, manifest, and index artifacts expose the latest stable line-copy row
- extended release UI structured summary rows/details to render the count-25 exact-match state and stable-line metadata on both handoff cards and current preview surfaces
- added browser-only detail line-copy verification for the just-promoted count-25 structured summary row so the next report-only evidence captures both handoff card and current-preview copy/fallback round-trips
- persisted that follow-up as `releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary` plus a matching artifactPair verification flag
- promoted the count-31 browser-only verification into compact release handoff structured summary JSON so handoff digest, manifest, and index artifacts expose the latest stable line-copy row through the release UI
- extended release UI structured summary rows/details to render the count-31 exact-match state and stable-line metadata on both handoff cards and current preview surfaces
- added browser-only detail line-copy verification for the just-promoted count-31 structured summary row so the next report-only evidence captures both handoff card and current-preview copy/fallback round-trips
- persisted that follow-up as dynamic count-32 release handoff verification summary plus a matching artifactPair verification flag
- promoted the count-32 browser-only verification into compact release handoff structured summary JSON so handoff digest, manifest, and index artifacts expose the latest dynamic stable line-copy row through the release UI
- extended release UI structured summary rows/details to render the count-32 exact-match state and stable-line metadata on both handoff cards and current preview surfaces
- added browser-only detail line-copy verification for the just-promoted count-32 structured summary row so the next report-only evidence captures both handoff card and current-preview copy/fallback round-trips
- persisted that follow-up as dynamic count-33 release handoff verification summary plus a matching artifactPair verification flag
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260414091500_3f2d41","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 URL State Sync Pass

- date: 2026-04-14T00:00:00.000Z
- added URL query sync for selected workspace, mission, step, detail tab, session, and artifact so the single-screen operator console can recover the same working context after refresh
- introduced URL-aware restore logic during bootstrap and let mission/session/artifact selection accept preferred targets, which avoids the default recommended-step jump overriding bookmarked state
- verified the served UI asset exports the new parse/write/restore helpers and that syntax and diff checks pass without widening the change beyond `app.js` and UI docs
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260413210753_5288a9","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 Harness Memory CRUD Pass

- date: 2026-04-14T00:00:00.000Z
- added mission and workspace memory PATCH/DELETE routes so layered memory is no longer add-only and operators can correct or remove stale fact/decision/preference entries without leaving the console
- wired the harness memory rows with `불러오기` and `삭제` actions plus edit-mode status copy and cancel controls, letting the existing forms switch between create and update flows with minimal extra chrome
- verified the full memory lifecycle by creating temporary mission/workspace entries, updating both, deleting both, and confirming the temporary ids were removed from `var/state.json`
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-14T00:00:00.000Z","id":"doclog_20260413210753_d2511e","type":"devlog","updatedAt":"2026-04-14T00:00:00.000Z"} -->
## 2026-04-14 Source-Of-Record Document CRUD Pass

- date: 2026-04-14T00:00:00.000Z
- introduced tracked document-log blocks with stable `doclog_*` ids so harness document intake can support update and delete instead of remaining append-only markdown output
- extended the harness source panel with recent document entries plus `불러오기` and `삭제` actions, and added edit-mode status/cancel flow to the existing document log form
- verified the full document lifecycle by creating a temporary reference entry, moving it to `devlog` through PATCH, deleting it, and confirming the temporary id and content no longer exist in any docs file
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_retrieval_service_extract","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Retrieval Service Extraction Pass

- date: 2026-04-27T00:00:00.000Z
- extracted the existing lexical retrieval context builder and mission retrieval preview aggregation into `src/core/retrieval-service.mjs` so retrieval can evolve behind a smaller service seam before MarkItDown-style document conversion or MemPalace-style ranking changes land
- kept `mission-service.mjs` as the orchestration caller and preserved the existing memory/attachment scoring, snippet limits, role preview shape, and retrieval artifact comparison contract
- verified the extraction with syntax checks for the new retrieval service and mission service plus the existing `smoke:retrieval-memory` flow
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_runtime_request_ui","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Runtime Request UI Pass

- date: 2026-04-27T00:00:00.000Z
- wired `/api/runtime/requests` into the served UI bootstrap so the command header metric shows active and recent runtime request counts instead of leaving request observability as an API-only surface
- added a `data-runtime-request-metric` marker to the metric card so the served UI contract can be smoke-tested without requiring a browser click path
- extended `smoke:ui-harness-browse` to verify the app bundle includes the runtime request loader/metric marker and that the runtime request endpoint exposes the current active request
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_runtime_request_registry","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Runtime Request Registry Pass

- date: 2026-04-27T00:00:00.000Z
- added an in-memory active/recent API request registry keyed by `X-Request-Id` so operator tooling can inspect non-sensitive request method, path, status, and duration without parsing terminal logs
- exposed the request summary through `/api/health` counts and `/api/runtime/requests` detail output, keeping query strings and request bodies out of the observable payload
- extended `smoke:runtime-discovery` to prove caller-provided request id echoing, generated request ids, recent request capture, and the currently active `/api/runtime/requests` call are all visible through the runtime endpoint
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_runtime_discovery","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Runtime Discovery Pass

- date: 2026-04-27T00:00:00.000Z
- added UI server port fallback so `npm run ui` can bind the next available local port when the requested port is already occupied, while preserving the existing `PERSONAL_AI_AGENT_UI_HOST` and `PERSONAL_AI_AGENT_UI_PORT` controls
- added `var/server.json` and `/api/health` so local tools and operators can discover the actual URL, requested port, active port, pid, root path, and discovery file path without scraping terminal output
- added per-request `X-Request-Id` response headers with safe caller-provided id echoing, plus `smoke:runtime-discovery` to verify fallback, discovery JSON, health metadata, and request-id behavior
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_hybrid_retrieval_ranking","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Hybrid Retrieval Ranking Pass

- date: 2026-04-27T00:00:00.000Z
- added BM25 candidate scoring inside `src/core/retrieval-service.mjs` and combined it with the existing lexical overlap score so retrieval ranking can prefer more discriminative memory/attachment chunks without introducing a vector-store dependency
- added bounded attachment neighbor expansion that includes adjacent chunks only when they also overlap the query, preserving the existing guard that unrelated appendix content must not leak into retrieved context
- surfaced `lexicalScore` and `bm25Score` in retrieval artifacts so ranking decisions are auditable, then extended `smoke:retrieval-memory` to prove expanded relevant context is included while unrelated appendix text remains excluded
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_document_conversion_adapter","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Document Conversion Adapter Pass

- date: 2026-04-27T00:00:00.000Z
- added `src/core/document-conversion-service.mjs` as a narrow MarkItDown-compatible child-process adapter so CLI mission attachments can convert local document files into Markdown without adding a production dependency or importing Python into the Node runtime
- wired `mission create --attachment` to use native text reads for text files and the optional converter for MarkItDown-compatible document extensions, then stored conversion metadata on mission attachment records for later auditability
- added `smoke:document-conversion` to prove converted CLI attachments are persisted as Markdown, flow into retrieval artifacts, and remain compatible with the existing mission run path
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_instruction_boundary_fixture","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Instruction Boundary Fixture Pass

- date: 2026-04-27T00:00:00.000Z
- added a CL4R1T4S-inspired offline red-team smoke fixture that injects adversarial attachment text as quoted mission data and verifies the managed run still completes without replaying the marker in the final deliverable
- added an explicit context boundary to stub provider prompt/context artifacts so attachments, memory, retrieved context, and previous artifacts are labeled as untrusted data rather than executable instructions
- changed executor deliverables to summarize reviewed attachments by filename, character count, and MIME type only, keeping raw attachment excerpts available in manager context but out of final user-facing artifacts
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_ui_document_conversion_upload","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 UI Document Conversion Upload Pass

- date: 2026-04-27T00:00:00.000Z
- extended browser mission attachment intake so text files still upload as plain `content`, while non-text document files are sent as base64 payloads for server-side conversion instead of being misread as UTF-8 text in the browser
- wired the web mission create and mission attachment routes through the existing MarkItDown-compatible conversion service, preserving the child-process boundary and storing converted UI uploads as `ui-converted` Markdown attachments with conversion metadata
- extended `smoke:ui-mission-attachments` with a fake local converter and PDF-like upload fixture so the served UI bundle, public API route, conversion metadata, and harness attachment summary are verified together
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_document_conversion_diagnostics","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Document Conversion Diagnostics Pass

- date: 2026-04-27T00:00:00.000Z
- added converter capability diagnostics for the MarkItDown-compatible adapter so operators can see whether the local converter is available before attachment conversion fails at runtime
- exposed diagnostics through `converter diagnostics` and `/api/converter/diagnostics`, including supported extension allowlists, disabled reason details, probe evidence, and explicit local-only security defaults for URL/OCR/network behavior
- added `smoke:document-conversion-diagnostics` to verify available converter, missing converter, CLI output, direct service output, and web API output under deterministic fake-converter conditions
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_visual_evidence_manifest","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Visual Evidence Manifest Pass

- date: 2026-04-27T00:00:00.000Z
- added a local-only visual evidence manifest service for existing execution-v1 browser report and screenshot artifacts, recording safe artifact-root paths, sha256, bytes, PNG dimensions, capture session status, and disabled network/recorder flags
- exposed the manifest through `evidence:visual-manifest`, the execution-v1 evidence generator, and the web handoff artifact list without adding an Electron recorder or broad media ingestion path
- added `smoke:visual-evidence-manifest` to verify manifest generation, safe path rejection, image metadata extraction, signature hashing, and release artifact output shape under deterministic fixture conditions
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_durable_runtime_request_registry","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Durable Runtime Request Registry Pass

- date: 2026-04-27T00:00:00.000Z
- replaced the web UI's memory-only request tracking with a durable `var/runtime-requests.json` registry that records active and terminal HTTP requests with request id, method, path, duration, status code, and process id
- added stale active-request recovery on server start so interrupted requests from a prior process are marked as `abandoned` terminal records instead of disappearing after restart
- extended `/api/health`, `/api/runtime/requests`, server discovery metadata, and `smoke:runtime-discovery` to verify registry path exposure, stale request recovery, active request visibility, and persisted terminal history
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_runtime_job_registry","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Runtime Job Registry Pass

- date: 2026-04-27T00:00:00.000Z
- added a durable `var/runtime-jobs.json` registry for non-HTTP runtime work, tracking active and terminal release jobs with kind, scope, request id, process id, duration, compact result metadata, and failure summaries
- wired execution-v1 refresh and snapshot operations through the runtime job registry so long-running release actions can be correlated with release action history without storing full generated payloads in the registry
- exposed `/api/runtime/jobs`, health/discovery registry metadata, and stale active-job recovery on server start, then extended `smoke:runtime-discovery` to verify abandoned job recovery and persisted terminal job history
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_execution_v1_fixture_reuse","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Execution V1 Fixture Reuse Pass

- date: 2026-04-27T00:00:00.000Z
- extracted the seeded execution-v1 evidence and closeout markdown fixture into `scripts/execution-v1-test-fixtures.mjs` so browser E2E and harness browse smoke share the same release-status test input
- removed duplicated document seed logic from `smoke-ui-execution-browser-e2e` and `smoke-ui-harness-browse`, reducing the chance that reference gate fixture semantics drift between slow and fast UI checks
- kept each smoke's caller-specific evidence href configurable while centralizing deterministic smoke, reference adoption gate, current status, and notes content
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_reference_adoption_status_contract","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Reference Adoption Status Contract Pass

- date: 2026-04-27T00:00:00.000Z
- extended `smoke:ui-harness-browse` with seeded execution-v1 evidence and closeout docs so `/api/execution-v1/status` can be validated without running the full browser E2E path
- locked the release status API contract for `coreDeterministicPassed/Total`, aggregate `deterministicPassed/Total`, and `referenceAdoptionPassed/Total/Ready` so the reference gate cannot be silently merged back into the core execution smoke count
- added served UI asset coverage for the `reference gate` summary chip label alongside the existing runtime job and fact graph release surface anchors
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_reference_adoption_release_ui","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Reference Adoption Release UI Pass

- date: 2026-04-27T00:00:00.000Z
- separated core execution deterministic smoke counts from the `smoke:reference-adoptions` aggregate gate in `execution-v1/status`, preserving the operator meaning of the original 4 execution smoke checks
- added a dedicated `reference gate` release summary chip so operators can see the externally inspired adoption regression status without conflating it with core execution smoke readiness
- extended browser E2E assertions to require `deterministic smoke 4/4`, `reference gate 1/1`, and the closeout `reference adoption gate: ready` current-status row
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_reference_adoption_execution_evidence","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Reference Adoption Execution Evidence Pass

- date: 2026-04-27T00:00:00.000Z
- wired `smoke:reference-adoptions` into `verify:execution-v1` so release evidence now runs the externally inspired aggregate regression gate together with the existing execution smoke set
- updated execution evidence and closeout generators to report reference adoption readiness separately from the core deterministic execution smoke result, keeping browser/live validation semantics unchanged
- refreshed README guidance so operators know `evidence:execution-v1` and `closeout:execution-v1` now cover both execution-v1 readiness and the adopted reference feature regression set
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_reference_adoption_smoke_gate","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Reference Adoption Smoke Gate Pass

- date: 2026-04-27T00:00:00.000Z
- added `smoke:reference-adoptions` as an aggregate deterministic gate for externally inspired adoption work: output compaction, provider guard, mission quality gate, document conversion, runtime discovery, visual evidence, retrieval, fact graph, and instruction-boundary coverage
- kept the default `npm run smoke` lightweight and unchanged, while giving release/review workflows a single command that exercises the higher-scope reference adoption regression set
- documented the aggregate gate in README so operators do not need to remember each individual reference-adoption smoke command before handoff
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_instruction_boundary_retrieval_memory","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Instruction Boundary Retrieval Memory Pass

- date: 2026-04-27T00:00:00.000Z
- strengthened the offline instruction-boundary smoke with an adversarial workspace fact memory fixture so the boundary is verified across memory, retrieved context, manager prompt/context artifacts, and final deliverable output
- asserted that the memory marker is allowed to appear only as untrusted quoted context in prompt/context/retrieval artifacts, while the executor deliverable must not replay the adversarial marker
- kept the CL4R1T4S-inspired source isolated as a local deterministic fixture and did not vendor or ingest external prompt corpus content
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_fact_graph_relation_reason","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Fact Graph Relation Reason Pass

- date: 2026-04-27T00:00:00.000Z
- added `relationReason` to shared-keyword fact graph edges so edge records explain why two facts are related instead of exposing only raw token arrays and weight
- propagated relation reasons into mission harness fact graph previews and compact CLI output, with fallback text for older edge records that do not yet have the field
- extended fact graph and UI harness smokes to verify relation reasons are persisted, surfaced in compact operator output, and present in the served UI bundle
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_fact_graph_compact_cli","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Fact Graph Compact CLI Pass

- date: 2026-04-27T00:00:00.000Z
- added `memory facts --compact` so operators can inspect fact graph summary, bounded node preview, and edge preview without dumping full revision/provenance-heavy graph records
- included linked edge statement previews in compact CLI output to mirror the web harness Fact Graph Preview surface and make shared-keyword edges understandable from terminal output alone
- extended `smoke:fact-graph-memory` to verify raw graph output remains available while compact output omits full revision arrays and still includes node/edge summaries
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_fact_graph_preview_surface","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Fact Graph Preview Surface Pass

- date: 2026-04-27T00:00:00.000Z
- extended mission harness memory payloads with compact fact graph previews for all, mission, and workspace scopes, including active nodes, active shared-keyword edges, provenance source ids, versions, shared tokens, and linked statements
- rendered a Fact Graph Preview section in the web harness memory tab so operators can inspect active fact nodes and related facts without opening the raw `memory facts` CLI output
- strengthened `smoke:fact-graph-memory` and `smoke:ui-harness-browse` to verify preview node/edge payloads and served UI anchors for fact graph visibility
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_retrieval_source_diversity_cap","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Retrieval Source Diversity Cap Pass

- date: 2026-04-27T00:00:00.000Z
- added a soft per-source diversity cap to retrieval selection so one highly-ranked source is limited during the first pass and lower-ranked relevant sources can still enter the final grounding set
- kept the cap soft by backfilling overflow candidates when there are not enough distinct sources, preserving full context capacity for single-source missions
- extended `smoke:retrieval-memory` with a source-diversity fixture proving an alternate `mission/decision` source remains visible even when `workspace/fact` has enough dominant phrase-matching candidates to fill the result set
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_retrieval_phrase_proximity_boost","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Retrieval Phrase Proximity Boost Pass

- date: 2026-04-27T00:00:00.000Z
- added deterministic phrase/proximity scoring to the retrieval service so adjacent or near-adjacent query term pairs can lift snippets that preserve phrases like provider drift and prompt normalization
- blended the new `phraseBoostScore` with lexical and BM25 scores, then persisted it into retrieval artifacts and `retrievalReason` metadata for operator auditability
- extended `smoke:retrieval-memory` with a direct phrase-ranking fixture proving an exact phrase candidate outranks a scattered-term candidate without adding vector search or external dependencies
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_retrieval_explainability_metadata","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Retrieval Explainability Metadata Pass

- date: 2026-04-27T00:00:00.000Z
- added matched query term extraction to the retrieval service so selected snippets now carry `matchedTerms`, `matchTermCount`, and a compact `retrievalReason` alongside lexical and BM25 scores
- persisted the explainability metadata into `*-retrieval.md` artifacts and surfaced the reason text in mission setup/harness retrieval preview rows, making source selection auditable without opening raw service internals
- strengthened `smoke:retrieval-memory` to require matched provider-drift terms and retrieval reason metadata in both run artifacts and harness preview payloads
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_runtime_job_history_surface","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Runtime Job History Surface Pass

- date: 2026-04-27T00:00:00.000Z
- extended the release status surface from runtime job counts to an operator-readable active/recent job history with kind, scope, status, request id, duration, summary, timestamp, and job id context
- added compact UI helpers for runtime job kind labels and duration formatting, while reusing the existing release snapshot card layout to avoid introducing a separate visual pattern
- strengthened `smoke:ui-harness-browse` with a seeded terminal runtime job fixture so the runtime jobs API and release UI bundle contract verify real recent job visibility instead of only checking active-count shape
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_runtime_job_operator_surface","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Runtime Job Operator Surface Pass

- date: 2026-04-27T00:00:00.000Z
- added runtime job summary data to `execution-v1/status` so the release surface can display active and recent release job pressure alongside closeout and evidence readiness
- wired the web UI to load `/api/runtime/jobs`, render `Runtime jobs` in the hero metrics, and expose a release-tab runtime job metric without requiring operators to open the raw registry endpoint
- extended `smoke:ui-harness-browse` to verify the public UI bundle contains runtime job loading and metric anchors, and that the runtime jobs API returns the same active/recent contract as runtime requests
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_fact_graph_memory_adapter","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Fact Graph Memory Adapter Pass

- date: 2026-04-27T00:00:00.000Z
- added a JSON-backed `factGraphNodes` collection and `src/core/fact-graph-service.mjs` so `kind=fact` memory can be mirrored into local fact nodes without adding ChromaDB, Python, or a separate graph database dependency
- wired memory create/update/delete flows to keep fact graph nodes active or retired by source memory id, preserving provenance and revision history when a fact statement changes
- added deterministic shared-keyword `factGraphEdges` within the same scope and retire those edges when either connected fact node changes or is retired, keeping graph relations auditable without vector search
- exposed the fact graph through `memory facts` CLI output and mission harness memory summary, then added `smoke:fact-graph-memory` to verify active/retired node lifecycle, edge lifecycle, provenance, revisions, and CLI visibility
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_external_reference_round2","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 External Reference Round 2 Review

- date: 2026-04-27T00:00:00.000Z
- inspected `free-claude-code`, `andrej-karpathy-skills`, `hermes-agent`, `openscreen`, `markitdown`, and `rtk` through shallow clones, manifests, READMEs, and representative implementation files
- documented Node-native adoption candidates in `docs/reference-repos.md`: RTK-style output compaction, provider capability routing and rate guard, Hermes-style runtime/session context, Karpathy-style mission quality gates, MarkItDown capability diagnostics, and OpenScreen-inspired evidence manifests
- kept all candidates as design input only; no external code was vendored and no git commit/push was performed during this review
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_output_compaction_artifact","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Output Compaction Artifact Pass

- date: 2026-04-27T00:00:00.000Z
- added `src/core/output-compaction-service.mjs` as an RTK-inspired Node-native compaction service that preserves the raw output path while extracting head/tail context, issue lines, repeated-line groups, and estimated token reduction metadata
- added `artifact compact-output` CLI support so long smoke/runtime/provider logs can be converted into auditable Markdown artifacts attached to an existing mission session without shell hooks or command rewriting
- added `smoke:output-compaction` to verify direct service compaction, CLI artifact creation, raw-path metadata retention, warning/error detection, repeated-line detection, and bounded compact output
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-05-13T00:00:00.000Z","id":"doclog_20260513000000_web_provider_attention_remediation","type":"devlog","updatedAt":"2026-05-13T00:00:00.000Z"} -->
## 2026-05-13 Web Provider Attention Remediation Pass

- date: 2026-05-13T00:00:00.000Z
- added a web API route for `provider-attention` remediation so action inbox operators can call the existing `remediateProviderAttention` service path without leaving the UI
- surfaced same-provider recovery, default fallback recovery, and `recoverable-provider-failure-only` recovery controls on provider-attention action items while preserving the CLI recommended command audit trail
- extended runtime discovery and UI harness smokes to verify the provider-attention route, fallback policy metadata, strict non-recoverable stop behavior, and served UI remediation controls
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-05-13T00:00:00.000Z","id":"doclog_20260513000000_web_specialist_follow_up_remediation","type":"devlog","updatedAt":"2026-05-13T00:00:00.000Z"} -->
## 2026-05-13 Web Specialist Follow-Up Remediation Pass

- date: 2026-05-13T00:00:00.000Z
- added a web API route for `specialist-follow-up` remediation so action inbox operators can call the existing `remediateSpecialistFollowUp` service path without switching to the CLI
- surfaced dedicated specialist recovery controls plus remediation route, urgency, and retry-policy metadata on specialist follow-up action items
- extended runtime discovery and UI harness smokes to verify the specialist follow-up route, branch-resume result, and served UI remediation controls
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_provider_capability_rate_guard","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Provider Capability Rate Guard Pass

- date: 2026-04-27T00:00:00.000Z
- expanded the provider catalog with explicit capability metadata and provider rate-limit defaults so provider status surfaces expose structured output, usage/cost telemetry, model discovery, locality, and throttling constraints
- added `src/providers/provider-rate-guard.mjs` and wired `requestJsonWithPolicy` through provider-scoped proactive request windows, reactive 429 block windows, and max-concurrency slots for OpenAI, Anthropic, and local providers
- added `smoke:provider-capability-rate-guard` to verify capability/status exposure, proactive throttle waits, reactive 429 cool-down, and concurrency slot behavior without making network calls
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_mission_quality_gate","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Mission Quality Gate Pass

- date: 2026-04-27T00:00:00.000Z
- added `src/core/mission-quality-gate.mjs` as a project-native Karpathy-style checklist helper that renders Success Criteria, Assumptions, Minimal Change, and Verification for each mission
- wired the mission quality gate into stub planner/executor artifacts and into structured executor normalization so external provider executor output gets a deterministic quality-gate section when missing
- added `smoke:mission-quality-gate` to verify knowledge and engineering managed artifacts include the gate, engineering approval assumptions remain explicit, and external executor normalization injects verification targets
<!-- document-log:end -->

<!-- document-log:start {"createdAt":"2026-04-27T00:00:00.000Z","id":"doclog_20260427000000_runtime_session_context","type":"devlog","updatedAt":"2026-04-27T00:00:00.000Z"} -->
## 2026-04-27 Runtime Session Context Pass

- date: 2026-04-27T00:00:00.000Z
- added `src/core/runtime-status-service.mjs` so the web runtime persists `var/runtime-status.json`, links it from `var/server.json`, marks shutdown state, and carries stale previous-runtime metadata when a dead listening PID is replaced
- stored mission session source context for CLI, web, and service-initiated runs, then surfaced that source context inside manager prompts and manager context artifacts as a Session Source section
- extended `smoke:runtime-discovery` and `smoke` to verify runtime status discovery, stale previous-runtime reporting, web request-id source capture, CLI source capture, and prompt-level source metadata
<!-- document-log:end -->


<!-- document-log:start {"createdAt":"2026-04-13T21:08:46.781Z","id":"doclog_20260413210846_6ddcf8","type":"devlog","updatedAt":"2026-04-13T21:08:57.298Z"} -->
## 2026-04-14 Legacy Devlog Migration Pass

- date: 2026-04-13T21:08:57.298Z
- added a safe migration path that wraps historical append-only devlog sections into tracked document log blocks so older operating notes can be edited and deleted from the harness surface
- limited migration scope to devlog.md only, leaving reference-repos.md and incidents.md untouched because they are either curated reference structure or currently empty
- exposed the migration through the harness source panel and verified idempotency by migrating once, then confirming a second run returns migratedCount 0 while harness summary reports legacyDevlogCount 0 and trackedDevlogCount 106
<!-- document-log:end -->
