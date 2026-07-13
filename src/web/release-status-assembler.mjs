import {
  extractBulletValue,
  extractChecklistItems,
  extractDeterministicItems,
  extractDeterministicRuntimeItems,
  extractLiveValidationItems,
  extractReferenceAdoptionAggregate,
  extractSectionBullets,
  extractStatusMap,
} from './release-markdown-parser.mjs';

function isOptionalCloseoutLabel(label) {
  return /Anthropic live validation|Local provider live validation|local live validation|Hermes live validation|hermes live validation/i.test(String(label || ''));
}

function isReferenceAdoptionVerification(item) {
  return String(item?.script || '').trim() === 'smoke:reference-adoptions';
}

function isExecutionV1HelperVerification(item) {
  return String(item?.script || '').trim() === 'smoke:execution-v1-live-helpers';
}

function isExecutionV1HandoffVerification(item) {
  return String(item?.script || '').trim() === 'smoke:execution-v1-handoff';
}

function isProductionReadinessGateVerification(item) {
  return String(item?.script || '').trim() === 'smoke:production-readiness-gate';
}

export function buildExecutionV1ArtifactSummary(evidenceMarkdown = '', closeoutMarkdown = '') {
  const checklist = extractChecklistItems(closeoutMarkdown);
  const deterministic = extractDeterministicItems(evidenceMarkdown);
  const deterministicRuntime = extractDeterministicRuntimeItems(evidenceMarkdown);
  const referenceAdoptionAggregate = extractReferenceAdoptionAggregate(evidenceMarkdown);
  const coreDeterministic = deterministic.filter(
    (item) =>
      !isReferenceAdoptionVerification(item)
      && !isExecutionV1HelperVerification(item)
      && !isExecutionV1HandoffVerification(item)
      && !isProductionReadinessGateVerification(item),
  );
  const referenceAdoption = deterministic.filter(isReferenceAdoptionVerification);
  const executionV1Helpers = deterministic.filter(isExecutionV1HelperVerification);
  const executionV1Handoff = deterministic.filter(isExecutionV1HandoffVerification);
  const productionReadinessGate = deterministic.filter(isProductionReadinessGateVerification);
  const liveValidation = extractLiveValidationItems(evidenceMarkdown);
  const gaps = extractSectionBullets(evidenceMarkdown, 'Remaining Gaps');
  const notes = extractSectionBullets(closeoutMarkdown, 'Notes');
  const values = extractStatusMap(closeoutMarkdown);
  const requiredChecklistOpen = checklist.filter((item) => !item.done && !isOptionalCloseoutLabel(item.label)).length;
  const optionalChecklistOpen = checklist.filter((item) => !item.done && isOptionalCloseoutLabel(item.label)).length;
  const blockedItems = Object.entries(values).filter(
    ([label, value]) => /blocked|missing-env/i.test(String(value || '')) && !isOptionalCloseoutLabel(label),
  ).length;
  const optionalBlockedItems = Object.entries(values).filter(
    ([label, value]) => /blocked|missing-env/i.test(String(value || '')) && isOptionalCloseoutLabel(label),
  ).length;

  return {
    blockedItems,
    branch: extractBulletValue(closeoutMarkdown, 'branch') || extractBulletValue(evidenceMarkdown, 'branch'),
    checklist,
    closeoutGeneratedAt: extractBulletValue(closeoutMarkdown, 'generatedAt'),
    commit: extractBulletValue(closeoutMarkdown, 'commit') || extractBulletValue(evidenceMarkdown, 'commit'),
    coreDeterministicPassed: coreDeterministic.filter((item) => item.status === 'passed').length,
    coreDeterministicTotal: coreDeterministic.length,
    deterministic,
    deterministicPassed: deterministic.filter((item) => item.status === 'passed').length,
    deterministicRuntime,
    evidenceGeneratedAt: extractBulletValue(evidenceMarkdown, 'generatedAt'),
    gaps,
    liveValidation,
    notes,
    optionalBlockedItems,
    optionalChecklistOpen,
    referenceAdoptionAggregate,
    referenceAdoptionPassed: referenceAdoption.filter((item) => item.status === 'passed').length,
    referenceAdoptionTotal: referenceAdoption.length,
    executionV1HelperPassed: executionV1Helpers.filter((item) => item.status === 'passed').length,
    executionV1HelperTotal: executionV1Helpers.length,
    executionV1HandoffPassed: executionV1Handoff.filter((item) => item.status === 'passed').length,
    executionV1HandoffTotal: executionV1Handoff.length,
    productionReadinessGatePassed: productionReadinessGate.filter((item) => item.status === 'passed').length,
    productionReadinessGateTotal: productionReadinessGate.length,
    requiredChecklistOpen,
    values,
  };
}

