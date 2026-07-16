# ML, RAG, and Fine-tuning Development Plan v1

- status: local-retrieval-robustness-current
- productionReadyClaim: false
- costFreeDefault: true
- externalProviderCalls: none
- paidCloudExecution: none
- currentFixture: `fixtures/answer-quality-cases-v1.json`
- currentCorpusFixture: `fixtures/retrieval-corpus-cases-v1.json`
- currentRetrievalFixture: `fixtures/retrieval-quality-cases-v1.json`
- currentSemanticFixture: `fixtures/semantic-retrieval-cases-v1.json`
- currentRerankingFixture: `fixtures/reranking-cases-v1.json`
- currentRobustnessFixture: `fixtures/retrieval-robustness-cases-v1.json`
- currentTrainingFixture: `fixtures/approved-training-record-cases-v1.json`
- currentDatasetFixture: `fixtures/training-dataset-quality-cases-v1.json`
- currentReadinessFixture: `fixtures/fine-tuning-readiness-cases-v1.json`
- currentCandidateFixture: `fixtures/candidate-model-evaluation-cases-v1.json`
- runtimeActivationDefault: false
- runtimeActivationOptIn: local-semantic-rerank
- actualLocalEmbeddingModelQualityValidated: true
- actualLocalEmbeddingModelQualified: false
- actualLocalRetrievalRobustnessValidated: false

## 목적

이 계획은 답변 품질을 먼저 측정하고, 그 근거로 RAG와 학습 기능을 단계적으로 개선하기 위한 개발 순서를 정한다. 지식 검색과 모델 학습을 한꺼번에 묶지 않는다. 최신 사실과 출처 문제는 RAG로, 반복되는 형식·판단·도구 사용 문제는 승인된 학습 데이터와 fine-tuning으로 다룬다.

기본 구현은 memory와 attachment를 lexical score, BM25 score, phrase boost score로 정렬한다. 검색 후보는 같은 저장 데이터를 바꾸지 않고 corpus record로 정규화되며, retrieval artifact는 source revision, chunk id, content hash, scope, provenance를 함께 남긴다. 명시적으로 local semantic mode를 켜면 같은 corpus를 operator-owned embedding command로 평가하고 deterministic semantic·lexical reranker를 거쳐 기존 retrieval item 형태로 provider에 전달한다. fact graph는 revision과 retirement 이력을 보존하며, learning candidate는 reviewer·approval·verification을 통과해야 promotion될 수 있다.

아직 구현되었다고 주장하지 않는 범위는 embedding index, vector database, 실제 local embedding model을 검증한 runtime 활성화, learned reranker, provider-specific submission adapter, local training runtime, 외부 fine-tuning 실행, model registry, production A/B rollout이다.

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

이 결과는 의도적으로 lexical overlap과 synonym relevance가 충돌하도록 만든 3개 fixture에만 적용된다. Experiment result 자체는 `runtimeActivation: false`이며 실제 local embedding model의 품질을 뜻하지 않는다. 이 contract를 사용하는 mission runtime opt-in은 R5에서 별도로 검증한다.

## 현재 retrieval reranking 실험

`src/core/retrieval-reranker.mjs`는 R3 semantic candidate의 cosine score와 현재 lexical retrieval score만 입력받아 고정 가중치로 다시 정렬한다. Semantic signal은 0.7, lexical signal은 0.3이며 각 contribution과 combined score를 결과에 남긴다. 원문과 attachment payload는 입력 계약에 없고 결과에도 복사하지 않는다.

Rollback은 별도 상태나 migration을 만들지 않는다. 각 candidate가 가진 semantic baseline rank를 보존하고, 결과의 `rollback.sourceKeys`에 기존 top-k 순서를 기록한다. Experiment result 자체는 `runtimeActivation: false`이며 R5 runtime에서는 mode를 `lexical`로 되돌려 같은 state-free rollback을 사용한다.

3개 controlled semantic-tie case의 측정 결과는 다음과 같다. 동의어 기반 semantic score가 같은 후보 중 exact lexical evidence가 있는 source를 다시 고르는 조건이며, 모든 값은 `npm run smoke:retrieval-reranking-experiment`로 재현한다.

| 실험 | precision@1 | recall@1 | noise@1 | case pass rate |
|---|---:|---:|---:|---:|
| fixture semantic tie baseline | 0.0 | 0.0 | 1.0 | 0.0 |
| deterministic semantic+lexical reranker | 1.0 | 1.0 | 0.0 | 1.0 |

