import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const outputPath = path.join(docsDir, 'production-provider-readiness-v1.md');
const providerOrder = ['openai', 'anthropic', 'local', 'hermes'];

const generatedAt = new Date().toISOString();
const sourceCommit = runGit(['rev-parse', 'HEAD']);
const sourceBranch = runGit(['branch', '--show-current']);
const releaseReadiness = readRequiredFile(path.join(docsDir, 'release-readiness-v1.md'));
const closeout = readRequiredFile(path.join(docsDir, 'execution-v1-closeout.md'));
const handoff = readRequiredFile(path.join(docsDir, 'execution-v1-handoff.md'));
const releaseLabel = extractBulletValue(releaseReadiness, 'releaseLabel');
const currentStatus = extractStatusMap(closeout, 'Current Status');
const operationalState = extractStatusMap(handoff, 'Operational State');

const preflightResult = runPreflightAll();
const providerRows = providerOrder.map((provider) => buildProviderRow(provider, preflightResult.parsed));

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  renderProviderReadinessMarkdown({
    generatedAt,
    preflightResult,
    providerRows,
    releaseLabel,
    sourceBranch,
    sourceCommit,
  }),
  'utf8',
);

console.log(
  JSON.stringify(
    {
      blockedCount: preflightResult.parsed.blockedCount ?? providerRows.filter((row) => row.preflightStatus === 'blocked').length,
      failedCommandCount: preflightResult.ok ? 0 : 1,
      generatedAt,
      missingEnvCount: preflightResult.parsed.missingEnvCount ?? providerRows.filter((row) => row.envReady === false).length,
      mode: 'production-provider-readiness',
      ok: preflightResult.ok,
      outputPath: path.relative(repoDir, outputPath),
      productionReadyClaim: false,
      providerCount: providerRows.length,
      readyForLiveCount: preflightResult.parsed.readyForLiveCount ?? providerRows.filter((row) => row.preflightStatus === 'ready-for-live-validation').length,
      sourceCommit,
    },
    null,
    2,
  ),
);

if (!preflightResult.ok) {
  process.exitCode = 1;
}