function getLiveValidationValue(values, provider) {
  const target = `${String(provider || '').trim().toLowerCase()} live validation`;
  const entry = Object.entries(values || {}).find(([label]) => String(label || '').trim().toLowerCase() === target);
  return String(entry?.[1] || '').trim().toLowerCase();
}

export function assembleExecutionV1Status({
  artifactSyncCommit = {},
  baselineArtifacts = buildExecutionV1ArtifactSummary(),
  baselineDocumentsAvailable = {},
  baselineHandoffGeneratedAt = '',
  closeout = {},
  currentArtifacts = buildExecutionV1ArtifactSummary(),
  currentBranch = '',
  currentCommit = '',
  docStatuses = [],
  evidence = {},
  generatedAtFallback = '',
  handoff = {},
  handoffArtifacts = [],
  providerReadiness = [],
  releaseActionHistory = [],
  releaseReadiness = {},
  runtimeJobs = {},
  snapshot = null,
} = {}) {
  const evidenceMarkdown = String(evidence.markdown || '');
  const closeoutMarkdown = String(closeout.markdown || '');
  const handoffMarkdown = String(handoff.markdown || '');
  const generatedCommit = currentArtifacts.commit;
  const generatedBranch = currentArtifacts.branch;
  const handoffCommit = String(handoff.commit || '');
  const staleReasons = [];
  const localArtifactNotes = [];

  if (!evidenceMarkdown || !closeoutMarkdown || !handoffMarkdown) {
    staleReasons.push('evidence, closeout, handoff 문서 중 아직 생성되지 않은 문서가 있습니다.');
  }
  if (generatedCommit && currentCommit && generatedCommit !== currentCommit && !artifactSyncCommit.detected) {
    staleReasons.push('현재 HEAD와 evidence/closeout이 가리키는 commit이 다릅니다.');
  }
  if (
    handoffCommit
      && currentCommit
      && handoffCommit !== currentCommit
      && !(artifactSyncCommit.detected && handoffCommit === artifactSyncCommit.verifiedCommit)
  ) {
    staleReasons.push('현재 HEAD와 handoff가 가리키는 commit이 다릅니다.');
  }
  if (handoffCommit && generatedCommit && handoffCommit !== generatedCommit) {
    staleReasons.push('handoff와 evidence/closeout이 가리키는 commit이 다릅니다.');
  }

  const artifactsMatchCurrentHead = Boolean(
    generatedCommit
      && currentCommit
      && (generatedCommit === currentCommit || artifactSyncCommit.detected),
  );
  const handoffMatchesCurrentHead = Boolean(
    handoffCommit
      && currentCommit
      && (handoffCommit === currentCommit || (artifactSyncCommit.detected && handoffCommit === artifactSyncCommit.verifiedCommit)),
  );
  const handoffMatchesGeneratedCommit = Boolean(handoffCommit && generatedCommit && handoffCommit === generatedCommit);
  const hasLocalArtifactChanges = docStatuses.length > 0;

  if (hasLocalArtifactChanges) {
    if (artifactsMatchCurrentHead && handoffMatchesCurrentHead) {
      localArtifactNotes.push('evidence/closeout/handoff/export/drill 문서가 현재 HEAD 기준으로 로컬에서 갱신되었지만 아직 커밋되지는 않았습니다.');
    } else {
      staleReasons.push('evidence, closeout, handoff, export, drill 문서 중 워크트리에서 수정된 문서가 현재 HEAD와 어긋나 있습니다.');
    }
  }
  if (artifactSyncCommit.detected) {
    localArtifactNotes.push('현재 HEAD는 verified commit 위에 release artifact만 동기화한 커밋이므로 evidence/closeout/handoff/export/drill freshness를 유지한 것으로 처리합니다.');
  }

  const stale = staleReasons.length > 0;
  const baselineReady = Boolean(
    snapshot
      && baselineDocumentsAvailable.evidence
      && baselineDocumentsAvailable.closeout
      && baselineDocumentsAvailable.handoff
      && baselineArtifacts.requiredChecklistOpen === 0
      && baselineArtifacts.blockedItems === 0,
  );
  const artifactState = !evidenceMarkdown || !closeoutMarkdown || !handoffMarkdown
    ? 'missing'
    : stale
      ? 'stale'
      : artifactSyncCommit.detected
        ? 'artifact-sync-current'
        : hasLocalArtifactChanges
          ? 'local-current'
          : 'current';
  const refreshPlan = {
    allowed: true,
    affectsPaths: [evidence.path, closeout.path, handoff.path],
    rerunsDeterministicVerification: true,
    rerunsLiveValidation: false,
    rewritesCurrentSurface: true,
    snapshotChanges: false,
    summary:
      'current surface 재생성은 deterministic verification을 다시 실행한 뒤 evidence, closeout, handoff markdown을 현재 HEAD 기준으로 다시 씁니다.',
    notes: [
      'verified snapshot은 그대로 유지되고, current surface evidence/closeout/handoff만 다시 생성됩니다.',
      'provider live validation은 provider별 live action을 눌렀을 때만 다시 실행됩니다.',
      hasLocalArtifactChanges
        ? '현재 로컬에서 수정된 evidence/closeout/handoff 문서는 재생성 결과로 덮어써질 수 있습니다.'
        : '현재 evidence/closeout/handoff 문서가 워크트리에서 추가로 수정된 상태는 아닙니다.',
      stale
        ? '현재 stale reason이 남아 있어도 재생성은 가능하며, 최신 HEAD 기준 상태를 다시 계산합니다.'
        : '현재 HEAD 기준으로 다시 계산해도 같은 readiness를 유지해야 합니다.',
    ],
  };
  const recommendedActions = [];

  if (stale) {
    recommendedActions.push({
      action: 'regenerate-release-surface',
      category: 'required',
      description: '현재 HEAD와 current surface evidence/closeout/handoff가 어긋나 있어 release tab의 mutable artifact를 다시 맞춰야 합니다.',
      label: 'current surface 재생성',
      priority: 1,
    });
  }

  if (
    !stale
      && !artifactSyncCommit.detected
      && snapshot?.verifiedCommit !== currentCommit
      && evidenceMarkdown
      && closeoutMarkdown
      && handoffMarkdown
      && currentArtifacts.requiredChecklistOpen === 0
      && currentArtifacts.blockedItems === 0
  ) {
    recommendedActions.push({
      action: 'archive-release-snapshot',
      category: 'release',
      description: '현재 HEAD 기준 current surface가 fresh하므로 verified baseline을 새 commit으로 고정할 수 있습니다.',
      label: 'release snapshot 고정',
      priority: 2,
    });
  }

  providerReadiness.forEach((item) => {
    const providerStatus = getLiveValidationValue(currentArtifacts.values, item.provider);
    if (providerStatus === 'passed') {
      return;
    }
    if (item.ready) {
      recommendedActions.push({
        action: 'run-release-preflight',
        actionProvider: item.provider,
        category: isOptionalCloseoutLabel(`${item.provider} live validation`) ? 'optional' : 'required',
        command: item.preflightCommand,
        description: `${item.label} provider env가 준비되어 있습니다. live validation 전 deterministic preflight를 다시 확인할 수 있습니다.`,
        envKey: item.envKey,
        evidenceCommand: item.evidenceCommand,
        label: `${item.label} preflight 실행`,
        liveCommand: item.command,
        priority: item.provider === 'openai' ? 3 : 4,
        provider: item.provider,
      });
      return;
    }
    recommendedActions.push({
      category: isOptionalCloseoutLabel(`${item.provider} live validation`) ? 'optional' : 'required',
      command: `export ${item.envKey}="..." && ${item.command}`,
      description: `${item.label} live validation은 ${item.envKey}가 있어야 실행할 수 있습니다.`,
      envKey: item.envKey,
      evidenceCommand: item.evidenceCommand,
      label: `${item.label} env 준비`,
      liveCommand: item.command,
      priority: item.provider === 'openai' ? 3 : 5,
      provider: item.provider,
    });
  });

  recommendedActions.sort((left, right) => Number(left.priority || 99) - Number(right.priority || 99));

  return {
    artifactState,
    artifactSyncCommit,
    artifactsMatchCurrentHead,
    branch: generatedBranch,
    checklist: currentArtifacts.checklist,
    closeout,
    commit: generatedCommit,
    currentBranch,
    currentCommit,
    deterministic: currentArtifacts.deterministic,
    deterministicRuntime: currentArtifacts.deterministicRuntime,
    docStatuses,
    evidence,
    gaps: currentArtifacts.gaps,
    handoffArtifacts,
    handoff,
    liveValidation: currentArtifacts.liveValidation,
    localArtifactNotes,
    notes: currentArtifacts.notes,
    recommendedActions,
    referenceAdoptionAggregate: currentArtifacts.referenceAdoptionAggregate,
    releaseReadiness,
    releaseActionHistory,
    runtimeJobs,
    providerReadiness,
    refreshPlan,
    snapshotEligibility: {
      allowed: Boolean(
        !stale
          && !artifactSyncCommit.detected
          && currentArtifacts.requiredChecklistOpen === 0
          && currentArtifacts.blockedItems === 0
          && evidenceMarkdown
          && closeoutMarkdown
          && handoffMarkdown,
      ),
      reason: !evidenceMarkdown || !closeoutMarkdown || !handoffMarkdown
        ? 'evidence, closeout, handoff 문서 중 아직 없는 문서가 있습니다.'
        : stale
          ? 'current evidence/closeout/handoff가 최신 HEAD와 어긋나 있습니다.'
          : artifactSyncCommit.detected
            ? '현재 HEAD는 release artifact sync 커밋이므로 새 snapshot freeze 대상이 아닙니다.'
            : currentArtifacts.requiredChecklistOpen > 0
              ? `필수 closeout checklist ${currentArtifacts.requiredChecklistOpen}건이 남아 있습니다.`
              : currentArtifacts.blockedItems > 0
                ? `필수 gap ${currentArtifacts.blockedItems}건이 남아 있습니다.`
                : 'current HEAD 기준 snapshot 생성 가능',
    },
    baseline: snapshot
      ? {
          archivedAt: snapshot.archivedAt,
          blockedItems: baselineArtifacts.blockedItems,
          branch: baselineArtifacts.branch,
          checklistOpen: baselineArtifacts.requiredChecklistOpen,
          checklistTotal: baselineArtifacts.checklist.length,
          commit: snapshot.verifiedCommit || baselineArtifacts.commit,
          coreDeterministicPassed: baselineArtifacts.coreDeterministicPassed,
          coreDeterministicTotal: baselineArtifacts.coreDeterministicTotal,
          deterministicPassed: baselineArtifacts.deterministicPassed,
          deterministicRuntimeTotal: baselineArtifacts.deterministicRuntime.length,
          deterministicTotal: baselineArtifacts.deterministic.length,
          exists: true,
          generatedAt:
            baselineArtifacts.closeoutGeneratedAt || baselineArtifacts.evidenceGeneratedAt || snapshot.archivedAt,
          optionalBlockedItems: baselineArtifacts.optionalBlockedItems,
          optionalChecklistOpen: baselineArtifacts.optionalChecklistOpen,
          handoffGeneratedAt: baselineHandoffGeneratedAt,
          referenceAdoptionAggregate: baselineArtifacts.referenceAdoptionAggregate,
          executionV1HelperPassed: baselineArtifacts.executionV1HelperPassed,
          executionV1HelperTotal: baselineArtifacts.executionV1HelperTotal,
          executionV1HandoffPassed: baselineArtifacts.executionV1HandoffPassed,
          executionV1HandoffTotal: baselineArtifacts.executionV1HandoffTotal,
          productionReadinessGatePassed: baselineArtifacts.productionReadinessGatePassed,
          productionReadinessGateTotal: baselineArtifacts.productionReadinessGateTotal,
          referenceAdoptionPassed: baselineArtifacts.referenceAdoptionPassed,
          referenceAdoptionTotal: baselineArtifacts.referenceAdoptionTotal,
          ready: baselineReady,
        }
      : null,
    snapshot,
    stale,
    staleReasons,
    summary: {
      baselineBlockedItems: baselineArtifacts.blockedItems,
      baselineChecklistOpen: baselineArtifacts.requiredChecklistOpen,
      baselineCoreDeterministicPassed: baselineArtifacts.coreDeterministicPassed,
      baselineCoreDeterministicTotal: baselineArtifacts.coreDeterministicTotal,
      baselineDeterministicPassed: baselineArtifacts.deterministicPassed,
      baselineDeterministicRuntimeTotal: baselineArtifacts.deterministicRuntime.length,
      baselineDeterministicTotal: baselineArtifacts.deterministic.length,
      baselineExecutionV1HelperPassed: baselineArtifacts.executionV1HelperPassed,
      baselineExecutionV1HelperTotal: baselineArtifacts.executionV1HelperTotal,
      baselineExecutionV1HandoffPassed: baselineArtifacts.executionV1HandoffPassed,
      baselineExecutionV1HandoffTotal: baselineArtifacts.executionV1HandoffTotal,
      baselineProductionReadinessGatePassed: baselineArtifacts.productionReadinessGatePassed,
      baselineProductionReadinessGateTotal: baselineArtifacts.productionReadinessGateTotal,
      baselineReferenceAdoptionAggregateScriptCount: baselineArtifacts.referenceAdoptionAggregate.scriptCount,
      baselineReferenceAdoptionPassed: baselineArtifacts.referenceAdoptionPassed,
      baselineReferenceAdoptionTotal: baselineArtifacts.referenceAdoptionTotal,
      baselineReady,
      blockedItems: currentArtifacts.blockedItems,
      checklistOpen: currentArtifacts.requiredChecklistOpen,
      checklistTotal: currentArtifacts.checklist.length,
      coreDeterministicPassed: currentArtifacts.coreDeterministicPassed,
      coreDeterministicTotal: currentArtifacts.coreDeterministicTotal,
      deterministicPassed: currentArtifacts.deterministicPassed,
      deterministicRuntimeTotal: currentArtifacts.deterministicRuntime.length,
      deterministicTotal: currentArtifacts.deterministic.length,
      executionV1HelperPassed: currentArtifacts.executionV1HelperPassed,
      executionV1HelperReady: currentArtifacts.executionV1HelperTotal > 0
        && currentArtifacts.executionV1HelperPassed === currentArtifacts.executionV1HelperTotal,
      executionV1HelperTotal: currentArtifacts.executionV1HelperTotal,
      executionV1HandoffPassed: currentArtifacts.executionV1HandoffPassed,
      executionV1HandoffReady: currentArtifacts.executionV1HandoffTotal > 0
        && currentArtifacts.executionV1HandoffPassed === currentArtifacts.executionV1HandoffTotal,
      executionV1HandoffTotal: currentArtifacts.executionV1HandoffTotal,
      productionReadinessGatePassed: currentArtifacts.productionReadinessGatePassed,
      productionReadinessGateReady: currentArtifacts.productionReadinessGateTotal > 0
        && currentArtifacts.productionReadinessGatePassed === currentArtifacts.productionReadinessGateTotal,
      productionReadinessGateTotal: currentArtifacts.productionReadinessGateTotal,
      optionalBlockedItems: currentArtifacts.optionalBlockedItems,
      optionalChecklistOpen: currentArtifacts.optionalChecklistOpen,
      productionBlockerCount: releaseReadiness.productionBlockerCount,
      productionReadyBlocked: releaseReadiness.productionReadyBlocked,
      productionReadyStatus: releaseReadiness.productionReadyStatus,
      productionReadyStopReason: releaseReadiness.productionReadyStopReason,
      referenceAdoptionAggregateScriptCount: currentArtifacts.referenceAdoptionAggregate.scriptCount,
      referenceAdoptionPassed: currentArtifacts.referenceAdoptionPassed,
      referenceAdoptionReady: currentArtifacts.referenceAdoptionTotal > 0
        && currentArtifacts.referenceAdoptionPassed === currentArtifacts.referenceAdoptionTotal,
      referenceAdoptionTotal: currentArtifacts.referenceAdoptionTotal,
      ready: currentArtifacts.requiredChecklistOpen === 0 && currentArtifacts.blockedItems === 0 && !stale,
      currentOpenBlockerActionCount: releaseReadiness.currentOpenBlockerActionCount,
      currentOpenBlockerCount: releaseReadiness.currentOpenBlockerCount,
      runtimeJobActiveCount: runtimeJobs.activeCount,
      runtimeJobRecentCount: runtimeJobs.recentCount,
      stale,
      staleReasonCount: staleReasons.length,
      handoffReady: Boolean(handoffMarkdown && (handoffMatchesCurrentHead || (!currentCommit && handoffMatchesGeneratedCommit))),
    },
    updatedAt:
      currentArtifacts.closeoutGeneratedAt
      || currentArtifacts.evidenceGeneratedAt
      || handoff.generatedAt
      || generatedAtFallback,
    values: currentArtifacts.values,
  };
}
