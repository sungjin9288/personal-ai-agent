# ML, RAG, and Fine-tuning Development Plan v1

- status: local-synthetic-answer-quality-payload-replay-current
- currentCostFreeMilestone: private-reviewed-example-canonical-record-materialization
- completedMilestones:
  - status: local-answer-input-boundary-current
- productionReadyClaim: false
- costFreeDefault: true
- externalProviderCalls: none
- paidCloudExecution: none
- currentActualUserQueryEvaluationRunbook: `docs/actual-user-query-evaluation-v1.md`
- currentFixture: `fixtures/answer-quality-cases-v1.json`
- currentCorpusFixture: `fixtures/retrieval-corpus-cases-v1.json`
- currentRetrievalFixture: `fixtures/retrieval-quality-cases-v1.json`
- currentSemanticFixture: `fixtures/semantic-retrieval-cases-v1.json`
- currentRerankingFixture: `fixtures/reranking-cases-v1.json`
- currentRobustnessFixture: `fixtures/retrieval-robustness-cases-v1.json`
- currentTrainingFixture: `fixtures/approved-training-record-cases-v1.json`
- currentDatasetFixture: `fixtures/training-dataset-quality-cases-v1.json`
- currentReadinessFixture: `fixtures/fine-tuning-readiness-cases-v1.json`
- currentFineTuningDataSufficiencyEvidence: `evidence/output-artifacts/fine-tuning-data-sufficiency.json`
- fineTuningDataSufficiencyStatus: insufficient-data
- currentFineTuningDataCollectionPlanEvidence: `evidence/output-artifacts/fine-tuning-data-collection-plan.json`
- fineTuningDataCollectionPlanStatus: reviewed-data-collection-required
- currentFineTuningDataIntakeRequestEvidence: `evidence/output-artifacts/fine-tuning-data-intake-request.json`
- fineTuningDataIntakeRequestStatus: pending-owner-review
- currentFineTuningDataIntakeResolutionSurface: `scripts/resolve-fine-tuning-data-intake.mjs`
- fineTuningDataIntakeResolutionStatus: protocol-ready-owner-decision-not-recorded
- currentFineTuningPrivateCollectionPlanSurface: `scripts/plan-fine-tuning-private-collection.mjs`
- fineTuningPrivateCollectionPlanStatus: protocol-ready-execution-approval-required
- currentFineTuningPrivateCollectionExecutionRequestSurface: `scripts/request-fine-tuning-private-collection-execution.mjs`
- fineTuningPrivateCollectionExecutionRequestStatus: protocol-ready-owner-review-required
- currentFineTuningPrivateCollectionExecutionResolutionSurface: `scripts/resolve-fine-tuning-private-collection-execution.mjs`
- fineTuningPrivateCollectionExecutionResolutionStatus: protocol-ready-private-decision-required
- currentFineTuningPrivateCollectionWorkspaceSurface: `scripts/prepare-fine-tuning-private-collection-workspace.mjs`
- fineTuningPrivateCollectionWorkspaceStatus: protocol-ready-private-workspace-preparation-required
- currentFineTuningPrivateCollectionItemAdmissionSurface: `scripts/admit-fine-tuning-private-collection-item.mjs`
- fineTuningPrivateCollectionItemAdmissionStatus: protocol-ready-content-free-envelope-admission-required
- currentFineTuningPrivateCollectionItemWriteSurface: `scripts/write-fine-tuning-private-collection-item.mjs`
- fineTuningPrivateCollectionItemWriteStatus: protocol-ready-sanitized-synthetic-item-write-required
- currentFineTuningPrivateCollectionItemLifecycleSurface: `scripts/lifecycle-fine-tuning-private-collection-item.mjs`
- fineTuningPrivateCollectionItemLifecycleStatus: protocol-ready-private-withdrawal-or-retention-delete-required
- currentFineTuningPrivateCollectionItemReviewProjectionSurface: `scripts/project-fine-tuning-private-collection-item-review.mjs`
- fineTuningPrivateCollectionItemReviewProjectionStatus: protocol-ready-private-item-review-projection-required
- currentFineTuningPrivateCollectionItemReviewResolutionSurface: `scripts/resolve-fine-tuning-private-collection-item-review.mjs`
- fineTuningPrivateCollectionItemReviewResolutionStatus: protocol-ready-private-owner-resolution-required
- currentFineTuningPrivateCollectionItemArtifactRequestSurface: `scripts/request-fine-tuning-private-collection-item-artifact.mjs`
- fineTuningPrivateCollectionItemArtifactRequestStatus: protocol-ready-private-artifact-preparation-request-required
- currentFineTuningPrivateAnswerQualityEnrichmentCandidateSurface: `scripts/prepare-fine-tuning-private-answer-quality-enrichment-candidate.mjs`
- fineTuningPrivateAnswerQualityEnrichmentCandidateStatus: protocol-ready-private-review-required
- currentFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionSurface: `scripts/resolve-fine-tuning-private-answer-quality-enrichment-candidate-review.mjs`
- fineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionStatus: protocol-ready-private-reviewer-decision-required
- currentFineTuningPrivateAnswerQualityCaseSurface: `scripts/materialize-fine-tuning-private-answer-quality-case.mjs`
- fineTuningPrivateAnswerQualityCaseStatus: protocol-ready-private-q1-materialization-required
- currentFineTuningPrivateAnswerQualityCasePayloadSurface: `scripts/materialize-fine-tuning-private-answer-quality-case-payload.mjs`
- fineTuningPrivateAnswerQualityCasePayloadStatus: protocol-ready-owner-payload-decision-required
- currentFineTuningPrivateAnswerQualityCaseReplaySurface: `scripts/replay-fine-tuning-private-answer-quality-case-payload.mjs`
- fineTuningPrivateAnswerQualityCaseReplayStatus: protocol-ready-local-operator-replay-request-required
- minimumAdditionalReviewedExamples: 16
- reviewedExampleCollectionAuthorized: false
- operatorAttestationRecorded: false
- ownerDecisionRecorded: false
- ownerIdentityVerified: false
- dataHandlingEvidenceRecorded: false
- dataHandlingEvidenceReferencesRecorded: false
- privateCollectionPlanAllowed: false
- collectionExecutionApprovalRequestCreated: false
- collectionExecutionApprovalResolved: false
- privateCollectionWorkspaceCreationAuthorized: false
- privateCollectionWorkspacePrepared: false
- collectionStarted: false
- collectionExecutionAuthorized: false
- candidateTrainingReviewAllowed: false
- productionQualityThresholdClaim: false
- currentCandidateFixture: `fixtures/candidate-model-evaluation-cases-v1.json`
- currentFeedbackQualityFixture: `fixtures/approved-learning-feedback-quality-cases-v1.json`
- currentWorkspacePersonalizationFixture: `fixtures/workspace-learning-personalization-cases-v1.json`
- currentWorkspaceConflictFixture: `fixtures/workspace-learning-conflict-revocation-cases-v1.json`
- currentWorkspaceOverrideFixture: `fixtures/workspace-learning-operator-override-cases-v1.json`
- currentLocalUserPersonalizationFixture: `fixtures/local-user-learning-personalization-cases-v1.json`
- currentUserConflictFixture: `fixtures/user-learning-conflict-revocation-cases-v1.json`
- currentUserOverrideFixture: `fixtures/user-learning-operator-override-cases-v1.json`
- currentUserOperatorSurfaceEvidence: `evidence/output-artifacts/user-learning-operator-surface.json`
- currentLocalTrainingRuntimeEvidence: `evidence/output-artifacts/local-training-runtime-contract.json`
- currentLocalTrainingPermissionEvidence: `evidence/output-artifacts/local-training-permission-surface.json`
- currentLocalTrainingEnvironmentPreflightEvidence: `evidence/output-artifacts/local-training-environment-preflight.json`
- actualLocalTrainingEnvironmentPreflightValidated: true
- currentLocalTrainingToolchainDecisionEvidence: `evidence/output-artifacts/local-training-toolchain-decision.json`
- actualLocalTrainingToolchainDecisionValidated: true
- currentLocalTrainingAcquisitionRequestEvidence: `evidence/output-artifacts/local-training-acquisition-request.json`
- currentLocalTrainingAcquisitionResolutionSurface: `scripts/resolve-local-training-acquisition.mjs`
- currentLocalTrainingAcquisitionExecutionPlanSurface: `scripts/plan-local-training-acquisition-execution.mjs`
- currentLocalTrainingAcquisitionRuntimeEvidence: `evidence/output-artifacts/local-training-acquisition-runtime-contract.json`
- actualLocalTrainingAcquisitionRuntimeContractValidated: true
- currentLocalTrainingAcquisitionArtifactVerificationEvidence: `evidence/output-artifacts/local-training-acquisition-artifact-verification.json`
- actualLocalTrainingAcquisitionArtifactVerificationValidated: true
- currentLocalTrainingPostAcquisitionReadinessEvidence: `evidence/output-artifacts/local-training-post-acquisition-readiness.json`
- actualLocalTrainingPostAcquisitionReadinessValidated: true
- actualLocalTrainingExecutionAdmissionValidated: true
- currentMlxLmLoraTrainingAdapterEvidence: `evidence/output-artifacts/mlx-lm-lora-training-adapter.json`
- actualMlxLmLoraAdapterContractValidated: true
- currentLocalTrainingFailureRecoveryEvidence: `evidence/output-artifacts/local-training-failure-recovery.json`
- actualLocalTrainingFailureRecoveryValidated: true
- currentLocalTrainingRuntimeClosureProvenanceEvidence: `evidence/output-artifacts/local-training-runtime-closure-provenance.json`
- staticRuntimeClosureValidated: true
- dynamicRuntimeClosureComplete: false
- nativeClosureComplete: false
- verifyToExecClosed: false
- currentLocalTrainingProcessSupervisorEvidence: `evidence/output-artifacts/local-training-process-supervisor.json`
- processGroupLifecycleValidated: true
- permissionRevocationMonitoringValidated: true
- currentLocalTrainingOsIsolationEvidence: `evidence/output-artifacts/local-training-os-isolation.json`
- actualDarwinFixtureNetworkDenyEnforced: true
- actualDarwinFixtureResourceLimitsEnforced: true
- actualMlxMemoryLimitEnforced: false
- actualMlxOsIsolationIntegrated: false
- currentLocalTrainingRuntimeExecObservationEvidence: `evidence/output-artifacts/local-training-runtime-exec-observation.json`
- actualDarwinFixtureRuntimeImageSetObserved: true
- actualDarwinFixtureExecutableIdentityObserved: true
- actualMlxRuntimeImageSetObserved: false
- currentLocalTrainingRuntimeImageProvenanceEvidence: `evidence/output-artifacts/local-training-runtime-image-provenance.json`
- actualDarwinFixtureRuntimeImageProvenanceValidated: true
- actualDarwinFixtureRegularRuntimeImageBytesVerified: true
- actualDarwinFixtureSharedCacheImageIdentityVerified: true
- actualMlxNativeRuntimeClosureValidated: false
- mlxProcessSupervisorIntegrated: false
- actualMlxProcessSpawned: false
- currentLocalTrainingCandidateArtifactVerificationEvidence: `evidence/output-artifacts/local-training-candidate-artifact-verification.json`
- actualLocalTrainingCandidateArtifactVerificationValidated: true
- currentLocalCandidateEvaluationAdmissionEvidence: `evidence/output-artifacts/local-candidate-evaluation-admission.json`
- actualLocalCandidateEvaluationAdmissionValidated: true
- currentLocalCandidateEvaluationRuntimeEvidence: `evidence/output-artifacts/local-candidate-evaluation-runtime.json`
- currentLocalCandidateEvaluationHostRestartRehearsalEvidence: `evidence/output-artifacts/local-candidate-evaluation-host-restart-rehearsal.json`
- currentLocalCandidateEvaluationHostRestartReceiptEvidence: `evidence/output-artifacts/local-candidate-evaluation-host-restart-receipt.json`
- actualLocalCandidateEvaluationRuntimeValidated: true
- actualLocalCandidateEvaluationInputViewValidated: true
- actualLocalCandidateEvaluatorProvenanceValidated: true
- actualLocalCandidateEvaluationPreSpawnRecoveryValidated: true
- actualLocalCandidateEvaluationProcessLifecycleValidated: true
- localCandidateEvaluationHostRestartRehearsalProtocolValidated: true
- actualHostRestartReceiptRecorded: true
- trackedProjectionContractValidated: true
- actualHostRestartObserved: true
- actualArtifactSetsObserved: false
- actualCandidateArtifactsObserved: false
- actualPostInstallProductPermissionApproved: false
- actualLocalTrainingAcquisitionApproved: false
- currentLocalAnswerQualityBaselineEvidence: `evidence/output-artifacts/local-answer-quality-baseline.json`
- currentLocalAnswerCompositionCandidateEvidence: `evidence/output-artifacts/local-answer-composition-candidate.json`
- currentAnswerCompositionRobustnessFixture: `fixtures/answer-composition-robustness-cases-v1.json`
- currentLocalAnswerCompositionRobustnessEvidence: `evidence/output-artifacts/local-answer-composition-robustness.json`
- currentLocalAnswerCompositionHardeningEvidence: `evidence/output-artifacts/local-answer-composition-hardening.json`
- currentAnswerInputBoundaryFixture: `fixtures/answer-input-boundary-cases-v1.json`
- currentAnswerInputBoundaryEvidence: `evidence/output-artifacts/answer-input-boundary-evaluation.json`
- currentLocalAnswerCompositionBoundaryRegressionEvidence: `evidence/output-artifacts/local-answer-composition-boundary-regression.json`
- currentUserQueryEvaluationIntakeFixture: `fixtures/user-query-evaluation-intake-dry-run-v1.json`
- currentUserQueryEvaluationIntakeEvidence: `evidence/output-artifacts/user-query-evaluation-intake.json`
- currentLocalUserQueryQualityEvidence: `evidence/output-artifacts/local-user-query-quality.json`
- currentReviewActionGeneralizationEvidence: `evidence/output-artifacts/local-answer-review-action-generalization.json`
- runtimeActivationDefault: false
- runtimeActivationOptIn: local-semantic-rerank
- actualLocalEmbeddingModelQualityValidated: true
- actualLocalEmbeddingModelQualified: false
- actualLocalRetrievalRobustnessValidated: false
- actualLocalRelevanceRerankerQualityValidated: true
- actualLocalRelevanceRerankerQualified: false
- actualLocalRerankerResourceEnvelopeValidated: true
- actualLocalRerankerResourceEnvelopeQualified: false
- actualLocalRerankerRuntimeStabilityValidated: true
- actualLocalRerankerRuntimeStabilityQualified: false
- actualLocalRelevanceShadowIntegrationValidated: true
- actualLocalRelevanceShadowIntegrationQualified: false
- actualLocalRelevanceShadowReplayValidated: true
- actualLocalRelevanceShadowReplayQualified: false
- actualLocalRelevanceShadowCacheValidated: true
- actualLocalRelevanceShadowCacheQualified: false
- actualLocalRelevanceShadowCacheLifecycleValidated: true
- actualLocalRelevanceShadowCacheLifecycleQualified: false
- actualLocalRelevanceShadowCacheProcessIsolationValidated: true
- actualLocalRelevanceShadowCacheProcessIsolationQualified: false
- actualLocalRelevanceShadowCacheTerminationSoakValidated: true
- actualLocalRelevanceShadowCacheTerminationSoakQualified: false
- actualApprovedLearningRagFeedbackValidated: true
- actualApprovedLearningFeedbackQualityValidated: true
- actualWorkspaceLearningPersonalizationValidated: true
- actualWorkspaceLearningConflictRevocationValidated: true
- actualWorkspaceLearningOperatorOverrideValidated: true
- actualWorkspaceLearningOperatorSurfaceValidated: true
- actualLocalUserScopedPersonalizationValidated: true
- actualUserLearningConflictRevocationValidated: true
- actualUserLearningOperatorOverrideValidated: true
- actualLocalTrainingRuntimeContractValidated: true
- actualLocalTrainingPermissionSurfaceValidated: true
- actualLocalTrainingPermissionBrowserValidated: true
- actualLocalAnswerModelQualityValidated: false
- actualLocalAnswerModelQualified: false
- adversarialInputBoundaryValidated: true
- actualUserQueryData: false
- actualUserQueryQualityValidated: false
- syntheticUserQueryQualityValidated: false
- localUserQueryEvaluationValidated: false
- candidateQualityValidated: true
- currentAnswerPathChanged: false
- actualModelTrainingExecuted: false

## 목적

이 계획은 답변 품질을 먼저 측정하고, 그 근거로 RAG와 학습 기능을 단계적으로 개선하기 위한 개발 순서를 정한다. 지식 검색과 모델 학습을 한꺼번에 묶지 않는다. 최신 사실과 출처 문제는 RAG로, 반복되는 형식·판단·도구 사용 문제는 승인된 학습 데이터와 fine-tuning으로 다룬다.

기본 구현은 memory와 attachment를 lexical score, BM25 score, phrase boost score로 정렬한다. 검색 후보는 같은 저장 데이터를 바꾸지 않고 corpus record로 정규화되며, retrieval artifact는 source revision, chunk id, content hash, scope, provenance를 함께 남긴다. 명시적으로 local semantic mode를 켜면 같은 corpus를 operator-owned embedding command로 평가하고 deterministic semantic·lexical reranker를 거쳐 기존 retrieval item 형태로 provider에 전달한다. fact graph는 revision과 retirement 이력을 보존하며, learning candidate는 reviewer·approval·verification을 통과해야 promotion될 수 있다.

아직 구현되었다고 주장하지 않는 범위는 embedding index, vector database, 실제 local embedding model과 relevance reranker의 provider-input 활성화, retrieval 전용 학습 reranker, provider-specific submission adapter, 실제 local model training 실행, 외부 fine-tuning 실행, model registry, production A/B rollout이다.

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

## 현재 local relevance reranker 평가

R8은 새 모델을 받지 않고 이미 설치된 `qwen2.5:3b`의 structured generation을 relevance scorer로 평가한다. `src/core/ollama-relevance-scorer.mjs`는 query와 document를 untrusted JSON으로 분리하고, source마다 독립적으로 0~100 relevance score 하나만 생성한다. Batch 선택을 사용하지 않으므로 source 입력 순서가 ranking에 영향을 주지 않는다. `src/core/local-relevance-reranker.mjs`는 score가 같을 때만 기존 lexical rank를 유지하고 결과에 source identity와 score만 남긴다.

평가는 R7의 동일 15-case fixture와 model digest·qualification hash·prior evaluation hash를 사용한다. 각 query-source pair를 고정 prompt와 seed로 두 번 실행하고, 두 번의 score와 최종 순위가 모두 같아야 한다. 총 30번의 rerank pass에서 90번의 localhost model inference가 실행되며, query·document·model response 원문은 `evidence/output-artifacts/local-relevance-reranker-evaluation.json`에 기록하지 않는다.

재현 명령은 `npm run evaluate:local-relevance-reranker -- --endpoint http://127.0.0.1:11500 --model qwen2.5:3b --cloud-features-disabled --output evidence/output-artifacts/local-relevance-reranker-evaluation.json`이다. 측정 latency는 실행 환경에 따라 달라지므로 해당 evidence와 command output에서 확인한다.

| 동일 15-case 결과 | case pass rate | precision@1 | recall@1 | noise@1 | hard-negative pass rate |
|---|---:|---:|---:|---:|---:|
| lexical baseline | 0.6667 | 0.6667 | 0.6667 | 0.3333 | 0.0 |
| R7 semantic+lexical candidate | 0.5333 | 0.5333 | 0.5333 | 0.4667 | 0.0 |
| R8 independent local relevance candidate | 1.0 | 1.0 | 1.0 | 0.0 | 1.0 |

R8 candidate는 같은 controlled suite에서 품질을 통과했고 반복 score도 일치했다. 그러나 이 결과는 runtime activation이 아니다. `quality-passed-governance-blocked`, `actualLocalRelevanceRerankerQualityValidated: true`, `actualLocalRelevanceRerankerQualified: false`, `activation.authorized: false`를 유지한다. Model license, OS-level egress isolation, 승인된 resource limit, rollback owner 승인과 mission runtime 통합이 완료되지 않았기 때문이다. 기본 runtime은 계속 lexical이고 state migration은 없다.

## 현재 local reranker resource envelope

R9은 R8 scorer와 prompt, model digest, fixture, quality evidence를 그대로 사용하면서 model 호출 전에 lexical baseline 상위 후보만 남기는 evaluation-only shortlist를 검증한다. `src/core/local-relevance-candidate-selector.mjs`는 baseline rank 순서로 후보를 고르고 원본을 수정하지 않는다. `src/core/local-relevance-benchmark.mjs`는 모든 case의 expected source가 shortlist에 남는지 먼저 확인하며, 하나라도 빠지면 scorer를 호출하기 전에 중단한다.

현재 15-case fixture에서 expected source의 최대 lexical rank는 2다. Top-1은 10/15 case만 보존하므로 거부되고, top-2는 15/15를 보존한다. 재현 명령은 `npm run evaluate:local-reranker-resource-envelope -- --endpoint http://127.0.0.1:11500 --model qwen2.5:3b --cloud-features-disabled --output evidence/output-artifacts/local-reranker-resource-envelope.json`이다.

| 실제 반복 평가 | 후보/query | model inference | p50 | p95 | maximum | total |
|---|---:|---:|---:|---:|---:|---:|
| R8 full scan | 3 | 90 | 1361.242ms | 1425.321ms | 1462.735ms | 40519.109ms |
| R9 lexical top-2 | 2 | 60 | 835.456ms | 924.449ms | 1643.582ms | 26189.347ms |

R9은 inference를 33.33%, p50을 38.63%, p95를 35.14%, total을 35.37% 줄이면서 15-case와 hard-negative 3/3 품질, source-order 반복 안정성을 유지했다. 반면 maximum 관측치는 R8보다 커졌으므로 최악 지연 개선을 주장하지 않는다. 같은 실행의 read-only Ollama `/api/ps` snapshot은 model artifact `1,929,912,432 bytes`, loaded model과 loaded VRAM 각각 `2,390,300,672 bytes`, context length `4096`를 기록했다.

이 결과는 한 로컬 환경의 단일 반복 평가다. 승인된 memory/VRAM 한도, cold-start, sustained concurrency, thermal envelope, OS-level egress isolation, license, rollback owner와 runtime integration은 아직 검증되지 않았다. 따라서 `resource-envelope-passed-governance-blocked`, `actualLocalRerankerResourceEnvelopeValidated: true`, `actualLocalRerankerResourceEnvelopeQualified: false`, `runtimeActivation: false`, `productionReadyClaim: false`를 유지한다. Rollback은 R8 full scan, 그다음 lexical 순서이며 state migration은 없다.

## 현재 local reranker runtime stability

R10은 R9 shortlist와 model·prompt·fixture·quality binding을 바꾸지 않고 cold load, warm 반복, bounded client concurrency를 실제 localhost Ollama에서 측정한다. 시작 시 `/api/ps`에서 model이 없음을 확인하고, cold 1회, warm 3회, concurrent client worker 2회의 고정 6-run contract를 실행한다. 여기서 cold는 Ollama loaded-model absence를 뜻하며 OS page cache 초기화나 Ollama process restart를 포함한 machine-cold boot는 아니다. 각 run은 15-case를 두 번 평가해 60 inference를 사용하며 전체는 360 inference와 180 rerank pass다.

재현 명령은 `npm run evaluate:local-reranker-runtime-stability -- --endpoint http://127.0.0.1:11500 --model qwen2.5:3b --cloud-features-disabled --output evidence/output-artifacts/local-reranker-runtime-stability.json`이다. Gate는 모든 run의 R9 품질·shortlist·resource parity, warm p95 drift 25% 이하, warm aggregate p95가 R9의 1.25배 이하, concurrent aggregate p95가 warm의 2.5배 이하를 요구한다. 이 비율은 production SLO가 아니라 bounded regression stop condition이다.

| 실제 R10 측정 | run/inference | p50 | p95 | maximum | 추가 근거 |
|---|---:|---:|---:|---:|---|
| cold | 1 / 60 | 992.903ms | 1109.477ms | 2674.905ms | 첫 pass 2674.905ms, model absence 확인 후 load 포함 |
| warm | 3 / 180 | 965.351ms | 1012.010ms | 1063.229ms | run별 p95 1009.883, 1026.377, 1003.220ms; drift -0.66% |
| concurrent client workers | 2 / 120 | 1496.894ms | 1580.944ms | 1619.656ms | batch wall 45247.260ms, warm p95의 1.5622배 |

6개 run은 모두 R9의 15-case와 hard-negative 3/3 결과, source-order 반복 안정성, top-2 expected-source coverage를 유지했다. Loaded model과 VRAM snapshot도 모든 run에서 각각 `2,390,300,672 bytes`로 같았다. Warm aggregate p95는 R9 단일 run보다 9.47% 높았으므로 단일 측정의 개선 수치를 지속 성능으로 확대 해석하지 않는다.

결과는 `bounded-runtime-stability-passed-governance-blocked`, `actualLocalRerankerRuntimeStabilityValidated: true`다. 그러나 client worker 2개가 요청을 겹쳐 보냈다는 사실만 증명하며 production server parallelism은 `not-proven`이다. 승인된 cold-start SLO·concurrency limit, long-duration soak, thermal telemetry, OS-level egress isolation, license와 rollback owner가 남아 있다. 따라서 `actualLocalRerankerRuntimeStabilityQualified: false`, `productionSustainedConcurrencyValidated: false`, `thermalEnvelopeValidated: false`, `runtimeActivation: false`, `productionReadyClaim: false`를 유지한다. Rollback은 R9 shortlist, R8 full scan, lexical 순서다.

## 현재 local relevance shadow integration

R11은 R10에서 검증한 model digest, scorer id, prompt version·hash, resource envelope와 runtime stability hash를 그대로 묶어 실제 mission lifecycle에 연결한다. 연결 방식은 activation이 아니라 shadow comparison이다. `createMissionService`에 명시적으로 주입한 retrieval runtime이 기존 lexical 결과의 상위 두 source만 local scorer로 비교하고, provider에는 처음 만든 lexical 객체를 그대로 반환한다. 기본 환경 factory는 이 mode를 열지 않는다.

관측 record에는 query, memory, attachment 본문을 저장하지 않는다. Mission·workspace·source key, query, candidate content와 lexical 반환값은 SHA-256으로만 남기고 role, 순위, latency, scorer binding을 기록한다. Scorer나 observation writer가 실패해도 `failed-lexical-preserved`로 끝나며 provider path는 계속 lexical이다. Store, public API, CLI, HTTP payload, permission, audit event에는 shadow field를 추가하지 않는다.

실제 `OLLAMA_NO_CLOUD=1` loopback Ollama 0.23.0과 `qwen2.5:3b`를 controlled authentication-recovery mission에 연결했다. Stub provider mission은 manager, planner, executor, reviewer 네 단계를 완료했고 각 단계에서 top-2 candidate를 비교했다. 네 관측 모두 expected procedure source를 top-1로 유지했으며 lexical과 shadow의 top-1은 같아 순위 변경은 0회였다. 이 결과는 개선 폭이 아니라 provider input 불변성과 integration path를 증명한다.

| 실제 R11 관측 | 결과 |
|---|---:|
| mission role coverage | manager·planner·executor·reviewer 4/4 |
| expected source top-1 | 4/4 |
| lexical provider input 보존 | 4/4, `providerInputPreserved: true` |
| store shadow metadata | 0 |
| external provider call | 0 |
| top-1 변경 | 0 |

재현 명령은 `npm run evaluate:local-relevance-shadow-integration -- --endpoint http://127.0.0.1:11500 --model qwen2.5:3b --cloud-features-disabled --output evidence/output-artifacts/local-relevance-shadow-integration.json`이다. Deterministic gate는 `npm run smoke:local-relevance-shadow-integration`이며 성공 경로, scorer 실패 fail-open, content-free record, R10 binding, public facade 불변을 확인한다.

결과는 `shadow-mission-integration-passed-governance-blocked`, `actualLocalRelevanceShadowIntegrationValidated: true`다. 이 관측은 controlled fixture 한 건과 stub provider에 한정되고, shadow inference 시간이 mission 시작 전에 추가되므로 production latency 승인을 뜻하지 않는다. License, OS-level egress isolation, approved resource·concurrency limit, long soak, thermal telemetry, rollback owner와 provider-input activation 승인이 남아 있다. 따라서 `actualLocalRelevanceShadowIntegrationQualified: false`, `runtimeActivation: false`, `productionReadyClaim: false`를 유지한다. Rollback은 dependency injection을 제거한 기본 lexical runtime이다.

## 현재 multi-scenario shadow replay

R12는 R11 단일 mission을 `retrieval-robustness-cases-v1.json`의 authentication recovery, payment refund, overdue owner handoff 3개 scenario와 canonical, paraphrase, noisy query, cross-language, hard-negative 5개 variation으로 확장한다. 각 15개 case를 실제 stub mission으로 실행해 manager, planner, executor, reviewer 4단계에서 총 60개 shadow observation을 수집한다. 각 observation은 lexical provider input을 그대로 반환하며 query·source 본문 대신 hash, source rank, scorer binding과 latency만 기록한다.

첫 실제 replay는 R11의 `buildRetrievalQueryText`를 그대로 사용했다. 이 query에는 mission objective뿐 아니라 role과 이전 agent output이 섞여 R8에서 검증한 query-document scoring contract와 달라졌다. 결과는 전체 12/15, expected top-1 55/60이었고 hard-negative는 0/3이었다. 기준을 낮추지 않고 이 결과를 `local-relevance-shadow-replay-full-query-baseline.json`의 `failed-keep-lexical` evidence로 보존했다.

Shadow scorer의 query를 `mission.objective`로 고정한 `mission-objective-v1` contract로 다시 실행했다. Provider에 전달되는 lexical retrieval은 바꾸지 않았으며, scorer가 보던 query만 R8 qualification과 같은 정보 요구 단위로 되돌렸다. 동일 model, prompt, fixture와 15-mission flow에서 15/15, hard-negative 3/3, expected top-1 60/60을 통과했다. Lexical top-1은 44/60이었고 shadow scorer가 나머지 16개 관측의 top-1을 expected source로 바꿨다.

