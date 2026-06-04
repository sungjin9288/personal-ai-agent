import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_PROVIDER_IDS = ['openai', 'anthropic', 'local', 'hermes'];
const RELEASE_EVIDENCE_DOC_PATHS = new Set([
  'docs/execution-v1-closeout.md',
  'docs/execution-v1-evidence.md',
  'docs/execution-v1-handoff.md',
  'docs/clean-deployment-release-v1.md',
  'docs/pilot-export-package-v1.md',
  'docs/production-like-release-drill-v1.md',
  'docs/production-provider-readiness-v1.md',
  'docs/production-slo-operating-v1.md',
  'docs/production-retention-operating-v1.md',
  'docs/production-enterprise-controls-v1.md',
  'docs/release-readiness-v1.md',
  'docs/target-openai-provider-account-v1.md',
  'docs/target-anthropic-provider-account-v1.md',
  'docs/target-clean-deployment-operations-v1.md',
  'docs/target-deployment-contract-v1.md',
  'docs/target-environment-evidence-intake-v1.md',
  'docs/target-hermes-provider-architecture-v1.md',
  'docs/target-local-provider-architecture-v1.md',
  'docs/target-provider-evidence-intake-v1.md',
  'docs/target-provider-operations-v1.md',
]);

export function getReleaseBlockerHandoff({
  category = '',
  docHrefBase = '',
  includeShared = true,
  owner = '',
  provider = '',
  rootDir = process.cwd(),
} = {}) {
  const releaseReadinessPath = path.join(rootDir, 'docs', 'release-readiness-v1.md');
  const markdown = readOptionalFile(releaseReadinessPath);
  const releaseReadiness = buildReleaseReadinessSummary(markdown, {
    docHrefBase,
    rootDir,
  });
  const normalizedProvider = normalizeText(provider);
  const normalizedCategory = normalizeText(category);
  const normalizedOwner = normalizeText(owner);
  const actions = releaseReadiness.currentOpenBlockerActions.filter((action) => {
    if (normalizedCategory && action.category !== normalizedCategory) {
      return false;
    }
    if (normalizedOwner && action.owner !== normalizedOwner) {
      return false;
    }
    if (!normalizedProvider) {
      return true;
    }
    if (String(action.provider || '').trim() === normalizedProvider) {
      return true;
    }
    if (includeShared && isSharedProviderBlockerAction(action)) {
      return true;
    }
    return false;
  });

  return {
    filters: {
      category: normalizedCategory || null,
      includeSharedProviderOperations: Boolean(includeShared),
      owner: normalizedOwner || null,
      provider: normalizedProvider || null,
      sharedProviderOperationsScope: getSharedProviderOperationsScopeReason({
        includeShared,
        provider: normalizedProvider,
      }),
    },
    items: actions,
    releaseReadiness: {
      currentOpenBlockerActionCount: releaseReadiness.currentOpenBlockerActionCount,
      currentOpenBlockerCount: releaseReadiness.currentOpenBlockerCount,
      decision: releaseReadiness.decision,
      localDate: releaseReadiness.localDate,
      path: releaseReadinessPath,
      productionBlockerCount: releaseReadiness.productionBlockerCount,
      productionReadyBlocked: releaseReadiness.productionReadyBlocked,
      productionReadyClaimAllowed: releaseReadiness.productionReadyClaimAllowed,
      productionReadyStatus: releaseReadiness.productionReadyStatus,
      productionReadyStopReason: releaseReadiness.productionReadyStopReason,
      releaseLabel: releaseReadiness.releaseLabel,
    },
    summary: buildCurrentOpenBlockerActionSummary(actions),
  };
}

export function getSharedProviderOperationsScopeReason({
  includeShared = true,
  provider = '',
} = {}) {
  const normalizedProvider = normalizeText(provider);
  if (includeShared === false && normalizedProvider) {
    return `excluded for provider-only ${normalizedProvider} handoff; handle shared provider-operations evidence separately`;
  }
  if (includeShared === false) {
    return 'excluded for scoped handoff; handle shared provider-operations evidence separately';
  }
  if (normalizedProvider) {
    return `included with provider ${normalizedProvider} handoff scope`;
  }
  return 'included for full release blocker handoff scope';
}

