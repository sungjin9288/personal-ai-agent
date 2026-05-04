import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const outputPath = path.join(docsDir, 'production-enterprise-controls-v1.md');

const ENTERPRISE_CONTROL_COMMANDS = [
  {
    command: 'npm run smoke:web-auth-rbac',
    script: 'smoke:web-auth-rbac',
  },
  {
    command: 'npm run smoke:web-oidc-rbac',
    script: 'smoke:web-oidc-rbac',
  },
  {
    command: 'npm run smoke:web-rbac',
    script: 'smoke:web-rbac',
  },
  {
    command: 'npm run smoke:release-artifact-hygiene',
    script: 'smoke:release-artifact-hygiene',
  },
  {
    command: 'npm run smoke:runtime-isolation',
    script: 'smoke:runtime-isolation',
  },
  {
    command: 'npm run smoke:production-provider-readiness',
    script: 'smoke:production-provider-readiness',
  },
];

const generatedAt = new Date().toISOString();
const sourceCommit = runGit(['rev-parse', 'HEAD']);
const sourceBranch = runGit(['branch', '--show-current']);
const releaseReadiness = readRequiredFile(path.join(docsDir, 'release-readiness-v1.md'));
const releaseLabel = extractBulletValue(releaseReadiness, 'releaseLabel');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
if (!fs.existsSync(outputPath)) {
  fs.writeFileSync(
    outputPath,
    renderPendingEnterpriseControlsMarkdown({
      generatedAt,
      releaseLabel,
      sourceBranch,
      sourceCommit,
    }),
    'utf8',
  );
}

const results = ENTERPRISE_CONTROL_COMMANDS.map(runEnterpriseControlCommand);
const failedResults = results.filter((result) => !result.ok);

fs.writeFileSync(
  outputPath,
  renderEnterpriseControlsMarkdown({
    failedResults,
    generatedAt,
    releaseLabel,
    results,
    sourceBranch,
    sourceCommit,
  }),
  'utf8',
);

console.log(
  JSON.stringify(
    {
      commandCount: results.length,
      failedCommandCount: failedResults.length,
      generatedAt,
      mode: 'production-enterprise-controls',
      ok: failedResults.length === 0,
      outputPath: path.relative(repoDir, outputPath),
      productionReadyClaim: false,
      sourceCommit,
    },
    null,
    2,
  ),
);

if (failedResults.length > 0) {
  process.exitCode = 1;
}