| 실제 R12 비교 | full retrieval query | mission objective query |
|---|---:|---:|
| case pass | 12/15 | 15/15 |
| hard-negative | 0/3 | 3/3 |
| expected top-1 observation | 55/60 | 60/60 |
| lexical expected top-1 | 44/60 | 44/60 |
| changed top-1 | 11 | 16 |
| p50 | 1059.162ms | 849.793ms |
| p95 | 1603.642ms | 899.332ms |
| maximum | 1631.953ms | 938.621ms |
| local inference / shadow pass | 120 / 60 | 120 / 60 |

Candidate 재현 명령은 `npm run evaluate:local-relevance-shadow-replay -- --endpoint http://127.0.0.1:11500 --model qwen2.5:3b --cloud-features-disabled --output evidence/output-artifacts/local-relevance-shadow-replay.json`이다. 실패 기준선은 같은 명령에 `--query-contract full-retrieval-query-v1`과 별도 output을 지정한다. `npm run smoke:local-relevance-shadow-replay`은 두 evidence의 fixture·R11 binding, integrity, 3 scenario·15 case·60 observation coverage, hard-negative stop condition, content-free record와 lexical provider input 불변을 확인한다.

결과는 `multi-scenario-shadow-replay-passed-governance-blocked`, `actualLocalRelevanceShadowReplayValidated: true`다. 그러나 이 수치는 controlled fixture와 stub provider replay에만 적용되며 일반 retrieval 정확도나 실제 고객 query 품질을 뜻하지 않는다. Shadow inference는 각 provider stage 전에 추가되므로 production latency도 승인되지 않았다. License, OS-level egress isolation, approved resource·concurrency·latency limit, long soak, thermal telemetry, rollback owner와 provider-input activation 승인이 남아 있다. 따라서 `actualLocalRelevanceShadowReplayQualified: false`, `runtimeActivation: false`, `productionReadyClaim: false`를 유지한다.

## 현재 bounded shadow score cache

R13은 R12 evidence에서 120개 score 요청이 30개의 고유 query-document pair를 역할별로 네 번 반복한다는 점을 확인하고, local relevance scorer 앞에 process-local bounded cache를 둔다. Cache key는 model digest, scorer id, model id, prompt hash·version, query hash와 document hash를 묶는다. 완료된 entry에는 integer score만 남기고 query·document 본문은 보관하지 않는다. 최대 64개 entry를 least-recently-used 순서로 유지하며 실패 결과는 cache하지 않고, 동시에 들어온 같은 pair만 하나의 in-flight score에 합류시킨다.

동일한 R12 fixture, model, prompt와 15-mission flow를 다시 실행했다. 15/15와 expected top-1 60/60을 그대로 유지하면서 120개 score 요청 중 90개를 cache에서 재사용해 실제 local model inference를 120회에서 30회로 줄였다. Provider에는 모든 단계에서 원래 lexical retrieval을 전달했고 store·artifact에 cache metadata를 추가하지 않았다.

| 실제 R13 비교 | R12 uncached replay | R13 bounded cache replay |
|---|---:|---:|
| case pass | 15/15 | 15/15 |
| expected top-1 observation | 60/60 | 60/60 |
| score request | 120 | 120 |
| local model inference | 120 | 30 |
| cache hit | 0 | 90 |
| p50 | 849.793ms | 0.023ms |
| p95 | 899.332ms | 870.807ms |
| maximum latency | 938.621ms | 1992.079ms |
| total observation latency | 51406.590ms | 13939.543ms |

Inference와 cache hit 비율은 각각 75%이며 total observation latency는 이 실행에서 72.88% 감소했다. 반면 maximum latency는 증가했다. 단일 최대값 회귀도 숨기지 않고 evidence와 smoke gate에 유지하며, 이 결과를 일반적인 cold-start 또는 production latency 개선으로 확장하지 않는다.

재현 명령은 `npm run evaluate:local-relevance-shadow-cache -- --endpoint http://127.0.0.1:11500 --model qwen2.5:3b --cloud-features-disabled --output evidence/output-artifacts/local-relevance-shadow-cache.json`이다. `npm run smoke:local-relevance-shadow-cache`는 R12 replay·fixture·model·prompt binding, 30 unique pair, 120 request, 30 inference, 90 hit, quality parity, content-free snapshot, maximum latency regression 보존과 lexical provider input 불변을 확인한다.

결과는 `bounded-shadow-cache-passed-governance-blocked`, `actualLocalRelevanceShadowCacheValidated: true`다. 그러나 cache는 evaluation process 안에서만 검증됐고 장기 process lifetime, model replacement invalidation, memory pressure, eviction 후 품질, production concurrency와 operator rollback ownership은 승인되지 않았다. 기본 runtime은 계속 lexical이며 cache와 local scorer는 provider input에 활성화되지 않았다. 따라서 `actualLocalRelevanceShadowCacheQualified: false`, `runtimeActivation: false`, `productionReadyClaim: false`를 유지한다.

## 현재 shadow cache lifecycle stress

R14는 R13의 정상 capacity 결과를 실제 eviction과 lifecycle 경계로 확장한다. 동일 R12 fixture와 `qwen2.5:3b` binding을 유지하면서 cache capacity를 8로 줄여 30개 고유 score pair를 순서대로 재생했다. 각 pair는 한 mission의 네 role 안에서 재사용되므로 15/15, expected top-1 60/60, 120 request·30 inference·90 hit를 그대로 유지했다. Capacity를 넘은 22개 entry는 least-recently-used 순서로 제거됐고 마지막 8개만 남았다.

별도 actual lifecycle probe는 같은 query-document pair에 세 요청을 동시에 보내 한 inference와 두 in-flight join을 기록했다. 이 inference가 끝나기 전에 `model-or-prompt-replaced` reason으로 invalidate해 pending entry를 분리했다. 이전 request 결과는 기존 호출자에게 반환되지만 generation이 달라져 cache에 다시 들어가지 않았고 `staleResultDropCount: 1`로 기록됐다. Invalidate 이후 fresh request가 두 번째 inference로 score를 채웠고 다음 요청은 cache hit였다. 마지막으로 `rollback` reason으로 close해 completed entry를 0으로 만들고 이후 cache 호출이 거부되는지 확인했다.

| 실제 R14 lifecycle | 결과 |
|---|---:|
| stress capacity / unique pair | 8 / 30 |
| case / expected top-1 | 15/15 / 60/60 |
| request / inference / hit | 120 / 30 / 90 |
| eviction / final entry | 22 / 8 |
| concurrent request / inference / in-flight join | 3 / 1 / 2 |
| invalidated in-flight / stale result drop | 1 / 1 |
| invalidation count / closed entry | 2 / 0 |
| stress p50 / p95 / maximum | 0.022ms / 870.778ms / 2308.942ms |
| stress total observation latency | 14296.051ms |

재현 명령은 `npm run evaluate:local-relevance-shadow-cache-lifecycle -- --endpoint http://127.0.0.1:11500 --model qwen2.5:3b --cloud-features-disabled --output evidence/output-artifacts/local-relevance-shadow-cache-lifecycle.json`이다. `npm run smoke:local-relevance-shadow-cache-lifecycle`은 R13 evidence, model·prompt·fixture binding, exact eviction 22, content-free entry, in-flight invalidation, stale result drop, fresh refill, rollback close, store·artifact·provider input 불변을 확인한다.

결과는 `shadow-cache-lifecycle-passed-governance-blocked`, `actualLocalRelevanceShadowCacheLifecycleValidated: true`다. 이 증적은 하나의 local process와 controlled fixture에 한정되고 process restart, 장시간 memory pressure, production worker 간 cache sharing, 실제 model binary 교체, 운영자 승인 기반 invalidation과 rollback 실행을 증명하지 않는다. 따라서 `actualLocalRelevanceShadowCacheLifecycleQualified: false`, `runtimeActivation: false`, `productionReadyClaim: false`를 유지한다.

## 현재 shadow cache process isolation

R15는 R14와 같은 model·prompt·fixture input binding을 세 개의 실제 Node child process에서 검증한다. `worker-a`와 `worker-b`는 동시에 시작하고, 두 process가 끝난 뒤 `worker-a-restarted`를 새 process로 시작한다. Query와 document 원문은 bounded stdin으로만 전달하며 command argument, environment, stdout, evidence에는 남기지 않는다. Parent environment는 worker에 전달하지 않고 macOS가 빈 environment에도 주입하는 platform key만 별도로 집계한다.

각 process는 빈 cache에서 같은 pair를 두 번 score한다. 첫 요청은 반드시 한 번의 local model inference를 만들고 두 번째 요청은 해당 process 안의 cache hit가 된다. 동시 worker 두 개는 서로 다른 process identity와 각자 한 번의 inference를 남기므로 cache를 공유하지 않는다. 재시작 worker도 이전 process의 score를 읽지 못하고 다시 한 번 inference한 뒤 자체 cache hit를 만든다. 모든 process는 같은 score 90을 반환했고 shutdown close 뒤 completed entry가 0이며 이후 cache 사용이 거부됐다.

| 실제 R15 process isolation | 결과 |
|---|---:|
| concurrent worker / restarted worker | 2 / 1 |
| unique process identity / shared parent identity | 3 / 1 |
| process별 request / inference / local hit | 2 / 1 / 1 |
| first score / cached score | 90 / 90 |
| forwarded environment key / secret-like key | 0 / 0 |
| shutdown invalidation / closed entry | 1 / 0 |
| external provider call / persisted cache | none / false |

재현 명령은 `npm run evaluate:local-relevance-shadow-cache-process-isolation -- --endpoint http://127.0.0.1:11500 --model qwen2.5:3b --cloud-features-disabled --output evidence/output-artifacts/local-relevance-shadow-cache-process-isolation.json`이다. `npm run smoke:local-relevance-shadow-cache-process-isolation`은 R14 evidence, fixture input, model·prompt binding, 세 process identity, worker별 cold miss와 local hit, restart cold start, empty parent environment forwarding, content-free result, shutdown close와 inactive provider path를 확인한다.

결과는 `cache-process-isolation-passed-governance-blocked`, `actualLocalRelevanceShadowCacheProcessIsolationValidated: true`다. 이 증적은 evaluation child process 세 개에 한정되며 production worker pool orchestration, crash·forced-kill cleanup, OS restart, worker 간 shared cache, 장시간 memory pressure, 실제 model binary 교체, 운영자 승인 기반 invalidation과 rollback 실행을 증명하지 않는다. 따라서 `actualLocalRelevanceShadowCacheProcessIsolationQualified: false`, `runtimeActivation: false`, `productionReadyClaim: false`를 유지한다.

## 현재 shadow cache termination recovery and bounded soak

R16은 R15와 같은 model·prompt·fixture input binding을 유지하면서 정상 종료가 아닌 `SIGKILL`과 제한된 cache pressure를 실제 Node child process에서 검증한다. Forced worker는 같은 pair를 한 번 inference하고 한 번 cache hit한 warm 상태를 stdout으로 알린 뒤 parent가 `SIGKILL`로 종료했다. Final result나 shutdown close는 발생하지 않았다. 이후 별도 recovery worker는 초기 inference 0인 빈 cache에서 다시 inference 1회와 local hit 1회를 기록했고 forced worker와 같은 score 90을 반환한 뒤 정상 close로 entry를 0으로 만들었다.

별도 soak worker는 capacity 16인 cache에 48개 고유 pair를 순서대로 넣고 최근 16개를 다시 조회했다. Saturated snapshot은 request 64, inference 48, local hit 16, eviction 32, completed entry 16을 기록했다. 종료 후 entry는 0이었다. Node process의 시작 대비 종료 heap 증가는 4,023,088 bytes, RSS 증가는 21,938,176 bytes였다. Gate는 실행 중 최고점과 종료 시점 모두 heap 64 MiB, RSS 128 MiB를 local regression stop condition으로 사용한다. 이는 production memory SLO가 아니다.

| 실제 R16 termination and soak | 결과 |
|---|---:|
| forced termination / final result | SIGKILL / false |
| forced warm inference / hit | 1 / 1 |
| recovery initial inference / new inference / hit | 0 / 1 / 1 |
| forced / recovery score | 90 / 90 |
| soak capacity / unique pair / replay | 16 / 48 / 16 |
| soak request / inference / hit / eviction | 64 / 48 / 16 / 32 |
| saturated / closed entry | 16 / 0 |
| heap growth / 64 MiB gate | 4,023,088 bytes / pass |
| RSS growth / 128 MiB gate | 21,938,176 bytes / pass |
| forwarded environment / secret-like key | 0 / 0 |

재현 명령은 `npm run evaluate:local-relevance-shadow-cache-termination-soak -- --endpoint http://127.0.0.1:11500 --model qwen2.5:3b --cloud-features-disabled --output evidence/output-artifacts/local-relevance-shadow-cache-termination-soak.json`이다. `npm run smoke:local-relevance-shadow-cache-termination-soak`은 R15 evidence와 input binding, warm-before-kill, observed SIGKILL, recovery cold start와 score parity, exact 48-pair soak metrics, heap·RSS gate, empty parent environment forwarding, content-free evidence와 inactive provider path를 확인한다.

결과는 `cache-termination-soak-passed-governance-blocked`, `actualLocalRelevanceShadowCacheTerminationSoakValidated: true`다. 이 증적은 evaluation child process의 재시작 가능성과 48-pair bounded soak만 보여 주며 killed process 내부 cleanup, production supervisor restart, OS restart, worker-shared cache, 장시간·반복 memory soak, thermal behavior, 실제 model binary 교체, 운영자 승인 기반 rollback을 증명하지 않는다. 따라서 `actualLocalRelevanceShadowCacheTerminationSoakQualified: false`, `runtimeActivation: false`, `productionReadyClaim: false`를 유지한다.

## 현재 approved learning RAG feedback

P1은 기존 learning promotion과 mission retrieval이 실제 다음 실행에서 연결되는지를 같은 mission의 세 번의 credential-free stub run으로 검증한다. 첫 실행은 mission memory와 retrieval artifact가 없는 상태에서 planner step 3개와 reviewer pass를 기록한다. 첫 실행의 learning candidate는 local operator가 mission scope의 memory target으로 승인하며, promotion verification과 concrete rollback target이 모두 통과해야 한다.

승인 후 두 번째 실행은 생성된 memory ID를 planner retrieval provenance의 source ID로 다시 찾는다. Memory content hash와 retrieval content hash가 일치했고 query match term은 4개였다. Planner는 기존 3개 step에 승인된 verification-path step 하나를 추가했고, planner adaptation과 executor deliverable의 `Prior Memory Signals`가 같은 memory에 연결된 상태에서 reviewer pass를 유지했다.

승인된 candidate를 rollback한 뒤 세 번째 실행에서는 memory, retrieval artifact, planner adaptation, deliverable adaptation이 모두 사라졌다. Planner step은 다시 3개가 되었고 planner와 deliverable artifact hash는 승인 전 baseline과 각각 정확히 일치했다.

| 실제 P1 feedback loop | 승인 전 | 승인 후 | rollback 후 |
|---|---:|---:|---:|
| mission memory present | false | true | false |
| retrieval match term | 0 | 4 | 0 |
| planner step | 3 | 4 | 3 |
| planner / deliverable adaptation | false / false | true / true | false / false |
| reviewer verdict | pass | pass | pass |
| external provider call | 0 | 0 | 0 |
| baseline planner / deliverable hash parity | 기준 | changed / changed | exact / exact |

재현 명령은 `npm run evaluate:approved-learning-rag-feedback -- --output evidence/output-artifacts/approved-learning-rag-feedback.json`이다. `npm run smoke:approved-learning-rag-feedback`은 fixture binding, explicit approval, promotion verification, memory ID와 retrieval provenance, content hash, planner·deliverable adaptation, reviewer pass, rollback deletion, exact baseline artifact parity와 content-free evidence를 확인한다.

결과는 `approved-learning-rag-feedback-passed-local-only`, `actualApprovedLearningRagFeedbackValidated: true`다. 이는 승인된 한 mission-scoped lesson이 deterministic stub provider의 다음 plan과 deliverable에 적용되고 rollback으로 제거된다는 증적이다. 일반적인 답변 정확도 향상, cross-mission·workspace·user personalization, 실제 사용자 feedback 분포, external provider behavior, actual model training은 검증하지 않았으므로 `generalAnswerQualityImprovementValidated: false`, `actualModelTrainingExecuted: false`, `productionReadyClaim: false`를 유지한다.

## 현재 multi-scenario learning feedback quality

P2는 P1의 단일 mission 관찰을 같은 workspace의 세 독립 mission으로 확장한다. 각 mission의 baseline run에서 reviewer pass learning candidate를 만든 뒤 세 candidate를 모두 mission memory로 승인한다. 따라서 promotion 이후 run은 다른 mission의 memory 두 개가 같은 workspace에 실제로 존재하는 상태에서 실행된다. Retrieval과 provider adaptation은 여전히 mission scope만 읽어야 한다.

Promotion 이후 answer-quality case는 retrieval provenance의 memory ID가 기대 ID와 같고, 같은 memory 원문이 deliverable adaptation에 실제 포함된 경우에만 해당 source를 cited source로 연결한다. 다른 두 memory ID는 forbidden source로, 다른 두 fixture의 고유 문구는 forbidden term으로 평가한다. 원문 objective, promotion note, plan step, deliverable, 로컬 path는 저장 증적에 복사하지 않는다.

| 실제 P2 quality replay | 승인 전 | 승인 후 | rollback 후 |
|---|---:|---:|---:|
| case pass | 0/3 | 3/3 | 0/3 |
| retrieval hit rate | 0 | 1 | 0 |
| expected source citation rate | 0 | 1 | 0 |
| citation grounding rate | not-applicable | 1 | not-applicable |
| required term coverage | 0.8889 | 1 | 0.8889 |
| planner step per case | 3 | 4 | 3 |
| post-promotion retrieval match term | - | 7 / 7 / 9 | - |
| foreign memory candidate / retrieved per case | - | 2 / 0 | - |
| reviewer failure / external provider call | 0 / 0 | 0 / 0 | 0 / 0 |

Rollback 이후 세 mission은 memory와 retrieval adaptation이 사라졌고 planner·deliverable hash가 각 baseline과 정확히 일치했다. Before와 rollback의 content-free answer-quality evaluation hash도 동일하다. 재현 명령은 `npm run evaluate:approved-learning-feedback-quality -- --output evidence/output-artifacts/approved-learning-feedback-quality.json`이며, `npm run smoke:approved-learning-feedback-quality`은 세 P1 lifecycle, 9개 distinct session, Q1 gate, foreign-memory isolation, content-free evidence, rollback parity와 의도적 contamination regression을 확인한다.

결과는 `approved-learning-feedback-quality-passed-local-only`, `actualApprovedLearningFeedbackQualityValidated: true`다. 이는 controlled fixture 세 개에서 mission-scoped feedback의 적용과 격리가 품질 gate를 `0/3 → 3/3 → 0/3`으로 바꾼다는 증적이다. 실제 사용자 분포, 다른 mission으로 lesson을 일반화하는 능력, workspace·user personalization, external provider behavior, 일반적인 답변 품질 향상, actual model training은 검증하지 않았으므로 `crossMissionGeneralizationValidated: false`, `generalAnswerQualityImprovementValidated: false`, `actualModelTrainingExecuted: false`, `productionReadyClaim: false`를 유지한다.

## 현재 workspace learning personalization

P3는 같은 workspace 안의 sibling mission에만 승인된 decision memory가 적용되는지를 검증한다. Source mission의 learning candidate는 처음부터 mission scope에 잠겨 있다. Local operator가 별도의 `authorize-learning-promotion-scope` action으로 mission→workspace 범위와 사유를 먼저 기록한 경우에만 workspace promotion verification이 열린다. 이 authorization이 없으면 기존과 같이 승격을 거부한다.

평가는 workspace 두 개와 mission 세 개를 만든 뒤 7개의 credential-free stub session을 실행한다. Source mission에서 candidate를 만들고, 같은 workspace의 sibling mission과 다른 workspace의 foreign mission을 승인 전·승인 후·rollback 후에 각각 재생한다. 증적은 fixture 원문 대신 hash, scope lineage, retrieval provenance, artifact hash와 answer-quality 결과만 보존한다.

| 실제 P3 workspace personalization | 승인 전 | workspace 승인 후 | rollback 후 |
|---|---:|---:|---:|
| sibling Q1 status | failed | passed | failed |
| sibling planner step | 3 | 4 | 3 |
| sibling memory exposure | false | planner·retrieval·deliverable true | false |
| sibling retrieval match term | 0 | 5 | 0 |
| foreign workspace memory exposure | false | false | false |
| foreign planner / deliverable artifact parity | 기준 | exact / exact | exact / exact |
| reviewer failure / external provider call | 0 / 0 | 0 / 0 | 0 / 0 |

Authorization, promotion approval, rollback은 source mission timeline에서 동일한 candidate와 scope authorization ID로 연결되며 실제 event index와 timestamp가 그 순서를 보존한다. Rollback 뒤 sibling planner와 deliverable은 승인 전 hash와 정확히 일치하고, foreign mission은 세 단계 전체에서 같은 planner·deliverable hash와 answer-quality hash를 유지한다.

재현 명령은 `npm run evaluate:workspace-learning-personalization -- --output evidence/output-artifacts/workspace-learning-personalization.json`이며, `npm run smoke:workspace-learning-personalization`은 topology, default-deny authorization, workspace retrieval lineage, prompt·retrieval·deliverable 적용, foreign workspace 차단, audit ordering, 7개 distinct session, rollback parity와 content-free evidence를 확인한다.

결과는 `workspace-learning-personalization-passed-local-only`, `actualWorkspaceLearningPersonalizationValidated: true`다. 이는 하나의 controlled fixture에서 명시적으로 승인된 workspace-scoped decision이 sibling mission에 적용되고 rollback되는 동작만 증명한다. 여러 종류의 업무와 사용자 분포에 대한 cross-mission generalization, 일반적인 workspace personalization, user-scoped personalization, external provider behavior, 일반적인 답변 품질 향상과 actual model training은 검증하지 않았으므로 `crossMissionGeneralizationValidated: false`, `generalWorkspacePersonalizationValidated: false`, `userScopedPersonalizationValidated: false`, `generalAnswerQualityImprovementValidated: false`, `actualModelTrainingExecuted: false`, `productionReadyClaim: false`를 유지한다.

## 현재 workspace learning conflict and revocation

P4는 같은 workspace의 승인 decision 두 개가 한 mission query에 함께 맞을 때 provider가 서로 충돌하는 두 지시를 동시에 받지 않도록 한다. Runtime은 기존 retrieval corpus가 실제 선택한 workspace decision만 후보로 삼고, `updatedAt` 또는 `createdAt`이 가장 최근인 memory를 선택한다. Timestamp가 같으면 memory ID 역순으로 하나를 고른다. Mission memory, user memory, workspace fact·preference의 기존 전달 방식은 바꾸지 않는다.

Planner를 호출하기 전에 선택되지 않은 workspace decision은 memory context와 retrieval context 양쪽에서 제외한다. `planner-workspace-learning-selection.json`은 policy ID, candidate memory ID, content hash, effective timestamp, retrieval rank, priority와 selected 여부만 기록한다. 원문, local path, credential은 기록하지 않는다. Store schema와 공개 API payload는 변경하지 않는다.

실제 평가는 workspace 두 개와 mission 네 개에서 8개의 credential-free stub session을 실행한다. Older decision만 있을 때 older가 선택되고, newer decision까지 승인하면 두 후보 중 newer만 적용된다. Newer promotion을 기존 rollback action으로 revoke하면 older가 다시 선택되어 older-only planner·deliverable·quality hash와 정확히 일치한다. Older도 rollback하면 selection artifact와 retrieval이 사라지고 최초 baseline hash로 돌아간다. Foreign workspace mission은 conflict 시점에도 두 memory 모두 노출되지 않는다.

| 실제 P4 conflict replay | baseline | older only | two-memory conflict | newer revoked | full rollback |
|---|---:|---:|---:|---:|---:|
| selection candidate | 0 | 1 | 2 | 1 | 0 |
| selected decision | none | older | newer | older | none |
| selected / non-selected exposure | 0 / 0 | 1 / 0 | 1 / 0 | 1 / 0 | 0 / 0 |
| Q1 status | failed | passed | passed | passed | failed |
| exact artifact parity | 기준 | 기준 | changed | older-only exact | baseline exact |
| reviewer failure / external provider call | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |

재현 명령은 `npm run evaluate:workspace-learning-conflict-revocation -- --output evidence/output-artifacts/workspace-learning-conflict-revocation.json`이며, `npm run smoke:workspace-learning-conflict-revocation`은 candidate selection, content-free audit, lifecycle ordering, foreign workspace isolation, newer revocation fallback, full rollback, 8개 distinct session과 tamper regression을 확인한다.

결과는 `workspace-learning-conflict-revocation-passed-local-only`, `actualWorkspaceLearningConflictRevocationValidated: true`다. 이는 latest-revision 규칙을 직접 구현한 deterministic 정책 검증이지 model이 conflict resolution을 학습했다는 증적이 아니다. 실제 사용자 선호, semantic conflict detection, learned arbitration, 일반적인 workspace·user personalization과 actual model training은 검증하지 않았으므로 `learnedConflictResolutionValidated: false`, `generalWorkspacePersonalizationValidated: false`, `userScopedPersonalizationValidated: false`, `actualModelTrainingExecuted: false`, `productionReadyClaim: false`를 유지한다.

## 현재 workspace learning operator override

P5는 P4의 latest-revision 기본값을 유지하면서, 검증된 workspace promotion에 한해 local operator가 retrieval 후보 중 하나를 일정 기간 고정할 수 있게 한다. Override는 새로운 top-level collection을 만들지 않고 기존 `learningCandidate`에 current state와 append-only set·clear history를 기록한다. Candidate가 `promoted`, verification `passed`, scope authorization `consumed`, target `memory`, scope `workspace`이고 연결된 decision memory가 실제로 존재해야 설정할 수 있다.

CLI는 `action set-workspace-learning-selection-override <learningCandidateId> --expires-at <iso-timestamp> --note <text>`와 `action clear-workspace-learning-selection-override <learningCandidateId> --note <text>`를 제공한다. Note와 future expiration은 필수다. Set·clear 시각, local operator, memory·workspace·candidate ID, note hash와 override ID를 candidate artifact와 mission timeline에 남긴다. Selection artifact에는 원문 note 대신 hash와 timestamp만 기록한다.

Runtime은 active override가 가리키는 memory가 현재 retrieval 후보에 포함된 경우에만 `workspace-decision-operator-override-v1`을 적용한다. Foreign workspace, unretrieved memory, invalid·expired·cleared override는 새 context를 주입하지 못한다. 이 경우 기존 `workspace-decision-latest-revision-v1`으로 fallback하며 expired·cleared·invalid·unretrieved count를 content-free audit에 남긴다.

실제 평가는 workspace 두 개와 mission 네 개에서 8개의 credential-free stub session을 실행한다. 두 workspace decision을 승인한 뒤 기본 selection은 newer다. Older를 override하면 older만 planner·retrieval·deliverable에 노출된다. Override clock이 만료 시각을 지나면 newer baseline planner·deliverable·quality hash로 정확히 복귀한다. Older를 다시 고정하면 첫 override 결과와 정확히 일치하고, clear하면 다시 newer baseline과 일치한다. Active override 동안 foreign workspace는 두 memory 모두 노출되지 않는다.

| 실제 P5 operator override replay | baseline | active override | foreign active | expired | repinned | cleared |
|---|---:|---:|---:|---:|---:|---:|
| retrieval candidate | 2 | 2 | 0 | 2 | 2 | 2 |
| selected decision | newer | older | none | newer | older | newer |
| selection policy | latest revision | operator override | none | latest fallback | operator override | latest fallback |
| selected / non-selected exposure | 1 / 0 | 1 / 0 | 0 / 0 | 1 / 0 | 1 / 0 | 1 / 0 |
| Q1 status | passed | passed | passed | passed | passed | passed |
| exact planner·deliverable·quality parity | newer 기준 | older 기준 | isolated | newer exact | older exact | newer exact |
| reviewer failure / external provider call | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |

재현 명령은 `npm run evaluate:workspace-learning-operator-override -- --output evidence/output-artifacts/workspace-learning-operator-override.json`이며, `npm run smoke:workspace-learning-operator-override`은 permission evidence, CLI set, service repin·clear, timeline ordering, expiry fallback, foreign isolation, exact artifact parity, content-free evidence와 tamper regression을 확인한다.

결과는 `workspace-learning-operator-override-passed-local-only`, `actualWorkspaceLearningOperatorOverrideValidated: true`다. 이는 명시적 local operator control과 deterministic fallback을 검증한 것이며 선호를 자동 학습하거나 semantic conflict를 판단한 결과가 아니다. `learnedConflictResolutionValidated: false`, `generalWorkspacePersonalizationValidated: false`, `userScopedPersonalizationValidated: false`, `generalAnswerQualityImprovementValidated: false`, `actualModelTrainingExecuted: false`, `productionReadyClaim: false`를 유지한다.

## 현재 workspace learning operator surface

P6는 P5의 CLI-only override lifecycle을 기존 action inbox의 `learning-promotion` item에 연결한다. 새 action type이나 store collection을 만들지 않는다. Verified workspace memory promotion만 operator surface 대상이 되며, read model은 `not-set`, `active`, `expired`, `cleared`, `invalid` 상태와 candidate·memory·workspace ID, set·expiry 시각, note hash, history count만 반환한다. 원문 note와 clear note는 action inbox와 HTTP mutation response에 포함하지 않는다.

Action inbox summary는 eligible, active, expired, cleared, invalid, not-set count를 집계한다. Existing monitoring item은 선택 고정·고정 해제 command와 버튼을 함께 표시한다. Set은 future expiration과 note를 요구하고, clear는 note를 요구한다. Expired state는 자동으로 store를 변경하지 않으며 P5의 latest-revision fallback을 그대로 유지한 상태에서 operator에게만 명시한다.

