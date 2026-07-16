# Memory Retrieval Quality Fixture v1

- status: memory-retrieval-quality-fixture-current
- productionReadyClaim: false
- publicHostedDemoUrl: none
- credentialFreeReplay: yes
- scope: retrieval ranking, corpus identity, source diversity, fact graph provenance, fact revision lifecycle, instruction boundary
- relatedSecurityModel: [security-model-v1.md](security-model-v1.md)
- relatedArchitectureWalkthrough: [architecture-code-walkthrough-v1.md](architecture-code-walkthrough-v1.md)
- relatedDemoEvidenceIndex: [demo-evidence-index-v1.md](demo-evidence-index-v1.md)

## Purpose

This fixture explains how the local harness checks memory, retrieval, and fact graph behavior without using external providers or private data. It is meant for repository reviewers who want to understand whether retrieved context is useful, auditable, and bounded as untrusted input.

The safe claim is that deterministic smoke fixtures verify retrieval ranking signals, source diversity, fact graph provenance, fact revision/retirement behavior, and instruction-boundary handling. This is not a benchmark, not an accuracy score, and not production retrieval quality evidence.

## Fixture Matrix

| Fixture | Quality question | Verified behavior | Evidence command |
|---|---|---|---|
| Retrieval memory | Does retrieval prefer relevant memory and attachment chunks over unrelated text? | Workspace facts and incident-note chunks with provider drift/prompt normalization terms are selected; unrelated mission preference and appendix text are excluded | `npm run smoke:retrieval-memory` |
| Retrieval ranking | Are scoring signals inspectable? | Retrieval artifact includes lexical score, BM25 score, phrase boost score, matched terms, match count, and retrieval reason | `npm run smoke:retrieval-memory` |
| Corpus contract | Can the same source revision and chunk be identified without changing persisted data? | Memory, attachment, and fact records receive deterministic corpus/chunk ids, content hashes, scope, revision, and path-free provenance | `npm run smoke:retrieval-corpus-contract` |
| Retrieval evaluation | Does a ranking candidate preserve measured relevance and diversity? | Three controlled cases measure precision, recall, noise, source-type diversity, and compare candidates against the frozen lexical/BM25/phrase baseline | `npm run smoke:retrieval-quality-evaluation` |
| Semantic experiment | Can a local embedding command improve controlled synonym retrieval without changing runtime ranking? | Scope-locked local-process adapter and cosine scorer improve three fixture cases while runtime activation remains false | `npm run smoke:semantic-retrieval-experiment` |
| Reranking experiment | Can exact lexical evidence resolve a semantic tie without changing runtime ranking? | A deterministic semantic+lexical scorer improves three controlled tie cases, measures local overhead, and records the baseline rollback order | `npm run smoke:retrieval-reranking-experiment` |
| Local semantic runtime | Can the experiment contract enter a mission without changing the default runtime? | Explicit local opt-in selects semantic evidence, rejects cross-scope input and command failure before provider work, and returns exactly to lexical mode without state migration | `npm run smoke:semantic-retrieval-runtime` |
| Local model qualification | Does an installed model pass the same controlled suite without receiving activation authority? | Recorded qwen2.5 comparison selects 3B on quality and keeps activation governance-blocked | `npm run smoke:local-embedding-model-qualification` |
| Local retrieval robustness | Does the selected model retain quality under paraphrase, typo, Korean, and hard-negative variation? | Recorded 15-case evaluation fails the semantic+lexical candidate and keeps lexical rollback | `npm run smoke:local-retrieval-robustness` |
| Local relevance reranker | Can independent local scoring recover R7 failures without source-order bias or runtime activation? | Repeated 15-case scoring passes with content-free evidence and remains governance-blocked | `npm run smoke:local-relevance-reranker` |
| Local reranker resource envelope | Can a lexical shortlist reduce local scoring work without losing R8 quality? | Top-2 preflight retains every expected source, preserves 15-case quality, records latency and loaded-model footprint, and remains governance-blocked | `npm run smoke:local-reranker-resource-envelope` |
| Local reranker runtime stability | Does the R9 shortlist retain quality and resource identity across cold, warm, and bounded concurrent-client execution? | Six fixed runs preserve 15-case quality and resource snapshots while bounded latency gates pass and production parallelism, long soak, and thermal claims remain blocked | `npm run smoke:local-reranker-runtime-stability` |
| Local relevance shadow integration | Can the R10-bound scorer observe an actual mission without changing provider input or persisted state? | A controlled stub mission covers manager, planner, executor, and reviewer; content-free observations retain expected top-1, exact lexical provider input, store isolation, and scorer-failure fail-open | `npm run smoke:local-relevance-shadow-integration` |
| Multi-scenario shadow replay | Does the shadow query remain inside its qualified information-need contract across scenarios and variations? | Three scenarios, 15 stub missions, and 60 role observations preserve lexical provider input; a full-query hard-negative failure is retained before mission-objective scoring passes all 15 cases | `npm run smoke:local-relevance-shadow-replay` |
| Bounded shadow score cache | Can exact role-level score repetition be removed without changing quality or provider input? | A 64-entry process-local LRU retains 15/15, reduces 120 score requests to 30 model inferences with 90 hits, stores no query or document content, and preserves the maximum-latency regression | `npm run smoke:local-relevance-shadow-cache` |
| Shadow cache lifecycle stress | Do eviction, in-flight invalidation, and rollback avoid stale score reuse? | An 8-entry actual replay retains 15/15 with 22 evictions; a concurrent actual probe drops one stale in-flight result, refills fresh, closes with zero entries, and keeps provider input lexical | `npm run smoke:local-relevance-shadow-cache-lifecycle` |
| Shadow cache process isolation | Does process restart begin cold, and can concurrent workers avoid accidental cache sharing? | Two concurrent child processes and one restarted process each record one cold inference, one local hit, distinct process identity, zero forwarded parent environment keys, and zero entries after close | `npm run smoke:local-relevance-shadow-cache-process-isolation` |
| Shadow cache termination and soak | Does recovery stay cold after forced termination, and does repeated unique scoring remain capacity-bound? | A warm child is observed exiting by SIGKILL, a recovery child infers again, and a 16-entry cache processes 48 unique pairs plus 16 hits with 32 evictions and bounded local memory growth | `npm run smoke:local-relevance-shadow-cache-termination-soak` |
| Approved learning RAG feedback | Does an explicitly approved mission lesson affect the next retrieval and disappear after rollback? | Three stub runs prove no baseline signal, memory-id and content-hash-bound retrieval with planner/deliverable adaptation, reviewer pass, and exact baseline artifact restoration after rollback | `npm run smoke:approved-learning-rag-feedback` |
| Multi-scenario learning feedback quality | Do three approved mission lessons improve their own controlled quality cases without leaking across same-workspace mission scopes? | Nine stub runs move Q1 case pass from 0/3 to 3/3 and back to 0/3 after rollback, while each promoted case rejects two foreign memory candidates and restores exact baseline artifacts | `npm run smoke:approved-learning-feedback-quality` |
| Workspace learning personalization | Does a separately authorized workspace decision reach a sibling mission without crossing into another workspace? | Seven stub runs bind authorization, promotion, and rollback audit events; the sibling changes 3→4→3 planner steps and failed→passed→failed quality while the foreign workspace keeps zero exposure and exact artifacts | `npm run smoke:workspace-learning-personalization` |
| Workspace decision conflict and revocation | When two approved workspace decisions are retrieved together, does one deterministic decision reach the provider and does revocation restore the previous safe state? | Eight stub runs select the newer revision from two candidates, expose only that decision, restore exact older-only artifacts after newer rollback, restore exact baseline after full rollback, and keep the foreign workspace at zero exposure | `npm run smoke:workspace-learning-conflict-revocation` |
| Workspace learning operator override | Can a verified local operator temporarily select an older retrieved decision without injecting unrelated memory, and do expiration and clear restore the deterministic default? | Eight stub runs move newer→older override→newer expiry→older repin→newer clear with exact planner, deliverable, and quality parity while the foreign workspace remains isolated; a separate selection contract blocks an unretrieved override | `npm run smoke:workspace-learning-operator-override` |
| Workspace learning operator surface | Can an operator inspect and control the bounded override without exposing notes or bypassing permission and tenant boundaries? | Local HTTP covers not-set→active→expired→cleared with sanitized payloads and timeline order; actual Chromium clicks set and clear controls with zero console errors | `npm run smoke:workspace-learning-operator-surface`, `npm run smoke:workspace-learning-operator-surface-browser` |
| Source diversity | Can a non-dominant source remain visible? | A mission decision source remains in the selected context even when many workspace facts match the same query | `npm run smoke:retrieval-memory` |
| Fact graph memory | Are facts mirrored with provenance? | Fact memories become active graph nodes with memory provenance and shared-keyword edges | `npm run smoke:fact-graph-memory` |
| Fact lifecycle | Are revisions and deletions auditable? | Fact updates preserve revisions, kind changes retire nodes, deleted memory retires graph entries and edges | `npm run smoke:fact-graph-memory` |
| Instruction boundary | Can retrieved red-team text override runtime instructions? | Adversarial fixture text appears as quoted untrusted context in prompts/retrieval artifacts but is not executed into the deliverable | `npm run smoke:instruction-boundary` |

