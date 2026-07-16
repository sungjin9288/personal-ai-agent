# ML, RAG, and Fine-tuning Development Plan v1

- status: reranking-experiment-current
- productionReadyClaim: false
- costFreeDefault: true
- externalProviderCalls: none
- paidCloudExecution: none
- currentFixture: `fixtures/answer-quality-cases-v1.json`
- currentCorpusFixture: `fixtures/retrieval-corpus-cases-v1.json`
- currentRetrievalFixture: `fixtures/retrieval-quality-cases-v1.json`
- currentSemanticFixture: `fixtures/semantic-retrieval-cases-v1.json`
- currentRerankingFixture: `fixtures/reranking-cases-v1.json`
- runtimeActivation: false

## 목적

이 계획은 답변 품질을 먼저 측정하고, 그 근거로 RAG와 학습 기능을 단계적으로 개선하기 위한 개발 순서를 정한다. 지식 검색과 모델 학습을 한꺼번에 묶지 않는다. 최신 사실과 출처 문제는 RAG로, 반복되는 형식·판단·도구 사용 문제는 승인된 학습 데이터와 fine-tuning으로 다룬다.

현재 구현은 memory와 attachment를 lexical score, BM25 score, phrase boost score로 정렬한다. 검색 후보는 같은 저장 데이터를 바꾸지 않고 corpus record로 정규화되며, retrieval artifact는 source revision, chunk id, content hash, scope, provenance를 함께 남긴다. fact graph는 revision과 retirement 이력을 보존하며, learning candidate는 reviewer·approval·verification을 통과해야 promotion될 수 있다.

아직 구현되었다고 주장하지 않는 범위는 embedding index, vector database, semantic retrieval의 mission runtime 활성화, learned reranker, 학습용 dataset export, local training runtime, 외부 fine-tuning 실행, model registry, production A/B rollout이다.

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

`src/core/retrieval-corpus.mjs`도 store와 provider를 모르는 순수 계약 모듈이다. memory, attachment, fact source를 `personal-ai-agent-retrieval-corpus/v1` record로 변환한다. record에는 source와 scope, revision, provenance, 원문 기반 content hash, deterministic corpus/chunk id가 들어간다. 저장된 source id가 없는 fixture는 내용과 scope에서 파생한 id를 명시적으로 사용한다.

실제 retrieval payload와 mission read model에는 corpus metadata를 추가하지 않는다. 선택된 item과 corpus record의 연결은 runtime 내부에서만 유지하고 retrieval artifact를 쓸 때 사용한다. attachment의 로컬 path는 provenance에 포함하지 않는다. 인접 chunk가 합쳐진 표시 snippet은 원래 index chunk의 `contentHash`와 혼동하지 않도록 별도 `snippetHash`로 기록한다.

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

## 현재 retrieval 기준선

`src/core/retrieval-quality-evaluation.mjs`는 provider와 store를 모르는 순수 평가기다. fixture가 각 source를 expected와 irrelevant로 미리 분류하고, 실제 `buildRetrievalContextWithCorpus` 결과를 source id에 연결해 다음 지표를 계산한다.

| 지표 | 의미 | 현재 gate |
|---|---|---:|
| precision@k | 선택된 고유 source 중 expected source 비율 | 1.0 |
| recall@k | expected source 중 top-k에 포함된 비율 | 1.0 |
| noise@k | 선택된 고유 source 중 irrelevant source 비율 | 0.0 |
| source diversity | 기대한 relevant source type 중 실제로 선택된 type 비율 | 1.0 |
| unlabeled source count | expected·irrelevant 어느 쪽에도 분류되지 않은 선택 source 수 | 0 |
| case pass rate | 모든 개별 gate를 통과한 fixture case 비율 | 1.0 |

