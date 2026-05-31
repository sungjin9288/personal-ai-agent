import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const outputPath = path.join(docsDir, 'production-provider-readiness-v1.md');
const providerOrder = ['openai', 'anthropic', 'local', 'hermes'];
const hermesTargetProviderArchitectureEvidence =
  'target Hermes provider architecture evidence for endpoint ownership proof, HERMES_PROVIDER_MODEL model pinning proof, ' +
  'target secret injection proof, tool-call parsing proof, session lifecycle proof with mission id, execution session id, ' +
  'provider response id, retry lineage, artifact provenance, and handoff reference, data and transcript policy proof, ' +
  'quota and rate guard proof, telemetry proof, fallback and stop-condition proof with fallback policy id, stop reason, ' +
  'and recoverable-provider-failure-only stop evidence, customer approval proof, provider operations proof, ' +
  'target-boundary live:execution-v1:hermes proof, release artifact hygiene result, and regenerated execution snapshot evidence';

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
const currentOpenBlockerActions = buildCurrentOpenBlockerActions(releaseReadiness);
const providerRows = providerOrder.map((provider) => {
  const row = buildProviderRow(provider, preflightResult.parsed);
  return {
    ...row,
    blockerClosureVerification: buildProviderBlockerClosureVerificationSummary(
      provider,
      currentOpenBlockerActions,
    ),
  };
});

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
    evidenceCommand: String(providerPreflight.evidenceCommand || ''),
    liveCommand: String(providerPreflight.liveCommand || `npm run live:execution-v1:${provider}`),
    missingEnvCommand: String(providerPreflight.missingEnvCommand || ''),
    operationalState: operationalState.get(operationalKey) || 'unknown',
    preflightStatus: String(providerPreflight.status || 'missing-preflight'),
    provider,
    requiredClosingEvidence: String(providerPreflight.requiredClosingEvidence || ''),
    stopCondition: providerPreflight.stopCondition || null,
    stopConditionId: String(providerPreflight.stopConditionId || providerPreflight.stopCondition?.id || ''),
    stopReason: String(providerPreflight.stopReason || providerPreflight.stopCondition?.reason || ''),
    targetStopConditionId: String(
      providerPreflight.targetStopConditionId || providerPreflight.stopCondition?.targetStopConditionId || '',
    ),
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
  const providerClosureLinkageRows = buildProviderClosureLinkageRows(providerRows).join('\n');
  const operatingInterpretationRows = buildOperatingInterpretationRows(providerRows).join('\n');
  const stopConditionRows = buildStopConditionRows(providerRows).join('\n');
  const rows = providerRows
    .map(
      (row) =>
        `| ${formatTableCell(row.provider)} | ${formatTableCell(row.preflightStatus)} | ${formatTableCell(row.envKey)} | ${row.envReady ? 'yes' : 'no'} | ${formatTableCell(row.archivedLiveStatus)} | \`${formatTableCell(row.liveCommand)}\` | ${formatTableCell(row.stopConditionId || 'none')} | ${formatTableCell(row.targetStopConditionId || 'none')} |`,
    )
    .join('\n');
  const commandRows = [
    `| \`npm run preflight:execution-v1:all\` | ${preflightResult.ok ? 'pass' : 'fail'} | ${preflightResult.exitCode} | ${preflightResult.durationMs} |`,
  ].join('\n');
  const providerDetails = providerRows
    .map(
      (row) => {
        const closureSummary = row.blockerClosureVerification || {};
        return `### ${row.provider}

- preflightStatus: ${row.preflightStatus}
- envKey: ${row.envKey}
- envReady: ${row.envReady ? 'true' : 'false'}
- deterministicChecks: ${row.checkSummary || 'not reported'}
- archivedLiveStatus: ${row.archivedLiveStatus}
- operationalState: ${row.operationalState}
- liveCommand: \`${row.liveCommand}\`
- missingEnvCommand: \`${row.missingEnvCommand}\`
- evidenceCommand: \`${row.evidenceCommand}\`
- stopConditionId: ${row.stopConditionId || 'none'}
- stopReason: ${row.stopReason || 'none'}
- targetStopConditionId: ${row.targetStopConditionId || 'none'}
- requiredClosingEvidence: ${row.requiredClosingEvidence || 'not reported'}
- linkedBlockers: ${formatInlineList(closureSummary.actionIds)}
- providerBlockers: ${formatInlineList(closureSummary.providerActionIds)}
- sharedProviderOperationsBlockers: ${formatInlineList(closureSummary.sharedActionIds)}
- closureVerificationIds: ${formatInlineList(closureSummary.closureVerificationIds)}
- closureVerificationCount: ${closureSummary.closureVerificationCount ?? 0}
- requiredCommandCount: ${closureSummary.commandCount ?? 0}
- requiredEvidenceDocCount: ${closureSummary.evidenceDocCount ?? 0}
- requiredProofCount: ${closureSummary.requiredProofCount ?? 0}
- targetBoundaryRequiredCount: ${closureSummary.targetBoundaryRequiredCount ?? 0}
- productionReadyBlockedCount: ${closureSummary.productionReadyBlockedCount ?? 0}
- productionReadyClaimAllowed: ${closureSummary.productionReadyClaimAllowed === true ? 'true' : 'false'}`;
      },
    )
    .join('\n\n');
  const keySignals = JSON.stringify(
    {
      blockedCount: preflightResult.parsed.blockedCount,
      missingEnvCount: preflightResult.parsed.missingEnvCount,
      readyForLiveCount: preflightResult.parsed.readyForLiveCount,
      status: preflightResult.parsed.status,
      stopConditionCount: preflightResult.parsed.stopConditionCount,
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

| Provider | Preflight Status | Env Key | Env Ready | Archived Live Status | Live Command | Stop Condition | Target Stop Condition |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows}

## Provider Details

${providerDetails}

## Stop Condition Handoff

| Provider | Stop Condition | Stop Reason | Target Stop Condition | Evidence Command | Required Closing Evidence |
| --- | --- | --- | --- | --- | --- |
${stopConditionRows}

## Provider Blocker Closure Linkage

| Provider | Linked Blockers | Shared Provider Operations Blocker | Closure Verifications | Required Proofs | Required Commands | Required Evidence Docs | Production Claim |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- |
${providerClosureLinkageRows}

Every provider readiness row must carry its provider-specific blocker plus the shared \`provider-operations\` blocker. Keep \`productionReadyClaim: false\` until both linked closure verifications have same-boundary target evidence, accepted decision owner proof, provider fallback policy and stop reason proof, release artifact hygiene, and regenerated execution-v1 snapshot evidence.

## Release Blocker Closure Linkage

| Blocker | Provider Stop Condition | Provider Evidence Stop Condition | Provider Operations Stop Condition | Boundary Stop Condition | Closure Verifications | Required Proofs | Required Commands | Required Evidence Docs | Production Claim |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| production provider readiness | provider-live-validation-missing-or-failed | target-provider-evidence-intake-missing | target-provider-operations-evidence-remains-blocked-until-comple | provider-target-boundary-missing-or-mismatched | 4 | 14 | 12 | 6 | blocked |

Production provider readiness owns the aggregate provider preflight, live validation handoff, stop condition handoff, provider blocker closure linkage, missing environment visibility, archived live status, and production provider claim decision proof. Target provider evidence intake owns provider account or architecture approval, target secret injection, target-boundary live validation, quota and cost guard, model and endpoint pinning, failure triage, and provider blocker closure verification proof. Target provider operations owns shared provider runtime operations, fallback and disable path, provider fallback runtime audit, telemetry, incident triage, transcript handling, remediation and renewal, evidence retention, and provider failure containment proof. Provider-specific account or architecture gates own OpenAI, Anthropic, local, and Hermes closing evidence. Keep \`productionReadyClaim: false\` until linked closure verifications have every included provider's account or architecture approval proof, target secret injection proof, target-boundary live validation proof, provider operations proof, provider fallback policy and stop reason proof, release artifact hygiene result, production readiness gate result, refreshed provider readiness rehearsal, refreshed execution-v1 evidence, and regenerated execution-v1 snapshot evidence from the same approved production-like provider boundary.

## Operating Interpretation

${operatingInterpretationRows}

## Target Provider Evidence Intake

Before any provider is included in a production claim, the operator must verify [target-provider-evidence-intake-v1.md](target-provider-evidence-intake-v1.md) and attach provider owner proof, target boundary proof, approved secret manager platform proof, runtime injection proof, least-privilege access policy proof, and secret access audit log proof, model and endpoint pinning proof, quota and cost guard proof, archived live validation proof, provider blocker closure verification proof, and fallback and stop-condition evidence.

## Target Provider Operations

Before any provider is presented as target production-operational, the operator must verify [target-provider-operations-v1.md](target-provider-operations-v1.md) and attach provider account approval proof, target secret injection proof, target-boundary live validation proof, model and endpoint pinning proof, quota, cost, and resource guard proof, fallback and disable path proof, provider fallback runtime audit proof, target blocker closure verification matrix, telemetry proof, incident triage proof, data and transcript handling proof, remediation and renewal review proof, evidence retention proof, and provider failure containment evidence.

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

function buildStopConditionRows(providerRows) {
  return providerRows.map((row) => {
    const stopConditionId = row.stopConditionId || 'none';
    const stopReason = row.stopReason || 'none';
    const targetStopConditionId = row.targetStopConditionId || 'none';
    const evidenceCommand = row.evidenceCommand || 'not reported';
    const requiredClosingEvidence = row.requiredClosingEvidence || 'not reported';
    return `| ${formatTableCell(row.provider)} | ${formatTableCell(stopConditionId)} | ${formatTableCell(stopReason)} | ${formatTableCell(targetStopConditionId)} | \`${formatTableCell(evidenceCommand)}\` | ${formatTableCell(requiredClosingEvidence)} |`;
  });
}