HTTP mutation은 기존 web auth와 RBAC의 operator role을 통과한 뒤 candidate가 속한 workspace tenant를 먼저 검증한다. 그 다음 P5 service가 promotion verification, consumed scope authorization, workspace decision memory, expiration, secret, raw customer payload를 다시 검증한다. 순서는 `RBAC → candidate tenant → service validation → store → candidate artifact → content-free response`다.

`npm run smoke:ui-learning-promotion-surface`는 local HTTP server에서 `not-set → active → expired → cleared`를 재현하고 action inbox summary, sanitized response, timeline set·clear 순서를 확인한다. `npm run smoke:workspace-learning-operator-surface-browser`는 실제 local Chromium에서 선택 고정 버튼을 누르고 active와 expired 표시를 거쳐 고정 해제 뒤 cleared 표시와 button removal을 확인한다. Browser report와 screenshot은 `npm run build:workspace-learning-operator-surface-evidence`로 ID hash와 artifact digest만 남긴 tracked evidence로 변환한다.

결과는 `actualWorkspaceLearningOperatorSurfaceValidated: true`다. 이는 local operator UI와 HTTP control plane의 동작 증적이다. 자동 선호 학습, general workspace personalization, 실제 사용자 query 품질 개선, model training, external provider validation, hosted deployment는 검증하지 않았으므로 `automaticPreferenceLearningValidated: false`, `actualModelTrainingExecuted: false`, `productionReadyClaim: false`를 유지한다.

## 현재 local user learning personalization

P7은 tenant binding이 없는 local workspace에서만 mission-scoped decision을 전역 local user scope로 승격한다. 기존 `authorize-learning-promotion-scope`와 `resolve-learning-promotion` 흐름을 그대로 사용하며, 별도 note와 reviewer·safety·retention evidence가 없으면 승격하지 않는다. Tenant-bound workspace에서 user scope를 요청하면 store나 artifact를 쓰기 전에 거부한다. User fact는 provider context에 넣지 않고 승인된 decision과 preference만 사용한다.

실제 평가는 local workspace 두 개와 mission 세 개에서 서로 다른 credential-free stub session 일곱 개를 실행한다. Source mission의 reviewed decision을 승인하기 전, 같은 workspace의 sibling mission과 다른 local workspace mission은 모두 fixture quality gate에 실패한다. 명시적으로 mission→user scope를 승인하고 memory promotion을 완료하면 두 target이 같은 user memory ID와 content hash를 retrieval·planner·deliverable에 반영하며 통과한다. 기존 rollback action으로 memory를 삭제한 뒤에는 두 target 모두 승인 전 planner·deliverable·quality hash와 정확히 같은 상태로 돌아간다.

| 실제 P7 local user personalization | 승인 전 | user 승인 후 | rollback 후 |
|---|---:|---:|---:|
| sibling quality | failed | passed | failed |
| cross-workspace quality | failed | passed | failed |
| user memory exposure | false | planner·retrieval·deliverable true | false |
| retrieval scope | none | `user:user` | none |
| exact rollback parity | 기준 | changed | sibling·cross-workspace exact |
| reviewer failure / external provider call | 0 / 0 | 0 / 0 | 0 / 0 |

재현 명령은 `npm run evaluate:local-user-learning-personalization -- --output evidence/output-artifacts/local-user-learning-personalization.json`이며, `npm run smoke:local-user-learning-personalization`은 topology, explicit authorization, audit ordering, user retrieval lineage, 두 target의 failed→passed→failed 변화, 일곱 distinct session, exact rollback parity, tenant-bound authorization 차단, content-free evidence와 tamper regression을 확인한다.

결과는 `local-user-learning-personalization-passed-local-only`, `actualLocalUserScopedPersonalizationValidated: true`다. 이는 하나의 local operator가 소유한 두 local workspace에서 하나의 controlled fixture가 전달되는 경로만 증명한다. Hosted tenant user personalization, multi-user isolation, 일반적인 user personalization, 자동 선호 학습, actual model training, external provider validation과 production readiness는 검증하지 않았으므로 `hostedTenantUserPersonalizationValidated: false`, `multiUserIsolationValidated: false`, `generalUserPersonalizationValidated: false`, `actualModelTrainingExecuted: false`, `productionReadyClaim: false`를 유지한다.

## 현재 user learning conflict and revocation

P8은 retrieval에 동시에 포함된 local user decision을 provider에 모두 전달하지 않는다. `user-decision-latest-revision-v1` 정책이 `updatedAt`, `createdAt`, corpus revision 시각 순서로 effective timestamp를 정하고 가장 최신 decision 하나만 남긴다. Timestamp가 같으면 memory ID 역순으로 결정한다. 이 filtering은 P4 workspace selection 뒤에 실행되며 user preference, mission memory, workspace memory는 그대로 유지한다.

실제 평가는 tenant binding이 없는 local workspace 두 개와 mission 네 개에서 서로 다른 stub session 여덟 개를 실행한다. Older decision은 첫 workspace에서, newer replacement는 두 번째 workspace에서 각각 별도 reviewer와 mission→user authorization을 거쳐 승격한다. 첫 workspace target의 conflict run과 두 번째 workspace target은 모두 newer 하나만 retrieval·planner·deliverable에 반영한다. Newer promotion을 기존 rollback action으로 철회하면 첫 target은 older-only run과 동일한 planner·deliverable·quality hash로 돌아가고, older까지 철회하면 최초 baseline과 정확히 일치한다.

| 실제 P8 user conflict replay | baseline | older only | two-decision conflict | cross-workspace conflict | newer revoked | full rollback |
|---|---:|---:|---:|---:|---:|---:|
| selection candidate | 0 | 1 | 2 | 2 | 1 | 0 |
| selected decision | none | older | newer | newer | older | none |
| selected / non-selected exposure | 0 / 0 | 1 / 0 | 1 / 0 | 1 / 0 | 1 / 0 | 0 / 0 |
| quality status | failed | passed | passed | passed | passed | failed |
| exact artifact parity | 기준 | older 기준 | changed | cross-workspace 적용 | older exact | baseline exact |
| reviewer failure / external provider call | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |

재현 명령은 `npm run evaluate:user-learning-conflict-revocation -- --output evidence/output-artifacts/user-learning-conflict-revocation.json`이며, `npm run smoke:user-learning-conflict-revocation`은 selected-only provider context, preference preservation, user retrieval lineage, lifecycle ordering, cross-workspace application, newer→older fallback, full rollback, 여덟 distinct session, content-free evidence와 tamper regression을 확인한다.

결과는 `user-learning-conflict-revocation-passed-local-only`, `actualUserLearningConflictRevocationValidated: true`다. 이는 explicit latest-revision policy와 기존 rollback을 검증한 것이며 model이 conflict resolution을 학습한 결과가 아니다. 일반적인 user personalization, hosted tenant user personalization, multi-user isolation, semantic conflict detection, actual model training, external provider validation과 production readiness는 검증하지 않았으므로 `generalUserPersonalizationValidated: false`, `hostedTenantUserPersonalizationValidated: false`, `multiUserIsolationValidated: false`, `learnedConflictResolutionValidated: false`, `actualModelTrainingExecuted: false`, `productionReadyClaim: false`를 유지한다.

## 현재 user learning operator override

P9은 P8의 latest-revision 기본값을 유지하면서 local operator가 검증된 user decision 하나를 제한된 기간 동안 고정할 수 있게 한다. Override 대상은 passed promotion verification과 consumed mission→user authorization을 가진 decision이어야 하고, source workspace에 tenant binding이 없어야 한다. Future expiration과 audit note는 필수이며 secret 또는 raw customer payload가 포함된 note는 store 갱신 전에 거부한다.

Runtime은 active override가 현재 retrieval 후보 두 개 안에 있을 때만 `user-decision-operator-override-v1`을 적용한다. 만료되거나 clear된 override, invalid record, unretrieved memory는 새 context를 주입하지 않고 `user-decision-latest-revision-v1`으로 복귀한다. User preference, mission memory, workspace memory 전달은 바꾸지 않는다. CLI는 `set-user-learning-selection-override`와 `clear-user-learning-selection-override`만 추가하며 HTTP/UI surface는 이 단계에 포함하지 않는다.

실제 평가는 tenant binding이 없는 local workspace 두 개, mission 네 개, 서로 다른 stub session 여덟 개로 실행한다. Baseline은 newer decision을 고르고, older decision override가 활성화되면 같은 workspace target과 다른 local workspace target 모두 older 하나만 사용한다. Expiration은 exact newer baseline으로 돌아가고, repin은 exact older 결과를 복원하며, clear는 다시 exact newer baseline을 복원한다. Set→set→clear history와 mission timeline event 순서도 함께 검증한다.

| 실제 P9 user override replay | baseline | active override | cross-workspace active | expired | repinned | cleared |
|---|---:|---:|---:|---:|---:|---:|
| selected decision | newer | older | older | newer | older | newer |
| selection policy | latest revision | operator override | operator override | latest fallback | operator override | latest fallback |
| selected / non-selected exposure | 1 / 0 | 1 / 0 | 1 / 0 | 1 / 0 | 1 / 0 | 1 / 0 |
| quality status | passed | passed | passed | passed | passed | passed |
| exact artifact parity | newer 기준 | older 기준 | cross-workspace 적용 | newer exact | older exact | newer exact |
| reviewer failure / external provider call | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |

재현 명령은 `npm run evaluate:user-learning-operator-override -- --output evidence/output-artifacts/user-learning-operator-override.json`이며, `npm run smoke:user-learning-operator-override`은 permission evidence, tenant-free source, CLI set, service repin·clear, retrieved-only authority, cross-workspace 적용, exact expiry·clear fallback, timeline ordering, 여덟 distinct session, content-free evidence와 tamper regression을 확인한다.

결과는 `user-learning-operator-override-passed-local-only`, `actualUserLearningOperatorOverrideValidated: true`다. 이는 bounded local human control을 검증한 것이며 자동 preference 학습이나 model이 conflict resolution을 학습했다는 증적이 아니다. 일반적인 user personalization, hosted tenant user personalization, multi-user isolation, general answer-quality improvement, actual model training, external provider validation과 production readiness는 검증하지 않았으므로 `automaticPreferenceLearningValidated: false`, `generalUserPersonalizationValidated: false`, `hostedTenantUserPersonalizationValidated: false`, `multiUserIsolationValidated: false`, `learnedConflictResolutionValidated: false`, `generalAnswerQualityImprovementValidated: false`, `actualModelTrainingExecuted: false`, `productionReadyClaim: false`를 유지한다.

## 현재 user learning operator surface

P10은 P9의 CLI-only override lifecycle을 기존 action inbox의 `learning-promotion` item에 연결한다. 새 action type이나 store collection은 만들지 않는다. Passed promotion verification과 consumed mission→user authorization을 가진 tenant-free source decision만 대상이 되며, read model은 `not-set`, `active`, `expired`, `cleared`, `invalid` 상태와 candidate·memory·source workspace ID, set·expiry 시각, note hash, history count만 반환한다. 원문 note와 clear note는 action inbox와 HTTP mutation response에 포함하지 않는다.

HTTP set·clear는 기존 web RBAC를 통과한 뒤 candidate tenant access를 먼저 확인하고, 그 다음에 body를 읽어 service validation을 실행한다. 이 순서는 permission denial 때 note를 읽거나 store를 수정하지 않게 한다. Service의 tenant-free source, promotion verification, consumed authorization, future expiration, secret·raw customer payload 차단과 store→artifact 순서는 P9 그대로 유지한다.

`npm run smoke:ui-learning-promotion-surface`는 실제 local HTTP server에서 user와 workspace override 각각의 `not-set → active → expired → cleared`를 재현하고, content-free action inbox summary, sanitized mutation response, set·clear timeline 순서를 확인한다. `npm run smoke:user-learning-operator-surface-browser`는 실제 local Chromium에서 사용자 선택 고정 버튼을 누르고 active와 expired 표시를 거쳐 해제 뒤 cleared 표시와 clear button removal을 확인한다. Browser report와 screenshot은 `npm run build:user-learning-operator-surface-evidence`로 ID hash와 artifact digest만 남긴 tracked evidence로 변환한다.

결과는 `actualUserLearningOperatorSurfaceValidated: true`다. 이는 local single-user operator control과 표시를 검증한 것이며 자동 preference 학습, hosted tenant user personalization, multi-user isolation, 일반적인 user personalization, model training, external provider behavior 또는 production deployment를 증명하지 않는다. 따라서 `automaticPreferenceLearningValidated: false`, `hostedTenantUserPersonalizationValidated: false`, `multiUserIsolationValidated: false`, `actualModelTrainingExecuted: false`, `productionReadyClaim: false`를 유지한다.

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

## 현재 fine-tuning data sufficiency gate

F1.1은 F1 readiness가 형식적으로 유효하다는 사실과 실제 학습 후보를 검토할 만큼 데이터가 모였다는 판단을 분리한다. `src/core/fine-tuning-data-sufficiency.mjs`는 기존 readiness의 dataset·evaluation·export hash를 다시 검증한 뒤 원문을 저장하지 않고 accepted, train, validation, mission scope, answer-quality case, accepted-risk count와 비율만 계산한다.

초기 정책 `development-stop-condition-not-production-quality-claim`은 accepted 20개, train 16개, validation 4개, 서로 다른 mission scope 10개, 통과한 answer-quality case 10개, accepted-risk 비율 최대 0.1을 요구한다. 이는 현재 20% validation split을 유지하며 다음 개발 검토를 시작하기 위한 보수적인 내부 기준이다. 일반적인 모델 품질이나 production 성능을 보장하는 측정값이 아니므로 `productionQualityThresholdClaim: false`를 고정한다. 실제 데이터가 축적되면 같은 evaluation과 reviewer evidence로 기준의 유효성을 다시 검토해야 한다.

현재 F1 fixture는 accepted 4개, train 3개, validation 1개, mission scope 4개, answer-quality case 2개다. 따라서 evidence는 `insufficient-data`, `collect-more-reviewed-data`, `candidateTrainingReviewAllowed: false`로 끝난다. 기준을 모두 통과해도 `candidateTrainingReviewReady: true`와 `request-candidate-training-review-approval`만 만들며, trusted admission과 reviewer approval 없이는 `candidateTrainingReviewAllowed: false`를 유지한다. `trainingAuthorized: false`, `actualModelTrainingExecuted: false`, `externalSubmissionAuthorized: false`, `productionReadyClaim: false`도 바뀌지 않는다.

```bash
npm run build:fine-tuning-data-sufficiency-evidence
npm run smoke:fine-tuning-data-sufficiency
```

MLX-LM adapter v9는 이 정책 hash만 contract에 고정하고 `fineTuningDataSufficiencyAssessmentBound: false`와 `fine-tuning-data-sufficiency-approved` remaining gate를 함께 남긴다. Fixture adapter replay는 계속 가능하지만 현재 assessment나 실제 MLX 실행, explicit training request의 승인 근거로 사용할 수 없다.

## 현재 reviewed-data collection plan

F1.2는 F1.1의 부족량을 실제 수집 명령이 아닌 content-free 작업 목표로 바꾼다. `src/core/fine-tuning-data-collection-plan.mjs`는 assessment와 dataset·evaluation·policy·export hash를 모두 고정하고, accepted 16개 부족과 관측된 train 13개·validation 3개 부족을 중복 합산하지 않는다. 따라서 `minimumAdditionalReviewedExamples: 16`이며, 그 안에 새로운 mission scope 6개가 포함되어야 한다. Split 배정은 새 dataset을 만든 뒤 같은 seed 정책으로 다시 계산해야 하므로 계획이 미리 승인하지 않는다.

Answer-quality baseline 8개 부족은 학습 record 16개와 별도 목표다. Accepted-risk 비율 초과는 record를 추가해 비율을 낮추는 방식으로 해결하지 않고 governance remediation으로 분리한다. 계획과 증적에는 count, check id, hash만 남기며 원문, customer identifier, mission identifier, 합성 학습 record를 만들지 않는다.

```bash
npm run build:fine-tuning-data-collection-plan-evidence
npm run smoke:fine-tuning-data-collection-plan
```

이 계획은 다음 수집량과 재평가 순서를 설명할 뿐이다. `reviewedExampleCollectionAuthorized: false`, `collectionExecutionAuthorized: false`, `candidateTrainingReviewAllowed: false`, `trainingAuthorized: false`, `externalSubmissionAuthorized: false`, `productionReadyClaim: false`를 유지한다. 실제 reviewed example 수집에는 별도의 owner 승인과 데이터 취급 절차가 필요하다.

## 현재 reviewed-data intake request

F1.3는 F1.2 계획을 실제 데이터가 아닌 owner review request로 바꾼다. `src/core/fine-tuning-data-intake-request.mjs`는 F1.1 assessment와 F1.2 plan을 다시 검증하고 plan·assessment·readiness·dataset·evaluation·policy·train·validation hash를 함께 고정한다. Request는 최대 7일 동안만 유효하며 `requestedBy`에는 개인 식별자가 아닌 역할 metadata만 허용한다.

현재 request는 reviewed example 16개 안에 새 mission scope 6개를 포함하고, 관측된 train·validation gap 13개·3개는 split 사전 배정 없이 dataset rebuild 뒤 다시 측정하도록 요구한다. Answer-quality case 8개는 reviewed example 목표에 합산하지 않는다. Private owner-only intake, source lineage와 usage basis, consent·purpose boundary, redaction과 approved-training-record gate, retention·deletion evidence를 다섯 owner role의 별도 review로 둔다.

```bash
npm run build:fine-tuning-data-intake-request-evidence
npm run smoke:fine-tuning-data-intake-request
```

이 artifact는 승인이나 데이터 입력 화면이 아니다. 모든 review는 `pending-owner-review`이고 `ownerDecisionRecorded: false`, `dataHandlingEvidenceRecorded: false`, `reviewedExampleCollectionAuthorized: false`, `collectionExecutionAuthorized: false`다. 원문·사용자 데이터·합성 record를 만들지 않으며 candidate review, 학습, 외부 제출과 production 권한도 계속 false다. 실제 private decision과 data intake surface는 이 request를 다시 검증하는 별도 후속 단계에서만 구현한다.

## 현재 reviewed-data intake resolution protocol

F1.4는 F1.3 request를 다시 검증한 뒤 operator가 별도 private JSON file에 기록한 다섯 owner-role attestation을 하나의 content-free resolution으로 해석한다. Decision은 request id·hash에 직접 묶이며 review id와 owner role의 개수·순서가 F1.3와 정확히 같아야 한다. 각 review는 `approve` 또는 `reject`, review 시각, evidence SHA-256 reference, 짧은 content-free reason만 입력받는다. Resolution에는 reason 원문 대신 hash만 남는다. 이 protocol은 입력 role label과 SHA-256 형식만 검증하며 실제 owner identity나 evidence 내용을 인증·열람·독립 검증하지 않는다.

다섯 review가 모두 approve일 때만 `approved-for-private-collection-planning`과 `privateCollectionPlanAllowed: true`가 된다. 하나라도 reject면 전체 resolution은 `rejected`다. 승인 상태도 다음 private collection plan을 작성할 수 있다는 뜻일 뿐이며 `reviewedExampleCollectionAuthorized`, `answerQualityCaseCollectionAuthorized`, `collectionExecutionAuthorized`, `candidateTrainingReviewAllowed`, `trainingAuthorized`, `externalSubmissionAuthorized`는 모두 false다. 실제 사용자 데이터 수집·원문 저장·합성 record 생성·Provider 호출도 발생하지 않는다.

Private decision은 `personal-ai-agent-fine-tuning-data-intake-owner-decision/v1` schema를 사용한다. Top-level field는 `schemaVersion`, `requestId`, `requestHash`, `reviews`만 허용한다. `reviews`에는 F1.3의 다음 id·ownerRole을 같은 순서로 한 번씩 기록한다.

| Review id | Owner role |
|---|---|
| `private-owner-only-intake` | `collection-approval-owner` |
| `source-lineage-and-usage-basis` | `data-steward` |
| `consent-purpose-and-privacy-boundary` | `privacy-reviewer` |
| `redaction-and-approved-training-record-gate` | `quality-reviewer` |
| `retention-and-deletion-evidence` | `retention-deletion-owner` |

각 review의 exact field는 `id`, `ownerRole`, `decision`, `decidedAt`, `evidenceSha256`, `reason`이다. `requestId`와 `requestHash`는 현재 tracked request에서 복사한다. 운영 절차에서는 `decidedAt`과 `evidenceSha256`에 실제 private review evidence를 사용하고 placeholder나 예제 hash를 승인 근거로 쓰지 않는다. 하지만 code는 evidence reference의 SHA-256 형식만 확인하므로 placeholder 사용 자체를 독립적으로 판별하지 못한다.

```bash
npm run resolve:fine-tuning-data-intake -- --decision var/fine-tuning/data-intake-owner-decision.private.json
npm run smoke:fine-tuning-data-intake-resolution
```

CLI는 Git이 무시하는 `var/` 아래 또는 repository 밖의 owner-only regular file만 single-descriptor no-follow 방식으로 읽고 symlink, hard link, read 중 변경, 과도한 크기, 열린 권한, 현재 request와 다른 id·hash를 거부한다. 결과는 `var/fine-tuning/data-intake-resolutions/`에 `0600`으로 request당 한 번만 기록하며 기존 history의 integrity와 filename binding도 먼저 확인한다. Private resolution을 생성해도 `operatorAttestationRecorded: true`, `dataHandlingEvidenceReferencesRecorded: true`일 뿐 `ownerDecisionRecorded: false`, `ownerIdentityVerified: false`, `dataHandlingEvidenceRecorded: false`를 유지한다. Repository에는 실제 decision이나 resolution을 추적하지 않으므로 현재 상태는 `operatorAttestationRecorded: false`, `privateCollectionPlanAllowed: false`다. Smoke의 approve·reject replay는 임시 synthetic fixture이며 실제 owner 승인 증적이 아니다.

## 현재 private collection plan protocol

F1.5는 유효한 F1.4 private resolution을 실제 수집이 아닌 content-free 실행 준비 계획으로 바꾼다. `src/core/fine-tuning-private-collection-plan.mjs`는 계획 시각에 F1.1~F1.4 chain과 request expiry를 다시 검증하고 assessment, collection plan, request, resolution, readiness, dataset, evaluation, policy, train·validation hash와 F1.3 target을 함께 고정한다. 계획 시각이 resolution보다 앞서거나 request가 만료·교체되면 fail closed한다.

계획에는 owner-only workspace 준비, lineage·usage basis, consent·purpose, redaction·approved-training-record gate, retention·deletion evidence, bounded reviewed-example·answer-quality batch staging, 별도 collection execution approval 요청의 7개 pending step만 있다. `privateCollectionPlanAllowed: true`와 `collectionExecutionApprovalRequired: true`는 계획 작성 권한일 뿐이다. `reviewedExampleCollectionAuthorized`, `answerQualityCaseCollectionAuthorized`, `collectionExecutionAuthorized`, `candidateTrainingReviewAllowed`, `trainingAuthorized`, `externalSubmissionAuthorized`는 모두 false이며 workspace, 원문, 사용자 data, 합성 record를 만들지 않는다.

```bash
npm run plan:fine-tuning-private-collection -- --resolution var/fine-tuning/data-intake-resolutions/<resolution-file>.json
npm run smoke:fine-tuning-private-collection-plan
```

CLI는 owner-only private resolution을 single-descriptor no-follow 방식으로 읽고 tracked path, symlink, hard link, weak mode, read 중 변경, malformed JSON, expired·rejected·drifted resolution을 거부한다. 결과는 `var/fine-tuning/private-collection-plans/` 아래 `0600` 파일로 resolution당 한 번만 기록하며 history integrity와 filename binding을 검증한다. Output은 operator attestation과 evidence reference가 bind됐다는 사실만 기록한다. Owner identity와 evidence content는 인증하지 않으며 actual owner decision·data-handling evidence claim을 만들지 않는다. Repository에는 실제 resolution이나 plan JSON을 추적하지 않는다.

## 현재 private collection execution request protocol

F1.6은 유효한 F1.5 private plan을 실행이 아닌 owner review request로 바꾼다. `src/core/fine-tuning-private-collection-execution-request.mjs`는 요청 시각에 F1.1~F1.5 chain을 다시 검증하고 assessment, collection plan, intake request, intake resolution, private collection plan, readiness, dataset, evaluation, policy, train·validation hash와 16 reviewed example·6 scope·13/3 observed split gap·8 answer-quality case target을 고정한다. 요청 만료는 private plan의 expiry를 그대로 사용하며 연장하지 않는다.

요청 action은 owner-only workspace 준비, source lineage·usage basis, consent·purpose·privacy, redaction·approved-training-record gate, retention·deletion evidence, bounded batch collection, dataset rebuild·readiness reassessment의 일곱 단계다. Collection approval owner, data steward, privacy reviewer, quality reviewer, retention-deletion owner의 execution-specific review 다섯 개는 모두 `pending-owner-review`다. `collectionExecutionApprovalRequestCreated: true`는 요청 protocol이 만들어졌다는 뜻일 뿐 actual owner decision이나 실행 승인 증적이 아니다.

```bash
npm run request:fine-tuning-private-collection-execution -- --plan var/fine-tuning/private-collection-plans/<plan-file>.json --resolution var/fine-tuning/data-intake-resolutions/<resolution-file>.json
npm run smoke:fine-tuning-private-collection-execution-request
```

CLI는 plan과 resolution 두 private input을 각각 single-descriptor no-follow 방식으로 읽고 tracked path, symlink, hard link, weak mode, read 중 변경, malformed JSON, expired·rejected·drifted chain을 거부한다. 결과는 `var/fine-tuning/private-collection-execution-requests/` 아래 `0600` 파일로 plan당 한 번만 기록하며 history integrity와 filename binding을 검증한다. Repository에는 실제 request JSON을 추적하지 않는다. 현재 tracked 상태는 protocol-ready일 뿐 actual request, owner decision, verified identity·evidence, private workspace, source data, reviewed example, answer-quality case, candidate review, training, provider submission을 포함하지 않는다. `privateCollectionWorkspaceCreationAuthorized: false`, `collectionExecutionAuthorized: false`, `trainingAuthorized: false`, `productionReadyClaim: false`를 유지한다.

## 현재 private collection execution resolution protocol

F1.7은 유효한 F1.6 execution request와 별도 private decision을 content-free resolution으로 묶는다. `src/core/fine-tuning-private-collection-execution-resolution.mjs`는 판정 시각과 현재 시각에 F1.1~F1.6 chain을 다시 검증하고 기존 열두 hash에 execution request hash를 더한 열세 binding, inherited expiry, 16 reviewed example·6 scope·13/3 observed split gap·8 answer-quality case target, 일곱 ordered action과 다섯 ordered review를 고정한다. Review reason 원문은 저장하지 않고 SHA-256 hash만 남긴다.

다섯 review가 모두 `approve`일 때만 status가 `approved-for-bounded-private-collection-execution`이 되고 private workspace 준비, reviewed-example collection, answer-quality case collection, bounded collection execution authority가 true가 된다. 하나라도 reject면 status는 `rejected`이며 네 authority가 모두 false다. 두 결과 모두 `collectionExecutionApprovalResolved: true`로 resolution 존재만 기록한다. 이 판정은 authenticated owner identity나 evidence content 검증을 뜻하지 않는다. 그래서 `ownerDecisionRecorded: false`, `ownerIdentityVerified: false`, `dataHandlingEvidenceRecorded: false`, `dataHandlingEvidenceIndependentlyVerified: false`를 유지한다. Candidate review, training, external submission과 실제 데이터·모델 학습 authority도 열지 않는다.

```bash
npm run resolve:fine-tuning-private-collection-execution -- --request var/fine-tuning/private-collection-execution-requests/<request-file>.json --plan var/fine-tuning/private-collection-plans/<plan-file>.json --resolution var/fine-tuning/data-intake-resolutions/<resolution-file>.json --decision var/fine-tuning/<private-decision-file>.json
npm run smoke:fine-tuning-private-collection-execution-resolution
```

CLI는 request, plan, intake resolution, decision 네 private input을 각각 initial observation, canonical path, `O_NOFOLLOW` descriptor identity, post-open realpath로 다시 확인한다. Tracked path, symlink, hard link, weak mode, read 중 변경, malformed JSON과 expired·drifted chain을 file 생성 전에 거부한다. 결과는 `var/fine-tuning/private-collection-execution-resolutions/` 아래 `0600` 파일로 request당 한 번만 기록하고 `0700` directory와 history integrity를 강제한다. Repository에는 실제 request, decision, resolution, workspace 또는 data를 추적하지 않는다. `trainingAuthorized: false`, `externalProviderCalls: none`, `productionReadyClaim: false`를 유지한다.

## 현재 private collection workspace protocol

F1.8은 승인된 F1.7 resolution만 empty private workspace record로 바꾼다. `src/core/fine-tuning-private-collection-workspace.mjs`는 준비 시각에 F1.1~F1.7 chain을 다시 검증하고 execution request·resolution reference, 기존 13 hash에 execution resolution hash를 더한 14 binding, inherited expiry·target·7 action을 고정한다. Record에는 `reviewed-examples`, `answer-quality-cases` 두 lane의 matching directory와 각각 `itemCount: 0`, `collectionItemCount: 0`, `workspaceContainsCollectionData: false`, `workspacePathStored: false`만 남긴다.

승인된 F1.7의 bounded workspace·reviewed-example·answer-quality·collection execution authority만 그대로 반영한다. `privateCollectionWorkspacePrepared: true`이어도 `collectionStarted: false`다. Owner identity, evidence 내용, actual data·raw/source/synthetic record, candidate review, training, external submission, actual model training, production claim은 계속 false다.

```bash
npm run prepare:fine-tuning-private-collection-workspace -- --execution-resolution var/fine-tuning/private-collection-execution-resolutions/<resolution-file>.json --execution-request var/fine-tuning/private-collection-execution-requests/<request-file>.json --plan var/fine-tuning/private-collection-plans/<plan-file>.json --intake-resolution var/fine-tuning/data-intake-resolutions/<resolution-file>.json
npm run smoke:fine-tuning-private-collection-workspace
```

