import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CouncilContractError,
  createCouncilBrief,
  createCouncilFrame,
  createCouncilManifest,
  createCouncilStatement,
  createCouncilStatementMetadata,
  createCouncilSynthesis,
  createCouncilSynthesisInput,
  formatCouncilRecord,
  hashCouncilValue,
  parseCouncilRecord,
  sealCouncilStatement,
  sealCouncilSynthesis,
  validateCouncilManifest,
} from '../src/core/council-contract.mjs';

const seats = ['research', 'implementation', 'verification'];
const hex = (character) => character.repeat(64);

function enrichedRetrievalEntry({
  citationId = `citation:${hex('a').slice(0, 32)}`,
  id = 'retrieval:manager:artifact-retrieval',
  status = 'available',
} = {}) {
  const available = status === 'available';
  const gap = status === 'gap';
  return {
    artifactDigest: gap ? null : `sha256:${hex('b')}`,
    citations: [{
      citationId: gap ? 'citation:gap:manager' : citationId,
      freshness: available ? 'known' : 'unknown',
      sourceSpan: available
        ? {
            chunkId: `chunk-${hex('c')}`,
            contentHash: hex('d'),
            corpusId: `corpus-${hex('e')}`,
            count: 2,
            index: 1,
            revisionId: `revision-${hex('f')}`,
            snippetHash: hex('1'),
          }
        : null,
      status,
    }],
    councilId: 'council-1',
    id,
    kind: 'retrieval',
    sessionId: 'session-1',
    workspaceId: 'workspace-1',
  };
}

function metadata(expected) {
  return {
    ...expected,
    outputDigest: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
  };
}

function frame() {
  return createCouncilFrame({
    contextDigest: hashCouncilValue({ manager: 'shared manager context', planner: 'shared planner context' }),
    councilId: 'council-1',
    evidenceCatalog: [
      { councilId: 'council-1', id: 'artifact:plan', kind: 'artifact', sessionId: 'session-1', workspaceId: 'workspace-1' },
      { councilId: 'council-1', id: 'retrieval:source-a', kind: 'retrieval', sessionId: 'session-1', workspaceId: 'workspace-1' },
    ],
    parentRunId: 'run-planner',
    riskSignals: [],
    sessionId: 'session-1',
    workspaceId: 'workspace-1',
  });
}

function openingRecord(councilFrame, seatId, number) {
  const draft = {
    artifactContent: `# ${seatId} opening`,
    councilStatement: {
      claims: [{ evidenceRefs: ['artifact:plan'], id: `${seatId}:claim-1`, position: 'support', severity: 'normal', summary: `${seatId} opening claim` }],
      nextAction: `Review ${seatId} opening.`,
      rejectedOptionIds: [],
      targetClaimIds: [],
    },
    metadata: metadata(createCouncilStatementMetadata({
      frame: councilFrame,
      round: 'opening',
      seatId,
    })),
    runId: `run-opening-${number}`,
  };
  return createCouncilStatement({ ...sealCouncilStatement(draft), frame: councilFrame });
}

function rebuttalRecord(councilFrame, brief, openings, seatId, number, { critical = false } = {}) {
  const targetSeat = seats.find((seat) => seat !== seatId);
  const draft = {
    artifactContent: `# ${seatId} rebuttal`,
    councilStatement: {
      claims: [{ evidenceRefs: ['retrieval:source-a'], id: `${seatId}:claim-2`, position: 'challenge', severity: critical ? 'critical' : 'normal', summary: `${seatId} challenges ${targetSeat}` }],
      nextAction: `Review ${seatId} rebuttal.`,
      rejectedOptionIds: [],
      targetClaimIds: [`${targetSeat}:claim-1`],
    },
    metadata: metadata(createCouncilStatementMetadata({
      brief,
      frame: councilFrame,
      openings,
      round: 'rebuttal',
      seatId,
    })),
    runId: `run-rebuttal-${number}`,
  };
  return createCouncilStatement({ ...sealCouncilStatement(draft), brief, frame: councilFrame, openings });
}

