import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  formatLiveValidationProviderFailureLines,
  parseLiveValidationReason,
  readLiveValidationProviderFailure,
  readLiveValidationTriage,
} from './live-validation-utils.mjs';

const repoDir = process.cwd();
const evidenceScriptPath = path.join(repoDir, 'scripts', 'build-execution-v1-evidence.mjs');
const evidencePathArgIndex = process.argv.indexOf('--evidence-path');
const explicitEvidencePath = evidencePathArgIndex >= 0 ? process.argv[evidencePathArgIndex + 1] : '';
const outputPathArgIndex = process.argv.indexOf('--output-path');
const explicitOutputPath = outputPathArgIndex >= 0 ? process.argv[outputPathArgIndex + 1] : '';
const checklistPath = explicitOutputPath
  ? path.resolve(repoDir, explicitOutputPath)
  : path.join(repoDir, 'docs', 'execution-v1-closeout.md');
const reuseExistingEvidence = process.argv.includes('--reuse-existing-evidence');
const forwardedArgs = process.argv
  .slice(2)
  .filter((arg, index, values) => {
    if (arg === '--reuse-existing-evidence') {
      return false;
    }
    if (arg === '--evidence-path') {
      return false;
    }
    if (index > 0 && values[index - 1] === '--evidence-path') {
      return false;
    }
    if (arg === '--output-path') {
      return false;
    }
    if (index > 0 && values[index - 1] === '--output-path') {
      return false;
    }
    return true;
  });

let evidencePath = explicitEvidencePath ? path.resolve(repoDir, explicitEvidencePath) : path.join(repoDir, 'docs', 'execution-v1-evidence.md');
let evidenceResult = explicitEvidencePath
  ? {
      outputPath: evidencePath,
    }
  : null;

if (!reuseExistingEvidence && !explicitEvidencePath) {
  const evidenceRun = spawnSync(process.execPath, [evidenceScriptPath, ...forwardedArgs], {
    cwd: repoDir,
    encoding: 'utf8',
    env: process.env,
  });

  if (evidenceRun.status !== 0) {
    throw new Error(`build-execution-v1-evidence failed\n${evidenceRun.stderr || evidenceRun.stdout}`);
  }

  evidenceResult = JSON.parse(String(evidenceRun.stdout || '{}'));
  evidencePath = evidenceResult.outputPath;
}

if (!fs.existsSync(evidencePath)) {
  throw new Error(`execution-v1 evidence file not found\n${evidencePath}`);
}

const evidenceBody = fs.readFileSync(evidencePath, 'utf8');
const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
const commit = runGit(['rev-parse', 'HEAD']);
const generatedAt = new Date().toISOString();

const deterministicPassed = /smoke:execution-flow: passed/.test(evidenceBody)
  && /smoke:execution-cli: passed/.test(evidenceBody)
  && /smoke:ui-execution-console: passed/.test(evidenceBody)
  && /smoke:ui-execution-browser-e2e: passed/.test(evidenceBody);
const browserE2EPassed = /smoke:ui-execution-browser-e2e: passed/.test(evidenceBody);
const referenceAdoptionsPassed = /smoke:reference-adoptions: passed/.test(evidenceBody);
const deterministicRuntimeSummaryReady = [
  'smoke:execution-flow',
  'smoke:execution-cli',
  'smoke:ui-execution-console',
  'smoke:ui-execution-browser-e2e',
  'smoke:reference-adoptions',
  'smoke:execution-v1-live-helpers',
  'smoke:execution-v1-handoff',
  'smoke:production-readiness-gate',
].every((scriptName) => new RegExp(`- ${escapeRegExp(scriptName)}: .+ elapsed, stdout .+, stderr .+, timeout .+`).test(evidenceBody));
const handoffGeneratorPassed = /smoke:execution-v1-handoff: passed/.test(evidenceBody);
const productionReadinessGatePassed = /smoke:production-readiness-gate: passed/.test(evidenceBody);

const liveOpenAIRequested = process.argv.includes('--live-openai');
const liveAnthropicRequested = process.argv.includes('--live-anthropic');
const liveLocalRequested = process.argv.includes('--live-local');
const liveHermesRequested = process.argv.includes('--live-hermes');

