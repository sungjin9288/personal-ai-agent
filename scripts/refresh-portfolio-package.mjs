import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PORTFOLIO_PACK_NAME = 'personal_ai_agent_portfolio_pack';
export const PORTFOLIO_PACK_DIR = `_portfolio_export/${PORTFOLIO_PACK_NAME}`;
export const PORTFOLIO_ZIP_PATH = `${PORTFOLIO_PACK_DIR}.zip`;
export const PORTFOLIO_MANIFEST_PATH = 'config/portfolio-package-files.json';

const FIXED_DATE = new Date('2000-01-01T00:00:00.000Z');
const NORMALIZED_PACK_TEXT = {
  'CHANGELOG.md': normalizePackedChangelog,
  'docs/evidence-checklist.md': normalizePackedEvidenceChecklist,
  'portfolio_manifest.md': normalizePackedPortfolioManifest,
};
const ROOT_METADATA_WRITERS = {
  'CHANGELOG.md': writeChangelogMetadata,
  'docs/evidence-checklist.md': writeEvidenceChecklistMetadata,
  'portfolio_manifest.md': writePortfolioManifestMetadata,
};
const FORBIDDEN_SEGMENTS = new Set([
  '.DS_Store',
  '.env',
  '.git',
  '__MACOSX',
  'node_modules',
]);
const SECRET_PATTERN = /(sk-[A-Za-z0-9_-]{20,}|sk-ant-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,}|xox[baprs]-[0-9A-Za-z-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,})/g;

export function loadPortfolioFileManifest({
  rootDir = process.cwd(),
  manifestPath = PORTFOLIO_MANIFEST_PATH,
} = {}) {
  const absoluteRoot = fs.realpathSync(rootDir);
  validateManifestPath(manifestPath);
  validateSourceFile(absoluteRoot, manifestPath);
  const absoluteManifest = resolveInsideRoot(absoluteRoot, manifestPath);
  const document = JSON.parse(fs.readFileSync(absoluteManifest, 'utf8'));
  const files = document?.files;

  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('portfolio package manifest must contain a non-empty files array');
  }

  const seen = new Set();
  let previous = null;
  for (const relativePath of files) {
    validateManifestPath(relativePath);
    if (seen.has(relativePath)) {
      throw new Error(`portfolio package manifest contains a duplicate path: ${relativePath}`);
    }
    if (previous !== null && comparePaths(previous, relativePath) >= 0) {
      throw new Error('portfolio package manifest files must be sorted in ascending POSIX order');
    }
    seen.add(relativePath);
    previous = relativePath;
    validateSourceFile(absoluteRoot, relativePath);
  }

  for (const requiredPath of Object.keys(ROOT_METADATA_WRITERS)) {
    if (!seen.has(requiredPath)) {
      throw new Error(`portfolio package manifest is missing required metadata source: ${requiredPath}`);
    }
  }

  return Object.freeze([...files]);
}

export function buildPortfolioPackageCandidate({
  rootDir = process.cwd(),
  manifestPath = PORTFOLIO_MANIFEST_PATH,
  zipCommand = 'zip',
} = {}) {
  const absoluteRoot = fs.realpathSync(rootDir);
  const files = loadPortfolioFileManifest({ rootDir: absoluteRoot, manifestPath });
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-portfolio-'));
  const packDir = path.join(temporaryRoot, PORTFOLIO_PACK_NAME);
  const zipPath = path.join(temporaryRoot, `${PORTFOLIO_PACK_NAME}.zip`);

  try {
    fs.mkdirSync(packDir, { recursive: true, mode: 0o755 });
    for (const relativePath of files) {
      const sourcePath = resolveInsideRoot(absoluteRoot, relativePath);
      const destinationPath = path.join(packDir, ...relativePath.split('/'));
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true, mode: 0o755 });
      const source = fs.readFileSync(sourcePath);
      const transform = NORMALIZED_PACK_TEXT[relativePath];
      const content = transform ? Buffer.from(transform(source.toString('utf8'))) : source;
      fs.writeFileSync(destinationPath, content, { mode: 0o644 });
      fs.chmodSync(destinationPath, 0o644);
    }

    scanPackageHygiene(packDir);
    normalizeTreeMetadata(packDir);
    createDeterministicZip({ files, temporaryRoot, zipPath, zipCommand });
    validateCandidateZip({ files, temporaryRoot, zipPath });

    const zip = fs.readFileSync(zipPath);
    const zipBytes = zip.length;
    const zipSha256 = sha256(zip);
    const rootDocuments = buildRootMetadataDocuments({ absoluteRoot, zipBytes, zipSha256 });

    return {
      cleanup: () => fs.rmSync(temporaryRoot, { force: true, recursive: true }),
      files,
      packDir,
      rootDocuments,
      temporaryRoot,
      zip,
      zipBytes,
      zipPath,
      zipSha256,
    };
  } catch (error) {
    fs.rmSync(temporaryRoot, { force: true, recursive: true });
    throw error;
  }
}

