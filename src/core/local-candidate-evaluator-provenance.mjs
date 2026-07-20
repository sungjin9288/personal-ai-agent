import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const LOCAL_CANDIDATE_EVALUATOR_PROVENANCE_SCHEMA_VERSION =
  'personal-ai-agent-local-candidate-evaluator-provenance/v1';

const MAX_BUNDLE_BYTES = 4 * 1024 * 1024;
const MAX_BUNDLE_FILES = 64;
const MAX_EXECUTABLE_BYTES = 512 * 1024 * 1024;

function hashValue(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hashRecord(value) {
  return hashValue(JSON.stringify(value));
}

function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
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

function assertFileSystem(fileSystem) {
  const methods = [
    'lstatSync',
    'mkdirSync',
    'readFileSync',
    'realpathSync',
    'writeFileSync',
  ];
  if (
    !fileSystem ||
    methods.some(
      (method) => typeof fileSystem[method] !== 'function',
    )
  ) {
    throw new Error(
      'Local candidate evaluator provenance requires a filesystem.',
    );
  }
}

function requireDirectory(fileSystem, value, fieldName) {
  let canonical;
  let stat;
  try {
    stat = fileSystem.lstatSync(path.resolve(value));
    canonical = fileSystem.realpathSync(path.resolve(value));
  } catch {
    throw new Error(
      `Local candidate evaluator provenance ${fieldName} must exist.`,
    );
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(
      `Local candidate evaluator provenance ${fieldName} must be a regular directory.`,
    );
  }
  return canonical;
}

function readContainedFile({
  budget,
  fileSystem,
  rootDir,
  source,
  fieldName,
}) {
  let canonical;
  let stat;
  try {
    stat = fileSystem.lstatSync(source);
    canonical = fileSystem.realpathSync(source);
  } catch {
    throw new Error(
      `Local candidate evaluator provenance ${fieldName} must exist.`,
    );
  }
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    !isWithin(rootDir, canonical)
  ) {
    throw new Error(
      `Local candidate evaluator provenance ${fieldName} must be a contained regular file.`,
    );
  }
  const relativePath = path
    .relative(rootDir, canonical)
    .split(path.sep)
    .join('/');
  if (stat.size <= 0 || stat.size > MAX_BUNDLE_BYTES) {
    throw new Error(
      `Local candidate evaluator provenance ${fieldName} exceeds the byte boundary.`,
    );
  }
  if (!budget.paths.has(relativePath)) {
    if (
      budget.paths.size >= MAX_BUNDLE_FILES ||
      budget.byteLength + stat.size > MAX_BUNDLE_BYTES
    ) {
      throw new Error(
        'Local candidate evaluator bundle exceeds its boundary.',
      );
    }
    budget.paths.add(relativePath);
    budget.byteLength += stat.size;
  }
  const content = fileSystem.readFileSync(canonical);
  if (
    content.byteLength !== stat.size ||
    content.byteLength > MAX_BUNDLE_BYTES
  ) {
    throw new Error(
      `Local candidate evaluator provenance ${fieldName} changed during inspection.`,
    );
  }
  return {
    canonical,
    content,
    relativePath,
  };
}

function readExecutable(fileSystem, command) {
  let canonical;
  let stat;
  try {
    stat = fileSystem.lstatSync(path.resolve(command));
    canonical = fileSystem.realpathSync(path.resolve(command));
  } catch {
    throw new Error(
      'Local candidate evaluator executable must exist.',
    );
  }
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    (stat.mode & 0o111) === 0
  ) {
    throw new Error(
      'Local candidate evaluator executable must be an executable regular file.',
    );
  }
  if (stat.size <= 0 || stat.size > MAX_EXECUTABLE_BYTES) {
    throw new Error(
      'Local candidate evaluator executable exceeds the byte boundary.',
    );
  }
  const content = fileSystem.readFileSync(canonical);
  if (content.byteLength !== stat.size) {
    throw new Error(
      'Local candidate evaluator executable changed during inspection.',
    );
  }
  return {
    byteLength: content.byteLength,
    pathHash: hashValue(canonical),
    sha256: hashValue(content),
  };
}

