import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const changelogPath = path.join(repoDir, 'CHANGELOG.md');
const readmePath = path.join(repoDir, 'README.md');
const packageJsonPath = path.join(repoDir, 'package.json');
const portfolioManifestPath = path.join(repoDir, 'portfolio_manifest.md');
const portfolioZipPath = path.join(repoDir, '_portfolio_export', 'personal_ai_agent_portfolio_pack.zip');
const publicReleasePath = path.join(repoDir, 'config', 'public-release-v0.1.0.json');
const publicWalkthroughPath = path.join(repoDir, 'config', 'public-walkthrough-v1.json');
const releaseHygienePath = path.join(repoDir, 'scripts', 'release-artifact-hygiene-utils.mjs');
const pilotExportBuilderPath = path.join(repoDir, 'scripts', 'build-pilot-export-package.mjs');

const changelog = readRequiredFile(changelogPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packageJsonPath));
const portfolioManifest = readRequiredFile(portfolioManifestPath);
const publicRelease = JSON.parse(readRequiredFile(publicReleasePath));
const publicWalkthrough = JSON.parse(readRequiredFile(publicWalkthroughPath));
const releaseHygiene = readRequiredFile(releaseHygienePath);
const pilotExportBuilder = readRequiredFile(pilotExportBuilderPath);

assert.equal(packageJson.scripts['smoke:changelog'], 'node scripts/smoke-changelog.mjs');

const zipSha = extractBacktickValue(portfolioManifest, '압축 파일 SHA-256');
const zipSize = extractPlainValue(portfolioManifest, '압축 파일 크기');
assert.match(zipSha, /^[a-f0-9]{64}$/);
assert.match(zipSize, /^\d{1,3}(,\d{3})* bytes$/);

const zipBytes = fs.statSync(portfolioZipPath).size;
const actualZipSha = crypto.createHash('sha256').update(fs.readFileSync(portfolioZipPath)).digest('hex');
assert.equal(zipSize, `${zipBytes.toLocaleString('en-US')} bytes`);
assert.equal(zipSha, actualZipSha);
assertPublicReleaseRecord(publicRelease);
assert.equal(publicWalkthrough.tag, 'walkthrough-v1');
assert.equal(publicWalkthrough.asset.id, 507595206);
assert.equal(publicWalkthrough.asset.sizeBytes, 45936551);
assert.equal(publicWalkthrough.asset.sha256, '9b1655542dcf4f87a118d5094bd6be4743cbd9a4c3bd202cf1663e5f08c3ea47');
assert.equal(publicWalkthrough.captureCommit, 'a4034fde5a47b7d246eab9573763663a366ca8ab');
assert.equal(publicWalkthrough.productionReadyClaim, false);

const publishedSize = `${publicRelease.asset.sizeBytes.toLocaleString('en-US')} bytes`;
const publishedReleaseSection = extractMarkdownSection(changelog, '## v0.1.0 - 2026-06-23');

for (const term of [
  '# Changelog',
  '## Unreleased',
  'walkthrough-v1',
  'asset ID `507595206`',
  '45,936,551 bytes',
  publicWalkthrough.asset.sha256,
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
  'npm run smoke:portfolio-zip',
  'npm run smoke:doctor',
  'npm run smoke:ui-doctor-surface',
]) {
  assertContains(changelog, term, `CHANGELOG missing ${term}`);
}

for (const field of [
  publicRelease.releaseUrl,
  String(publicRelease.asset.id),
  publicRelease.asset.name,
  publicRelease.releasePublishedAt,
  publicRelease.asset.createdAt,
  publicRelease.asset.updatedAt,
  publishedSize,
  publicRelease.asset.sha256,
  publicRelease.observedAt,
]) {
  assertContains(publishedReleaseSection, field, `CHANGELOG published release section missing ${field}`);
}

for (const readmeTerm of [
  'Changelog: [CHANGELOG.md](CHANGELOG.md)',
  'npm run smoke:changelog',
]) {
  assertContains(readme, readmeTerm, `README missing changelog term ${readmeTerm}`);
}

for (const fileListTerm of ['CHANGELOG.md', 'config/public-walkthrough-v1.json']) {
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
      localPortfolioZipSha256: zipSha,
      publicReleaseAssetSha256: publicRelease.asset.sha256,
      publicWalkthroughAssetSha256: publicWalkthrough.asset.sha256,
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

function extractMarkdownSection(markdown, heading) {
  const start = markdown.indexOf(heading);
  assert.notEqual(start, -1, `CHANGELOG missing ${heading}`);
  const next = markdown.indexOf('\n## ', start + heading.length);
  return markdown.slice(start, next === -1 ? undefined : next);
}

function assertPublicReleaseRecord(record) {
  assert.deepEqual(record, {
    schemaVersion: 'personal-ai-agent-public-release-record/v1',
    tag: 'v0.1.0',
    releaseUrl: 'https://github.com/sungjin9288/personal-ai-agent/releases/tag/v0.1.0',
    releasePublishedAt: '2026-06-23T03:47:44Z',
    asset: {
      id: 455331518,
      name: 'personal_ai_agent_portfolio_pack.zip',
      sizeBytes: 412036,
      sha256: '66439a6a255b17adbbc04f2489804f0870848854f9a73934b9f7bad99285e6b5',
      createdAt: '2026-06-23T06:09:19Z',
      updatedAt: '2026-06-23T06:09:20Z',
    },
    observedAt: '2026-08-03',
    verification: 'GitHub release metadata, downloaded asset bytes, and unzip verification',
  });
}
