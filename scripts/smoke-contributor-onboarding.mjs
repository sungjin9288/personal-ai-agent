import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const contributingPath = path.join(repoDir, 'CONTRIBUTING.md');
const forkGuidePath = path.join(repoDir, 'docs', 'fork-onboarding-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packageJsonPath = path.join(repoDir, 'package.json');
const pullRequestTemplatePath = path.join(repoDir, '.github', 'pull_request_template.md');
const workflowPath = path.join(repoDir, '.github', 'workflows', 'provider-smoke.yml');
const envExamplePath = path.join(repoDir, '.env.example');
const gitignorePath = path.join(repoDir, '.gitignore');

const contributing = readRequiredFile(contributingPath);
const forkGuide = readRequiredFile(forkGuidePath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packageJsonPath));
const pullRequestTemplate = readRequiredFile(pullRequestTemplatePath);
const workflow = readRequiredFile(workflowPath);
const envExample = readRequiredFile(envExamplePath);
const gitignore = readRequiredFile(gitignorePath);

assert.equal(packageJson.scripts['smoke:contributor-onboarding'], 'node scripts/smoke-contributor-onboarding.mjs');

for (const term of [
  '# Contributing',
  'Current validated claim: `provider-scoped pilot-ready`',
  'Do not describe this project as production-ready',
  'not a public hosted demo URL',
  'cp .env.example .env',
  'npm run bootstrap:local',
  'npm run demo:local -- --plan',
  'runtime reads `process.env` directly',
  'Never commit `.env`',
  'npm run smoke:contributor-onboarding',
  'npm run smoke:release-artifact-hygiene',
]) {
  assertContains(contributing, term, `CONTRIBUTING missing ${term}`);
}

for (const term of [
  '# Fork Onboarding v1',
  'publicHostedDemoUrl: none',
  'productionReadyClaim: false',
  'relatedContributing: [CONTRIBUTING.md](../CONTRIBUTING.md)',
  'relatedEnvTemplate: [.env.example](../.env.example)',
  'credential-free local replay',
  'There is no public hosted demo URL',
  '`.env` is ignored by git',
  'npm run smoke:contributor-onboarding',
  'npm run smoke:env-example',
  'npm run smoke:demo-local',
]) {
  assertContains(forkGuide, term, `fork onboarding guide missing ${term}`);
}

for (const readmeTerm of [
  'Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)',
  'Fork onboarding: [docs/fork-onboarding-v1.md](docs/fork-onboarding-v1.md)',
  'npm run smoke:contributor-onboarding',
]) {
  assertContains(readme, readmeTerm, `README missing contributor onboarding term ${readmeTerm}`);
}

for (const configTerm of ['OPENAI_API_KEY=', 'ANTHROPIC_API_KEY=', 'PERSONAL_AI_AGENT_WEB_AUTH_MODE=']) {
  assertContains(envExample, configTerm, `.env.example missing ${configTerm}`);
}

for (const ignored of ['.env', '.env.local', 'var/']) {
  assertContains(gitignore, ignored, `.gitignore missing ${ignored}`);
}

for (const ciTerm of ['npm run smoke:contributor-onboarding']) {
  assertContains(pullRequestTemplate, ciTerm, `PR template missing ${ciTerm}`);
  assertContains(workflow, ciTerm, `Provider smoke workflow missing ${ciTerm}`);
}

for (const risky of [
  'production-ready AI agent platform',
  'all-provider-complete achieved',
  'all providers are live validated',
  'hosted demo is live',
  'public hosted demo: yes',
]) {
  assert.equal(contributing.toLowerCase().includes(risky.toLowerCase()), false, `CONTRIBUTING contains risky claim: ${risky}`);
  assert.equal(forkGuide.toLowerCase().includes(risky.toLowerCase()), false, `fork guide contains risky claim: ${risky}`);
}

assertNoLocalPaths(contributing);
assertNoLocalPaths(forkGuide);

console.log(
  JSON.stringify(
    {
      mode: 'contributor-onboarding-smoke',
      ok: true,
      checkedDocs: ['CONTRIBUTING.md', 'docs/fork-onboarding-v1.md'],
    },
    null,
    2,
  ),
);

function readRequiredFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`required file not found: ${filePath}`);
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