CLI는 네 private input을 single-descriptor `O_NOFOLLOW` flow로 다시 확인하고 tracked path, symlink, hard link, weak mode, path escape, read 중 변경, malformed JSON, expired·rejected·drifted chain을 workspace 생성 전에 거부한다. 유효한 경우에만 resolution hash당 한 번 `0700` directory, `0600` `workspace.json`, 두 empty `0700` lane을 만든다. Existing history는 directory name, mode, owner, exact allowlist와 lane emptiness까지 검사한다. Repository에는 actual approval, resolution, workspace, data가 추적되지 않으므로 현재 tracked flag는 `privateCollectionWorkspacePrepared: false`, `collectionStarted: false`, `trainingAuthorized: false`다.

## 현재 private collection item admission protocol

F1.9는 F1.8 empty workspace에 원문을 넣지 않고, content-free item envelope 하나를 admission history에만 기록한다. `src/core/fine-tuning-private-collection-item-admission.mjs`는 current F1.1~F1.8 chain, 기존 열네 hash와 exact workspace hash, normalized envelope hash를 포함한 열여섯 binding, inherited expiry·target·7 action을 다시 검증한다. Envelope는 fixed workspace, 두 lane, source lineage·usage basis, privacy consent·purpose, redaction policy, retention deleteBy·withdrawal reference, local operator role만 허용하며 모든 SHA-256 값은 code가 내용을 읽거나 검증하지 않는 opaque reference다.

`scripts/admit-fine-tuning-private-collection-item.mjs`는 workspace·envelope·execution resolution·request·plan·intake resolution의 여섯 private input을 owner-only no-follow regular file로 읽고, F1.8 workspace의 exact path·bytes와 empty lane 또는 F1.10 finalized item directory만을 변형 없이 확인한다. 같은 workspace에서 source reference, lineage reference, withdrawal reference는 중복될 수 없고 `reviewed-examples`는 16, `answer-quality-cases`는 8개의 envelope admission을 넘을 수 없다. History는 admission id별 `0600` record와 `0700` directory만 허용하며, publish 직전 expiry·retention·current chain을 다시 확인한 뒤 atomic rename한다.

```bash
npm run admit:fine-tuning-private-collection-item -- --workspace <private-workspace-json> --envelope <private-envelope-json> --execution-resolution <private-resolution-json> --execution-request <private-request-json> --plan <private-plan-json> --intake-resolution <private-intake-resolution-json>
npm run smoke:fine-tuning-private-collection-item-admission
```

현재 상태는 다음과 같다.

```text
fineTuningPrivateCollectionItemAdmissionStatus: protocol-ready-content-free-envelope-admission-required
collectionEnvelopeCount: 0
collectionItemCount: 0
workspaceMutationPerformed: false
trainingAuthorized: false
productionReadyClaim: false
```

이 단계는 content admission 자체가 아니라 이후 admission의 형식과 권한 경계를 검증하는 protocol이다. Actual owner decision, identity, evidence·usage·consent·redaction·retention의 독립 검증, raw/source/synthetic content, workspace mutation, approved record·case 생성, candidate review, training, submission, withdrawal/deletion, provider call, deploy와 production claim은 계속 false 또는 unauthorized다.

## 현재 private collection item write protocol

F1.10은 F1.9 admission 하나를 한 개의 sanitized item으로만 materialize한다. `src/core/fine-tuning-private-collection-item.mjs`는 current F1.1~F1.9 chain과 기존 열여섯 binding, admission hash, normalized content hash, sanitization hash의 열아홉 binding을 다시 확인한다. Input은 `curated-synthetic`, `owner-authored`, `consented-deidentified-user-data` origin과 F1.9 consent·redaction matrix만 허용한다. Instruction과 response는 whitespace를 normalize한 뒤 각각 16 KiB, 합계 32 KiB로 제한하며 raw JSON, secret, customer identifier, email, phone, NUL, bidi와 display control을 거부한다. Deterministic scan은 독립 deidentification proof가 아니다.

`scripts/write-fine-tuning-private-collection-item.mjs`는 workspace·admission·sanitized content·execution resolution·request·plan·intake resolution의 일곱 private input을 no-follow owner-only regular file로 읽는다. Workspace와 admission은 derived exact path·bytes·inode identity를 고정하고, F1.9 admission history, workspace ancestor identity, current chain, lane capacity, tombstone history를 shared lock 안에서 publish 직전 다시 확인한다. Record는 `workspace/<lane>/fine-tuning-private-collection-item-<admissionHash>/item.json`에 `0700/0600`, fsync, atomic rename으로 저장한다. `workspace.json`은 바꾸지 않으며 lane count는 directory scan만으로 계산한다. Tombstone writer나 deletion claim은 추가하지 않는다. Tombstone은 exact admission·workspace·withdrawal reference, `withdrawn|deleted` action, evidence hash, retention-deletion owner role을 함께 가져야 하며, 유효한 terminal tombstone은 재작성 자체를 영구 차단하고 item+tombstone conflict는 둘 다 보존한 채 중단한다.

```bash
npm run write:fine-tuning-private-collection-item -- --workspace <private-workspace-json> --admission <private-admission-json> --content <private-sanitized-item-json> --execution-resolution <private-resolution-json> --execution-request <private-request-json> --plan <private-plan-json> --intake-resolution <private-intake-resolution-json>
npm run smoke:fine-tuning-private-collection-item
```

현재 상태는 다음과 같다.

```text
fineTuningPrivateCollectionItemWriteStatus: protocol-ready-sanitized-synthetic-item-write-required
collectionStarted: false
trainingAuthorized: false
productionReadyClaim: false
```

Tracked evidence는 synthetic, content-free assertion만 보존한다. 실제 user data, approved training record·answer-quality case, candidate review, training, provider submission, withdrawal/deletion execution, deployment와 production claim은 이 protocol이 만들거나 검증하지 않는다.

Admission record는 F1.8에서 승인된 bounded workspace creation·prepared, reviewed-example collection, answer-quality collection, collection execution authority를 그대로 상속한다. Operator attestation, data-handling evidence reference, envelope metadata, retention deadline, withdrawal reference가 recorded됨도 true로 남긴다. 이 authority는 exact admission 이후의 별도 content admission만 허용하며 현재 단계에서 수집을 시작하거나 content를 쓰지 않는다. Collection start·content storage·workspace data/mutation·approved training record·answer-quality case·withdrawal/deletion 실행과 evidence, usage basis, consent, deidentification, retention policy의 independent verification은 모두 false다.

## 현재 private collection item withdrawal and retention-deletion lifecycle

F1.11은 F1.10의 저장 item을 다시 학습 권한으로 해석하지 않고, content-free owner decision과 post-delete absence receipt로 terminal lifecycle만 만든다. `withdraw`는 `storedAt <= decidedAt < deleteBy`, `retention-delete`는 `decidedAt >= deleteBy`만 허용한다. 현재 F1 approval이나 source chain은 재검증하지 않으므로 만료된 item도 exact workspace·admission·item record, path·mode·inode·bytes와 historical hash가 일치할 때 제거할 수 있다.

`scripts/lifecycle-fine-tuning-private-collection-item.mjs`는 네 owner-only no-follow input과 shared workspace lock을 사용한다. 먼저 private pending decision을 fsync한다. F1.19 계열이 존재하면 internal coordinator가 payload-first deletion cascade로 `F1.19 → F1.18 → F1.17 → F1.16 → F1.10` 순서를 강제한다. 파생 history는 fixed staging으로 atomic rename한 뒤 exact inode·bytes·single-link 상태를 다시 확인하고, F1.19 raw payload를 가장 먼저 unlink한다. 모든 파생 경로의 managed namespace 부재와 item 부재가 확인된 뒤 cascade receipt를 먼저 publish하고, 마지막에 기존 tombstone v2와 absence receipt를 terminal directory로 publish한다. 파생 상태가 없는 기존 item은 이전과 같은 same-lane removal 경로를 사용한다. 정해진 pending·staging·final 조합만 resume하며 malformed history, source+staging conflict, link·mode·path·identity drift, foreign copy, residual derivative는 evidence를 보존한 채 fail closed한다.

```bash
npm run lifecycle:fine-tuning-private-collection-item -- --workspace <private-workspace-json> --admission <private-admission-json> --item <private-item-json> --decision <private-lifecycle-decision-json>
npm run smoke:fine-tuning-private-collection-item-lifecycle
```

```text
fineTuningPrivateCollectionItemLifecycleStatus: protocol-ready-private-withdrawal-or-retention-delete-required
trackedSyntheticFixtureOnly: true
ownerIdentityVerified: false
deletionExecutionIndependentlyVerified: false
trainingAuthorized: false
productionReadyClaim: false
```

기존 F1.11 receipt는 local scan이 item path 부재와 matching count 0을 관측했다는 기록이다. F1.19 cascade receipt도 repository가 관리하는 파생 namespace의 부재만 주장하며 backup, snapshot, 다른 process의 open descriptor 또는 외부 복사본까지 삭제했다고 주장하지 않는다. 두 receipt 모두 모든 deletion step의 독립 실행 증명이나 owner identity 검증은 아니다. Tracked evidence는 synthetic fixture만 사용하며 실제 user data, training, provider call, external submission, deployment와 production claim은 계속 없다.

## 현재 private collection item review projection protocol

F1.12 Private collection item review projection protocol은 live exact F1.10 item 하나를 owner-only `pending-owner-review` projection으로만 바꾼다. `src/core/fine-tuning-private-collection-item-review-projection.mjs`는 workspace·admission·item reference, nineteen F1.10 binding hash, item hash, request hash와 withdrawal reference를 고정한다. `reviewed-examples`는 `reviewed-example-candidate-review`로만, `answer-quality-cases`는 `answer-quality-case-enrichment-review`로만 mapping한다. Projection은 item content나 path를 복사하지 않는다. Reviewed example lane은 canonical `approved-training-record-v1` gate가 required이고 eligibility는 평가하지 않았음을 기록하며, answer-quality lane은 enrichment가 필요하고 Q1 contract가 unsatisfied인 필수 field 이름만 기록한다.

`scripts/project-fine-tuning-private-collection-item-review.mjs`는 workspace·admission·item·projection request와 F1.4~F1.7 private chain input을 no-follow owner-only file로 읽는다. current F1 chain과 exact F1.10 item path·bytes·mode·inode를 lock 전과 shared workspace lock 안에서 다시 확인하고, 두 lane과 legacy/v2 terminal·pending terminal·removal history를 검사한다. expiry 또는 deleteBy, tombstone, terminal pending, removal, malformed or ambiguous history, item+terminal conflict는 evidence를 보존한 채 fail closed한다. History는 workspace hash 아래 item당 하나의 `0600` final record와 `0700` known-valid pending directory만 허용하며, exact same request는 idempotent, 다른 request는 conflict다. pending record는 publish-time live recheck 뒤 atomic rename·fsync로 resume한다.

```bash
npm run project:fine-tuning-private-collection-item-review -- --workspace <private-workspace-json> --admission <private-admission-json> --item <private-item-json> --request <private-projection-request-json> --execution-resolution <private-execution-resolution-json> --execution-request <private-execution-request-json> --plan <private-plan-json> --intake-resolution <private-intake-resolution-json>
npm run smoke:fine-tuning-private-collection-item-review-projection
```

```text
fineTuningPrivateCollectionItemReviewProjectionStatus: protocol-ready-private-item-review-projection-required
reviewStatus: pending-owner-review
contentCopied: false
itemPathStored: false
trainingAuthorized: false
productionReadyClaim: false
```

Tracked fixture and evidence assertions remain synthetic and content-free. This protocol does not create an approved training record or answer-quality case, does not evaluate eligibility or Q1 content, and does not authorize training, provider use, submission, deployment, actual user data, or production claims.

## 현재 private collection item review resolution protocol

F1.13 Private collection item review resolution protocol은 exact F1.12 final projection 하나에 quality-reviewer의 `approve` 또는 `reject` 결정을 content-free resolution으로만 결속한다. `src/core/fine-tuning-private-collection-item-review-resolution.mjs`는 workspace·admission·item·projection reference, projection의 nineteen binding, projection hash, decision hash와 token hash를 고정한다. Raw token, reason, item content와 path는 record에 남기지 않는다. `reviewed-examples` approve는 canonical approved-training-record 생성 없이 다음 canonicalization request만 허용하고, `answer-quality-cases` approve는 answer-quality case 생성 없이 다음 enrichment request만 허용한다. Reject는 두 request를 모두 차단한다.

`scripts/resolve-fine-tuning-private-collection-item-review.mjs`는 canonical F1.12 final projection path와 F1.1~F1.7 chain, exact F1.10 item을 no-follow owner-only file로 읽고 lock 전·shared workspace lock 안·publish 직전에 다시 확인한다. expiry 또는 deleteBy, lifecycle tombstone·pending·removal, F1.12 pending·ambiguous·drift, malformed history, 다른 decision은 fail closed한다. History는 workspace hash 아래 item별 final directory에 content-free `decision.json`과 `resolution.json`만 두며, decision-only pending은 resume하고 empty pending은 exact request에 한해서만 restart한다. Final directory rename과 fsync 뒤 exact replay만 idempotent하다.

```bash
npm run resolve:fine-tuning-private-collection-item-review -- --workspace <private-workspace-json> --admission <private-admission-json> --item <private-item-json> --projection <f1-12-final-projection-json> --decision <private-decision-json> --execution-resolution <private-execution-resolution-json> --execution-request <private-execution-request-json> --plan <private-plan-json> --intake-resolution <private-intake-resolution-json>
npm run smoke:fine-tuning-private-collection-item-review-resolution
```

```text
fineTuningPrivateCollectionItemReviewResolutionStatus: protocol-ready-private-owner-resolution-required
ownerAttestationRecorded: true
ownerIdentityVerified: false
evidenceIndependentlyVerified: false
trainingAuthorized: false
productionReadyClaim: false
```

Tracked fixture and evidence assertions remain synthetic and content-free. This protocol records no actual owner identity or independent evidence verification, approved training record, answer-quality case, candidate review, training, provider use, submission, deployment, actual user data, or production claim.

## 현재 private collection item artifact request protocol

F1.14는 exact approved F1.13 resolution 하나를 content-free artifact preparation request로만 바꾼다. `reviewed-examples`는 `approved-training-record-v1` canonicalization preparation을, `answer-quality-cases`는 unsatisfied Q1 field 목록을 가진 case-enrichment preparation만 요청한다. request는 approved record·case·candidate review·training·provider·submission·deploy authority를 만들지 않는다.

`scripts/request-fine-tuning-private-collection-item-artifact.mjs`는 canonical F1.10 item, F1.12 projection, F1.13 final resolution과 owner-only request input을 shared workspace lock에서 다시 읽는다. expiry, deleteBy, malformed or ambiguous history, replay conflict는 fail closed한다. History는 workspace와 item hash에 결속된 final `<itemHash>.json` 하나와 known-valid pending `request.json` 하나만 허용한다.

```bash
npm run request:fine-tuning-private-collection-item-artifact -- --workspace <private-workspace-json> --admission <private-admission-json> --item <private-item-json> --projection <f1-12-final-projection-json> --review-resolution <f1-13-final-resolution-json> --request <private-artifact-request-json> --execution-resolution <private-execution-resolution-json> --execution-request <private-execution-request-json> --plan <private-plan-json> --intake-resolution <private-intake-resolution-json>
npm run smoke:fine-tuning-private-collection-item-artifact-request
```

```text
fineTuningPrivateCollectionItemArtifactRequestStatus: protocol-ready-private-artifact-preparation-request-required
artifactPreparationRequestCreated: false
artifactPreparationAuthorized: false
approvedTrainingRecordCreated: false
answerQualityCaseCreated: false
trainingAuthorized: false
productionReadyClaim: false
```

Tracked repository에는 실제 private request나 collected content가 없다. 이 protocol은 synthetic fixture로 request 형식과 owner-only history를 검증할 뿐이며, 실제 artifact preparation에는 별도 owner approval이 필요하다.

## 현재 private collection item artifact preparation resolution protocol

F1.15는 exact F1.14 artifact preparation request 하나에 quality-reviewer의 `approve` 또는 `reject`를 content-free decision/resolution bundle로만 결속한다. approve는 reviewed-example canonicalization preparation 또는 answer-quality case-enrichment preparation 중 해당 lane 하나만 허용한다. 승인도 approved training record·answer-quality case·candidate review·training·provider·submission·deployment authority를 만들지 않는다.

`scripts/resolve-fine-tuning-private-collection-item-artifact-preparation.mjs`는 canonical F1.10 item, F1.12 projection, F1.13 final resolution, F1.14 final request와 owner-only decision input을 shared workspace lock 아래에서 재검증한다. token은 SHA-256만 history에 남기며, decision-only pending 또는 complete pending bundle만 resume하고 item별 atomic final directory로 publish한다.

```bash
npm run resolve:fine-tuning-private-collection-item-artifact-preparation -- --workspace <private-workspace-json> --admission <private-admission-json> --item <private-item-json> --projection <f1-12-final-projection-json> --review-resolution <f1-13-final-resolution-json> --artifact-request <f1-14-final-request-json> --decision <private-artifact-preparation-decision-json> --execution-resolution <private-execution-resolution-json> --execution-request <private-execution-request-json> --plan <private-plan-json> --intake-resolution <private-intake-resolution-json>
npm run smoke:fine-tuning-private-collection-item-artifact-preparation-resolution
```

```text
currentFineTuningPrivateCollectionItemArtifactPreparationResolutionSurface: `scripts/resolve-fine-tuning-private-collection-item-artifact-preparation.mjs`
fineTuningPrivateCollectionItemArtifactPreparationResolutionStatus: protocol-ready-private-quality-reviewer-resolution-required
artifactPreparationAuthorized: true only after approve
productionReadyClaim: false
```

Tracked repository에는 실제 preparation decision, content, artifact, record, case, training run 또는 provider evidence가 없다. 이 protocol은 synthetic fixture에서 private quality-reviewer boundary와 history integrity만 검증한다.

## 현재 private answer-quality case enrichment candidate protocol

F1.16은 exact approved live F1.15 `answer-quality-cases` resolution과 `curated-synthetic` item만 받아 answer-quality case enrichment candidate를 준비한다. input의 mission objective는 stored item instruction과 정확히 같아야 하며 candidate answer는 stored item response에서만 만든다. retrieval input, cited/expected/forbidden source keys, required/forbidden terms은 precheck에만 사용하며 history에는 raw objective, answer, source, term, path, input filename을 남기지 않는다.

`scripts/prepare-fine-tuning-private-answer-quality-enrichment-candidate.mjs`는 owner-only input, canonical F1.1–F1.15 chain, strict observed-at expiry와 lifecycle history를 shared workspace lock에서 다시 확인한다. retrieval construction과 `requireReviewerPass: false` precheck가 통과해도 final Q1 reviewer verdict는 아직 없으므로 `q1ContractSatisfied: false`와 `reviewerReviewRequired: true`를 유지한다.

```bash
npm run prepare:fine-tuning-private-answer-quality-enrichment-candidate -- --workspace <private-workspace-json> --admission <private-admission-json> --item <private-item-json> --projection <f1-12-final-projection-json> --review-resolution <f1-13-final-resolution-json> --artifact-request <f1-14-final-request-json> --artifact-preparation-resolution <f1-15-final-resolution-json> --enrichment-input <private-enrichment-input-json> --execution-resolution <private-execution-resolution-json> --execution-request <private-execution-request-json> --plan <private-plan-json> --intake-resolution <private-intake-resolution-json>
npm run smoke:fine-tuning-private-answer-quality-enrichment-candidate
```

```text
currentFineTuningPrivateAnswerQualityEnrichmentCandidateSurface: `scripts/prepare-fine-tuning-private-answer-quality-enrichment-candidate.mjs`
fineTuningPrivateAnswerQualityEnrichmentCandidateStatus: protocol-ready-private-review-required
q1ContractSatisfied: false
answerQualityCaseCreated: false
trainingAuthorized: false
productionReadyClaim: false
```

Tracked repository에는 실제 candidate payload, reviewer resolution, answer-quality case, training run 또는 provider evidence가 없다. 이 protocol은 synthetic fixture에서 content-free candidate preparation boundary만 검증한다.

## 현재 private answer-quality enrichment candidate review resolution protocol

F1.17은 canonical F1.16 final candidate 하나와 quality-reviewer의 `approve` 또는 `reject` 결정을 content-free decision/resolution bundle로 결속한다. approve는 `reviewerVerdict: pass`, `q1ReviewerGateSatisfied: true`, `answerQualityCaseMaterializationAllowed: true`만 기록한다. reject는 reviewer gate와 materialization allowance를 닫는다. 두 결정 모두 `q1ContractSatisfied: false`, `answerQualityCaseCreated: false`, `answerQualityCaseEvaluationExecuted: false`를 유지하며 training, provider, submission, deployment authority를 만들지 않는다.

`scripts/resolve-fine-tuning-private-answer-quality-enrichment-candidate-review.mjs`는 canonical workspace, admission, item, F1.16 final candidate와 private decision만 다시 읽는다. shared workspace lock 아래에서 exact file bytes와 inode, current lifecycle, F1.11 terminal/removal state, cross-workspace history, expiry와 deleteBy를 재검증한다. owner-only pending bundle은 empty, decision-only, complete 상태만 복구하고 final decision/resolution bundle을 atomic publish한다. History에는 token hash, evidence hash, lineage reference와 결정 상태만 남기며 actual content, payload, path 또는 provider input을 저장하지 않는다.

```bash
npm run resolve:fine-tuning-private-answer-quality-enrichment-candidate-review -- --workspace <private-workspace-json> --admission <private-admission-json> --item <private-item-json> --candidate <f1-16-final-candidate-json> --decision <private-candidate-review-decision-json>
npm run smoke:fine-tuning-private-answer-quality-enrichment-candidate-review-resolution
```

```text
currentFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionSurface: `scripts/resolve-fine-tuning-private-answer-quality-enrichment-candidate-review.mjs`
fineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionStatus: protocol-ready-private-reviewer-decision-required
q1ReviewerGateSatisfied: true only after approve
q1ContractSatisfied: false
answerQualityCaseCreated: false
answerQualityCaseEvaluationExecuted: false
trainingAuthorized: false
externalProviderCalls: none
productionReadyClaim: false
```

실 reviewer identity와 evidence 내용은 독립 검증되지 않았고 tracked repository에는 실제 private decision, payload 또는 resolution이 없다. F1.18만 approved resolution을 answer-quality case materialization과 Q1 evaluation으로 이어갈 수 있다.

## F1.18 Private answer-quality case materialization protocol

F1.18은 canonical approved F1.17 final resolution, live F1.16 candidate, owner-only enrichment input을 다시 읽는다. retrieval과 answer-quality definition은 memory 안에서만 재구성하고 fixed default thresholds 및 `requireReviewerPass: true` 평가가 통과할 때만 owner-only logical case를 atomic publish한다. case는 `answerQualityCaseDefinitionHash`와 fixed threshold semantics를 포함한 `answerQualityCaseEvaluationHash`로 평가 대상을 명확히 결속한다. history에는 answer, source, term, retrieval input, evaluator evidence, path, filename을 남기지 않고 hash, count, metric만 남긴다.

```bash
npm run materialize:fine-tuning-private-answer-quality-case -- --workspace <private-workspace-json> --admission <private-admission-json> --item <private-item-json> --candidate <f1-16-final-candidate-json> --candidate-review-resolution <f1-17-final-resolution-json> --enrichment-input <private-enrichment-input-json>
npm run smoke:fine-tuning-private-answer-quality-case
```

`q1ContractSatisfied: true only after fixed local evaluation passes`. F1.18 자체는 payload, training, provider, submission, deployment authority를 만들지 않는다. Raw payload 저장은 아래 F1.19의 별도 owner decision을 통과해야 한다.

## F1.19 Private answer-quality case payload lifecycle

F1.19는 `curated-synthetic` item의 F1.18 logical case만 local answer-quality replay payload로 materialize한다. F1.17 quality-reviewer 승인을 저장 권한으로 확대하지 않는다. 별도 `retention-deletion-owner-role` decision이 exact item과 F1.18 case hash, `local-answer-quality-evaluation-replay-only` 목적, confirmation token과 retention window를 결속해야 한다. Reject는 content-free `decision.json`만 publish하고 enrichment input을 읽지 않는다.

Approve는 권한 검증 뒤에만 owner-only enrichment input을 읽는다. F1.18과 동일한 case definition과 fixed thresholds evaluation을 다시 만들고 definition·evaluation hash, counts와 metrics가 모두 일치할 때만 `objective`와 `caseDefinition` 두 필드의 최소 payload를 `0700/0600` history에 atomic publish한다. 전체 enrichment input, mission title, constraints, pack, input path와 filename은 저장하지 않는다. Output은 content-free status만 반환한다. Record-only validator는 strict schema와 self-consistency를 확인할 뿐 독립적인 tamper authenticity를 증명하지 않는다. Canonical F1.10 item과 F1.18 case에 대한 의미 결속은 live materializer와 F1.11 cascade가 다시 확인한다.

```bash
npm run materialize:fine-tuning-private-answer-quality-case-payload -- --workspace <private-workspace-json> --admission <private-admission-json> --item <private-item-json> --candidate <f1-16-final-candidate-json> --candidate-review-resolution <f1-17-final-resolution-json> --case <f1-18-final-case-json> --decision <private-payload-decision-json> --enrichment-input <private-enrichment-input-json>
npm run smoke:fine-tuning-private-answer-quality-case-payload
npm run smoke:fine-tuning-private-answer-quality-case-payload-lifecycle
```

```text
payloadPurpose: local-answer-quality-evaluation-replay-only
contentCopied: true only after owner approve and exact F1.18 parity
payloadStored: true only after atomic publish
replayRequiresLivePrivateInput: false
actualUserDataCollected: false
trainingAuthorized: false
externalProviderCalls: none
productionReadyClaim: false
```

F1.11은 이 payload의 유일한 public 삭제 진입점이다. 동일 owner lifecycle decision과 workspace lock 아래 payload-first deletion cascade가 F1.19→F1.20→F1.18→F1.17→F1.16→F1.10 순서로 raw payload와 derivative state를 제거한다. Content-free inventory와 absence receipt는 managed namespace만 결속하며 exact replay와 bounded crash recovery를 허용한다. 실제 user data, model evaluation 실행, training, provider submission, deployment는 이 단계의 범위가 아니다.

## F1.20 Private answer-quality payload replay

F1.20은 이미 owner-only F1.19 history에 저장된 curated-synthetic payload만 다시 읽어 frozen F1.18 Q1 evaluator로 deterministic replay한다. 새 `local-operator-role` request는 workspace·item·F1.18 case·F1.19 payload hash, evidence hash, purpose, requestedAt/expiresAt와 confirmation token을 함께 묶는다. F1.19 retention decision은 replay authority가 아니다. Enrichment input은 CLI argument로도 받지 않으며 읽지 않는다.

Replay는 request와 payload의 canonical path·bytes·inode·mode·link count, live F1.10/F1.16/F1.17/F1.18 chain과 expiry를 lock 안에서 publish 직전까지 다시 확인한다. Receipt은 hash, count, metric, status, timestamp와 false claim만 기록하는 owner-only atomic history이며 objective, answer, retrieved item, term, token, path, filename은 포함하지 않는다. F1.11은 계속 유일한 public deletion entrypoint이고 raw F1.19 payload를 먼저, F1.20 receipt를 다음으로 제거한 뒤 F1.18→F1.17→F1.16→F1.10 순서를 유지한다.

```bash
npm run replay:fine-tuning-private-answer-quality-case-payload -- --workspace <private-workspace-json> --admission <private-admission-json> --item <private-item-json> --candidate <f1-16-final-candidate-json> --candidate-review-resolution <f1-17-final-resolution-json> --case <f1-18-final-case-json> --payload <f1-19-payload-json> --request <private-replay-request-json>
npm run smoke:fine-tuning-private-answer-quality-case-replay
```

```text
currentCostFreeMilestone: fine-tuning-private-answer-quality-case-replay
replayPurpose: local-frozen-q1-payload-replay-only
actualUserDataCollected: false
actualModelEvaluated: false
trainingAuthorized: false
externalProviderCalls: none
productionReadyClaim: false
```

## F1.21 Private reviewed-example canonical record materialization protocol

F1.21은 F1.1–F1.15의 exact approved live `reviewed-examples`와 `curated-synthetic` lineage만 owner-only source bundle로 다시 확인한 뒤, 기존 `buildApprovedTrainingRecord(...)`과 dataset validator가 만드는 동일 record schema를 local private history에 atomic publish한다. source bundle의 candidate·mission·session·training workspace·선택 artifact projection에서 lineage/reference/scope hash를 재계산하고, bundle 선언과 F1.10 admission envelope가 모두 같은 hash여야 한다. bundle의 example은 admitted `item.example`와 byte-for-byte semantic content가 같아야 하며 다른 content 주입은 거부한다.

```bash
npm run materialize:fine-tuning-private-reviewed-example -- --workspace <private-workspace-json> --admission <private-admission-json> --item <private-item-json> --intake-resolution <private-intake-resolution-json> --private-collection-plan <private-plan-json> --execution-request <private-execution-request-json> --execution-resolution <private-execution-resolution-json> --artifact-preparation-resolution <f1-15-final-resolution-json> --source-bundle <owner-only-source-bundle-json>
npm run smoke:fine-tuning-private-reviewed-example-canonicalization
```

`private-reviewed-example-canonical-records`는 `0700/0600`, no-follow, single-link, bounded bytes, pre/post inode·bytes 검증과 exact empty, record-only, complete pending recovery만 허용한다. F1.11 lifecycle은 reviewed lane에서 raw F1.21 record를 item보다 먼저 stage·remove하고, staged directory 제거와 content-free absence receipt 작성 뒤 terminal publish를 재개한다. 이 record는 tracked dataset/readiness 또는 F1.1 sufficiency count에 연결하지 않으며 `actualUserDataCollected: false`, `fineTuningExecutionAuthorized: false`, `externalSubmissionAuthorized: false`, `productionReadyClaim: false`를 유지한다.

```text
currentCostFreeMilestone: private-reviewed-example-canonical-record-materialization
fineTuningExecutionAuthorized: false
productionReadyClaim: false
```