function buildProviderClosureLinkageRows(providerRows) {
  return providerRows.map((row) => {
    const summary = row.blockerClosureVerification || {};
    return `| ${formatTableCell(row.provider)} | ${formatTableCell(formatTableList(summary.actionIds))} | ${formatTableCell(formatTableList(summary.sharedActionIds))} | ${summary.closureVerificationCount ?? 0} | ${summary.requiredProofCount ?? 0} | ${summary.commandCount ?? 0} | ${summary.evidenceDocCount ?? 0} | ${summary.productionReadyClaimAllowed === true ? 'allowed' : 'blocked'} |`;
  });
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
    rows.push('- local provider live validation is archived as passed for the configured model and endpoint used by this rehearsal, while target local provider architecture remains the production gate');
  } else {
    rows.push('- local provider remains blocked until an approved `LOCAL_PROVIDER_MODEL` and endpoint/runtime configuration are provided');
  }

  if (!isPassedLiveStatus(rowByProvider.get('hermes')?.archivedLiveStatus)) {
    rows.push(`- Hermes remains blocked until ${hermesTargetProviderArchitectureEvidence} is recorded`);
  }

  rows.push(
    '- deterministic provider preflight passing is necessary but not sufficient for production provider readiness',
    '- target provider evidence intake contract remains the gate for provider account approval proof, target secret injection proof, target-boundary live validation proof, quota and cost guard proof, model and endpoint pinning proof, failure triage evidence, and provider blocker closure verification proof',
    '- target provider operations contract remains the gate for model and endpoint pinning proof, quota, cost, and resource guard proof, fallback and disable path proof, provider fallback runtime audit proof, target blocker closure verification matrix, telemetry proof, incident triage proof, data and transcript handling proof, remediation and renewal review proof, evidence retention proof, and provider failure containment evidence',
    '- target OpenAI provider account remains the gate for account ownership proof, billing and quota proof, API key and secret injection proof, OPENAI_MODEL model access proof, provider terms and customer approval proof, usage and cost guard proof, target-boundary OpenAI live validation proof, telemetry proof, fallback and stop-condition proof, renewal and review audit proof, release artifact hygiene result, and regenerated execution snapshot evidence requirements',
    '- target Anthropic provider account remains the gate for account ownership proof, billing and credit remediation proof, API key and secret injection proof, ANTHROPIC_MODEL model access proof, provider terms and customer approval proof, quota and spend guard proof, target-boundary Anthropic live validation proof, telemetry proof, fallback and stop-condition proof, remediation audit proof, release artifact hygiene result, and regenerated execution snapshot evidence requirements',
    '- target local provider architecture remains the gate for endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof, target-boundary local provider live validation proof, release artifact hygiene result, and regenerated execution snapshot evidence requirements',
    '- target Hermes provider architecture remains the gate for endpoint ownership proof, HERMES_PROVIDER_MODEL model pinning proof, target secret injection proof, tool-call parsing proof, session lifecycle proof, data and transcript policy proof, quota and rate guard proof, telemetry proof, fallback and stop-condition proof, customer approval proof, target-boundary Hermes live validation proof, release artifact hygiene result, and regenerated execution snapshot evidence requirements',
  );

  return rows;
}

