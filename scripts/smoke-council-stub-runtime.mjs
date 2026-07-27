import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  CouncilContractError,
  hashCouncilContent,
  parseCouncilRecord,
  validateCouncilManifest,
} from '../src/core/council-contract.mjs';
import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-council-runtime-'));
const workspacePath = path.join(tempRoot, 'workspace');

fs.mkdirSync(workspacePath, { recursive: true });

const store = createStore({ rootDir: tempRoot });
const service = createMissionService({ store, rootDir: tempRoot });
const workspace = service.addWorkspace({
  name: 'council-runtime-workspace',
  workspacePath,
});

function loadMissionState(missionId) {
  const state = store.loadState();
  return {
    approvals: state.approvals.filter((item) => item.missionId === missionId),
    artifacts: state.artifacts.filter((item) => item.missionId === missionId),
    executionLeases: state.executionLeases.filter((item) => item.missionId === missionId),
    runs: state.agentRuns.filter((item) => item.missionId === missionId),
    sessions: state.sessions.filter((item) => item.missionId === missionId),
  };
}

function findArtifact(state, run, kind) {
  return (run.artifactIds || [])
    .map((artifactId) => state.artifacts.find((artifact) => artifact.id === artifactId))
    .find((artifact) => artifact?.kind === kind);
}

function readArtifact(artifact) {
  assert.ok(artifact?.path);
  return fs.readFileSync(artifact.path, 'utf8');
}

function buildStatementRecord(state, run) {
  return {
    artifactContent: readArtifact(findArtifact(state, run, 'deliverable')),
    councilStatement: run.councilStatement,
    metadata: {
      councilId: run.councilId,
      councilPhase: run.councilPhase,
      councilRound: run.councilRound,
      councilSeatId: run.councilSeatId,
      outputDigest: run.outputDigest,
      parentRunIds: run.parentRunIds,
      sourceDigest: run.sourceDigest,
    },
    runId: run.id,
  };
}

function buildSynthesisRecord(state, run) {
  return {
    artifactContent: readArtifact(findArtifact(state, run, 'deliverable')),
    councilSynthesis: run.councilSynthesis,
    metadata: {
      councilId: run.councilId,
      councilPhase: run.councilPhase,
      councilRound: run.councilRound,
      councilSeatId: run.councilSeatId,
      outputDigest: run.outputDigest,
      parentRunIds: run.parentRunIds,
      sourceDigest: run.sourceDigest,
    },
    runId: run.id,
  };
}

function parseCouncilArtifact(state, kind) {
  const artifact = state.artifacts.find((item) => item.kind === kind);
  assert.ok(artifact, `${kind} artifact must exist`);
  return JSON.parse(readArtifact(artifact));
}

const attachmentSentinel = 'COUNCIL_ATTACHMENT_SENTINEL_MUST_NOT_REACH_REBUTTAL';
const memorySentinel = 'COUNCIL_MEMORY_SENTINEL_MUST_NOT_REACH_REBUTTAL';

const successMission = service.createMission({
  constraints: ['orchestration-profile:knowledge-council-triad'],
  deliverableType: 'decision-memo',
  mode: 'knowledge',
  objective: 'Verify an evidence-bound two-round council before reviewer handoff.',
  title: 'Council success mission',
  workspaceId: workspace.id,
});

service.addMemory({
  content: memorySentinel,
  kind: 'fact',
  scope: 'mission',
  scopeId: successMission.id,
});
service.addMissionAttachment({
  content: attachmentSentinel,
  fileName: 'council-source.md',
  mimeType: 'text/markdown',
  missionId: successMission.id,
  source: 'deterministic-council-smoke',
});

const successResult = await service.runMission(successMission.id, {
  provider: 'stub',
  providerSpecified: true,
});

assert.equal(successResult.mission.status, 'completed');

const successState = loadMissionState(successMission.id);
const openingRuns = successState.runs.filter((run) => run.stageKind === 'council-opening');
const rebuttalRuns = successState.runs.filter((run) => run.stageKind === 'council-rebuttal');
const synthesisRun = successState.runs.find((run) => run.stageKind === 'parallel-merge');
const reviewerRun = successState.runs.find((run) => run.role === 'reviewer');