위 값은 `npm run smoke:retrieval-quality-evaluation`로 측정한 3개 controlled fixture의 현재 결과다. provider recovery, fact lifecycle, permission evidence 사례에서 memory와 attachment를 함께 검사한다. 일반 검색 정확도나 실제 사용자 corpus 성능을 뜻하지 않는다.

fixture는 현재 `hybrid-lexical-bm25-phrase-v1`의 metric과 selected source 순서를 frozen baseline으로 보존한다. 후속 semantic retrieval이나 reranker candidate는 같은 case set으로 자체 threshold를 통과한 뒤, suite와 각 case의 precision·recall·noise·source diversity가 이 baseline보다 나빠지지 않아야 한다. candidate threshold를 완화해도 baseline regression 비교는 우회할 수 없다.

## 현재 semantic retrieval 실험

`src/core/embedding-adapter.mjs`는 embedding 구현을 `embedTexts` 계약으로 분리한다. 현재 구현된 adapter는 operator가 지정한 local executable과 JSON stdin/stdout으로 통신한다. Shell을 사용하지 않고 child environment를 `HOME`, locale, `PATH`, `TMPDIR`로 제한하며 API key 같은 임의 환경변수를 전달하지 않는다. 실행 시간, input text 수·문자 수, output bytes, vector dimensions도 제한한다.

`src/core/semantic-retrieval.mjs`는 R1 corpus record를 embedding input으로 사용하고 cosine similarity로 chunk를 정렬한다. 호출자는 허용된 `type:id` scope key 목록을 반드시 전달해야 하며, 다른 scope의 corpus가 하나라도 섞이면 실행을 거부한다. retired record는 검색하지 않고, 같은 source의 여러 chunk 중 점수가 가장 높은 chunk만 결과에 남긴다. 결과에는 corpus 원문을 복사하지 않는다.

현재 smoke의 local command는 `fixtures/local-embedding-command.mjs`다. 동의어 개념을 고정 vector로 바꾸는 test fixture이며 ML model이나 일반 embedding 품질을 증명하지 않는다. 이 fixture가 검증하는 것은 실제 local model executable도 같은 protocol로 교체할 수 있다는 구조와 quality comparison 흐름이다. Adapter 자체는 child process의 network를 차단하지 않으므로 실제 model command의 network isolation은 실행 owner가 별도로 보장해야 한다.

3개 controlled synonym case의 측정 결과는 다음과 같다. 모든 값은 `npm run smoke:semantic-retrieval-experiment` 출력으로만 재현한다.

| 실험 | precision@1 | recall@1 | noise@1 | case pass rate |
|---|---:|---:|---:|---:|
| lexical·BM25·phrase baseline | 0.0 | 0.0 | 1.0 | 0.0 |
| fixture semantic candidate | 1.0 | 1.0 | 0.0 | 1.0 |

이 결과는 의도적으로 lexical overlap과 synonym relevance가 충돌하도록 만든 3개 fixture에만 적용된다. Candidate는 R2 evaluator와 baseline comparison을 통과하지만 mission runtime에는 연결하지 않았다. 실제 local embedding model을 선택하고 같은 evaluation suite에서 이득과 latency를 검증하기 전까지 `runtimeActivation: false`를 유지한다.

## 현재 retrieval reranking 실험

`src/core/retrieval-reranker.mjs`는 R3 semantic candidate의 cosine score와 현재 lexical retrieval score만 입력받아 고정 가중치로 다시 정렬한다. Semantic signal은 0.7, lexical signal은 0.3이며 각 contribution과 combined score를 결과에 남긴다. 원문과 attachment payload는 입력 계약에 없고 결과에도 복사하지 않는다.

Rollback은 별도 상태나 migration을 만들지 않는다. 각 candidate가 가진 semantic baseline rank를 보존하고, 결과의 `rollback.sourceKeys`에 기존 top-k 순서를 기록한다. 적용을 취소할 때는 reranker를 우회하면 된다. 현재 mission runtime에는 연결하지 않았으므로 이 rollback 경계도 실험 내부에서만 검증한다.

