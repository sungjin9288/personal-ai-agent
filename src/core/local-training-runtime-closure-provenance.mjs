import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const LOCAL_TRAINING_RUNTIME_CLOSURE_PROVENANCE_SCHEMA_VERSION =
  'personal-ai-agent-local-training-runtime-closure-provenance/v1';

const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_RUNTIME_BYTES = 512 * 1024 * 1024;
const MAX_RUNTIME_FILES = 256;
const UNSUPPORTED_FILE_SUFFIXES = Object.freeze([
  '.dylib',
  '.egg',
  '.egg-link',
  '.pth',
  '.pyc',
  '.pyo',
  '.pyd',
  '.so',
  '.whl',
  '.zip',
]);
const UNSUPPORTED_SOURCE_PATTERNS = Object.freeze([
  ['ambient environment access', /\bos\s*\.\s*environ\b/u],
  [
    'arbitrary code evaluation',
    /\b(?:breakpoint|compile|eval|exec)\b/u,
  ],
  [
    'built-in namespace access',
    /\b(?:builtins|getattr|globals|locals|setattr|vars)\b/u,
  ],
  [
    'custom import hooks',
    /\b(?:__import__|importlib|pkgutil|runpy)\b/u,
  ],
  ['dynamic library loading', /\b(?:cffi|ctypes|dlopen)\b/u],
  ['filesystem access', /\b(?:open|pathlib)\b/u],
  ['process creation', /\b(?:os\s*\.\s*system|subprocess)\b/u],
  [
    'runtime introspection',
    /\b(?:ag_frame|cr_frame|f_builtins|gi_frame|inspect|traceback)\b/u,
  ],
  ['runtime path mutation', /\bsys\s*\.\s*path\b/u],
  ['special method access', /\b__\w+__\b/u],
]);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hashRecord(value) {
  return sha256(JSON.stringify(value));
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  );
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/u.test(String(value || ''));
}

function hasExactKeys(value, expectedKeys) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === expectedKeys.length &&
    Object.keys(value).every((key) => expectedKeys.includes(key)),
  );
}

function comparePaths(left, right) {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

function currentUserId() {
  if (typeof process.getuid !== 'function') {
    throw new Error(
      'Local training runtime closure requires a POSIX user identity.',
    );
  }
  return process.getuid();
}

function isTrustedMode(stat) {
  return stat.uid === currentUserId() && (stat.mode & 0o022) === 0;
}

function sameFileIdentity(before, after) {
  return [
    'dev',
    'ino',
    'mode',
    'nlink',
    'size',
    'uid',
  ].every((field) => before[field] === after[field]);
}

function requireRelativePath(value, fieldName) {
  const normalized = String(value || '').trim();
  if (
    !normalized ||
    normalized.includes('\\') ||
    path.posix.isAbsolute(normalized) ||
    path.posix.normalize(normalized) !== normalized ||
    normalized === '.' ||
    normalized.startsWith('../') ||
    /[\r\n\0]/u.test(normalized)
  ) {
    throw new Error(
      `Local training runtime closure ${fieldName} must remain relative.`,
    );
  }
  return normalized;
}

function requireRoot(fileSystem, rootDir) {
  let canonical;
  let stat;
  try {
    stat = fileSystem.lstatSync(path.resolve(rootDir));
    canonical = fileSystem.realpathSync(path.resolve(rootDir));
  } catch {
    throw new Error(
      'Local training runtime closure rootDir must exist.',
    );
  }
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    !isTrustedMode(stat)
  ) {
    throw new Error(
      'Local training runtime closure rootDir must be a regular directory.',
    );
  }
  return canonical;
}