assert.equal(openingRuns.length, 3);
assert.equal(rebuttalRuns.length, 3);
assert.ok(synthesisRun);
assert.ok(reviewerRun);
assert.deepEqual(
  openingRuns.map((run) => run.councilSeatId).sort(),
  ['implementation', 'research', 'verification'],
);
assert.deepEqual(
  rebuttalRuns.map((run) => run.councilSeatId).sort(),
  ['implementation', 'research', 'verification'],
);
assert.equal(new Set(openingRuns.map((run) => run.sourceDigest)).size, 1);
assert.equal(new Set(openingRuns.map((run) => run.councilId)).size, 1);
assert.equal(
  openingRuns.every((run) => run.parentRunIds.length === 1 && run.parentRunIds[0] === run.parentRunId),
  true,
);
assert.equal(
  rebuttalRuns.every((run) => {
    const opening = openingRuns.find((item) => item.councilSeatId === run.councilSeatId);
    return run.parentRunIds.length === 1 && run.parentRunIds[0] === opening.id;
  }),
  true,
);
assert.deepEqual(
  [...synthesisRun.parentRunIds].sort(),
  rebuttalRuns.map((run) => run.id).sort(),
);
assert.equal(findArtifact(successState, synthesisRun, 'retrieval'), undefined);
const synthesisPrompt = readArtifact(findArtifact(successState, synthesisRun, 'prompt'));
assert.doesNotMatch(synthesisPrompt, new RegExp(attachmentSentinel));
assert.doesNotMatch(synthesisPrompt, new RegExp(memorySentinel));

const openingPrompts = openingRuns.map((run) =>
  readArtifact(findArtifact(successState, run, 'prompt')),
);
assert.equal(new Set(openingPrompts).size, 1);

