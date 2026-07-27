import { createHash } from 'node:crypto';

const COUNCIL_VERSION = 'council/v1';
const REQUIRED_SEATS = Object.freeze(['research', 'implementation', 'verification']);
const CHAIR_SEAT_ID = 'chair';
const MAX_CLAIMS = 6;
const MAX_EVIDENCE_REFS = 6;
const MAX_TEXT_LENGTH = 600;
const MAX_VERIFICATION_STEPS = 6;
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;
const CLAIM_ID_PATTERN = /^(research|implementation|verification):claim-[1-9][0-9]*$/;
const COUNCIL_RISK_SIGNALS = Object.freeze(['critical-conflict']);

export class CouncilContractError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CouncilContractError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new CouncilContractError(code, message);
}

function normalizeText(value, label, { maxLength = MAX_TEXT_LENGTH, required = true } = {}) {
  const text = String(value || '').trim();
  if (required && !text) {
    fail('missing-field', `${label} is required.`);
  }
  if (text.length > maxLength) {
    fail('bounded-field', `${label} exceeds ${maxLength} characters.`);
  }
  return text;
}

function normalizeArtifactContent(value, label) {
  const content = String(value || '');
  if (!content.trim()) {
    fail('missing-field', `${label} is required.`);
  }
  if (content.length > 12000) {
    fail('bounded-field', `${label} exceeds 12000 characters.`);
  }
  return content;
}

function normalizeStringArray(value, label, { maxLength = MAX_CLAIMS, required = false } = {}) {
  if (!Array.isArray(value)) {
    fail('invalid-field', `${label} must be an array.`);
  }
  const items = value.map((item) => normalizeText(item, `${label} item`));
  if (required && !items.length) {
    fail('missing-field', `${label} must not be empty.`);
  }
  if (items.length > maxLength) {
    fail('bounded-field', `${label} exceeds ${maxLength} items.`);
  }
  if (new Set(items).size !== items.length) {
    fail('duplicate-value', `${label} contains duplicate values.`);
  }
  return [...items].sort();
}