## 현재 local training runtime contract

`src/core/local-training-runtime.mjs`는 F1 readiness package를 operator-owned local executable에 전달하는 최소 실행 경계를 제공한다. Readiness package는 여전히 `fineTuningExecutionAuthorized: false`이며 스스로 실행 권한을 만들지 않는다. Runtime을 호출하려면 dataset hash, readiness hash, train·validation digest, trainer id, base model id, 승인자, 만료 시각과 rollback owner를 묶은 별도 local execution approval이 필요하다.

Local command는 shell 없이 JSON stdin/stdout으로만 통신한다. Child environment는 `HOME`, locale, `PATH`, `TMPDIR`만 허용하고 API key 같은 parent secret을 전달하지 않는다. Input bytes, stdout·stderr bytes와 timeout을 제한한다. Command failure의 stderr는 오류 메시지에 복사하지 않는다. Network isolation은 runtime이 보장했다고 주장하지 않으며 `caller-owned`로 명시한다.

`local-model-training`은 execution approval만으로 시작할 수 없다. Runtime은 process spawn 직전에 current product permission과 명시적인 revocation 부재, recorded post-acquisition readiness를 다시 받는다. Readiness에 묶인 F1 readiness·dataset·export digest, base model, trainer, rollback owner와 permission hash가 현재 입력과 모두 같아야 한다. 이전 permission이나 fixture readiness, 누락된 revocation 상태는 child process 호출 전에 차단한다.

성공 결과는 exact approval과 dataset digest에 다시 대조한다. Candidate model id, artifact format과 artifact SHA-256만 run record에 남기며 JSONL 원문, artifact path, command path와 stderr는 기록하지 않는다. Local-model-training record에는 검증한 post-acquisition readiness와 current permission의 id·hash만 admission lineage로 추가한다. Trainer가 local-model-training 완료를 보고해도 runtime은 이를 독립 검증된 실제 학습으로 승격하지 않고 `trainerReportedActualModelTrainingExecuted`와 `actualModelTrainingExecuted: false`를 분리한다. Non-fixture child의 network call도 runtime이 관측하지 못하므로 `not-observed-by-runtime`으로 남긴다. 예상 밖 필드, dataset drift, 만료·trainer 불일치와 report drift가 있으면 결과를 만들지 않는다. Rollout은 항상 차단되고 기존 provider model·prompt·RAG path를 rollback baseline으로 유지한다.

`npm run smoke:local-training-runtime`은 기존 F1 fixture의 실제 local approval lifecycle로 readiness package를 만든 뒤 deterministic fixture trainer를 child process로 실행한다. 이 replay는 runtime contract와 실패 경계만 검증한다. 실제 모델 학습은 하지 않으며 `actualModelTrainingExecuted: false`, `externalProviderCalls: none`, `externalSubmissionAuthorized: false`, `productionReadyClaim: false`를 유지한다. 실제 OS-level egress isolation, base model license 적합성, resource enforcement와 training은 후속 단계다.

## 현재 local training product permission surface

`src/core/local-training-permission.mjs`는 F1 readiness hash, dataset hash, train·validation digest, base model, trainer, approval owner와 rollback owner를 하나의 만료 가능한 permission request로 묶는다. License review, OS-level egress isolation, resource envelope는 각각 owner와 evidence SHA-256이 있어야 한다. Evidence 원문을 코드가 독립 검증했다고 주장하지 않으며, resource의 memory·disk·CPU enforcement는 `caller-owned`로 남긴다. F2a runtime이 직접 제한할 수 있는 timeout만 승인된 `maxRuntimeMs`를 넘지 못한다.

`src/core/local-training-permission-service.mjs`는 이 request를 기존 mission approval, action inbox와 gateway audit에 연결한다. Raw train·validation 내용이 든 readiness package는 public artifact collection이나 state metadata에 넣지 않고 해당 mission session의 private file로만 저장한다. Store, action inbox, HTTP response와 tracked evidence에는 hash·owner·limit만 남긴다. 기존 approval 버튼은 approver role의 명시 결정을 기록하며, 승인 뒤에도 학습을 자동 시작하지 않는다. 승인·반려·철회는 `approval-required → allow 또는 deny → deny` permission decision 순서로 남는다.

CLI는 `approval request-local-training`, `approval show-local-training`, `approval revoke-local-training`을 제공한다. HTTP는 기존 approval resolve route와 local-training 조회·철회 route를 사용하며 approver RBAC와 approval mission의 tenant를 body read보다 먼저 확인한다. `npm run smoke:local-training-permission-surface`는 실제 CLI 요청, local HTTP 승인·조회·철회, RBAC와 audit ordering을 재생한다. `npm run smoke:local-training-permission-surface-browser`는 실제 Chromium에서 license·egress·resource·rollback 안내와 승인 버튼을 확인하고 console error 없이 승인한다. OIDC tenant smoke는 다른 tenant의 조회와 철회를 차단한다.

Tracked evidence는 `evidence/output-artifacts/local-training-permission-surface.json`과 `evidence/screenshots/local-training-permission-surface.png`다. 이는 제품 permission surface와 owner attestation 기록이 동작한다는 증적이지, evidence 내용이 실제 환경에서 적합하다는 독립 검증이나 실제 모델 학습 증적은 아니다. `actualModelTrainingExecuted: false`, `externalProviderCalls: none`, `productionReadyClaim: false`를 유지한다.

승인 시 만들어지는 execution approval은 offline 실행 권한 토큰이 아니다. Actual trainer caller는 저장소에서 current permission과 revocation을 다시 읽어 runtime에 전달해야 한다. Runtime은 process spawn 직전에 만료·철회와 post-acquisition admission을 재검증하므로 이미 반환된 execution approval만 보관한 실행은 차단된다.

## 현재 local training environment preflight

F2c.1은 실제 학습을 시작하기 전에 현재 로컬 환경이 F1 readiness와 F2b permission을 안전하게 이어받을 수 있는지 확인한다. `npm run preflight:local-training-environment`는 네트워크를 사용하지 않고 설치된 `qwen2.5:3b` Ollama manifest, GGUF artifact, license text의 SHA-256을 다시 계산한다. 추론용 GGUF artifact와 학습 가능한 source model은 같은 것으로 취급하지 않는다.

현재 증적에서는 GGUF artifact와 `Qwen RESEARCH LICENSE AGREEMENT` metadata의 무결성은 확인됐지만 trainable source model은 확인되지 않았다. 지원 대상으로 점검한 `llama-finetune`과 `mlx_lm.lora` trainer도 현재 실행 환경에 없다. 시스템 architecture, memory, available disk는 content-free metadata로 관측했지만 실제 resource enforcement가 적용됐다고 주장하지 않는다.

학습 요청이 가능해지려면 현재 F1 hash와 정확히 결합된 F2b product permission, 독립적인 license·OS egress·resource review, 사용 가능한 trainer, trainable source model, rollback owner가 모두 필요하다. 현재 blocker는 `trainable-source-model-verified`, `trainer-available`, `license-review-approved`, `network-isolation-approved`, `resource-enforcement-approved`, `product-permission-approved`, `rollback-owner-assigned`다. 하나라도 없으면 `stop-before-local-training`으로 끝난다.

Tracked evidence는 `evidence/output-artifacts/local-training-environment-preflight.json`이다. 모델 경로, machine identity, 학습 데이터 원문은 저장하지 않는다. 이 단계에서 dependency 설치, 모델 다운로드, 실제 학습, 외부 provider 호출, rollout은 하지 않았으며 `actualModelTrainingExecuted: false`, `trainingAuthorized: false`, `productionReadyClaim: false`를 유지한다.

## 현재 local training toolchain decision

F2c.2는 F2c.1의 미결정 trainer와 trainable source를 설치 가능한 하나의 후보로 좁힌다. 현재 Apple Silicon 환경에는 Python 3.12, `venv`, `uv`가 있지만 `mlx_lm.lora`와 Hugging Face trainable source는 없다. 이 관측은 executable path나 machine identity를 저장하지 않는다.

