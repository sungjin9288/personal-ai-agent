import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const outputPath = path.join(docsDir, 'production-slo-operating-v1.md');

const SLO_COMMANDS = [
  {
    command: 'npm run smoke:incident-slo-policy',
    script: 'smoke:incident-slo-policy',
  },
  {
    command: 'npm run smoke:observability-telemetry',
    script: 'smoke:observability-telemetry',
  },
  {
    command: 'npm run smoke:target-observability-operations',
    script: 'smoke:target-observability-operations',
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
    command: 'npm run smoke:execution-v1-status',
    script: 'smoke:execution-v1-status',
  },
  {
    command: 'npm run smoke:execution-v1-snapshot',
    script: 'smoke:execution-v1-snapshot',
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
    command: 'npm run smoke:runtime-isolation',
    script: 'smoke:runtime-isolation',
  },
];

const generatedAt = new Date().toISOString();
const sourceCommit = runGit(['rev-parse', 'HEAD']);
const sourceBranch = runGit(['branch', '--show-current']);
const releaseReadiness = readRequiredFile(path.join(docsDir, 'release-readiness-v1.md'));
const releaseLabel = extractBulletValue(releaseReadiness, 'releaseLabel');

const results = SLO_COMMANDS.map(runSloCommand);
const failedResults = results.filter((result) => !result.ok);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  renderSloOperatingMarkdown({
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
      mode: 'production-slo-operating',
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

function runSloCommand({ command, script }) {
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
  if (script === 'smoke:observability-telemetry') {
    return pick(parsed, ['alertTriggerCount', 'mode', 'productionReadyClaim', 'telemetrySignalCount']);
  }
  if (script === 'smoke:target-observability-operations') {
    return pick(parsed, ['controlCount', 'mode', 'operationsPacketItemCount', 'productionReadyClaim']);
  }
  if (script === 'smoke:support-escalation-review') {
    return pick(parsed, ['auditPacketItemCount', 'escalationRouteCount', 'mode', 'productionReadyClaim', 'reviewCadenceCount']);
  }
  if (script === 'smoke:target-support-operations') {
    return pick(parsed, ['controlCount', 'mode', 'productionReadyClaim', 'supportPacketItemCount']);
  }
  if (script === 'smoke:execution-v1-status') {
    return pick(parsed, ['artifactState', 'artifactSyncCommit', 'deterministic', 'runtimeRows', 'snapshotCommit']);
  }
  if (script === 'smoke:execution-v1-snapshot') {
    return pick(parsed, ['artifactSyncCommit', 'deterministicPassed', 'runtimeRows', 'verifiedCommit']);
  }
  if (script === 'smoke:release-artifact-hygiene') {
    return pick(parsed, ['machinePathFindingCount', 'scannedFileCount', 'secretFindingCount', 'verifiedCommit']);
  }
  if (script === 'smoke:runtime-data-lifecycle') {
    return pick(parsed, ['deleted', 'exportedFileCount', 'mode']);
  }
  if (script === 'smoke:runtime-isolation') {
    return pick(parsed, ['deletedRuntimeA', 'exportAFileCount', 'exportBFileCount', 'mode']);
  }

  return pick(parsed, ['mode']);
}

function renderSloOperatingMarkdown({
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
      const target = getSloTarget(result.command);
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

  return `# Production SLO Operating Rehearsal v1

- status: ${failedResults.length === 0 ? 'local-slo-operating-current' : 'local-slo-operating-failed'}
- generatedAt: ${generatedAt}
- sourceBranch: ${sourceBranch}
- sourceCommit: ${sourceCommit}
- releaseLabel: ${releaseLabel}
- scope: local production-like SLO/SLA operating rehearsal
- productionReadyClaim: false
- relatedIncidentSlo: [incident-slo-v1.md](incident-slo-v1.md)
- relatedObservabilityTelemetry: [observability-telemetry-v1.md](observability-telemetry-v1.md)
- relatedTargetObservabilityOperations: [target-observability-operations-v1.md](target-observability-operations-v1.md)
- relatedSupportEscalationReview: [support-escalation-review-v1.md](support-escalation-review-v1.md)
- relatedTargetSupportOperations: [target-support-operations-v1.md](target-support-operations-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Decision Boundary

This rehearsal proves that pilot SLO operating checks can be replayed locally and that observability telemetry, target observability operations, support escalation review, target support operations, release, artifact hygiene, runtime lifecycle, and runtime isolation signals remain measurable together.

It is not customer production SLO/SLA evidence, not hosted telemetry, not staffed on-call proof, and not permission to claim \`production-ready\`.

Production-ready remains blocked until the approved target environment provides production telemetry, customer-approved SLO/SLA terms, staffed incident ownership, support queue routing, on-call handoff, incident review cadence, and provider/deployment evidence.

## Command Matrix

| Command | Result | Exit Code | Duration Ms | Local Target | Within Target |
| --- | --- | ---: | ---: | --- | --- |
${commandRows}

## Key Signals

${keySignalRows}

## Operating Interpretation

- deterministic release status and snapshot integrity remain the gate for stale evidence detection
- release artifact hygiene remains the gate for shareable evidence safety
- runtime lifecycle and runtime isolation remain the gate for pilot data handling readiness
- incident/SLO policy remains the source of severity, response target, owner, evidence, and closure rules
- observability telemetry remains the gate for local telemetry signals, alert triggers, and handoff requirements
- target observability operations remains the gate for telemetry pipeline, alert delivery, on-call routing, customer status communication, and incident review evidence requirements
- support escalation review remains the gate for escalation routes, audit packet requirements, incident review cadence, and customer update rules
- target support operations remains the gate for staffed coverage, support queue routing, customer communication, ticket audit history, incident review cadence, and on-call handoff evidence requirements

## Operator Re-Run

\`\`\`bash
npm run rehearsal:production-slo-operating
npm run smoke:production-slo-operating
\`\`\`

## Acceptance Rule

The rehearsal is acceptable only when every command passes, every command remains within its local rehearsal target, and artifact hygiene reports zero credential and machine-local path findings.

The rehearsal must keep \`productionReadyClaim: false\` until the same operating evidence is generated from the approved production-like or production target environment.
`;
}

function getSloTarget(command) {
  if (/runtime-isolation/.test(command)) {
    return { durationMs: 10_000, label: '10s' };
  }
  if (/runtime-data-lifecycle/.test(command)) {
    return { durationMs: 10_000, label: '10s' };
  }
  if (/execution-v1-status|execution-v1-snapshot|clean-deployment-release/.test(command)) {
    return { durationMs: 15_000, label: '15s' };
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
