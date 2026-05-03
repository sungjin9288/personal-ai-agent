import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const currentEvidencePath = path.join(docsDir, 'execution-v1-evidence.md');
const currentCloseoutPath = path.join(docsDir, 'execution-v1-closeout.md');
const currentHandoffPath = path.join(docsDir, 'execution-v1-handoff.md');
const snapshotsRoot = path.join(docsDir, 'releases', 'execution-v1');

const evidenceMarkdown = readRequiredFile(currentEvidencePath);
const closeoutMarkdown = readRequiredFile(currentCloseoutPath);
const handoffMarkdown = fs.existsSync(currentHandoffPath) ? fs.readFileSync(currentHandoffPath, 'utf8') : '';

const evidenceCommit = extractBulletValue(evidenceMarkdown, 'commit');
const closeoutCommit = extractBulletValue(closeoutMarkdown, 'commit');
const verifiedCommit = closeoutCommit || evidenceCommit;

if (!verifiedCommit) {
  throw new Error('execution-v1 evidence/closeout에서 verified commit을 찾을 수 없습니다.');
}

if (evidenceCommit && closeoutCommit && evidenceCommit !== closeoutCommit) {
  throw new Error(`evidence/closeout commit mismatch: evidence=${evidenceCommit}, closeout=${closeoutCommit}`);
}

const snapshotDir = path.join(snapshotsRoot, verifiedCommit);
fs.mkdirSync(snapshotDir, { recursive: true });

const archivedAt = new Date().toISOString();
const snapshotEvidencePath = path.join(snapshotDir, 'execution-v1-evidence.md');
const snapshotCloseoutPath = path.join(snapshotDir, 'execution-v1-closeout.md');
const snapshotHandoffPath = path.join(snapshotDir, 'execution-v1-handoff.md');
const snapshotManifestPath = path.join(snapshotDir, 'snapshot.json');

const archivedEvidence = injectArchiveMetadata({
  markdown: sanitizePortableMarkdown(evidenceMarkdown),
  archivedAt,
  sourcePath: formatDisplayPath(currentEvidencePath),
});
const archivedCloseout = injectArchiveMetadata({
  markdown: sanitizePortableMarkdown(rewriteCloseoutEvidencePath(closeoutMarkdown, snapshotEvidencePath)),
  archivedAt,
  sourcePath: formatDisplayPath(currentCloseoutPath),
});
const archivedHandoff = handoffMarkdown
  ? injectArchiveMetadata({
      markdown: sanitizePortableMarkdown(
        rewriteHandoffPaths({
          markdown: handoffMarkdown,
          snapshotCloseoutPath,
          snapshotDir,
          snapshotEvidencePath,
        }),
      ),
      archivedAt,
      sourcePath: formatDisplayPath(currentHandoffPath),
    })
  : '';

fs.writeFileSync(snapshotEvidencePath, archivedEvidence, 'utf8');
fs.writeFileSync(snapshotCloseoutPath, archivedCloseout, 'utf8');
if (archivedHandoff) {
  fs.writeFileSync(snapshotHandoffPath, archivedHandoff, 'utf8');
}
fs.writeFileSync(
  snapshotManifestPath,
  JSON.stringify(
    {
      archivedAt,
      snapshotDir: formatDisplayPath(snapshotDir),
      sourceCloseoutPath: formatDisplayPath(currentCloseoutPath),
      sourceEvidencePath: formatDisplayPath(currentEvidencePath),
      ...(archivedHandoff
        ? {
            sourceHandoffPath: formatDisplayPath(currentHandoffPath),
            snapshotHandoffPath: formatDisplayPath(snapshotHandoffPath),
          }
        : {}),
      verifiedCommit,
    },
    null,
    2,
  ),
  'utf8',
);

console.log(
  JSON.stringify(
    {
      ok: true,
      archivedAt,
      snapshotCloseoutPath,
      snapshotEvidencePath,
      ...(archivedHandoff ? { snapshotHandoffPath } : {}),
      snapshotManifestPath,
      verifiedCommit,
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
  const match = String(markdown || '').match(new RegExp(`^- ${label}:\\s+(.+)$`, 'm'));
  return match ? String(match[1] || '').trim() : '';
}

function injectArchiveMetadata({ markdown, archivedAt, sourcePath }) {
  const lines = String(markdown || '').split('\n');
  if (!lines.length) {
    return markdown;
  }

  const headerIndex = lines.findIndex((line) => line.startsWith('# '));
  const insertAt = headerIndex >= 0 ? headerIndex + 1 : 0;
  const archiveLines = [
    '',
    `- archivedAt: ${archivedAt}`,
    `- sourcePath: ${sourcePath}`,
  ];

  return [...lines.slice(0, insertAt), ...archiveLines, ...lines.slice(insertAt)].join('\n');
}

function rewriteCloseoutEvidencePath(markdown, snapshotEvidencePath) {
  const replacement = `- evidence: [execution-v1-evidence.md](${formatDisplayPath(snapshotEvidencePath)})`;
  return String(markdown || '').replace(/^- evidence:\s+.+$/m, replacement);
}

function rewriteHandoffPaths({ markdown, snapshotCloseoutPath, snapshotDir, snapshotEvidencePath }) {
  return String(markdown || '')
    .replace(
      /^- evidence:\s+.+$/m,
      `- evidence: [execution-v1-evidence.md](${formatDisplayPath(snapshotEvidencePath)})`,
    )
    .replace(
      /^- closeout:\s+.+$/m,
      `- closeout: [execution-v1-closeout.md](${formatDisplayPath(snapshotCloseoutPath)})`,
    )
    .replace(
      /^- immutableSnapshot:\s+.+$/m,
      `- immutableSnapshot: [${formatDisplayPath(snapshotDir)}](${formatDisplayPath(snapshotDir)})`,
    );
}

function sanitizePortableMarkdown(markdown) {
  return String(markdown || '').replace(
    /\/(?:private\/)?var\/folders\/[^"'\s)]+\/T\/(personal-ai-agent-[^"'\s,)]+)/g,
    '<temp>/$1',
  );
}

function formatDisplayPath(filePath) {
  const relativePath = path.relative(repoDir, String(filePath || ''));
  if (relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
    return relativePath;
  }
  return String(filePath || '');
}
