import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const archiveScriptPath = path.resolve('scripts/archive-execution-v1-snapshot.mjs');

test('execution v1 snapshot archive writes links that resolve from each archived document', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-snapshot-archive-'));
  const commit = 'a'.repeat(40);

  try {
    const docsDir = path.join(rootDir, 'docs');
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(
      path.join(docsDir, 'execution-v1-evidence.md'),
      `# Execution Evidence\n\n- commit: ${commit}\n- boundImplementationCommit: ${commit}\n- deterministicEvidenceStatus: freshly-rerun\n`,
    );
    fs.writeFileSync(
      path.join(docsDir, 'execution-v1-closeout.md'),
      `# Execution Closeout\n\n- commit: ${commit}\n- boundImplementationCommit: ${commit}\n- deterministicEvidenceStatus: freshly-rerun\n- evidence: current evidence\n`,
    );
    fs.writeFileSync(
      path.join(docsDir, 'execution-v1-handoff.md'),
      `# Execution Handoff\n\n- commit: ${commit}\n- evidence: current evidence\n- closeout: current closeout\n- immutableSnapshot: current snapshot\n`,
    );

    const result = spawnSync(process.execPath, [archiveScriptPath], {
      cwd: rootDir,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const snapshotDir = path.join(docsDir, 'releases', 'execution-v1', commit);
    const closeoutPath = path.join(snapshotDir, 'execution-v1-closeout.md');
    const handoffPath = path.join(snapshotDir, 'execution-v1-handoff.md');
    const closeoutMarkdown = fs.readFileSync(closeoutPath, 'utf8');
    const handoffMarkdown = fs.readFileSync(handoffPath, 'utf8');

    assert.equal(extractLinkTarget(closeoutMarkdown, 'evidence'), 'execution-v1-evidence.md');
    assert.equal(extractLinkTarget(handoffMarkdown, 'evidence'), 'execution-v1-evidence.md');
    assert.equal(extractLinkTarget(handoffMarkdown, 'closeout'), 'execution-v1-closeout.md');
    assert.equal(extractLinkTarget(handoffMarkdown, 'immutableSnapshot'), './');

    for (const [markdownPath, markdown, label] of [
      [closeoutPath, closeoutMarkdown, 'evidence'],
      [handoffPath, handoffMarkdown, 'evidence'],
      [handoffPath, handoffMarkdown, 'closeout'],
      [handoffPath, handoffMarkdown, 'immutableSnapshot'],
    ]) {
      const target = extractLinkTarget(markdown, label);
      assert.equal(fs.existsSync(path.resolve(path.dirname(markdownPath), target)), true, `${label} link must resolve`);
    }
  } finally {
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
});

function extractLinkTarget(markdown, label) {
  const match = String(markdown).match(new RegExp(`^- ${label}: \\[[^\\]]+\\]\\(([^)]+)\\)$`, 'm'));
  assert.ok(match, `${label} link is missing`);
  return match[1];
}
