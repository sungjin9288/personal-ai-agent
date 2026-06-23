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
  '### Quick Replay',
  'npm run doctor',
  'npm run smoke:doctor',
  'npm run smoke:support-policy',
  'npm run smoke:changelog',
  'npm run smoke:contributor-onboarding',
  'npm run bootstrap:local',
  'npm run smoke:representative-demo',
  'npm run smoke:demo-evidence-index',
  'npm run smoke:representative-demo-evidence',
  'npm run smoke:execution-v1-status',
  'npm run smoke:pilot-export-package',
  'evidence/cli-logs/representative-release-demo-replay.log',
  'evidence/output-artifacts/representative-release-demo-summary.json',
  'evidence/screenshots/representative-release-demo-release-status.png',
  'docs/demo-evidence-index-v1.md',
  'docs/demo-scenarios-v1.md',
  '### Status Boundary',
  'Anthropic live validation',
  'Hermes live validation',
  'Production-ready claim',
  'Explicitly blocked',
]) {
  assertContains(readme, term, `README portfolio overview missing ${term}`);
}

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