function stableValue(value) {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

export function formatCouncilRecord(value) {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

export function hashCouncilValue(value) {
  return `sha256:${createHash('sha256').update(formatCouncilRecord(value)).digest('hex')}`;
}

export function hashCouncilContent(value) {
  return `sha256:${createHash('sha256').update(String(value || '')).digest('hex')}`;
}

export function parseCouncilRecord(content, label = 'council artifact') {
  const rawContent = String(content || '');
  if (!rawContent.trim()) {
    fail('missing-artifact', `${label} is empty.`);
  }
  if (rawContent.length > 100_000) {
    fail('bounded-artifact', `${label} exceeds 100000 characters.`);
  }

  let record;
  try {
    record = JSON.parse(rawContent);
  } catch {
    fail('invalid-artifact', `${label} is not valid JSON.`);
  }

  if (formatCouncilRecord(record) !== rawContent) {
    fail('noncanonical-artifact', `${label} bytes do not match the canonical council record.`);
  }
  return record;
}

function assertDigest(value, label) {
  const digest = normalizeText(value, label, { maxLength: 80 });
  if (!DIGEST_PATTERN.test(digest)) {
    fail('invalid-digest', `${label} must be a sha256 digest.`);
  }
  return digest;
}

function assertExactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('invalid-field', `${label} must be an object.`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail('unexpected-field', `${label} must contain exactly: ${expected.join(', ')}.`);
  }
}

function assertSameValue(actual, expected, label) {
  if (formatCouncilRecord(actual) !== formatCouncilRecord(expected)) {
    fail('metadata-mismatch', `${label} does not match the council contract.`);
  }
}

function normalizeEvidenceCatalog(frameInput) {
  if (!Array.isArray(frameInput.evidenceCatalog)) {
    fail('invalid-field', 'evidenceCatalog must be an array.');
  }
  const refs = frameInput.evidenceCatalog.map((item) => {
    assertExactKeys(item, ['councilId', 'id', 'kind', 'sessionId', 'workspaceId'], 'evidence catalog entry');
    const id = normalizeText(item.id, 'evidence catalog id', { maxLength: 200 });
    const kind = normalizeText(item.kind, 'evidence catalog kind', { maxLength: 20 });
    if (!['artifact', 'retrieval'].includes(kind)) {
      fail('invalid-evidence', `Unsupported evidence catalog kind: ${kind}.`);
    }
    if (!id.startsWith(`${kind}:`)) {
      fail('invalid-evidence', `Evidence catalog id ${id} must use the ${kind}: prefix.`);
    }
    return {
      councilId: normalizeText(item.councilId, 'evidence catalog councilId', { maxLength: 120 }),
      id,
      kind,
      sessionId: normalizeText(item.sessionId, 'evidence catalog sessionId', { maxLength: 120 }),
      workspaceId: normalizeText(item.workspaceId, 'evidence catalog workspaceId', { maxLength: 120 }),
    };
  });
  if (new Set(refs.map((item) => item.id)).size !== refs.length) {
    fail('duplicate-evidence', 'evidenceCatalog contains duplicate ids.');
  }
  return refs.sort((left, right) => left.id.localeCompare(right.id));
}

export function createCouncilFrame(input) {
  assertExactKeys(
    input,
    ['contextDigest', 'councilId', 'evidenceCatalog', 'parentRunId', 'riskSignals', 'sessionId', 'workspaceId'],
    'council frame input',
  );
  const councilId = normalizeText(input.councilId, 'councilId', { maxLength: 120 });
  const contextDigest = assertDigest(input.contextDigest, 'contextDigest');
  const sessionId = normalizeText(input.sessionId, 'sessionId', { maxLength: 120 });
  const workspaceId = normalizeText(input.workspaceId, 'workspaceId', { maxLength: 120 });
  const parentRunId = normalizeText(input.parentRunId, 'parentRunId', { maxLength: 120 });
  const riskSignals = normalizeStringArray(input.riskSignals, 'riskSignals', { maxLength: COUNCIL_RISK_SIGNALS.length });
  for (const signal of riskSignals) {
    if (!COUNCIL_RISK_SIGNALS.includes(signal)) {
      fail('invalid-risk-signal', `Unsupported council risk signal: ${signal}.`);
    }
  }
  const evidenceCatalog = normalizeEvidenceCatalog(input);
  for (const evidence of evidenceCatalog) {
    if (evidence.councilId !== councilId || evidence.sessionId !== sessionId || evidence.workspaceId !== workspaceId) {
      fail('cross-council-evidence', 'evidenceCatalog contains a foreign council, session, or workspace reference.');
    }
  }
  const frame = {
    contextDigest,
    councilId,
    evidenceCatalog,
    parentRunId,
    requiredSeats: [...REQUIRED_SEATS],
    riskSignals,
    roster: [...REQUIRED_SEATS],
    sessionId,
    version: COUNCIL_VERSION,
    workspaceId,
  };
  return {
    ...frame,
    frameDigest: hashCouncilValue(frame),
  };
}

function assertFrame(frame) {
  assertExactKeys(
    frame,
    ['contextDigest', 'councilId', 'evidenceCatalog', 'frameDigest', 'parentRunId', 'requiredSeats', 'riskSignals', 'roster', 'sessionId', 'version', 'workspaceId'],
    'council frame',
  );
  if (frame.version !== COUNCIL_VERSION) {
    fail('unsupported-version', 'Unsupported council frame version.');
  }
  const riskSignals = normalizeStringArray(frame.riskSignals, 'riskSignals', {
    maxLength: COUNCIL_RISK_SIGNALS.length,
  });
  for (const signal of riskSignals) {
    if (!COUNCIL_RISK_SIGNALS.includes(signal)) {
      fail('invalid-risk-signal', `Unsupported council risk signal: ${signal}.`);
    }
  }
  assertSameValue(frame.riskSignals, riskSignals, 'council risk signals');
  assertSameValue(frame.roster, REQUIRED_SEATS, 'council roster');
  assertSameValue(frame.requiredSeats, REQUIRED_SEATS, 'required seats');
  const expected = hashCouncilValue({
    contextDigest: frame.contextDigest,
    councilId: frame.councilId,
    evidenceCatalog: frame.evidenceCatalog,
    parentRunId: frame.parentRunId,
    requiredSeats: frame.requiredSeats,
    riskSignals: frame.riskSignals,
    roster: frame.roster,
    sessionId: frame.sessionId,
    version: frame.version,
    workspaceId: frame.workspaceId,
  });
  if (frame.frameDigest !== expected) {
    fail('tampered-frame', 'Council frame digest does not match its current content.');
  }
  return frame;
}

function openingSourceDigest(frame) {
  return hashCouncilValue({
    councilId: frame.councilId,
    contextDigest: frame.contextDigest,
    evidenceCatalog: frame.evidenceCatalog.map((item) => item.id),
    frameDigest: frame.frameDigest,
    riskSignals: frame.riskSignals,
    roster: frame.roster,
    round: 'opening',
  });
}

function statementPayload(record) {
  return {
    artifactContent: record.artifactContent,
    councilStatement: record.councilStatement,
    metadata: {
      councilId: record.metadata.councilId,
      councilPhase: record.metadata.councilPhase,
      councilRound: record.metadata.councilRound,
      councilSeatId: record.metadata.councilSeatId,
      parentRunIds: record.metadata.parentRunIds,
      sourceDigest: record.metadata.sourceDigest,
    },
    recordType: 'council-statement',
    runId: record.runId,
  };
}

// Call after constructing the provider-facing record and before createCouncilStatement.
export function sealCouncilStatement(record) {
  return {
    ...record,
    metadata: {
      ...record.metadata,
      outputDigest: hashCouncilValue(statementPayload(record)),
    },
  };
}

function synthesisPayload(record) {
  return {
    artifactContent: record.artifactContent,
    councilSynthesis: record.councilSynthesis,
    metadata: {
      councilId: record.metadata.councilId,
      councilPhase: record.metadata.councilPhase,
      councilRound: record.metadata.councilRound,
      councilSeatId: record.metadata.councilSeatId,
      parentRunIds: record.metadata.parentRunIds,
      sourceDigest: record.metadata.sourceDigest,
    },
    recordType: 'council-synthesis',
    runId: record.runId,
  };
}

// Call after constructing the chair-facing record and before createCouncilSynthesis.
export function sealCouncilSynthesis(record) {
  return {
    ...record,
    metadata: {
      ...record.metadata,
      outputDigest: hashCouncilValue(synthesisPayload(record)),
    },
  };
}

function normalizeMetadata(metadata, expected) {
  assertExactKeys(
    metadata,
    ['councilId', 'councilPhase', 'councilRound', 'councilSeatId', 'outputDigest', 'parentRunIds', 'sourceDigest'],
    'council metadata',
  );
  if (!Array.isArray(metadata.parentRunIds)) {
    fail('invalid-field', 'parentRunIds must be an array.');
  }
  const parentRunIds = metadata.parentRunIds.map((item) => normalizeText(item, 'parentRunIds item', { maxLength: 120 }));
  if (!parentRunIds.length || parentRunIds.length > REQUIRED_SEATS.length || new Set(parentRunIds).size !== parentRunIds.length) {
    fail('invalid-field', 'parentRunIds must contain unique bounded values.');
  }
  const normalized = {
    councilId: normalizeText(metadata.councilId, 'councilId', { maxLength: 120 }),
    councilPhase: normalizeText(metadata.councilPhase, 'councilPhase', { maxLength: 40 }),
    councilRound: normalizeText(metadata.councilRound, 'councilRound', { maxLength: 20 }),
    councilSeatId: normalizeText(metadata.councilSeatId, 'councilSeatId', { maxLength: 40 }),
    outputDigest: assertDigest(metadata.outputDigest, 'outputDigest'),
    parentRunIds,
    sourceDigest: assertDigest(metadata.sourceDigest, 'sourceDigest'),
  };
  assertSameValue(
    {
      councilId: normalized.councilId,
      councilPhase: normalized.councilPhase,
      councilRound: normalized.councilRound,
      councilSeatId: normalized.councilSeatId,
      parentRunIds: normalized.parentRunIds,
      sourceDigest: normalized.sourceDigest,
    },
    expected,
    'council metadata',
  );
  return normalized;
}

function normalizeClaim(claim, { evidenceIds, seatId }) {
  assertExactKeys(claim, ['evidenceRefs', 'id', 'position', 'severity', 'summary'], 'council claim');
  const id = normalizeText(claim.id, 'claim id', { maxLength: 120 });
  if (!CLAIM_ID_PATTERN.test(id) || !id.startsWith(`${seatId}:`)) {
    fail('invalid-claim', `Claim ${id} must belong to seat ${seatId}.`);
  }
  const position = normalizeText(claim.position, 'claim position', { maxLength: 20 });
  if (!['support', 'challenge', 'unknown'].includes(position)) {
    fail('invalid-claim', `Unsupported claim position: ${position}.`);
  }
  const severity = normalizeText(claim.severity, 'claim severity', { maxLength: 20 });
  if (!['normal', 'critical'].includes(severity)) {
    fail('invalid-claim', `Unsupported claim severity: ${severity}.`);
  }
  const evidenceRefs = normalizeStringArray(claim.evidenceRefs, 'claim evidenceRefs', { maxLength: MAX_EVIDENCE_REFS });
  for (const ref of evidenceRefs) {
    if (!evidenceIds.has(ref)) {
      fail('cross-council-evidence', `Claim ${id} references unavailable evidence: ${ref}.`);
    }
  }
  return {
    evidenceRefs,
    id,
    position,
    severity,
    summary: normalizeText(claim.summary, 'claim summary'),
  };
}

function normalizeStatement(statement, { evidenceIds, knownClaims, round, seatId }) {
  assertExactKeys(statement, ['claims', 'nextAction', 'rejectedOptionIds', 'targetClaimIds'], 'councilStatement');
  if (!Array.isArray(statement.claims) || !statement.claims.length || statement.claims.length > MAX_CLAIMS) {
    fail('invalid-claim', `claims must contain between 1 and ${MAX_CLAIMS} items.`);
  }
  const claims = statement.claims
    .map((claim) => normalizeClaim(claim, { evidenceIds, seatId }))
    .sort((left, right) => left.id.localeCompare(right.id));
  if (new Set(claims.map((claim) => claim.id)).size !== claims.length) {
    fail('duplicate-claim', `Seat ${seatId} submitted duplicate claim ids.`);
  }
  const targetClaimIds = normalizeStringArray(statement.targetClaimIds, 'targetClaimIds', {
    maxLength: MAX_CLAIMS,
    required: round === 'rebuttal',
  });
  const rejectedOptionIds = normalizeStringArray(statement.rejectedOptionIds, 'rejectedOptionIds', { maxLength: MAX_CLAIMS });
  if (round === 'opening' && (targetClaimIds.length || rejectedOptionIds.length)) {
    fail('invalid-round', 'Opening statements cannot target or reject another claim.');
  }
  if (round === 'rebuttal') {
    for (const targetId of [...targetClaimIds, ...rejectedOptionIds]) {
      const target = knownClaims.get(targetId);
      if (!target) {
        fail('unknown-claim', `Rebuttal target ${targetId} is not in the CouncilBrief.`);
      }
      if (target.seatId === seatId) {
        fail('self-target', `Rebuttal seat ${seatId} cannot target its own claim.`);
      }
    }
  }
  return {
    claims,
    nextAction: normalizeText(statement.nextAction, 'statement nextAction'),
    rejectedOptionIds,
    targetClaimIds,
  };
}

function statementExpectedMetadata({ frame, round, seatId, openingBySeat, brief }) {
  if (round === 'opening') {
    return {
      councilId: frame.councilId,
      councilPhase: 'opening-position',
      councilRound: 'opening',
      councilSeatId: seatId,
      parentRunIds: [frame.parentRunId],
      sourceDigest: openingSourceDigest(frame),
    };
  }
  const opening = openingBySeat.get(seatId);
  if (!opening || !brief) {
    fail('missing-opening', `Rebuttal seat ${seatId} requires its opening and CouncilBrief.`);
  }
  return {
    councilId: frame.councilId,
    councilPhase: 'rebuttal',
    councilRound: 'rebuttal',
    councilSeatId: seatId,
    parentRunIds: [opening.runId],
    sourceDigest: brief.briefDigest,
  };
}

export function createCouncilStatementMetadata({
  brief = null,
  frame,
  openings = [],
  round,
  seatId,
}) {
  const normalizedFrame = assertFrame(frame);
  const normalizedRound = normalizeText(round, 'councilRound', { maxLength: 20 });
  const normalizedSeatId = normalizeText(seatId, 'councilSeatId', { maxLength: 40 });
  if (!['opening', 'rebuttal'].includes(normalizedRound)) {
    fail('invalid-round', `Unsupported statement round: ${normalizedRound}.`);
  }
  if (!REQUIRED_SEATS.includes(normalizedSeatId)) {
    fail('invalid-seat', `Unsupported council seat: ${normalizedSeatId}.`);
  }
  const openingBySeat = new Map(openings.map((record) => [record.metadata.councilSeatId, record]));
  return statementExpectedMetadata({
    brief,
    frame: normalizedFrame,
    openingBySeat,
    round: normalizedRound,
    seatId: normalizedSeatId,
  });
}

function indexClaims(openings, rebuttals = []) {
  const index = new Map();
  for (const record of [...openings, ...rebuttals]) {
    for (const claim of record.councilStatement.claims) {
      if (index.has(claim.id)) {
        fail('duplicate-claim', `Council contains duplicate claim id ${claim.id}.`);
      }
      index.set(claim.id, { ...claim, seatId: record.metadata.councilSeatId });
    }
  }
  return index;
}

function assertCompleteSeats(records, round) {
  if (!Array.isArray(records) || records.length !== REQUIRED_SEATS.length) {
    fail('missing-seat', `Council ${round} must contain every required seat exactly once.`);
  }
  const seats = records.map((record) => record.metadata?.councilSeatId).sort();
  assertSameValue(seats, [...REQUIRED_SEATS].sort(), `${round} seats`);
}

function normalizeStatementRecord(input, { frame, brief = null, openings = [] }) {
  assertExactKeys(input, ['artifactContent', 'councilStatement', 'metadata', 'runId'], 'council statement record');
  const runId = normalizeText(input.runId, 'statement runId', { maxLength: 120 });
  const round = normalizeText(input.metadata?.councilRound, 'councilRound', { maxLength: 20 });
  if (!['opening', 'rebuttal'].includes(round)) {
    fail('invalid-round', `Unsupported statement round: ${round}.`);
  }
  const seatId = normalizeText(input.metadata?.councilSeatId, 'councilSeatId', { maxLength: 40 });
  if (!REQUIRED_SEATS.includes(seatId)) {
    fail('invalid-seat', `Unsupported council seat: ${seatId}.`);
  }
  const expectedMetadata = createCouncilStatementMetadata({
    brief,
    frame,
    openings,
    round,
    seatId,
  });
  const metadata = normalizeMetadata(input.metadata, expectedMetadata);
  const knownClaims = round === 'rebuttal' ? indexClaims(openings) : new Map();
  const councilStatement = normalizeStatement(input.councilStatement, {
    evidenceIds: new Set(frame.evidenceCatalog.map((item) => item.id)),
    knownClaims,
    round,
    seatId,
  });
  const record = {
    artifactContent: normalizeArtifactContent(input.artifactContent, 'statement artifactContent'),
    councilStatement,
    metadata,
    runId,
  };
  const outputDigest = hashCouncilValue(statementPayload(record));
  if (metadata.outputDigest !== outputDigest) {
    fail('tampered-artifact', `Statement ${runId} outputDigest does not bind its current artifact content.`);
  }
  return record;
}

export function createCouncilStatement(input) {
  const { brief = null, frame, openings = [], ...record } = input;
  return normalizeStatementRecord(record, {
    brief,
    frame: assertFrame(frame),
    openings,
  });
}

export function createCouncilBrief({ frame, openings }) {
  assertFrame(frame);
  assertCompleteSeats(openings, 'opening');
  const normalizedOpenings = openings.map((record) =>
    normalizeStatementRecord(record, { frame, openings: [] }),
  );
  indexClaims(normalizedOpenings);
  const brief = {
    claims: normalizedOpenings.flatMap((record) =>
      record.councilStatement.claims.map((claim) => ({
        ...claim,
        seatId: record.metadata.councilSeatId,
      })),
    ),
    councilId: frame.councilId,
    evidenceRefs: frame.evidenceCatalog.map((item) => item.id),
    openingOutputDigests: normalizedOpenings
      .map((record) => ({ seatId: record.metadata.councilSeatId, outputDigest: record.metadata.outputDigest }))
      .sort((left, right) => left.seatId.localeCompare(right.seatId)),
    roster: [...frame.roster],
    version: COUNCIL_VERSION,
  };
  return {
    ...brief,
    briefDigest: hashCouncilValue(brief),
  };
}

function assertBrief(frame, brief, openings) {
  assertExactKeys(brief, ['briefDigest', 'claims', 'councilId', 'evidenceRefs', 'openingOutputDigests', 'roster', 'version'], 'CouncilBrief');
  const expected = createCouncilBrief({ frame, openings });
  assertSameValue(brief, expected, 'CouncilBrief');
  return expected;
}

export function createCouncilSynthesisInput({ frame, brief, openings, rebuttals }) {
  assertFrame(frame);
  assertCompleteSeats(openings, 'opening');
  const normalizedOpenings = openings.map((record) => normalizeStatementRecord(record, { frame, openings: [] }));
  const normalizedBrief = assertBrief(frame, brief, normalizedOpenings);
  assertCompleteSeats(rebuttals, 'rebuttal');
  const openingOutputDigests = normalizeStringArray(
    normalizedBrief.openingOutputDigests.map((item) => item.outputDigest),
    'CouncilBrief openingOutputDigests',
    { maxLength: REQUIRED_SEATS.length, required: true },
  );
  const normalizedRebuttals = rebuttals.map((record) =>
    normalizeStatementRecord(record, {
      brief: normalizedBrief,
      frame,
      openings: normalizedOpenings,
    }),
  );
  const rebuttalOutputDigests = normalizedRebuttals
    .map((record) => ({ seatId: record.metadata.councilSeatId, outputDigest: record.metadata.outputDigest }))
    .sort((left, right) => left.seatId.localeCompare(right.seatId));
  return {
    councilId: frame.councilId,
    councilPhase: 'synthesis',
    councilRound: 'rebuttal',
    councilSeatId: CHAIR_SEAT_ID,
    parentRunIds: REQUIRED_SEATS.map(
      (seatId) => normalizedRebuttals.find((record) => record.metadata.councilSeatId === seatId).runId,
    ),
    sourceDigest: hashCouncilValue({
      briefDigest: normalizedBrief.briefDigest,
      councilId: frame.councilId,
      openingOutputDigests,
      rebuttalOutputDigests,
    }),
  };
}

function normalizeRejectedClaims(value, knownClaims) {
  if (!Array.isArray(value) || value.length > MAX_CLAIMS * 2) {
    fail('invalid-field', 'rejectedClaims must be a bounded array.');
  }
  const claims = value.map((item) => {
    assertExactKeys(item, ['claimId', 'reason'], 'rejected claim');
    const claimId = normalizeText(item.claimId, 'rejected claimId', { maxLength: 120 });
    if (!knownClaims.has(claimId)) {
      fail('unknown-claim', `Rejected claim ${claimId} is not in this council.`);
    }
    return { claimId, reason: normalizeText(item.reason, 'rejected claim reason') };
  });
  if (new Set(claims.map((item) => item.claimId)).size !== claims.length) {
    fail('duplicate-claim', 'rejectedClaims contains duplicate claim ids.');
  }
  return claims.sort((left, right) => left.claimId.localeCompare(right.claimId));
}

function normalizeSynthesis(value, { evidenceIds, knownClaims, rebuttals }) {
  assertExactKeys(
    value,
    ['acceptedClaimIds', 'agreementIds', 'evidenceRefs', 'nextAction', 'nextOwner', 'rejectedClaims', 'unresolvedConflictIds', 'unresolvedCriticalConflictIds', 'verificationPlan'],
    'council synthesis',
  );
  const acceptedClaimIds = normalizeStringArray(value.acceptedClaimIds, 'acceptedClaimIds', { maxLength: MAX_CLAIMS * 2 });
  const agreementIds = normalizeStringArray(value.agreementIds, 'agreementIds', { maxLength: MAX_CLAIMS * 2 });
  for (const claimId of [...acceptedClaimIds, ...agreementIds]) {
    const claim = knownClaims.get(claimId);
    if (!claim) {
      fail('unknown-claim', `Synthesis references unknown claim ${claimId}.`);
    }
    if (!claim.evidenceRefs.length) {
      fail('unsupported-promotion', `Claim ${claimId} has no evidence reference.`);
    }
  }
  const rejectedClaims = normalizeRejectedClaims(value.rejectedClaims, knownClaims);
  const rejectedIds = new Set(rejectedClaims.map((item) => item.claimId));
  if (acceptedClaimIds.some((claimId) => rejectedIds.has(claimId))) {
    fail('decision-conflict', 'acceptedClaimIds and rejectedClaims must be disjoint.');
  }
  const evidenceRefs = normalizeStringArray(value.evidenceRefs, 'synthesis evidenceRefs', { maxLength: MAX_EVIDENCE_REFS * 2 });
  for (const ref of evidenceRefs) {
    if (!evidenceIds.has(ref)) {
      fail('cross-council-evidence', `Synthesis references unavailable evidence: ${ref}.`);
    }
  }
  const promotedEvidence = [...acceptedClaimIds, ...agreementIds]
    .flatMap((claimId) => knownClaims.get(claimId).evidenceRefs);
  if (promotedEvidence.some((ref) => !evidenceRefs.includes(ref))) {
    fail('missing-evidence', 'Synthesis evidenceRefs must include evidence for every accepted or agreed claim.');
  }
  const conflicts = rebuttals.flatMap((record) =>
    record.councilStatement.claims
      .filter((claim) => claim.position === 'challenge')
      .map((claim) => {
        const targetClaimIds = record.councilStatement.targetClaimIds;
        const critical = claim.severity === 'critical' || targetClaimIds.some(
          (targetId) => knownClaims.get(targetId)?.severity === 'critical',
        );
        const resolved = rejectedIds.has(claim.id) || targetClaimIds.every((targetId) => rejectedIds.has(targetId));
        return { claimId: claim.id, critical, resolved };
      }),
  );
  const expectedUnresolved = conflicts.filter((item) => !item.resolved).map((item) => item.claimId).sort();
  const expectedCritical = conflicts.filter((item) => !item.resolved && item.critical).map((item) => item.claimId).sort();
  const unresolvedConflictIds = normalizeStringArray(value.unresolvedConflictIds, 'unresolvedConflictIds', { maxLength: MAX_CLAIMS * 2 });
  const unresolvedCriticalConflictIds = normalizeStringArray(
    value.unresolvedCriticalConflictIds,
    'unresolvedCriticalConflictIds',
    { maxLength: MAX_CLAIMS * 2 },
  );
  assertSameValue(unresolvedConflictIds, expectedUnresolved, 'unresolved conflicts');
  assertSameValue(unresolvedCriticalConflictIds, expectedCritical, 'unresolved critical conflicts');
  const verificationPlan = normalizeStringArray(value.verificationPlan, 'verificationPlan', {
    maxLength: MAX_VERIFICATION_STEPS,
    required: true,
  });
  const nextOwner = normalizeText(value.nextOwner, 'synthesis nextOwner', { maxLength: 40 });
  if (nextOwner !== 'workspace-owner') {
    fail('invalid-owner', 'synthesis nextOwner must be workspace-owner.');
  }
  return {
    acceptedClaimIds,
    agreementIds,
    evidenceRefs,
    nextAction: normalizeText(value.nextAction, 'synthesis nextAction'),
    nextOwner,
    rejectedClaims,
    unresolvedConflictIds,
    unresolvedCriticalConflictIds,
    verificationPlan,
  };
}

export function createCouncilSynthesis(input) {
  assertExactKeys(input, ['artifactContent', 'brief', 'councilSynthesis', 'frame', 'metadata', 'openings', 'rebuttals', 'runId'], 'council synthesis record');
  const frame = assertFrame(input.frame);
  assertCompleteSeats(input.openings, 'opening');
  const openings = input.openings.map((record) => normalizeStatementRecord(record, { frame, openings: [] }));
  const brief = assertBrief(frame, input.brief, openings);
  assertCompleteSeats(input.rebuttals, 'rebuttal');
  const rebuttals = input.rebuttals.map((record) => normalizeStatementRecord(record, { frame, brief, openings }));
  const expectedMetadata = createCouncilSynthesisInput({
    brief,
    frame,
    openings,
    rebuttals,
  });
  const metadata = normalizeMetadata(input.metadata, expectedMetadata);
  const councilSynthesis = normalizeSynthesis(input.councilSynthesis, {
    evidenceIds: new Set(frame.evidenceCatalog.map((item) => item.id)),
    knownClaims: indexClaims(openings, rebuttals),
    rebuttals,
  });
  const record = {
    artifactContent: normalizeArtifactContent(input.artifactContent, 'synthesis artifactContent'),
    councilSynthesis,
    metadata,
    runId: normalizeText(input.runId, 'synthesis runId', { maxLength: 120 }),
  };
  const outputDigest = hashCouncilValue(synthesisPayload(record));
  if (metadata.outputDigest !== outputDigest) {
    fail('tampered-artifact', 'Synthesis outputDigest does not bind its current artifact content.');
  }
  return record;
}

function manifestPayload(manifest) {
  return {
    briefDigest: manifest.briefDigest,
    councilId: manifest.councilId,
    frameDigest: manifest.frameDigest,
    openings: manifest.openings,
    rebuttals: manifest.rebuttals,
    roster: manifest.roster,
    synthesis: manifest.synthesis,
    validator: manifest.validator,
    version: manifest.version,
  };
}

function createManifestBase({ frame, openings, brief, rebuttals, synthesis, validator }) {
  return {
    briefDigest: brief.briefDigest,
    councilId: frame.councilId,
    frameDigest: frame.frameDigest,
    openings: openings
      .map((record) => ({
        outputDigest: record.metadata.outputDigest,
        runId: record.runId,
        seatId: record.metadata.councilSeatId,
        sourceDigest: record.metadata.sourceDigest,
      }))
      .sort((left, right) => left.seatId.localeCompare(right.seatId)),
    rebuttals: rebuttals
      .map((record) => ({
        outputDigest: record.metadata.outputDigest,
        runId: record.runId,
        seatId: record.metadata.councilSeatId,
        sourceDigest: record.metadata.sourceDigest,
      }))
      .sort((left, right) => left.seatId.localeCompare(right.seatId)),
    roster: [...frame.roster],
    synthesis: {
      outputDigest: synthesis.metadata.outputDigest,
      runId: synthesis.runId,
      sourceDigest: synthesis.metadata.sourceDigest,
    },
    validator,
    version: COUNCIL_VERSION,
  };
}

function validateCouncilState({ frame, openings, brief, rebuttals, synthesis }) {
  const normalizedFrame = assertFrame(frame);
  assertCompleteSeats(openings, 'opening');
  const normalizedOpenings = openings.map((record) => normalizeStatementRecord(record, { frame: normalizedFrame, openings: [] }));
  const normalizedBrief = assertBrief(normalizedFrame, brief, normalizedOpenings);
  assertCompleteSeats(rebuttals, 'rebuttal');
  const normalizedRebuttals = rebuttals.map((record) =>
    normalizeStatementRecord(record, { frame: normalizedFrame, brief: normalizedBrief, openings: normalizedOpenings }),
  );
  const normalizedSynthesis = createCouncilSynthesis({
    artifactContent: synthesis.artifactContent,
    brief: normalizedBrief,
    councilSynthesis: synthesis.councilSynthesis,
    frame: normalizedFrame,
    metadata: synthesis.metadata,
    openings: normalizedOpenings,
    rebuttals: normalizedRebuttals,
    runId: synthesis.runId,
  });
  return {
    brief: normalizedBrief,
    frame: normalizedFrame,
    openings: normalizedOpenings,
    rebuttals: normalizedRebuttals,
    synthesis: normalizedSynthesis,
  };
}

export function createCouncilManifest(input) {
  const state = validateCouncilState(input);
  const criticalIds = state.synthesis.councilSynthesis.unresolvedCriticalConflictIds;
  const validator = criticalIds.length
    ? { code: 'critical-conflict', status: 'blocked' }
    : { code: 'ok', status: 'passed' };
  const manifest = createManifestBase({ ...state, validator });
  return {
    ...manifest,
    manifestDigest: hashCouncilValue(manifestPayload(manifest)),
  };
}

export function validateCouncilManifest(input) {
  try {
    assertExactKeys(input, ['brief', 'frame', 'manifest', 'openings', 'rebuttals', 'synthesis'], 'manifest validation input');
    const state = validateCouncilState(input);
    const criticalIds = state.synthesis.councilSynthesis.unresolvedCriticalConflictIds;
    const validator = criticalIds.length
      ? { code: 'critical-conflict', status: 'blocked' }
      : { code: 'ok', status: 'passed' };
    const expectedBase = createManifestBase({ ...state, validator });
    const expected = {
      ...expectedBase,
      manifestDigest: hashCouncilValue(manifestPayload(expectedBase)),
    };
    assertSameValue(input.manifest, expected, 'council manifest');
    if (criticalIds.length) {
      return { code: 'critical-conflict', ok: false, status: 'blocked', unresolvedCriticalConflictIds: criticalIds };
    }
    return { code: 'ok', ok: true, status: 'passed', unresolvedCriticalConflictIds: [] };
  } catch (error) {
    if (error instanceof CouncilContractError) {
      return { code: error.code, detail: error.message, ok: false, status: 'failed', unresolvedCriticalConflictIds: [] };
    }
    throw error;
  }
}