같은 smoke는 실제 local embedding command의 case당 평균 시간과 순수 reranking 평균 시간을 함께 출력하고, reranking 시간이 semantic retrieval 시간보다 작은지 검사한다. 숫자는 실행 환경마다 달라 문서에 고정하지 않는다. learned reranker나 별도 local model은 도입하지 않았고, measured gain과 dependency 승인이 생기기 전까지 현재 deterministic baseline만 유지한다.

## 현재 local semantic retrieval runtime

`src/core/retrieval-runtime-service.mjs`는 기본 `lexical` mode에서 기존 `buildRetrievalContextWithCorpus` 결과를 그대로 반환한다. `PERSONAL_AI_AGENT_RETRIEVAL_MODE=semantic-rerank`와 local executable을 명시한 경우에만 R3 semantic scorer와 R4 deterministic reranker를 mission stage 앞에서 실행한다. Public API, CLI command, HTTP payload, store schema와 provider input의 retrieval item field는 바꾸지 않는다.

Runtime은 user, 현재 workspace, 현재 mission scope만 embedding 대상으로 허용한다. 다른 scope의 corpus가 하나라도 섞이면 provider prompt와 agent run을 만들기 전에 중단한다. Local command는 shell 없이 JSON stdin/stdout으로 실행되고 기존 environment allowlist, input/output size, dimension, timeout 제한을 그대로 사용한다. Command가 실패해도 lexical 결과로 조용히 대체하지 않으며 provider 실행 전에 오류를 반환한다.

```bash
export PERSONAL_AI_AGENT_RETRIEVAL_MODE=semantic-rerank
export PERSONAL_AI_AGENT_EMBEDDING_COMMAND=/path/to/local-embedding-command
export PERSONAL_AI_AGENT_EMBEDDING_ARGS_JSON='["--model","approved-model-id"]'
```

Command는 `personal-ai-agent-embedding/v1` JSON을 stdin으로 받고 같은 schema의 `modelId`, `dimensions`, `vectors`를 stdout으로 반환해야 한다. Argument는 shell string이 아니라 JSON string array로 전달한다.

Rollback은 `PERSONAL_AI_AGENT_RETRIEVAL_MODE=lexical`로 되돌리는 것이다. 별도 index, store migration, activation record를 만들지 않으므로 기본 결과는 기존 lexical runtime과 완전히 같다. `npm run smoke:semantic-retrieval-runtime`은 fixture command를 사용해 실제 mission lifecycle에서 semantic source가 먼저 전달되는지, lexical rollback artifact가 기존 형식인지, embedding 실패 뒤 prompt·retrieval artifact와 provider agent run이 생기지 않는지 확인한다.

이 smoke의 command는 deterministic concept fixture일 뿐 실제 ML embedding model이 아니다. Adapter가 child process의 network를 직접 차단하지 않으므로 실제 command의 binary provenance, model license·version, network isolation, resource limit은 R6 qualification evidence와 별도 owner review로 확인한다.

## 현재 local embedding model qualification

`scripts/ollama-embedding-command.mjs`는 R5 embedding protocol을 localhost Ollama `/api/embed`에 연결한다. Endpoint는 unauthenticated loopback HTTP origin만 허용하고 redirect와 임의 API path를 거부한다. Parent adapter의 shell 차단, environment allowlist, input·output·dimension·timeout 제한도 그대로 적용한다. 이 command는 remote provider나 model download를 호출하지 않는다.

`src/core/local-embedding-model-qualification.mjs`는 실제 local model inventory digest, size, format, dimension, 측정 시간, license text hash와 R3의 동일 3-case suite 결과를 묶는다. License 전문과 local model path는 evidence에 복사하지 않는다. 통과 모델이 있어도 license review, Ollama cloud feature 차단, egress isolation, resource envelope, rollback owner가 확인되기 전에는 activation을 허용하지 않는다.

현재 evidence는 이미 설치되어 있던 Ollama `0.23.0`과 qwen2.5 3종을 새 다운로드 없이 측정했다. 아래 값은 `npm run qualify:local-embedding-model -- --endpoint http://127.0.0.1:11500 --models qwen2.5:0.5b,qwen2.5:1.5b,qwen2.5:3b --output evidence/output-artifacts/local-embedding-model-qualification.json`로 생성한 해당 evidence에만 적용된다.

