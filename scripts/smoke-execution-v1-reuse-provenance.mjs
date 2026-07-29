import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const evidence = readText('docs/execution-v1-evidence.md');
const closeout = readText('docs/execution-v1-closeout.md');
const handoff = readText('docs/execution-v1-handoff.md');
const verifiedCommit = extractBulletValue(closeout, 'commit');
const snapshot = JSON.parse(readText(`docs/releases/execution-v1/${verifiedCommit}/snapshot.json`));
const pilotExport = readText('docs/pilot-export-package-v1.md');
const documents = [evidence, closeout, handoff, pilotExport];

for (const document of documents) {
  assert.equal(extractBulletValue(document, 'deterministicEvidenceStatus'), 'reused-existing-not-rerun');
  assert.match(extractBulletValue(document, 'deterministicEvidenceSourceCommit'), /^[a-f0-9]{40}$/);
  assert.match(extractBulletValue(document, 'deterministicEvidenceSourceGeneratedAt'), /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(extractBulletValue(document, 'deterministicEvidenceReuseReason'), 'ui-http-unchanged-browser-excluded');
  assert.equal(extractBulletValue(document, 'boundImplementationCommit'), verifiedCommit);
}

assert.equal(snapshot.deterministicEvidenceStatus, 'reused-existing-not-rerun');
assert.match(snapshot.deterministicEvidenceSourceCommit, /^[a-f0-9]{40}$/);
assert.match(snapshot.deterministicEvidenceSourceGeneratedAt, /^\d{4}-\d{2}-\d{2}T/);
assert.equal(snapshot.deterministicEvidenceReuseReason, 'ui-http-unchanged-browser-excluded');
assert.equal(snapshot.boundImplementationCommit, verifiedCommit);
assert.match(evidence, /browser interaction E2E: reused existing result; not rerun/);
assert.match(closeout, /browser interaction e2e: reused-existing-not-rerun/);
assert.match(handoff, /not current execution evidence/);

console.log(JSON.stringify({
  mode: 'execution-v1-reuse-provenance',
  ok: true,
  sourceCommit: snapshot.deterministicEvidenceSourceCommit,
  verifiedCommit,
}, null, 2));

function readText(relativePath) {
  return fs.readFileSync(path.join(repoDir, relativePath), 'utf8');
}

function extractBulletValue(markdown, label) {
  const escapedLabel = String(label || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(markdown || '').match(new RegExp(`^- ${escapedLabel}:\\s+(.+)$`, 'm'));
  return match ? String(match[1] || '').trim() : '';
}
