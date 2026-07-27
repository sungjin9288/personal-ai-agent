# Multi-Agent Council Development Plan v1

- status: completed
- plannedAt: 2026-07-27
- completedAt: 2026-07-27
- repositoryBaseline: `83c5ce3f31f80f1971cf58b2065c1aff0fd1b58f`
- closeoutBaseline: `ad6cf894dc0373f10d1cd3adf23de4a3d2e4ba2e`
- relatedBackbone: [orchestration-backbone-v1.md](orchestration-backbone-v1.md)
- relatedReferences: [reference-repos.md](reference-repos.md)
- productionReadyClaim: false

## 목표

현재의 manager → planner → specialist → executor → reviewer 흐름에 검증 가능한 협의 단계를 추가한다.
여러 specialist가 같은 문제를 독립적으로 검토하고, 서로의 주장에 한 번 반론한 뒤, chair가 채택안과
기각안을 근거와 함께 정리한다. 미해결 critical conflict가 있으면 reviewer 전에 중단한다.

이 기능은 자유로운 대화방이 아니다. 두 번의 round로 끝나는 finite state machine이며, agent가 말한
내용보다 검증된 claim, evidence reference, conflict, decision, next action을 기록하는 것이 중심이다.

첫 구현은 deterministic `stub` provider만 사용한다. 외부 Provider API, 유료 cloud, model download,
새 production dependency, 새로운 실행 권한은 추가하지 않는다.

## 현재 구조에서 이미 가능한 것

- `manager`, `planner`, `executor`, `reviewer`, `specialist` 역할이 고정되어 있다.
- specialist는 `research`, `implementation`, `verification`, `design`, `documentation` 다섯 kind로 제한된다.
- orchestration profile이 specialist 구성과 quality gate를 결정한다.
- specialist run, artifact, handoff, retry lineage, reviewer 결과, approval, timeline이 이미 저장된다.
- `stub` provider는 network 없이 deterministic하게 동작하고, local provider는 명시적으로 선택할 때만 사용된다.
- permission, sandbox, provider route, approval, audit, release evidence 경계가 이미 존재한다.

## 실제 결손

현재 specialist 실행은 이름과 달리 순차 loop다. 앞 specialist의 결과가 `previousOutputs.specialists`에
추가되므로 뒤 specialist가 그 결과를 볼 수 있다. 따라서 독립적인 첫 의견을 보장하지 못한다.

또한 다음 정보가 구조화되어 있지 않다.

- 다른 specialist 주장에 대한 agreement, challenge, missing evidence
- 어떤 제안을 chair가 채택하거나 기각했는지
- 기각 이유와 남은 dissent
- critical conflict가 해결되었는지
- synthesis가 참조한 run, artifact, retrieval source와 digest

기존 parallel group 집계는 `specialistKind`별 최신 run 하나만 남긴다. 같은 kind가 opening과 rebuttal에
모두 참여하면 round 2가 round 1을 덮어쓸 수 있다. 기존 reviewer도 required section과 next action을
주로 확인하므로 conflict resolution을 대신할 수 없다.

## 외부 저장소 판단

| Source | Decision | 가져올 패턴 | 가져오지 않을 것 |
| --- | --- | --- | --- |
| `Shubhamsaboo/awesome-llm-apps` | ADAPT | 독립 worker brief, plan review, 한 번의 cross-review, explicit conflict resolution, PASS/FIX/ESCALATE, tamper-evident artifact digest | Python·Streamlit·AutoGen·Together runtime, 고정 API model, permission bypass, 정적 trust score |
| `ibelick/ui-skills` | ADAPT | evidence chain, exact owner/scope, 하나의 next action, loading·empty·error·approval state, keyboard/focus 원칙 | CLI 설치, Tailwind·Base UI·motion stack, 외부 디자인 identity |
| `KnockOutEZ/wigolo` | ADAPT as concepts only | cache-first 사고, bounded research brief, citation/source span, gaps와 degraded source 표시 | AGPL source vendoring, dependency/MCP 자동 설치, browser·model download, 외부 crawl 실행 |
| `lyogavin/airllm` | DEFER | disk usage, resident memory, cold/warm latency를 분리해서 측정하는 runtime evaluation 관점 | production dependency, provider adapter, automatic Hugging Face download, remote code, destructive model cleanup |

