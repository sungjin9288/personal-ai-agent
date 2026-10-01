import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';

import { evaluateDeliveryEvidence } from './delivery-evidence-gate.mjs';

const MANIFEST = 'delivery-evidence.json';
const COUNTS = ['tests', 'passed', 'failed', 'cancelled', 'skipped', 'todo'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function requireValue(condition, field) {
  if (!condition) throw new Error(`Delivery import rejected: ${field}.`);
}

function exactKeys(value, keys, field) {
  requireValue(value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)), field);
}

function relativeFile(value) {
  requireValue(typeof value === 'string' && value.length <= 500 &&
    !/[\p{Cc}\p{Cf}\\]/u.test(value) && !path.isAbsolute(value) &&
    value.split('/').every(part => part && part !== '.' && part !== '..' && part !== '.git'), 'source-path');
  return value;
}

function readStableFile(filename, maxBytes, field) {
  let fd;
  try {
    const absolute = path.resolve(filename);
    requireValue(fs.realpathSync(absolute) === absolute, field);
    const before = fs.lstatSync(absolute);
    requireValue(before.isFile() && before.nlink === 1 && before.size <= maxBytes, field);
    fd = fs.openSync(absolute, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
    const identity = stat => [stat.dev, stat.ino, stat.size, stat.mode, stat.mtimeMs, stat.ctimeMs, stat.nlink];
    requireValue(isDeepStrictEqual(identity(before), identity(fs.fstatSync(fd))), field);
    const buffer = Buffer.alloc(before.size + 1);
    let length = 0;
    while (length < buffer.length) {
      const read = fs.readSync(fd, buffer, length, buffer.length - length, null);
      if (!read) break;
      length += read;
    }
    requireValue(length === before.size && fs.realpathSync(absolute) === absolute &&
      isDeepStrictEqual(identity(before), identity(fs.fstatSync(fd))) &&
      isDeepStrictEqual(identity(before), identity(fs.lstatSync(absolute))), field);
    return { bytes: buffer.subarray(0, length), mode: before.mode };
  } catch {
    throw new Error(`Delivery import rejected: ${field}.`);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function git(repoDir, args) {
  const result = spawnSync('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', ...args], {
    cwd: repoDir, encoding: 'utf8', timeout: 10_000, maxBuffer: 4 * 1024 * 1024,
    env: {
      PATH: '/usr/bin:/bin', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_OPTIONAL_LOCKS: '0', GIT_NO_REPLACE_OBJECTS: '1', GIT_NO_LAZY_FETCH: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  requireValue(result.status === 0 && !result.error, 'source-git-query');
  return result.stdout;
}

function readGitState(repoDir) {
  requireValue(git(repoDir, ['rev-parse', '--show-toplevel']).trim() === repoDir, 'source-root');
  const revision = git(repoDir, ['rev-parse', 'HEAD']).trim();
  requireValue(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(revision), 'source-revision');
  requireValue(!git(repoDir, ['ls-files', '--others', '--exclude-standard', '-z']), 'source-untracked');
  return {
    revision,
    commonDir: fs.realpathSync(git(repoDir, ['rev-parse', '--path-format=absolute', '--git-common-dir']).trim()),
    tree: git(repoDir, ['ls-tree', '-rz', '--full-tree', 'HEAD']),
    index: git(repoDir, ['ls-files', '--stage', '-z']),
  };
}

function parseJson(bytes, field) {
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new Error(`Delivery import rejected: ${field}.`); }
}

export function captureDeliverySource(repoDir) {
  requireValue(typeof repoDir === 'string' && path.isAbsolute(repoDir) &&
    fs.realpathSync(repoDir) === repoDir, 'source-root');
  const before = readGitState(repoDir);
  const entries = before.tree.split('\0').filter(Boolean).map(entry => {
    const match = /^(100644|100755) blob ([a-f0-9]+)\t(.+)$/.exec(entry);
    requireValue(match, 'source-regular-files-only');
    return { mode: match[1], objectId: match[2], name: relativeFile(match[3]) };
  });
  requireValue(entries.length > 0 && entries.length <= 10_000, 'source-file-limit');
  const expectedIndex = entries.map(row => `${row.mode} ${row.objectId} 0\t${row.name}`).sort();
  requireValue(isDeepStrictEqual(before.index.split('\0').filter(Boolean).sort(), expectedIndex), 'source-index-drift');
  const files = new Map();
  let total = 0;
  for (const entry of entries) {
    const file = readStableFile(path.join(repoDir, entry.name), 4 * 1024 * 1024, 'source-file');
    total += file.bytes.length;
    requireValue(total <= 64 * 1024 * 1024, 'source-byte-limit');
    const objectId = createHash(before.revision.length === 40 ? 'sha1' : 'sha256')
      .update(`blob ${file.bytes.length}\0`).update(file.bytes).digest('hex');
    requireValue(objectId === entry.objectId && Boolean(file.mode & 0o111) === (entry.mode === '100755'), 'source-bytes-drift');
    files.set(entry.name, { digest: hash(file.bytes), bytes: entry.name === MANIFEST ? file.bytes : null });
  }
  requireValue(files.has(MANIFEST), 'source-manifest-missing');
  const manifest = parseJson(files.get(MANIFEST).bytes, 'source-manifest-json');
  exactKeys(manifest, ['schemaVersion', 'projectId', 'requirements', 'testFiles', 'configFiles'], 'source-manifest');
  requireValue(manifest.schemaVersion === 'delivery-evidence-manifest/v1', 'source-manifest-version');
  for (const key of ['testFiles', 'configFiles']) {
    requireValue(Array.isArray(manifest[key]) && manifest[key].length > 0 && manifest[key].length <= 100 &&
      new Set(manifest[key]).size === manifest[key].length, `source-${key}`);
    for (const name of manifest[key]) requireValue(files.has(relativeFile(name)), `source-${key}`);
  }
  const definitions = [...new Set([...manifest.testFiles, ...manifest.configFiles])].sort()
    .map(name => ({ name, sha256: files.get(name).digest }));
  const definitionDigest = hash(JSON.stringify(definitions));
  const environment = { nodeVersion: process.version, platform: process.platform, arch: process.arch };
  const environmentId = `node-${hash(JSON.stringify(environment))}`;
  requireValue(Array.isArray(manifest.requirements), 'source-requirements');
  const requirements = manifest.requirements.map(requirement => {
    exactKeys(requirement, ['id', 'criterion', 'mappingConfirmed'], 'source-requirement');
    return { ...requirement, checks: [{ id: 'node-test-suite', definitionDigest, environmentId }] };
  });
  const target = { projectId: manifest.projectId, sourceRevision: before.revision };
  evaluateDeliveryEvidence({ schemaVersion: 'delivery-evidence-input/v1', target, requirements, evidence: [] });
  // Recheck bytes too: HEAD/index equality alone cannot reveal an in-place edit.
  for (const entry of entries) {
    const file = readStableFile(path.join(repoDir, entry.name), 4 * 1024 * 1024, 'source-file');
    requireValue(hash(file.bytes) === files.get(entry.name).digest &&
      Boolean(file.mode & 0o111) === (entry.mode === '100755'), 'source-observation-drift');
  }
  requireValue(isDeepStrictEqual(before, readGitState(repoDir)), 'source-observation-drift');
  return {
    target, requirements, environment,
    repositoryIdentityDigest: hash(JSON.stringify({ root: repoDir, commonDir: before.commonDir })),
    manifestDigest: files.get(MANIFEST).digest,
    testFiles: [...manifest.testFiles].sort(),
  };
}

export function validateNodeTestSummary(summary) {
  exactKeys(summary, ['success', ...COUNTS], 'summary');
  requireValue(typeof summary.success === 'boolean' && COUNTS.every(key =>
    Number.isSafeInteger(summary[key]) && summary[key] >= 0 && summary[key] <= 1_000_000), 'summary-counts');
  requireValue(summary.tests > 0 && summary.tests === COUNTS.slice(1).reduce((sum, key) => sum + summary[key], 0), 'summary-total');
  requireValue(summary.success === (summary.failed === 0 && summary.cancelled === 0), 'summary-outcome');
  requireValue(summary.cancelled === 0, 'summary-cancelled-unsupported');
  if (summary.failed) return 'failed';
  if (summary.skipped || summary.todo) return 'skipped';
  return 'passed';
}

export function importDeliveryEvidence({ repoDir, receiptPath }, { captureSource = captureDeliverySource } = {}) {
  const source = captureSource(repoDir);
  const bytes = readStableFile(receiptPath, 1024 * 1024, 'receipt-file').bytes;
  const receipt = parseJson(bytes, 'receipt-json');
  exactKeys(receipt, ['schemaVersion', 'source', 'summary'], 'receipt-fields');
  requireValue(receipt.schemaVersion === 'delivery-node-test-receipt/v1', 'receipt-version');
  requireValue(isDeepStrictEqual(receipt.source, source), 'source-binding');
  const result = validateNodeTestSummary(receipt.summary);
  const packet = {
    schemaVersion: 'delivery-evidence-input/v1',
    target: receipt.source.target,
    requirements: receipt.source.requirements,
    evidence: receipt.source.requirements.map((requirement, index) => ({
      id: `node-suite-${index + 1}`, projectId: receipt.source.target.projectId,
      sourceRevision: receipt.source.target.sourceRevision,
      requirementId: requirement.id, criterionDigest: hash(requirement.criterion),
      checkId: 'node-test-suite', definitionDigest: requirement.checks[0].definitionDigest,
      environmentId: requirement.checks[0].environmentId, result,
    })),
  };
  const report = evaluateDeliveryEvidence(packet);
  requireValue(isDeepStrictEqual(source, captureSource(repoDir)), 'source-observation-drift');
  requireValue(bytes.equals(readStableFile(receiptPath, 1024 * 1024, 'receipt-file').bytes), 'receipt-observation-drift');
  return { packet, report };
}