const liveOpenAIStatus = getLiveStatus(evidenceBody, 'openai', liveOpenAIRequested, process.env.OPENAI_API_KEY, 'OPENAI_API_KEY');
const liveAnthropicStatus = getLiveStatus(evidenceBody, 'anthropic', liveAnthropicRequested, process.env.ANTHROPIC_API_KEY, 'ANTHROPIC_API_KEY');
const liveLocalStatus = getLiveStatus(evidenceBody, 'local', liveLocalRequested, process.env.LOCAL_PROVIDER_MODEL, 'LOCAL_PROVIDER_MODEL');
const liveHermesStatus = getLiveStatus(evidenceBody, 'hermes', liveHermesRequested, process.env.HERMES_PROVIDER_MODEL, 'HERMES_PROVIDER_MODEL');
const liveProviderStatuses = [
  {
    displayName: 'OpenAI',
    envKey: 'OPENAI_API_KEY',
    envValue: process.env.OPENAI_API_KEY,
    evidenceFlag: '--live-openai',
    liveCommand: 'npm run live:execution-v1:openai',
    missingEnvCommand: 'export OPENAI_RUN_TIMEOUT_MS=60000 OPENAI_API_KEY="..." && npm run live:execution-v1:openai',
    provider: 'openai',
    status: liveOpenAIStatus,
  },
  {
    displayName: 'Anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    envValue: process.env.ANTHROPIC_API_KEY,
    evidenceFlag: '--live-anthropic',
    liveCommand: 'npm run live:execution-v1:anthropic',
    missingEnvCommand: 'export ANTHROPIC_API_KEY="..." && npm run live:execution-v1:anthropic',
    provider: 'anthropic',
    status: liveAnthropicStatus,
  },
  {
    displayName: 'Local provider',
    envKey: 'LOCAL_PROVIDER_MODEL',
    envValue: process.env.LOCAL_PROVIDER_MODEL,
    evidenceFlag: '--live-local',
    liveCommand: 'npm run live:execution-v1:local',
    missingEnvCommand: 'export LOCAL_PROVIDER_MODEL="..." && npm run live:execution-v1:local',
    provider: 'local',
    status: liveLocalStatus,
  },
  {
    displayName: 'Hermes',
    envKey: 'HERMES_PROVIDER_MODEL',
    envValue: process.env.HERMES_PROVIDER_MODEL,
    evidenceFlag: '--live-hermes',
    liveCommand: 'npm run live:execution-v1:hermes',
    missingEnvCommand: 'export HERMES_PROVIDER_MODEL="..." && npm run live:execution-v1:hermes',
    provider: 'hermes',
    status: liveHermesStatus,
  },
];

const lines = [
  '# Execution v1 Closeout',
  '',
  `- generatedAt: ${generatedAt}`,
  `- branch: ${branch}`,
  `- commit: ${commit}`,
  `- evidence: [${path.basename(evidencePath)}](${formatMarkdownLinkTarget(evidencePath, checklistPath)})`,
  '',
  '## Closeout Checklist',
  '',
  `- [${deterministicPassed ? 'x' : ' '}] deterministic execution smoke 4종 통과`,
  `- [${referenceAdoptionsPassed ? 'x' : ' '}] reference adoption aggregate smoke gate 통과`,
  `- [${deterministicRuntimeSummaryReady ? 'x' : ' '}] deterministic runtime summary evidence 기록`,
  `- [${handoffGeneratorPassed ? 'x' : ' '}] execution-v1 handoff generator regression 통과`,
  `- [${productionReadinessGatePassed ? 'x' : ' '}] production readiness overclaim gate 통과`,
  '- [x] engineering reviewer → execution manifest 생성 경로 연결',
  '- [x] execution lease approval → foreground execution session 연결',
  '- [x] operator console preflight/start/stop/log surface 반영',
  '- [x] CLI execution preflight/start/stop/status/logs 계약 반영',
  `- [${liveOpenAIStatus.checked ? 'x' : ' '}] OpenAI live validation`,
  `- [${liveAnthropicStatus.checked ? 'x' : ' '}] Anthropic live validation`,
  `- [${liveLocalStatus.checked ? 'x' : ' '}] Local provider live validation`,
  `- [${liveHermesStatus.checked ? 'x' : ' '}] Hermes live validation`,
  `- [${browserE2EPassed ? 'x' : ' '}] browser interaction E2E 자동화`,
  '',
  '## Current Status',
  '',
  `- deterministic smoke: ${deterministicPassed ? 'ready' : 'blocked'}`,
  `- reference adoption gate: ${referenceAdoptionsPassed ? 'ready' : 'not verified'}`,
  `- deterministic runtime summary: ${deterministicRuntimeSummaryReady ? 'ready' : 'not verified'}`,
  `- handoff generator: ${handoffGeneratorPassed ? 'ready' : 'not verified'}`,
  `- production readiness gate: ${productionReadinessGatePassed ? 'ready' : 'not verified'}`,
  `- openai live validation: ${liveOpenAIStatus.label}`,
  `- anthropic live validation: ${liveAnthropicStatus.label}`,
  `- local live validation: ${liveLocalStatus.label}`,
  `- hermes live validation: ${liveHermesStatus.label}`,
  `- browser interaction e2e: ${browserE2EPassed ? 'ready' : 'not verified'}`,
  '',
  '## Recommended Next Action',
  '',
];