function buildCurrentOpenBlockerActions(markdown = '') {
  return extractListItems(extractSection(markdown, '## Current Open Blockers'))
    .map((blocker, index) => buildCurrentOpenBlockerAction(blocker, index))
    .map((action) => attachCurrentOpenBlockerClosureVerification(action));
}

function buildReleaseReadinessCommand(label, command, kind = 'verification') {
  return {
    command,
    kind,
    label,
  };
}

function buildReleaseReadinessDoc(label, docPath) {
  const relativePath = String(docPath || '').trim();
  return {
    exists: Boolean(relativePath && fs.existsSync(path.join(repoDir, relativePath))),
    href: relativePath,
    label,
    path: relativePath,
  };
}

function buildCurrentOpenBlockerActionId(blocker = '', index = 0) {
  const normalized = String(blocker || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return normalized || `current-open-blocker-${index + 1}`;
}

function buildCurrentOpenBlockerAction(blocker = '', index = 0) {
  const normalized = String(blocker || '').toLowerCase();
  const base = {
    blocker: String(blocker || '').trim(),
    category: 'release-readiness',
    commands: [
      buildReleaseReadinessCommand('Production readiness gate', 'npm run smoke:production-readiness-gate'),
    ],
    evidenceDocs: [
      buildReleaseReadinessDoc('Release readiness decision', 'docs/release-readiness-v1.md'),
    ],
    id: buildCurrentOpenBlockerActionId(blocker, index),
    nextEvidence: 'Record blocker disposition, closing evidence, and release decision update before changing the release label.',
    owner: 'release-owner',
    priority: index + 1,
    status: 'blocked',
    stopReason: String(blocker || '').trim(),
  };

  if (normalized.includes('anthropic live validation')) {
    return {
      ...base,
      category: 'provider-account',
      commands: [
        buildReleaseReadinessCommand('Anthropic preflight', 'npm run preflight:execution-v1:anthropic', 'preflight'),
        buildReleaseReadinessCommand(
          'Anthropic live validation',
          'export ANTHROPIC_API_KEY="..." && npm run live:execution-v1:anthropic',
          'live-validation',
        ),
        buildReleaseReadinessCommand('Target Anthropic account gate', 'npm run smoke:target-anthropic-provider-account'),
      ],
      evidenceDocs: [
        buildReleaseReadinessDoc('Target Anthropic provider account', 'docs/target-anthropic-provider-account-v1.md'),
        buildReleaseReadinessDoc('Production provider readiness', 'docs/production-provider-readiness-v1.md'),
        buildReleaseReadinessDoc('Release readiness decision', 'docs/release-readiness-v1.md'),
      ],
      nextEvidence: 'Target Anthropic provider account evidence, target-boundary Anthropic live validation proof, provider operations proof, release artifact hygiene result, and regenerated execution snapshot evidence.',
      owner: 'provider-ops',
      provider: 'anthropic',
      stopReason: 'Target Anthropic provider account lacks accepted same-boundary closure evidence.',
    };
  }

  if (normalized.includes('target openai provider account')) {
    return {
      ...base,
      category: 'provider-account',
      commands: [
        buildReleaseReadinessCommand('OpenAI preflight', 'npm run preflight:execution-v1:openai', 'preflight'),
        buildReleaseReadinessCommand(
          'OpenAI live validation',
          'export OPENAI_RUN_TIMEOUT_MS=60000 OPENAI_API_KEY="..." && npm run live:execution-v1:openai',
          'live-validation',
        ),
        buildReleaseReadinessCommand('Target OpenAI account gate', 'npm run smoke:target-openai-provider-account'),
      ],
      evidenceDocs: [
        buildReleaseReadinessDoc('Target OpenAI provider account', 'docs/target-openai-provider-account-v1.md'),
        buildReleaseReadinessDoc('Production provider readiness', 'docs/production-provider-readiness-v1.md'),
        buildReleaseReadinessDoc('Target environment evidence intake', 'docs/target-environment-evidence-intake-v1.md'),
      ],
      nextEvidence: 'Target OpenAI provider account evidence, target-boundary OpenAI live validation proof, provider operations proof, release artifact hygiene result, and regenerated execution snapshot evidence.',
      owner: 'provider-ops',
      provider: 'openai',
      stopReason: 'Target OpenAI provider account lacks accepted same-boundary closure evidence.',
    };
  }

  if (
    normalized.includes('target local provider architecture')
      && !normalized.includes('target deployment contract')
  ) {
    return {
      ...base,
      category: 'provider-architecture',
      commands: [
        buildReleaseReadinessCommand('Target local provider architecture gate', 'npm run smoke:target-local-provider-architecture'),
        buildReleaseReadinessCommand(
          'Local provider live validation',
          'export LOCAL_PROVIDER_MODEL="..." LOCAL_PROVIDER_BASE_URL="..." && npm run live:execution-v1:local',
          'live-validation',
        ),
        buildReleaseReadinessCommand('Target provider operations gate', 'npm run smoke:target-provider-operations'),
      ],
      evidenceDocs: [
        buildReleaseReadinessDoc('Target local provider architecture', 'docs/target-local-provider-architecture-v1.md'),
        buildReleaseReadinessDoc('Target provider operations', 'docs/target-provider-operations-v1.md'),
        buildReleaseReadinessDoc('Target provider evidence intake', 'docs/target-provider-evidence-intake-v1.md'),
      ],
      nextEvidence: 'Target local provider architecture evidence, target-boundary local provider live validation proof, provider operations proof, release artifact hygiene result, and regenerated execution snapshot evidence.',
      owner: 'provider-ops',
      provider: 'local',
      stopReason: 'Target local provider architecture lacks accepted same-boundary closure evidence.',
    };
  }

  if (normalized.includes('hermes live validation')) {
    return {
      ...base,
      category: 'provider-architecture',
      commands: [
        buildReleaseReadinessCommand('Target Hermes provider architecture gate', 'npm run smoke:target-hermes-provider-architecture'),
        buildReleaseReadinessCommand(
          'Hermes live validation',
          'export HERMES_PROVIDER_MODEL="..." && npm run live:execution-v1:hermes',
          'live-validation',
        ),
        buildReleaseReadinessCommand('Provider readiness rehearsal', 'npm run rehearsal:production-provider-readiness'),
      ],
      evidenceDocs: [
        buildReleaseReadinessDoc('Target Hermes provider architecture', 'docs/target-hermes-provider-architecture-v1.md'),
        buildReleaseReadinessDoc('Production provider readiness', 'docs/production-provider-readiness-v1.md'),
        buildReleaseReadinessDoc('Target provider operations', 'docs/target-provider-operations-v1.md'),
      ],
      nextEvidence: 'Target Hermes provider architecture evidence, target-boundary Hermes live validation proof, provider operations proof, release artifact hygiene result, and regenerated execution snapshot evidence.',
      owner: 'provider-ops',
      provider: 'hermes',
      stopReason: 'Target Hermes provider architecture lacks accepted same-boundary closure evidence.',
    };
  }

  if (
    normalized.includes('target provider operations evidence')
      && !normalized.includes('production release label')
      && !normalized.includes('target deployment contract')
  ) {
    return {
      ...base,
      category: 'provider-operations',
      commands: [
        buildReleaseReadinessCommand('Target provider operations gate', 'npm run smoke:target-provider-operations'),
        buildReleaseReadinessCommand('Target provider evidence intake gate', 'npm run smoke:target-provider-evidence-intake'),
        buildReleaseReadinessCommand('Provider fallback policy smoke', 'npm run smoke:provider-fallback-policy', 'runtime-audit'),
        buildReleaseReadinessCommand('Provider events fallback audit', 'npm run smoke:provider-events', 'runtime-audit'),
        buildReleaseReadinessCommand(
          'Provider attention remediation fallback audit',
          'npm run smoke:provider-attention-remediation',
          'runtime-audit',
        ),
        buildReleaseReadinessCommand('Mission timeline fallback audit', 'npm run smoke:mission-timeline', 'runtime-audit'),
        buildReleaseReadinessCommand('Workspace timeline fallback audit', 'npm run smoke:workspace-timeline', 'runtime-audit'),
        buildReleaseReadinessCommand('Operator timeline fallback audit', 'npm run smoke:operator-timeline', 'runtime-audit'),
        buildReleaseReadinessCommand('Release artifact hygiene smoke', 'npm run smoke:release-artifact-hygiene'),
      ],
      evidenceDocs: [
        buildReleaseReadinessDoc('Target provider operations', 'docs/target-provider-operations-v1.md'),
        buildReleaseReadinessDoc('Target provider evidence intake', 'docs/target-provider-evidence-intake-v1.md'),
        buildReleaseReadinessDoc('Target environment evidence intake', 'docs/target-environment-evidence-intake-v1.md'),
        buildReleaseReadinessDoc('Production provider readiness', 'docs/production-provider-readiness-v1.md'),
      ],
      nextEvidence: 'Target provider operations evidence with fallback runtime audit policy, stop reason, target blocker closure verification proof, release artifact hygiene result, and regenerated execution snapshot evidence.',
      owner: 'provider-ops',
      stopReason: 'Target provider operations lacks accepted same-boundary runtime audit and blocker closure verification evidence.',
    };
  }

  if (normalized.includes('production release label')) {
    return {
      ...base,
      category: 'release-decision',
      commands: [
        buildReleaseReadinessCommand('Aggregate provider preflight', 'npm run preflight:execution-v1:all', 'preflight'),
        buildReleaseReadinessCommand('Production readiness gate', 'npm run smoke:production-readiness-gate'),
        buildReleaseReadinessCommand('Production provider readiness smoke', 'npm run smoke:production-provider-readiness'),
        buildReleaseReadinessCommand('Production enterprise controls smoke', 'npm run smoke:production-enterprise-controls'),
      ],
      evidenceDocs: [
        buildReleaseReadinessDoc('Release readiness decision', 'docs/release-readiness-v1.md'),
        buildReleaseReadinessDoc('Production provider readiness', 'docs/production-provider-readiness-v1.md'),
        buildReleaseReadinessDoc('Production enterprise controls', 'docs/production-enterprise-controls-v1.md'),
      ],
      owner: 'release-owner',
    };
  }

  if (normalized.includes('target deployment contract')) {
    return {
      ...base,
      category: 'target-deployment',
      commands: [
        buildReleaseReadinessCommand('Target deployment contract gate', 'npm run smoke:target-deployment-contract'),
        buildReleaseReadinessCommand('Target environment evidence intake gate', 'npm run smoke:target-environment-evidence-intake'),
        buildReleaseReadinessCommand('Production-like release drill', 'npm run drill:production-like-release', 'rehearsal'),
        buildReleaseReadinessCommand('Production-like release drill smoke', 'npm run smoke:production-like-release-drill'),
      ],
      evidenceDocs: [
        buildReleaseReadinessDoc('Target deployment contract', 'docs/target-deployment-contract-v1.md'),
        buildReleaseReadinessDoc('Target environment evidence intake', 'docs/target-environment-evidence-intake-v1.md'),
        buildReleaseReadinessDoc('Production-like release drill', 'docs/production-like-release-drill-v1.md'),
      ],
      owner: 'deployment-owner',
    };
  }

  return base;
}

function buildCurrentOpenBlockerClosureVerification(action = {}) {
  const commands = Array.isArray(action.commands) ? action.commands : [];
  const evidenceDocs = Array.isArray(action.evidenceDocs) ? action.evidenceDocs : [];
  const category = String(action.category || 'release-readiness').trim() || 'release-readiness';
  const provider = String(action.provider || '').trim();
  const requiredProofs = [
    'same-boundary target evidence packet proof',
    'blocker disposition proof with accountable decision owner',
    'target-boundary command rerun proof',
    'release artifact hygiene pass proof',
    'regenerated execution-v1 artifact snapshot proof',
    'production readiness gate proof',
  ];

  if (category === 'provider-account') {
    requiredProofs.push(
      'provider account or billing/quota approval proof',
      'approved target secret injection proof',
      'target-boundary provider live validation proof',
      'provider fallback policy and stop reason proof',
    );
  }

  if (category === 'provider-architecture') {
    requiredProofs.push(
      'provider endpoint or model architecture approval proof',
      'runtime lifecycle and provenance proof',
      'target-boundary provider live validation proof',
      'provider fallback policy and stop reason proof',
    );
  }

  if (category === 'provider-operations') {
    requiredProofs.push(
      'per-provider operations capture template proof',
      'provider fallback runtime audit proof',
      'provider telemetry and incident triage proof',
      'provider failure containment proof',
    );
  }

  if (category === 'target-deployment') {
    requiredProofs.push(
      'target deployment name and profile decision proof',
      'mandatory control evidence proof',
      'target environment submission packet proof',
      'production-like drill proof',
    );
  }

  if (category === 'release-decision') {
    requiredProofs.push(
      'accepted risk register proof',
      'allowed claim text proof',
      'release decision owner approval proof',
      'next review date proof',
    );
  }

  return {
    blockerId: String(action.id || '').trim(),
    category,
    currentState: String(action.status || 'blocked').trim() || 'blocked',
    id: `${String(action.id || 'current-open-blocker').trim() || 'current-open-blocker'}-closure-verification`,
    owner: String(action.owner || 'release-owner').trim() || 'release-owner',
    productionReadyClaimAllowed: false,
    provider,
    requiredClosingEvidence: String(action.nextEvidence || '').trim(),
    requiredCommands: commands.map((command) => ({
      command: String(command?.command || '').trim(),
      kind: String(command?.kind || 'verification').trim() || 'verification',
      label: String(command?.label || '').trim(),
    })),
    requiredEvidenceDocs: evidenceDocs.map((doc) => ({
      exists: Boolean(doc?.exists),
      href: String(doc?.href || '').trim(),
      label: String(doc?.label || '').trim(),
      path: String(doc?.path || '').trim(),
    })),
    requiredProofs,
    sameBoundaryRequired: true,
    status: 'blocked',
    stopConditionId: String(action.id || '').trim(),
    stopReason: String(action.stopReason || action.blocker || '').trim(),
    targetBoundaryRequired: true,
  };
}

function attachCurrentOpenBlockerClosureVerification(action = {}) {
  return {
    ...action,
    closureVerification: buildCurrentOpenBlockerClosureVerification(action),
  };
}

function getCurrentOpenBlockerProviderNeedles(provider = '') {
  const normalizedProvider = String(provider || '').trim();
  const providerNeedles = {
    anthropic: ['anthropic', 'anthropic_api_key', 'target-anthropic-provider-account'],
    hermes: ['hermes', 'hermes_provider_model', 'target-hermes-provider-architecture'],
    local: ['local provider', 'local_provider_model', 'local_provider_base_url', 'target-local-provider-architecture'],
    openai: ['openai', 'openai_api_key', 'target-openai-provider-account'],
  };
  return providerNeedles[normalizedProvider] || (normalizedProvider ? [normalizedProvider] : []);
}

function getCurrentOpenBlockerActionSearchText(action = {}) {
  const commands = Array.isArray(action?.commands) ? action.commands : [];
  const evidenceDocs = Array.isArray(action?.evidenceDocs) ? action.evidenceDocs : [];
  return [
    action?.blocker,
    action?.category,
    action?.id,
    action?.nextEvidence,
    action?.owner,
    action?.provider,
    action?.status,
    action?.stopReason,
    ...commands.flatMap((command) => [command?.command, command?.kind, command?.label]),
    ...evidenceDocs.flatMap((doc) => [doc?.href, doc?.label, doc?.path]),
  ]
    .map((item) => String(item || '').toLowerCase())
    .filter(Boolean)
    .join(' ');
}

function isSharedProviderBlockerAction(action = {}) {
  return String(action?.category || '').trim() === 'provider-operations';
}

function doesCurrentOpenBlockerActionMatchProvider(action = {}, provider = '') {
  const normalizedProvider = String(provider || '').trim();
  if (!action || !normalizedProvider) {
    return false;
  }
  if (String(action.provider || '').trim() === normalizedProvider) {
    return true;
  }

  const searchText = getCurrentOpenBlockerActionSearchText(action);
  return getCurrentOpenBlockerProviderNeedles(normalizedProvider).some((needle) =>
    searchText.includes(String(needle || '').toLowerCase()),
  );
}

function getProviderCurrentOpenBlockerActions(provider = '', actions = []) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    return [];
  }

  const actionList = Array.isArray(actions) ? actions : [];
  const hasExplicitProviderMapping = actionList.some((item) => String(item?.provider || '').trim());
  return actionList.filter((item) => {
    if (String(item?.provider || '').trim() === normalizedProvider) {
      return true;
    }
    if (isSharedProviderBlockerAction(item)) {
      return true;
    }
    if (hasExplicitProviderMapping) {
      return false;
    }
    return doesCurrentOpenBlockerActionMatchProvider(item, normalizedProvider);
  });
}

