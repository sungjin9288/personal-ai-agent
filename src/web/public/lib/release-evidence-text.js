// Release-evidence text builders extracted from app.js.
//
// These 35 functions are PURE string/line builders for the release-evidence
// surface: they read `state.*` and delegate to `getRelease*`/`build*Url` helpers,
// but do not mutate state, touch the DOM, or attach listeners. app.js re-imports
// the builders its copy* handlers invoke; the helper cycle back to '../app.js' is
// the accepted working pattern in this codebase (see release-navigation.js).

import { state } from './app-state.js';
import { buildUiStateUrl } from './url-state.js';
import { getReleaseProductionBlockerVerificationCommands } from './text-format.js';
import {
  getReleaseBlockerClosureVerification,
  getReleaseBlockerRequiredCommands,
  getReleaseBlockerRequiredEvidenceDocs,
  getReleaseBlockerRequiredProofs,
  isReleaseSharedProviderBlockerAction,
} from './status-labels.js';
import {
  buildReleaseBlockerApiUrl,
  buildReleaseBlockerSliceUrl,
  buildReleaseProviderReadinessUrl,
  formatReleaseProviderReadinessEvidenceDocLines,
  getAbsoluteReleaseUrl,
  getFilteredReleaseCurrentOpenBlockerActions,
  getProviderLiveCommand,
  getReleaseBlockerSliceSummary,
  getReleaseCurrentOpenBlockerActions,
  getReleaseProductionBlockers,
  getReleaseProviderBlockerActions,
  getReleaseProviderLiveStatus,
  getReleaseProviderReadinessEntries,
  getReleaseProviderReadinessEvidenceDocs,
  getReleaseProviderSpecificEvidenceDoc,
  getReleaseSharedProviderOperationsScopeAudit,
  getReleaseSharedProviderOperationsScopeReason,
  getUniqueReleaseProviderBlockerActions,
  getValidReleaseProductionBlockerIndex,
} from '../app.js';

