import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const packageJson = JSON.parse(readRequiredFile('package.json'));
const doc = readRequiredFile('docs/external-evidence-blockers-v1.md');
const readme = readRequiredFile('README.md');
const roadmap = readRequiredFile('docs/roadmap.md');
const evidenceGallery = readRequiredFile('docs/evidence-gallery.md');
const evidenceChecklist = readRequiredFile('docs/evidence-checklist.md');
const evidenceManifest = readRequiredFile('evidence/evidence_manifest.md');
const providerMatrix = readRequiredFile('docs/provider-readiness-matrix-v1.md');
const smokeSummary = readRequiredFile('docs/smoke-validation-summary-v1.md');
const recordedWalkthrough = readRequiredFile('docs/recorded-walkthrough-v1.md');
const releaseReadiness = readRequiredFile('docs/release-readiness-v1.md');
const productPlan = readRequiredFile('docs/product-plan-v1.md');
const pilotFeedback = readRequiredFile('docs/pilot-feedback-v1.md');
const pilotFeedbackRecord = JSON.parse(readRequiredFile('config/pilot-feedback-v1.json'));
const publicRecord = JSON.parse(readRequiredFile('config/public-walkthrough-v1.json'));
const publicUrl =
  'https://github.com/sungjin9288/personal-ai-agent/releases/download/walkthrough-v1/personal-ai-agent-recorded-walkthrough-v1.mp4';
const expectedBlockers = [
  'Anthropic billing and live validation',
  'Hermes target provider architecture and live validation',
  'Target local provider architecture',
  'Hosted SaaS or production deployment',
];

assert.equal(
  packageJson.scripts['smoke:external-evidence-blockers'],
  'node scripts/smoke-external-evidence-blockers.mjs',
);
assert.equal(packageJson.scripts['smoke:pilot-feedback'], 'node scripts/smoke-pilot-feedback.mjs');

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
  'npm run smoke:pilot-feedback',
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

for (const [sourceName, sourceText, expectedTerm] of [
  [
    'roadmap',
    roadmap,
    '| 완료 | Pilot feedback 증거 | n=1 deterministic-only session과 일반화 가능한 사용성·효과 claim을 구분 | sanitized feedback evidence + fail-closed smoke |',
  ],
  [
    'evidence gallery',
    evidenceGallery,
    'external account, provider architecture, and hosted deployment blocker register; public recorded walkthrough URL and sanitized single-participant deterministic pilot feedback are closed evidence',
  ],
  [
    'evidence gallery usage notes',
    evidenceGallery,
    'to explain why Anthropic, Hermes, target local provider, and hosted deployment claims remain blocked, while the public recorded walkthrough URL and sanitized single-participant deterministic pilot feedback are closed evidence.',
  ],
  [
    'smoke validation summary',
    smokeSummary,
    'Verifies external account, provider architecture, and hosted deployment blockers remain explicit while the public recorded walkthrough URL and sanitized single-participant deterministic pilot feedback remain closed evidence',
  ],
  [
    'evidence checklist',
    evidenceChecklist,
    'external account/provider architecture/hosted deployment blockers plus closed public walkthrough and sanitized pilot feedback verified by `npm run smoke:external-evidence-blockers`',
  ],
]) {
  assertContains(sourceText, expectedTerm, `${sourceName} missing the current walkthrough blocker boundary`);
}

for (const [sourceName, sourceText, staleTerm] of [
  ['roadmap', roadmap, 'Walkthrough URL와 pilot feedback 증거'],
  ['roadmap', roadmap, '| 외부 증거 필요 | Pilot feedback 증거 |'],
  [
    'evidence gallery',
    evidenceGallery,
    'external account, provider, demo URL, pilot feedback, metrics, hosted deployment blocker register',
  ],
  [
    'evidence gallery usage notes',
    evidenceGallery,
    'why Anthropic, Hermes, target local provider, demo URL, pilot feedback, metrics, and hosted deployment claims remain blocked',
  ],
  [
    'smoke validation summary',
    smokeSummary,
    'Verifies external account, provider, demo URL, pilot feedback, metrics, and hosted deployment blockers remain explicit',
  ],
  ['evidence checklist', evidenceChecklist, 'external account/provider/demo URL/pilot feedback blockers'],
]) {
  assert.equal(sourceText.includes(staleTerm), false, `${sourceName} retains stale open walkthrough wording`);
}

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
  'generalized pilot feedback, customer impact, cost, SLA, or productivity metrics are proven',
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
assertNoLocalPaths(pilotFeedback);
assertContains(doc, '| Public recorded walkthrough URL |', 'closed walkthrough evidence row missing');
assertContains(doc, '| Sanitized single-participant deterministic pilot feedback |', 'closed pilot feedback row missing');
assertContains(doc, publicUrl, 'closed walkthrough URL missing');
assert.equal(publicRecord.asset.id, 507595206);
assert.equal(publicRecord.asset.sizeBytes, 45936551);
assert.equal(publicRecord.productionReadyClaim, false);
assert.equal(pilotFeedbackRecord.participant.count, 1);
assert.equal(pilotFeedbackRecord.scope.providerMode, 'deterministic-only');
assert.equal(pilotFeedbackRecord.feedback.positiveAnswerCount, 4);
assert.equal(pilotFeedbackRecord.feedback.questionCount, 4);
assert.equal(pilotFeedbackRecord.authority.productionReadyClaim, false);

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
  return [
    doc,
    readme,
    roadmap,
    evidenceGallery,
    evidenceChecklist,
    evidenceManifest,
    providerMatrix,
    smokeSummary,
    recordedWalkthrough,
    releaseReadiness,
    pilotFeedback,
  ].join('\n\n');
}
