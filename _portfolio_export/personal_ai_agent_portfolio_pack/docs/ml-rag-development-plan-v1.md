# ML, RAG, and Fine-tuning Development Plan v1

- status: answer-quality-foundation-current
- productionReadyClaim: false
- costFreeDefault: true
- externalProviderCalls: none
- paidCloudExecution: none
- currentFixture: `fixtures/answer-quality-cases-v1.json`

## 목적

이 계획은 답변 품질을 먼저 측정하고, 그 근거로 RAG와 학습 기능을 단계적으로 개선하기 위한 개발 순서를 정한다. 지식 검색과 모델 학습을 한꺼번에 묶지 않는다. 최신 사실과 출처 문제는 RAG로, 반복되는 형식·판단·도구 사용 문제는 승인된 학습 데이터와 fine-tuning으로 다룬다.

현재 구현은 memory와 attachment를 lexical score, BM25 score, phrase boost score로 정렬하고, 선택된 source와 provenance를 retrieval artifact에 남긴다. fact graph는 revision과 retirement 이력을 보존하며, learning candidate는 reviewer·approval·verification을 통과해야 promotion될 수 있다. 이번 단계는 이 기능을 바꾸지 않고, 개선 전후를 같은 기준으로 비교할 수 있는 answer quality evaluation 계층을 추가한다.

아직 구현되었다고 주장하지 않는 범위는 embedding index, vector database, learned reranker, 학습용 dataset export, local training runtime, 외부 fine-tuning 실행, model registry, production A/B rollout이다.

## 구조

데이터는 다음 순서로 흐른다.

1. memory, attachment, fact graph에서 검색 가능한 source를 준비한다.
2. retrieval service가 source를 선택하고 ranking 근거를 남긴다.
3. provider가 선택된 context로 답변을 만든다.
4. answer quality evaluator가 retrieval, citation, 필수 내용, 금지 내용을 판정한다.
5. reviewer가 통과시킨 결과만 승인된 학습 데이터 후보가 된다.
6. dataset builder가 secret과 raw customer payload를 제외하고 train·validation 자료를 만든다.
7. training과 model rollout은 별도 승인, 비용 한도, rollback 근거가 있을 때만 실행한다.

평가기는 runtime, store, provider를 알지 못하는 순수 모듈이다. fixture가 retrieval 결과와 답변, 기대 source, reviewer verdict를 전달한다. 따라서 외부 API와 credential 없이 같은 입력에서 같은 결과를 재현할 수 있다.

## 현재 평가 기준선

`src/core/answer-quality-evaluation.mjs`는 각 case와 전체 suite에 같은 threshold를 적용한다.

| 지표 | 의미 | 현재 gate |
|---|---|---:|
| retrieval hit rate | 기대한 source가 실제 retrieval 결과에 포함된 비율 | 1.0 |
| expected source citation rate | 기대 source가 답변 evidence에 연결된 비율 | 1.0 |
| citation grounding rate | 답변이 인용한 source 중 실제 retrieval 결과에 존재하는 비율 | 1.0 |
| required term coverage | fixture가 요구한 핵심 내용이 답변에 포함된 비율 | 1.0 |
| unsupported citation rate | retrieval에 없는데 답변이 인용한 source 비율 | 0.0 |
| forbidden retrieved source count | 명시적으로 무관한 source가 retrieval된 수 | 0 |
| forbidden term matches | 근거 없는 claim이나 금지 표현이 답변에 들어간 수 | 0 |
| reviewer verdict | 독립 reviewer 판정 | pass |

값이 하나라도 gate를 벗어나면 case는 실패한다. suite는 case pass rate와 합산 지표를 다시 검사한다. 지표가 없는 항목은 `not-applicable`로 남기며 임의로 성공률 100%를 만들지 않는다.

현재 fixture는 provider drift recovery와 fact revision provenance 두 사례를 검사한다. passing baseline뿐 아니라 source 누락, 허위 citation, 필수 내용 누락, reviewer fail을 주입한 regression도 반드시 실패하는지 확인한다.

## 개발 순서