`awesome-llm-apps`의 Mixture of Agents처럼 여러 답을 단순히 모아 하나로 평균하지 않는다. 다수결은
사실 판정이 아니며, 합의가 많아도 evidence가 없으면 decision으로 승격하지 않는다.

`wigolo`는 AGPL-3.0-only이므로 코드나 내부 module을 이 저장소에 포함하지 않는다. 필요한 것은
structured brief와 provenance 원칙이다. 향후 실제 adapter를 검토하더라도 별도 승인과 독립 process
boundary가 필요하다.

`AirLLM`은 inference memory 기술이며 council orchestration 기술이 아니다. 큰 model이 memory에 들어가는
것과 여러 agent round를 사용할 만한 latency로 실행하는 것은 다른 문제다. 현재 Ollama/local provider
quality와 resource evidence가 우선이다.

## 목표 흐름

```text
Manager frame
  → Planner
  → Round 1: independent opening positions
  → opening validator
  → immutable Council Brief
  → Round 2: one rebuttal per specialist
  → contribution validator
  → Chair synthesis
  → conflict and digest gate
  → Reviewer
  → existing human approval when required
```

### Round 1

- 모든 specialist는 동일한 context digest와 같은 evidence catalog를 받는다.
- 다른 specialist의 opening output은 받지 않는다.
- 실행 순서와 상관없이 roster order와 input digest가 고정되어야 한다.
- claim은 허용된 evidence reference만 사용할 수 있다.

### Round 2

- 모든 required opening contribution이 terminal 상태일 때만 시작한다.
- raw prompt, hidden reasoning, attachment body, provider message를 전달하지 않는다.
- allowlist로 정규화한 `CouncilBrief`만 모든 specialist에게 동일하게 전달한다.
- 각 specialist는 다른 claim에 대해 support, challenge, unknown 중 하나와 근거 부족 여부를 기록한다.
- round 2는 한 번만 실행한다. 실패한 required seat가 있으면 synthesis로 넘어가지 않는다.

### Chair synthesis

기존 executor가 chair synthesis를 담당한다. 새 authority role은 만들지 않는다. synthesis는 다음을
반드시 구분한다.

- accepted claim
- rejected claim과 기각 이유
- agreement
- unresolved conflict
- evidence reference
- verification plan
- next owner
- 정확히 하나의 next action

chair가 작성한 문장은 authority가 아니다. deterministic validator가 reference와 conflict를 확인한 뒤에만
기존 reviewer 경로로 이동한다.

## 내부 contract

첫 구현에서는 public API와 저장 collection을 추가하지 않는다. 기존 `agentRuns`, artifact, metadata를
사용하고 optional field만 더한다.

### Council run metadata

```json
{
  "councilId": "council-...",
  "councilRound": "opening | rebuttal",
  "councilPhase": "opening-position | rebuttal | synthesis | review",
  "councilSeatId": "research | implementation | verification",
  "sourceDigest": "sha256",
  "parentRunIds": ["run-..."],
  "outputDigest": "sha256"
}
```

기존 `parallelGroupId`, `specialistKind`, `parentRunId`, `specialistRootRunId`, `resumeFromRunId`,
`mergeStatus`는 유지한다. council metadata가 기존 lineage를 대체해서는 안 된다.

### Council statement

provider가 내보내는 specialist output에 typed `councilStatement`를 추가한다. 자연어 reasoning trace는
저장하지 않는다.

