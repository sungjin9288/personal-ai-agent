import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  referenceAdoptionSmokeScriptCount,
  requiredReferenceAdoptionSmokeScripts,
} from './reference-adoption-scripts.mjs';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const evidencePath = path.join(docsDir, 'execution-v1-evidence.md');
const closeoutPath = path.join(docsDir, 'execution-v1-closeout.md');
const handoffPath = path.join(docsDir, 'execution-v1-handoff.md');
const snapshotsRoot = path.join(docsDir, 'releases', 'execution-v1');

const currentCommit = runGit(['rev-parse', 'HEAD']);
const evidenceMarkdown = readRequiredFile(evidencePath);
const closeoutMarkdown = readRequiredFile(closeoutPath);
const handoffMarkdown = readRequiredFile(handoffPath);
const evidenceCommit = extractBulletValue(evidenceMarkdown, 'commit');
const closeoutCommit = extractBulletValue(closeoutMarkdown, 'commit');
const handoffCommit = extractBulletValue(handoffMarkdown, 'commit');
const verifiedCommit = closeoutCommit || evidenceCommit;
const artifactSyncCommit = buildArtifactSyncCommit(currentCommit, verifiedCommit);
const effectiveVerifiedCommit = artifactSyncCommit.detected ? artifactSyncCommit.verifiedCommit : currentCommit;

assert.equal(evidenceCommit, effectiveVerifiedCommit);
assert.equal(closeoutCommit, effectiveVerifiedCommit);
assert.equal(handoffCommit, effectiveVerifiedCommit);
assert.equal(verifiedCommit, effectiveVerifiedCommit);
if (artifactSyncCommit.detected) {
  assert.notEqual(currentCommit, effectiveVerifiedCommit);
  assert.equal(artifactSyncCommit.changedPaths.length > 0, true);
  assert.equal(
    artifactSyncCommit.changedPaths.every((filePath) => isReleaseArtifactSyncPath(filePath)),
    true,
    JSON.stringify(artifactSyncCommit),
  );
}

const snapshotDir = path.join(snapshotsRoot, verifiedCommit);
const snapshotEvidencePath = path.join(snapshotDir, 'execution-v1-evidence.md');
const snapshotCloseoutPath = path.join(snapshotDir, 'execution-v1-closeout.md');
const snapshotHandoffPath = path.join(snapshotDir, 'execution-v1-handoff.md');
const snapshotManifestPath = path.join(snapshotDir, 'snapshot.json');
const snapshotDirDisplayPath = formatDisplayPath(snapshotDir);
const snapshotEvidenceDisplayPath = formatDisplayPath(snapshotEvidencePath);
const snapshotCloseoutDisplayPath = formatDisplayPath(snapshotCloseoutPath);
const manifest = JSON.parse(readRequiredFile(snapshotManifestPath));
const snapshotEvidenceMarkdown = readRequiredFile(snapshotEvidencePath);
const snapshotCloseoutMarkdown = readRequiredFile(snapshotCloseoutPath);
const snapshotHandoffMarkdown = readRequiredFile(snapshotHandoffPath);

assert.equal(manifest.verifiedCommit, effectiveVerifiedCommit);
assert.equal(manifest.snapshotDir, snapshotDirDisplayPath);
assert.equal(manifest.sourceEvidencePath, formatDisplayPath(evidencePath));
assert.equal(manifest.sourceCloseoutPath, formatDisplayPath(closeoutPath));
assert.equal(manifest.sourceHandoffPath, formatDisplayPath(handoffPath));
assert.equal(manifest.snapshotHandoffPath, formatDisplayPath(snapshotHandoffPath));
assert.match(manifest.archivedAt, /^\d{4}-\d{2}-\d{2}T/);