export function buildReleaseReadinessSummary(markdown = '', { docHrefBase = '', rootDir = process.cwd() } = {}) {
  const productionReadySection = extractMarkdownSection(markdown, 'Production Ready', 3);
  const productionBlockers = extractBulletsAfterLabel(productionReadySection, 'Blockers');
  const currentOpenBlockers = extractSectionBullets(markdown, 'Current Open Blockers');
  const currentOpenBlockerActions = currentOpenBlockers
    .map((blocker, index) => buildCurrentOpenBlockerAction(blocker, index, { docHrefBase, rootDir }))
    .map((action) => attachCurrentOpenBlockerClosureVerification(action));
  const currentOpenBlockerActionSummary = buildCurrentOpenBlockerActionSummary(currentOpenBlockerActions);
  const productionReadyStatus = extractPlainStatus(productionReadySection) || 'not-tracked';
  const normalizedProductionReadyStatus = productionReadyStatus.toLowerCase();
  const productionReadyClaimAllowed = Boolean(
    productionReadySection
      && normalizedProductionReadyStatus !== 'blocked'
      && normalizedProductionReadyStatus !== 'not-tracked'
      && productionBlockers.length === 0,
  );

  return {
    currentOpenBlockerActionCount: currentOpenBlockerActions.length,
    currentOpenBlockerActionSummary,
    currentOpenBlockerActions,
    currentOpenBlockerCount: currentOpenBlockers.length,
    currentOpenBlockers,
    decision: extractBulletValue(markdown, 'decision'),
    localDate: extractBulletValue(markdown, 'localDate'),
    productionBlockerCount: productionBlockers.length,
    productionBlockers,
    productionReadyBlocked: !productionReadyClaimAllowed,
    productionReadyClaimAllowed,
    productionReadyStatus,
    productionReadyStopReason: productionBlockers[0] || (productionReadyClaimAllowed ? '' : `Production Ready status is ${productionReadyStatus}.`),
    releaseLabel: extractBulletValue(markdown, 'releaseLabel'),
  };
}

function buildReleaseReadinessCommand(label, command, kind = 'verification') {
  return {
    command,
    kind,
    label,
  };
}