```json
{
  "claims": [
    {
      "id": "research:claim-1",
      "position": "support | challenge | unknown",
      "summary": "bounded statement",
      "evidenceRefs": ["artifact:...", "retrieval:..."],
      "severity": "normal | critical"
    }
  ],
  "targetClaimIds": ["implementation:claim-1"],
  "rejectedOptionIds": [],
  "nextAction": "one bounded action"
}
```

claim id, text length, claim count, evidence reference count는 code constant로 제한한다. 이 값은 capacity
주장이 아니라 안전한 초기 configuration이다. 다른 council, session, workspace의 reference와 현재
payload에 없는 URL은 거부한다.

### Council synthesis

```json
{
  "acceptedClaimIds": [],
  "rejectedClaims": [
    {
      "claimId": "research:claim-1",
      "reason": "bounded reason"
    }
  ],
  "agreementIds": [],
  "unresolvedConflictIds": [],
  "unresolvedCriticalConflictIds": [],
  "evidenceRefs": [],
  "verificationPlan": [],
  "nextOwner": "workspace-owner",
  "nextAction": "exactly one action"
}
```

모든 id는 같은 council의 opening 또는 rebuttal statement로 해석되어야 한다. evidence reference가 없는
claim은 agreement나 accepted decision으로 승격할 수 없다. `unresolvedCriticalConflictIds`가 하나라도
있으면 reviewer 전에 fail-close 한다.

### Council manifest

별도 database나 hash-chain service를 만들지 않는다. tracked artifact인 `council-manifest.json`에 다음
digest를 정렬된 순서로 기록한다.

- council frame digest
- roster와 required seat
- opening input/output digest
- CouncilBrief digest
- rebuttal input/output digest
- synthesis digest
- validator result

현재 artifact hash와 manifest가 다르면 stale synthesis로 처리한다.

## 고정할 불변 조건

1. Council은 opt-in orchestration profile에서만 실행한다.
2. 첫 profile은 `research`, `implementation`, `verification` 세 seat만 사용한다.
3. opening과 rebuttal 두 round를 넘지 않는다.
4. provider call은 순차 실행한다. 실제 concurrency는 품질과 resource evidence가 생긴 뒤 검토한다.
5. opening input은 seat마다 byte-equivalent해야 한다.
6. round 2는 allowlisted CouncilBrief만 읽는다.
7. hidden chain-of-thought, raw secret, private attachment body를 artifact에 기록하지 않는다.
8. required seat의 blocked·failed 상태는 existing specialist follow-up으로 보낸다.
9. council pass는 reviewer와 approval을 건너뛸 권한이 없다.
10. 기존 risk classification이 approval을 요구하면 human decision 전에는 완료할 수 없다.
11. F1.3 private dataset, training, provider activation과 이 기능의 authority를 연결하지 않는다.
12. `productionReadyClaim: false`를 유지한다.

## `/goal` 실행 계획

### C1 — Council evidence contract and deterministic stub runtime

- status: completed
- completedAt: 2026-07-27
- model: `gpt-5.6-sol`, reasoning `xhigh`
- branch: `codex/council-contract-stub-runtime`

구현:

- pure council contract, normalization, validator 추가
- opt-in council profile 추가
- opening specialist가 서로의 output을 보지 않도록 input snapshot 격리
- CouncilBrief 생성과 한 번의 rebuttal round 추가
- round-aware parallel group aggregation으로 opening history 보존
- executor synthesis 뒤 deterministic conflict/digest gate 추가
- required seat failure를 기존 follow-up lifecycle로 연결
- stub provider에 schema-valid opening, rebuttal, synthesis fixture 추가

제외:

- UI, 새 endpoint, 새 storage collection
- local·external provider council 실행
- custom persona와 임의 role registry
- 실제 concurrent dispatch

완료 기준:

- 동일 opening digest와 상호 output 비노출
- 두 round history와 parent/root lineage 보존
- duplicate, missing, cross-council claim/evidence 거부
- unresolved critical conflict fail-close
- tampered artifact와 stale synthesis digest 거부
- reviewer 전 approval·execution lease 생성 없음
- stub path external request 0