export function refreshPortfolioPackage({
  rootDir = process.cwd(),
  manifestPath = PORTFOLIO_MANIFEST_PATH,
  zipCommand = 'zip',
  check = false,
  beforeStageStep = () => {},
  beforePublishStep = () => {},
} = {}) {
  const absoluteRoot = fs.realpathSync(rootDir);
  validatePortfolioOutputBoundary(absoluteRoot);
  const first = buildPortfolioPackageCandidate({ rootDir: absoluteRoot, manifestPath, zipCommand });

  try {
    if (check) {
      const second = buildPortfolioPackageCandidate({ rootDir: absoluteRoot, manifestPath, zipCommand });
      try {
        assertCandidatesEqual(first, second);
      } finally {
        second.cleanup();
      }
      assertTrackedPackageMatches({ absoluteRoot, candidate: first });
      return summarize('check', first);
    }

    publishCandidate({ absoluteRoot, beforePublishStep, beforeStageStep, candidate: first });
    return summarize('refresh', first);
  } finally {
    first.cleanup();
  }
}

function publishCandidate({ absoluteRoot, beforePublishStep, beforeStageStep, candidate }) {
  const outputRoot = path.join(absoluteRoot, '_portfolio_export');
  const destinationPack = path.join(absoluteRoot, PORTFOLIO_PACK_DIR);
  const destinationZip = path.join(absoluteRoot, PORTFOLIO_ZIP_PATH);
  const transactionRoot = fs.mkdtempSync(path.join(outputRoot, '.portfolio-publish-'));
  const backupPack = path.join(transactionRoot, 'previous-pack');
  const backupZip = path.join(transactionRoot, 'previous.zip');
  const stagedPack = path.join(transactionRoot, 'next-pack');
  const stagedZip = path.join(transactionRoot, 'next.zip');
  const rootBackups = new Map();
  const stagedRootDocuments = [];

  let movedPreviousPack = false;
  let movedPreviousZip = false;
  let publishedPack = false;
  let publishedZip = false;
  const publishedRoots = [];

  try {
    beforeStageStep('before-pack-copy');
    fs.cpSync(candidate.packDir, stagedPack, { recursive: true, verbatimSymlinks: true });
    beforeStageStep('before-zip-copy');
    fs.copyFileSync(candidate.zipPath, stagedZip);
    for (const [relativePath, content] of candidate.rootDocuments) {
      beforeStageStep(`before-root:${relativePath}`);
      const destination = resolveInsideRoot(absoluteRoot, relativePath);
      rootBackups.set(relativePath, fs.readFileSync(destination));
      const staged = path.join(transactionRoot, `root-${rootBackups.size}.md`);
      fs.writeFileSync(staged, content, { mode: 0o644 });
      stagedRootDocuments.push({ destination, relativePath, staged });
    }

    beforePublishStep('before-backup');
    if (fs.existsSync(destinationPack)) {
      fs.renameSync(destinationPack, backupPack);
      movedPreviousPack = true;
    }
    if (fs.existsSync(destinationZip)) {
      fs.renameSync(destinationZip, backupZip);
      movedPreviousZip = true;
    }

    beforePublishStep('before-pack');
    fs.renameSync(stagedPack, destinationPack);
    publishedPack = true;
    beforePublishStep('before-zip');
    fs.renameSync(stagedZip, destinationZip);
    publishedZip = true;

    for (const document of stagedRootDocuments) {
      beforePublishStep(`before-root:${document.relativePath}`);
      fs.renameSync(document.staged, document.destination);
      publishedRoots.push(document.relativePath);
    }
    beforePublishStep('after-publish');
  } catch (error) {
    for (const relativePath of publishedRoots) {
      fs.writeFileSync(resolveInsideRoot(absoluteRoot, relativePath), rootBackups.get(relativePath));
    }
    if (publishedPack) {
      fs.rmSync(destinationPack, { force: true, recursive: true });
    }
    if (publishedZip) {
      fs.rmSync(destinationZip, { force: true });
    }
    if (movedPreviousPack) {
      fs.renameSync(backupPack, destinationPack);
    }
    if (movedPreviousZip) {
      fs.renameSync(backupZip, destinationZip);
    }
    throw error;
  } finally {
    fs.rmSync(transactionRoot, { force: true, recursive: true });
  }
}

