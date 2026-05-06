import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const outputPath = path.join(repoDir, 'docs', 'production-like-release-drill-v1.md');

const DRILL_COMMANDS = [
  {
    command: 'npm run smoke:incident-slo-policy',
    script: 'smoke:incident-slo-policy',
  },
  {
    command: 'npm run smoke:identity-session-admin',
    script: 'smoke:identity-session-admin',
  },
  {
    command: 'npm run smoke:hosted-identity-session-architecture',
    script: 'smoke:hosted-identity-session-architecture',
  },
  {
    command: 'npm run smoke:tenant-storage-admin',
    script: 'smoke:tenant-storage-admin',
  },
  {
    command: 'npm run smoke:hosted-tenant-isolation-architecture',
    script: 'smoke:hosted-tenant-isolation-architecture',
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
    command: 'npm run smoke:target-support-operations',
    script: 'smoke:target-support-operations',
  },
  {
    command: 'npm run smoke:secret-management',
    script: 'smoke:secret-management',
  },
  {
    command: 'npm run smoke:target-secret-manager-architecture',
    script: 'smoke:target-secret-manager-architecture',
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
    command: 'npm run smoke:target-retention-operations',
    script: 'smoke:target-retention-operations',
  },
  {
    command: 'npm run smoke:target-backup-operations',
    script: 'smoke:target-backup-operations',
  },
  {
    command: 'npm run smoke:production-slo-operating',
    script: 'smoke:production-slo-operating',
  },
  {
    command: 'npm run smoke:web-auth-rbac',
    script: 'smoke:web-auth-rbac',
  },
  {
    command: 'npm run smoke:production-enterprise-controls',
    script: 'smoke:production-enterprise-controls',
  },
  {
    command: 'npm run smoke:production-provider-readiness',
    script: 'smoke:production-provider-readiness',
  },
  {
    command: 'npm run smoke:target-deployment-contract',
    script: 'smoke:target-deployment-contract',
  },
  {
    command: 'npm run smoke:retention-delete-policy',
    script: 'smoke:retention-delete-policy',
  },
  {
    command: 'npm run smoke:production-retention-operating',
    script: 'smoke:production-retention-operating',
  },
  {
    command: 'npm run smoke:clean-deployment-release',
    script: 'smoke:clean-deployment-release',
  },
  {
    command: 'npm run smoke:execution-v1-status',
    script: 'smoke:execution-v1-status',
  },
  {
    command: 'npm run smoke:execution-v1-snapshot',
    script: 'smoke:execution-v1-snapshot',
  },
  {
    command: 'npm run smoke:production-readiness-gate',
    script: 'smoke:production-readiness-gate',
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
];

const generatedAt = new Date().toISOString();
const currentCommit = runGit(['rev-parse', 'HEAD']);
const currentBranch = runGit(['branch', '--show-current']);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
if (!fs.existsSync(outputPath)) {
  fs.writeFileSync(
    outputPath,
    renderPendingDrillMarkdown({ currentBranch, currentCommit, generatedAt }),
    'utf8',
  );
}
const results = DRILL_COMMANDS.map(runDrillCommand);
const failedResults = results.filter((result) => !result.ok);
const releaseReadiness = fs.readFileSync(path.join(repoDir, 'docs', 'release-readiness-v1.md'), 'utf8');
const releaseLabel = extractBulletValue(releaseReadiness, 'releaseLabel');
const productionReadySection = extractSection(releaseReadiness, '### Production Ready');
const productionBlockers = extractFollowingListItems(productionReadySection, 'Blockers:');

fs.writeFileSync(
  outputPath,
  renderDrillMarkdown({
    currentBranch,
    currentCommit,
    failedResults,
    generatedAt,
    productionBlockers,
    releaseLabel,
    results,
  }),
  'utf8',
);

const summary = {
  commandCount: results.length,
  failedCommandCount: failedResults.length,
  generatedAt,
  mode: 'production-like-release-drill',
  ok: failedResults.length === 0,
  outputPath: path.relative(repoDir, outputPath),
  releaseLabel,
  verifiedCommit: currentCommit,
};

console.log(JSON.stringify(summary, null, 2));

if (failedResults.length > 0) {
  process.exitCode = 1;
}

function runDrillCommand({ command, script }) {
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

  if (script === 'smoke:incident-slo-policy') {
    return pick(parsed, ['mode', 'severityCount']);
  }
  if (script === 'smoke:identity-session-admin') {
    return pick(parsed, ['auditPacketItemCount', 'controlCount', 'mode', 'productionReadyClaim', 'sessionEventCount']);
  }
  if (script === 'smoke:hosted-identity-session-architecture') {
    return pick(parsed, ['areaCount', 'hostedIdentitySessionApproved', 'mode', 'productionReadyClaim']);
  }
  if (script === 'smoke:tenant-storage-admin') {
    return pick(parsed, ['auditPacketItemCount', 'controlCount', 'mode', 'operationCount', 'productionReadyClaim']);
  }
  if (script === 'smoke:hosted-tenant-isolation-architecture') {
    return pick(parsed, ['areaCount', 'hostedTenantIsolationApproved', 'mode', 'productionReadyClaim']);
  }
  if (script === 'smoke:customer-support-operations') {
    return pick(parsed, ['intakeClassCount', 'mode', 'productionReadyClaim', 'supportRoleCount']);
  }
  if (script === 'smoke:support-escalation-review') {
    return pick(parsed, ['auditPacketItemCount', 'escalationRouteCount', 'mode', 'productionReadyClaim', 'reviewCadenceCount']);
  }
  if (script === 'smoke:target-support-operations') {
    return pick(parsed, ['controlCount', 'mode', 'productionReadyClaim', 'supportPacketItemCount']);
  }
  if (script === 'smoke:secret-management') {
    return pick(parsed, ['injectionRuleCount', 'mode', 'productionReadyClaim', 'secretClassCount']);
  }
  if (script === 'smoke:target-secret-manager-architecture') {
    return pick(parsed, ['areaCount', 'mode', 'productionReadyClaim', 'targetSecretManagerApproved']);
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
  if (script === 'smoke:target-retention-operations') {
    return pick(parsed, ['controlCount', 'mode', 'productionReadyClaim', 'retentionPacketItemCount']);
  }
  if (script === 'smoke:target-backup-operations') {
    return pick(parsed, ['controlCount', 'mode', 'productionReadyClaim', 'recoveryPacketItemCount']);
  }
  if (script === 'smoke:production-slo-operating') {
    return pick(parsed, ['commandCount', 'mode', 'productionReadyClaim']);
  }
  if (script === 'smoke:web-auth-rbac') {
    return pick(parsed, ['authMode', 'mode', 'roleChecks']);
  }
  if (script === 'smoke:production-enterprise-controls') {
    return pick(parsed, ['commandCount', 'mode', 'productionReadyClaim']);
  }
  if (script === 'smoke:production-provider-readiness') {
    return pick(parsed, ['mode', 'productionReadyClaim', 'providerCount']);
  }
  if (script === 'smoke:target-deployment-contract') {
    return pick(parsed, ['controlCount', 'mode', 'productionReadyClaim', 'profileCount']);
  }
  if (script === 'smoke:retention-delete-policy') {
    return pick(parsed, ['dataClassCount', 'mode', 'productionReadyClaim']);
  }
  if (script === 'smoke:production-retention-operating') {
    return pick(parsed, ['commandCount', 'mode', 'productionReadyClaim']);
  }
  if (script === 'smoke:clean-deployment-release') {
    return pick(parsed, ['commandCount', 'mode', 'productionReadyClaim']);
  }
  if (script === 'smoke:execution-v1-status') {
    return pick(parsed, [
      'artifactState',
      'artifactSyncCommit',
      'branch',
      'deterministic',
      'referenceAdoptionReady',
      'runtimeRows',
      'snapshotCommit',
    ]);
  }
  if (script === 'smoke:execution-v1-snapshot') {
    return pick(parsed, ['artifactSyncCommit', 'deterministicPassed', 'runtimeRows', 'verifiedCommit']);
  }
  if (script === 'smoke:production-readiness-gate') {
    return pick(parsed, [
      'blockedProductionReady',
      'label',
      'openaiLiveValidation',
      'pilotCleanDeploymentRelease',
      'pilotIdentitySessionAdmin',
      'pilotTenantStorageAdmin',
      'pilotCustomerSupportOperations',
      'pilotSupportEscalationReview',
      'pilotTargetSupportOperations',
      'pilotSecretManagement',
      'pilotTargetSecretManager',
      'pilotObservabilityTelemetry',
      'pilotTargetObservabilityArchitecture',
      'pilotTargetObservabilityOperations',
      'pilotTargetDataLifecycleArchitecture',
      'pilotTargetRetentionOperations',
      'pilotTargetBackupOperations',
      'pilotProductionEnterpriseControls',
      'pilotIncidentSloPolicy',
      'pilotProductionProviderReadiness',
      'pilotProductionRetentionOperating',
      'pilotProductionSloOperating',
      'pilotRetentionDeletePolicy',
      'productionLikeReleaseDrill',
      'productionBlockerCount',
      'releaseArtifactHygiene',
      'releaseArtifactHygieneScannedFiles',
    ]);
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

  return pick(parsed, ['mode']);
}

function renderDrillMarkdown({
  currentBranch,
  currentCommit,
  failedResults,
  generatedAt,
  productionBlockers,
  releaseLabel,
  results,
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
  const blockerItems = productionBlockers.map((blocker) => `- ${blocker}`).join('\n');

  return `# Production-Like Release Drill v1

- status: ${failedResults.length === 0 ? 'dry-run-evidence-current' : 'dry-run-evidence-failed'}
- generatedAt: ${generatedAt}
- branch: ${currentBranch}
- verifiedCommit: ${currentCommit}
- releaseLabel: ${releaseLabel}
- scope: local deterministic production-like release drill
- productionReadyClaim: false
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedIncidentSlo: [incident-slo-v1.md](incident-slo-v1.md)
- relatedProductionSloOperating: [production-slo-operating-v1.md](production-slo-operating-v1.md)
- relatedProductionProviderReadiness: [production-provider-readiness-v1.md](production-provider-readiness-v1.md)
- relatedProductionEnterpriseControls: [production-enterprise-controls-v1.md](production-enterprise-controls-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedProductionRetentionOperating: [production-retention-operating-v1.md](production-retention-operating-v1.md)
- relatedCleanDeploymentRelease: [clean-deployment-release-v1.md](clean-deployment-release-v1.md)

## Decision Boundary

This drill proves that the release gate can be replayed in a local deterministic environment before a production-like deployment run.

It is not production deployment evidence, not customer production SLO/SLA evidence, and not permission to claim \`production-ready\`.

Production-ready remains blocked until the target deployment model produces clean deployment release evidence, production SLO/SLA operating evidence, completed target provider validation, and enforced enterprise controls.

## Command Matrix

| Command | Result | Exit Code | Duration Ms |
| --- | --- | ---: | ---: |
${commandRows}

## Key Signals

${keySignalRows}

## Production Blockers Preserved

${blockerItems}

## Operator Re-Run

\`\`\`bash
npm run drill:production-like-release
npm run smoke:production-like-release-drill
\`\`\`

## Acceptance Rule

The drill is acceptable only when every command in the matrix passes and artifact hygiene reports zero secret and machine-local path findings.

The drill must keep \`productionReadyClaim: false\` until production-like deployment evidence is generated from the approved target environment.
`;
}

function renderPendingDrillMarkdown({ currentBranch, currentCommit, generatedAt }) {
  return `# Production-Like Release Drill v1

- status: dry-run-evidence-pending
- generatedAt: ${generatedAt}
- branch: ${currentBranch}
- verifiedCommit: ${currentCommit}
- scope: local deterministic production-like release drill
- productionReadyClaim: false

## Decision Boundary

This pending placeholder exists only so artifact hygiene can scan the drill output path while the drill command matrix is executing.

It is not production deployment evidence, not customer production SLO/SLA evidence, and not permission to claim \`production-ready\`.
`;
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

function extractSection(markdown, heading) {
  const escapedHeading = escapeRegExp(heading);
  const nextHeadingPrefix = heading.startsWith('### ') ? '\\n### ' : '\\n## ';
  const pattern = new RegExp(`${escapedHeading}\\n([\\s\\S]*?)(?:${nextHeadingPrefix}|$)`);
  const match = String(markdown || '').match(pattern);
  return match ? String(match[1] || '').trim() : '';
}

function extractFollowingListItems(markdown, marker) {
  const lines = String(markdown || '').split('\n');
  const markerIndex = lines.findIndex((line) => line.trim() === marker);
  if (markerIndex === -1) {
    return [];
  }

  const items = [];
  for (const line of lines.slice(markerIndex + 1)) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      if (items.length > 0) {
        break;
      }
      continue;
    }
    if (!trimmedLine.startsWith('- ')) {
      break;
    }
    items.push(trimmedLine.slice(2).trim());
  }
  return items;
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