assert.equal(extractBulletValue(snapshotEvidenceMarkdown, 'archivedAt'), manifest.archivedAt);
assert.equal(extractBulletValue(snapshotCloseoutMarkdown, 'archivedAt'), manifest.archivedAt);
assert.equal(extractBulletValue(snapshotHandoffMarkdown, 'archivedAt'), manifest.archivedAt);
assert.equal(extractBulletValue(snapshotEvidenceMarkdown, 'sourcePath'), formatDisplayPath(evidencePath));
assert.equal(extractBulletValue(snapshotCloseoutMarkdown, 'sourcePath'), formatDisplayPath(closeoutPath));
assert.equal(extractBulletValue(snapshotHandoffMarkdown, 'sourcePath'), formatDisplayPath(handoffPath));
assert.equal(extractBulletValue(snapshotEvidenceMarkdown, 'commit'), effectiveVerifiedCommit);
assert.equal(extractBulletValue(snapshotCloseoutMarkdown, 'commit'), effectiveVerifiedCommit);
assert.equal(extractBulletValue(snapshotHandoffMarkdown, 'commit'), effectiveVerifiedCommit);
assert.equal(extractBulletValue(snapshotEvidenceMarkdown, 'generatedAt'), extractBulletValue(evidenceMarkdown, 'generatedAt'));
assert.equal(extractBulletValue(snapshotCloseoutMarkdown, 'generatedAt'), extractBulletValue(closeoutMarkdown, 'generatedAt'));
assert.equal(extractBulletValue(snapshotHandoffMarkdown, 'visualArtifactSetSha256'), extractBulletValue(handoffMarkdown, 'visualArtifactSetSha256'));
assert.equal(
  extractBulletValue(snapshotCloseoutMarkdown, 'evidence'),
  `[execution-v1-evidence.md](${snapshotEvidenceDisplayPath})`,
);
assert.equal(
  extractBulletValue(snapshotHandoffMarkdown, 'evidence'),
  `[execution-v1-evidence.md](${snapshotEvidenceDisplayPath})`,
);
assert.equal(
  extractBulletValue(snapshotHandoffMarkdown, 'closeout'),
  `[execution-v1-closeout.md](${snapshotCloseoutDisplayPath})`,
);
assert.equal(
  extractBulletValue(snapshotHandoffMarkdown, 'immutableSnapshot'),
  `[${snapshotDirDisplayPath}](${snapshotDirDisplayPath})`,
);
assert.equal(
  extractBulletValue(snapshotEvidenceMarkdown, 'outputPath'),
  'output/playwright/execution-v1-visual-evidence-manifest.json',
);

const deterministicLines = extractSectionBullets(snapshotEvidenceMarkdown, 'Deterministic Verification');
const runtimeLines = extractSectionBullets(snapshotEvidenceMarkdown, 'Deterministic Runtime Summary');
const currentReferenceAdoptionLines = extractSectionBullets(evidenceMarkdown, 'Reference Adoption Aggregate');
const snapshotReferenceAdoptionLines = extractSectionBullets(snapshotEvidenceMarkdown, 'Reference Adoption Aggregate');
assert.equal(deterministicLines.filter((line) => /: passed$/.test(line)).length, 8);
assert.equal(runtimeLines.length, 8);
assert.equal(deterministicLines.includes('smoke:ui-execution-browser-e2e: passed'), true);
assert.equal(deterministicLines.includes('smoke:reference-adoptions: passed'), true);
assert.equal(deterministicLines.includes('smoke:execution-v1-live-helpers: passed'), true);
assert.equal(deterministicLines.includes('smoke:execution-v1-handoff: passed'), true);
assert.equal(deterministicLines.includes('smoke:production-readiness-gate: passed'), true);
assertReferenceAdoptionAggregate(currentReferenceAdoptionLines, 'current evidence');
assertReferenceAdoptionAggregate(snapshotReferenceAdoptionLines, 'snapshot evidence');
assert.equal(
  extractSectionBullets(snapshotCloseoutMarkdown, 'Current Status').includes('browser interaction e2e: ready'),
  true,
);
assert.equal(
  extractSectionBullets(snapshotHandoffMarkdown, 'Operational State').some((line) => line.startsWith('reference adoption aggregate: ready')),
  true,
);
assertNoLocalAbsolutePaths([
  path.join(repoDir, 'README.md'),
  path.join(repoDir, 'src', 'web', 'public', 'index.html'),
  evidencePath,
  closeoutPath,
  handoffPath,
  ...listFiles(snapshotsRoot),
]);

