import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const defaultEvidencePath = path.join(docsDir, 'execution-v1-evidence.md');
const defaultCloseoutPath = path.join(docsDir, 'execution-v1-closeout.md');
const defaultOutputPath = path.join(docsDir, 'execution-v1-handoff.md');
const snapshotsRoot = path.join(docsDir, 'releases', 'execution-v1');

const evidencePath = resolveArgPath('--evidence-path', defaultEvidencePath);
const closeoutPath = resolveArgPath('--closeout-path', defaultCloseoutPath);
const outputPath = resolveArgPath('--output-path', defaultOutputPath);

const evidenceMarkdown = readRequiredFile(evidencePath);
const closeoutMarkdown = readRequiredFile(closeoutPath);
const branch = extractBulletValue(closeoutMarkdown, 'branch') || extractBulletValue(evidenceMarkdown, 'branch') || runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
const commit = extractBulletValue(closeoutMarkdown, 'commit') || extractBulletValue(evidenceMarkdown, 'commit') || runGit(['rev-parse', 'HEAD']);
const generatedAt = new Date().toISOString();
const localDate = formatLocalDate(new Date(), 'Asia/Seoul');
const visualArtifactSetSha256 = extractBulletValue(evidenceMarkdown, 'artifactSetSha256') || 'not captured';
const snapshotDir = path.join(snapshotsRoot, commit);
const snapshotDisplayPath = fs.existsSync(snapshotDir)
  ? formatMarkdownLinkTarget(snapshotDir, outputPath)
  : formatMarkdownLinkTarget(path.join(snapshotsRoot, commit), outputPath);
const commitPushStatus = getCommitPushStatus({ branch, commit });
const deterministicRows = extractSectionBullets(evidenceMarkdown, 'Deterministic Verification');
const runtimeRows = extractSectionBullets(evidenceMarkdown, 'Deterministic Runtime Summary');
const referenceRows = extractSectionBullets(evidenceMarkdown, 'Reference Adoption Aggregate');
const currentStatusRows = extractSectionBullets(closeoutMarkdown, 'Current Status');
const statusMap = parseColonBullets(currentStatusRows);
const scriptCount = statusValue(referenceRows, 'scriptCount') || 'not captured';
const totalDuration = statusValue(referenceRows, 'totalDuration') || 'not captured';
const referenceOk = statusValue(referenceRows, 'ok') || 'not captured';
const liveProviders = [
  {
    command: 'export OPENAI_RUN_TIMEOUT_MS=60000 OPENAI_API_KEY="..." && npm run live:execution-v1:openai',
    envKey: 'OPENAI_API_KEY',
    label: 'OpenAI',
    providerKey: 'openai',
    statusKey: 'openai live validation',
  },
  {
    command: 'export ANTHROPIC_API_KEY="..." && npm run live:execution-v1:anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    label: 'Anthropic',
    providerKey: 'anthropic',
    statusKey: 'anthropic live validation',
  },
  {
    command: 'export LOCAL_PROVIDER_MODEL="..." && npm run live:execution-v1:local',
    envKey: 'LOCAL_PROVIDER_MODEL',
    label: 'local provider',
    providerKey: 'local',
    statusKey: 'local live validation',
  },
  {
    command: 'export HERMES_PROVIDER_MODEL="..." && npm run live:execution-v1:hermes',
    envKey: 'HERMES_PROVIDER_MODEL',
    label: 'Hermes',
    providerKey: 'hermes',
    statusKey: 'hermes live validation',
  },
];
const liveProviderStates = liveProviders.map((provider) => {
  const status = statusMap.get(provider.statusKey) || 'not verified';
  const suffix = status === 'missing-env' ? `blocked by missing \`${provider.envKey}\`` : status;
  const providerMessage = extractLiveFailureDetail(closeoutMarkdown, provider.providerKey, 'providerMessage');
  const failureKind = extractLiveFailureDetail(closeoutMarkdown, provider.providerKey, 'failureKind');
  const httpStatus = extractLiveFailureDetail(closeoutMarkdown, provider.providerKey, 'httpStatus');
  return {
    ...provider,
    failureKind,
    httpStatus,
    providerMessage,
    status,
    suffix,
  };
});