function runEnterpriseControlCommand({ command, script }) {
  const startedAt = Date.now();
  const result = spawnSync('npm', ['run', script], {
    cwd: repoDir,
    encoding: 'utf8',
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const durationMs = Date.now() - startedAt;
  const parsed = parseLastJson(`${result.stdout || ''}\n${result.stderr || ''}`);

  return {
    command,
    durationMs,
    exitCode: typeof result.status === 'number' ? result.status : 1,
    keySignals: extractKeySignals(script, parsed),
    ok: result.status === 0,
  };
}

function extractKeySignals(script, parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return {};
  }

  if (script === 'smoke:web-auth-rbac') {
    return pick(parsed, ['authMode', 'mode', 'roleChecks']);
  }
  if (script === 'smoke:web-oidc-rbac') {
    return pick(parsed, ['authMode', 'mode', 'roleChecks']);
  }
  if (script === 'smoke:web-rbac') {
    return pick(parsed, ['mode', 'roleChecks']);
  }
  if (script === 'smoke:release-artifact-hygiene') {
    return pick(parsed, ['machinePathFindingCount', 'scannedFileCount', 'secretFindingCount', 'verifiedCommit']);
  }
  if (script === 'smoke:runtime-isolation') {
    return pick(parsed, ['deletedRuntimeA', 'exportAFileCount', 'exportBFileCount', 'mode']);
  }
  if (script === 'smoke:production-provider-readiness') {
    return pick(parsed, ['mode', 'productionReadyClaim', 'providerCount']);
  }

  return pick(parsed, ['mode']);
}

function renderEnterpriseControlsMarkdown({
  failedResults,
  generatedAt,
  releaseLabel,
  results,
  sourceBranch,
  sourceCommit,
}) {
  const commandRows = results
    .map(
      (result) =>
        `| \`${result.command}\` | ${result.ok ? 'pass' : 'fail'} | ${result.exitCode} | ${result.durationMs} |`,
    )
    .join('\n');
  const keySignalRows = results
    .map((result) => {
      const signals = JSON.stringify(result.keySignals, null, 2)
        .split('\n')
        .map((line) => `  ${line}`)
        .join('\n');
      return `### ${result.command}\n\n\`\`\`json\n${signals.trim()}\n\`\`\``;
    })
    .join('\n\n');

  return `# Production Enterprise Controls Rehearsal v1

- status: ${failedResults.length === 0 ? 'local-enterprise-controls-current' : 'local-enterprise-controls-failed'}
- generatedAt: ${generatedAt}
- sourceBranch: ${sourceBranch}
- sourceCommit: ${sourceCommit}
- releaseLabel: ${releaseLabel}
- scope: local auth, OIDC/JWKS auth, RBAC, artifact hygiene, runtime isolation, and provider-readiness controls rehearsal
- productionReadyClaim: false
- relatedSecurity: [security-model-v1.md](security-model-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedRuntimeIsolation: [runtime-isolation-v1.md](runtime-isolation-v1.md)
- relatedProviderReadiness: [production-provider-readiness-v1.md](production-provider-readiness-v1.md)

## Decision Boundary

This rehearsal proves that local shared-secret API authentication, OIDC/JWKS bearer authentication, token-claim RBAC role mapping, local RBAC enforcement, release artifact hygiene, one-runtime-per-customer isolation, and provider-readiness blockers can be checked together before a pilot handoff.

It is not identity-backed hosted RBAC, not hosted tenant isolation, not centralized permission administration, not customer identity lifecycle evidence, and not permission to claim \`production-ready\`.

Production-ready remains blocked until the approved target environment provides identity provider integration, session lifecycle management, persistent role assignment, centralized tenant administration, tenant isolation, and audited permission changes.

## Command Matrix

| Command | Result | Exit Code | Duration Ms |
| --- | --- | ---: | ---: |
${commandRows}

## Key Signals

${keySignalRows}

## Operating Interpretation

- shared-secret web auth is only a local pilot access gate, not enterprise identity
- OIDC/JWKS web auth verifies issuer, audience, RS256 signature, expiry, and role claim mapping without storing token values
- RBAC enforcement proves route-level role boundaries locally and prevents OIDC viewer tokens from escalating through spoofed role headers, but it is not centralized permission lifecycle management
- artifact hygiene proves shareable release artifacts avoid credential and machine-local path leaks
- runtime isolation proves one-runtime-per-customer pilot separation, not hosted multi-tenant isolation
- provider readiness proves missing provider blockers remain explicit before expanding the release label

## Operator Re-Run

\`\`\`bash
npm run rehearsal:production-enterprise-controls
npm run smoke:production-enterprise-controls
\`\`\`

## Acceptance Rule

The rehearsal is acceptable only when every command passes, OIDC/JWKS token validation rejects invalid audience and header spoofing, artifact hygiene reports zero credential and machine-local path findings, and local auth/RBAC boundaries remain explicit.

The rehearsal must keep \`productionReadyClaim: false\` until the same controls are backed by an approved identity provider, audited hosted role administration, tenant isolation, and production-like deployment evidence.
`;
}

function renderPendingEnterpriseControlsMarkdown({ generatedAt, releaseLabel, sourceBranch, sourceCommit }) {
  return `# Production Enterprise Controls Rehearsal v1

- status: local-enterprise-controls-pending
- generatedAt: ${generatedAt}
- sourceBranch: ${sourceBranch}
- sourceCommit: ${sourceCommit}
- releaseLabel: ${releaseLabel}
- scope: local auth, OIDC/JWKS auth, RBAC, artifact hygiene, runtime isolation, and provider-readiness controls rehearsal
- productionReadyClaim: false

## Decision Boundary

This pending placeholder exists only so artifact hygiene and pilot export packaging can scan the enterprise controls output path while the rehearsal command matrix is executing.

It is not identity-backed hosted RBAC, not hosted tenant isolation, and not permission to claim \`production-ready\`.
`;
}

function readRequiredFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`required file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: repoDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return result.status === 0 ? String(result.stdout || '').trim() : '';
}

function parseLastJson(output) {
  const text = String(output || '').trim();
  const openIndexes = [];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '{') {
      openIndexes.push(index);
    }
  }
  for (const index of openIndexes.reverse()) {
    try {
      return JSON.parse(text.slice(index));
    } catch {
      // Continue until the last valid JSON object is found.
    }
  }
  return {};
}

function pick(source, keys) {
  return Object.fromEntries(keys.filter((key) => Object.hasOwn(source, key)).map((key) => [key, source[key]]));
}

function extractBulletValue(markdown, label) {
  const match = String(markdown || '').match(new RegExp(`^- ${escapeRegExp(label)}:\\s+(.+)$`, 'm'));
  return match ? String(match[1] || '').trim() : '';
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
