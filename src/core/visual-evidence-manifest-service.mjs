import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const VISUAL_EVIDENCE_IMAGE_EXTENSIONS = Object.freeze(['.jpeg', '.jpg', '.png', '.webp']);
export const VISUAL_EVIDENCE_VIDEO_EXTENSIONS = Object.freeze(['.mov', '.mp4', '.webm']);
export const VISUAL_EVIDENCE_REPORT_EXTENSIONS = Object.freeze(['.json']);

const DEFAULT_ARTIFACT_VERSION = 'personal-ai-agent-visual-evidence-manifest/v1';
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function normalizePath(value, fallback = '') {
  return path.resolve(normalizeText(value, fallback));
}

function isPathInsideRoot(filePath, rootPath) {
  const resolvedFilePath = normalizePath(filePath);
  const resolvedRootPath = normalizePath(rootPath);
  return resolvedFilePath === resolvedRootPath || resolvedFilePath.startsWith(`${resolvedRootPath}${path.sep}`);
}

function assertSafeEvidencePath(filePath, allowedRoots) {
  const resolvedPath = normalizePath(filePath);
  const safe = allowedRoots.some((rootPath) => isPathInsideRoot(resolvedPath, rootPath));
  if (!safe) {
    throw new Error(`Visual evidence path is outside the allowlisted artifact roots: ${resolvedPath}`);
  }
  return resolvedPath;
}

function sha256Buffer(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function readPngDimensions(buffer) {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE) || buffer.toString('ascii', 12, 16) !== 'IHDR') {
    return {};
  }

  return {
    height: buffer.readUInt32BE(20),
    width: buffer.readUInt32BE(16),
  };
}

function inferKindFromPath(filePath, fallbackKind = '') {
  const extension = path.extname(filePath).toLowerCase();
  if (VISUAL_EVIDENCE_IMAGE_EXTENSIONS.includes(extension)) {
    return 'screenshot';
  }
  if (VISUAL_EVIDENCE_VIDEO_EXTENSIONS.includes(extension)) {
    return 'video';
  }
  if (VISUAL_EVIDENCE_REPORT_EXTENSIONS.includes(extension)) {
    return 'report';
  }
  return normalizeText(fallbackKind, 'artifact');
}

function inferFormatFromPath(filePath, fallbackFormat = '') {
  const extension = path.extname(filePath).toLowerCase().replace(/^\./, '');
  return normalizeText(fallbackFormat, extension || 'unknown');
}

function inferContentType(kind, format) {
  if (kind === 'screenshot' && format === 'png') {
    return 'image/png';
  }
  if (kind === 'screenshot' && (format === 'jpg' || format === 'jpeg')) {
    return 'image/jpeg';
  }
  if (kind === 'screenshot' && format === 'webp') {
    return 'image/webp';
  }
  if (kind === 'video' && format === 'webm') {
    return 'video/webm';
  }
  if (kind === 'video' && format === 'mp4') {
    return 'video/mp4';
  }
  if (kind === 'video' && format === 'mov') {
    return 'video/quicktime';
  }
  if (kind === 'report' && format === 'json') {
    return 'application/json';
  }
  return 'application/octet-stream';
}

function buildVisualArtifactDescriptor({
  allowedRoots,
  artifactRoot,
  captureTarget = '',
  evidenceRole = '',
  filePath,
  format = '',
  id,
  kind = '',
  rootDir,
}) {
  const resolvedPath = assertSafeEvidencePath(filePath, allowedRoots);
  const artifactKind = inferKindFromPath(resolvedPath, kind);
  const artifactFormat = inferFormatFromPath(resolvedPath, format);
  const descriptor = {
    captureTarget: normalizeText(captureTarget),
    contentType: inferContentType(artifactKind, artifactFormat),
    evidenceRole: normalizeText(evidenceRole, artifactKind),
    exists: false,
    format: artifactFormat,
    id: normalizeText(id, path.basename(resolvedPath)),
    kind: artifactKind,
    path: resolvedPath,
    relativePath: path.relative(rootDir, resolvedPath),
    rootRelativePath: path.relative(artifactRoot, resolvedPath),
    safePath: true,
  };

  if (!fs.existsSync(resolvedPath) || fs.statSync(resolvedPath).isDirectory()) {
    return {
      ...descriptor,
      missingReason: 'file-not-found',
    };
  }

  const content = fs.readFileSync(resolvedPath);
  const stats = fs.statSync(resolvedPath);
  const imageDimensions = artifactKind === 'screenshot' && artifactFormat === 'png'
    ? readPngDimensions(content)
    : {};

  return {
    ...descriptor,
    ...imageDimensions,
    bytes: content.length,
    exists: true,
    modifiedAt: stats.mtime.toISOString(),
    sha256: sha256Buffer(content),
  };
}

