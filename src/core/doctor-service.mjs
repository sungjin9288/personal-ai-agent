import fs from 'node:fs';
import path from 'node:path';

import { createProviderRegistry } from '../providers/index.mjs';
import { listProviderSpecs } from '../providers/provider-catalog.mjs';

const MINIMUM_NODE_MAJOR = 20;

const REQUIRED_FILES = Object.freeze([
  'package.json',
  '.env.example',
  'README.md',
  'SUPPORT.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
]);

const REQUIRED_DIRECTORIES = Object.freeze([
  'src',
  'scripts',
  'docs',
]);

const RUNTIME_DIRECTORIES = Object.freeze([
  'var',
  'evidence',
  '_portfolio_export',
]);

const REQUIRED_SCRIPTS = Object.freeze([
  'bootstrap:local',
  'demo:local',
  'doctor',
  'doctor:summary',
  'smoke:doctor',
  'smoke:ui-doctor-surface',
  'smoke:env-example',
  'smoke:demo-local',
  'smoke:changelog',
  'smoke:support-policy',
  'smoke:pilot-export-package',
  'smoke:release-artifact-hygiene',
]);

export function runDoctor({ rootDir, env = process.env, nodeVersion = process.versions.node } = {}) {
  const normalizedRootDir = path.resolve(rootDir || process.cwd());
  const packageJsonPath = path.join(normalizedRootDir, 'package.json');
  const envExamplePath = path.join(normalizedRootDir, '.env.example');
  const checks = [];

  const packageJson = readJsonIfExists(packageJsonPath);
  const envExample = readTextIfExists(envExamplePath);
  const envExampleKeys = parseEnvExampleKeys(envExample);
  const providerRegistry = createProviderRegistry({ rootDir: normalizedRootDir, env });
  const providerStatuses = providerRegistry.listProviders().map((status) => ({
    configured: status.configured,
    defaultProvider: status.defaultProvider,
    displayName: status.displayName,
    id: status.id,
    implemented: status.implemented,
    missingEnv: [...status.missingEnv],
    requiredEnv: [...status.requiredEnv],
    transport: status.transport,
  }));

  addNodeVersionCheck(checks, nodeVersion);
  addPathChecks(checks, normalizedRootDir, REQUIRED_FILES, 'file', 'required-file');
  addPathChecks(checks, normalizedRootDir, REQUIRED_DIRECTORIES, 'directory', 'required-directory');
  addPathChecks(checks, normalizedRootDir, RUNTIME_DIRECTORIES, 'directory', 'runtime-directory', 'warn');
  addScriptChecks(checks, packageJson);
  addEnvExampleCoverageChecks(checks, envExampleKeys);
  addProviderChecks(checks, providerStatuses);

  const summary = summarizeChecks(checks);

  return {
    mode: 'doctor',
    ok: summary.fail === 0,
    summary,
    node: {
      minimumMajor: MINIMUM_NODE_MAJOR,
      version: nodeVersion,
    },
    providers: providerStatuses,
    checks,
  };
}

export function buildDoctorDiagnosticsSummary(doctor = {}) {
  const summary = doctor.summary || {};
  const checks = Array.isArray(doctor.checks) ? doctor.checks : [];
  const providers = Array.isArray(doctor.providers) ? doctor.providers : [];
  const attentionChecks = checks.filter((check) => ['fail', 'warn'].includes(check.status));
  const attentionLines = attentionChecks.length
    ? attentionChecks
        .slice(0, 10)
        .map(
          (check) =>
            `- [${check.status}] ${check.id || check.path || check.script || 'check'}: ${check.message || '-'}`,
        )
    : ['- none'];
  const providerLines = providers.map((provider) => {
    const missingEnv = Array.isArray(provider.missingEnv) && provider.missingEnv.length
      ? ` missingEnv=${provider.missingEnv.join(', ')}`
      : '';
    return `- ${provider.id}: ${provider.configured ? 'configured' : 'env-missing'}${missingEnv}`;
  });

  return [
    '# Personal AI Agent doctor diagnostics',
    `generatedAt: ${doctor.generatedAt || '-'}`,
    `ok: ${doctor.ok ? 'true' : 'false'}`,
    `summary: pass=${Number(summary.pass || 0)} warn=${Number(summary.warn || 0)} `
      + `fail=${Number(summary.fail || 0)} total=${Number(summary.total || 0)}`,
    '',
    'Attention checks:',
    ...attentionLines,
    '',
    'Provider env:',
    ...(providerLines.length ? providerLines : ['- none']),
    '',
    'Boundary: missing environment variable names only; secret values are not included.',
  ].join('\n');
}

