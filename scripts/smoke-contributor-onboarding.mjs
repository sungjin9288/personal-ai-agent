import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const contributingPath = path.join(repoDir, 'CONTRIBUTING.md');
const securityPath = path.join(repoDir, 'SECURITY.md');
const supportPath = path.join(repoDir, 'SUPPORT.md');
const forkGuidePath = path.join(repoDir, 'docs', 'fork-onboarding-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packageJsonPath = path.join(repoDir, 'package.json');
const pullRequestTemplatePath = path.join(repoDir, '.github', 'pull_request_template.md');
const workflowPath = path.join(repoDir, '.github', 'workflows', 'provider-smoke.yml');
const issueTemplateDir = path.join(repoDir, '.github', 'ISSUE_TEMPLATE');
const envExamplePath = path.join(repoDir, '.env.example');
const gitignorePath = path.join(repoDir, '.gitignore');

const contributing = readRequiredFile(contributingPath);
const security = readRequiredFile(securityPath);
const support = readRequiredFile(supportPath);
const forkGuide = readRequiredFile(forkGuidePath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packageJsonPath));
const pullRequestTemplate = readRequiredFile(pullRequestTemplatePath);
const workflow = readRequiredFile(workflowPath);
const bugTemplate = readRequiredFile(path.join(issueTemplateDir, 'bug_report.yml'));
const securityTemplate = readRequiredFile(path.join(issueTemplateDir, 'security_report.yml'));
const issueTemplateConfig = readRequiredFile(path.join(issueTemplateDir, 'config.yml'));
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
  'npm run smoke:doctor',
  'npm run smoke:changelog',
  'npm run smoke:support-policy',
  'npm run smoke:contributor-onboarding',
  'npm run smoke:release-artifact-hygiene',
  'Read [SECURITY.md](SECURITY.md)',
  'Read [SUPPORT.md](SUPPORT.md)',
  'Blank issues are disabled',
  'npm run doctor:summary',
  'Doctor diagnostics summary',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/security_report.yml',
]) {
  assertContains(contributing, term, `CONTRIBUTING missing ${term}`);
}

for (const term of [
  '# Security Policy',
  'local-first PoC/MVP harness',
  'not a hosted SaaS product',
  'no production service endpoint or public hosted demo URL',
  'Do not include provider API keys',
  'npm run smoke:release-artifact-hygiene',
  '[SUPPORT.md](SUPPORT.md)',
]) {
  assertContains(security, term, `SECURITY missing ${term}`);
}

for (const term of [
  '# Support',
  'local-first PoC/MVP harness',
  'npm run demo:local',
  'npm run doctor',
  'npm run smoke:doctor',
  'npm run smoke:support-policy',
  'There is no public hosted demo URL',
]) {
  assertContains(support, term, `SUPPORT missing ${term}`);
}

for (const term of [
  '# Fork Onboarding v1',
  'publicHostedDemoUrl: none',
  'productionReadyClaim: false',
  'relatedContributing: [CONTRIBUTING.md](../CONTRIBUTING.md)',
  'relatedSecurity: [SECURITY.md](../SECURITY.md)',
  'relatedSupport: [SUPPORT.md](../SUPPORT.md)',
  'relatedEnvTemplate: [.env.example](../.env.example)',
  'credential-free local replay',
  'There is no public hosted demo URL',
  '`.env` is ignored by git',
  'npm run smoke:contributor-onboarding',
  'npm run smoke:env-example',
  'npm run smoke:demo-local',
  'Blank issues are disabled',
  'npm run doctor:summary',
  'Doctor diagnostics summary',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/security_report.yml',
]) {
  assertContains(forkGuide, term, `fork onboarding guide missing ${term}`);
}

for (const readmeTerm of [
  'Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)',
  'Fork onboarding: [docs/fork-onboarding-v1.md](docs/fork-onboarding-v1.md)',
  'Security policy: [SECURITY.md](SECURITY.md)',
  'Support: [SUPPORT.md](SUPPORT.md)',
  'Changelog: [CHANGELOG.md](CHANGELOG.md)',
  'npm run doctor',
  'npm run smoke:doctor',
  'npm run smoke:support-policy',
  'npm run smoke:changelog',
  'npm run smoke:contributor-onboarding',
]) {
  assertContains(readme, readmeTerm, `README missing contributor onboarding term ${readmeTerm}`);
}

for (const templateTerm of [
  'Do not include secrets',
  'machine-local paths',
  'no public hosted demo URL',
]) {
  assertContains(bugTemplate, templateTerm, `bug report template missing ${templateTerm}`);
}

