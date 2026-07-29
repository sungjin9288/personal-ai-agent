import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertC12BaselineArtifacts,
  assertC12CandidateArtifact,
  assertC12Fixture,
  buildC12CandidateArtifact,
  runC12CandidateQualification,
} from '../src/core/local-council-strict-prompt-candidate-qualification.mjs';
import { hashLocalCouncilShadowValue } from '../src/core/local-council-provider-shadow.mjs';
import { normalizeStructuredOutput, parseStrictJsonText } from '../src/providers/structured-provider-utils.mjs';
import { writeEvidenceJson } from './evidence-gated-answer-output.mjs';

const repoDir = process.cwd();
const fixtureText = read('fixtures/local-council-strict-prompt-candidate-qualification-v1.json');
const fixture = JSON.parse(fixtureText);
const c11FixtureText = read('fixtures/local-council-rebuttal-stability-shadow-v1.json');
const baseline = Object.fromEntries(['c6', 'c7', 'c8', 'c9', 'c10', 'c11'].map((key) => [key, readJson(artifactPath(key))]));
const fileSha256 = Object.fromEntries(['c6', 'c7', 'c8', 'c9', 'c10', 'c11'].map((key) => [key, sha256(artifactPath(key))]));
const fixtureTextByBaseline = {
  c6: read('fixtures/local-council-provider-shadow-v1.json'), c7: read('fixtures/local-council-seat-contract-shadow-v1.json'),
  c8: read('fixtures/local-council-claim-contract-robustness-v1.json'), c9: read('fixtures/local-council-rebuttal-synthesis-shadow-v1.json'),
  c10: read('fixtures/local-council-chair-synthesis-contract-shadow-v1.json'),
};

assertC12Fixture(fixture);
assertC12BaselineArtifacts({ artifacts: baseline, c11FixtureText, fileSha256, fixtureText: fixtureTextByBaseline });
const execution = await runC12CandidateQualification({ fixture, fixtureText, provider: fakeProvider() });
const artifact = buildC12CandidateArtifact({
  baseline: Object.fromEntries(Object.entries(baseline).map(([key, value]) => [key, {
    artifactId: value.id, decision: value.qualification.decision, fileSha256: fileSha256[key], integrityHash: value.integrityHash, localShadowQualified: value.localShadowQualified,
  }])),
  calls: execution.calls,
  fixtureHash: hashLocalCouncilShadowValue(fixtureText),
  promptComparison: execution.promptComparison,
  qualifiedAt: fixture.qualifiedAt,
  validation: execution.validation,
});
assertC12CandidateArtifact(artifact, { baselineArtifacts: baseline, c11FixtureText, c12FixtureText: fixtureText, fileSha256, fixtureText: fixtureTextByBaseline });
writeEvidenceJson({ artifact, defaultRelativePath: 'evidence/output-artifacts/local-council-strict-prompt-candidate-qualification.json', label: 'Local council strict prompt candidate qualification output', repoDir });
console.log(JSON.stringify({ candidateStatus: artifact.candidateStatus, mode: 'build-local-council-strict-prompt-candidate-qualification', ok: true, passedCallCount: artifact.summary.passedCallCount }, null, 2));

function fakeProvider() {
  const values = outputs();
  let index = 0;
  return {
    preparePrompt: () => 'C12 deterministic fixture provider.',
    async run() {
      const outputText = JSON.stringify(values[index++]);
      return { attemptCount: 1, durationMs: 0, outputText, outputTextHash: hashLocalCouncilShadowValue(outputText), retryCount: 0, usageInputTokens: 0, usageOutputTokens: 0, usageTotalTokens: 0 };
    },
    normalizeOutput: (result, input) => normalizeStructuredOutput({ output: parseStrictJsonText(result.outputText, 'C12 fixture provider'), role: input.role }, input, 'C12 fixture provider'),
  };
}

function outputs() {
  const specialist = (seatId, phase) => ({ summaryText: 'Bounded position.', artifactContent: '# Position', nextAction: 'Keep the stub.', councilStatement: {
    claims: [{ id: `${seatId}:claim-${phase === 'opening-position' ? 1 : 2}`, position: phase === 'opening-position' ? 'unknown' : 'challenge', summary: 'Bounded claim.', evidenceRefs: ['artifact:bounded-plan'], severity: 'normal' }],
    targetClaimIds: phase === 'opening-position' ? [] : [{ research: 'implementation:claim-1', implementation: 'verification:claim-1', verification: 'research:claim-1' }[seatId]], rejectedOptionIds: [], nextAction: 'Keep the stub.',
  } });
  return [
    specialist('research', 'opening-position'), specialist('implementation', 'opening-position'), specialist('verification', 'opening-position'),
    specialist('research', 'rebuttal'), specialist('implementation', 'rebuttal'), specialist('verification', 'rebuttal'),
    { summaryText: 'Bounded decision.', artifactContent: '# Decision', nextAction: 'Keep the default profile unchanged pending independent review.', councilSynthesis: {
      acceptedClaimIds: [], agreementIds: [], evidenceRefs: [], nextAction: 'Keep the default profile unchanged pending independent review.', nextOwner: 'workspace-owner',
      rejectedClaims: ['implementation', 'research', 'verification'].map((seatId) => ({ claimId: `${seatId}:claim-2`, reason: 'Keep unpromoted.' })),
      unresolvedConflictIds: [], unresolvedCriticalConflictIds: [], verificationPlan: ['Verify locally.'],
    } },
  ];
}

function artifactPath(key) { return `evidence/output-artifacts/${{ c6: 'local-council-provider-shadow.json', c7: 'local-council-seat-contract-shadow.json', c8: 'local-council-claim-contract-robustness.json', c9: 'local-council-rebuttal-synthesis-shadow.json', c10: 'local-council-chair-synthesis-contract-shadow.json', c11: 'local-council-rebuttal-stability-shadow.json' }[key]}`; }
function read(relativePath) { return fs.readFileSync(path.join(repoDir, relativePath), 'utf8'); }
function readJson(relativePath) { return JSON.parse(read(relativePath)); }
function sha256(relativePath) { return createHash('sha256').update(read(relativePath)).digest('hex'); }
