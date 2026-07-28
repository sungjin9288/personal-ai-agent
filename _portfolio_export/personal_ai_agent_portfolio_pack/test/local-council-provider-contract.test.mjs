import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildRequestPrompt,
  normalizeStructuredOutput,
} from '../src/providers/structured-provider-utils.mjs';

function specialistInput({
  councilPhase = 'opening-position',
  councilSeatId = 'research',
} = {}) {
  return {
    councilBrief: councilPhase === 'rebuttal'
      ? {
          claims: [
            { id: 'research:claim-1', seatId: 'research' },
            { id: 'verification:claim-1', seatId: 'verification' },
          ],
        }
      : null,
    councilPhase,
    councilSeatId,
    role: 'specialist',
  };
}

function specialistOutput({
  claimId = 'claim-research',
  targetClaimIds = [],
} = {}) {
  return {
    artifactContent: '# Council statement',
    councilStatement: {
      explanation: 'This unrequested field must not cross the provider boundary.',
      claims: [{
        evidenceRefs: ['artifact:plan'],
        rationale: 'This unrequested field must be discarded.',
        id: claimId,
        position: 'support',
        severity: 'normal',
        summary: 'Use the bounded plan evidence.',
      }],
      nextAction: '',
      rejectedOptionIds: [],
      targetClaimIds,
    },
    nextAction: 'Send the statement to the next council phase.',
    summaryText: 'A bounded council position was recorded.',
  };
}

test('local council opening prompts keep shared bytes and omit seat identity', () => {
  const delegatedPrompt = 'Shared specialist template and Council Context.';
  const research = buildRequestPrompt(specialistInput(), delegatedPrompt);
  const implementation = buildRequestPrompt(
    specialistInput({ councilSeatId: 'implementation' }),
    delegatedPrompt,
  );

  assert.equal(research, implementation);
  assert.doesNotMatch(research, /research|implementation|verification/);
  assert.match(research, /"id": "claim-1"/);
  assert.match(research, /opening targetClaimIds and rejectedOptionIds must be empty/);
});

test('local council specialist normalization adds only the fixed seat prefix', () => {
  const input = specialistInput();
  const result = normalizeStructuredOutput(
    { output: specialistOutput(), role: 'specialist' },
    input,
    'Local',
  );

  assert.equal(result.councilStatement.claims[0].id, 'research:claim-1');
  assert.equal(
    result.councilStatement.nextAction,
    'Send the statement to the next council phase.',
  );
  assert.deepEqual(
    Object.keys(result.councilStatement).sort(),
    ['claims', 'nextAction', 'rejectedOptionIds', 'targetClaimIds'],
  );
  assert.deepEqual(
    Object.keys(result.councilStatement.claims[0]).sort(),
    ['evidenceRefs', 'id', 'position', 'severity', 'summary'],
  );
  assert.equal(result.artifactFileName, 'council-research-opening.md');
  assert.equal(result.specialistHandoff.nextHandoff.targetRole, 'council-brief');
  assert.deepEqual(result.specialistHandoff.evidence, ['artifact:plan']);
});

test('local council rebuttal normalization preserves known targets', () => {
  const input = specialistInput({
    councilPhase: 'rebuttal',
    councilSeatId: 'implementation',
  });
  const result = normalizeStructuredOutput(
    {
      output: specialistOutput({
        claimId: 'claim-2',
        targetClaimIds: ['research:claim-1'],
      }),
      role: 'specialist',
    },
    input,
    'Local',
  );

  assert.equal(result.councilStatement.claims[0].id, 'implementation:claim-2');
  assert.deepEqual(result.councilStatement.targetClaimIds, ['research:claim-1']);
  assert.equal(result.specialistHandoff.nextHandoff.targetRole, 'manager-merge');

  const prompt = buildRequestPrompt(input, 'Rebuttal Council Context.');
  assert.match(prompt, /research:claim-1, verification:claim-1/);
});

test('local council synthesis normalization preserves contract output without a mission pack', () => {
  const input = {
    councilPhase: 'synthesis',
    councilRuntime: {
      artifactFileName: 'decision.md',
      artifactTitle: 'Decision',
      proposedAction: {
        kind: 'none',
        reason: 'Shadow evaluation only.',
        requiresApproval: false,
        title: 'No workspace action',
      },
    },
    role: 'executor',
  };
  const councilSynthesis = {
    acceptedClaimIds: ['research:claim-1'],
    agreementIds: [],
    evidenceRefs: ['artifact:plan'],
    nextAction: 'Run the bounded verification.',
    nextOwner: 'workspace-owner',
    rejectedClaims: [],
    unresolvedConflictIds: [],
    unresolvedCriticalConflictIds: [],
    verificationPlan: ['Validate the council manifest.'],
  };
  const result = normalizeStructuredOutput(
    {
      output: {
        artifactContent: '# Council Decision',
        councilSynthesis,
        nextAction: councilSynthesis.nextAction,
        summaryText: 'The chair recorded an evidence-bound decision.',
      },
      role: 'executor',
    },
    input,
    'Local',
  );

  assert.equal(result.artifactFileName, 'decision.md');
  assert.equal(result.councilSynthesis, councilSynthesis);
  assert.equal(result.executionManifest, null);
});

test('local council normalization fails closed when the council payload is missing', () => {
  assert.throws(
    () => normalizeStructuredOutput(
      {
        output: {
          artifactContent: '# Council statement',
          nextAction: 'Stop.',
          summaryText: 'Missing statement.',
        },
        role: 'specialist',
      },
      specialistInput(),
      'Local',
    ),
    /council specialist output is missing required fields/,
  );
});