function assertCandidatesEqual(first, second) {
  if (!first.zip.equals(second.zip)) {
    throw new Error('portfolio package build is not deterministic: candidate ZIP bytes differ');
  }
  if (JSON.stringify([...first.rootDocuments]) !== JSON.stringify([...second.rootDocuments])) {
    throw new Error('portfolio package build is not deterministic: root metadata differs');
  }
  for (const relativePath of first.files) {
    const firstFile = fs.readFileSync(path.join(first.packDir, ...relativePath.split('/')));
    const secondFile = fs.readFileSync(path.join(second.packDir, ...relativePath.split('/')));
    if (!firstFile.equals(secondFile)) {
      throw new Error(`portfolio package build is not deterministic: ${relativePath}`);
    }
  }
}

function assertTrackedPackageMatches({ absoluteRoot, candidate }) {
  const trackedPack = path.join(absoluteRoot, PORTFOLIO_PACK_DIR);
  const trackedZip = path.join(absoluteRoot, PORTFOLIO_ZIP_PATH);
  const trackedFiles = listPortfolioTreeFiles(trackedPack)
    .map((filePath) => toPosix(path.relative(trackedPack, filePath)));
  if (JSON.stringify(trackedFiles) !== JSON.stringify(candidate.files)) {
    throw new Error('tracked portfolio pack files do not match the configured manifest');
  }
  for (const relativePath of candidate.files) {
    const tracked = fs.readFileSync(path.join(trackedPack, ...relativePath.split('/')));
    const expected = fs.readFileSync(path.join(candidate.packDir, ...relativePath.split('/')));
    if (!tracked.equals(expected)) {
      throw new Error(`tracked portfolio pack is stale: ${relativePath}`);
    }
  }
  if (!fs.readFileSync(trackedZip).equals(candidate.zip)) {
    throw new Error('tracked portfolio ZIP is stale');
  }
  for (const [relativePath, content] of candidate.rootDocuments) {
    if (fs.readFileSync(resolveInsideRoot(absoluteRoot, relativePath), 'utf8') !== content) {
      throw new Error(`tracked portfolio metadata is stale: ${relativePath}`);
    }
  }
}

export function listPortfolioTreeFiles(rootDir) {
  const stats = fs.lstatSync(rootDir);
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new Error('portfolio pack root must be a real directory');
  }
  return walkPortfolioTree(rootDir, rootDir);
}

