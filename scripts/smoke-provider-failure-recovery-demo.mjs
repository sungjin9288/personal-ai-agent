import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const packageJson = JSON.parse(readRequiredFile('package.json'));
const doc = readRequiredFile('docs/provider-failure-recovery-demo-v1.md');
const readme = readRequiredFile('README.md');
const roadmap = readRequiredFile('docs/roadmap.md');
const evidenceGallery = readRequiredFile('docs/evidence-gallery.md');
const evidenceManifest = readRequiredFile('evidence/evidence_manifest.md');
const releaseReadiness = readRequiredFile('docs/release-readiness-v1.md');
const fallbackPolicySmoke = readRequiredFile('scripts/smoke-provider-fallback-policy.mjs');
const attentionRemediationSmoke = readRequiredFile('scripts/smoke-provider-attention-remediation.mjs');

assert.equal(
  packageJson.scripts['smoke:provider-failure-recovery-demo'],
  'node scripts/smoke-provider-failure-recovery-demo.mjs',
);
assert.equal(packageJson.scripts['smoke:provider-fallback-policy'], 'node scripts/smoke-provider-fallback-policy.mjs');
assert.equal(
  packageJson.scripts['smoke:provider-attention-remediation'],
  'node scripts/smoke-provider-attention-remediation.mjs',
);

for (const term of [
  '# Provider Failure Recovery Demo v1',
  'status: provider-failure-recovery-demo-current',
  'productionReadyClaim: false',
  'publicHostedDemoUrl: none',
  'credentialFreeReplay: yes',
  'provider attention inbox',
  'fallback remediation',
  'timeline/event audit',
  'npm run smoke:provider-failure-recovery-demo',
  'npm run smoke:provider-fallback-policy',
  'npm run smoke:provider-attention-remediation',
  'npm run smoke:provider-events',
  'provider-failure-only',
  'recoverable-provider-failure-only',
  'provider-fallback-attempted',
  'provider-fallback-used',
  'fallbackUsed: true',
  'non-recoverable-provider-failure',
  'fallbackRecommendedCommand',
  'recoverableFallbackRecommendedCommand',
  'Safe Claim Boundary',
  'Do not claim',
]) {
  assertContains(doc, term, `provider failure recovery demo missing ${term}`);
}

for (const smokeTerm of [
  'Anthropic fallback to stub mission',
  'eligible-provider-failure',
  'no-provider-failure-metadata',
  'provider-fallback-attempted',
  'provider-fallback-used',
]) {
  assertContains(fallbackPolicySmoke, smokeTerm, `fallback policy smoke missing ${smokeTerm}`);
}

for (const smokeTerm of [
  'fallbackRecommendedCommand',
  'recoverableFallbackRecommendedCommand',
  'recoverable-provider-failure-only',
  'non-recoverable-provider-failure',
  'provider-fallback-attempted',
  'provider-fallback-used',
  "--family', 'fallback",
  "--fallback-policy', 'recoverable-provider-failure-only",
  "--fallback-stop-reason', 'non-recoverable-provider-failure",
]) {
  assertContains(attentionRemediationSmoke, smokeTerm, `attention remediation smoke missing ${smokeTerm}`);
}

for (const readmeTerm of [
  'Provider failure recovery demo: [docs/provider-failure-recovery-demo-v1.md](docs/provider-failure-recovery-demo-v1.md)',
  'npm run smoke:provider-failure-recovery-demo',
]) {
  assertContains(readme, readmeTerm, `README missing provider failure recovery term ${readmeTerm}`);
}

assertContains(roadmap, '완료: provider failure recovery demo와 smoke guard', 'roadmap missing provider recovery completion');
assertContains(
  evidenceGallery,
  '`docs/provider-failure-recovery-demo-v1.md`',
  'evidence gallery missing provider failure recovery demo',
);
assertContains(
  evidenceManifest,
  'Provider failure recovery demo: verified with `npm run smoke:provider-failure-recovery-demo`',
  'evidence manifest missing provider recovery verification',
);
assertContains(releaseReadiness, 'productionReadyClaim: false', 'release readiness must keep productionReadyClaim false');

for (const risky of [
  'all providers have been live validated',
  'Anthropic readiness is complete',
  'Hermes live readiness is complete',
  'target local provider production readiness is complete',
  'hosted SaaS provider recovery is available',
  'production-ready provider operations are approved',
  'customer SLA, cost, or incident metrics are proven',
]) {
  assert.equal(
    combinedText().toLowerCase().includes(risky.toLowerCase()),
    true,
    `provider failure recovery demo must explicitly forbid risky claim: ${risky}`,
  );
}

for (const riskyAchievement of [
  'all-provider recovery achieved',
  'all providers are live validated',
  'Anthropic readiness achieved',
  'Hermes live readiness achieved',
  'target local provider production readiness achieved',
  'hosted SaaS provider recovery achieved',
  'production-ready provider operations achieved',
]) {
  assert.equal(
    combinedText().toLowerCase().includes(riskyAchievement.toLowerCase()),
    false,
    `provider failure recovery demo contains risky achievement claim: ${riskyAchievement}`,
  );
}

assertNoLocalPaths(doc);

console.log(
  JSON.stringify(
    {
      mode: 'provider-failure-recovery-demo-smoke',
      ok: true,
      credentialFreeReplay: true,
      productionReadyClaim: false,
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

function combinedText() {
  return [doc, readme, roadmap, evidenceGallery, evidenceManifest, releaseReadiness].join('\n\n');
}