function readContainedFile(fileSystem, rootDir, relativePath) {
  const normalized = requireRelativePath(relativePath, 'file path');
  const candidate = path.resolve(rootDir, normalized);
  let canonical;
  let stat;
  try {
    stat = fileSystem.lstatSync(candidate);
    canonical = fileSystem.realpathSync(candidate);
  } catch {
    throw new Error(
      `Local training runtime closure file ${normalized} must exist.`,
    );
  }
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== 1 ||
    !isTrustedMode(stat) ||
    !isWithin(rootDir, canonical) ||
    stat.size <= 0 ||
    stat.size > MAX_FILE_BYTES
  ) {
    throw new Error(
      `Local training runtime closure file ${normalized} must be a contained regular file.`,
    );
  }
  const content = fileSystem.readFileSync(canonical);
  const currentStat = fileSystem.lstatSync(canonical);
  if (
    content.byteLength !== stat.size ||
    !sameFileIdentity(stat, currentStat)
  ) {
    throw new Error(
      `Local training runtime closure file ${normalized} changed during inspection.`,
    );
  }
  return {
    byteLength: content.byteLength,
    content,
    path: normalized,
    sha256: sha256(content),
  };
}

function listRuntimeFiles(fileSystem, rootDir, current = rootDir, files = []) {
  const entries = fileSystem
    .readdirSync(current, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const candidate = path.join(current, entry.name);
    const stat = fileSystem.lstatSync(candidate);
    let canonical;
    try {
      canonical = fileSystem.realpathSync(candidate);
    } catch {
      throw new Error(
        'Local training runtime closure contains an inaccessible path.',
      );
    }
    if (
      stat.isSymbolicLink() ||
      !isWithin(rootDir, canonical) ||
      !isTrustedMode(stat)
    ) {
      throw new Error(
        'Local training runtime closure rejects symbolic links and path escapes.',
      );
    }
    if (stat.isDirectory()) {
      listRuntimeFiles(fileSystem, rootDir, canonical, files);
      continue;
    }
    if (
      !stat.isFile() ||
      stat.nlink !== 1 ||
      stat.size <= 0 ||
      stat.size > MAX_FILE_BYTES
    ) {
      throw new Error(
        'Local training runtime closure accepts only bounded regular files.',
      );
    }
    files.push(path.relative(rootDir, canonical).split(path.sep).join('/'));
    if (files.length > MAX_RUNTIME_FILES) {
      throw new Error(
        'Local training runtime closure exceeds its file boundary.',
      );
    }
  }
  return files.sort();
}

function sanitizePythonSource(content, relativePath) {
  const source = content.toString('utf8');
  if (source.includes('\0')) {
    throw new Error(
      `Local training runtime closure module ${relativePath} is not supported.`,
    );
  }
  let sanitized = '';
  let index = 0;
  while (index < source.length) {
    const character = source[index];
    if (character === '#') {
      while (index < source.length && source[index] !== '\n') {
        sanitized += ' ';
        index += 1;
      }
      continue;
    }
    if (character === '"' || character === "'") {
      const sourcePrefix = source.slice(Math.max(0, index - 3), index);
      if (/(?:^|[^a-zA-Z0-9_])(?:f|fr|rf)$/iu.test(sourcePrefix)) {
        throw new Error(
          `Local training runtime closure module ${relativePath} must not use formatted strings.`,
        );
      }
      const quote = character;
      const triple = source.slice(index, index + 3) === quote.repeat(3);
      const width = triple ? 3 : 1;
      sanitized += ' '.repeat(width);
      index += width;
      let closed = false;
      while (index < source.length) {
        if (source[index] === '\\') {
          sanitized += ' ';
          index += 1;
          if (index < source.length) {
            sanitized += source[index] === '\n' ? '\n' : ' ';
            index += 1;
          }
          continue;
        }
        if (source.slice(index, index + width) === quote.repeat(width)) {
          sanitized += ' '.repeat(width);
          index += width;
          closed = true;
          break;
        }
        sanitized += source[index] === '\n' ? '\n' : ' ';
        index += 1;
      }
      if (!closed) {
        throw new Error(
          `Local training runtime closure module ${relativePath} has unterminated source text.`,
        );
      }
      continue;
    }
    sanitized += character;
    index += 1;
  }
  return sanitized;
}

