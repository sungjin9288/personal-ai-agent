import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const packageJson = JSON.parse(readRequiredFile('package.json'));
const doc = readRequiredFile('docs/smoke-validation-summary-v1.md');
const readme = readRequiredFile('README.md');
const roadmap = readRequiredFile('docs/roadmap.md');
const evidenceGallery = readRequiredFile('docs/evidence-gallery.md');
const evidenceManifest = readRequiredFile('evidence/evidence_manifest.md');
const releaseReadiness = readRequiredFile('docs/release-readiness-v1.md');

const expectedCommands = [
  'npm run package:pilot-export',
  'npm run smoke:doctor',
  'npm run smoke:ui-doctor-surface',
  'npm run smoke:changelog',
  'npm run smoke:support-policy',
  'npm run smoke:contributor-onboarding',
  'npm run smoke:env-example',
  'npm run smoke:demo-local',
  'npm run smoke:demo-evidence-index',
  'npm run smoke:recorded-walkthrough',
  'npm run smoke:architecture-code-walkthrough',
  'npm run smoke:provider-readiness-matrix',
  'npm run smoke:provider-failure-recovery-demo',
  'npm run smoke:memory-retrieval-quality-fixture',
  'npm run smoke:answer-quality-evaluation',
  'npm run smoke:retrieval-corpus-contract',
  'npm run smoke:retrieval-quality-evaluation',
  'npm run smoke:semantic-retrieval-experiment',
  'npm run smoke:retrieval-reranking-experiment',
  'npm run smoke:semantic-retrieval-runtime',
  'npm run smoke:local-embedding-model-qualification',
  'npm run smoke:local-retrieval-robustness',
  'npm run smoke:local-relevance-reranker',
  'npm run smoke:local-reranker-resource-envelope',
  'npm run smoke:local-reranker-runtime-stability',
  'npm run smoke:local-relevance-shadow-integration',
  'npm run smoke:local-relevance-shadow-replay',
  'npm run smoke:local-relevance-shadow-cache',
  'npm run smoke:local-relevance-shadow-cache-lifecycle',
  'npm run smoke:local-relevance-shadow-cache-process-isolation',
  'npm run smoke:local-relevance-shadow-cache-termination-soak',
  'npm run smoke:approved-learning-rag-feedback',
  'npm run smoke:approved-learning-feedback-quality',
  'npm run smoke:workspace-learning-personalization',
  'npm run smoke:workspace-learning-conflict-revocation',
  'npm run smoke:workspace-learning-operator-override',
  'npm run smoke:workspace-learning-operator-surface',
  'npm run smoke:local-user-learning-personalization',
  'npm run smoke:user-learning-conflict-revocation',
  'npm run smoke:user-learning-operator-override',
  'npm run smoke:user-learning-operator-surface',
  'npm run smoke:approved-training-record',
  'npm run smoke:training-dataset-quality',
  'npm run smoke:fine-tuning-readiness',
  'npm run smoke:local-training-runtime',
  'npm run smoke:local-training-permission-surface',
  'npm run smoke:local-training-permission-evidence',
  'npm run smoke:local-training-environment-preflight',
  'npm run smoke:local-training-toolchain-decision',
  'npm run smoke:local-training-acquisition-request',
  'npm run smoke:local-training-acquisition-resolution',
  'npm run smoke:local-training-acquisition-execution-plan',
  'npm run smoke:local-training-acquisition-runtime',
  'npm run smoke:local-training-acquisition-artifact-verification',
  'npm run smoke:local-training-post-acquisition-readiness',
  'npm run smoke:mlx-lm-lora-training-adapter',
  'npm run smoke:local-training-runtime-closure-provenance',
  'npm run smoke:local-training-process-supervisor',
  'npm run smoke:local-training-os-isolation',
  'npm run smoke:local-training-runtime-exec-observation',
  'npm run smoke:local-training-runtime-image-provenance',
  'npm run smoke:local-training-candidate-artifact-verification',
  'npm run smoke:local-candidate-evaluation-admission',
  'npm run smoke:local-candidate-evaluation-runtime',
  'npm run smoke:local-candidate-evaluation-input-view',
  'npm run smoke:local-candidate-evaluation-workspace-recovery',
  'npm run smoke:local-candidate-evaluation-process-lifecycle',
  'npm run smoke:local-candidate-evaluation-host-boot-recovery',
  'npm run smoke:local-candidate-evaluation-host-restart-rehearsal',
  'npm run smoke:local-candidate-evaluation-host-restart-receipt',
  'npm run smoke:local-candidate-evaluator-provenance',
  'npm run smoke:candidate-model-evaluation',
  'npm run smoke:local-answer-quality-baseline',
  'npm run smoke:local-answer-composition-candidate',
  'npm run smoke:local-answer-composition-robustness',
  'npm run smoke:local-answer-composition-hardening',
  'npm run smoke:answer-input-boundary',
  'npm run smoke:local-answer-composition-boundary-regression',
  'npm run smoke:user-query-evaluation-intake',
  'npm run smoke:local-user-query-quality',
  'npm run smoke:local-answer-review-action-generalization',
  'npm run smoke:actual-user-query-evaluation-readiness',
  'npm run smoke:smoke-validation-summary',
  'npm run smoke:external-evidence-blockers',
  'npm run smoke:readme-portfolio-overview',
  'npm run smoke:portfolio-docs-claim-boundary',
  'npm run smoke:representative-demo-evidence',
  'npm run smoke:operator-surface-demo-evidence',
  'npm run smoke:pilot-export-package',
  'npm run smoke:portfolio-zip',
  'npm run smoke:release-artifact-hygiene',
];