function buildReleaseReadinessDoc(label, docPath, { docHrefBase = '', rootDir = process.cwd() } = {}) {
  const relativePath = normalizeRepoRelativePath(docPath);
  const docRecord = resolveReleaseEvidenceDoc(relativePath, rootDir);
  const hrefBase = String(docHrefBase || '').trim();
  return {
    exists: Boolean(docRecord),
    href: docRecord ? (hrefBase ? `${hrefBase}${encodeURIComponent(relativePath)}` : relativePath) : '',
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

function buildCurrentOpenBlockerAction(blocker = '', index = 0, context = {}) {
  const normalized = String(blocker || '').toLowerCase();
  const base = {
    blocker: String(blocker || '').trim(),
    category: 'release-readiness',
    commands: [
      buildReleaseReadinessCommand('Production readiness gate', 'npm run smoke:production-readiness-gate'),
    ],
    evidenceDocs: [
      buildReleaseReadinessDoc('Release readiness decision', 'docs/release-readiness-v1.md', context),
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
        buildReleaseReadinessDoc('Target Anthropic provider account', 'docs/target-anthropic-provider-account-v1.md', context),
        buildReleaseReadinessDoc('Production provider readiness', 'docs/production-provider-readiness-v1.md', context),
        buildReleaseReadinessDoc('Release readiness decision', 'docs/release-readiness-v1.md', context),
      ],
      nextEvidence: 'Target Anthropic provider account evidence for account ownership proof, billing and credit remediation proof, active billing plan proof, available credit balance proof, API key and secret injection proof, ANTHROPIC_MODEL model access proof, provider terms and customer approval proof, quota and spend guard proof, target-boundary Anthropic live validation pass, mission and execution session provenance proof, telemetry proof, fallback and stop-condition proof, remediation audit proof, release artifact hygiene result, and regenerated execution snapshot evidence.',
      owner: 'provider-ops',
      provider: 'anthropic',
      stopReason: 'Target Anthropic provider account lacks account ownership proof, billing and credit remediation proof, active billing plan proof, available credit balance proof, API key and secret injection proof, ANTHROPIC_MODEL model access proof, provider terms and customer approval proof, quota and spend guard proof, target-boundary Anthropic live validation pass, mission and execution session provenance proof, telemetry proof, fallback and stop-condition proof, remediation audit proof, release artifact hygiene result, and regenerated execution snapshot proof.',
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
        buildReleaseReadinessDoc('Target OpenAI provider account', 'docs/target-openai-provider-account-v1.md', context),
        buildReleaseReadinessDoc('Production provider readiness', 'docs/production-provider-readiness-v1.md', context),
        buildReleaseReadinessDoc('Target environment evidence intake', 'docs/target-environment-evidence-intake-v1.md', context),
      ],
      nextEvidence: 'Target OpenAI provider account evidence for account ownership proof, billing and quota proof, API key and secret injection proof, OPENAI_MODEL model access proof, provider terms and customer approval proof, usage and cost guard proof, target-boundary OpenAI live validation pass, mission and execution session provenance proof, telemetry proof, fallback and stop-condition proof, renewal and review audit proof, release artifact hygiene result, and regenerated execution snapshot evidence.',
      owner: 'provider-ops',
      provider: 'openai',
      stopReason: 'Target OpenAI provider account lacks account ownership proof, billing and quota proof, API key and secret injection proof, OPENAI_MODEL model access proof, provider terms and customer approval proof, usage and cost guard proof, target-boundary OpenAI live validation pass, mission and execution session provenance proof, telemetry proof, fallback and stop-condition proof, renewal and review audit proof, release artifact hygiene result, and regenerated execution snapshot proof.',
    };
  }

  if (normalized.includes('target local provider architecture') && !normalized.includes('target deployment contract')) {
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
        buildReleaseReadinessDoc('Target local provider architecture', 'docs/target-local-provider-architecture-v1.md', context),
        buildReleaseReadinessDoc('Target provider operations', 'docs/target-provider-operations-v1.md', context),
        buildReleaseReadinessDoc('Target provider evidence intake', 'docs/target-provider-evidence-intake-v1.md', context),
      ],
      nextEvidence: 'Endpoint ownership, LOCAL_PROVIDER_MODEL model pinning, network isolation, secret and credential policy, runtime lifecycle, session and artifact provenance, data residency and transcript policy, quota and resource guard, telemetry, fallback and customer approval, target-boundary local provider live validation, release artifact hygiene result, and regenerated execution snapshot evidence.',
      owner: 'provider-ops',
      provider: 'local',
      stopReason: 'Target local provider architecture lacks endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof, target-boundary local provider live validation pass, release artifact hygiene result, and regenerated execution snapshot proof.',
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
        buildReleaseReadinessDoc('Target Hermes provider architecture', 'docs/target-hermes-provider-architecture-v1.md', context),
        buildReleaseReadinessDoc('Production provider readiness', 'docs/production-provider-readiness-v1.md', context),
        buildReleaseReadinessDoc('Target provider operations', 'docs/target-provider-operations-v1.md', context),
      ],
      nextEvidence: 'Endpoint ownership proof, HERMES_PROVIDER_MODEL model pinning proof, target secret injection proof, tool-call parsing proof, session lifecycle proof, data and transcript policy proof, quota and rate guard proof, telemetry proof, fallback and stop-condition proof, customer approval proof, target-boundary Hermes live validation, release artifact hygiene result, and regenerated execution snapshot evidence.',
      owner: 'provider-ops',
      provider: 'hermes',
      stopReason: 'Target Hermes provider architecture lacks endpoint ownership proof, HERMES_PROVIDER_MODEL model pinning proof, target secret injection proof, tool-call parsing proof, session lifecycle proof, data and transcript policy proof, quota and rate guard proof, telemetry proof, fallback and stop-condition proof, customer approval proof, target-boundary Hermes live validation pass, release artifact hygiene result, and regenerated execution snapshot proof.',
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
        buildReleaseReadinessCommand('Provider attention remediation fallback audit', 'npm run smoke:provider-attention-remediation', 'runtime-audit'),
        buildReleaseReadinessCommand('Mission timeline fallback audit', 'npm run smoke:mission-timeline', 'runtime-audit'),
        buildReleaseReadinessCommand('Workspace timeline fallback audit', 'npm run smoke:workspace-timeline', 'runtime-audit'),
        buildReleaseReadinessCommand('Operator timeline fallback audit', 'npm run smoke:operator-timeline', 'runtime-audit'),
        buildReleaseReadinessCommand('Release artifact hygiene smoke', 'npm run smoke:release-artifact-hygiene'),
      ],
      evidenceDocs: [
        buildReleaseReadinessDoc('Target provider operations', 'docs/target-provider-operations-v1.md', context),
        buildReleaseReadinessDoc('Target provider evidence intake', 'docs/target-provider-evidence-intake-v1.md', context),
        buildReleaseReadinessDoc('Target environment evidence intake', 'docs/target-environment-evidence-intake-v1.md', context),
        buildReleaseReadinessDoc('Production provider readiness', 'docs/production-provider-readiness-v1.md', context),
      ],
      nextEvidence: 'Completed per-provider operations capture template, provider inventory proof, provider account approval proof, target secret injection proof, target-boundary live validation proof, model and endpoint pinning proof, quota, cost, and resource guard proof, fallback and disable proof, provider fallback runtime audit proof with mission run --fallback-provider --fallback-policy, mission timeline, workspace timeline, operator timeline, provider events --family fallback, action remediate-provider-attention --fallback-provider --fallback-policy, provider-failure-only failover, recoverable-provider-failure-only stop reason, selected fallback provider, and deterministic stop conditions, target blocker closure verification proof, provider telemetry proof, provider incident triage proof, data and transcript handling proof, remediation and renewal review proof, evidence retention proof, provider failure containment plan, artifact hygiene result, production readiness gate result, residual risk, decision owner, and next review date from the approved target boundary.',
      owner: 'provider-ops',
      stopReason: 'Target provider operations lacks same-boundary per-provider operations capture template proof, provider inventory proof, provider account approval proof, target secret injection proof, target-boundary live validation proof, model and endpoint pinning proof, quota, cost, and resource guard proof, fallback and disable proof, provider fallback runtime audit proof with fallback policy id, mission timeline chronology, workspace timeline chronology, operator timeline chronology, provider events family, attention remediation command, provider-failure-only failover, recoverable-provider-failure-only stop reason, selected fallback provider, and deterministic stop-condition proof, target blocker closure verification proof, provider telemetry proof, provider incident triage proof, data and transcript handling proof, remediation and renewal review proof, evidence retention proof, provider failure containment proof, artifact hygiene result, production readiness gate result, residual risk decision, decision owner proof, and next review date proof.',
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
        buildReleaseReadinessDoc('Release readiness decision', 'docs/release-readiness-v1.md', context),
        buildReleaseReadinessDoc('Production provider readiness', 'docs/production-provider-readiness-v1.md', context),
        buildReleaseReadinessDoc('Production enterprise controls', 'docs/production-enterprise-controls-v1.md', context),
      ],
      nextEvidence: 'Target provider evidence intake, provider operations, provider account or architecture approvals, target-boundary live validation for every included provider, provider failure containment, production enterprise controls, hosted identity and session evidence, hosted tenant isolation evidence, target secret manager evidence, target observability and SLO evidence, data lifecycle and support evidence, target deployment contract evidence, clean deployment release evidence, production-like drill result, release artifact hygiene result, accepted risk register, allowed claim text, release decision owner approval, next review date, and regenerated execution snapshot evidence from the same target boundary.',
      owner: 'release-owner',
      stopReason: 'Production release label expansion lacks same-boundary target provider evidence intake proof, target provider operations proof, provider account or architecture approval proof, target-boundary live validation proof, provider failure containment proof, production enterprise control proof, hosted identity and session proof, hosted tenant isolation proof, target secret manager proof, target observability and SLO proof, data lifecycle and support proof, target deployment contract proof, clean deployment release proof, production-like drill result, release artifact hygiene result, accepted risk register proof, allowed claim text proof, release decision owner approval proof, next review date proof, and regenerated execution snapshot proof.',
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
        buildReleaseReadinessDoc('Target deployment contract', 'docs/target-deployment-contract-v1.md', context),
        buildReleaseReadinessDoc('Target environment evidence intake', 'docs/target-environment-evidence-intake-v1.md', context),
        buildReleaseReadinessDoc('Production-like release drill', 'docs/production-like-release-drill-v1.md', context),
      ],
      nextEvidence: 'Target deployment name proof, deployment profile decision proof, mandatory control evidence, provider readiness evidence, identity and tenant evidence, secret and observability evidence, data lifecycle and support evidence, clean release artifact evidence, stop-condition decision, production-ready claim decision, target environment submission packet, release artifact hygiene result, production-like drill result, reviewer decision, and regenerated execution snapshot evidence from the same target boundary.',
      owner: 'deployment-owner',
      stopReason: 'Target deployment contract lacks same-boundary target deployment name proof, deployment profile decision proof, mandatory control evidence, provider readiness evidence, identity and tenant evidence, secret and observability evidence, data lifecycle and support evidence, clean release artifact evidence, stop-condition decision proof, production-ready claim decision proof, target environment submission packet proof, release artifact hygiene result, production-like drill result, reviewer decision proof, and regenerated execution snapshot proof.',
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
    acceptedDispositionValues: [
      'keep-blocked',
      'closed-after-evidence',
      'accepted-with-narrow-scope',
      'rejected',
    ],
    artifactRequirements: {
      executionV1ArtifactRefresh: true,
      productionReadinessGate: true,
      releaseArtifactHygiene: true,
      snapshotRefresh: true,
    },
    blockerId: String(action.id || '').trim(),
    category,
    closureRules: [
      'Close only with accepted evidence from the same approved target boundary.',
      'Keep productionReadyClaim=false while any mandatory target stop-condition remains open.',
      'Rerun every listed command after attaching closure evidence.',
      'Refresh execution-v1 artifacts after source-of-record or live evidence changes.',
      'Reject stale, ownerless, unreviewed, or secret-bearing evidence.',
    ],
    currentState: String(action.status || 'blocked').trim() || 'blocked',
    defaultDisposition: 'keep-blocked',
    forbiddenEvidence: [
      'raw API keys or tokens',
      'private endpoint credentials',
      'customer personal data',
      'tenant payloads',
      'billing identifiers',
      'private account identifiers',
      'machine-local absolute paths',
    ],
    id: `${String(action.id || 'current-open-blocker').trim() || 'current-open-blocker'}-closure-verification`,
    owner: String(action.owner || 'release-owner').trim() || 'release-owner',
    productionReadyClaimAllowed: false,
    productionReadyClaimRule:
      'productionReadyClaim remains false until every mandatory target control is closed by accepted same-boundary evidence and final gates pass.',
    provider,
    requiredClosingEvidence: String(action.nextEvidence || '').trim(),
    requiredCommands: commands.map((command) => ({
      command: String(command?.command || '').trim(),
      kind: String(command?.kind || 'verification').trim() || 'verification',
      label: String(command?.label || '').trim(),
    })),
    requiredDecisionFields: [
      'decisionOwner',
      'evidenceOwner',
      'reviewer',
      'reviewDate',
      'nextReviewDate',
      'allowedClaimText',
      'releaseReadinessNote',
    ],
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

