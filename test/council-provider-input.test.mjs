import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildCouncilProviderInput } from '../src/core/mission-run-service.mjs';

const allowedKeys = [
  'councilBrief',
  'councilFrame',
  'councilId',
  'councilPhase',
  'councilRound',
  'councilRuntime',
  'councilSeatId',
  'councilSynthesisInput',
  'parentRunIds',
  'providerRole',
  'role',
  'sourceDigest',
  'specialistKind',
];

function baseInput(councilPhase) {
  return {
    attachments: [{ content: 'private attachment' }],
    councilBrief: { claims: [{ id: 'research:claim-1' }] },
    councilFrame: { frameDigest: 'sha256:frame' },
    councilId: 'council-1',
    councilPhase,
    councilRound: councilPhase === 'opening-position' ? 'opening' : 'rebuttal',
    councilSeatId: 'research',
    councilSynthesisInput: { sourceDigest: 'sha256:synthesis-input' },
    memoryEntries: [{ content: 'private memory' }],
    mission: {
      constraints: ['private constraint'],
      title: 'private mission title',
    },
    parentRunIds: ['run-parent'],
    previousOutputs: { planner: { summary: 'private planner output' } },
    providerRole: councilPhase === 'synthesis' ? 'executor' : 'specialist',
    retrievalContext: [{ content: 'private retrieval result' }],
    role: councilPhase === 'synthesis' ? 'executor' : 'specialist',
    sessionSourceContext: { source: 'private session source' },
    sourceDigest: 'sha256:source',
    specialistKind: 'research',
    workspace: { name: 'private workspace' },
  };
}

function assertRestricted(input) {
  assert.deepEqual(Object.keys(input).sort(), allowedKeys);
  const serialized = JSON.stringify(input);
  for (const privateValue of [
    'private attachment',
    'private constraint',
    'private memory',
    'private mission title',
    'private planner output',
    'private retrieval result',
    'private session source',
    'private workspace',
  ]) {
    assert.doesNotMatch(serialized, new RegExp(privateValue));
  }
}

test('non-council provider input remains unchanged', () => {
  const input = baseInput(null);

  assert.equal(buildCouncilProviderInput(input), input);
});

test('opening provider input contains only the frame and council execution allowlist', () => {
  const input = buildCouncilProviderInput(baseInput('opening-position'));

  assertRestricted(input);
  assert.deepEqual(input.councilFrame, { frameDigest: 'sha256:frame' });
  assert.equal(input.councilBrief, null);
  assert.equal(input.councilRuntime, null);
  assert.equal(input.councilSynthesisInput, null);
});

test('rebuttal provider input contains only the brief and council execution allowlist', () => {
  const input = buildCouncilProviderInput(baseInput('rebuttal'));

  assertRestricted(input);
  assert.deepEqual(input.councilBrief, { claims: [{ id: 'research:claim-1' }] });
  assert.equal(input.councilFrame, null);
  assert.equal(input.councilRuntime, null);
  assert.equal(input.councilSynthesisInput, null);
});

test('synthesis provider input contains only evidence-bound council data and safe artifact settings', () => {
  const source = baseInput('synthesis');
  source.pack = {
    artifactFileName: 'council-result.md',
    artifactTitle: 'Council result',
    deliverableType: 'markdown',
    plannerGuidance: ['Summarize evidence-bound decisions.'],
    renderDraft({ planSteps }) {
      return `# Safe council draft\n\n${planSteps.join('\n')}`;
    },
    riskProfile: {
      actionKind: 'write_artifact',
      reason: 'The owner must approve workspace mutation.',
      requiresApproval: true,
      title: 'Write the approved council artifact',
    },
  };

  const input = buildCouncilProviderInput(source);

  assertRestricted(input);
  assert.equal(input.councilBrief, null);
  assert.equal(input.councilFrame, null);
  assert.deepEqual(input.councilSynthesisInput, { sourceDigest: 'sha256:synthesis-input' });
  assert.deepEqual(input.councilRuntime, {
    artifactContent: '# Safe council draft\n\nSummarize evidence-bound decisions.',
    artifactFileName: 'council-result.md',
    artifactTitle: 'Council result',
    deliverableType: 'markdown',
    nextAction: 'Pause for approval before any workspace mutation.',
    proposedAction: {
      kind: 'write_artifact',
      reason: 'The owner must approve workspace mutation.',
      requiresApproval: true,
      title: 'Write the approved council artifact',
    },
  });
});