assert.equal(packageJson.scripts['smoke:smoke-validation-summary'], 'node scripts/smoke-smoke-validation-summary.mjs');

for (const command of expectedCommands) {
  assertContains(doc, command, `smoke validation summary missing command ${command}`);
  assertContains(readme, command, `README missing public-readiness command ${command}`);
  const scriptName = command.replace(/^npm run /, '');
  if (scriptName !== 'package:pilot-export') {
    assert.ok(packageJson.scripts[scriptName], `package.json missing script ${scriptName}`);
  }
}

for (const term of [
  '# Smoke Validation Summary v1',
  'status: smoke-validation-summary-current',
  'productionReadyClaim: false',
  'allProviderComplete: false',
  'publicHostedDemoUrl: none',
  'deterministic local smoke summary',
  'not live all-provider validation',
  'not hosted SaaS validation',
  'not production readiness evidence',
  'Core Verification Matrix',
  'Replay Block',
  'Safe Claim Boundary',
  'Do not claim',
]) {
  assertContains(doc, term, `smoke validation summary missing ${term}`);
}

assertContains(roadmap, '완료: core smoke validation summary와 command guard', 'roadmap missing smoke validation summary completion');
assertContains(
  evidenceGallery,
  '`docs/smoke-validation-summary-v1.md`',
  'evidence gallery missing smoke validation summary',
);
assertContains(
  evidenceManifest,
  'Smoke validation summary: verified with `npm run smoke:smoke-validation-summary`',
  'evidence manifest missing smoke validation verification',
);
assertContains(releaseReadiness, 'productionReadyClaim: false', 'release readiness must keep productionReadyClaim false');

const readmePublicCommands = extractCodeBlockAfterHeading(readme, 'Recommended public-readiness checks:')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);
assert.deepEqual(readmePublicCommands, expectedCommands);
assert.equal(new Set(readmePublicCommands).size, readmePublicCommands.length, 'public readiness commands must be unique');

for (const risky of [
  'all providers are live validated',
  'hosted SaaS validation is complete',
  'production readiness is approved',
  'external pilot feedback or customer metrics are proven',
  'Anthropic, Hermes, or target local provider production readiness is complete',
]) {
  assert.equal(
    combinedText().toLowerCase().includes(risky.toLowerCase()),
    true,
    `smoke validation summary must explicitly forbid risky claim: ${risky}`,
  );
}

for (const riskyAchievement of [
  'all-provider validation achieved',
  'hosted SaaS validation achieved',
  'production readiness approved',
  'customer metrics proven',
  'Anthropic readiness achieved',
  'Hermes readiness achieved',
]) {
  assert.equal(
    combinedText().toLowerCase().includes(riskyAchievement.toLowerCase()),
    false,
    `smoke validation summary contains risky achievement claim: ${riskyAchievement}`,
  );
}

assertNoLocalPaths(doc);

console.log(
  JSON.stringify(
    {
      commandCount: expectedCommands.length,
      mode: 'smoke-validation-summary-smoke',
      ok: true,
      productionReadyClaim: false,
    },
    null,
    2,
  ),
);

function readRequiredFile(relativePath) {
  const filePath = path.join(repoDir, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`required file not found: ${relativePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function assertContains(text, needle, message) {
  assert.ok(String(text || '').includes(needle), message);
}

function assertNoLocalPaths(text) {
  assert.doesNotMatch(String(text || ''), /\/Users\//);
  assert.doesNotMatch(String(text || ''), /\/private\/var\/folders\//);
  assert.doesNotMatch(String(text || ''), /\/var\/folders\//);
}

function extractCodeBlockAfterHeading(markdown, heading) {
  const headingIndex = String(markdown || '').indexOf(heading);
  assert.notEqual(headingIndex, -1, `missing heading ${heading}`);
  const afterHeading = markdown.slice(headingIndex + heading.length);
  const match = afterHeading.match(/```bash\n([\s\S]*?)\n```/);
  assert.ok(match, `missing bash code block after ${heading}`);
  return match[1];
}

function combinedText() {
  return [doc, readme, roadmap, evidenceGallery, evidenceManifest, releaseReadiness].join('\n\n');
}