function failUnsupportedModuleSyntax(relativePath) {
  throw new Error(
    `Local candidate evaluator module ${relativePath} has unsupported import syntax.`,
  );
}

function tokenizeModuleSource(source, relativePath) {
  const tokens = [];
  let index = 0;
  while (index < source.length) {
    const character = source[index];
    const next = source[index + 1];
    if (/\s/u.test(character)) {
      index += 1;
      continue;
    }
    if (character === '/' && next === '/') {
      index += 2;
      while (
        index < source.length &&
        !['\n', '\r'].includes(source[index])
      ) {
        index += 1;
      }
      continue;
    }
    if (character === '/' && next === '*') {
      const commentEnd = source.indexOf('*/', index + 2);
      if (commentEnd === -1) {
        failUnsupportedModuleSyntax(relativePath);
      }
      index = commentEnd + 2;
      continue;
    }
    if (character === '"' || character === "'") {
      const quote = character;
      let value = '';
      index += 1;
      let closed = false;
      while (index < source.length) {
        const stringCharacter = source[index];
        if (stringCharacter === '\\') {
          value += stringCharacter;
          index += 1;
          if (index >= source.length) {
            failUnsupportedModuleSyntax(relativePath);
          }
          value += source[index];
          index += 1;
          continue;
        }
        if (stringCharacter === quote) {
          index += 1;
          closed = true;
          break;
        }
        if (
          stringCharacter === '\n' ||
          stringCharacter === '\r'
        ) {
          failUnsupportedModuleSyntax(relativePath);
        }
        value += stringCharacter;
        index += 1;
      }
      if (!closed) {
        failUnsupportedModuleSyntax(relativePath);
      }
      tokens.push({ type: 'string', value });
      continue;
    }
    if (character === '`') {
      let value = '';
      index += 1;
      let closed = false;
      while (index < source.length) {
        const templateCharacter = source[index];
        if (templateCharacter === '\\') {
          index += 2;
          continue;
        }
        if (templateCharacter === '`') {
          index += 1;
          closed = true;
          break;
        }
        value += templateCharacter;
        index += 1;
      }
      if (!closed) {
        failUnsupportedModuleSyntax(relativePath);
      }
      if (/\bimport\b/u.test(value)) {
        throw new Error(
          `Local candidate evaluator module ${relativePath} must not use dynamic import.`,
        );
      }
      tokens.push({ type: 'template', value });
      continue;
    }
    if (/[A-Za-z_$]/u.test(character)) {
      let value = character;
      index += 1;
      while (
        index < source.length &&
        /[A-Za-z0-9_$]/u.test(source[index])
      ) {
        value += source[index];
        index += 1;
      }
      tokens.push({ type: 'identifier', value });
      continue;
    }
    tokens.push({ type: 'punctuator', value: character });
    index += 1;
  }
  return tokens;
}

function readModuleSpecifier(token, relativePath) {
  if (
    token?.type !== 'string' ||
    !token.value ||
    token.value.includes('\\')
  ) {
    failUnsupportedModuleSyntax(relativePath);
  }
  return token.value;
}

function findImportedSpecifier(tokens, importIndex, relativePath) {
  const next = tokens[importIndex + 1];
  if (next?.value === '(') {
    throw new Error(
      `Local candidate evaluator module ${relativePath} must not use dynamic import.`,
    );
  }
  if (next?.value === '.') {
    if (tokens[importIndex + 2]?.value !== 'meta') {
      failUnsupportedModuleSyntax(relativePath);
    }
    return null;
  }
  if (next?.type === 'string') {
    return readModuleSpecifier(next, relativePath);
  }
  for (
    let index = importIndex + 1;
    index < tokens.length;
    index += 1
  ) {
    const token = tokens[index];
    if (
      token.value === ';' ||
      (index > importIndex + 1 &&
        ['import', 'export'].includes(token.value))
    ) {
      break;
    }
    if (
      token.type === 'identifier' &&
      token.value === 'from' &&
      tokens[index + 1]?.type === 'string'
    ) {
      return readModuleSpecifier(
        tokens[index + 1],
        relativePath,
      );
    }
  }
  failUnsupportedModuleSyntax(relativePath);
}