function fixture({ critical = false } = {}) {
  const councilFrame = frame();
  const openings = seats.map((seat, index) => openingRecord(councilFrame, seat, index + 1));
  const brief = createCouncilBrief({ frame: councilFrame, openings });
  const rebuttals = seats.map((seat, index) => rebuttalRecord(councilFrame, brief, openings, seat, index + 1, { critical: critical && seat === 'research' }));
  const synthesisInput = createCouncilSynthesisInput({
    brief,
    frame: councilFrame,
    openings,
    rebuttals,
  });
  const unresolvedConflictIds = rebuttals.map((record) => record.councilStatement.claims[0].id).sort();
  const unresolvedCriticalConflictIds = critical ? ['research:claim-2'] : [];
  const draft = {
    artifactContent: '# Chair synthesis',
    brief,
    councilSynthesis: {
      acceptedClaimIds: ['implementation:claim-1'],
      agreementIds: [],
      evidenceRefs: ['artifact:plan'],
      nextAction: 'Run the bounded verification.',
      nextOwner: 'workspace-owner',
      rejectedClaims: [],
      unresolvedConflictIds,
      unresolvedCriticalConflictIds,
      verificationPlan: ['Run council contract tests.'],
    },
    frame: councilFrame,
    metadata: metadata(synthesisInput),
    openings,
    rebuttals,
    runId: 'run-chair',
  };
  const synthesis = createCouncilSynthesis(sealCouncilSynthesis(draft));
  const manifest = createCouncilManifest({ brief, frame: councilFrame, openings, rebuttals, synthesis });
  return { brief, frame: councilFrame, manifest, openings, rebuttals, synthesis };
}

test('council contract accepts a complete evidence-bound two-round record', () => {
  const record = fixture();
  const result = validateCouncilManifest(record);

  assert.deepEqual(record.frame.roster, seats);
  assert.equal(new Set(record.openings.map((item) => item.metadata.sourceDigest)).size, 1);
  assert.equal(record.rebuttals.length, 3);
  assert.deepEqual(result, { code: 'ok', ok: true, status: 'passed', unresolvedCriticalConflictIds: [] });
});

test('council contract validates bounded enriched retrieval provenance and binds it into the frame', () => {
  const evidenceCatalog = [
    { councilId: 'council-1', id: 'artifact:plan', kind: 'artifact', sessionId: 'session-1', workspaceId: 'workspace-1' },
    enrichedRetrievalEntry(),
  ];
  const councilFrame = createCouncilFrame({
    contextDigest: hashCouncilValue({ context: 'enriched retrieval' }),
    councilId: 'council-1',
    evidenceCatalog,
    parentRunId: 'run-planner',
    riskSignals: [],
    sessionId: 'session-1',
    workspaceId: 'workspace-1',
  });

  assert.equal(councilFrame.evidenceCatalog[1].citations[0].status, 'available');
  assert.equal(councilFrame.evidenceCatalog[1].artifactDigest, `sha256:${hex('b')}`);
  const tampered = structuredClone(councilFrame);
  tampered.evidenceCatalog[1].artifactDigest = `sha256:${hex('2')}`;
  assert.throws(
    () => createCouncilStatement({
      artifactContent: '# opening',
      councilStatement: {
        claims: [{ evidenceRefs: ['retrieval:manager:artifact-retrieval'], id: 'research:claim-1', position: 'support', severity: 'normal', summary: 'Bound to local retrieval.' }],
        nextAction: 'Review the bounded source.',
        rejectedOptionIds: [],
        targetClaimIds: [],
      },
      metadata: metadata(createCouncilStatementMetadata({ frame: tampered, round: 'opening', seatId: 'research' })),
      runId: 'run-opening',
    }),
    (error) => error instanceof CouncilContractError && error.code === 'tampered-frame',
  );
});

test('council contract rejects duplicate, malformed, and non-citable enriched retrieval citations', () => {
  const base = {
    contextDigest: hashCouncilValue({ context: 'enriched retrieval' }),
    councilId: 'council-1',
    parentRunId: 'run-planner',
    riskSignals: [],
    sessionId: 'session-1',
    workspaceId: 'workspace-1',
  };
  const duplicate = enrichedRetrievalEntry();
  duplicate.citations.push(structuredClone(duplicate.citations[0]));
  assert.throws(
    () => createCouncilFrame({ ...base, evidenceCatalog: [duplicate] }),
    (error) => error instanceof CouncilContractError && error.code === 'duplicate-evidence',
  );

  const repeatedAcrossCatalog = enrichedRetrievalEntry();
  assert.throws(
    () => createCouncilFrame({
      ...base,
      evidenceCatalog: [
        repeatedAcrossCatalog,
        enrichedRetrievalEntry({
          citationId: repeatedAcrossCatalog.citations[0].citationId,
          id: 'retrieval:planner:artifact-retrieval',
        }),
      ],
    }),
    (error) => error instanceof CouncilContractError && error.code === 'duplicate-evidence',
  );

  const malformed = enrichedRetrievalEntry();
  malformed.citations[0].sourceSpan.contentHash = 'not-a-hash';
  assert.throws(
    () => createCouncilFrame({ ...base, evidenceCatalog: [malformed] }),
    (error) => error instanceof CouncilContractError && error.code === 'invalid-evidence',
  );

  const gapFrame = createCouncilFrame({ ...base, evidenceCatalog: [enrichedRetrievalEntry({ status: 'gap' })] });
  const gapDraft = {
    artifactContent: '# gap opening',
    councilStatement: {
      claims: [{ evidenceRefs: ['retrieval:manager:artifact-retrieval'], id: 'research:claim-1', position: 'support', severity: 'normal', summary: 'Unsupported gap evidence.' }],
      nextAction: 'Fetch a source.',
      rejectedOptionIds: [],
      targetClaimIds: [],
    },
    metadata: metadata(createCouncilStatementMetadata({ frame: gapFrame, round: 'opening', seatId: 'research' })),
    runId: 'run-gap-opening',
  };
  assert.throws(
    () => createCouncilStatement({ ...sealCouncilStatement(gapDraft), frame: gapFrame }),
    (error) => error instanceof CouncilContractError && error.code === 'cross-council-evidence',
  );

  const degradedFrame = createCouncilFrame({ ...base, evidenceCatalog: [enrichedRetrievalEntry({ status: 'degraded' })] });
  const degradedDraft = {
    ...gapDraft,
    metadata: metadata(createCouncilStatementMetadata({ frame: degradedFrame, round: 'opening', seatId: 'research' })),
  };
  assert.throws(
    () => createCouncilStatement({ ...sealCouncilStatement(degradedDraft), frame: degradedFrame }),
    (error) => error instanceof CouncilContractError && error.code === 'cross-council-evidence',
  );
});