function buildArtifactSignatureLine(artifact) {
  return [
    artifact.id,
    `kind=${artifact.kind}`,
    `format=${artifact.format}`,
    `exists=${artifact.exists ? 'true' : 'false'}`,
    `bytes=${Number(artifact.bytes || 0)}`,
    `sha256=${artifact.sha256 || ''}`,
    `path=${artifact.relativePath}`,
  ].join('|');
}

export function createVisualEvidenceManifest({
  artifactRoot,
  artifactVersion = DEFAULT_ARTIFACT_VERSION,
  captureSession = {},
  evidenceItems = [],
  generatedAt = new Date().toISOString(),
  outputPath = '',
  rootDir,
} = {}) {
  const normalizedRootDir = normalizePath(rootDir, process.cwd());
  const normalizedArtifactRoot = normalizePath(artifactRoot, path.join(normalizedRootDir, 'output', 'playwright'));
  const allowedRoots = [normalizedArtifactRoot];
  const artifacts = evidenceItems.map((item) =>
    buildVisualArtifactDescriptor({
      ...item,
      allowedRoots,
      artifactRoot: normalizedArtifactRoot,
      rootDir: normalizedRootDir,
    }),
  );
  const artifactSignatureLines = artifacts.map(buildArtifactSignatureLine);
  const screenshotCount = artifacts.filter((artifact) => artifact.kind === 'screenshot').length;
  const videoCount = artifacts.filter((artifact) => artifact.kind === 'video').length;
  const reportCount = artifacts.filter((artifact) => artifact.kind === 'report').length;
  const availableCount = artifacts.filter((artifact) => artifact.exists).length;
  const missingCount = artifacts.length - availableCount;
  const artifactSetSha256 = sha256Buffer(Buffer.from(artifactSignatureLines.join('\n'), 'utf8'));

  const manifest = {
    artifactVersion,
    artifacts,
    captureSession: {
      id: normalizeText(captureSession.id, 'visual-evidence'),
      source: normalizeText(captureSession.source, 'release-evidence'),
      status: missingCount === 0 ? 'ready' : 'partial',
      ...captureSession,
      availableCount,
      missingCount,
      reportCount,
      screenshotCount,
      videoCount,
      visualArtifactCount: screenshotCount + videoCount,
    },
    generatedAt,
    outputPath: outputPath ? assertSafeEvidencePath(outputPath, allowedRoots) : '',
    rootDir: normalizedRootDir,
    security: {
      allowlistedArtifactRoots: allowedRoots.map((rootPath) => path.relative(normalizedRootDir, rootPath) || '.'),
      externalMediaFetchEnabled: false,
      localFilesOnly: true,
      recorderEnabled: false,
      urlCaptureEnabled: false,
    },
    summary: {
      artifactSetSha256,
      availableCount,
      missingCount,
      reportCount,
      screenshotCount,
      signatureLines: artifactSignatureLines,
      totalCount: artifacts.length,
      videoCount,
      visualArtifactCount: screenshotCount + videoCount,
    },
  };

  return manifest;
}

export function writeVisualEvidenceManifest({ manifest, outputPath } = {}) {
  const manifestOutputPath = normalizePath(manifest?.outputPath);
  if (!manifestOutputPath) {
    throw new Error('Visual evidence manifest outputPath is required and must be validated during manifest creation.');
  }

  const targetPath = normalizePath(outputPath || manifestOutputPath);
  if (targetPath !== manifestOutputPath) {
    throw new Error(`Visual evidence manifest can only be written to its validated outputPath: ${manifestOutputPath}`);
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return {
    manifest,
    outputPath: targetPath,
  };
}
