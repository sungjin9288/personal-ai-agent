import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const outputPath = path.join(docsDir, 'clean-deployment-release-v1.md');

const CLEAN_REHEARSAL_COMMANDS = [
  {
    command: 'npm run smoke:incident-slo-policy',
    script: 'smoke:incident-slo-policy',
  },
  {
    command: 'npm run smoke:identity-session-admin',
    script: 'smoke:identity-session-admin',
  },
  {
    command: 'npm run smoke:tenant-storage-admin',
    script: 'smoke:tenant-storage-admin',
  },
  {
    command: 'npm run smoke:customer-support-operations',
    script: 'smoke:customer-support-operations',
  },
  {
    command: 'npm run smoke:support-escalation-review',
    script: 'smoke:support-escalation-review',
  },
  {
    command: 'npm run smoke:target-support-architecture',
    script: 'smoke:target-support-architecture',
  },
  {
    command: 'npm run smoke:target-support-operations',
    script: 'smoke:target-support-operations',
  },
  {
    command: 'npm run smoke:secret-management',
    script: 'smoke:secret-management',
  },
  {
    command: 'npm run smoke:target-secret-manager',
    script: 'smoke:target-secret-manager',
  },
  {
    command: 'npm run smoke:observability-telemetry',
    script: 'smoke:observability-telemetry',
  },
  {
    command: 'npm run smoke:target-observability-architecture',
    script: 'smoke:target-observability-architecture',
  },
  {
    command: 'npm run smoke:target-observability-operations',
    script: 'smoke:target-observability-operations',
  },
  {
    command: 'npm run smoke:target-slo-architecture',
    script: 'smoke:target-slo-architecture',
  },
  {
    command: 'npm run smoke:target-data-lifecycle-architecture',
    script: 'smoke:target-data-lifecycle-architecture',
  },
  {
    command: 'npm run smoke:target-clean-deployment-architecture',
    script: 'smoke:target-clean-deployment-architecture',
  },
  {
    command: 'npm run smoke:target-retention-operations',
    script: 'smoke:target-retention-operations',
  },
  {
    command: 'npm run smoke:target-backup-operations',
    script: 'smoke:target-backup-operations',
  },
  {
    command: 'npm run smoke:retention-delete-policy',
    script: 'smoke:retention-delete-policy',
  },
  {
    command: 'npm run smoke:web-auth-rbac',
    script: 'smoke:web-auth-rbac',
  },
  {
    command: 'npm run smoke:target-anthropic-provider-account',
    script: 'smoke:target-anthropic-provider-account',
  },
  {
    command: 'npm run smoke:target-local-provider-architecture',
    script: 'smoke:target-local-provider-architecture',
  },
  {
    command: 'npm run smoke:target-hermes-provider-architecture',
    script: 'smoke:target-hermes-provider-architecture',
  },
  {
    command: 'npm run smoke:target-deployment-contract',
    script: 'smoke:target-deployment-contract',
  },
  {
    command: 'npm run smoke:release-artifact-hygiene',
    script: 'smoke:release-artifact-hygiene',
  },
  {
    command: 'npm run smoke:runtime-data-lifecycle',
    script: 'smoke:runtime-data-lifecycle',
  },
  {
    command: 'npm run smoke:tenant-data-lifecycle',
    script: 'smoke:tenant-data-lifecycle',
  },
  {
    command: 'npm run smoke:backup-restore-drill',
    script: 'smoke:backup-restore-drill',
  },
  {
    command: 'npm run smoke:runtime-isolation',
    script: 'smoke:runtime-isolation',
  },
  {
    command: 'npm run package:pilot-export',
    script: 'package:pilot-export',
  },
  {
    command: 'npm run smoke:pilot-export-package',
    script: 'smoke:pilot-export-package',
  },
];

const generatedAt = new Date().toISOString();
const sourceCommit = runGit(['rev-parse', 'HEAD']);
const sourceBranch = runGit(['branch', '--show-current']);
const releaseReadiness = readRequiredFile(path.join(docsDir, 'release-readiness-v1.md'));
const releaseLabel = extractBulletValue(releaseReadiness, 'releaseLabel');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-clean-deployment-'));
const checkoutDir = path.join(tempRoot, 'checkout');
fs.mkdirSync(checkoutDir, { recursive: true });

