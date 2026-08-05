# Development Roadmap

## 1. 현재 상태 요약

- 현재 구현 완료: Node.js ESM CLI/web runtime, local JSON store, workspace/mission/session/artifact/approval model, provider registry/adapters, D4 service refactoring, local RAG fixture/shadow contracts, Council C1–C13 contracts and observations, v1.1a/v1.1b read-only schedule projections, v1.1c deterministic structural envelope shadow, v1.1d retry lineage shadow, v1.1e retry terminality shadow, smoke scripts, GitHub Actions provider smoke
- 현재 closeout: `local-v1-complete-external-evidence-open`. Repository-local no-cost v1은 [local-v1-completion-closeout-v1.md](local-v1-completion-closeout-v1.md)의 builder-owned pre-closeout receipt와 post-artifact final gates로 닫으며, self-referential verification은 주장하지 않는다. C13은 `actual-incompatible`, `keep-stub-only`다. F1.3 request protocol은 완료됐고 실제 owner decision, private-data evaluation과 training authority는 보류한다.
- maintenance closure: published GitHub v0.1.0 asset identity는 검증 시점의 fixed observation record로 보존하고, repository-local Portfolio ZIP candidate와 size/SHA-256 metadata를 분리한다. 이 offline regression은 release upload, download, or deletion authority를 만들지 않는다.
- 외부 증거 필요: Anthropic billing/credit과 live validation, Hermes target architecture/live validation, target local provider architecture, accessible walkthrough URL, actual pilot feedback/metrics, hosted SaaS or production deployment
- 미구현 또는 미검증: hosted production SaaS, full production multi-tenant isolation, production-ready all-provider deployment, public demo link

## 2. Phase 1 - MVP 완성

- 목표: portfolio에서 설명 가능한 local-first AI agent MVP를 안정화한다.
- 현재 대표 demo: `Release Readiness Evidence Walkthrough`를 기본 portfolio/pilot walkthrough로 사용한다.
- 해야 할 작업:
  - 대표 demo scenario 1개를 선정하고 deterministic release evidence flow로 재현
  - README를 portfolio-friendly 구조로 재작성할 초안 반영
  - `npm run smoke`, provider smoke 중 핵심 3~5개를 최신 상태로 통과 확인
  - web console screenshot과 CLI output 예시 확보
- 완료 기준:
  - clean repo에서 실행 방법이 10분 내 재현 가능
  - 구현 완료/개발 중/미구현 상태가 README와 docs에서 일관됨
  - OpenAI-backed local-first pilot 외 claim이 과장되지 않음
- 산출물:
  - updated README
  - demo screenshot
  - smoke result summary
  - portfolio case study

## 3. Phase 2 - 기능 고도화