| 실제 local model | dimension | case pass rate | precision@1 | recall@1 | noise@1 | gate |
|---|---:|---:|---:|---:|---:|---|
| `qwen2.5:0.5b` | 896 | 0.6667 | 0.6667 | 0.6667 | 0.3333 | failed |
| `qwen2.5:1.5b` | 1536 | 0.6667 | 0.6667 | 0.6667 | 0.3333 | failed |
| `qwen2.5:3b` | 2048 | 1.0 | 1.0 | 1.0 | 0.0 | passed |

Gate는 품질을 통과한 모델 중 size가 가장 작은 `qwen2.5:3b`를 candidate로 골랐다. 그러나 local metadata의 license title은 `Qwen RESEARCH LICENSE AGREEMENT`이고 별도 owner review가 없으며, 측정 당시 Ollama cloud feature 차단과 OS-level egress isolation도 증명되지 않았다. Resource owner와 rollback owner 승인도 없다. 결과는 `governance-blocked`, `hold-for-governance`, `activation.authorized: false`다. 따라서 `actualLocalEmbeddingModelQualityValidated: true`이지만 `actualLocalEmbeddingModelQualified: false`, `productionReadyClaim: false`를 유지한다.

## 현재 retrieval robustness 평가

R6의 3개 synonym case는 작은 모델을 거르는 데에는 유효했지만, query 표현과 hard negative가 바뀌어도 품질이 유지되는지는 증명하지 못했다. R7은 `fixtures/retrieval-robustness-cases-v1.json`에 authentication recovery, payment refund, overdue owner handoff 3개 시나리오를 두고 각 시나리오를 canonical, paraphrase, noisy query, 한국어 cross-language, hard negative로 변형한다. 총 15개 case의 모든 source는 expected 또는 irrelevant로 명시한다.

`src/core/retrieval-robustness-evaluation.mjs`는 R6의 selected model digest, candidate evidence hash, qualification hash를 실제 측정 결과에 묶는다. Candidate는 현재 semantic score 0.7과 lexical score 0.3을 사용하는 reranker이고, 같은 case set의 lexical baseline보다 suite와 개별 case가 나빠지지 않아야 한다. Coverage matrix, 품질 결과, latency, model binding을 hash로 고정하며 query와 source 원문은 evidence에 복사하지 않는다.

이미 설치된 `qwen2.5:3b`를 `OLLAMA_NO_CLOUD=1` localhost runtime에서 새 다운로드 없이 실행한 결과는 다음과 같다. 재현 명령은 `npm run evaluate:local-retrieval-robustness -- --endpoint http://127.0.0.1:11500 --model qwen2.5:3b --cloud-features-disabled --output evidence/output-artifacts/local-retrieval-robustness.json`이다.

| 15-case 결과 | case pass rate | precision@1 | recall@1 | noise@1 |
|---|---:|---:|---:|---:|
| lexical baseline | 0.6667 | 0.6667 | 0.6667 | 0.3333 |
| qwen2.5:3b semantic+lexical candidate | 0.5333 | 0.5333 | 0.5333 | 0.4667 |

Candidate는 7개 case에서 실패했고 hard-negative 3개는 모두 실패했다. 기준을 낮추거나 fixture를 통과하도록 바꾸지 않는다. 결과는 `failed-keep-lexical`, `actualLocalRetrievalRobustnessValidated: false`, `activation.authorized: false`이며 기본 lexical runtime을 유지한다. Ollama cloud feature 차단은 실행 로그와 evidence에 기록했지만 OS-level network isolation은 아직 증명되지 않았다. 이 실패 기준선은 후속 embedding 전용 모델 또는 별도 local reranker가 같은 15-case suite를 통과해야 한다는 비교 근거다.

## 현재 승인 학습 데이터 record

`src/core/approved-training-record.mjs`는 기존 learning candidate를 자동으로 학습 자료로 바꾸지 않는다. Candidate가 `approved` 또는 `promoted`이고, local operator의 approve decision과 passed promotion verification, reviewer pass가 모두 연결된 경우에만 `personal-ai-agent-approved-training-record/v1` record를 만든다.

Candidate, mission, session, workspace, learning-candidate artifact, reviewer artifact, executor deliverable artifact의 id와 scope를 서로 대조한다. Record에는 artifact path나 원문을 복사하지 않고 id lineage와 lineage hash만 남긴다. 학습 문장은 별도로 검토한 `instruction`과 `response`만 받으며, API key·token·password 형태, JSON형 raw payload, customer·tenant 식별 field와 email을 다시 검사한다.

