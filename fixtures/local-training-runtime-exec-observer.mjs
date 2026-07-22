import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CHILD_SCHEMA_VERSION =
  'personal-ai-agent-local-training-runtime-exec-child/v1';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hashSet(values) {
  return sha256(JSON.stringify([...new Set(values)].sort()));
}

function describeFile(filePath) {
  const canonicalPath = fs.realpathSync(filePath);
  const stat = fs.lstatSync(canonicalPath);
  const content = fs.readFileSync(canonicalPath);
  return {
    byteLength: content.byteLength,
    dev: stat.dev,
    ino: stat.ino,
    mode: stat.mode,
    nlink: stat.nlink,
    sha256: sha256(content),
    uid: stat.uid,
  };
}

function classifyRuntimeImages(runtimeImages) {
  let regular = 0;
  for (const imagePath of runtimeImages) {
    try {
      const canonicalPath = fs.realpathSync(imagePath);
      if (fs.lstatSync(canonicalPath).isFile()) {
        regular += 1;
      }
    } catch {
      // Darwin shared-cache images may not have standalone filesystem bytes.
    }
  }
  return {
    regular,
    unresolved: runtimeImages.length - regular,
  };
}

const entryPath = fileURLToPath(import.meta.url);
const runtimeImages = process.report.getReport().sharedObjects || [];
const moduleLoads = [...new Set(process.moduleLoadList)].sort();
const imageCounts = classifyRuntimeImages(runtimeImages);

process.stdout.write(JSON.stringify({
  entry: describeFile(entryPath),
  executable: describeFile(process.execPath),
  moduleLoads: {
    count: moduleLoads.length,
    setSha256: hashSet(moduleLoads),
  },
  runtimeImages: {
    allAbsolute: runtimeImages.every((imagePath) =>
      path.isAbsolute(imagePath)),
    count: runtimeImages.length,
    regularCount: imageCounts.regular,
    setSha256: hashSet(runtimeImages),
    unique: new Set(runtimeImages).size === runtimeImages.length,
    unresolvedCount: imageCounts.unresolved,
  },
  schemaVersion: CHILD_SCHEMA_VERSION,
}));