- 목표: provider reliability와 operator workflow를 더 명확히 검증한다.
- 해야 할 작업:
  - Anthropic account/billing blocker 해결 후 live validation 재실행
  - Hermes provider target evidence와 live validation proof 확보
  - provider fallback/attention remediation demo scenario 정리
  - memory/retrieval/fact graph 품질 확인용 fixture 추가
  - 완료: tenant-free local workspace 사이에서 explicit mission-to-user authorization, user decision·preference 적용, exact rollback을 검증하고 hosted·multi-user 범위는 차단
  - 완료: retrieval-selected local-user decision 충돌을 latest-revision 하나로 제한하고 cross-workspace 적용, newer revocation fallback, full rollback을 실제 replay로 검증
  - 완료: 검증된 local-user decision을 bounded operator override로 고정하고 cross-workspace 적용, expiry·clear latest fallback, repin parity와 unretrieved 차단을 검증
  - 완료: 이미 설치된 qwen2.5:3b로 Q1 두 case의 실제 답변을 생성해 citation gate 통과와 required-term coverage 0.6667 실패를 함께 고정하고 기존 답변 경로를 유지
  - 완료: 같은 qwen2.5:3b와 retrieval로 evidence-first composition candidate를 실행해 Q1 case pass 0.0→1.0과 required-term coverage 0.6667→1.0을 기록하고 runtime 활성화는 차단
  - 완료: Q3 regression·한국어·다중 도메인·bounded context·prompt injection 10-case로 composition을 확장하고 v2 9/10·canary 1 실패를 보존
  - 완료: deterministic instruction boundary를 적용한 v3에서 10/10·canary 0과 다른 품질 지표 회귀 0을 기록하고 runtime 활성화는 차단
  - 완료: Q9 required-claim SHA-256 assertion policy가 five evidence states와 fixed answer/request/abstain action을 deterministic하게 판정하고, qwen2.5:3b loopback shadow의 4/5 정책 일치와 sufficient case `unnecessary-abstention` 1건을 기본 답변 경로 밖의 비권위 실패 관찰로 보존
  - 완료: Q10 evidence-gated answer shadow가 Q9 action을 authoritative gate로 사용해 non-sufficient 4건을 model 호출 전에 차단하고 sufficient 1건만 Q7 v5로 조합한 뒤 Q1 frozen quality gate를 통과; Q9 4/5 실패 이력과 default answer path는 그대로 유지
  - 완료: Q11 multi-scenario robustness fixture가 4개 언어·4개 domain의 12개 synthetic structural row에서 Q9 action을 그대로 사용하고 sufficient 4건만 Q10 coordinator로 조합; deterministic과 installed loopback qwen2.5:3b 모두 sufficient 4/4 frozen quality gate를 통과했지만 multilingual semantic truth나 runtime activation 증적은 아님
  - 완료: Q13 claim-source attribution shadow가 Q10 quality-pass 뒤에만 Q7 v5 flattened source claim의 term ownership을 lexical로 검사; non-sufficient 8건은 모든 lazy contract getter를 읽지 않고, deterministic과 loopback qwen2.5:3b sufficient 4/4 pass는 semantic attribution·independent review·activation 증적이 아님
- 완료 기준:
  - provider별 status matrix가 코드, docs, smoke evidence와 일치
  - 실패/재시도/fallback을 면접에서 코드 수준으로 설명 가능
- 산출물:
  - provider readiness matrix
  - updated release readiness
  - provider failure recovery demo

## 4. Phase 3 - 서비스화 / 배포

- 목표: self-hosted pilot로 배포 가능한 수준의 operational package를 만든다.
- 해야 할 작업:
  - target secret injection, clean deployment, rollback/recovery 절차 검증
  - web auth/RBAC/OIDC/tenant mode 운영 가이드 정리
  - pilot export package와 deployment pilot docs를 실제 재현 흐름으로 다듬기
  - public 또는 private demo 환경 선택
- 완료 기준:
  - 배포/실행/검증/rollback 절차가 문서와 command로 재현됨
  - production-ready claim 없이 self-hosted pilot-ready claim만 사용
- 산출물:
  - self-hosted pilot package
  - deployment guide
  - operator runbook update
  - demo URL 또는 recorded walkthrough

## 5. Phase 4 - 포트폴리오 완성

- 목표: 이력서, GitHub README, case study, 면접 답변에서 일관되게 설명 가능한 프로젝트로 정리한다.
- 해야 할 작업:
  - README 개선안 반영
  - architecture diagram과 주요 코드 walkthrough 작성
  - resume bullet을 직접 기여 범위에 맞게 수정
  - “위험 표현” 목록을 README와 면접 답변에서 제거
- 완료 기준:
  - 면접에서 `mission-service`, provider registry, web API, store, smoke evidence를 설명 가능
  - 구현 완료와 roadmap 표현이 분리됨
  - demo screenshot 또는 실행 로그가 준비됨
- 산출물:
  - portfolio README
  - project card
  - case study
  - interview story
  - screenshots/demo notes

## 6. 보류·외부 증거 Backlog