| 단계 | 상태 | 비용 없는 구현 | 완료 기준 |
|---|---|---|---|
| Q1 Answer quality foundation | 완료 | 순수 evaluator, fixture, unit test, deterministic smoke | passing baseline과 의도적 regression을 모두 판정 |
| R1 Corpus contract | 다음 | memory·attachment·fact source의 chunk id, content hash, revision, scope, provenance 계약 통일 | 저장 형식 변경 없이 index 입력을 재생성 가능 |
| R2 Retrieval evaluation | 예정 | fixture 확장, recall·noise·source diversity 기준, 현재 BM25/lexical baseline 비교 | ranking 변경이 품질 gate를 통과할 때만 반영 |
| R3 Optional semantic retrieval | 예정 | provider-neutral embedding adapter와 local/offline 구현 가능성 검증 | 새 dependency 전 승인, measured gain 없으면 도입하지 않음 |
| R4 Reranking | 예정 | deterministic feature baseline 후 선택적 local reranker 실험 | latency·품질·rollback 비교 자료 확보 |
| L1 승인된 학습 데이터 | 예정 | approved learning candidate와 reviewer evidence만 dataset record로 변환 | raw secret·customer payload 차단, lineage와 hash 보존 |
| L2 Dataset quality gate | 예정 | 중복 제거, scope 분리, train·validation split, leakage 검사 | 동일 seed에서 동일 manifest 생성 |
| F1 Fine-tuning readiness | 예정 | provider-neutral JSONL export와 evaluation manifest 생성 | 학습 실행 없이 dataset과 baseline을 reviewer가 검토 가능 |
| F2 외부 fine-tuning 실행 | 외부 작업 | 승인된 provider·budget·model이 있을 때 별도 adapter로 제출 | 명시 승인, 비용 한도, model id, 결과, rollback 기록 |
| O1 Model rollout | 외부 작업 | candidate model과 baseline을 같은 fixture로 비교 | 품질 악화·권한 누락·증적 누락 시 즉시 중단 |

RAG 단계에서는 현재 공개 API, CLI, HTTP payload, 저장 형식, permission 판단, audit ordering을 유지한다. 새 index가 필요하면 기존 source를 읽어 만든 파생 데이터로 두고, 원본 store를 migration하지 않는다.

Fine-tuning은 지식을 최신으로 만드는 수단으로 사용하지 않는다. 다음 조건을 모두 만족할 때만 고려한다.

- retrieval과 prompt 개선 후에도 반복되는 행동 문제가 남아 있다.
- 승인된 학습 데이터가 충분하며 train·validation scope가 분리되어 있다.
- baseline과 candidate를 같은 evaluation suite로 비교할 수 있다.
- dataset lineage, reviewer, approval, 비용 한도, rollback owner가 기록된다.

## 승인된 학습 데이터 규칙

학습 자료는 learning candidate가 `approved` 상태라는 이유만으로 자동 생성하지 않는다. 다음 정보를 모두 확인한다.

- candidate, mission, session, artifact id가 서로 연결된다.
- reviewer verdict와 promotion verification evidence가 존재한다.
- `noRawSecrets`, `noRawCustomerPayloads`, scope lock을 다시 검사한다.
- accepted risk가 있으면 승인자, 범위, 만료 시점을 함께 기록한다.
- 같은 mission이나 거의 같은 답변이 train과 validation 양쪽에 들어가지 않는다.
- 원본을 삭제하거나 수정하지 않고 sanitized record와 content hash를 별도 생성한다.

dataset export와 실제 학습 제출은 다른 권한으로 분리한다. export는 local deterministic 작업으로 만들 수 있지만, 외부 fine-tuning 실행은 비용과 데이터 전송이 생기므로 명시 승인 전에는 호출하지 않는다.

## 실행과 검증

현재 단계는 다음 명령으로 재현한다.

```bash
node --test test/answer-quality-evaluation.test.mjs
npm run smoke:answer-quality-evaluation
npm run smoke:retrieval-memory
npm run smoke:memory-retrieval-quality-fixture
```

각 후속 단계는 변경 도메인 test와 smoke를 먼저 통과한 뒤 `npm test`, `npm run smoke:docs-gates`, `npm run smoke:all`, `git diff --check`를 실행한다. tracked evidence가 implementation SHA를 요구할 때만 implementation commit 뒤에 evidence commit을 한 번 추가한다.

## 중단 조건

다음 중 하나가 발생하면 해당 단계를 중단하고 범위를 줄인다.

- 공개 API, CLI payload, 저장 형식, permission 또는 audit 순서가 의도치 않게 달라진다.
- source provenance나 content hash 없이 index 또는 dataset record가 만들어진다.
- secret, raw customer payload, 다른 scope의 memory가 학습 자료에 포함된다.
- quality gate를 낮춰야만 새 retrieval 또는 model이 통과한다.
- 외부 provider 호출, 비용, 새 production dependency가 승인 없이 필요해진다.
- rollback 경로와 이전 baseline 비교 자료가 없다.

## Claim Boundary

현재 안전하게 말할 수 있는 범위는 credential-free fixture가 retrieval hit, source citation, citation grounding, required content, unsupported citation, forbidden source와 reviewer verdict를 deterministic하게 검사한다는 것이다.

이 결과는 일반적인 답변 정확도, 모델 성능 향상, fine-tuning 효과, production RAG 품질, 고객 업무 성과를 증명하지 않는다. `productionReadyClaim: false`는 모든 단계에서 유지한다.