## Replay Commands

```bash
npm run smoke:memory-retrieval-quality-fixture
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
npm run smoke:retrieval-memory
npm run smoke:fact-graph-memory
npm run smoke:instruction-boundary
```

For portfolio review, pair this fixture with:

```bash
npm run smoke:architecture-code-walkthrough
npm run smoke:operator-surface-demo-evidence
npm run smoke:release-artifact-hygiene
```

## Reviewer Walkthrough

1. Start with `src/core/retrieval-service.mjs`: retrieval context is built from mission objective, memory entries, attachments, pack requirements, and previous outputs.
2. Open the retrieval artifact from the fixture run: it preserves source labels, scores, matched terms, retrieval reasons, corpus/chunk ids, content hashes, scope, revision, and provenance for operator review.
3. Inspect `memory facts`: fact graph nodes retain memory provenance, revisions, active/retired state, and shared-keyword edges.
4. Check the instruction-boundary fixture: red-team-like retrieved text is visible as untrusted data but does not become the deliverable instruction.
5. Close with the boundary: this fixture proves deterministic retrieval and provenance behavior, not live model accuracy, production search relevance, or customer impact.

## Safe Claim Boundary

Safe to claim:

- Retrieval memory fixtures verify relevant memory/attachment selection and unrelated context exclusion.
- Retrieval artifacts expose inspectable ranking signals and source labels.
- Corpus fixtures verify deterministic source/chunk identity without changing the store or serialized retrieval payload.
- Retrieval evaluation fixtures compare candidate rankings against the same labeled case set and frozen baseline.
- Semantic fixtures verify the adapter and comparison path only; they do not claim a general embedding model benchmark.
- Fact graph fixtures verify provenance, revisions, retirement, and CLI compact output.
- Instruction-boundary fixtures verify retrieved red-team-like content remains untrusted context in the local harness.