구현 결과:

- `src/core/council-contract.mjs`가 frame, statement, brief, synthesis, manifest의 exact shape와
  canonical SHA-256 binding을 검증한다.
- `knowledge-council-triad`는 opt-in profile이며 fixed roster를 caller가 덮어쓸 수 없다.
- opening은 동일 frame/source digest를 공유하고 서로의 output을 받지 않는다.
- opening prompt bytes는 seat identity와 raw attachment·memory·retrieval을 제외한 동일 snapshot으로 고정한다.
- rebuttal은 raw attachment, memory, retrieval, previous output 없이 persisted `CouncilBrief`만 받는다.
- prompt preparation, provider execution, output normalization은 동일한 phase-specific allowlist input을 사용한다.
- critical fixture는 bounded frame risk signal, opening claim, `CouncilBrief`, rebuttal 순서로만 전달되며 hidden runtime input을 사용하지 않는다.
- opening, rebuttal, chair synthesis artifact와 parent lineage는 round-qualified record로 보존된다.
- manifest는 저장 후 다시 읽어 검증하며 critical conflict와 digest drift를 reviewer 전에 차단한다.
- blocked required seat는 기존 specialist follow-up lifecycle을 사용하되 council metadata를 additive하게 남긴다.
- 새 session의 remediation은 이전 session record를 재사용하지 않고 fresh frame과 council로 전체 bounded flow를 다시 실행한다.
- non-stub council은 session이나 provider call을 만들기 전에 거부한다.

검증:

- council contract와 provider-input boundary: 12 passed
- focused service/unit regression: 25 passed
- `npm run smoke:council-stub-runtime`: success, critical-conflict, tamper, fixed-roster, non-stub refusal 통과
- `npm run smoke:reference-adoptions`: 29/29 통과
- `npm test`: 1669 passed, 1 skipped, 0 failed
- `npm run smoke:docs-gates`: 33/33 통과

남은 경계:

- C1은 deterministic sequential `stub` runtime만 검증한다.
- read-only board, 품질 비교, retrieval provenance 확장, local/external provider council은 C2–C5에 남는다.
- default 승격, concurrent dispatch, model download, external research, training, production claim은 허용하지 않는다.

### C2 — Read-only deliberation board

- model: `gpt-5.6-terra`, reasoning `high`
- branch: `codex/council-read-model-board`
- status: completed on 2026-07-27

구현 결과:

- 선택한 session의 persisted run, artifact, reviewer, approval만 사용해 council read model을 파생한다.
- 최신 council을 고른 뒤 research, implementation, verification seat의 opening과 rebuttal을 정확한 phase로 나눠 표시한다.
- synthesis agreement, rejected option, unresolved conflict를 claim id로 다시 연결하고, reviewer와 human approval을 별도 card로 표시한다.
- reviewer는 synthesis 바로 다음 `session.agentRunIds` record만 인정한다. approval은 같은 session의 approval id, reviewer ownership, 지원 kind, timestamp를 모두 만족하는 단일 record만 인정하며 모호하거나 누락되면 fail-close한다.
- mission detail에 읽기 전용 `협의` panel을 추가하고 기존 retrieval artifact navigation control을 그대로 재사용한다.
- loading, empty, blocked, reviewer-failed, approval-pending, completed 상태와 persisted evidence에서 나온 next action 하나만 표시한다.
- seat keyboard 이동, focus restoration, visible focus, `aria-live`, dark mode, reduced motion, dense desktop, 640px layout을 구현했다.

유지한 경계:

- UI rerun, merge, approval mutation을 추가하지 않았다.
- 새 endpoint, HTTP payload, storage format, provider call, dependency를 추가하지 않았다.
- Tailwind, component framework, animation dependency와 upstream visual identity를 가져오지 않았다.
- 연결할 persisted evidence가 없는 값은 `기록 없음`으로 표시하고 consensus나 completion을 추론하지 않는다.