const lines = [
  '# Execution v1 Handoff',
  '',
  `- generatedAt: ${generatedAt}`,
  `- localDate: ${localDate}`,
  `- branch: ${branch}`,
  `- commit: ${commit}`,
  `- evidence: [${path.basename(evidencePath)}](${formatMarkdownLinkTarget(evidencePath, outputPath)})`,
  `- closeout: [${path.basename(closeoutPath)}](${formatMarkdownLinkTarget(closeoutPath, outputPath)})`,
  `- immutableSnapshot: [${snapshotDisplayPath}](${snapshotDisplayPath})`,
  `- visualArtifactSetSha256: ${visualArtifactSetSha256}`,
  `- commitPushStatus: ${commitPushStatus.summary}`,
  '',
  '## Operational State',
  '',
  `- deterministic execution flow: ${statusMap.get('deterministic smoke') || 'not verified'}`,
  `- CLI execution contract: ${deterministicRows.includes('smoke:execution-cli: passed') ? 'ready' : 'not verified'}`,
  `- operator console execution contract: ${deterministicRows.includes('smoke:ui-execution-console: passed') ? 'ready' : 'not verified'}`,
  `- browser interaction E2E: ${statusMap.get('browser interaction e2e') || 'not verified'}`,
  `- reference adoption aggregate: ${statusMap.get('reference adoption gate') || 'not verified'}, ${scriptCount} scripts, ok=${referenceOk}, totalDuration=${totalDuration}`,
  `- deterministic runtime summary: ${statusMap.get('deterministic runtime summary') || (runtimeRows.length ? 'ready' : 'not verified')}`,
  `- snapshot portability: ${fs.existsSync(snapshotDir) ? 'ready' : 'not archived'}`,
];

for (const provider of liveProviderStates) {
  lines.push(`- ${provider.label} live validation: ${provider.suffix}`);
}

lines.push(
  '',
  '## Live Failure Triage Summary',
  '',
);

for (const provider of liveProviderStates) {
  if (provider.status === 'passed') {
    lines.push(`- ${provider.label}: no active blocker`);
    continue;
  }
  if (provider.status === 'missing-env') {
    lines.push(`- ${provider.label}: missing \`${provider.envKey}\``);
    continue;
  }
  if (provider.providerMessage) {
    const detail = [provider.failureKind, provider.httpStatus ? `HTTP ${provider.httpStatus}` : ''].filter(Boolean).join(', ');
    lines.push(`- ${provider.label}: ${detail ? `${detail}, ` : ''}${provider.providerMessage}`);
    continue;
  }
  lines.push(`- ${provider.label}: ${provider.suffix}`);
}

lines.push(
  '',
  '## Implemented Capability Surface',
  '',
  '- Multi-agent orchestration includes engineering/reviewer/specialist flows, approval gates, owner escalation, follow-up inboxes, and parallel specialist runs.',
  '- Harness-style execution is wired through deterministic mission execution, execution lease approval, foreground runtime session tracking, CLI controls, and operator UI controls.',
  '- Hermes Agent adoption is represented through the Hermes provider, Hermes tool-call parsing, Hermes profile metadata, UI blueprint card, and `engineering-full-spectrum` runtime blueprint coverage.',
  '- Reference-inspired extensions are covered by aggregate smoke tests for output compaction, provider guard/rate handling, document conversion, retrieval memory, fact graph memory, instruction-boundary fixtures, runtime discovery, visual evidence manifest, orchestration profiles, UI blueprints, parallel specialists, and process timeout handling.',
  '- Release evidence is captured in evidence, closeout, visual manifest, handoff, and immutable snapshot artifacts.',
  '',
  '## Evidence-Backed Verification',
  '',
);

for (const row of deterministicRows) {
  lines.push(`- ${row}`);
}

lines.push(
  `- reference adoption aggregate: ${scriptCount} scripts, ok=${referenceOk}`,
  `- deterministic runtime rows: ${runtimeRows.length}`,
  `- visual artifact set: ${visualArtifactSetSha256}`,
  '',
  '## Live Provider Handoff',
  '',
  'Run these only in an environment that is allowed to use real provider credentials or local model endpoints:',
  '',
  '```bash',
  'npm run preflight:execution-v1:all',
);

for (const provider of liveProviders) {
  lines.push(provider.command);
}

lines.push(
  '```',
  '',
  'Expected pre-live state:',
  '',
  '- `blockedCount` remains `0` when deterministic prerequisites are healthy.',
  '- Providers without env/config remain `ready-but-missing-env` until their required value is injected.',
  '- Provider account, billing, quota, or model access errors remain live blockers even when credentials are present.',
  '- After env injection, live validation must be rerun before claiming provider-backed production readiness.',
  '',
  '## Next Operator Steps',
  '',
  ...buildNextOperatorSteps(liveProviderStates, commitPushStatus),
  '',
  '## Completion Boundary',
  '',
  buildCompletionBoundary(liveProviderStates),
  '',
);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');

console.log(
  JSON.stringify(
    {
      ok: true,
      branch,
      commit,
      evidencePath,
      closeoutPath,
      outputPath,
      generatedAt,
      commitPushStatus,
      visualArtifactSetSha256,
    },
    null,
    2,
  ),
);