console.log(
  JSON.stringify(
    {
      archivedAt: manifest.archivedAt,
      artifactSyncCommit: artifactSyncCommit.detected,
      commit: currentCommit,
      deterministicPassed: deterministicLines.filter((line) => /: passed$/.test(line)).length,
      ok: true,
      runtimeRows: runtimeLines.length,
      snapshotDir,
      snapshotHandoffPath,
      verifiedCommit: effectiveVerifiedCommit,
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

function extractSectionBullets(markdown, heading) {
  const pattern = new RegExp(`## ${escapeRegExp(heading)}\\n([\\s\\S]*?)(?:\\n## |$)`);
  const match = String(markdown || '').match(pattern);
  if (!match) {
    return [];
  }
  return String(match[1] || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim());
}

function assertReferenceAdoptionAggregate(lines, label) {
  assert.equal(
    lines.includes(`scriptCount: ${referenceAdoptionSmokeScriptCount}`),
    true,
    `${label} missing reference adoption script count`,
  );
  for (const scriptPath of requiredReferenceAdoptionSmokeScripts) {
    assert.equal(
      lines.some((line) => line.startsWith(`${scriptPath}: passed`)),
      true,
      `${label} missing reference adoption script: ${scriptPath}`,
    );
  }
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: repoDir,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `git ${args.join(' ')} failed`);
  }
  return String(result.stdout || '').trim();
}

function runGitLines(args) {
  return runGit(args)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function isGitAncestor(ancestorCommit = '', descendantCommit = '') {
  if (!ancestorCommit || !descendantCommit) {
    return false;
  }

  const result = spawnSync('git', ['merge-base', '--is-ancestor', ancestorCommit, descendantCommit], {
    cwd: repoDir,
    encoding: 'utf8',
  });
  return result.status === 0;
}

function buildArtifactSyncCommit(currentCommitValue = '', verifiedCommitValue = '') {
  if (!currentCommitValue || !verifiedCommitValue || currentCommitValue === verifiedCommitValue) {
    return {
      changedPaths: [],
      commits: [],
      currentCommit: currentCommitValue,
      detected: false,
      verifiedCommit: verifiedCommitValue,
    };
  }
  if (!isGitAncestor(verifiedCommitValue, currentCommitValue)) {
    return {
      changedPaths: [],
      commits: [],
      currentCommit: currentCommitValue,
      detected: false,
      verifiedCommit: verifiedCommitValue,
    };
  }

  const commits = runGitLines(['rev-list', '--reverse', `${verifiedCommitValue}..${currentCommitValue}`]);
  const changedPaths = [...new Set(
    commits.flatMap((commit) => runGitLines(['diff-tree', '--no-commit-id', '--name-only', '-r', commit])),
  )].sort();

  return {
    changedPaths,
    commits,
    currentCommit: currentCommitValue,
    detected: changedPaths.length > 0 && changedPaths.every(isReleaseArtifactSyncPath),
    verifiedCommit: verifiedCommitValue,
  };
}

function isReleaseArtifactSyncPath(filePath) {
  const relativePath = String(filePath || '').replace(/\\/g, '/').replace(/^\.\//, '');
  return [
    'docs/execution-v1-closeout.md',
    'docs/execution-v1-evidence.md',
    'docs/execution-v1-handoff.md',
    'docs/clean-deployment-release-v1.md',
    'docs/pilot-export-package-v1.md',
    'docs/production-like-release-drill-v1.md',
    'docs/production-slo-operating-v1.md',
    'docs/production-retention-operating-v1.md',
    'docs/production-provider-readiness-v1.md',
    'docs/production-enterprise-controls-v1.md',
  ].includes(relativePath) || relativePath.startsWith('docs/releases/execution-v1/');
}

function formatDisplayPath(filePath) {
  const relativePath = path.relative(repoDir, String(filePath || ''));
  if (relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
    return relativePath;
  }
  return String(filePath || '');
}

function assertNoLocalAbsolutePaths(filePaths) {
  const offenders = [];
  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      continue;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    if (/\/Users\/[^/\s]+|\/(?:private\/)?var\/folders\//.test(content)) {
      offenders.push(formatDisplayPath(filePath));
    }
  }
  assert.deepEqual(offenders, [], `local absolute paths leaked into release docs: ${offenders.join(', ')}`);
}

function listFiles(rootPath) {
  if (!fs.existsSync(rootPath)) {
    return [];
  }
  const entries = fs.readdirSync(rootPath, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(rootPath, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}
