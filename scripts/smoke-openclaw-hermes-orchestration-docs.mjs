import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { referenceAdoptionSmokeScripts } from './reference-adoption-scripts.mjs';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const packageJson = JSON.parse(readRequiredFile(path.join(repoDir, 'package.json')));
const readme = readRequiredFile(path.join(repoDir, 'README.md'));
const referenceRepos = readRequiredFile(path.join(docsDir, 'reference-repos.md'));
const productPlan = readRequiredFile(path.join(docsDir, 'product-plan-v1.md'));
const backbone = readRequiredFile(path.join(docsDir, 'orchestration-backbone-v1.md'));
const engine = readRequiredFile(path.join(docsDir, 'self-improvement-engine-v1.md'));

assert.equal(
  packageJson.scripts['smoke:openclaw-hermes-orchestration-docs'],
  'node scripts/smoke-openclaw-hermes-orchestration-docs.mjs',
);
assert.equal(
  packageJson.scripts['smoke:gateway-event-learning-candidate'],
  'node scripts/smoke-gateway-event-learning-candidate.mjs',
);
assert.ok(
  referenceAdoptionSmokeScripts.includes('scripts/smoke-openclaw-hermes-orchestration-docs.mjs'),
  'reference adoption smoke list must include the OpenClaw/Hermes orchestration smoke',
);
assert.ok(
  referenceAdoptionSmokeScripts.includes('scripts/smoke-gateway-event-learning-candidate.mjs'),
  'reference adoption smoke list must include the gateway event and learning candidate smoke',
);

assertDocumentBasics(backbone, {
  heading: 'Orchestration Backbone v1',
  status: 'orchestration-backbone-current',
  pairedKey: 'pairedEngine',
  pairedDoc: 'self-improvement-engine-v1.md',
});
assertDocumentBasics(engine, {
  heading: 'Self Improvement Engine v1',
  status: 'self-improvement-engine-current',
  pairedKey: 'pairedBackbone',
  pairedDoc: 'orchestration-backbone-v1.md',
});

for (const term of [
  'OpenClaw',
  'Claw Code',
  'Harness',
  'Hermes Agent',
  'gateway/control plane',
  'session separation',
  'workspace routing',
  'permission policy',
  'sandbox policy',
  'provider routing',
  'fallback policy',
  'stop reason',
  'evidence routing',
]) {
  assertContains(backbone, term, `backbone must include ${term}`);
}

for (const heading of [
  '## Decision Boundary',
  '## Adopted Reference Inputs',
  '## Backbone Responsibilities',
  '## Routing Model',
  '## Session And Channel Rules',
  '## Permission And Sandbox Rules',
  '## Backbone Interfaces',
  '## Required Commands',
  '## Acceptance Rule',
  '## Production Gap',
  '## Next Implementation Slices',
]) {
  assertContains(backbone, heading, `backbone missing ${heading}`);
}

for (const command of [
  'npm run smoke:gateway-event-learning-candidate',
  'npm run smoke:orchestration-profiles',
  'npm run smoke:runtime-isolation',
  'npm run smoke:provider-fallback-policy',
  'npm run smoke:provider-events',
  'npm run smoke:mission-timeline',
  'npm run smoke:workspace-timeline',
  'npm run smoke:operator-timeline',
  'npm run smoke:target-deployment-contract',
  'npm run smoke:release-artifact-hygiene',
  'npm run smoke:production-readiness-gate',
]) {
  assertContains(backbone, command, `backbone required commands must include ${command}`);
}

for (const term of [
  'Hermes Agent',
  'self-improvement engine',
  'Agent-curated memory',
  'skill creation',
  'skill improvement',
  'session search/summarization',
  'trajectory compression',
  'observe',
  'classify',
  'reflect',
  'propose',
  'approve',
  'promote',
  'verify',
  'retain or expire',
  'Provider lesson',
  'Quality regression',
]) {
  assertContains(engine, term, `engine must include ${term}`);
}