function addNodeVersionCheck(checks, nodeVersion) {
  const major = Number.parseInt(String(nodeVersion || '').split('.')[0], 10);
  const pass = Number.isFinite(major) && major >= MINIMUM_NODE_MAJOR;
  checks.push({
    id: 'node-version',
    status: pass ? 'pass' : 'fail',
    message: pass
      ? `Node.js ${nodeVersion} satisfies the minimum local runtime version.`
      : `Node.js ${nodeVersion || '<unknown>'} is below the minimum supported local runtime version.`,
    expected: `>=${MINIMUM_NODE_MAJOR}.0.0`,
    actual: nodeVersion || '',
  });
}

function addPathChecks(checks, rootDir, relativePaths, kind, idPrefix, missingStatus = 'fail') {
  for (const relativePath of relativePaths) {
    const absolutePath = path.join(rootDir, relativePath);
    const exists = fs.existsSync(absolutePath);
    const matchesKind = exists && (kind === 'file' ? fs.statSync(absolutePath).isFile() : fs.statSync(absolutePath).isDirectory());
    checks.push({
      id: `${idPrefix}:${relativePath}`,
      status: matchesKind ? 'pass' : missingStatus,
      message: matchesKind
        ? `${relativePath} is present.`
        : `${relativePath} is missing or is not a ${kind}.`,
      path: relativePath,
    });
  }
}

function addScriptChecks(checks, packageJson) {
  const scripts = packageJson?.scripts && typeof packageJson.scripts === 'object' ? packageJson.scripts : {};
  for (const scriptName of REQUIRED_SCRIPTS) {
    checks.push({
      id: `script:${scriptName}`,
      status: scripts[scriptName] ? 'pass' : 'fail',
      message: scripts[scriptName]
        ? `npm script ${scriptName} is registered.`
        : `npm script ${scriptName} is not registered.`,
      script: scriptName,
    });
  }
}

function addEnvExampleCoverageChecks(checks, envExampleKeys) {
  const providerEnvKeys = new Set();
  for (const spec of listProviderSpecs()) {
    for (const key of [...spec.requiredEnv, ...spec.optionalEnv]) {
      providerEnvKeys.add(key);
    }
  }

  const missingProviderEnvKeys = [...providerEnvKeys].filter((key) => !envExampleKeys.has(key)).sort();
  checks.push({
    id: 'env-example:provider-coverage',
    status: missingProviderEnvKeys.length === 0 ? 'pass' : 'fail',
    message: missingProviderEnvKeys.length === 0
      ? '.env.example documents all provider catalog environment keys.'
      : `.env.example is missing provider environment keys: ${missingProviderEnvKeys.join(', ')}`,
    missingEnv: missingProviderEnvKeys,
  });
}

function addProviderChecks(checks, providerStatuses) {
  const stub = providerStatuses.find((status) => status.id === 'stub');
  checks.push({
    id: 'provider:stub',
    status: stub?.implemented && stub?.configured ? 'pass' : 'fail',
    message: stub?.implemented && stub?.configured
      ? 'Stub provider is available for credential-free local replay.'
      : 'Stub provider is not available for credential-free local replay.',
  });

  for (const status of providerStatuses.filter((providerStatus) => providerStatus.id !== 'stub')) {
    checks.push({
      id: `provider:${status.id}:configuration`,
      status: status.configured ? 'pass' : 'warn',
      message: status.configured
        ? `${status.displayName} provider has required environment keys present.`
        : `${status.displayName} provider is not configured; missing required environment keys are listed by name only.`,
      missingEnv: status.missingEnv,
    });
  }
}

function summarizeChecks(checks) {
  return checks.reduce(
    (summary, check) => ({
      ...summary,
      [check.status]: (summary[check.status] || 0) + 1,
      total: summary.total + 1,
    }),
    { fail: 0, pass: 0, total: 0, warn: 0 },
  );
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readTextIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function parseEnvExampleKeys(text) {
  return new Set(
    String(text || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => line.slice(0, line.indexOf('='))),
  );
}