for (const templateTerm of [
  'Security report',
  'Do not include provider API keys',
  'Release artifact hygiene',
  'does not currently operate a public hosted service',
]) {
  assertContains(securityTemplate, templateTerm, `security report template missing ${templateTerm}`);
}

for (const configTerm of ['Contributing guide', 'Security policy', 'Support policy', 'blank_issues_enabled: false']) {
  assertContains(issueTemplateConfig, configTerm, `issue template config missing ${configTerm}`);
}

for (const configTerm of ['OPENAI_API_KEY=', 'ANTHROPIC_API_KEY=', 'PERSONAL_AI_AGENT_WEB_AUTH_MODE=']) {
  assertContains(envExample, configTerm, `.env.example missing ${configTerm}`);
}

for (const ignored of ['.env', '.env.local', 'var/']) {
  assertContains(gitignore, ignored, `.gitignore missing ${ignored}`);
}

const expectedProviderSmokeCommands = [
  'npm run smoke:demo-local',
  'npm run smoke:doctor',
  'npm run doctor:summary',
  'npm run smoke:ui-doctor-surface',
  'npm run smoke:env-example',
  'npm run smoke:contributor-onboarding',
  'npm run smoke:changelog',
  'npm run smoke:portfolio-zip',
  'npm run smoke:support-policy',
  'npm run smoke:demo-evidence-index',
  'npm run smoke:representative-demo-evidence',
  'npm run smoke:operator-surface-demo-evidence',
  'npm run smoke:pilot-export-package',
  'npm run smoke:readme-portfolio-overview',
  'npm run smoke:portfolio-docs-claim-boundary',
  'npm run smoke:release-artifact-hygiene',
  'npm run smoke:provider-fallback-policy',
  'npm run smoke:execution-v1-artifact-refresh',
  'npm run smoke:provider-attention-remediation',
  'npm run smoke:provider-capability-rate-guard',
  'npm run smoke:provider-action-inbox',
  'npm run smoke:provider-events',
  'npm run smoke:provider-overview',
  'npm run smoke:target-provider-operations',
];

const pullRequestVerificationCommands = Array.from(
  pullRequestTemplate.matchAll(/- \[ \] `(npm run [^`]+)`/g),
  (match) => match[1],
);
const workflowRunCommands = Array.from(workflow.matchAll(/^\s*run:\s+(npm run .+)$/gm), (match) => match[1].trim());

assert.deepEqual(
  pullRequestVerificationCommands,
  expectedProviderSmokeCommands,
  'PR template verification checklist must match provider smoke workflow commands',
);
assert.deepEqual(
  workflowRunCommands,
  expectedProviderSmokeCommands,
  'Provider smoke workflow commands must match PR template verification checklist',
);
assertNoDuplicates(pullRequestVerificationCommands, 'PR template verification checklist');
assertNoDuplicates(workflowRunCommands, 'provider smoke workflow commands');

for (const risky of [
  'production-ready AI agent platform',
  'all-provider-complete achieved',
  'all providers are live validated',
  'hosted demo is live',
  'public hosted demo: yes',
]) {
  assert.equal(contributing.toLowerCase().includes(risky.toLowerCase()), false, `CONTRIBUTING contains risky claim: ${risky}`);
  assert.equal(security.toLowerCase().includes(risky.toLowerCase()), false, `SECURITY contains risky claim: ${risky}`);
  assert.equal(support.toLowerCase().includes(risky.toLowerCase()), false, `SUPPORT contains risky claim: ${risky}`);
  assert.equal(forkGuide.toLowerCase().includes(risky.toLowerCase()), false, `fork guide contains risky claim: ${risky}`);
}

assertNoLocalPaths(contributing);
assertNoLocalPaths(security);
assertNoLocalPaths(support);
assertNoLocalPaths(forkGuide);

console.log(
  JSON.stringify(
    {
      mode: 'contributor-onboarding-smoke',
      ok: true,
      checkedDocs: [
        'CONTRIBUTING.md',
        'SECURITY.md',
        'SUPPORT.md',
        'docs/fork-onboarding-v1.md',
        '.github/ISSUE_TEMPLATE/config.yml',
        '.github/ISSUE_TEMPLATE/bug_report.yml',
      ],
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

function assertNoDuplicates(items, label) {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of items) {
    if (seen.has(item)) {
      duplicates.add(item);
    }
    seen.add(item);
  }
  assert.deepEqual([...duplicates], [], `${label} must not contain duplicate commands`);
}

function assertNoLocalPaths(text) {
  assert.doesNotMatch(String(text || ''), /\/Users\//);
  assert.doesNotMatch(String(text || ''), /\/private\/var\/folders\//);
  assert.doesNotMatch(String(text || ''), /\/var\/folders\//);
}