검증:

- C2 read-model/UI test: 13 passed
- existing council contract/provider-input regression: 12 passed
- `npm run smoke:ui-council-board`: completed, blocked, fixed 3-seat surface 통과
- `npm run smoke:council-stub-runtime`: deterministic council lifecycle 통과
- `npm test`: 1682 passed, 1 skipped, 0 failed
- local browser: artifact navigation, keyboard focus, session reload focus restoration, zero console error, dark mode, reduced motion, dense desktop, 640px 화면 확인
- Terra adversarial re-review: approval ambiguity와 missing approval이 fail-close함을 확인하고 blocking finding 없음
- Sol architecture re-review: historical round action은 read model에만 보존하고 현재 next action 하나만 표시함을 확인했으며 blocking finding 없음

### C3 — Council quality comparison

- model: `gpt-5.6-sol`, reasoning `high`
- branch: `codex/council-quality-shadow`
- status: completed on 2026-07-27

구현 결과:

- control pass, critical conflict stop, missing verification stop, reviewer rubric failure의 같은
  public/synthetic fixture를 기존 triad와 council profile로 fresh store에서 각각 두 번 replay했다.
- persisted `agentRuns`를 stage 단위로 고정하고 stage sequence, reviewer outcome, 누락 specialist,
  council validation, approval·execution lease·provider response를 비교했다. 첫 replay의 모든 artifact는
  exact SHA-256과 byte length로 기록했다.
- runtime id, timestamp, absolute path를 제외한 allowlisted semantic observation hash로 두 replay의
  deterministic parity를 확인했다. exact artifact hash는 실제 첫 replay 증적으로 별도 보존했다.
- critical conflict는 `council-critical-conflict`를 stub이 route한 synthetic signal이므로 일반적인
  semantic conflict discovery로 주장하지 않는다.
- unsupported claim은 두 profile이 공유하는 semantic grounding oracle이 없어 `not-comparable`로
  기록하고 promotion gate를 실패시켰다.

판정:

- critical conflict fixture는 baseline이 reviewer까지 통과한 반면 council은 reviewer 전에 차단했다.
- missing verification fixture는 두 profile 모두 verification contribution 누락을 reviewer 전에 차단했다.
- reviewer rubric failure fixture는 baseline이 reviewer에서 실패했지만 council은 조건을 소실해
  잘못 통과했다.
- 전체 stage 수는 baseline 26, council 34였다.
- 따라서 `improvementProven: false`, `defaultPromotionAuthorized: false`,
  `selectedDefaultProfile: knowledge-triad`로 확정하고 council을 opt-in experiment로 유지한다.

유지한 경계:

- explicit `stub`만 사용했고 external provider call, model download, 실제 사용자 데이터, production
  dependency를 사용하지 않았다.
- public API, CLI invocation, payload, storage schema, permission, approval ordering을 변경하지 않았다.
- approval과 execution lease는 모든 replay에서 0이며 `productionReadyClaim: false`를 유지한다.

증적:

- `fixtures/council-quality-comparison-cases-v1.json`
- `evidence/output-artifacts/council-quality-comparison.json`
- `npm run smoke:council-quality-comparison`
- regression이면 기존 triad를 유지하고 council default 승격을 거부

local provider shadow는 별도 현재 permission, model digest, license, egress, resource gate가 모두 유효할 때만
실행한다. threshold와 timeout은 preflight 측정 뒤 정하며 계획 문서의 임의 숫자를 성능 주장으로 사용하지
않는다.

### C3.1 — Council reviewer parity repair

- model: `gpt-5.6-sol`, reasoning `high`
- branch: `codex/council-reviewer-parity`
- status: completed on 2026-07-27

구현 결과:

- synthesis draft가 baseline과 동일하게 `force-reviewer-fail`, `force-rubric-fail` fixture directive를
  반영하도록 교정했다.
- directive는 내부 `renderDraft` 입력으로만 사용한다. raw mission object와 constraint는 provider
  input에 전달하지 않고, 허용된 mission·workspace 값은 pack이 렌더링한 artifact에만 나타난다.
- 같은 reviewer rubric failure fixture에서 두 profile 모두 reviewer `fail`, mission `failed`를
  기록한다.
- current C3 comparison의 `reviewer-outcome-no-regression`은 통과하며 baseline reviewer correct
  count 3, candidate count 4를 기록한다.

유지한 판정:

- unsupported claim은 공통 semantic oracle이 없어 계속 `not-comparable`이다.
- persisted stage count는 baseline 26, council 34로 유지된다.
- `improvementProven: false`, `defaultPromotionAuthorized: false`,
  `selectedDefaultProfile: knowledge-triad`를 유지한다.
- external provider call, model download, 실제 사용자 데이터, 새 production dependency를 사용하지
  않았고 public API, payload, storage, permission, approval ordering을 변경하지 않았다.

### C4 — Research evidence enrichment

- model: `gpt-5.6-terra`, reasoning `high`
- branch: `codex/council-research-evidence`
- status: completed and merged on 2026-07-27 through PR #798

구현 결과:

- manager와 planner가 이미 생성한 retrieval artifact를 다시 조회하지 않고 각각 하나의 bounded catalog
  entry로 투영한다.
- artifact digest, opaque citation id, corpus·chunk id, corpus chunk index·count, content·snippet hash,
  revision id, `known | unknown` freshness 사실, `available | degraded | gap` 상태만 전달한다.
- raw snippet, source label, path, URL, attachment, memory value, provenance object, 실제 timestamp는
  council frame과 provider input에 전달하지 않는다.
- retrieval artifact가 없으면 `gap`, lineage가 불완전하면 `degraded`로 기록하고 둘 다 claim에서
  인용할 수 없게 한다.
- gap 또는 degraded가 있으면 기존 synthesis artifact에 `Council Source Limitations`를 붙이고 기존
  next action에 local source verification을 추가한다. 새 synthesis field는 만들지 않는다.
- legacy 5-field retrieval entry와 artifact entry는 그대로 허용하고, enriched retrieval exact shape와
  catalog 전체 citation id 중복 거부를 추가했다.
- C3 comparison을 같은 fixture로 다시 생성해 reviewer parity, baseline 26·council 34 stage,
  unsupported-claim `not-comparable`, `knowledge-triad` default, promotion denial을 유지했다.

유지한 경계:

- wigolo code·package·MCP 설치
- web crawl, browser download, external search engine 호출
- 새 URL fetch authority
- public API·CLI·store collection·permission·approval·audit ordering 변경
- local 또는 external provider 호출, model download, 실제 사용자 데이터, production readiness 주장

### C5 — Closeout and promotion decision

- model: `gpt-5.6-terra`, reasoning `medium`
- branch: `codex/council-closeout`
- status: completed on 2026-07-27

최종 결정:

- `knowledge-triad`를 default profile로 유지한다.
- `knowledge-council-triad`는 opt-in experiment로 유지한다.
- `improvementProven: false`, `defaultPromotionAuthorized: false`를 유지한다.
- C1–C4의 local deterministic 결과는 보존하지만 일반적인 답변 품질 개선이나 production 적합성으로
  확대하지 않는다.

승격 조건 검토:

| 조건 | 현재 증적 | 판정 |
| --- | --- | --- |
| 기존 triad보다 의미 있는 conflict 또는 누락 조건을 더 발견 | synthetic critical-conflict fixture에서는 council이 reviewer 전에 중단했지만 일반 semantic conflict discovery는 검증하지 않았다. | 부분 충족 |
| unsupported claim이 늘지 않음 | 두 profile이 공유하는 semantic oracle이 없어 `not-comparable`이다. | 미충족 |
| reviewer와 human approval 경계가 동일하게 유지됨 | reviewer failure parity를 복구했고 approval·execution lease는 생성되지 않았다. | 충족 |
| runtime/resource envelope가 local evidence 안에서 bounded함 | persisted stage가 baseline 26에서 candidate 34로 늘었고 local/external provider council의 resource envelope는 측정하지 않았다. | 미충족 |

따라서 default 승격 조건은 충족되지 않았다. 이 결론은
`evidence/output-artifacts/council-quality-comparison.json`의 exact comparison을 따른다.

재평가 결과:

| 항목 | 결정 | 다시 검토할 조건 |
| --- | --- | --- |
| dynamic persona | 보류 | bounded role registry, permission ownership, prompt isolation, fixed roster 대비 품질 증적이 필요하다. |
| concurrent dispatch | 보류 | deterministic ordering, retry lineage, resource·latency envelope, sequential baseline 대비 품질 증적이 필요하다. |
| external research adapter | 보류 | 새 URL fetch·crawl authority, network·secret·retention policy, license와 독립 process boundary가 먼저 승인되어야 한다. Wigolo AGPL code는 vendoring하지 않는다. |
| AirLLM | 보류 | 기존 local provider보다 나은 council quality need, model-weight license, acquisition egress, disk·resident memory·cold/warm latency·throughput, rollback owner evidence가 필요하다. |

이번 closeout은 위 네 항목을 구현하지 않았다. external provider call, model download, 새 dependency,
public API·CLI·storage·permission·approval·audit ordering도 변경하지 않았다.
`productionReadyClaim: false`를 유지하며 F1.3 actual private-data evaluation과 training activation은 계속
보류한다.

## 검증 계획

각 `/goal`은 작은 검증에서 전체 검증 순서로 실행한다.

1. touched council contract와 failure boundary unit test
2. deterministic stub council smoke
3. 기존 parallel specialist, retry, reviewer, approval, timeline regression
4. UI 변경이 있는 C2만 local browser smoke
5. `npm test`
6. `npm run smoke:docs-gates`
7. `npm run smoke:all`
8. `npm run smoke:release-artifact-hygiene`
9. `git diff --check`
10. tracked release artifact가 바뀐 경우에만 execution-v1 artifact refresh와 `artifact-sync-current` 확인

다음 중 하나라도 발생하면 현재 `/goal`을 중단하고 범위를 줄인다.

- public API, CLI invocation, persisted collection의 breaking change
- existing permission, approval, audit ordering 변경
- 다른 specialist output이 opening input으로 유입
- same-council provenance로 검증할 수 없는 claim 또는 evidence
- critical conflict를 reviewer prose만으로 해결
- external network, paid provider, model download가 암묵적으로 실행
- F1.3 private authority가 council 실행 권한으로 오인됨

## 커밋과 push

- `/goal`별 branch와 implementation commit 하나를 사용한다.
- code, focused test, 관련 문서는 같은 implementation commit에 묶는다.
- implementation SHA가 필요한 tracked evidence만 두 번째 evidence commit으로 분리한다.
- 작은 field 이동, 이름 변경, UI 문구만으로 별도 commit을 만들지 않는다.
- 모든 local 검증이 끝난 뒤 `/goal`당 한 번만 push한다.
- 한 `/goal`의 evidence가 닫히기 전에는 다음 `/goal`을 시작하지 않는다.

## 보류 항목

- arbitrary persona와 plugin role registry
- 두 round를 넘는 open-ended debate
- majority vote, quorum, learned trust score
- actual concurrent provider dispatch
- council이 직접 workspace를 변경하는 execution authority
- 외부 model별 advisor/worker tier routing
- wigolo runtime adapter
- AirLLM provider 또는 candidate evaluator
- F1.3 actual private-data evaluation과 training activation