try {
  const copiedFiles = copyTrackedWorkspace({ destinationDir: checkoutDir, sourceDir: repoDir });
  const forbiddenEntries = ['.git', 'node_modules', 'var', path.join('output', 'playwright')];
  for (const entry of forbiddenEntries) {
    if (fs.existsSync(path.join(checkoutDir, entry))) {
      throw new Error(`clean deployment checkout contains forbidden entry: ${entry}`);
    }
  }

  const results = CLEAN_REHEARSAL_COMMANDS.map((definition) => runRehearsalCommand(definition, checkoutDir));
  const failedResults = results.filter((result) => !result.ok);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    renderCleanDeploymentMarkdown({
      copiedFiles,
      failedResults,
      generatedAt,
      releaseLabel,
      results,
      sourceBranch,
      sourceCommit,
    }),
    'utf8',
  );

  const summary = {
    cleanCheckoutFileCount: copiedFiles.length,
    commandCount: results.length,
    failedCommandCount: failedResults.length,
    generatedAt,
    mode: 'clean-deployment-release',
    ok: failedResults.length === 0,
    outputPath: path.relative(repoDir, outputPath),
    productionReadyClaim: false,
    sourceCommit,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (failedResults.length > 0) {
    process.exitCode = 1;
  }
} finally {
  fs.rmSync(tempRoot, { force: true, recursive: true });
}

function copyTrackedWorkspace({ destinationDir, sourceDir }) {
  const result = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    cwd: sourceDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    throw new Error(`git ls-files failed: ${result.stderr || result.stdout}`);
  }

  const relativePaths = String(result.stdout || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((filePath) => !isForbiddenPath(filePath));

  for (const relativePath of relativePaths) {
    const sourcePath = path.join(sourceDir, relativePath);
    const destinationPath = path.join(destinationDir, relativePath);
    if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
      continue;
    }
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.copyFileSync(sourcePath, destinationPath);
  }

  return relativePaths;
}

function isForbiddenPath(relativePath) {
  const normalized = String(relativePath || '').replace(/\\/g, '/');
  return (
    normalized === '.git' ||
    normalized.startsWith('.git/') ||
    normalized === 'node_modules' ||
    normalized.startsWith('node_modules/') ||
    normalized === 'var' ||
    normalized.startsWith('var/') ||
    normalized === 'output/playwright' ||
    normalized.startsWith('output/playwright/')
  );
}

