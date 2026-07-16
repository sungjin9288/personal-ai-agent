import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const readme = fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));

assert.equal(
  packageJson.scripts['smoke:readme-portfolio-overview'],
  'node scripts/smoke-readme-portfolio-overview.mjs',
);

for (const term of [
  '## Portfolio Overview',
  'local-first multi-agent engineering harness',
  'controlled operator workflow',
  'provider-scoped pilot-ready',
  'not production-ready',
  'not all-provider-complete',
  'not a hosted SaaS product',
  '### What It Demonstrates',
  '### Why Fork This',
  'Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)',
  'Fork onboarding: [docs/fork-onboarding-v1.md](docs/fork-onboarding-v1.md)',
  'Support: [SUPPORT.md](SUPPORT.md)',
  'Changelog: [CHANGELOG.md](CHANGELOG.md)',
  'Issue handoff: blank issues are disabled',
  'bug report template',
  'Doctor diagnostics summary',
  '### Quick Replay',
  'npm run doctor',
  'npm run doctor:summary',
  'npm run smoke:doctor',
  'npm run smoke:ui-doctor-surface',
  'npm run smoke:support-policy',
  'npm run smoke:changelog',
  'npm run smoke:contributor-onboarding',
  'npm run bootstrap:local',
  'npm run smoke:representative-demo',
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
  'npm run smoke:approved-training-record',
  'npm run smoke:training-dataset-quality',
  'npm run smoke:fine-tuning-readiness',
  'npm run smoke:candidate-model-evaluation',
  'npm run smoke:smoke-validation-summary',
  'npm run smoke:external-evidence-blockers',
  'npm run smoke:representative-demo-evidence',
  'npm run smoke:operator-surface-demo-evidence',
  'npm run smoke:execution-v1-status',
  'npm run smoke:pilot-export-package',
  'npm run smoke:portfolio-zip',
  'evidence/cli-logs/representative-release-demo-replay.log',
  'evidence/output-artifacts/representative-release-demo-summary.json',
  'evidence/screenshots/representative-release-demo-release-status.png',
  'docs/demo-evidence-index-v1.md',
  'docs/demo-scenarios-v1.md',
  'docs/recorded-walkthrough-v1.md',
  'docs/architecture-code-walkthrough-v1.md',
  'docs/provider-readiness-matrix-v1.md',
  'docs/provider-failure-recovery-demo-v1.md',
  'docs/memory-retrieval-quality-fixture-v1.md',
  'docs/ml-rag-development-plan-v1.md',
  'docs/smoke-validation-summary-v1.md',
  'docs/external-evidence-blockers-v1.md',
  'docs/operator-surface-demo-evidence-v1.md',
  'evidence/screenshots/operator-surface-mission-run.png',
  'evidence/screenshots/operator-surface-provider-readiness.png',
  'evidence/screenshots/operator-surface-action-inbox.png',
  'npm run evidence:operator-surface-demo',
  '### Status Boundary',
  'Anthropic live validation',
  'Hermes live validation',
  'Production-ready claim',
  'Explicitly blocked',
]) {
  assertContains(readme, term, `README portfolio overview missing ${term}`);
}

const publicReadinessCommands = extractCodeBlockAfterHeading(readme, 'Recommended public-readiness checks:')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

assert.deepEqual(publicReadinessCommands, [
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
  'npm run smoke:approved-training-record',
  'npm run smoke:training-dataset-quality',
  'npm run smoke:fine-tuning-readiness',
  'npm run smoke:candidate-model-evaluation',
  'npm run smoke:smoke-validation-summary',
  'npm run smoke:external-evidence-blockers',
  'npm run smoke:readme-portfolio-overview',
  'npm run smoke:portfolio-docs-claim-boundary',
  'npm run smoke:representative-demo-evidence',
  'npm run smoke:operator-surface-demo-evidence',
  'npm run smoke:pilot-export-package',
  'npm run smoke:portfolio-zip',
  'npm run smoke:release-artifact-hygiene',
]);

assert.equal(
  new Set(publicReadinessCommands).size,
  publicReadinessCommands.length,
  'README public-readiness checks must not contain duplicate commands',
);

const overviewIndex = readme.indexOf('## Portfolio Overview');
const legacyIntroIndex = readme.indexOf('CLI-first local-first personal AI agent');
assert.equal(overviewIndex > 0, true, 'README must keep title before overview');
assert.equal(legacyIntroIndex > overviewIndex, true, 'portfolio overview must appear before the legacy detailed README body');

for (const risky of [
  'production-ready AI agent platform',
  'Hosted SaaS 완성',
  'all providers are live validated',
  'all-provider-complete achieved',
]) {
  assert.equal(readme.includes(risky), false, `README contains risky portfolio phrasing: ${risky}`);
}

console.log(
  JSON.stringify(
    {
      mode: 'readme-portfolio-overview-smoke',
      ok: true,
      overviewBeforeDetailedBody: true,
    },
    null,
    2,
  ),
);

function assertContains(text, needle, message) {
  assert.ok(String(text || '').includes(needle), message);
}

function extractCodeBlockAfterHeading(markdown, heading) {
  const headingIndex = String(markdown || '').indexOf(heading);
  assert.notEqual(headingIndex, -1, `README missing heading ${heading}`);

  const afterHeading = markdown.slice(headingIndex + heading.length);
  const match = afterHeading.match(/```bash\n([\s\S]*?)\n```/);
  assert.ok(match, `README missing bash code block after ${heading}`);
  return match[1];
}