test('council frame requires a shared context digest and changes opening provenance when it drifts', () => {
  const current = frame();
  assert.throws(
    () => createCouncilFrame({
      councilId: current.councilId,
      evidenceCatalog: current.evidenceCatalog,
      parentRunId: current.parentRunId,
      riskSignals: current.riskSignals,
      sessionId: current.sessionId,
      workspaceId: current.workspaceId,
    }),
    (error) => error instanceof CouncilContractError && error.code === 'unexpected-field',
  );

  const changedContext = createCouncilFrame({
    contextDigest: hashCouncilValue({ manager: 'changed manager context', planner: 'shared planner context' }),
    councilId: current.councilId,
    evidenceCatalog: current.evidenceCatalog,
    parentRunId: current.parentRunId,
    riskSignals: current.riskSignals,
    sessionId: current.sessionId,
    workspaceId: current.workspaceId,
  });
  assert.notEqual(changedContext.frameDigest, current.frameDigest);
  assert.notEqual(openingRecord(changedContext, 'research', 1).metadata.sourceDigest, openingRecord(current, 'research', 1).metadata.sourceDigest);

  const riskFrame = createCouncilFrame({
    contextDigest: current.contextDigest,
    councilId: current.councilId,
    evidenceCatalog: current.evidenceCatalog,
    parentRunId: current.parentRunId,
    riskSignals: ['critical-conflict'],
    sessionId: current.sessionId,
    workspaceId: current.workspaceId,
  });
  assert.notEqual(riskFrame.frameDigest, current.frameDigest);
  assert.throws(
    () => createCouncilFrame({
      contextDigest: current.contextDigest,
      councilId: current.councilId,
      evidenceCatalog: current.evidenceCatalog,
      parentRunId: current.parentRunId,
      riskSignals: ['unbounded-private-signal'],
      sessionId: current.sessionId,
      workspaceId: current.workspaceId,
    }),
    (error) => error instanceof CouncilContractError && error.code === 'invalid-risk-signal',
  );
});

test('council contract rejects duplicate and foreign claim or evidence references', () => {
  const councilFrame = frame();
  const opening = openingRecord(councilFrame, 'research', 1);
  const duplicate = structuredClone(opening);
  duplicate.councilStatement.claims.push(structuredClone(duplicate.councilStatement.claims[0]));
  duplicate.metadata.outputDigest = sealCouncilStatement(duplicate).metadata.outputDigest;
  assert.throws(
    () => createCouncilStatement({ ...duplicate, frame: councilFrame }),
    (error) => error instanceof CouncilContractError && error.code === 'duplicate-claim',
  );

  const foreign = structuredClone(opening);
  foreign.councilStatement.claims[0].evidenceRefs = ['https://foreign.example/evidence'];
  foreign.metadata.outputDigest = sealCouncilStatement(foreign).metadata.outputDigest;
  assert.throws(
    () => createCouncilStatement({ ...foreign, frame: councilFrame }),
    (error) => error instanceof CouncilContractError && error.code === 'cross-council-evidence',
  );
});