function walkPortfolioTree(rootDir, currentDir) {
  return fs.readdirSync(currentDir, { withFileTypes: true })
    .sort((left, right) => comparePaths(left.name, right.name))
    .flatMap((entry) => {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = toPosix(path.relative(rootDir, fullPath));
      if (entry.isSymbolicLink()) {
        throw new Error(`portfolio pack contains a symlink: ${relativePath}`);
      }
      if (entry.isDirectory()) {
        return walkPortfolioTree(rootDir, fullPath);
      }
      if (entry.isFile()) {
        return [fullPath];
      }
      throw new Error(`portfolio pack contains a non-regular entry: ${relativePath}`);
    });
}

function buildRootMetadataDocuments({ absoluteRoot, zipBytes, zipSha256 }) {
  const formattedBytes = `${zipBytes.toLocaleString('en-US')} bytes`;
  return new Map(
    Object.entries(ROOT_METADATA_WRITERS).map(([relativePath, writer]) => {
      const source = fs.readFileSync(resolveInsideRoot(absoluteRoot, relativePath), 'utf8');
      return [relativePath, writer(source, { formattedBytes, zipSha256 })];
    }),
  );
}

function normalizePackedChangelog(source) {
  return replaceOne(
    source,
    /^- Size: `[^`]+`\n- SHA-256: `[a-f0-9]{64}`$/m,
    '- Size and SHA-256 are tracked in the repository root `portfolio_manifest.md` after the ZIP is generated.',
    'CHANGELOG metadata markers',
  );
}

function normalizePackedPortfolioManifest(source) {
  return replaceOne(
    source,
    /^- 압축 파일 크기: .+\n- 압축 파일 SHA-256: `[a-f0-9]{64}`$/m,
    '- 압축 파일 크기 및 SHA-256: 루트 `portfolio_manifest.md` 기준',
    'portfolio manifest metadata markers',
  );
}

function normalizePackedEvidenceChecklist(source) {
  return replaceOne(
    source,
    /^\| 기존 portfolio zip 갱신 \| 완료 \| `_portfolio_export\/personal_ai_agent_portfolio_pack\.zip` \| .* \|$/m,
    '| 기존 portfolio zip 갱신 | 완료 | `_portfolio_export/personal_ai_agent_portfolio_pack.zip` | 최종 size/SHA-256은 루트 `portfolio_manifest.md` 기준 |',
    'evidence checklist portfolio ZIP marker',
  );
}

function writeChangelogMetadata(source, { formattedBytes, zipSha256 }) {
  const withSize = replaceOne(source, /^- Size: `[^`]+`$/m, `- Size: \`${formattedBytes}\``, 'CHANGELOG Size marker');
  return replaceOne(withSize, /^- SHA-256: `[a-f0-9]{64}`$/m, `- SHA-256: \`${zipSha256}\``, 'CHANGELOG SHA-256 marker');
}

function writePortfolioManifestMetadata(source, { formattedBytes, zipSha256 }) {
  const withSize = replaceOne(source, /^- 압축 파일 크기: .+$/m, `- 압축 파일 크기: ${formattedBytes}`, 'portfolio manifest size marker');
  return replaceOne(withSize, /^- 압축 파일 SHA-256: `[a-f0-9]{64}`$/m, `- 압축 파일 SHA-256: \`${zipSha256}\``, 'portfolio manifest SHA-256 marker');
}

function writeEvidenceChecklistMetadata(source, { formattedBytes, zipSha256 }) {
  return replaceOne(
    source,
    /^\| 기존 portfolio zip 갱신 \| 완료 \| `_portfolio_export\/personal_ai_agent_portfolio_pack\.zip` \| .* \|$/m,
    `| 기존 portfolio zip 갱신 | 완료 | \`_portfolio_export/personal_ai_agent_portfolio_pack.zip\` | ${formattedBytes}, SHA-256 \`${zipSha256}\` |`,
    'evidence checklist portfolio ZIP marker',
  );
}