export function buildReleaseProductionBlockerSummaryText({
  productionBlockers = getReleaseProductionBlockers(),
  releaseStatus = state.releaseStatus,
} = {}) {
  const blockers = Array.isArray(productionBlockers)
    ? productionBlockers.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  if (!blockers.length) {
    return '';
  }

  const summary = releaseStatus?.summary || {};
  const releaseReadiness = releaseStatus?.releaseReadiness || {};
  const productionReadyStatus = String(
    summary.productionReadyStatus || releaseReadiness.productionReadyStatus || 'not tracked',
  ).trim();
  const productionReadyStopReason = String(
    summary.productionReadyStopReason || releaseReadiness.productionReadyStopReason || blockers[0] || '',
  ).trim();
  const releaseLabel = String(releaseReadiness.releaseLabel || summary.releaseLabel || '').trim();
  const releaseLink = `${window.location.origin}${buildUiStateUrl({
    detailTab: 'release',
    releaseBlockerCategoryFilter: '',
    releaseBlockerOwnerFilter: '',
    releaseBlockerProviderFilter: '',
    releaseFocusedBlockerId: '',
    releaseFocusedProductionBlockerIndex: '',
    releaseFocusedProvider: '',
    releaseFocusedHistoryId: '',
    releaseHistoryOutcome: '',
    releaseHistoryProvider: '',
    releaseHistoryScope: '',
  })}`;
  const releaseReadinessDocLink = getAbsoluteReleaseUrl('/api/execution-v1/release-doc?path=docs%2Frelease-readiness-v1.md');
  const lines = [
    'Production-ready blocker summary',
    `- productionReadyStatus: ${productionReadyStatus}`,
    `- productionReadyBlocked: ${String(Boolean(summary.productionReadyBlocked ?? releaseReadiness.productionReadyBlocked ?? true))}`,
    `- productionBlockerCount: ${blockers.length}`,
    `- releaseLabel: ${releaseLabel || 'not tracked'}`,
    `- stopReason: ${productionReadyStopReason || 'not recorded'}`,
    `- releaseLink: ${releaseLink}`,
    `- releaseReadinessDoc: ${releaseReadinessDocLink}`,
    '',
    'Commands:',
    '- Production readiness gate: npm run smoke:production-readiness-gate',
    '- Release artifact hygiene: npm run smoke:release-artifact-hygiene',
    '- Execution v1 status: npm run smoke:execution-v1-status',
    '',
    'Blockers:',
    ...blockers.map((item, index) => `${index + 1}. ${item}`),
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseProductionBlockerHandoffText({
  blockerIndex = 0,
  productionBlockers = getReleaseProductionBlockers(),
  releaseStatus = state.releaseStatus,
} = {}) {
  const blockers = Array.isArray(productionBlockers)
    ? productionBlockers.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  const normalizedIndex = Number.isFinite(Number(blockerIndex)) ? Number(blockerIndex) : 0;
  const blocker = blockers[normalizedIndex] || '';
  if (!blocker) {
    return '';
  }

  const summary = releaseStatus?.summary || {};
  const releaseReadiness = releaseStatus?.releaseReadiness || {};
  const productionReadyStatus = String(
    summary.productionReadyStatus || releaseReadiness.productionReadyStatus || 'not tracked',
  ).trim();
  const releaseLabel = String(releaseReadiness.releaseLabel || summary.releaseLabel || '').trim();
  const releaseFocusedProductionBlockerIndex = getValidReleaseProductionBlockerIndex(
    normalizedIndex,
    releaseStatus,
  );
  const releaseLink = `${window.location.origin}${buildUiStateUrl({
    detailTab: 'release',
    releaseBlockerCategoryFilter: '',
    releaseBlockerOwnerFilter: '',
    releaseBlockerProviderFilter: '',
    releaseFocusedBlockerId: '',
    releaseFocusedProductionBlockerIndex,
    releaseFocusedProvider: '',
    releaseFocusedHistoryId: '',
    releaseHistoryOutcome: '',
    releaseHistoryProvider: '',
    releaseHistoryScope: '',
  })}`;
  const releaseReadinessDocLink = getAbsoluteReleaseUrl('/api/execution-v1/release-doc?path=docs%2Frelease-readiness-v1.md');
  const lines = [
    'Production-ready blocker handoff',
    `- blockerIndex: ${normalizedIndex + 1}/${blockers.length}`,
    `- productionReadyStatus: ${productionReadyStatus}`,
    `- productionReadyBlocked: ${String(Boolean(summary.productionReadyBlocked ?? releaseReadiness.productionReadyBlocked ?? true))}`,
    `- releaseLabel: ${releaseLabel || 'not tracked'}`,
    `- blocker: ${blocker}`,
    `- releaseLink: ${releaseLink}`,
    `- releaseReadinessDoc: ${releaseReadinessDocLink}`,
    '',
    'Commands:',
    '- Production readiness gate: npm run smoke:production-readiness-gate',
    '- Release artifact hygiene: npm run smoke:release-artifact-hygiene',
    '- Execution v1 status: npm run smoke:execution-v1-status',
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseProductionBlockerCommandText({
  blockerIndex = 0,
  productionBlockers = getReleaseProductionBlockers(),
  releaseStatus = state.releaseStatus,
} = {}) {
  const blockers = Array.isArray(productionBlockers)
    ? productionBlockers.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  const normalizedIndex = Number.isFinite(Number(blockerIndex)) ? Number(blockerIndex) : 0;
  const blocker = blockers[normalizedIndex] || '';
  if (!blocker) {
    return '';
  }

  const releaseFocusedProductionBlockerIndex = getValidReleaseProductionBlockerIndex(
    normalizedIndex,
    releaseStatus,
  );
  const releaseLink = `${window.location.origin}${buildUiStateUrl({
    detailTab: 'release',
    releaseBlockerCategoryFilter: '',
    releaseBlockerOwnerFilter: '',
    releaseBlockerProviderFilter: '',
    releaseFocusedBlockerId: '',
    releaseFocusedProductionBlockerIndex,
    releaseFocusedProvider: '',
    releaseFocusedHistoryId: '',
    releaseHistoryOutcome: '',
    releaseHistoryProvider: '',
    releaseHistoryScope: '',
  })}`;
  const releaseReadinessDocLink = getAbsoluteReleaseUrl('/api/execution-v1/release-doc?path=docs%2Frelease-readiness-v1.md');
  const commands = getReleaseProductionBlockerVerificationCommands();
  const lines = [
    'Production-ready blocker verification commands',
    `- blockerIndex: ${normalizedIndex + 1}/${blockers.length}`,
    `- blocker: ${blocker}`,
    `- releaseLink: ${releaseLink}`,
    `- releaseReadinessDoc: ${releaseReadinessDocLink}`,
    '',
    'Commands:',
    ...commands.map((item) => `- ${item.label}: ${item.command}`),
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseProductionBlockerPackageText({
  blockerIndex = 0,
  productionBlockers = getReleaseProductionBlockers(),
  releaseStatus = state.releaseStatus,
} = {}) {
  const blockers = Array.isArray(productionBlockers)
    ? productionBlockers.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  const normalizedIndex = Number.isFinite(Number(blockerIndex)) ? Number(blockerIndex) : 0;
  const blocker = blockers[normalizedIndex] || '';
  if (!blocker) {
    return '';
  }

  const releaseFocusedProductionBlockerIndex = getValidReleaseProductionBlockerIndex(
    normalizedIndex,
    releaseStatus,
  );
  const releaseLink = `${window.location.origin}${buildUiStateUrl({
    detailTab: 'release',
    releaseBlockerCategoryFilter: '',
    releaseBlockerOwnerFilter: '',
    releaseBlockerProviderFilter: '',
    releaseFocusedBlockerId: '',
    releaseFocusedProductionBlockerIndex,
    releaseFocusedProvider: '',
    releaseFocusedHistoryId: '',
    releaseHistoryOutcome: '',
    releaseHistoryProvider: '',
    releaseHistoryScope: '',
  })}`;
  const releaseReadinessDocLink = getAbsoluteReleaseUrl('/api/execution-v1/release-doc?path=docs%2Frelease-readiness-v1.md');
  const evidenceSection = [
    'Production-ready blocker evidence',
    `- blockerIndex: ${normalizedIndex + 1}/${blockers.length}`,
    `- blocker: ${blocker}`,
    `- releaseLink: ${releaseLink}`,
    `- evidenceDocCount: 1`,
    '',
    'Evidence docs:',
    '1. Release readiness v1',
    '   - path: docs/release-readiness-v1.md',
    `   - link: ${releaseReadinessDocLink}`,
    '   - availability: available',
    '   - source: Production Ready blocker list',
  ].join('\n');
  const sections = [
    buildReleaseProductionBlockerHandoffText({
      blockerIndex: normalizedIndex,
      productionBlockers: blockers,
      releaseStatus,
    }),
    buildReleaseProductionBlockerCommandText({
      blockerIndex: normalizedIndex,
      productionBlockers: blockers,
      releaseStatus,
    }),
    evidenceSection,
  ]
    .map((section) => String(section || '').trim())
    .filter(Boolean);

  if (!sections.length) {
    return '';
  }

  return `Production-ready blocker package\n\n${sections.join('\n\n')}\n`;
}

export function buildReleaseProviderBlockerPackageLines(blockerActions = []) {
  const actions = getUniqueReleaseProviderBlockerActions(blockerActions);
  if (!actions.length) {
    return ['- none'];
  }

  return actions.map((action, index) => {
    const actionId = String(action.id || '').trim();
    const actionProvider = String(action.provider || '').trim();
    const closureVerification = getReleaseBlockerClosureVerification(action);
    const requiredProofs = getReleaseBlockerRequiredProofs(action);
    const releaseLink = `${window.location.origin}${buildUiStateUrl({
      detailTab: 'release',
      releaseBlockerCategoryFilter: '',
      releaseBlockerOwnerFilter: '',
      releaseBlockerProviderFilter: '',
      releaseFocusedBlockerId: actionId,
      releaseFocusedProductionBlockerIndex: '',
      releaseFocusedProvider: actionProvider,
      releaseFocusedHistoryId: '',
      releaseHistoryOutcome: '',
      releaseHistoryProvider: '',
      releaseHistoryScope: '',
    })}`;
    const commands = Array.isArray(action.commands) ? action.commands : [];
    const evidenceDocs = Array.isArray(action.evidenceDocs) ? action.evidenceDocs : [];
    return [
      `${index + 1}. ${String(action.blocker || action.stopReason || 'provider blocker').trim()}`,
      `   - id: ${actionId || 'not recorded'}`,
      `   - provider: ${actionProvider || 'inferred from blocker evidence'}`,
      `   - category: ${String(action.category || 'stop-condition').trim()}`,
      `   - owner: ${String(action.owner || 'release-owner').trim()}`,
      `   - status: ${String(action.status || 'blocked').trim()}`,
      `   - sharedProviderBlocker: ${String(isReleaseSharedProviderBlockerAction(action))}`,
      `   - closureVerification: ${String(closureVerification.id || 'not provided').trim()}`,
      `   - targetBoundaryRequired: ${String(Boolean(closureVerification.targetBoundaryRequired ?? true))}`,
      `   - productionReadyClaimAllowed: ${String(Boolean(closureVerification.productionReadyClaimAllowed))}`,
      `   - stopReason: ${String(action.stopReason || action.blocker || '').trim() || 'not recorded'}`,
      `   - nextEvidence: ${String(action.nextEvidence || '').trim() || 'not recorded'}`,
      `   - releaseLink: ${releaseLink}`,
      `   - commands: ${commands.map((command) => String(command.command || '').trim()).filter(Boolean).join(' | ') || 'none'}`,
      `   - evidenceDocs: ${evidenceDocs.map((doc) => String(doc.path || doc.label || '').trim()).filter(Boolean).join(' | ') || 'none'}`,
      `   - requiredProofs: ${requiredProofs.length ? requiredProofs.join(' | ') : 'none'}`,
    ].join('\n');
  });
}

export function buildReleaseProviderReadinessEvidenceDocLines(provider = '') {
  return formatReleaseProviderReadinessEvidenceDocLines(getReleaseProviderReadinessEvidenceDocs(provider));
}

export function buildReleaseProviderReadinessPackageText({
  provider = '',
  releaseStatus = state.releaseStatus,
} = {}) {
  const entries = getReleaseProviderReadinessEntries({ provider, releaseStatus });
  if (!entries.length) {
    return '';
  }

  const normalizedProvider = String(provider || '').trim();
  const summary = releaseStatus?.summary || {};
  const releaseReadiness = releaseStatus?.releaseReadiness || {};
  const packageScope = normalizedProvider || 'all providers';
  const releaseLink = buildReleaseProviderReadinessUrl(normalizedProvider);
  const productionProviderReadinessDoc = getAbsoluteReleaseUrl(
    '/api/execution-v1/release-doc?path=docs%2Fproduction-provider-readiness-v1.md',
  );
  const releaseReadinessDoc = getAbsoluteReleaseUrl(
    '/api/execution-v1/release-doc?path=docs%2Frelease-readiness-v1.md',
  );
  const providerLines = entries.map((item, index) => {
    const itemProvider = String(item.provider || '').trim();
    const preflight = state.releasePreflightResults?.[itemProvider] || null;
    const preflightStatus = String(preflight?.status || 'not-run').trim();
    const liveStatus = getReleaseProviderLiveStatus(itemProvider, releaseStatus) || 'not archived';
    const liveCommand = getProviderLiveCommand(item, preflight);
    const linkedBlockers = getReleaseProviderBlockerActions({ provider: itemProvider, releaseStatus });
    const linkedBlockerIds = linkedBlockers.map((action) => String(action.id || '').trim()).filter(Boolean);
    const linkedSharedBlockerIds = linkedBlockers
      .filter((action) => isReleaseSharedProviderBlockerAction(action))
      .map((action) => String(action.id || '').trim())
      .filter(Boolean);
    const linkedClosureVerificationIds = Array.isArray(item.blockerClosureVerification?.closureVerificationIds)
      ? item.blockerClosureVerification.closureVerificationIds
      : linkedBlockers
        .map((action) => String(getReleaseBlockerClosureVerification(action).id || '').trim())
        .filter(Boolean);
    const linkedRequiredProofCount = Number.isFinite(Number(item.blockerClosureVerification?.requiredProofCount))
      ? Number(item.blockerClosureVerification.requiredProofCount)
      : new Set(linkedBlockers.flatMap((action) => getReleaseBlockerRequiredProofs(action))).size;
    return [
      `${index + 1}. ${item.label || itemProvider}`,
      `   - provider: ${itemProvider}`,
      `   - envKey: ${item.envKey || '-'}`,
      `   - envReady: ${String(Boolean(item.ready))}`,
      `   - readinessStatus: ${item.status || 'unknown'}`,
      `   - preflightStatus: ${preflightStatus}`,
      `   - archivedLiveStatus: ${liveStatus}`,
      `   - linkedCurrentBlockers: ${linkedBlockerIds.length ? linkedBlockerIds.join(', ') : 'none'}`,
      `   - linkedSharedBlockers: ${linkedSharedBlockerIds.length ? linkedSharedBlockerIds.join(', ') : 'none'}`,
      `   - linkedClosureVerifications: ${linkedClosureVerificationIds.length ? linkedClosureVerificationIds.join(', ') : 'none'}`,
      `   - linkedRequiredProofCount: ${String(linkedRequiredProofCount)}`,
      `   - preflightCommand: ${item.preflightCommand || `npm run preflight:execution-v1:${itemProvider}`}`,
      `   - liveCommand: ${liveCommand || item.command || '-'}`,
      `   - evidenceCommand: ${item.evidenceCommand || `node scripts/build-execution-v1-evidence.mjs --live-${itemProvider}`}`,
    ].join('\n');
  });
  const providerSpecificCommands = entries.flatMap((item) => {
    const itemProvider = String(item.provider || '').trim();
    const preflight = state.releasePreflightResults?.[itemProvider] || null;
    const liveCommand = getProviderLiveCommand(item, preflight);
    return [
      `- ${item.label || itemProvider} preflight: ${item.preflightCommand || `npm run preflight:execution-v1:${itemProvider}`}`,
      `- ${item.label || itemProvider} live validation: ${liveCommand || item.command || '-'}`,
      `- ${item.label || itemProvider} evidence refresh: ${item.evidenceCommand || `node scripts/build-execution-v1-evidence.mjs --live-${itemProvider}`}`,
    ];
  });
  const evidenceDocLines = normalizedProvider
    ? buildReleaseProviderReadinessEvidenceDocLines(normalizedProvider)
    : formatReleaseProviderReadinessEvidenceDocLines([
        ...getReleaseProviderReadinessEvidenceDocs('openai'),
        getReleaseProviderSpecificEvidenceDoc('anthropic'),
        getReleaseProviderSpecificEvidenceDoc('local'),
        getReleaseProviderSpecificEvidenceDoc('hermes'),
      ].filter(Boolean));
  const linkedProviderBlockers = getUniqueReleaseProviderBlockerActions(
    entries.flatMap((item) =>
      getReleaseProviderBlockerActions({
        provider: String(item.provider || '').trim(),
        releaseStatus,
      }),
    ),
  );
  const linkedProviderBlockerLines = buildReleaseProviderBlockerPackageLines(linkedProviderBlockers);

  return [
    'Provider readiness handoff package',
    '',
    'Scope:',
    `- provider: ${packageScope}`,
    `- productionReadyStatus: ${summary.productionReadyStatus || releaseReadiness.productionReadyStatus || 'not tracked'}`,
    `- productionReadyBlocked: ${String(Boolean(summary.productionReadyBlocked ?? releaseReadiness.productionReadyBlocked ?? true))}`,
    `- productionBlockerCount: ${summary.productionBlockerCount ?? 'not tracked'}`,
    `- productionReadyStopReason: ${summary.productionReadyStopReason || releaseReadiness.productionReadyStopReason || 'not recorded'}`,
    `- releaseLink: ${releaseLink}`,
    `- productionProviderReadinessDoc: ${productionProviderReadinessDoc}`,
    `- releaseReadinessDoc: ${releaseReadinessDoc}`,
    '',
    'Provider readiness matrix:',
    ...providerLines,
    '',
    'Linked provider blockers:',
    ...linkedProviderBlockerLines,
    '',
    'Commands:',
    '- Aggregate preflight: npm run preflight:execution-v1:all',
    '- Provider readiness rehearsal: npm run rehearsal:production-provider-readiness',
    '- Provider readiness smoke: npm run smoke:production-provider-readiness',
    ...providerSpecificCommands,
    '- Target provider evidence intake smoke: npm run smoke:target-provider-evidence-intake',
    '- Target provider operations smoke: npm run smoke:target-provider-operations',
    '- Artifact refresh after accepted live proof: npm run refresh:execution-v1-artifacts',
    '- Production readiness gate: npm run smoke:production-readiness-gate',
    '- Release artifact hygiene: npm run smoke:release-artifact-hygiene',
    '- Execution v1 status: npm run smoke:execution-v1-status',
    '',
    'Evidence docs:',
    ...evidenceDocLines,
    '',
    'Closure rules:',
    '- Provider env or account remediation must be completed outside this UI package before live validation can pass.',
    '- Target provider evidence intake must include provider evidence intake proof with provider id, inclusion decision, account owner, customer/workspace approval, approved target boundary, target environment name, release label, source commit, stop-condition id, evidence owner, reviewer, and decision owner; account or architecture approval proof; target secret injection proof; target-boundary live validation proof; quota and cost guard proof; model and endpoint pinning proof; fallback route proof; provider blocker closure verification proof; and release artifact reference proof.',
    '- Target provider operations must include provider operations proof with provider inventory, included provider list, provider owner, account or architecture record, customer/workspace approval, operating decision, and residual risk owner; provider fallback runtime audit proof with fallback policy and stop reason; recoverable-provider-failure-only stop condition proof; telemetry proof; incident triage proof; data and transcript handling proof; remediation and renewal review proof; evidence retention proof; and provider failure containment proof.',
    '- Regenerate execution-v1 artifacts after intentional live-provider proof or source-of-record changes.',
    '- Keep productionReadyClaim=false while any provider or target-environment stop-condition remains open.',
  ].join('\n');
}

export function buildReleaseSharedProviderOperationsScopeAuditLines(options = {}) {
  const scopeAudit = getReleaseSharedProviderOperationsScopeAudit(options);
  return [
    `- sharedProviderOperationsIncludedCount: ${scopeAudit.includedCount}`,
    `- sharedProviderOperationsExcludedCount: ${scopeAudit.excludedCount}`,
    `- sharedProviderOperationsExcludedIds: ${scopeAudit.excludedIds.join(', ') || 'none'}`,
  ];
}

export function buildReleaseBlockerSliceSummaryText({
  blockerActions = getFilteredReleaseCurrentOpenBlockerActions(),
  totalActions = getReleaseCurrentOpenBlockerActions(),
  category = state.releaseBlockerCategoryFilter,
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const visibleActions = Array.isArray(blockerActions) ? blockerActions : [];
  const allActions = Array.isArray(totalActions) ? totalActions : [];
  if (!allActions.length) {
    return '';
  }

  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const sliceSummary = getReleaseBlockerSliceSummary({
    blockerActions: visibleActions,
    totalActions: allActions,
  });
  const sliceLink = buildReleaseBlockerSliceUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const apiLink = buildReleaseBlockerApiUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const topBlockerLabel = sliceSummary.topVisibleBlockerLabel
    ? `${sliceSummary.topVisibleBlockerId || 'unknown'}: ${sliceSummary.topVisibleBlockerLabel}`
    : 'none';
  const lines = [
    'Release blocker slice summary',
    `- category: ${normalizedCategory || 'all'}`,
    `- owner: ${normalizedOwner || 'all'}`,
    `- provider: ${normalizedProvider || 'all'}`,
    `- includeSharedProviderOperations: ${String(includeShared !== false)}`,
    `- sharedProviderOperationsScope: ${getReleaseSharedProviderOperationsScopeReason({ includeShared, provider: normalizedProvider })}`,
    ...buildReleaseSharedProviderOperationsScopeAuditLines({
      totalActions: allActions,
      category: normalizedCategory,
      includeShared,
      owner: normalizedOwner,
      provider: normalizedProvider,
    }),
    `- visibleBlockers: ${sliceSummary.visibleCount}/${sliceSummary.totalCount}`,
    `- closureVerificationCount: ${sliceSummary.closureVerificationCount}`,
    `- targetBoundaryRequired: ${sliceSummary.targetBoundaryRequiredCount}/${sliceSummary.visibleCount}`,
    `- productionReadyClaimBlocked: ${sliceSummary.productionReadyBlockedCount}/${sliceSummary.visibleCount}`,
    `- commandCount: ${sliceSummary.commandCount}`,
    `- evidenceDocCount: ${sliceSummary.evidenceDocCount}`,
    `- requiredProofCount: ${sliceSummary.requiredProofCount}`,
    `- topVisibleBlocker: ${topBlockerLabel}`,
    `- releaseLink: ${sliceLink}`,
    `- apiLink: ${apiLink}`,
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseBlockerHandoffText(blockerAction = null) {
  const actionId = String(blockerAction?.id || '').trim();
  if (!blockerAction || !actionId) {
    return '';
  }

  const blockerLink = `${window.location.origin}${buildUiStateUrl({
    detailTab: 'release',
    releaseFocusedBlockerId: actionId,
    releaseFocusedProductionBlockerIndex: '',
    releaseFocusedProvider: '',
    releaseFocusedHistoryId: '',
    releaseHistoryOutcome: '',
    releaseHistoryProvider: '',
    releaseHistoryScope: '',
  })}`;
  const evidenceDocs = Array.isArray(blockerAction.evidenceDocs) ? blockerAction.evidenceDocs : [];
  const commands = Array.isArray(blockerAction.commands) ? blockerAction.commands : [];
  const lines = [
    'Release blocker handoff',
    `- blocker: ${String(blockerAction.blocker || blockerAction.stopReason || 'current open blocker').trim()}`,
    `- id: ${actionId}`,
    `- category: ${String(blockerAction.category || 'stop-condition').trim()}`,
    `- owner: ${String(blockerAction.owner || 'release-owner').trim()}`,
    `- status: ${String(blockerAction.status || 'blocked').trim()}`,
    `- stopReason: ${String(blockerAction.stopReason || blockerAction.blocker || '').trim()}`,
    `- nextEvidence: ${String(blockerAction.nextEvidence || '').trim()}`,
    `- releaseLink: ${blockerLink}`,
    '',
    'Evidence docs:',
    ...(
      evidenceDocs.length
        ? evidenceDocs.map((doc) => {
            const docLabel = String(doc.label || doc.path || 'evidence doc').trim();
            const docPath = String(doc.path || '').trim();
            const docHref = getAbsoluteReleaseUrl(doc.href || '');
            const availability = doc.exists === false ? 'missing' : 'available';
            return `- ${docLabel}: ${docPath}${docHref ? ` (${docHref})` : ''} [${availability}]`;
          })
        : ['- none']
    ),
    '',
    'Commands:',
    ...(
      commands.length
        ? commands.map((command) => {
            const commandLabel = String(command.label || 'command').trim();
            const commandValue = String(command.command || '').trim();
            return `- ${commandLabel}: ${commandValue}`;
          })
        : ['- none']
    ),
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseBlockerClosureChecklistText(blockerAction = null) {
  const actionId = String(blockerAction?.id || '').trim();
  if (!blockerAction || !actionId) {
    return '';
  }

  const blockerLabel = String(blockerAction.blocker || blockerAction.stopReason || 'current open blocker').trim();
  const closureVerification = blockerAction.closureVerification || {};
  const nextEvidence = String(closureVerification.requiredClosingEvidence || blockerAction.nextEvidence || '').trim();
  const evidenceDocs = Array.isArray(closureVerification.requiredEvidenceDocs)
    ? closureVerification.requiredEvidenceDocs
    : Array.isArray(blockerAction.evidenceDocs)
      ? blockerAction.evidenceDocs
      : [];
  const commands = Array.isArray(closureVerification.requiredCommands)
    ? closureVerification.requiredCommands
    : Array.isArray(blockerAction.commands)
      ? blockerAction.commands
      : [];
  const closureRules = Array.isArray(closureVerification.closureRules)
    ? closureVerification.closureRules
    : [];
  const requiredProofs = Array.isArray(closureVerification.requiredProofs)
    ? closureVerification.requiredProofs
    : [];
  const requiredDecisionFields = Array.isArray(closureVerification.requiredDecisionFields)
    ? closureVerification.requiredDecisionFields
    : [];
  const forbiddenEvidence = Array.isArray(closureVerification.forbiddenEvidence)
    ? closureVerification.forbiddenEvidence
    : [];
  const blockerLink = `${window.location.origin}${buildUiStateUrl({
    detailTab: 'release',
    releaseFocusedBlockerId: actionId,
    releaseFocusedProductionBlockerIndex: '',
    releaseFocusedProvider: '',
    releaseFocusedHistoryId: '',
    releaseHistoryOutcome: '',
    releaseHistoryProvider: '',
    releaseHistoryScope: '',
  })}`;
  const lines = [
    'Release blocker closure checklist',
    `- blocker: ${blockerLabel}`,
    `- id: ${actionId}`,
    `- category: ${String(blockerAction.category || 'stop-condition').trim()}`,
    `- owner: ${String(blockerAction.owner || 'release-owner').trim()}`,
    `- status: ${String(blockerAction.status || 'blocked').trim()}`,
    `- stopReason: ${String(blockerAction.stopReason || blockerLabel).trim()}`,
    `- nextEvidence: ${nextEvidence || 'not recorded'}`,
    `- closureVerification: ${closureVerification.id ? closureVerification.id : 'not provided'}`,
    `- targetBoundaryRequired: ${String(Boolean(closureVerification.targetBoundaryRequired ?? true))}`,
    `- sameBoundaryRequired: ${String(Boolean(closureVerification.sameBoundaryRequired ?? true))}`,
    `- productionReadyClaimAllowed: ${String(Boolean(closureVerification.productionReadyClaimAllowed))}`,
    `- defaultDisposition: ${String(closureVerification.defaultDisposition || 'keep-blocked')}`,
    `- releaseLink: ${blockerLink}`,
    '',
    'Closure requirements:',
    `1. Capture closing evidence for: ${nextEvidence || blockerLabel}`,
    '2. Update or attach every evidence doc listed below before changing the release label.',
    '3. Run the blocker-specific commands listed below and keep command output with the evidence packet.',
    '4. Regenerate execution-v1 artifacts if live proof or any release source-of-record changes.',
    '5. Keep productionReadyClaim=false until production readiness and artifact hygiene gates pass with no stop-condition.',
    '',
    'Closure rules:',
    ...(
      closureRules.length
        ? closureRules.map((rule, index) => `${index + 1}. ${String(rule || '').trim()}`)
        : ['- target-boundary evidence and reviewer decision are required']
    ),
    '',
    'Required proofs:',
    ...(
      requiredProofs.length
        ? requiredProofs.map((proof, index) => `${index + 1}. ${String(proof || '').trim()}`)
        : ['- same-boundary target evidence packet proof']
    ),
    '',
    'Evidence docs:',
    ...(
      evidenceDocs.length
        ? evidenceDocs.map((doc, index) => {
            const docLabel = String(doc.label || doc.path || 'evidence doc').trim();
            const docPath = String(doc.path || '').trim();
            const docHref = getAbsoluteReleaseUrl(doc.href || '');
            const availability = doc.exists === false ? 'missing' : 'available';
            return [
              `${index + 1}. ${docLabel}`,
              `   - path: ${docPath || 'path 없음'}`,
              `   - link: ${docHref || 'link 없음'}`,
              `   - availability: ${availability}`,
            ].join('\n');
          })
        : ['- none']
    ),
    '',
    'Commands:',
    ...(
      commands.length
        ? commands.map((command, index) => {
            const commandLabel = String(command.label || 'command').trim();
            const commandValue = String(command.command || '').trim();
            return `${index + 1}. ${commandLabel}: ${commandValue || 'command 없음'}`;
      })
        : ['- none']
    ),
    '',
    'Decision fields:',
    ...(
      requiredDecisionFields.length
        ? requiredDecisionFields.map((field) => `- ${String(field || '').trim()}`)
        : ['- decisionOwner', '- evidenceOwner', '- reviewer', '- reviewDate']
    ),
    '',
    'Forbidden evidence:',
    ...(
      forbiddenEvidence.length
        ? forbiddenEvidence.map((item) => `- ${String(item || '').trim()}`)
        : ['- raw API keys or tokens', '- customer personal data']
    ),
    '',
    'Final verification:',
    '- Artifact refresh: npm run refresh:execution-v1-artifacts',
    '- Production readiness gate: npm run smoke:production-readiness-gate',
    '- Release artifact hygiene: npm run smoke:release-artifact-hygiene',
    '- Execution v1 status: npm run smoke:execution-v1-status',
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseBlockerPackageText(blockerAction = null) {
  const actionId = String(blockerAction?.id || '').trim();
  if (!blockerAction || !actionId) {
    return '';
  }

  const blockerLabel = String(blockerAction.blocker || blockerAction.stopReason || 'current open blocker').trim();
  const evidenceDocs = Array.isArray(blockerAction.evidenceDocs) ? blockerAction.evidenceDocs : [];
  const commands = Array.isArray(blockerAction.commands) ? blockerAction.commands : [];
  const commandSection = [
    'Release blocker commands',
    `- blocker: ${blockerLabel}`,
    `- id: ${actionId}`,
    `- commandCount: ${commands.length}`,
    '',
    'Commands:',
    ...(
      commands.length
        ? commands.map((command, index) => {
            const commandLabel = String(command.label || 'command').trim();
            const commandValue = String(command.command || '').trim();
            return `${index + 1}. ${commandLabel}: ${commandValue || 'command 없음'}`;
          })
        : ['- none']
    ),
  ].join('\n');
  const evidenceSection = [
    'Release blocker evidence',
    `- blocker: ${blockerLabel}`,
    `- id: ${actionId}`,
    `- evidenceDocCount: ${evidenceDocs.length}`,
    '',
    'Evidence docs:',
    ...(
      evidenceDocs.length
        ? evidenceDocs.map((doc, index) => {
            const docLabel = String(doc.label || doc.path || 'evidence doc').trim();
            const docPath = String(doc.path || '').trim();
            const docHref = getAbsoluteReleaseUrl(doc.href || '');
            const availability = doc.exists === false ? 'missing' : 'available';
            return [
              `${index + 1}. ${docLabel}`,
              `   - path: ${docPath || 'path 없음'}`,
              `   - link: ${docHref || 'link 없음'}`,
              `   - availability: ${availability}`,
            ].join('\n');
          })
        : ['- none']
    ),
  ].join('\n');
  const sections = [
    buildReleaseBlockerHandoffText(blockerAction),
    buildReleaseBlockerClosureChecklistText(blockerAction),
    commandSection,
    evidenceSection,
  ]
    .map((section) => String(section || '').trim())
    .filter(Boolean);

  if (!sections.length) {
    return '';
  }

  return `Release blocker package\n\n${sections.join('\n\n')}\n`;
}

export function buildReleaseBlockerSliceHandoffText({
  blockerActions = getFilteredReleaseCurrentOpenBlockerActions(),
  totalActions = getReleaseCurrentOpenBlockerActions(),
  category = state.releaseBlockerCategoryFilter,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const visibleActions = Array.isArray(blockerActions) ? blockerActions : [];
  const allActions = Array.isArray(totalActions) ? totalActions : [];
  if (!allActions.length) {
    return '';
  }

  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const sliceLink = buildReleaseBlockerSliceUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const topVisibleAction = visibleActions[0] || null;
  const formatEvidenceDoc = (doc = {}) => {
    const docLabel = String(doc.label || doc.path || 'evidence doc').trim();
    const docPath = String(doc.path || '').trim();
    const docHref = getAbsoluteReleaseUrl(doc.href || '');
    const availability = doc.exists === false ? 'missing' : 'available';
    return `${docLabel}: ${docPath || 'path 없음'}${docHref ? ` (${docHref})` : ''} [${availability}]`;
  };
  const formatCommand = (command = {}) => {
    const commandLabel = String(command.label || 'command').trim();
    const commandValue = String(command.command || '').trim();
    return `${commandLabel}: ${commandValue || 'command 없음'}`;
  };
  const blockerLines = visibleActions.length
    ? visibleActions.flatMap((item, index) => {
        const actionId = String(item.id || '').trim();
        const closureVerification = getReleaseBlockerClosureVerification(item);
        const evidenceDocs = getReleaseBlockerRequiredEvidenceDocs(item);
        const commands = getReleaseBlockerRequiredCommands(item);
        const requiredProofs = getReleaseBlockerRequiredProofs(item);
        return [
          `${index + 1}. ${String(item.blocker || item.stopReason || 'current open blocker').trim()}`,
          `   - id: ${actionId || 'unknown'}`,
          `   - category: ${String(item.category || 'stop-condition').trim()}`,
          `   - owner: ${String(item.owner || 'release-owner').trim()}`,
          `   - status: ${String(item.status || 'blocked').trim()}`,
          `   - stopReason: ${String(item.stopReason || item.blocker || '').trim()}`,
          `   - nextEvidence: ${String(item.nextEvidence || '').trim()}`,
          `   - closureVerification: ${String(closureVerification.id || 'not provided').trim()}`,
          `   - targetBoundaryRequired: ${String(Boolean(closureVerification.targetBoundaryRequired ?? true))}`,
          `   - requiredProofCount: ${requiredProofs.length}`,
          `   - evidenceDocs: ${evidenceDocs.length ? evidenceDocs.map(formatEvidenceDoc).join('; ') : 'none'}`,
          `   - commands: ${commands.length ? commands.map(formatCommand).join('; ') : 'none'}`,
        ];
      })
    : ['- none'];
  const lines = [
    'Release blocker slice handoff',
    `- category: ${normalizedCategory || 'all'}`,
    `- owner: ${normalizedOwner || 'all'}`,
    `- provider: ${normalizedProvider || 'all'}`,
    `- visibleBlockers: ${visibleActions.length}/${allActions.length}`,
    `- releaseLink: ${sliceLink}`,
    `- topVisibleBlocker: ${topVisibleAction ? `${String(topVisibleAction.id || 'unknown').trim()}: ${String(topVisibleAction.blocker || topVisibleAction.stopReason || 'current open blocker').trim()}` : 'none'}`,
    '',
    'Blockers:',
    ...blockerLines,
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseBlockerSliceClosureChecklistText({
  blockerActions = getFilteredReleaseCurrentOpenBlockerActions(),
  totalActions = getReleaseCurrentOpenBlockerActions(),
  category = state.releaseBlockerCategoryFilter,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const visibleActions = Array.isArray(blockerActions) ? blockerActions : [];
  const allActions = Array.isArray(totalActions) ? totalActions : [];
  if (!allActions.length) {
    return '';
  }

  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const sliceLink = buildReleaseBlockerSliceUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const topVisibleAction = visibleActions[0] || null;
  const formatEvidenceDoc = (doc = {}) => {
    const docLabel = String(doc.label || doc.path || 'evidence doc').trim();
    const docPath = String(doc.path || '').trim();
    const docHref = getAbsoluteReleaseUrl(doc.href || '');
    const availability = doc.exists === false ? 'missing' : 'available';
    return `${docLabel}: ${docPath || 'path 없음'}${docHref ? ` (${docHref})` : ''} [${availability}]`;
  };
  const formatCommand = (command = {}) => {
    const commandLabel = String(command.label || 'command').trim();
    const commandValue = String(command.command || '').trim();
    return `${commandLabel}: ${commandValue || 'command 없음'}`;
  };
  const blockerLines = visibleActions.length
    ? visibleActions.flatMap((item, index) => {
        const actionId = String(item.id || '').trim();
        const closureVerification = getReleaseBlockerClosureVerification(item);
        const evidenceDocs = getReleaseBlockerRequiredEvidenceDocs(item);
        const commands = getReleaseBlockerRequiredCommands(item);
        const requiredProofs = getReleaseBlockerRequiredProofs(item);
        const requiredProofSummary = requiredProofs.length ? requiredProofs.join('; ') : 'none';
        return [
          `${index + 1}. ${String(item.blocker || item.stopReason || 'current open blocker').trim()}`,
          `   - id: ${actionId || 'unknown'}`,
          `   - category: ${String(item.category || 'stop-condition').trim()}`,
          `   - owner: ${String(item.owner || 'release-owner').trim()}`,
          `   - status: ${String(item.status || 'blocked').trim()}`,
          `   - stopReason: ${String(item.stopReason || item.blocker || '').trim()}`,
          `   - closureVerification: ${String(closureVerification.id || 'not provided').trim()}`,
          `   - targetBoundaryRequired: ${String(Boolean(closureVerification.targetBoundaryRequired ?? true))}`,
          `   - sameBoundaryRequired: ${String(Boolean(closureVerification.sameBoundaryRequired ?? true))}`,
          `   - productionReadyClaimAllowed: ${String(Boolean(closureVerification.productionReadyClaimAllowed))}`,
          `   - closingEvidence: ${String(closureVerification.requiredClosingEvidence || item.nextEvidence || '').trim() || 'not recorded'}`,
          `   - requiredProofs: ${requiredProofSummary}`,
          `   - evidenceDocs: ${evidenceDocs.length ? evidenceDocs.map(formatEvidenceDoc).join('; ') : 'none'}`,
          `   - commands: ${commands.length ? commands.map(formatCommand).join('; ') : 'none'}`,
        ];
      })
    : ['- none'];
  const lines = [
    'Release blocker slice closure checklist',
    `- category: ${normalizedCategory || 'all'}`,
    `- owner: ${normalizedOwner || 'all'}`,
    `- provider: ${normalizedProvider || 'all'}`,
    `- visibleBlockers: ${visibleActions.length}/${allActions.length}`,
    `- closureVerificationCount: ${visibleActions.filter((item) => Boolean(getReleaseBlockerClosureVerification(item).id)).length}`,
    `- releaseLink: ${sliceLink}`,
    `- topVisibleBlocker: ${topVisibleAction ? `${String(topVisibleAction.id || 'unknown').trim()}: ${String(topVisibleAction.blocker || topVisibleAction.stopReason || 'current open blocker').trim()}` : 'none'}`,
    '',
    'Closure requirements:',
    '1. Capture closing evidence for every visible blocker below.',
    '2. Update or attach the listed evidence docs before changing the release label.',
    '3. Run the blocker-specific commands and keep command output with the evidence packet.',
    '4. Regenerate execution-v1 artifacts if live proof or any release source-of-record changes.',
    '5. Keep productionReadyClaim=false until production readiness and artifact hygiene gates pass with no stop-condition.',
    '',
    'Blocker checklist:',
    ...blockerLines,
    '',
    'Final verification:',
    '- Artifact refresh: npm run refresh:execution-v1-artifacts',
    '- Production readiness gate: npm run smoke:production-readiness-gate',
    '- Release artifact hygiene: npm run smoke:release-artifact-hygiene',
    '- Execution v1 status: npm run smoke:execution-v1-status',
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseBlockerSliceCommandText({
  blockerActions = getFilteredReleaseCurrentOpenBlockerActions(),
  totalActions = getReleaseCurrentOpenBlockerActions(),
  category = state.releaseBlockerCategoryFilter,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const visibleActions = Array.isArray(blockerActions) ? blockerActions : [];
  const allActions = Array.isArray(totalActions) ? totalActions : [];
  if (!allActions.length) {
    return '';
  }

  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const commandEntries = visibleActions.flatMap((item) => {
    const actionId = String(item.id || '').trim();
    const blockerLabel = String(item.blocker || item.stopReason || 'current open blocker').trim();
    const commands = getReleaseBlockerRequiredCommands(item);
    return commands
      .map((command) => ({
        blockerId: actionId,
        blockerLabel,
        command: String(command.command || '').trim(),
        label: String(command.label || 'command').trim(),
      }))
      .filter((entry) => Boolean(entry.command));
  });
  if (!commandEntries.length) {
    return '';
  }

  const sliceLink = buildReleaseBlockerSliceUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const lines = [
    'Release blocker slice commands',
    `- category: ${normalizedCategory || 'all'}`,
    `- owner: ${normalizedOwner || 'all'}`,
    `- provider: ${normalizedProvider || 'all'}`,
    `- visibleBlockers: ${visibleActions.length}/${allActions.length}`,
    `- commandCount: ${commandEntries.length}`,
    `- releaseLink: ${sliceLink}`,
    '',
    'Commands:',
    ...commandEntries.flatMap((entry, index) => [
      `${index + 1}. ${entry.label}`,
      `   - blockerId: ${entry.blockerId || 'unknown'}`,
      `   - blocker: ${entry.blockerLabel}`,
      `   - command: ${entry.command}`,
    ]),
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseBlockerSliceEvidenceText({
  blockerActions = getFilteredReleaseCurrentOpenBlockerActions(),
  totalActions = getReleaseCurrentOpenBlockerActions(),
  category = state.releaseBlockerCategoryFilter,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const visibleActions = Array.isArray(blockerActions) ? blockerActions : [];
  const allActions = Array.isArray(totalActions) ? totalActions : [];
  if (!allActions.length) {
    return '';
  }

  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const evidenceByKey = new Map();
  visibleActions.forEach((item) => {
    const actionId = String(item.id || '').trim();
    const blockerLabel = String(item.blocker || item.stopReason || 'current open blocker').trim();
    const evidenceDocs = getReleaseBlockerRequiredEvidenceDocs(item);
    evidenceDocs.forEach((doc) => {
      const docLabel = String(doc.label || doc.path || 'evidence doc').trim();
      const docPath = String(doc.path || '').trim();
      const docHref = getAbsoluteReleaseUrl(doc.href || '');
      const docKey = docHref || docPath || docLabel;
      if (!docKey) {
        return;
      }
      if (!evidenceByKey.has(docKey)) {
        evidenceByKey.set(docKey, {
          availability: doc.exists === false ? 'missing' : 'available',
          blockerIds: [],
          blockerLabels: [],
          href: docHref,
          label: docLabel,
          path: docPath,
        });
      }
      const entry = evidenceByKey.get(docKey);
      if (actionId && !entry.blockerIds.includes(actionId)) {
        entry.blockerIds.push(actionId);
      }
      if (blockerLabel && !entry.blockerLabels.includes(blockerLabel)) {
        entry.blockerLabels.push(blockerLabel);
      }
    });
  });

  const evidenceEntries = Array.from(evidenceByKey.values());
  if (!evidenceEntries.length) {
    return '';
  }

  const sliceLink = buildReleaseBlockerSliceUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const lines = [
    'Release blocker slice evidence',
    `- category: ${normalizedCategory || 'all'}`,
    `- owner: ${normalizedOwner || 'all'}`,
    `- provider: ${normalizedProvider || 'all'}`,
    `- visibleBlockers: ${visibleActions.length}/${allActions.length}`,
    `- evidenceDocCount: ${evidenceEntries.length}`,
    `- releaseLink: ${sliceLink}`,
    '',
    'Evidence docs:',
    ...evidenceEntries.flatMap((entry, index) => [
      `${index + 1}. ${entry.label}`,
      `   - path: ${entry.path || 'path 없음'}`,
      `   - link: ${entry.href || 'link 없음'}`,
      `   - availability: ${entry.availability}`,
      `   - blockerIds: ${entry.blockerIds.length ? entry.blockerIds.join(', ') : 'unknown'}`,
      `   - blockers: ${entry.blockerLabels.length ? entry.blockerLabels.join(' | ') : 'unknown'}`,
    ]),
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseBlockerClosureMatrixPackageText({
  blockerActions = getFilteredReleaseCurrentOpenBlockerActions(),
  totalActions = getReleaseCurrentOpenBlockerActions(),
  category = state.releaseBlockerCategoryFilter,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const visibleActions = Array.isArray(blockerActions) ? blockerActions : [];
  const allActions = Array.isArray(totalActions) ? totalActions : [];
  if (!allActions.length) {
    return '';
  }

  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const sliceLink = buildReleaseBlockerSliceUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const targetEnvironmentEvidenceDoc = getAbsoluteReleaseUrl(
    '/api/execution-v1/release-doc?path=docs%2Ftarget-environment-evidence-intake-v1.md',
  );
  const targetProviderOperationsDoc = getAbsoluteReleaseUrl(
    '/api/execution-v1/release-doc?path=docs%2Ftarget-provider-operations-v1.md',
  );
  const releaseReadinessDoc = getAbsoluteReleaseUrl(
    '/api/execution-v1/release-doc?path=docs%2Frelease-readiness-v1.md',
  );
  const matrixRows = visibleActions.length
    ? visibleActions.flatMap((item, index) => {
        const actionId = String(item.id || '').trim();
        const provider = String(item.provider || '').trim();
        const closureVerification = getReleaseBlockerClosureVerification(item);
        const commands = getReleaseBlockerRequiredCommands(item);
        const evidenceDocs = getReleaseBlockerRequiredEvidenceDocs(item);
        const requiredProofs = getReleaseBlockerRequiredProofs(item);
        const requiredDecisionFields = Array.isArray(closureVerification.requiredDecisionFields)
          ? closureVerification.requiredDecisionFields
          : [];
        const firstCommand = commands.find((command) => String(command.command || '').trim()) || null;
        const blockerLink = `${window.location.origin}${buildUiStateUrl({
          detailTab: 'release',
          releaseBlockerCategoryFilter: '',
          releaseBlockerOwnerFilter: '',
          releaseBlockerProviderFilter: '',
          releaseFocusedBlockerId: actionId,
          releaseFocusedProductionBlockerIndex: '',
          releaseFocusedProvider: provider,
          releaseFocusedHistoryId: '',
          releaseHistoryOutcome: '',
          releaseHistoryProvider: '',
          releaseHistoryScope: '',
        })}`;
        return [
          `${index + 1}. ${String(item.blocker || item.stopReason || 'current open blocker').trim()}`,
          `   - blockerId: ${actionId || 'unknown'}`,
          `   - provider: ${provider || 'none'}`,
          `   - category: ${String(item.category || 'stop-condition').trim()}`,
          `   - owner: ${String(item.owner || 'release-owner').trim()}`,
          `   - currentState: ${String(item.status || 'blocked').trim()}`,
          `   - closureVerification: ${String(closureVerification.id || 'not provided').trim()}`,
          `   - targetBoundaryRequired: ${String(Boolean(closureVerification.targetBoundaryRequired ?? true))}`,
          `   - sameBoundaryRequired: ${String(Boolean(closureVerification.sameBoundaryRequired ?? true))}`,
          `   - stopConditionId: ${String(closureVerification.stopConditionId || actionId || 'unknown').trim()}`,
          `   - stopReason: ${String(closureVerification.stopReason || item.stopReason || item.blocker || '').trim() || 'not recorded'}`,
          `   - requiredClosingEvidence: ${String(closureVerification.requiredClosingEvidence || item.nextEvidence || '').trim() || 'not recorded'}`,
          `   - requiredProofs: ${requiredProofs.length ? requiredProofs.join(' | ') : 'none'}`,
          `   - requiredDecisionFields: ${requiredDecisionFields.length ? requiredDecisionFields.join(' | ') : 'decisionOwner | evidenceOwner | reviewer | reviewDate'}`,
          `   - nextVerificationCommand: ${String(firstCommand?.command || '').trim() || 'not recorded'}`,
          `   - allVerificationCommands: ${commands.map((command) => String(command.command || '').trim()).filter(Boolean).join(' | ') || 'none'}`,
          `   - evidenceDocs: ${evidenceDocs.map((doc) => String(doc.path || doc.label || '').trim()).filter(Boolean).join(' | ') || 'none'}`,
          '   - artifactRefreshRequired: yes when live proof or release source-of-record changes',
          '   - allowedClaimImpact: keep productionReadyClaim=false until this stop-condition is closed and final gates pass',
          `   - decisionOwner: ${String(item.owner || 'release-owner').trim()}`,
          `   - releaseLink: ${blockerLink}`,
        ];
      })
    : ['- none'];
  const lines = [
    'Target environment blocker closure matrix package',
    `- category: ${normalizedCategory || 'all'}`,
    `- owner: ${normalizedOwner || 'all'}`,
    `- provider: ${normalizedProvider || 'all'}`,
    `- visibleBlockers: ${visibleActions.length}/${allActions.length}`,
    `- closureVerificationCount: ${visibleActions.filter((item) => Boolean(getReleaseBlockerClosureVerification(item).id)).length}`,
    `- releaseLink: ${sliceLink}`,
    `- targetEnvironmentEvidenceIntakeDoc: ${targetEnvironmentEvidenceDoc}`,
    `- targetProviderOperationsDoc: ${targetProviderOperationsDoc}`,
    `- releaseReadinessDoc: ${releaseReadinessDoc}`,
    '',
    'Closure matrix:',
    ...matrixRows,
    '',
    'Target evidence intake requirements:',
    '1. Attach target environment name, owner, profile, deployment boundary, and evidence capture date.',
    '2. Copy every matrix row into the blocker disposition register before changing release readiness labels.',
    '3. Pair every provider row with target provider evidence intake and target provider operations proof.',
    '4. Keep command output, evidence doc references, reviewer decision, and residual blocker state together.',
    '5. Regenerate execution-v1 artifacts after accepted live proof or release source-of-record changes.',
    '',
    'Final verification:',
    '- Target environment evidence intake: npm run smoke:target-environment-evidence-intake',
    '- Target provider evidence intake: npm run smoke:target-provider-evidence-intake',
    '- Target provider operations: npm run smoke:target-provider-operations',
    '- Artifact refresh: npm run refresh:execution-v1-artifacts',
    '- Production readiness gate: npm run smoke:production-readiness-gate',
    '- Release artifact hygiene: npm run smoke:release-artifact-hygiene',
    '- Execution v1 status: npm run smoke:execution-v1-status',
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseTargetEvidenceSubmissionManifestText({
  blockerActions = getFilteredReleaseCurrentOpenBlockerActions(),
  totalActions = getReleaseCurrentOpenBlockerActions(),
  category = state.releaseBlockerCategoryFilter,
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
  releaseStatus = state.releaseStatus,
} = {}) {
  const visibleActions = Array.isArray(blockerActions) ? blockerActions : [];
  const allActions = Array.isArray(totalActions) ? totalActions : [];
  if (!releaseStatus || !allActions.length) {
    return '';
  }

  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const summary = releaseStatus.summary || {};
  const releaseReadiness = releaseStatus.releaseReadiness || {};
  const snapshot = releaseStatus.snapshot || {};
  const productionBlockers = getReleaseProductionBlockers(releaseStatus);
  const releaseLink = buildReleaseBlockerSliceUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const releaseBlockerApiLink = buildReleaseBlockerApiUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const sourceCommit = String(summary.sourceCommit || releaseStatus.commit || snapshot.verifiedCommit || '<required source commit>').trim()
    || '<required source commit>';
  const generatedArtifactCommit = String(summary.generatedArtifactCommit || snapshot.verifiedCommit || '<required artifact refresh commit>').trim()
    || '<required artifact refresh commit>';
  const shortSourceCommit = sourceCommit.startsWith('<') ? '<short-source-commit>' : sourceCommit.slice(0, 12);
  const docLink = (docPath) => {
    const normalizedPath = String(docPath || '').trim();
    if (!normalizedPath) {
      return '';
    }
    return `${normalizedPath} (${getAbsoluteReleaseUrl(`/api/execution-v1/release-doc?path=${encodeURIComponent(normalizedPath)}`)})`;
  };
  const manifestFields = [
    ['packetId', `target-evidence-manifest-<target-env>-<YYYYMMDD>-${shortSourceCommit}`],
    ['targetEnvironmentName', '<required approved target environment name>'],
    ['companyWorkspaceScope', '<required company/workspace scope>'],
    ['deploymentBoundary', '<required deployment profile, network boundary, runtime root alias, and rollback owner>'],
    ['evidenceOwner', '<required accountable evidence owner>'],
    ['reviewer', '<required reviewer or approval team>'],
    ['sourceCommit', sourceCommit],
    ['generatedArtifactCommit', generatedArtifactCommit],
    ['reviewDate', '<required YYYY-MM-DD>'],
    ['packetStatus', 'draft | submitted | accepted-with-scope | rejected | blocked'],
    ['productionReadyClaimDecision', 'keep productionReadyClaim=false unless every target stop-condition is closed and final gates pass'],
  ];
  const requiredPacketSections = [
    {
      name: 'submissionManifest',
      requiredEvidence: 'packet id, target boundary, company/workspace scope, source commit, artifact commit, owner, reviewer, review date, and packet status',
    },
    {
      name: 'sanitizedEvidenceRegister',
      requiredEvidence: 'repository-relative evidence refs or sanitized external aliases with redaction notes and retention class',
    },
    {
      name: 'boundaryConsistencyMap',
      requiredEvidence: 'same target environment alias across deployment, identity/session, tenant, provider, observability, retention, support, and clean release boundaries',
    },
    {
      name: 'commandRerunLog',
      requiredEvidence: 'target-boundary command outputs, result, run date, runner, and artifact refs',
    },
    {
      name: 'reviewerDecisionRecord',
      requiredEvidence: 'reviewer decision, accepted scope, rejection reason, residual blocker state, and final verification commands',
    },
    {
      name: 'blockerDispositionRegister',
      requiredEvidence: 'still-blocking, accepted-scope-required, or closed disposition for every current target blocker',
    },
    {
      name: 'releaseRefreshEvidence',
      requiredEvidence: 'artifact refresh commit, refreshed docs, hygiene result, snapshot result, and production readiness gate result',
    },
  ];
  const visibleBlockerRows = visibleActions.length
    ? visibleActions.flatMap((item, index) => [
        `${index + 1}. ${String(item.blocker || item.stopReason || 'current open blocker').trim()}`,
        `   - blockerId: ${String(item.id || '').trim() || 'unknown'}`,
        `   - provider: ${String(item.provider || '').trim() || 'none'}`,
        `   - category: ${String(item.category || 'stop-condition').trim()}`,
        `   - owner: ${String(item.owner || 'release-owner').trim()}`,
        `   - status: ${String(item.status || 'blocked').trim()}`,
        `   - stopReason: ${String(item.stopReason || item.blocker || '').trim() || 'not recorded'}`,
        `   - requiredClosingEvidence: ${String(item.nextEvidence || '').trim() || 'not recorded'}`,
        '   - manifestDisposition: still-blocking | accepted-scope-required | closed-after-evidence',
      ])
    : ['- none'];
  const residualBlockerLines = productionBlockers.length
    ? productionBlockers.map((item, index) => `${index + 1}. ${String(item || '').trim()}`)
    : ['- none'];
  const requiredDocs = [
    'docs/target-environment-evidence-intake-v1.md',
    'docs/target-deployment-contract-v1.md',
    'docs/target-provider-evidence-intake-v1.md',
    'docs/target-provider-operations-v1.md',
    'docs/release-readiness-v1.md',
    'docs/execution-v1-evidence.md',
  ];
  const requiredCommands = [
    'npm run smoke:target-environment-evidence-intake',
    'npm run smoke:target-deployment-contract',
    'npm run smoke:target-provider-evidence-intake',
    'npm run smoke:target-provider-operations',
    'npm run refresh:execution-v1-artifacts',
    'npm run smoke:execution-v1-status',
    'npm run smoke:execution-v1-snapshot',
    'npm run smoke:production-readiness-gate',
    'npm run smoke:release-artifact-hygiene',
  ];
  const lines = [
    'Target evidence submission manifest',
    `- category: ${normalizedCategory || 'all'}`,
    `- owner: ${normalizedOwner || 'all'}`,
    `- provider: ${normalizedProvider || 'all'}`,
    `- includeSharedProviderOperations: ${String(includeShared !== false)}`,
    `- sharedProviderOperationsScope: ${getReleaseSharedProviderOperationsScopeReason({ includeShared, provider: normalizedProvider })}`,
    ...buildReleaseSharedProviderOperationsScopeAuditLines({
      totalActions: allActions,
      category: normalizedCategory,
      includeShared,
      owner: normalizedOwner,
      provider: normalizedProvider,
    }),
    `- visibleCurrentBlockers: ${visibleActions.length}/${allActions.length}`,
    `- productionReadyStatus: ${summary.productionReadyStatus || releaseReadiness.productionReadyStatus || 'not tracked'}`,
    `- productionReadyBlocked: ${String(Boolean(summary.productionReadyBlocked ?? releaseReadiness.productionReadyBlocked ?? true))}`,
    `- productionBlockerCount: ${summary.productionBlockerCount ?? releaseReadiness.productionBlockerCount ?? productionBlockers.length}`,
    `- productionReadyStopReason: ${summary.productionReadyStopReason || releaseReadiness.productionReadyStopReason || 'not recorded'}`,
    `- releaseLink: ${releaseLink}`,
    `- releaseBlockerApiLink: ${releaseBlockerApiLink}`,
    '',
    'Manifest fields:',
    ...manifestFields.map(([key, value]) => `- ${key}: ${value}`),
    '',
    'Required packet sections:',
    ...requiredPacketSections.flatMap((item, index) => [
      `${index + 1}. ${item.name}`,
      `   - requiredEvidence: ${item.requiredEvidence}`,
      '   - includedInSubmission: yes | no',
      '   - reviewerNote: <required note or none>',
    ]),
    '',
    'Required reference docs:',
    ...requiredDocs.map((docPath) => `- ${docLink(docPath)}`),
    '',
    'Required verification commands:',
    ...requiredCommands.map((command) => `- ${command}`),
    '',
    'Visible blocker scope:',
    ...visibleBlockerRows,
    '',
    'Residual production blockers:',
    ...residualBlockerLines,
    '',
    'Submission manifest rules:',
    '- This manifest is the packet cover sheet and routing control, not production-ready approval.',
    '- The manifest must identify the exact target environment, company/workspace scope, deployment boundary, source commit, generated artifact commit, evidence owner, reviewer, review date, and packet status.',
    '- The manifest cannot be accepted unless sanitizedEvidenceRegister, boundaryConsistencyMap, commandRerunLog, reviewerDecisionRecord, blockerDispositionRegister, and releaseRefreshEvidence are attached for the same target boundary.',
    '- Do not include raw API keys, tokens, private endpoint credentials, tenant payloads, customer personal data, billing identifiers, private tenant identifiers, or machine-local absolute paths.',
    '- Keep productionReadyClaim=false until every target stop-condition is closed, execution-v1 artifacts are regenerated, release artifact hygiene passes, and production readiness gate passes for the claimed scope.',
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseTargetEvidenceCaptureTemplateText({
  blockerActions = getFilteredReleaseCurrentOpenBlockerActions(),
  totalActions = getReleaseCurrentOpenBlockerActions(),
  category = state.releaseBlockerCategoryFilter,
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
  releaseStatus = state.releaseStatus,
} = {}) {
  const visibleActions = Array.isArray(blockerActions) ? blockerActions : [];
  const allActions = Array.isArray(totalActions) ? totalActions : [];
  if (!releaseStatus || !allActions.length) {
    return '';
  }

  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const summary = releaseStatus.summary || {};
  const releaseReadiness = releaseStatus.releaseReadiness || {};
  const snapshot = releaseStatus.snapshot || {};
  const productionBlockers = getReleaseProductionBlockers(releaseStatus);
  const releaseLink = buildReleaseBlockerSliceUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const releaseBlockerApiLink = buildReleaseBlockerApiUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const sourceCommit = String(summary.sourceCommit || releaseStatus.commit || snapshot.verifiedCommit || '<required source commit>').trim()
    || '<required source commit>';
  const docLink = (docPath) => {
    const normalizedPath = String(docPath || '').trim();
    if (!normalizedPath) {
      return '';
    }
    return `${normalizedPath} (${getAbsoluteReleaseUrl(`/api/execution-v1/release-doc?path=${encodeURIComponent(normalizedPath)}`)})`;
  };
  const captureFields = [
    {
      field: 'targetEnvironmentName',
      requiredValue: 'approved environment name, environment owner, customer/workspace scope, deployment profile, network boundary, runtime root alias, and rollback owner',
      completionRule: 'must name the exact production-like or hosted boundary where evidence was generated',
      primaryDocs: ['docs/target-environment-evidence-intake-v1.md', 'docs/target-deployment-contract-v1.md'],
    },
    {
      field: 'deploymentBoundaryEvidence',
      requiredValue: 'target deployment contract reference proof, approved target boundary proof, release label proof, deployment run id proof, source provenance proof, artifact registry proof, dependency installation proof, runtime bootstrap proof, secret injection proof, environment boundary proof, rollback and recovery proof, clean checkout proof, artifact synchronization proof, release approval proof, and production readiness gate result',
      completionRule: 'must prove release artifacts were generated from the approved target boundary, not from an unrelated local run',
      primaryDocs: ['docs/target-deployment-contract-v1.md', 'docs/target-clean-deployment-operations-v1.md', 'docs/clean-deployment-release-v1.md'],
    },
    {
      field: 'identitySessionEvidence',
      requiredValue: 'customer IdP onboarding proof with metadata alias, issuer, audience, JWKS rotation owner, fallback owner, and customer approval; user lifecycle proof with provision, invitation, suspension, recovery, deprovision, tenant mapping, and orphan account review; session lifecycle proof with login, refresh, expiry, logout, revocation, idle timeout, device inventory, and re-auth; role administration proof with persistent assignment, revocation, delegated admin approval, separation-of-duties, and rollback; permission propagation proof across API, worker, agent, support, observability, cache invalidation, and stale permission denial; immutable audit export proof with actor, subject, tenant, role, session, reason, before/after state, timestamp, and checksum; break-glass governance proof with owner, approver, scope, expiry, monitoring, customer notification, revocation, and post-use review; support impersonation proof with approval, scoped session, action log, customer-safe update, denial tests, expiry, and closure; compliance and retention proof with identity log retention, legal hold, audit export, privacy deletion, post-delete absence, and customer handoff; migration plan proof; rollback proof; lockout recovery proof; customer access containment proof; release artifact hygiene result; and regenerated execution snapshot evidence',
      completionRule: 'must reference target identity session operations evidence generated from the same boundary',
      primaryDocs: ['docs/hosted-identity-session-architecture-v1.md', 'docs/target-identity-session-operations-v1.md'],
    },
    {
      field: 'tenantIsolationEvidence',
      requiredValue: 'tenant identity source proof with source owner, customer organization mapping proof, tenant lifecycle owner, trust policy, source approval, and orphan tenant review; tenant-scoped authorization proof with permission policy, service-to-service tenant propagation proof, stale permission denial, delegated admin boundary, and denial owner; storage partitioning proof for runtime state and artifact/memory/search/export/index partitioning proof with schema/bucket/keyspace boundary and migration safety; per-tenant encryption/key ownership proof with key owner, rotation, revocation, escrow, break-glass, access audit, and key custody decision; backup/restore isolation proof with tenant-scoped backup selection, restore authorization, integrity result, other-tenant non-interference, post-restore denial, backup owner, and restore rollback route; tenant administration proof with create, suspend, restore, delete, role delegation, customer approval, audit history, rollback route, tenant admin owner, and approval expiry; cross-tenant denial proof across API, storage, memory, search, export, delete, backup, support, and observability; observability/support isolation proof with tenant-scoped logs, traces, alerts, support ticket visibility, incident review, customer status routing, evidence export, support owner, and retention class; lifecycle isolation proof with retention, export, delete, provider transcript, legal hold, backup expiry, post-delete absence, lifecycle owner, and exception policy; tenant data containment; release artifact hygiene result; and regenerated execution snapshot evidence',
      completionRule: 'must prove tenant data isolation and key ownership without exposing tenant payloads',
      primaryDocs: ['docs/hosted-tenant-isolation-architecture-v1.md', 'docs/target-tenant-isolation-operations-v1.md'],
    },
    {
      field: 'providerSecretEvidence',
      requiredValue: 'provider evidence intake proof with provider id, inclusion decision, account owner, customer/workspace approval, approved target boundary, target environment name, release label, source commit, stop-condition id, evidence owner, reviewer, and decision owner; completed provider evidence intake reference proof; provider account or architecture approval proof with account/architecture record, approval state, renewal owner, and residual blocker; approved secret manager platform proof with provider, region, tenancy boundary, owner, and fallback decision; secret class inventory proof with provider, environment, owner, rotation cadence, and allowed consumers; runtime injection proof for CLI, UI, worker, live validation, clean deployment, rollback, and support paths; least-privilege access policy proof with reader, writer, admin, reviewer, service binding, and deny-by-default evidence; rotation and revocation event proof with previous secret invalidation and downstream redeploy or reload result; secret access audit log proof for read, write, rotate, revoke, break-glass, and failed access attempts; break-glass governance proof with approval, expiry, monitoring, customer notification, revocation, and post-use review; leakage review proof across production logs, traces, support packets, browser artifacts, screenshots, release exports, and provider errors; disaster recovery proof for secret backup, restore, key recovery, region outage, rollback, and compromised-secret containment; target-boundary live validation proof with command, provider, model, endpoint alias, timeout, result, archived evidence commit, mission id, execution session id, artifact provenance, and operator owner; provider fallback runtime audit proof with mission run --fallback-provider --fallback-policy, mission timeline, workspace timeline, operator timeline, provider events --family fallback, action remediate-provider-attention --fallback-policy, selected fallback provider, fallback policy id, fallback stop reason, and recoverable-provider-failure-only stop condition proof; provider blocker closure verification proof with blocker state, next verification command, required closing evidence, stop-condition id, release artifact hygiene result, regenerated execution snapshot evidence, and refreshed release artifact references; telemetry proof; incident triage proof; data and transcript handling proof; remediation and renewal review proof; migration plan; rollback; lockout recovery; credential containment proof; release artifact hygiene result; and regenerated execution snapshot evidence',
      completionRule: 'must prove provider credentials and provider live validation are target-approved without exposing secret values',
      primaryDocs: ['docs/target-provider-evidence-intake-v1.md', 'docs/target-provider-operations-v1.md', 'docs/target-secret-manager-v1.md'],
    },
    {
      field: 'observabilitySloEvidence',
      requiredValue: 'target observability architecture approval proof with approved architecture record, telemetry owner, reviewer, customer/workspace scope, and review date; approved telemetry backend proof with backend alias, region, tenancy boundary, owner, fallback route, and data residency decision; signal inventory proof for release, provider, mission, approval, runtime, security, support, and incident domains with severity owner and retention class; telemetry ingestion proof for metrics, logs, traces, audit events, provider events, release events, and support events with sample references, ingestion timestamp, pipeline owner, and dropped-event review; alert routing proof with severity mapping, primary route, secondary route, retry policy, acknowledgement SLA, escalation timeout, delivery receipt, and retry outcome; alert acknowledgement proof with responder, acknowledgement timestamp, escalation chain, fallback route, missed-ack handling, and audit record; staffed on-call coverage proof with rota, primary owner, backup owner, handoff rule, timezone coverage, absence handling, and escalation chain; log and trace retention proof with period, storage class, redaction policy, query role, customer export boundary, deletion path, and query access audit; customer status communication proof with route, owner, approval, timestamp, message, cadence, and closure evidence; incident response proof with timeline, mitigation owner, customer impact, review decision, corrective actions, due dates, residual risk, and closure evidence; incident review proof with review cadence, decision owner, corrective action owner, due date, closure evidence, and evidence retention; audit export proof for alert delivery, acknowledgement, customer update, query access, review decision, and corrective action closure; disaster recovery proof for telemetry backend outage, alert route outage, incident bridge fallback, log export fallback, evidence recovery, and recovery owner; target SLO architecture approval proof; customer-approved SLO/SLA terms proof; error budget policy proof; telemetry measurement proof; staffed on-call response proof; customer communication proof; provider outage handling proof; maintenance and degradation proof; service credit proof; evidence retention proof; missed-SLO containment proof; release artifact hygiene result; and regenerated execution snapshot evidence',
      completionRule: 'must prove staffed monitoring and customer-facing SLO handling from target telemetry',
      primaryDocs: ['docs/target-observability-operations-v1.md', 'docs/target-slo-operations-v1.md', 'docs/production-slo-operating-v1.md'],
    },
    {
      field: 'retentionBackupEvidence',
      requiredValue: 'target retention operations evidence for customer-approved data class proof with class owner, legal basis, retention window, exportability, delete eligibility, and exception policy, target retention configuration proof with storage boundary, enforcement timestamp, policy owner, reviewer, and audit record, export approval proof with requester, approver, package scope, delivery boundary, encryption mode, package hash, and customer receipt, delete workflow proof with authorization, confirmation control, execution owner, storage scope, timestamp, result, and audit record, provider transcript handling proof with provider-side retention, deletion or non-retention evidence, exception review, and customer disclosure, post-delete absence proof across runtime, tenant storage, backup, provider, export package, support packet, and release artifact boundaries, audit history proof, target backup operations evidence for backup schedule execution proof with backup policy id, schedule, execution timestamps, missed-run handling, and owner acknowledgement, encrypted backup storage proof with storage class, encryption mode, retention class, location alias, and access audit, backup key ownership proof with key owner, rotation cadence, revocation path, break-glass route, expiry/delete evidence, and access audit, restore validation proof with objective, duration, restored data class inventory, checksum or integrity proof, tenant isolation, cross-tenant denial, and validation owner, backup expiry/deletion proof with expiry schedule, delete proof, post-delete absence check, and audit record, disaster recovery proof with DR owner, runbook execution, outage scenario, restore priority, customer communication, rollback path, residual risk decision, and audit trail, release artifact hygiene result, and regenerated execution snapshot evidence',
      completionRule: 'must prove lifecycle controls and DR evidence for the target customer boundary',
      primaryDocs: ['docs/target-retention-operations-v1.md', 'docs/target-backup-operations-v1.md', 'docs/production-retention-operating-v1.md'],
    },
    {
      field: 'supportOperationsEvidence',
      requiredValue: 'target support architecture approval proof with approved support architecture record, support owner, reviewer, customer/workspace scope, and review date; staffed support coverage proof with support owner, coverage window, primary rota, secondary rota, backup policy, timezone coverage, absence handling, and acknowledgement evidence; support queue routing proof with ticketing system, queue identifier, severity mapping, routing rule, retry path, queue owner, access policy, assignment audit, and escalation evidence; customer communication proof with approved channel, update cadence, message owner, approval path, status route, customer-visible timestamp, message reference, and closure message; ticket audit history proof with lifecycle history, assignment history, customer-visible update history, redaction result, retention period, evidence owner, and closure audit; escalation ownership proof with incident commander, engineering escalation, provider escalation, executive/customer escalation, backup owner, retry history, failure fallback, and audit record; incident review cadence proof with review cadence, timeline, mitigation owner, customer impact summary, corrective action owner, due date, review decision, closure evidence, and evidence retention; on-call handoff proof with primary owner, secondary owner, acknowledgement timestamp, missed-ack rule, paging fallback, handoff log, and escalation chain; support data handling proof with secret redaction, customer data redaction, provider transcript handling, ticket attachment rule, access audit, and hygiene result; closure evidence; release artifact hygiene result; and regenerated execution snapshot evidence',
      completionRule: 'must prove support ownership and escalation routing are staffed for the target release',
      primaryDocs: ['docs/target-support-architecture-v1.md', 'docs/target-support-operations-v1.md'],
    },
    {
      field: 'cleanReleaseEvidence',
      requiredValue: 'target clean deployment operations evidence, clean checkout proof, command replay proof, artifact synchronization proof, production-like environment proof, dependency installation proof, runtime bootstrap proof, secret injection proof, rollback and recovery proof, release approval proof, pilot export package proof, release artifact hygiene result, artifact-sync-current proof, failed-deployment containment proof, and misleading production-ready claim containment proof',
      completionRule: 'must reference passed clean deployment, release drill, export package, and hygiene evidence for the same target review',
      primaryDocs: ['docs/target-clean-deployment-operations-v1.md', 'docs/production-like-release-drill-v1.md', 'docs/pilot-export-package-v1.md'],
    },
    {
      field: 'acceptedRiskDecision',
      requiredValue: 'accepted risk decision proof with reviewer, decision owner, review date, decision state, accepted risk ids, rejected claims, allowed claim text, residual blockers reviewed, command rerun log review, release refresh evidence review, productionReadyClaim decision, and next review date',
      completionRule: 'must keep productionReadyClaim false unless every mandatory target deployment control is satisfied by target evidence',
      primaryDocs: ['docs/release-readiness-v1.md', 'docs/target-environment-evidence-intake-v1.md'],
    },
  ];
  const captureRows = captureFields.flatMap((item, index) => [
    `${index + 1}. ${item.field}`,
    `   - requiredValue: ${item.requiredValue}`,
    `   - completionRule: ${item.completionRule}`,
    `   - primaryEvidenceDocs: ${item.primaryDocs.map(docLink).join(' | ')}`,
    '   - evidenceReference: <required repository-relative path or sanitized external alias>',
    '   - evidenceOwner: <required accountable owner>',
    '   - capturedAt: <required ISO timestamp or YYYY-MM-DD>',
    '   - reviewerNote: <required note or none>',
  ]);
  const requiredDocs = Array.from(new Set(captureFields.flatMap((item) => item.primaryDocs))).sort();
  const requiredCommands = [
    'npm run smoke:target-environment-evidence-intake',
    'npm run smoke:target-deployment-contract',
    'npm run smoke:target-provider-evidence-intake',
    'npm run smoke:target-provider-operations',
    'npm run smoke:target-identity-session-operations',
    'npm run smoke:target-tenant-isolation-operations',
    'npm run smoke:target-observability-operations',
    'npm run smoke:target-slo-operations',
    'npm run smoke:target-retention-operations',
    'npm run smoke:target-backup-operations',
    'npm run smoke:target-support-operations',
    'npm run smoke:target-clean-deployment-operations',
    'npm run refresh:execution-v1-artifacts',
    'npm run smoke:production-readiness-gate',
    'npm run smoke:release-artifact-hygiene',
  ];
  const visibleBlockerRows = visibleActions.length
    ? visibleActions.flatMap((item, index) => [
        `${index + 1}. ${String(item.blocker || item.stopReason || 'current open blocker').trim()}`,
        `   - blockerId: ${String(item.id || '').trim() || 'unknown'}`,
        `   - provider: ${String(item.provider || '').trim() || 'none'}`,
        `   - category: ${String(item.category || 'stop-condition').trim()}`,
        `   - owner: ${String(item.owner || 'release-owner').trim()}`,
        `   - stopReason: ${String(item.stopReason || item.blocker || '').trim() || 'not recorded'}`,
        `   - requiredClosingEvidence: ${String(item.nextEvidence || '').trim() || 'not recorded'}`,
        '   - captureTemplateImpact: keep as stop-condition until matching target-boundary field evidence is attached',
      ])
    : ['- none'];
  const residualBlockerLines = productionBlockers.length
    ? productionBlockers.map((item, index) => `${index + 1}. ${String(item || '').trim()}`)
    : ['- none'];
  const lines = [
    'Target evidence capture template',
    `- category: ${normalizedCategory || 'all'}`,
    `- owner: ${normalizedOwner || 'all'}`,
    `- provider: ${normalizedProvider || 'all'}`,
    `- includeSharedProviderOperations: ${String(includeShared !== false)}`,
    `- sharedProviderOperationsScope: ${getReleaseSharedProviderOperationsScopeReason({ includeShared, provider: normalizedProvider })}`,
    ...buildReleaseSharedProviderOperationsScopeAuditLines({
      totalActions: allActions,
      category: normalizedCategory,
      includeShared,
      owner: normalizedOwner,
      provider: normalizedProvider,
    }),
    `- releaseBlockerApiLink: ${releaseBlockerApiLink}`,
    `- sourceCommit: ${sourceCommit}`,
    `- visibleCurrentBlockers: ${visibleActions.length}/${allActions.length}`,
    `- productionReadyStatus: ${summary.productionReadyStatus || releaseReadiness.productionReadyStatus || 'not tracked'}`,
    `- productionReadyBlocked: ${String(Boolean(summary.productionReadyBlocked ?? releaseReadiness.productionReadyBlocked ?? true))}`,
    `- productionBlockerCount: ${summary.productionBlockerCount ?? releaseReadiness.productionBlockerCount ?? productionBlockers.length}`,
    `- productionReadyStopReason: ${summary.productionReadyStopReason || releaseReadiness.productionReadyStopReason || 'not recorded'}`,
    `- releaseLink: ${releaseLink}`,
    '',
    'Capture template rows:',
    ...captureRows,
    '',
    'Required reference docs:',
    ...requiredDocs.map((docPath) => `- ${docLink(docPath)}`),
    '',
    'Required verification commands:',
    ...requiredCommands.map((command) => `- ${command}`),
    '',
    'Visible blocker scope:',
    ...visibleBlockerRows,
    '',
    'Residual production blockers:',
    ...residualBlockerLines,
    '',
    'Capture template rules:',
    '- This capture template is target-boundary evidence intake, not production-ready approval.',
    '- Every field must identify the same approved target environment, company/workspace scope, deployment boundary, source commit, evidence owner, capture date, and sanitized evidence reference unless a reviewer-approved exception is recorded.',
    '- The completed template must still be paired with target deployment contract, provider evidence intake, provider operations, identity/session operations, tenant isolation operations, SLO operations, clean deployment operations, release artifact hygiene, regenerated execution-v1 artifacts, and production readiness gate evidence.',
    '- Do not include raw API keys, tokens, private endpoint credentials, customer secrets, tenant payloads, customer personal data, billing identifiers, private tenant identifiers, raw provider account ids, or machine-local absolute paths.',
    '- Keep productionReadyClaim=false until every mandatory target control has target-boundary evidence and every related stop-condition is closed.',
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseTargetEvidenceRequiredCommandsText({
  blockerActions = getFilteredReleaseCurrentOpenBlockerActions(),
  totalActions = getReleaseCurrentOpenBlockerActions(),
  category = state.releaseBlockerCategoryFilter,
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
  releaseStatus = state.releaseStatus,
} = {}) {
  const visibleActions = Array.isArray(blockerActions) ? blockerActions : [];
  const allActions = Array.isArray(totalActions) ? totalActions : [];
  if (!releaseStatus || !allActions.length) {
    return '';
  }

  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const summary = releaseStatus.summary || {};
  const releaseReadiness = releaseStatus.releaseReadiness || {};
  const snapshot = releaseStatus.snapshot || {};
  const productionBlockers = getReleaseProductionBlockers(releaseStatus);
  const releaseLink = buildReleaseBlockerSliceUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const releaseBlockerApiLink = buildReleaseBlockerApiUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const sourceCommit = String(summary.sourceCommit || releaseStatus.commit || snapshot.verifiedCommit || '<required source commit>').trim()
    || '<required source commit>';
  const commandDefinitions = [
    {
      command: 'npm run smoke:target-environment-evidence-intake',
      domain: 'target evidence intake',
      proofIntent: 'target evidence approval packet proof with completed target evidence capture template, sanitized submission packet and evidence register proof with redaction note, retention class, and sha256 or signed export reference, boundary consistency map proof, command rerun log proof, reviewer decision proof with reviewer, decision owner, review date, decision state, accepted risk ids, rejected claims, allowed claim text, and productionReadyClaim decision, blocker disposition register proof with owner, current state, required closing evidence, allowed claim impact, and next verification command, release refresh evidence proof with verified source commit, generated time, result, repository-relative artifact path, release artifact hygiene result, regenerated execution-v1 artifacts, artifact-sync-current proof, and production readiness gate result is present',
      stopCondition: 'target-environment-evidence-missing',
    },
    {
      command: 'npm run smoke:target-identity-session-operations',
      domain: 'identity/session operations',
      proofIntent: 'target identity session operations evidence with customer IdP onboarding proof with metadata alias, issuer, audience, JWKS rotation owner, fallback owner, and customer approval, user lifecycle proof with provision, invitation, suspension, recovery, deprovision, tenant mapping, and orphan account review, session lifecycle proof with login, refresh, expiry, logout, revocation, idle timeout, device inventory, and re-auth, role administration proof with persistent assignment, revocation, delegated admin approval, separation-of-duties, and rollback, permission propagation proof across API, worker, agent, support, observability, cache invalidation, and stale permission denial, immutable audit export proof with actor, subject, tenant, role, session, reason, before/after state, timestamp, and checksum, break-glass governance proof with owner, approver, scope, expiry, monitoring, customer notification, revocation, and post-use review, support impersonation proof with approval, scoped session, action log, customer-safe update, denial tests, expiry, and closure, compliance and retention proof with identity log retention, legal hold, audit export, privacy deletion, post-delete absence, and customer handoff, customer access containment proof, release artifact hygiene result, and regenerated execution snapshot evidence is captured',
      stopCondition: 'hosted-identity-session-approval-missing',
    },
    {
      command: 'npm run smoke:target-provider-evidence-intake',
      domain: 'provider evidence intake',
      proofIntent: 'provider evidence intake proof with provider id, inclusion decision, account owner, customer/workspace approval, approved target boundary, target environment name, release label, source commit, stop-condition id, evidence owner, reviewer, and decision owner; provider owner proof with accountable provider owner, backup owner, account or architecture owner, and customer approval reference; account or architecture approval proof with approval state, provider-specific evidence doc, renewal owner, and residual blocker; target secret injection proof with approved secret manager platform, runtime injection path, least-privilege policy, rotation/revocation proof, secret access audit proof, and leakage review; quota and cost guard proof with usage envelope, spend owner, timeout, retry cap, concurrency cap, alert threshold, and escalation route; model and endpoint pinning proof with model id, endpoint or base URL alias, timeout policy, retry policy, fallback route, and approval owner; target-boundary live validation proof with command, provider, model, endpoint alias, result, archived evidence commit, mission id, execution session id, artifact provenance, and operator owner; fallback route proof with selected fallback provider, degraded mode, stop-condition id, customer impact rule, rollback owner, and accepted-risk decision; failure triage route proof with account failure owner, missing environment owner, live runtime failure owner, provider outage owner, quota exhaustion owner, and fallback decision owner; provider blocker closure verification proof with blocker state, next verification command, required closing evidence, release artifact hygiene result, regenerated execution snapshot evidence, refreshed release artifact references, and decision owner; and productionReadyClaim guard evidence are present for the target boundary',
      stopCondition: 'target-provider-evidence-intake-missing',
    },
    {
      command: 'npm run smoke:target-provider-operations',
      domain: 'provider operations',
      proofIntent: 'provider operations proof with provider inventory, included provider list, provider owner, account or architecture record, customer/workspace approval, operating decision, and residual risk owner; provider account or architecture approval proof with account owner, billing or endpoint owner, provider terms owner, renewal owner, and target evidence doc; target secret injection proof with approved secret manager platform, secret owner, runtime injection, least-privilege policy, rotation/revocation event, secret access audit, break-glass governance, leakage review, and credential containment; target-boundary live validation proof with command, provider, model, endpoint alias, timeout, result, archived evidence commit, mission id, execution session id, retry lineage, artifact provenance, and operator owner; model and endpoint pinning proof with model id, endpoint/base URL alias, retry policy, concurrency limit, fallback route, and approval owner; quota, cost, and resource guard proof with spend owner, usage envelope, timeout, retry cap, concurrency cap, local resource envelope, alert threshold, and escalation route; fallback and disable path proof with fallback provider or stop condition, disable switch, degradation mode, customer impact rule, rollback owner, and accepted-risk decision; provider fallback runtime audit proof with mission run --fallback-provider --fallback-policy, mission timeline, workspace timeline, overview operator-timeline, provider events --family fallback, action remediate-provider-attention --fallback-provider --fallback-policy, selected fallback provider, fallback policy id, fallback stop reason, provider-failure-only failover, recoverable-provider-failure-only stop conditions, event family, and operator chronology evidence; target blocker closure verification proof with provider blocker state, next verification command, required closing evidence, stop-condition id, release artifact hygiene result, regenerated execution snapshot evidence, and refreshed release artifact references; telemetry proof with health signal, latency/error metrics, token or resource usage, quota alert, fallback event, retention period, and telemetry owner; incident triage proof with account failure, missing env, live runtime failure, provider outage, quota exhaustion, customer communication, incident review, and remediation owner routes; data and transcript handling proof with data classification, provider transcript policy, retention class, export/delete handling, redaction rule, and post-delete absence requirement; remediation and renewal review proof with billing/credit remediation, endpoint renewal, model access renewal, key rotation, provider terms review, accepted-risk owner, and next review date; evidence retention proof; and provider failure containment evidence are captured',
      stopCondition: 'target-provider-operations-missing',
    },
    {
      command: 'npm run smoke:target-openai-provider-account',
      domain: 'OpenAI provider account',
      proofIntent: 'target OpenAI provider account evidence with OpenAI account ownership proof with organization/project owner, project/workspace alias, customer scope, evidence owner, reviewer, and review date; billing and quota proof with active billing plan, quota tier, payment owner, spend cap, low-balance or quota alert route, and redacted evidence summary; API key and secret injection proof with approved secret manager platform, OPENAI_API_KEY owner, runtime injection, least-privilege policy, rotation/revocation event, secret access audit, break-glass governance, leakage review, and credential containment; OPENAI_MODEL model access proof with model availability, region/project access, max token policy, fallback model, and owner approval; provider terms and customer approval proof with provider terms, data processing approval, allowed customer/workspace, transcript retention policy, support owner, and evidence owner; usage and cost guard proof with usage envelope, concurrency limit, timeout, retry policy, spend owner, saturation fallback, and budget review cadence; target-boundary live validation proof with npm run live:execution-v1:openai, mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference; telemetry proof with probe result, provider response status, model availability, run duration, retry count, failureKind taxonomy, alert route, and incident owner; fallback and stop-condition proof with fallback provider, fallback policy id, stop reason, degraded mode, customer impact rule, manual approval path, rollback owner, residual risk decision, and recoverable-provider-failure-only stop evidence; renewal and review audit proof with account owner recertification, quota review, model access review, artifact hygiene result, accepted risk, and next review date are captured',
      stopCondition: 'target-openai-provider-account-approval-missing',
    },
    {
      command: 'npm run smoke:target-anthropic-provider-account',
      domain: 'Anthropic provider account',
      proofIntent: 'target Anthropic provider account evidence with Anthropic account ownership proof with account owner, organization/workspace alias, customer scope, evidence owner, reviewer, and review date; billing and credit remediation proof with active billing plan, available credit balance status, payment owner, renewal path, low-balance alert route, remediation ticket, and post-remediation live run reference; API key and secret injection proof with approved secret manager platform, ANTHROPIC_API_KEY owner, runtime injection, least-privilege policy, rotation/revocation event, secret access audit, break-glass governance, leakage review, and credential containment; ANTHROPIC_MODEL model access proof with model availability, region/workspace access, max token policy, fallback model, and owner approval; provider terms and customer approval proof with provider terms, data processing approval, allowed customer/workspace, transcript retention policy, support owner, and evidence owner; quota and spend guard proof with usage envelope, concurrency limit, timeout, retry policy, spend owner, saturation fallback, and budget review cadence; target-boundary live validation proof with npm run live:execution-v1:anthropic, mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference; telemetry proof with probe result, provider response status, model availability, run duration, retry count, failureKind taxonomy, alert route, and incident owner; fallback and stop-condition proof with fallback provider, fallback policy id, stop reason, degraded mode, customer impact rule, manual approval path, rollback owner, residual risk decision, and recoverable-provider-failure-only stop evidence; remediation audit proof with account remediation ticket, billing owner approval, post-remediation live run, artifact hygiene result, accepted risk, and next review date are captured',
      stopCondition: 'anthropic-live-validation-missing-or-failed',
    },
    {
      command: 'npm run smoke:target-local-provider-architecture',
      domain: 'local provider architecture',
      proofIntent: 'target local provider architecture evidence with local provider endpoint ownership proof with approved base URL alias, runtime owner, network boundary, transport, availability owner, health check result, and customer approval; LOCAL_PROVIDER_MODEL model pinning proof with model source/version, compatibility profile, max token policy, fallback model, and owner approval; network isolation proof with host boundary, ingress policy, egress policy, tenant/customer boundary, operator access policy, and firewall decision; secret and credential policy proof with auth mode, API key requirement decision, approved secret manager platform when credentials are used, runtime injection, rotation/revocation event, leakage review, and secret access audit; runtime lifecycle proof with process manager, startup command, health endpoint, restart policy, resource limits, and log retention; session and artifact provenance proof with mission id, execution session id, provider response id or equivalent, retry lineage, artifact provenance, and handoff reference; data residency and transcript policy proof with prompt data class, local storage path alias, transcript retention, customer data approval, delete request route, and post-delete absence evidence; quota and resource guard proof with CPU/GPU/memory envelope, concurrency limit, timeout, retry policy, saturation fallback, and resource owner approval; telemetry proof with probe result, model availability, run duration, retry count, failureKind taxonomy, usage/resource metrics, alert route, and incident owner; fallback and customer approval proof with fallback provider, fallback policy id, stop reason, degraded mode, customer impact rule, manual approval path, provider terms/local model license decision, and residual risk owner; target-boundary local live validation proof; release artifact hygiene; and regenerated execution snapshot evidence are captured',
      stopCondition: 'target-local-provider-approval-missing',
    },
    {
      command: 'npm run smoke:target-hermes-provider-architecture',
      domain: 'Hermes provider architecture',
      proofIntent: 'target Hermes provider architecture evidence with Hermes endpoint ownership proof with approved base URL alias, endpoint owner, network boundary, transport, availability owner, and health check result; HERMES_PROVIDER_MODEL model pinning proof with model version/source, compatibility profile, max token policy, fallback model, and owner approval; target secret injection proof with approved secret manager platform, API key requirement decision, runtime injection, rotation/revocation event, break-glass governance, secret access audit, and leakage review; Hermes tool-call parsing proof with <tool_call> sample, malformed-call behavior, execution boundary decision, audit record, and no-unapproved-tool-execution evidence; session lifecycle proof with mission id, execution session id, provider response id, retry lineage, artifact provenance, and handoff reference; data and transcript policy proof with prompt data class, provider transcript retention, customer data approval, delete request route, and post-delete absence evidence; quota and rate guard proof with concurrency limit, timeout, retry policy, cost owner, usage envelope, saturation fallback, and spend review; telemetry proof with probe result, model availability, run duration, retry count, failureKind taxonomy, usage metrics, alert route, and incident owner; fallback and stop-condition proof with fallback provider, fallback policy id, stop reason, degraded mode, customer impact rule, manual approval path, rollback owner, residual risk decision, and recoverable-provider-failure-only stop evidence; customer approval proof with provider terms, allowed workspace/customer, data-processing approval, support owner, evidence owner, and next review date; live validation; and support ownership are captured',
      stopCondition: 'target-hermes-provider-approval-missing',
    },
    {
      command: 'npm run smoke:hosted-identity-session-architecture',
      domain: 'hosted identity/session architecture',
      proofIntent: 'hosted identity session architecture approval proof, customer IdP onboarding proof with metadata alias, issuer, audience, JWKS rotation owner, fallback owner, and customer approval, user lifecycle proof with provision, invitation, suspension, recovery, deprovision, tenant mapping, and orphan account review, session lifecycle proof with login, refresh, expiry, logout, revocation, idle timeout, device inventory, and re-auth, role administration proof with persistent assignment, revocation, delegated admin approval, separation-of-duties, and rollback, permission propagation proof across API, worker, agent, support, observability, cache invalidation, and stale permission denial, immutable audit export proof with actor, subject, tenant, role, session, reason, before/after state, timestamp, and checksum, break-glass governance proof with owner, approver, scope, expiry, monitoring, customer notification, revocation, and post-use review, support impersonation proof with approval, scoped session, action log, customer-safe update, denial tests, expiry, and closure, compliance and retention proof with identity log retention, legal hold, audit export, privacy deletion, post-delete absence, and customer handoff, migration plan proof, rollback proof, lockout recovery proof, customer access containment proof, release artifact hygiene result, and regenerated execution snapshot evidence are defined',
      stopCondition: 'hosted-identity-session-approval-missing',
    },
    {
      command: 'npm run smoke:hosted-tenant-isolation-architecture',
      domain: 'hosted tenant isolation architecture',
      proofIntent: 'hosted tenant isolation architecture approval proof, tenant identity source proof with tenant source owner, customer organization mapping proof, lifecycle owner, trust policy, and source approval, tenant lifecycle proof with create/suspend/restore/delete/owner-transfer/exception-review/orphan-tenant-review, tenant-aware authorization proof with policy, service-to-service tenant propagation proof, stale permission denial, delegated admin boundary, and denial owner, storage partitioning proof for runtime state and artifact/memory/search/export/index partitioning proof with schema/bucket/keyspace boundary and migration safety, per-tenant encryption and key ownership proof with key owner, rotation, revocation, escrow, break-glass, access audit, and key custody decision, backup/restore isolation proof with tenant-scoped backup creation, restore authorization, integrity result, other-tenant non-interference, and post-restore denial, tenant administration approval and audit proof with create/suspend/restore/delete/role-delegation/customer-approval/audit-history/rollback-route/tenant-admin-owner, cross-tenant denial proof across API, storage, memory, search, export, delete, backup, support, and observability, observability/support isolation proof with tenant-scoped logs, traces, alerts, support ticket visibility, incident review, customer status routing, evidence export, and support owner, lifecycle isolation proof with retention, export, delete, provider transcript, legal hold, backup expiry, post-delete absence, and lifecycle owner, migration plan, rollback, tenant data containment, release artifact hygiene result, and regenerated execution snapshot evidence are defined',
      stopCondition: 'hosted-tenant-isolation-approval-missing',
    },
    {
      command: 'npm run smoke:target-tenant-isolation-operations',
      domain: 'tenant isolation operations',
      proofIntent: 'target tenant isolation operations evidence with tenant identity source proof with source owner, customer organization mapping proof, tenant lifecycle owner, trust policy, source approval, and orphan tenant review, tenant-scoped authorization proof with permission policy, service-to-service tenant propagation proof, stale permission denial, delegated admin boundary, and denial owner, storage partitioning proof for runtime state and artifact/memory/search/export/index partitioning proof with schema/bucket/keyspace boundary and migration safety, per-tenant encryption/key ownership proof with key owner, rotation, revocation, escrow, break-glass, access audit, and key custody decision, backup/restore isolation proof with tenant-scoped backup selection, restore authorization, integrity result, other-tenant non-interference, post-restore denial, backup owner, and restore rollback route, tenant administration proof with create, suspend, restore, delete, role delegation, customer approval, audit history, rollback route, tenant admin owner, and approval expiry, cross-tenant denial proof across API, storage, memory, search, export, delete, backup, support, and observability, observability/support isolation proof with tenant-scoped logs, traces, alerts, support ticket visibility, incident review, customer status routing, evidence export, support owner, and retention class, lifecycle isolation proof with retention, export, delete, provider transcript, legal hold, backup expiry, post-delete absence, lifecycle owner, and exception policy, tenant data containment, release artifact hygiene result, and regenerated execution snapshot evidence is captured',
      stopCondition: 'target-tenant-isolation-evidence-missing',
    },
    {
      command: 'npm run smoke:target-secret-manager-architecture',
      domain: 'secret manager architecture',
      proofIntent: 'target secret manager architecture approval proof, approved platform proof with provider, region, tenancy boundary, owner, and fallback decision, secret class inventory proof with provider, environment, owner, rotation cadence, and allowed consumers, runtime injection proof for CLI, UI, worker, live validation, clean deployment, rollback, and support paths, least-privilege access policy proof with reader, writer, admin, reviewer, service binding, and deny-by-default evidence, rotation and revocation event proof with previous secret invalidation and downstream redeploy or reload result, secret access audit log proof for read, write, rotate, revoke, break-glass, and failed access attempts, break-glass governance proof with approval, expiry, monitoring, customer notification, revocation, and post-use review, leakage review proof across production logs, traces, support packets, browser artifacts, screenshots, release exports, and provider errors, disaster recovery proof for secret backup, restore, key recovery, region outage, rollback, and compromised-secret containment, migration plan, rollback, lockout recovery, credential containment proof, release artifact hygiene result, and regenerated execution snapshot evidence are defined',
      stopCondition: 'target-secret-manager-architecture-missing',
    },
    {
      command: 'npm run smoke:target-secret-manager',
      domain: 'secret manager operations',
      proofIntent: 'target secret manager operations evidence with secret injection proof for secret manager path or logical secret identifier without the value, branch and commit, release label and deployment boundary, secret class and provider, owner, approver, reason, rotation or revocation timestamp, affected service/workspace/provider/runtime class, redeploy or reload command result, scoped access policy proof with reviewer and service binding, rotation and revocation evidence packet with previous secret invalidation, audit trail proof for secret read/write/rotate/revoke/break-glass/failed access attempts, break-glass governance proof with approval, expiry, revocation deadline, post-use review, and residual risk, leakage review proof across logs, artifacts, screenshots, support packets, release exports, and provider errors, sanitized secret evidence references, release artifact hygiene result, production readiness gate result, and regenerated execution snapshot evidence is captured',
      stopCondition: 'target-secret-injection-missing',
    },
    {
      command: 'npm run smoke:target-observability-architecture',
      domain: 'observability architecture',
      proofIntent: 'target observability architecture approval proof with approved architecture record, telemetry owner, reviewer, customer/workspace scope, and review date; telemetry backend ownership proof with backend alias, region, tenancy boundary, owner, fallback route, and data residency decision; signal inventory proof for release, provider, mission, approval, runtime, security, support, and incident domains with severity owner and retention class; metric log trace and audit event boundary proof with sample references, ingestion timestamp, pipeline owner, and dropped-event review; alert routing proof with severity mapping, primary route, secondary route, retry policy, acknowledgement SLA, escalation timeout, delivery receipt, and retry outcome; staffed on-call coverage proof with rota, primary owner, backup owner, handoff rule, timezone coverage, absence handling, and escalation chain; log and trace retention proof with period, storage class, redaction policy, query role, customer export boundary, deletion path, and query access audit; customer status communication proof with route, owner, approval, timestamp, message, cadence, and closure evidence; incident response proof with timeline, mitigation owner, customer impact, review decision, corrective actions, due dates, residual risk, and closure evidence; audit export proof for alert delivery, acknowledgement, customer update, query access, review decision, and corrective action closure; disaster recovery proof for telemetry backend outage, alert route outage, incident bridge fallback, log export fallback, evidence recovery, and recovery owner; release artifact hygiene result; and regenerated execution snapshot evidence are defined',
      stopCondition: 'target-observability-architecture-missing',
    },
    {
      command: 'npm run smoke:target-observability-operations',
      domain: 'observability operations',
      proofIntent: 'target observability operations evidence with telemetry ingestion proof for metrics, logs, traces, audit events, provider events, release events, and support events with sample references, ingestion timestamp, pipeline owner, and dropped-event review; alert delivery receipt proof with route, severity, delivery receipt, retry policy, acknowledgement SLA, escalation evidence, and retry outcome; trace and log retention proof with period, storage class, redaction policy, query role, customer export boundary, deletion path, and query access audit; staffed on-call routing and acknowledgement proof with rota, primary and backup owner, handoff rule, timezone coverage, acknowledgement timestamp, missed-ack handling, and escalation chain; customer status communication proof with route, owner, approval, timestamp, message, cadence, and closure evidence; incident response proof with timeline, mitigation owner, customer impact, response evidence, review decision, corrective actions, due dates, residual risk, and closure evidence; incident review proof with review cadence, decision owner, corrective action owner, due date, closure evidence, and evidence retention; audit export proof for alert delivery, acknowledgement, customer update, query access, review decision, and corrective action closure; release artifact hygiene result; and regenerated execution snapshot evidence are captured',
      stopCondition: 'target-observability-operations-missing',
    },
    {
      command: 'npm run smoke:target-slo-architecture',
      domain: 'SLO architecture',
      proofIntent: 'target SLO/SLA architecture approval proof with approved architecture record, customer/workspace scope, decision owner, reviewer, review date, and allowed claim text; customer-approved SLO/SLA terms proof with availability target, latency target, error rate target, support response target, maintenance window, exclusions, legal/commercial owner, and customer approval; error budget policy proof with measurement window, budget owner, burn-rate threshold, freeze rule, exception workflow, review cadence, and override owner; telemetry measurement proof with metrics backend, uptime check, synthetic probe, latency histogram, provider failure signal, data source owner, and retention period; alert acknowledgement proof with severity mapping, alert route, acknowledgement SLA, escalation timeout, delivery receipt, fallback route, missed-ack rule, and audit record; staffed on-call proof with rota, primary owner, secondary owner, handoff rule, timezone coverage, absence handling, escalation chain, and acknowledgement timestamp; customer communication proof with status route, update owner, approval path, message template, cadence, impact summary, customer-visible timestamp, and closure evidence; incident review proof with timeline, customer impact, corrective action owner, due date, evidence packet, review decision, residual risk, and closure rule; provider outage playbook proof with provider health signal, fallback decision, retry/disable policy, customer impact rule, accepted-risk owner, and post-incident review; maintenance and degradation proof with maintenance approval, customer notice, degradation mode, rollback owner, recovery target, and post-maintenance review; service credit proof with legal/commercial owner, contractual escalation path, customer approval, credit trigger, calculation owner, and evidence retention rule; release artifact hygiene result; and regenerated execution snapshot evidence are defined',
      stopCondition: 'target-slo-architecture-missing',
    },
    {
      command: 'npm run smoke:target-slo-operations',
      domain: 'SLO operations',
      proofIntent: 'target SLO operations evidence with target SLO measurements proof for branch, commit, release label, approved target boundary, metrics backend, uptime check, synthetic probe, latency histogram, provider failure signal, data source owner, and retention period; customer-approved SLO/SLA terms proof with availability target, latency target, error rate target, support response target, maintenance window, exclusions, legal/commercial owner, and customer approval; error budget review proof with measurement window, budget owner, burn-rate threshold, freeze rule, exception workflow, review cadence, burn event, and override owner; telemetry measurement proof with sample metric references, ingestion timestamp, query result, alert correlation, and data source owner; alert acknowledgement proof with severity mapping, alert route, acknowledgement SLA, escalation timeout, delivery receipt, fallback route, missed-ack rule, responder, acknowledgement timestamp, and audit record; staffed on-call response proof with rota, primary owner, secondary owner, handoff rule, timezone coverage, absence handling, escalation chain, acknowledgement timestamp, and response owner; customer communication proof with status route, update owner, approval path, message template, cadence, impact summary, customer-visible timestamp, and closure evidence; incident review proof with timeline, customer impact, corrective action owner, due date, evidence packet, review decision, residual risk, and closure rule; provider outage handling proof with provider health signal, fallback decision, retry/disable policy, customer impact rule, accepted-risk owner, and post-incident review; maintenance and degradation proof with maintenance approval, customer notice, degradation mode, rollback owner, recovery target, and post-maintenance review; service credit proof with legal/commercial owner, contractual escalation path, customer approval, credit trigger, calculation owner, and evidence retention rule; evidence retention proof with retention class, storage boundary, owner, review date, exportability, and deletion path; missed-SLO containment proof with detection signal, customer impact rule, escalation owner, freeze decision, remediation owner, residual risk, and next review date; release artifact hygiene result; and regenerated execution snapshot evidence are captured',
      stopCondition: 'target-slo-operations-missing',
    },
    {
      command: 'npm run smoke:target-support-architecture',
      domain: 'support architecture',
      proofIntent: 'target support architecture approval proof with support owner, reviewer, customer/workspace scope, and review date; staffing model proof with support owner, coverage window, primary rota, secondary rota, backup policy, timezone coverage, and absence handling; support queue platform proof with ticketing system, queue identifier, severity mapping, routing rule, retry path, queue owner, and access policy; severity routing proof with acknowledgement target, escalation timeout, incident commander handoff, customer impact rule, and audit record; customer communication boundary proof with approved channel, update cadence, message owner, approval path, status route, customer-visible timestamp, and closure rule; ticket audit and retention proof with lifecycle history, assignment history, customer-visible update history, redaction result, retention period, and evidence owner; on-call handoff proof with primary owner, secondary owner, acknowledgement timestamp, missed-ack rule, paging fallback, and handoff log; incident commander ownership proof with assignment record, decision authority, mitigation owner, rollback owner, and communication owner; escalation and backup coverage proof with engineering escalation, provider escalation, executive/customer escalation, backup owner, retry history, and failure fallback; support data handling proof with secret redaction, customer data redaction, provider transcript handling, attachment rule, access audit, and hygiene result; incident review governance proof with review cadence, corrective action owner, due date, customer impact summary, closure decision, and evidence retention; migration plan proof; missed-acknowledgement containment proof; queue-misrouting containment proof; customer-communication containment proof; ticket-audit containment proof; unstaffed-escalation containment proof; release artifact hygiene result; and regenerated execution snapshot evidence are defined',
      stopCondition: 'target-support-architecture-missing',
    },
    {
      command: 'npm run smoke:target-support-operations',
      domain: 'support operations',
      proofIntent: 'target support operations evidence with target support architecture approval proof with approved support architecture record, support owner, reviewer, customer/workspace scope, and review date; staffed support coverage proof with support owner, coverage window, primary rota, secondary rota, backup policy, timezone coverage, absence handling, and acknowledgement evidence; support queue routing proof with ticketing system, queue identifier, severity mapping, routing rule, retry path, queue owner, access policy, assignment audit, and escalation evidence; customer communication proof with approved channel, update cadence, message owner, approval path, status route, customer-visible timestamp, message reference, and closure message; ticket audit history proof with lifecycle history, assignment history, customer-visible update history, redaction result, retention period, evidence owner, and closure audit; escalation ownership proof with incident commander, engineering escalation, provider escalation, executive/customer escalation, backup owner, retry history, failure fallback, and audit record; incident review cadence proof with review cadence, timeline, mitigation owner, customer impact summary, corrective action owner, due date, review decision, closure evidence, and evidence retention; on-call handoff proof with primary owner, secondary owner, acknowledgement timestamp, missed-ack rule, paging fallback, handoff log, and escalation chain; support data handling proof with secret redaction, customer data redaction, provider transcript handling, ticket attachment rule, access audit, and hygiene result; closure evidence; release artifact hygiene result; and regenerated execution snapshot evidence is captured',
      stopCondition: 'target-support-operations-missing',
    },
    {
      command: 'npm run smoke:target-data-lifecycle-architecture',
      domain: 'data lifecycle architecture',
      proofIntent: 'target data lifecycle architecture approval proof with approved architecture record, lifecycle owner, reviewer, customer/workspace scope, review date, and allowed claim text; customer-approved data class matrix proof with legal basis, owner, retention window, exportability, delete eligibility, exception policy, legal hold owner, and customer approval; target retention configuration proof with storage boundary, enforcement timestamp, policy owner, reviewer, exception workflow, and audit record; export request proof with request id, requester, approver, package scope, delivery boundary, encryption mode, package hash, customer receipt, and export owner; delete request proof with request id, authorization owner, confirmation control, execution owner, storage scope, timestamp, result, rollback route, and audit record; provider transcript policy proof with provider-side retention, deletion or non-retention evidence, exception review, customer disclosure, evidence owner, and next review date; post-delete absence proof with runtime, tenant storage, backup, provider, export package, support packet, release artifact boundary checks, checker owner, timestamp, and absence result; backup architecture proof with schedule, encrypted storage, storage class, retention class, missed-run handling, owner acknowledgement, and access audit; restore validation proof with objective, duration, restored data class inventory, integrity proof, tenant isolation, cross-tenant denial, and validation owner; backup key ownership proof with key owner, rotation cadence, revocation, break-glass, expiry/delete evidence, and access audit; disaster recovery proof with owner, runbook execution, outage scenario, restore priority, customer communication, rollback path, residual risk decision, and audit trail; legal hold proof with hold owner, scope, expiry, release rule, and audit event; delete conflict containment proof with conflict detector, escalation owner, freeze rule, customer communication path, and resolution evidence; provider transcript exception proof with exception owner, retention decision, customer disclosure, next review date, and accepted-risk decision; customer communication containment proof with customer route, message owner, approval path, impact summary, closure evidence, and handoff decision; release artifact hygiene result; and regenerated execution snapshot evidence are defined',
      stopCondition: 'target-data-lifecycle-architecture-missing',
    },
    {
      command: 'npm run smoke:target-retention-operations',
      domain: 'retention operations',
      proofIntent: 'target retention operations evidence with customer-approved data class proof for branch, commit, release label, approved target boundary, class owner, legal basis, retention window, exportability, delete eligibility, exception policy, legal hold owner, and customer approval; target retention configuration proof with storage boundary, enforcement timestamp, policy owner, reviewer, exception workflow, audit record, and rollback route; export approval proof with request id, requester, approver, package scope, delivery boundary, encryption mode, package hash, reviewer, customer receipt, and export owner; delete workflow proof with request id, authorization owner, confirmation control, execution owner, storage scope, timestamp, result, rollback route, and audit record; provider transcript handling proof with provider-side retention, deletion or non-retention evidence, exception review, customer disclosure, evidence owner, and next review date; post-delete absence proof with runtime, tenant storage, backup, provider, export package, support packet, release artifact boundary checks, checker owner, timestamp, and absence result; audit history proof with actor, customer or tenant alias, lifecycle action, before/after state, timestamp, checksum or equivalent integrity proof, and retention owner; lifecycle exception review proof with exception owner, accepted-risk decision, customer handoff decision, residual risk, next review date, and lifecycle containment plan; release artifact hygiene result; and regenerated execution snapshot evidence is captured',
      stopCondition: 'target-retention-operations-missing',
    },
    {
      command: 'npm run smoke:target-backup-operations',
      domain: 'backup operations',
      proofIntent: 'target backup operations evidence for backup schedule execution proof with backup policy id, schedule, execution timestamps, missed-run handling, and owner acknowledgement, encrypted backup storage proof with storage class, encryption mode, retention class, location alias, and access audit, backup key ownership proof with key owner, rotation cadence, revocation path, break-glass route, expiry/delete evidence, and access audit, restore validation proof with objective, duration, restored data class inventory, checksum or integrity proof, tenant isolation, cross-tenant denial, and validation owner, backup expiry/deletion proof with expiry schedule, delete proof, post-delete absence check, and audit record, disaster recovery proof with DR owner, runbook execution, outage scenario, restore priority, customer communication, rollback path, residual risk decision, and audit trail, release artifact hygiene result, and regenerated execution snapshot evidence is captured',
      stopCondition: 'target-backup-operations-missing',
    },
    {
      command: 'npm run smoke:target-clean-deployment-architecture',
      domain: 'clean deployment architecture',
      proofIntent: 'target clean deployment architecture approval proof with approved architecture record, deployment owner, reviewer, customer/workspace scope, review date, and allowed claim text; source provenance proof with branch, commit, review owner, build actor, release tag, tamper-control decision, and source approval; artifact registry proof with immutable artifact id, registry path, sha256, retention policy, access owner, promotion rule, and pull/download proof; dependency installation proof with lockfile source, install command, cache policy, vulnerability scan result, reproducibility record, install log, and owner; runtime bootstrap proof with deployment profile, runtime root, process manager, health endpoint result, startup log, restart policy, and bootstrap owner; secret injection proof with approved secret manager platform proof, runtime injection path proof, least-privilege access policy proof, rotation and revocation event proof, redaction and leakage review proof, break-glass governance proof, secret access audit log proof, and credential containment proof; environment boundary proof with target environment name, network boundary, storage boundary, tenant profile, operator access policy, rollback owner, and customer/workspace scope; migration and data readiness proof with migration command, seed/import policy, backup precheck, rollback point, data owner approval, and validation result; smoke and health verification proof with health, auth, provider, tenant isolation, artifact hygiene, release readiness, and target deployment contract results; rollback and recovery proof with rollback artifact, rollback command, recovery time result, validation command, owner, and residual risk decision; release approval proof with change ticket or equivalent approval, approver, evidence packet, customer communication, freeze exception, and final decision owner; migration plan proof; dependency drift containment proof; failed bootstrap containment proof; failed secret injection containment proof; rollback failure containment proof; misleading release approval containment proof; release artifact hygiene result; and regenerated execution snapshot evidence are defined',
      stopCondition: 'target-clean-deployment-architecture-missing',
    },
    {
      command: 'npm run smoke:target-clean-deployment-operations',
      domain: 'clean deployment operations',
      proofIntent: 'target clean deployment operations evidence with source provenance proof for approved branch, commit, review owner, build actor, release tag, tamper-control decision, and source approval; artifact registry proof with immutable artifact id, registry path, sha256, retention policy, access owner, promotion rule, and pull/download proof; dependency installation proof with lockfile source, install command, cache policy, vulnerability scan result, reproducibility record, install log, and owner; runtime bootstrap proof with deployment profile, runtime root, process manager, health endpoint result, startup log, restart policy, and bootstrap owner; secret injection proof with approved secret manager platform proof, runtime injection path proof, least-privilege access policy proof, rotation and revocation event proof, redaction and leakage review proof, break-glass governance proof, secret access audit log proof, and credential containment proof; environment boundary proof with target environment name, network boundary, storage boundary, tenant profile, operator access policy, rollback owner, and customer/workspace scope; migration and data readiness proof with migration command, seed/import policy, backup precheck, rollback point, data owner approval, and validation result; smoke and health verification proof with health, auth, provider, tenant isolation, artifact hygiene, release readiness, and target deployment contract results; rollback and recovery proof with rollback artifact, rollback command, recovery time result, validation command, owner, and residual risk decision; release approval proof with change ticket or equivalent approval, approver, evidence packet, customer communication, freeze exception, and final decision owner; artifact hygiene and production readiness gate result; residual risk proof; decision owner proof; next review date proof; and failed-deployment containment plan is captured',
      stopCondition: 'target-clean-deployment-operations-missing',
    },
    {
      command: 'npm run smoke:target-deployment-contract',
      domain: 'deployment contract',
      proofIntent: 'target deployment contract evidence with target deployment boundary proof for approved target environment name, company/workspace scope, deployment owner, evidence owner, reviewer, review date, release label, and source commit; deployment profile decision proof with selected profile, approved architecture decision, network boundary, runtime root alias, rollback owner, customer approval reference, and rejected unapproved profiles; source provenance proof with branch, commit, review owner, build actor, release tag, tamper-control decision, and source approval; artifact registry proof with immutable artifact id, registry path, sha256, retention policy, access owner, promotion rule, and pull/download proof; dependency installation proof with lockfile source, install command, cache policy, vulnerability scan result, reproducibility record, install log, and owner; runtime bootstrap proof with deployment profile, runtime root, process manager, health endpoint result, startup log, restart policy, and bootstrap owner; target secret injection proof with approved secret manager platform, runtime injection path, least-privilege policy, rotation/revocation proof, audit log proof, and leakage review; environment boundary proof with network boundary, storage boundary, tenant profile, operator access policy, rollback route, and customer/workspace scope; rollback owner proof with rollback artifact, rollback command, recovery time result, validation command, residual risk decision, and owner acknowledgement; release label proof with release id, branch, commit, generated artifact commit, evidence packet reference, and reviewer decision; target evidence packet reference proof with submission packet, boundary consistency map, blocker disposition register, release refresh evidence, artifact hygiene result, and production readiness gate result; production readiness blocker proof with blocker ids, stop-condition decision, allowed claim text, rejected claims, next verification command, and next review date; and contract references are present',
      stopCondition: 'target-deployment-contract-missing',
    },
    {
      command: 'npm run smoke:production-readiness-gate',
      domain: 'production readiness gate',
      proofIntent: 'productionReadyClaim remains false until target environment, provider, identity/session, tenant, observability/SLO, retention/backup, support, and release blockers close',
      stopCondition: 'production-readiness-gate-missing-or-failed',
    },
    {
      command: 'npm run smoke:clean-deployment-release',
      domain: 'clean deployment release',
      proofIntent: 'clean deployment release evidence with clean checkout proof, command replay proof, artifact synchronization proof, production-like environment proof, rollback readiness proof, release approval proof, failed-release containment proof, release artifact hygiene result, artifact-sync-current proof, and regenerated execution snapshot evidence remains current for the release review',
      stopCondition: 'clean-deployment-release-missing-or-failed',
    },
    {
      command: 'npm run smoke:production-like-release-drill',
      domain: 'production-like release drill',
      proofIntent: 'production-like release drill evidence with target gates proof, provider checks proof, execution snapshot proof, clean deployment release proof, pilot export package proof, rollback proof, handoff evidence proof, release artifact hygiene result, production readiness gate proof, and failed-release containment proof remains current',
      stopCondition: 'production-like-release-drill-missing-or-failed',
    },
    {
      command: 'npm run smoke:pilot-export-package',
      domain: 'pilot export package',
      proofIntent: 'pilot export package proof with repository-relative file inventory, bundle hash proof, file count proof, sha256 manifest proof, hygiene state proof, verified commit reference proof, release artifact hygiene result, and regenerated execution snapshot reference remains current',
      stopCondition: 'pilot-export-package-missing-or-stale',
    },
    {
      command: 'npm run smoke:release-artifact-hygiene',
      domain: 'release artifact hygiene',
      proofIntent: 'release artifact hygiene proof with machine-local path scan proof, secret-like value scan proof, unsupported evidence leakage scan proof, scanned file count proof, zero finding proof, verified commit proof, and reviewer acceptance boundary is captured',
      stopCondition: 'release-artifact-hygiene-missing-or-failed',
    },
  ];
  const commandRows = commandDefinitions.flatMap((item, index) => [
    `${index + 1}. ${item.command}`,
    `   - domain: ${item.domain}`,
    `   - proofIntent: ${item.proofIntent}`,
    `   - stopCondition: ${item.stopCondition}`,
    '   - result: <required pass/fail/not-run>',
    '   - ranAt: <required ISO timestamp or YYYY-MM-DD>',
    '   - artifactReference: <required repository-relative path or sanitized external alias>',
    '   - reviewerNote: <required note or none>',
  ]);
  const commandExecutionOrder = commandDefinitions.map((item, index) => `${index + 1}. ${item.command}`);
  const visibleBlockerRows = visibleActions.length
    ? visibleActions.flatMap((item, index) => {
        const commands = Array.isArray(item.commands) ? item.commands : [];
        return [
          `${index + 1}. ${String(item.blocker || item.stopReason || 'current open blocker').trim()}`,
          `   - blockerId: ${String(item.id || '').trim() || 'unknown'}`,
          `   - provider: ${String(item.provider || '').trim() || 'none'}`,
          `   - category: ${String(item.category || 'stop-condition').trim()}`,
          `   - owner: ${String(item.owner || 'release-owner').trim()}`,
          `   - stopReason: ${String(item.stopReason || item.blocker || '').trim() || 'not recorded'}`,
          `   - blockerCommands: ${commands.map((command) => String(command.command || '').trim()).filter(Boolean).join(' | ') || 'none'}`,
          `   - requiredClosingEvidence: ${String(item.nextEvidence || '').trim() || 'not recorded'}`,
          '   - requiredCommandsImpact: keep as stop-condition until matching blocker commands and applicable target required commands pass from the same approved boundary',
        ];
      })
    : ['- none'];
  const residualBlockerLines = productionBlockers.length
    ? productionBlockers.map((item, index) => `${index + 1}. ${String(item || '').trim()}`)
    : ['- none'];
  const lines = [
    'Target evidence required commands',
    `- category: ${normalizedCategory || 'all'}`,
    `- owner: ${normalizedOwner || 'all'}`,
    `- provider: ${normalizedProvider || 'all'}`,
    `- includeSharedProviderOperations: ${String(includeShared !== false)}`,
    `- sharedProviderOperationsScope: ${getReleaseSharedProviderOperationsScopeReason({ includeShared, provider: normalizedProvider })}`,
    ...buildReleaseSharedProviderOperationsScopeAuditLines({
      totalActions: allActions,
      category: normalizedCategory,
      includeShared,
      owner: normalizedOwner,
      provider: normalizedProvider,
    }),
    `- sourceCommit: ${sourceCommit}`,
    `- visibleCurrentBlockers: ${visibleActions.length}/${allActions.length}`,
    `- requiredCommandCount: ${commandDefinitions.length}`,
    `- productionReadyStatus: ${summary.productionReadyStatus || releaseReadiness.productionReadyStatus || 'not tracked'}`,
    `- productionReadyBlocked: ${String(Boolean(summary.productionReadyBlocked ?? releaseReadiness.productionReadyBlocked ?? true))}`,
    `- productionBlockerCount: ${summary.productionBlockerCount ?? releaseReadiness.productionBlockerCount ?? productionBlockers.length}`,
    `- productionReadyStopReason: ${summary.productionReadyStopReason || releaseReadiness.productionReadyStopReason || 'not recorded'}`,
    `- releaseLink: ${releaseLink}`,
    `- releaseBlockerApiLink: ${releaseBlockerApiLink}`,
    '',
    'Command rows:',
    ...commandRows,
    '',
    'Command execution order:',
    ...commandExecutionOrder,
    '',
    'Visible blocker command cross-check:',
    ...visibleBlockerRows,
    '',
    'Residual production blockers:',
    ...residualBlockerLines,
    '',
    'Production gap:',
    '- This command package does not prove hosted identity/session administration, hosted tenant storage or encryption, target secret injection, target telemetry, staffed on-call, target retention enforcement, production backup execution, staffed support operations, clean production deployment, or release approval by itself.',
    '- Target environment readiness remains blocked for production-ready claims until the evidence packet is completed from the approved production-like or hosted target environment and execution evidence, closeout, handoff, snapshot, pilot export package, production-like release drill, clean deployment release, and release readiness docs are regenerated from that evidence.',
    '',
    'Required command rules:',
    '- Commands must be rerun from the approved target boundary after target evidence, blocker disposition, provider live validation, or release source-of-record changes.',
    '- A stale, missing, failed, or not-run command keeps the related blocker as a stop-condition.',
    '- Artifact references must be repository-relative paths or sanitized external evidence aliases.',
    '- Do not include raw API keys, tokens, private endpoint credentials, tenant payloads, customer personal data, billing identifiers, private tenant identifiers, raw provider account ids, or machine-local absolute paths.',
    '- Keep productionReadyClaim=false until every command row passes, execution-v1 artifacts are regenerated, release artifact hygiene passes, and production readiness gate passes for the claimed scope.',
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseTargetEvidenceProductionGapText({
  blockerActions = getFilteredReleaseCurrentOpenBlockerActions(),
  totalActions = getReleaseCurrentOpenBlockerActions(),
  category = state.releaseBlockerCategoryFilter,
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
  releaseStatus = state.releaseStatus,
} = {}) {
  const visibleActions = Array.isArray(blockerActions) ? blockerActions : [];
  const allActions = Array.isArray(totalActions) ? totalActions : [];
  if (!releaseStatus || !allActions.length) {
    return '';
  }

  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const summary = releaseStatus.summary || {};
  const releaseReadiness = releaseStatus.releaseReadiness || {};
  const snapshot = releaseStatus.snapshot || {};
  const productionBlockers = getReleaseProductionBlockers(releaseStatus);
  const releaseLink = buildReleaseBlockerSliceUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const releaseBlockerApiLink = buildReleaseBlockerApiUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const sourceCommit = String(summary.sourceCommit || releaseStatus.commit || snapshot.verifiedCommit || '<required source commit>').trim()
    || '<required source commit>';
  const gapDefinitions = [
    {
      gap: 'hosted identity/session administration',
      missingProof: 'customer IdP onboarding proof with metadata alias, issuer, audience, JWKS rotation owner, fallback owner, and customer approval; user lifecycle proof with provision, invitation, suspension, recovery, deprovision, tenant mapping, and orphan account review; session lifecycle proof with login, refresh, expiry, logout, revocation, idle timeout, device inventory, and re-auth; role administration proof with persistent assignment, revocation, delegated admin approval, separation-of-duties, and rollback; permission propagation proof across API, worker, agent, support, observability, cache invalidation, and stale permission denial; immutable audit export proof with actor, subject, tenant, role, session, reason, before/after state, timestamp, and checksum; break-glass governance proof with owner, approver, scope, expiry, monitoring, customer notification, revocation, and post-use review; support impersonation proof with approval, scoped session, action log, customer-safe update, denial tests, expiry, and closure; compliance and retention proof with identity log retention, legal hold, audit export, privacy deletion, post-delete absence, and customer handoff; migration plan proof; rollback proof; lockout recovery proof; customer access containment proof; release artifact hygiene result; and regenerated execution snapshot evidence from the hosted target boundary',
      requiredEvidence: 'hosted identity/session architecture approval plus target identity/session operations evidence',
      stopCondition: 'hosted-identity-session-approval-missing',
      claimGuard: 'do not claim hosted SaaS or production-ready identity coverage',
    },
    {
      gap: 'hosted tenant storage or encryption',
      missingProof: 'tenant identity source proof with source owner, customer organization mapping proof, tenant lifecycle owner, trust policy, source approval, and orphan tenant review; tenant-scoped authorization proof with permission policy, service-to-service tenant propagation proof, stale permission denial, delegated admin boundary, and denial owner; storage partitioning proof for runtime state and artifact/memory/search/export/index partitioning proof with schema/bucket/keyspace boundary and migration safety; per-tenant encryption/key ownership proof with key owner, rotation, revocation, escrow, break-glass, access audit, and key custody decision; backup/restore isolation proof with tenant-scoped backup selection, restore authorization, integrity result, other-tenant non-interference, post-restore denial, backup owner, and restore rollback route; tenant administration proof with create, suspend, restore, delete, role delegation, customer approval, audit history, rollback route, tenant admin owner, and approval expiry; cross-tenant denial proof across API, storage, memory, search, export, delete, backup, support, and observability; observability/support isolation proof with tenant-scoped logs, traces, alerts, support ticket visibility, incident review, customer status routing, evidence export, support owner, and retention class; lifecycle isolation proof with retention, export, delete, provider transcript, legal hold, backup expiry, post-delete absence, lifecycle owner, and exception policy; tenant data containment; release artifact hygiene result; and regenerated execution snapshot evidence from the hosted target boundary',
      requiredEvidence: 'hosted tenant isolation architecture approval plus target tenant isolation operations evidence',
      stopCondition: 'hosted-tenant-isolation-approval-missing',
      claimGuard: 'do not claim hosted multi-tenant isolation readiness',
    },
    {
      gap: 'target secret injection',
      missingProof: 'approved secret manager platform proof with provider, region, tenancy boundary, owner, and fallback decision, secret class inventory proof with provider, environment, owner, rotation cadence, and allowed consumers, runtime injection proof for CLI, UI, worker, live validation, clean deployment, rollback, and support paths, least-privilege access policy proof with reader, writer, admin, reviewer, service binding, and deny-by-default evidence, rotation and revocation event proof with previous secret invalidation and downstream redeploy or reload result, secret access audit log proof for read, write, rotate, revoke, break-glass, and failed access attempts, break-glass governance proof with approval, expiry, monitoring, customer notification, revocation, and post-use review, leakage review proof across production logs, traces, support packets, browser artifacts, screenshots, release exports, and provider errors, disaster recovery proof for secret backup, restore, key recovery, region outage, rollback, and compromised-secret containment, migration plan, rollback, lockout recovery, credential containment proof, release artifact hygiene result, and regenerated execution snapshot evidence from the approved target boundary without exposing secret values',
      requiredEvidence: 'target secret manager architecture approval proof, target secret manager operations evidence, and provider runtime validation evidence tied to the same target boundary',
      stopCondition: 'target-secret-injection-missing',
      claimGuard: 'do not claim production provider credential readiness',
    },
    {
      gap: 'target telemetry',
      missingProof: 'target observability architecture approval proof with approved architecture record, telemetry owner, reviewer, customer/workspace scope, and review date; approved telemetry backend proof with backend alias, region, tenancy boundary, owner, fallback route, and data residency decision; signal inventory proof for release, provider, mission, approval, runtime, security, support, and incident domains with severity owner and retention class; telemetry ingestion proof for metrics, logs, traces, audit events, provider events, release events, and support events with sample references, ingestion timestamp, pipeline owner, and dropped-event review; alert routing proof with severity mapping, primary route, secondary route, retry policy, acknowledgement SLA, escalation timeout, delivery receipt, and retry outcome; alert acknowledgement proof with responder, acknowledgement timestamp, escalation chain, fallback route, missed-ack handling, and audit record; staffed on-call coverage proof with rota, primary owner, backup owner, handoff rule, timezone coverage, absence handling, and escalation chain; log and trace retention proof with period, storage class, redaction policy, query role, customer export boundary, deletion path, and query access audit; customer status communication proof with route, owner, approval, timestamp, message, cadence, and closure evidence; incident response proof with timeline, mitigation owner, customer impact, review decision, corrective actions, due dates, residual risk, and closure evidence; incident review proof with review cadence, decision owner, corrective action owner, due date, closure evidence, and evidence retention; audit export proof for alert delivery, acknowledgement, customer update, query access, review decision, and corrective action closure; disaster recovery proof for telemetry backend outage, alert route outage, incident bridge fallback, log export fallback, evidence recovery, and recovery owner; target SLO architecture approval proof; customer-approved SLO/SLA terms proof; error budget policy proof; telemetry measurement proof; staffed on-call response proof; provider outage handling proof; maintenance and degradation proof; service credit proof; evidence retention proof; missed-SLO containment proof; release artifact hygiene result; and regenerated execution snapshot evidence from the approved target boundary',
      requiredEvidence: 'target observability architecture and operations evidence plus SLO operations evidence',
      stopCondition: 'target-observability-operations-missing',
      claimGuard: 'do not claim staffed production observability or SLO operations',
    },
    {
      gap: 'staffed on-call',
      missingProof: 'target SLO operations evidence for customer-approved SLO/SLA terms proof with availability target, latency target, error rate target, support response target, maintenance window, exclusions, legal/commercial owner, and customer approval; error budget review proof with measurement window, budget owner, burn-rate threshold, freeze rule, exception workflow, review cadence, burn event, and override owner; telemetry measurement proof with metrics backend, uptime check, synthetic probe, latency histogram, provider failure signal, sample metric references, ingestion timestamp, query result, alert correlation, data source owner, and retention period; alert acknowledgement proof with severity mapping, alert route, acknowledgement SLA, escalation timeout, delivery receipt, fallback route, missed-ack rule, responder, acknowledgement timestamp, and audit record; staffed on-call response proof with rota, primary owner, secondary owner, handoff rule, timezone coverage, absence handling, escalation chain, acknowledgement timestamp, and response owner; customer communication proof with status route, update owner, approval path, message template, cadence, impact summary, customer-visible timestamp, and closure evidence; incident review proof with timeline, customer impact, corrective action owner, due date, evidence packet, review decision, residual risk, and closure rule; provider outage handling proof with provider health signal, fallback decision, retry/disable policy, customer impact rule, accepted-risk owner, and post-incident review; maintenance and degradation proof with maintenance approval, customer notice, degradation mode, rollback owner, recovery target, and post-maintenance review; service credit proof with legal/commercial owner, contractual escalation path, customer approval, credit trigger, calculation owner, and evidence retention rule; evidence retention proof with retention class, storage boundary, owner, review date, exportability, and deletion path; missed-SLO containment proof with detection signal, customer impact rule, escalation owner, freeze decision, remediation owner, residual risk, and next review date; target observability operations evidence for alert delivery proof, staffed on-call routing and acknowledgement proof with route, severity, delivery receipt, retry policy, acknowledgement SLA, escalation evidence, retry outcome, acknowledgement timestamp, missed-ack handling, and escalation chain; target support operations evidence for on-call handoff proof with primary owner, secondary owner, acknowledgement timestamp, missed-ack rule, paging fallback, handoff log, escalation chain, incident review cadence proof, support data handling proof, closure evidence, release artifact hygiene result, and regenerated execution snapshot evidence from the approved target boundary',
      requiredEvidence: 'target SLO operations and support operations evidence with staffing proof',
      stopCondition: 'target-slo-operations-missing',
      claimGuard: 'do not claim production incident response readiness',
    },
    {
      gap: 'target retention enforcement',
      missingProof: 'target data lifecycle architecture evidence for approved architecture record, lifecycle owner, reviewer, customer/workspace scope, review date, and allowed claim text; customer-approved data class matrix proof with legal basis, owner, retention window, exportability, delete eligibility, exception policy, legal hold owner, and customer approval; target retention operations evidence for branch, commit, release label, approved target boundary, class owner, legal basis, retention window, exportability, delete eligibility, exception policy, legal hold owner, and customer approval; target retention configuration proof with storage boundary, enforcement timestamp, policy owner, reviewer, exception workflow, audit record, and rollback route; export approval proof with request id, requester, approver, package scope, delivery boundary, encryption mode, package hash, reviewer, customer receipt, and export owner; delete workflow proof with request id, authorization owner, confirmation control, execution owner, storage scope, timestamp, result, rollback route, and audit record; provider transcript handling proof with provider-side retention, deletion or non-retention evidence, exception review, customer disclosure, evidence owner, and next review date; post-delete absence proof with runtime, tenant storage, backup, provider, export package, support packet, release artifact boundary checks, checker owner, timestamp, and absence result; audit history proof with actor, customer or tenant alias, lifecycle action, before/after state, timestamp, checksum or equivalent integrity proof, and retention owner; lifecycle exception review proof with exception owner, accepted-risk decision, customer handoff decision, residual risk, next review date, and lifecycle containment plan; target backup relationship proof with backup expiry/deletion boundary, restore validation dependency, tenant isolation dependency, and disaster recovery handoff; release artifact hygiene result; and regenerated execution snapshot evidence from the approved target boundary',
      requiredEvidence: 'target data lifecycle architecture and target retention operations evidence',
      stopCondition: 'target-retention-operations-missing',
      claimGuard: 'do not claim production data lifecycle compliance',
    },
    {
      gap: 'production backup execution',
      missingProof: 'target backup operations evidence for backup schedule execution proof with backup policy id, schedule, execution timestamps, missed-run handling, and owner acknowledgement, encrypted backup storage proof with storage class, encryption mode, retention class, location alias, and access audit, backup key ownership proof with key owner, rotation cadence, revocation path, break-glass route, expiry/delete evidence, and access audit, restore validation proof with objective, duration, restored data class inventory, checksum or integrity proof, tenant isolation, cross-tenant denial, and validation owner, backup expiry/deletion proof with expiry schedule, delete proof, post-delete absence check, and audit record, disaster recovery proof with DR owner, runbook execution, outage scenario, restore priority, customer communication, rollback path, residual risk decision, and audit trail, release artifact hygiene result, and regenerated execution snapshot evidence from the approved target boundary',
      requiredEvidence: 'target backup operations evidence generated from the approved target boundary',
      stopCondition: 'target-backup-operations-missing',
      claimGuard: 'do not claim production disaster recovery readiness',
    },
    {
      gap: 'staffed support operations',
      missingProof: 'target support architecture approval proof with approved support architecture record, support owner, reviewer, customer/workspace scope, and review date; staffed support coverage proof with support owner, coverage window, primary rota, secondary rota, backup policy, timezone coverage, absence handling, and acknowledgement evidence; support queue routing proof with ticketing system, queue identifier, severity mapping, routing rule, retry path, queue owner, access policy, assignment audit, and escalation evidence; customer communication proof with approved channel, update cadence, message owner, approval path, status route, customer-visible timestamp, message reference, and closure message; ticket audit history proof with lifecycle history, assignment history, customer-visible update history, redaction result, retention period, evidence owner, and closure audit; escalation ownership proof with incident commander, engineering escalation, provider escalation, executive/customer escalation, backup owner, retry history, failure fallback, and audit record; incident review cadence proof with review cadence, timeline, mitigation owner, customer impact summary, corrective action owner, due date, review decision, closure evidence, and evidence retention; on-call handoff proof with primary owner, secondary owner, acknowledgement timestamp, missed-ack rule, paging fallback, handoff log, and escalation chain; support data handling proof with secret redaction, customer data redaction, provider transcript handling, ticket attachment rule, access audit, and hygiene result; closure evidence; release artifact hygiene result; and regenerated execution snapshot evidence from the approved target boundary',
      requiredEvidence: 'target support architecture and target support operations evidence',
      stopCondition: 'target-support-operations-missing',
      claimGuard: 'do not claim production customer support readiness',
    },
    {
      gap: 'clean production deployment',
      missingProof: 'target clean deployment architecture approval proof with approved architecture record, deployment owner, reviewer, customer/workspace scope, review date, and allowed claim text; target clean deployment operations evidence for source provenance proof with approved branch, commit, review owner, build actor, release tag, tamper-control decision, and source approval; artifact registry proof with immutable artifact id, registry path, sha256, retention policy, access owner, promotion rule, and pull/download proof; dependency installation proof with lockfile source, install command, cache policy, vulnerability scan result, reproducibility record, install log, and owner; runtime bootstrap proof with deployment profile, runtime root, process manager, health endpoint result, startup log, restart policy, and bootstrap owner; target secret injection proof with approved secret manager platform proof, runtime injection path proof, least-privilege access policy proof, rotation and revocation event proof, redaction and leakage review proof, break-glass governance proof, secret access audit log proof, and credential containment proof; environment boundary proof with target environment name, network boundary, storage boundary, tenant profile, operator access policy, rollback owner, and customer/workspace scope; migration and data readiness proof with migration command, seed/import policy, backup precheck, rollback point, data owner approval, and validation result; smoke and health verification proof with health, auth, provider, tenant isolation, artifact hygiene, release readiness, and target deployment contract results; rollback and recovery proof with rollback artifact, rollback command, recovery time result, validation command, owner, and residual risk decision; release approval proof with change ticket or equivalent approval, approver, evidence packet, customer communication, freeze exception, and final decision owner; clean deployment release evidence for clean checkout proof, command replay proof, artifact synchronization proof, production-like environment proof, rollback readiness proof, release approval proof, failed-release containment proof, release artifact hygiene result, artifact-sync-current proof, and regenerated execution snapshot evidence from the same approved target boundary',
      requiredEvidence: 'target clean deployment architecture and operations evidence plus clean deployment release proof',
      stopCondition: 'target-clean-deployment-operations-missing',
      claimGuard: 'do not claim production deployment readiness',
    },
    {
      gap: 'release approval',
      missingProof: 'target evidence approval packet proof with completed target evidence capture template, sanitized submission packet and evidence register proof with redaction note, retention class, and sha256 or signed export reference, boundary consistency map proof, command rerun log proof, reviewer decision record with reviewer, decision owner, review date, decision state, accepted risk ids, rejected claims, allowed claim text, residual blockers reviewed, command rerun log review, release refresh evidence review, productionReadyClaim decision, and next review date, blocker disposition register proof with owner, current state, required closing evidence, allowed claim impact, and next verification command, release refresh evidence proof with verified source commit, generated time, result, repository-relative artifact path, release artifact hygiene result, regenerated execution-v1 artifacts, artifact-sync-current proof, and production readiness gate result from the same approved source commit',
      requiredEvidence: 'completed target evidence submission packet and release refresh evidence signed off for the same source commit',
      stopCondition: 'target-environment-evidence-missing',
      claimGuard: 'keep productionReadyClaim=false until every mandatory target control is accepted',
    },
  ];
  const gapRows = gapDefinitions.flatMap((item, index) => [
    `${index + 1}. ${item.gap}`,
    `   - missingProof: ${item.missingProof}`,
    `   - requiredEvidence: ${item.requiredEvidence}`,
    `   - stopCondition: ${item.stopCondition}`,
    `   - claimGuard: ${item.claimGuard}`,
    '   - evidenceReference: <required repository-relative path or sanitized external alias>',
    '   - owner: <required accountable owner>',
    '   - nextReviewDate: <required YYYY-MM-DD>',
  ]);
  const visibleBlockerRows = visibleActions.length
    ? visibleActions.flatMap((item, index) => [
        `${index + 1}. ${String(item.blocker || item.stopReason || 'current open blocker').trim()}`,
        `   - blockerId: ${String(item.id || '').trim() || 'unknown'}`,
        `   - provider: ${String(item.provider || '').trim() || 'none'}`,
        `   - category: ${String(item.category || 'stop-condition').trim()}`,
        `   - owner: ${String(item.owner || 'release-owner').trim()}`,
        `   - stopReason: ${String(item.stopReason || item.blocker || '').trim() || 'not recorded'}`,
        `   - requiredClosingEvidence: ${String(item.nextEvidence || '').trim() || 'not recorded'}`,
        '   - productionGapImpact: keep the production-ready claim blocked unless this blocker has accepted target-boundary evidence and final gate results',
      ])
    : ['- none'];
  const residualBlockerLines = productionBlockers.length
    ? productionBlockers.map((item, index) => `${index + 1}. ${String(item || '').trim()}`)
    : ['- none'];
  const unblockSequence = [
    'complete target evidence capture template from the approved production-like or hosted target environment',
    'attach sanitized submission packet, boundary consistency map, command rerun log, reviewer decision, blocker disposition register, and release refresh evidence',
    'rerun every required target smoke/release command from the same target boundary',
    'regenerate execution-v1 evidence, closeout, handoff, immutable snapshot, pilot export package, production-like release drill, clean deployment release, and release readiness docs',
    'pass release artifact hygiene and production readiness gate after all stop-conditions are closed',
  ];
  const allowedClaimLines = [
    '- provider-scoped pilot ready for OpenAI-backed local-first path can remain if supported by current evidence',
    '- production-ready, hosted SaaS ready, live-provider-complete, tenant-isolated production, staffed support ready, and clean production deployment ready claims remain blocked',
  ];
  const lines = [
    'Target evidence production gap guard',
    `- category: ${normalizedCategory || 'all'}`,
    `- owner: ${normalizedOwner || 'all'}`,
    `- provider: ${normalizedProvider || 'all'}`,
    `- includeSharedProviderOperations: ${String(includeShared !== false)}`,
    `- sharedProviderOperationsScope: ${getReleaseSharedProviderOperationsScopeReason({ includeShared, provider: normalizedProvider })}`,
    ...buildReleaseSharedProviderOperationsScopeAuditLines({
      totalActions: allActions,
      category: normalizedCategory,
      includeShared,
      owner: normalizedOwner,
      provider: normalizedProvider,
    }),
    `- sourceCommit: ${sourceCommit}`,
    `- visibleCurrentBlockers: ${visibleActions.length}/${allActions.length}`,
    `- productionGapCount: ${gapDefinitions.length}`,
    `- productionReadyStatus: ${summary.productionReadyStatus || releaseReadiness.productionReadyStatus || 'not tracked'}`,
    `- productionReadyBlocked: ${String(Boolean(summary.productionReadyBlocked ?? releaseReadiness.productionReadyBlocked ?? true))}`,
    `- productionBlockerCount: ${summary.productionBlockerCount ?? releaseReadiness.productionBlockerCount ?? productionBlockers.length}`,
    `- productionReadyStopReason: ${summary.productionReadyStopReason || releaseReadiness.productionReadyStopReason || 'not recorded'}`,
    `- releaseLink: ${releaseLink}`,
    `- releaseBlockerApiLink: ${releaseBlockerApiLink}`,
    '',
    'Production gap rows:',
    ...gapRows,
    '',
    'Visible blocker production gap cross-check:',
    ...visibleBlockerRows,
    '',
    'Residual production blockers:',
    ...residualBlockerLines,
    '',
    'Readiness unblock sequence:',
    ...unblockSequence.map((item, index) => `${index + 1}. ${item}`),
    '',
    'Allowed and blocked claims:',
    ...allowedClaimLines,
    '',
    'Production gap rules:',
    '- This is a claim guard for the target evidence packet, not production-ready approval.',
    '- A local target environment evidence intake contract does not prove hosted identity/session administration, hosted tenant storage or encryption, target secret injection, target telemetry, staffed on-call, target retention enforcement, production backup execution, staffed support operations, clean production deployment, or release approval by itself.',
    '- Do not include raw API keys, tokens, private endpoint credentials, tenant payloads, customer personal data, billing identifiers, private tenant identifiers, raw provider account ids, or machine-local absolute paths.',
    '- Keep productionReadyClaim=false until every mandatory target deployment control is satisfied by accepted target evidence, regenerated release artifacts, release artifact hygiene, and production readiness gate evidence.',
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseTargetEvidenceExceptionRegisterText({
  blockerActions = getFilteredReleaseCurrentOpenBlockerActions(),
  totalActions = getReleaseCurrentOpenBlockerActions(),
  category = state.releaseBlockerCategoryFilter,
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
  releaseStatus = state.releaseStatus,
} = {}) {
  const visibleActions = Array.isArray(blockerActions) ? blockerActions : [];
  const allActions = Array.isArray(totalActions) ? totalActions : [];
  if (!releaseStatus || !allActions.length) {
    return '';
  }

  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const summary = releaseStatus.summary || {};
  const releaseReadiness = releaseStatus.releaseReadiness || {};
  const snapshot = releaseStatus.snapshot || {};
  const productionBlockers = getReleaseProductionBlockers(releaseStatus);
  const releaseLink = buildReleaseBlockerSliceUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const releaseBlockerApiLink = buildReleaseBlockerApiUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const sourceCommit = String(summary.sourceCommit || releaseStatus.commit || snapshot.verifiedCommit || '<required source commit>').trim()
    || '<required source commit>';
  const exceptionDefinitions = [
    {
      exceptionId: 'anthropic-provider-exclusion',
      scope: 'exclude Anthropic from live-provider-complete and production-ready claims until target account billing/live validation closes',
      requiredEvidence: 'target Anthropic provider account evidence with account ownership proof for account owner, organization/workspace alias, customer scope, evidence owner, reviewer, and review date; billing and credit remediation proof with active billing plan, available credit balance status, payment owner, renewal path, low-balance alert route, remediation ticket, and post-remediation live run reference; API key and secret injection proof with approved secret manager platform, ANTHROPIC_API_KEY owner, runtime injection, least-privilege policy, rotation/revocation event, secret access audit, break-glass governance, leakage review, and credential containment; ANTHROPIC_MODEL model access proof with model availability, region/workspace access, max token policy, fallback model, and owner approval; provider terms and customer approval proof with provider terms, data processing approval, allowed customer/workspace, transcript retention policy, support owner, and evidence owner; quota and spend guard proof with usage envelope, concurrency limit, timeout, retry policy, spend owner, saturation fallback, and budget review cadence; target-boundary live validation proof with npm run live:execution-v1:anthropic, mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference; fallback and stop-condition proof with fallback provider, fallback policy id, stop reason, degraded mode, customer impact rule, manual approval path, rollback owner, residual risk decision, and recoverable-provider-failure-only stop evidence; provider operations proof with provider inventory, fallback runtime audit policy and stop reason, telemetry, incident triage, data transcript handling, remediation renewal evidence, evidence retention, and provider failure containment; release artifact hygiene result; and regenerated execution snapshot evidence',
      allowedClaimText: 'OpenAI-backed local-first pilot only; Anthropic remains excluded',
      stopCondition: 'anthropic-live-validation-missing-or-failed',
    },
    {
      exceptionId: 'hermes-provider-exclusion',
      scope: 'exclude Hermes from production provider claims until target provider architecture and target-boundary live validation are approved',
      requiredEvidence: 'target Hermes provider architecture evidence with endpoint ownership proof for approved base URL alias, endpoint owner, network boundary, transport, availability owner, and health check result; HERMES_PROVIDER_MODEL model pinning proof with model version/source, compatibility profile, max token policy, fallback model, and owner approval; target secret injection proof with approved secret manager platform, API key requirement decision, runtime injection, rotation/revocation event, break-glass governance, secret access audit, and leakage review; Hermes tool-call parsing proof with <tool_call> sample, malformed-call behavior, execution boundary decision, audit record, and no-unapproved-tool-execution evidence; session lifecycle proof with mission id, execution session id, provider response id, retry lineage, artifact provenance, and handoff reference; data and transcript policy proof with prompt data class, provider transcript retention, customer data approval, delete request route, and post-delete absence evidence; quota and rate guard proof with concurrency limit, timeout, retry policy, cost owner, usage envelope, saturation fallback, and spend review; telemetry proof with probe result, model availability, run duration, retry count, failureKind taxonomy, usage metrics, alert route, and incident owner; fallback and stop-condition proof with fallback provider, fallback policy id, stop reason, degraded mode, customer impact rule, manual approval path, rollback owner, residual risk decision, and recoverable-provider-failure-only stop evidence; customer approval proof with provider terms, allowed workspace/customer, data-processing approval, support owner, evidence owner, and next review date; target-boundary live validation proof with npm run live:execution-v1:hermes; provider operations proof with fallback runtime audit policy and stop reason, telemetry, incident triage, data transcript handling, remediation renewal evidence, and provider failure containment; release artifact hygiene result; and regenerated execution snapshot evidence',
      allowedClaimText: 'Hermes is not included in production provider readiness',
      stopCondition: 'target-hermes-provider-approval-missing',
    },
    {
      exceptionId: 'local-provider-pilot-only',
      scope: 'allow local provider only for approved pilot/local-first use while production provider approval remains blocked',
      requiredEvidence: 'target local provider architecture evidence with endpoint ownership proof for approved base URL alias, runtime owner, network boundary, transport, availability owner, health check result, and customer approval; LOCAL_PROVIDER_MODEL model pinning proof with model source/version, compatibility profile, max token policy, fallback model, and owner approval; network isolation proof with host boundary, ingress policy, egress policy, tenant/customer boundary, operator access policy, and firewall decision; secret and credential policy proof with auth mode, API key requirement decision, approved secret manager platform when credentials are used, runtime injection, rotation/revocation event, leakage review, and secret access audit; runtime lifecycle proof with process manager, startup command, health endpoint, restart policy, resource limits, and log retention; session and artifact provenance proof with mission id, execution session id, provider response id or equivalent, retry lineage, artifact provenance, and handoff reference; data residency and transcript policy proof with prompt data class, local storage path alias, transcript retention, customer data approval, delete request route, and post-delete absence evidence; quota and resource guard proof with CPU/GPU/memory envelope, concurrency limit, timeout, retry policy, saturation fallback, and resource owner approval; telemetry proof with probe result, model availability, run duration, retry count, failureKind taxonomy, usage/resource metrics, alert route, and incident owner; fallback and customer approval proof with fallback provider, fallback policy id, stop reason, degraded mode, customer impact rule, manual approval path, provider terms/local model license decision, and residual risk owner; target-boundary local live validation proof with npm run live:execution-v1:local; provider operations proof with fallback runtime audit policy and stop reason, telemetry, incident triage, data transcript handling, remediation renewal evidence, and provider failure containment; release artifact hygiene result; regenerated execution snapshot evidence; and customer acceptance',
      allowedClaimText: 'local provider is pilot/local-only and not production-approved',
      stopCondition: 'target-local-provider-approval-missing',
    },
    {
      exceptionId: 'hosted-identity-session-blocked',
      scope: 'block hosted SaaS identity/session claims until customer IdP metadata, lifecycle, session revocation, delegated role administration, permission propagation, immutable audit export, break-glass, support impersonation, compliance retention, and customer access containment evidence are accepted',
      requiredEvidence: 'hosted identity/session architecture approval proof, customer IdP onboarding proof with metadata alias, issuer, audience, JWKS rotation owner, fallback owner, and customer approval, user lifecycle proof with provision, invitation, suspension, recovery, deprovision, tenant mapping, and orphan account review, session lifecycle proof with login, refresh, expiry, logout, revocation, idle timeout, device inventory, and re-auth, role administration proof with persistent assignment, revocation, delegated admin approval, separation-of-duties, and rollback, permission propagation proof across API, worker, agent, support, observability, cache invalidation, and stale permission denial, immutable audit export proof with actor, subject, tenant, role, session, reason, before/after state, timestamp, and checksum, break-glass governance proof with owner, approver, scope, expiry, monitoring, customer notification, revocation, and post-use review, support impersonation proof with approval, scoped session, action log, customer-safe update, denial tests, expiry, and closure, compliance and retention proof with identity log retention, legal hold, audit export, privacy deletion, post-delete absence, and customer handoff, migration plan proof, rollback proof, lockout recovery proof, customer access containment proof, release artifact hygiene result, and regenerated execution snapshot evidence',
      allowedClaimText: 'local identity/session controls only; hosted identity/session claims remain blocked',
      stopCondition: 'hosted-identity-session-approval-missing',
    },
    {
      exceptionId: 'hosted-tenant-isolation-blocked',
      scope: 'block hosted multi-tenant isolation claims until tenant identity source ownership, customer organization mapping, tenant lifecycle, authorization propagation, storage/index partitioning, encryption key custody, backup/restore non-interference, tenant administration audit, cross-surface denial, support/observability visibility, lifecycle controls, and tenant data containment evidence are accepted',
      requiredEvidence: 'hosted tenant isolation architecture approval proof, tenant identity source proof with source owner, customer organization mapping proof, tenant lifecycle owner, trust policy, source approval, and orphan tenant review, tenant-scoped authorization proof with permission policy, service-to-service tenant propagation proof, stale permission denial, delegated admin boundary, and denial owner, storage partitioning proof for runtime state and artifact/memory/search/export/index partitioning proof with schema/bucket/keyspace boundary and migration safety, per-tenant encryption/key ownership proof with key owner, rotation, revocation, escrow, break-glass, access audit, and key custody decision, backup/restore isolation proof with tenant-scoped backup selection, restore authorization, integrity result, other-tenant non-interference, post-restore denial, backup owner, and restore rollback route, tenant administration proof with create, suspend, restore, delete, role delegation, customer approval, audit history, rollback route, tenant admin owner, and approval expiry, cross-tenant denial proof across API, storage, memory, search, export, delete, backup, support, and observability, observability/support isolation proof with tenant-scoped logs, traces, alerts, support ticket visibility, incident review, customer status routing, evidence export, support owner, and retention class, lifecycle isolation proof with retention, export, delete, provider transcript, legal hold, backup expiry, post-delete absence, lifecycle owner, and exception policy, tenant data containment, release artifact hygiene result, and regenerated execution snapshot evidence',
      allowedClaimText: 'local tenant controls only; hosted multi-tenant isolation claims remain blocked',
      stopCondition: 'hosted-tenant-isolation-approval-missing',
    },
    {
      exceptionId: 'target-environment-evidence-pending',
      scope: 'keep productionReadyClaim false until target evidence capture, submission packet, command rerun, reviewer decision, disposition, and release refresh evidence are accepted',
      requiredEvidence: 'completed target evidence capture template, sanitized submission packet, boundary consistency map, command rerun log, reviewer decision, blocker disposition register, release refresh evidence, and production readiness gate result',
      allowedClaimText: 'provider-scoped pilot ready only; production-ready remains blocked',
      stopCondition: 'target-environment-evidence-missing',
    },
    {
      exceptionId: 'customer-specific-exception',
      scope: '<required customer-approved scope; must be narrower than production-ready>',
      requiredEvidence: 'explicit exception owner, customer-approved scope, expiry date, compensating control, allowed claim text, next review date, release readiness note, and regenerated release artifacts',
      allowedClaimText: '<required allowed claim text; cannot state or imply production-ready>',
      stopCondition: 'customer-exception-scope-missing',
    },
  ];
  const exceptionRows = exceptionDefinitions.flatMap((item, index) => [
    `${index + 1}. ${item.exceptionId}`,
    `   - acceptedScope: ${item.scope}`,
    `   - requiredEvidence: ${item.requiredEvidence}`,
    `   - allowedClaimText: ${item.allowedClaimText}`,
    `   - stopCondition: ${item.stopCondition}`,
    '   - exceptionOwner: <required accountable owner>',
    '   - reviewer: <required reviewer or approval team>',
    '   - approvalStatus: draft | submitted | accepted-with-scope | rejected | expired',
    '   - expiryDate: <required YYYY-MM-DD>',
    '   - nextReviewDate: <required YYYY-MM-DD>',
    '   - compensatingControl: <required compensating control or none>',
    '   - releaseReadinessNote: <required note for docs/release-readiness-v1.md>',
  ]);
  const visibleExceptionRows = visibleActions.length
    ? visibleActions.flatMap((item, index) => [
        `${index + 1}. ${String(item.blocker || item.stopReason || 'current open blocker').trim()}`,
        `   - blockerId: ${String(item.id || '').trim() || 'unknown'}`,
        `   - provider: ${String(item.provider || '').trim() || 'none'}`,
        `   - category: ${String(item.category || 'stop-condition').trim()}`,
        `   - owner: ${String(item.owner || 'release-owner').trim()}`,
        `   - currentState: ${String(item.status || 'blocked').trim()}`,
        `   - requiredClosingEvidence: ${String(item.nextEvidence || '').trim() || 'not recorded'}`,
        '   - exceptionDisposition: none | accepted-scope-required | rejected | expired',
        '   - claimImpact: exception cannot broaden the claim beyond explicitly accepted scope',
      ])
    : ['- none'];
  const residualBlockerLines = productionBlockers.length
    ? productionBlockers.map((item, index) => `${index + 1}. ${String(item || '').trim()}`)
    : ['- none'];
  const requiredCommands = [
    'npm run smoke:target-environment-evidence-intake',
    'npm run smoke:release-artifact-hygiene',
    'npm run refresh:execution-v1-artifacts',
    'npm run smoke:execution-v1-status',
    'npm run smoke:execution-v1-snapshot',
    'npm run smoke:production-readiness-gate',
  ];
  const lines = [
    'Target evidence accepted-scope exception register',
    `- category: ${normalizedCategory || 'all'}`,
    `- owner: ${normalizedOwner || 'all'}`,
    `- provider: ${normalizedProvider || 'all'}`,
    `- includeSharedProviderOperations: ${String(includeShared !== false)}`,
    `- sharedProviderOperationsScope: ${getReleaseSharedProviderOperationsScopeReason({ includeShared, provider: normalizedProvider })}`,
    ...buildReleaseSharedProviderOperationsScopeAuditLines({
      totalActions: allActions,
      category: normalizedCategory,
      includeShared,
      owner: normalizedOwner,
      provider: normalizedProvider,
    }),
    `- sourceCommit: ${sourceCommit}`,
    `- visibleCurrentBlockers: ${visibleActions.length}/${allActions.length}`,
    `- exceptionRowCount: ${exceptionDefinitions.length}`,
    `- productionReadyStatus: ${summary.productionReadyStatus || releaseReadiness.productionReadyStatus || 'not tracked'}`,
    `- productionReadyBlocked: ${String(Boolean(summary.productionReadyBlocked ?? releaseReadiness.productionReadyBlocked ?? true))}`,
    `- productionBlockerCount: ${summary.productionBlockerCount ?? releaseReadiness.productionBlockerCount ?? productionBlockers.length}`,
    `- productionReadyStopReason: ${summary.productionReadyStopReason || releaseReadiness.productionReadyStopReason || 'not recorded'}`,
    `- releaseLink: ${releaseLink}`,
    `- releaseBlockerApiLink: ${releaseBlockerApiLink}`,
    '',
    'Accepted-scope exception rows:',
    ...exceptionRows,
    '',
    'Visible blocker exception cross-check:',
    ...visibleExceptionRows,
    '',
    'Residual production blockers:',
    ...residualBlockerLines,
    '',
    'Required exception verification commands:',
    ...requiredCommands.map((command) => `- ${command}`),
    '',
    'Exception register rules:',
    '- This register records accepted-scope exceptions only; it is not a waiver and not production-ready approval.',
    '- accepted-with-scope requires exception owner, customer-approved scope, expiry date, compensating control, allowed claim text, next review date, and regenerated release readiness evidence.',
    '- An exception cannot convert a blocked production-ready claim into production-ready and cannot remove target evidence, command rerun, release refresh, artifact hygiene, or production readiness gate requirements.',
    '- Expired, ownerless, unreviewed, or stale exceptions must keep the related blocker as a stop-condition.',
    '- Do not include raw API keys, tokens, private endpoint credentials, tenant payloads, customer personal data, billing identifiers, private tenant identifiers, raw provider account ids, or machine-local absolute paths.',
    '- Keep productionReadyClaim=false until every mandatory target control is accepted by target-boundary evidence and final gates pass.',
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseTargetEvidenceRiskDecisionRegisterText({
  blockerActions = getFilteredReleaseCurrentOpenBlockerActions(),
  totalActions = getReleaseCurrentOpenBlockerActions(),
  category = state.releaseBlockerCategoryFilter,
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
  releaseStatus = state.releaseStatus,
} = {}) {
  const visibleActions = Array.isArray(blockerActions) ? blockerActions : [];
  const allActions = Array.isArray(totalActions) ? totalActions : [];
  if (!releaseStatus || !allActions.length) {
    return '';
  }

  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const summary = releaseStatus.summary || {};
  const releaseReadiness = releaseStatus.releaseReadiness || {};
  const snapshot = releaseStatus.snapshot || {};
  const productionBlockers = getReleaseProductionBlockers(releaseStatus);
  const releaseLink = buildReleaseBlockerSliceUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const releaseBlockerApiLink = buildReleaseBlockerApiUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const sourceCommit = String(summary.sourceCommit || releaseStatus.commit || snapshot.verifiedCommit || '<required source commit>').trim()
    || '<required source commit>';
  const generatedArtifactCommit = String(summary.generatedArtifactCommit || snapshot.verifiedCommit || '<required artifact refresh commit>').trim()
    || '<required artifact refresh commit>';
  const riskDefinitions = [
    {
      riskId: 'anthropic-provider-unavailable',
      acceptedRisk: 'Anthropic is not included in the approved live provider scope until billing/credit remediation, target-boundary live validation, fallback policy stop reason, and provider operations proof are accepted for the same target boundary',
      rejectedClaims: 'live-provider-complete, production-ready, Anthropic production provider readiness',
      residualBlocker: 'anthropic-live-validation-missing-or-failed',
      requiredEvidence: 'target Anthropic provider account evidence with account ownership proof for account owner, organization/workspace alias, customer scope, evidence owner, reviewer, and review date; billing and credit remediation proof with active billing plan, available credit balance status, payment owner, renewal path, low-balance alert route, remediation ticket, and post-remediation live run reference; API key and secret injection proof with approved secret manager platform, ANTHROPIC_API_KEY owner, runtime injection, least-privilege policy, rotation/revocation event, secret access audit, break-glass governance, leakage review, and credential containment; ANTHROPIC_MODEL model access proof with model availability, region/workspace access, max token policy, fallback model, and owner approval; provider terms and customer approval proof with provider terms, data processing approval, allowed customer/workspace, transcript retention policy, support owner, and evidence owner; quota and spend guard proof with usage envelope, concurrency limit, timeout, retry policy, spend owner, saturation fallback, and budget review cadence; target-boundary live validation proof with npm run live:execution-v1:anthropic, mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference; fallback and stop-condition proof with fallback provider, fallback policy id, stop reason, degraded mode, customer impact rule, manual approval path, rollback owner, residual risk decision, and recoverable-provider-failure-only stop evidence; provider operations proof with provider inventory, fallback runtime audit policy and stop reason, telemetry, incident triage, data transcript handling, remediation renewal evidence, evidence retention, and provider failure containment; artifact hygiene result; and regenerated execution snapshot evidence',
    },
    {
      riskId: 'hermes-runtime-not-configured',
      acceptedRisk: 'Hermes remains excluded from provider readiness until endpoint/model/tool-call architecture proof, target-boundary live validation, fallback policy stop reason, and provider operations proof are accepted',
      rejectedClaims: 'Hermes provider ready, live-provider-complete, production-ready',
      residualBlocker: 'target-hermes-provider-approval-missing',
      requiredEvidence: 'target Hermes provider architecture evidence with endpoint ownership proof for approved base URL alias, endpoint owner, network boundary, transport, availability owner, and health check result; HERMES_PROVIDER_MODEL model pinning proof with model version/source, compatibility profile, max token policy, fallback model, and owner approval; target secret injection proof with approved secret manager platform, API key requirement decision, runtime injection, rotation/revocation event, break-glass governance, secret access audit, and leakage review; Hermes tool-call parsing proof with <tool_call> sample, malformed-call behavior, execution boundary decision, audit record, and no-unapproved-tool-execution evidence; session lifecycle proof with mission id, execution session id, provider response id, retry lineage, artifact provenance, and handoff reference; data and transcript policy proof with prompt data class, provider transcript retention, customer data approval, delete request route, and post-delete absence evidence; quota and rate guard proof with concurrency limit, timeout, retry policy, cost owner, usage envelope, saturation fallback, and spend review; telemetry proof with probe result, model availability, run duration, retry count, failureKind taxonomy, usage metrics, alert route, and incident owner; fallback and stop-condition proof with fallback provider, fallback policy id, stop reason, degraded mode, customer impact rule, manual approval path, rollback owner, residual risk decision, and recoverable-provider-failure-only stop evidence; customer approval proof with provider terms, allowed workspace/customer, data-processing approval, support owner, evidence owner, and next review date; target-boundary live validation proof with npm run live:execution-v1:hermes; provider operations proof with fallback runtime audit policy and stop reason, telemetry, incident triage, data transcript handling, remediation renewal evidence, and provider failure containment; and regenerated execution snapshot evidence',
    },
    {
      riskId: 'local-provider-pilot-scope',
      acceptedRisk: 'local provider can remain pilot/local-only but cannot be treated as production-approved without endpoint/model/network/data-residency architecture proof, target-boundary live validation, fallback policy stop reason, and customer acceptance evidence',
      rejectedClaims: 'local provider production-approved, production-ready',
      residualBlocker: 'target-local-provider-approval-missing',
      requiredEvidence: 'target local provider architecture evidence with endpoint ownership proof for approved base URL alias, runtime owner, network boundary, transport, availability owner, health check result, and customer approval; LOCAL_PROVIDER_MODEL model pinning proof with model source/version, compatibility profile, max token policy, fallback model, and owner approval; network isolation proof with host boundary, ingress policy, egress policy, tenant/customer boundary, operator access policy, and firewall decision; secret and credential policy proof with auth mode, API key requirement decision, approved secret manager platform when credentials are used, runtime injection, rotation/revocation event, leakage review, and secret access audit; runtime lifecycle proof with process manager, startup command, health endpoint, restart policy, resource limits, and log retention; session and artifact provenance proof with mission id, execution session id, provider response id or equivalent, retry lineage, artifact provenance, and handoff reference; data residency and transcript policy proof with prompt data class, local storage path alias, transcript retention, customer data approval, delete request route, and post-delete absence evidence; quota and resource guard proof with CPU/GPU/memory envelope, concurrency limit, timeout, retry policy, saturation fallback, and resource owner approval; telemetry proof with probe result, model availability, run duration, retry count, failureKind taxonomy, usage/resource metrics, alert route, and incident owner; fallback and customer approval proof with fallback provider, fallback policy id, stop reason, degraded mode, customer impact rule, manual approval path, provider terms/local model license decision, and residual risk owner; target-boundary local live validation proof with npm run live:execution-v1:local; provider operations proof with fallback runtime audit policy and stop reason, telemetry, incident triage, data transcript handling, remediation renewal evidence, and provider failure containment; release artifact hygiene result; regenerated execution snapshot evidence; and customer acceptance',
    },
    {
      riskId: 'hosted-identity-session-gap',
      acceptedRisk: 'local identity/session controls do not prove hosted identity/session administration for a customer production deployment',
      rejectedClaims: 'hosted SaaS ready, hosted identity/session ready, production-ready',
      residualBlocker: 'hosted-identity-session-approval-missing',
      requiredEvidence: 'hosted identity/session architecture approval and target identity/session operations evidence with customer IdP metadata, lifecycle, session revocation, delegated admin, permission propagation, immutable audit export, break-glass, support impersonation, compliance retention, and customer access containment proof',
    },
    {
      riskId: 'hosted-tenant-isolation-gap',
      acceptedRisk: 'local tenant controls do not prove hosted tenant storage, authorization, encryption, lifecycle, backup/restore, observability, or support isolation',
      rejectedClaims: 'hosted multi-tenant isolation ready, tenant-isolated production, production-ready',
      residualBlocker: 'hosted-tenant-isolation-approval-missing',
      requiredEvidence: 'hosted tenant isolation architecture approval and target tenant isolation operations evidence',
    },
    {
      riskId: 'target-environment-evidence-pending',
      acceptedRisk: 'target environment evidence packet is incomplete until capture template, sanitized packet, command rerun evidence, reviewer decision, blocker disposition, and release refresh evidence are accepted',
      rejectedClaims: 'production-ready, customer deployment complete, clean production deployment ready',
      residualBlocker: 'target-environment-evidence-missing',
      requiredEvidence: 'completed target evidence packet, production readiness gate result, release artifact hygiene, and regenerated execution-v1 artifacts',
    },
    {
      riskId: 'customer-specific-exception-pending',
      acceptedRisk: 'customer-specific exception can be accepted only for a narrow scoped claim with owner, expiry, compensating control, next review date, and release readiness note',
      rejectedClaims: 'production-ready by exception, broad customer deployment approval',
      residualBlocker: 'customer-exception-scope-missing',
      requiredEvidence: 'exception owner, customer-approved scope, expiry date, compensating control, allowed claim text, next review date, release readiness note, and regenerated release artifacts',
    },
  ];
  const riskRows = riskDefinitions.flatMap((item, index) => [
    `${index + 1}. ${item.riskId}`,
    `   - acceptedRisk: ${item.acceptedRisk}`,
    `   - rejectedClaims: ${item.rejectedClaims}`,
    `   - residualBlocker: ${item.residualBlocker}`,
    `   - requiredEvidence: ${item.requiredEvidence}`,
    '   - decision: still-blocked | accepted-with-scope | rejected | closed-after-evidence',
    '   - decisionOwner: <required accountable owner>',
    '   - evidenceOwner: <required evidence owner>',
    '   - reviewer: <required reviewer or approval team>',
    '   - reviewDate: <required YYYY-MM-DD>',
    '   - nextReviewDate: <required YYYY-MM-DD>',
    '   - allowedClaimText: <required claim text or none>',
    '   - releaseReadinessNote: <required docs/release-readiness-v1.md update note>',
  ]);
  const visibleRiskRows = visibleActions.length
    ? visibleActions.flatMap((item, index) => [
        `${index + 1}. ${String(item.blocker || item.stopReason || 'current open blocker').trim()}`,
        `   - blockerId: ${String(item.id || '').trim() || 'unknown'}`,
        `   - provider: ${String(item.provider || '').trim() || 'none'}`,
        `   - category: ${String(item.category || 'stop-condition').trim()}`,
        `   - owner: ${String(item.owner || 'release-owner').trim()}`,
        `   - currentState: ${String(item.status || 'blocked').trim()}`,
        `   - requiredClosingEvidence: ${String(item.nextEvidence || '').trim() || 'not recorded'}`,
        '   - acceptedRiskDecisionImpact: productionReadyClaim stays false unless this blocker is closed after target-boundary evidence and final gates pass',
      ])
    : ['- none'];
  const residualBlockerLines = productionBlockers.length
    ? productionBlockers.map((item, index) => `${index + 1}. ${String(item || '').trim()}`)
    : ['- none'];
  const requiredCommands = [
    'npm run smoke:target-environment-evidence-intake',
    'npm run smoke:production-readiness-gate',
    'npm run smoke:release-artifact-hygiene',
    'npm run refresh:execution-v1-artifacts',
    'npm run smoke:execution-v1-status',
    'npm run smoke:execution-v1-snapshot',
  ];
  const lines = [
    'Target evidence accepted risk decision register',
    `- category: ${normalizedCategory || 'all'}`,
    `- owner: ${normalizedOwner || 'all'}`,
    `- provider: ${normalizedProvider || 'all'}`,
    `- includeSharedProviderOperations: ${String(includeShared !== false)}`,
    `- sharedProviderOperationsScope: ${getReleaseSharedProviderOperationsScopeReason({ includeShared, provider: normalizedProvider })}`,
    ...buildReleaseSharedProviderOperationsScopeAuditLines({
      totalActions: allActions,
      category: normalizedCategory,
      includeShared,
      owner: normalizedOwner,
      provider: normalizedProvider,
    }),
    `- sourceCommit: ${sourceCommit}`,
    `- generatedArtifactCommit: ${generatedArtifactCommit}`,
    `- visibleCurrentBlockers: ${visibleActions.length}/${allActions.length}`,
    `- riskDecisionRowCount: ${riskDefinitions.length}`,
    `- productionReadyStatus: ${summary.productionReadyStatus || releaseReadiness.productionReadyStatus || 'not tracked'}`,
    `- productionReadyBlocked: ${String(Boolean(summary.productionReadyBlocked ?? releaseReadiness.productionReadyBlocked ?? true))}`,
    `- productionBlockerCount: ${summary.productionBlockerCount ?? releaseReadiness.productionBlockerCount ?? productionBlockers.length}`,
    `- productionReadyStopReason: ${summary.productionReadyStopReason || releaseReadiness.productionReadyStopReason || 'not recorded'}`,
    `- releaseLink: ${releaseLink}`,
    `- releaseBlockerApiLink: ${releaseBlockerApiLink}`,
    '',
    'Accepted risk decision rows:',
    ...riskRows,
    '',
    'Visible blocker accepted risk cross-check:',
    ...visibleRiskRows,
    '',
    'Residual production blockers:',
    ...residualBlockerLines,
    '',
    'Required risk decision verification commands:',
    ...requiredCommands.map((command) => `- ${command}`),
    '',
    'Production-ready claim decision:',
    '- defaultDecision: keep productionReadyClaim=false',
    '- allowedCurrentClaim: provider-scoped pilot ready for OpenAI-backed local-first path only when supported by current evidence',
    '- rejectedClaims: production-ready, hosted SaaS ready, live-provider-complete, tenant-isolated production, clean production deployment ready, staffed support ready',
    '- claimUpgradeRule: only after every target stop-condition is closed by accepted target-boundary evidence, release artifacts are regenerated, release artifact hygiene passes, and production readiness gate passes',
    '',
    'Accepted risk decision rules:',
    '- This register records risk decisions and claim boundaries; it is not production-ready approval.',
    '- accepted-with-scope requires explicit allowed claim text, decision owner, evidence owner, reviewer, review date, next review date, residual blocker list, and release readiness note.',
    '- closed-after-evidence requires fresh target-boundary evidence, command rerun evidence, release artifact hygiene, regenerated execution-v1 artifacts, and production readiness gate evidence.',
    '- Missing, stale, ownerless, or unreviewed risk decisions keep the related blocker as a stop-condition.',
    '- Do not include raw API keys, tokens, private endpoint credentials, tenant payloads, customer personal data, billing identifiers, private tenant identifiers, raw provider account ids, or machine-local absolute paths.',
    '- Keep productionReadyClaim=false until every mandatory target control is accepted by target-boundary evidence and final gates pass.',
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseTargetEvidenceProviderEvidenceReferencesText({
  blockerActions = getFilteredReleaseCurrentOpenBlockerActions(),
  totalActions = getReleaseCurrentOpenBlockerActions(),
  category = state.releaseBlockerCategoryFilter,
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
  releaseStatus = state.releaseStatus,
} = {}) {
  const visibleActions = Array.isArray(blockerActions) ? blockerActions : [];
  const allActions = Array.isArray(totalActions) ? totalActions : [];
  if (!releaseStatus || !allActions.length) {
    return '';
  }

  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const summary = releaseStatus.summary || {};
  const releaseReadiness = releaseStatus.releaseReadiness || {};
  const snapshot = releaseStatus.snapshot || {};
  const providerReadiness = Array.isArray(releaseStatus.providerReadiness)
    ? releaseStatus.providerReadiness
    : [];
  const productionBlockers = getReleaseProductionBlockers(releaseStatus);
  const releaseLink = buildReleaseBlockerSliceUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const releaseBlockerApiLink = buildReleaseBlockerApiUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const sourceCommit = String(summary.sourceCommit || releaseStatus.commit || snapshot.verifiedCommit || '<required source commit>').trim()
    || '<required source commit>';
  const generatedArtifactCommit = String(summary.generatedArtifactCommit || snapshot.verifiedCommit || '<required artifact refresh commit>').trim()
    || '<required artifact refresh commit>';
  const docLink = (docPath) => {
    const normalizedPath = String(docPath || '').trim();
    if (!normalizedPath) {
      return '';
    }
    return `${normalizedPath} (${getAbsoluteReleaseUrl(`/api/execution-v1/release-doc?path=${encodeURIComponent(normalizedPath)}`)})`;
  };
  const providerRows = providerReadiness.length
    ? providerReadiness.flatMap((item, index) => {
        const provider = String(item.provider || '').trim();
        const preflight = state.releasePreflightResults?.[provider] || null;
        const preflightStatus = String(preflight?.status || 'not-run').trim();
        const archivedLiveStatus = getReleaseProviderLiveStatus(provider, releaseStatus) || 'not archived';
        const liveCommand = getProviderLiveCommand(item, preflight) || item.command || `npm run live:execution-v1:${provider}`;
        const linkedBlockers = getReleaseProviderBlockerActions({ provider, releaseStatus });
        const linkedBlockerIds = linkedBlockers
          .map((action) => String(action.id || '').trim())
          .filter(Boolean);
        const linkedSharedBlockerIds = linkedBlockers
          .filter((action) => isReleaseSharedProviderBlockerAction(action))
          .map((action) => String(action.id || '').trim())
          .filter(Boolean);
        const linkedClosureVerificationIds = Array.isArray(item.blockerClosureVerification?.closureVerificationIds)
          ? item.blockerClosureVerification.closureVerificationIds
          : linkedBlockers
            .map((action) => String(getReleaseBlockerClosureVerification(action).id || '').trim())
            .filter(Boolean);
        const linkedRequiredProofCount = Number.isFinite(Number(item.blockerClosureVerification?.requiredProofCount))
          ? Number(item.blockerClosureVerification.requiredProofCount)
          : new Set(linkedBlockers.flatMap((action) => getReleaseBlockerRequiredProofs(action))).size;
        const visibleLinkedBlockerIds = linkedBlockers
          .filter((action) => visibleActions.some((visibleAction) =>
            String(visibleAction.id || '').trim() === String(action.id || '').trim()))
          .map((action) => String(action.id || '').trim())
          .filter(Boolean);
        const evidenceDocs = getReleaseProviderReadinessEvidenceDocs(provider)
          .map((doc) => docLink(doc.path))
          .filter(Boolean);
        return [
          `${index + 1}. ${String(item.label || provider || 'provider').trim()}`,
          `   - provider: ${provider || 'unknown'}`,
          `   - providerLink: ${buildReleaseProviderReadinessUrl(provider)}`,
          `   - envKey: ${String(item.envKey || '').trim() || 'not recorded'}`,
          `   - envReady: ${String(Boolean(item.ready))}`,
          `   - readinessStatus: ${String(item.status || 'unknown').trim()}`,
          `   - preflightStatus: ${preflightStatus}`,
          `   - preflightStopCondition: ${String(preflight?.stopConditionId || preflight?.stopCondition?.id || 'not-run').trim()}`,
          `   - targetStopCondition: ${String(preflight?.targetStopConditionId || preflight?.stopCondition?.targetStopConditionId || 'not recorded').trim()}`,
          `   - stopReason: ${String(preflight?.stopReason || preflight?.stopCondition?.reason || 'not recorded').trim()}`,
          `   - archivedLiveStatus: ${archivedLiveStatus}`,
          `   - linkedCurrentBlockers: ${linkedBlockerIds.length ? linkedBlockerIds.join(', ') : 'none'}`,
          `   - linkedSharedBlockers: ${linkedSharedBlockerIds.length ? linkedSharedBlockerIds.join(', ') : 'none'}`,
          `   - linkedClosureVerifications: ${linkedClosureVerificationIds.length ? linkedClosureVerificationIds.join(', ') : 'none'}`,
          `   - linkedRequiredProofCount: ${String(linkedRequiredProofCount)}`,
          `   - linkedVisibleBlockers: ${visibleLinkedBlockerIds.length ? visibleLinkedBlockerIds.join(', ') : 'none in current slice'}`,
          `   - preflightCommand: ${String(item.preflightCommand || '').trim() || `npm run preflight:execution-v1:${provider}`}`,
          `   - liveCommand: ${String(liveCommand || '').trim() || 'not recorded'}`,
          `   - evidenceCommand: ${String(preflight?.evidenceCommand || item.evidenceCommand || '').trim() || `node scripts/build-execution-v1-evidence.mjs --live-${provider}`}`,
          `   - requiredClosingEvidence: ${String(preflight?.requiredClosingEvidence || preflight?.stopCondition?.requiredClosingEvidence || 'target provider evidence packet, release artifact hygiene, and regenerated execution-v1 artifacts').trim()}`,
          `   - evidenceDocs: ${evidenceDocs.length ? evidenceDocs.join(' | ') : 'none'}`,
          '   - targetBoundaryRequirement: provider boundary proof with provider id, inclusion decision, account or architecture approval, approved secret manager platform, runtime injection, secret access audit log, target-boundary live validation command/result/archive, fallback runtime audit policy and stop reason, recoverable-provider-failure-only stop condition, provider operations packet, blocker closure proof, artifact hygiene result, and refreshed execution-v1 snapshot must all match the claimed target boundary',
          '   - productionClaimImpact: provider cannot be included in a production-ready or live-provider-complete claim unless linked blockers are closed by target-boundary evidence and final gates pass',
        ];
      })
    : ['- none'];
  const providerBlockers = getUniqueReleaseProviderBlockerActions(providerReadiness.flatMap((item) =>
    getReleaseProviderBlockerActions({
      provider: String(item.provider || '').trim(),
      releaseStatus,
    }),
  ));
  const providerBlockerRows = providerBlockers.length
    ? providerBlockers.flatMap((item, index) => {
        const commands = Array.isArray(item.commands) ? item.commands : [];
        const evidenceDocs = Array.isArray(item.evidenceDocs) ? item.evidenceDocs : [];
        return [
          `${index + 1}. ${String(item.blocker || item.stopReason || 'provider blocker').trim()}`,
          `   - blockerId: ${String(item.id || '').trim() || 'unknown'}`,
          `   - provider: ${String(item.provider || '').trim() || 'none'}`,
          `   - category: ${String(item.category || 'stop-condition').trim()}`,
          `   - owner: ${String(item.owner || 'release-owner').trim()}`,
          `   - currentState: ${String(item.status || 'blocked').trim()}`,
          `   - stopReason: ${String(item.stopReason || item.blocker || '').trim() || 'not recorded'}`,
          `   - requiredClosingEvidence: ${String(item.nextEvidence || '').trim() || 'not recorded'}`,
          `   - verificationCommands: ${commands.map((command) => String(command.command || '').trim()).filter(Boolean).join(' | ') || 'none'}`,
          `   - evidenceDocs: ${evidenceDocs.map((doc) => String(doc.path || doc.label || '').trim()).filter(Boolean).join(' | ') || 'none'}`,
          '   - providerReferenceImpact: keep the provider as blocked until target provider evidence intake proof, target provider operations proof, provider blocker disposition, fallback policy, stop reason, recoverable-provider-failure-only decision, telemetry/incident evidence, data transcript handling, remediation/renewal evidence, and release artifact refresh are accepted',
        ];
      })
    : ['- none'];
  const residualBlockerLines = productionBlockers.length
    ? productionBlockers.map((item, index) => `${index + 1}. ${String(item || '').trim()}`)
    : ['- none'];
  const requiredCommands = [
    'npm run smoke:target-provider-evidence-intake',
    'npm run smoke:target-provider-operations',
    'npm run smoke:production-provider-readiness',
    'npm run smoke:production-readiness-gate',
    'npm run smoke:release-artifact-hygiene',
    'npm run refresh:execution-v1-artifacts',
    'npm run smoke:execution-v1-status',
  ];
  const lines = [
    'Target evidence provider evidence references',
    `- category: ${normalizedCategory || 'all'}`,
    `- owner: ${normalizedOwner || 'all'}`,
    `- provider: ${normalizedProvider || 'all'}`,
    `- includeSharedProviderOperations: ${String(includeShared !== false)}`,
    `- sharedProviderOperationsScope: ${getReleaseSharedProviderOperationsScopeReason({ includeShared, provider: normalizedProvider })}`,
    ...buildReleaseSharedProviderOperationsScopeAuditLines({
      totalActions: allActions,
      category: normalizedCategory,
      includeShared,
      owner: normalizedOwner,
      provider: normalizedProvider,
    }),
    `- sourceCommit: ${sourceCommit}`,
    `- generatedArtifactCommit: ${generatedArtifactCommit}`,
    `- visibleCurrentBlockers: ${visibleActions.length}/${allActions.length}`,
    `- providerReferenceCount: ${providerReadiness.length}`,
    `- providerBlockerReferenceCount: ${providerBlockers.length}`,
    `- productionReadyStatus: ${summary.productionReadyStatus || releaseReadiness.productionReadyStatus || 'not tracked'}`,
    `- productionReadyBlocked: ${String(Boolean(summary.productionReadyBlocked ?? releaseReadiness.productionReadyBlocked ?? true))}`,
    `- productionBlockerCount: ${summary.productionBlockerCount ?? releaseReadiness.productionBlockerCount ?? productionBlockers.length}`,
    `- productionReadyStopReason: ${summary.productionReadyStopReason || releaseReadiness.productionReadyStopReason || 'not recorded'}`,
    `- releaseLink: ${releaseLink}`,
    `- releaseBlockerApiLink: ${releaseBlockerApiLink}`,
    '',
    'Provider evidence reference rows:',
    ...providerRows,
    '',
    'Provider blocker reference rows:',
    ...providerBlockerRows,
    '',
    'Required provider evidence reference docs:',
    `- ${docLink('docs/production-provider-readiness-v1.md')}`,
    `- ${docLink('docs/target-provider-evidence-intake-v1.md')}`,
    `- ${docLink('docs/target-provider-operations-v1.md')}`,
    `- ${docLink('docs/target-openai-provider-account-v1.md')}`,
    `- ${docLink('docs/target-anthropic-provider-account-v1.md')}`,
    `- ${docLink('docs/target-local-provider-architecture-v1.md')}`,
    `- ${docLink('docs/target-hermes-provider-architecture-v1.md')}`,
    '',
    'Required provider evidence verification commands:',
    ...requiredCommands.map((command) => `- ${command}`),
    '',
    'Residual production blockers:',
    ...residualBlockerLines,
    '',
    'Provider evidence reference rules:',
    '- This reference list is a provider evidence handoff, not provider approval or production-ready approval.',
    '- A provider row must not be used in a production-ready claim unless env readiness, provider evidence intake proof, target-boundary live validation proof, provider account or architecture approval proof, approved secret manager platform proof, runtime injection proof, secret access audit log proof, provider operations proof, fallback runtime audit proof with policy and stop reason, recoverable-provider-failure-only stop condition proof, blocker closure proof, telemetry and incident evidence, data transcript handling evidence, remediation and renewal evidence, artifact hygiene result, and refreshed execution-v1 artifacts are all accepted for the same target boundary.',
    '- Missing env, stale live validation, archived local-only proof, unapproved account or architecture, missing provider blocker disposition, or missing release refresh evidence keeps the provider as a stop-condition.',
    '- Do not include raw API keys, tokens, private endpoint credentials, raw account ids, endpoint credentials, tenant payloads, customer personal data, billing identifiers, private tenant identifiers, or machine-local absolute paths.',
    '- Keep productionReadyClaim=false until every provider included in the target claim is approved by target-boundary evidence and all final gates pass.',
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseTargetEvidenceResidualBlockersText({
  blockerActions = getFilteredReleaseCurrentOpenBlockerActions(),
  totalActions = getReleaseCurrentOpenBlockerActions(),
  category = state.releaseBlockerCategoryFilter,
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
  releaseStatus = state.releaseStatus,
} = {}) {
  const visibleActions = Array.isArray(blockerActions) ? blockerActions : [];
  const allActions = Array.isArray(totalActions) ? totalActions : [];
  if (!releaseStatus || !allActions.length) {
    return '';
  }

  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const summary = releaseStatus.summary || {};
  const releaseReadiness = releaseStatus.releaseReadiness || {};
  const snapshot = releaseStatus.snapshot || {};
  const productionBlockers = getReleaseProductionBlockers(releaseStatus);
  const releaseLink = buildReleaseBlockerSliceUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const releaseBlockerApiLink = buildReleaseBlockerApiUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const sourceCommit = String(summary.sourceCommit || releaseStatus.commit || snapshot.verifiedCommit || '<required source commit>').trim()
    || '<required source commit>';
  const generatedArtifactCommit = String(summary.generatedArtifactCommit || snapshot.verifiedCommit || '<required artifact refresh commit>').trim()
    || '<required artifact refresh commit>';
  const docLink = (docPath) => {
    const normalizedPath = String(docPath || '').trim();
    if (!normalizedPath) {
      return '';
    }
    return `${normalizedPath} (${getAbsoluteReleaseUrl(`/api/execution-v1/release-doc?path=${encodeURIComponent(normalizedPath)}`)})`;
  };
  const residualRows = productionBlockers.length
    ? productionBlockers.flatMap((item, index) => [
        `${index + 1}. ${String(item || '').trim()}`,
        `   - blockerIndex: ${index + 1}/${productionBlockers.length}`,
        '   - currentDisposition: still-blocking',
        '   - productionReadyClaimDecision: keep productionReadyClaim=false',
        '   - requiredClosingEvidence: target-boundary evidence, blocker disposition update, command rerun evidence, release artifact hygiene, regenerated execution-v1 artifacts, and production readiness gate pass',
        '   - stopConditionImpact: this blocker prevents production-ready, hosted SaaS ready, tenant-isolated production, clean production deployment ready, staffed support ready, and live-provider-complete claims unless explicitly closed by accepted evidence',
        '   - evidenceOwner: <required evidence owner>',
        '   - decisionOwner: <required accountable owner>',
        '   - reviewer: <required reviewer or approval team>',
        '   - reviewDate: <required YYYY-MM-DD>',
        '   - nextAction: close-after-evidence | keep-blocked | accepted-with-narrow-scope',
        '   - releaseReadinessNote: <required docs/release-readiness-v1.md update note>',
      ])
    : ['- none'];
  const visibleBlockerRows = visibleActions.length
    ? visibleActions.flatMap((item, index) => {
        const commands = Array.isArray(item.commands) ? item.commands : [];
        const evidenceDocs = Array.isArray(item.evidenceDocs) ? item.evidenceDocs : [];
        return [
          `${index + 1}. ${String(item.blocker || item.stopReason || 'current open blocker').trim()}`,
          `   - blockerId: ${String(item.id || '').trim() || 'unknown'}`,
          `   - provider: ${String(item.provider || '').trim() || 'none'}`,
          `   - category: ${String(item.category || 'stop-condition').trim()}`,
          `   - owner: ${String(item.owner || 'release-owner').trim()}`,
          `   - status: ${String(item.status || 'blocked').trim()}`,
          `   - stopReason: ${String(item.stopReason || item.blocker || '').trim() || 'not recorded'}`,
          `   - requiredClosingEvidence: ${String(item.nextEvidence || '').trim() || 'not recorded'}`,
          `   - verificationCommands: ${commands.map((command) => String(command.command || '').trim()).filter(Boolean).join(' | ') || 'none'}`,
          `   - evidenceDocs: ${evidenceDocs.map((doc) => String(doc.path || doc.label || '').trim()).filter(Boolean).join(' | ') || 'none'}`,
          '   - residualBlockerImpact: keep related production blocker open until evidence closes the linked stop-condition',
        ];
      })
    : ['- none'];
  const requiredDocs = [
    'docs/release-readiness-v1.md',
    'docs/target-environment-evidence-intake-v1.md',
    'docs/target-provider-evidence-intake-v1.md',
    'docs/target-provider-operations-v1.md',
    'docs/execution-v1-evidence.md',
    'docs/execution-v1-closeout.md',
    'docs/execution-v1-handoff.md',
    'docs/pilot-export-package-v1.md',
    'docs/production-provider-readiness-v1.md',
  ];
  const requiredCommands = [
    'npm run smoke:target-environment-evidence-intake',
    'npm run smoke:target-provider-evidence-intake',
    'npm run smoke:target-provider-operations',
    'npm run smoke:production-provider-readiness',
    'npm run smoke:production-readiness-gate',
    'npm run smoke:release-artifact-hygiene',
    'npm run refresh:execution-v1-artifacts',
    'npm run smoke:execution-v1-status',
    'npm run smoke:execution-v1-snapshot',
  ];
  const lines = [
    'Target evidence residual production blocker guard',
    `- category: ${normalizedCategory || 'all'}`,
    `- owner: ${normalizedOwner || 'all'}`,
    `- provider: ${normalizedProvider || 'all'}`,
    `- includeSharedProviderOperations: ${String(includeShared !== false)}`,
    `- sharedProviderOperationsScope: ${getReleaseSharedProviderOperationsScopeReason({ includeShared, provider: normalizedProvider })}`,
    ...buildReleaseSharedProviderOperationsScopeAuditLines({
      totalActions: allActions,
      category: normalizedCategory,
      includeShared,
      owner: normalizedOwner,
      provider: normalizedProvider,
    }),
    `- sourceCommit: ${sourceCommit}`,
    `- generatedArtifactCommit: ${generatedArtifactCommit}`,
    `- visibleCurrentBlockers: ${visibleActions.length}/${allActions.length}`,
    `- residualProductionBlockerCount: ${productionBlockers.length}`,
    `- productionReadyStatus: ${summary.productionReadyStatus || releaseReadiness.productionReadyStatus || 'not tracked'}`,
    `- productionReadyBlocked: ${String(Boolean(summary.productionReadyBlocked ?? releaseReadiness.productionReadyBlocked ?? true))}`,
    `- productionReadyStopReason: ${summary.productionReadyStopReason || releaseReadiness.productionReadyStopReason || 'not recorded'}`,
    `- releaseLink: ${releaseLink}`,
    `- releaseBlockerApiLink: ${releaseBlockerApiLink}`,
    '',
    'Residual production blocker rows:',
    ...residualRows,
    '',
    'Visible current blocker cross-check:',
    ...visibleBlockerRows,
    '',
    'Required residual blocker evidence docs:',
    ...requiredDocs.map((docPath) => `- ${docLink(docPath)}`),
    '',
    'Required residual blocker verification commands:',
    ...requiredCommands.map((command) => `- ${command}`),
    '',
    'Production-ready claim guard:',
    '- defaultDecision: keep productionReadyClaim=false',
    '- allowedCurrentClaim: provider-scoped pilot ready for OpenAI-backed local-first path only when supported by current evidence',
    '- blockedClaims: production-ready, hosted SaaS ready, live-provider-complete, tenant-isolated production, clean production deployment ready, staffed support ready',
    '- claimUpgradeRule: only after every residual production blocker is closed by accepted target-boundary evidence, release artifacts are regenerated, release artifact hygiene passes, and production readiness gate passes',
    '',
    'Residual blocker guard rules:',
    '- This guard is the residual stop-condition list for target evidence review; it is not production-ready approval.',
    '- A blocker can be closed only with fresh target-boundary evidence, command rerun evidence, accepted reviewer decision, release artifact hygiene, regenerated execution-v1 artifacts, and production readiness gate evidence.',
    '- accepted-with-narrow-scope requires allowed claim text, explicit excluded claims, decision owner, evidence owner, reviewer, review date, next review date, and release readiness note.',
    '- Missing, stale, ownerless, or unreviewed residual blocker decisions keep productionReadyClaim=false.',
    '- Do not include raw API keys, tokens, private endpoint credentials, raw account ids, endpoint credentials, tenant payloads, customer personal data, billing identifiers, private tenant identifiers, or machine-local absolute paths.',
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseTargetEvidenceClosureRulesText({
  blockerActions = getFilteredReleaseCurrentOpenBlockerActions(),
  totalActions = getReleaseCurrentOpenBlockerActions(),
  category = state.releaseBlockerCategoryFilter,
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
  releaseStatus = state.releaseStatus,
} = {}) {
  const visibleActions = Array.isArray(blockerActions) ? blockerActions : [];
  const allActions = Array.isArray(totalActions) ? totalActions : [];
  if (!releaseStatus || !allActions.length) {
    return '';
  }

  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const summary = releaseStatus.summary || {};
  const releaseReadiness = releaseStatus.releaseReadiness || {};
  const snapshot = releaseStatus.snapshot || {};
  const productionBlockers = getReleaseProductionBlockers(releaseStatus);
  const releaseLink = buildReleaseBlockerSliceUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const releaseBlockerApiLink = buildReleaseBlockerApiUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const sourceCommit = String(summary.sourceCommit || releaseStatus.commit || snapshot.verifiedCommit || '<required source commit>').trim()
    || '<required source commit>';
  const generatedArtifactCommit = String(summary.generatedArtifactCommit || snapshot.verifiedCommit || '<required artifact refresh commit>').trim()
    || '<required artifact refresh commit>';
  const docLink = (docPath) => {
    const normalizedPath = String(docPath || '').trim();
    if (!normalizedPath) {
      return '';
    }
    return `${normalizedPath} (${getAbsoluteReleaseUrl(`/api/execution-v1/release-doc?path=${encodeURIComponent(normalizedPath)}`)})`;
  };
  const closureRules = [
    {
      ruleId: 'packet-boundary',
      rule: 'This packet is a target evidence review envelope, not production-ready approval',
      stopConditionImpact: 'productionReadyClaim remains false while any target stop-condition remains open',
      requiredEvidence: 'packet manifest, sanitized evidence register, boundary map, command rerun log, reviewer decision, blocker disposition register, release refresh evidence, and production readiness gate result',
    },
    {
      ruleId: 'sanitized-evidence-only',
      rule: 'Do not include raw API keys, tokens, private endpoint credentials, tenant payloads, customer personal data, billing identifiers, or machine-local absolute paths',
      stopConditionImpact: 'unsanitized evidence keeps the related blocker open and fails release artifact hygiene',
      requiredEvidence: 'repository-relative evidence path or sanitized external alias, redaction note, retention class, and sha256 or signed export reference',
    },
    {
      ruleId: 'accepted-disposition-proof',
      rule: 'Every accepted blocker disposition change must include fresh target-boundary command evidence, release artifact hygiene, regenerated execution-v1 artifacts, and reviewer decision',
      stopConditionImpact: 'missing command evidence, stale artifacts, or unreviewed disposition keeps the blocker as a stop-condition',
      requiredEvidence: 'target-boundary command output, reviewer decision, blocker disposition row, artifact refresh commit, hygiene pass, and snapshot pass',
    },
    {
      ruleId: 'production-claim-boundary',
      rule: 'Keep productionReadyClaim=false while any target environment, provider, identity/session, tenant isolation, observability/SLO, retention/backup, support, or clean deployment stop-condition remains open',
      stopConditionImpact: 'blocked claims include production-ready, hosted SaaS ready, live-provider-complete, tenant-isolated production, clean production deployment ready, and staffed support ready',
      requiredEvidence: 'all target controls accepted by target-boundary evidence, residual blocker count zero for the claimed scope, release artifact hygiene pass, regenerated execution-v1 artifacts, and production readiness gate pass',
    },
    {
      ruleId: 'accepted-narrow-scope',
      rule: 'accepted-with-scope requires allowed claim text, explicit excluded claims, decision owner, evidence owner, reviewer, review date, next review date, residual blockers, and release readiness note',
      stopConditionImpact: 'ownerless, expired, stale, or broad exception decisions keep productionReadyClaim=false',
      requiredEvidence: 'accepted-scope exception row, risk decision row, allowed claim text, reviewer approval, next review date, and release readiness update',
    },
  ];
  const closureRuleRows = closureRules.flatMap((item, index) => [
    `${index + 1}. ${item.ruleId}`,
    `   - rule: ${item.rule}`,
    `   - stopConditionImpact: ${item.stopConditionImpact}`,
    `   - requiredEvidence: ${item.requiredEvidence}`,
    '   - owner: <required accountable owner>',
    '   - reviewer: <required reviewer or approval team>',
    '   - evidenceDate: <required YYYY-MM-DD>',
    '   - status: pass | fail | stale | not-reviewed',
  ]);
  const visibleBlockerRows = visibleActions.length
    ? visibleActions.flatMap((item, index) => {
        const commands = Array.isArray(item.commands) ? item.commands : [];
        const evidenceDocs = Array.isArray(item.evidenceDocs) ? item.evidenceDocs : [];
        return [
          `${index + 1}. ${String(item.blocker || item.stopReason || 'current open blocker').trim()}`,
          `   - blockerId: ${String(item.id || '').trim() || 'unknown'}`,
          `   - provider: ${String(item.provider || '').trim() || 'none'}`,
          `   - category: ${String(item.category || 'stop-condition').trim()}`,
          `   - owner: ${String(item.owner || 'release-owner').trim()}`,
          `   - currentState: ${String(item.status || 'blocked').trim()}`,
          `   - requiredClosingEvidence: ${String(item.nextEvidence || '').trim() || 'not recorded'}`,
          `   - verificationCommands: ${commands.map((command) => String(command.command || '').trim()).filter(Boolean).join(' | ') || 'none'}`,
          `   - evidenceDocs: ${evidenceDocs.map((doc) => String(doc.path || doc.label || '').trim()).filter(Boolean).join(' | ') || 'none'}`,
          '   - closureRuleImpact: blocker cannot close unless the closure rules pass for this row and target boundary',
        ];
      })
    : ['- none'];
  const residualBlockerLines = productionBlockers.length
    ? productionBlockers.map((item, index) => `${index + 1}. ${String(item || '').trim()}`)
    : ['- none'];
  const requiredDocs = [
    'docs/target-environment-evidence-intake-v1.md',
    'docs/target-provider-evidence-intake-v1.md',
    'docs/target-provider-operations-v1.md',
    'docs/release-readiness-v1.md',
    'docs/execution-v1-evidence.md',
    'docs/execution-v1-closeout.md',
    'docs/execution-v1-handoff.md',
    'docs/pilot-export-package-v1.md',
  ];
  const requiredCommands = [
    'npm run smoke:target-environment-evidence-intake',
    'npm run smoke:target-provider-evidence-intake',
    'npm run smoke:target-provider-operations',
    'npm run smoke:production-provider-readiness',
    'npm run smoke:production-readiness-gate',
    'npm run smoke:release-artifact-hygiene',
    'npm run refresh:execution-v1-artifacts',
    'npm run smoke:execution-v1-status',
    'npm run smoke:execution-v1-snapshot',
  ];
  const lines = [
    'Target evidence closure rules guard',
    `- category: ${normalizedCategory || 'all'}`,
    `- owner: ${normalizedOwner || 'all'}`,
    `- provider: ${normalizedProvider || 'all'}`,
    `- includeSharedProviderOperations: ${String(includeShared !== false)}`,
    `- sharedProviderOperationsScope: ${getReleaseSharedProviderOperationsScopeReason({ includeShared, provider: normalizedProvider })}`,
    ...buildReleaseSharedProviderOperationsScopeAuditLines({
      totalActions: allActions,
      category: normalizedCategory,
      includeShared,
      owner: normalizedOwner,
      provider: normalizedProvider,
    }),
    `- sourceCommit: ${sourceCommit}`,
    `- generatedArtifactCommit: ${generatedArtifactCommit}`,
    `- visibleCurrentBlockers: ${visibleActions.length}/${allActions.length}`,
    `- closureRuleCount: ${closureRules.length}`,
    `- productionReadyStatus: ${summary.productionReadyStatus || releaseReadiness.productionReadyStatus || 'not tracked'}`,
    `- productionReadyBlocked: ${String(Boolean(summary.productionReadyBlocked ?? releaseReadiness.productionReadyBlocked ?? true))}`,
    `- productionBlockerCount: ${summary.productionBlockerCount ?? releaseReadiness.productionBlockerCount ?? productionBlockers.length}`,
    `- productionReadyStopReason: ${summary.productionReadyStopReason || releaseReadiness.productionReadyStopReason || 'not recorded'}`,
    `- releaseLink: ${releaseLink}`,
    `- releaseBlockerApiLink: ${releaseBlockerApiLink}`,
    '',
    'Closure rule rows:',
    ...closureRuleRows,
    '',
    'Visible blocker closure-rule cross-check:',
    ...visibleBlockerRows,
    '',
    'Residual production blockers:',
    ...residualBlockerLines,
    '',
    'Required closure evidence docs:',
    ...requiredDocs.map((docPath) => `- ${docLink(docPath)}`),
    '',
    'Required closure verification commands:',
    ...requiredCommands.map((command) => `- ${command}`),
    '',
    'Closure rules:',
    '- This packet is a target evidence review envelope, not production-ready approval.',
    '- Do not include raw API keys, tokens, private endpoint credentials, tenant payloads, customer personal data, billing identifiers, or machine-local absolute paths.',
    '- Every accepted blocker disposition change must include fresh target-boundary command evidence, release artifact hygiene, regenerated execution-v1 artifacts, and reviewer decision.',
    '- Keep productionReadyClaim=false while any target environment, provider, identity/session, tenant isolation, observability/SLO, retention/backup, support, or clean deployment stop-condition remains open.',
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseTargetEvidenceIntakePacketText({
  blockerActions = getFilteredReleaseCurrentOpenBlockerActions(),
  totalActions = getReleaseCurrentOpenBlockerActions(),
  category = state.releaseBlockerCategoryFilter,
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
  releaseStatus = state.releaseStatus,
} = {}) {
  const visibleActions = Array.isArray(blockerActions) ? blockerActions : [];
  const allActions = Array.isArray(totalActions) ? totalActions : [];
  if (!releaseStatus || !allActions.length) {
    return '';
  }

  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const summary = releaseStatus.summary || {};
  const releaseReadiness = releaseStatus.releaseReadiness || {};
  const productionBlockers = getReleaseProductionBlockers(releaseStatus);
  const releaseLink = buildReleaseBlockerSliceUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const releaseBlockerApiLink = buildReleaseBlockerApiUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const targetEnvironmentEvidenceDoc = getAbsoluteReleaseUrl(
    '/api/execution-v1/release-doc?path=docs%2Ftarget-environment-evidence-intake-v1.md',
  );
  const targetDeploymentContractDoc = getAbsoluteReleaseUrl(
    '/api/execution-v1/release-doc?path=docs%2Ftarget-deployment-contract-v1.md',
  );
  const targetProviderEvidenceDoc = getAbsoluteReleaseUrl(
    '/api/execution-v1/release-doc?path=docs%2Ftarget-provider-evidence-intake-v1.md',
  );
  const targetProviderOperationsDoc = getAbsoluteReleaseUrl(
    '/api/execution-v1/release-doc?path=docs%2Ftarget-provider-operations-v1.md',
  );
  const productionReadinessGate = [
    'npm run smoke:target-environment-evidence-intake',
    'npm run smoke:target-deployment-contract',
    'npm run smoke:target-provider-evidence-intake',
    'npm run smoke:target-provider-operations',
    'npm run refresh:execution-v1-artifacts',
    'npm run smoke:production-readiness-gate',
    'npm run smoke:release-artifact-hygiene',
    'npm run smoke:execution-v1-status',
  ];
  const residualBlockerLines = productionBlockers.length
    ? productionBlockers.map((item, index) => `${index + 1}. ${String(item || '').trim()}`)
    : ['- none'];
  const targetEvidenceCaptureTemplate = buildReleaseTargetEvidenceCaptureTemplateText({
    blockerActions: visibleActions,
    totalActions: allActions,
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
    releaseStatus,
  }).trim();
  const requiredCommandsPackage = buildReleaseTargetEvidenceRequiredCommandsText({
    blockerActions: visibleActions,
    totalActions: allActions,
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
    releaseStatus,
  }).trim();
  const productionGapGuard = buildReleaseTargetEvidenceProductionGapText({
    blockerActions: visibleActions,
    totalActions: allActions,
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
    releaseStatus,
  }).trim();
  const exceptionRegister = buildReleaseTargetEvidenceExceptionRegisterText({
    blockerActions: visibleActions,
    totalActions: allActions,
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
    releaseStatus,
  }).trim();
  const riskDecisionRegister = buildReleaseTargetEvidenceRiskDecisionRegisterText({
    blockerActions: visibleActions,
    totalActions: allActions,
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
    releaseStatus,
  }).trim();
  const providerEvidenceReferences = buildReleaseTargetEvidenceProviderEvidenceReferencesText({
    blockerActions: visibleActions,
    totalActions: allActions,
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
    releaseStatus,
  }).trim();
  const residualProductionBlockerGuard = buildReleaseTargetEvidenceResidualBlockersText({
    blockerActions: visibleActions,
    totalActions: allActions,
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
    releaseStatus,
  }).trim();
  const closureRulesGuard = buildReleaseTargetEvidenceClosureRulesText({
    blockerActions: visibleActions,
    totalActions: allActions,
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
    releaseStatus,
  }).trim();
  const submissionManifest = buildReleaseTargetEvidenceSubmissionManifestText({
    blockerActions: visibleActions,
    totalActions: allActions,
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
    releaseStatus,
  }).trim();
  const sanitizedEvidenceRegister = buildReleaseTargetEvidenceSanitizedRegisterText({
    blockerActions: visibleActions,
    totalActions: allActions,
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
    releaseStatus,
  }).trim();
  const boundaryConsistencyMap = buildReleaseTargetEvidenceBoundaryConsistencyMapText({
    blockerActions: visibleActions,
    totalActions: allActions,
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
    releaseStatus,
  }).trim();
  const commandRerunLog = buildReleaseTargetEvidenceCommandRerunLogText({
    blockerActions: visibleActions,
    totalActions: allActions,
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
    releaseStatus,
  }).trim();
  const reviewerDecisionRecord = buildReleaseTargetEvidenceReviewerDecisionRecordText({
    blockerActions: visibleActions,
    totalActions: allActions,
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
    releaseStatus,
  }).trim();
  const blockerDispositionRegister = buildReleaseTargetEvidenceBlockerDispositionRegisterText({
    blockerActions: visibleActions,
    totalActions: allActions,
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
    releaseStatus,
  }).trim();
  const releaseRefreshEvidence = buildReleaseTargetEvidenceReleaseRefreshEvidenceText({
    blockerActions: visibleActions,
    totalActions: allActions,
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
    releaseStatus,
  }).trim();
  const closureMatrix = buildReleaseBlockerClosureMatrixPackageText({
    blockerActions: visibleActions,
    totalActions: allActions,
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  }).trim();
  const lines = [
    'Target environment evidence intake submission packet',
    '',
    'Scope:',
    `- category: ${normalizedCategory || 'all'}`,
    `- owner: ${normalizedOwner || 'all'}`,
    `- provider: ${normalizedProvider || 'all'}`,
    `- includeSharedProviderOperations: ${String(includeShared !== false)}`,
    `- sharedProviderOperationsScope: ${getReleaseSharedProviderOperationsScopeReason({ includeShared, provider: normalizedProvider })}`,
    ...buildReleaseSharedProviderOperationsScopeAuditLines({
      totalActions: allActions,
      category: normalizedCategory,
      includeShared,
      owner: normalizedOwner,
      provider: normalizedProvider,
    }),
    `- visibleCurrentBlockers: ${visibleActions.length}/${allActions.length}`,
    `- productionReadyStatus: ${summary.productionReadyStatus || releaseReadiness.productionReadyStatus || 'not tracked'}`,
    `- productionReadyBlocked: ${String(Boolean(summary.productionReadyBlocked ?? releaseReadiness.productionReadyBlocked ?? true))}`,
    `- productionBlockerCount: ${summary.productionBlockerCount ?? releaseReadiness.productionBlockerCount ?? productionBlockers.length}`,
    `- productionReadyStopReason: ${summary.productionReadyStopReason || releaseReadiness.productionReadyStopReason || 'not recorded'}`,
    `- releaseLink: ${releaseLink}`,
    `- releaseBlockerApiLink: ${releaseBlockerApiLink}`,
    `- targetEnvironmentEvidenceIntakeDoc: ${targetEnvironmentEvidenceDoc}`,
    `- targetDeploymentContractDoc: ${targetDeploymentContractDoc}`,
    `- targetProviderEvidenceIntakeDoc: ${targetProviderEvidenceDoc}`,
    `- targetProviderOperationsDoc: ${targetProviderOperationsDoc}`,
    '',
    'Target evidence capture template:',
    targetEvidenceCaptureTemplate || '- none',
    '',
    'Target evidence capture template fields:',
    '1. targetEnvironmentName',
    '2. deploymentBoundaryEvidence',
    '3. identitySessionEvidence',
    '4. tenantIsolationEvidence',
    '5. providerSecretEvidence',
    '6. observabilitySloEvidence',
    '7. retentionBackupEvidence',
    '8. supportOperationsEvidence',
    '9. cleanReleaseEvidence',
    '10. acceptedRiskDecision',
    '',
    'Submission packet checklist:',
    '1. submissionManifest',
    '2. sanitizedEvidenceRegister',
    '3. boundaryConsistencyMap',
    '4. commandRerunLog',
    '5. reviewerDecisionRecord',
    '6. blockerDispositionRegister',
    '7. releaseRefreshEvidence',
    '',
    'Submission manifest template:',
    submissionManifest || '- none',
    '',
    'Sanitized evidence register template:',
    sanitizedEvidenceRegister || '- none',
    '',
    'Boundary consistency map template:',
    boundaryConsistencyMap || '- none',
    '',
    'Command rerun log template:',
    commandRerunLog || '- none',
    '',
    'Reviewer decision record template:',
    reviewerDecisionRecord || '- none',
    '',
    'Blocker disposition register template:',
    blockerDispositionRegister || '- none',
    '',
    'Release refresh evidence template:',
    releaseRefreshEvidence || '- none',
    '',
    'Required commands package:',
    requiredCommandsPackage || '- none',
    '',
    'Production gap guard:',
    productionGapGuard || '- none',
    '',
    'Accepted-scope exception register:',
    exceptionRegister || '- none',
    '',
    'Accepted risk decision register:',
    riskDecisionRegister || '- none',
    '',
    'Provider evidence references:',
    providerEvidenceReferences || '- none',
    '',
    'Residual production blockers:',
    residualProductionBlockerGuard || residualBlockerLines.join('\n') || '- none',
    '',
    'Required commands:',
    ...productionReadinessGate.map((command) => `- ${command}`),
    '',
    closureMatrix,
    '',
    'Closure rules:',
    closureRulesGuard || '- none',
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseTargetEvidenceReleaseRefreshEvidenceText({
  blockerActions = getFilteredReleaseCurrentOpenBlockerActions(),
  totalActions = getReleaseCurrentOpenBlockerActions(),
  category = state.releaseBlockerCategoryFilter,
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
  releaseStatus = state.releaseStatus,
} = {}) {
  const visibleActions = Array.isArray(blockerActions) ? blockerActions : [];
  const allActions = Array.isArray(totalActions) ? totalActions : [];
  if (!releaseStatus || !allActions.length) {
    return '';
  }

  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const summary = releaseStatus.summary || {};
  const releaseReadiness = releaseStatus.releaseReadiness || {};
  const productionBlockers = getReleaseProductionBlockers(releaseStatus);
  const releaseLink = buildReleaseBlockerSliceUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const releaseBlockerApiLink = buildReleaseBlockerApiUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const docLink = (docPath) => {
    const normalizedPath = String(docPath || '').trim();
    if (!normalizedPath) {
      return '';
    }
    return `${normalizedPath} (${getAbsoluteReleaseUrl(`/api/execution-v1/release-doc?path=${encodeURIComponent(normalizedPath)}`)})`;
  };
  const artifactRows = [
    {
      label: 'Execution v1 evidence',
      artifactPath: 'docs/execution-v1-evidence.md',
      command: 'node scripts/build-execution-v1-evidence.mjs --preserve-archived-live-validation --live-openai --live-anthropic --live-local',
      proves: 'deterministic runtime rows, archived live provider validation status, visual evidence manifest, and source commit linkage',
      stopCondition: 'execution-v1-evidence-missing-or-stale',
    },
    {
      label: 'Execution v1 closeout',
      artifactPath: 'docs/execution-v1-closeout.md',
      command: 'node scripts/build-execution-v1-closeout.mjs --reuse-existing-evidence',
      proves: 'closeout checklist was regenerated from the current execution evidence',
      stopCondition: 'execution-v1-closeout-missing-or-stale',
    },
    {
      label: 'Execution v1 handoff',
      artifactPath: 'docs/execution-v1-handoff.md',
      command: 'node scripts/build-execution-v1-handoff.mjs',
      proves: 'handoff packet references current evidence, closeout, commit push status, and visual artifact set',
      stopCondition: 'execution-v1-handoff-missing-or-stale',
    },
    {
      label: 'Immutable execution v1 snapshot',
      artifactPath: 'docs/releases/execution-v1/<verified-commit>/snapshot.json',
      command: 'node scripts/archive-execution-v1-snapshot.mjs',
      proves: 'release evidence, closeout, handoff, and snapshot manifest were archived for the verified source commit',
      stopCondition: 'execution-v1-snapshot-missing-or-stale',
    },
    {
      label: 'Pilot export package',
      artifactPath: 'docs/pilot-export-package-v1.md',
      command: 'node scripts/build-pilot-export-package.mjs',
      proves: 'export bundle inventory, bundle hash, file count, hygiene state, and verified commit were refreshed',
      stopCondition: 'pilot-export-package-missing-or-stale',
    },
    {
      label: 'Production-like release drill',
      artifactPath: 'docs/production-like-release-drill-v1.md',
      command: 'npm run smoke:production-like-release-drill',
      proves: 'production-like release rehearsal remains present for the release review boundary',
      stopCondition: 'production-like-release-drill-missing-or-failed',
    },
    {
      label: 'Clean deployment release',
      artifactPath: 'docs/clean-deployment-release-v1.md',
      command: 'npm run smoke:clean-deployment-release',
      proves: 'clean checkout deployment and rollback evidence remain present for release review',
      stopCondition: 'clean-deployment-release-missing-or-failed',
    },
    {
      label: 'Release readiness',
      artifactPath: 'docs/release-readiness-v1.md',
      command: 'npm run smoke:production-readiness-gate',
      proves: 'release readiness keeps productionReadyClaim=false and preserves residual blocker state',
      stopCondition: 'release-readiness-missing-or-stale',
    },
    {
      label: 'Release artifact hygiene',
      artifactPath: '<repository-relative hygiene output or external evidence alias>',
      command: 'npm run smoke:release-artifact-hygiene',
      proves: 'release artifacts are scanned for machine-local paths and secret-like values',
      stopCondition: 'release-artifact-hygiene-missing-or-failed',
    },
    {
      label: 'Production readiness gate',
      artifactPath: 'docs/production-provider-readiness-v1.md',
      command: 'npm run smoke:production-readiness-gate',
      proves: 'production-ready claim remains blocked until target environment stop-conditions close',
      stopCondition: 'production-readiness-gate-missing-or-failed',
    },
  ];
  const artifactEvidenceRows = artifactRows.flatMap((item, index) => [
    `${index + 1}. ${item.label}`,
    `   - artifactPath: ${item.artifactPath}`,
    `   - guardedLink: ${item.artifactPath.includes('<') ? '<replace after artifact refresh>' : docLink(item.artifactPath)}`,
    `   - refreshCommand: ${item.command}`,
    `   - proves: ${item.proves}`,
    `   - stopCondition: ${item.stopCondition}`,
    '   - sourceCommit: <required verified commit>',
    '   - generatedAt: <required ISO timestamp or YYYY-MM-DD>',
    '   - result: pass | fail | stale | not-run',
    '   - reviewerNote: <required note or none>',
  ]);
  const requiredRefreshCommands = [
    'npm run refresh:execution-v1-artifacts',
    'npm run smoke:execution-v1-status',
    'npm run smoke:execution-v1-snapshot',
    'npm run smoke:production-provider-readiness',
    'npm run smoke:production-readiness-gate',
    'npm run smoke:release-artifact-hygiene',
    'npm run smoke:target-environment-evidence-intake',
    'npm run smoke:target-provider-evidence-intake',
    'npm run smoke:target-provider-operations',
  ];
  const visibleBlockerRows = visibleActions.length
    ? visibleActions.flatMap((item, index) => [
        `${index + 1}. ${String(item.blocker || item.stopReason || 'current open blocker').trim()}`,
        `   - blockerId: ${String(item.id || '').trim() || 'unknown'}`,
        `   - provider: ${String(item.provider || '').trim() || 'none'}`,
        `   - category: ${String(item.category || 'stop-condition').trim()}`,
        `   - owner: ${String(item.owner || 'release-owner').trim()}`,
        `   - requiredClosingEvidence: ${String(item.nextEvidence || '').trim() || 'not recorded'}`,
        '   - releaseRefreshRequired: yes before disposition or release claim changes',
      ])
    : ['- none'];
  const residualBlockerLines = productionBlockers.length
    ? productionBlockers.map((item, index) => `${index + 1}. ${String(item || '').trim()}`)
    : ['- none'];
  const lines = [
    'Target evidence release refresh evidence',
    `- category: ${normalizedCategory || 'all'}`,
    `- owner: ${normalizedOwner || 'all'}`,
    `- provider: ${normalizedProvider || 'all'}`,
    `- includeSharedProviderOperations: ${String(includeShared !== false)}`,
    `- sharedProviderOperationsScope: ${getReleaseSharedProviderOperationsScopeReason({ includeShared, provider: normalizedProvider })}`,
    ...buildReleaseSharedProviderOperationsScopeAuditLines({
      totalActions: allActions,
      category: normalizedCategory,
      includeShared,
      owner: normalizedOwner,
      provider: normalizedProvider,
    }),
    `- visibleCurrentBlockers: ${visibleActions.length}/${allActions.length}`,
    `- refreshArtifactCount: ${artifactRows.length}`,
    `- productionReadyStatus: ${summary.productionReadyStatus || releaseReadiness.productionReadyStatus || 'not tracked'}`,
    `- productionReadyBlocked: ${String(Boolean(summary.productionReadyBlocked ?? releaseReadiness.productionReadyBlocked ?? true))}`,
    `- productionBlockerCount: ${summary.productionBlockerCount ?? releaseReadiness.productionBlockerCount ?? productionBlockers.length}`,
    `- productionReadyStopReason: ${summary.productionReadyStopReason || releaseReadiness.productionReadyStopReason || 'not recorded'}`,
    `- releaseLink: ${releaseLink}`,
    `- releaseBlockerApiLink: ${releaseBlockerApiLink}`,
    '',
    'Release refresh artifact rows:',
    ...artifactEvidenceRows,
    '',
    'Required refresh command sequence:',
    ...requiredRefreshCommands.map((command) => `- ${command}`),
    '',
    'Visible blocker refresh cross-check:',
    ...visibleBlockerRows,
    '',
    'Residual production blockers:',
    ...residualBlockerLines,
    '',
    'Release refresh evidence rules:',
    '- Release refresh evidence must be regenerated after accepted target evidence, blocker disposition changes, live validation changes, or release source-of-record changes.',
    '- Every artifact row must name the verified source commit, generated time, result, and repository-relative artifact path or sanitized external evidence alias.',
    '- A stale, missing, failed, or locally generated-from-wrong-boundary artifact must keep the related blocker as a stop-condition.',
    '- Do not include raw API keys, tokens, private endpoint credentials, tenant payloads, customer personal data, billing identifiers, private tenant identifiers, or machine-local absolute paths.',
    '- Keep productionReadyClaim=false until release refresh evidence, blocker disposition register, boundary consistency map, sanitized evidence register, command rerun log, reviewer decision, release artifact hygiene, regenerated execution-v1 artifacts, and production readiness gate all pass for the claimed scope.',
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseTargetEvidenceBlockerDispositionRegisterText({
  blockerActions = getFilteredReleaseCurrentOpenBlockerActions(),
  totalActions = getReleaseCurrentOpenBlockerActions(),
  category = state.releaseBlockerCategoryFilter,
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
  releaseStatus = state.releaseStatus,
} = {}) {
  const visibleActions = Array.isArray(blockerActions) ? blockerActions : [];
  const allActions = Array.isArray(totalActions) ? totalActions : [];
  if (!releaseStatus || !allActions.length) {
    return '';
  }

  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const summary = releaseStatus.summary || {};
  const releaseReadiness = releaseStatus.releaseReadiness || {};
  const productionBlockers = getReleaseProductionBlockers(releaseStatus);
  const releaseLink = buildReleaseBlockerSliceUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const releaseBlockerApiLink = buildReleaseBlockerApiUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const docLink = (docPath) => {
    const normalizedPath = String(docPath || '').trim();
    if (!normalizedPath) {
      return '';
    }
    return `${normalizedPath} (${getAbsoluteReleaseUrl(`/api/execution-v1/release-doc?path=${encodeURIComponent(normalizedPath)}`)})`;
  };
  const dispositionDefinitions = [
    {
      id: 'anthropic-billing-live-validation',
      blocker: 'Anthropic billing/live validation',
      currentState: 'still-blocking',
      requiredClosingEvidence: 'target Anthropic provider account evidence with account ownership proof for account owner, organization/workspace alias, customer scope, evidence owner, reviewer, and review date; billing and credit remediation proof with active billing plan, available credit balance status, payment owner, renewal path, low-balance alert route, remediation ticket, and post-remediation live run reference; API key and secret injection proof with approved secret manager platform, ANTHROPIC_API_KEY owner, runtime injection, least-privilege policy, rotation/revocation event, secret access audit, break-glass governance, leakage review, and credential containment; ANTHROPIC_MODEL model access proof with model availability, region/workspace access, max token policy, fallback model, and owner approval; provider terms and customer approval proof; quota and spend guard proof; target-boundary live:execution-v1:anthropic proof with mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference; telemetry proof; fallback and stop-condition proof with fallback provider, fallback policy id, stop reason, degraded mode, manual approval path, rollback owner, residual risk decision, and recoverable-provider-failure-only stop evidence; remediation audit proof; provider operations proof with fallback runtime audit policy and stop reason, data transcript handling, remediation renewal evidence, evidence retention, and provider failure containment; release artifact hygiene; and regenerated execution snapshot evidence',
      claimImpact: 'Anthropic must not be included in a live-provider-complete or production-ready claim',
      nextVerificationCommand: 'npm run smoke:target-anthropic-provider-account && npm run live:execution-v1:anthropic',
      stopCondition: 'anthropic-live-validation-missing-or-failed',
      docs: [
        'docs/target-anthropic-provider-account-v1.md',
        'docs/target-provider-evidence-intake-v1.md',
        'docs/target-provider-operations-v1.md',
        'docs/production-provider-readiness-v1.md',
      ],
      terms: ['anthropic', 'billing', 'credit'],
    },
    {
      id: 'hermes-runtime-config',
      blocker: 'Hermes provider architecture approval',
      currentState: 'configuration-required',
      requiredClosingEvidence: 'target Hermes provider architecture evidence with endpoint ownership proof for approved base URL alias, endpoint owner, network boundary, transport, availability owner, and health check result; HERMES_PROVIDER_MODEL model pinning proof with model version/source, compatibility profile, max token policy, fallback model, and owner approval; target secret injection proof with approved secret manager platform, API key requirement decision, runtime injection, rotation/revocation event, break-glass governance, secret access audit, and leakage review; Hermes tool-call parsing proof with <tool_call> sample, malformed-call behavior, execution boundary decision, audit record, and no-unapproved-tool-execution evidence; session lifecycle proof; data and transcript policy proof; quota and rate guard proof; telemetry proof; fallback and stop-condition proof with fallback provider, fallback policy id, stop reason, degraded mode, manual approval path, rollback owner, residual risk decision, and recoverable-provider-failure-only stop evidence; customer approval proof; target-boundary live:execution-v1:hermes proof with mission id, execution session id, provider response id, retry lineage, artifact provenance, and handoff reference; provider operations proof with fallback runtime audit policy and stop reason, data transcript handling, remediation renewal evidence, and provider failure containment; release artifact hygiene; and regenerated execution snapshot evidence',
      claimImpact: 'Hermes must remain excluded from production provider claims',
      nextVerificationCommand: 'npm run smoke:target-hermes-provider-architecture && npm run live:execution-v1:hermes',
      stopCondition: 'target-hermes-provider-approval-missing',
      docs: [
        'docs/target-hermes-provider-architecture-v1.md',
        'docs/target-provider-evidence-intake-v1.md',
        'docs/target-provider-operations-v1.md',
        'docs/production-provider-readiness-v1.md',
      ],
      terms: ['hermes', 'runtime config', 'endpoint', 'model'],
    },
    {
      id: 'target-local-provider-approval',
      blocker: 'target local provider approval',
      currentState: 'customer-approval-required',
      requiredClosingEvidence: 'target local provider architecture evidence with endpoint ownership proof for approved base URL alias, runtime owner, network boundary, transport, availability owner, health check result, and customer approval; LOCAL_PROVIDER_MODEL model pinning proof with model source/version, compatibility profile, max token policy, fallback model, and owner approval; network isolation proof with host boundary, ingress policy, egress policy, tenant/customer boundary, operator access policy, and firewall decision; secret and credential policy proof with auth mode, API key requirement decision, approved secret manager platform when credentials are used, runtime injection, rotation/revocation event, leakage review, and secret access audit; runtime lifecycle proof; session and artifact provenance proof; data residency and transcript policy proof; quota and resource guard proof; telemetry proof; fallback and customer approval proof with fallback provider, fallback policy id, stop reason, degraded mode, manual approval path, provider terms/local model license decision, and residual risk owner; target-boundary live:execution-v1:local proof with mission id, execution session id, provider response id, retry lineage, artifact provenance, and handoff reference; provider operations proof with fallback runtime audit policy and stop reason, data transcript handling, remediation renewal evidence, and provider failure containment; release artifact hygiene result; regenerated execution snapshot evidence; and customer acceptance',
      claimImpact: 'local provider can remain pilot/local-only but cannot be production-approved',
      nextVerificationCommand: 'npm run smoke:target-local-provider-architecture && npm run live:execution-v1:local',
      stopCondition: 'target-local-provider-approval-missing',
      docs: [
        'docs/target-local-provider-architecture-v1.md',
        'docs/target-provider-evidence-intake-v1.md',
        'docs/target-provider-operations-v1.md',
        'docs/production-provider-readiness-v1.md',
      ],
      terms: ['local provider', 'local', 'endpoint ownership'],
    },
    {
      id: 'hosted-identity-session-approval',
      blocker: 'hosted identity/session approval',
      currentState: 'customer-approval-required',
      requiredClosingEvidence: 'hosted identity/session architecture approval proof, customer IdP onboarding proof with metadata alias, issuer, audience, JWKS rotation owner, fallback owner, and customer approval, user lifecycle proof with provision, invitation, suspension, recovery, deprovision, tenant mapping, and orphan account review, session lifecycle proof with login, refresh, expiry, logout, revocation, idle timeout, device inventory, and re-auth, role administration proof with persistent assignment, revocation, delegated admin approval, separation-of-duties, and rollback, permission propagation proof across API, worker, agent, support, observability, cache invalidation, and stale permission denial, immutable audit export proof with actor, subject, tenant, role, session, reason, before/after state, timestamp, and checksum, break-glass governance proof with owner, approver, scope, expiry, monitoring, customer notification, revocation, and post-use review, support impersonation proof with approval, scoped session, action log, customer-safe update, denial tests, expiry, and closure, compliance and retention proof with identity log retention, legal hold, audit export, privacy deletion, post-delete absence, and customer handoff, migration plan proof, rollback proof, lockout recovery proof, customer access containment proof, release artifact hygiene result, and regenerated execution snapshot evidence',
      claimImpact: 'hosted identity/session claims remain blocked',
      nextVerificationCommand: 'npm run smoke:hosted-identity-session-architecture && npm run smoke:target-identity-session-operations',
      stopCondition: 'hosted-identity-session-approval-missing',
      docs: [
        'docs/hosted-identity-session-architecture-v1.md',
        'docs/target-identity-session-operations-v1.md',
      ],
      terms: ['identity', 'session', 'idp', 'rbac', 'role'],
    },
    {
      id: 'hosted-tenant-isolation-approval',
      blocker: 'hosted tenant isolation approval',
      currentState: 'customer-approval-required',
      requiredClosingEvidence: 'hosted tenant isolation architecture approval proof, tenant identity source proof with tenant source owner, customer organization mapping proof, lifecycle owner, trust policy, and source approval, tenant lifecycle proof with create/suspend/restore/delete/owner-transfer/exception-review/orphan-tenant-review, tenant-aware authorization proof with policy, service-to-service tenant propagation proof, stale permission denial, delegated admin boundary, and denial owner, storage partitioning proof for runtime state and artifact/memory/search/export/index partitioning proof with schema/bucket/keyspace boundary and migration safety, per-tenant encryption and key ownership proof with key owner, rotation, revocation, escrow, break-glass, access audit, and key custody decision, backup/restore isolation proof with tenant-scoped backup creation, restore authorization, integrity result, other-tenant non-interference, and post-restore denial, tenant administration proof with create, suspend, restore, delete, role delegation, customer approval, audit history, rollback route, and tenant admin owner, cross-tenant denial proof across API, storage, memory, search, export, delete, backup, support, and observability, observability/support isolation proof with tenant-scoped logs, traces, alerts, support ticket visibility, incident review, customer status routing, evidence export, and support owner, lifecycle isolation proof with retention, export, delete, provider transcript, legal hold, backup expiry, post-delete absence, and lifecycle owner, tenant data containment, release artifact hygiene result, and regenerated execution snapshot evidence',
      claimImpact: 'hosted multi-tenant isolation claims remain blocked',
      nextVerificationCommand: 'npm run smoke:hosted-tenant-isolation-architecture && npm run smoke:target-tenant-isolation-operations',
      stopCondition: 'hosted-tenant-isolation-approval-missing',
      docs: [
        'docs/hosted-tenant-isolation-architecture-v1.md',
        'docs/target-tenant-isolation-operations-v1.md',
      ],
      terms: ['tenant', 'isolation', 'cross-tenant', 'storage partitioning'],
    },
    {
      id: 'target-tenant-evidence',
      blocker: 'target tenant evidence',
      currentState: 'target-evidence-required',
      requiredClosingEvidence: 'completed target tenant isolation operations evidence capture template, tenant identity source proof with source owner, customer organization mapping proof, tenant lifecycle owner, trust policy, source approval, and orphan tenant review, tenant-scoped authorization proof with permission policy, service-to-service tenant propagation proof, stale permission denial, delegated admin boundary, and denial owner, storage partitioning proof for runtime state and artifact/memory/search/export/index partitioning proof with schema/bucket/keyspace boundary and migration safety, per-tenant encryption/key ownership proof with key owner, rotation, revocation, escrow, break-glass, access audit, and key custody decision, backup/restore isolation proof with tenant-scoped backup selection, restore authorization, integrity result, other-tenant non-interference, post-restore denial, backup owner, and restore rollback route, tenant administration proof with create, suspend, restore, delete, role delegation, customer approval, audit history, rollback route, tenant admin owner, and approval expiry, cross-tenant denial proof across API, storage, memory, search, export, delete, backup, support, and observability, observability/support isolation proof with tenant-scoped logs, traces, alerts, support ticket visibility, incident review, customer status routing, evidence export, support owner, and retention class, lifecycle isolation proof with retention, export, delete, provider transcript, legal hold, backup expiry, post-delete absence, lifecycle owner, and exception policy, tenant data containment, release artifact hygiene result, production readiness gate result, and regenerated execution snapshot evidence',
      claimImpact: 'tenant-isolated production claims remain blocked',
      nextVerificationCommand: 'npm run smoke:target-tenant-isolation-operations && npm run smoke:production-readiness-gate',
      stopCondition: 'target-tenant-evidence-missing',
      docs: [
        'docs/target-tenant-isolation-operations-v1.md',
        'docs/hosted-tenant-isolation-architecture-v1.md',
        'docs/release-readiness-v1.md',
      ],
      terms: ['target tenant', 'tenant evidence', 'cross-tenant', 'tenant isolation'],
    },
    {
      id: 'target-environment-evidence',
      blocker: 'target environment evidence',
      currentState: 'target-evidence-required',
      requiredClosingEvidence: 'completed target evidence capture template, sanitized submission packet, boundary consistency map, command rerun log, reviewer decision, blocker disposition register, release refresh evidence, and production readiness gate result',
      claimImpact: 'productionReadyClaim must remain false',
      nextVerificationCommand: 'npm run smoke:target-environment-evidence-intake && npm run smoke:production-readiness-gate',
      stopCondition: 'target-environment-evidence-missing',
      docs: [
        'docs/target-environment-evidence-intake-v1.md',
        'docs/target-deployment-contract-v1.md',
        'docs/release-readiness-v1.md',
      ],
      terms: ['target environment', 'target evidence', 'submission packet', 'production ready'],
    },
    {
      id: 'customer-specific-exceptions',
      blocker: 'customer-specific exceptions',
      currentState: 'accepted-scope-required',
      requiredClosingEvidence: 'explicit exception owner, customer-approved scope, expiry date, compensating control, allowed claim text, next review date, and release readiness note',
      claimImpact: 'exceptions cannot convert a blocked production-ready claim into production-ready',
      nextVerificationCommand: 'npm run smoke:target-environment-evidence-intake && npm run smoke:release-artifact-hygiene',
      stopCondition: 'customer-exception-scope-missing',
      docs: [
        'docs/target-environment-evidence-intake-v1.md',
        'docs/release-readiness-v1.md',
      ],
      terms: ['customer-specific', 'exception', 'accepted scope', 'accepted risk'],
    },
  ];
  const relatedActionsForDisposition = (definition) => visibleActions.filter((item) => {
    const haystack = [
      item.id,
      item.blocker,
      item.stopReason,
      item.nextEvidence,
      item.category,
      item.owner,
      item.provider,
    ]
      .map((value) => String(value || '').toLowerCase())
      .join(' ');
    return definition.terms.some((term) => haystack.includes(String(term || '').toLowerCase()));
  });
  const dispositionRows = dispositionDefinitions.flatMap((definition, index) => {
    const relatedActions = relatedActionsForDisposition(definition);
    const relatedActionIds = relatedActions
      .map((item) => String(item.id || '').trim())
      .filter(Boolean);
    const relatedCommands = Array.from(new Set(relatedActions.flatMap((item) =>
      (Array.isArray(item.commands) ? item.commands : [])
        .map((command) => String(command.command || '').trim())
        .filter(Boolean),
    )));
    const relatedEvidenceDocs = Array.from(new Set(relatedActions.flatMap((item) =>
      (Array.isArray(item.evidenceDocs) ? item.evidenceDocs : [])
        .map((doc) => String(doc.path || doc.label || '').trim())
        .filter(Boolean),
    )));
    return [
      `${index + 1}. ${definition.blocker}`,
      `   - dispositionId: ${definition.id}`,
      `   - currentState: ${definition.currentState}`,
      '   - proposedDisposition: still-blocking | accepted-scope-required | closed',
      `   - requiredClosingEvidence: ${definition.requiredClosingEvidence}`,
      `   - nextVerificationCommand: ${definition.nextVerificationCommand}`,
      `   - stopCondition: ${definition.stopCondition}`,
      `   - claimImpact: ${definition.claimImpact}`,
      `   - primaryEvidenceDocs: ${definition.docs.map(docLink).join(' | ')}`,
      `   - relatedCurrentBlockerIds: ${relatedActionIds.length ? relatedActionIds.join(', ') : 'none visible in current slice'}`,
      `   - relatedCommands: ${relatedCommands.length ? relatedCommands.join(' | ') : 'none visible in current slice'}`,
      `   - relatedEvidenceDocs: ${relatedEvidenceDocs.length ? relatedEvidenceDocs.join(' | ') : 'none visible in current slice'}`,
      '   - dispositionOwner: <required accountable owner>',
      '   - reviewer: <required reviewer or team>',
      '   - decisionDate: <required YYYY-MM-DD>',
      '   - acceptedScopeOrException: <required scope, exception id, or none>',
      '   - releaseRefreshRequired: yes before any release claim changes',
    ];
  });
  const visibleBlockerRows = visibleActions.length
    ? visibleActions.flatMap((item, index) => {
        const commands = Array.isArray(item.commands) ? item.commands : [];
        const evidenceDocs = Array.isArray(item.evidenceDocs) ? item.evidenceDocs : [];
        return [
          `${index + 1}. ${String(item.blocker || item.stopReason || 'current open blocker').trim()}`,
          `   - blockerId: ${String(item.id || '').trim() || 'unknown'}`,
          `   - provider: ${String(item.provider || '').trim() || 'none'}`,
          `   - category: ${String(item.category || 'stop-condition').trim()}`,
          `   - owner: ${String(item.owner || 'release-owner').trim()}`,
          `   - currentState: ${String(item.status || 'blocked').trim()}`,
          `   - stopReason: ${String(item.stopReason || item.blocker || '').trim() || 'not recorded'}`,
          `   - requiredClosingEvidence: ${String(item.nextEvidence || '').trim() || 'not recorded'}`,
          `   - commands: ${commands.map((command) => String(command.command || '').trim()).filter(Boolean).join(' | ') || 'none'}`,
          `   - evidenceDocs: ${evidenceDocs.map((doc) => String(doc.path || doc.label || '').trim()).filter(Boolean).join(' | ') || 'none'}`,
          '   - dispositionReviewRequired: yes',
        ];
      })
    : ['- none'];
  const residualBlockerLines = productionBlockers.length
    ? productionBlockers.map((item, index) => `${index + 1}. ${String(item || '').trim()}`)
    : ['- none'];
  const lines = [
    'Target evidence blocker disposition register',
    `- category: ${normalizedCategory || 'all'}`,
    `- owner: ${normalizedOwner || 'all'}`,
    `- provider: ${normalizedProvider || 'all'}`,
    `- includeSharedProviderOperations: ${String(includeShared !== false)}`,
    `- sharedProviderOperationsScope: ${getReleaseSharedProviderOperationsScopeReason({ includeShared, provider: normalizedProvider })}`,
    ...buildReleaseSharedProviderOperationsScopeAuditLines({
      totalActions: allActions,
      category: normalizedCategory,
      includeShared,
      owner: normalizedOwner,
      provider: normalizedProvider,
    }),
    `- visibleCurrentBlockers: ${visibleActions.length}/${allActions.length}`,
    `- dispositionRowCount: ${dispositionDefinitions.length}`,
    `- productionReadyStatus: ${summary.productionReadyStatus || releaseReadiness.productionReadyStatus || 'not tracked'}`,
    `- productionReadyBlocked: ${String(Boolean(summary.productionReadyBlocked ?? releaseReadiness.productionReadyBlocked ?? true))}`,
    `- productionBlockerCount: ${summary.productionBlockerCount ?? releaseReadiness.productionBlockerCount ?? productionBlockers.length}`,
    `- productionReadyStopReason: ${summary.productionReadyStopReason || releaseReadiness.productionReadyStopReason || 'not recorded'}`,
    `- releaseLink: ${releaseLink}`,
    `- releaseBlockerApiLink: ${releaseBlockerApiLink}`,
    '',
    'Disposition rows:',
    ...dispositionRows,
    '',
    'Visible blocker cross-check:',
    ...visibleBlockerRows,
    '',
    'Residual production blockers:',
    ...residualBlockerLines,
    '',
    'Disposition register rules:',
    '- This register records blocker state for review; it is not a waiver or production-ready approval.',
    '- A blocker can move to accepted-scope-required only when allowed claim text remains narrower than production-ready, exception owner is recorded, and release readiness is regenerated.',
    '- A blocker can move to closed only after target-boundary evidence is attached, matching target smoke passes, release artifact hygiene passes, execution-v1 artifacts are regenerated, and no related stop-condition remains.',
    '- Missing disposition owner, reviewer, command evidence, boundary map, sanitized evidence register, or release refresh evidence must keep the blocker as a stop-condition.',
    '- Do not include raw API keys, tokens, private endpoint credentials, tenant payloads, customer personal data, billing identifiers, private tenant identifiers, or machine-local absolute paths.',
    '- Keep productionReadyClaim=false until blocker disposition register, boundary consistency map, sanitized evidence register, command rerun log, reviewer decision, release artifact hygiene, regenerated execution-v1 artifacts, and production readiness gate all pass for the claimed scope.',
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseTargetEvidenceBoundaryConsistencyMapText({
  blockerActions = getFilteredReleaseCurrentOpenBlockerActions(),
  totalActions = getReleaseCurrentOpenBlockerActions(),
  category = state.releaseBlockerCategoryFilter,
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
  releaseStatus = state.releaseStatus,
} = {}) {
  const visibleActions = Array.isArray(blockerActions) ? blockerActions : [];
  const allActions = Array.isArray(totalActions) ? totalActions : [];
  if (!releaseStatus || !allActions.length) {
    return '';
  }

  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const summary = releaseStatus.summary || {};
  const releaseReadiness = releaseStatus.releaseReadiness || {};
  const productionBlockers = getReleaseProductionBlockers(releaseStatus);
  const releaseLink = buildReleaseBlockerSliceUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const releaseBlockerApiLink = buildReleaseBlockerApiUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const docLink = (docPath) => {
    const normalizedPath = String(docPath || '').trim();
    if (!normalizedPath) {
      return '';
    }
    return `${normalizedPath} (${getAbsoluteReleaseUrl(`/api/execution-v1/release-doc?path=${encodeURIComponent(normalizedPath)}`)})`;
  };
  const domainRows = [
    {
      key: 'deployment-boundary',
      label: 'Deployment boundary',
      requiredBoundary: 'target deployment boundary proof with approved target environment name, company/workspace scope, deployment owner, evidence owner, reviewer, review date, release label, and source commit; deployment profile decision proof with selected profile, approved architecture decision, network boundary, runtime root alias, rollback owner, customer approval reference, and rejected unapproved profiles; source provenance proof with branch, commit, review owner, build actor, release tag, tamper-control decision, and source approval; artifact registry proof with immutable artifact id, registry path, sha256, retention policy, access owner, promotion rule, and pull/download proof; dependency installation proof with lockfile source, install command, cache policy, vulnerability scan result, reproducibility record, install log, and owner; runtime bootstrap proof with deployment profile, runtime root, process manager, health endpoint result, startup log, restart policy, and bootstrap owner; target secret injection proof with approved secret manager platform, runtime injection path, least-privilege policy, rotation/revocation proof, audit log proof, and leakage review; environment boundary proof with network boundary, storage boundary, tenant profile, operator access policy, rollback route, and customer/workspace scope; rollback owner proof with rollback artifact, rollback command, recovery time result, validation command, residual risk decision, and owner acknowledgement; release label proof with release id, branch, commit, generated artifact commit, evidence packet reference, and reviewer decision; target evidence packet reference proof with submission packet, boundary consistency map, blocker disposition register, release refresh evidence, artifact hygiene result, and production readiness gate result',
      docs: [
        'docs/target-environment-evidence-intake-v1.md',
        'docs/target-deployment-contract-v1.md',
        'docs/target-clean-deployment-architecture-v1.md',
        'docs/target-clean-deployment-operations-v1.md',
      ],
      stopCondition: 'target-deployment-boundary-missing-or-mismatched',
      terms: ['deployment', 'clean deployment', 'target environment', 'runtime root', 'rollback'],
    },
    {
      key: 'identity-session-boundary',
      label: 'Identity and session boundary',
      requiredBoundary: 'customer IdP onboarding proof with metadata alias/issuer/audience/JWKS rotation owner/fallback owner/customer approval, user lifecycle proof with provision/invitation/suspension/recovery/deprovision/tenant mapping/orphan account review, session lifecycle proof with login/refresh/expiry/logout/revocation/idle timeout/device inventory/re-auth, role administration proof with persistent assignment/revocation/delegated admin approval/separation-of-duties/rollback, permission propagation proof across API/worker/agent/support/observability/cache invalidation/stale permission denial, immutable audit export proof with actor/subject/tenant/role/session/reason/before-after state/timestamp/checksum, break-glass governance proof, support impersonation proof, compliance and retention proof, and customer access containment scope',
      docs: [
        'docs/hosted-identity-session-architecture-v1.md',
        'docs/target-identity-session-operations-v1.md',
      ],
      stopCondition: 'hosted-identity-session-approval-missing',
      terms: ['identity', 'session', 'idp', 'rbac', 'role', 'permission', 'support impersonation'],
    },
    {
      key: 'tenant-isolation-boundary',
      label: 'Tenant isolation boundary',
      requiredBoundary: 'tenant identity source proof with source owner and customer organization mapping proof, tenant-scoped authorization proof with permission policy and service-to-service tenant propagation proof, storage partitioning proof for runtime state and artifact/memory/search/export/index partitioning proof, per-tenant encryption/key ownership proof with key custody decision, backup/restore isolation proof with other-tenant non-interference, cross-tenant denial proof across API/storage/memory/search/export/delete/backup/support/observability, observability/support isolation proof, lifecycle isolation proof, and tenant data containment scope',
      docs: [
        'docs/hosted-tenant-isolation-architecture-v1.md',
        'docs/target-tenant-isolation-operations-v1.md',
      ],
      stopCondition: 'hosted-tenant-isolation-approval-or-target-tenant-evidence-missing',
      terms: ['tenant', 'isolation', 'storage', 'encryption', 'cross-tenant', 'containment'],
    },
    {
      key: 'provider-secret-boundary',
      label: 'Provider and secret boundary',
      requiredBoundary: 'provider boundary proof with provider id, inclusion decision, account owner, customer/workspace approval, approved target boundary, target environment name, release label, source commit, evidence owner, reviewer, stop-condition id, and decision owner; provider account or architecture approval proof with account or endpoint owner, billing/credit/quota state, provider terms owner, model access owner, renewal owner, and residual blocker; approved secret manager platform proof with provider, region, tenancy boundary, owner, fallback decision, runtime injection path, least-privilege policy, rotation/revocation proof, secret access audit log, break-glass governance, leakage review, disaster recovery, and credential containment; target-boundary live validation proof with command, provider, model, endpoint alias, timeout, result, archived evidence commit, mission id, execution session id, retry lineage, artifact provenance, and operator owner; provider fallback runtime audit proof with mission run --fallback-provider --fallback-policy, mission timeline, workspace timeline, overview operator-timeline, provider events --family fallback, action remediate-provider-attention --fallback-provider --fallback-policy, selected fallback provider, fallback policy id, fallback stop reason, provider-failure-only failover, recoverable-provider-failure-only stop conditions, event family, and operator chronology evidence; quota, cost, and resource guard proof with spend owner, usage envelope, timeout, retry cap, concurrency cap, local resource envelope, alert threshold, and escalation route; provider blocker closure verification proof with blocker state, next verification command, required closing evidence, release artifact hygiene result, regenerated execution snapshot evidence, and refreshed release artifact references; provider telemetry proof, incident triage proof, data and transcript handling proof, remediation and renewal review proof, evidence retention proof, provider failure containment evidence, release artifact hygiene result, and production readiness gate result',
      docs: [
        'docs/target-provider-evidence-intake-v1.md',
        'docs/target-provider-operations-v1.md',
        'docs/target-openai-provider-account-v1.md',
        'docs/target-anthropic-provider-account-v1.md',
        'docs/target-local-provider-architecture-v1.md',
        'docs/target-hermes-provider-architecture-v1.md',
        'docs/target-secret-manager-architecture-v1.md',
        'docs/target-secret-manager-v1.md',
      ],
      stopCondition: 'target-provider-secret-boundary-missing-or-mismatched',
      terms: ['provider', 'openai', 'anthropic', 'local', 'hermes', 'secret', 'fallback', 'live validation'],
    },
    {
      key: 'observability-slo-boundary',
      label: 'Observability and SLO boundary',
      requiredBoundary: 'target observability architecture approval proof with approved architecture record, telemetry owner, reviewer, customer/workspace scope, and review date; approved telemetry backend proof with backend alias, region, tenancy boundary, owner, fallback route, and data residency decision; signal inventory proof for release, provider, mission, approval, runtime, security, support, and incident domains with severity owner and retention class; telemetry ingestion proof for metrics, logs, traces, audit events, provider events, release events, and support events with sample references, ingestion timestamp, pipeline owner, and dropped-event review; alert routing proof with severity mapping, primary route, secondary route, retry policy, acknowledgement SLA, escalation timeout, delivery receipt, and retry outcome; alert delivery receipt proof with route, severity, delivery receipt, retry policy, acknowledgement SLA, escalation evidence, and retry outcome; staffed on-call coverage proof with rota, primary owner, backup owner, handoff rule, timezone coverage, absence handling, and escalation chain; log and trace retention proof with period, storage class, redaction policy, query role, customer export boundary, deletion path, and query access audit; customer status communication proof with route, owner, approval, timestamp, message, cadence, and closure evidence; target SLO architecture approval proof with approved architecture record, customer/workspace scope, decision owner, reviewer, review date, and allowed claim text; customer-approved SLO/SLA terms proof with availability target, latency target, error rate target, support response target, maintenance window, exclusions, legal/commercial owner, and customer approval; error budget policy proof with measurement window, budget owner, burn-rate threshold, freeze rule, exception workflow, review cadence, and override owner; telemetry measurement proof with metrics backend, uptime check, synthetic probe, latency histogram, provider failure signal, data source owner, and retention period; staffed on-call response proof with rota, primary owner, secondary owner, handoff rule, timezone coverage, absence handling, escalation chain, acknowledgement timestamp, and response owner; provider outage handling proof with provider health signal, fallback decision, retry/disable policy, customer impact rule, accepted-risk owner, and post-incident review; maintenance and degradation proof with maintenance approval, customer notice, degradation mode, rollback owner, recovery target, and post-maintenance review; service credit proof with legal/commercial owner, contractual escalation path, customer approval, credit trigger, calculation owner, and evidence retention rule; evidence retention proof with retention class, storage boundary, owner, review date, exportability, and deletion path; and missed-SLO containment proof with detection signal, customer impact rule, escalation owner, freeze decision, remediation owner, residual risk, and next review date',
      docs: [
        'docs/target-observability-architecture-v1.md',
        'docs/target-observability-operations-v1.md',
        'docs/target-slo-architecture-v1.md',
        'docs/target-slo-operations-v1.md',
      ],
      stopCondition: 'target-observability-slo-boundary-missing-or-mismatched',
      terms: ['observability', 'telemetry', 'slo', 'sla', 'alert', 'incident', 'on-call'],
    },
    {
      key: 'retention-backup-boundary',
      label: 'Retention and backup boundary',
      requiredBoundary: 'customer-approved data class matrix proof with legal basis, owner, retention window, exportability, delete eligibility, exception policy, legal hold owner, and customer approval; target retention configuration proof with storage boundary, enforcement timestamp, policy owner, reviewer, exception workflow, audit record, and rollback route; export request proof with request id, requester, approver, package scope, delivery boundary, encryption mode, package hash, customer receipt, and export owner; delete workflow proof with request id, authorization owner, confirmation control, execution owner, storage scope, timestamp, result, rollback route, and audit record; provider transcript policy proof with provider-side retention, deletion or non-retention evidence, exception review, customer disclosure, evidence owner, and next review date; post-delete absence proof with runtime, tenant storage, backup, provider, export package, support packet, release artifact boundary checks, checker owner, timestamp, and absence result; audit history proof with actor, customer or tenant alias, lifecycle action, before/after state, timestamp, checksum or equivalent integrity proof, and retention owner; backup schedule execution proof with backup policy id, schedule, execution timestamps, missed-run handling, and owner acknowledgement; encrypted backup storage proof with storage class, encryption mode, retention class, location alias, storage owner, and access audit; backup key ownership proof with key owner, rotation cadence, revocation path, break-glass route, expiry/delete evidence, and access audit; restore validation proof with objective, duration, restored data class inventory, checksum or equivalent integrity proof, tenant isolation, cross-tenant denial, and validation owner; tenant isolation proof with tenant-scoped backup selection, restore authorization, other-tenant non-interference, post-restore denial, backup owner, and restore rollback route; backup expiry/deletion proof with expiry schedule, delete proof, post-delete absence check, deletion owner, and audit record; disaster recovery proof with DR owner, runbook execution, outage scenario, restore priority, customer communication, rollback path, residual risk decision, and audit trail; lifecycle exception, legal hold, delete conflict, provider transcript exception, customer communication containment, release artifact hygiene, and regenerated execution snapshot evidence',
      docs: [
        'docs/target-data-lifecycle-architecture-v1.md',
        'docs/target-retention-operations-v1.md',
        'docs/target-backup-operations-v1.md',
      ],
      stopCondition: 'target-retention-backup-boundary-missing-or-mismatched',
      terms: ['retention', 'backup', 'restore', 'delete', 'export', 'data lifecycle', 'transcript'],
    },
    {
      key: 'support-boundary',
      label: 'Support operations boundary',
      requiredBoundary: 'target support architecture approval proof with approved support architecture record, support owner, reviewer, customer/workspace scope, and review date; staffed support coverage proof with support owner, coverage window, primary rota, secondary rota, backup policy, timezone coverage, absence handling, and acknowledgement evidence; support queue routing proof with ticketing system, queue identifier, severity mapping, routing rule, retry path, queue owner, access policy, assignment audit, and escalation evidence; customer communication proof with approved channel, update cadence, message owner, approval path, status route, customer-visible timestamp, message reference, and closure message; ticket audit history proof with lifecycle history, assignment history, customer-visible update history, redaction result, retention period, evidence owner, and closure audit; escalation ownership proof with incident commander, engineering escalation, provider escalation, executive/customer escalation, backup owner, retry history, failure fallback, and audit record; incident review cadence proof with review cadence, timeline, mitigation owner, customer impact summary, corrective action owner, due date, review decision, closure evidence, and evidence retention; on-call handoff proof with primary owner, secondary owner, acknowledgement timestamp, missed-ack rule, paging fallback, handoff log, and escalation chain; support data handling proof with secret redaction, customer data redaction, provider transcript handling, ticket attachment rule, access audit, and hygiene result; release artifact hygiene result; and regenerated execution snapshot evidence',
      docs: [
        'docs/target-support-architecture-v1.md',
        'docs/target-support-operations-v1.md',
      ],
      stopCondition: 'target-support-boundary-missing-or-mismatched',
      terms: ['support', 'escalation', 'ticket', 'customer communication', 'coverage'],
    },
    {
      key: 'clean-release-boundary',
      label: 'Clean release and artifact boundary',
      requiredBoundary: 'clean deployment release evidence with clean checkout proof, command replay proof, artifact synchronization proof, production-like environment proof, rollback readiness proof, release approval proof, failed-release containment proof, release artifact hygiene result, artifact-sync-current proof, and regenerated execution snapshot evidence; production-like release drill evidence with target gates proof, provider checks proof, execution snapshot proof, clean deployment release proof, pilot export package proof, rollback proof, handoff evidence proof, release artifact hygiene result, production readiness gate proof, failed-release containment proof, command count, failed command count, and verified commit; pilot export package proof with repository-relative file inventory, bundle hash proof, file count proof, sha256 manifest proof, hygiene state proof, verified commit reference proof, immutable snapshot reference, release artifact hygiene result, and regenerated execution snapshot reference; release artifact hygiene proof with machine-local path scan proof, secret-like value scan proof, unsupported evidence leakage scan proof, scanned file count proof, zero finding proof, verified commit proof, and reviewer acceptance boundary; execution-v1 artifact proof with evidence, closeout, handoff, immutable snapshot, visual manifest, archived live validation status, artifact-sync-current proof, and production readiness gate result for the same approved source commit',
      docs: [
        'docs/clean-deployment-release-v1.md',
        'docs/production-like-release-drill-v1.md',
        'docs/execution-v1-evidence.md',
        'docs/execution-v1-closeout.md',
        'docs/execution-v1-handoff.md',
        'docs/pilot-export-package-v1.md',
        'docs/production-provider-readiness-v1.md',
        'docs/release-readiness-v1.md',
      ],
      stopCondition: 'clean-release-artifact-boundary-missing-or-stale',
      terms: ['clean release', 'artifact', 'snapshot', 'export package', 'hygiene', 'production readiness', 'release'],
    },
  ];
  const findRelatedBlockerIds = (domain) => visibleActions
    .filter((item) => {
      const haystack = [
        item.id,
        item.blocker,
        item.stopReason,
        item.nextEvidence,
        item.category,
        item.owner,
        item.provider,
      ]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      return domain.terms.some((term) => haystack.includes(String(term || '').toLowerCase()));
    })
    .map((item) => String(item.id || '').trim())
    .filter(Boolean);
  const consistencyRows = domainRows.flatMap((domain, index) => {
    const relatedBlockerIds = findRelatedBlockerIds(domain);
    return [
      `${index + 1}. ${domain.label}`,
      `   - boundaryDomain: ${domain.key}`,
      `   - requiredBoundary: ${domain.requiredBoundary}`,
      `   - primaryEvidenceDocs: ${domain.docs.map(docLink).join(' | ')}`,
      `   - relatedCurrentBlockerIds: ${relatedBlockerIds.length ? relatedBlockerIds.join(', ') : 'none visible in current slice'}`,
      '   - targetEnvironmentAlias: <required approved target boundary alias>',
      '   - evidenceBoundaryAlias: <required evidence boundary alias>',
      '   - boundaryConsistencyStatus: same-boundary | accepted-exception-required | missing',
      `   - stopCondition: ${domain.stopCondition}`,
      '   - exceptionOwner: <required when status is accepted-exception-required>',
      '   - exceptionNotes: <required exception note or none>',
    ];
  });
  const blockerCrossCheckRows = visibleActions.length
    ? visibleActions.flatMap((item, index) => [
        `${index + 1}. ${String(item.blocker || item.stopReason || 'current open blocker').trim()}`,
        `   - blockerId: ${String(item.id || '').trim() || 'unknown'}`,
        `   - provider: ${String(item.provider || '').trim() || 'none'}`,
        `   - category: ${String(item.category || 'stop-condition').trim()}`,
        `   - owner: ${String(item.owner || 'release-owner').trim()}`,
        `   - requiredClosingEvidence: ${String(item.nextEvidence || '').trim() || 'not recorded'}`,
        '   - boundaryCrossCheckRequired: yes',
      ])
    : ['- none'];
  const residualBlockerLines = productionBlockers.length
    ? productionBlockers.map((item, index) => `${index + 1}. ${String(item || '').trim()}`)
    : ['- none'];
  const lines = [
    'Target evidence boundary consistency map',
    `- category: ${normalizedCategory || 'all'}`,
    `- owner: ${normalizedOwner || 'all'}`,
    `- provider: ${normalizedProvider || 'all'}`,
    `- includeSharedProviderOperations: ${String(includeShared !== false)}`,
    `- sharedProviderOperationsScope: ${getReleaseSharedProviderOperationsScopeReason({ includeShared, provider: normalizedProvider })}`,
    ...buildReleaseSharedProviderOperationsScopeAuditLines({
      totalActions: allActions,
      category: normalizedCategory,
      includeShared,
      owner: normalizedOwner,
      provider: normalizedProvider,
    }),
    `- visibleCurrentBlockers: ${visibleActions.length}/${allActions.length}`,
    `- boundaryDomainCount: ${domainRows.length}`,
    `- productionReadyStatus: ${summary.productionReadyStatus || releaseReadiness.productionReadyStatus || 'not tracked'}`,
    `- productionReadyBlocked: ${String(Boolean(summary.productionReadyBlocked ?? releaseReadiness.productionReadyBlocked ?? true))}`,
    `- productionBlockerCount: ${summary.productionBlockerCount ?? releaseReadiness.productionBlockerCount ?? productionBlockers.length}`,
    `- productionReadyStopReason: ${summary.productionReadyStopReason || releaseReadiness.productionReadyStopReason || 'not recorded'}`,
    `- releaseLink: ${releaseLink}`,
    `- releaseBlockerApiLink: ${releaseBlockerApiLink}`,
    '',
    'Boundary consistency rows:',
    ...consistencyRows,
    '',
    'Blocker boundary cross-check:',
    ...blockerCrossCheckRows,
    '',
    'Residual production blockers:',
    ...residualBlockerLines,
    '',
    'Boundary consistency rules:',
    '- Every target evidence domain must name the same approved target environment alias, source commit, deployment profile, and evidence capture date unless a reviewer-approved exception is recorded.',
    '- Accepted exceptions need an owner, allowed claim text, compensating control, expiry or next review date, and regenerated release readiness evidence.',
    '- Missing or mismatched boundary rows must keep the related blocker as a stop-condition.',
    '- Do not include raw API keys, tokens, private endpoint credentials, tenant payloads, customer personal data, billing identifiers, private tenant identifiers, or machine-local absolute paths.',
    '- Keep productionReadyClaim=false until boundary consistency, sanitized evidence register, command rerun log, reviewer decision, release artifact hygiene, regenerated execution-v1 artifacts, and production readiness gate all pass for the claimed scope.',
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseTargetEvidenceSanitizedRegisterText({
  blockerActions = getFilteredReleaseCurrentOpenBlockerActions(),
  totalActions = getReleaseCurrentOpenBlockerActions(),
  category = state.releaseBlockerCategoryFilter,
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
  releaseStatus = state.releaseStatus,
} = {}) {
  const visibleActions = Array.isArray(blockerActions) ? blockerActions : [];
  const allActions = Array.isArray(totalActions) ? totalActions : [];
  if (!releaseStatus || !allActions.length) {
    return '';
  }

  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const summary = releaseStatus.summary || {};
  const releaseReadiness = releaseStatus.releaseReadiness || {};
  const productionBlockers = getReleaseProductionBlockers(releaseStatus);
  const releaseLink = buildReleaseBlockerSliceUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const releaseBlockerApiLink = buildReleaseBlockerApiUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const evidenceByKey = new Map();
  const addEvidenceDoc = ({
    blockerId = '',
    blockerLabel = '',
    doc = {},
    source = 'blocker evidence',
  } = {}) => {
    const docLabel = String(doc.label || doc.path || 'evidence doc').trim();
    const docPath = String(doc.path || '').trim();
    const docHref = getAbsoluteReleaseUrl(doc.href || (docPath
      ? `/api/execution-v1/release-doc?path=${encodeURIComponent(docPath)}`
      : ''));
    const docKey = docHref || docPath || docLabel;
    if (!docKey) {
      return;
    }
    if (!evidenceByKey.has(docKey)) {
      evidenceByKey.set(docKey, {
        availability: doc.exists === false ? 'missing' : 'available',
        blockerIds: [],
        blockerLabels: [],
        href: docHref,
        label: docLabel,
        path: docPath,
        sources: [],
      });
    }
    const entry = evidenceByKey.get(docKey);
    if (blockerId && !entry.blockerIds.includes(blockerId)) {
      entry.blockerIds.push(blockerId);
    }
    if (blockerLabel && !entry.blockerLabels.includes(blockerLabel)) {
      entry.blockerLabels.push(blockerLabel);
    }
    if (source && !entry.sources.includes(source)) {
      entry.sources.push(source);
    }
  };

  visibleActions.forEach((item) => {
    const blockerId = String(item.id || '').trim();
    const blockerLabel = String(item.blocker || item.stopReason || 'current open blocker').trim();
    const evidenceDocs = Array.isArray(item.evidenceDocs) ? item.evidenceDocs : [];
    evidenceDocs.forEach((doc) => addEvidenceDoc({
      blockerId,
      blockerLabel,
      doc,
      source: 'current open blocker',
    }));
  });

  [
    ['Target environment evidence intake', 'docs/target-environment-evidence-intake-v1.md'],
    ['Target deployment contract', 'docs/target-deployment-contract-v1.md'],
    ['Target provider evidence intake', 'docs/target-provider-evidence-intake-v1.md'],
    ['Target provider operations', 'docs/target-provider-operations-v1.md'],
    ['Release readiness', 'docs/release-readiness-v1.md'],
    ['Execution v1 evidence', 'docs/execution-v1-evidence.md'],
    ['Execution v1 closeout', 'docs/execution-v1-closeout.md'],
    ['Execution v1 handoff', 'docs/execution-v1-handoff.md'],
    ['Pilot export package', 'docs/pilot-export-package-v1.md'],
    ['Production provider readiness', 'docs/production-provider-readiness-v1.md'],
  ].forEach(([label, docPath]) => addEvidenceDoc({
    blockerId: 'target-evidence-required',
    blockerLabel: 'target evidence submission packet',
    doc: {
      label,
      path: docPath,
    },
    source: 'target evidence packet requirement',
  }));

  const evidenceEntries = Array.from(evidenceByKey.values());
  const evidenceRows = evidenceEntries.length
    ? evidenceEntries.flatMap((entry, index) => [
        `${index + 1}. ${entry.label || entry.path || 'evidence doc'}`,
        `   - repositoryPath: ${entry.path || 'external evidence alias required'}`,
        `   - guardedLink: ${entry.href || 'link 없음'}`,
        `   - availability: ${entry.availability}`,
        `   - sourceBlockerIds: ${entry.blockerIds.length ? entry.blockerIds.join(', ') : 'none'}`,
        `   - sourceBlockers: ${entry.blockerLabels.length ? entry.blockerLabels.join(' | ') : 'none'}`,
        `   - source: ${entry.sources.length ? entry.sources.join(', ') : 'target evidence packet requirement'}`,
        '   - evidenceOwner: <required owner>',
        '   - retentionClass: <required retention class>',
        '   - redactionNotes: <required redaction notes or none>',
        '   - sha256OrSignedExportRef: <required sha256, signed export reference, or not-applicable>',
        '   - externalSystemAlias: <public alias or none>',
      ])
    : ['- none'];
  const residualBlockerLines = productionBlockers.length
    ? productionBlockers.map((item, index) => `${index + 1}. ${String(item || '').trim()}`)
    : ['- none'];
  const lines = [
    'Target evidence sanitized register',
    `- category: ${normalizedCategory || 'all'}`,
    `- owner: ${normalizedOwner || 'all'}`,
    `- provider: ${normalizedProvider || 'all'}`,
    `- includeSharedProviderOperations: ${String(includeShared !== false)}`,
    `- sharedProviderOperationsScope: ${getReleaseSharedProviderOperationsScopeReason({ includeShared, provider: normalizedProvider })}`,
    ...buildReleaseSharedProviderOperationsScopeAuditLines({
      totalActions: allActions,
      category: normalizedCategory,
      includeShared,
      owner: normalizedOwner,
      provider: normalizedProvider,
    }),
    `- visibleCurrentBlockers: ${visibleActions.length}/${allActions.length}`,
    `- evidenceRecordCount: ${evidenceEntries.length}`,
    `- productionReadyStatus: ${summary.productionReadyStatus || releaseReadiness.productionReadyStatus || 'not tracked'}`,
    `- productionReadyBlocked: ${String(Boolean(summary.productionReadyBlocked ?? releaseReadiness.productionReadyBlocked ?? true))}`,
    `- productionBlockerCount: ${summary.productionBlockerCount ?? releaseReadiness.productionBlockerCount ?? productionBlockers.length}`,
    `- productionReadyStopReason: ${summary.productionReadyStopReason || releaseReadiness.productionReadyStopReason || 'not recorded'}`,
    `- releaseLink: ${releaseLink}`,
    `- releaseBlockerApiLink: ${releaseBlockerApiLink}`,
    '',
    'Evidence register rows:',
    ...evidenceRows,
    '',
    'Residual production blockers:',
    ...residualBlockerLines,
    '',
    'Sanitized register rules:',
    '- Register only repository-relative evidence paths or public external evidence aliases.',
    '- Do not include raw API keys, tokens, private endpoint credentials, tenant payloads, customer personal data, billing identifiers, private tenant identifiers, or machine-local absolute paths.',
    '- Every evidence row needs an owner, retention class, redaction note, and sha256 or signed export reference before reviewer decision.',
    '- Missing or unsanitized evidence must keep the related blocker as a stop-condition.',
    '- Keep productionReadyClaim=false until sanitized evidence register, command rerun log, reviewer decision, release artifact hygiene, regenerated execution-v1 artifacts, and production readiness gate all pass for the claimed scope.',
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseTargetEvidenceCommandRerunLogText({
  blockerActions = getFilteredReleaseCurrentOpenBlockerActions(),
  totalActions = getReleaseCurrentOpenBlockerActions(),
  category = state.releaseBlockerCategoryFilter,
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
  releaseStatus = state.releaseStatus,
} = {}) {
  const visibleActions = Array.isArray(blockerActions) ? blockerActions : [];
  const allActions = Array.isArray(totalActions) ? totalActions : [];
  if (!releaseStatus || !allActions.length) {
    return '';
  }

  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const summary = releaseStatus.summary || {};
  const releaseReadiness = releaseStatus.releaseReadiness || {};
  const productionBlockers = getReleaseProductionBlockers(releaseStatus);
  const releaseLink = buildReleaseBlockerSliceUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const releaseBlockerApiLink = buildReleaseBlockerApiUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const commandEntriesByValue = new Map();
  visibleActions.forEach((item) => {
    const actionId = String(item.id || '').trim();
    const blockerLabel = String(item.blocker || item.stopReason || 'current open blocker').trim();
    const commands = Array.isArray(item.commands) ? item.commands : [];
    commands.forEach((command) => {
      const commandValue = String(command.command || '').trim();
      if (!commandValue) {
        return;
      }
      if (!commandEntriesByValue.has(commandValue)) {
        commandEntriesByValue.set(commandValue, {
          blockerIds: [],
          blockers: [],
          command: commandValue,
          label: String(command.label || command.kind || 'blocker command').trim(),
          owner: String(item.owner || 'release-owner').trim(),
        });
      }
      const entry = commandEntriesByValue.get(commandValue);
      if (actionId && !entry.blockerIds.includes(actionId)) {
        entry.blockerIds.push(actionId);
      }
      if (blockerLabel && !entry.blockers.includes(blockerLabel)) {
        entry.blockers.push(blockerLabel);
      }
    });
  });
  const targetCommands = [
    {
      command: 'npm run smoke:target-environment-evidence-intake',
      label: 'Target environment evidence intake',
    },
    {
      command: 'npm run smoke:target-deployment-contract',
      label: 'Target deployment contract',
    },
    {
      command: 'npm run smoke:target-provider-evidence-intake',
      label: 'Target provider evidence intake',
    },
    {
      command: 'npm run smoke:target-provider-operations',
      label: 'Target provider operations',
    },
    {
      command: 'npm run refresh:execution-v1-artifacts',
      label: 'Execution v1 artifact refresh',
    },
    {
      command: 'npm run smoke:production-readiness-gate',
      label: 'Production readiness gate',
    },
    {
      command: 'npm run smoke:release-artifact-hygiene',
      label: 'Release artifact hygiene',
    },
    {
      command: 'npm run smoke:execution-v1-status',
      label: 'Execution v1 status',
    },
  ];
  targetCommands.forEach((item) => {
    const commandValue = String(item.command || '').trim();
    if (!commandValue || commandEntriesByValue.has(commandValue)) {
      return;
    }
    commandEntriesByValue.set(commandValue, {
      blockerIds: ['target-evidence-required'],
      blockers: ['target evidence submission packet'],
      command: commandValue,
      label: String(item.label || 'target evidence command').trim(),
      owner: 'release-owner',
    });
  });
  const commandEntries = Array.from(commandEntriesByValue.values());
  const rerunRows = commandEntries.length
    ? commandEntries.flatMap((entry, index) => [
        `${index + 1}. ${entry.label}`,
        `   - command: ${entry.command}`,
        `   - commandOwner: ${entry.owner || 'release-owner'}`,
        `   - blockerIds: ${entry.blockerIds.length ? entry.blockerIds.join(', ') : 'none'}`,
        `   - blockers: ${entry.blockers.length ? entry.blockers.join(' | ') : 'none'}`,
        '   - targetBoundaryExecutionDate: <required YYYY-MM-DD>',
        '   - result: pass | fail | not-run',
        '   - artifactPath: <repository-relative evidence path or external evidence alias>',
        '   - retryOrRemediationNote: <required note or none>',
      ])
    : ['- none'];
  const residualBlockerLines = productionBlockers.length
    ? productionBlockers.map((item, index) => `${index + 1}. ${String(item || '').trim()}`)
    : ['- none'];
  const lines = [
    'Target evidence command rerun log',
    `- category: ${normalizedCategory || 'all'}`,
    `- owner: ${normalizedOwner || 'all'}`,
    `- provider: ${normalizedProvider || 'all'}`,
    `- includeSharedProviderOperations: ${String(includeShared !== false)}`,
    `- sharedProviderOperationsScope: ${getReleaseSharedProviderOperationsScopeReason({ includeShared, provider: normalizedProvider })}`,
    ...buildReleaseSharedProviderOperationsScopeAuditLines({
      totalActions: allActions,
      category: normalizedCategory,
      includeShared,
      owner: normalizedOwner,
      provider: normalizedProvider,
    }),
    `- visibleCurrentBlockers: ${visibleActions.length}/${allActions.length}`,
    `- commandCount: ${commandEntries.length}`,
    `- productionReadyStatus: ${summary.productionReadyStatus || releaseReadiness.productionReadyStatus || 'not tracked'}`,
    `- productionReadyBlocked: ${String(Boolean(summary.productionReadyBlocked ?? releaseReadiness.productionReadyBlocked ?? true))}`,
    `- productionBlockerCount: ${summary.productionBlockerCount ?? releaseReadiness.productionBlockerCount ?? productionBlockers.length}`,
    `- productionReadyStopReason: ${summary.productionReadyStopReason || releaseReadiness.productionReadyStopReason || 'not recorded'}`,
    `- releaseLink: ${releaseLink}`,
    `- releaseBlockerApiLink: ${releaseBlockerApiLink}`,
    '',
    'Command rerun rows:',
    ...rerunRows,
    '',
    'Residual production blockers:',
    ...residualBlockerLines,
    '',
    'Command rerun rules:',
    '- This log must be filled from the approved target boundary, not from an unrelated local run.',
    '- Every failed or not-run command must keep the related blocker as a stop-condition.',
    '- Artifact paths must be repository-relative or sanitized external evidence aliases.',
    '- Do not include raw API keys, tokens, tenant payloads, customer personal data, billing identifiers, private endpoint credentials, or machine-local absolute paths.',
    '- Keep productionReadyClaim=false until command rerun evidence, reviewer decision, release artifact hygiene, regenerated execution-v1 artifacts, and production readiness gate all pass for the claimed scope.',
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseTargetEvidenceReviewerDecisionRecordText({
  blockerActions = getFilteredReleaseCurrentOpenBlockerActions(),
  totalActions = getReleaseCurrentOpenBlockerActions(),
  category = state.releaseBlockerCategoryFilter,
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
  releaseStatus = state.releaseStatus,
} = {}) {
  const visibleActions = Array.isArray(blockerActions) ? blockerActions : [];
  const allActions = Array.isArray(totalActions) ? totalActions : [];
  if (!releaseStatus || !allActions.length) {
    return '';
  }

  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const releaseReadiness = releaseStatus.releaseReadiness || {};
  const summary = releaseStatus.summary || {};
  const productionBlockers = getReleaseProductionBlockers(releaseStatus);
  const sliceLink = buildReleaseBlockerSliceUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const releaseBlockerApiLink = buildReleaseBlockerApiUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const targetEnvironmentEvidenceDoc = getAbsoluteReleaseUrl(
    '/api/execution-v1/release-doc?path=docs%2Ftarget-environment-evidence-intake-v1.md',
  );
  const releaseReadinessDoc = getAbsoluteReleaseUrl(
    '/api/execution-v1/release-doc?path=docs%2Frelease-readiness-v1.md',
  );
  const dispositionRows = visibleActions.length
    ? visibleActions.flatMap((item, index) => {
        const actionId = String(item.id || '').trim();
        const commands = Array.isArray(item.commands) ? item.commands : [];
        const evidenceDocs = Array.isArray(item.evidenceDocs) ? item.evidenceDocs : [];
        const provider = String(item.provider || '').trim();
        const blockerLink = `${window.location.origin}${buildUiStateUrl({
          detailTab: 'release',
          releaseBlockerCategoryFilter: '',
          releaseBlockerOwnerFilter: '',
          releaseBlockerProviderFilter: '',
          releaseFocusedBlockerId: actionId,
          releaseFocusedProductionBlockerIndex: '',
          releaseFocusedProvider: provider,
          releaseFocusedHistoryId: '',
          releaseHistoryOutcome: '',
          releaseHistoryProvider: '',
          releaseHistoryScope: '',
        })}`;
        return [
          `${index + 1}. ${String(item.blocker || item.stopReason || 'current open blocker').trim()}`,
          `   - blockerId: ${actionId || 'unknown'}`,
          `   - provider: ${provider || 'none'}`,
          `   - category: ${String(item.category || 'stop-condition').trim()}`,
          `   - owner: ${String(item.owner || 'release-owner').trim()}`,
          `   - currentState: ${String(item.status || 'blocked').trim()}`,
          `   - proposedDisposition: still-blocking | accepted-scope-required | closed`,
          `   - requiredClosingEvidence: ${String(item.nextEvidence || '').trim() || 'not recorded'}`,
          `   - verificationCommands: ${commands.map((command) => String(command.command || '').trim()).filter(Boolean).join(' | ') || 'none'}`,
          `   - evidenceDocs: ${evidenceDocs.map((doc) => String(doc.path || doc.label || '').trim()).filter(Boolean).join(' | ') || 'none'}`,
          '   - decisionEvidenceRequired: target-boundary command output, release artifact hygiene result, regenerated execution-v1 artifacts, reviewer note',
          '   - allowedClaimImpact: keep productionReadyClaim=false unless this stop-condition is closed and final gates pass',
          `   - releaseLink: ${blockerLink}`,
        ];
      })
    : ['- none'];
  const residualBlockerLines = productionBlockers.length
    ? productionBlockers.map((item, index) => `${index + 1}. ${String(item || '').trim()}`)
    : ['- none'];
  const lines = [
    'Target evidence reviewer decision record',
    `- category: ${normalizedCategory || 'all'}`,
    `- owner: ${normalizedOwner || 'all'}`,
    `- provider: ${normalizedProvider || 'all'}`,
    `- includeSharedProviderOperations: ${String(includeShared !== false)}`,
    `- sharedProviderOperationsScope: ${getReleaseSharedProviderOperationsScopeReason({ includeShared, provider: normalizedProvider })}`,
    ...buildReleaseSharedProviderOperationsScopeAuditLines({
      totalActions: allActions,
      category: normalizedCategory,
      includeShared,
      owner: normalizedOwner,
      provider: normalizedProvider,
    }),
    `- visibleCurrentBlockers: ${visibleActions.length}/${allActions.length}`,
    `- productionReadyStatus: ${summary.productionReadyStatus || releaseReadiness.productionReadyStatus || 'not tracked'}`,
    `- productionReadyBlocked: ${String(Boolean(summary.productionReadyBlocked ?? releaseReadiness.productionReadyBlocked ?? true))}`,
    `- productionBlockerCount: ${summary.productionBlockerCount ?? releaseReadiness.productionBlockerCount ?? productionBlockers.length}`,
    `- productionReadyStopReason: ${summary.productionReadyStopReason || releaseReadiness.productionReadyStopReason || 'not recorded'}`,
    `- releaseLink: ${sliceLink}`,
    `- releaseBlockerApiLink: ${releaseBlockerApiLink}`,
    `- targetEnvironmentEvidenceIntakeDoc: ${targetEnvironmentEvidenceDoc}`,
    `- releaseReadinessDoc: ${releaseReadinessDoc}`,
    '',
    'Reviewer decision checklist:',
    '- reviewer: <required reviewer name or team>',
    '- decisionOwner: <required accountable owner>',
    '- reviewDate: <required YYYY-MM-DD>',
    '- decision: still-blocked | accepted-with-scope | rejected | closed-after-evidence',
    '- acceptedRisks: <required accepted risk ids or none>',
    '- rejectedClaims: production-ready, live-provider-complete, or any broader claim missing target-boundary proof',
    '- allowedClaimText: <required claim text; must stay narrower than production-ready while blockers remain>',
    '- residualBlockersReviewed: yes/no',
    '- commandRerunLogReviewed: yes/no',
    '- releaseRefreshEvidenceReviewed: yes/no',
    '- productionReadyClaimDecision: keep productionReadyClaim=false unless every stop-condition is closed and final gates pass',
    '- nextReviewDate: <required YYYY-MM-DD>',
    '',
    'Blocker dispositions:',
    ...dispositionRows,
    '',
    'Residual production blockers:',
    ...residualBlockerLines,
    '',
    'Decision verification commands:',
    '- Target environment evidence intake: npm run smoke:target-environment-evidence-intake',
    '- Target provider evidence intake: npm run smoke:target-provider-evidence-intake',
    '- Target provider operations: npm run smoke:target-provider-operations',
    '- Artifact refresh after accepted target evidence: npm run refresh:execution-v1-artifacts',
    '- Production readiness gate: npm run smoke:production-readiness-gate',
    '- Release artifact hygiene: npm run smoke:release-artifact-hygiene',
    '- Execution v1 status: npm run smoke:execution-v1-status',
    '',
    'Decision rules:',
    '- This reviewer decision record can accept evidence for a scoped blocker disposition, but it is not production-ready approval.',
    '- accepted-with-scope requires explicit allowed claim text, expiry or next review date, and residual blocker list.',
    '- closed-after-evidence requires fresh target-boundary command evidence, artifact hygiene, regenerated release artifacts, and no remaining stop-condition for the closed claim.',
    '- Keep productionReadyClaim=false while any target environment, provider, identity/session, tenant isolation, observability/SLO, retention/backup, support, clean deployment, or customer exception blocker remains open.',
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseTargetEvidenceIntakeSummaryText({
  blockerActions = getFilteredReleaseCurrentOpenBlockerActions(),
  totalActions = getReleaseCurrentOpenBlockerActions(),
  category = state.releaseBlockerCategoryFilter,
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
  releaseStatus = state.releaseStatus,
} = {}) {
  const visibleActions = Array.isArray(blockerActions) ? blockerActions : [];
  const allActions = Array.isArray(totalActions) ? totalActions : [];
  if (!releaseStatus || !allActions.length) {
    return '';
  }

  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const releaseReadiness = releaseStatus.releaseReadiness || {};
  const summary = releaseStatus.summary || {};
  const productionBlockers = getReleaseProductionBlockers(releaseStatus);
  const sliceSummary = getReleaseBlockerSliceSummary({
    blockerActions: visibleActions,
    totalActions: allActions,
  });
  const releaseLink = buildReleaseBlockerSliceUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const releaseBlockerApiLink = buildReleaseBlockerApiUrl({
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  });
  const providerCounts = visibleActions.reduce((counts, item) => {
    const provider = String(item.provider || '').trim();
    if (!provider) {
      return counts;
    }
    counts.set(provider, (counts.get(provider) || 0) + 1);
    return counts;
  }, new Map());
  const providerCountLines = Array.from(providerCounts.entries())
    .sort(([leftProvider, leftCount], [rightProvider, rightCount]) =>
      rightCount - leftCount || leftProvider.localeCompare(rightProvider),
    )
    .map(([provider, count]) => `- ${provider}: ${count}`);
  const targetDocLines = [
    ['Target environment evidence intake', 'docs/target-environment-evidence-intake-v1.md'],
    ['Target deployment contract', 'docs/target-deployment-contract-v1.md'],
    ['Target provider evidence intake', 'docs/target-provider-evidence-intake-v1.md'],
    ['Target provider operations', 'docs/target-provider-operations-v1.md'],
    ['Release readiness', 'docs/release-readiness-v1.md'],
  ].map(([label, docPath]) => {
    const href = getAbsoluteReleaseUrl(`/api/execution-v1/release-doc?path=${encodeURIComponent(docPath)}`);
    return `- ${label}: ${docPath} (${href})`;
  });
  const requiredCommands = [
    'npm run smoke:target-environment-evidence-intake',
    'npm run smoke:target-deployment-contract',
    'npm run smoke:target-provider-evidence-intake',
    'npm run smoke:target-provider-operations',
    'npm run refresh:execution-v1-artifacts',
    'npm run smoke:production-readiness-gate',
    'npm run smoke:release-artifact-hygiene',
    'npm run smoke:execution-v1-status',
  ];
  const topBlockerLabel = sliceSummary.topVisibleBlockerLabel
    ? `${sliceSummary.topVisibleBlockerId || 'unknown'}: ${sliceSummary.topVisibleBlockerLabel}`
    : 'none';
  const lines = [
    'Target environment evidence intake summary',
    `- category: ${normalizedCategory || 'all'}`,
    `- owner: ${normalizedOwner || 'all'}`,
    `- provider: ${normalizedProvider || 'all'}`,
    `- includeSharedProviderOperations: ${String(includeShared !== false)}`,
    `- sharedProviderOperationsScope: ${getReleaseSharedProviderOperationsScopeReason({ includeShared, provider: normalizedProvider })}`,
    ...buildReleaseSharedProviderOperationsScopeAuditLines({
      totalActions: allActions,
      category: normalizedCategory,
      includeShared,
      owner: normalizedOwner,
      provider: normalizedProvider,
    }),
    `- visibleCurrentBlockers: ${sliceSummary.visibleCount}/${sliceSummary.totalCount}`,
    `- commandCount: ${sliceSummary.commandCount}`,
    `- evidenceDocCount: ${sliceSummary.evidenceDocCount}`,
    `- providerBlockerCount: ${Array.from(providerCounts.values()).reduce((total, count) => total + count, 0)}`,
    `- providerCount: ${providerCounts.size}`,
    `- topVisibleBlocker: ${topBlockerLabel}`,
    `- productionReadyStatus: ${summary.productionReadyStatus || releaseReadiness.productionReadyStatus || 'not tracked'}`,
    `- productionReadyBlocked: ${String(Boolean(summary.productionReadyBlocked ?? releaseReadiness.productionReadyBlocked ?? true))}`,
    `- productionBlockerCount: ${summary.productionBlockerCount ?? releaseReadiness.productionBlockerCount ?? productionBlockers.length}`,
    `- productionReadyStopReason: ${summary.productionReadyStopReason || releaseReadiness.productionReadyStopReason || 'not recorded'}`,
    `- releaseLink: ${releaseLink}`,
    `- releaseBlockerApiLink: ${releaseBlockerApiLink}`,
    '',
    'Provider blocker counts:',
    ...(providerCountLines.length ? providerCountLines : ['- none']),
    '',
    'Required target docs:',
    ...targetDocLines,
    '',
    'Required commands:',
    ...requiredCommands.map((command) => `- ${command}`),
    '',
    'Summary handoff rules:',
    '- This summary is triage manifest only; use target evidence packet copy before reviewer decision.',
    '- Do not treat a copied summary as production-ready approval.',
    '- Keep productionReadyClaim=false until every target stop-condition has accepted target-boundary evidence and final gates pass.',
  ];

  return `${lines.join('\n')}\n`;
}

export function buildReleaseBlockerSlicePackageText({
  blockerActions = getFilteredReleaseCurrentOpenBlockerActions(),
  totalActions = getReleaseCurrentOpenBlockerActions(),
  category = state.releaseBlockerCategoryFilter,
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const visibleActions = Array.isArray(blockerActions) ? blockerActions : [];
  const allActions = Array.isArray(totalActions) ? totalActions : [];
  if (!allActions.length) {
    return '';
  }

  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const buildOptions = {
    blockerActions: visibleActions,
    totalActions: allActions,
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
  };
  const sections = [
    buildReleaseBlockerSliceSummaryText(buildOptions),
    buildReleaseBlockerSliceHandoffText(buildOptions),
    buildReleaseBlockerSliceClosureChecklistText(buildOptions),
    buildReleaseBlockerClosureMatrixPackageText(buildOptions),
    buildReleaseBlockerSliceCommandText(buildOptions),
    buildReleaseBlockerSliceEvidenceText(buildOptions),
  ]
    .map((section) => String(section || '').trim())
    .filter(Boolean);

  if (!sections.length) {
    return '';
  }

  return `Release blocker slice package\n\n${sections.join('\n\n')}\n`;
}