for (const heading of [
  '## Decision Boundary',
  '## Adopted Reference Inputs',
  '## Engine Loop',
  '## Learning Record Types',
  '## Promotion Rules',
  '## Memory And Privacy Rules',
  '## Self-Improvement Safety Rules',
  '## Required Commands',
  '## Acceptance Rule',
  '## Production Gap',
  '## Next Implementation Slices',
]) {
  assertContains(engine, heading, `engine missing ${heading}`);
}

for (const command of [
  'npm run smoke:gateway-event-learning-candidate',
  'npm run smoke:retrieval-memory',
  'npm run smoke:fact-graph-memory',
  'npm run smoke:memory-rerun',
  'npm run smoke:mission-quality-gate',
  'npm run smoke:specialist-follow-up-inbox',
  'npm run smoke:provider-fallback-policy',
  'npm run smoke:provider-events',
  'npm run smoke:release-artifact-hygiene',
  'npm run smoke:production-readiness-gate',
]) {
  assertContains(engine, command, `engine required commands must include ${command}`);
}

for (const phrase of [
  'must not bypass session binding, permission policy, sandbox policy, reviewer judgment, or release evidence gates',
  'A memory learned in one scope cannot silently become a global rule',
  'Secrets stay outside artifacts',
  'not an approval to run autonomous recursive self-improvement',
  'A lesson learned from private customer data cannot become global text',
  'Self-modifying code',
]) {
  assert.ok(
    backbone.includes(phrase) || engine.includes(phrase),
    `expected safety phrase in backbone or engine docs: ${phrase}`,
  );
}

for (const term of [
  'openclaw/openclaw',
  'ultraworkers/claw-code',
  'NousResearch/hermes-agent',
  'harness/harness',
  'orchestration-backbone-v1.md',
  'self-improvement-engine-v1.md',
]) {
  assertContains(referenceRepos, term, `reference registry must include ${term}`);
}

for (const term of [
  'orchestration-backbone-v1.md',
  'self-improvement-engine-v1.md',
  'OpenClaw as the orchestration backbone',
  'Hermes-style self-improvement engine',
]) {
  assertContains(readme, term, `README must include ${term}`);
  assertContains(productPlan, term, `product plan must include ${term}`);
}

assert.doesNotMatch(backbone, /productionReadyClaim: true/);
assert.doesNotMatch(engine, /productionReadyClaim: true/);
assertContains(backbone, 'not a production-ready claim', 'backbone must avoid production readiness overclaim');
assert.doesNotMatch(engine, /uncontrolled automatic skill mutation is accepted/i);

console.log(
  JSON.stringify(
    {
      mode: 'openclaw-hermes-orchestration-docs-smoke',
      ok: true,
      checkedDocs: [
        'docs/orchestration-backbone-v1.md',
        'docs/self-improvement-engine-v1.md',
        'docs/reference-repos.md',
        'docs/product-plan-v1.md',
        'README.md',
      ],
    },
    null,
    2,
  ),
);

function assertDocumentBasics(markdown, { heading, status, pairedKey, pairedDoc }) {
  assert.match(markdown, new RegExp(`^# ${escapeRegExp(heading)}$`, 'm'));
  assert.match(markdown, new RegExp(`^- status: ${escapeRegExp(status)}$`, 'm'));
  assert.match(markdown, /^- localDate: 2026-06-01$/m);
  assert.match(markdown, /^- productionReadyClaim: false$/m);
  assertContains(markdown, `${pairedKey}: [${pairedDoc}](${pairedDoc})`, `${heading} must link paired doc`);
}

function assertContains(value, expected, message) {
  assert.ok(value.includes(expected), message);
}

function readRequiredFile(filePath) {
  assert.ok(fs.existsSync(filePath), `missing required file: ${filePath}`);
  return fs.readFileSync(filePath, 'utf8');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