| 상태 | 항목 | 경계 | 필요한 산출물 |
|---|---|---|---|
| 보류 | F1.3 request의 owner/private-data 승인 판단 | deterministic protocol은 완료됐지만 actual private-data authority는 보류 | owner-only private decision 또는 explicit deferral |
| 외부 증거 필요 | Anthropic/Hermes/target local provider 증거 | provider adapter와 live readiness claim을 구분 | target-boundary provider evidence |
| 외부 증거 필요 | Walkthrough URL와 pilot feedback 증거 | local replay와 외부 사용성·효과 claim을 구분 | accessible URL, sanitized feedback evidence |
| 외부 증거 필요 | Hosted deployment evidence | local pilot preparation과 hosted production claim을 구분 | deployment, identity, tenant, rollback, observability evidence |

## 7. 대표 demo 보조 증거 현황

- 완료: release readiness screenshot, replay log, browser E2E report, representative demo summary
- 완료: operator surface demo evidence 문서로 mission/provider/action support evidence를 CLI/API/evidence manifest에 연결
- 완료: mission creation/run browser screenshot, provider readiness browser screenshot, action inbox browser screenshot
- 완료: recorded walkthrough script와 no-hosted-demo smoke guard
- 완료: architecture code walkthrough와 symbol smoke guard
- 완료: provider readiness matrix와 catalog smoke guard
- 완료: provider failure recovery demo와 smoke guard
- 완료: memory/retrieval/fact graph quality fixture와 smoke guard
- 완료: actual qwen2.5:3b Q1 answer-quality baseline에서 두 case의 required-term coverage 회귀를 기록하고 threshold 완화 없이 `keep-current-answer-path` 결정
- 완료: evaluator 정답을 model에 주지 않고 summary·source claim·review action을 분리한 Q3 candidate가 같은 Q1 두 case를 통과했으며 일반 품질·runtime activation은 계속 미검증
- 완료: Q4 v2 robustness baseline에서 한국어·다중 도메인·bounded context·Q3 regression은 통과하고 objective injection canary 한 건을 실패로 고정
- 완료: model 입력 전 instruction payload를 제거하고 raw·sanitized hash와 removal count를 남기는 Q4 v3 hardening이 동일 10-case에서 10/10을 통과했으며 일반 품질·runtime activation은 계속 미검증
- 완료: Unicode·format control·split-letter와 영어·한국어·일본어·스페인어를 분리한 Q5 pure input boundary가 14/14를 통과
- 완료: 같은 qwen2.5:3b와 Q4 suite의 v4 회귀에서 `2.2` safe-text 실패를 기준 완화 없이 교정하고 최종 10/10과 기존 지표 parity를 확인
- 완료: consent·철회·de-identification·retention을 강제하는 synthetic user-query intake dry run 12건·6 domain·4 language 검증
- 완료: Q5 intake를 같은 qwen2.5:3b·v4 prompt·loopback runtime과 결합한 Q6 content-free runner가 12건을 끝까지 실행하고 11/12와 `invalid-review-action` 1건을 stop condition으로 기록
- 완료: v5 reviewer action candidate가 summary-only objective의 owner·trigger를 evidence-bound action으로 유지하며 Q4 10/10 parity와 synthetic Q6 12/12를 기준 완화 없이 통과
- 완료: Q8 actual-user evaluation protocol이 private dataset 경로, owner-only·no-follow·atomic I/O, frozen all-pass threshold, tracked-path 거부, Q7 v5 binding, case별 consent 재검증과 중간 철회 fail-closed를 test fixture로 검증
- 완료: Q9 evidence sufficiency fixture가 sufficient·partial·conflicting·irrelevant·no-evidence를 threshold 없이 판정하고 content-free artifact tamper rejection을 검증; tracked local shadow는 4/5에 그쳐 activation을 계속 보류
- 완료: Q10 evidence-gated answer shadow가 five-state route에서 generator call 1회를 강제하고 installed qwen2.5:3b sufficient answer를 content-free로 검증; 이는 opt-in synthetic shadow이며 actual user quality·runtime activation·production readiness 증적이 아님
- 완료: Q11 multi-scenario robustness가 12개 synthetic structural case에서 non-sufficient 8건을 pre-generator 차단하고 sufficient 4건의 loopback qwen2.5:3b answer-quality를 4/4로 기록; Q9/Q10 baseline과 default path는 불변
- 완료: Q12 local artifact writer hardening이 final in-place truncate를 same-parent atomic replace로 교체하고 failure/crash 전후 complete JSON, `0600`, single-link를 focused smoke로 확인; Node v24 `openat`/`renameat` 부재의 마지막 same-user syscall window는 residual로 유지
- 완료: Q13 claim-source attribution shadow가 Q11 12-row lane의 Q10 route/order를 그대로 재사용하고 sufficient 4건만 source-bound lexical term ownership을 4/4로 기록; actual-user quality, independent reviewer, runtime activation과 production readiness는 계속 보류
- 다음: 실제 사용자 dataset과 별도 승인을 받은 뒤 명시적 동의·철회 가능성·비식별 검토·current retention을 통과한 평가를 진행하고, 그 전에는 candidate activation을 보류
- 완료: 별도 scope authorization, sibling 적용, foreign workspace 차단, timeline audit, exact rollback을 포함한 controlled workspace learning personalization 검증
- 완료: retrieval-selected workspace decision 충돌에서 latest revision 하나만 provider에 전달하고 newer revocation 뒤 exact older fallback, full rollback 뒤 exact baseline 복원, foreign workspace exposure 0을 확인한 controlled conflict and revocation 검증
- 완료: verified workspace decision을 local operator가 bounded expiration으로 고정하고 expiry·clear 시 exact latest-revision fallback, repin parity, foreign·unretrieved memory 차단과 timeline audit를 확인한 controlled operator override 검증
- 완료: 기존 action inbox에서 content-free override 상태와 summary를 읽고 RBAC·candidate tenant·service validation을 거쳐 set·clear하며 local HTTP와 실제 Chromium으로 not-set→active→expired→cleared를 확인한 operator surface 검증
- 완료: verified local-user decision을 tenant-free source와 bounded expiration으로 고정하고 두 local workspace에서 older 적용, expiry·clear latest fallback, repin exact parity, unretrieved 차단과 set·clear timeline을 확인한 controlled user override 검증
- 완료: 기존 action inbox에서 content-free user override 상태와 summary를 읽고 RBAC·candidate tenant·service validation을 거쳐 set·clear하며 local HTTP와 실제 Chromium으로 not-set→active→expired→cleared를 확인한 user operator surface 검증
- 완료: R12 multi-scenario shadow replay에서 3 scenario·15 mission·60 role observation을 실제 재생하고 full-query hard-negative 실패를 보존한 뒤 mission-objective query contract로 교정
- 완료: R13 bounded shadow score cache에서 exact query-document repetition을 process-local LRU로 재사용해 15/15 품질을 유지하며 120 request를 30 inference로 축소하고 maximum latency 회귀까지 증적에 보존
- 완료: R14 shadow cache lifecycle stress에서 8-entry eviction 22, concurrent join, in-flight invalidation, stale-result drop, fresh refill와 rollback close를 actual local evidence로 검증
- 완료: R15 shadow cache process isolation에서 concurrent child process 2개와 restarted process 1개의 cold miss·local hit·identity 분리·empty environment forwarding·shutdown close를 actual local evidence로 검증
- 완료: R16 shadow cache termination recovery and bounded soak에서 warm worker SIGKILL 뒤 cold recovery, 16-entry·48-pair soak, 32 eviction, heap/RSS local regression gate와 shutdown close를 actual local evidence로 검증
- 완료: P1 approved learning RAG feedback에서 explicit promotion 전·후·rollback 동일 mission을 재생해 memory provenance, retrieval match 4개, planner step 3→4→3, reviewer pass와 exact baseline artifact 복원을 검증
- 완료: P2 multi-scenario learning feedback quality에서 같은 workspace의 세 mission과 9 session을 재생해 Q1 case pass 0/3→3/3→0/3, 사례별 foreign memory 2개 중 retrieved 0, reviewer pass와 exact rollback artifact 복원을 검증
- 외부 승인 필요: local reranker provider-input activation, production latency·concurrency 한도, long soak·thermal telemetry, license·OS egress isolation, rollback owner
- 완료: credential-free answer quality evaluator와 retrieval·citation·reviewer regression gate
- 완료: store와 공개 retrieval payload를 바꾸지 않고 source hash·revision·scope·provenance를 보존하는 RAG corpus contract
- 완료: 3개 controlled fixture에서 precision·recall·noise·source diversity와 lexical·BM25·phrase frozen baseline을 비교하는 retrieval evaluation gate
- 완료: dependency 없는 provider-neutral embedding contract, bounded local command adapter, scope-locked semantic experiment와 controlled synonym comparison
- 완료: semantic·lexical signal을 고정 가중치로 결합한 deterministic reranking baseline과 controlled quality·latency·rollback 비교
- 완료: 기본 lexical parity를 보존하고 명시적 local command에서만 동작하는 mission semantic·rerank runtime, scope 거부, failure-before-provider와 state-free rollback
- 완료: 설치된 qwen2.5 3종을 동일 retrieval suite로 비교한 local embedding qualification, 3B quality pass와 license·network·resource·rollback governance blocker 분리
- 완료: qwen2.5 3B를 canonical·paraphrase·noisy·cross-language·hard-negative 15-case로 확장 평가하고 lexical보다 낮은 결과를 failed-keep-lexical 기준선으로 고정
- 완료: qwen2.5 3B를 source별 독립 structured relevance scorer로 재평가해 반복 안정적 15-case·hard-negative 통과를 기록하고 governance·runtime activation 차단 유지
- 완료: lexical top-2 shortlist로 동일 15-case·hard-negative 품질을 유지하면서 inference·p50·p95·total 감소와 loaded-model footprint를 기록하고 maximum regression·governance·runtime activation 차단 유지
- 완료: cold 1·warm 3·concurrent client worker 2의 6-run stability 관측에서 동일 품질·resource footprint와 bounded latency gate를 확인하고 production parallelism·long soak·thermal·runtime activation 차단 유지
- 완료: R10-bound scorer를 controlled stub mission의 manager·planner·executor·reviewer retrieval에 shadow로 연결하고 lexical provider input·store·public contract 불변과 scorer-failure fail-open 확인
- 완료: reviewer pass·operator approval·promotion verification·artifact lineage를 요구하는 sanitized training record와 content·lineage hash contract
- 완료: deterministic content·lineage·near-response deduplication, mission-scope train·validation split, leakage 검사와 content-free dataset manifest
- 완료: provider-neutral train·validation JSONL, Q1 answer-quality baseline, content-free evaluation manifest와 reviewer-pending fine-tuning readiness packet
- 완료: exact F1 dataset hash와 별도 local approval을 묶고 current permission·post-acquisition admission을 spawn 전에 재검증하며 shell·secret environment를 차단하는 bounded local training runtime contract
- 완료: fixed repo-local candidate root의 complete inventory와 actual file hash를 admitted training run·current disk envelope에 묶는 local training candidate artifact verification
- 완료: recorded candidate verification과 current permission·explicit no-revocation·F1 suite·resource envelope·bounded time window를 묶는 local candidate evaluation admission
- 완료: current authority와 candidate file hash를 재검증하고 evaluator identity·bounded local stdio·canonical quality summary를 O1a run lineage에 묶는 local candidate evaluation runtime
- 완료: exact F1 suite bytes와 manifest-listed candidate files를 temporary execution view에 고정하고 pre/post hash·cleanup을 run lineage에 묶는 immutable evaluation input view
- 완료: evaluator executable SHA-256과 static ESM module·resource bundle을 request·admission·run에 묶고 temporary snapshot entry를 실행하는 evaluator provenance boundary
- 완료: license·OS egress·resource evidence hash와 owner를 기존 approval inbox·RBAC·tenant·audit에 묶은 local training product permission surface, CLI·HTTP·Chromium 승인·철회 replay
- 완료: same-suite fixture candidate의 품질·증적·권한 비교, regression keep-baseline과 rollout-blocked rollback gate
- 승인 작업: 실제 base model license owner review, OS-level egress isolation, resource limit과 rollback owner 승인을 확보하고 현재 permission을 실행 직전에 다시 확인한 뒤 actual local model training 검토
- 외부 작업: provider·model·budget·data transfer·reviewer·rollback owner 승인 후 별도 fine-tuning submission adapter 검토
- 외부 작업: 실제 trained candidate evidence와 target runtime 결과 확보 후 reviewer 승인 기반 model rollout 검토
- 외부 작업: 선택된 qwen2.5 3B의 license owner 검토, OS-level egress isolation, 승인된 resource·cold-start·concurrency limit, long-duration soak·thermal telemetry, rollback owner와 provider-input activation 승인
- 완료: core smoke validation summary와 command guard
- 완료: aggregate smoke runner의 순서·exactly-once·summary contract를 유지하면서 실패한 command에만 bounded console diagnostics를 제공하는 maintenance hardening
- 완료: external evidence blocker register와 smoke guard
- 현재 claim boundary: provider-scoped local-first pilot support evidence
- 남은 polish: published private/public walkthrough URL, actual pilot feedback and metric evidence