Do not claim:

- Retrieval accuracy has been benchmarked.
- Ranking quality is production validated.
- Fact graph extraction is complete for arbitrary corpora.
- Prompt injection defense is comprehensive.
- Customer knowledge quality, SLA, or productivity metrics are proven.
- Hosted SaaS retrieval isolation is implemented.

## Acceptance Rule

This fixture is current only when `npm run smoke:memory-retrieval-quality-fixture`, `npm run smoke:retrieval-corpus-contract`, `npm run smoke:retrieval-quality-evaluation`, `npm run smoke:semantic-retrieval-experiment`, `npm run smoke:retrieval-reranking-experiment`, `npm run smoke:semantic-retrieval-runtime`, `npm run smoke:local-embedding-model-qualification`, `npm run smoke:local-retrieval-robustness`, `npm run smoke:local-relevance-reranker`, `npm run smoke:local-reranker-resource-envelope`, `npm run smoke:local-reranker-runtime-stability`, `npm run smoke:local-relevance-shadow-integration`, `npm run smoke:local-relevance-shadow-replay`, `npm run smoke:local-relevance-shadow-cache`, `npm run smoke:local-relevance-shadow-cache-lifecycle`, `npm run smoke:local-relevance-shadow-cache-process-isolation`, `npm run smoke:local-relevance-shadow-cache-termination-soak`, `npm run smoke:approved-learning-rag-feedback`, `npm run smoke:retrieval-memory`, `npm run smoke:fact-graph-memory`, and `npm run smoke:instruction-boundary` pass, README links this document, and release evidence continues to keep `productionReadyClaim: false`.
