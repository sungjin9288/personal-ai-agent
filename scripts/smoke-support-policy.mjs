import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const supportPath = path.join(repoDir, 'SUPPORT.md');
const readmePath = path.join(repoDir, 'README.md');
const contributingPath = path.join(repoDir, 'CONTRIBUTING.md');
const securityPath = path.join(repoDir, 'SECURITY.md');
const packageJsonPath = path.join(repoDir, 'package.json');
const issueTemplateConfigPath = path.join(repoDir, '.github', 'ISSUE_TEMPLATE', 'config.yml');
const bugReportTemplatePath = path.join(repoDir, '.github', 'ISSUE_TEMPLATE', 'bug_report.yml');
const pullRequestTemplatePath = path.join(repoDir, '.github', 'pull_request_template.md');
const workflowPath = path.join(repoDir, '.github', 'workflows', 'provider-smoke.yml');
const portfolioManifestPath = path.join(repoDir, 'portfolio_manifest.md');
const linksPath = path.join(repoDir, 'links.md');
const releaseHygienePath = path.join(repoDir, 'scripts', 'release-artifact-hygiene-utils.mjs');
const pilotExportBuilderPath = path.join(repoDir, 'scripts', 'build-pilot-export-package.mjs');

const support = readRequiredFile(supportPath);
const readme = readRequiredFile(readmePath);
const contributing = readRequiredFile(contributingPath);
const security = readRequiredFile(securityPath);
const packageJson = JSON.parse(readRequiredFile(packageJsonPath));
const issueTemplateConfig = readRequiredFile(issueTemplateConfigPath);
const bugReportTemplate = readRequiredFile(bugReportTemplatePath);
const pullRequestTemplate = readRequiredFile(pullRequestTemplatePath);
const workflow = readRequiredFile(workflowPath);
const portfolioManifest = readRequiredFile(portfolioManifestPath);
const links = readRequiredFile(linksPath);
const releaseHygiene = readRequiredFile(releaseHygienePath);
const pilotExportBuilder = readRequiredFile(pilotExportBuilderPath);

assert.equal(packageJson.scripts['smoke:support-policy'], 'node scripts/smoke-support-policy.mjs');

for (const term of [
  '# Support',
  'local-first PoC/MVP harness',
  'does not currently operate a public hosted service',
  'public hosted demo URL',
  'npm run demo:local',
  'npm run doctor',
  'npm run doctor:summary',
  'npm run smoke:doctor',
  'npm run smoke:ui-doctor-surface',
  'npm run smoke:env-example',
  'npm run smoke:contributor-onboarding',
  'npm run smoke:changelog',
  'npm run smoke:release-artifact-hygiene',
  'npm run smoke:pilot-export-package',
  'Security report path in [SECURITY.md](SECURITY.md)',
  'Current validated claim: `provider-scoped pilot-ready`',
  'productionReadyClaim: false',
  'not production-ready',
  'not all-provider-complete',
  'not a hosted SaaS product',
  'There is no public hosted demo URL',
  'There is no response-time SLA',
]) {
  assertContains(support, term, `SUPPORT missing ${term}`);
}

for (const term of [
  'Support: [SUPPORT.md](SUPPORT.md)',
  'npm run doctor',
  'npm run doctor:summary',
  'npm run smoke:doctor',
  'npm run smoke:ui-doctor-surface',
  'npm run smoke:support-policy',
]) {
  assertContains(readme, term, `README missing support term ${term}`);
}

for (const term of [
  'Read [SUPPORT.md](SUPPORT.md)',
  'npm run smoke:support-policy',
]) {
  assertContains(contributing, term, `CONTRIBUTING missing support term ${term}`);
}

assertContains(security, '[SUPPORT.md](SUPPORT.md)', 'SECURITY missing support link');
assertContains(issueTemplateConfig, 'Support policy', 'issue template config missing support contact');
assertContains(issueTemplateConfig, 'SUPPORT.md', 'issue template config missing support URL');
assertContains(bugReportTemplate, 'Doctor diagnostics summary', 'bug report template missing doctor summary field');
assertContains(bugReportTemplate, 'npm run doctor:summary', 'bug report template missing doctor summary command');
assertContains(bugReportTemplate, 'sanitized output', 'bug report template missing sanitized output guidance');
assertContains(bugReportTemplate, 'Do not paste secrets', 'bug report template missing secret warning');
assertContains(bugReportTemplate, 'machine-local paths', 'bug report template missing local path warning');
assertContains(pullRequestTemplate, 'npm run smoke:doctor', 'PR template missing doctor smoke');
assertContains(pullRequestTemplate, 'npm run doctor:summary', 'PR template missing doctor summary command');
assertContains(pullRequestTemplate, 'npm run smoke:ui-doctor-surface', 'PR template missing UI doctor surface smoke');
assertContains(pullRequestTemplate, 'npm run smoke:support-policy', 'PR template missing support smoke');
assertContains(workflow, 'npm run smoke:doctor', 'Provider smoke workflow missing doctor smoke');
assertContains(workflow, 'npm run doctor:summary', 'Provider smoke workflow missing doctor summary command');
assertContains(workflow, 'npm run smoke:ui-doctor-surface', 'Provider smoke workflow missing UI doctor surface smoke');
assertContains(workflow, 'npm run smoke:support-policy', 'Provider smoke workflow missing support smoke');
assertContains(portfolioManifest, '- SUPPORT.md', 'portfolio manifest missing SUPPORT.md');
assertContains(links, '- Support: SUPPORT.md', 'links missing support route');
assertContains(releaseHygiene, "'SUPPORT.md'", 'release artifact hygiene missing SUPPORT.md');
assertContains(pilotExportBuilder, "'SUPPORT.md'", 'pilot export package missing SUPPORT.md');

for (const risky of [
  'production-ready AI agent platform',
  'all-provider-complete achieved',
  'all providers are live validated',
  'hosted demo is live',
  'public hosted demo: yes',
]) {
  assert.equal(support.toLowerCase().includes(risky.toLowerCase()), false, `SUPPORT contains risky claim: ${risky}`);
}

assertNoLocalPaths(support);
assertNoLocalPaths(bugReportTemplate);

console.log(
  JSON.stringify(
    {
      mode: 'support-policy-smoke',
      ok: true,
      checkedDocs: [
        'SUPPORT.md',
        'README.md',
        'CONTRIBUTING.md',
        'SECURITY.md',
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

function assertNoLocalPaths(text) {
  assert.doesNotMatch(String(text || ''), /\/Users\//);
  assert.doesNotMatch(String(text || ''), /\/private\/var\/folders\//);
  assert.doesNotMatch(String(text || ''), /\/var\/folders\//);
}