function parseImportedModules(file, allowedImportRoots) {
  const source = sanitizePythonSource(file.content, file.path);
  for (const [label, pattern] of UNSUPPORTED_SOURCE_PATTERNS) {
    if (pattern.test(source)) {
      throw new Error(
        `Local training runtime closure module ${file.path} uses unsupported ${label}.`,
      );
    }
  }

  const modules = [];
  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    if (/\bimport\b/u.test(line)) {
      const direct = /^import\s+([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)$/u.exec(line);
      const from = /^from\s+([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)\s+import\s+[a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*$/u.exec(line);
      const moduleName = direct?.[1] || from?.[1];
      if (!moduleName) {
        throw new Error(
          `Local training runtime closure module ${file.path} has unsupported import syntax.`,
        );
      }
      if (!allowedImportRoots.includes(moduleName.split('.')[0])) {
        throw new Error(
          `Local training runtime closure import ${moduleName} is outside the allowed package roots.`,
        );
      }
      modules.push(moduleName);
    }
  }
  return [...new Set(modules)].sort();
}

function resolveModuleFiles(moduleName, availableModules) {
  const segments = moduleName.split('.');
  const resolved = [];
  for (let index = 1; index < segments.length; index += 1) {
    const packagePath = `${segments.slice(0, index).join('/')}/__init__.py`;
    if (availableModules.has(packagePath)) {
      resolved.push(packagePath);
    }
  }
  const modulePath = `${segments.join('/')}.py`;
  const packagePath = `${segments.join('/')}/__init__.py`;
  if (availableModules.has(modulePath)) {
    resolved.push(modulePath);
  } else if (availableModules.has(packagePath)) {
    resolved.push(packagePath);
  } else {
    throw new Error(
      `Local training runtime closure import ${moduleName} is outside the declared runtime.`,
    );
  }
  return resolved;
}

function inspectRuntime({
  allowedImportRoots,
  entryPath,
  fileSystem = fs,
  interpreterPath,
  rootDir,
} = {}) {
  const canonicalRoot = requireRoot(fileSystem, rootDir);
  if (
    !Array.isArray(allowedImportRoots) ||
    allowedImportRoots.length === 0 ||
    allowedImportRoots.length > 32 ||
    allowedImportRoots.some(
      (moduleName) => !/^[a-zA-Z_]\w*$/u.test(moduleName),
    ) ||
    new Set(allowedImportRoots).size !== allowedImportRoots.length ||
    JSON.stringify(allowedImportRoots) !==
      JSON.stringify([...allowedImportRoots].sort())
  ) {
    throw new Error(
      'Local training runtime closure allowedImportRoots must be sorted package names.',
    );
  }
  const normalizedEntryPath = requireRelativePath(entryPath, 'entryPath');
  const normalizedInterpreterPath = requireRelativePath(
    interpreterPath,
    'interpreterPath',
  );
  if (normalizedEntryPath === normalizedInterpreterPath) {
    throw new Error(
      'Local training runtime closure entrypoint and interpreter must differ.',
    );
  }

  const inventory = listRuntimeFiles(fileSystem, canonicalRoot);
  if (
    !inventory.includes(normalizedEntryPath) ||
    !inventory.includes(normalizedInterpreterPath)
  ) {
    throw new Error(
      'Local training runtime closure entrypoint and interpreter must be inventoried.',
    );
  }
  if (inventory.some((relativePath) =>
    UNSUPPORTED_FILE_SUFFIXES.some((suffix) => relativePath.endsWith(suffix)) ||
    relativePath.split('/').includes('__pycache__') ||
    ['sitecustomize.py', 'usercustomize.py'].includes(
      path.posix.basename(relativePath),
    ))) {
    throw new Error(
      'Local training runtime closure rejects native, cached, and archive loading.',
    );
  }

  const inspected = inventory.map((relativePath) =>
    readContainedFile(fileSystem, canonicalRoot, relativePath));
  const files = inspected.map((file) => {
    let kind = 'module';
    if (file.path === normalizedInterpreterPath) {
      kind = 'interpreter';
    } else if (file.path === normalizedEntryPath) {
      kind = 'entrypoint';
    } else if (!file.path.endsWith('.py')) {
      throw new Error(
        `Local training runtime closure file ${file.path} has an unsupported role.`,
      );
    }
    return {
      byteLength: file.byteLength,
      kind,
      path: file.path,
      sha256: file.sha256,
    };
  });
  const interpreter = inspected.find(
    (file) => file.path === normalizedInterpreterPath,
  );
  const entrypoint = inspected.find(
    (file) => file.path === normalizedEntryPath,
  );
  if (
    !normalizedEntryPath.endsWith('.py') ||
    normalizedInterpreterPath.endsWith('.py')
  ) {
    throw new Error(
      'Local training runtime closure requires a Python entrypoint and a separate interpreter.',
    );
  }
  for (const executable of [interpreter, entrypoint]) {
    const stat = fileSystem.lstatSync(
      path.join(canonicalRoot, executable.path),
    );
    if ((stat.mode & 0o111) === 0) {
      throw new Error(
        `Local training runtime closure file ${executable.path} must be executable.`,
      );
    }
  }

  const sourceFiles = new Map(
    inspected
      .filter((file) => file.path.endsWith('.py'))
      .map((file) => [file.path, file]),
  );
  const graph = new Map();
  const pending = [normalizedEntryPath];
  while (pending.length > 0) {
    const sourcePath = pending.shift();
    if (graph.has(sourcePath)) {
      continue;
    }
    const sourceFile = sourceFiles.get(sourcePath);
    if (!sourceFile) {
      throw new Error(
        'Local training runtime closure references a missing module.',
      );
    }
    const imports = parseImportedModules(
      sourceFile,
      allowedImportRoots,
    )
      .flatMap((moduleName) => resolveModuleFiles(moduleName, sourceFiles))
      .filter((importedPath) => importedPath !== sourcePath);
    const uniqueImports = [...new Set(imports)].sort();
    graph.set(sourcePath, uniqueImports);
    pending.push(...uniqueImports.filter((importedPath) => !graph.has(importedPath)));
  }
  const unreachable = [...sourceFiles.keys()]
    .filter((sourcePath) => !graph.has(sourcePath))
    .sort();
  if (unreachable.length > 0) {
    throw new Error(
      'Local training runtime closure contains unreachable Python modules.',
    );
  }

  const byteLength = files.reduce(
    (total, file) => total + file.byteLength,
    0,
  );
  if (byteLength <= 0 || byteLength > MAX_RUNTIME_BYTES) {
    throw new Error(
      'Local training runtime closure exceeds its byte boundary.',
    );
  }
  const closureContent = {
    byteLength,
    entryPath: normalizedEntryPath,
    fileCount: files.length,
    files,
    importGraph: [...graph.entries()]
      .sort(([left], [right]) => comparePaths(left, right))
      .map(([sourcePath, imports]) => ({
        imports,
        path: sourcePath,
      })),
    interpreterPath: normalizedInterpreterPath,
  };
  const content = {
    closure: {
      ...closureContent,
      artifactSetSha256: hashRecord(closureContent),
    },
    policy: {
      allowedImportRoots: [...allowedImportRoots],
      ambientEnvironmentInheritance: 'not-inherited-by-adapter',
      archiveLoading: 'rejected-by-inventory',
      dynamicImportAnalysis:
        'known-constructs-rejected-static-fixture-only',
      nativeExtensionLoading: 'rejected-by-inventory',
      pathEscape: 'rejected-by-contained-inventory',
    },
    schemaVersion:
      LOCAL_TRAINING_RUNTIME_CLOSURE_PROVENANCE_SCHEMA_VERSION,
  };
  return {
    ...content,
    provenanceHash: hashRecord(content),
  };
}

export function assertLocalTrainingRuntimeClosureProvenance(provenance) {
  if (
    !hasExactKeys(provenance, [
      'closure',
      'policy',
      'provenanceHash',
      'schemaVersion',
    ]) ||
    !hasExactKeys(provenance.closure, [
      'artifactSetSha256',
      'byteLength',
      'entryPath',
      'fileCount',
      'files',
      'importGraph',
      'interpreterPath',
    ]) ||
    !hasExactKeys(provenance.policy, [
      'allowedImportRoots',
      'ambientEnvironmentInheritance',
      'archiveLoading',
      'dynamicImportAnalysis',
      'nativeExtensionLoading',
      'pathEscape',
    ]) ||
    provenance.schemaVersion !==
      LOCAL_TRAINING_RUNTIME_CLOSURE_PROVENANCE_SCHEMA_VERSION ||
    !Array.isArray(provenance.policy.allowedImportRoots) ||
    provenance.policy.allowedImportRoots.length === 0 ||
    provenance.policy.allowedImportRoots.length > 32 ||
    provenance.policy.allowedImportRoots.some(
      (moduleName) => !/^[a-zA-Z_]\w*$/u.test(moduleName),
    ) ||
    new Set(provenance.policy.allowedImportRoots).size !==
      provenance.policy.allowedImportRoots.length ||
    JSON.stringify(provenance.policy.allowedImportRoots) !==
      JSON.stringify([...provenance.policy.allowedImportRoots].sort()) ||
    provenance.policy.ambientEnvironmentInheritance !==
      'not-inherited-by-adapter' ||
    provenance.policy.archiveLoading !== 'rejected-by-inventory' ||
    provenance.policy.dynamicImportAnalysis !==
      'known-constructs-rejected-static-fixture-only' ||
    provenance.policy.nativeExtensionLoading !==
      'rejected-by-inventory' ||
    provenance.policy.pathEscape !==
      'rejected-by-contained-inventory' ||
    !isSha256(provenance.provenanceHash) ||
    !isSha256(provenance.closure.artifactSetSha256) ||
    !Array.isArray(provenance.closure.files) ||
    !Array.isArray(provenance.closure.importGraph) ||
    provenance.closure.files.length === 0 ||
    provenance.closure.files.length > MAX_RUNTIME_FILES ||
    provenance.closure.fileCount !== provenance.closure.files.length ||
    !Number.isSafeInteger(provenance.closure.byteLength) ||
    provenance.closure.byteLength <= 0 ||
    provenance.closure.byteLength > MAX_RUNTIME_BYTES
  ) {
    throw new Error(
      'Local training runtime closure provenance failed: integrity.',
    );
  }

  const paths = [];
  let totalBytes = 0;
  let entrypoint;
  let interpreter;
  for (const file of provenance.closure.files) {
    if (
      !hasExactKeys(file, ['byteLength', 'kind', 'path', 'sha256']) ||
      !Number.isSafeInteger(file.byteLength) ||
      file.byteLength <= 0 ||
      file.byteLength > MAX_FILE_BYTES ||
      !['entrypoint', 'interpreter', 'module'].includes(file.kind) ||
      requireRelativePath(file.path, 'provenance file path') !== file.path ||
      UNSUPPORTED_FILE_SUFFIXES.some(
        (suffix) => file.path.endsWith(suffix),
      ) ||
      file.path.split('/').includes('__pycache__') ||
      ['sitecustomize.py', 'usercustomize.py'].includes(
        path.posix.basename(file.path),
      ) ||
      !isSha256(file.sha256)
    ) {
      throw new Error(
        'Local training runtime closure provenance failed: file-integrity.',
      );
    }
    paths.push(file.path);
    totalBytes += file.byteLength;
    if (file.path === provenance.closure.entryPath) {
      entrypoint = file;
    }
    if (file.path === provenance.closure.interpreterPath) {
      interpreter = file;
    }
  }
  const sourcePaths = new Set(
    provenance.closure.files
      .filter((file) => ['entrypoint', 'module'].includes(file.kind))
      .map((file) => file.path),
  );
  if (
    provenance.closure.files.filter(
      (file) => file.kind === 'entrypoint',
    ).length !== 1 ||
    provenance.closure.files.filter(
      (file) => file.kind === 'interpreter',
    ).length !== 1 ||
    provenance.closure.files.some(
      (file) =>
        (file.kind === 'entrypoint' &&
          file.path !== provenance.closure.entryPath) ||
        (file.kind === 'interpreter' &&
          file.path !== provenance.closure.interpreterPath),
    ) ||
    !provenance.closure.entryPath.endsWith('.py') ||
    provenance.closure.interpreterPath.endsWith('.py') ||
    provenance.closure.files.some((file) =>
      file.kind === 'module' &&
      (!file.path.endsWith('.py') ||
        !provenance.policy.allowedImportRoots.includes(
          file.path.split('/')[0],
        )))
  ) {
    throw new Error(
      'Local training runtime closure provenance failed: role-integrity.',
    );
  }
  const graphPaths = [];
  for (const edge of provenance.closure.importGraph) {
    if (
      !hasExactKeys(edge, ['imports', 'path']) ||
      !sourcePaths.has(edge.path) ||
      !Array.isArray(edge.imports) ||
      edge.imports.some((importedPath) => !sourcePaths.has(importedPath)) ||
      JSON.stringify(edge.imports) !==
        JSON.stringify([...edge.imports].sort()) ||
      new Set(edge.imports).size !== edge.imports.length
    ) {
      throw new Error(
        'Local training runtime closure provenance failed: graph-integrity.',
      );
    }
    graphPaths.push(edge.path);
  }
  const closureContent = {
    byteLength: provenance.closure.byteLength,
    entryPath: provenance.closure.entryPath,
    fileCount: provenance.closure.fileCount,
    files: provenance.closure.files,
    importGraph: provenance.closure.importGraph,
    interpreterPath: provenance.closure.interpreterPath,
  };
  const content = {
    closure: provenance.closure,
    policy: provenance.policy,
    schemaVersion: provenance.schemaVersion,
  };
  const reachablePaths = new Set([provenance.closure.entryPath]);
  const pendingPaths = [provenance.closure.entryPath];
  const graph = new Map(
    provenance.closure.importGraph.map((edge) => [edge.path, edge.imports]),
  );
  while (pendingPaths.length > 0) {
    const sourcePath = pendingPaths.shift();
    for (const importedPath of graph.get(sourcePath) || []) {
      if (!reachablePaths.has(importedPath)) {
        reachablePaths.add(importedPath);
        pendingPaths.push(importedPath);
      }
    }
  }
  if (
    new Set(paths).size !== paths.length ||
    JSON.stringify(paths) !== JSON.stringify([...paths].sort()) ||
    totalBytes !== provenance.closure.byteLength ||
    entrypoint?.kind !== 'entrypoint' ||
    interpreter?.kind !== 'interpreter' ||
    new Set(graphPaths).size !== graphPaths.length ||
    JSON.stringify(graphPaths) !== JSON.stringify([...sourcePaths].sort()) ||
    reachablePaths.size !== sourcePaths.size ||
    provenance.closure.artifactSetSha256 !== hashRecord(closureContent) ||
    provenance.provenanceHash !== hashRecord(content)
  ) {
    throw new Error(
      'Local training runtime closure provenance failed: closure-integrity.',
    );
  }
  return provenance;
}

export function describeLocalTrainingRuntimeClosure(definition) {
  return assertLocalTrainingRuntimeClosureProvenance(
    inspectRuntime(definition),
  );
}

export function assertCurrentLocalTrainingRuntimeClosure({
  definition,
  expectedProvenance,
} = {}) {
  assertLocalTrainingRuntimeClosureProvenance(expectedProvenance);
  const current = describeLocalTrainingRuntimeClosure(definition);
  if (JSON.stringify(current) !== JSON.stringify(expectedProvenance)) {
    throw new Error(
      'Local training runtime closure provenance failed: current-binding.',
    );
  }
  return current;
}