function buildNextOperatorSteps(providerStates, pushStatus) {
  const failedProviders = providerStates.filter((provider) => provider.status !== 'passed' && provider.status !== 'missing-env');
  const missingProviders = providerStates.filter((provider) => provider.status === 'missing-env');
  const localProvider = providerStates.find((provider) => provider.providerKey === 'local');
  const steps = [];

  steps.push(
    failedProviders.length
      ? `1. Resolve failed provider account-level blockers for ${formatProviderLabels(failedProviders)}, then rerun only the affected \`live:execution-v1:*\` commands.`
      : '1. Keep archived live provider proof current when provider account or model configuration changes.',
  );
  steps.push(
    missingProviders.length
      ? `2. Inject ${formatProviderLabels(missingProviders)} runtime configuration in the target environment before claiming those provider paths.`
      : '2. Keep target runtime configuration pinned before claiming additional provider paths.',
  );
  steps.push(
    localProvider?.status === 'passed'
      ? '3. Attach approved local provider model/endpoint, network, telemetry, and resource evidence to the target local provider architecture before adding local provider operation to a production claim.'
      : '3. Complete target local provider architecture approval before adding local provider operation to a production claim.',
  );
  steps.push(
    '4. Run `npm run refresh:execution-v1-artifacts` after live validation or planning source-of-record changes so evidence, closeout, handoff, provider readiness, snapshot, and pilot export package stay aligned while preserving archived live proof by default.',
    '5. Use `node scripts/build-execution-v1-evidence.mjs --live-<provider>` first only when intentionally replacing live-provider proof for a selected provider.',
    pushStatus.pushed
      ? `6. Current verified commit is already contained in \`${pushStatus.remoteRef}\`; only commit/push again after intentionally changing release artifacts.`
      : '6. Commit and push the refreshed release artifacts when the operator explicitly resumes git publishing.',
  );

  return steps;
}

function buildCompletionBoundary(providerStates) {
  const passedProviders = providerStates.filter((provider) => provider.status === 'passed');
  const anthropic = providerStates.find((provider) => provider.providerKey === 'anthropic');
  const hermes = providerStates.find((provider) => provider.providerKey === 'hermes');
  const localProvider = providerStates.find((provider) => provider.providerKey === 'local');
  const blockers = [];

  if (anthropic?.status !== 'passed') {
    blockers.push('Anthropic is blocked by provider account billing/credit');
  }
  if (hermes?.status !== 'passed') {
    blockers.push('Hermes live validation still requires target runtime configuration');
  }
  if (localProvider?.status === 'passed') {
    blockers.push('target local provider architecture approval still requires target-boundary evidence');
  } else {
    blockers.push('local provider live validation still requires target runtime configuration');
  }

  return `Execution v1 is provider-scoped pilot ready for a bounded local-first path validated by ${formatProviderLabels(passedProviders)}. It is not production-ready or live-provider-complete because ${formatSentenceList(blockers)}.`;
}

function formatProviderLabels(providers) {
  const labels = providers.map((provider) => provider.label).filter(Boolean);
  if (!labels.length) {
    return 'no provider';
  }
  return formatSentenceList(labels);
}

function formatSentenceList(items) {
  const values = items.map((item) => String(item || '').trim()).filter(Boolean);
  if (values.length <= 1) {
    return values[0] || '';
  }
  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }
  return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
}

function resolveArgPath(flag, fallbackPath) {
  const index = process.argv.indexOf(flag);
  if (index < 0) {
    return fallbackPath;
  }
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a path value`);
  }
  return path.resolve(repoDir, value);
}

function readRequiredFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`required file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function extractBulletValue(markdown, label) {
  const match = String(markdown || '').match(new RegExp(`^- ${escapeRegExp(label)}:\\s+(.+)$`, 'm'));
  return match ? String(match[1] || '').trim() : '';
}

function extractSectionBullets(markdown, heading) {
  const pattern = new RegExp(`## ${escapeRegExp(heading)}\\n([\\s\\S]*?)(?:\\n## |$)`);
  const match = String(markdown || '').match(pattern);
  if (!match) {
    return [];
  }
  return String(match[1] || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim());
}

function parseColonBullets(lines) {
  const map = new Map();
  for (const line of lines) {
    const [key, ...rest] = String(line || '').split(':');
    if (!key || rest.length === 0) {
      continue;
    }
    map.set(key.trim().toLowerCase(), rest.join(':').trim());
  }
  return map;
}

function statusValue(lines, key) {
  const normalizedKey = String(key || '').toLowerCase();
  const line = lines.find((item) => String(item || '').toLowerCase().startsWith(`${normalizedKey}:`));
  if (!line) {
    return '';
  }
  return line.slice(line.indexOf(':') + 1).trim();
}

function extractLiveFailureDetail(markdown, providerKey, fieldName) {
  const section = extractSection(markdown, 'Live Failure Triage');
  if (!section) {
    return '';
  }

  const lines = section.split('\n');
  const providerLineIndex = lines.findIndex((line) => line.trim().startsWith(`- ${providerKey}:`));
  if (providerLineIndex < 0) {
    return '';
  }

  for (let index = providerLineIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^- \S/.test(line)) {
      break;
    }
    const match = line.match(new RegExp(`^\\s+- ${escapeRegExp(fieldName)}:\\s*(.+)$`));
    if (match) {
      return match[1].trim();
    }
  }
  return '';
}