Accepted risk가 없으면 `null`로 기록한다. Accepted risk가 있으면 risk id, 승인자, 승인 시각, mission scope, 설명, record 생성 시각보다 뒤인 만료 시각이 모두 있어야 한다. 조건이 하나라도 빠지면 record를 만들지 않는다.

`npm run smoke:approved-training-record`는 실제 local CLI에서 stub mission을 실행하고 reviewer pass candidate를 만든 뒤 operator가 template target으로 승인한다. 이 state에서 deterministic record를 두 번 생성해 hash가 같은지 확인하고, store file이 바뀌지 않았는지 검사한다. Secret assignment, raw customer JSON, customer email fixture는 모두 차단한다.

이 record는 L2 local dataset build의 입력 후보일 뿐이다. `externalSubmissionAuthorized: false`, `fineTuningExecutionAuthorized: false`, `productionReadyClaim: false`를 유지하며 외부 fine-tuning 제출 권한을 만들지 않는다.

## 현재 dataset quality gate

`src/core/training-dataset-quality.mjs`는 승인 학습 record의 schema, approval, reviewer, safety, scope, content hash, lineage hash를 다시 확인한다. Record가 변조되었거나 외부 제출 권한을 켠 경우에는 manifest를 만들지 않는다. L1과 L2는 `src/core/training-content-safety.mjs`의 같은 secret·raw customer payload 판정을 사용한다.

검증을 통과한 record는 id 순으로 정렬한 뒤 content hash, lineage hash, normalized response 유사도 순으로 중복을 제거한다. Response 유사도는 별도 model 없이 lowercase·Unicode normalization·token Jaccard로 계산하며 기준은 `0.85`로 고정한다. 짧은 답변은 normalized text가 같을 때만 중복으로 본다.

Train·validation 분리는 명시한 seed와 mission scope를 사용한다. 같은 mission의 record는 항상 한 split에 함께 들어간다. 최종 leakage gate는 record id, content hash, lineage hash, mission scope, near-response가 양쪽에 겹치지 않는지 검사한다. 중복 제거 뒤 mission scope가 둘 미만이면 quality gate를 통과시키지 않는다.

Manifest에는 학습 문장을 복사하지 않고 record id, content·lineage hash, artifact lineage, scope, split만 남긴다. `npm run smoke:training-dataset-quality`는 실제 local CLI에서 stub mission 6건을 실행하고 reviewer·operator approval을 거쳐 record를 만든다. Exact content와 near-response 중복 2건을 제외한 뒤 입력 순서를 뒤집어도 같은 manifest가 생성되고 store가 바뀌지 않는지 확인한다.

이 manifest는 F1 local export review의 입력일 뿐이다. `externalSubmissionAuthorized: false`, `fineTuningExecutionAuthorized: false`, `productionReadyClaim: false`를 유지하며 JSONL export나 외부 fine-tuning 제출을 실행하지 않는다.

## 현재 fine-tuning readiness export

`src/core/fine-tuning-readiness.mjs`는 L2 manifest의 schema, hash, split count, leakage check, local-only flag를 다시 확인한다. Export 입력은 L2에 사용한 전체 approved record set이어야 하며, manifest의 train·validation entry와 record의 content hash, lineage hash, mission scope가 정확히 일치해야 한다. 누락되거나 manifest 밖의 record가 들어오면 export하지 않는다.

Train과 validation은 `personal-ai-agent-fine-tuning-example/v1` JSONL로 만든다. 각 line은 `user` instruction, `assistant` response, record id, content·lineage hash, record type, mission scope를 가진다. Format id는 `provider-neutral-conversation-jsonl-v1`이며 특정 provider upload schema나 submission request가 아니다. 실제 provider에 제출하려면 별도 adapter와 승인이 필요하다.

Evaluation manifest는 JSONL 원문을 복사하지 않는다. L2 dataset id·hash·seed, accepted-risk record id, Q1 answer-quality baseline의 case별 status·metric·threshold·hash, export file digest, review checklist, rollback 기준을 묶는다. Reviewer decision과 rollback owner는 아직 `pending`·`null`이다. Provider account, model pin, budget limit, data transfer approval, rollback owner가 모두 기록되기 전에는 제출할 수 없다.

