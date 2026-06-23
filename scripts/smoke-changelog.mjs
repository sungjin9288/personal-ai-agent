import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const changelogPath = path.join(repoDir, 'CHANGELOG.md');
const readmePath = path.join(repoDir, 'README.md');
const packageJsonPath = path.join(repoDir, 'package.json');
const portfolioManifestPath = path.join(repoDir, 'portfolio_manifest.md');
const releaseHygienePath = path.join(repoDir, 'scripts', 'release-artifact-hygiene-utils.mjs');
const pilotExportBuilderPath = path.join(repoDir, 'scripts', 'build-pilot-export-package.mjs');

const changelog = readRequiredFile(changelogPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packageJsonPath));
const portfolioManifest = readRequiredFile(portfolioManifestPath);
const releaseHygiene = readRequiredFile(releaseHygienePath);
const pilotExportBuilder = readRequiredFile(pilotExportBuilderPath);

assert.equal(packageJson.scripts['smoke:changelog'], 'node scripts/smoke-changelog.mjs');

const zipSha = extractBacktickValue(portfolioManifest, '압축 파일 SHA-256');
const zipSize = extractPlainValue(portfolioManifest, '압축 파일 크기');
assert.match(zipSha, /^[a-f0-9]{64}$/);
assert.match(zipSize, /^\d{1,3}(,\d{3})* bytes$/);

for (const term of [
  '# Changelog',
  '## Unreleased',
  '## v0.1.0 - 2026-06-23',
  'provider-scoped pilot-ready',
  'productionReadyClaim: false',
  'not all-provider-complete',
  'not a hosted SaaS product',
  'There is no public hosted demo URL',
  'Credential-free `npm run demo:local` replay path',
  'Credential-free `npm run doctor` diagnostics',
  'Credential-free `/api/doctor` and operator console local diagnostics summary',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'SUPPORT.md',
  'GitHub issue templates',
  'npm run smoke:changelog',
  'npm run smoke:doctor',
  'npm run smoke:ui-doctor-surface',
  zipSha,
  zipSize,
]) {
  assertContains(changelog, term, `CHANGELOG missing ${term}`);
}

for (const readmeTerm of [
  'Changelog: [CHANGELOG.md](CHANGELOG.md)',
  'npm run smoke:changelog',
]) {
  assertContains(readme, readmeTerm, `README missing changelog term ${readmeTerm}`);
}

for (const fileListTerm of ['CHANGELOG.md']) {
  assertContains(releaseHygiene, `'${fileListTerm}'`, `release artifact hygiene missing ${fileListTerm}`);
  assertContains(pilotExportBuilder, `'${fileListTerm}'`, `pilot export package missing ${fileListTerm}`);
}

for (const risky of [
  'production-ready AI agent platform',
  'all-provider-complete achieved',
  'all providers are live validated',
  'hosted demo is live',
  'public hosted demo: yes',
]) {
  assert.equal(changelog.toLowerCase().includes(risky.toLowerCase()), false, `CHANGELOG contains risky claim: ${risky}`);
}

assertNoLocalPaths(changelog);

console.log(
  JSON.stringify(
    {
      mode: 'changelog-smoke',
      ok: true,
      release: 'v0.1.0',
      zipSha256: zipSha,
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

function extractBacktickValue(markdown, label) {
  const match = String(markdown || '').match(new RegExp(`^- ${escapeRegExp(label)}:\\s+\`([^\`]+)\`$`, 'm'));
  return match ? match[1] : '';
}

function extractPlainValue(markdown, label) {
  const match = String(markdown || '').match(new RegExp(`^- ${escapeRegExp(label)}:\\s+(.+)$`, 'm'));
  return match ? String(match[1] || '').trim() : '';
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertNoLocalPaths(text) {
  assert.doesNotMatch(String(text || ''), /\/Users\//);
  assert.doesNotMatch(String(text || ''), /\/private\/var\/folders\//);
  assert.doesNotMatch(String(text || ''), /\/var\/folders\//);
}