function buildCurrentOpenBlockerActionSummary(actions = []) {
  const categoryCounts = {};
  const commandKindCounts = {};
  const ownerCounts = {};
  const providerCounts = {};
  const statusCounts = {};
  let closureVerificationCommandCount = 0;
  let closureVerificationCount = 0;
  let closureVerificationEvidenceDocCount = 0;
  let closureVerificationProductionReadyBlockedCount = 0;
  let closureVerificationTargetBoundaryCount = 0;
  let commandCount = 0;
  let evidenceDocCount = 0;
  let runtimeAuditCommandCount = 0;
  let topPriorityAction = null;
  let topPriorityValue = Number.POSITIVE_INFINITY;

  for (const [index, action] of actions.entries()) {
    incrementCountRecord(categoryCounts, action?.category || 'release-readiness');
    incrementCountRecord(ownerCounts, action?.owner || 'release-owner');
    if (action?.provider) {
      incrementCountRecord(providerCounts, action.provider);
    }
    incrementCountRecord(statusCounts, action?.status || 'blocked');
    const commands = Array.isArray(action?.commands) ? action.commands : [];
    commandCount += commands.length;
    for (const command of commands) {
      const kind = String(command?.kind || 'verification').trim() || 'verification';
      incrementCountRecord(commandKindCounts, kind);
      if (kind === 'runtime-audit') {
        runtimeAuditCommandCount += 1;
      }
    }
    evidenceDocCount += Array.isArray(action?.evidenceDocs) ? action.evidenceDocs.length : 0;
    if (action?.closureVerification) {
      closureVerificationCount += 1;
      closureVerificationCommandCount += Array.isArray(action.closureVerification.requiredCommands)
        ? action.closureVerification.requiredCommands.length
        : 0;
      closureVerificationEvidenceDocCount += Array.isArray(action.closureVerification.requiredEvidenceDocs)
        ? action.closureVerification.requiredEvidenceDocs.length
        : 0;
      if (action.closureVerification.targetBoundaryRequired === true) {
        closureVerificationTargetBoundaryCount += 1;
      }
      if (action.closureVerification.productionReadyClaimAllowed === false) {
        closureVerificationProductionReadyBlockedCount += 1;
      }
    }

    const priority = Number(action?.priority ?? index + 1);
    if (Number.isFinite(priority) && priority < topPriorityValue) {
      topPriorityValue = priority;
      topPriorityAction = action;
    }
  }

  return {
    actionCount: actions.length,
    categoryCounts: sortCountRecord(categoryCounts),
    closureVerificationCommandCount,
    closureVerificationCount,
    closureVerificationEvidenceDocCount,
    closureVerificationProductionReadyBlockedCount,
    closureVerificationTargetBoundaryCount,
    commandCount,
    commandKindCounts: sortCountRecord(commandKindCounts),
    evidenceDocCount,
    ownerCounts: sortCountRecord(ownerCounts),
    providerActionCount: Object.values(providerCounts).reduce((sum, count) => sum + Number(count || 0), 0),
    providerCounts: sortCountRecord(providerCounts),
    runtimeAuditCommandCount,
    statusCounts: sortCountRecord(statusCounts),
    topPriorityBlocker: topPriorityAction?.blocker || null,
    topPriorityBlockerId: topPriorityAction?.id || null,
    topPriorityCategory: topPriorityAction?.category || null,
    topPriorityNextEvidence: topPriorityAction?.nextEvidence || null,
    topPriorityOwner: topPriorityAction?.owner || null,
    topPriorityProvider: topPriorityAction?.provider || null,
    topPriorityStopReason: topPriorityAction?.stopReason || null,
  };
}