function findExportedSpecifier(tokens, exportIndex, relativePath) {
  const next = tokens[exportIndex + 1];
  if (next?.value === '*') {
    let index = exportIndex + 2;
    if (tokens[index]?.value === 'as') {
      index += 2;
    }
    if (
      tokens[index]?.value === 'from' &&
      tokens[index + 1]?.type === 'string'
    ) {
      return readModuleSpecifier(
        tokens[index + 1],
        relativePath,
      );
    }
    failUnsupportedModuleSyntax(relativePath);
  }
  if (next?.value !== '{') {
    return null;
  }
  let depth = 0;
  let index = exportIndex + 1;
  for (; index < tokens.length; index += 1) {
    if (tokens[index].value === '{') {
      depth += 1;
    } else if (tokens[index].value === '}') {
      depth -= 1;
      if (depth === 0) {
        index += 1;
        break;
      }
    }
  }
  if (
    tokens[index]?.value === 'from' &&
    tokens[index + 1]?.type === 'string'
  ) {
    return readModuleSpecifier(
      tokens[index + 1],
      relativePath,
    );
  }
  return null;
}

function readStaticImports(content, relativePath) {
  const tokens = tokenizeModuleSource(
    content.toString('utf8'),
    relativePath,
  );
  const specifiers = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (
      token.type !== 'identifier' ||
      !['import', 'export'].includes(token.value)
    ) {
      continue;
    }
    const specifier =
      token.value === 'import'
        ? findImportedSpecifier(tokens, index, relativePath)
        : findExportedSpecifier(tokens, index, relativePath);
    if (specifier) {
      specifiers.push(specifier);
    }
  }
  return specifiers;
}

function resolveLocalModule({
  budget,
  fileSystem,
  rootDir,
  sourceFile,
  specifier,
}) {
  if (specifier.startsWith('node:')) {
    return null;
  }
  if (
    !specifier.startsWith('./') &&
    !specifier.startsWith('../')
  ) {
    throw new Error(
      `Local candidate evaluator module ${sourceFile.relativePath} has an unsupported import ${specifier}.`,
    );
  }
  const target = path.resolve(
    path.dirname(sourceFile.canonical),
    specifier,
  );
  return readContainedFile({
    budget,
    fieldName: `module import ${specifier}`,
    fileSystem,
    rootDir,
    source: target,
  });
}

