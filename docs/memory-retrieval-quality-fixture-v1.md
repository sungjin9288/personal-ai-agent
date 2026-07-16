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

This fixture is current only when `npm run smoke:memory-retrieval-quality-fixture`, `npm run smoke:retrieval-corpus-contract`, `npm run smoke:retrieval-quality-evaluation`, `npm run smoke:semantic-retrieval-experiment`, `npm run smoke:retrieval-reranking-experiment`, `npm run smoke:semantic-retrieval-runtime`, `npm run smoke:local-embedding-model-qualification`, `npm run smoke:local-retrieval-robustness`, `npm run smoke:local-relevance-reranker`, `npm run smoke:local-reranker-resource-envelope`, `npm run smoke:local-reranker-runtime-stability`, `npm run smoke:retrieval-memory`, `npm run smoke:fact-graph-memory`, and `npm run smoke:instruction-boundary` pass, README links this document, and release evidence continues to keep `productionReadyClaim: false`.