if (!browserE2EPassed) {
  lines.push('- `npm run smoke:ui-execution-browser-e2e`를 먼저 통과시켜 browser interaction evidence를 생성할 것');
} else if (liveProviderStatuses.some(({ status }) => !status.checked)) {
  lines.push('- `npm run preflight:execution-v1:all`로 provider별 env/readiness 상태를 먼저 확인할 것');
  for (const providerStatus of liveProviderStatuses) {
    if (providerStatus.status.checked) {
      continue;
    }
    if (String(providerStatus.status.label || '').startsWith('failed')) {
      lines.push(`- ${providerStatus.displayName}: live failure triage를 먼저 해결한 뒤 \`${providerStatus.liveCommand}\`로 재검증할 것`);
    } else if (providerStatus.envValue) {
      lines.push(`- ${providerStatus.displayName}: \`node scripts/build-execution-v1-evidence.mjs ${providerStatus.evidenceFlag}\` 또는 \`${providerStatus.liveCommand}\`로 live validation evidence를 갱신할 것`);
    } else {
      lines.push(`- ${providerStatus.displayName}: \`${providerStatus.missingEnvCommand}\` 실행할 것`);
    }
  }
} else {
  lines.push('- execution v1 deterministic closeout과 configured provider live validation이 완료 상태입니다.');
}

lines.push(
  '',
  '## Live Failure Triage',
  '',
);

appendLiveFailureTriage(lines, 'openai', liveOpenAIStatus);
appendLiveFailureTriage(lines, 'anthropic', liveAnthropicStatus);
appendLiveFailureTriage(lines, 'local', liveLocalStatus);
appendLiveFailureTriage(lines, 'hermes', liveHermesStatus);

lines.push(
  '',
  '## Notes',
  '',
  '- 이 문서는 `build-execution-v1-evidence.mjs` 결과를 기반으로 다시 생성된다.',
  '- deterministic smoke는 repo-local execution, CLI contract, operator console, browser interaction까지 포함한 local-first 경로를 닫는다.',
  '- reference adoption gate는 외부 reference 기반으로 이식한 compaction, provider guard, Hermes provider/profile, conversion, retrieval, fact graph, instruction-boundary, orchestration profile, UI blueprint, parallel specialist 흐름의 aggregate regression을 닫는다.',
  '- live validation은 provider credential과 runtime adapter가 준비된 환경에서만 추가 확인 대상으로 남는다.',
  '',
);

fs.mkdirSync(path.dirname(checklistPath), { recursive: true });
fs.writeFileSync(checklistPath, lines.join('\n'));

console.log(
  JSON.stringify(
    {
      ok: true,
      checklistPath,
      evidencePath,
      reusedEvidence: Boolean(reuseExistingEvidence || explicitEvidencePath),
      generatedAt,
    },
    null,
    2,
  ),
);

function getLiveStatus(evidenceMarkdown, provider, requested, envValue, envKey) {
  const passedPattern = new RegExp(`- ${provider}: passed`);
  const failedPattern = new RegExp(`- ${provider}: failed(?: \\((.+)\\))?`);
  const skippedPattern = new RegExp(`- ${provider}: skipped(?: \\((.+)\\))?`);

  if (passedPattern.test(evidenceMarkdown)) {
    return { checked: true, label: 'passed' };
  }

  const failedMatch = evidenceMarkdown.match(failedPattern);
  if (failedMatch) {
    return {
      checked: false,
      parsedReason: parseLiveValidationReason(failedMatch[1] || ''),
      label: failedMatch[1] ? `failed (${failedMatch[1]})` : 'failed',
    };
  }

  const skippedMatch = evidenceMarkdown.match(skippedPattern);
  if (skippedMatch) {
    if (isMissingEnvSkip(skippedMatch[1] || '', envKey, envValue)) {
      return { checked: false, label: 'missing-env' };
    }
    return { checked: false, label: 'skipped' };
  }

  if (!requested) {
    return { checked: false, label: envValue ? 'not-requested' : 'missing-env' };
  }

  return { checked: false, label: 'requested-but-not-passed' };
}

