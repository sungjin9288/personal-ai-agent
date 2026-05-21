import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const outputPath = path.join(docsDir, 'production-retention-operating-v1.md');

const RETENTION_COMMANDS = [
  {
    command: 'npm run smoke:retention-delete-policy',
    script: 'smoke:retention-delete-policy',
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
  {
    command: 'npm run smoke:release-artifact-hygiene',
    script: 'smoke:release-artifact-hygiene',
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
    renderPendingRetentionOperatingMarkdown({
      generatedAt,
      releaseLabel,
      sourceBranch,
      sourceCommit,
    }),
    'utf8',
  );
}
const results = RETENTION_COMMANDS.map(runRetentionCommand);
const failedResults = results.filter((result) => !result.ok);

fs.writeFileSync(
  outputPath,
  renderRetentionOperatingMarkdown({
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
      mode: 'production-retention-operating',
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

function runRetentionCommand({ command, script }) {
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

  if (script === 'smoke:retention-delete-policy') {
    return pick(parsed, ['dataClassCount', 'mode', 'productionReadyClaim']);
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
  if (script === 'smoke:target-data-lifecycle-architecture') {
    return pick(parsed, ['areaCount', 'mode', 'productionReadyClaim', 'targetDataLifecycleApproved']);
  }
  if (script === 'smoke:target-retention-operations') {
    return pick(parsed, ['controlCount', 'mode', 'productionReadyClaim', 'retentionPacketItemCount']);
  }
  if (script === 'smoke:target-backup-operations') {
    return pick(parsed, ['controlCount', 'mode', 'productionReadyClaim', 'recoveryPacketItemCount']);
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
  if (script === 'smoke:release-artifact-hygiene') {
    return pick(parsed, ['machinePathFindingCount', 'scannedFileCount', 'secretFindingCount', 'verifiedCommit']);
  }

  return pick(parsed, ['mode']);
}

function renderRetentionOperatingMarkdown({
  failedResults,
  generatedAt,
  releaseLabel,
  results,
  sourceBranch,
  sourceCommit,
}) {
  const commandRows = results
    .map((result) => {
      const status = result.ok ? 'pass' : 'fail';
      const target = getRetentionTarget(result.command);
      const withinTarget = result.ok && result.durationMs <= target.durationMs;
      return `| \`${result.command}\` | ${status} | ${result.exitCode} | ${result.durationMs} | ${target.label} | ${withinTarget ? 'yes' : 'no'} |`;
    })
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

  return `# Production Retention Operating Rehearsal v1

- status: ${failedResults.length === 0 ? 'local-retention-operating-current' : 'local-retention-operating-failed'}
- generatedAt: ${generatedAt}
- sourceBranch: ${sourceBranch}
- sourceCommit: ${sourceCommit}
- releaseLabel: ${releaseLabel}
- scope: local production-like retention, export, delete, tenant-scoped lifecycle, target data lifecycle architecture, target retention operations, backup/restore, target backup operations, and isolation rehearsal
- productionReadyClaim: false
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedTargetDataLifecycleArchitecture: [target-data-lifecycle-architecture-v1.md](target-data-lifecycle-architecture-v1.md)
- relatedRuntimeIsolation: [runtime-isolation-v1.md](runtime-isolation-v1.md)
- relatedPilotExportPackage: [pilot-export-package-v1.md](pilot-export-package-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Decision Boundary

This rehearsal proves that pilot retention, export, delete, tenant-scoped export/delete, target data lifecycle architecture, target retention operations, local backup/restore, target backup operations, runtime isolation, pilot package, and artifact hygiene checks can be replayed together locally.

It is not hosted production retention evidence, not a customer data subject request workflow, not provider transcript deletion proof, not backup expiry evidence, and not permission to claim \`production-ready\`.

Production-ready remains blocked until the approved target environment provides customer-approved data class proof, target retention configuration proof, export approval proof, delete workflow proof, provider transcript handling proof, post-delete absence proof, audit history proof, backup schedule execution proof, encrypted backup storage proof, backup key ownership proof, restore validation proof, tenant isolation proof, backup expiry/deletion proof, disaster recovery proof, release artifact hygiene result, and regenerated execution snapshot evidence.

## Command Matrix

| Command | Result | Exit Code | Duration Ms | Local Target | Within Target |
| --- | --- | ---: | ---: | --- | --- |
${commandRows}

## Key Signals

${keySignalRows}

## Operating Interpretation

- retention/delete policy remains the source of pilot data classes, export checklist, delete checklist, stop conditions, and production gap
- runtime lifecycle remains the gate for inventory, export manifest, confirmation-token deletion, and post-delete absence
- tenant data lifecycle remains the gate for tenant-scoped export manifests, exact tenant delete confirmation, post-delete absence, and unchanged data for another tenant in the same runtime root
- target data lifecycle architecture remains the gate for customer data classes, retention enforcement, export boundary, delete workflow, provider transcript handling, post-delete absence, backup architecture, restore isolation, key ownership, and disaster recovery decisions
- target retention operations remains the gate for customer-approved data class proof, target retention configuration proof, export approval proof, delete workflow proof, provider transcript handling proof, post-delete absence proof, audit history proof, release artifact hygiene, and regenerated execution snapshot evidence requirements
- backup restore drill remains the gate for local backup manifest digests, clean restore enforcement, restored state hash matching, and post-restore tenant delete isolation
- target backup operations remains the gate for backup schedule execution proof, encrypted backup storage proof, backup key ownership proof, restore validation proof, tenant isolation proof, backup expiry/deletion proof, disaster recovery proof, release artifact hygiene, and regenerated execution snapshot evidence requirements
- runtime isolation remains the gate for one-runtime-per-customer separation during export and delete
- pilot export package remains the gate for repository-relative paths, sha256 digests, and immutable snapshot inclusion
- release artifact hygiene remains the gate for shareable evidence safety

## Operator Re-Run

\`\`\`bash
npm run rehearsal:production-retention-operating
npm run smoke:production-retention-operating
\`\`\`

## Acceptance Rule

The rehearsal is acceptable only when every command passes, every command remains within its local rehearsal target, tenant-scoped export/delete does not include or modify another tenant, target retention operations requirements, backup restore integrity, and target backup operations requirements remain verified, and artifact hygiene reports zero credential and machine-local path findings.

The rehearsal must keep \`productionReadyClaim: false\` until the same retention, export, delete, and absence evidence is generated from the approved production-like or production target environment.
`;
}

function renderPendingRetentionOperatingMarkdown({ generatedAt, releaseLabel, sourceBranch, sourceCommit }) {
  return `# Production Retention Operating Rehearsal v1

- status: local-retention-operating-pending
- generatedAt: ${generatedAt}
- sourceBranch: ${sourceBranch}
- sourceCommit: ${sourceCommit}
- releaseLabel: ${releaseLabel}
- scope: local production-like retention, export, delete, and isolation rehearsal
- productionReadyClaim: false

## Decision Boundary

This pending placeholder exists only so artifact hygiene and pilot export packaging can scan the retention operating output path while the rehearsal command matrix is executing.

It is not hosted production retention evidence, not provider transcript deletion proof, and not permission to claim \`production-ready\`.
`;
}

function getRetentionTarget(command) {
  if (/runtime-isolation/.test(command)) {
    return { durationMs: 10_000, label: '10s' };
  }
  if (/runtime-data-lifecycle|tenant-data-lifecycle|backup-restore-drill|target-retention-operations|target-backup-operations/.test(command)) {
    return { durationMs: 10_000, label: '10s' };
  }
  if (/package:pilot-export|pilot-export-package|release-artifact-hygiene/.test(command)) {
    return { durationMs: 5_000, label: '5s' };
  }
  return { durationMs: 5_000, label: '5s' };
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