test('council contract rejects a rebuttal that targets its own or missing opening claim', () => {
  const record = fixture();
  const selfTarget = structuredClone(record.rebuttals[0]);
  selfTarget.councilStatement.targetClaimIds = ['research:claim-1'];
  selfTarget.metadata.outputDigest = sealCouncilStatement(selfTarget).metadata.outputDigest;
  assert.throws(
    () => createCouncilStatement({ ...selfTarget, brief: record.brief, frame: record.frame, openings: record.openings }),
    (error) => error instanceof CouncilContractError && error.code === 'self-target',
  );

  const missingTarget = structuredClone(record.rebuttals[0]);
  missingTarget.councilStatement.targetClaimIds = ['verification:claim-99'];
  missingTarget.metadata.outputDigest = sealCouncilStatement(missingTarget).metadata.outputDigest;
  assert.throws(
    () => createCouncilStatement({ ...missingTarget, brief: record.brief, frame: record.frame, openings: record.openings }),
    (error) => error instanceof CouncilContractError && error.code === 'unknown-claim',
  );
});

test('council contract rejects unsupported decisions and accepted/rejected overlap', () => {
  const record = fixture();
  const noEvidence = structuredClone(record.synthesis);
  noEvidence.rebuttals = structuredClone(record.rebuttals);
  noEvidence.rebuttals[0].councilStatement.claims[0].evidenceRefs = [];
  noEvidence.rebuttals[0].metadata.outputDigest = sealCouncilStatement(noEvidence.rebuttals[0]).metadata.outputDigest;
  noEvidence.metadata = metadata(createCouncilSynthesisInput({
    brief: record.brief,
    frame: record.frame,
    openings: record.openings,
    rebuttals: noEvidence.rebuttals,
  }));
  noEvidence.councilSynthesis.acceptedClaimIds = ['research:claim-2'];
  noEvidence.councilSynthesis.evidenceRefs = ['artifact:plan'];
  noEvidence.metadata.outputDigest = sealCouncilSynthesis(noEvidence).metadata.outputDigest;
  assert.throws(
    () => createCouncilSynthesis({ ...noEvidence, brief: record.brief, frame: record.frame, openings: record.openings }),
    (error) => error instanceof CouncilContractError && error.code === 'unsupported-promotion',
  );

  const overlap = structuredClone(record.synthesis);
  overlap.councilSynthesis.rejectedClaims = [{ claimId: 'implementation:claim-1', reason: 'Not adopted.' }];
  overlap.metadata.outputDigest = sealCouncilSynthesis(overlap).metadata.outputDigest;
  assert.throws(
    () => createCouncilSynthesis({ ...overlap, brief: record.brief, frame: record.frame, openings: record.openings, rebuttals: record.rebuttals }),
    (error) => error instanceof CouncilContractError && error.code === 'decision-conflict',
  );
});

test('council contract fails closed for an exact unresolved critical conflict', () => {
  const record = fixture({ critical: true });
  const result = validateCouncilManifest(record);

  assert.equal(record.manifest.validator.status, 'blocked');
  assert.deepEqual(result, {
    code: 'critical-conflict',
    ok: false,
    status: 'blocked',
    unresolvedCriticalConflictIds: ['research:claim-2'],
  });
});

test('council contract rejects tampered artifacts and stale brief or synthesis digests', () => {
  const record = fixture();
  const tamperedArtifact = structuredClone(record);
  tamperedArtifact.openings[0].artifactContent = '# changed after digest';
  assert.equal(validateCouncilManifest(tamperedArtifact).code, 'tampered-artifact');

  const staleBrief = structuredClone(record);
  staleBrief.openings[0].councilStatement.claims[0].summary = 'changed and rehashed opening';
  staleBrief.openings[0].metadata.outputDigest = sealCouncilStatement(staleBrief.openings[0]).metadata.outputDigest;
  assert.equal(validateCouncilManifest(staleBrief).code, 'metadata-mismatch');

  const staleSynthesis = structuredClone(record);
  staleSynthesis.rebuttals[0].councilStatement.claims[0].summary = 'changed and rehashed rebuttal';
  staleSynthesis.rebuttals[0].metadata.outputDigest = sealCouncilStatement(staleSynthesis.rebuttals[0]).metadata.outputDigest;
  assert.equal(validateCouncilManifest(staleSynthesis).code, 'metadata-mismatch');
});

test('council artifact parser accepts only exact canonical bytes', () => {
  const councilFrame = frame();
  const canonical = formatCouncilRecord(councilFrame);

  assert.deepEqual(parseCouncilRecord(canonical, 'frame artifact'), councilFrame);
  assert.throws(
    () => parseCouncilRecord(`${canonical}\n`, 'frame artifact'),
    (error) => error instanceof CouncilContractError && error.code === 'noncanonical-artifact',
  );
  assert.throws(
    () => parseCouncilRecord('{not-json}\n', 'frame artifact'),
    (error) => error instanceof CouncilContractError && error.code === 'invalid-artifact',
  );
});