function isMissingEnvSkip(reason, envKey, envValue) {
  const normalizedReason = String(reason || '').trim();
  if (normalizedReason === `Missing ${envKey}`) {
    return true;
  }
  return !envValue && (normalizedReason === '' || /^Missing [A-Z0-9_]+$/.test(normalizedReason));
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

function appendLiveFailureTriage(lines, provider, status) {
  if (status?.checked) {
    lines.push(`- ${provider}: no active blocker`);
    return;
  }

  if (!status?.parsedReason) {
    lines.push(`- ${provider}: ${status?.label || 'no structured failure detail'}`);
    return;
  }

  lines.push(`- ${provider}: ${status.parsedReason.message}`);
  const details = status.parsedReason.details || {};
  if (details.rootDir) {
    lines.push(`  - rootDir: ${details.rootDir}`);
  }
  if (details.workspaceId) {
    lines.push(`  - workspaceId: ${details.workspaceId}`);
  }
  if (details.missionId) {
    lines.push(`  - missionId: ${details.missionId}`);
  }
  if (details.sessionId) {
    lines.push(`  - sessionId: ${details.sessionId}`);
  }
  if (details.artifact) {
    lines.push(`  - artifact: ${details.artifact}`);
  }
  if (details.reviewerSummary) {
    lines.push(`  - reviewerSummary: ${details.reviewerSummary}`);
  }
  const triage = readLiveValidationTriage(status.parsedReason);
  const providerFailure = readLiveValidationProviderFailure(status.parsedReason)
    || readLiveValidationProviderFailureFromEvidence(provider);
  lines.push(...formatLiveValidationProviderFailureLines(providerFailure));
  if (triage?.reviewerReportPath) {
    lines.push(`  - reviewerReportPath: ${triage.reviewerReportPath}`);
  }
  if (triage?.implementationProposalPath) {
    lines.push(`  - implementationProposalPath: ${triage.implementationProposalPath}`);
  }
  for (const check of triage?.failedChecks || []) {
    lines.push(`  - failedCheck: ${check}`);
  }
  for (const finding of triage?.findings || []) {
    lines.push(`  - finding: ${finding}`);
  }
  if (triage?.nextActionSnippet) {
    lines.push(`  - nextActionSnippet: ${compactSingleLine(triage.nextActionSnippet)}`);
  }
}

function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: repoDir,
    encoding: 'utf8',
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed\n${result.stderr || result.stdout}`);
  }

  return String(result.stdout || '').trim();
}

function compactSingleLine(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function readLiveValidationProviderFailureFromEvidence(provider) {
  const section = extractSection(evidenceBody, 'Live Validation');
  if (!section) {
    return null;
  }

  const lines = section.split('\n');
  const providerLineIndex = lines.findIndex((line) => line.trim().startsWith(`- ${provider}: failed`));
  if (providerLineIndex < 0) {
    return null;
  }

  const fields = {};
  for (let index = providerLineIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^- \S/.test(line)) {
      break;
    }
    const match = line.match(/^\s+- ([^:]+):\s*(.*)$/);
    if (match) {
      fields[match[1].trim()] = match[2].trim();
    }
  }

  if (!Object.keys(fields).length) {
    return null;
  }

  return {
    failureKind: fields.failureKind || '',
    httpStatus: fields.httpStatus || '',
    providerId: fields.providerId || '',
    rawMessage: fields.providerMessage || '',
    recoverable: fields.recoverable || '',
    role: fields.failedRole || '',
    timedOut: fields.timedOut || '',
  };
}

function extractSection(markdown, heading) {
  const pattern = new RegExp(`## ${escapeRegExp(heading)}\\n([\\s\\S]*?)(?:\\n## |$)`);
  const match = String(markdown || '').match(pattern);
  return match?.[1]?.trim() || '';
}