function buildProviderBlockerClosureVerificationSummary(provider = '', actions = []) {
  const linkedActions = getProviderCurrentOpenBlockerActions(provider, actions);
  const actionIds = [];
  const closureVerificationIds = [];
  const evidenceDocKeys = new Set();
  const providerActionIds = [];
  const requiredProofKeys = new Set();
  const sharedActionIds = [];
  let commandCount = 0;
  let productionReadyBlockedCount = 0;
  let targetBoundaryRequiredCount = 0;

  for (const [index, action] of linkedActions.entries()) {
    const actionId = String(action?.id || '').trim() || `provider-blocker-${index + 1}`;
    actionIds.push(actionId);
    if (String(action?.provider || '').trim()) {
      providerActionIds.push(actionId);
    }
    if (isSharedProviderBlockerAction(action)) {
      sharedActionIds.push(actionId);
    }

    const closureVerification = action?.closureVerification || {};
    const closureVerificationId = String(closureVerification.id || '').trim();
    if (closureVerificationId) {
      closureVerificationIds.push(closureVerificationId);
    }
    const commands = Array.isArray(closureVerification.requiredCommands)
      ? closureVerification.requiredCommands
      : Array.isArray(action?.commands)
        ? action.commands
        : [];
    commandCount += commands.filter((command) => String(command?.command || '').trim()).length;
    const evidenceDocs = Array.isArray(closureVerification.requiredEvidenceDocs)
      ? closureVerification.requiredEvidenceDocs
      : Array.isArray(action?.evidenceDocs)
        ? action.evidenceDocs
        : [];
    for (const doc of evidenceDocs) {
      const key = String(doc?.href || doc?.path || doc?.label || '').trim();
      if (key) {
        evidenceDocKeys.add(key);
      }
    }
    const requiredProofs = Array.isArray(closureVerification.requiredProofs)
      ? closureVerification.requiredProofs
      : [];
    for (const proof of requiredProofs) {
      const proofText = String(proof || '').trim();
      if (proofText) {
        requiredProofKeys.add(proofText);
      }
    }
    if (closureVerification.targetBoundaryRequired === true) {
      targetBoundaryRequiredCount += 1;
    }
    if (closureVerification.productionReadyClaimAllowed === false) {
      productionReadyBlockedCount += 1;
    }
  }

  return {
    actionIds,
    closureVerificationCount: closureVerificationIds.length,
    closureVerificationIds,
    commandCount,
    evidenceDocCount: evidenceDocKeys.size,
    productionReadyBlockedCount,
    productionReadyClaimAllowed: productionReadyBlockedCount === 0,
    providerActionIds,
    requiredProofCount: requiredProofKeys.size,
    sharedActionIds,
    targetBoundaryRequiredCount,
  };
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

function formatInlineList(values) {
  const list = Array.isArray(values) ? values.map((value) => String(value || '').trim()).filter(Boolean) : [];
  return list.length ? list.join(', ') : 'none';
}

function formatTableList(values) {
  const list = Array.isArray(values) ? values.map((value) => String(value || '').trim()).filter(Boolean) : [];
  return list.length ? list.join('<br>') : 'none';
}