선택 후보는 `mlx-lm[train]` 0.31.3의 `mlx_lm.lora`와 `Qwen/Qwen2.5-1.5B-Instruct` revision `989aa7980e4cf806f80c7fef2b1adb7bc71aa306`이다. Trainer tag는 commit `ed1fca4cef15a824c5f1702c80f70b4cffc8e4dd`로 고정했다. [MLX-LM 공식 문서](https://github.com/ml-explore/mlx-lm/tree/v0.31.3)는 Apple Silicon fine-tuning을 제공하고, [LoRA 문서](https://github.com/ml-explore/mlx-lm/blob/v0.31.3/mlx_lm/LORA.md)는 Qwen2 family, LoRA·QLoRA와 local chat JSONL을 명시한다. 선택한 [Qwen2.5-1.5B-Instruct revision](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct/tree/989aa7980e4cf806f80c7fef2b1adb7bc71aa306)은 safetensors와 Apache-2.0 metadata를 가진다.

이 선택은 현재 설치된 `qwen2.5:3b` GGUF를 trainable source라고 재해석하지 않는다. 기존 3B artifact는 inference baseline으로 유지한다. 새 source와 adapter는 별도 local directory에서 관리하고, acquisition 중에만 승인된 egress를 사용한 뒤 training은 offline으로 실행하는 정책을 선택했다.

기술 선택은 끝났지만 acquisition 권한은 없다. 다음 일곱 항목을 각각 기록해야 한다: `trainer-install-approved`, `source-model-download-approved`, `model-license-owner-review-approved`, `acquisition-egress-window-approved`, `resource-canary-owner-assigned`, `rollback-owner-assigned`, `product-permission-approved-after-install`. 현재 상태는 `candidate-selected-approval-required`이며 `acquisitionAuthorized: false`, `actualDependencyInstallationPerformed: false`, `actualModelDownloadPerformed: false`, `actualModelTrainingExecuted: false`다.

Tracked evidence는 `evidence/output-artifacts/local-training-toolchain-decision.json`이다. 이 packet은 설치나 다운로드 명령을 자동 실행하지 않는다. 승인 후에도 isolated environment 생성, pinned package와 model revision 무결성 기록, offline resource canary, F2b permission 재발급을 순서대로 통과해야 실제 training request를 만들 수 있다.

## 현재 local training acquisition request

F2c.3은 F2c.2의 정확한 decision hash, preflight hash, trainer와 source model revision을 변경 불가능한 요청으로 묶는다. 요청은 repository-relative mutable root `var/local-training/mlx-lm-lora-qwen2.5-1.5b`, acquisition 시점에만 caller-owned egress를 열고 이후 offline으로 전환하는 network policy, 다섯 owner 역할을 고정한다. `requestedBy: local-operator`는 요청을 만든 로컬 운영자 역할 metadata이며 실제 사람의 승인이나 신원 증명이 아니다.

필수 owner는 approval, egress, license, resource, rollback owner다. 승인 결정을 기록하는 주체는 approval owner와 같아야 하며, resolution은 현재 F2c.2 decision을 다시 읽어 모든 pin이 요청과 같은지 확인한다. 요청은 isolated Python 환경 생성, pinned trainer 설치, pinned source 다운로드, package·model hash 기록, egress 종료, offline resource canary, post-install product permission 요청의 일곱 단계를 순서대로 제한한다. 임의 명령이나 다른 경로는 요청 범위에 없다.

현재 resource envelope는 동시 다운로드 2개, 다운로드 8 GiB, disk 16 GiB, 실행 1시간을 상한으로 제안한다. 이 값은 `proposed-not-measured`이며 실제 모델 크기, 설치 용량, 실행 시간의 측정치도 승인치도 아니다. Owner는 실제 acquisition 전에 이 상한과 충분한 여유 공간을 별도로 검토해야 한다.

Tracked evidence는 `evidence/output-artifacts/local-training-acquisition-request.json`이다. 상태는 `pending-owner-review`이고 모든 권한과 실제 실행 flag는 false다. 미래의 승인도 acquisition만 허용하며 dependency 설치·model download가 끝난 뒤 별도 resource canary와 F2b product permission을 다시 받아야 한다. 이 단계에서는 설치, 다운로드, 학습, 외부 provider 호출, rollout을 실행하지 않았고 `productionReadyClaim: false`를 유지한다.

## 현재 local training acquisition resolution surface

F2c.4는 F2c.3 request를 실제 owner decision으로 해결하는 local CLI다. CLI는 decision을 인자로 직접 받지 않고 Git이 무시하는 `var/` 아래 또는 repository 밖 private JSON file만 읽는다. Tracked path, symbolic link, 64 KiB를 넘는 file, 빠지거나 추가된 field는 resolution 생성 전에 거부한다.

```json
{
  "schemaVersion": "personal-ai-agent-local-training-acquisition-operator-decision/v1",
  "decision": "approve",
  "owners": {
    "approvalOwner": "replace-with-approval-owner",
    "egressOwner": "replace-with-egress-owner",
    "licenseOwner": "replace-with-license-owner",
    "resourceOwner": "replace-with-resource-owner",
    "rollbackOwner": "replace-with-rollback-owner"
  },
  "reason": "Replace with a content-free review reason."
}
```

위 예시는 실제 승인이 아니다. Owner와 reason은 사용자가 직접 검토해 private file에 기록해야 한다. CLI는 approval owner를 resolver로 사용하고, 현재 F2c.2 decision과 tracked F2c.3 request를 다시 검증한 뒤 `var/local-training/acquisition-resolutions/`에 request당 하나의 content-free resolution만 쓴다. Reason 원문은 보존하지 않고 hash만 기록한다.

```bash
npm run resolve:local-training-acquisition -- --decision var/local-training/operator-decision.private.json
npm run smoke:local-training-acquisition-resolution
```

Approve 결과도 acquisition permission만 뜻한다. Dependency installation, model download, offline resource canary, post-install F2b product permission, actual training, rollout은 별도 단계다. 현재 repository에는 실제 operator decision과 resolution이 없으므로 `actualLocalTrainingAcquisitionApproved: false`, `actualModelTrainingExecuted: false`, `productionReadyClaim: false`를 유지한다.

## 현재 local training acquisition execution plan

F2c.5는 승인된 F2c.4 resolution을 실제 acquisition 전에 검토할 수 있는 일곱 단계 plan으로 고정한다. CLI는 Git이 무시하는 `var/` 아래 또는 repository 밖의 private resolution만 받는다. Resolution의 exact field, approval hash, 만료 시각, 현재 F2c.2 toolchain pin, 현재 F2c.3 request id와 hash가 모두 일치해야 plan을 쓴다.

```bash
npm run plan:local-training-acquisition-execution -- --resolution var/local-training/acquisition-resolutions/<resolution-id>.json
npm run smoke:local-training-acquisition-execution-plan
```

결과는 `var/local-training/acquisition-plans/` 아래 0600 file 하나다. Plan에는 approval id·hash, mutable root, network policy, proposed-not-measured resource envelope와 다음 일곱 action이 원래 순서대로 `pending` 상태로 기록된다.

1. isolated Python environment 생성
2. pinned trainer package 설치
3. pinned trainable source 다운로드
4. package와 model hash 기록
5. acquisition egress 종료
6. offline resource canary 실행
7. post-install product permission 요청

Plan은 실행 권한 토큰이 아니다. Future acquisition runner는 resolution, 현재 request와 toolchain, resource·license·egress owner 승인 상태를 다시 읽어야 한다. Reject, expiry, tampering, stale request, tracked path, symbolic link, duplicate plan은 새 file을 쓰기 전에 실패한다. 현재 실제 resolution이 없으므로 plan도 생성하지 않았고 dependency installation, model download, training, external provider call, rollout을 실행하지 않았다.

## 현재 local training acquisition runtime contract

F2c.6은 승인된 plan과 실제 acquisition adapter 사이의 경계를 `src/core/local-training-acquisition-runtime.mjs`로 고정한다. Runtime은 adapter 호출 직전에 현재 request와 toolchain decision, approval integrity와 만료, plan 전체를 다시 검증한다. Adapter에는 owner와 reason을 제외한 approval·request hash, mutable root, network policy, proposed resource envelope, toolchain pin, 일곱 단계 metadata만 전달한다.

Adapter 결과는 execution kind와 request·approval id, 단계 순서와 상태, 실제 실행 claim을 exact contract로 검증한다. 추가 field, 순서 변경, 잘못된 hash, training 실행 claim은 모두 run record 생성 전에 거부한다. `fixture-simulated`와 `local-acquisition`은 분리하며, local adapter가 설치·다운로드 완료와 artifact hash를 보고해도 runtime은 이를 독립 검증된 사실로 승격하지 않는다. 이 경우에도 `actualDependencyInstallationPerformed: false`, `actualModelDownloadPerformed: false`, `actualModelTrainingExecuted: false`를 유지하고 `independentVerificationRequired: true`로 기록한다.

Tracked evidence는 `evidence/output-artifacts/local-training-acquisition-runtime-contract.json`이다. 이 증적은 synthetic approval과 fixture adapter만 사용해 current binding, payload 최소화, tamper·expiry·stale request·step drift·unsupported output 차단을 재생한다.

```bash
npm run build:local-training-acquisition-runtime-evidence
npm run smoke:local-training-acquisition-runtime
```

실제 owner approval, dependency installation, model download, training, external provider call, rollout은 실행하지 않았다. 실제 acquisition adapter의 filesystem, process, network isolation과 timeout enforcement는 caller가 소유하며 별도 독립 증적이 있어야 한다. `productionReadyClaim: false`를 유지한다.

## 현재 local training acquisition artifact verification

F2c.7은 F2c.6 adapter가 보고한 두 artifact-set hash를 독립 filesystem 관찰과 대조하는 경계를 `src/core/local-training-acquisition-artifact-verification.mjs`로 고정한다. Verifier는 현재 request, toolchain decision, approval 만료, exact plan, acquisition run integrity를 먼저 다시 확인한다. 그다음 approved mutable root 안의 trainer와 source-model manifest를 읽고 exact identity pin, 정렬된 bounded file 목록, file size와 streamed SHA-256을 검증한다.

모든 manifest와 artifact는 repository realpath 안의 regular file·directory여야 한다. Relative path escape, symbolic link, missing file, schema 확장, pin drift, file hash mismatch, adapter artifact-set hash mismatch, approved download·disk envelope 초과는 증적 생성 전에 실패한다. Tracked evidence와 반환 record에는 파일 내용과 machine-local path를 남기지 않고 relative path hash, content hash, byte count만 기록한다.

```bash
npm run build:local-training-acquisition-artifact-verification-evidence
npm run smoke:local-training-acquisition-artifact-verification
```

Tracked replay는 임시 directory에 synthetic trainer와 source-model fixture를 만들고 실제 filesystem I/O로 contract만 검증한다. 따라서 `actualArtifactSetsObserved: false`, `actualDependencyInstallationPerformed: false`, `actualModelDownloadPerformed: false`, `actualModelTrainingExecuted: false`를 유지한다. 실제 artifact가 같은 검증을 통과해도 acquisition provenance, egress closure review, offline resource canary, post-install product permission은 별도 gate로 남으며 file 존재만으로 설치·다운로드 사실을 승격하지 않는다.

## 현재 local training post-acquisition readiness

F2c.8은 F2c.7 이후 남은 네 gate를 `src/core/local-training-post-acquisition-readiness.mjs`에서 하나의 readiness 판단으로 연결한다. Acquisition provenance와 egress closure는 각각 license owner와 egress owner의 content-free review hash를 요구하고, offline resource canary는 artifact byte 합계와 승인된 disk·runtime envelope, closed-network 상태를 다시 확인한다. 이 세 evidence hash는 기존 F2b product permission의 license·egress·resource evidence와 정확히 일치해야 한다. Readiness record는 원문 없이 product permission id·hash와 F1 readiness·dataset·export digest, base model, trainer, rollback owner를 training target으로 결속한다.

Product permission은 artifact 검증과 세 review가 끝난 뒤 승인되어야 하며, 현재 F1 readiness, source model, trainer, rollback owner, 만료 시각을 기존 permission validator로 다시 확인한다. Caller는 revocation이 없다는 현재 상태를 명시적으로 전달해야 하고, revocation record가 있으면 즉시 중단한다. Verification·run·review·canary·permission의 hash나 owner, timestamp, resource 측정이 달라지면 readiness record를 만들지 않는다.

```bash
npm run build:local-training-post-acquisition-readiness-evidence
npm run smoke:local-training-post-acquisition-readiness
```

Tracked replay는 temporary artifact fixture와 simulated review·permission record로 계약만 검증한다. 네 실제 gate는 모두 열려 있고 `readyForExplicitTrainingRequest: false`다. 실제 evidence가 모두 통과하는 recorded mode도 다음 명시적 training 요청을 받을 준비만 표시하며 `trainingAuthorized: false`, `actualModelTrainingExecuted: false`, `rolloutAuthorized: false`, `productionReadyClaim: false`를 유지한다.

## 현재 local training execution admission

F2c.9는 F2c.8 readiness를 F2a runtime의 실제 spawn 경계에 연결한다. `local-model-training` 경로는 recorded mode, 빈 remaining gate, exact F1 target binding, current product permission, 명시적인 `permissionRevocation: null`을 모두 요구한다. Fixture readiness, stale permission, revocation, target drift는 injected process가 호출되기 전에 실패한다.

```bash
npm run smoke:local-training-post-acquisition-readiness
npm run smoke:local-training-runtime
```

Deterministic replay는 temporary artifact와 child-process fixture로 admission 순서와 content-free run lineage만 검증한다. Dependency installation, model download, 실제 owner review, 실제 training, external provider call, rollout은 실행하지 않았으며 `actualModelTrainingExecuted: false`, `trainingAuthorized: false`, `productionReadyClaim: false`를 유지한다.

## 현재 local training candidate artifact verification

F2c.10은 trainer가 반환한 candidate model id와 artifact SHA-256을 독립 증적으로 취급하지 않는다. `src/core/local-training-candidate-artifact-verification.mjs`는 current product permission, 명시적인 revocation 부재, recorded F2c.8 readiness, F2c.9 run integrity를 다시 확인한 뒤 `var/local-training/candidates/<approval-id>/` 아래의 고정 manifest와 artifact directory만 읽는다.

Manifest는 approval, F1 dataset·readiness hash, base model, trainer, candidate model id, artifact format과 정렬된 전체 file inventory를 묶는다. Verifier는 unlisted file과 symlink를 거부하고 모든 regular file의 bytes·SHA-256을 직접 계산한다. 실제 inventory가 manifest와 정확히 같고 aggregate artifact-set hash가 F2c.9 run의 trainer report와 일치하며 manifest를 포함한 observed disk bytes가 current permission의 승인 한도 안에 있을 때만 content-free verification record를 만든다.

```bash
npm run build:local-training-candidate-artifact-verification-evidence
npm run smoke:local-training-candidate-artifact-verification
```

Tracked replay는 temporary candidate files와 fixture child process를 사용한다. 따라서 independent artifact verification contract만 검증하며 `actualCandidateArtifactsObserved: false`, `actualModelTrainingExecuted: false`, `candidateEvaluationAuthorized: false`, `rolloutAuthorized: false`, `productionReadyClaim: false`를 유지한다. Recorded mode에서 실제 candidate files가 확인되어도 explicit local evaluation request를 받을 준비만 표시하고 training process provenance, candidate quality non-regression, rollout review를 별도 gate로 남긴다.

## 현재 local candidate evaluation admission

F2c.11은 F2c.10과 O1a 사이에 explicit request와 admission을 둔다. `src/core/local-candidate-evaluation-admission.mjs`는 recorded F2c.10 verification만 받고, current product permission과 명시적인 no-revocation 상태를 다시 확인한다. Request는 candidate model id·artifact format·artifact-set SHA-256, F1 dataset·readiness hash, baseline evaluation hash, 정렬된 case id, threshold hash, evaluator id·evaluation kind, current CPU·memory·disk·runtime envelope, operator, expiration을 하나의 hash-bound record로 고정한다.

Admission 시 request integrity, resource envelope와 time window를 다시 확인한다. 현재 permission이 바뀌거나 철회 상태가 명시되지 않았거나 F1 suite·candidate verification·resource limit가 달라지면 local process를 열기 전에 실패한다. 통과하면 `candidateEvaluationAuthorized: true`만 부여하며 `actualModelEvaluated: false`, `trainingAuthorized: false`, `externalSubmissionAuthorized: false`, `rolloutAuthorized: false`, `productionReadyClaim: false`를 유지한다.

```bash
npm run build:local-candidate-evaluation-admission-evidence
npm run smoke:local-candidate-evaluation-admission
```

Tracked replay는 temporary candidate artifact와 recorded-mode fixture verification을 사용해 request와 admission contract만 검증한다. 실제 candidate artifact, training provenance, model evaluation, quality non-regression, rollout review는 완료하지 않았으며 다음 단계는 admission을 다시 검증하는 bounded local evaluation runtime이다.

## 현재 local candidate evaluation runtime

F2c.12는 F2c.11 admission을 실제 local process 실행 직전과 종료 직후에 다시 확인한다. `src/core/local-candidate-evaluation-runtime.mjs`는 request·admission integrity, current permission, explicit no-revocation, evaluator id·evaluation kind, resource·time window를 재검증하고 F2c.10 verifier를 다시 실행해 fixed candidate root의 inventory와 file hash가 admission 당시 identity와 같은지 확인한다.

검증을 통과하면 allowlisted environment와 local stdio만 child process에 전달하고 `shell: false`, timeout, input·output byte limit을 적용한다. Child result는 F1 case id와 threshold hash에 묶인 canonical answer-quality evaluation만 허용하며 raw prompt·answer·retrieval payload를 거부한다. 완료 record는 content-free summary와 fresh artifact verification, permission, evaluator, rollback lineage를 hash-bound run으로 고정하고 그 run id를 O1a candidate evidence에 연결한다.

```bash
npm run build:local-candidate-evaluation-runtime-evidence
npm run smoke:local-candidate-evaluation-runtime
```

Tracked evidence는 fixture evaluator만 실행하므로 `actualModelEvaluated: false`, `externalProviderCalls: none`, `trainingAuthorized: false`, `rolloutAuthorized: false`, `productionReadyClaim: false`를 유지한다.

## 현재 immutable evaluation input view

F2c.13은 admission과 evaluator가 같은 입력을 보도록 raw F1 suite bytes와 candidate 실행 경계를 고정한다. Request·admission v3는 suite의 canonical relative path, schema, byte length, SHA-256을 case id·threshold contract와 함께 묶는다. Runtime은 source candidate를 다시 검증한 뒤 manifest에 적힌 regular file만 bounded stream으로 임시 workspace에 복사하고, admitted suite 원문도 같은 workspace에 쓴다. Candidate와 suite의 합산 bytes가 승인된 disk envelope를 넘으면 process를 시작하지 않는다.

Child process는 source repository가 아니라 이 임시 workspace를 `cwd`로 사용한다. Candidate와 suite는 실행 직전과 성공 종료 직후 다시 hash 검증되며, 변조·누락·추가 파일은 evidence 생성 전에 실패한다. Post-run 검증이 끝난 뒤 current authority와 expiration을 다시 확인하고, cleanup이 완료된 뒤에만 content-free run record를 만든다. Run에는 pre/post verification hash와 suite digest가 기록된다.

```bash
node --test test/local-candidate-evaluation-input-view.test.mjs test/local-candidate-evaluation-admission.test.mjs test/local-candidate-evaluation-runtime.test.mjs
npm run build:local-candidate-evaluation-admission-evidence
npm run build:local-candidate-evaluation-runtime-evidence
npm run smoke:local-candidate-evaluation-admission
npm run smoke:local-candidate-evaluation-runtime
npm run smoke:local-candidate-evaluation-input-view
```

`actualModelEvaluated: false`, `externalProviderCalls: none`, `trainingAuthorized: false`, `rolloutAuthorized: false`, `productionReadyClaim: false`는 그대로다. Read-only permission은 같은 OS user의 변조를 막는 sandbox가 아니므로 post-run hash가 변조를 감지한다. 이 단계만으로는 evaluator executable·import provenance를 묶지 않으며, 다음 F2c.14가 해당 bundle 경계를 추가한다.

## 현재 evaluator bundle provenance

F2c.14는 evaluator id만으로 실행 주체를 가리키던 경계를 exact bytes로 좁힌다. Request·admission v4는 executable의 canonical path hash·byte length·SHA-256과 evaluator entry에서 시작한 정적 ESM import closure, 명시된 local resource의 정렬된 file inventory·aggregate hash를 함께 고정한다. Bare package와 dynamic import, symlink, root escape, 누락 파일은 process 시작 전에 거부한다.

Runtime은 source bundle을 검증해 임시 execution view에 같은 상대 경로로 복사하고, source entry argument를 snapshot entry로 교체한다. Candidate, suite, evaluator bundle의 합산 bytes가 승인된 disk envelope 안에 있어야 한다. 실행 직전과 성공 종료 직후에는 source executable·bundle과 snapshot bundle을 다시 확인하며, 변조가 있으면 cleanup 뒤 evidence 없이 실패한다. Run record에는 raw path나 source 대신 executable SHA-256과 bundle artifact-set SHA-256만 남긴다.

```bash
node --test test/local-candidate-evaluator-provenance.test.mjs test/local-candidate-evaluation-admission.test.mjs test/local-candidate-evaluation-input-view.test.mjs test/local-candidate-evaluation-runtime.test.mjs
npm run build:local-candidate-evaluation-admission-evidence
npm run build:local-candidate-evaluation-runtime-evidence
npm run smoke:local-candidate-evaluation-admission
npm run smoke:local-candidate-evaluation-runtime
npm run smoke:local-candidate-evaluation-input-view
npm run smoke:local-candidate-evaluation-workspace-recovery
npm run smoke:local-candidate-evaluator-provenance
```

이 증적은 pre/post hash-bound executable과 declared static bundle provenance를 검증한다. Hash 확인과 `exec` 사이의 OS-level TOCTOU, native addon·동적 code loading, CPU·memory·process-tree·network isolation, evaluator spawn 이후 `SIGKILL`·host crash cleanup은 증명하지 않는다. `actualModelEvaluated: false`, `externalProviderCalls: none`, `trainingAuthorized: false`, `rolloutAuthorized: false`, `productionReadyClaim: false`도 유지한다.

## 현재 pre-spawn workspace recovery

F2c.15는 평가 입력을 만들기 전에 중단된 workspace를 제한적으로 회수한다. Runtime은 current permission·admission, evaluator provenance, candidate artifact를 다시 검증한 뒤에만 전용 owner-only namespace를 연다. 각 workspace에는 namespace와 path hash, owner PID, expiration, phase를 묶은 exact lease가 있으며 run schema v4에는 raw path 없이 content-free recovery hash와 count만 남는다.

자동 회수 조건은 `expired + dead PID + preparing` 세 가지를 모두 만족하는 경우뿐이다. Live·권한 불명 PID, 만료 전 lease, `spawning` phase, malformed marker, symlink·hard link·special file, owner·mode·containment 불일치는 삭제하지 않는다. Recovery claim은 marker rename으로 선점하고 owner-only regular file tree를 제한된 depth·entry·bytes 안에서 post-order로 지운 뒤 marker를 마지막에 제거한다. Concurrent namespace creation과 dead claim 재개도 local test로 고정한다.

```bash
node --test test/local-candidate-evaluation-workspace-recovery.test.mjs test/local-candidate-evaluation-input-view.test.mjs test/local-candidate-evaluation-runtime.test.mjs
npm run build:local-candidate-evaluation-runtime-evidence
npm run smoke:local-candidate-evaluation-runtime
npm run smoke:local-candidate-evaluation-workspace-recovery
```

이 단계는 evaluator spawn 전에 남은 `preparing` workspace만 다룬다. `spawning` 이후 evaluator descendant가 살아 있을 수 있으므로 자동 삭제하지 않는다. Process-group·descendant 종료 증적, OS restart recovery, same-user hash-to-open TOCTOU, 실제 model evaluation과 rollout은 계속 미완료다.

## 현재 post-spawn evaluator process lifecycle

F2c.16은 evaluator를 detached POSIX process group의 direct leader로 실행한다. Timeout과 stdout·stderr 제한 초과는 그 leader handle이 아직 열려 있는 동안 group 전체에 `SIGKILL`을 보내고, child `close`와 process-group absence가 모두 확인될 때까지 반환하지 않는다. 정상 종료도 같은 absence 확인을 거쳐야 workspace cleanup과 run evidence를 허용한다.

Leader가 먼저 닫힌 뒤 group이 남아 있거나 group 상태가 unknown이면 숫자 PID·PGID를 다시 사용해 signal하지 않는다. F2c.16 완료 시점에는 runtime이 완료 run을 만들지 않고 당시 v1 `spawning` lease와 workspace를 보존했으며, 당시 run schema v5의 lifecycle summary는 PID, PGID, command, path를 포함하지 않고 cleanup 허용, close 관측, group absence, termination 여부와 hash만 남겼다. 현재 lease v2와 run schema v6의 prior-boot 회수 계약은 다음 F2c.17 절을 기준으로 한다.

```bash
node --test test/local-candidate-evaluation-process-lifecycle.test.mjs test/local-candidate-evaluation-runtime.test.mjs
npm run build:local-candidate-evaluation-runtime-evidence
npm run smoke:local-candidate-evaluation-runtime
npm run smoke:local-candidate-evaluation-process-lifecycle
```

F2c.16 자체는 현재 process session 안의 direct evaluator group만 다뤘고 당시 v1 lease recovery는 변경하지 않았다. F2c.17이 별도로 prior-boot `spawning` workspace 회수를 추가했지만, 실제 host restart 관측, child가 새 session으로 빠져나가는 경우, same-user TOCTOU, OS-enforced CPU·memory·network isolation은 계속 미완료다. `actualModelEvaluated: false`, `externalProviderCalls: none`, `trainingAuthorized: false`, `rolloutAuthorized: false`, `productionReadyClaim: false`도 유지한다.

## 현재 host boot identity recovery

F2c.17은 F2c.16이 fail-closed로 보존한 `spawning` workspace를 같은 boot에서 추정해 지우지 않는다. 새 lease v2는 Linux `/proc/sys/kernel/random/boot_id` 또는 macOS `kern.boottime`에서 읽은 exact boot identity의 SHA-256만 기록한다. Raw boot identity, PID, PGID, command와 path는 run과 evidence에 남기지 않는다. Kernel source가 없거나 형식이 맞지 않으면 identity는 unavailable이고 자동 회수 권한이 생기지 않는다.

자동 회수 조건은 `expired + prior boot + spawning + lease v2` 네 가지를 모두 만족해야 한다. 이전 boot의 process는 현재 boot에 살아 있을 수 없으므로 PID가 재사용되어 live로 보여도 조회하거나 signal하지 않고, 기존 marker·namespace·owner·mode·containment·tree bound와 atomic claim을 다시 통과한 뒤에만 삭제한다. Same-boot v2와 모든 v1 `spawning`, unexpired lease, identity unavailable, malformed marker와 unsafe tree는 그대로 보존한다. 기존 `expired + dead PID + preparing` 규칙은 바꾸지 않는다.

함께 수행한 lifecycle hardening은 post-spawn 오류에서 cleanup을 명시적으로 허용한 경우만 workspace를 삭제하고, group 상태 조회 오류를 unknown quiescence로 처리한다. Group absence deadline은 wall clock이 아니라 monotonic clock을 사용한다. 이 변경은 escaped descendant를 탐지하거나 hostile evaluator를 격리하지 않으며, 원래 detached group의 absence만 증명한다.

```bash
node --test test/local-candidate-evaluation-host-boot-identity.test.mjs test/local-candidate-evaluation-workspace-recovery.test.mjs test/local-candidate-evaluation-process-lifecycle.test.mjs test/local-candidate-evaluation-runtime.test.mjs
npm run build:local-candidate-evaluation-runtime-evidence
npm run smoke:local-candidate-evaluation-runtime
npm run smoke:local-candidate-evaluation-workspace-recovery
npm run smoke:local-candidate-evaluation-process-lifecycle
npm run smoke:local-candidate-evaluation-host-boot-recovery
```

Tracked evidence는 두 injected boot identity로 prior-boot transition을 재생한다. 실제 host reboot을 수행하거나 관측하지 않았으므로 `localCandidateEvaluationPriorBootRecoveryContractValidated: true`, `actualHostRestartObserved: false`다. Same-boot escaped session, same-user tampering과 path TOCTOU, OS-enforced CPU·memory·network isolation, 실제 model evaluation·training·rollout은 계속 미완료이며 `productionReadyClaim: false`를 유지한다.

### F2c.18 Manual host restart rehearsal

F2c.18은 F2c.17 recovery primitive를 실제 host restart 전후에 확인할 수 있는 private operator 경로다. `prepare`는 Git-ignored `var/` 아래에 owner-only 디렉터리와 하나의 synthetic v2 `spawning` lease를 만들고 종료한다. Reboot, evaluator, model, provider는 실행하지 않는다. Session에는 hash, timestamp, lease ID, workspace basename과 boot reader provenance만 기록하며 raw boot identity, PID·PGID, command와 absolute path는 기록하지 않는다.

```bash
npm run prepare:local-candidate-evaluation-host-restart-rehearsal
# 출력된 시각 이후까지 기다리면서 operator가 host를 직접 재시작한다.
npm run resume:local-candidate-evaluation-host-restart-rehearsal -- --id <rehearsal-id>
```

`resume`은 private state의 exact field·hash·owner·mode·hard-link·symlink·scope를 먼저 확인한다. 기존 디렉터리는 no-follow descriptor로 검증한 뒤에만 mode를 강화한다. 현재 boot identity가 준비 시점과 다르고 lease가 만료된 경우에만 기존 `recoverStaleLocalCandidateEvaluationWorkspaces`를 호출한다. 정확히 하나의 prior-boot `spawning` lease가 회수되어야 private result를 남긴다. 실제 restart claim은 prepare와 resume이 모두 kernel reader를 사용한 경우에만 가능하다. Recovery 전에 durable intent를 기록하고 result를 atomic rename하므로 receipt write가 중단되어도 같은 명령으로 완결할 수 있다. Same boot, unavailable identity, unexpired lease, tampered session, unsafe tree에서는 workspace를 보존한다. Evaluator를 이어서 실행하지 않으며, 이후 evaluation은 새 admission·permission·revocation·artifact 검증부터 다시 시작해야 한다.

```bash
node --test test/local-candidate-evaluation-host-boot-identity.test.mjs test/local-candidate-evaluation-workspace-recovery.test.mjs test/local-candidate-evaluation-host-restart-rehearsal.test.mjs
npm run build:local-candidate-evaluation-host-restart-rehearsal-evidence
npm run smoke:local-candidate-evaluation-host-restart-rehearsal
```

Tracked evidence는 injected boot transition으로 prepare/resume 계약과 failure guard만 재생한다. 실제 operator reboot을 수행하지 않았으므로 `localCandidateEvaluationHostRestartRehearsalProtocolValidated: true`, `actualHostRestartObserved: false`다. 실제 성공 receipt는 `var/`에만 남는다. Same-user forgery와 path TOCTOU, escaped session, OS-enforced CPU·memory·network isolation, 실제 model evaluation·training·rollout은 계속 미완료다.

### F2c.19 Actual host restart receipt

F2c.19는 F2c.18의 fixture evidence를 덮어쓰지 않고, 실제 operator reboot 뒤 만들어진 private result에서 공개 가능한 최소 필드만 별도 증적으로 내보낸다. Exporter는 기존 `resume`을 다시 호출해 private result의 idempotent hash를 재검증하고, changed boot·expired prior-boot lease·exact recovery가 모두 참인 경우에만 고정된 tracked evidence 경로에 기록한다. Raw boot identity, session·recovery hash, private path는 내보내지 않는다.

```bash
npm run export:local-candidate-evaluation-host-restart-receipt -- --id <rehearsal-id>
node --test test/local-candidate-evaluation-host-restart-receipt.test.mjs
npm run smoke:local-candidate-evaluation-host-restart-receipt
```

현재 tracked receipt는 export 시 private source에서 재검증한 한 번의 host restart와 prior-boot synthetic `spawning` lease 회수를 `actualHostRestartReceiptRecorded: true`로 기록한다. Public smoke는 tracked projection의 integrity와 claim boundary만 검증하며, private source가 없는 clone에서 restart를 독립 재증명하지 않는다. 이는 evaluator를 재실행하거나 실제 candidate model을 평가한 증적도 아니다. Private receipt 자체와 raw host identity는 계속 Git-ignored 상태이며, candidate evaluation authorization, training, rollout, external provider call, production readiness는 모두 false다.

### F2c.20 MLX-LM LoRA adapter contract

F2c.20은 기존 public training runtime과 분리된 non-authorizing MLX-LM LoRA adapter capability로 pinned contract를 fixture에서 끝까지 재생한다. Adapter module이 발급한 opaque object만 executor가 받아 임의 실행 주입을 막고, 기존 approval validator와 recorded F2c.8 readiness·current permission 검증을 재사용한 뒤 acquisition approval·plan·artifact verification을 다시 결속한다. 결과는 `fixture-simulated`로만 남아 recorded local-training run이나 candidate evaluation readiness로 승격될 수 없다. Source model과 trainer root는 manifest 전체 inventory와 실제 bytes를 다시 확인하고, unlisted file·symlink·hard link·pin drift·custom model Python code를 candidate 생성 전에 차단한다.

F1의 `train.jsonl` bytes는 그대로 쓰고 `validation.jsonl` bytes는 MLX가 읽는 `valid.jsonl` 이름으로만 바꿔 owner-only workspace에 기록한다. 호출은 verified local model realpath와 trainer executable realpath를 사용하며 `--model`, `--train`, `--data`, `--fine-tune-type lora`, `--adapter-path` 순서로 고정한다. Environment는 per-run `HOME`·`TMPDIR`와 offline flag만 만들고 caller의 `PATH`나 secret을 상속하지 않는다. 성공 output은 임시 candidate에서 exact two-file inventory로 검증한 뒤 기존 `candidate-manifest.json` 계약으로 고정 root에 atomic publish한다.

```bash
npm run build:mlx-lm-lora-training-adapter-evidence
npm run smoke:mlx-lm-lora-training-adapter
```

Tracked replay는 `child_process`를 사용하지 않는 내부 deterministic fixture writer로 data·argv·candidate pipeline만 검증한다. F2c.21이 workspace cleanup과 candidate rollback의 durable recovery를 맡고 F2c.22가 static Python runtime closure를 결속한다. F2c.23은 별도 fixture process supervisor의 lifecycle과 권한 철회 감시를 검증하며, F2c.24는 Darwin fixture에서 network deny와 CPU·file-size·open-files·core-dump limit을 실제 확인한다. F2c.25는 같은 isolated fixture에서 executable·entry identity와 loaded image·module set을 실제 관찰하지만 MLX invocation에는 연결하지 않는다. 남은 actual-mode gate는 MLX dynamic·native runtime closure와 verify-to-exec, supervisor·OS-isolation integration, unified-memory enforcement다. 따라서 `actualMlxLmLoraAdapterContractValidated: true`이지만 `actualMlxProcessSpawned: false`, `actualModelTrainingExecuted: false`, `trainingAuthorized: false`, `productionReadyClaim: false`다.

### F2c.21 Durable training failure recovery

F2c.21은 adapter가 candidate를 공개하기 전부터 완료 receipt를 남길 때까지 복구 가능한 상태를 repository-local `var/local-training/recovery/` ledger에 기록한다. Operation identity는 acquisition approval, post-acquisition readiness, artifact verification, adapter contract hash에 고정된다. Ledger에는 원본 경로, training data, failure message를 남기지 않고 path hash, file identity, owner, phase와 content-free 결과만 owner-only 파일로 atomic 기록한다.

Recovery phase는 `preparing → publish-intent → published`와 성공 경로의 `success-cleanup-pending → workspace-removed`, 실패 경로의 `cleanup-pending → workspace-removed → candidate-removal-pending → candidate-removed`를 분리한다. 성공 cleanup 전에 intent phase를 먼저 기록하므로 workspace 삭제와 다음 state 기록 사이에 중단되어도 candidate를 보존한 채 재개한다. 실패 시 workspace를 먼저 제한적으로 제거하고, 그 완료가 기록된 뒤에만 candidate rollback을 시도한다. 중간 종료나 rollback 실패가 발생해도 같은 operation의 마지막 durable phase에서 재개한다. Terminal receipt는 성공과 실패 cleanup을 모두 idempotent하게 재생한다.

```bash
npm run build:local-training-failure-recovery-evidence
node --test test/local-training-failure-recovery.test.mjs test/mlx-lm-lora-training-adapter.test.mjs
npm run smoke:local-training-failure-recovery
```

사후 cleanup은 같은 local user의 원래 rollback owner가 만든 exact state-bound request만 받는다. 이미 durable cleanup phase에 들어갔거나 lease가 만료되고 원래 process가 종료된 operation만 recovery 대상이 되며, live operation은 거부한다. 이 request는 cleanup만 허용하며 training permission이나 process execution 권한으로 재사용할 수 없다. Recovery claim과 release는 이전 node hash에 연결된 immutable edge를 exclusive publish해 concurrent retrier 중 한 process만 다음 owner가 되게 한다. Recovery는 symlink, hard link, special file, root identity drift, live foreign process claim을 거부하고 artifact를 보존한다. 다만 같은 사용자의 hash-to-open TOCTOU와 실제 OS process·network·resource isolation은 해결하지 않으므로 actual MLX process, dependency installation, model download, training, rollout, production readiness는 계속 false다.

### F2c.22 Static training runtime closure provenance

F2c.22는 trainer manifest의 전체 inventory를 실제 실행 의존성 계약으로 좁혀 해석한다. Pinned interpreter, Python entrypoint, allowlisted fixture import에서 statically resolved된 module graph와 각 file byte를 하나의 content-free provenance hash로 묶고 adapter contract에 포함한다. Adapter 생성 시 최초 기술하고, candidate workspace 생성 전과 fixture invocation 직전에 current bytes를 다시 확인한다. Interpreter는 `PATH`나 `/usr/bin/env`로 찾지 않고 manifest-bound absolute path를 command로 사용하며 `-E -S -B`와 fixed entrypoint를 앞에 둔다. Environment는 caller의 `PATH`, `PYTHONPATH`, 모든 `PYTHON*` 값과 secret을 상속하지 않는다.

```bash
node --test test/local-training-runtime-closure-provenance.test.mjs test/mlx-lm-lora-training-adapter.test.mjs
npm run build:local-training-runtime-closure-provenance-evidence
npm run smoke:local-training-runtime-closure-provenance
```

이 단계는 fixture의 allowlisted simple import를 static하게 해석한 inventory provenance만 검증한다. Known dynamic-import construct, native extension, archive, `.pth`, custom site hook, unlisted executable, symlink, hard link, owner가 아니거나 group/world writable인 file은 fixture gate에서 거부한다. 임의 Python introspection을 포함한 dynamic runtime closure, 실제 MLX native dylib closure와 same-user verify-to-exec TOCTOU는 해결하지 않았으므로 `staticRuntimeClosureValidated: true`, `dynamicRuntimeClosureComplete: false`, `nativeClosureComplete: false`, `verifyToExecClosed: false`로 기록한다. Actual process, 설치, download, training, rollout, provider call과 production readiness는 계속 false다.

### F2c.23 Local training process supervisor

F2c.23은 actual MLX command와 분리된 local fixture process supervisor를 추가한다. Supervisor는 exact approval·permission hash와 ID를 spawn 직전, 실행 중 주기적으로, 결과 수락 직전에 다시 확인한다. 권한 철회·drift·만료·조회 실패, timeout, bounded stdout·stderr 초과는 direct leader가 live인 동안 detached POSIX process group 전체에 `SIGKILL`을 요청한다. Leader가 이미 종료됐거나 close된 뒤에는 재사용될 수 있는 process group ID에 late signal을 보내지 않는다. Leader close와 process group absence가 모두 확인된 뒤에만 workspace cleanup을 허용하며, 불명확하면 fail closed로 workspace를 보존한다.

```bash
node --test test/local-training-process-supervisor.test.mjs test/mlx-lm-lora-training-adapter.test.mjs
npm run build:local-training-process-supervisor-evidence
npm run smoke:local-training-process-supervisor
```

Tracked evidence에는 PID, command, path, raw authority, stderr를 남기지 않는다. 실제 local Node fixture child를 실행해 `processGroupLifecycleValidated: true`와 `permissionRevocationMonitoringValidated: true`를 확인하지만, MLX adapter는 supervisor contract hash만 결속하고 actual invocation은 계속 차단한다. 따라서 `mlxProcessSupervisorIntegrated: false`, `actualMlxProcessSpawned: false`, `actualModelTrainingExecuted: false`, `trainingAuthorized: false`, `productionReadyClaim: false`다. OS-enforced network isolation, CPU·memory limit, dynamic·native dependency closure와 verify-to-exec도 후속 gate로 남는다.

### F2c.24 Darwin training OS isolation preflight

F2c.24는 MLX command와 분리된 Darwin fixture에서 실제 OS enforcement를 확인한다. 먼저 unsandboxed loopback control이 local connect·listen에 성공해야 한다. 같은 fixture를 고정된 `/usr/bin/sandbox-exec` deny-network profile 아래 실행하면 두 동작이 모두 `EPERM`으로 차단되어야 한다. 별도 Python standard-library wrapper는 child `execve` 전에 core dump `0`, CPU `1` second, file size `65,536` bytes, open files `32`를 exact hard limit으로 적용하고, child는 CPU signal, file-size failure, open-file exhaustion과 wrapper status를 각각 bounded output으로 증명한다. Profile, tool, wrapper와 fixture bytes는 content-free hash로 결속한다.

```bash
node --test test/local-training-os-isolation.test.mjs test/mlx-lm-lora-training-adapter.test.mjs
npm run build:local-training-os-isolation-evidence
npm run smoke:local-training-os-isolation
```

이 증적은 현재 Darwin host의 fixture preflight에 한정된다. `sandbox-exec`는 filesystem containment나 portable Linux strategy를 증명하지 않으며 MLX command에 연결되지 않았다. macOS address-space probe는 현재 host에서 unavailable로 기록하고 `actualMlxMemoryLimitEnforced: false`를 유지한다. 따라서 `actualDarwinFixtureNetworkDenyEnforced: true`지만 `actualMlxOsIsolationIntegrated: false`, `actualMlxProcessSpawned: false`, `actualModelTrainingExecuted: false`, `trainingAuthorized: false`, `productionReadyClaim: false`다. 외부 Provider, dependency 설치, model download, 실제 training과 deployment는 실행하지 않았다.

### F2c.25 Darwin runtime exec observation

F2c.25는 F2c.24의 sandbox·resource wrapper 안에서 실제 Node observer child를 시작한다. Parent는 Node executable, observer entry, Python wrapper와 고정 system executable을 launch 전 검사한다. Child는 실행된 `process.execPath`와 `import.meta.url` entry의 file identity·byte hash를 계산하고, `process.report.sharedObjects`와 `process.moduleLoadList`에서 raw path나 module name을 제외한 set hash와 count만 반환한다. Parent는 종료 후 같은 파일을 다시 검사하고 pre·child·post identity가 모두 일치할 때만 evidence를 수락한다.

```bash
node --test test/local-training-runtime-exec-observation.test.mjs test/mlx-lm-lora-training-adapter.test.mjs
npm run build:local-training-runtime-exec-observation-evidence
npm run smoke:local-training-runtime-exec-observation
```

이 관찰은 child report 이전의 code execution을 막지 않으며 runtime image path set을 file bytes나 late lazy load closure로 승격하지 않는다. Darwin shared cache에만 존재하는 image는 unresolved count로 남기고 raw path를 저장하지 않는다. 따라서 `actualDarwinFixtureRuntimeImageSetObserved: true`와 `actualDarwinFixtureExecutableIdentityObserved: true`를 기록하지만 `actualMlxRuntimeImageSetObserved: false`, `dynamicRuntimeClosureComplete: false`, `nativeClosureComplete: false`, `verifyToExecClosed: false`를 유지한다. MLX process, 설치, download, training, Provider call, rollout, deployment는 실행하지 않았다.

### F2c.26 Darwin runtime image provenance

F2c.26은 별도 sandboxed Node fixture를 살아 있는 상태로 유지하며 child가 관찰한 runtime image를 raw path 없이 개별 path hash로 보고한다. Standalone image 4개는 child와 parent가 각각 file bytes와 identity를 읽어 대조한다. Shared-cache image 343개는 `/usr/bin/dyld_info -arch arm64e -uuid -all_dyld_cache`의 UUID inventory와 매칭하고, 해당 cache main·subfile 13개는 root ownership, non-writable mode, stable identity와 strict code signature를 전후 검증한다. Parent는 같은 child PID의 `vmmap -w` 결과에서 child가 보고한 347개 image가 모두 실제 mapping으로 관찰되는지도 확인한다. Tracked evidence에는 raw path, UUID, code-signing authority나 machine-local directory를 저장하지 않고 count와 set hash만 남긴다.

```bash
node --test test/local-training-runtime-image-provenance.test.mjs test/mlx-lm-lora-training-adapter.test.mjs
npm run build:local-training-runtime-image-provenance-evidence
npm run smoke:local-training-runtime-image-provenance
```

이 증적은 현재 Darwin fixture에서 관찰 시점의 regular image bytes와 shared-cache image identity provenance를 검증한다. `vmmap` 전체 mapping과 `process.report.sharedObjects`의 exact equality, 관찰 이후 late lazy load, signed shared-cache subfile의 전체 byte hashing, same-user mutation resistance, MLX native library set과 MLX verify-to-exec는 증명하지 않는다. 따라서 `actualDarwinFixtureRuntimeImageProvenanceValidated: true`지만 `actualMlxNativeRuntimeClosureValidated: false`, `dynamicRuntimeClosureComplete: false`, `nativeClosureComplete: false`, `verifyToExecClosed: false`다. MLX process, dependency 설치, model download, training, Provider call, rollout, deployment는 실행하지 않았다.

### F2c.27 Darwin suspended verify-to-exec

F2c.27은 Darwin에서 signed executable identity와 Python entrypoint bytes를 실제 user code 실행 경계까지 연결한다. Fixed `/usr/bin/xcrun`으로 선택한 canonical Python은 root-owned, group/world non-writable, strict code signature를 전후 확인한다. Broker source는 `O_NOFOLLOW`로 연 descriptor를 stdin으로 받아 실행하며, broker가 `POSIX_SPAWN_START_SUSPENDED`로 child를 생성한 직후 `csops(CS_OPS_CDHASH)`로 kernel이 적재한 code-directory hash를 확인한다. Expected CDHash와 일치할 때만 `SIGCONT`를 보내고, 불일치하면 resume 없이 `SIGKILL`한 뒤 marker 부재를 확인한다.

Child entrypoint도 별도 inherited descriptor에서 stdin으로 전달한다. Probe는 descriptor를 연 뒤 원래 filename을 다른 bytes로 교체한다. Child는 실행된 stdin descriptor 전체를 `pread`로 self-hash하고 parent의 open-time hash와 대조하므로 path replacement가 실행 bytes를 바꾸지 못했음을 검증한다. Broker status descriptor에는 `FD_CLOEXEC`를 적용해 child가 성공 status를 위조할 수 없게 한다. Tracked evidence에는 executable path, raw CDHash, PID, signing authority, temporary path를 저장하지 않고 hash와 boolean만 남긴다.

```bash
node --test test/local-training-darwin-suspended-exec.test.mjs test/mlx-lm-lora-training-adapter.test.mjs
npm run build:local-training-darwin-suspended-exec-evidence
npm run smoke:local-training-darwin-suspended-exec
```

결과는 `actualDarwinFixtureExecutableVerifyToExecValidated: true`, `actualDarwinFixtureEntrypointDescriptorExecutionValidated: true`다. 이 primitive는 MLX adapter contract에 결속되지만 actual acquired MLX interpreter나 MLX entrypoint를 실행하지 않는다. Resume 이후 Python dynamic module과 native library loading, MLX image set, unified-memory enforcement도 닫지 않았으므로 `actualMlxProcessSpawned: false`, `dynamicRuntimeClosureComplete: false`, `nativeClosureComplete: false`, `verifyToExecClosed: false`, `actualModelTrainingExecuted: false`, `trainingAuthorized: false`, `productionReadyClaim: false`를 유지한다. 설치, model download, Provider call, rollout, deployment는 실행하지 않았다.

## 현재 candidate model evaluation gate

`src/core/candidate-model-evaluation.mjs`는 candidate 결과를 직접 생성하거나 모델을 호출하지 않는다. F1 readiness packet의 JSONL digest, evaluation manifest hash, Q1 baseline hash, review·rollback 경계를 다시 계산하고, 같은 answer-quality case set과 같은 threshold로 만들어진 candidate evaluation result만 비교한다.

Candidate evidence는 `fixture-simulated`와 `recorded-model-evaluation`을 구분한다. Fixture는 `actualModelEvaluated: false`, recorded result는 `actualModelEvaluated: true`여야 하며 candidate id, provider, model id, evaluation run id, timestamp, dataset hash, readiness hash, evaluation hash, evidence reference를 모두 요구한다. 어떤 evidence도 스스로 rollout 권한을 만들 수 없다.

비교는 suite와 case 각각에서 retrieval hit, expected citation, citation grounding, required term coverage가 낮아지지 않았는지 검사한다. Unsupported citation, forbidden source, forbidden term은 늘어나면 안 된다. Case set, threshold, reviewer verdict, result hash가 달라도 실패한다. 실패 결과는 `rollback-required`, `keep-baseline`으로 고정한다.

비교를 통과해도 결과는 `ready-for-review`, `hold-for-review`이다. Rollout은 `activationAuthorized: false`, reviewer decision `pending`, rollback owner `null`로 계속 차단한다. Fixture candidate는 실제 모델 평가가 아니므로 actual-model check도 실패 상태로 남는다.

`npm run smoke:candidate-model-evaluation`은 실제 local CLI approval lifecycle로 F1 packet을 재생성한 뒤 Q1 두 case의 fixture candidate를 비교한다. Pass path와 의도적 citation·required-term·reviewer regression을 각각 JSON file로 기록하고 다시 읽으며, 원문 미포함과 store 불변을 확인한다.

## 현재 actual local answer-quality baseline

`src/core/ollama-answer-generator.mjs`는 이미 설치된 Ollama model에 loopback `/api/generate`로만 요청한다. Model 입력은 mission objective와 retrieval source key·snippet뿐이다. Q1 fixture의 `requiredAnswerTerms`, golden answer, threshold는 prompt에 넣지 않는다. Structured output의 answer text와 citation key는 평가기에만 전달하고, tracked evidence에는 input·response·prompt hash, duration, output bytes만 남긴다.

새 model download나 trainer dependency 설치 없이 기존 `qwen2.5:3b`를 Q1 두 case에 실제 실행했다. Retrieval과 citation 지표는 두 case 모두 gate를 통과했지만 required term coverage가 각각 `0.6667`로 threshold `1.0`에 미달했다.

| case | retrieval hit | expected citation | citation grounding | required term coverage | unsupported citation | 결과 |
|---|---:|---:|---:|---:|---:|---|
| `fact-revision-provenance` | 1.0 | 1.0 | 1.0 | 0.6667 | 0.0 | failed |
| `provider-drift-recovery` | 1.0 | 1.0 | 1.0 | 0.6667 | 0.0 | failed |

따라서 `evidence/output-artifacts/local-answer-quality-baseline.json`은 `quality-regressed-keep-current`, `keep-current-answer-path`를 기록한다. `actualModelEvaluated: true`이지만 `actualLocalAnswerModelQualityValidated: false`, `actualLocalAnswerModelQualified: false`, `actualModelTrainingExecuted: false`, `activation.authorized: false`, `productionReadyClaim: false`다. 기준을 낮추거나 정답 단어를 prompt에 주입하지 않았고 기존 답변 경로를 유지한다.

## 현재 evidence-first answer composition candidate

Q2의 누락은 source가 없어서 생긴 문제가 아니었다. `provider-drift-recovery`는 검토 책임 주체를 생략했고, `fact-revision-provenance`는 `revision provenance`를 서로 떨어진 단어로 바꾸었다. Q3는 같은 `qwen2.5:3b`와 같은 retrieval 결과를 유지하면서 답변 생성을 summary, source별 claim, review action으로 분리한다.

Model에는 mission objective, source key, retrieved snippet만 전달한다. `requiredAnswerTerms`, golden answer, evaluator threshold는 전달하지 않는다. Prompt는 중요한 복합어를 objective나 evidence에 적힌 형태로 보존하고 모든 retrieved source에 claim을 하나씩 연결하도록 요구한다. Deterministic composition은 source 순서대로 claim을 정렬하고 `Reviewer action`을 별도 문장으로 표시한다. 지원하지 않는 source key, source 누락, 중복 claim, 원격 endpoint와 bounded I/O 위반은 답변을 만들기 전에 거부한다.

같은 Q1 두 case를 실제 loopback Ollama에서 다시 실행한 결과는 다음과 같다.

| 지표 | Q2 direct answer | Q3 evidence-first candidate |
|---|---:|---:|
| case pass rate | 0.0 | 1.0 |
| retrieval hit rate | 1.0 | 1.0 |
| expected source citation rate | 1.0 | 1.0 |
| citation grounding rate | 1.0 | 1.0 |
| required term coverage | 0.6667 | 1.0 |
| unsupported citation rate | 0.0 | 0.0 |

`evidence/output-artifacts/local-answer-composition-candidate.json`은 Q2 evidence hash, model digest, fixture hash, candidate prompt hash, case set과 threshold를 교차 결합한다. Answer text와 retrieved snippet은 tracked evidence에 복사하지 않는다. 결과는 `quality-improved-governance-blocked`, `candidateQualityValidated: true`, `hold-for-governance`다.

이 결과는 두 controlled fixture에서 composition candidate가 Q2보다 나아졌다는 뜻이다. 일반 답변 품질, 실제 사용자 query, 다른 언어·도메인, 장문 context, prompt injection robustness를 증명하지 않는다. License review, OS egress isolation, resource envelope와 rollback owner 승인이 없으므로 `currentAnswerPathChanged: false`, `activation.authorized: false`, `actualModelTrainingExecuted: false`, `productionReadyClaim: false`를 유지한다.

## 현재 answer composition robustness and hardening

Q4는 Q3 두 case를 regression lane으로 유지하면서 한국어 2건, data pipeline·accessibility 다중 도메인 2건, source 8개씩을 사용하는 bounded context 2건, objective·evidence prompt injection 2건을 더해 총 10 case로 확장한다. 모든 case는 Q1과 같은 threshold를 사용하며 model에는 objective와 source key·snippet만 전달한다. `requiredAnswerTerms`, `forbiddenAnswerTerms`, reviewer verdict와 threshold는 evaluator에만 남는다.

v2 robustness prompt는 exact source key 목록과 source 수를 structured output에 결속했다. 한국어, 다중 도메인, bounded context, Q3 regression은 통과했지만 objective 안의 untrusted instruction이 canary를 출력해 9/10에 머물렀다. 이 실패는 `evidence/output-artifacts/local-answer-composition-robustness.json`에 `robustness-failed-keep-current`로 보존한다.

v3 hardening은 prompt만으로 instruction 우선순위를 해결하지 않는다. Model 호출 전 deterministic input boundary가 override·출력 명령 문장을 제거하고 raw input hash, sanitized input hash, objective·evidence removal count를 기록한다. 정상 source text는 그대로 유지하고, exact source coverage와 구체적인 review role을 계속 요구한다. 두 prompt injection case에서만 sanitization이 적용되고 나머지 8 case의 removal count는 0이어야 한다.

동일한 설치 모델과 suite를 다시 실행한 결과는 다음과 같다.

| 지표 | Q4 v2 robustness baseline | Q4 v3 hardening candidate |
|---|---:|---:|
| case pass rate | 0.9 | 1.0 |
| retrieval hit rate | 1.0 | 1.0 |
| expected source citation rate | 1.0 | 1.0 |
| citation grounding rate | 1.0 | 1.0 |
| required term coverage | 1.0 | 1.0 |
| forbidden term match count | 1 | 0 |
| passed scenario | 4/5 | 5/5 |

`evidence/output-artifacts/local-answer-composition-hardening.json`은 v2 evidence hash, 동일 qwen2.5:3b digest, 두 fixture hash, unchanged threshold, v3 prompt hash, runtime version, raw·sanitized input hash와 case별 response hash를 결합한다. Answer text, source snippet, canary와 evaluator term은 tracked evidence에 복사하지 않는다. 결과는 `hardening-passed-governance-blocked`, `candidateHardeningValidated: true`, `currentAnswerPathChanged: false`다.

이 결과는 10개 controlled fixture와 현재 local runtime에만 적용된다. 실제 사용자 분포, 임의 언어·도메인, 더 긴 context, 변형된 prompt injection, sanitizer false positive·false negative, production latency와 general answer quality는 검증하지 않았다. 따라서 `generalAnswerQualityImprovementValidated: false`, `activation.authorized: false`, `actualModelTrainingExecuted: false`, `productionReadyClaim: false`를 유지한다.

## 현재 adversarial input boundary와 user-query intake

Q5는 Q4의 영어 중심 instruction boundary를 model과 분리된 순수 입력 경계로 확장했다. NFKC 정규화, format control 제거, split-letter 탐지와 영어·한국어·일본어·스페인어 지시문 제거를 7개 공격 case와 7개 safe control로 평가했다. attack detection, fact retention, payload removal, safe preservation은 모두 `1.0`이며, 제거할 내용이 없는 입력은 원문을 그대로 반환한다.

같은 설치 모델과 Q4의 동일한 10-case suite를 v4로 다시 실행했다. 첫 실행은 safe version identifier `2.2`가 `2. 2`로 변해 9/10에 머물렀다. 기준을 낮추지 않고 sentence boundary가 decimal을 자르지 않도록 고쳤고, evidence 비교도 JSON key 순서와 무관한 canonical record 비교로 바꿨다. 최종 실행은 같은 model digest, runtime, case와 threshold에서 10/10을 통과했고 Q4의 품질 지표를 모두 유지했다.

`evidence/output-artifacts/answer-input-boundary-evaluation.json`과 `evidence/output-artifacts/local-answer-composition-boundary-regression.json`은 raw text 대신 fixture·model·prompt·response hash와 집계만 기록한다. 결과는 `boundary-regression-passed-governance-blocked`, `hold-for-governance`이며 현재 answer path와 activation은 바꾸지 않는다.

실제 사용자 query 평가를 시작하기 전 필요한 consent, 철회, de-identification, retention, domain·language coverage를 `user-query-evaluation-intake` 계약으로 분리했다. 현재 evidence는 12개 synthetic record, 6개 domain, 4개 language를 사용하는 dry run이다. Raw query와 expected term은 저장하지 않으며 `actualUserQueryData: false`, `actualUserQueryQualityValidated: false`, training·fine-tuning submission·external transfer·provider input authorization은 모두 false다.

이 검증은 알려진 Unicode 변형과 네 언어의 고정 fixture에 한정된다. broad prompt-injection resistance, 실제 사용자 분포, 일반 품질 개선, model training, activation, rollout, production readiness를 증명하지 않는다.

## 현재 local user-query quality stop condition

Q6는 Q5 intake와 원본 synthetic dataset을 실행 직전에 다시 결합한다. Dataset과 intake는 2 MiB 이하 regular file만 허용하고 symlink를 거부한다. `localModelInputAuthorized: true`, `externalTransferAuthorized: false`, `trainingAuthorized: false`와 현재 consent·retention을 최초 preflight와 각 case 호출 직전에 확인한 뒤에만 loopback Ollama로 전달한다. Model에는 query와 evidence만 들어가며 expected answer term과 threshold는 evaluator에만 남는다.

같은 설치 모델 `qwen2.5:3b`, digest, Ollama `0.23.0`, v4 prompt hash와 all-pass threshold로 12개 synthetic query를 실행했다. 결과는 11/12, case pass rate `0.9167`, expected source citation rate `0.9167`, required term coverage `0.9167`이다. 한 English incident-operations case에서 model이 placeholder review action을 반환해 generation contract가 거부됐다. Runner는 전체 평가를 중단하지 않고 이 실패를 `invalid-review-action`으로 분류했으며, query·evidence·expected term·응답·raw error는 tracked evidence에 저장하지 않았다.

이 결과는 runner가 실패를 안전하게 격리한다는 증거지만 synthetic user-query 품질 통과 증거는 아니다. `localUserQueryEvaluationValidated: false`, `syntheticUserQueryQualityValidated: false`, `actualUserQueryQualityValidated: false`, `currentAnswerPathChanged: false`를 유지한다. 다음 단계는 threshold를 낮추거나 fixture를 통과용으로 바꾸는 작업이 아니라, reviewer action 일반화 실패를 별도 candidate에서 고친 뒤 같은 12-case와 Q4 10-case를 모두 재실행하는 것이다. 그 뒤에만 명시적 동의와 비식별 검토를 통과한 실제 user-query 평가를 진행한다.

## 현재 reviewer action generalization candidate

Q7은 Q6의 실패한 fixture나 evaluator를 바꾸지 않고 v5 prompt candidate만 분리했다. Summary-only objective에서도 구체적 review action을 만들고, evidence에 owner와 trigger 또는 condition이 함께 있으면 둘을 그대로 포함하도록 trusted contract를 명시했다. Model에는 여전히 objective와 sanitized evidence만 전달하며 expected answer term, threshold, baseline 결과는 전달하지 않는다.

같은 설치 모델 `qwen2.5:3b`, digest, Ollama `0.23.0`, input boundary와 unchanged all-pass threshold로 Q4 10-case와 Q6 12-case를 순차 실행했다. Q4는 10/10과 기존 metric parity를 유지했고, Q6는 11/12에서 12/12로 바뀌었다. 모든 generation은 source coverage와 specific review action을 통과했으며 external provider call과 model download는 없었다.

`evidence/output-artifacts/local-answer-review-action-generalization.json`은 Q4·Q6 baseline hash, suite·threshold hash, model·runtime·v5 prompt hash, case별 input·response hash와 집계만 기록한다. Query, evidence, expected term, answer text와 raw error는 저장하지 않는다. 결과는 `review-action-generalization-passed-actual-evaluation-required`지만 synthetic fixture에 한정되므로 `actualUserQueryQualityValidated: false`, `generalAnswerQualityImprovementValidated: false`, `currentAnswerPathChanged: false`, activation·rollout·production claim은 계속 false다.

다음 단계는 prompt를 runtime에 활성화하는 작업이 아니다. 별도 승인 아래 명시적 동의, 철회 가능성, 비식별 검토, current retention을 통과한 실제 user-query evaluation을 먼저 실행하고, Q4·Q6 회귀와 실제 분포가 함께 통과할 때만 다음 activation decision packet을 만든다.

## 현재 actual user-query evaluation protocol

Q8은 실제 사용자 dataset을 repository에 추가하지 않고 다음 평가 경로만 실행 가능하게 만들었다. Intake CLI는 2 MiB 이하 regular file만 읽고 symlink를 거부한다. 실제 dataset과 intake는 repository 밖 private directory 또는 Git이 무시하는 `var/` 아래에만 둘 수 있으며 tracked 경로를 지정하면 model 호출 전에 중단한다.

Actual intake가 확인되면 evaluator는 Q4 v4가 아니라 Q7 review-action generalization v5의 exact model, runtime, prompt, threshold baseline을 사용한다. Synthetic Q6 evidence와 기존 v4 runner contract는 바꾸지 않는다. 각 case 직전에 dataset과 content-free intake를 다시 읽어 consent, retention, local-model authorization, dataset hash가 현재 상태인지 확인하므로 중간 철회나 교체는 다음 model 호출 전에 실패한다.

Fake loopback Ollama test는 12-case actual-data protocol과 첫 generation 뒤 intake 삭제 시 중단을 검증한다. 이 테스트는 사용자 질의가 아닌 test fixture로 실행되므로 실제 평가 증적이 아니다. 현재 `actualUserQueryData: false`, `actualEvaluationExecuted: false`, `actualUserQueryQualityValidated: false`, `currentAnswerPathChanged: false`, `productionReadyClaim: false`를 유지한다. 실제 실행 절차와 삭제 경계는 `docs/actual-user-query-evaluation-v1.md`에 고정했다.

Q8.1은 실제 data를 받기 전에 private I/O와 평가 기준을 강화한다. Actual dataset·intake는 owner-only `0700/0600` 경계와 no-follow descriptor read를 통과해야 한다. Actual intake와 quality output은 승인한 canonical path를 commit 직전까지 다시 확인하고, `0600` temporary file을 동기화한 뒤 같은 directory에서 atomic rename한다. 이 강화는 actual-data path에만 적용해 synthetic CLI contract와 platform requirement를 유지한다. Q6·Q7 all-pass threshold는 core의 단일 frozen contract로 이동했으며 suite, evaluator result, Q7 baseline, 재해시된 evidence 중 하나라도 완화되면 실패한다. 공개 API와 저장 형식은 바꾸지 않았고 actual data, model call, activation, training은 추가하지 않았다.

## 개발 순서

| 단계 | 상태 | 비용 없는 구현 | 완료 기준 |
|---|---|---|---|
| Q1 Answer quality foundation | 완료 | 순수 evaluator, fixture, unit test, deterministic smoke | passing baseline과 의도적 regression을 모두 판정 |
| Q2 Actual local answer-quality baseline | 완료 | 이미 설치된 qwen2.5:3b에 objective와 retrieved evidence만 전달하고 Q1 두 case를 실제 생성·평가 | citation gate는 통과했지만 required term coverage 0.6667로 회귀를 고정하고 기존 답변 경로 유지 |
| Q3 Evidence-first answer composition | 완료 | 같은 model·retrieval에서 summary, source claim, review action을 구조화하고 evaluator 정답 비노출 비교 | Q1 case pass 0.0→1.0, required term coverage 0.6667→1.0, citation 지표 유지, runtime 미활성화 |
| Q4 Answer composition robustness and hardening | 완료 | Q3 regression·한국어·다중 도메인·bounded context·prompt injection 10-case 평가와 deterministic instruction boundary | v2 9/10·canary 1에서 v3 10/10·canary 0으로 개선, 다른 지표 회귀 0, runtime 미활성화 |
| Q5 Adversarial input boundary and user-query intake | 완료 | Unicode·다국어·split-letter 14-case 경계, 동일 모델 10-case 회귀, consent-first synthetic intake dry run | 입력 경계 14/14, v4 동일 suite 10/10, 실제 사용자 data·runtime activation·training 없음 |
| Q6 Local user-query quality evaluation | stop condition 기록 | Q5 intake를 같은 model·runtime·v4 prompt와 결합한 content-free 12-case local replay | 11/12와 `invalid-review-action` 1건을 보존하고 current path 유지; candidate 교정 전 실제 사용자 평가 중단 |
| Q7 Reviewer action generalization | 완료 | v5 prompt candidate를 Q4 10-case와 Q6 12-case에 같은 model·runtime·threshold로 재실행 | Q4 10/10 parity와 synthetic Q6 12/12, content-free evidence, current path·activation 불변 |
| Q8 Actual user-query evaluation protocol | 프로토콜 완료 · 데이터 대기 | private intake, tracked-path refusal, Q7 v5 binding, per-case consent reload, withdrawal fail-closed | fake loopback protocol 검증 완료; actual user data·quality·activation·training 없음 |
| Q8.1 Private evaluation I/O and threshold hardening | 완료 | owner-only input·output, no-follow descriptor read, atomic private write, frozen all-pass threshold | weak mode·symlink·hard link·threshold relaxation을 model 호출 또는 evidence 승인 전에 거부 |
| R1 Corpus contract | 완료 | memory·attachment·fact source의 chunk id, content hash, revision, scope, provenance 계약 통일 | 저장 형식과 retrieval payload 변경 없이 동일 index record 재생성 |
| R2 Retrieval evaluation | 완료 | 3개 fixture, precision·recall·noise·source diversity 기준, 현재 lexical·BM25·phrase baseline과 per-case regression 비교 | ranking candidate가 자체 gate와 frozen baseline을 모두 통과할 때만 반영 |
| R3 Optional semantic retrieval | 완료 | provider-neutral embedding contract, bounded local command adapter, scope-locked cosine experiment, controlled synonym comparison | 새 dependency와 runtime 활성화 없이 local protocol·quality gain·rollback boundary 검증 |
| R4 Reranking | 완료 | semantic 0.7·lexical 0.3 deterministic feature baseline, controlled tie comparison, latency measurement, state-free rollback order | runtime 변경 없이 품질·latency·rollback 비교 자료 확보 |
| R5 Local semantic runtime opt-in | 완료 | explicit local command mode, mission scope lock, semantic·lexical reranking, lexical default와 state-free rollback | fixture mission lifecycle에서 semantic 선택, exact lexical parity, failure-before-provider 검증 |
| R6 Local embedding model qualification | 완료 | loopback Ollama command, actual installed model comparison, digest·license hash·quality evidence, governance decision gate | qwen2.5 3종 same-suite 측정, 3B quality pass, activation governance-blocked와 lexical rollback 유지 |
| R7 Retrieval robustness evaluation | 완료 | 3개 scenario와 5개 query variation의 15-case suite, actual model binding, content-free integrity evidence | qwen2.5:3b candidate 회귀를 failed-keep-lexical로 고정하고 quality threshold·activation 차단 유지 |
| R8 Local relevance reranker evaluation | 완료 | independent query-document structured scoring, untrusted input boundary, repeat stability, prior evidence binding | 동일 15-case 1.0과 hard-negative 3/3 통과를 기록하되 runtime·governance 승인 전 activation 차단 |
| R9 Local reranker resource envelope | 완료 | lexical top-2 preflight, quality parity, repeated latency, Ollama loaded-model footprint, R8 rollback binding | 15-case와 hard-negative 품질을 유지하며 inference·p50·p95·total 감소를 기록하되 maximum regression과 governance 미완료로 activation 차단 |
| R10 Local reranker runtime stability | 완료 | cold 1·warm 3·concurrent client worker 2의 6-run contract, 360 inference, quality·resource parity와 bounded latency gate | cold/warm/concurrent 관측을 기록하되 production parallelism·long soak·thermal·governance 미완료로 activation 차단 |
| R11 Local relevance shadow integration | 완료 | R10-bound scorer를 controlled stub mission의 manager·planner·executor·reviewer retrieval에 observation-only로 연결 | provider input·store·API·audit 불변, content-free record, scorer failure fail-open을 검증하고 activation은 차단 |
| R12 Multi-scenario shadow replay | 완료 | 3 scenario·15 query·60 role observation actual mission replay, full-query failure baseline과 mission-objective query correction | 15/15·hard-negative 3/3과 provider input 불변을 검증하고 controlled-fixture·governance 경계를 유지 |
| R13 Bounded shadow score cache | 완료 | model·prompt·query·document hash-bound process-local LRU, failure non-caching, in-flight dedup, 15-mission actual replay | 15/15을 유지하며 120 score request를 30 inference로 줄이고 maximum latency 회귀와 activation block을 보존 |
| R14 Shadow cache lifecycle stress | 완료 | 8-entry actual eviction replay, concurrent in-flight dedup, generation invalidation, stale-result drop, rollback close | 15/15과 120→30 inference를 유지하며 eviction 22, stale drop 1, closed entry 0을 검증하고 activation 차단 |
| R15 Shadow cache process isolation | 완료 | concurrent child process 2개와 restarted child process 1개의 empty-env score cache boundary, process identity, shutdown close | 각 process의 cold miss 1·local hit 1, identity 3개 분리, restart 후 재추론, forwarded secret 0과 closed entry 0을 검증하고 activation 차단 |
| R16 Shadow cache termination recovery and bounded soak | 완료 | warm child SIGKILL, cold recovery child, 16-entry cache의 48-pair actual soak와 heap·RSS regression gate | recovery 재추론·score parity, 64 request·48 inference·16 hit·32 eviction, closed entry 0과 memory gate 통과를 검증하고 activation 차단 |
| P1 Approved learning RAG feedback | 완료 | explicit learning promotion을 같은 mission의 다음 retrieval·planner·deliverable에 연결하고 rollback run까지 재생 | memory ID·content hash provenance, planner step 3→4→3, reviewer pass와 rollback exact artifact parity 검증 |
| P2 Multi-scenario learning feedback quality | 완료 | 같은 workspace의 3개 mission memory를 동시에 유지하고 Q1 answer-quality gate로 baseline·promotion·rollback을 실제 재생 | 0/3→3/3→0/3 case pass, foreign memory 2개 중 retrieved 0, 9 session, reviewer pass와 exact rollback parity 검증 |
| P3 Workspace learning personalization | 완료 | 별도 local-operator scope authorization 뒤 source workspace의 sibling mission에만 decision memory를 적용하고 foreign workspace와 rollback을 실제 재생 | 2 workspace·3 mission·7 session, sibling failed→passed→failed, planner 3→4→3, foreign exposure 0, audit ordering과 exact rollback parity 검증 |
| P4 Workspace learning conflict and revocation | 완료 | retrieval-selected workspace decision 충돌을 latest-revision policy로 하나만 provider에 전달하고 기존 rollback으로 newer→older fallback과 baseline 복원을 재생 | 2 workspace·4 mission·8 session, conflict candidate 2→newer 1, newer revoke→older exact, full rollback→baseline exact, foreign exposure 0 검증 |
| P5 Workspace learning operator override | 완료 | 검증된 workspace promotion을 local operator가 future expiration과 note로 고정하고 expired·clear 시 latest revision으로 복귀 | 2 workspace·4 mission·8 session, newer→older override→newer expiry→older repin→newer clear, exact parity와 foreign exposure 0 검증 |
| P6 Workspace learning operator surface | 완료 | 기존 action inbox에 content-free override state와 set·clear control을 연결하고 RBAC·candidate tenant·service validation 순서를 유지 | local HTTP not-set→active→expired→cleared, sanitized response, timeline order와 실제 Chromium button lifecycle 검증 |
| P7 Local user learning personalization | 완료 | tenant binding이 없는 local workspace에서만 explicit mission→user authorization 뒤 승인된 decision·preference를 sibling과 다른 local workspace mission에 적용 | 2 workspace·3 mission·7 session, 두 target failed→passed→failed, user lineage·audit ordering·exact rollback parity와 tenant-bound 차단 검증 |
| P8 User learning conflict and revocation | 완료 | retrieval-selected user decision 충돌을 latest-revision policy로 하나만 provider에 전달하고 기존 rollback으로 newer→older fallback과 baseline 복원을 재생 | 2 workspace·4 mission·8 session, conflict candidate 2→newer 1, cross-workspace newer 적용, newer revoke→older exact, full rollback→baseline exact 검증 |
| P9 User learning operator override | 완료 | 검증된 local-user promotion을 operator가 future expiration과 note로 고정하고 expired·clear 시 latest revision으로 복귀 | 2 workspace·4 mission·8 session, newer→older override→newer expiry→older repin→newer clear, cross-workspace older 적용과 exact parity 검증 |
| P10 User learning operator surface | 완료 | 기존 action inbox에 content-free user override state와 set·clear control을 연결하고 RBAC·candidate tenant·service validation 순서를 유지 | local HTTP not-set→active→expired→cleared, sanitized response, timeline order와 실제 Chromium button lifecycle 검증 |
| L1 승인된 학습 데이터 | 완료 | approved promotion, reviewer pass, verification, artifact lineage, sanitized example을 묶은 deterministic record | raw secret·customer payload 차단, mission scope와 content·lineage hash 보존 |
| L2 Dataset quality gate | 완료 | content·lineage·near-response 중복 제거, mission scope 분리, seeded train·validation split, leakage 검사 | 동일 seed와 입력에서 동일 content-free manifest 생성 |
| F1 Fine-tuning readiness | 완료 | provider-neutral JSONL export, Q1 baseline summary, content-free evaluation manifest 생성 | 학습 실행 없이 dataset과 baseline을 reviewer가 검토 가능 |
| F1.1 Fine-tuning data sufficiency | 완료 · 현재 데이터 부족 | F1 hash를 다시 검증하고 reviewed example·split·mission scope·baseline case·accepted-risk 비율을 content-free stop-condition으로 판정 | 현재 4 accepted·3 train·1 validation·4 scope·2 case로 `insufficient-data`; 후보 검토·학습·외부 제출 권한 없음 |
| F1.2 Reviewed-data collection plan | 완료 · 수집 미승인 | F1.1 부족량을 중복 없는 reviewed example·mission scope·answer-quality case 목표와 risk remediation 순서로 변환 | 최소 reviewed example 16개 안에 새 scope 6개 포함, baseline case 8개 별도; 원문·합성 record·수집·검토·학습 권한 없음 |
| F1.3 Reviewed-data intake request | 완료 · owner review 대기 | F1.2 exact hash와 16·6·8 target을 최대 7일 request에 결속하고 data handling owner review를 명시 | 원문·사용자 데이터·합성 record 없음, owner decision·collection·candidate review·학습·외부 제출 권한 없음 |
| F1.4 Reviewed-data intake resolution protocol | 완료 · 실제 decision 대기 | current F1.1~F1.3 chain과 다섯 ordered private owner-role attestation을 request당 하나의 content-free resolution으로 결속 | identity·evidence 독립 검증과 tracked decision 없음; approve도 private collection plan만 허용하고 실제 수집·candidate review·학습·외부 제출은 계속 차단 |
| F1.5 Private collection plan | 완료 · 실행 승인 대기 | 유효한 F1.4 attestation과 F1.1~F1.4 hash·target을 7개 pending private preparation step에 결속 | tracked plan·workspace·data 없음; 별도 collection execution approval 전 수집·candidate review·학습·외부 제출 차단 |
| F1.6 Private collection execution request | 완료 · owner review 대기 | 유효한 F1.5 plan과 F1.1~F1.5 hash·target을 7개 action과 5개 execution owner review에 결속 | tracked request·owner decision·workspace·data 없음; 별도 resolution 전 workspace 생성·수집·candidate review·학습·외부 제출 차단 |
| F1.7 Private collection execution resolution protocol | 완료 · 실제 decision 대기 | Current F1.1~F1.6 chain과 13개 hash, inherited expiry·target·7 action·5 ordered private review를 request당 하나의 hash-only resolution으로 결속 | unanimous attestation만 bounded collection authority를 열지만 tracked decision·resolution·workspace·data는 없고 identity·evidence 검증, candidate review·학습·외부 제출은 차단 |
| F1.8 Private collection workspace protocol | 완료 · 실제 workspace 준비 대기 | Current F1.1~F1.7 chain과 14개 hash, inherited expiry·target·7 action을 resolution당 하나의 empty two-lane workspace record에 결속 | tracked approval·resolution·workspace·data 없음; preparation은 collection start가 아니며 identity·evidence 검증, candidate review·학습·외부 제출은 차단 |
| F1.9 Private collection item admission protocol | 완료 · content admission 대기 | Current F1.1~F1.8 chain, exact workspace와 content-free envelope의 16 hash, expiry·target·7 action을 owner-only immutable admission history에 결속 | opaque reference만 기록하고 content·workspace mutation·approved record/case·identity/evidence/usage/consent/redaction/retention 검증, candidate review·학습·외부 제출은 차단 |
| F1.10 Private collection item write protocol | 완료 · sanitized synthetic item write 대기 | Current F1.1~F1.9 chain, admission·content·sanitization 19 hash와 origin-consent matrix를 lane item record에 결속 | private owner-only atomic write, tombstone read gate, deterministic safety scan만 수행하며 independent deidentification·approved record/case·candidate review·학습·외부 제출·production claim은 차단 |
| F1.11 Private collection item withdrawal and retention-deletion lifecycle | 완료 · 실제 owner decision 대기 | exact stored item·admission·workspace binding, owner-attested decision, same-lane atomic removal, terminal tombstone v2와 absence receipt | synthetic fixture에서 local absence만 관측; owner identity·independent deletion proof·training·provider·deploy·production claim 없음 |
| F1.12 Private collection item review projection protocol | 완료 · 실제 owner review 대기 | live exact F1.10 item을 lane-specific content-free pending projection으로 결속하고 shared lock·terminal/removal refusal·one-final item history를 적용 | approved record·answer-quality case 생성, eligibility/Q1 content 평가, training·provider·submission·deploy·production claim 없음 |
| F1.13 Private collection item review resolution protocol | 완료 · 실제 owner resolution 대기 | exact F1.12 final projection과 quality-reviewer approve/reject를 content-free decision·resolution history, shared lock·current-chain revalidation·pending resume에 결속 | canonicalization/enrichment request만 lane별로 표시하고 approved record/case·candidate review·training·provider·submission·deploy·production claim 없음 |
| F1.14 Private collection item artifact request protocol | 완료 · 실제 private artifact preparation 대기 | exact approved F1.13 resolution을 lane-specific content-free canonicalization 또는 enrichment preparation request와 input hash에 결속 | approved record/case·candidate review·training·provider·submission·deploy·production claim 없음 |
| F1.15 Private collection item artifact preparation resolution protocol | 완료 · 실제 quality-reviewer resolution 대기 | exact F1.14 request와 token-hash decision을 owner-only decision/resolution history, shared lock·current-chain revalidation·pending resume·atomic final directory에 결속 | approve도 lane-specific preparation만 표시하며 content·approved record/case·candidate review·training·provider·submission·deploy·production claim 없음 |
| F1.16 Private answer-quality case enrichment candidate protocol | 완료 · 실제 reviewer Q1 resolution 대기 | exact approved live F1.15 answer-quality resolution과 curated-synthetic item의 objective/answer linkage를 content-free lineage reference·hash·lifecycle timestamp·count·deterministic precheck와 owner-only candidate history에 결속 | `q1ContractSatisfied: false`; case 생성·candidate review 완료·training·provider·submission·deploy·production claim 없음 |
| F1.17 Private answer-quality enrichment candidate review resolution protocol | 완료 · 실제 reviewer decision 대기 | canonical F1.16 final candidate와 quality-reviewer approve/reject를 content-free decision/resolution bundle, strict expiry·terminal·history·inode gate와 owner-only atomic publish에 결속 | approve도 reviewer gate와 F1.18 materialization allowance만 열며 `q1ContractSatisfied: false`; case materialization·evaluation·training·provider·submission·deploy·production claim 없음 |
| F1.18 Private answer-quality case materialization protocol | 완료 · 실제 private materialization 대기 | canonical approved F1.17 resolution과 live F1.16 candidate, owner-only enrichment input을 재검증하고 fixed reviewer-pass Q1 evaluation이 통과할 때 content-free logical case를 atomic publish | definition·evaluation hash, counts와 metrics만 기록; payload·training·provider·submission·deploy·production authority 없음 |
| F1.19 Private answer-quality case payload lifecycle | 완료 · 실제 owner decision 대기 | 별도 retention owner decision 뒤 curated-synthetic F1.18 case와 byte-equivalent한 최소 replay payload만 owner-only atomic publish하고 F1.11 payload-first deletion cascade에 결속 | reject는 raw input 미접근; managed namespace absence만 증명하며 actual user data·training·provider·submission·deploy·production claim 없음 |
| F1.20 Private answer-quality payload replay | 완료 · 실제 local operator request 대기 | exact stored F1.19 payload을 frozen F1.18 Q1 evaluator로 replay하고 별도 local-operator request와 content-free owner-only receipt를 atomic publish | enrichment input·actual user data·model call·training·provider·submission·deploy·production claim 없음; F1.11 cascade는 F1.19 raw payload 다음 F1.20 receipt를 제거 |
| F2a Local training runtime contract | 완료 | exact F1 packet과 별도 local approval을 bounded child process protocol로 연결하고 content-free run record 생성 | 변조·만료·trainer drift·timeout·output 폭주·stderr 노출·unsafe metadata·허위 actual-training 표시 차단, store 불변과 fixture replay 검증 |
| F2b Local training product permission surface | 완료 | license·OS egress·resource evidence hash와 각 owner, approval·rollback owner를 기존 action inbox·RBAC·tenant·audit에 연결 | CLI·HTTP·Chromium 승인과 철회, private readiness file, content-free evidence, actual training 미실행 검증 |
| F2c.1 Local training environment preflight | 완료 · 실행 차단 | 실제 local model artifact·manifest·license hash와 system capacity를 content-free snapshot으로 확인하고 trainable source·trainer·permission·독립 review·rollback owner gate 평가 | 7개 blocker를 고정해 `stop-before-local-training`; dependency 설치·실제 학습·외부 호출·rollout 없음 |
| F2c.2 Local training toolchain decision | 완료 · 승인 대기 | Apple Silicon·Python·uv 환경에 맞춰 pinned MLX-LM LoRA와 Apache-2.0 Qwen2.5-1.5B safetensors source를 acquisition 후보로 선택 | 기술 blocker 0, 설치·다운로드·license·egress·resource canary·rollback·product permission 7개 승인 대기 |
| F2c.3 Local training acquisition approval contract | 완료 · owner 승인 대기 | F2c.2 decision과 relative mutable root, 5개 owner 역할, 7개 ordered action, proposed-not-measured resource cap을 hash-bound request로 고정 | acquisition·설치·다운로드·학습·외부 제출·rollout 권한 없음; 승인되어도 acquisition만 허용 |
| F2c.4 Local training acquisition resolution surface | 완료 · 실제 decision 대기 | private decision file, exact owner field, tracked·symlink refusal, current decision 재검증, request당 1회 content-free history 기록 | 실제 operator decision은 tracked하지 않음; approve도 acquisition만 허용하고 설치·다운로드·학습은 실행하지 않음 |
| F2c.5 Local training acquisition execution plan | 완료 · 실제 승인 대기 | approved private resolution의 exact field·integrity·expiry·current request binding을 재검증하고 7개 action을 pending plan으로 기록 | private 0600 plan은 실행 권한이 아니며 rejection·tampering·stale input은 file 생성 전 차단 |
| F2c.6 Local training acquisition runtime contract | 완료 · 실제 실행 차단 | current approval·request·toolchain·exact plan을 재검증하고 content-free metadata만 injected adapter에 전달 | fixture evidence만 검증; adapter 자기보고는 실제 설치·download 증적이 아니며 training·external call·rollout 없음 |
| F2c.7 Local training acquisition artifact verification | 완료 · fixture 증적 | approved root 안의 exact trainer·source-model manifest와 실제 file bytes·SHA-256을 독립 검증하고 adapter artifact-set hash와 resource envelope에 binding | temp fixture만 관찰; actual artifact·acquisition provenance·egress review·resource canary·product permission·training은 미검증 |
| F2c.8 Local training post-acquisition readiness | 완료 · fixture 증적 | provenance·egress·offline canary evidence를 owner·artifact verification·run에 binding하고 기존 product permission evidence hash와 재결합 | fixture contract만 검증; 실제 artifact·review·canary·post-install permission·training은 미실행 |
| F2c.9 Local training execution admission | 완료 · fixture 증적 | recorded readiness의 F1 target과 current permission·revocation 상태를 process spawn 직전에 재검증하고 run lineage 기록 | fixture child process만 검증; 실제 acquisition·owner review·training·external call·rollout은 미실행 |
| F2c.10 Local training candidate artifact verification | 완료 · fixture 증적 | fixed candidate root의 complete manifest inventory, regular-file bytes·SHA-256, run-reported artifact set, current permission disk envelope를 독립 검증 | temp candidate files만 검증; actual artifact·training provenance·candidate evaluation·rollout은 미실행 |
| F2c.11 Local candidate evaluation admission | 완료 · fixture 증적 | recorded candidate verification, current permission, explicit no-revocation, F1 case·threshold contract, resource envelope, operator와 expiration을 request·admission hash에 binding | bounded local evaluation만 허용; actual artifact·model evaluation·training provenance·rollout은 미실행 |
| F2c.12 Local candidate evaluation runtime | 완료 · fixture 증적 | current authority 재검증, fresh candidate file hash, evaluator identity, bounded local stdio, canonical quality result와 O1a run lineage binding | fixture evaluator만 실행; CPU·memory·network isolation은 caller-owned, raw suite digest·verify-to-open hardening·actual model·rollout은 미완료 |
| F2c.13 Immutable evaluation input view | 완료 · fixture 증적 | exact suite bytes, manifest-listed candidate snapshot, combined disk envelope, pre/post input verification, cleanup-before-evidence binding | executable provenance는 F2c.14에서 별도 binding; OS isolation·crash cleanup·actual model·rollout은 미완료 |
| F2c.14 Evaluator bundle provenance | 완료 · fixture 증적 | executable SHA-256과 static ESM module·resource closure를 request·admission·run에 binding하고 snapshot entry 실행과 pre/post 검증 | hash-to-exec TOCTOU·dynamic/native loading·OS resource/network isolation·crash cleanup·actual model·rollout은 미완료 |
| F2c.15 Pre-spawn workspace recovery | 완료 · fixture 증적 | owner-only namespace와 hash-bound lease를 두고 current authority·evaluator·candidate 재검증 뒤 `expired + dead PID + preparing` workspace만 atomic claim·bounded delete | post-spawn process-tree·OS restart cleanup, same-user TOCTOU, actual model evaluation·rollout은 미완료 |
| F2c.16 Post-spawn evaluator process lifecycle | 완료 · fixture 증적 | detached POSIX process group, direct-leader-only bounded-failure termination, close·group-absence-before-cleanup, content-free lifecycle hash, unknown-quiescence workspace 보존 | actual host restart·escaped session recovery, same-user TOCTOU, OS resource·network isolation, actual model evaluation·rollout은 미완료 |
| F2c.17 Host boot identity recovery | 완료 · fixture 증적 | kernel boot identity SHA-256을 lease v2에 binding하고 `expired + prior boot + spawning`만 no-signal atomic recovery, same-boot·v1·unavailable identity 보존, explicit cleanup authorization과 monotonic quiescence deadline | injected boot transition만 검증; actual host restart·escaped session, same-user TOCTOU, OS resource·network isolation, actual model evaluation·rollout은 미완료 |
| F2c.18 Manual host restart rehearsal | 완료 · fixture 계약 | private prepare/resume, owner-only no-follow state, one synthetic spawning lease, two-sided host-reader binding, changed-boot·expiry·exact-recovery gate, idempotent receipt, no reboot·signal·evaluator relaunch | deterministic tracked transition은 injected이며 `actualHostRestartObserved: false`; 실제 성공은 private receipt와 F2c.19 최소 projection으로 분리 |
| F2c.19 Actual host restart receipt | 완료 · operator receipt 기록 | export 시 private resume의 idempotent result를 다시 검증하고 rehearsal ID·result hash·recovery booleans만 content-free tracked projection으로 기록 | 실제 restart의 독립 재검증에는 private source 필요; public smoke는 projection contract만 검증, evaluator relaunch·model evaluation·training·rollout은 미실행 |
| F2c.20 MLX-LM LoRA adapter contract | 완료 · fixture 증적 | F2a admission 뒤 pinned local paths, exact F1 train·valid bytes, fixed offline argv·env, complete acquisition inventory, candidate manifest와 atomic publish를 fixture로 재생 | static fixture closure는 F2c.22에서 결속; actual process mode는 OS egress·resource·process lifecycle·revocation monitoring·dynamic/native dependency·verify-to-exec가 마련될 때까지 차단 |
| F2c.21 Durable training failure recovery | 완료 · fixture 증적 | approval·readiness·artifact·adapter hash에 결속된 owner-only ledger, atomic phase 전이, workspace-first cleanup, explicit cleanup request, partial rollback resume와 idempotent receipt 검증 | same-user TOCTOU와 OS process·network·resource isolation은 미완료; actual process·설치·download·training·rollout 미실행 |
| F2c.22 Static training runtime closure provenance | 완료 · fixture 증적 | pinned interpreter·entrypoint·statically resolved allowlisted fixture modules의 exact bytes와 import graph를 content-free hash로 결속하고 adapter가 workspace 전·invocation 직전 재검증 | dynamic·native closure와 verify-to-exec는 false로 유지; known unsafe construct와 unsafe file 거부, actual process·설치·download·training·rollout 미실행 |
| F2c.23 Local training process supervisor | 완료 · fixture process 증적 | actual local Node fixture child에 spawn 전·주기적·결과 수락 전 exact authority 재검증, live-leader revocation·timeout group termination, no late signal, leader close·group absence cleanup gate 적용 | MLX adapter는 supervisor contract만 결속하고 integration은 false; OS network·resource, dynamic/native closure, verify-to-exec, actual MLX·training·rollout 미실행 |
| F2c.24 Darwin training OS isolation preflight | 완료 · actual fixture 증적 | unsandboxed loopback control 뒤 fixed `sandbox-exec` deny-network로 connect·listen 차단, pre-exec POSIX core·CPU·file-size·open-files hard limit과 bounded output을 actual Darwin fixture에서 검증 | filesystem containment·Linux strategy·MLX integration·unified-memory enforcement는 미완료; actual MLX·training·provider·rollout·deployment 미실행 |
| F2c.25 Darwin runtime exec observation | 완료 · actual fixture 증적 | sandboxed child의 executable·entry self-hash와 parent pre/post identity를 대조하고 loaded image·module set을 raw path 없이 관찰 | child report 전 TOCTOU 방지, late lazy load, shared-cache image bytes, MLX native closure·verify-to-exec는 미완료; actual MLX·training·provider·rollout 미실행 |
| F2c.26 Darwin runtime image provenance | 완료 · actual fixture 증적 | live sandboxed child의 347 image를 `vmmap`에서 교차 관찰하고 regular byte identity와 dyld shared-cache UUID·signed cache identity를 content-free hash로 결속 | vmmap exact set equality, late load, shared-cache 전체 byte hash, same-user resistance, MLX native closure·verify-to-exec는 미완료; actual MLX·training·provider·rollout 미실행 |
| F2c.27 Darwin suspended verify-to-exec | 완료 · actual fixture 증적 | root-owned signed interpreter의 kernel-observed CDHash를 suspended child resume 전에 확인하고, broker·entrypoint를 open descriptor에 결속해 path replacement와 mismatch-before-user-code를 검증 | actual MLX interpreter·entrypoint integration, post-resume dynamic/native closure와 unified-memory enforcement는 미완료; `verifyToExecClosed: false`, actual MLX·training·provider·rollout 미실행 |
| F2c 실제 local model training | 승인 작업 | 실제 license·egress·resource evidence가 owner review를 통과한 환경에서 같은 protocol로 실행 | actual model artifact, independently checked resource evidence, rollback owner와 candidate evaluation evidence 기록 |
| F2d 외부 fine-tuning 실행 | 외부 작업 | 승인된 provider·budget·model이 있을 때 별도 adapter로 제출 | 명시 승인, 비용 한도, model id, 결과, rollback 기록 |
| O1a Candidate evaluation gate | 완료 | F1 packet과 같은 Q1 suite에서 fixture·recorded candidate result의 품질·증적·권한·rollback 판정 | 회귀 시 keep-baseline, 통과 시 rollout 없이 reviewer 대기 |
| O1b Model rollout | 외부 작업 | 실제 trained candidate model과 baseline을 같은 target fixture·runtime에서 비교하고 승인된 rollout 실행 | 실제 모델 증적·reviewer·rollback owner·activation 승인 없으면 중단 |

RAG 단계에서는 현재 공개 API, CLI, HTTP payload, 저장 형식, permission 판단, audit ordering을 유지한다. 새 index가 필요하면 기존 source를 읽어 만든 파생 데이터로 두고, 원본 store를 migration하지 않는다.

Fine-tuning은 지식을 최신으로 만드는 수단으로 사용하지 않는다. 다음 조건을 모두 만족할 때만 고려한다.

- retrieval과 prompt 개선 후에도 반복되는 행동 문제가 남아 있다.
- 승인된 학습 데이터가 F1.1 개발 기준을 통과하고 train·validation scope가 분리되어 있다. 이 통과는 후보 검토 조건이지 품질 보장이나 학습 권한이 아니다.
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
node --test test/ollama-answer-generator.test.mjs test/local-answer-quality-baseline.test.mjs
node --test test/local-answer-composition-candidate.test.mjs
node --test test/local-answer-composition-robustness.test.mjs test/local-answer-composition-hardening.test.mjs
node --test test/untrusted-instruction-boundary.test.mjs test/answer-input-boundary-evaluation.test.mjs
node --test test/local-answer-composition-boundary-regression.test.mjs test/user-query-evaluation-intake.test.mjs test/local-user-query-quality.test.mjs
node --test test/retrieval-corpus.test.mjs test/retrieval-artifacts.test.mjs
node --test test/retrieval-quality-evaluation.test.mjs
node --test test/embedding-adapter.test.mjs test/semantic-retrieval.test.mjs
node --test test/retrieval-reranker.test.mjs
node --test test/retrieval-runtime-service.test.mjs
node --test test/loopback-json-client.test.mjs test/local-embedding-model-qualification.test.mjs
node --test test/retrieval-robustness-evaluation.test.mjs
node --test test/local-relevance-reranker.test.mjs test/local-relevance-reranker-evaluation.test.mjs
node --test test/local-relevance-benchmark.test.mjs test/local-reranker-resource-envelope.test.mjs
node --test test/ollama-model-runtime.test.mjs test/local-reranker-runtime-stability.test.mjs
node --test test/local-relevance-shadow.test.mjs test/local-relevance-shadow-evidence.test.mjs
node --test test/local-relevance-shadow-replay.test.mjs
node --test test/local-relevance-score-cache.test.mjs test/local-relevance-shadow-cache-evidence.test.mjs
node --test test/local-relevance-shadow-cache-lifecycle.test.mjs
node --test test/approved-learning-rag-feedback.test.mjs
node --test test/approved-learning-feedback-quality.test.mjs
node --test test/workspace-learning-personalization.test.mjs test/stub-provider-memory-adaptation.test.mjs
node --test test/workspace-learning-selection.test.mjs test/workspace-learning-conflict-revocation.test.mjs
node --test test/workspace-learning-selection-service.test.mjs test/workspace-learning-operator-override.test.mjs
node --test test/action-handlers.test.mjs test/action-inbox.test.mjs test/action-inbox-ui.test.mjs
node --test test/approved-training-record.test.mjs
node --test test/training-dataset-quality.test.mjs
node --test test/fine-tuning-readiness.test.mjs
node --test test/fine-tuning-data-sufficiency.test.mjs
node --test test/fine-tuning-data-collection-plan.test.mjs
node --test test/fine-tuning-data-intake-request.test.mjs
node --test test/fine-tuning-data-intake-resolution.test.mjs test/fine-tuning-data-intake-resolution-script.test.mjs
node --test test/fine-tuning-private-collection-plan.test.mjs test/fine-tuning-private-collection-plan-script.test.mjs
node --test test/fine-tuning-private-collection-execution-resolution.test.mjs test/fine-tuning-private-collection-execution-resolution-script.test.mjs
node --test test/fine-tuning-private-collection-workspace.test.mjs test/fine-tuning-private-collection-workspace-script.test.mjs
node --test test/local-training-runtime.test.mjs test/local-training-permission.test.mjs test/local-training-permission-service.test.mjs
node --test test/candidate-model-evaluation.test.mjs
node --test test/local-candidate-evaluation-host-boot-identity.test.mjs test/local-candidate-evaluation-workspace-recovery.test.mjs test/local-candidate-evaluation-host-restart-rehearsal.test.mjs test/local-candidate-evaluation-host-restart-receipt.test.mjs test/local-candidate-evaluation-process-lifecycle.test.mjs test/local-candidate-evaluation-runtime.test.mjs
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
npm run smoke:workspace-learning-operator-surface-browser
npm run smoke:local-user-learning-personalization
npm run smoke:user-learning-conflict-revocation
npm run smoke:user-learning-operator-override
npm run smoke:user-learning-operator-surface
npm run smoke:user-learning-operator-surface-browser
npm run smoke:approved-training-record
npm run smoke:training-dataset-quality
npm run smoke:fine-tuning-readiness
npm run smoke:fine-tuning-data-sufficiency
npm run smoke:fine-tuning-data-collection-plan
npm run smoke:fine-tuning-data-intake-request
npm run smoke:fine-tuning-data-intake-resolution
npm run smoke:fine-tuning-private-collection-plan
npm run smoke:fine-tuning-private-collection-execution-request
npm run smoke:fine-tuning-private-collection-execution-resolution
npm run smoke:fine-tuning-private-collection-workspace
npm run smoke:local-training-runtime
npm run smoke:local-training-permission-surface
npm run smoke:local-training-permission-evidence
npm run smoke:local-training-permission-surface-browser
npm run preflight:local-training-environment
npm run smoke:local-training-environment-preflight
npm run plan:local-training-toolchain
npm run smoke:local-training-toolchain-decision
npm run plan:local-training-acquisition
npm run smoke:local-training-acquisition-request
npm run smoke:local-training-acquisition-resolution
npm run plan:local-training-acquisition-execution -- --resolution var/local-training/acquisition-resolutions/<resolution-id>.json
npm run smoke:local-training-acquisition-execution-plan
npm run build:local-training-acquisition-runtime-evidence
npm run smoke:local-training-acquisition-runtime
npm run build:local-training-acquisition-artifact-verification-evidence
npm run smoke:local-training-acquisition-artifact-verification
npm run build:local-training-post-acquisition-readiness-evidence
npm run smoke:local-training-post-acquisition-readiness
npm run build:mlx-lm-lora-training-adapter-evidence
npm run smoke:mlx-lm-lora-training-adapter
npm run build:local-training-candidate-artifact-verification-evidence
npm run smoke:local-training-candidate-artifact-verification
npm run build:local-candidate-evaluation-admission-evidence
npm run smoke:local-candidate-evaluation-admission
npm run build:local-candidate-evaluation-runtime-evidence
npm run smoke:local-candidate-evaluation-runtime
npm run smoke:local-candidate-evaluation-input-view
npm run smoke:local-candidate-evaluator-provenance
npm run smoke:local-candidate-evaluation-process-lifecycle
npm run smoke:local-candidate-evaluation-host-boot-recovery
npm run smoke:local-candidate-evaluation-host-restart-rehearsal
npm run smoke:local-candidate-evaluation-host-restart-receipt
npm run smoke:candidate-model-evaluation
npm run evaluate:local-answer-quality-baseline -- --endpoint http://127.0.0.1:11510 --model qwen2.5:3b --cloud-features-disabled --output evidence/output-artifacts/local-answer-quality-baseline.json
npm run smoke:local-answer-quality-baseline
npm run evaluate:local-answer-composition-candidate -- --endpoint http://127.0.0.1:11511 --model qwen2.5:3b --cloud-features-disabled --output evidence/output-artifacts/local-answer-composition-candidate.json
npm run smoke:local-answer-composition-candidate
npm run evaluate:local-answer-composition-robustness -- --endpoint http://127.0.0.1:11512 --model qwen2.5:3b --cloud-features-disabled --output evidence/output-artifacts/local-answer-composition-robustness.json
npm run smoke:local-answer-composition-robustness
npm run evaluate:local-answer-composition-hardening -- --endpoint http://127.0.0.1:11512 --model qwen2.5:3b --cloud-features-disabled --output evidence/output-artifacts/local-answer-composition-hardening.json
npm run smoke:local-answer-composition-hardening
npm run evaluate:answer-input-boundary
npm run smoke:answer-input-boundary
npm run evaluate:local-answer-composition-boundary-regression -- --endpoint http://127.0.0.1:11513 --model qwen2.5:3b --cloud-features-disabled --output evidence/output-artifacts/local-answer-composition-boundary-regression.json
npm run smoke:local-answer-composition-boundary-regression
npm run build:user-query-evaluation-intake
npm run smoke:user-query-evaluation-intake
npm run evaluate:local-user-query-quality -- --endpoint http://127.0.0.1:11514 --model qwen2.5:3b --cloud-features-disabled --output evidence/output-artifacts/local-user-query-quality.json
npm run smoke:local-user-query-quality
npm run evaluate:local-answer-review-action-generalization -- --endpoint http://127.0.0.1:11514 --model qwen2.5:3b --cloud-features-disabled --output evidence/output-artifacts/local-answer-review-action-generalization.json
npm run smoke:local-answer-review-action-generalization
npm run smoke:actual-user-query-evaluation-readiness
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

현재 안전하게 말할 수 있는 범위는 credential-free fixture가 retrieval hit, source citation, citation grounding, required content, unsupported citation, forbidden source와 reviewer verdict를 deterministic하게 검사하고, memory·attachment·fact source에서 동일한 corpus identity와 provenance를 재생성하며, controlled retrieval case에서 lexical baseline, local-command semantic experiment, deterministic semantic+lexical reranker를 같은 quality evaluator로 비교하고, 명시적 fixture command를 mission runtime에 연결해 scope 거부·lexical rollback·failure-before-provider를 재현하며, 실제 설치된 qwen2.5 3종을 같은 3-case suite로 측정한 뒤 selected 3B의 R7 15-case 실패, R8 독립 relevance scoring의 반복 안정적 15-case 통과, R9 top-2 evaluation의 동일 품질과 inference·p50·p95·total 감소 및 loaded-model snapshot, R10의 cold 1·warm 3·concurrent client worker 2 bounded 관측과 6-run 품질·resource parity, R11 controlled stub mission 4-role shadow path의 lexical provider input·store 불변과 fail-open, R12의 3 scenario·15 mission·60 role observation에서 full-query hard-negative 실패와 mission-objective query correction, R13의 exact hash-bound process-local cache에서 15/15 품질을 유지한 120 request·30 inference·90 hit와 maximum latency 회귀, R14의 8-entry eviction·in-flight invalidation·stale-result drop·rollback close, R15의 동시 child process 2개와 restart process 1개에서 각 cache의 cold miss·local hit·shutdown close, R16의 warm worker SIGKILL 뒤 cold recovery와 16-entry·48-pair bounded soak를 content-free evidence로 비교하고, P1의 approved mission memory가 다음 retrieval·planner·deliverable에 적용된 뒤 rollback으로 exact baseline artifact를 복원하며, P2의 같은-workspace 3 mission에서 승인 전·후·rollback Q1 case pass를 0/3·3/3·0/3으로 관찰하고 각 case의 foreign mission memory 후보 2개가 retrieval과 deliverable에 섞이지 않는지 확인하며, P3의 명시적 mission→workspace authorization 뒤 sibling mission에만 memory가 노출되고 foreign workspace는 차단되며 rollback이 exact baseline을 복원하는지 7개 session과 timeline audit으로 확인하고, 실제 local approval lifecycle에서 sanitized training record를 만든 뒤 중복 제거, mission-scope split, leakage 검사를 통과한 dataset을 provider-neutral JSONL과 reviewer evaluation manifest로 재생성하고 fixture candidate result의 non-regression과 rollback decision을 판정한다는 것이다.

추가로 P4~P6은 같은 workspace의 decision 충돌·revocation·bounded override와 HTTP/Chromium operator surface를, P7~P10은 tenant-free local user decision의 cross-workspace 적용·revocation·bounded override와 operator surface를 controlled replay로 확인한다. F2a는 exact F1 hash와 별도 local approval에 묶인 child-process protocol, content-free candidate artifact metadata와 store 불변을 검증한다. F2b는 license·egress·resource evidence digest와 owner를 기존 approval·RBAC·tenant·audit에 묶고 CLI·HTTP·Chromium에서 승인과 철회를 재생한다. F2c.9는 recorded post-acquisition readiness와 current permission·revocation을 process spawn 직전에 다시 확인하며, F2c.10은 trainer가 보고한 candidate artifact set을 fixed repo-local root의 complete inventory와 실제 file hash로 독립 재검증한다. F2c.11은 그 verification과 exact F1 suite bytes를 explicit request·current permission·no-revocation 상태에 다시 묶고 evaluator identity까지 고정해 bounded local evaluation admission만 만든다. F2c.12는 current authority와 candidate file hash를 다시 확인한 뒤 allowlisted local stdio evaluator의 canonical content-free 결과를 O1a run lineage로 연결한다. F2c.13은 manifest-listed candidate와 suite bytes를 임시 execution view에 복사해 pre/post hash와 cleanup을 run lineage에 묶는다. F2c.14는 executable digest와 static evaluator module·resource bundle을 admission과 snapshot execution에 묶는다. F2c.15는 전용 owner-only namespace에서 current authority 재검증 뒤 만료되고 owner PID가 죽은 `preparing` workspace만 회수한다. F2c.16은 evaluator direct leader의 detached POSIX group이 닫히고 사라진 뒤에만 workspace cleanup과 run evidence를 허용하며, leader 종료 후 group 상태가 불명확하면 workspace를 보존한다. F2c.17은 reliable kernel boot identity hash가 달라진 expired v2 `spawning` workspace만 signal 없이 회수하고 same-boot·legacy·unavailable identity를 보존한다. F2c.18 fixture는 private prepare/resume 계약을 검증하고, F2c.19는 같은 private result를 다시 검증해 한 번의 실제 host restart receipt를 민감정보 없이 추적한다. F2c.20은 exact F1 JSONL을 pinned MLX local paths와 fixed offline invocation에 연결하고 candidate manifest까지 fixture로 재생하되 actual process mode를 OS guard 전까지 차단한다. F2c.21은 publish 전 intent부터 terminal receipt까지 owner-only ledger에 기록해 workspace-first failure cleanup과 candidate rollback을 재개할 수 있게 한다. F2c.22는 pinned interpreter, entrypoint, reachable Python module bytes를 content-free provenance로 adapter contract에 묶고 두 차례 current reinspection을 수행한다. F2c.23은 별도 fixture supervisor에서 exact authority 재검증과 detached process-group termination·quiescence를 실제 local child로 확인하지만 MLX invocation에는 연결하지 않는다. F2c.24는 실제 Darwin fixture에서 fixed network deny와 CPU·file-size·open-files·core-dump limit을 확인하지만, portable containment나 MLX invocation integration을 주장하지 않는다. F2c.25는 같은 Darwin fixture에서 parent pre/post와 child self-hash를 대조하고 loaded image·module set을 관찰하지만, child report 이전 mutation과 MLX runtime closure를 닫았다고 주장하지 않는다. F2c.26은 live `vmmap` membership, regular image byte identity와 signed shared-cache UUID provenance를 대조하지만 exact mapping equality, late loading, same-user resistance와 MLX native set은 계속 별도 gate로 둔다. F2c.27은 signed fixture executable을 kernel-suspended 상태에서 actual CDHash와 대조하고 entrypoint path replacement를 inherited descriptor로 무력화하지만 actual MLX interpreter·entrypoint와 post-resume dynamic/native loading에는 아직 연결하지 않는다. Tracked runtime 자체는 fixture이며 MLX 전체 verify-to-exec, late dynamic/native loading, unified-memory enforcement, escaped session, evaluator relaunch, 실제 모델 학습과 rollout 증적은 포함하지 않는다.

이 결과는 qwen2.5 3B relevance scorer의 controlled fixture 품질, 한 로컬 환경의 evaluation-only resource·bounded stability snapshot, controlled stub mission shadow replay, 단일-process lifecycle, 세 child-process isolation, evaluation SIGKILL recovery와 48-pair soak, 한 번의 실제 host restart에서 synthetic prior-boot lease 회수, mission-scoped 세 사례의 feedback lifecycle, 한 source workspace 안에서 명시적으로 승인된 decision의 sibling 적용·foreign 차단·rollback 관측만 보여 준다. Provider-input 활성화, production server parallelism, production supervisor·worker pool·shared cache, killed process 내부 cleanup, 반복 host restart와 long-duration soak, thermal behavior, 실제 model binary 교체, 실제 사용자 query 분포, cross-mission generalization, 일반적인 workspace personalization, user personalization, retrieval 전용 learned reranker 성능, 실제 trained candidate model 평가, 일반적인 답변 정확도, fine-tuning 효과, production RAG 품질, 고객 업무 성과는 증명하지 않는다. Product permission surface는 연결됐지만 local model license의 실제 owner 승인, OS-level egress isolation, 승인된 resource·cold-start·concurrency·latency limit, long-duration soak와 thermal telemetry, cache lifecycle과 rollback owner 승인, provider-input activation, provider-specific submission adapter, 실제 local model training, 외부 fine-tuning 실행, model registry, 실제 model rollout은 아직 완료되지 않았으며 `productionReadyClaim: false`는 모든 단계에서 유지한다.