function runPreflightAll() {
  const startedAt = Date.now();
  const result = spawnSync('npm', ['run', 'preflight:execution-v1:all'], {
    cwd: repoDir,
    encoding: 'utf8',
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const parsed = parseLastJson(`${result.stdout || ''}\n${result.stderr || ''}`);
  return {
    durationMs: Date.now() - startedAt,
    exitCode: typeof result.status === 'number' ? result.status : 1,
    ok: result.status === 0 && parsed.ok === true,
    parsed,
  };
}

function buildProviderRow(provider, parsed) {
  const providerPreflight = Array.isArray(parsed.providers)
    ? parsed.providers.find((entry) => entry.provider === provider) || {}
    : {};
  const statusKey = provider === 'openai' || provider === 'anthropic'
    ? `${provider} live validation`
    : provider === 'local'
      ? 'local live validation'
      : 'hermes live validation';
  const operationalKey = provider === 'openai'
    ? 'OpenAI live validation'
    : provider === 'anthropic'
      ? 'Anthropic live validation'
      : provider === 'local'
        ? 'local provider live validation'
        : 'Hermes live validation';

  return {
    archivedLiveStatus: currentStatus.get(statusKey) || 'unknown',
    checkSummary: Array.isArray(providerPreflight.checks)
      ? providerPreflight.checks.map((check) => `${check.script}:${check.status}`).join(', ')
      : '',
    envKey: String(providerPreflight.envKey || ''),
    envReady: Boolean(providerPreflight.envReady),
    liveCommand: String(providerPreflight.liveCommand || `npm run live:execution-v1:${provider}`),
    missingEnvCommand: String(providerPreflight.missingEnvCommand || ''),
    operationalState: operationalState.get(operationalKey) || 'unknown',
    preflightStatus: String(providerPreflight.status || 'missing-preflight'),
    provider,
  };
}

function renderProviderReadinessMarkdown({
  generatedAt,
  preflightResult,
  providerRows,
  releaseLabel,
  sourceBranch,
  sourceCommit,
}) {
  const status = preflightResult.ok ? 'local-provider-readiness-current' : 'local-provider-readiness-failed';
  const operatingInterpretationRows = buildOperatingInterpretationRows(providerRows).join('\n');
  const rows = providerRows
    .map(
      (row) =>
        `| ${formatTableCell(row.provider)} | ${formatTableCell(row.preflightStatus)} | ${formatTableCell(row.envKey)} | ${row.envReady ? 'yes' : 'no'} | ${formatTableCell(row.archivedLiveStatus)} | \`${formatTableCell(row.liveCommand)}\` |`,
    )
    .join('\n');
  const commandRows = [
    `| \`npm run preflight:execution-v1:all\` | ${preflightResult.ok ? 'pass' : 'fail'} | ${preflightResult.exitCode} | ${preflightResult.durationMs} |`,
  ].join('\n');
  const providerDetails = providerRows
    .map(
      (row) => `### ${row.provider}

- preflightStatus: ${row.preflightStatus}
- envKey: ${row.envKey}
- envReady: ${row.envReady ? 'true' : 'false'}
- deterministicChecks: ${row.checkSummary || 'not reported'}
- archivedLiveStatus: ${row.archivedLiveStatus}
- operationalState: ${row.operationalState}
- liveCommand: \`${row.liveCommand}\`
- missingEnvCommand: \`${row.missingEnvCommand}\``,
    )
    .join('\n\n');
  const keySignals = JSON.stringify(
    {
      blockedCount: preflightResult.parsed.blockedCount,
      missingEnvCount: preflightResult.parsed.missingEnvCount,
      readyForLiveCount: preflightResult.parsed.readyForLiveCount,
      status: preflightResult.parsed.status,
    },
    null,
    2,
  );

  return `# Production Provider Readiness v1

- status: ${status}
- generatedAt: ${generatedAt}
- sourceBranch: ${sourceBranch}
- sourceCommit: ${sourceCommit}
- releaseLabel: ${releaseLabel}
- scope: local provider preflight and live-validation handoff readiness rehearsal
- productionReadyClaim: false
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedEvidence: [execution-v1-evidence.md](execution-v1-evidence.md)
- relatedCloseout: [execution-v1-closeout.md](execution-v1-closeout.md)
- relatedHandoff: [execution-v1-handoff.md](execution-v1-handoff.md)
- relatedTargetProviderEvidenceIntake: [target-provider-evidence-intake-v1.md](target-provider-evidence-intake-v1.md)
- relatedTargetProviderOperations: [target-provider-operations-v1.md](target-provider-operations-v1.md)
- relatedTargetOpenAIProviderAccount: [target-openai-provider-account-v1.md](target-openai-provider-account-v1.md)
- relatedTargetAnthropicProviderAccount: [target-anthropic-provider-account-v1.md](target-anthropic-provider-account-v1.md)
- relatedTargetLocalProviderArchitecture: [target-local-provider-architecture-v1.md](target-local-provider-architecture-v1.md)
- relatedTargetHermesProviderArchitecture: [target-hermes-provider-architecture-v1.md](target-hermes-provider-architecture-v1.md)

## Decision Boundary

This rehearsal proves that OpenAI, Anthropic, local, and Hermes provider deterministic prerequisites can be checked together and that missing environment or account-level blockers are visible before live validation.

It is not live-provider-complete evidence, not target production provider validation, not provider account remediation proof, and not permission to claim \`production-ready\`.

Production-ready remains blocked until every provider included in the target release has a complete target provider evidence intake packet and successful live validation archived from the approved production-like deployment boundary.

## Command Matrix

| Command | Result | Exit Code | Duration Ms |
| --- | --- | ---: | ---: |
${commandRows}

## Key Signals

\`\`\`json
${keySignals}
\`\`\`

## Provider Matrix

| Provider | Preflight Status | Env Key | Env Ready | Archived Live Status | Live Command |
| --- | --- | --- | --- | --- | --- |
${rows}

## Provider Details

${providerDetails}

## Operating Interpretation

${operatingInterpretationRows}

## Target Provider Evidence Intake

Before any provider is included in a production claim, the operator must verify [target-provider-evidence-intake-v1.md](target-provider-evidence-intake-v1.md) and attach provider owner, target boundary, secret manager alias, model/endpoint pinning, quota/cost guard, archived live validation, provider blocker closure verification, and fallback/stop-condition evidence.

## Target Provider Operations

Before any provider is presented as target production-operational, the operator must verify [target-provider-operations-v1.md](target-provider-operations-v1.md) and attach provider account approval, target secret injection, target-boundary live validation, model/endpoint pinning, quota/cost/resource guard, fallback/disable path, provider fallback runtime audit, target blocker closure verification matrix, telemetry, incident triage, data/transcript handling, remediation/renewal, evidence retention, and provider failure containment evidence.

## Operator Re-Run

\`\`\`bash
npm run rehearsal:production-provider-readiness
npm run smoke:production-provider-readiness
npm run smoke:target-provider-evidence-intake
npm run smoke:target-provider-operations
npm run smoke:target-openai-provider-account
npm run smoke:target-anthropic-provider-account
npm run smoke:target-local-provider-architecture
npm run smoke:target-hermes-provider-architecture
\`\`\`

## Acceptance Rule

The rehearsal is acceptable only when aggregate preflight reports \`blockedCount: 0\`, every provider appears in the provider matrix, and missing env or account blockers remain explicit.

The rehearsal must keep \`productionReadyClaim: false\` until target provider evidence intake is complete and live validation evidence is archived for every provider included in the target production claim.
`;
}

function buildOperatingInterpretationRows(providerRows) {
  const rowByProvider = new Map(providerRows.map((row) => [row.provider, row]));
  const passedProviders = providerRows
    .filter((row) => isPassedLiveStatus(row.archivedLiveStatus))
    .map((row) => formatProviderDisplay(row.provider));
  const rows = [];

  rows.push(
    passedProviders.length
      ? `- archived passed live providers in the current release evidence: ${passedProviders.join(', ')}`
      : '- no archived passed live providers are present in the current release evidence',
  );

  if (!isPassedLiveStatus(rowByProvider.get('anthropic')?.archivedLiveStatus)) {
    rows.push('- Anthropic remains blocked until provider account billing or credit is remediated and live validation passes');
  }

  if (isPassedLiveStatus(rowByProvider.get('local')?.archivedLiveStatus)) {
    rows.push('- local provider live validation is archived as passed for the configured model/endpoint used by this rehearsal, while target local provider architecture remains the production gate');
  } else {
    rows.push('- local provider remains blocked until an approved `LOCAL_PROVIDER_MODEL` and endpoint/runtime configuration are provided');
  }

  if (!isPassedLiveStatus(rowByProvider.get('hermes')?.archivedLiveStatus)) {
    rows.push('- Hermes remains blocked until approved Hermes endpoint/model configuration is injected and live validation passes');
  }

  rows.push(
    '- deterministic provider preflight passing is necessary but not sufficient for production provider readiness',
    '- target provider evidence intake contract remains the gate for provider account approval, target secret injection, target-boundary live validation, quota/cost guard, model/endpoint pinning, failure triage evidence, and provider blocker closure verification',
    '- target provider operations contract remains the gate for model/endpoint pinning, quota/cost/resource guard, fallback/disable path, provider fallback runtime audit, target blocker closure verification matrix, telemetry, incident triage, data/transcript handling, remediation/renewal, evidence retention, and provider failure containment evidence',
    '- target OpenAI provider account remains the gate for account ownership, billing/quota, API key injection, model access, provider terms, usage/cost guard, target live validation, telemetry, fallback, and renewal/review audit requirements',
    '- target Anthropic provider account remains the gate for account ownership, billing/credit, API key injection, model access, provider terms, quota/spend guard, target live validation, telemetry, fallback, and remediation audit requirements',
    '- target local provider architecture remains the gate for endpoint ownership, model pinning, network isolation, credential policy, runtime lifecycle, session provenance, data residency, quota/resource guard, telemetry, fallback, and customer approval decision requirements',
    '- target Hermes provider architecture remains the gate for endpoint ownership, model pinning, secret injection, tool-call parsing, session lifecycle, transcript policy, quota guard, telemetry, fallback, and customer approval decision requirements',
  );

  return rows;
}

function isPassedLiveStatus(value) {
  return /^passed\b/.test(String(value || '').trim());
}

function formatProviderDisplay(provider) {
  if (provider === 'openai') {
    return 'OpenAI';
  }
  if (provider === 'anthropic') {
    return 'Anthropic';
  }
  if (provider === 'hermes') {
    return 'Hermes';
  }
  return String(provider || '').trim();
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

function extractBulletValue(markdown, label) {
  const match = String(markdown || '').match(new RegExp(`^- ${escapeRegExp(label)}:\\s+(.+)$`, 'm'));
  return match ? String(match[1] || '').trim() : '';
}

function extractStatusMap(markdown, heading) {
  return new Map(
    extractListItems(extractSection(markdown, `## ${heading}`))
      .map((line) => {
        const separatorIndex = line.indexOf(':');
        if (separatorIndex === -1) {
          return null;
        }
        return [
          String(line.slice(0, separatorIndex) || '').trim(),
          String(line.slice(separatorIndex + 1) || '').trim(),
        ];
      })
      .filter(Boolean),
  );
}

function extractSection(markdown, heading) {
  const escapedHeading = escapeRegExp(heading);
  const pattern = new RegExp(`${escapedHeading}\\n([\\s\\S]*?)(?:\\n## |$)`);
  const match = String(markdown || '').match(pattern);
  return match ? String(match[1] || '').trim() : '';
}

function extractListItems(markdown) {
  return String(markdown || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim());
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatTableCell(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