function isSharedProviderBlockerAction(action = {}) {
  return String(action?.category || '').trim() === 'provider-operations';
}

function incrementCountRecord(record, key) {
  const normalized = String(key || '').trim() || 'unassigned';
  record[normalized] = Number(record[normalized] || 0) + 1;
}

function sortCountRecord(record = {}) {
  return Object.fromEntries(
    Object.entries(record).sort(
      ([leftKey, leftCount], [rightKey, rightCount]) =>
        Number(rightCount || 0) - Number(leftCount || 0) || leftKey.localeCompare(rightKey),
    ),
  );
}

function resolveReleaseEvidenceDoc(filePath = '', rootDir = process.cwd()) {
  const relativePath = normalizeRepoRelativePath(filePath);
  if (!isReleaseEvidenceDocPath(relativePath)) {
    return null;
  }

  const resolvedPath = path.resolve(rootDir, relativePath);
  const docsRoot = path.resolve(rootDir, 'docs');
  if (!resolvedPath.startsWith(`${docsRoot}${path.sep}`) && resolvedPath !== docsRoot) {
    return null;
  }
  if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
    return null;
  }

  return {
    path: resolvedPath,
    relativePath,
  };
}

function isReleaseEvidenceDocPath(filePath = '') {
  const relativePath = normalizeRepoRelativePath(filePath);
  return RELEASE_EVIDENCE_DOC_PATHS.has(relativePath) || relativePath.startsWith('docs/releases/execution-v1/');
}