for (const [index, run] of openingRuns.entries()) {
  const prompt = openingPrompts[index];
  assert.match(prompt, /## Council Context/);
  assert.match(prompt, new RegExp(run.councilFrame.frameDigest));
  assert.doesNotMatch(prompt, /(research|implementation|verification):claim-1/);
  assert.doesNotMatch(prompt, new RegExp(attachmentSentinel));
  assert.doesNotMatch(prompt, new RegExp(memorySentinel));
  assert.equal(findArtifact(successState, run, 'retrieval'), undefined);
  assert.equal(run.councilPromptDigest, hashCouncilContent(openingPrompts[0]));
}

for (const run of rebuttalRuns) {
  const prompt = readArtifact(findArtifact(successState, run, 'prompt'));
  assert.match(prompt, /## Council Context/);
  assert.match(prompt, /research:claim-1/);
  assert.match(prompt, /implementation:claim-1/);
  assert.match(prompt, /verification:claim-1/);
  assert.doesNotMatch(prompt, new RegExp(attachmentSentinel));
  assert.doesNotMatch(prompt, new RegExp(memorySentinel));
  assert.equal(findArtifact(successState, run, 'retrieval'), undefined);
}

const frame = parseCouncilArtifact(successState, 'council-frame');
const brief = parseCouncilArtifact(successState, 'council-brief');
const manifest = parseCouncilArtifact(successState, 'council-manifest');
const openings = openingRuns.map((run) => buildStatementRecord(successState, run));
const rebuttals = rebuttalRuns.map((run) => buildStatementRecord(successState, run));
const synthesis = buildSynthesisRecord(successState, synthesisRun);
const validation = validateCouncilManifest({
  brief,
  frame,
  manifest,
  openings,
  rebuttals,
  synthesis,
});

assert.deepEqual(validation, {
  code: 'ok',
  ok: true,
  status: 'passed',
  unresolvedCriticalConflictIds: [],
});
assert.equal(synthesisRun.councilValidation.status, 'passed');
assert.ok(successState.runs.indexOf(reviewerRun) > successState.runs.indexOf(synthesisRun));
assert.equal(successState.runs.every((run) => run.providerId === 'stub'), true);
assert.equal(successState.runs.every((run) => [null, 0].includes(run.estimatedCostUsd)), true);
assert.equal(successState.runs.every((run) => run.providerResponseId === null), true);

const tamperedOpenings = openings.map((record, index) =>
  index === 0
    ? {
        ...record,
        artifactContent: `${record.artifactContent}\nTAMPERED`,
      }
    : record,
);
const tamperedValidation = validateCouncilManifest({
  brief,
  frame,
  manifest,
  openings: tamperedOpenings,
  rebuttals,
  synthesis,
});
assert.equal(tamperedValidation.ok, false);
assert.equal(tamperedValidation.status, 'failed');
assert.equal(tamperedValidation.code, 'tampered-artifact');

const frameArtifactContent = readArtifact(
  successState.artifacts.find((artifact) => artifact.kind === 'council-frame'),
);
assert.throws(
  () => parseCouncilRecord(`${frameArtifactContent}\n`, 'council frame artifact'),
  (error) => error instanceof CouncilContractError && error.code === 'noncanonical-artifact',
);

const conflictMission = service.createMission({
  constraints: [
    'orchestration-profile:knowledge-council-triad',
    'council-critical-conflict',
  ],
  deliverableType: 'decision-memo',
  mode: 'knowledge',
  objective: 'Stop a critical council conflict before reviewer and approval side effects.',
  title: 'Council critical conflict mission',
  workspaceId: workspace.id,
});
const conflictResult = await service.runMission(conflictMission.id, {
  provider: 'stub',
  providerSpecified: true,
});

assert.equal(conflictResult.mission.status, 'failed');

const conflictState = loadMissionState(conflictMission.id);
const conflictSynthesisRun = conflictState.runs.find((run) => run.stageKind === 'parallel-merge');
const conflictManifest = parseCouncilArtifact(conflictState, 'council-manifest');

assert.equal(conflictManifest.validator.status, 'blocked');
assert.equal(conflictSynthesisRun.councilValidation.status, 'blocked');
assert.equal(conflictState.runs.some((run) => run.role === 'reviewer'), false);
assert.equal(conflictState.approvals.length, 0);
assert.equal(conflictState.executionLeases.length, 0);

const followUp = service.getSpecialistFollowUpInbox({
  missionId: conflictMission.id,
});
assert.equal(followUp.items.length, 1);
assert.equal(followUp.items[0].specialistKind, 'verification');
assert.equal(followUp.items[0].councilId, conflictSynthesisRun.councilId);
assert.equal(followUp.items[0].councilPhase, 'rebuttal');
assert.equal(followUp.items[0].councilRound, 'rebuttal');
assert.ok(followUp.items[0].outputDigest);
assert.ok(followUp.items[0].sourceDigest);

const firstConflictCouncilId = conflictSynthesisRun.councilId;
const conflictRetry = await service.runMission(conflictMission.id, {
  provider: 'stub',
  providerSpecified: true,
});
assert.equal(conflictRetry.mission.status, 'failed');

const retriedConflictState = loadMissionState(conflictMission.id);
const conflictCouncilIds = [
  ...new Set(
    retriedConflictState.runs
      .map((run) => run.councilId)
      .filter(Boolean),
  ),
];
assert.equal(retriedConflictState.sessions.length, 2);
assert.equal(conflictCouncilIds.length, 2);
assert.ok(conflictCouncilIds.includes(firstConflictCouncilId));

for (const artifact of retriedConflictState.artifacts.filter((item) => item.kind === 'council-frame')) {
  const persistedFrame = parseCouncilRecord(readArtifact(artifact), 'council frame artifact');
  const councilRuns = retriedConflictState.runs.filter((run) => run.councilId === persistedFrame.councilId);
  assert.ok(councilRuns.length > 0);
  assert.equal(councilRuns.every((run) => run.sessionId === persistedFrame.sessionId), true);
  assert.equal(artifact.sessionId, persistedFrame.sessionId);
}

const sessionCountBeforeRosterRejection = store.loadState().sessions.length;
assert.throws(
  () => service.createMission({
    constraints: [
      'orchestration-profile:knowledge-council-triad',
      'parallel-specialists:research,implementation',
    ],
    deliverableType: 'decision-memo',
    mode: 'knowledge',
    objective: 'Reject a caller override of the fixed council roster.',
    title: 'Council fixed roster mission',
    workspaceId: workspace.id,
  }),
  /uses a fixed council roster and cannot be combined with parallel-specialists/,
);
assert.equal(store.loadState().sessions.length, sessionCountBeforeRosterRejection);

const nonStubMission = service.createMission({
  constraints: ['orchestration-profile:knowledge-council-triad'],
  deliverableType: 'decision-memo',
  mode: 'knowledge',
  objective: 'Reject non-stub council execution before creating a session.',
  title: 'Council non-stub rejection mission',
  workspaceId: workspace.id,
});
const sessionCountBeforeProviderRejection = store.loadState().sessions.length;
await assert.rejects(
  service.runMission(nonStubMission.id, {
    provider: 'openai',
    providerSpecified: true,
  }),
  /currently requires the explicit stub provider/,
);
assert.equal(store.loadState().sessions.length, sessionCountBeforeProviderRejection);

console.log(
  JSON.stringify(
    {
      conflictMissionId: conflictMission.id,
      mode: 'council-stub-runtime',
      ok: true,
      openingCount: openingRuns.length,
      rebuttalCount: rebuttalRuns.length,
      successMissionId: successMission.id,
      validatorStatus: validation.status,
    },
    null,
    2,
  ),
);
