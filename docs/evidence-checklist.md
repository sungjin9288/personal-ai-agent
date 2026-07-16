# Evidence Checklist

| 항목 | 상태 | 증거 | 메모 |
|---|---|---|---|
| 프로젝트 루트 확인 | 완료 | `<local-workspace>/personal-ai-agent` | local path는 evidence에서 치환 |
| 프로젝트 유형 판단 | 완료 | `docs/implementation-evidence.md` | PoC / MVP 구현 |
| 필수 CLI smoke 실행 | 완료 | `evidence/cli-logs/npm-run-smoke.log` | `exit_code=0` |
| Mission/session 생성 | 완료 | `evidence/cli-logs/bootstrap-local-runtime.log` | stub provider run completed |
| Session lifecycle 확인 | 완료 | `evidence/cli-logs/session-show-runtime.log` | completed session and agent runs |
| Artifact 생성 확인 | 완료 | `evidence/output-artifacts/runtime-mission-artifact-list.log` | prompt/plan/deliverable/reviewer artifacts |
| Approval/review gate 확인 | 완료 | `evidence/cli-logs/learning-promotions-runtime.log` | human-approver pending-review |
| Execution preflight boundary 확인 | 완료 | `evidence/cli-logs/execution-preflight-approval-runtime.log` | knowledge mode direct execution blocked |
| Provider adapter 구조 확인 | 완료 | `evidence/cli-logs/provider-adapter-structure.log` | provider registry/adapters |
| Provider CLI surface 확인 | 완료 | `evidence/cli-logs/provider-list.log` | `exit_code=0` |
| Global overview 확인 | 완료 | `evidence/cli-logs/overview-global.log` | `exit_code=0` |
| Release blocker 확인 | 완료 | `evidence/cli-logs/release-blockers-hermes.log` | `exit_code=0` |
| Web server 실행 | 완료 | `evidence/api-responses/api-health.json` | `/api/health` 응답 저장 |
| API 응답 저장 | 완료 | `evidence/api-responses/*.json` | health/meta/providers/execution status |
| Web UI screenshot | 완료 | `evidence/screenshots/operator-console-home.png` | Playwright screenshot |
| Operator surface browser screenshots | 완료 | `evidence/screenshots/operator-surface-mission-run.png`, `operator-surface-provider-readiness.png`, `operator-surface-action-inbox.png` | mission/provider/action support evidence captured by `npm run evidence:operator-surface-demo` |
| Recorded walkthrough script | 완료 | `docs/recorded-walkthrough-v1.md` | recording script and acceptance gate verified by `npm run smoke:recorded-walkthrough`; no published video URL yet |
| Architecture code walkthrough | 완료 | `docs/architecture-code-walkthrough-v1.md` | code-level navigation verified by `npm run smoke:architecture-code-walkthrough` |
| Provider readiness matrix | 완료 | `docs/provider-readiness-matrix-v1.md` | provider catalog/env/blocker boundary verified by `npm run smoke:provider-readiness-matrix` |
| Provider failure recovery demo | 완료 | `docs/provider-failure-recovery-demo-v1.md` | attention remediation, fallback policy, timeline/event audit verified by `npm run smoke:provider-failure-recovery-demo` |
| Memory retrieval quality fixture | 완료 | `docs/memory-retrieval-quality-fixture-v1.md` | retrieval ranking, source diversity, fact graph provenance, and instruction boundary verified by `npm run smoke:memory-retrieval-quality-fixture` |
| Answer quality evaluation foundation | 완료 | `docs/ml-rag-development-plan-v1.md`, `fixtures/answer-quality-cases-v1.json` | retrieval, citation, required-content, irrelevant-source, and reviewer regression gate verified by `npm run smoke:answer-quality-evaluation` |
| RAG corpus contract | 완료 | `src/core/retrieval-corpus.mjs`, `fixtures/retrieval-corpus-cases-v1.json` | deterministic source revision, chunk id, content hash, scope, and provenance verified by `npm run smoke:retrieval-corpus-contract` |
| Retrieval quality evaluation | 완료 | `src/core/retrieval-quality-evaluation.mjs`, `fixtures/retrieval-quality-cases-v1.json` | controlled precision, recall, noise, source diversity, frozen baseline, and regression comparison verified by `npm run smoke:retrieval-quality-evaluation` |
| Semantic retrieval experiment | 완료 | `src/core/embedding-adapter.mjs`, `src/core/semantic-retrieval.mjs`, `fixtures/semantic-retrieval-cases-v1.json` | bounded local command protocol, scope isolation, controlled synonym comparison, and runtimeActivation=false verified by `npm run smoke:semantic-retrieval-experiment` |
| Retrieval reranking experiment | 완료 | `src/core/retrieval-reranker.mjs`, `fixtures/reranking-cases-v1.json` | deterministic semantic+lexical feature scoring, controlled tie quality comparison, measured latency, state-free rollback order, and runtimeActivation=false verified by `npm run smoke:retrieval-reranking-experiment` |
| Local semantic retrieval runtime | 완료 | `src/core/retrieval-runtime-service.mjs`, `scripts/smoke-semantic-retrieval-runtime.mjs` | lexical parity, explicit local opt-in, scope refusal, semantic+lexical runtime selection, failure-before-provider, and state-free rollback verified by `npm run smoke:semantic-retrieval-runtime` |
| Local embedding model qualification | 완료 | `evidence/output-artifacts/local-embedding-model-qualification.json`, `src/core/local-embedding-model-qualification.mjs` | actual qwen2.5 model digest·dimension·quality comparison, 3B controlled-suite pass, governance-blocked activation, and lexical rollback verified by `npm run smoke:local-embedding-model-qualification` |
| Local retrieval robustness | 완료 | `evidence/output-artifacts/local-retrieval-robustness.json`, `fixtures/retrieval-robustness-cases-v1.json` | actual qwen2.5 3B 15-case result, hard-negative failure, content-free integrity, and failed-keep-lexical decision verified by `npm run smoke:local-retrieval-robustness` |
| Local relevance reranker | 완료 | `evidence/output-artifacts/local-relevance-reranker-evaluation.json`, `src/core/local-relevance-reranker.mjs` | independent query-document scoring, 90 local inference repeat stability, 15-case and hard-negative pass, content-free integrity, and activation block verified by `npm run smoke:local-relevance-reranker` |
| Local reranker resource envelope | 완료 | `evidence/output-artifacts/local-reranker-resource-envelope.json`, `src/core/local-relevance-candidate-selector.mjs` | top-2 expected-source preflight, 60 local inference repeat stability, R8 quality parity, latency/resource snapshot, maximum regression disclosure, and activation block verified by `npm run smoke:local-reranker-resource-envelope` |
| Local reranker runtime stability | 완료 | `evidence/output-artifacts/local-reranker-runtime-stability.json`, `src/core/local-reranker-runtime-stability.mjs` | cold 1·warm 3·concurrent client worker 2, 360 inference quality/resource parity, bounded latency gate, and production parallelism·long soak·thermal limitations verified by `npm run smoke:local-reranker-runtime-stability` |
| Local relevance shadow integration | 완료 | `evidence/output-artifacts/local-relevance-shadow-integration.json`, `src/core/local-relevance-shadow.mjs` | controlled manager·planner·executor·reviewer mission에서 R10 scorer binding, exact lexical provider input, content-free observation, store isolation, scorer-failure fail-open verified by `npm run smoke:local-relevance-shadow-integration` |
| Multi-scenario shadow replay | 완료 | `evidence/output-artifacts/local-relevance-shadow-replay-full-query-baseline.json`, `evidence/output-artifacts/local-relevance-shadow-replay.json` | 3 scenario·15 mission·60 role observation에서 full-query 12/15·hard-negative 0/3 실패를 보존하고 mission-objective query로 15/15·hard-negative 3/3, lexical provider input 불변과 activation=false를 verified by `npm run smoke:local-relevance-shadow-replay` |
| Bounded shadow score cache | 완료 | `evidence/output-artifacts/local-relevance-shadow-cache.json`, `src/core/local-relevance-score-cache.mjs` | exact hash-bound 64-entry process-local LRU가 15/15을 유지하고 120 request를 30 inference·90 hit로 줄이며 content-free entry, failure non-caching, maximum latency 회귀와 activation=false를 verified by `npm run smoke:local-relevance-shadow-cache` |
| Shadow cache lifecycle stress | 완료 | `evidence/output-artifacts/local-relevance-shadow-cache-lifecycle.json`, `src/core/local-relevance-shadow-cache-lifecycle.mjs` | 8-entry actual replay가 15/15·120 request·30 inference·90 hit와 eviction 22를 유지하고 in-flight invalidation·stale drop 1·fresh refill·rollback close entry 0을 verified by `npm run smoke:local-relevance-shadow-cache-lifecycle` |
| Approved training record | 완료 | `src/core/approved-training-record.mjs`, `fixtures/approved-training-record-cases-v1.json` | local approval lifecycle, reviewer·artifact lineage, sanitized example safety, accepted-risk governance, deterministic hashes, and externalSubmissionAuthorized=false verified by `npm run smoke:approved-training-record` |
| Training dataset quality gate | 완료 | `src/core/training-dataset-quality.mjs`, `fixtures/training-dataset-quality-cases-v1.json` | deterministic deduplication, mission-scope split, leakage checks, content-free manifest, and fineTuningExecutionAuthorized=false verified by `npm run smoke:training-dataset-quality` |
| Fine-tuning readiness export | 완료 | `src/core/fine-tuning-readiness.mjs`, `fixtures/fine-tuning-readiness-cases-v1.json` | provider-neutral JSONL, Q1 baseline binding, reviewer checklist, export digest, pending submission requirements, and fineTuningExecutionAuthorized=false verified by `npm run smoke:fine-tuning-readiness` |
| Candidate model evaluation gate | 완료 | `src/core/candidate-model-evaluation.mjs`, `fixtures/candidate-model-evaluation-cases-v1.json` | same-suite non-regression, evidence binding, fixture vs recorded result boundary, keep-baseline rollback, and activationAuthorized=false verified by `npm run smoke:candidate-model-evaluation` |
| Smoke validation summary | 완료 | `docs/smoke-validation-summary-v1.md` | deterministic public-readiness command list verified by `npm run smoke:smoke-validation-summary` |
| External evidence blockers | 완료 | `docs/external-evidence-blockers-v1.md` | external account/provider/demo URL/pilot feedback blockers verified by `npm run smoke:external-evidence-blockers` |
| CLI/agent output artifact | 완료 | `evidence/output-artifacts/*.md` | 기존 release evidence 복사 |
| Architecture diagram | 완료 | `evidence/architecture/current-architecture.mmd` | Mermaid |
| Sequence diagram | 완료 | `evidence/architecture/mission-run-sequence.mmd` | Mermaid |
| Provider adapter diagram | 완료 | `evidence/architecture/provider-adapter-structure.mmd` | Mermaid |
| 민감정보 파일명 검사 | 완료 | `evidence/evidence_manifest.md` | 제외 대상 없음 |
| API key 패턴 검사 | 완료 | `evidence/evidence_manifest.md` | 의심 패턴 없음 |
| 기존 portfolio zip 갱신 | 완료 | `_portfolio_export/personal_ai_agent_portfolio_pack.zip` | 2,375,236 bytes, SHA-256 `5936d33912a55ed3be93aa31de5d0f0a10cdec8177b3b5eabc74bc4b340dcca1` |

## 검증 실패 / 보류

| 항목 | 상태 | 이유 | 다음 조치 |
|---|---|---|---|
| Anthropic live validation | 검증 필요 | 외부 provider credential/billing 검증은 이번 작업 범위 밖 | provider 계정 준비 후 live validation |
| Hermes live validation | 검증 필요 | target Hermes model/env/evidence blocker 존재 | target architecture evidence와 env proof 확보 |
| Hosted SaaS production readiness | 미구현 | 현재 release docs가 production-ready claim을 금지 | hosted identity/session, tenant isolation, target deployment evidence 필요 |
| Public demo URL | 미구현 | 현재 repo에 demo link 없음 | recorded demo 또는 self-hosted preview 준비 |
| Published recorded walkthrough URL | 미구현 | recording script는 준비됐지만 접근 검증된 video URL 없음 | private/public recording URL 생성 후 접근 검증 |
