import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const tests = [
  'test/fine-tuning-private-answer-quality-enrichment-candidate.test.mjs',
  'test/fine-tuning-private-answer-quality-enrichment-candidate-script.test.mjs',
];
const result = spawnSync(process.execPath, ['--test', ...tests], { cwd: repoDir, encoding: 'utf8' });
assert.equal(result.status, 0, result.stderr || result.stdout);

const packageJson = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
const plan = fs.readFileSync(path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'), 'utf8');
const readme = fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8');
const manifest = fs.readFileSync(path.join(repoDir, 'evidence', 'evidence_manifest.md'), 'utf8');

assert.equal(
  packageJson.scripts['prepare:fine-tuning-private-answer-quality-enrichment-candidate'],
  'node scripts/prepare-fine-tuning-private-answer-quality-enrichment-candidate.mjs',
);
assert.equal(
  packageJson.scripts['smoke:fine-tuning-private-answer-quality-enrichment-candidate'],
  'node scripts/smoke-fine-tuning-private-answer-quality-enrichment-candidate.mjs',
);
for (const term of [
  'F1.16 Private answer-quality case enrichment candidate protocol',
  'currentCostFreeMilestone: fine-tuning-private-answer-quality-case-payload-lifecycle',
  'currentFineTuningPrivateAnswerQualityEnrichmentCandidateSurface: `scripts/prepare-fine-tuning-private-answer-quality-enrichment-candidate.mjs`',
  'fineTuningPrivateAnswerQualityEnrichmentCandidateStatus: protocol-ready-private-review-required',
  'npm run prepare:fine-tuning-private-answer-quality-enrichment-candidate',
  'npm run smoke:fine-tuning-private-answer-quality-enrichment-candidate',
  'q1ContractSatisfied: false',
  'productionReadyClaim: false',
]) {
  assert.ok(plan.includes(term), `ML/RAG plan missing ${term}`);
}
assert.ok(readme.includes('npm run smoke:fine-tuning-private-answer-quality-enrichment-candidate'));
assert.ok(manifest.includes(
  'Private answer-quality case enrichment candidate protocol: verified with `npm run smoke:fine-tuning-private-answer-quality-enrichment-candidate`',
));

console.log('fine-tuning private answer-quality enrichment candidate smoke passed');
