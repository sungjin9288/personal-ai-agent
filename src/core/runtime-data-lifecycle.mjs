import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const STATE_FILE_NAME = 'state.json';
const VAR_DIR_NAME = 'var';

export function buildRuntimeDataInventory({ rootDir }) {
  const normalizedRootDir = path.resolve(String(rootDir || '').trim() || process.cwd());
  const varDir = path.join(normalizedRootDir, VAR_DIR_NAME);
  const statePath = path.join(varDir, STATE_FILE_NAME);
  const state = readJsonIfExists(statePath);
  const files = fs.existsSync(varDir) ? listFiles(varDir) : [];

  return {
    artifactFileCount: files.filter((filePath) => filePath.includes(`${path.sep}missions${path.sep}`)).length,
    collectionCounts: countStateCollections(state),
    exists: fs.existsSync(varDir),
    fileCount: files.length,
    generatedAt: new Date().toISOString(),
    rootName: path.basename(normalizedRootDir),
    stateExists: Boolean(state),
    stateSha256: state ? hashFile(statePath) : '',
    totalBytes: files.reduce((sum, filePath) => sum + fs.statSync(filePath).size, 0),
    varDirName: VAR_DIR_NAME,
  };
}

export function exportRuntimeDataBundle({ outputDir, rootDir }) {
  const normalizedRootDir = path.resolve(String(rootDir || '').trim() || process.cwd());
  const normalizedOutputDir = path.resolve(String(outputDir || '').trim());
  if (!normalizedOutputDir) {
    throw new Error('outputDir is required for runtime data export.');
  }

  const varDir = path.join(normalizedRootDir, VAR_DIR_NAME);
  const exportDir = path.join(normalizedOutputDir, 'runtime-data-export');
  const inventory = buildRuntimeDataInventory({ rootDir: normalizedRootDir });
  const exportedFiles = [];

  fs.rmSync(exportDir, { force: true, recursive: true });
  fs.mkdirSync(exportDir, { recursive: true });

  if (fs.existsSync(varDir)) {
    for (const sourcePath of listFiles(varDir)) {
      const relativePath = path.relative(normalizedRootDir, sourcePath);
      const targetPath = path.join(exportDir, relativePath);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.copyFileSync(sourcePath, targetPath);
      exportedFiles.push({
        bytes: fs.statSync(sourcePath).size,
        path: relativePath,
        sha256: hashFile(sourcePath),
      });
    }
  }

  const manifest = {
    exportedAt: new Date().toISOString(),
    exportedFiles,
    exportedFileCount: exportedFiles.length,
    inventory,
    policy: {
      deleteRequiresConfirmationToken: buildRuntimeDataDeleteConfirmationToken({ rootDir: normalizedRootDir }),
      scope: 'local-runtime-var-directory',
    },
  };
  const manifestPath = path.join(exportDir, 'manifest.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return {
    exportDir,
    manifest,
    manifestPath,
  };
}

export function buildRuntimeDataDeleteConfirmationToken({ rootDir }) {
  const normalizedRootDir = path.resolve(String(rootDir || '').trim() || process.cwd());
  const digest = crypto.createHash('sha256').update(normalizedRootDir).digest('hex').slice(0, 12);
  return `delete-runtime-data:${path.basename(normalizedRootDir)}:${digest}`;
}

export function deleteRuntimeData({ confirmationToken = '', rootDir }) {
  const normalizedRootDir = path.resolve(String(rootDir || '').trim() || process.cwd());
  const expectedToken = buildRuntimeDataDeleteConfirmationToken({ rootDir: normalizedRootDir });
  if (confirmationToken !== expectedToken) {
    throw new Error('runtime data deletion requires the exact confirmation token.');
  }

  const varDir = path.join(normalizedRootDir, VAR_DIR_NAME);
  const before = buildRuntimeDataInventory({ rootDir: normalizedRootDir });
  fs.rmSync(varDir, { force: true, recursive: true });
  const after = buildRuntimeDataInventory({ rootDir: normalizedRootDir });

  return {
    after,
    before,
    deleted: before.exists && !after.exists,
    deletedAt: new Date().toISOString(),
  };
}

function countStateCollections(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(state)
      .filter(([, value]) => Array.isArray(value))
      .map(([key, value]) => [key, value.length])
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listFiles(directoryPath) {
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      return listFiles(entryPath);
    }
    if (entry.isFile()) {
      return [entryPath];
    }
    return [];
  });
}

function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}