function extractSection(markdown, heading) {
  const pattern = new RegExp(`## ${escapeRegExp(heading)}\\n([\\s\\S]*?)(?:\\n## |$)`);
  const match = String(markdown || '').match(pattern);
  return match?.[1]?.trim() || '';
}

function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: repoDir,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed\n${result.stderr || result.stdout}`);
  }
  return String(result.stdout || '').trim();
}

function runGitOptional(args) {
  const result = spawnSync('git', args, {
    cwd: repoDir,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    return '';
  }
  return String(result.stdout || '').trim();
}

function getCommitPushStatus({ branch = '', commit = '' } = {}) {
  const normalizedBranch = String(branch || '').trim();
  const normalizedCommit = String(commit || '').trim();
  if (!normalizedCommit) {
    return {
      pushed: false,
      remoteRef: '',
      summary: 'unknown, missing verified commit',
    };
  }
  const mainStatus = getRemoteContainmentStatus(normalizedCommit, 'origin/main');
  if (!normalizedBranch || normalizedBranch === 'HEAD') {
    if (mainStatus.pushed) {
      return mainStatus;
    }
    return {
      pushed: false,
      remoteRef: '',
      summary: 'unknown, detached HEAD or missing branch',
    };
  }

  const remoteRef = `origin/${normalizedBranch}`;
  const branchStatus = getRemoteContainmentStatus(normalizedCommit, remoteRef);
  if (branchStatus.pushed) {
    return branchStatus;
  }
  if (mainStatus.pushed) {
    return mainStatus;
  }
  if (!branchStatus.exists) {
    return {
      pushed: false,
      remoteRef,
      summary: `not pushed, ${remoteRef} not found`,
    };
  }

  return {
    pushed: false,
    remoteCommit: branchStatus.remoteCommit,
    remoteRef,
    summary: `not pushed to ${remoteRef}`,
  };
}

function getRemoteContainmentStatus(commit, remoteRef) {
  const normalizedCommit = String(commit || '').trim();
  const normalizedRemoteRef = String(remoteRef || '').trim();
  const remoteCommit = getRemoteHeadCommit(normalizedRemoteRef);
  if (!normalizedCommit || !remoteCommit) {
    return {
      exists: Boolean(remoteCommit),
      pushed: false,
      remoteCommit,
      remoteRef: normalizedRemoteRef,
    };
  }

  const containsResult = spawnSync('git', ['merge-base', '--is-ancestor', normalizedCommit, normalizedRemoteRef], {
    cwd: repoDir,
    encoding: 'utf8',
  });
  if (containsResult.status === 0) {
    return {
      exists: true,
      pushed: true,
      remoteCommit,
      remoteRef: normalizedRemoteRef,
      summary: `pushed to ${normalizedRemoteRef}`,
    };
  }

  return {
    exists: true,
    pushed: false,
    remoteCommit,
    remoteRef: normalizedRemoteRef,
  };
}

function getRemoteHeadCommit(remoteRef) {
  const normalizedRemoteRef = String(remoteRef || '').trim();
  const [remoteName, ...branchParts] = normalizedRemoteRef.split('/');
  const branchName = branchParts.join('/');
  if (remoteName && branchName) {
    const result = spawnSync('git', ['ls-remote', '--heads', remoteName, branchName], {
      cwd: repoDir,
      encoding: 'utf8',
    });
    if (result.status === 0) {
      return String(result.stdout || '').trim().split(/\s+/)[0] || '';
    }
  }
  return runGitOptional(['rev-parse', '--verify', normalizedRemoteRef]);
}

function formatDisplayPath(filePath) {
  const relativePath = path.relative(repoDir, String(filePath || ''));
  if (relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
    return relativePath;
  }
  return String(filePath || '');
}

function formatMarkdownLinkTarget(targetPath, sourcePath) {
  const relativePath = path.relative(path.dirname(sourcePath), targetPath);
  return relativePath || path.basename(targetPath);
}

function formatLocalDate(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone,
    year: 'numeric',
  }).format(date);
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