function normalizeRepoRelativePath(filePath = '') {
  return String(filePath || '').replace(/\\/g, '/').replace(/^\.\//, '').trim();
}

function extractBulletValue(markdown, label) {
  const match = String(markdown || '').match(new RegExp(`^- ${escapeRegExp(label)}:\\s+(.+)$`, 'm'));
  return match ? String(match[1] || '').trim() : '';
}

function extractMarkdownSection(markdown, heading, level = 2) {
  const normalizedLevel = Math.max(1, Math.min(Number(level) || 2, 6));
  const headingPrefix = '#'.repeat(normalizedLevel);
  const sectionPattern = new RegExp(
    `(?:^|\\n)${headingPrefix} ${escapeRegExp(heading)}\\s*\\n([\\s\\S]*?)(?=\\n#{1,${normalizedLevel}}\\s|$)`,
  );
  const sectionMatch = String(markdown || '').match(sectionPattern);
  return sectionMatch ? String(sectionMatch[1] || '').trim() : '';
}

function extractSectionBullets(markdown, heading) {
  const sectionPattern = new RegExp(`## ${escapeRegExp(heading)}\\n([\\s\\S]*?)(?:\\n## |$)`);
  const sectionMatch = String(markdown || '').match(sectionPattern);
  if (!sectionMatch) {
    return [];
  }

  return String(sectionMatch[1] || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

function extractBulletsAfterLabel(markdown, label) {
  const normalizedLabel = `${String(label || '').trim().replace(/:$/, '')}:`.toLowerCase();
  const entries = [];
  let inList = false;
  let foundListItem = false;

  for (const line of String(markdown || '').split('\n')) {
    const trimmedLine = line.trim();
    if (!inList && trimmedLine.toLowerCase() === normalizedLabel) {
      inList = true;
      continue;
    }
    if (!inList) {
      continue;
    }
    if (!trimmedLine) {
      continue;
    }
    if (!trimmedLine.startsWith('- ')) {
      if (foundListItem) {
        break;
      }
      continue;
    }
    entries.push(trimmedLine.slice(2).trim());
    foundListItem = true;
  }

  return entries.filter(Boolean);
}

function extractPlainStatus(markdown) {
  const match = String(markdown || '').match(/^Status:\s+(.+)$/m);
  return match ? String(match[1] || '').trim().replace(/\.$/, '') : '';
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeText(value) {
  return String(value || '').trim();
}

function readOptionalFile(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

export { DEFAULT_PROVIDER_IDS };
