import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { runReleaseArtifactHygiene } from './release-artifact-hygiene-utils.mjs';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const evidencePath = path.join(docsDir, 'execution-v1-evidence.md');
const closeoutPath = path.join(docsDir, 'execution-v1-closeout.md');
const handoffPath = path.join(docsDir, 'execution-v1-handoff.md');
const incidentSloPath = path.join(docsDir, 'incident-slo-v1.md');

const releaseReadiness = readRequiredFile(releaseReadinessPath);
const evidence = readRequiredFile(evidencePath);
const closeout = readRequiredFile(closeoutPath);
const handoff = readRequiredFile(handoffPath);
const incidentSlo = readRequiredFile(incidentSloPath);

const releaseLabel = extractBulletValue(releaseReadiness, 'releaseLabel');
const decision = extractBulletValue(releaseReadiness, 'decision');
const productionReadySection = extractSection(releaseReadiness, '### Production Ready');
const pilotReadySection = extractSection(releaseReadiness, '### Pilot Ready');
const internalAlphaSection = extractSection(releaseReadiness, '### Internal Alpha');
const currentOpenBlockersSection = extractSection(releaseReadiness, '## Current Open Blockers');
const currentStatus = extractStatusMap(closeout, 'Current Status');
const operationalState = extractStatusMap(handoff, 'Operational State');
const liveValidation = extractStatusMap(evidence, 'Live Validation');
const releaseArtifactHygiene = runReleaseArtifactHygiene({ repoDir });

assert.equal(releaseLabel, 'provider-scoped pilot ready for OpenAI-backed local-first path');
assert.match(decision, /pilot-ready only/i);
assert.match(decision, /do not claim production-ready/i);
assert.doesNotMatch(releaseLabel, /production-ready/i);

assert.match(internalAlphaSection, /^Status: pass\./m);
assert.match(pilotReadySection, /^Status: pass, scoped to OpenAI-backed local-first\/self-hosted pilot\./m);
assert.match(pilotReadySection, /Pilot-ready can be claimed only for the validated provider and approved deployment boundary\./);
assert.match(productionReadySection, /^Status: blocked\./m);
assert.match(productionReadySection, /Production-ready must not be claimed from the current state\./);

for (const blocker of [
  /Anthropic, local, and Hermes live validations are not complete/,
  /authenticated RBAC is not implemented/,
  /hosted tenant isolation is out of v1 scope/,
  /production retention\/export\/delete verification is not complete/,
  /production SLO\/SLA operating evidence is not generated from a production-like environment/,
  /clean deployment release evidence is not generated/,
]) {
  assert.match(productionReadySection, blocker);
}

assert.match(releaseReadiness, /\[incident-slo-v1\.md\]\(incident-slo-v1\.md\)/);
assert.match(incidentSlo, /Severity Levels/);
assert.match(incidentSlo, /Pilot SLO Targets/);
assert.match(incidentSlo, /Incident Entry Criteria/);
assert.match(incidentSlo, /Production Gap/);
assert.match(incidentSlo, /not a production SLO\/SLA commitment/);
for (const severity of ['SEV1', 'SEV2', 'SEV3', 'SEV4']) {
  assert.match(incidentSlo, new RegExp(`\\| ${severity} \\|`));
}

for (const blocker of [
  /Anthropic live validation is blocked by provider account billing\/credit/,
  /local provider live validation is blocked by missing approved endpoint\/model runtime configuration/,
  /Hermes live validation is blocked by missing approved endpoint\/model runtime configuration/,
  /production release label cannot be claimed until all target production providers and enterprise controls are verified/,
]) {
  assert.match(currentOpenBlockersSection, blocker);
}

assert.match(liveValidation.get('openai') || '', /^passed /);
assert.match(liveValidation.get('anthropic') || '', /^failed /);
assert.equal(currentStatus.get('openai live validation'), 'passed');
assert.match(currentStatus.get('anthropic live validation') || '', /^failed /);
assert.equal(currentStatus.get('local live validation'), 'missing-env');
assert.equal(currentStatus.get('hermes live validation'), 'missing-env');

assert.equal(operationalState.get('OpenAI live validation'), 'passed');
assert.match(operationalState.get('Anthropic live validation') || '', /^failed /);
assert.equal(operationalState.get('local provider live validation'), 'blocked by missing `LOCAL_PROVIDER_BASE_URL`');
assert.equal(operationalState.get('Hermes live validation'), 'blocked by missing `HERMES_PROVIDER_MODEL`');
assert.match(handoff, /Execution v1 is provider-scoped pilot ready/);
assert.match(handoff, /It is not production-ready or live-provider-complete/);
assert.match(releaseReadiness, /The product is not yet ready to be sold or represented as production-ready for other companies\./);
assert.equal(releaseArtifactHygiene.ok, true, JSON.stringify(releaseArtifactHygiene.findings, null, 2));
assert.equal(releaseArtifactHygiene.secretFindingCount, 0, JSON.stringify(releaseArtifactHygiene.findings, null, 2));
assert.equal(releaseArtifactHygiene.machinePathFindingCount, 0, JSON.stringify(releaseArtifactHygiene.findings, null, 2));

console.log(
  JSON.stringify(
    {
      blockedProductionReady: true,
      label: releaseLabel,
      mode: 'production-readiness-gate',
      ok: true,
      openaiLiveValidation: currentStatus.get('openai live validation'),
      pilotIncidentSloPolicy: 'present',
      productionBlockerCount: extractFollowingListItems(productionReadySection, 'Blockers:').length,
      releaseArtifactHygiene: 'passed',
      releaseArtifactHygieneScannedFiles: releaseArtifactHygiene.scannedFiles.length,
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

function extractBulletValue(markdown, label) {
  const match = String(markdown || '').match(new RegExp(`^- ${escapeRegExp(label)}:\\s+(.+)$`, 'm'));
  return match ? String(match[1] || '').trim() : '';
}

function extractSection(markdown, heading) {
  const escapedHeading = escapeRegExp(heading);
  const nextHeadingPrefix = heading.startsWith('### ') ? '\\n### ' : '\\n## ';
  const pattern = new RegExp(`${escapedHeading}\\n([\\s\\S]*?)(?:${nextHeadingPrefix}|$)`);
  const match = String(markdown || '').match(pattern);
  return match ? String(match[1] || '').trim() : '';
}

function extractListItems(markdown, heading = '') {
  const source = heading ? extractSection(markdown, heading) : markdown;
  return String(source || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim());
}

function extractFollowingListItems(markdown, marker) {
  const lines = String(markdown || '').split('\n');
  const markerIndex = lines.findIndex((line) => line.trim() === marker);
  if (markerIndex === -1) {
    return [];
  }

  const items = [];
  for (const line of lines.slice(markerIndex + 1)) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      if (items.length > 0) {
        break;
      }
      continue;
    }
    if (!trimmedLine.startsWith('- ')) {
      break;
    }
    items.push(trimmedLine.slice(2).trim());
  }
  return items;
}

function extractStatusMap(markdown, heading) {
  return new Map(
    extractListItems(extractSection(markdown, `## ${heading}`))
      .map((line) => {
        const separatorIndex = line.indexOf(':');
        if (separatorIndex === -1) {
          return null;
        }
        return [
          String(line.slice(0, separatorIndex) || '').trim(),
          String(line.slice(separatorIndex + 1) || '').trim(),
        ];
      })
      .filter(Boolean),
  );
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