## 8. Council C1–C13 closeout

- 완료: fixed three-seat, two-round deterministic stub council과 read-only board, reviewer parity repair, bounded local retrieval provenance를 검증했다.
- 결정: `knowledge-triad`를 default profile로 유지하고 `knowledge-council-triad`는 opt-in experiment로 유지한다.
- 근거: synthetic critical-conflict routing은 개선됐지만 unsupported claim은 `not-comparable`이고 persisted stage는 26→34이므로 default promotion을 허용하지 않는다.
- C6 관측: installed loopback `qwen2.5:3b`의 opening 3회는 valid하지만 동일했고 rebuttal 3회는 exact target contract를 통과하지 못했으며 synthesis는 실행되지 않았다. 따라서 `keep-stub-only`를 유지한다.
- C7 관측: fixed seat responsibility로 local request prompt와 opening output이 각각 3개로 분리됐지만 research opening이 `invalid-claim`으로 실패했다. rebuttal·synthesis는 dependency-blocked였으므로 exact target qualification은 0/3이고 `keep-stub-only`를 유지한다.
- C8 관측: C7 research failure를 content-free `claim-seat`로 재현했고, literal enum·evidence contract로 opening 3/3과 rebuttal target 3/3을 통과했다. implementation rebuttal의 `missing-field` 때문에 전체 contract는 5/7에 그쳤고 synthesis는 실행하지 않아 `keep-stub-only`를 유지한다.
- C9 관측: phase-specific v3 claim contract로 opening 3/3, rebuttal 3/3, exact target 3/3과 actual chair synthesis 호출까지 진행했지만 synthesis가 content-free `provider:unknown`으로 실패해 manifest validation은 통과하지 못했다. 따라서 `keep-stub-only`를 유지한다.
- C10 관측: v4 specialist prompt bytes를 v3와 동일하게 유지한 단 한 번의 local run에서 opening 3/3 뒤 implementation rebuttal이 `council-contract:missing-field`로 실패했다. verification rebuttal까지 5/7이 통과했지만 chair는 dependency-blocked였고 재실행하지 않았다. C6–C9 file SHA binding과 `keep-stub-only`, false promotion·activation 권한은 그대로다.
- C11 관측: opt-in `seat-scoped-v5`의 full fixed claim id, exact key, strict JSON(no prose/fence/repair/salvage/duplicate key)과 first-failure stop을 deterministic fake-provider로 검증했다. 단 한 번의 loopback `qwen2.5:3b` 관측은 research opening의 `structured-output`에서 중단됐고 나머지 6개 stage와 chair는 dependency-blocked였다. attempt 1, retry 0, content-free hash·token·duration만 보존했으며 exact field는 `insufficient-observation`이다. C6–C10 id·integrity·decision·file SHA-256과 `keep-stub-only`를 유지한다.
- C12 qualification: opt-in `seat-scoped-v6-candidate`는 actual model 실행 없이 injected fake provider의 7-stage replay를 7/7 통과했다. canonical JSON example과 strict validator는 같은 runtime descriptor를 사용하고 v5 chair contract를 재사용한다. malformed·prose·fence·duplicate/missing/extra key·enum·evidence·target·nextAction mismatch는 fail-closed이며 retry 0과 first-failure stop을 유지한다. `candidate-qualified`는 fixture contract 결과일 뿐이고 `localShadowQualified: false`, `keep-stub-only`, actual model compatibility·chair reachability unverified는 변하지 않는다.
- C13 관측: C6–C12 id·integrity·decision·file SHA와 v1–v5의 35개 prompt byte/hash를 동결한 뒤, owner-only receipt를 첫 provider call 직전에 exclusive write하고 loopback `qwen2.5:3b` 관측을 정확히 한 번 실행했다. Ollama service는 이미 실행 중이었고 model은 설치됐지만 unloaded 상태여서 첫 request가 observation 과정에서 on-demand load했다; 별도 service start·preload·download는 없었다. research opening이 `structured-output`의 `council-contract:invalid-output`으로 실패해 local request 1회, retry 0에서 후속 6개 stage와 chair가 dependency-blocked 되었고 결과는 `actual-incompatible`, chair는 `not-reached`다. 재실행·repair·promotion 없이 `keep-stub-only`와 모든 false authority를 유지한다.
- v1.1c envelope shadow: v1.1b schedule의 exact stage-to-wave 구조와 stage/dependency/attempt를 검증한 뒤, 그 validated content의 deterministic digest를 계산하고 모든 stage에 fixed synthetic unit cost를 부여한다. triad의 sequential 8, wave 4, wave peak 3은 structural count이며 runtime latency/resource/capacity 측정이 아니다. 4–7석은 `outside-default-synthetic-envelope`와 `keep-dispatch-disabled`를 반환하며 actual dispatch, provider/model/Ollama/C13, network, worker 실행은 없다.
- v1.1d retry lineage shadow: canonical v1.1b completion projection과 v1.1c envelope를 재구성해 exact content와 digest를 검증한 뒤, canonical first failed/timeout blocker 하나에 대해서만 attempt 1/retry 0 → hypothetical attempt 2/retry 1을 `projection-only-not-authorized`로 계산한다. actual retry·dispatch·provider/model/Ollama/C13/network/filesystem/store writes는 모두 0이며, 4–7석은 `outside-synthetic-envelope`로 닫고 retry를 투영하지 않는다.
- v1.1e retry terminality shadow: v1.1d 결과를 재구성하고 exact JSON·SHA-256 source binding을 검증한 뒤 timeout의 hypothetical attempt 2 outcome만 읽는다. failed blocker는 recoverability evidence 부족으로 거부하며, completed retry는 같은 wave sibling 전원이 completed일 때만 다음 barrier를 `projected-ready`로 연다. reviewer retry 성공은 projection complete, attempt 2 failed/timeout은 retry exhausted이고 attempt 3이나 configurable budget은 만들지 않는다. actual retry·dispatch·provider/model/Ollama/C13/worker/network/filesystem/store writes는 모두 0이다.
- 보류: dynamic persona, concurrent dispatch, external research adapter, AirLLM은 각각 bounded role·permission, ordering·retry·resource, network·license·retention authority, model-weight license·egress·runtime envelope 증적을 확보한 뒤 다시 검토한다.
- 경계: external provider call, model download, 새 dependency, public contract 변경은 없으며 F1.3 actual private-data evaluation과 training activation, production readiness claim은 별도 승인 전까지 보류한다.
