import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  assertApprovedLearningRagFeedbackEvidence,
  buildApprovedLearningRagFeedbackEvidence,
} from '../src/core/approved-learning-rag-feedback.mjs';
import { runCli } from './cli-test-helpers.mjs';

const repoDir = process.cwd();
const fixturePath = path.join(repoDir, 'fixtures', 'approved-learning-rag-feedback-cases-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);
const testCase = fixture.cases?.[0];
const options = parseOptions(process.argv.slice(2));

if (
  fixture.schemaVersion !== 'personal-ai-agent-approved-learning-rag-feedback-cases/v1' ||
  fixture.cases?.length !== 1 ||
  !testCase?.id ||
  !testCase.objective ||
  !testCase.promotionNote ||
  !testCase.expectedPlanStep
) {
  throw new Error('P1 approved learning RAG feedback fixture is invalid.');
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-learning-rag-feedback-'));
let evidence;
try {
  const workspacePath = path.join(tempRoot, 'workspace');
  fs.mkdirSync(workspacePath, { recursive: true });
  const workspace = runCli({
    rootDir: tempRoot,
    args: ['workspace', 'add', workspacePath, '--name', 'approved-learning-rag-feedback'],
  });
  const mission = runCli({
    rootDir: tempRoot,
    args: [
      'mission',
      'create',
      '--workspace',
      workspace.id,
      '--mode',
      testCase.mode,
      '--deliverable',
      testCase.deliverableType,
      '--title',
      testCase.title,
      '--objective',
      testCase.objective,
    ],
  });

  const beforeRun = runStubMission({ missionId: mission.id, rootDir: tempRoot });
  const beforePromotion = observeRun({
    expectedPlanStep: testCase.expectedPlanStep,
    memoryContent: '',
    memoryId: '',
    rootDir: tempRoot,
    sessionId: beforeRun.sessionId,
  });

  const promotionResult = runCli({
    rootDir: tempRoot,
    args: [
      'action',
      'resolve-learning-promotion',
      beforeRun.learningCandidateId,
      '--decision',
      'approve',
      '--target',
      'memory',
      '--scope',
      'mission',
      '--note',
      testCase.promotionNote,
    ],
  });
  const memory = promotionResult.memoryEntry;
  if (
    promotionResult.learningCandidate?.promotionStatus !== 'promoted' ||
    promotionResult.learningCandidate?.promotionVerification?.status !== 'passed' ||
    !memory?.id ||
    !memory.content
  ) {
    throw new Error('P1 learning promotion did not create verified mission memory.');
  }

  const afterRun = runStubMission({ missionId: mission.id, rootDir: tempRoot });
  const afterPromotion = observeRun({
    expectedPlanStep: testCase.expectedPlanStep,
    memoryContent: memory.content,
    memoryId: memory.id,
    rootDir: tempRoot,
    sessionId: afterRun.sessionId,
  });
  if (afterPromotion.retrieval.matchTermCount < testCase.minimumRetrievalMatchTermCount) {
    throw new Error('P1 promoted memory retrieval did not meet the fixture term-match gate.');
  }

  const rollbackResult = runCli({
    rootDir: tempRoot,
    args: [
      'action',
      'rollback-learning-promotion',
      beforeRun.learningCandidateId,
      '--note',
      'Rollback the promoted memory after the local feedback-loop evaluation.',
    ],
  });
  const rollbackRun = runStubMission({ missionId: mission.id, rootDir: tempRoot });
  const afterRollback = observeRun({
    expectedPlanStep: testCase.expectedPlanStep,
    memoryContent: memory.content,
    memoryId: memory.id,
    rootDir: tempRoot,
    sessionId: rollbackRun.sessionId,
  });
  const rolledBackCandidate = rollbackResult.learningCandidate;

  evidence = buildApprovedLearningRagFeedbackEvidence({
    fixtureBinding: {
      caseId: testCase.id,
      expectedPlanStepHash: hashText(testCase.expectedPlanStep),
      fixtureHash: hashText(fixtureText),
      objectiveHash: hashText(testCase.objective),
      promotionNoteHash: hashText(testCase.promotionNote),
    },
    mission: {
      id: mission.id,
      objectiveHash: hashText(mission.objective),
      workspaceId: workspace.id,
    },
    observedAt: new Date().toISOString(),
    promotion: {
      candidateId: rolledBackCandidate.id,
      finalStatus: rolledBackCandidate.promotionStatus,
      memoryContentHash: hashText(memory.content),
      memoryId: memory.id,
      memoryRollbackStatus: rolledBackCandidate.promotionRollback?.memoryRollbackStatus,
      rollbackAction: rolledBackCandidate.promotionDecision?.rollback?.action,
      rollbackStatus: rolledBackCandidate.promotionDecision?.rollback?.status,
      scope: rolledBackCandidate.promotionDecision?.scope,
      scopeId: rolledBackCandidate.promotionDecision?.scopeId,
      target: rolledBackCandidate.promotionDecision?.target,
      verificationId: rolledBackCandidate.promotionVerification?.id,
      verificationStatus: rolledBackCandidate.promotionVerification?.status,
    },
    runs: {
      beforePromotion,
      afterPromotion,
      afterRollback,
    },
  });
  assertApprovedLearningRagFeedbackEvidence(evidence);
  if (!evidence.actualApprovedLearningRagFeedbackValidated) {
    throw new Error(
      `P1 approved learning RAG feedback gate failed: ${JSON.stringify(evidence.results)}.`,
    );
  }
} finally {
  fs.rmSync(tempRoot, { force: true, recursive: true });
}

if (options.outputPath) {
  fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
  fs.writeFileSync(options.outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify({
  actualApprovedLearningRagFeedbackValidated: true,
  actualModelTrainingExecuted: false,
  costFree: true,
  externalProviderCalls: 'none',
  generalAnswerQualityImprovementValidated: false,
  mode: 'approved-learning-rag-feedback',
  ok: true,
  outputPath: options.outputPath ? path.relative(repoDir, options.outputPath) : null,
  postPromotionPlanStepCount: evidence.runs.afterPromotion.adaptation.planStepCount,
  postPromotionRetrievalMatchTermCount: evidence.runs.afterPromotion.retrieval.matchTermCount,
  productionReadyClaim: false,
  rollbackPlanStepCount: evidence.runs.afterRollback.adaptation.planStepCount,
}, null, 2));

function runStubMission({ missionId, rootDir }) {
  const result = runCli({
    rootDir,
    args: ['mission', 'run', missionId, '--provider', 'stub'],
  });
  if (
    result.status !== 'completed' ||
    result.provider !== 'stub' ||
    result.reviewerVerdict !== 'pass' ||
    !result.learningCandidateId
  ) {
    throw new Error('P1 stub mission did not complete with reviewer pass and learning candidate.');
  }
  return result;
}

function observeRun({ expectedPlanStep, memoryContent, memoryId, rootDir, sessionId }) {
  const state = JSON.parse(fs.readFileSync(path.join(rootDir, 'var', 'state.json'), 'utf8'));
  const session = state.sessions.find((item) => item.id === sessionId);
  const candidate = state.learningCandidates.find((item) => item.sessionId === sessionId);
  const plannerRun = state.agentRuns.find((item) => item.sessionId === sessionId && item.role === 'planner');
  const executorRun = state.agentRuns.find((item) => item.sessionId === sessionId && item.role === 'executor');
  const artifacts = state.artifacts.filter((item) => item.sessionId === sessionId);
  const plannerArtifact = artifacts.find((item) => item.fileName === 'planner-plan.md');
  const deliverableArtifact = artifacts.find(
    (item) => item.kind === 'deliverable' && item.role === 'executor',
  );
  const retrievalArtifact = artifacts.find((item) => item.fileName === 'planner-retrieval.md') || null;
  if (!session || !candidate || !plannerRun || !executorRun || !plannerArtifact || !deliverableArtifact) {
    throw new Error('P1 mission run evidence is incomplete.');
  }
  const plannerContent = fs.readFileSync(plannerArtifact.path, 'utf8');
  const deliverableContent = fs.readFileSync(deliverableArtifact.path, 'utf8');
  const retrievalContent = retrievalArtifact ? fs.readFileSync(retrievalArtifact.path, 'utf8') : '';
  const externalProviderCallCount = state.agentRuns.filter(
    (item) => item.sessionId === sessionId && item.providerId !== 'stub',
  ).length;
  const adaptationNotes = Array.isArray(plannerRun.adaptationNotes)
    ? plannerRun.adaptationNotes
    : [];
  const planSteps = Array.isArray(plannerRun.planSteps) ? plannerRun.planSteps : [];
  const expectedMemoryApplied = Boolean(memoryId && memoryContent);

  return {
    adaptation: {
      deliverableApplied: expectedMemoryApplied
        ? deliverableContent.includes('## Prior Memory Signals') && deliverableContent.includes(memoryContent)
        : false,
      planStepCount: planSteps.length,
      plannerApplied: expectedMemoryApplied
        ? adaptationNotes.includes(memoryContent) && planSteps.includes(expectedPlanStep)
        : false,
    },
    artifacts: {
      deliverableHash: hashText(deliverableContent),
      plannerHash: hashText(plannerContent),
      retrievalHash: retrievalContent ? hashText(retrievalContent) : null,
    },
    externalProviderCallCount,
    learningMemoryPresent: memoryId
      ? state.memoryEntries.some((item) => item.id === memoryId && item.content === memoryContent)
      : false,
    providerId: session.provider,
    retrieval: parseRetrieval(retrievalContent),
    reviewerVerdict: candidate.evidence?.reviewerVerdict,
    sessionId,
    status: session.status,
  };
}

function parseRetrieval(content) {
  if (!content) {
    return {
      contentHash: null,
      matchTermCount: 0,
      scope: '',
      scopeId: '',
      sourceId: '',
    };
  }
  const scope = content.match(/\n  - scope: ([^/\n]+)\/([^\n]+)/);
  return {
    contentHash: content.match(/\n  - contentHash: ([a-f0-9]{64})/)?.[1] || null,
    matchTermCount: Number(content.match(/\n  - matchTermCount: (\d+)/)?.[1] || 0),
    scope: scope?.[1] || '',
    scopeId: scope?.[2] || '',
    sourceId: content.match(/"sourceId":"([^"]+)"/)?.[1] || '',
  };
}

function hashText(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function parseOptions(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (key !== '--output' || value === undefined || values.has(key)) {
      throw new Error('Expected one optional P1 --output path.');
    }
    values.set(key, value);
  }
  const outputValue = normalizeText(values.get('--output'));
  const outputPath = outputValue ? path.resolve(repoDir, outputValue) : null;
  if (outputPath && outputPath !== repoDir && !outputPath.startsWith(`${repoDir}${path.sep}`)) {
    throw new Error('P1 approved learning RAG feedback output must stay inside the repository.');
  }
  return { outputPath };
}

function normalizeText(value) {
  return String(value || '').trim();
}
