import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const CHILD_SCHEMA_VERSION =
  'personal-ai-agent-local-training-runtime-image-provenance-child/v1';
const CONTROL_TIMEOUT_MS = 5_000;
const MAX_FILE_BYTES = 256 * 1024 * 1024;

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hashSet(values) {
  return sha256(JSON.stringify([...new Set(values)].sort()));
}

function describeRegularImage(imagePath) {
  const pathStat = fs.lstatSync(imagePath, { bigint: true });
  const canonicalPath = fs.realpathSync(imagePath);
  const before = fs.lstatSync(canonicalPath, { bigint: true });
  if (
    pathStat.isSymbolicLink() ||
    !before.isFile() ||
    before.isSymbolicLink() ||
    before.nlink !== 1n ||
    ![0n, BigInt(process.getuid())].includes(before.uid) ||
    (before.mode & 0o022n) !== 0n ||
    before.size <= 0n ||
    before.size > BigInt(MAX_FILE_BYTES)
  ) {
    throw new Error('Runtime image provenance file is unsafe.');
  }
  const content = fs.readFileSync(canonicalPath);
  const after = fs.lstatSync(canonicalPath, { bigint: true });
  if (
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    before.mode !== after.mode ||
    before.nlink !== after.nlink ||
    before.size !== after.size ||
    before.uid !== after.uid
  ) {
    throw new Error('Runtime image provenance file changed.');
  }
  return {
    byteLength: content.byteLength,
    dev: before.dev.toString(),
    ino: before.ino.toString(),
    mode: Number(before.mode),
    nlink: Number(before.nlink),
    pathSha256: sha256(imagePath),
    sha256: sha256(content),
    uid: Number(before.uid),
  };
}

function buildReport() {
  const runtimeImages = process.report.getReport().sharedObjects || [];
  const regularImages = [];
  const sharedCachePathHashes = [];
  for (const imagePath of runtimeImages) {
    try {
      if (fs.statSync(imagePath).isFile()) {
        regularImages.push(describeRegularImage(imagePath));
        continue;
      }
    } catch {
      // Darwin shared-cache images do not expose standalone file bytes.
    }
    sharedCachePathHashes.push(sha256(imagePath));
  }
  regularImages.sort((left, right) =>
    left.pathSha256.localeCompare(right.pathSha256));
  sharedCachePathHashes.sort();
  return {
    runtimeImages: {
      allAbsolute: runtimeImages.every((imagePath) =>
        path.isAbsolute(imagePath)),
      count: runtimeImages.length,
      pathHashes: runtimeImages.map(sha256).sort(),
      regularImages,
      setSha256: hashSet(runtimeImages),
      sharedCachePathHashes,
      unique: new Set(runtimeImages).size === runtimeImages.length,
    },
    schemaVersion: CHILD_SCHEMA_VERSION,
  };
}

function waitForClose() {
  const control = fs.createReadStream(null, {
    autoClose: true,
    encoding: 'utf8',
    fd: 4,
  });
  let received = '';
  const timer = setTimeout(() => process.exit(70), CONTROL_TIMEOUT_MS);
  control.on('data', (chunk) => {
    received += chunk;
    if (received === 'close\n') {
      clearTimeout(timer);
      control.close();
    } else if (!'close\n'.startsWith(received)) {
      process.exit(70);
    }
  });
  control.on('close', () => {
    if (received === 'close\n') {
      process.exit(0);
    }
    process.exit(70);
  });
}

process.stdout.write(`${JSON.stringify(buildReport())}\n`);
waitForClose();