`npm run smoke:fine-tuning-readiness`는 실제 local CLI에서 stub mission 6건을 reviewer·operator approval까지 실행하고 L2 manifest를 만든다. Q1 fixture를 같은 실행에서 평가한 뒤 train 3줄, validation 1줄 JSONL과 evaluation manifest를 임시 디렉터리에 기록하고 다시 읽는다. 입력 순서를 뒤집어도 digest가 같고 store가 바뀌지 않는지 확인한다.

이 단계는 dataset과 baseline을 사람이 검토할 수 있게 만든 readiness packet이다. `externalSubmissionAuthorized: false`, `fineTuningExecutionAuthorized: false`, `productionReadyClaim: false`이며 모델 학습, provider upload, 비용 발생, model id 생성은 수행하지 않는다.

## 현재 candidate model evaluation gate

`src/core/candidate-model-evaluation.mjs`는 candidate 결과를 직접 생성하거나 모델을 호출하지 않는다. F1 readiness packet의 JSONL digest, evaluation manifest hash, Q1 baseline hash, review·rollback 경계를 다시 계산하고, 같은 answer-quality case set과 같은 threshold로 만들어진 candidate evaluation result만 비교한다.

Candidate evidence는 `fixture-simulated`와 `recorded-model-evaluation`을 구분한다. Fixture는 `actualModelEvaluated: false`, recorded result는 `actualModelEvaluated: true`여야 하며 candidate id, provider, model id, evaluation run id, timestamp, dataset hash, readiness hash, evaluation hash, evidence reference를 모두 요구한다. 어떤 evidence도 스스로 rollout 권한을 만들 수 없다.

비교는 suite와 case 각각에서 retrieval hit, expected citation, citation grounding, required term coverage가 낮아지지 않았는지 검사한다. Unsupported citation, forbidden source, forbidden term은 늘어나면 안 된다. Case set, threshold, reviewer verdict, result hash가 달라도 실패한다. 실패 결과는 `rollback-required`, `keep-baseline`으로 고정한다.

비교를 통과해도 결과는 `ready-for-review`, `hold-for-review`이다. Rollout은 `activationAuthorized: false`, reviewer decision `pending`, rollback owner `null`로 계속 차단한다. Fixture candidate는 실제 모델 평가가 아니므로 actual-model check도 실패 상태로 남는다.

`npm run smoke:candidate-model-evaluation`은 실제 local CLI approval lifecycle로 F1 packet을 재생성한 뒤 Q1 두 case의 fixture candidate를 비교한다. Pass path와 의도적 citation·required-term·reviewer regression을 각각 JSON file로 기록하고 다시 읽으며, 원문 미포함과 store 불변을 확인한다.

## 개발 순서