function runRehearsalCommand({ command, script }, cwd) {
  const startedAt = Date.now();
  const result = spawnSync('npm', ['run', script], {
    cwd,
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

  if (script === 'smoke:incident-slo-policy') {
    return pick(parsed, ['mode', 'severityCount']);
  }
  if (script === 'smoke:identity-session-admin') {
    return pick(parsed, ['auditPacketItemCount', 'controlCount', 'mode', 'productionReadyClaim', 'sessionEventCount']);
  }
  if (script === 'smoke:tenant-storage-admin') {
    return pick(parsed, ['auditPacketItemCount', 'controlCount', 'mode', 'operationCount', 'productionReadyClaim']);
  }
  if (script === 'smoke:customer-support-operations') {
    return pick(parsed, ['intakeClassCount', 'mode', 'productionReadyClaim', 'supportRoleCount']);
  }
  if (script === 'smoke:support-escalation-review') {
    return pick(parsed, ['auditPacketItemCount', 'escalationRouteCount', 'mode', 'productionReadyClaim', 'reviewCadenceCount']);
  }
  if (script === 'smoke:target-support-architecture') {
    return pick(parsed, ['areaCount', 'mode', 'productionReadyClaim', 'targetSupportApproved']);
  }
  if (script === 'smoke:target-support-operations') {
    return pick(parsed, ['controlCount', 'mode', 'productionReadyClaim', 'supportPacketItemCount']);
  }
  if (script === 'smoke:secret-management') {
    return pick(parsed, ['injectionRuleCount', 'mode', 'productionReadyClaim', 'secretClassCount']);
  }
  if (script === 'smoke:target-secret-manager') {
    return pick(parsed, ['controlCount', 'mode', 'productionReadyClaim', 'rotationPacketItemCount']);
  }
  if (script === 'smoke:observability-telemetry') {
    return pick(parsed, ['alertTriggerCount', 'mode', 'productionReadyClaim', 'telemetrySignalCount']);
  }
  if (script === 'smoke:target-observability-architecture') {
    return pick(parsed, ['areaCount', 'mode', 'productionReadyClaim', 'targetObservabilityApproved']);
  }
  if (script === 'smoke:target-observability-operations') {
    return pick(parsed, ['controlCount', 'mode', 'operationsPacketItemCount', 'productionReadyClaim']);
  }
  if (script === 'smoke:target-slo-architecture') {
    return pick(parsed, ['areaCount', 'mode', 'productionReadyClaim', 'targetSloApproved']);
  }
  if (script === 'smoke:target-data-lifecycle-architecture') {
    return pick(parsed, ['areaCount', 'mode', 'productionReadyClaim', 'targetDataLifecycleApproved']);
  }
  if (script === 'smoke:target-clean-deployment-architecture') {
    return pick(parsed, ['areaCount', 'mode', 'productionReadyClaim', 'targetCleanDeploymentApproved']);
  }
  if (script === 'smoke:target-retention-operations') {
    return pick(parsed, ['controlCount', 'mode', 'productionReadyClaim', 'retentionPacketItemCount']);
  }
  if (script === 'smoke:target-backup-operations') {
    return pick(parsed, ['controlCount', 'mode', 'productionReadyClaim', 'recoveryPacketItemCount']);
  }
  if (script === 'smoke:target-anthropic-provider-account') {
    return pick(parsed, ['areaCount', 'mode', 'productionReadyClaim', 'targetAnthropicProviderApproved']);
  }
  if (script === 'smoke:target-local-provider-architecture') {
    return pick(parsed, ['areaCount', 'mode', 'productionReadyClaim', 'targetLocalProviderApproved']);
  }
  if (script === 'smoke:target-hermes-provider-architecture') {
    return pick(parsed, ['areaCount', 'mode', 'productionReadyClaim', 'targetHermesProviderApproved']);
  }
  if (script === 'smoke:retention-delete-policy') {
    return pick(parsed, ['dataClassCount', 'mode', 'productionReadyClaim']);
  }
  if (script === 'smoke:web-auth-rbac') {
    return pick(parsed, ['authMode', 'mode', 'roleChecks']);
  }
  if (script === 'smoke:target-deployment-contract') {
    return pick(parsed, ['controlCount', 'mode', 'productionReadyClaim', 'profileCount']);
  }
  if (script === 'smoke:release-artifact-hygiene') {
    return pick(parsed, ['machinePathFindingCount', 'scannedFileCount', 'secretFindingCount', 'verifiedCommit']);
  }
  if (script === 'smoke:runtime-data-lifecycle') {
    return pick(parsed, ['deleted', 'exportedFileCount', 'mode']);
  }
  if (script === 'smoke:tenant-data-lifecycle') {
    return pick(parsed, ['deletedTenantA', 'exportedFileCount', 'mode']);
  }
  if (script === 'smoke:backup-restore-drill') {
    return pick(parsed, ['backupFileCount', 'mode', 'restoredFileCount', 'tenantDeleteIsolated']);
  }
  if (script === 'smoke:runtime-isolation') {
    return pick(parsed, ['deletedRuntimeA', 'exportAFileCount', 'exportBFileCount', 'mode']);
  }
  if (script === 'package:pilot-export') {
    return pick(parsed, ['fileCount', 'hygiene', 'mode', 'ok', 'verifiedCommit']);
  }
  if (script === 'smoke:pilot-export-package') {
    return pick(parsed, ['fileCount', 'mode', 'verifiedCommit']);
  }

  return pick(parsed, ['mode']);
}

function renderCleanDeploymentMarkdown({
  copiedFiles,
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

  return `# Clean Deployment Release Rehearsal v1

- status: ${failedResults.length === 0 ? 'clean-local-rehearsal-current' : 'clean-local-rehearsal-failed'}
- generatedAt: ${generatedAt}
- sourceBranch: ${sourceBranch}
- sourceCommit: ${sourceCommit}
- releaseLabel: ${releaseLabel}
- cleanCheckoutMode: tracked-files-only
- cleanCheckoutFileCount: ${copiedFiles.length}
- excludedRuntimeState: var/, output/playwright/, node_modules/, .git/
- productionReadyClaim: false
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedTargetCleanDeploymentArchitecture: [target-clean-deployment-architecture-v1.md](target-clean-deployment-architecture-v1.md)

## Decision Boundary

This rehearsal proves that core release gates can be replayed from a clean tracked-file checkout without local runtime state, Playwright output, dependency folders, or git metadata.

It is not target production deployment evidence, not hosted environment proof, and not permission to claim \`production-ready\`.

Production-ready remains blocked until the approved target environment produces clean deployment release evidence, production SLO/SLA operating evidence, completed target provider validation, and enforced enterprise controls.

## Command Matrix

| Command | Result | Exit Code | Duration Ms |
| --- | --- | ---: | ---: |
${commandRows}

## Key Signals

${keySignalRows}

## Operator Re-Run

\`\`\`bash
npm run rehearsal:clean-deployment-release
npm run smoke:clean-deployment-release
\`\`\`

## Acceptance Rule

The rehearsal is acceptable only when every command in the matrix passes from the clean tracked-file checkout and artifact hygiene reports zero secret and machine-local path findings.

The rehearsal must keep \`productionReadyClaim: false\` until the same release evidence is generated from the approved production-like deployment environment.
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
  if (result.status !== 0) {
    return '';
  }
  return String(result.stdout || '').trim();
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