function replaceOne(source, pattern, replacement, label) {
  const matches = [...source.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`))];
  if (matches.length !== 1) {
    throw new Error(`${label} must appear exactly once; found ${matches.length}`);
  }
  return source.replace(pattern, replacement);
}

function validateManifestPath(relativePath) {
  if (typeof relativePath !== 'string' || relativePath.length === 0) {
    throw new Error('portfolio package manifest paths must be non-empty strings');
  }
  if (path.posix.isAbsolute(relativePath) || path.win32.isAbsolute(relativePath)) {
    throw new Error(`portfolio package path must be relative: ${relativePath}`);
  }
  if (relativePath.includes('\\') || path.posix.normalize(relativePath) !== relativePath) {
    throw new Error(`portfolio package path must be normalized POSIX: ${relativePath}`);
  }
  const segments = relativePath.split('/');
  if (segments.some((segment) => segment === '..' || segment === '.' || segment === '')) {
    throw new Error(`portfolio package path contains traversal or empty segments: ${relativePath}`);
  }
  const forbidden = segments.find((segment) => FORBIDDEN_SEGMENTS.has(segment));
  if (forbidden) {
    throw new Error(`portfolio package path contains forbidden name ${forbidden}: ${relativePath}`);
  }
}

function validateSourceFile(absoluteRoot, relativePath) {
  const segments = relativePath.split('/');
  let current = absoluteRoot;
  for (const segment of segments) {
    current = path.join(current, segment);
    let stats;
    try {
      stats = fs.lstatSync(current);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`portfolio package source is missing: ${relativePath}`);
      }
      throw error;
    }
    if (stats.isSymbolicLink()) {
      throw new Error(`portfolio package source path contains a symlink: ${relativePath}`);
    }
  }
  const stats = fs.lstatSync(current);
  if (!stats.isFile()) {
    throw new Error(`portfolio package source must be a regular file: ${relativePath}`);
  }
  const realSource = fs.realpathSync(current);
  if (!isInside(absoluteRoot, realSource)) {
    throw new Error(`portfolio package source resolves outside repository root: ${relativePath}`);
  }
}

function validatePortfolioOutputBoundary(absoluteRoot) {
  const outputRoot = path.join(absoluteRoot, '_portfolio_export');
  let stats;
  try {
    stats = fs.lstatSync(outputRoot);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('portfolio output root is missing: _portfolio_export');
    }
    throw error;
  }
  if (stats.isSymbolicLink()) {
    throw new Error('portfolio output root must not be a symlink: _portfolio_export');
  }
  if (!stats.isDirectory()) {
    throw new Error('portfolio output root must be a directory: _portfolio_export');
  }
  if (!isInside(absoluteRoot, fs.realpathSync(outputRoot))) {
    throw new Error('portfolio output root resolves outside repository root: _portfolio_export');
  }

  validateTrackedOutputType(path.join(outputRoot, PORTFOLIO_PACK_NAME), 'portfolio pack', 'directory');
  validateTrackedOutputType(path.join(outputRoot, `${PORTFOLIO_PACK_NAME}.zip`), 'portfolio ZIP', 'file');
}

function validateTrackedOutputType(outputPath, label, expectedType) {
  let stats;
  try {
    stats = fs.lstatSync(outputPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return;
    }
    throw error;
  }
  if (stats.isSymbolicLink()) {
    throw new Error(`${label} must not be a symlink`);
  }
  const valid = expectedType === 'directory' ? stats.isDirectory() : stats.isFile();
  if (!valid) {
    throw new Error(`${label} must be a ${expectedType}`);
  }
}

function scanPackageHygiene(packDir) {
  const actualHome = os.homedir();
  for (const filePath of listFiles(packDir)) {
    const relativePath = toPosix(path.relative(packDir, filePath));
    validateManifestPath(relativePath);
    if (!isTextLike(filePath)) {
      continue;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    if (actualHome && actualHome !== '/' && content.includes(actualHome)) {
      throw new Error(`portfolio package content contains actual local home path: ${relativePath}`);
    }
    if (content.includes('/private/var/folders/')) {
      throw new Error(`portfolio package content contains macOS temp path: ${relativePath}`);
    }
    SECRET_PATTERN.lastIndex = 0;
    if (SECRET_PATTERN.test(content)) {
      throw new Error(`portfolio package content contains a secret-like token: ${relativePath}`);
    }
  }
}

function createDeterministicZip({ files, temporaryRoot, zipPath, zipCommand }) {
  const zipEntries = files.map((relativePath) => `${PORTFOLIO_PACK_NAME}/${relativePath}`);
  const result = spawnSync(zipCommand, ['-X', '-q', zipPath, '-@'], {
    cwd: temporaryRoot,
    encoding: 'utf8',
    input: `${zipEntries.join('\n')}\n`,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`portfolio ZIP creation failed: ${result.error?.message || result.stderr || result.stdout}`);
  }
}

function validateCandidateZip({ files, temporaryRoot, zipPath }) {
  const integrity = spawnSync('unzip', ['-t', zipPath], {
    cwd: temporaryRoot,
    encoding: 'utf8',
  });
  if (integrity.error || integrity.status !== 0 || !integrity.stdout.includes('No errors detected')) {
    throw new Error(`portfolio ZIP integrity check failed: ${integrity.error?.message || integrity.stderr || integrity.stdout}`);
  }

  const listing = spawnSync('zipinfo', ['-1', zipPath], {
    cwd: temporaryRoot,
    encoding: 'utf8',
  });
  if (listing.error || listing.status !== 0) {
    throw new Error(`portfolio ZIP entry check failed: ${listing.error?.message || listing.stderr || listing.stdout}`);
  }
  const actualEntries = listing.stdout.trim().split('\n').filter(Boolean);
  const expectedEntries = files.map((relativePath) => `${PORTFOLIO_PACK_NAME}/${relativePath}`);
  if (JSON.stringify(actualEntries) !== JSON.stringify(expectedEntries)) {
    throw new Error('portfolio ZIP entries do not match the configured manifest order');
  }
}

function normalizeTreeMetadata(rootDir) {
  const entries = [rootDir, ...listTreeEntries(rootDir)];
  for (const entry of entries.filter((filePath) => fs.lstatSync(filePath).isFile())) {
    fs.chmodSync(entry, 0o644);
    fs.utimesSync(entry, FIXED_DATE, FIXED_DATE);
  }
  for (const entry of entries.filter((filePath) => fs.lstatSync(filePath).isDirectory()).reverse()) {
    fs.chmodSync(entry, 0o755);
    fs.utimesSync(entry, FIXED_DATE, FIXED_DATE);
  }
}

function listTreeEntries(rootDir) {
  return fs.readdirSync(rootDir, { withFileTypes: true })
    .sort((left, right) => comparePaths(left.name, right.name))
    .flatMap((entry) => {
      const fullPath = path.join(rootDir, entry.name);
      return entry.isDirectory() ? [fullPath, ...listTreeEntries(fullPath)] : [fullPath];
    });
}

function listFiles(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }
  return listTreeEntries(rootDir)
    .filter((filePath) => fs.lstatSync(filePath).isFile())
    .sort((left, right) => comparePaths(toPosix(path.relative(rootDir, left)), toPosix(path.relative(rootDir, right))));
}

function resolveInsideRoot(absoluteRoot, relativePath) {
  const resolved = path.resolve(absoluteRoot, relativePath);
  if (!isInside(absoluteRoot, resolved)) {
    throw new Error(`path resolves outside repository root: ${relativePath}`);
  }
  return resolved;
}

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function isTextLike(filePath) {
  return /\.(md|mmd|json|log|txt|yml|yaml|mjs|js|cjs|ts|tsx|css|html)$/i.test(filePath);
}

function comparePaths(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function summarize(mode, candidate) {
  return {
    fileCount: candidate.files.length,
    mode,
    ok: true,
    zipBytes: candidate.zipBytes,
    zipSha256: candidate.zipSha256,
  };
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function isDirectExecution() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isDirectExecution()) {
  const result = refreshPortfolioPackage({ check: process.argv.slice(2).includes('--check') });
  console.log(JSON.stringify(result, null, 2));
}