3개 controlled semantic-tie case의 측정 결과는 다음과 같다. 동의어 기반 semantic score가 같은 후보 중 exact lexical evidence가 있는 source를 다시 고르는 조건이며, 모든 값은 `npm run smoke:retrieval-reranking-experiment`로 재현한다.

| 실험 | precision@1 | recall@1 | noise@1 | case pass rate |
|---|---:|---:|---:|---:|
| fixture semantic tie baseline | 0.0 | 0.0 | 1.0 | 0.0 |
| deterministic semantic+lexical reranker | 1.0 | 1.0 | 0.0 | 1.0 |

같은 smoke는 실제 local embedding command의 case당 평균 시간과 순수 reranking 평균 시간을 함께 출력하고, reranking 시간이 semantic retrieval 시간보다 작은지 검사한다. 숫자는 실행 환경마다 달라 문서에 고정하지 않는다. learned reranker나 별도 local model은 도입하지 않았고, measured gain과 dependency 승인이 생기기 전까지 현재 deterministic baseline만 유지한다.

## 개발 순서

| 단계 | 상태 | 비용 없는 구현 | 완료 기준 |
|---|---|---|---|
| Q1 Answer quality foundation | 완료 | 순수 evaluator, fixture, unit test, deterministic smoke | passing baseline과 의도적 regression을 모두 판정 |
| R1 Corpus contract | 완료 | memory·attachment·fact source의 chunk id, content hash, revision, scope, provenance 계약 통일 | 저장 형식과 retrieval payload 변경 없이 동일 index record 재생성 |
| R2 Retrieval evaluation | 완료 | 3개 fixture, precision·recall·noise·source diversity 기준, 현재 lexical·BM25·phrase baseline과 per-case regression 비교 | ranking candidate가 자체 gate와 frozen baseline을 모두 통과할 때만 반영 |
| R3 Optional semantic retrieval | 완료 | provider-neutral embedding contract, bounded local command adapter, scope-locked cosine experiment, controlled synonym comparison | 새 dependency와 runtime 활성화 없이 local protocol·quality gain·rollback boundary 검증 |
| R4 Reranking | 완료 | semantic 0.7·lexical 0.3 deterministic feature baseline, controlled tie comparison, latency measurement, state-free rollback order | runtime 변경 없이 품질·latency·rollback 비교 자료 확보 |
| L1 승인된 학습 데이터 | 다음 | approved learning candidate와 reviewer evidence만 dataset record로 변환 | raw secret·customer payload 차단, lineage와 hash 보존 |
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
node --test test/retrieval-corpus.test.mjs test/retrieval-artifacts.test.mjs
node --test test/retrieval-quality-evaluation.test.mjs
node --test test/embedding-adapter.test.mjs test/semantic-retrieval.test.mjs
node --test test/retrieval-reranker.test.mjs
npm run smoke:answer-quality-evaluation
npm run smoke:retrieval-corpus-contract
npm run smoke:retrieval-quality-evaluation
npm run smoke:semantic-retrieval-experiment
npm run smoke:retrieval-reranking-experiment
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

현재 안전하게 말할 수 있는 범위는 credential-free fixture가 retrieval hit, source citation, citation grounding, required content, unsupported citation, forbidden source와 reviewer verdict를 deterministic하게 검사하고, memory·attachment·fact source에서 동일한 corpus identity와 provenance를 재생성하며, controlled retrieval case에서 lexical baseline, local-command semantic experiment, deterministic semantic+lexical reranker를 같은 quality evaluator로 비교한다는 것이다.

이 결과는 실제 embedding model이나 learned reranker 성능, 일반적인 답변 정확도, fine-tuning 효과, production RAG 품질, 고객 업무 성과를 증명하지 않는다. Semantic retrieval과 reranking mission runtime은 활성화하지 않았고 `productionReadyClaim: false`는 모든 단계에서 유지한다.