| 단계 | 상태 | 비용 없는 구현 | 완료 기준 |
|---|---|---|---|
| Q1 Answer quality foundation | 완료 | 순수 evaluator, fixture, unit test, deterministic smoke | passing baseline과 의도적 regression을 모두 판정 |
| R1 Corpus contract | 완료 | memory·attachment·fact source의 chunk id, content hash, revision, scope, provenance 계약 통일 | 저장 형식과 retrieval payload 변경 없이 동일 index record 재생성 |
| R2 Retrieval evaluation | 완료 | 3개 fixture, precision·recall·noise·source diversity 기준, 현재 lexical·BM25·phrase baseline과 per-case regression 비교 | ranking candidate가 자체 gate와 frozen baseline을 모두 통과할 때만 반영 |
| R3 Optional semantic retrieval | 완료 | provider-neutral embedding contract, bounded local command adapter, scope-locked cosine experiment, controlled synonym comparison | 새 dependency와 runtime 활성화 없이 local protocol·quality gain·rollback boundary 검증 |
| R4 Reranking | 완료 | semantic 0.7·lexical 0.3 deterministic feature baseline, controlled tie comparison, latency measurement, state-free rollback order | runtime 변경 없이 품질·latency·rollback 비교 자료 확보 |
| R5 Local semantic runtime opt-in | 완료 | explicit local command mode, mission scope lock, semantic·lexical reranking, lexical default와 state-free rollback | fixture mission lifecycle에서 semantic 선택, exact lexical parity, failure-before-provider 검증 |
| R6 Local embedding model qualification | 완료 | loopback Ollama command, actual installed model comparison, digest·license hash·quality evidence, governance decision gate | qwen2.5 3종 same-suite 측정, 3B quality pass, activation governance-blocked와 lexical rollback 유지 |
| R7 Retrieval robustness evaluation | 완료 | 3개 scenario와 5개 query variation의 15-case suite, actual model binding, content-free integrity evidence | qwen2.5:3b candidate 회귀를 failed-keep-lexical로 고정하고 quality threshold·activation 차단 유지 |
| L1 승인된 학습 데이터 | 완료 | approved promotion, reviewer pass, verification, artifact lineage, sanitized example을 묶은 deterministic record | raw secret·customer payload 차단, mission scope와 content·lineage hash 보존 |
| L2 Dataset quality gate | 완료 | content·lineage·near-response 중복 제거, mission scope 분리, seeded train·validation split, leakage 검사 | 동일 seed와 입력에서 동일 content-free manifest 생성 |
| F1 Fine-tuning readiness | 완료 | provider-neutral JSONL export, Q1 baseline summary, content-free evaluation manifest 생성 | 학습 실행 없이 dataset과 baseline을 reviewer가 검토 가능 |
| F2 외부 fine-tuning 실행 | 외부 작업 | 승인된 provider·budget·model이 있을 때 별도 adapter로 제출 | 명시 승인, 비용 한도, model id, 결과, rollback 기록 |
| O1a Candidate evaluation gate | 완료 | F1 packet과 같은 Q1 suite에서 fixture·recorded candidate result의 품질·증적·권한·rollback 판정 | 회귀 시 keep-baseline, 통과 시 rollout 없이 reviewer 대기 |
| O1b Model rollout | 외부 작업 | 실제 trained candidate model과 baseline을 같은 target fixture·runtime에서 비교하고 승인된 rollout 실행 | 실제 모델 증적·reviewer·rollback owner·activation 승인 없으면 중단 |

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
node --test test/retrieval-runtime-service.test.mjs
node --test test/loopback-json-client.test.mjs test/local-embedding-model-qualification.test.mjs
node --test test/retrieval-robustness-evaluation.test.mjs
node --test test/approved-training-record.test.mjs
node --test test/training-dataset-quality.test.mjs
node --test test/fine-tuning-readiness.test.mjs
node --test test/candidate-model-evaluation.test.mjs
npm run smoke:answer-quality-evaluation
npm run smoke:retrieval-corpus-contract
npm run smoke:retrieval-quality-evaluation
npm run smoke:semantic-retrieval-experiment
npm run smoke:retrieval-reranking-experiment
npm run smoke:semantic-retrieval-runtime
npm run smoke:local-embedding-model-qualification
npm run smoke:local-retrieval-robustness
npm run smoke:approved-training-record
npm run smoke:training-dataset-quality
npm run smoke:fine-tuning-readiness
npm run smoke:candidate-model-evaluation
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

현재 안전하게 말할 수 있는 범위는 credential-free fixture가 retrieval hit, source citation, citation grounding, required content, unsupported citation, forbidden source와 reviewer verdict를 deterministic하게 검사하고, memory·attachment·fact source에서 동일한 corpus identity와 provenance를 재생성하며, controlled retrieval case에서 lexical baseline, local-command semantic experiment, deterministic semantic+lexical reranker를 같은 quality evaluator로 비교하고, 명시적 fixture command를 mission runtime에 연결해 scope 거부·lexical rollback·failure-before-provider를 재현하며, 실제 설치된 qwen2.5 3종을 같은 3-case suite로 측정한 뒤 selected 3B를 15개 query variation에 다시 평가해 lexical보다 낮은 결과와 keep-lexical 결정을 고정하고, 실제 local approval lifecycle에서 sanitized training record를 만든 뒤 중복 제거, mission-scope split, leakage 검사를 통과한 dataset을 provider-neutral JSONL과 reviewer evaluation manifest로 재생성하고 fixture candidate result의 non-regression과 rollback decision을 판정한다는 것이다.

이 결과는 qwen2.5 3B의 runtime 활성화를 지지하지 않으며 learned reranker 성능, 실제 trained candidate model 평가, 일반적인 답변 정확도, fine-tuning 효과, production RAG 품질, 고객 업무 성과를 증명하지 않는다. Embedding 전용 모델 또는 local relevance reranker의 같은-suite 통과, local model license 승인, OS-level egress isolation, resource·rollback owner 승인, provider-specific adapter, local training runtime, 외부 fine-tuning 실행, model registry, 실제 model rollout은 아직 완료되지 않았으며 `productionReadyClaim: false`는 모든 단계에서 유지한다.
