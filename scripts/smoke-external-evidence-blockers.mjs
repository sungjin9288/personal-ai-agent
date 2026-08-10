import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const packageJson = JSON.parse(readRequiredFile('package.json'));
const doc = readRequiredFile('docs/external-evidence-blockers-v1.md');
const readme = readRequiredFile('README.md');
const roadmap = readRequiredFile('docs/roadmap.md');
const evidenceGallery = readRequiredFile('docs/evidence-gallery.md');
const evidenceManifest = readRequiredFile('evidence/evidence_manifest.md');
const providerMatrix = readRequiredFile('docs/provider-readiness-matrix-v1.md');
const smokeSummary = readRequiredFile('docs/smoke-validation-summary-v1.md');
const recordedWalkthrough = readRequiredFile('docs/recorded-walkthrough-v1.md');
const releaseReadiness = readRequiredFile('docs/release-readiness-v1.md');
const productPlan = readRequiredFile('docs/product-plan-v1.md');
const publicRecord = JSON.parse(readRequiredFile('config/public-walkthrough-v1.json'));
const publicUrl =
  'https://github.com/sungjin9288/personal-ai-agent/releases/download/walkthrough-v1/personal-ai-agent-recorded-walkthrough-v1.mp4';
const expectedBlockers = [
  'Anthropic billing and live validation',
  'Hermes target provider architecture and live validation',
  'Target local provider architecture',
  'Actual pilot feedback and metrics',
  'Hosted SaaS or production deployment',
];

assert.equal(
  packageJson.scripts['smoke:external-evidence-blockers'],
  'node scripts/smoke-external-evidence-blockers.mjs',
);

for (const term of [
  '# External Evidence Blockers v1',
  'status: external-evidence-blockers-current',
  'productionReadyClaim: false',
  'allProviderComplete: false',
  `publicHostedDemoUrl: ${publicUrl}`,
  'externalEvidenceRequired: true',
  'Blocker Register',
  'Allowed claim impact',
  'Safe Claim Boundary',
  'Do not claim',
  'npm run smoke:external-evidence-blockers',
  'npm run live:execution-v1:anthropic',
  'npm run live:execution-v1:hermes',
  'npm run live:execution-v1:local',
  'npm run smoke:recorded-walkthrough',
  'npm run smoke:demo-evidence-index',
  'npm run smoke:target-deployment-contract',
]) {
  assertContains(doc, term, `external evidence blockers missing ${term}`);
}

const blockerRows = extractTableRows(doc, '## Blocker Register', '## Closed External Evidence');
assert.deepEqual(
  blockerRows.map((row) => row[0]),
  expectedBlockers,
  'external blocker rows must keep the expected count and order',
);

for (const blocker of expectedBlockers) {
  assertContains(doc, `| ${blocker} |`, `external evidence blockers missing row ${blocker}`);
}

assertContains(
  productPlan,
  `the remaining ${blockerRows.length} rows in [external-evidence-blockers-v1.md](external-evidence-blockers-v1.md)`,
  'product plan external blocker count must match the current blocker register',
);

for (const readmeTerm of [
  'External evidence blockers: [docs/external-evidence-blockers-v1.md](docs/external-evidence-blockers-v1.md)',
  'npm run smoke:external-evidence-blockers',
]) {
  assertContains(readme, readmeTerm, `README missing external blocker term ${readmeTerm}`);
}

assertContains(roadmap, '완료: external evidence blocker register와 smoke guard', 'roadmap missing external blocker completion');
assertContains(
  evidenceGallery,
  '`docs/external-evidence-blockers-v1.md`',
  'evidence gallery missing external evidence blockers',
);
assertContains(
  evidenceManifest,
  'External evidence blockers: verified with `npm run smoke:external-evidence-blockers`',
  'evidence manifest missing external blocker verification',
);

for (const [sourceName, sourceText, requiredTerms] of [
  [
    'provider readiness matrix',
    providerMatrix,
    ['Anthropic and Hermes readiness remain blocked', 'Target local provider production readiness'],
  ],
  [
    'smoke validation summary',
    smokeSummary,
    ['not live all-provider validation', 'not hosted SaaS validation', 'not production readiness evidence'],
  ],
  [
    'recorded walkthrough',
    recordedWalkthrough,
    [`publicHostedDemoUrl: ${publicUrl}`, 'privateRecordedWalkthroughUrl: none'],
  ],
  ['release readiness', releaseReadiness, ['productionReadyClaim: false', 'Anthropic failed with API billing/credit blocker']],
]) {
  for (const term of requiredTerms) {
    assertContains(sourceText, term, `${sourceName} missing source blocker term ${term}`);
  }
}

for (const risky of [
  'Anthropic readiness is complete',
  'Hermes live readiness is complete',
  'target local provider production readiness is complete',
  'pilot feedback, customer impact, cost, SLA, or productivity metrics are proven',
  'hosted SaaS or production deployment readiness is complete',
]) {
  assert.equal(
    combinedText().toLowerCase().includes(risky.toLowerCase()),
    true,
    `external evidence blockers must explicitly forbid risky claim: ${risky}`,
  );
}

for (const riskyAchievement of [
  'Anthropic readiness achieved',
  'Hermes live readiness achieved',
  'target local provider production readiness achieved',
  'customer impact metrics proven',
  'hosted SaaS readiness achieved',
  'production deployment readiness achieved',
]) {
  assert.equal(
    combinedText().toLowerCase().includes(riskyAchievement.toLowerCase()),
    false,
    `external evidence blockers contains risky achievement claim: ${riskyAchievement}`,
  );
}

assertNoLocalPaths(doc);
assertContains(doc, '| Public recorded walkthrough URL |', 'closed walkthrough evidence row missing');
assertContains(doc, publicUrl, 'closed walkthrough URL missing');
assert.equal(publicRecord.asset.id, 507595206);
assert.equal(publicRecord.asset.sizeBytes, 45936551);
assert.equal(publicRecord.productionReadyClaim, false);

console.log(
  JSON.stringify(
    {
      blockerCount: blockerRows.length,
      mode: 'external-evidence-blockers-smoke',
      ok: true,
      productionReadyClaim: false,
      externalEvidenceRequired: true,
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

function extractTableRows(markdown, startHeading, endHeading) {
  const start = markdown.indexOf(startHeading);
  const end = markdown.indexOf(endHeading, start + startHeading.length);
  assert.notEqual(start, -1, `missing heading ${startHeading}`);
  assert.notEqual(end, -1, `missing heading ${endHeading}`);

  return markdown
    .slice(start + startHeading.length, end)
    .split('\n')
    .filter((line) => line.startsWith('| ') && !line.startsWith('|---') && !line.startsWith('| Blocker |'))
    .map((line) => line.slice(2, -1).split(' | '));
}

function combinedText() {
  return [doc, readme, roadmap, evidenceGallery, evidenceManifest, providerMatrix, smokeSummary, recordedWalkthrough, releaseReadiness].join('\n\n');
}