function inspectBundle({
  assetPaths = [],
  command,
  entryPath,
  fileSystem = fs,
  rootDir,
} = {}) {
  assertFileSystem(fileSystem);
  const canonicalRoot = requireDirectory(
    fileSystem,
    rootDir,
    'rootDir',
  );
  if (
    !Array.isArray(assetPaths) ||
    assetPaths.length > MAX_BUNDLE_FILES - 1
  ) {
    throw new Error(
      'Local candidate evaluator bundle exceeds the file boundary.',
    );
  }
  const budget = {
    byteLength: 0,
    paths: new Set(),
  };
  const entryFile = readContainedFile({
    budget,
    fieldName: 'entryPath',
    fileSystem,
    rootDir: canonicalRoot,
    source: path.resolve(canonicalRoot, entryPath),
  });
  if (!entryFile.relativePath.endsWith('.mjs')) {
    throw new Error(
      'Local candidate evaluator entryPath must be an ESM module.',
    );
  }

  const modules = new Map();
  const pending = [entryFile];
  while (pending.length > 0) {
    const sourceFile = pending.shift();
    if (modules.has(sourceFile.relativePath)) {
      continue;
    }
    if (modules.size >= MAX_BUNDLE_FILES) {
      throw new Error(
        'Local candidate evaluator bundle exceeds the file boundary.',
      );
    }
    modules.set(sourceFile.relativePath, sourceFile);
    for (const specifier of readStaticImports(
      sourceFile.content,
      sourceFile.relativePath,
    )) {
      const imported = resolveLocalModule({
        budget,
        fileSystem,
        rootDir: canonicalRoot,
        sourceFile,
        specifier,
      });
      if (imported && !modules.has(imported.relativePath)) {
        pending.push(imported);
      }
    }
  }

  if (
    assetPaths.length > MAX_BUNDLE_FILES - modules.size
  ) {
    throw new Error(
      'Local candidate evaluator bundle exceeds the file boundary.',
    );
  }
  const resources = new Map();
  for (const assetPath of assetPaths) {
    const resource = readContainedFile({
      budget,
      fieldName: `asset ${assetPath}`,
      fileSystem,
      rootDir: canonicalRoot,
      source: path.resolve(canonicalRoot, assetPath),
    });
    if (
      modules.has(resource.relativePath) ||
      resources.has(resource.relativePath)
    ) {
      throw new Error(
        'Local candidate evaluator bundle paths must be unique.',
      );
    }
    resources.set(resource.relativePath, resource);
  }

  const sourceFiles = [
    ...[...modules.values()].map((file) => ({
      ...file,
      kind: 'module',
    })),
    ...[...resources.values()].map((file) => ({
      ...file,
      kind: 'resource',
    })),
  ].sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath),
  );
  if (sourceFiles.length > MAX_BUNDLE_FILES) {
    throw new Error(
      'Local candidate evaluator bundle exceeds the file boundary.',
    );
  }
  const files = sourceFiles.map((file) => ({
    byteLength: file.content.byteLength,
    kind: file.kind,
    path: file.relativePath,
    sha256: hashValue(file.content),
  }));
  const byteLength = files.reduce(
    (total, file) => total + file.byteLength,
    0,
  );
  if (byteLength <= 0 || byteLength > MAX_BUNDLE_BYTES) {
    throw new Error(
      'Local candidate evaluator bundle exceeds the byte boundary.',
    );
  }
  const bundleContent = {
    byteLength,
    entryPath: entryFile.relativePath,
    fileCount: files.length,
    files,
  };
  const provenance = {
    bundle: {
      ...bundleContent,
      artifactSetSha256: hashRecord(bundleContent),
    },
    executable: readExecutable(fileSystem, command),
    schemaVersion:
      LOCAL_CANDIDATE_EVALUATOR_PROVENANCE_SCHEMA_VERSION,
  };
  return {
    canonicalRoot,
    provenance,
    sourceFiles,
  };
}

