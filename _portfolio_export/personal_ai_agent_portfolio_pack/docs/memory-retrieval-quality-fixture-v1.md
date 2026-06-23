# Memory Retrieval Quality Fixture v1

- status: memory-retrieval-quality-fixture-current
- productionReadyClaim: false
- publicHostedDemoUrl: none
- credentialFreeReplay: yes
- scope: retrieval ranking, source diversity, fact graph provenance, fact revision lifecycle, instruction boundary
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
| Source diversity | Can a non-dominant source remain visible? | A mission decision source remains in the selected context even when many workspace facts match the same query | `npm run smoke:retrieval-memory` |
| Fact graph memory | Are facts mirrored with provenance? | Fact memories become active graph nodes with memory provenance and shared-keyword edges | `npm run smoke:fact-graph-memory` |
| Fact lifecycle | Are revisions and deletions auditable? | Fact updates preserve revisions, kind changes retire nodes, deleted memory retires graph entries and edges | `npm run smoke:fact-graph-memory` |
| Instruction boundary | Can retrieved red-team text override runtime instructions? | Adversarial fixture text appears as quoted untrusted context in prompts/retrieval artifacts but is not executed into the deliverable | `npm run smoke:instruction-boundary` |

## Replay Commands

```bash
npm run smoke:memory-retrieval-quality-fixture
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
2. Open the retrieval artifact from the fixture run: it preserves source labels, scores, matched terms, and retrieval reasons for operator review.
3. Inspect `memory facts`: fact graph nodes retain memory provenance, revisions, active/retired state, and shared-keyword edges.
4. Check the instruction-boundary fixture: red-team-like retrieved text is visible as untrusted data but does not become the deliverable instruction.
5. Close with the boundary: this fixture proves deterministic retrieval and provenance behavior, not live model accuracy, production search relevance, or customer impact.

## Safe Claim Boundary

Safe to claim:

- Retrieval memory fixtures verify relevant memory/attachment selection and unrelated context exclusion.
- Retrieval artifacts expose inspectable ranking signals and source labels.
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

This fixture is current only when `npm run smoke:memory-retrieval-quality-fixture`, `npm run smoke:retrieval-memory`, `npm run smoke:fact-graph-memory`, and `npm run smoke:instruction-boundary` pass, README links this document, and release evidence continues to keep `productionReadyClaim: false`.
