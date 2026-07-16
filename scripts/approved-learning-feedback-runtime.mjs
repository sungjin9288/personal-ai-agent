import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

export function hashText(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

export function createFeedbackWorkspace({ directoryName = 'workspace', name, rootDir }) {
  const workspacePath = path.join(rootDir, directoryName);
  fs.mkdirSync(workspacePath, { recursive: true });
  return runCli({
    rootDir,
    args: ['workspace', 'add', workspacePath, '--name', name],
  });
}

export function createFeedbackMission({ rootDir, testCase, workspaceId }) {
  return runCli({
    rootDir,
    args: [
      'mission',
      'create',
      '--workspace',
      workspaceId,
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
}

export function runFeedbackMission({ label, missionId, rootDir }) {
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
    throw new Error(`${label} stub mission did not complete with reviewer pass and learning candidate.`);
  }
  return result;
}

export function approveFeedbackMemory({ candidateId, note, rootDir, scope = 'mission' }) {
  const result = runCli({
    rootDir,
    args: [
      'action',
      'resolve-learning-promotion',
      candidateId,
      '--decision',
      'approve',
      '--target',
      'memory',
      '--scope',
      scope,
      '--note',
      note,
    ],
  });
  const memory = result.memoryEntry;
  if (
    result.learningCandidate?.promotionStatus !== 'promoted' ||
    result.learningCandidate?.promotionVerification?.status !== 'passed' ||
    !memory?.id ||
    !memory.content
  ) {
    throw new Error('Learning promotion did not create verified mission memory.');
  }
  return { memory, promotion: result.learningCandidate };
}

export function authorizeFeedbackScope({ candidateId, note, rootDir, scope = 'workspace' }) {
  return runCli({
    rootDir,
    args: [
      'action',
      'authorize-learning-promotion-scope',
      candidateId,
      '--scope',
      scope,
      '--note',
      note,
    ],
  });
}

export function rollbackFeedbackMemory({ candidateId, note, rootDir }) {
  const result = runCli({
    rootDir,
    args: [
      'action',
      'rollback-learning-promotion',
      candidateId,
      '--note',
      note,
    ],
  });
  return result.learningCandidate;
}

export function getFeedbackMissionTimeline({ missionId, rootDir }) {
  return runCli({
    rootDir,
    args: ['mission', 'timeline', missionId],
  });
}

export function observeFeedbackRun({
  expectedPlanStep,
  expectMemoryApplied,
  label,
  memoryContent,
  memoryId,
  rootDir,
  sessionId,
}) {
  const state = JSON.parse(fs.readFileSync(path.join(rootDir, 'var', 'state.json'), 'utf8'));
  const session = state.sessions.find((item) => item.id === sessionId);
  const candidate = state.learningCandidates.find((item) => item.sessionId === sessionId);
  const plannerRun = state.agentRuns.find(
    (item) => item.sessionId === sessionId && item.role === 'planner',
  );
  const executorRun = state.agentRuns.find(
    (item) => item.sessionId === sessionId && item.role === 'executor',
  );
  const artifacts = state.artifacts.filter((item) => item.sessionId === sessionId);
  const plannerArtifact = artifacts.find((item) => item.fileName === 'planner-plan.md');
  const plannerPromptArtifact = artifacts.find((item) => item.fileName === 'planner-prompt.md');
  const deliverableArtifact = artifacts.find(
    (item) => item.kind === 'deliverable' && item.role === 'executor',
  );
  const retrievalArtifact =
    artifacts.find((item) => item.fileName === 'planner-retrieval.md') || null;
  if (!session || !candidate || !plannerRun || !executorRun || !plannerArtifact || !deliverableArtifact) {
    throw new Error(`${label} mission run evidence is incomplete.`);
  }

  const plannerContent = fs.readFileSync(plannerArtifact.path, 'utf8');
  const plannerPromptContent = plannerPromptArtifact
    ? fs.readFileSync(plannerPromptArtifact.path, 'utf8')
    : '';
  const deliverableContent = fs.readFileSync(deliverableArtifact.path, 'utf8');
  const retrievalContent = retrievalArtifact ? fs.readFileSync(retrievalArtifact.path, 'utf8') : '';
  const retrievalEntries = parseRetrievalEntries(retrievalContent);
  const primaryRetrieval = retrievalEntries[0] || emptyRetrieval();
  const adaptationNotes = Array.isArray(plannerRun.adaptationNotes)
    ? plannerRun.adaptationNotes
    : [];
  const planSteps = Array.isArray(plannerRun.planSteps) ? plannerRun.planSteps : [];
  const expectedMemoryApplied =
    expectMemoryApplied === undefined
      ? Boolean(memoryId && memoryContent)
      : expectMemoryApplied === true;
  const memoryExposure = {
    deliverableContainsMemory: Boolean(memoryContent && deliverableContent.includes(memoryContent)),
    plannerPromptContainsMemory: Boolean(
      memoryContent && plannerPromptContent.includes(memoryContent),
    ),
    retrievalContainsMemory: Boolean(
      memoryId && retrievalEntries.some((entry) => entry.sourceId === memoryId),
    ),
  };

  return {
    answerQuality: {
      answerText: deliverableContent,
      citedSourceKeys:
        expectedMemoryApplied &&
        deliverableContent.includes(memoryContent) &&
        retrievalEntries.some((entry) => entry.sourceId === memoryId)
          ? [`memory:${memoryId}`]
          : [],
      retrievedItems: retrievalEntries.map((entry) => ({
        sourceKey: `${entry.sourceType}:${entry.sourceId}`,
      })),
    },
    summary: {
      adaptation: {
        deliverableApplied: expectedMemoryApplied
          ? deliverableContent.includes('## Prior Memory Signals') &&
            deliverableContent.includes(memoryContent)
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
      externalProviderCallCount: state.agentRuns.filter(
        (item) => item.sessionId === sessionId && item.providerId !== 'stub',
      ).length,
      learningMemoryPresent: memoryId
        ? state.memoryEntries.some(
            (item) => item.id === memoryId && item.content === memoryContent,
          )
        : false,
      memoryExposure,
      providerId: session.provider,
      retrieval: primaryRetrieval,
      reviewerVerdict: candidate.evidence?.reviewerVerdict,
      sessionId,
      status: session.status,
    },
  };
}

function parseRetrievalEntries(content) {
  const snippetSection = String(content || '').split('## Snippets\n')[1] || '';
  if (!snippetSection || snippetSection.startsWith('- no retrieval snippets selected')) {
    return [];
  }

  return snippetSection
    .split(/\n(?=- \[)/)
    .map((block) => {
      const source = block.match(/^- \[([^\]]+)\] ([^\n]+)/);
      const provenanceText = block.match(/\n  - provenance: (\{[^\n]+\})/)?.[1] || '';
      const provenance = provenanceText ? JSON.parse(provenanceText) : {};
      const scope = block.match(/\n  - scope: ([^/\n]+)\/([^\n]+)/);
      return {
        contentHash: block.match(/\n  - contentHash: ([a-f0-9]{64})/)?.[1] || null,
        matchTermCount: Number(block.match(/\n  - matchTermCount: (\d+)/)?.[1] || 0),
        scope: scope?.[1] || '',
        scopeId: scope?.[2] || '',
        sourceId: String(provenance.sourceId || ''),
        sourceLabel: source?.[2] || '',
        sourceType: source?.[1] || '',
      };
    })
    .filter((entry) => entry.sourceId && entry.sourceType);
}

function emptyRetrieval() {
  return {
    contentHash: null,
    matchTermCount: 0,
    scope: '',
    scopeId: '',
    sourceId: '',
  };
}