export function assertLocalCandidateEvaluatorProvenance(
  provenance,
) {
  if (
    !hasExactKeys(provenance, [
      'bundle',
      'executable',
      'schemaVersion',
    ]) ||
    !hasExactKeys(provenance.bundle, [
      'artifactSetSha256',
      'byteLength',
      'entryPath',
      'fileCount',
      'files',
    ]) ||
    !hasExactKeys(provenance.executable, [
      'byteLength',
      'pathHash',
      'sha256',
    ]) ||
    provenance.schemaVersion !==
      LOCAL_CANDIDATE_EVALUATOR_PROVENANCE_SCHEMA_VERSION ||
    !Array.isArray(provenance.bundle.files) ||
    provenance.bundle.files.length === 0 ||
    provenance.bundle.files.length > MAX_BUNDLE_FILES ||
    provenance.bundle.fileCount !==
      provenance.bundle.files.length ||
    !Number.isSafeInteger(provenance.bundle.byteLength) ||
    provenance.bundle.byteLength <= 0 ||
    provenance.bundle.byteLength > MAX_BUNDLE_BYTES ||
    !Number.isSafeInteger(provenance.executable.byteLength) ||
    provenance.executable.byteLength <= 0 ||
    provenance.executable.byteLength > MAX_EXECUTABLE_BYTES ||
    !isSha256(provenance.executable.pathHash) ||
    !isSha256(provenance.executable.sha256)
  ) {
    throw new Error(
      'Local candidate evaluator provenance failed: integrity.',
    );
  }
  const paths = [];
  let byteLength = 0;
  let entryFile;
  for (const file of provenance.bundle.files) {
    if (
      !hasExactKeys(file, [
        'byteLength',
        'kind',
        'path',
        'sha256',
      ]) ||
      !Number.isSafeInteger(file.byteLength) ||
      file.byteLength <= 0 ||
      !['module', 'resource'].includes(file.kind) ||
      typeof file.path !== 'string' ||
      !file.path ||
      path.isAbsolute(file.path) ||
      path.posix.isAbsolute(file.path) ||
      path.posix.normalize(file.path) !== file.path ||
      file.path.includes('\\') ||
      file.path.split('/').includes('..') ||
      !isSha256(file.sha256)
    ) {
      throw new Error(
        'Local candidate evaluator provenance failed: file-integrity.',
      );
    }
    paths.push(file.path);
    byteLength += file.byteLength;
    if (file.path === provenance.bundle.entryPath) {
      entryFile = file;
    }
  }
  const bundleContent = {
    byteLength: provenance.bundle.byteLength,
    entryPath: provenance.bundle.entryPath,
    fileCount: provenance.bundle.fileCount,
    files: provenance.bundle.files,
  };
  if (
    new Set(paths).size !== paths.length ||
    JSON.stringify(paths) !==
      JSON.stringify([...paths].sort()) ||
    typeof provenance.bundle.entryPath !== 'string' ||
    !provenance.bundle.entryPath.endsWith('.mjs') ||
    entryFile?.kind !== 'module' ||
    byteLength !== provenance.bundle.byteLength ||
    provenance.bundle.artifactSetSha256 !==
      hashRecord(bundleContent)
  ) {
    throw new Error(
      'Local candidate evaluator provenance failed: bundle-integrity.',
    );
  }
  return provenance;
}

export function describeLocalCandidateEvaluator(
  definition,
) {
  const { provenance } = inspectBundle(definition);
  return assertLocalCandidateEvaluatorProvenance(provenance);
}

export function assertCurrentLocalCandidateEvaluator({
  definition,
  expectedProvenance,
} = {}) {
  assertLocalCandidateEvaluatorProvenance(
    expectedProvenance,
  );
  const current = describeLocalCandidateEvaluator(definition);
  if (
    JSON.stringify(current) !==
    JSON.stringify(expectedProvenance)
  ) {
    throw new Error(
      'Local candidate evaluator provenance failed: current-binding.',
    );
  }
  return current;
}

export function copyLocalCandidateEvaluatorBundle({
  definition,
  destinationRoot,
  expectedProvenance,
  fileSystem = fs,
} = {}) {
  const inspected = inspectBundle({
    ...definition,
    fileSystem,
  });
  assertLocalCandidateEvaluatorProvenance(
    expectedProvenance,
  );
  if (
    JSON.stringify(inspected.provenance) !==
    JSON.stringify(expectedProvenance)
  ) {
    throw new Error(
      'Local candidate evaluator provenance failed: copy-binding.',
    );
  }
  fileSystem.mkdirSync(destinationRoot, {
    mode: 0o700,
    recursive: true,
  });
  for (const sourceFile of inspected.sourceFiles) {
    const destination = path.resolve(
      destinationRoot,
      sourceFile.relativePath,
    );
    if (!isWithin(path.resolve(destinationRoot), destination)) {
      throw new Error(
        'Local candidate evaluator snapshot destination escaped its root.',
      );
    }
    fileSystem.mkdirSync(path.dirname(destination), {
      mode: 0o700,
      recursive: true,
    });
    fileSystem.writeFileSync(destination, sourceFile.content, {
      flag: 'wx',
      mode: 0o400,
    });
  }
  return {
    definition: {
      assetPaths: expectedProvenance.bundle.files
        .filter((file) => file.kind === 'resource')
        .map((file) => file.path),
      command: definition.command,
      entryPath: expectedProvenance.bundle.entryPath,
      rootDir: destinationRoot,
    },
    entryPath: path.join(
      destinationRoot,
      ...expectedProvenance.bundle.entryPath.split('/'),
    ),
    provenance: expectedProvenance,
  };
}
