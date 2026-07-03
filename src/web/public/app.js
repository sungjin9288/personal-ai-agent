import {
  stripFileExtension,
  getFileExtension,
  formatByteCount,
  getHarnessPageSizeLabel,
  getHarnessPageLabel,
  getHarnessRangeLabel,
  getDetailTabLabel,
  getRetrievalCompareStatusLabel,
  getReleaseCountRecordEntries,
  formatProviderFallbackEventCountLines,
  getPrimaryArtifact,
  inferCommandOption,
  inferFallbackPolicyFromCommand,
  getLearningPromotionCandidateId,
  formatLearningPromotionAuditValue,
  getFormEditingId,
  getReleaseProductionBlockerVerificationCommands,
} from './lib/text-format.js';
import {
  normalizeUiParam,
  normalizeReleaseProductionBlockerStateIndex,
  normalizeReleaseProductionBlockerQueryIndex,
  getReleaseProductionBlockerOrdinal,
  getSanitizedReleaseHistoryOutcome,
  getSanitizedRetrievalSourceType,
  getSanitizedMissionActionsFilter,
  getRetrievalSourceKey,
  getRetrievalArtifactTargetLabel,
  getReleaseHandoffStructuredSummaryDetailCopyKey,
  getReleaseHandoffStructuredSummaryStableLineCopyKey,
  getReleaseCommandCopyKey,
  getReleaseLinkCopyKey,
} from './lib/ui-params.js';
import {
  getReleaseHandoffStableLineCopyLabel,
  getReleaseHandoffAdditionalSummaryKeys,
  appendReleaseHandoffSummaryRow,
  getReleaseHandoffStructuredSummaryRows,
  getReleaseHandoffStructuredSummaryDetails,
  getReleaseHandoffStructuredSummaryDetailOverviewLine,
  getReleaseHandoffStructuredSummarySha,
  getReleaseHandoffStructuredSummaryOverviewLine,
} from './lib/release-handoff-summary.js';
import {
  escapeHtml,
  formatDate,
  formatDurationMs,
  getDisplayLabel,
  getStatusClass,
  markdownToHtml,
} from './lib/html-format.js';
import {
  SPECIALIST_KIND_META,
  applyReleaseActionButtonLabels,
  buildLearningPromotionAuditPackageText,
  formatRetrievalSourceLabel,
  formatSpecialistShortLabel,
  getProviderAttentionRemediationPayload,
  getReleaseBlockerClosureVerification,
  getReleaseBlockerRequiredCommands,
  getReleaseBlockerRequiredEvidenceDocs,
  getReleaseBlockerRequiredProofs,
  getReleaseProductionBlockerSummaryCopyKey,
  getReleaseProviderClosureSummary,
  getReleaseProviderReadinessPackageCopyKey,
  getRetrievalArtifactOpenLabel,
  getRetrievalSourceActionLabel,
  isReleaseSharedProviderBlockerAction,
} from './lib/status-labels.js';
import {
  emptyStateCard,
  renderActionInboxEmptyList,
  renderActionInboxFallbackStopFilterSelect,
  renderActionInboxList,
  renderActionInboxSummaryChip,
  renderActionInboxUnavailableState,
  renderAgentBlueprintCardButton,
  renderAgentIntentPillButton,
  renderApprovalActionButton,
  renderDoctorDetailPanel,
  renderExecutionApprovalPendingButton,
  renderExecutionControlActionButton,
  renderFlowQuickActionButton,
  renderHarnessEngineeringGuardrails,
  renderHarnessFilterChips,
  renderLoopEngineeringCycleList,
  renderLoopEngineeringFoundationTags,
  renderMemoryBrowseActionButton,
  renderMissionAttachmentUploadButton,
  renderMissionSelectionButton,
  renderOutputTabButton,
  renderOutputToolbarToggleButton,
  renderPlaybookCardButton,
  renderProviderFallbackEventActionButton,
  renderReleaseBlockerFilterButton,
  renderReleaseBlockerFocusButton,
  renderReleaseClearActionButton,
  renderReleaseConfirmActionButton,
  renderReleasePreflightAllButton,
  renderReleaseProviderActionButton,
  renderReleaseProviderFocusActionButton,
  renderReleaseRecommendationActionButton,
  renderReleaseSimpleActionButton,
  renderReleaseStatusRefreshButton,
  renderReleaseTabActionButton,
  renderRetrievalArtifactOpenButton,
  renderRetrievalSourceFocusButton,
  renderRetrievalSourceFocusClearButton,
  renderSelectableDetailButton,
  renderSpecialistTagList,
  renderTemplateChipButton,
} from './lib/render-fragments.js';
import { state, elements } from './lib/app-state.js';
import {
  getSanitizedStepId,
  getSanitizedDetailTab,
  parseUiStateFromUrl,
  buildUiStateUrl,
  writeUiStateToUrl,
} from './lib/url-state.js';
import {
  focusReleaseHistoryEntry,
  focusReleaseBlocker,
  focusReleaseProductionBlocker,
  setReleaseBlockerFilter,
  toggleReleaseHistoryEntry,
  clearReleaseHistoryFocus,
  clearReleaseBlockerFocus,
  clearReleaseProductionBlockerFocus,
  clearReleaseBlockerFilter,
  setReleaseHistoryFilter,
  clearReleaseHistoryFilter,
  applyReleaseHistoryUrlState,
  applyReleaseBlockerUrlState,
  applyReleaseProductionBlockerUrlState,
  applyReleaseBlockerFilterUrlState,
  focusReleaseHistoryFlow,
  focusReleaseProvider,
  clearReleaseProviderFocus,
  applyReleaseProviderUrlState,
} from './lib/release-navigation.js';
import {
  applyRetrievalSourceUrlState,
  getActiveRetrievalSourceFocus,
  clearRetrievalSourceFocus,
  focusRetrievalSource,
  wireRetrievalSourceButtons,
} from './lib/retrieval-navigation.js';
import {
  getReleaseTargetEvidenceIntakeSummaryCopyKey,
  isCopiedReleaseTargetEvidenceIntakeSummary,
  markCopiedReleaseTargetEvidenceIntakeSummary,
  getReleaseTargetEvidenceCaptureTemplateCopyKey,
  isCopiedReleaseTargetEvidenceCaptureTemplate,
  markCopiedReleaseTargetEvidenceCaptureTemplate,
  getReleaseTargetEvidenceRequiredCommandsCopyKey,
  isCopiedReleaseTargetEvidenceRequiredCommands,
  markCopiedReleaseTargetEvidenceRequiredCommands,
  getReleaseTargetEvidenceProductionGapCopyKey,
  isCopiedReleaseTargetEvidenceProductionGap,
  markCopiedReleaseTargetEvidenceProductionGap,
  getReleaseTargetEvidenceExceptionRegisterCopyKey,
  isCopiedReleaseTargetEvidenceExceptionRegister,
  markCopiedReleaseTargetEvidenceExceptionRegister,
  getReleaseTargetEvidenceRiskDecisionRegisterCopyKey,
  isCopiedReleaseTargetEvidenceRiskDecisionRegister,
  markCopiedReleaseTargetEvidenceRiskDecisionRegister,
  getReleaseTargetEvidenceProviderReferencesCopyKey,
  isCopiedReleaseTargetEvidenceProviderReferences,
  markCopiedReleaseTargetEvidenceProviderReferences,
  getReleaseTargetEvidenceResidualBlockersCopyKey,
  isCopiedReleaseTargetEvidenceResidualBlockers,
  markCopiedReleaseTargetEvidenceResidualBlockers,
  getReleaseTargetEvidenceClosureRulesCopyKey,
  isCopiedReleaseTargetEvidenceClosureRules,
  markCopiedReleaseTargetEvidenceClosureRules,
  getReleaseTargetEvidenceSubmissionManifestCopyKey,
  isCopiedReleaseTargetEvidenceSubmissionManifest,
  markCopiedReleaseTargetEvidenceSubmissionManifest,
  getReleaseTargetEvidenceSanitizedRegisterCopyKey,
  isCopiedReleaseTargetEvidenceSanitizedRegister,
  markCopiedReleaseTargetEvidenceSanitizedRegister,
  getReleaseTargetEvidenceBoundaryMapCopyKey,
  isCopiedReleaseTargetEvidenceBoundaryMap,
  markCopiedReleaseTargetEvidenceBoundaryMap,
  getReleaseTargetEvidenceCommandRerunLogCopyKey,
  isCopiedReleaseTargetEvidenceCommandRerunLog,
  markCopiedReleaseTargetEvidenceCommandRerunLog,
  getReleaseTargetEvidenceDecisionRecordCopyKey,
  isCopiedReleaseTargetEvidenceDecisionRecord,
  markCopiedReleaseTargetEvidenceDecisionRecord,
  getReleaseTargetEvidenceBlockerDispositionCopyKey,
  isCopiedReleaseTargetEvidenceBlockerDisposition,
  markCopiedReleaseTargetEvidenceBlockerDisposition,
  getReleaseTargetEvidenceReleaseRefreshCopyKey,
  isCopiedReleaseTargetEvidenceReleaseRefresh,
  markCopiedReleaseTargetEvidenceReleaseRefresh,
  getReleaseTargetEvidenceIntakePacketCopyKey,
  isCopiedReleaseTargetEvidenceIntakePacket,
  markCopiedReleaseTargetEvidenceIntakePacket,
} from './lib/release-target-evidence-copy.js';
import { loadDoctor, renderDoctorSummary } from './lib/doctor-surface.js';
import {
  setWorkspaceFormStatus,
  setWorkspaceFormOpen,
  handleWorkspaceCreate,
  renderWorkspaceCurrent,
  loadWorkspaces,
  restoreWorkspaceSelectionUrlState,
  handleWorkspaceMemoryCreate,
} from './lib/workspace-surface.js';
import {
  markCopiedCurrentViewLink,
  markCopiedReleaseBlockerClosureChecklist,
  markCopiedReleaseBlockerClosureMatrix,
  markCopiedReleaseBlockerCommands,
  markCopiedReleaseBlockerEvidence,
  markCopiedReleaseBlockerHandoff,
  markCopiedReleaseBlockerPackage,
  markCopiedReleaseBlockerSummary,
  markCopiedReleaseCommand,
  markCopiedReleaseHandoffPreviewLink,
  markCopiedReleaseHandoffSummary,
  markCopiedReleaseHandoffSummaryDetail,
  markCopiedReleaseHandoffSummaryStableLine,
  markCopiedReleaseLink,
  markCopiedReleaseProductionBlockerDetail,
  markCopiedReleaseProductionBlockerSummary,
  markCopiedReleaseProviderReadinessPackage,
  markCopiedRetrievalSource,
} from './lib/copy-state.js';
import {
  renderCurrentViewLinkCopyButton,
  renderReleaseBlockerClosureChecklistCopyButton,
  renderReleaseBlockerClosureMatrixCopyButton,
  renderReleaseBlockerCommandsCopyButton,
  renderReleaseBlockerEvidenceCopyButton,
  renderReleaseBlockerHandoffCopyButton,
  renderReleaseBlockerPackageCopyButton,
  renderReleaseBlockerSummaryCopyButton,
  renderReleaseCommandCopyButton,
  renderReleaseHandoffLinkCopyButton,
  renderReleaseHandoffStructuredSummaryCopyButton,
  renderReleaseLinkCopyButton,
  renderReleaseProductionBlockerDetailCopyButton,
  renderReleaseProductionBlockerSummaryCopyButton,
  renderReleaseProviderNavigationButton,
  renderReleaseProviderReadinessPackageCopyButton,
  renderReleaseTargetEvidenceBlockerDispositionCopyButton,
  renderReleaseTargetEvidenceBoundaryMapCopyButton,
  renderReleaseTargetEvidenceCaptureTemplateCopyButton,
  renderReleaseTargetEvidenceClosureRulesCopyButton,
  renderReleaseTargetEvidenceCommandRerunLogCopyButton,
  renderReleaseTargetEvidenceDecisionRecordCopyButton,
  renderReleaseTargetEvidenceExceptionRegisterCopyButton,
  renderReleaseTargetEvidenceIntakePacketCopyButton,
  renderReleaseTargetEvidenceIntakeSummaryCopyButton,
  renderReleaseTargetEvidenceProductionGapCopyButton,
  renderReleaseTargetEvidenceProviderReferencesCopyButton,
  renderReleaseTargetEvidenceReleaseRefreshCopyButton,
  renderReleaseTargetEvidenceRequiredCommandsCopyButton,
  renderReleaseTargetEvidenceResidualBlockersCopyButton,
  renderReleaseTargetEvidenceRiskDecisionRegisterCopyButton,
  renderReleaseTargetEvidenceSanitizedRegisterCopyButton,
  renderReleaseTargetEvidenceSubmissionManifestCopyButton,
  renderReleaseToggleActionButton,
  renderRetrievalSourceCopyButton,
} from './lib/copy-buttons.js';
import {
  buildReleaseBlockerClosureChecklistText,
  buildReleaseBlockerClosureMatrixPackageText,
  buildReleaseBlockerHandoffText,
  buildReleaseBlockerPackageText,
  buildReleaseBlockerSliceClosureChecklistText,
  buildReleaseBlockerSliceCommandText,
  buildReleaseBlockerSliceEvidenceText,
  buildReleaseBlockerSliceHandoffText,
  buildReleaseBlockerSlicePackageText,
  buildReleaseBlockerSliceSummaryText,
  buildReleaseProductionBlockerCommandText,
  buildReleaseProductionBlockerHandoffText,
  buildReleaseProductionBlockerPackageText,
  buildReleaseProductionBlockerSummaryText,
  buildReleaseProviderReadinessPackageText,
  buildReleaseTargetEvidenceBlockerDispositionRegisterText,
  buildReleaseTargetEvidenceBoundaryConsistencyMapText,
  buildReleaseTargetEvidenceCaptureTemplateText,
  buildReleaseTargetEvidenceClosureRulesText,
  buildReleaseTargetEvidenceCommandRerunLogText,
  buildReleaseTargetEvidenceExceptionRegisterText,
  buildReleaseTargetEvidenceIntakePacketText,
  buildReleaseTargetEvidenceIntakeSummaryText,
  buildReleaseTargetEvidenceProductionGapText,
  buildReleaseTargetEvidenceProviderEvidenceReferencesText,
  buildReleaseTargetEvidenceReleaseRefreshEvidenceText,
  buildReleaseTargetEvidenceRequiredCommandsText,
  buildReleaseTargetEvidenceResidualBlockersText,
  buildReleaseTargetEvidenceReviewerDecisionRecordText,
  buildReleaseTargetEvidenceRiskDecisionRegisterText,
  buildReleaseTargetEvidenceSanitizedRegisterText,
  buildReleaseTargetEvidenceSubmissionManifestText,
} from './lib/release-evidence-text.js';

const RELEASE_HANDOFF_PREVIEWABLE_FORMATS = new Set(['json', 'markdown', 'text']);
const RELEASE_HANDOFF_PREVIEW_MAX_CHARACTERS = 20000;
const RELEASE_HANDOFF_PREVIEW_MAX_LINES = 180;
const PROVIDER_FALLBACK_POLICY_FILTER_OPTIONS = [
  '',
  'provider-failure-only',
  'recoverable-provider-failure-only',
];
const PROVIDER_FALLBACK_STOP_REASON_FILTER_OPTIONS = [
  '',
  'eligible-provider-failure',
  'mission-status-completed',
  'non-recoverable-provider-failure',
  'no-provider-failure-metadata',
];
const UI_TEXT_ATTACHMENT_EXTENSIONS = new Set([
  '.c',
  '.cc',
  '.cpp',
  '.css',
  '.csv',
  '.go',
  '.html',
  '.htm',
  '.java',
  '.js',
  '.json',
  '.jsx',
  '.log',
  '.md',
  '.mjs',
  '.py',
  '.rb',
  '.rs',
  '.sql',
  '.text',
  '.ts',
  '.tsx',
  '.txt',
  '.xml',
  '.yaml',
  '.yml',
]);

const missionTemplates = [
  {
    title: 'PRD 초안',
    subtitle: '문제, 목표, 요구사항, 성공 신호, 다음 액션까지 구조화',
    values: {
      constraints: '핵심 사용자 문제를 명시\n성공 기준을 테스트 가능하게 작성\n다음 액션의 담당자와 기한 포함',
      deliverableType: 'prd',
      mode: 'knowledge',
      objective: '문제 정의부터 실행 가능한 PRD 초안까지 구조화',
      title: '신규 기능 PRD 초안',
    },
  },
  {
    title: '운영 방향 정리',
    subtitle: '운영 원칙, 의사결정 주기, 역할 분담을 빠르게 정리',
    values: {
      constraints: '운영 원칙 포함\n의사결정 cadence 정의\n담당자와 검토 주기 명시',
      deliverableType: 'decision-memo',
      mode: 'knowledge',
      objective: '프로젝트 운영 방식과 의사결정 구조를 정리',
      title: '운영 방향 정리',
    },
  },
  {
    title: '프롬프트 설계',
    subtitle: '에이전트 역할별 프롬프트 뼈대와 품질 기준 정의',
    values: {
      constraints: '역할별 프롬프트 뼈대 포함\n입력/출력 형식 정의\n품질 기준 명시',
      deliverableType: 'prd',
      mode: 'knowledge',
      objective: '에이전트가 재사용할 프롬프트 구조와 운영 규칙 정의',
      title: '프롬프트 설계 문서',
    },
  },
];

const missionPlaybooks = [
  {
    id: 'team-pipeline',
    origin: 'oh-my-claudecode',
    title: '팀 파이프라인',
    subtitle: '단계형 멀티 에이전트 핸드오프',
    description: '매니저가 방향을 잡고 플래너, 실행, 리뷰어 순으로 넘기는 기본 운영 흐름입니다.',
    values: {
      constraints:
        '단계형 매니저→플래너→실행→리뷰어 핸드오프를 유지\n각 단계 산출물과 담당자를 명시\n최종 리뷰어 승인 필요',
      deliverableType: 'prd',
      mode: 'knowledge',
      objective: '단계형 멀티 에이전트 운영 흐름으로 결과물을 구조화',
      title: '팀 파이프라인 미션',
    },
  },
  {
    id: 'research-first',
    origin: 'everything-claude-code',
    title: '리서치 우선',
    subtitle: '실행 전 근거와 리스크 정리',
    description: '실행 전에 옵션, 가정, 리스크를 먼저 정리하는 조사 중심 플레이북입니다.',
    values: {
      constraints:
        '근거 기반 옵션 비교 포함\n핵심 가정과 미확인 항목 명시\n실행 전 조사 요약을 먼저 정리',
      deliverableType: 'decision-memo',
      mode: 'knowledge',
      objective: '근거와 리스크를 먼저 정리한 뒤 실행 방향을 결정',
      title: '리서치 우선 의사결정 메모',
    },
  },
  {
    id: 'review-stack',
    origin: 'gstack',
    title: '리뷰 스택',
    subtitle: '제품 / 디자인 / 엔지니어링 준비 상태 점검',
    description: '실행 전후로 제품, 디자인, 엔지니어링 관점의 준비 상태를 함께 점검하는 리뷰 중심 플레이북입니다.',
    values: {
      constraints: '제품/디자인/엔지니어링 검토 기준 포함\n승인 전 준비 체크리스트 작성\n최종 산출물 담당자 지정',
      deliverableType: 'prd',
      mode: 'knowledge',
      objective: '리뷰 관점별 준비 상태를 명확히 한 결과물 작성',
      title: '리뷰 준비형 미션 브리프',
    },
  },
  {
    id: 'verify-before-close',
    origin: 'superpowers',
    title: '닫기 전 검증',
    subtitle: '증거와 완료 기준 먼저 확인',
    description: '완료 선언 전에 검증 근거와 다음 액션을 먼저 고정하는 검증 중심 플레이북입니다.',
    values: {
      constraints:
        '검증 근거 포함\n완료 기준을 명시\n다음 액션의 담당자와 기한 포함',
      deliverableType: 'implementation-proposal',
      mode: 'engineering',
      objective: '검증 가능한 근거를 남기고 닫는 운영 흐름으로 정리',
      title: '검증 중심 실행 제안서',
    },
  },
];

const AGENT_BLUEPRINTS = {
  engineering: [
    {
      bestFor: '문제 범위가 작고, 바로 실행 초안을 보고 싶을 때',
      description: 'manager, planner, executor, reviewer만으로 가볍게 시작합니다.',
      directive: '',
      emphasis: '기본 4 core agent',
      id: 'engineering-default',
      kind: 'core',
      outcome: '기본 실행 제안과 reviewer 판단만 빠르게 받습니다.',
      specialistKinds: [],
      title: 'Core 4만 사용',
    },
    {
      bestFor: '코드를 바로 만지되, 검증 기준까지 같이 보고 싶을 때',
      description: '구현과 검증을 병렬로 붙여 bounded engineering proposal 품질을 올립니다.',
      directive: 'orchestration-profile:engineering-implementation-verification',
      emphasis: '추가 AI 2개',
      id: 'engineering-implementation-verification',
      kind: 'profile',
      outcome: '구현 초안과 verification signal을 함께 받습니다.',
      profileId: 'engineering-implementation-verification',
      specialistKinds: ['implementation', 'verification'],
      title: '구현 + 검증',
    },
    {
      bestFor: '리스크, 구현, 테스트 관점을 같이 보고 결정해야 할 때',
      description: '리서치, 구현, 검증을 함께 돌려 wider engineering discovery를 만듭니다.',
      directive: 'orchestration-profile:engineering-triad',
      emphasis: '추가 AI 3개',
      id: 'engineering-triad',
      kind: 'profile',
      outcome: '근거 조사, 구현 초안, 검증 기준을 한 번에 묶습니다.',
      profileId: 'engineering-triad',
      specialistKinds: ['research', 'implementation', 'verification'],
      title: '엔지니어링 트라이어드',
    },
    {
      bestFor: '기능 구현과 함께 UX, 문서, handoff까지 한 번에 정리할 때',
      description: '리서치, 구현, 검증, 디자인, 문서화까지 full-spectrum handoff를 엽니다.',
      directive: 'orchestration-profile:engineering-full-spectrum',
      emphasis: '추가 AI 5개',
      id: 'engineering-full-spectrum',
      kind: 'profile',
      outcome: '코드, 검증, UX, 문서 handoff까지 같이 닫습니다.',
      profileId: 'engineering-full-spectrum',
      specialistKinds: ['research', 'implementation', 'verification', 'design', 'documentation'],
      title: '엔지니어링 풀 스펙트럼',
    },
    {
      bestFor: 'Loop Engineering 방식으로 발견, 계획, 실행, 검증, 반복을 닫힌 루프로 운영할 때',
      description: 'OpenClaw backbone 위에 Hermes Agent 레퍼런스의 session loop, parallel subagent, provider-aware tool call 패턴을 full-spectrum 하네스 프로파일로 실행합니다.',
      directive: 'orchestration-profile:engineering-full-spectrum',
      emphasis: 'Hermes agent profile',
      id: 'engineering-hermes-agent',
      kind: 'profile',
      outcome: 'Hermes provider 권장값과 5-lane specialist handoff를 함께 노출합니다.',
      profileId: 'engineering-full-spectrum',
      recommendedProvider: 'hermes',
      runtimeBlueprint: 'hermes-agent-full-spectrum',
      specialistKinds: ['research', 'implementation', 'verification', 'design', 'documentation'],
      title: 'Hermes 에이전트',
    },
  ],
  knowledge: [
    {
      bestFor: '짧은 메모나 문서 초안을 빠르게 닫고 싶을 때',
      description: 'manager, planner, executor, reviewer만으로 빠르게 문서를 닫습니다.',
      directive: '',
      emphasis: '기본 4 core agent',
      id: 'knowledge-default',
      kind: 'core',
      outcome: '기본 요약과 reviewer 판단만 빠르게 받습니다.',
      specialistKinds: [],
      title: 'Core 4만 사용',
    },
    {
      bestFor: '자료 조사와 문서 구조화를 같이 돌리고 싶을 때',
      description: '리서치와 구현을 병렬로 붙여 synthesis와 handoff를 분리합니다.',
      directive: 'orchestration-profile:knowledge-research-implementation',
      emphasis: '추가 AI 2개',
      id: 'knowledge-research-implementation',
      kind: 'profile',
      outcome: '조사 요약과 실행 가능한 문서 초안을 함께 받습니다.',
      profileId: 'knowledge-research-implementation',
      specialistKinds: ['research', 'implementation'],
      title: '리서치 + 구현',
    },
    {
      bestFor: '근거 검증까지 포함한 high-confidence 문서가 필요할 때',
      description: '리서치, 구현, 검증을 같이 돌려 higher-confidence knowledge mission으로 올립니다.',
      directive: 'orchestration-profile:knowledge-triad',
      emphasis: '추가 AI 3개',
      id: 'knowledge-triad',
      kind: 'profile',
      outcome: '근거, 초안, 검증 신호를 같이 묶은 결과를 받습니다.',
      profileId: 'knowledge-triad',
      specialistKinds: ['research', 'implementation', 'verification'],
      title: '지식 작업 트라이어드',
    },
    {
      bestFor: '조사, 검토, 시각화, 문서 handoff를 한 번에 정리할 때',
      description: '리서치, 구현, 검증, 디자인, 문서화를 함께 붙여 full-spectrum synthesis를 만듭니다.',
      directive: 'orchestration-profile:knowledge-full-spectrum',
      emphasis: '추가 AI 5개',
      id: 'knowledge-full-spectrum',
      kind: 'profile',
      outcome: '보고용 문서, 검증 신호, 디자인/문서 handoff까지 같이 닫습니다.',
      profileId: 'knowledge-full-spectrum',
      specialistKinds: ['research', 'implementation', 'verification', 'design', 'documentation'],
      title: '지식 작업 풀 스펙트럼',
    },
  ],
};

const AGENT_INTENT_PRESETS = {
  engineering: [
    {
      blueprintId: 'engineering-default',
      description: 'manager, planner, executor, reviewer만으로 빠르게 시작',
      label: '빠르게 초안',
    },
    {
      blueprintId: 'engineering-implementation-verification',
      description: '구현안과 검증 기준을 함께 확인',
      label: '구현 + 검증',
    },
    {
      blueprintId: 'engineering-triad',
      description: '리스크, 구현, 테스트 관점을 같이 정리',
      label: '리서치 포함',
    },
    {
      blueprintId: 'engineering-full-spectrum',
      description: 'UX와 문서 handoff까지 한 번에 정리',
      label: '끝까지 handoff',
    },
    {
      blueprintId: 'engineering-hermes-agent',
      description: 'OpenClaw backbone + Hermes engine loop로 운영',
      label: 'Loop engine',
    },
  ],
  knowledge: [
    {
      blueprintId: 'knowledge-default',
      description: '짧은 문서 초안이나 메모를 빠르게 생성',
      label: '빠르게 초안',
    },
    {
      blueprintId: 'knowledge-research-implementation',
      description: '자료 조사와 구조화된 초안을 함께 생성',
      label: '조사 + 초안',
    },
    {
      blueprintId: 'knowledge-triad',
      description: '근거와 검토까지 포함한 high-confidence 결과',
      label: '검토 포함',
    },
    {
      blueprintId: 'knowledge-full-spectrum',
      description: '보고용 문서와 handoff까지 한 번에 정리',
      label: '끝까지 handoff',
    },
  ],
};

const STEP_TO_DETAIL_TAB = {
  'step-setup': 'config',
  'step-run': 'runs',
  'step-review': 'reviews',
  'step-output': 'artifacts',
};

export const STEP_META = {
  'step-output': { label: '4단계 · 결과 보기', shortLabel: '결과 보기' },
  'step-review': { label: '3단계 · 검토하기', shortLabel: '검토하기' },
  'step-run': { label: '2단계 · 실행하기', shortLabel: '실행하기' },
  'step-setup': { label: '1단계 · 미션 정하기', shortLabel: '미션 정하기' },
};

export function getSelectedWorkspaceId() {
  return String(elements.workspaceSelect.value || state.workspaces[0]?.id || '').trim();
}

function updateRunFallbackControls() {
  if (!elements.runFallbackPolicySelect || !elements.runFallbackProviderSelect) {
    return;
  }

  const fallbackProvider = String(elements.runFallbackProviderSelect.value || '').trim();
  elements.runFallbackPolicySelect.disabled = !fallbackProvider;
  if (!fallbackProvider) {
    elements.runFallbackPolicySelect.value = 'provider-failure-only';
  }
}

function getMissionFormMode() {
  return String(elements.missionForm?.elements?.mode?.value || 'knowledge').trim() || 'knowledge';
}

function getAgentBlueprintCatalog(mode = getMissionFormMode()) {
  return AGENT_BLUEPRINTS[mode] || AGENT_BLUEPRINTS.knowledge;
}

function getDefaultAgentBlueprintId(mode = getMissionFormMode()) {
  return `${mode}-default`;
}

function getSelectedAgentBlueprint(mode = getMissionFormMode()) {
  const catalog = getAgentBlueprintCatalog(mode);
  const selectedId = String(state.selectedAgentBlueprintByMode?.[mode] || '').trim() || getDefaultAgentBlueprintId(mode);
  return catalog.find((item) => item.id === selectedId) || catalog[0] || null;
}

function getAgentIntentCatalog(mode = getMissionFormMode()) {
  return AGENT_INTENT_PRESETS[mode] || AGENT_INTENT_PRESETS.knowledge;
}

function setSelectedAgentBlueprint(blueprintId, mode = getMissionFormMode()) {
  const catalog = getAgentBlueprintCatalog(mode);
  const exists = catalog.some((item) => item.id === blueprintId);
  state.selectedAgentBlueprintByMode[mode] = exists ? blueprintId : getDefaultAgentBlueprintId(mode);
  renderAgentBlueprintBuilder();
}

function formatSpecialistKindLabel(kind = '') {
  const meta = SPECIALIST_KIND_META[String(kind || '').trim()];
  return meta?.label || getDisplayLabel(kind, kind);
}

function buildMissionConstraintPayload(rawConstraints = '') {
  const blueprint = getSelectedAgentBlueprint();
  const lines = String(rawConstraints || '')
    .split('\n')
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((line) => {
      const normalized = line.toLowerCase();
      return !normalized.startsWith('orchestration-profile:') && !normalized.startsWith('parallel-specialists:');
    });

  if (blueprint?.directive) {
    lines.unshift(blueprint.directive);
  }

  return lines.join('\n');
}

function getMissionAiConfiguration(detail = state.missionDetail) {
  const summary = detail?.summary || {};
  const specialistKinds = Array.isArray(summary.specialistConfiguredKinds)
    ? summary.specialistConfiguredKinds.filter(Boolean)
    : [];
  const profileDisplayName = String(summary.specialistOrchestrationProfileDisplayName || '').trim();
  const profileHarnessPatterns = Array.isArray(summary.specialistOrchestrationProfileHarnessPatterns)
    ? summary.specialistOrchestrationProfileHarnessPatterns.filter(Boolean)
    : [];
  const profileId = String(summary.specialistOrchestrationProfileId || '').trim();
  const qualityGate = String(summary.specialistQualityGate || '').trim();
  const recommendedProvider = String(summary.specialistOrchestrationProfileRecommendedProvider || '').trim();
  const requiredKinds = Array.isArray(summary.specialistQualityGateRequiredKinds)
    ? summary.specialistQualityGateRequiredKinds.filter(Boolean)
    : [];
  const runtimeBlueprint = String(summary.specialistOrchestrationProfileRuntimeBlueprint || '').trim();

  return {
    profileHarnessPatterns,
    profileDisplayName: profileDisplayName || (specialistKinds.length ? 'Custom specialist composition' : 'Core 4 only'),
    profileId,
    qualityGate,
    recommendedProvider,
    requiredKinds,
    runtimeBlueprint,
    specialistKinds,
  };
}

function isTextMissionAttachmentFile(file) {
  const extension = getFileExtension(file?.name);
  const mimeType = String(file?.type || '').toLowerCase();
  return UI_TEXT_ATTACHMENT_EXTENSIONS.has(extension) || mimeType.startsWith('text/');
}

export function setUiNotice(message = '') {
  state.uiNotice = String(message || '').trim();
  if (state.uiNoticeTimer) {
    window.clearTimeout(state.uiNoticeTimer);
    state.uiNoticeTimer = null;
  }
  renderFlowState();

  if (state.uiNotice) {
    state.uiNoticeTimer = window.setTimeout(() => {
      state.uiNotice = '';
      state.uiNoticeTimer = null;
      renderFlowState();
    }, 2400);
  }
}

export function renderRetrievalSourceSurfaces() {
  renderAgentBlueprintBuilder();
  renderHarnessPanel();
  renderOutputStageSummary();
}

export function getMemoryFormConfig(scope) {
  if (scope === 'workspace') {
    return {
      cancelButton: elements.workspaceMemoryCancelButton,
      defaultStatus: '장기 운영 규칙과 팀 공통 선호를 저장합니다.',
      form: elements.workspaceMemoryForm,
      status: elements.workspaceMemoryFormStatus,
      submitButton: elements.workspaceMemorySubmitButton,
      submitText: '워크스페이스 메모 저장',
      updatingText: '워크스페이스 메모 수정',
    };
  }

  return {
    cancelButton: elements.memoryCancelButton,
    defaultStatus: '현재 실행 문맥에 필요한 사실, 결정, 선호를 저장합니다.',
    form: elements.memoryForm,
    status: elements.memoryFormStatus,
    submitButton: elements.memorySubmitButton,
    submitText: '미션 메모 저장',
    updatingText: '미션 메모 수정',
  };
}

function getHarnessMemoryEntry(scope, memoryId) {
  const result = state.harnessMemoryResult;
  const recentMemory = state.missionDetail?.harness?.memory;
  const entries = result
    ? scope === 'workspace'
      ? result.workspaceEntries || []
      : result.missionEntries || []
    : scope === 'workspace'
      ? recentMemory?.recentWorkspaceEntries || []
      : recentMemory?.recentMissionEntries || [];
  return entries.find((entry) => entry.id === memoryId) || null;
}

function getHarnessDocumentEntry(entryId) {
  const entries = state.harnessDocumentResult?.entries || state.missionDetail?.harness?.documents?.recentEntries || [];
  return entries.find((entry) => entry.id === entryId) || null;
}

export function resetMemoryForm(scope) {
  const config = getMemoryFormConfig(scope);
  if (!config.form) {
    return;
  }

  config.form.reset();
  delete config.form.dataset.editingId;
  if (config.status) {
    config.status.textContent = config.defaultStatus;
  }
  if (config.submitButton) {
    config.submitButton.textContent = config.submitText;
  }
  if (config.cancelButton) {
    config.cancelButton.hidden = true;
  }
}

function populateMemoryForm(scope, entry) {
  const config = getMemoryFormConfig(scope);
  if (!config.form || !entry) {
    return;
  }

  config.form.dataset.editingId = entry.id;
  const kindField = config.form.querySelector('select[name="kind"]');
  const contentField = config.form.querySelector('textarea[name="content"]');
  if (kindField) {
    kindField.value = entry.kind;
  }
  if (contentField) {
    contentField.value = entry.content;
    contentField.focus();
  }
  if (config.status) {
    config.status.textContent = `${scope === 'workspace' ? '워크스페이스' : '미션'} 메모 수정 중 · ${getDisplayLabel(entry.kind, entry.kind)} · ${formatDate(entry.updatedAt || entry.createdAt)}`;
  }
  if (config.submitButton) {
    config.submitButton.textContent = config.updatingText;
  }
  if (config.cancelButton) {
    config.cancelButton.hidden = false;
  }
}

function resetDocumentLogForm() {
  if (!elements.documentLogForm) {
    return;
  }

  elements.documentLogForm.reset();
  delete elements.documentLogForm.dataset.editingId;
  if (elements.documentLogFormStatus) {
    elements.documentLogFormStatus.textContent = 'Markdown, txt, json 파일은 브라우저에서 읽어 본문으로 채운 뒤 같은 route로 저장합니다.';
  }
  if (elements.documentLogSubmitButton) {
    elements.documentLogSubmitButton.textContent = '문서 기록 저장';
  }
  if (elements.documentLogCancelButton) {
    elements.documentLogCancelButton.hidden = true;
  }
  if (elements.documentLogFile) {
    elements.documentLogFile.value = '';
  }
}

function getHarnessMemoryFilterLabel({ scopeFilter, kindFilter, query }) {
  const scopeLabel = scopeFilter === 'all' ? '전체 범위' : scopeFilter === 'mission' ? '미션 메모' : '워크스페이스 메모';
  const kindLabel = kindFilter === 'all' ? '전체 종류' : getDisplayLabel(kindFilter, kindFilter);
  const queryLabel = query || '검색 조건';
  return `${scopeLabel} · ${kindLabel} · ${queryLabel}`;
}

function getHarnessDocumentSortLabel() {
  const sort = String(state.harnessDocumentSort || 'latest').trim();
  if (sort === 'oldest') {
    return '오래된 순';
  }
  if (sort === 'title') {
    return '제목순';
  }
  if (sort === 'type') {
    return '유형순';
  }
  return '최신순';
}

function buildFallbackHarnessDocumentBrowse(harnessSummary = {}) {
  const recentEntries = harnessSummary.documents?.recentEntries || [];
  const visibleCount = recentEntries.length;
  return {
    entries: recentEntries,
    filters: {
      limit: Number(state.harnessDocumentVisibleCount || 12),
      offset: Number(state.harnessDocumentOffset || 0),
      query: String(state.harnessDocumentQuery || ''),
      sort: String(state.harnessDocumentSort || 'latest'),
      type: String(state.harnessDocumentFilter || 'all'),
    },
    hasMore: false,
    summary: {
      currentPage: visibleCount ? 1 : 0,
      filteredCount: visibleCount,
      hasNext: false,
      hasPrev: false,
      offset: Number(state.harnessDocumentOffset || 0),
      pageCount: visibleCount,
      pageEnd: visibleCount,
      pageStart: visibleCount ? 1 : 0,
      remainingCount: 0,
      trackedEntryCount: harnessSummary.documents?.summary?.trackedEntryCount || 0,
      totalPages: visibleCount ? 1 : 0,
      visibleCount,
    },
  };
}

function buildHarnessDocumentBrowseViewModel(documentBrowse = {}) {
  const query = String(documentBrowse.filters?.query || '').trim();
  const typeFilter = String(documentBrowse.filters?.type || state.harnessDocumentFilter || 'all').trim();
  const pageSize = Number(documentBrowse.filters?.limit || state.harnessDocumentVisibleCount || 12) || 12;
  const filterLabel = typeFilter === 'all'
    ? '전체'
    : getDisplayLabel(typeFilter, typeFilter);
  const filterChips = [
    { label: '정렬', value: getHarnessDocumentSortLabel() },
    { label: '페이지', value: getHarnessPageSizeLabel(pageSize) },
  ];
  if (typeFilter !== 'all') {
    filterChips.unshift({ label: '유형', value: filterLabel });
  }
  if (query) {
    filterChips.unshift({ label: '검색', value: query });
  }
  return {
    filterChips,
    filterLabel,
    isDirty: Boolean(
      query ||
        typeFilter !== 'all' ||
        String(state.harnessDocumentSort || 'latest').trim() !== 'latest' ||
        pageSize !== 12 ||
        Number(documentBrowse.summary?.currentPage || 0) > 1,
    ),
    pageLabel: getHarnessPageLabel(documentBrowse.summary),
    pageSize,
    query,
    rangeLabel: getHarnessRangeLabel(
      documentBrowse.summary,
      Number(documentBrowse.summary?.filteredCount || 0),
    ),
    typeFilter,
  };
}

function getHarnessMemorySortLabel() {
  const sort = String(state.harnessMemorySort || 'latest').trim();
  if (sort === 'oldest') {
    return '오래된 순';
  }
  if (sort === 'kind') {
    return '종류순';
  }
  return '최신순';
}

function buildFallbackHarnessMemoryBrowse(harnessSummary = {}) {
  const recentMissionEntries = harnessSummary.memory?.recentMissionEntries || [];
  const recentWorkspaceEntries = harnessSummary.memory?.recentWorkspaceEntries || [];
  const visibleCount = recentMissionEntries.length + recentWorkspaceEntries.length;
  return {
    entries: [],
    filters: {
      kind: String(state.harnessMemoryFilterKind || 'all'),
      limit: Number(state.harnessMemoryVisibleCount || 12),
      offset: Number(state.harnessMemoryOffset || 0),
      query: String(state.harnessMemoryQuery || ''),
      scope: String(state.harnessMemoryFilterScope || 'all'),
      sort: String(state.harnessMemorySort || 'latest'),
    },
    hasMore: false,
    missionEntries: recentMissionEntries,
    summary: {
      currentPage: visibleCount ? 1 : 0,
      filteredMissionCount: recentMissionEntries.length,
      filteredTotal: visibleCount,
      filteredWorkspaceCount: recentWorkspaceEntries.length,
      hasNext: false,
      hasPrev: false,
      missionTotal: harnessSummary.memory?.missionCounts?.total || 0,
      offset: Number(state.harnessMemoryOffset || 0),
      pageCount: visibleCount,
      pageEnd: visibleCount,
      pageStart: visibleCount ? 1 : 0,
      remainingCount: 0,
      total: (harnessSummary.memory?.missionCounts?.total || 0) + (harnessSummary.memory?.workspaceCount || 0),
      totalPages: visibleCount ? 1 : 0,
      visibleCount,
      workspaceTotal: harnessSummary.memory?.workspaceCount || 0,
    },
    workspaceEntries: recentWorkspaceEntries,
  };
}

function buildHarnessMemoryBrowseViewModel(memoryBrowse = {}) {
  const query = String(memoryBrowse.filters?.query || state.harnessMemoryQuery || '').trim();
  const scopeFilter = String(memoryBrowse.filters?.scope || state.harnessMemoryFilterScope || 'all').trim();
  const kindFilter = String(memoryBrowse.filters?.kind || state.harnessMemoryFilterKind || 'all').trim();
  const pageSize = Number(memoryBrowse.filters?.limit || state.harnessMemoryVisibleCount || 12) || 12;
  const filterLabel = getHarnessMemoryFilterLabel({
    kindFilter,
    query,
    scopeFilter,
  });
  const filterChips = [
    { label: '정렬', value: getHarnessMemorySortLabel() },
    { label: '페이지', value: getHarnessPageSizeLabel(pageSize) },
  ];
  if (scopeFilter !== 'all') {
    filterChips.unshift({
      label: '범위',
      value: scopeFilter === 'mission' ? '미션 메모' : '워크스페이스 메모',
    });
  }
  if (kindFilter !== 'all') {
    filterChips.unshift({ label: '종류', value: getDisplayLabel(kindFilter, kindFilter) });
  }
  if (query) {
    filterChips.unshift({ label: '검색', value: query });
  }
  return {
    filterChips,
    filterLabel,
    isDirty: Boolean(
      query ||
        scopeFilter !== 'all' ||
        kindFilter !== 'all' ||
        String(state.harnessMemorySort || 'latest').trim() !== 'latest' ||
        pageSize !== 12 ||
        Number(memoryBrowse.summary?.currentPage || 0) > 1,
    ),
    pageLabel: getHarnessPageLabel(memoryBrowse.summary),
    pageSize,
    rangeLabel: getHarnessRangeLabel(
      memoryBrowse.summary,
      Number(memoryBrowse.summary?.filteredTotal || 0),
    ),
  };
}

function buildHarnessPanelActionLabels({
  activeRetrievalSourceFocus,
  documentSummary = {},
  latestRetrievalArtifact,
} = {}) {
  const selectedMissionLabel = state.missionDetail?.mission?.title || state.selectedMissionId || '선택된 미션';
  return {
    activeRetrievalSourceClearLabel: activeRetrievalSourceFocus
      ? getRetrievalSourceActionLabel('retrieval source focus 해제', activeRetrievalSourceFocus.type, activeRetrievalSourceFocus.label)
      : '',
    latestRetrievalArtifactOpenLabel: latestRetrievalArtifact
      ? getRetrievalArtifactOpenLabel(latestRetrievalArtifact)
      : '',
    legacyDevlogMigrationLabel: `기존 개발 로그 전환: ${documentSummary.legacyDevlogCount || 0}건`,
    missionAttachmentUploadLabel: `첨부 업로드: ${selectedMissionLabel}`,
  };
}

function buildHarnessPanelViewModel(harnessSummary = {}) {
  const documentSummary = harnessSummary.documents?.summary || {};
  const documentItems = harnessSummary.documents?.items || [];
  const documentBrowse = state.harnessDocumentResult || buildFallbackHarnessDocumentBrowse(harnessSummary);
  const attachmentSummary = harnessSummary.attachments?.summary || {};
  const attachmentEntries = harnessSummary.attachments?.recentEntries || [];
  const memoryBrowse = state.harnessMemoryResult || buildFallbackHarnessMemoryBrowse(harnessSummary);
  const memory = harnessSummary.memory || {};
  const retrieval = harnessSummary.retrieval || { previewItems: [], roles: [], summary: {} };
  const loops = harnessSummary.loops || {};
  const recommendations = harnessSummary.recommendations || [];
  const latestArtifact = harnessSummary.documents?.latestArtifact || null;
  const latestRetrievalArtifact = retrieval.latestArtifact || null;
  const activeRetrievalSourceFocus = getActiveRetrievalSourceFocus();
  const visibleDocumentEntries = documentBrowse.entries || [];
  const visibleMissionMemoryEntries = memoryBrowse.missionEntries || [];
  const visibleWorkspaceMemoryEntries = memoryBrowse.workspaceEntries || [];
  const documentBrowseViewModel = buildHarnessDocumentBrowseViewModel(documentBrowse);
  const memoryBrowseViewModel = buildHarnessMemoryBrowseViewModel(memoryBrowse);
  const actionLabels = buildHarnessPanelActionLabels({
    activeRetrievalSourceFocus,
    documentSummary,
    latestRetrievalArtifact,
  });

  return {
    loopsPanel: {
      adoptedPatterns: harnessSummary.adoptedPatterns,
      loops,
      recommendations,
    },
    memoryPanel: {
      activeRetrievalSourceClearLabel: actionLabels.activeRetrievalSourceClearLabel,
      activeRetrievalSourceFocus,
      isMemoryBrowseDirty: memoryBrowseViewModel.isDirty,
      latestRetrievalArtifact,
      latestRetrievalArtifactOpenLabel: actionLabels.latestRetrievalArtifactOpenLabel,
      memory,
      memoryBrowse,
      memoryFilterChips: memoryBrowseViewModel.filterChips,
      memoryFilterLabel: memoryBrowseViewModel.filterLabel,
      memoryPageLabel: memoryBrowseViewModel.pageLabel,
      memoryPageSize: memoryBrowseViewModel.pageSize,
      memoryRangeLabel: memoryBrowseViewModel.rangeLabel,
      memorySort: state.harnessMemorySort,
      memoryVisibleCount: state.harnessMemoryVisibleCount,
      retrieval,
      visibleMissionMemoryEntries,
      visibleWorkspaceMemoryEntries,
    },
    sourcePanel: {
      activeRetrievalSourceClearLabel: actionLabels.activeRetrievalSourceClearLabel,
      activeRetrievalSourceFocus,
      attachmentEntries,
      attachmentSummary,
      documentBrowse,
      documentFilterChips: documentBrowseViewModel.filterChips,
      documentFilterLabel: documentBrowseViewModel.filterLabel,
      documentItems,
      documentPageLabel: documentBrowseViewModel.pageLabel,
      documentPageSize: documentBrowseViewModel.pageSize,
      documentQuery: documentBrowseViewModel.query,
      documentRangeLabel: documentBrowseViewModel.rangeLabel,
      documentSort: state.harnessDocumentSort,
      documentSummary,
      documentTypeFilter: documentBrowseViewModel.typeFilter,
      documentVisibleCount: state.harnessDocumentVisibleCount,
      isDocumentBrowseDirty: documentBrowseViewModel.isDirty,
      latestArtifact,
      legacyDevlogMigrationLabel: actionLabels.legacyDevlogMigrationLabel,
      missionAttachmentUploadLabel: actionLabels.missionAttachmentUploadLabel,
      visibleDocumentEntries,
    },
  };
}

function renderHarnessDocumentOverviewGrid(documentSummary = {}, attachmentSummary = {}) {
  return `<div class="harness-overview-grid">
    <div class="summary-chip"><span>문서</span><strong>${escapeHtml(String(documentSummary.availableCount || 0))}/${escapeHtml(String(documentSummary.totalCount || 0))}</strong></div>
    <div class="summary-chip"><span>ADR</span><strong>${escapeHtml(String(documentSummary.adrCount || 0))}개</strong></div>
    <div class="summary-chip"><span>첨부</span><strong>${escapeHtml(String(attachmentSummary.total || 0))}개</strong></div>
    <div class="summary-chip"><span>최근 갱신</span><strong>${escapeHtml(formatDate(documentSummary.latestUpdatedAt))}</strong></div>
  </div>`;
}

function renderHarnessLegacyDevlogMigrationCallout({
  documentSummary = {},
  legacyDevlogMigrationLabel = '',
} = {}) {
  const legacyDevlogCount = Number(documentSummary.legacyDevlogCount || 0);
  if (!legacyDevlogCount) {
    return '';
  }

  return `<div class="harness-callout">
    <strong>기존 개발 로그 ${escapeHtml(String(legacyDevlogCount))}건이 아직 tracked entry가 아닙니다.</strong>
    <p>예전 append-only 섹션을 편집 가능한 문서 기록으로 한 번에 전환합니다. 전환 후에는 하네스에서 바로 수정/삭제할 수 있습니다.</p>
    <div class="inline-actions">
      ${renderDocumentBrowseActionButton({
        action: 'migrate-legacy',
        actionLabel: legacyDevlogMigrationLabel,
        buttonText: '기존 개발 로그 전환',
      })}
    </div>
  </div>`;
}

function renderHarnessLatestArtifactCallout(latestArtifact = null) {
  if (!latestArtifact) {
    return '';
  }

  return `<div class="harness-callout">
    <strong>대표 산출물</strong>
    <p>${escapeHtml(latestArtifact.title)}</p>
    <div class="item-meta mono">${escapeHtml(latestArtifact.path || '-')}</div>
  </div>`;
}

function renderHarnessAttachmentList(attachmentEntries = []) {
  if (!attachmentEntries.length) {
    return `<div class="harness-empty-inline">
      <strong>아직 첨부된 파일이 없습니다.</strong>
      <p>요구사항, 로그, 참고 문서를 붙이면 다음 에이전트 run에서 함께 읽습니다.</p>
    </div>`;
  }

  return `<div class="harness-list">
    ${attachmentEntries
      .map(
        (entry) => `
          <div class="harness-row ${state.harnessAttachmentFocus === entry.fileName ? 'is-focused-source' : ''}" data-harness-attachment-file="${escapeHtml(entry.fileName)}">
            <div>
              <div class="item-title">${escapeHtml(entry.fileName)}</div>
              <div class="item-meta">${escapeHtml(entry.excerpt || '본문 미리보기가 없습니다.')}</div>
              <div class="item-meta mono">${escapeHtml(entry.mimeType || 'text/plain')} · ${escapeHtml(String(entry.charCount || 0))} chars · ${escapeHtml(String(entry.lineCount || 0))} lines</div>
            </div>
            <div class="harness-row-meta">
              <span class="mini-badge ${entry.truncated ? 'status-pending' : 'status-completed'}">${escapeHtml(entry.truncated ? 'truncated' : 'stored')}</span>
              <span class="item-meta">${escapeHtml(formatDate(entry.updatedAt || entry.createdAt))}</span>
            </div>
          </div>
        `,
      )
      .join('')}
  </div>`;
}

function renderHarnessAttachmentIntakeSection({
  attachmentEntries = [],
  attachmentSummary = {},
  missionAttachmentUploadLabel = '',
} = {}) {
  return `<div class="harness-subsection">
    <div class="harness-filter-row">
      <p class="summary-label">미션 첨부 입력</p>
      <div class="item-meta">총 ${escapeHtml(String(attachmentSummary.total || 0))}건 · 누적 ${escapeHtml(String(attachmentSummary.totalChars || 0))} chars${Number(attachmentSummary.truncatedCount || 0) ? ` · truncated ${escapeHtml(String(attachmentSummary.truncatedCount || 0))}건` : ''}</div>
    </div>
    <div class="harness-callout">
      <strong>첨부 파일은 다음 multi-agent 실행 prompt에 포함됩니다.</strong>
      <p>텍스트 기반 파일만 지원합니다. 긴 파일은 저장 시 잘리고, runtime에는 요약과 발췌본만 전달됩니다.</p>
    </div>
    <form id="mission-harness-attachment-form" class="mission-form">
      <label class="compact-label">
        파일 추가
        <input
          id="mission-harness-attachment-input"
          type="file"
          multiple
          accept=".md,.txt,.json,.csv,.yaml,.yml,.log,.js,.mjs,.ts,.tsx,.jsx,.py,.html,.css,.xml,.sql,text/*,application/json,application/xml"
          aria-label="${escapeHtml(`미션 첨부 파일 추가: 총 ${attachmentSummary.total || 0}건 · 누적 ${attachmentSummary.totalChars || 0} chars`)}"
        />
      </label>
      <div class="action-row">
        ${renderMissionAttachmentUploadButton({
          actionLabel: missionAttachmentUploadLabel,
        })}
      </div>
    </form>
    ${renderHarnessAttachmentList(attachmentEntries)}
  </div>`;
}

function renderHarnessAttachmentRetrievalFocusCallout({
  activeRetrievalSourceClearLabel = '',
  activeRetrievalSourceFocus = null,
} = {}) {
  if (activeRetrievalSourceFocus?.type !== 'attachment') {
    return '';
  }

  return `<div class="harness-callout">
    <div class="harness-filter-row">
      <strong>현재 retrieval source focus</strong>
      <span class="status-badge status-pending">${escapeHtml(activeRetrievalSourceFocus.title)}</span>
    </div>
    <p>${escapeHtml(activeRetrievalSourceFocus.detail)}</p>
    <div class="inline-actions">
      ${renderRetrievalSourceCopyButton({
        actionLabel: '현재 source 링크 복사',
        buttonText: '현재 source 링크 복사',
        copiedText: '현재 source 링크 복사됨',
        sourceLabel: activeRetrievalSourceFocus.label,
        sourceType: activeRetrievalSourceFocus.type,
      })}
      ${renderRetrievalSourceFocusClearButton({
        actionLabel: activeRetrievalSourceClearLabel,
      })}
    </div>
  </div>`;
}

function renderHarnessDocumentSourceList(documentItems = []) {
  return `<div class="harness-list">
    ${documentItems
      .map(
        (item) => `
          <div class="harness-row">
            <div>
              <div class="item-title">${escapeHtml(item.label)}</div>
              <div class="item-meta mono">${escapeHtml(item.path || '-')}</div>
            </div>
            <div class="harness-row-meta">
              <span class="mini-badge ${item.exists ? 'status-completed' : 'status-failed'}">${escapeHtml(item.exists ? '기록됨' : '누락')}</span>
              <span class="item-meta">${escapeHtml(formatDate(item.updatedAt))}</span>
            </div>
          </div>
        `,
      )
      .join('')}
  </div>`;
}

function renderHarnessDocumentSourceSection({
  documentItems = [],
  documentSummary = {},
} = {}) {
  return `<div class="harness-subsection">
    <div class="harness-filter-row">
      <p class="summary-label">문서 source-of-record</p>
      <div class="item-meta">등록 ${escapeHtml(String(documentItems.length))}개 · 사용 가능 ${escapeHtml(String(documentSummary.availableCount || 0))}/${escapeHtml(String(documentSummary.totalCount || 0))}</div>
    </div>
    ${renderHarnessDocumentSourceList(documentItems)}
  </div>`;
}

function renderDocumentBrowseActionButton({
  action = '',
  actionLabel = '',
  buttonText = '',
  className = 'ghost-button',
  disabled = null,
  documentId = '',
} = {}) {
  const actionName = String(action || '').trim();
  if (!/^(migrate-legacy|reset-browse|edit|delete|prev-page|next-page)$/.test(actionName)) {
    return '';
  }
  const documentIdValue = String(documentId || '').trim();
  const documentIdAttribute = documentIdValue ? ` data-document-id="${escapeHtml(documentIdValue)}"` : '';
  const disabledState = disabled === null ? null : Boolean(disabled);
  const disabledAttributes = disabledState === null ? '' : ` aria-disabled="${disabledState ? 'true' : 'false'}"${disabledState ? ' disabled' : ''}`;
  return `<button class="${escapeHtml(className)}" type="button" data-document-action="${escapeHtml(actionName)}"${documentIdAttribute}${disabledAttributes} aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}">${escapeHtml(buttonText)}</button>`;
}

function renderHarnessDocumentBrowseControls({
  documentFilterLabel = '',
  documentSort = 'latest',
  documentVisibleCount = 12,
  isDocumentBrowseDirty = false,
} = {}) {
  const sortValue = String(documentSort || 'latest');
  const pageSizeValue = Number(documentVisibleCount || 12) || 12;

  return `<div class="harness-filter-row">
    <p class="summary-label">정렬</p>
    <div class="inline-actions">
      <label class="compact-label">
        문서 정렬
        <select id="document-log-sort" aria-label="${escapeHtml(`문서 정렬: ${documentFilterLabel}`)}">
          <option value="latest" ${sortValue === 'latest' ? 'selected' : ''}>최신순</option>
          <option value="oldest" ${sortValue === 'oldest' ? 'selected' : ''}>오래된 순</option>
          <option value="title" ${sortValue === 'title' ? 'selected' : ''}>제목순</option>
          <option value="type" ${sortValue === 'type' ? 'selected' : ''}>유형순</option>
        </select>
      </label>
      <label class="compact-label">
        페이지 크기
        <select id="document-log-limit" aria-label="${escapeHtml(`문서 페이지 크기: ${documentFilterLabel}`)}">
          <option value="12" ${pageSizeValue === 12 ? 'selected' : ''}>12건</option>
          <option value="24" ${pageSizeValue === 24 ? 'selected' : ''}>24건</option>
          <option value="48" ${pageSizeValue === 48 ? 'selected' : ''}>48건</option>
        </select>
      </label>
      ${renderDocumentBrowseActionButton({
        action: 'reset-browse',
        actionLabel: isDocumentBrowseDirty ? `문서 필터 초기화: ${documentFilterLabel}` : '문서 필터 초기화: 적용된 문서 필터 없음',
        buttonText: '필터 초기화',
        disabled: !isDocumentBrowseDirty,
      })}
    </div>
  </div>`;
}

function renderHarnessDocumentBrowseSection({
  documentBrowse = {},
  documentFilterChips = [],
  documentFilterLabel = '',
  documentPageLabel = '',
  documentPageSize = 12,
  documentQuery = '',
  documentRangeLabel = '',
  documentSort = 'latest',
  documentSummary = {},
  documentTypeFilter = 'all',
  documentVisibleCount = 12,
  isDocumentBrowseDirty = false,
  visibleDocumentEntries = [],
} = {}) {
  return `<div class="harness-subsection">
    <div class="harness-filter-row">
      <p class="summary-label">문서 기록 탐색</p>
      <div class="item-meta">총 ${escapeHtml(String(documentBrowse.summary?.trackedEntryCount || documentSummary.trackedEntryCount || 0))}건 · 검색 결과 ${escapeHtml(String(documentBrowse.summary?.filteredCount || 0))}건 · ${escapeHtml(documentPageLabel)} · ${escapeHtml(getHarnessDocumentSortLabel())}</div>
    </div>
    ${renderHarnessFilterChips(documentFilterChips)}
    ${renderHarnessDocumentBrowseControls({
      documentFilterLabel,
      documentSort,
      documentVisibleCount,
      isDocumentBrowseDirty,
    })}
    ${renderHarnessDocumentBrowseResults({
      documentBrowse,
      documentFilterLabel,
      documentPageLabel,
      documentPageSize,
      documentQuery,
      documentRangeLabel,
      documentTypeFilter,
      visibleDocumentEntries,
    })}
  </div>`;
}

function renderHarnessSourcePanel({
  activeRetrievalSourceClearLabel = '',
  activeRetrievalSourceFocus = null,
  attachmentEntries = [],
  attachmentSummary = {},
  documentBrowse = {},
  documentFilterChips = [],
  documentFilterLabel = '',
  documentItems = [],
  documentPageLabel = '',
  documentPageSize = 12,
  documentQuery = '',
  documentRangeLabel = '',
  documentSort = 'latest',
  documentSummary = {},
  documentTypeFilter = 'all',
  documentVisibleCount = 12,
  isDocumentBrowseDirty = false,
  latestArtifact = null,
  legacyDevlogMigrationLabel = '',
  missionAttachmentUploadLabel = '',
  visibleDocumentEntries = [],
} = {}) {
  return `
    ${renderHarnessDocumentOverviewGrid(documentSummary, attachmentSummary)}
    ${renderHarnessLegacyDevlogMigrationCallout({
      documentSummary,
      legacyDevlogMigrationLabel,
    })}
    ${renderHarnessLatestArtifactCallout(latestArtifact)}
    ${renderHarnessAttachmentRetrievalFocusCallout({
      activeRetrievalSourceClearLabel,
      activeRetrievalSourceFocus,
    })}
    ${renderHarnessAttachmentIntakeSection({
      attachmentEntries,
      attachmentSummary,
      missionAttachmentUploadLabel,
    })}
    ${renderHarnessDocumentSourceSection({
      documentItems,
      documentSummary,
    })}
    ${renderHarnessDocumentBrowseSection({
      documentBrowse,
      documentFilterChips,
      documentFilterLabel,
      documentPageLabel,
      documentPageSize,
      documentQuery,
      documentRangeLabel,
      documentSort,
      documentSummary,
      documentTypeFilter,
      documentVisibleCount,
      isDocumentBrowseDirty,
      visibleDocumentEntries,
    })}
    <div class="harness-note">문서 intake는 원본 형식과 별개로 Markdown 작업본을 source-of-record로 유지하는 방향을 기본값으로 둡니다.</div>
  `;
}

function renderHarnessDocumentBrowseResults({
  documentBrowse = {},
  documentFilterLabel = '',
  documentPageLabel = '',
  documentPageSize = 12,
  documentQuery = '',
  documentRangeLabel = '',
  documentTypeFilter = 'all',
  visibleDocumentEntries = [],
} = {}) {
  const filteredCount = Number(documentBrowse.summary?.filteredCount || 0);
  const shouldShowResults = filteredCount || documentQuery || documentTypeFilter !== 'all';
  if (!shouldShowResults) {
    return '';
  }

  return `<div class="harness-list">
    ${
      filteredCount
        ? visibleDocumentEntries
            .map(
              (entry) => `
                <div class="harness-row">
                  <div>
                    <div class="item-title">${escapeHtml(entry.title)}</div>
                    <div class="item-meta">${escapeHtml(getDisplayLabel(entry.type, entry.type))} · ${escapeHtml(summarizeText(entry.content, '-'))}</div>
                    <div class="item-meta mono">${escapeHtml(entry.path || '-')}</div>
                  </div>
                  <div class="harness-row-meta">
                    <span class="item-meta">${escapeHtml(formatDate(entry.updatedAt || entry.createdAt))}</span>
                    <div class="inline-actions">
                      ${renderDocumentBrowseActionButton({
                        action: 'edit',
                        actionLabel: `문서 불러오기: ${entry.title || entry.id || entry.path}`,
                        buttonText: '불러오기',
                        documentId: entry.id,
                      })}
                      ${renderDocumentBrowseActionButton({
                        action: 'delete',
                        actionLabel: `문서 삭제: ${entry.title || entry.id || entry.path}`,
                        buttonText: '삭제',
                        className: 'danger-button',
                        documentId: entry.id,
                      })}
                    </div>
                  </div>
                </div>
              `,
            )
            .join('')
        : `<div class="harness-empty-inline">
            <strong>일치하는 문서 기록이 없습니다.</strong>
            <p>${escapeHtml(documentFilterLabel)} 범위에서 ${escapeHtml(documentQuery || '검색 조건')}와 맞는 항목을 찾지 못했습니다.</p>
          </div>`
    }
    ${
      filteredCount
        ? `<div class="harness-empty-inline">
            <strong>${escapeHtml(documentPageLabel)} · ${escapeHtml(documentRangeLabel)}</strong>
            <p>남은 문서 기록 ${escapeHtml(String(documentBrowse.summary?.remainingCount || 0))}건 · 검색 결과 ${escapeHtml(String(filteredCount))}건</p>
            <div class="inline-actions">
              ${renderDocumentBrowseActionButton({
                action: 'prev-page',
                actionLabel: documentBrowse.summary?.hasPrev ? `이전 문서 ${documentPageSize}건: ${documentPageLabel}` : `이전 문서 ${documentPageSize}건 없음: ${documentPageLabel}`,
                buttonText: `이전 ${String(documentPageSize)}건`,
                disabled: !documentBrowse.summary?.hasPrev,
              })}
              ${renderDocumentBrowseActionButton({
                action: 'next-page',
                actionLabel: documentBrowse.summary?.hasNext ? `다음 문서 ${documentPageSize}건: ${documentPageLabel}` : `다음 문서 ${documentPageSize}건 없음: ${documentPageLabel}`,
                buttonText: `다음 ${String(documentPageSize)}건`,
                disabled: !documentBrowse.summary?.hasNext,
              })}
            </div>
          </div>`
        : ''
    }
  </div>`;
}

function renderHarnessMemoryOverviewGrid(memory = {}) {
  return `<div class="harness-overview-grid">
    <div class="summary-chip"><span>미션 메모</span><strong>${escapeHtml(String(memory.missionCounts?.total || 0))}개</strong></div>
    <div class="summary-chip"><span>결정</span><strong>${escapeHtml(String(memory.missionCounts?.decision || 0))}개</strong></div>
    <div class="summary-chip"><span>워크스페이스</span><strong>${escapeHtml(String(memory.workspaceCount || 0))}개</strong></div>
  </div>`;
}

function renderHarnessLayeredMemoryCallout() {
  return `<div class="harness-callout">
    <strong>레이어드 메모리</strong>
    <p>미션 메모리는 현재 실행 품질을, 워크스페이스 메모리는 장기 운영 문맥을 받쳐줍니다.</p>
  </div>`;
}

function renderHarnessMemoryRetrievalFocusCallout({
  activeRetrievalSourceClearLabel = '',
  activeRetrievalSourceFocus = null,
} = {}) {
  if (activeRetrievalSourceFocus?.type !== 'memory') {
    return '';
  }

  return `<div class="harness-callout">
    <div class="harness-filter-row">
      <strong>현재 retrieval source focus</strong>
      <span class="status-badge status-pending">${escapeHtml(activeRetrievalSourceFocus.title)}</span>
    </div>
    <p>${escapeHtml(activeRetrievalSourceFocus.detail)}</p>
    <div class="inline-actions">
      ${renderRetrievalSourceCopyButton({
        actionLabel: '현재 source 링크 복사',
        buttonText: '현재 source 링크 복사',
        copiedText: '현재 source 링크 복사됨',
        sourceLabel: activeRetrievalSourceFocus.label,
        sourceType: activeRetrievalSourceFocus.type,
      })}
      ${renderRetrievalSourceFocusClearButton({
        actionLabel: activeRetrievalSourceClearLabel,
      })}
    </div>
  </div>`;
}

function renderHarnessRetrievalEvidenceCallout({
  latestRetrievalArtifact = null,
  latestRetrievalArtifactOpenLabel = '',
} = {}) {
  if (!latestRetrievalArtifact) {
    return '';
  }

  return `<div class="harness-callout">
    <strong>최근 실행 retrieval evidence</strong>
    <p>${escapeHtml(`${latestRetrievalArtifact.role || 'agent'} · ${formatDate(latestRetrievalArtifact.updatedAt)} · ${latestRetrievalArtifact.path || latestRetrievalArtifact.fileName}`)}</p>
    <div class="inline-actions">
      ${renderRetrievalArtifactOpenButton({
        artifact: latestRetrievalArtifact,
        openLabel: latestRetrievalArtifactOpenLabel,
      })}
    </div>
  </div>`;
}

function renderHarnessRetrievalRoleTags(roles = []) {
  if (!roles?.length) {
    return '';
  }

  return `<div class="tag-list">
    ${roles
      .map(
        (entry) =>
          `<span class="tag tag-muted">${escapeHtml(entry.label)} · ${escapeHtml(String(entry.itemCount || 0))}</span>`,
      )
      .join('')}
  </div>`;
}

function renderHarnessRetrievalPreviewList(previewItems = []) {
  if (!previewItems?.length) {
    return `<div class="harness-empty-inline">
      <strong>retrieval preview가 아직 비어 있습니다.</strong>
      <p>첨부나 메모를 누적하면 다음 실행 전에 어떤 snippet이 우선 주입되는지 여기서 바로 확인할 수 있습니다.</p>
    </div>`;
  }

  return `<div class="agent-retrieval-list">
    ${previewItems
      .map(
        (item) => `
          <div class="agent-retrieval-row">
            <div class="agent-retrieval-meta">
              <strong>${escapeHtml(formatRetrievalSourceLabel(item))}</strong>
              <span>${escapeHtml((item.roles || []).join(', ') || '-')}</span>
              <span>${escapeHtml(item.retrievalReason || `score ${item.score ?? '-'}`)}</span>
            </div>
            <p>${escapeHtml(summarizeRetrievalSnippet(item.snippet, '-'))}</p>
          </div>
        `,
      )
      .join('')}
  </div>`;
}

function renderHarnessRetrievalPreviewSection({
  latestRetrievalArtifact = null,
  latestRetrievalArtifactOpenLabel = '',
  retrieval = {},
} = {}) {
  return `<div class="harness-subsection">
    <div class="harness-filter-row">
      <p class="summary-label">다음 실행 retrieval preview</p>
      <span class="item-meta">snippet ${escapeHtml(String(retrieval.summary?.snippetCount || 0))}개 · 메모 ${escapeHtml(String(retrieval.summary?.memorySourceCount || 0))} · 첨부 ${escapeHtml(String(retrieval.summary?.attachmentSourceCount || 0))}</span>
    </div>
    ${renderHarnessRetrievalEvidenceCallout({
      latestRetrievalArtifact,
      latestRetrievalArtifactOpenLabel,
    })}
    ${renderRetrievalCompareCallout(retrieval)}
    ${renderHarnessRetrievalRoleTags(retrieval.roles)}
    ${renderHarnessRetrievalPreviewList(retrieval.previewItems)}
  </div>`;
}

function renderHarnessMemoryPanel({
  activeRetrievalSourceClearLabel = '',
  activeRetrievalSourceFocus = null,
  isMemoryBrowseDirty = false,
  latestRetrievalArtifact = null,
  latestRetrievalArtifactOpenLabel = '',
  memory = {},
  memoryBrowse = {},
  memoryFilterChips = [],
  memoryFilterLabel = '',
  memoryPageLabel = '',
  memoryPageSize = 12,
  memoryRangeLabel = '',
  memorySort = 'latest',
  memoryVisibleCount = 12,
  retrieval = {},
  visibleMissionMemoryEntries = [],
  visibleWorkspaceMemoryEntries = [],
} = {}) {
  return `
    ${renderHarnessMemoryOverviewGrid(memory)}
    ${renderHarnessLayeredMemoryCallout()}
    ${renderFactGraphPreview(memory)}
    ${renderHarnessMemoryRetrievalFocusCallout({
      activeRetrievalSourceClearLabel,
      activeRetrievalSourceFocus,
    })}
    ${renderHarnessRetrievalPreviewSection({
      latestRetrievalArtifact,
      latestRetrievalArtifactOpenLabel,
      retrieval,
    })}
    ${renderHarnessMemorySearchbar({
      memoryBrowse,
      memoryFilterLabel,
    })}
    ${renderHarnessMemoryBrowseSection({
      isMemoryBrowseDirty,
      memoryBrowse,
      memoryFilterChips,
      memoryFilterLabel,
      memoryPageLabel,
      memoryPageSize,
      memoryRangeLabel,
      memorySort,
      memoryVisibleCount,
      visibleMissionMemoryEntries,
      visibleWorkspaceMemoryEntries,
    })}
  `;
}

function renderHarnessMemorySearchbar({ memoryBrowse = {}, memoryFilterLabel = '' } = {}) {
  return `<div class="harness-searchbar">
    <label class="compact-label">
      메모 검색
      <input id="harness-memory-search" type="search" value="${escapeHtml(String(memoryBrowse.filters?.query || ''))}" placeholder="내용 또는 kind 검색" aria-label="${escapeHtml(`메모 검색: ${memoryFilterLabel}`)}" />
    </label>
    <div class="harness-filter-row">
      <label class="compact-label">
        범위
        <select id="harness-memory-scope-filter" aria-label="${escapeHtml(`메모 범위 필터: ${memoryFilterLabel}`)}">
          <option value="all" ${String(memoryBrowse.filters?.scope || 'all') === 'all' ? 'selected' : ''}>전체</option>
          <option value="mission" ${String(memoryBrowse.filters?.scope || 'all') === 'mission' ? 'selected' : ''}>미션 메모</option>
          <option value="workspace" ${String(memoryBrowse.filters?.scope || 'all') === 'workspace' ? 'selected' : ''}>워크스페이스 메모</option>
        </select>
      </label>
      <label class="compact-label">
        종류
        <select id="harness-memory-kind-filter" aria-label="${escapeHtml(`메모 종류 필터: ${memoryFilterLabel}`)}">
          <option value="all" ${String(memoryBrowse.filters?.kind || 'all') === 'all' ? 'selected' : ''}>전체</option>
          <option value="fact" ${String(memoryBrowse.filters?.kind || 'all') === 'fact' ? 'selected' : ''}>사실</option>
          <option value="decision" ${String(memoryBrowse.filters?.kind || 'all') === 'decision' ? 'selected' : ''}>결정</option>
          <option value="preference" ${String(memoryBrowse.filters?.kind || 'all') === 'preference' ? 'selected' : ''}>선호</option>
        </select>
      </label>
    </div>
  </div>`;
}

function renderHarnessMemoryBrowseControls({
  isMemoryBrowseDirty = false,
  memoryFilterLabel = '',
  memorySort = 'latest',
  memoryVisibleCount = 12,
} = {}) {
  const sortValue = String(memorySort || 'latest');
  const pageSizeValue = Number(memoryVisibleCount || 12) || 12;

  return `<div class="harness-filter-row">
    <p class="summary-label">정렬</p>
    <div class="inline-actions">
      <label class="compact-label">
        메모 정렬
        <select id="harness-memory-sort" aria-label="${escapeHtml(`메모 정렬: ${memoryFilterLabel}`)}">
          <option value="latest" ${sortValue === 'latest' ? 'selected' : ''}>최신순</option>
          <option value="oldest" ${sortValue === 'oldest' ? 'selected' : ''}>오래된 순</option>
          <option value="kind" ${sortValue === 'kind' ? 'selected' : ''}>종류순</option>
        </select>
      </label>
      <label class="compact-label">
        페이지 크기
        <select id="harness-memory-limit" aria-label="${escapeHtml(`메모 페이지 크기: ${memoryFilterLabel}`)}">
          <option value="12" ${pageSizeValue === 12 ? 'selected' : ''}>12건</option>
          <option value="24" ${pageSizeValue === 24 ? 'selected' : ''}>24건</option>
          <option value="48" ${pageSizeValue === 48 ? 'selected' : ''}>48건</option>
        </select>
      </label>
      ${renderMemoryBrowseActionButton({
        action: 'reset-browse',
        actionLabel: isMemoryBrowseDirty ? `메모리 필터 초기화: ${memoryFilterLabel}` : '메모리 필터 초기화: 적용된 메모리 필터 없음',
        buttonText: '필터 초기화',
        disabled: !isMemoryBrowseDirty,
      })}
    </div>
  </div>`;
}

function renderHarnessMemoryBrowseList({ entries = [], scope = 'mission' } = {}) {
  const scopeValue = String(scope || 'mission').trim() === 'workspace' ? 'workspace' : 'mission';
  const actionPrefix = scopeValue === 'workspace' ? '워크스페이스 메모' : '미션 메모';
  return `<div class="harness-list">
    ${(entries || [])
      .map(
        (entry) => `
          <div class="harness-row">
            <div>
              <div class="item-title">${escapeHtml(getDisplayLabel(entry.kind, entry.kind))}</div>
              <div class="item-meta">${escapeHtml(summarizeText(entry.content, '-'))}</div>
            </div>
            <div class="harness-row-meta">
              <span class="item-meta">${escapeHtml(formatDate(entry.updatedAt || entry.createdAt))}</span>
              <div class="inline-actions">
                ${renderMemoryBrowseActionButton({
                  action: 'edit',
                  actionLabel: `${actionPrefix} 불러오기: ${summarizeText(entry.content, entry.id || entry.kind)}`,
                  buttonText: '불러오기',
                  memoryId: entry.id,
                  scope: scopeValue,
                })}
                ${renderMemoryBrowseActionButton({
                  action: 'delete',
                  actionLabel: `${actionPrefix} 삭제: ${summarizeText(entry.content, entry.id || entry.kind)}`,
                  buttonText: '삭제',
                  className: 'danger-button',
                  memoryId: entry.id,
                  scope: scopeValue,
                })}
              </div>
            </div>
          </div>
        `,
      )
      .join('')}
  </div>`;
}

function renderHarnessMemoryBrowseSection({
  isMemoryBrowseDirty = false,
  memoryBrowse = {},
  memoryFilterChips = [],
  memoryFilterLabel = '',
  memoryPageLabel = '',
  memoryPageSize = 12,
  memoryRangeLabel = '',
  memorySort = 'latest',
  memoryVisibleCount = 12,
  visibleMissionMemoryEntries = [],
  visibleWorkspaceMemoryEntries = [],
} = {}) {
  return `<div class="harness-subsection">
    <div class="harness-filter-row">
      <p class="summary-label">메모 탐색</p>
      <span class="item-meta">총 ${escapeHtml(String(memoryBrowse.summary?.total || 0))}건 · 검색 결과 ${escapeHtml(String(memoryBrowse.summary?.filteredTotal || 0))}건 · ${escapeHtml(memoryPageLabel)} · ${escapeHtml(getHarnessMemorySortLabel())}</span>
    </div>
    ${renderHarnessFilterChips(memoryFilterChips)}
    ${renderHarnessMemoryBrowseControls({
      isMemoryBrowseDirty,
      memoryFilterLabel,
      memorySort,
      memoryVisibleCount,
    })}
    ${renderHarnessMemoryBrowseList({ entries: visibleMissionMemoryEntries, scope: 'mission' })}
  </div>
  ${
    (visibleWorkspaceMemoryEntries || []).length
      ? `<div class="harness-subsection">
          <p class="summary-label">워크스페이스 기억</p>
          ${renderHarnessMemoryBrowseList({ entries: visibleWorkspaceMemoryEntries, scope: 'workspace' })}
        </div>`
      : ''
  }
  ${renderHarnessMemoryBrowseFooter({
    memoryBrowse,
    memoryFilterLabel,
    memoryPageLabel,
    memoryPageSize,
    memoryRangeLabel,
  })}`;
}

function renderHarnessMemoryBrowseFooter({
  memoryBrowse = {},
  memoryFilterLabel = '',
  memoryPageLabel = '',
  memoryPageSize = 12,
  memoryRangeLabel = '',
} = {}) {
  const filteredTotal = Number(memoryBrowse.summary?.filteredTotal || 0);
  if (filteredTotal) {
    return `<div class="harness-empty-inline">
      <strong>${escapeHtml(memoryPageLabel)} · ${escapeHtml(memoryRangeLabel)}</strong>
      <p>남은 메모 ${escapeHtml(String(memoryBrowse.summary?.remainingCount || 0))}건 · 검색 결과 ${escapeHtml(String(filteredTotal))}건</p>
      <div class="inline-actions">
        ${renderMemoryBrowseActionButton({
          action: 'prev-page',
          actionLabel: memoryBrowse.summary?.hasPrev ? `이전 메모리 ${memoryPageSize}건: ${memoryPageLabel}` : `이전 메모리 ${memoryPageSize}건 없음: ${memoryPageLabel}`,
          buttonText: `이전 ${String(memoryPageSize)}건`,
          disabled: !memoryBrowse.summary?.hasPrev,
        })}
        ${renderMemoryBrowseActionButton({
          action: 'next-page',
          actionLabel: memoryBrowse.summary?.hasNext ? `다음 메모리 ${memoryPageSize}건: ${memoryPageLabel}` : `다음 메모리 ${memoryPageSize}건 없음: ${memoryPageLabel}`,
          buttonText: `다음 ${String(memoryPageSize)}건`,
          disabled: !memoryBrowse.summary?.hasNext,
        })}
      </div>
    </div>`;
  }

  return `<div class="harness-empty-inline">
    <strong>일치하는 메모리가 없습니다.</strong>
    <p>${escapeHtml(memoryFilterLabel)} 기준으로 일치하는 메모를 찾지 못했습니다.</p>
  </div>`;
}

function renderHarnessLoopStatusList(loops = {}) {
  return `<div class="harness-list">
    <div class="harness-row">
      <div>
        <div class="item-title">검토 루프</div>
        <div class="item-meta">${escapeHtml(loops.review?.latestReviewerSummary || '최근 reviewer summary가 없습니다.')}</div>
      </div>
      <div class="harness-row-meta"><span class="mini-badge ${getStatusClass(loops.review?.latestReviewerStatus || 'pending')}">${escapeHtml(getDisplayLabel(loops.review?.latestReviewerStatus || 'pending'))}</span></div>
    </div>
    <div class="harness-row">
      <div>
        <div class="item-title">유지보수 루프</div>
        <div class="item-meta">최근 sweep ${escapeHtml(formatDate(loops.maintenance?.latestRunAt))} · 다음 due ${escapeHtml(formatDate(loops.maintenance?.nextDueAt))}</div>
      </div>
      <div class="harness-row-meta"><span class="mini-badge ${getStatusClass((loops.maintenance?.requiredCount || 0) > 0 ? 'failed' : 'completed')}">${escapeHtml((loops.maintenance?.requiredCount || 0) > 0 ? '점검 필요' : '안정')}</span></div>
    </div>
    <div class="harness-row">
      <div>
        <div class="item-title">품질 게이트</div>
        <div class="item-meta">blocked ${escapeHtml(String(loops.quality?.blockedCount || 0))}건 · 상태 ${escapeHtml(getDisplayLabel(loops.quality?.status || 'none'))}</div>
      </div>
      <div class="harness-row-meta"><span class="item-meta">${escapeHtml(formatDate(loops.provider?.latestSuccessAt || loops.provider?.latestFailureAt))}</span></div>
    </div>
  </div>`;
}

function renderHarnessLoopsOverviewGrid(loops = {}) {
  return `<div class="harness-overview-grid">
    <div class="summary-chip"><span>검토</span><strong>승인 ${escapeHtml(String(loops.review?.pendingApprovals || 0))} · 후속 ${escapeHtml(String(loops.review?.pendingActions || 0))}</strong></div>
    <div class="summary-chip"><span>유지보수</span><strong>${escapeHtml(String(loops.maintenance?.requiredCount || 0))}건</strong></div>
    <div class="summary-chip"><span>제공자</span><strong>${escapeHtml(getDisplayLabel(loops.provider?.healthDriftStatus || 'stable'))}</strong></div>
  </div>`;
}

function renderHarnessCurrentRecommendationCallout(recommendations = []) {
  return `<div class="harness-callout">
    <strong>현재 권장 조치</strong>
    <p>${escapeHtml(recommendations[0]?.title || '열린 하네스 경고가 없습니다. 문서, 메모리, 운영 루프가 안정 상태입니다.')}</p>
  </div>`;
}

function renderHarnessAdditionalRecommendations(recommendations = []) {
  if (!recommendations.length || recommendations.length <= 1) {
    return '';
  }

  return `<div class="harness-subsection">
    <p class="summary-label">추가 권장 항목</p>
    <div class="harness-list">
      ${recommendations
        .slice(1, 4)
        .map(
          (item) => `
            <div class="harness-row">
              <div class="item-meta">${escapeHtml(item.title)}</div>
            </div>
          `,
        )
        .join('')}
    </div>
  </div>`;
}

function renderHarnessAdoptedPatterns(patterns = []) {
  return `<div class="harness-subsection">
    <p class="summary-label">이번에 적용한 하네스 원칙</p>
    <div class="harness-list">
      ${(patterns || [])
        .map(
          (pattern) => `
            <div class="harness-row">
              <div>
                <div class="item-title">${escapeHtml(pattern.label)}</div>
                <div class="item-meta">${escapeHtml(pattern.detail)}</div>
              </div>
            </div>
          `,
        )
        .join('')}
    </div>
  </div>`;
}

function renderHarnessLoopsPanel({ adoptedPatterns = [], loops = {}, recommendations = [] } = {}) {
  return `
    ${renderHarnessCurrentRecommendationCallout(recommendations)}
    ${renderHarnessLoopsOverviewGrid(loops)}
    ${renderHarnessLoopStatusList(loops)}
    ${renderHarnessAdditionalRecommendations(recommendations)}
    ${renderHarnessAdoptedPatterns(adoptedPatterns)}
  `;
}

function renderHarnessPanelEmptyState() {
  return emptyStateCard({
    action: 'jump-step',
    actionLabel: '1단계로 이동',
    actionValue: 'step-setup',
    icon: 'HS',
    message: '미션을 선택하면 문서 기준점, 메모리, 운영 루프를 묶은 하네스 뷰를 보여줍니다.',
    title: '하네스 정보를 계산할 미션이 없습니다',
  });
}

function wireHarnessEmptyPanelActions() {
  wireQuickActions(elements.harnessSource);
  wireQuickActions(elements.harnessMemory);
  wireQuickActions(elements.harnessLoops);
}

function wireHarnessPanelActions() {
  wireQuickActions(elements.harnessSource);
  wireQuickActions(elements.harnessMemory);
  wireDocumentRowActions();
  wireMissionAttachmentActions();
  wireRetrievalArtifactButtons(elements.harnessMemory);
  wireRetrievalSourceButtons(elements.harnessMemory);
  wireMemoryRowActions();
}

function syncHarnessDocumentLogControls() {
  if (elements.documentLogSearch) {
    elements.documentLogSearch.value = state.harnessDocumentQuery;
  }
  if (elements.documentLogFilter) {
    elements.documentLogFilter.value = state.harnessDocumentFilter;
  }
}

function populateDocumentLogForm(entry) {
  if (!elements.documentLogForm || !entry) {
    return;
  }

  elements.documentLogForm.dataset.editingId = entry.id;
  const missionTitlePrefix = state.missionDetail?.mission?.title ? `${state.missionDetail.mission.title} · ` : '';
  const typeField = elements.documentLogForm.querySelector('select[name="type"]');
  const titleField = elements.documentLogForm.querySelector('input[name="title"]');
  const contentField = elements.documentLogForm.querySelector('textarea[name="content"]');

  if (typeField) {
    typeField.value = entry.type;
  }
  if (titleField) {
    titleField.value = missionTitlePrefix && String(entry.title || '').startsWith(missionTitlePrefix)
      ? String(entry.title || '').slice(missionTitlePrefix.length)
      : entry.title;
  }
  if (contentField) {
    contentField.value = entry.content;
    contentField.focus();
  }
  if (elements.documentLogFormStatus) {
    elements.documentLogFormStatus.textContent = `문서 기록 수정 중 · ${getDisplayLabel(entry.type, entry.type)} · ${formatDate(entry.updatedAt || entry.createdAt)}`;
  }
  if (elements.documentLogSubmitButton) {
    elements.documentLogSubmitButton.textContent = '문서 기록 수정';
  }
  if (elements.documentLogCancelButton) {
    elements.documentLogCancelButton.hidden = false;
  }
}

function isReleaseHandoffPreviewable(item = {}) {
  if (!item || typeof item !== 'object') {
    return false;
  }
  const format = String(item.format || '').trim().toLowerCase();
  return Boolean(item.exists && item.href && RELEASE_HANDOFF_PREVIEWABLE_FORMATS.has(format));
}

const releaseHandoffStableLineCopyBaseKey =
  'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopy';

function buildReleaseHandoffStableLineCopyKey(totalLineCopyCount) {
  return `${releaseHandoffStableLineCopyBaseKey}${'LineCopy'.repeat(totalLineCopyCount - 5)}`;
}

function buildReleaseHandoffPreviewContent(content = '') {
  const normalizedContent = String(content || '').replace(/\r/g, '');
  const lines = normalizedContent.split('\n');
  let previewLines = lines;
  let truncated = false;

  if (previewLines.length > RELEASE_HANDOFF_PREVIEW_MAX_LINES) {
    previewLines = previewLines.slice(0, RELEASE_HANDOFF_PREVIEW_MAX_LINES);
    truncated = true;
  }

  let previewContent = previewLines.join('\n');
  if (previewContent.length > RELEASE_HANDOFF_PREVIEW_MAX_CHARACTERS) {
    previewContent = previewContent.slice(0, RELEASE_HANDOFF_PREVIEW_MAX_CHARACTERS).trimEnd();
    truncated = true;
  }

  return {
    content: previewContent,
    lineCount: lines.length,
    truncated,
  };
}

function clearReleaseHandoffPreview() {
  state.releaseHandoffPreviewContent = '';
  state.releaseHandoffPreviewError = '';
  state.releaseHandoffPreviewId = '';
  state.releaseHandoffPreviewLineCount = 0;
  state.releaseHandoffPreviewStatus = 'idle';
  state.releaseHandoffPreviewTruncated = false;
}

async function applyReleaseHandoffPreviewUrlState(previewArtifactId = '') {
  const normalizedPreviewArtifactId = String(previewArtifactId || '').trim();
  const handoffArtifacts = state.releaseStatus?.handoffArtifacts || [];
  const previewArtifact = handoffArtifacts.find((item) => String(item.id || '').trim() === normalizedPreviewArtifactId) || null;

  if (!isReleaseHandoffPreviewable(previewArtifact)) {
    clearReleaseHandoffPreview();
    renderReleaseStatus();
    return;
  }

  if (
    state.releaseHandoffPreviewId === normalizedPreviewArtifactId
    && state.releaseHandoffPreviewStatus === 'ready'
    && state.releaseHandoffPreviewContent
  ) {
    renderReleaseStatus();
    return;
  }

  await loadReleaseHandoffPreview(normalizedPreviewArtifactId, { syncUrl: false });
}

function stopExecutionPolling() {
  if (state.executionPollTimer) {
    clearInterval(state.executionPollTimer);
    state.executionPollTimer = null;
  }
}

function getExecutionStatusPayload() {
  return state.executionStatus?.execution || state.missionDetail?.execution || null;
}

function buildOperatorHandoffItems({
  aiConfig = {},
  flow = {},
  latestSession = null,
  mission = {},
} = {}) {
  const execution = getExecutionStatusPayload();
  const executionSession = execution?.latestExecutionSession || null;
  const verification = executionSession?.verification || null;
  const providerLabel =
    latestSession?.provider ||
    executionSession?.provider ||
    aiConfig.recommendedProvider ||
    'provider 선택 전';
  const sessionLabel =
    executionSession?.id ||
    latestSession?.id ||
    mission.id ||
    'session 없음';
  const completionLabel = verification?.status
    ? getDisplayLabel(verification.status, verification.status)
    : executionSession?.status === 'completed'
      ? '검증 확인 필요'
      : flow.recommendedStep === 'step-output'
        ? '결과 확인'
        : '완료 전';

  return [
    {
      detail:
        verification?.summary ||
        flow.copy ||
        '완료 선언 전 실행 결과와 검증 근거를 확인합니다.',
      label: '완료 게이트',
      value: completionLabel,
    },
    {
      detail: aiConfig.recommendedProvider
        ? `권장 provider: ${aiConfig.recommendedProvider}`
        : '미션 실행 provider와 fallback 상태를 같은 표면에서 확인합니다.',
      label: 'Provider 경로',
      value: providerLabel,
    },
    {
      detail: executionSession?.status
        ? `execution ${getDisplayLabel(executionSession.status, executionSession.status)}`
        : latestSession?.status
          ? `mission ${getDisplayLabel(latestSession.status, latestSession.status)}`
          : '아직 실행 세션이 없습니다.',
      label: '세션 증적',
      value: sessionLabel,
    },
  ];
}

function isExecutionMissionSelected() {
  return state.missionDetail?.mission?.mode === 'engineering';
}

function getHarnessRecommendationAction(recommendation) {
  const code = String(recommendation?.code || '').trim();
  switch (code) {
    case 'pending-approvals':
      return {
        action: 'jump-step',
        label: '검토 단계 열기',
        secondaryAction: 'switch-tab',
        secondaryLabel: '승인 항목 보기',
        secondaryValue: 'reviews',
        value: 'step-review',
      };
    case 'pending-actions':
      return {
        action: 'jump-step',
        label: '검토 단계 열기',
        secondaryAction: 'switch-tab',
        secondaryLabel: '후속 작업 보기',
        secondaryValue: 'reviews',
        value: 'step-review',
      };
    case 'missing-artifact':
      return {
        action: 'jump-step',
        label: '실행 단계 열기',
        secondaryAction: 'switch-tab',
        secondaryLabel: '실행 기록 보기',
        secondaryValue: 'runs',
        value: 'step-run',
      };
    case 'empty-memory':
      return {
        action: 'jump-step',
        label: '1단계 입력 점검',
        secondaryAction: 'switch-tab',
        secondaryLabel: '하네스 보기',
        secondaryValue: 'harness',
        value: 'step-setup',
      };
    case 'maintenance-required':
    case 'provider-health-drift':
    default:
      return {
        action: 'switch-tab',
        label: '하네스 보기',
        secondaryAction: 'switch-tab',
        secondaryLabel: '실행 기록 보기',
        secondaryValue: 'runs',
        value: 'harness',
      };
  }
}

function getHarnessSummaryState() {
  const harness = state.missionDetail?.harness || null;
  const topRecommendation = harness?.recommendations?.[0] || null;
  const recommendationAction = getHarnessRecommendationAction(topRecommendation);
  return {
    docsAvailableCount: harness?.documents?.summary?.availableCount || 0,
    docsTotalCount: harness?.documents?.summary?.totalCount || 0,
    memoryTotalCount: harness?.memory?.missionCounts?.total || 0,
    pendingActionCount: harness?.loops?.review?.pendingActions || 0,
    pendingApprovalCount: harness?.loops?.review?.pendingApprovals || 0,
    providerHealthStatus: harness?.loops?.provider?.healthDriftStatus || 'stable',
    recommendationAction,
    recommendationCount: harness?.recommendations?.length || 0,
    topRecommendation,
  };
}

function getReleaseStatusSummary() {
  const release = state.releaseStatus || null;
  if (!release) {
    return {
      blockedItems: 0,
      checklistOpen: 0,
      deterministicLabel: '데이터 없음',
      generatedAt: '',
      ready: false,
    };
  }

  const deterministicPassed = Number(release.summary?.deterministicPassed || 0);
  const deterministicTotal = Number(release.summary?.deterministicTotal || 0);
  return {
    blockedItems: Number(release.summary?.blockedItems || 0),
    checklistOpen: Number(release.summary?.checklistOpen || 0),
    deterministicLabel:
      deterministicTotal > 0
        ? `${deterministicPassed}/${deterministicTotal} passed`
        : '데이터 없음',
    generatedAt: release.updatedAt || release.closeout?.generatedAt || release.evidence?.generatedAt || '',
    ready: Boolean(release.summary?.ready),
  };
}

function getReleaseStatusBadge(status = '') {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized) {
    return 'status-pending';
  }
  if (normalized.includes('passed') || normalized.includes('ready') || normalized.includes('completed')) {
    return 'status-completed';
  }
  if (
    normalized.includes('abandoned') ||
    normalized.includes('blocked') ||
    normalized.includes('failed') ||
    normalized.includes('missing-env')
  ) {
    return 'status-failed';
  }
  return 'status-pending';
}

function getReleaseActionLabel(action = '') {
  const normalized = String(action || '').trim().toLowerCase();
  return (
    {
      'provider-preflight': 'provider preflight',
      refresh: 'current surface / live refresh',
      'refresh-preflight': 'refresh preflight',
      snapshot: 'release snapshot',
      'snapshot-preflight': 'snapshot preflight',
    }[normalized] || 'release action'
  );
}

function getReleaseActionScopeLabel(scope = '') {
  const normalized = String(scope || '').trim().toLowerCase();
  return (
    {
      'current-surface': 'current surface',
      'live-validation': 'live validation',
      'provider-readiness': 'provider readiness',
      snapshot: 'snapshot freeze',
    }[normalized] || 'release flow'
  );
}

function getRuntimeJobKindLabel(kind = '') {
  const normalized = String(kind || '').trim().toLowerCase();
  return (
    {
      'execution-v1-refresh': 'execution v1 refresh',
      'execution-v1-snapshot': 'execution v1 snapshot',
    }[normalized] || getDisplayLabel(kind || 'runtime job')
  );
}

function renderReleaseRuntimeJobCard(job = {}, bucket = 'recent') {
  const jobId = String(job.id || '').trim();
  const requestId = String(job.requestId || '').trim();
  const status = String(job.status || (bucket === 'active' ? 'active' : 'unknown')).trim();
  const scope = String(job.scope || '').trim();
  const durationLabel = bucket === 'active'
    ? 'running'
    : formatDurationMs(job.durationMs);
  const timestamp = bucket === 'active'
    ? job.startedAt
    : job.endedAt || job.startedAt;
  return `
    <article class="release-snapshot-card" data-release-runtime-job-id="${escapeHtml(jobId)}">
      <div class="release-provider-meta">
        <div>
          <div class="item-title">${escapeHtml(getRuntimeJobKindLabel(job.kind))}</div>
          <div class="item-meta">${escapeHtml(scope ? getReleaseActionScopeLabel(scope) : 'runtime flow')}${requestId ? ` · request ${escapeHtml(requestId.slice(0, 12))}` : ''}</div>
        </div>
        <div class="release-history-actions">
          <span class="mini-badge ${getReleaseStatusBadge(status)}">${escapeHtml(status || 'unknown')}</span>
          <span class="mini-badge status-pending">${escapeHtml(durationLabel)}</span>
        </div>
      </div>
      <div class="item-meta">${escapeHtml(job.summary || (bucket === 'active' ? 'runtime job is currently active.' : 'runtime job summary가 없습니다.'))}</div>
      <div class="release-meta release-meta-secondary">
        <span class="item-meta">${escapeHtml(bucket === 'active' ? 'started' : 'finished')} ${escapeHtml(formatDate(timestamp))}</span>
        ${jobId ? `<span class="item-meta mono">${escapeHtml(jobId.slice(0, 24))}</span>` : ''}
        ${job.source ? `<span class="item-meta">${escapeHtml(job.source)}</span>` : ''}
      </div>
    </article>
  `;
}

export function isReleaseAttentionOutcome(outcome = '') {
  const normalized = String(outcome || '').trim().toLowerCase();
  return normalized === 'blocked' || normalized === 'failed' || normalized === 'confirmation-required';
}

function matchesReleaseActionRecommendation(item, historyItem, providerReadiness = []) {
  const action = String(item?.action || '').trim();
  const actionProvider = String(item?.actionProvider || '').trim();
  const providerFromEnv = String(
    providerReadiness.find((entry) => String(entry.envKey || '').trim() === String(item?.envKey || '').trim())?.provider || '',
  ).trim();
  const provider = actionProvider || providerFromEnv;
  const historyAction = String(historyItem?.action || '').trim();
  const historyScope = String(historyItem?.scope || '').trim();
  const historyProvider = String(historyItem?.provider || '').trim();

  if (action === 'regenerate-release-surface') {
    return historyScope === 'current-surface' && (historyAction === 'refresh' || historyAction === 'refresh-preflight');
  }

  if (action === 'archive-release-snapshot') {
    return historyScope === 'snapshot' && (historyAction === 'snapshot' || historyAction === 'snapshot-preflight');
  }

  if (action === 'run-release-preflight' && provider) {
    return historyAction === 'provider-preflight' && historyProvider === provider;
  }

  if (!action && provider) {
    return historyProvider === provider;
  }

  return false;
}

function getRecommendationHistoryContext(item, releaseActionHistory = [], providerReadiness = []) {
  if (!Array.isArray(releaseActionHistory) || !releaseActionHistory.length) {
    return {
      attentionCount: 0,
      latestAction: null,
      latestAttentionAction: null,
      matchCount: 0,
    };
  }

  const matches = releaseActionHistory.filter((historyItem) => matchesReleaseActionRecommendation(item, historyItem, providerReadiness));
  const attentionMatches = matches.filter((historyItem) => isReleaseAttentionOutcome(historyItem?.outcome));
  return {
    attentionCount: attentionMatches.length,
    latestAction: matches[0] || null,
    latestAttentionAction: attentionMatches[0] || null,
    matchCount: matches.length,
  };
}

function getRecommendationProviderEntry(item, providerReadiness = []) {
  const actionProvider = String(item?.actionProvider || '').trim();
  const envKey = String(item?.envKey || '').trim();
  return providerReadiness.find((entry) => {
    const entryProvider = String(entry?.provider || '').trim();
    const entryEnvKey = String(entry?.envKey || '').trim();
    return (actionProvider && entryProvider === actionProvider) || (envKey && entryEnvKey === envKey);
  });
}

function getRecommendationCommandContext(item, providerReadiness = []) {
  const action = String(item?.action || '').trim();
  const explicitCommand = String(item?.command || '').trim();
  const envKey = String(item?.envKey || '').trim();
  const providerEntry = getRecommendationProviderEntry(item, providerReadiness);

  if (explicitCommand) {
    return {
      command: explicitCommand,
      label: item?.label ? `${item.label} 명령` : '권장 액션 명령',
      buttonLabel: action === 'run-release-preflight' ? 'preflight 명령 복사' : 'live 명령 복사',
    };
  }

  if (action === 'run-release-preflight') {
    if (!providerEntry) {
      return null;
    }
    return {
      command: String(providerEntry.preflightCommand || '').trim(),
      label: `${providerEntry.label} preflight 명령`,
      buttonLabel: 'preflight 명령 복사',
    };
  }

  if (envKey) {
    if (!providerEntry) {
      return null;
    }
    return {
      command: providerEntry.ready
        ? String(providerEntry.command || '').trim()
        : `export ${providerEntry.envKey}="..." && ${providerEntry.command}`,
      label: `${providerEntry.label} live 명령`,
      buttonLabel: 'live 명령 복사',
    };
  }

  return null;
}

export function getProviderLiveCommand(providerEntry = {}, preflight = null) {
  if (providerEntry?.ready) {
    return String(providerEntry.command || '').trim();
  }

  return String(preflight?.missingEnvCommand || '').trim()
    || `export ${providerEntry.envKey}="..." && ${providerEntry.command}`;
}

function isRecommendationFlowActive({ attentionAction = null, latestAction = null }, {
  focusedHistoryId = '',
  historyFilterOutcome = '',
  historyFilterProvider = '',
  historyFilterScope = '',
} = {}) {
  const historyId = String(latestAction?.id || '').trim();
  const scope = String(latestAction?.scope || '').trim();
  const provider = String(latestAction?.provider || '').trim();
  const attentionHistoryId = String(attentionAction?.id || '').trim();
  const attentionScope = String(attentionAction?.scope || '').trim() || scope;
  const attentionProvider = String(attentionAction?.provider || '').trim() || provider;

  return {
    attentionFlowActive:
      Boolean(attentionHistoryId)
      && focusedHistoryId === attentionHistoryId
      && historyFilterOutcome === 'attention'
      && historyFilterScope === attentionScope
      && historyFilterProvider === attentionProvider,
    sameFlowActive:
      Boolean(historyId)
      && focusedHistoryId === historyId
      && historyFilterOutcome === ''
      && historyFilterScope === scope
      && historyFilterProvider === provider,
  };
}

export function getReleaseCurrentOpenBlockerActions(releaseStatus = state.releaseStatus) {
  const releaseReadiness = releaseStatus?.releaseReadiness || {};
  const currentOpenBlockers = Array.isArray(releaseReadiness.currentOpenBlockers)
    ? releaseReadiness.currentOpenBlockers
    : [];

  return Array.isArray(releaseReadiness.currentOpenBlockerActions)
    ? releaseReadiness.currentOpenBlockerActions
    : currentOpenBlockers.map((item, index) => ({
        blocker: item,
        category: 'release-readiness',
        commands: [],
        evidenceDocs: [],
        id: `current-open-blocker-${index + 1}`,
        nextEvidence: '',
        owner: 'release-owner',
        status: 'blocked',
        stopReason: item,
      }));
}

export function getReleaseCurrentOpenBlockerAction(blockerId = '') {
  const normalizedBlockerId = String(blockerId || '').trim();
  if (!normalizedBlockerId) {
    return null;
  }
  return getReleaseCurrentOpenBlockerActions().find((item) => String(item.id || '').trim() === normalizedBlockerId) || null;
}

function isReleaseBlockerActionVisibleForFilter(
  blockerAction = null,
  {
    category = state.releaseBlockerCategoryFilter,
    includeShared = state.releaseBlockerIncludeSharedProviderOperations,
    owner = state.releaseBlockerOwnerFilter,
    provider = state.releaseBlockerProviderFilter,
  } = {},
) {
  if (!blockerAction) {
    return false;
  }
  if (includeShared === false && isReleaseSharedProviderBlockerAction(blockerAction)) {
    return false;
  }
  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const actionCategory = String(blockerAction.category || '').trim();
  const actionOwner = String(blockerAction.owner || '').trim();
  return (!normalizedCategory || actionCategory === normalizedCategory)
    && (!normalizedOwner || actionOwner === normalizedOwner)
    && (
      !normalizedProvider
      || isReleaseSharedProviderBlockerAction(blockerAction)
      || doesReleaseBlockerActionMatchProvider(blockerAction, normalizedProvider)
    );
}

function isReleaseBlockerActionVisibleForCopyScope(
  blockerAction = null,
  {
    category = state.releaseBlockerCategoryFilter,
    includeShared = state.releaseBlockerIncludeSharedProviderOperations,
    owner = state.releaseBlockerOwnerFilter,
    provider = state.releaseBlockerProviderFilter,
  } = {},
) {
  return isReleaseBlockerActionVisibleForFilter(blockerAction, {
    category,
    includeShared,
    owner,
    provider,
  });
}

export function getFilteredReleaseCurrentOpenBlockerActions(releaseStatus = state.releaseStatus) {
  return getReleaseCurrentOpenBlockerActions(releaseStatus).filter((item) =>
    isReleaseBlockerActionVisibleForFilter(item),
  );
}

export function getAbsoluteReleaseUrl(href = '') {
  const normalizedHref = String(href || '').trim();
  if (!normalizedHref) {
    return '';
  }
  if (normalizedHref.startsWith('http://') || normalizedHref.startsWith('https://')) {
    return normalizedHref;
  }
  return `${window.location.origin}${normalizedHref.startsWith('/') ? normalizedHref : `/${normalizedHref}`}`;
}

export function buildReleaseBlockerSliceUrl({
  category = state.releaseBlockerCategoryFilter,
  includeShared = state.releaseBlockerIncludeSharedProviderOperations,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  return `${window.location.origin}${buildUiStateUrl({
    detailTab: 'release',
    releaseBlockerCategoryFilter: normalizedCategory,
    releaseBlockerIncludeSharedProviderOperations: includeShared !== false,
    releaseBlockerOwnerFilter: normalizedOwner,
    releaseBlockerProviderFilter: normalizedProvider,
    releaseFocusedBlockerId: '',
    releaseFocusedProductionBlockerIndex: '',
    releaseFocusedProvider: normalizedProvider,
    releaseFocusedHistoryId: '',
    releaseHistoryOutcome: '',
    releaseHistoryProvider: '',
    releaseHistoryScope: '',
  })}`;
}

export function buildReleaseBlockerApiUrl({
  category = state.releaseBlockerCategoryFilter,
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedCategory = String(category || '').trim();
  const shouldIncludeShared = includeShared !== false;
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const params = new URLSearchParams();
  if (normalizedCategory) {
    params.set('category', normalizedCategory);
  }
  if (normalizedOwner) {
    params.set('owner', normalizedOwner);
  }
  if (normalizedProvider) {
    params.set('provider', normalizedProvider);
  }
  if (!shouldIncludeShared) {
    params.set('includeShared', 'false');
  }
  const query = params.toString();
  return getAbsoluteReleaseUrl(`/api/execution-v1/release-blockers${query ? `?${query}` : ''}`);
}

export function getReleaseProductionBlockers(releaseStatus = state.releaseStatus) {
  const releaseReadiness = releaseStatus?.releaseReadiness || {};
  return Array.isArray(releaseReadiness.productionBlockers)
    ? releaseReadiness.productionBlockers
      .map((item) => String(item || '').trim())
      .filter(Boolean)
    : [];
}

export function getValidReleaseProductionBlockerIndex(value, releaseStatus = state.releaseStatus) {
  const normalizedIndex = normalizeReleaseProductionBlockerStateIndex(value);
  if (normalizedIndex === '') {
    return '';
  }
  const productionBlockers = getReleaseProductionBlockers(releaseStatus);
  const index = Number(normalizedIndex);
  return index >= 0 && index < productionBlockers.length ? String(index) : '';
}

export function getReleaseProviderReadinessEntries({
  provider = '',
  releaseStatus = state.releaseStatus,
} = {}) {
  const providerReadiness = Array.isArray(releaseStatus?.providerReadiness)
    ? releaseStatus.providerReadiness
    : [];
  const normalizedProvider = String(provider || '').trim();
  return providerReadiness.filter((item) => {
    const itemProvider = String(item?.provider || '').trim();
    return itemProvider && (!normalizedProvider || itemProvider === normalizedProvider);
  });
}

function getReleaseProviderBlockerNeedles(provider = '') {
  const normalizedProvider = String(provider || '').trim();
  const providerNeedles = {
    anthropic: ['anthropic', 'anthropic_api_key', 'target-anthropic-provider-account'],
    hermes: ['hermes', 'hermes_provider_model', 'target-hermes-provider-architecture'],
    local: ['local provider', 'local_provider_model', 'local_provider_base_url', 'target-local-provider-architecture'],
    openai: ['openai', 'openai_api_key', 'target-openai-provider-account'],
  };
  return providerNeedles[normalizedProvider] || (normalizedProvider ? [normalizedProvider] : []);
}

function getReleaseBlockerActionSearchText(blockerAction = null) {
  const commands = Array.isArray(blockerAction?.commands) ? blockerAction.commands : [];
  const evidenceDocs = Array.isArray(blockerAction?.evidenceDocs) ? blockerAction.evidenceDocs : [];
  return [
    blockerAction?.blocker,
    blockerAction?.category,
    blockerAction?.id,
    blockerAction?.nextEvidence,
    blockerAction?.owner,
    blockerAction?.provider,
    blockerAction?.status,
    blockerAction?.stopReason,
    ...commands.flatMap((command) => [command?.command, command?.kind, command?.label]),
    ...evidenceDocs.flatMap((doc) => [doc?.href, doc?.label, doc?.path]),
  ]
    .map((item) => String(item || '').toLowerCase())
    .filter(Boolean)
    .join(' ');
}

function doesReleaseBlockerActionMatchProvider(blockerAction = null, provider = '') {
  const normalizedProvider = String(provider || '').trim();
  if (!blockerAction || !normalizedProvider) {
    return false;
  }
  if (String(blockerAction.provider || '').trim() === normalizedProvider) {
    return true;
  }

  const searchText = getReleaseBlockerActionSearchText(blockerAction);
  return getReleaseProviderBlockerNeedles(normalizedProvider).some((needle) =>
    searchText.includes(String(needle || '').toLowerCase()),
  );
}

export function getReleaseProviderBlockerActions({
  provider = '',
  releaseStatus = state.releaseStatus,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    return [];
  }

  const blockerActions = getReleaseCurrentOpenBlockerActions(releaseStatus);
  const hasExplicitProviderMapping = blockerActions.some((item) => String(item?.provider || '').trim());
  return blockerActions.filter((item) => {
    if (String(item?.provider || '').trim() === normalizedProvider) {
      return true;
    }
    if (isReleaseSharedProviderBlockerAction(item)) {
      return true;
    }
    if (hasExplicitProviderMapping) {
      return false;
    }
    return doesReleaseBlockerActionMatchProvider(item, normalizedProvider);
  });
}

export function getUniqueReleaseProviderBlockerActions(blockerActions = []) {
  const seen = new Set();
  return (Array.isArray(blockerActions) ? blockerActions : []).filter((item, index) => {
    const actionId = String(item?.id || '').trim() || `provider-blocker-${index}`;
    if (seen.has(actionId)) {
      return false;
    }
    seen.add(actionId);
    return true;
  });
}

export function getReleaseProviderLiveStatus(provider = '', releaseStatus = state.releaseStatus) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    return '';
  }
  const liveValidation = Array.isArray(releaseStatus?.liveValidation)
    ? releaseStatus.liveValidation
    : [];
  const entry = liveValidation.find((item) => String(item?.provider || '').trim() === normalizedProvider);
  return String(entry?.status || '').trim();
}

export function getReleaseProviderSpecificEvidenceDoc(provider = '') {
  const normalizedProvider = String(provider || '').trim();
  const providerDocMap = {
    anthropic: {
      label: 'Target Anthropic provider account',
      path: 'docs/target-anthropic-provider-account-v1.md',
    },
    hermes: {
      label: 'Target Hermes provider architecture',
      path: 'docs/target-hermes-provider-architecture-v1.md',
    },
    local: {
      label: 'Target local provider architecture',
      path: 'docs/target-local-provider-architecture-v1.md',
    },
    openai: {
      label: 'Target OpenAI provider account',
      path: 'docs/target-openai-provider-account-v1.md',
    },
  };
  return providerDocMap[normalizedProvider] || null;
}

export function buildReleaseProviderReadinessUrl(provider = '') {
  const normalizedProvider = String(provider || '').trim();
  return `${window.location.origin}${buildUiStateUrl({
    detailTab: 'release',
    releaseBlockerCategoryFilter: '',
    releaseBlockerOwnerFilter: '',
    releaseBlockerProviderFilter: '',
    releaseFocusedBlockerId: '',
    releaseFocusedProductionBlockerIndex: '',
    releaseFocusedProvider: normalizedProvider,
    releaseFocusedHistoryId: '',
    releaseHistoryOutcome: '',
    releaseHistoryProvider: '',
    releaseHistoryScope: '',
  })}`;
}

export function formatReleaseProviderReadinessEvidenceDocLines(docs = []) {
  return docs.map((doc, index) => {
    const encodedPath = encodeURIComponent(doc.path);
    return [
      `${index + 1}. ${doc.label}`,
      `   - path: ${doc.path}`,
      `   - link: ${getAbsoluteReleaseUrl(`/api/execution-v1/release-doc?path=${encodedPath}`)}`,
    ].join('\n');
  });
}

export function getReleaseProviderReadinessEvidenceDocs(provider = '') {
  const docs = [
    {
      label: 'Production provider readiness',
      path: 'docs/production-provider-readiness-v1.md',
    },
    {
      label: 'Target provider evidence intake',
      path: 'docs/target-provider-evidence-intake-v1.md',
    },
    {
      label: 'Target provider operations',
      path: 'docs/target-provider-operations-v1.md',
    },
  ];
  const providerSpecificDoc = getReleaseProviderSpecificEvidenceDoc(provider);
  if (providerSpecificDoc) {
    docs.push(providerSpecificDoc);
  }
  return docs;
}

export function getReleaseBlockerSliceSummary({
  blockerActions = getFilteredReleaseCurrentOpenBlockerActions(),
  totalActions = getReleaseCurrentOpenBlockerActions(),
} = {}) {
  const visibleActions = Array.isArray(blockerActions) ? blockerActions : [];
  const allActions = Array.isArray(totalActions) ? totalActions : [];
  const evidenceDocKeys = new Set();
  const requiredProofKeys = new Set();
  const commandCount = visibleActions.reduce((total, item) => {
    const commands = getReleaseBlockerRequiredCommands(item);
    return total + commands.filter((command) => String(command.command || '').trim()).length;
  }, 0);
  let closureVerificationCount = 0;
  let productionReadyBlockedCount = 0;
  let targetBoundaryRequiredCount = 0;
  visibleActions.forEach((item) => {
    const closureVerification = getReleaseBlockerClosureVerification(item);
    if (closureVerification.id || item.closureVerification) {
      closureVerificationCount += 1;
    }
    if (closureVerification.targetBoundaryRequired === true) {
      targetBoundaryRequiredCount += 1;
    }
    if (closureVerification.productionReadyClaimAllowed === false) {
      productionReadyBlockedCount += 1;
    }
    const requiredProofs = getReleaseBlockerRequiredProofs(item);
    requiredProofs.forEach((proof) => {
      const proofText = String(proof || '').trim();
      if (proofText) {
        requiredProofKeys.add(proofText);
      }
    });
    const evidenceDocs = getReleaseBlockerRequiredEvidenceDocs(item);
    evidenceDocs.forEach((doc) => {
      const docLabel = String(doc.label || doc.path || 'evidence doc').trim();
      const docPath = String(doc.path || '').trim();
      const docHref = getAbsoluteReleaseUrl(doc.href || '');
      const docKey = docHref || docPath || docLabel;
      if (docKey) {
        evidenceDocKeys.add(docKey);
      }
    });
  });
  const topVisibleAction = visibleActions[0] || null;

  return {
    closureVerificationCount,
    commandCount,
    evidenceDocCount: evidenceDocKeys.size,
    productionReadyBlockedCount,
    requiredProofCount: requiredProofKeys.size,
    targetBoundaryRequiredCount,
    topVisibleBlockerId: String(topVisibleAction?.id || '').trim(),
    topVisibleBlockerLabel: String(topVisibleAction?.blocker || topVisibleAction?.stopReason || '').trim(),
    totalCount: allActions.length,
    visibleCount: visibleActions.length,
  };
}

export function getReleaseSharedProviderOperationsScopeReason({
  includeShared = true,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
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

export function getReleaseSharedProviderOperationsScopeAudit({
  totalActions = getReleaseCurrentOpenBlockerActions(),
  category = state.releaseBlockerCategoryFilter,
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const allActions = Array.isArray(totalActions) ? totalActions : [];
  const scopedActions = allActions.filter((action) =>
    isReleaseBlockerActionVisibleForFilter(action, {
      category,
      includeShared: true,
      owner,
      provider,
    }),
  );
  const visibleActions = allActions.filter((action) =>
    isReleaseBlockerActionVisibleForFilter(action, {
      category,
      includeShared,
      owner,
      provider,
    }),
  );
  const excludedActions = includeShared === false
    ? scopedActions.filter((action) => isReleaseSharedProviderBlockerAction(action))
    : [];

  return {
    excludedCount: excludedActions.length,
    excludedIds: excludedActions.map((action) => String(action.id || '').trim()).filter(Boolean),
    includedCount: visibleActions.filter((action) => isReleaseSharedProviderBlockerAction(action)).length,
  };
}

function getStepLabel(stepId, { short = false } = {}) {
  const meta = STEP_META[stepId];
  if (!meta) {
    return short ? '단계 없음' : '단계 없음';
  }

  return short ? meta.shortLabel : meta.label;
}

function summarizeText(value, fallback = '') {
  const normalized = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return fallback;
  }

  return normalized.length > 92 ? `${normalized.slice(0, 92).trim()}…` : normalized;
}

function summarizeRetrievalSnippet(value, fallback = '-') {
  const normalized = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return fallback;
  }

  return normalized.length > 140 ? `${normalized.slice(0, 140).trim()}…` : normalized;
}

function renderFactGraphPreview(memory = {}) {
  const preview = memory.factGraphPreview || {};
  const allPreview = preview.all || { edges: [], nodes: [], summary: {} };
  const missionPreview = preview.mission || { edges: [], nodes: [], summary: {} };
  const workspacePreview = preview.workspace || { edges: [], nodes: [], summary: {} };
  const activeNodes = [...(missionPreview.nodes || []), ...(workspacePreview.nodes || [])].slice(0, 6);
  const activeEdges = [...(missionPreview.edges || []), ...(workspacePreview.edges || [])].slice(0, 6);

  return `
    <div class="harness-subsection" data-fact-graph-preview="true">
      <div class="harness-filter-row">
        <p class="summary-label">Fact Graph Preview</p>
        <span class="item-meta">active ${escapeHtml(String(allPreview.summary?.activeCount || 0))} · retired ${escapeHtml(String(allPreview.summary?.retiredCount || 0))} · edges ${escapeHtml(String(allPreview.summary?.activeEdgeCount || 0))}</span>
      </div>
      <div class="harness-overview-grid">
        <div class="summary-chip"><span>mission facts</span><strong>${escapeHtml(String(missionPreview.summary?.activeCount || 0))}</strong></div>
        <div class="summary-chip"><span>workspace facts</span><strong>${escapeHtml(String(workspacePreview.summary?.activeCount || 0))}</strong></div>
        <div class="summary-chip"><span>active edges</span><strong>${escapeHtml(String(allPreview.summary?.activeEdgeCount || 0))}</strong></div>
      </div>
      ${
        activeNodes.length
          ? `<div class="harness-list">
              ${activeNodes
                .map(
                  (node) => `
                    <div class="harness-row" data-fact-graph-node-id="${escapeHtml(node.id)}">
                      <div>
                        <div class="item-title">${escapeHtml(`${getDisplayLabel(node.scope, node.scope)} fact · v${node.version || 1}`)}</div>
                        <div class="item-meta">${escapeHtml(summarizeRetrievalSnippet(node.statement, '-'))}</div>
                        <div class="item-meta mono">${escapeHtml(node.provenance?.[0]?.sourceId || node.sourceId || '-')}</div>
                      </div>
                      <div class="harness-row-meta">
                        <span class="mini-badge status-completed">active</span>
                        <span class="item-meta">${escapeHtml(formatDate(node.updatedAt))}</span>
                      </div>
                    </div>
                  `,
                )
                .join('')}
            </div>`
          : `<div class="harness-empty-inline">
              <strong>active fact graph node가 없습니다.</strong>
              <p>kind=fact 메모를 추가하면 provenance가 붙은 fact node로 동기화됩니다.</p>
            </div>`
      }
      ${
        activeEdges.length
          ? `<div class="harness-list">
              ${activeEdges
                .map(
                  (edge) => `
                    <div class="harness-row" data-fact-graph-edge-id="${escapeHtml(edge.id)}">
                      <div>
                        <div class="item-title">${escapeHtml(edge.relation || 'fact relation')} · weight ${escapeHtml(String(edge.weight || 0))}</div>
                        <div class="item-meta">${escapeHtml(edge.relationReason || 'relation reason 없음')}</div>
                        <div class="item-meta">${escapeHtml((edge.sharedTokens || []).join(', ') || 'shared token 없음')}</div>
                        <div class="item-meta">${escapeHtml(summarizeRetrievalSnippet(edge.fromStatement, '-'))} ↔ ${escapeHtml(summarizeRetrievalSnippet(edge.toStatement, '-'))}</div>
                      </div>
                      <div class="harness-row-meta">
                        <span class="mini-badge status-running">${escapeHtml(getDisplayLabel(edge.scope, edge.scope))}</span>
                      </div>
                    </div>
                  `,
                )
                .join('')}
            </div>`
          : ''
      }
    </div>
  `;
}

function getRetrievalCompareStatusClass(compare = {}) {
  const status = String(compare.status || '').trim();

  if (status === 'aligned') {
    return 'status-completed';
  }
  if (status === 'partial' || status === 'no-evidence' || status === 'empty') {
    return 'status-pending';
  }

  return 'status-failed';
}

function summarizeRetrievalCompare(compare = {}) {
  const shared = Number(compare.sharedSourceCount || 0);
  const previewOnly = Number(compare.previewOnlyCount || 0);
  const latestOnly = Number(compare.latestOnlyCount || 0);

  if (compare.status === 'aligned') {
    return `다음 preview와 최근 evidence가 같은 source ${shared}개를 공유합니다.`;
  }
  if (compare.status === 'partial') {
    return `같은 source ${shared}개를 유지했고 preview only ${previewOnly}개, evidence only ${latestOnly}개가 있습니다.`;
  }
  if (compare.status === 'shifted') {
    return '다음 preview가 최근 evidence와 source를 공유하지 않습니다.';
  }
  if (compare.status === 'empty') {
    return 'preview와 최근 evidence 모두 retrieval source가 비어 있습니다.';
  }
  if (compare.status === 'no-evidence') {
    return `다음 preview source ${Number(compare.previewSourceCount || 0)}개는 준비됐지만 비교할 최근 evidence가 없습니다.`;
  }

  return 'retrieval source 비교 정보를 계산했습니다.';
}

function renderRetrievalCompareCallout(retrieval = {}, { includeAction = false } = {}) {
  const compare = retrieval?.compare || null;
  const latestArtifact = retrieval?.latestArtifact || null;
  const activeFocus = getActiveRetrievalSourceFocus();

  if (!compare || !latestArtifact) {
    return '';
  }

  const changeChips = [
    compare.previewOnlyCount
      ? `<span class="tag tag-muted">preview only ${escapeHtml(String(compare.previewOnlyCount))}</span>`
      : '',
    compare.latestOnlyCount
      ? `<span class="tag tag-muted">evidence only ${escapeHtml(String(compare.latestOnlyCount))}</span>`
      : '',
    compare.sharedSourceCount
      ? `<span class="tag tag-muted">shared ${escapeHtml(String(compare.sharedSourceCount))}</span>`
      : '',
  ]
    .filter(Boolean)
    .join('');
  const renderRetrievalSourceChip = (entry, prefixLabel) => {
    const isActive = activeFocus?.type === entry.sourceType && activeFocus?.label === entry.sourceLabel;
    return `
      <span class="retrieval-source-chip">
        ${renderRetrievalSourceFocusButton({
          active: isActive,
          buttonText: entry.label,
          prefixLabel,
          sourceLabel: entry.sourceLabel,
          sourceType: entry.sourceType,
        })}
        ${renderRetrievalSourceCopyButton({
          attributes: 'data-retrieval-source-copy="true"',
          className: 'tag tag-ghost retrieval-source-copy-button',
          sourceLabel: entry.sourceLabel,
          sourceType: entry.sourceType,
        })}
      </span>
    `;
  };
  const detailLabels = [
    ...((compare.previewOnlySources || []).map((entry) => renderRetrievalSourceChip(entry, '다음 · '))),
    ...((compare.latestOnlySources || []).map((entry) => renderRetrievalSourceChip(entry, '이전 · '))),
  ]
    .slice(0, 4)
    .join('');
  const latestArtifactOpenLabel = getRetrievalArtifactOpenLabel(latestArtifact);
  const activeFocusClearLabel = activeFocus
    ? getRetrievalSourceActionLabel('현재 source 해제', activeFocus.type, activeFocus.label)
    : '';

  return `
    <div class="harness-callout">
      <div class="harness-filter-row">
        <strong>preview vs 최근 retrieval evidence</strong>
        <span class="status-badge ${getRetrievalCompareStatusClass(compare)}">${escapeHtml(getRetrievalCompareStatusLabel(compare))}</span>
      </div>
      <p>${escapeHtml(summarizeRetrievalCompare(compare))}</p>
      <div class="item-meta">다음 snippet ${escapeHtml(String(compare.previewSnippetCount || 0))}개 · 최근 evidence snippet ${escapeHtml(String(compare.latestSnippetCount || 0))}개</div>
      ${changeChips ? `<div class="tag-list">${changeChips}</div>` : ''}
      ${detailLabels ? `<div class="tag-list">${detailLabels}</div>` : ''}
      ${
        includeAction || activeFocus
          ? `<div class="inline-actions">
              ${
                includeAction
                  ? renderRetrievalArtifactOpenButton({
                      artifact: latestArtifact,
                      openLabel: latestArtifactOpenLabel,
                    })
                  : ''
              }
              ${
                activeFocus
                  ? `${renderRetrievalSourceCopyButton({
                      actionLabel: '현재 source 링크 복사',
                      buttonText: '현재 source 링크 복사',
                      copiedText: '현재 source 링크 복사됨',
                      sourceLabel: activeFocus.label,
                      sourceType: activeFocus.type,
                    })}
                     ${renderRetrievalSourceFocusClearButton({
                       actionLabel: activeFocusClearLabel,
                       buttonText: '현재 source 해제',
                     })}`
                  : ''
              }
            </div>`
          : ''
      }
    </div>
  `;
}

function getTimelineKindLabel(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '이벤트';
  }

  if (raw === 'session-ended') {
    return '세션 종료';
  }

  if (raw === 'session-started') {
    return '세션 시작';
  }

  if (raw.startsWith('provider-execution-')) {
    if (raw.endsWith('succeeded')) {
      return '제공자 실행 성공';
    }
    if (raw.endsWith('failed')) {
      return '제공자 실행 실패';
    }
  }

  if (raw.startsWith('provider-attention')) {
    return '제공자 주의';
  }

  if (raw.includes('approval')) {
    return '승인 이벤트';
  }

  if (raw.includes('maintenance')) {
    return '유지보수 이벤트';
  }

  return getDisplayLabel(raw, '이벤트');
}

export async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || '요청 처리에 실패했습니다.');
  }
  return payload;
}

async function fetchText(path, options = {}) {
  const response = await fetch(path, options);
  const payload = await response.text().catch(() => '');
  if (!response.ok) {
    throw new Error(payload || '텍스트 내용을 불러오지 못했습니다.');
  }
  return payload;
}

function wireQuickActions(scope = document) {
  scope.querySelectorAll('[data-ui-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.uiAction;
      const value = button.dataset.uiValue || '';

      if (action === 'open-create') {
        openComposer();
        return;
      }

      if (action === 'clear-filter') {
        elements.missionFilter.value = '';
        renderMissionList();
        return;
      }

      if (action === 'jump-step' || action === 'jump-section') {
        setActiveStep(value || 'step-setup', { urlMode: 'push' });
        return;
      }

      if (action === 'switch-tab') {
        setActiveDetailTab(value || 'artifacts', { urlMode: 'push' });
        return;
      }

      if (action === 'copy-view-link') {
        void copyCurrentViewLink();
        return;
      }

      if (action === 'reset-view') {
        void resetCurrentView();
        return;
      }

      if (action === 'toggle-output-rail') {
        toggleOutputRailCollapsed();
        return;
      }

      if (action === 'toggle-output-mission-summary') {
        toggleOutputMissionSummaryExpanded();
        return;
      }

      if (action === 'toggle-output-support') {
        toggleOutputSupportExpanded();
        return;
      }

      if (action === 'toggle-output-primary-tabs') {
        toggleOutputPrimaryTabsExpanded();
        return;
      }

      if (action === 'toggle-output-secondary-tabs') {
        toggleOutputSecondaryTabsExpanded();
        return;
      }

      if (action === 'toggle-output-tools') {
        toggleOutputToolbarToolsExpanded();
        return;
      }

      if (action === 'toggle-output-artifact-meta') {
        toggleOutputArtifactMetaExpanded();
        return;
      }

      if (action === 'clear-retrieval-source-focus') {
        clearRetrievalSourceFocus({ historyMode: 'push' });
        return;
      }

      if (action === 'copy-retrieval-source-link') {
        void copyRetrievalSourceLink({
          sourceLabel: button.dataset.uiSourceLabel || '',
          sourceType: button.dataset.uiSourceType || '',
        });
        return;
      }

      if (action === 'refresh-release-status') {
        void reloadReleaseStatus();
        return;
      }

      if (action === 'regenerate-release-surface') {
        if (!state.releaseRegenerationConfirmArmed) {
          void armReleaseRegenerationConfirm();
          return;
        }
        void refreshReleaseStatus('', { confirmCurrentSurfaceRewrite: true });
        return;
      }

      if (action === 'cancel-regenerate-release-surface') {
        state.releaseRegenerationConfirmArmed = false;
        state.releaseRefreshPreflight = null;
        renderReleaseStatus();
        setUiNotice('current surface 재생성 확인을 취소했습니다.');
        return;
      }

      if (action === 'archive-release-snapshot') {
        if (!state.releaseSnapshotConfirmArmed) {
          void armReleaseSnapshotConfirm();
          return;
        }
        void archiveReleaseSnapshot({ confirmSnapshotFreeze: true });
        return;
      }

      if (action === 'cancel-archive-release-snapshot') {
        state.releaseSnapshotConfirmArmed = false;
        state.releaseSnapshotPreflight = null;
        renderReleaseStatus();
        setUiNotice('release snapshot 고정 확인을 취소했습니다.');
        return;
      }

      if (action === 'cancel-refresh-release-status-live') {
        state.releaseLiveConfirmProvider = '';
        state.releaseLiveRefreshPreflight = null;
        renderReleaseStatus();
        setUiNotice('provider live validation 확인을 취소했습니다.');
        return;
      }

      if (action === 'focus-release-history') {
        focusReleaseHistoryEntry(value || '', { historyMode: 'push' });
        setUiNotice('최근 release action 기록으로 이동했습니다.');
        return;
      }

      if (action === 'focus-release-blocker') {
        const providerContext = String(button.dataset.uiProvider || '').trim();
        if (providerContext) {
          state.releaseFocusedProvider = providerContext;
        }
        focusReleaseBlocker(button.dataset.uiBlocker || value || '', { historyMode: 'push' });
        setUiNotice('선택한 current open blocker로 이동했습니다.');
        return;
      }

      if (action === 'focus-release-production-blocker') {
        focusReleaseProductionBlocker(button.dataset.uiIndex || value || '', { historyMode: 'push' });
        setUiNotice('선택한 production-ready blocker로 이동했습니다.');
        return;
      }

      if (action === 'filter-release-blockers') {
        const includeSharedValue = button.dataset.uiIncludeShared;
        setReleaseBlockerFilter({
          category: button.dataset.uiCategory || '',
          historyMode: 'push',
          includeShared: includeSharedValue === undefined
            ? state.releaseBlockerIncludeSharedProviderOperations
            : includeSharedValue !== 'false',
          owner: button.dataset.uiOwner || '',
          provider: button.dataset.uiProvider || '',
        });
        setUiNotice('current open blocker 목록을 선택한 triage 기준으로 좁혔습니다.');
        return;
      }

      if (action === 'toggle-release-production-blockers') {
        const nextExpanded = !state.releaseProductionBlockersExpanded;
        state.releaseProductionBlockersExpanded = nextExpanded;
        if (!nextExpanded && Number(state.releaseFocusedProductionBlockerIndex) >= 8) {
          state.releaseFocusedProductionBlockerIndex = '';
        }
        renderReleaseStatus();
        setUiNotice(
          state.releaseProductionBlockersExpanded
            ? 'production-ready blocker 전체 목록을 펼쳤습니다.'
            : 'production-ready blocker 목록을 요약 보기로 접었습니다.',
        );
        return;
      }

      if (action === 'focus-release-provider') {
        focusReleaseProvider(button.dataset.uiProvider || value || '', { historyMode: 'push' });
        setUiNotice('연결된 provider readiness 카드로 이동했습니다.');
        return;
      }

      if (action === 'focus-release-flow') {
        focusReleaseHistoryFlow({
          historyId: value || '',
          historyMode: 'push',
          outcome: button.dataset.uiOutcome || '',
          provider: button.dataset.uiProvider || '',
          scope: button.dataset.uiScope || '',
        });
        setUiNotice('같은 release flow 기준으로 history를 좁혀 봅니다.');
        return;
      }

      if (action === 'toggle-release-history') {
        toggleReleaseHistoryEntry(value || '');
        return;
      }

      if (action === 'clear-release-history-focus') {
        clearReleaseHistoryFocus({ historyMode: 'push' });
        setUiNotice('release action history 포커스를 해제했습니다.');
        return;
      }

      if (action === 'clear-release-blocker-focus') {
        clearReleaseBlockerFocus({ historyMode: 'push' });
        setUiNotice('current open blocker 포커스를 해제했습니다.');
        return;
      }

      if (action === 'clear-release-production-blocker-focus') {
        clearReleaseProductionBlockerFocus({ historyMode: 'push' });
        setUiNotice('production-ready blocker 포커스를 해제했습니다.');
        return;
      }

      if (action === 'clear-release-blocker-filter') {
        clearReleaseBlockerFilter({ historyMode: 'push' });
        setUiNotice('current open blocker triage 필터를 해제했습니다.');
        return;
      }

      if (action === 'clear-release-provider-focus') {
        clearReleaseProviderFocus({ historyMode: 'push' });
        setUiNotice('provider readiness 카드 포커스를 해제했습니다.');
        return;
      }

      if (action === 'copy-release-triage-link') {
        void copyReleaseTriageLink({
          copyAction: action,
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-history-link') {
        void copyReleaseTriageLink({
          copyAction: action,
          copyKey: button.dataset.uiCopyKey || '',
          focusedBlockerId: '',
          focusedProductionBlockerIndex: '',
          focusedProvider: '',
          focusedHistoryId: value || '',
          historyOutcome: '',
          historyProvider: '',
          historyScope: '',
          successNotice: '선택한 release 기록 링크를 복사했습니다.',
        });
        return;
      }

      if (action === 'copy-release-blocker-link') {
        void copyReleaseBlockerLink({
          blockerId: button.dataset.uiBlocker || value || '',
          copyKey: button.dataset.uiCopyKey || button.dataset.uiBlocker || value || '',
          successNotice: '선택한 release blocker 링크를 복사했습니다.',
        });
        return;
      }

      if (action === 'copy-release-production-blocker-link') {
        void copyReleaseProductionBlockerLink({
          blockerIndex: button.dataset.uiIndex || value || 0,
          copyKey: button.dataset.uiCopyKey || button.dataset.uiIndex || value || '',
          successNotice: '선택한 production-ready blocker 링크를 복사했습니다.',
        });
        return;
      }

      if (action === 'copy-release-blocker-handoff') {
        void copyReleaseBlockerHandoff({
          copyKey: button.dataset.uiCopyKey || button.dataset.uiBlocker || value || '',
          blockerId: button.dataset.uiBlocker || value || '',
        });
        return;
      }

      if (action === 'copy-release-blocker-closure-checklist') {
        void copyReleaseBlockerClosureChecklist({
          copyKey: button.dataset.uiCopyKey || button.dataset.uiBlocker || value || '',
          blockerId: button.dataset.uiBlocker || value || '',
        });
        return;
      }

      if (action === 'copy-release-blocker-package') {
        void copyReleaseBlockerPackage({
          copyKey: button.dataset.uiCopyKey || button.dataset.uiBlocker || value || '',
          blockerId: button.dataset.uiBlocker || value || '',
        });
        return;
      }

      if (action === 'copy-release-production-blocker-summary') {
        void copyReleaseProductionBlockerSummary({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-production-blocker-handoff') {
        void copyReleaseProductionBlockerHandoff({
          blockerIndex: button.dataset.uiIndex || value || 0,
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-production-blocker-commands') {
        void copyReleaseProductionBlockerCommands({
          blockerIndex: button.dataset.uiIndex || value || 0,
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-production-blocker-package') {
        void copyReleaseProductionBlockerPackage({
          blockerIndex: button.dataset.uiIndex || value || 0,
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-provider-readiness-package') {
        void copyReleaseProviderReadinessPackage({
          copyKey: button.dataset.uiCopyKey || button.dataset.uiProvider || value || '',
          provider: button.dataset.uiProvider || value || '',
        });
        return;
      }

      if (action === 'copy-release-blocker-filter-summary') {
        void copyReleaseBlockerFilterSummary({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-blocker-provider-only-summary') {
        void copyReleaseBlockerProviderOnlySummary({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-blocker-api-link') {
        void copyReleaseBlockerApiLink({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-blocker-provider-only-api-link') {
        void copyReleaseBlockerProviderOnlyApiLink({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-blocker-filter-package') {
        void copyReleaseBlockerFilterPackage({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-blocker-provider-only-package') {
        void copyReleaseBlockerProviderOnlyPackage({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-blocker-filter-closure-checklist') {
        void copyReleaseBlockerFilterClosureChecklist({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-blocker-provider-only-closure-checklist') {
        void copyReleaseBlockerProviderOnlyClosureChecklist({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-blocker-filter-closure-matrix') {
        void copyReleaseBlockerFilterClosureMatrixPackage({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-blocker-provider-only-closure-matrix') {
        void copyReleaseBlockerProviderOnlyClosureMatrixPackage({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-intake-summary') {
        void copyReleaseTargetEvidenceIntakeSummary({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-provider-only-intake-summary') {
        void copyReleaseTargetEvidenceProviderOnlyIntakeSummary({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-capture-template') {
        void copyReleaseTargetEvidenceCaptureTemplate({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-provider-only-capture-template') {
        void copyReleaseTargetEvidenceProviderOnlyCaptureTemplate({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-required-commands') {
        void copyReleaseTargetEvidenceRequiredCommands({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-provider-only-required-commands') {
        void copyReleaseTargetEvidenceProviderOnlyRequiredCommands({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-production-gap') {
        void copyReleaseTargetEvidenceProductionGap({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-provider-only-production-gap') {
        void copyReleaseTargetEvidenceProviderOnlyProductionGap({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-exception-register') {
        void copyReleaseTargetEvidenceExceptionRegister({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-provider-only-exception-register') {
        void copyReleaseTargetEvidenceProviderOnlyExceptionRegister({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-risk-decision-register') {
        void copyReleaseTargetEvidenceRiskDecisionRegister({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-provider-only-risk-decision-register') {
        void copyReleaseTargetEvidenceProviderOnlyRiskDecisionRegister({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-provider-references') {
        void copyReleaseTargetEvidenceProviderEvidenceReferences({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-provider-only-provider-references') {
        void copyReleaseTargetEvidenceProviderOnlyProviderEvidenceReferences({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-residual-blockers') {
        void copyReleaseTargetEvidenceResidualBlockers({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-provider-only-residual-blockers') {
        void copyReleaseTargetEvidenceProviderOnlyResidualBlockers({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-closure-rules') {
        void copyReleaseTargetEvidenceClosureRules({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-provider-only-closure-rules') {
        void copyReleaseTargetEvidenceProviderOnlyClosureRules({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-submission-manifest') {
        void copyReleaseTargetEvidenceSubmissionManifest({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-provider-only-submission-manifest') {
        void copyReleaseTargetEvidenceProviderOnlySubmissionManifest({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-sanitized-register') {
        void copyReleaseTargetEvidenceSanitizedRegister({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-provider-only-sanitized-register') {
        void copyReleaseTargetEvidenceProviderOnlySanitizedRegister({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-boundary-map') {
        void copyReleaseTargetEvidenceBoundaryMap({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-provider-only-boundary-map') {
        void copyReleaseTargetEvidenceProviderOnlyBoundaryMap({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-command-rerun-log') {
        void copyReleaseTargetEvidenceCommandRerunLog({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-provider-only-command-rerun-log') {
        void copyReleaseTargetEvidenceProviderOnlyCommandRerunLog({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-decision-record') {
        void copyReleaseTargetEvidenceDecisionRecord({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-provider-only-decision-record') {
        void copyReleaseTargetEvidenceProviderOnlyDecisionRecord({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-blocker-disposition') {
        void copyReleaseTargetEvidenceBlockerDispositionRegister({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-provider-only-blocker-disposition') {
        void copyReleaseTargetEvidenceProviderOnlyBlockerDispositionRegister({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-release-refresh') {
        void copyReleaseTargetEvidenceReleaseRefreshEvidence({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-provider-only-release-refresh') {
        void copyReleaseTargetEvidenceProviderOnlyReleaseRefreshEvidence({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-intake-packet') {
        void copyReleaseTargetEvidenceIntakePacket({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-target-evidence-provider-only-intake-packet') {
        void copyReleaseTargetEvidenceProviderOnlyIntakePacket({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-blocker-filter-handoff') {
        void copyReleaseBlockerFilterHandoff({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-blocker-provider-only-handoff') {
        void copyReleaseBlockerProviderOnlyHandoff({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-blocker-filter-commands') {
        void copyReleaseBlockerFilterCommands({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-blocker-provider-only-commands') {
        void copyReleaseBlockerProviderOnlyCommands({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-blocker-filter-evidence') {
        void copyReleaseBlockerFilterEvidence({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-blocker-provider-only-evidence') {
        void copyReleaseBlockerProviderOnlyEvidence({
          copyKey: button.dataset.uiCopyKey || '',
        });
        return;
      }

      if (action === 'copy-release-evidence-doc-link') {
        void copyReleaseEvidenceDocLink({
          copyAction: action,
          copyKey: button.dataset.uiCopyKey || button.dataset.uiHref || value || '',
          href: button.dataset.uiHref || value || '',
          label: button.dataset.uiLabel || '',
        });
        return;
      }

      if (action === 'copy-release-command') {
        void copyReleaseCommand({
          command: value || '',
          label: button.dataset.uiLabel || 'release command',
        });
        return;
      }

      if (action === 'toggle-release-handoff-preview') {
        const targetArtifactId = String(value || '').trim();
        if (!targetArtifactId) {
          return;
        }
        if (state.releaseHandoffPreviewId === targetArtifactId) {
          if (state.releaseHandoffPreviewStatus === 'ready') {
            clearReleaseHandoffPreview();
            renderReleaseStatus();
            writeUiStateToUrl();
            return;
          }
          if (state.releaseHandoffPreviewStatus === 'loading') {
            return;
          }
        }
        void loadReleaseHandoffPreview(targetArtifactId);
        return;
      }

      if (action === 'clear-release-handoff-preview') {
        clearReleaseHandoffPreview();
        renderReleaseStatus();
        writeUiStateToUrl();
        return;
      }

      if (action === 'copy-release-handoff-preview-link') {
        void copyReleaseHandoffPreviewLink({
          artifactId: value || '',
          successNotice: button.dataset.uiSuccessNotice || '',
        });
        return;
      }

      if (action === 'copy-release-handoff-open-link') {
        void copyReleaseHandoffOpenLink({
          artifactId: value || '',
          successNotice: button.dataset.uiSuccessNotice || '',
        });
        return;
      }

      if (action === 'copy-release-handoff-structured-summary') {
        void copyReleaseHandoffStructuredSummary({
          artifactId: value || '',
          successNotice: button.dataset.uiSuccessNotice || '',
        });
        return;
      }

      if (action === 'copy-release-handoff-structured-summary-detail') {
        void copyReleaseHandoffStructuredSummaryDetail({
          artifactId: value || '',
          detailKey: button.dataset.uiDetailKey || '',
          successNotice: button.dataset.uiSuccessNotice || '',
        });
        return;
      }

      if (action === 'copy-release-handoff-structured-summary-stable-line') {
        void copyReleaseHandoffStructuredSummaryStableLine({
          artifactId: value || '',
          detailKey: button.dataset.uiDetailKey || '',
          lineIndex: button.dataset.uiLineIndex || '',
          successNotice: button.dataset.uiSuccessNotice || '',
        });
        return;
      }

      if (action === 'copy-release-flow-link') {
        void copyReleaseTriageLink({
          copyAction: action,
          copyKey: button.dataset.uiCopyKey || '',
          focusedBlockerId: '',
          focusedProductionBlockerIndex: '',
          focusedProvider: '',
          focusedHistoryId: value || '',
          historyOutcome: button.dataset.uiOutcome || '',
          historyProvider: button.dataset.uiProvider || '',
          historyScope: button.dataset.uiScope || '',
          successNotice: '선택한 release flow 링크를 복사했습니다.',
        });
        return;
      }

      if (action === 'copy-release-provider-link') {
        void copyReleaseTriageLink({
          copyAction: action,
          copyKey: button.dataset.uiCopyKey || '',
          focusedBlockerId: '',
          focusedProductionBlockerIndex: '',
          focusedProvider: button.dataset.uiProvider || value || '',
          focusedHistoryId: '',
          historyOutcome: '',
          historyProvider: '',
          historyScope: '',
          successNotice: '선택한 provider spotlight 링크를 복사했습니다.',
        });
        return;
      }

      if (action === 'filter-release-history-scope') {
        setReleaseHistoryFilter({
          historyMode: 'push',
          outcome: state.releaseHistoryFilterOutcome,
          scope: button.dataset.uiScope || '',
          provider: state.releaseHistoryFilterProvider,
        });
        setUiNotice('같은 scope 기준으로 release action history를 좁혀 봅니다.');
        return;
      }

      if (action === 'filter-release-history-provider') {
        setReleaseHistoryFilter({
          historyMode: 'push',
          outcome: state.releaseHistoryFilterOutcome,
          scope: state.releaseHistoryFilterScope,
          provider: button.dataset.uiProvider || '',
        });
        setUiNotice('같은 provider 기준으로 release action history를 좁혀 봅니다.');
        return;
      }

      if (action === 'filter-release-history-attention') {
        setReleaseHistoryFilter({
          historyMode: 'push',
          outcome: button.dataset.uiOutcome || 'attention',
          scope: state.releaseHistoryFilterScope,
          provider: state.releaseHistoryFilterProvider,
        });
        setUiNotice('주의 상태만 남기도록 release action history를 좁혀 봅니다.');
        return;
      }

      if (action === 'clear-release-history-filter') {
        clearReleaseHistoryFilter({ historyMode: 'push' });
        setUiNotice('release action history 필터를 해제했습니다.');
        return;
      }

      if (action === 'execution-preflight') {
        void handleExecutionPreflight(value === 'request-approval');
        return;
      }

      if (action === 'execution-start') {
        void handleExecutionStart();
        return;
      }

      if (action === 'execution-stop') {
        void handleExecutionStop();
        return;
      }

      if (action === 'execution-rollback-preview') {
        void handleExecutionRollback({ dryRun: true });
        return;
      }

      if (action === 'execution-rollback') {
        void handleExecutionRollback();
      }
    });
  });
}

async function loadReleaseHandoffPreview(artifactId, { syncUrl = true } = {}) {
  const targetArtifactId = String(artifactId || '').trim();
  if (!targetArtifactId) {
    return;
  }

  const artifact = state.releaseStatus?.handoffArtifacts?.find((item) => String(item.id || '').trim() === targetArtifactId) || null;
  if (!isReleaseHandoffPreviewable(artifact)) {
    return;
  }

  const requestKey = state.releaseHandoffPreviewRequestKey + 1;
  state.releaseHandoffPreviewRequestKey = requestKey;
  state.releaseHandoffPreviewId = targetArtifactId;
  state.releaseHandoffPreviewStatus = 'loading';
  state.releaseHandoffPreviewContent = '';
  state.releaseHandoffPreviewError = '';
  state.releaseHandoffPreviewLineCount = 0;
  state.releaseHandoffPreviewTruncated = false;
  renderReleaseStatus();
  if (syncUrl) {
    writeUiStateToUrl();
  }

  try {
    const payload = await fetchText(artifact.href);
    if (state.releaseHandoffPreviewRequestKey !== requestKey) {
      return;
    }
    const preview = buildReleaseHandoffPreviewContent(payload);
    state.releaseHandoffPreviewStatus = 'ready';
    state.releaseHandoffPreviewContent = preview.content;
    state.releaseHandoffPreviewError = '';
    state.releaseHandoffPreviewLineCount = preview.lineCount;
    state.releaseHandoffPreviewTruncated = preview.truncated;
  } catch (error) {
    if (state.releaseHandoffPreviewRequestKey !== requestKey) {
      return;
    }
    state.releaseHandoffPreviewStatus = 'error';
    state.releaseHandoffPreviewContent = '';
    state.releaseHandoffPreviewError = error.message || 'artifact preview를 불러오지 못했습니다.';
    state.releaseHandoffPreviewLineCount = 0;
    state.releaseHandoffPreviewTruncated = false;
  }

  renderReleaseStatus();
}

async function openRetrievalArtifact(artifactId, sessionId, { historyMode = 'push' } = {}) {
  const targetArtifactId = String(artifactId || '').trim();
  const targetSessionId = String(sessionId || '').trim();

  if (!state.selectedMissionId || !targetArtifactId || !targetSessionId) {
    return;
  }

  if (state.selectedSessionId !== targetSessionId) {
    await selectSession(targetSessionId, {
      focusRuns: false,
      preferredArtifactId: targetArtifactId,
      syncUrl: false,
    });
  } else {
    await loadArtifact(targetArtifactId, { activateTab: false, syncUrl: false });
  }

  setActiveStep('step-output', { syncDetailTab: false, syncUrl: false });
  setActiveDetailTab('artifacts', { syncUrl: false });
  writeUiStateToUrl({ historyMode });
}

function wireRetrievalArtifactButtons(scope = document) {
  scope.querySelectorAll('[data-retrieval-artifact-open]').forEach((button) => {
    button.addEventListener('click', async () => {
      const artifactId = String(button.dataset.retrievalArtifactOpen || '').trim();
      const sessionId = String(button.dataset.retrievalSessionId || '').trim();
      await openRetrievalArtifact(artifactId, sessionId, { historyMode: 'push' });
    });
  });
}

export function setActiveStep(stepId, { syncDetailTab = true, syncUrl = true, urlMode = 'replace' } = {}) {
  state.activeStep = stepId;
  syncStepViewMode();
  elements.stepButtons.forEach((button) => {
    const active = button.dataset.stepTarget === stepId;
    button.classList.toggle('is-active', active);
    if (active) {
      button.setAttribute('aria-current', 'step');
    } else {
      button.removeAttribute('aria-current');
    }
  });
  elements.stepPanels.forEach((panel) => {
    const active = panel.id === stepId;
    panel.classList.toggle('is-active', active);
    panel.setAttribute('aria-hidden', active ? 'false' : 'true');
  });

  if (syncDetailTab) {
    setActiveDetailTab(STEP_TO_DETAIL_TAB[stepId] || 'artifacts', { syncUrl: false });
  }

  renderSelectionBridge();
  if (syncUrl) {
    writeUiStateToUrl({ historyMode: urlMode });
  }
}

function syncStepViewMode() {
  const outputFocus = state.activeStep === 'step-output';
  elements.appShell?.classList.toggle('is-output-focus', outputFocus);
  elements.appShell?.classList.toggle('is-output-rail-collapsed', outputFocus && state.outputRailCollapsed);
  elements.mainStage?.classList.toggle('is-output-focus', outputFocus);
  elements.workspaceShell?.classList.toggle('is-output-focus', outputFocus);
  elements.workspaceShell?.classList.toggle('is-output-support-collapsed', outputFocus && !state.outputSupportExpanded);
  renderDetailToolbarActions();
}

function toggleOutputRailCollapsed(forceValue = null) {
  if (typeof forceValue === 'boolean') {
    state.outputRailCollapsed = forceValue;
  } else {
    state.outputRailCollapsed = !state.outputRailCollapsed;
  }
  syncStepViewMode();
  renderFlowState();
}

function toggleOutputMissionSummaryExpanded(forceValue = null) {
  if (typeof forceValue === 'boolean') {
    state.outputMissionSummaryExpanded = forceValue;
  } else {
    state.outputMissionSummaryExpanded = !state.outputMissionSummaryExpanded;
  }
  renderMissionSummary();
  renderDetailToolbarActions();
}

function toggleOutputArtifactMetaExpanded(forceValue = null) {
  if (typeof forceValue === 'boolean') {
    state.outputArtifactMetaExpanded = forceValue;
  } else {
    state.outputArtifactMetaExpanded = !state.outputArtifactMetaExpanded;
  }
  if (state.selectedArtifactId && state.artifactsById.has(state.selectedArtifactId)) {
    renderArtifact(state.artifactsById.get(state.selectedArtifactId));
  }
}

function toggleOutputSupportExpanded(forceValue = null) {
  if (typeof forceValue === 'boolean') {
    state.outputSupportExpanded = forceValue;
  } else {
    state.outputSupportExpanded = !state.outputSupportExpanded;
  }
  syncStepViewMode();
  renderOutputStageSummary();
  renderOutputCloseout();
}

function toggleOutputPrimaryTabsExpanded(forceValue = null) {
  if (typeof forceValue === 'boolean') {
    state.outputPrimaryTabsExpanded = forceValue;
  } else {
    state.outputPrimaryTabsExpanded = !state.outputPrimaryTabsExpanded;
  }
  renderDetailToolbarActions();
}

function toggleOutputSecondaryTabsExpanded(forceValue = null) {
  if (typeof forceValue === 'boolean') {
    state.outputSecondaryTabsExpanded = forceValue;
  } else {
    state.outputSecondaryTabsExpanded = !state.outputSecondaryTabsExpanded;
  }
  renderDetailTabLabels();
  renderDetailToolbarActions();
}

function toggleOutputToolbarToolsExpanded(forceValue = null) {
  if (typeof forceValue === 'boolean') {
    state.outputToolbarToolsExpanded = forceValue;
  } else {
    state.outputToolbarToolsExpanded = !state.outputToolbarToolsExpanded;
  }
  renderDetailToolbarActions();
}

function getDetailTabMeta() {
  const artifactsCount = state.currentSessionPayload?.artifacts?.length || 0;
  const runsCount = state.missionDetail?.sessions?.length || 0;
  const reviewsCount =
    (state.currentSessionPayload?.approvals?.length || 0) + Number(state.missionActions?.summary?.pendingActionCount || 0);
  const harnessCount = state.missionDetail?.harness?.recommendations?.length || 0;
  const counts = {
    artifacts: artifactsCount,
    runs: runsCount,
    reviews: reviewsCount,
    config: 0,
    harness: harnessCount,
    release: state.releaseStatus?.summary?.checklistOpen || 0,
  };
  const outputFocus = state.activeStep === 'step-output';
  const primaryTabs = new Set(['artifacts', 'runs', 'reviews']);
  const condensedOutputLabels = {
    config: '입력',
    harness: '하네스',
    release: 'v1',
  };

  const tabs = elements.detailTabButtons.map((button) => {
    if (!button.dataset.baseLabel) {
      button.dataset.baseLabel = button.textContent?.trim() || '';
    }
    const tabId = button.dataset.detailTab || '';
    const baseLabel =
      outputFocus && condensedOutputLabels[tabId]
        ? condensedOutputLabels[tabId]
        : button.dataset.baseLabel || '';
    const count = counts[tabId] || 0;
    return {
      baseLabel,
      button,
      count,
      id: tabId,
      isActive: tabId === state.activeDetailTab,
      isPrimary: outputFocus && primaryTabs.has(tabId),
      isSecondary: outputFocus && !primaryTabs.has(tabId),
      label: count > 0 ? `${baseLabel} ${count}` : baseLabel,
      outputFocus,
      shouldCollapse: outputFocus && !primaryTabs.has(tabId) && tabId !== state.activeDetailTab,
    };
  });

  return {
    outputFocus,
    tabs,
  };
}

export function setActiveDetailTab(tabId, { syncUrl = true, urlMode = 'replace' } = {}) {
  state.activeDetailTab = tabId;
  if (state.activeStep === 'step-output' && ['artifacts', 'runs', 'reviews'].includes(tabId)) {
    state.outputPrimaryTabsExpanded = false;
  }
  if (state.activeStep === 'step-output' && ['config', 'harness', 'release'].includes(tabId)) {
    state.outputSecondaryTabsExpanded = true;
  }
  elements.detailTabButtons.forEach((button) => {
    const active = button.dataset.detailTab === tabId;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  elements.detailPanels.forEach((panel) => {
    const active = panel.id === `detail-${tabId}`;
    panel.classList.toggle('is-active', active);
    panel.setAttribute('aria-hidden', active ? 'false' : 'true');
  });
  renderDetailTabLabels();
  renderDetailContextbar();
  renderDetailToolbarActions();
  if (syncUrl) {
    writeUiStateToUrl({ historyMode: urlMode });
  }
}

function wireOutputToolbarTabButtons() {
  elements.detailToolbarActions.querySelectorAll('[data-output-primary-tab]').forEach((button) => {
    button.addEventListener('click', () => setActiveDetailTab(button.dataset.outputPrimaryTab, { urlMode: 'push' }));
  });
  elements.detailToolbarActions.querySelectorAll('[data-output-secondary-tab]').forEach((button) => {
    button.addEventListener('click', () => setActiveDetailTab(button.dataset.outputSecondaryTab, { urlMode: 'push' }));
  });
}

function renderDetailToolbarActions() {
  if (!elements.detailToolbarActions) {
    return;
  }

  if (state.activeStep !== 'step-output') {
    elements.detailToolbarActions.innerHTML = '';
    elements.detailToolbarActions.classList.remove('is-visible');
    return;
  }

  const detailTabMeta = getDetailTabMeta();
  const primaryTabs = detailTabMeta.tabs.filter((tab) => tab.isPrimary);
  const secondaryTabs = detailTabMeta.tabs.filter((tab) => tab.isSecondary);
  const supportCollapsed = !state.outputSupportExpanded;
  const outputToolbarTargetLabel = state.missionDetail?.mission?.title || state.selectedMissionId || '선택된 미션';
  const outputSupportToggleLabel = state.outputSupportExpanded
    ? `지원 패널 접기: ${outputToolbarTargetLabel}`
    : `지원 패널 펼치기: ${outputToolbarTargetLabel}`;
  const outputPrimaryTabsToggleLabel = state.outputPrimaryTabsExpanded
    ? `결과 주 탭 목록 닫기: ${outputToolbarTargetLabel}`
    : `결과 주 탭 목록 열기: ${outputToolbarTargetLabel}`;
  const outputSecondaryTabsToggleLabel = state.outputSecondaryTabsExpanded
    ? `결과 보조 탭 목록 숨기기: ${outputToolbarTargetLabel}`
    : `결과 보조 탭 목록 보기: ${outputToolbarTargetLabel}`;
  const outputToolbarToolsToggleLabel = state.outputToolbarToolsExpanded
    ? `결과 도구 목록 닫기: ${outputToolbarTargetLabel}`
    : `결과 도구 목록 열기: ${outputToolbarTargetLabel}`;
  const outputRailToggleLabel = state.outputRailCollapsed
    ? `결과 사이드바 펼치기: ${outputToolbarTargetLabel}`
    : `결과 사이드바 접기: ${outputToolbarTargetLabel}`;
  const outputMissionSummaryToggleLabel = state.outputMissionSummaryExpanded
    ? `결과 미션 요약 접기: ${outputToolbarTargetLabel}`
    : `결과 미션 요약 펼치기: ${outputToolbarTargetLabel}`;
  const visiblePrimaryTabs =
    supportCollapsed && !state.outputPrimaryTabsExpanded ? primaryTabs.filter((tab) => tab.isActive) : primaryTabs;
  elements.detailToolbarActions.classList.add('is-visible');
  elements.detailToolbarActions.classList.toggle('is-compact', supportCollapsed);
  elements.detailToolbarActions.innerHTML = `
    ${
      supportCollapsed
        ? ``
        : `
          <div class="detail-toolbar-pill">
            <span>결과 보기 모드</span>
            <strong>${escapeHtml(state.outputRailCollapsed ? '본문 집중' : '탐색 함께 보기')}</strong>
          </div>
          <div class="detail-toolbar-pill">
            <span>미션 요약</span>
            <strong>${escapeHtml(state.outputMissionSummaryExpanded ? '펼침' : '접힘')}</strong>
          </div>
          <div class="detail-toolbar-pill">
            <span>지원 패널</span>
            <strong>${escapeHtml(state.outputSupportExpanded ? '펼침' : '접힘')}</strong>
          </div>
        `
    }
    <div class="detail-primary-nav${supportCollapsed && state.outputPrimaryTabsExpanded ? ' is-expanded' : ''}" aria-label="주 탭">
      ${visiblePrimaryTabs
        .map(
          (tab) => renderOutputTabButton({ outputToolbarTargetLabel, tab, tabType: 'primary' }),
        )
        .join('')}
    </div>
    <div class="detail-toolbar-actions-row">
      ${
        supportCollapsed
          ? `
            ${renderOutputToolbarToggleButton({
              action: 'toggle-output-support',
              actionLabel: outputSupportToggleLabel,
              buttonText: '패널',
              className: 'primary-button',
              expanded: state.outputSupportExpanded,
            })}
            ${renderOutputToolbarToggleButton({
              action: 'toggle-output-primary-tabs',
              actionLabel: outputPrimaryTabsToggleLabel,
              buttonText: state.outputPrimaryTabsExpanded ? '탭 닫기' : '탭',
              expanded: state.outputPrimaryTabsExpanded,
            })}
            ${renderOutputToolbarToggleButton({
              action: 'toggle-output-tools',
              actionLabel: outputToolbarToolsToggleLabel,
              buttonText: state.outputToolbarToolsExpanded ? '도구 닫기' : '도구',
              expanded: state.outputToolbarToolsExpanded,
            })}
          `
          : `
            ${renderOutputToolbarToggleButton({
              action: 'toggle-output-rail',
              actionLabel: outputRailToggleLabel,
              buttonText: state.outputRailCollapsed ? '사이드바 펼치기' : '사이드바 접기',
              expanded: !state.outputRailCollapsed,
            })}
            ${renderOutputToolbarToggleButton({
              action: 'toggle-output-mission-summary',
              actionLabel: outputMissionSummaryToggleLabel,
              buttonText: state.outputMissionSummaryExpanded ? '요약 접기' : '요약 펼치기',
              expanded: state.outputMissionSummaryExpanded,
            })}
            ${renderOutputToolbarToggleButton({
              action: 'toggle-output-secondary-tabs',
              actionLabel: outputSecondaryTabsToggleLabel,
              buttonText: state.outputSecondaryTabsExpanded ? '보조 탭 숨기기' : '보조 탭 보기',
              expanded: state.outputSecondaryTabsExpanded,
            })}
            ${renderOutputToolbarToggleButton({
              action: 'toggle-output-support',
              actionLabel: outputSupportToggleLabel,
              buttonText: '지원 패널 접기',
              expanded: state.outputSupportExpanded,
            })}
          `
      }
    </div>
    ${
      supportCollapsed && state.outputToolbarToolsExpanded
        ? `
          <div class="detail-toolbar-aux">
            ${renderOutputToolbarToggleButton({
              action: 'toggle-output-secondary-tabs',
              actionLabel: outputSecondaryTabsToggleLabel,
              buttonText: '보조 탭',
              expanded: state.outputSecondaryTabsExpanded,
            })}
            ${renderOutputToolbarToggleButton({
              action: 'toggle-output-rail',
              actionLabel: outputRailToggleLabel,
              buttonText: '사이드바',
              expanded: !state.outputRailCollapsed,
            })}
          </div>
        `
        : ''
    }
    ${
      state.outputSecondaryTabsExpanded && secondaryTabs.length
        ? `
          <div class="detail-secondary-nav" aria-label="보조 탭">
            ${secondaryTabs
              .map(
                (tab) => renderOutputTabButton({ outputToolbarTargetLabel, tab, tabType: 'secondary' }),
              )
              .join('')}
          </div>
        `
        : ''
    }
  `;
  wireQuickActions(elements.detailToolbarActions);
  wireOutputToolbarTabButtons();
}

export function openComposer() {
  setActiveStep('step-setup', { urlMode: 'push' });
  elements.missionForm.elements.title?.focus();
}

async function copyCurrentViewLink() {
  const currentUrl = `${window.location.origin}${buildUiStateUrl()}`;
  const result = await copyUiLink(currentUrl, {
    promptMessage: '현재 작업면 링크를 복사하세요.',
    shownNotice: '현재 작업면 링크를 표시했습니다.',
    successNotice: '현재 작업면 링크를 복사했습니다.',
  });
  if (result.method !== 'unavailable') {
    markCopiedCurrentViewLink();
  }
}

async function copyUiLink(url, {
  promptMessage = '링크를 복사하세요.',
  shownNotice = '링크를 표시했습니다.',
  successNotice = '링크를 복사했습니다.',
  unavailableNotice = '브라우저가 링크 복사를 지원하지 않습니다.',
} = {}) {
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error('clipboard-unavailable');
    }
    await navigator.clipboard.writeText(url);
    setUiNotice(successNotice);
    return { method: 'clipboard' };
  } catch {
    const prompted = showCopyPromptFallback(promptMessage, url);
    setUiNotice(prompted ? shownNotice : unavailableNotice);
    return { method: prompted ? 'prompt' : 'unavailable' };
  }
}

function showCopyPromptFallback(promptMessage, value) {
  if (typeof window.prompt !== 'function') {
    return false;
  }

  try {
    window.prompt(promptMessage, value);
    return true;
  } catch {
    return false;
  }
}

export async function copyPlainTextValue(value, {
  promptMessage = '값을 복사하세요.',
  shownNotice = '값을 표시했습니다.',
  successNotice = '값을 복사했습니다.',
  unavailableNotice = '브라우저가 텍스트 복사를 지원하지 않습니다.',
} = {}) {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) {
    setUiNotice('복사할 값이 없습니다.');
    return;
  }
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error('clipboard-unavailable');
    }
    await navigator.clipboard.writeText(normalizedValue);
    setUiNotice(successNotice);
    return { method: 'clipboard' };
  } catch {
    const prompted = showCopyPromptFallback(promptMessage, normalizedValue);
    setUiNotice(prompted ? shownNotice : unavailableNotice);
    return { method: prompted ? 'prompt' : 'unavailable' };
  }
}

async function copyReleaseCommand({
  command = '',
  label = 'release command',
} = {}) {
  const normalizedLabel = String(label || 'release command').trim() || 'release command';
  const result = await copyPlainTextValue(command, {
    promptMessage: `${normalizedLabel}를 복사하세요.`,
    shownNotice: `${normalizedLabel}를 표시했습니다.`,
    successNotice: `${normalizedLabel}를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseCommand(command, normalizedLabel);
  }
}

async function copyProviderFallbackEventAuditPackage() {
  const packageText = buildProviderFallbackEventAuditPackageText();
  if (!packageText) {
    setUiNotice('복사할 provider fallback event audit package가 없습니다.');
    return;
  }

  await copyPlainTextValue(packageText, {
    promptMessage: 'provider fallback event audit package를 복사하세요.',
    shownNotice: 'provider fallback event audit package를 표시했습니다.',
    successNotice: 'provider fallback event audit package를 복사했습니다.',
  });
}

async function resetCurrentView() {
  const visibleMission = filteredMissions();
  const targetMissionId =
    state.selectedMissionId && visibleMission.some(({ mission }) => mission.id === state.selectedMissionId)
      ? state.selectedMissionId
      : visibleMission[0]?.mission?.id || null;

  if (targetMissionId) {
    await selectMission(targetMissionId, { urlMode: 'push' });
    setUiNotice('현재 보기를 기본 단계 기준으로 정리했습니다.');
    return;
  }

  clearMissionSelection({ urlMode: 'push' });
  setUiNotice('현재 보기를 초기 상태로 정리했습니다.');
}

async function copyReleaseTriageLink({
  blockerCategory = state.releaseBlockerCategoryFilter,
  blockerOwner = state.releaseBlockerOwnerFilter,
  blockerProvider = state.releaseBlockerProviderFilter,
  copyAction = 'copy-release-triage-link',
  copyKey = '',
  focusedBlockerId = state.releaseFocusedBlockerId,
  focusedProductionBlockerIndex = state.releaseFocusedProductionBlockerIndex,
  focusedProvider = state.releaseFocusedProvider,
  focusedHistoryId = state.releaseFocusedHistoryId,
  historyOutcome = state.releaseHistoryFilterOutcome,
  historyProvider = state.releaseHistoryFilterProvider,
  historyScope = state.releaseHistoryFilterScope,
  successNotice = '현재 release triage 링크를 복사했습니다.',
} = {}) {
  const triageUrl = `${window.location.origin}${buildUiStateUrl({
    detailTab: 'release',
    releaseBlockerCategoryFilter: blockerCategory,
    releaseBlockerOwnerFilter: blockerOwner,
    releaseBlockerProviderFilter: blockerProvider,
    releaseFocusedBlockerId: focusedBlockerId,
    releaseFocusedProductionBlockerIndex: focusedProductionBlockerIndex,
    releaseFocusedProvider: focusedProvider,
    releaseFocusedHistoryId: focusedHistoryId,
    releaseHistoryOutcome: historyOutcome,
    releaseHistoryProvider: historyProvider,
    releaseHistoryScope: historyScope,
  })}`;
  const result = await copyUiLink(triageUrl, {
    promptMessage: '현재 release triage 링크를 복사하세요.',
    shownNotice: '현재 release triage 링크를 표시했습니다.',
    successNotice,
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseLink(copyAction, copyKey || triageUrl);
  }
}

async function copyReleaseBlockerLink({
  blockerId = state.releaseFocusedBlockerId,
  copyKey = '',
  successNotice = '',
} = {}) {
  const normalizedBlockerId = normalizeUiParam(blockerId);
  if (!getReleaseCurrentOpenBlockerAction(normalizedBlockerId)) {
    setUiNotice('복사할 release blocker 링크가 없습니다.');
    return;
  }

  await copyReleaseTriageLink({
    blockerCategory: '',
    blockerOwner: '',
    copyKey,
    focusedBlockerId: normalizedBlockerId,
    focusedProductionBlockerIndex: '',
    focusedProvider: '',
    focusedHistoryId: '',
    historyOutcome: '',
    historyProvider: '',
    historyScope: '',
    successNotice: successNotice || '선택한 release blocker 링크를 복사했습니다.',
  });
}

async function copyReleaseProductionBlockerLink({
  blockerIndex = state.releaseFocusedProductionBlockerIndex,
  copyKey = '',
  successNotice = '',
} = {}) {
  const normalizedIndex = getValidReleaseProductionBlockerIndex(blockerIndex);
  if (normalizedIndex === '') {
    setUiNotice('복사할 production-ready blocker 링크가 없습니다.');
    return;
  }

  await copyReleaseTriageLink({
    blockerCategory: '',
    blockerOwner: '',
    copyKey,
    focusedBlockerId: '',
    focusedProductionBlockerIndex: normalizedIndex,
    focusedProvider: '',
    focusedHistoryId: '',
    historyOutcome: '',
    historyProvider: '',
    historyScope: '',
    successNotice: successNotice || '선택한 production-ready blocker 링크를 복사했습니다.',
  });
}

async function copyReleaseBlockerHandoff({
  blockerId = state.releaseFocusedBlockerId,
  copyKey = '',
} = {}) {
  const normalizedBlockerId = normalizeUiParam(blockerId);
  const normalizedCopyKey = normalizeUiParam(copyKey || normalizedBlockerId);
  const blockerAction = getReleaseCurrentOpenBlockerAction(normalizedBlockerId);
  const handoffText = buildReleaseBlockerHandoffText(blockerAction);
  if (!handoffText) {
    setUiNotice('복사할 release blocker handoff가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(handoffText, {
    promptMessage: 'release blocker handoff를 복사하세요.',
    shownNotice: 'release blocker handoff를 표시했습니다.',
    successNotice: 'release blocker handoff를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerHandoff(normalizedCopyKey);
  }
}

async function copyReleaseBlockerClosureChecklist({
  blockerId = state.releaseFocusedBlockerId,
  copyKey = '',
} = {}) {
  const normalizedBlockerId = normalizeUiParam(blockerId);
  const normalizedCopyKey = normalizeUiParam(copyKey || normalizedBlockerId);
  const blockerAction = getReleaseCurrentOpenBlockerAction(normalizedBlockerId);
  const checklistText = buildReleaseBlockerClosureChecklistText(blockerAction);
  if (!checklistText) {
    setUiNotice('복사할 release blocker closure checklist가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(checklistText, {
    promptMessage: 'release blocker closure checklist를 복사하세요.',
    shownNotice: 'release blocker closure checklist를 표시했습니다.',
    successNotice: 'release blocker closure checklist를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerClosureChecklist(normalizedCopyKey);
  }
}

async function copyReleaseBlockerPackage({
  blockerId = state.releaseFocusedBlockerId,
  copyKey = '',
} = {}) {
  const normalizedBlockerId = normalizeUiParam(blockerId);
  const normalizedCopyKey = normalizeUiParam(copyKey || normalizedBlockerId);
  const blockerAction = getReleaseCurrentOpenBlockerAction(normalizedBlockerId);
  const packageText = buildReleaseBlockerPackageText(blockerAction);
  if (!packageText) {
    setUiNotice('복사할 release blocker package가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(packageText, {
    promptMessage: 'release blocker package를 복사하세요.',
    shownNotice: 'release blocker package를 표시했습니다.',
    successNotice: 'release blocker package를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerPackage(normalizedCopyKey);
  }
}

async function copyReleaseProductionBlockerSummary({
  copyKey = '',
} = {}) {
  const summaryText = buildReleaseProductionBlockerSummaryText();
  if (!summaryText) {
    setUiNotice('복사할 production-ready blocker summary가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(summaryText, {
    promptMessage: 'production-ready blocker summary를 복사하세요.',
    shownNotice: 'production-ready blocker summary를 표시했습니다.',
    successNotice: 'production-ready blocker summary를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseProductionBlockerSummary(copyKey);
  }
}

async function copyReleaseProductionBlockerHandoff({
  blockerIndex = 0,
  copyKey = '',
} = {}) {
  const handoffText = buildReleaseProductionBlockerHandoffText({ blockerIndex });
  if (!handoffText) {
    setUiNotice('복사할 production-ready blocker handoff가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(handoffText, {
    promptMessage: 'production-ready blocker handoff를 복사하세요.',
    shownNotice: 'production-ready blocker handoff를 표시했습니다.',
    successNotice: 'production-ready blocker handoff를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseProductionBlockerDetail({
      action: 'copy-release-production-blocker-handoff',
      blockerIndex,
      copyKey,
    });
  }
}

async function copyReleaseProductionBlockerCommands({
  blockerIndex = 0,
  copyKey = '',
} = {}) {
  const commandText = buildReleaseProductionBlockerCommandText({ blockerIndex });
  if (!commandText) {
    setUiNotice('복사할 production-ready blocker 검증 명령이 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(commandText, {
    promptMessage: 'production-ready blocker 검증 명령을 복사하세요.',
    shownNotice: 'production-ready blocker 검증 명령을 표시했습니다.',
    successNotice: 'production-ready blocker 검증 명령을 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseProductionBlockerDetail({
      action: 'copy-release-production-blocker-commands',
      blockerIndex,
      copyKey,
    });
  }
}

async function copyReleaseProductionBlockerPackage({
  blockerIndex = 0,
  copyKey = '',
} = {}) {
  const packageText = buildReleaseProductionBlockerPackageText({ blockerIndex });
  if (!packageText) {
    setUiNotice('복사할 production-ready blocker package가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(packageText, {
    promptMessage: 'production-ready blocker package를 복사하세요.',
    shownNotice: 'production-ready blocker package를 표시했습니다.',
    successNotice: 'production-ready blocker package를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseProductionBlockerDetail({
      action: 'copy-release-production-blocker-package',
      blockerIndex,
      copyKey,
    });
  }
}

async function copyReleaseProviderReadinessPackage({
  copyKey = '',
  provider = '',
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  const normalizedCopyKey = String(copyKey || normalizedProvider || '').trim();
  const packageText = buildReleaseProviderReadinessPackageText({ provider: normalizedProvider });
  if (!packageText) {
    setUiNotice('복사할 provider readiness handoff package가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(packageText, {
    promptMessage: 'provider readiness handoff package를 복사하세요.',
    shownNotice: 'provider readiness handoff package를 표시했습니다.',
    successNotice: normalizedProvider
      ? `${normalizedProvider} provider readiness handoff package를 복사했습니다.`
      : '전체 provider readiness handoff package를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseProviderReadinessPackage(normalizedCopyKey);
  }
}

async function copyReleaseBlockerFilterSummary({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const summaryText = buildReleaseBlockerSliceSummaryText(copyScope);
  if (!summaryText) {
    setUiNotice('복사할 release blocker slice summary가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(summaryText, {
    promptMessage: 'release blocker slice summary를 복사하세요.',
    shownNotice: 'release blocker slice summary를 표시했습니다.',
    successNotice: 'release blocker slice summary를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerSummary({
      action: 'copy-release-blocker-filter-summary',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseBlockerProviderOnlySummary({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only summary는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const summaryText = buildReleaseBlockerSliceSummaryText(copyScope);
  if (!summaryText) {
    setUiNotice('복사할 provider-only release blocker slice summary가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(summaryText, {
    promptMessage: 'provider-only release blocker slice summary를 복사하세요.',
    shownNotice: 'provider-only release blocker slice summary를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only release blocker slice summary를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerSummary({
      action: 'copy-release-blocker-provider-only-summary',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseBlockerApiLink({
  category = state.releaseBlockerCategoryFilter,
  copyAction = 'copy-release-blocker-api-link',
  copyKey = '',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  promptMessage = 'release blocker API 링크를 복사하세요.',
  provider = state.releaseBlockerProviderFilter,
  shownNotice = 'release blocker API 링크를 표시했습니다.',
  successNotice = 'release blocker API 링크를 복사했습니다.',
} = {}) {
  const apiUrl = buildReleaseBlockerApiUrl({ category, includeShared, owner, provider });
  if (!apiUrl) {
    setUiNotice('복사할 release blocker API 링크가 없습니다.');
    return;
  }

  const result = await copyUiLink(apiUrl, {
    promptMessage,
    shownNotice,
    successNotice,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseLink(copyAction, copyKey || apiUrl);
  }
}

async function copyReleaseBlockerProviderOnlyApiLink({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only API 링크는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  await copyReleaseBlockerApiLink({
    category,
    copyAction: 'copy-release-blocker-provider-only-api-link',
    copyKey,
    includeShared: false,
    owner,
    promptMessage: 'provider-only release blocker API 링크를 복사하세요.',
    provider: normalizedProvider,
    shownNotice: 'provider-only release blocker API 링크를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only release blocker API 링크를 복사했습니다.`,
  });
}

function getReleaseBlockerFilteredCopyScope({
  category = state.releaseBlockerCategoryFilter,
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const totalActions = getReleaseCurrentOpenBlockerActions();
  const blockerActions = totalActions.filter((item) =>
    isReleaseBlockerActionVisibleForCopyScope(item, {
      category: normalizedCategory,
      includeShared,
      owner: normalizedOwner,
      provider: normalizedProvider,
    }),
  );

  return {
    blockerActions,
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
    totalActions,
  };
}

async function copyReleaseBlockerFilterPackage({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const packageText = buildReleaseBlockerSlicePackageText(copyScope);
  if (!packageText) {
    setUiNotice('복사할 release blocker slice package가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(packageText, {
    promptMessage: 'release blocker slice package를 복사하세요.',
    shownNotice: 'release blocker slice package를 표시했습니다.',
    successNotice: 'release blocker slice package를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerPackage({
      action: 'copy-release-blocker-filter-package',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseBlockerProviderOnlyPackage({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only package는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const packageText = buildReleaseBlockerSlicePackageText(copyScope);
  if (!packageText) {
    setUiNotice('복사할 provider-only release blocker package가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(packageText, {
    promptMessage: 'provider-only release blocker package를 복사하세요.',
    shownNotice: 'provider-only release blocker package를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only release blocker package를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerPackage({
      action: 'copy-release-blocker-provider-only-package',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseBlockerFilterClosureChecklist({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const checklistText = buildReleaseBlockerSliceClosureChecklistText(copyScope);
  if (!checklistText) {
    setUiNotice('복사할 release blocker slice closure checklist가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(checklistText, {
    promptMessage: 'release blocker slice closure checklist를 복사하세요.',
    shownNotice: 'release blocker slice closure checklist를 표시했습니다.',
    successNotice: 'release blocker slice closure checklist를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerClosureChecklist({
      action: 'copy-release-blocker-filter-closure-checklist',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseBlockerProviderOnlyClosureChecklist({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only closure checklist는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const checklistText = buildReleaseBlockerSliceClosureChecklistText(copyScope);
  if (!checklistText) {
    setUiNotice('복사할 provider-only release blocker closure checklist가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(checklistText, {
    promptMessage: 'provider-only release blocker closure checklist를 복사하세요.',
    shownNotice: 'provider-only release blocker closure checklist를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only release blocker closure checklist를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerClosureChecklist({
      action: 'copy-release-blocker-provider-only-closure-checklist',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseBlockerFilterClosureMatrixPackage({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const matrixText = buildReleaseBlockerClosureMatrixPackageText(copyScope);
  if (!matrixText) {
    setUiNotice('복사할 release blocker closure matrix package가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(matrixText, {
    promptMessage: 'release blocker closure matrix package를 복사하세요.',
    shownNotice: 'release blocker closure matrix package를 표시했습니다.',
    successNotice: 'release blocker closure matrix package를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerClosureMatrix({
      action: 'copy-release-blocker-filter-closure-matrix',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseBlockerProviderOnlyClosureMatrixPackage({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only closure matrix는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const matrixText = buildReleaseBlockerClosureMatrixPackageText(copyScope);
  if (!matrixText) {
    setUiNotice('복사할 provider-only release blocker closure matrix package가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(matrixText, {
    promptMessage: 'provider-only release blocker closure matrix package를 복사하세요.',
    shownNotice: 'provider-only release blocker closure matrix package를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only release blocker closure matrix package를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerClosureMatrix({
      action: 'copy-release-blocker-provider-only-closure-matrix',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceIntakeSummary({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const summaryText = buildReleaseTargetEvidenceIntakeSummaryText(copyScope);
  if (!summaryText) {
    setUiNotice('복사할 target evidence intake summary가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(summaryText, {
    promptMessage: 'target evidence intake summary를 복사하세요.',
    shownNotice: 'target evidence intake summary를 표시했습니다.',
    successNotice: 'target evidence intake summary를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceIntakeSummary({
      action: 'copy-release-target-evidence-intake-summary',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceProviderOnlyIntakeSummary({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only target evidence summary는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const summaryText = buildReleaseTargetEvidenceIntakeSummaryText(copyScope);
  if (!summaryText) {
    setUiNotice('복사할 provider-only target evidence intake summary가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(summaryText, {
    promptMessage: 'provider-only target evidence intake summary를 복사하세요.',
    shownNotice: 'provider-only target evidence intake summary를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence intake summary를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceIntakeSummary({
      action: 'copy-release-target-evidence-provider-only-intake-summary',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceCaptureTemplate({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const templateText = buildReleaseTargetEvidenceCaptureTemplateText(copyScope);
  if (!templateText) {
    setUiNotice('복사할 target evidence capture template가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(templateText, {
    promptMessage: 'target evidence capture template를 복사하세요.',
    shownNotice: 'target evidence capture template를 표시했습니다.',
    successNotice: 'target evidence capture template를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceCaptureTemplate({
      action: 'copy-release-target-evidence-capture-template',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceProviderOnlyCaptureTemplate({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only capture template는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const templateText = buildReleaseTargetEvidenceCaptureTemplateText(copyScope);
  if (!templateText) {
    setUiNotice('복사할 provider-only target evidence capture template가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(templateText, {
    promptMessage: 'provider-only target evidence capture template를 복사하세요.',
    shownNotice: 'provider-only target evidence capture template를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence capture template를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceCaptureTemplate({
      action: 'copy-release-target-evidence-provider-only-capture-template',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceRequiredCommands({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const commandText = buildReleaseTargetEvidenceRequiredCommandsText(copyScope);
  if (!commandText) {
    setUiNotice('복사할 target evidence required commands가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(commandText, {
    promptMessage: 'target evidence required commands를 복사하세요.',
    shownNotice: 'target evidence required commands를 표시했습니다.',
    successNotice: 'target evidence required commands를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceRequiredCommands({
      action: 'copy-release-target-evidence-required-commands',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceProviderOnlyRequiredCommands({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only required commands는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const commandText = buildReleaseTargetEvidenceRequiredCommandsText(copyScope);
  if (!commandText) {
    setUiNotice('복사할 provider-only target evidence required commands가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(commandText, {
    promptMessage: 'provider-only target evidence required commands를 복사하세요.',
    shownNotice: 'provider-only target evidence required commands를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence required commands를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceRequiredCommands({
      action: 'copy-release-target-evidence-provider-only-required-commands',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceProductionGap({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const gapText = buildReleaseTargetEvidenceProductionGapText(copyScope);
  if (!gapText) {
    setUiNotice('복사할 target evidence production gap이 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(gapText, {
    promptMessage: 'target evidence production gap을 복사하세요.',
    shownNotice: 'target evidence production gap을 표시했습니다.',
    successNotice: 'target evidence production gap을 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceProductionGap({
      action: 'copy-release-target-evidence-production-gap',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceProviderOnlyProductionGap({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only production gap은 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const gapText = buildReleaseTargetEvidenceProductionGapText(copyScope);
  if (!gapText) {
    setUiNotice('복사할 provider-only target evidence production gap guard가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(gapText, {
    promptMessage: 'provider-only target evidence production gap guard를 복사하세요.',
    shownNotice: 'provider-only target evidence production gap guard를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence production gap guard를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceProductionGap({
      action: 'copy-release-target-evidence-provider-only-production-gap',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceExceptionRegister({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const registerText = buildReleaseTargetEvidenceExceptionRegisterText(copyScope);
  if (!registerText) {
    setUiNotice('복사할 target evidence exception register가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(registerText, {
    promptMessage: 'target evidence exception register를 복사하세요.',
    shownNotice: 'target evidence exception register를 표시했습니다.',
    successNotice: 'target evidence exception register를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceExceptionRegister({
      action: 'copy-release-target-evidence-exception-register',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceProviderOnlyExceptionRegister({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only exception register는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const registerText = buildReleaseTargetEvidenceExceptionRegisterText(copyScope);
  if (!registerText) {
    setUiNotice('복사할 provider-only target evidence exception register가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(registerText, {
    promptMessage: 'provider-only target evidence exception register를 복사하세요.',
    shownNotice: 'provider-only target evidence exception register를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence exception register를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceExceptionRegister({
      action: 'copy-release-target-evidence-provider-only-exception-register',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceRiskDecisionRegister({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const registerText = buildReleaseTargetEvidenceRiskDecisionRegisterText(copyScope);
  if (!registerText) {
    setUiNotice('복사할 target evidence risk decision register가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(registerText, {
    promptMessage: 'target evidence risk decision register를 복사하세요.',
    shownNotice: 'target evidence risk decision register를 표시했습니다.',
    successNotice: 'target evidence risk decision register를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceRiskDecisionRegister({
      action: 'copy-release-target-evidence-risk-decision-register',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceProviderOnlyRiskDecisionRegister({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only risk decision register는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const registerText = buildReleaseTargetEvidenceRiskDecisionRegisterText(copyScope);
  if (!registerText) {
    setUiNotice('복사할 provider-only target evidence risk decision register가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(registerText, {
    promptMessage: 'provider-only target evidence risk decision register를 복사하세요.',
    shownNotice: 'provider-only target evidence risk decision register를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence risk decision register를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceRiskDecisionRegister({
      action: 'copy-release-target-evidence-provider-only-risk-decision-register',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceProviderEvidenceReferences({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const referencesText = buildReleaseTargetEvidenceProviderEvidenceReferencesText(copyScope);
  if (!referencesText) {
    setUiNotice('복사할 target evidence provider references가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(referencesText, {
    promptMessage: 'target evidence provider references를 복사하세요.',
    shownNotice: 'target evidence provider references를 표시했습니다.',
    successNotice: 'target evidence provider references를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceProviderReferences({
      action: 'copy-release-target-evidence-provider-references',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceProviderOnlyProviderEvidenceReferences({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only provider refs는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const referencesText = buildReleaseTargetEvidenceProviderEvidenceReferencesText(copyScope);
  if (!referencesText) {
    setUiNotice('복사할 provider-only target evidence provider references가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(referencesText, {
    promptMessage: 'provider-only target evidence provider references를 복사하세요.',
    shownNotice: 'provider-only target evidence provider references를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence provider references를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceProviderReferences({
      action: 'copy-release-target-evidence-provider-only-provider-references',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceResidualBlockers({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const blockersText = buildReleaseTargetEvidenceResidualBlockersText(copyScope);
  if (!blockersText) {
    setUiNotice('복사할 target evidence residual blockers가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(blockersText, {
    promptMessage: 'target evidence residual blockers를 복사하세요.',
    shownNotice: 'target evidence residual blockers를 표시했습니다.',
    successNotice: 'target evidence residual blockers를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceResidualBlockers({
      action: 'copy-release-target-evidence-residual-blockers',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceProviderOnlyResidualBlockers({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only residual blockers는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const blockersText = buildReleaseTargetEvidenceResidualBlockersText(copyScope);
  if (!blockersText) {
    setUiNotice('복사할 provider-only target evidence residual blockers가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(blockersText, {
    promptMessage: 'provider-only target evidence residual blockers를 복사하세요.',
    shownNotice: 'provider-only target evidence residual blockers를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence residual blockers를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceResidualBlockers({
      action: 'copy-release-target-evidence-provider-only-residual-blockers',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceClosureRules({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const rulesText = buildReleaseTargetEvidenceClosureRulesText(copyScope);
  if (!rulesText) {
    setUiNotice('복사할 target evidence closure rules가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(rulesText, {
    promptMessage: 'target evidence closure rules를 복사하세요.',
    shownNotice: 'target evidence closure rules를 표시했습니다.',
    successNotice: 'target evidence closure rules를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceClosureRules({
      action: 'copy-release-target-evidence-closure-rules',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceProviderOnlyClosureRules({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only closure rules는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const rulesText = buildReleaseTargetEvidenceClosureRulesText(copyScope);
  if (!rulesText) {
    setUiNotice('복사할 provider-only target evidence closure rules가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(rulesText, {
    promptMessage: 'provider-only target evidence closure rules를 복사하세요.',
    shownNotice: 'provider-only target evidence closure rules를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence closure rules를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceClosureRules({
      action: 'copy-release-target-evidence-provider-only-closure-rules',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceSubmissionManifest({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const manifestText = buildReleaseTargetEvidenceSubmissionManifestText(copyScope);
  if (!manifestText) {
    setUiNotice('복사할 target evidence submission manifest가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(manifestText, {
    promptMessage: 'target evidence submission manifest를 복사하세요.',
    shownNotice: 'target evidence submission manifest를 표시했습니다.',
    successNotice: 'target evidence submission manifest를 복사했습니다.',
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceSubmissionManifest({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceProviderOnlySubmissionManifest({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only submission manifest는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const manifestText = buildReleaseTargetEvidenceSubmissionManifestText(copyScope);
  if (!manifestText) {
    setUiNotice('복사할 provider-only target evidence submission manifest가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(manifestText, {
    promptMessage: 'provider-only target evidence submission manifest를 복사하세요.',
    shownNotice: 'provider-only target evidence submission manifest를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence submission manifest를 복사했습니다.`,
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceSubmissionManifest({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceSanitizedRegister({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const registerText = buildReleaseTargetEvidenceSanitizedRegisterText(copyScope);
  if (!registerText) {
    setUiNotice('복사할 target evidence sanitized register가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(registerText, {
    promptMessage: 'target evidence sanitized register를 복사하세요.',
    shownNotice: 'target evidence sanitized register를 표시했습니다.',
    successNotice: 'target evidence sanitized register를 복사했습니다.',
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceSanitizedRegister({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceProviderOnlySanitizedRegister({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only sanitized register는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const registerText = buildReleaseTargetEvidenceSanitizedRegisterText(copyScope);
  if (!registerText) {
    setUiNotice('복사할 provider-only target evidence sanitized register가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(registerText, {
    promptMessage: 'provider-only target evidence sanitized register를 복사하세요.',
    shownNotice: 'provider-only target evidence sanitized register를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence sanitized register를 복사했습니다.`,
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceSanitizedRegister({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceBoundaryMap({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const mapText = buildReleaseTargetEvidenceBoundaryConsistencyMapText(copyScope);
  if (!mapText) {
    setUiNotice('복사할 target evidence boundary map이 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(mapText, {
    promptMessage: 'target evidence boundary map을 복사하세요.',
    shownNotice: 'target evidence boundary map을 표시했습니다.',
    successNotice: 'target evidence boundary map을 복사했습니다.',
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceBoundaryMap({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceProviderOnlyBoundaryMap({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only boundary map은 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const mapText = buildReleaseTargetEvidenceBoundaryConsistencyMapText(copyScope);
  if (!mapText) {
    setUiNotice('복사할 provider-only target evidence boundary consistency map이 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(mapText, {
    promptMessage: 'provider-only target evidence boundary consistency map을 복사하세요.',
    shownNotice: 'provider-only target evidence boundary consistency map을 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence boundary consistency map을 복사했습니다.`,
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceBoundaryMap({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceCommandRerunLog({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const rerunLogText = buildReleaseTargetEvidenceCommandRerunLogText(copyScope);
  if (!rerunLogText) {
    setUiNotice('복사할 target evidence command rerun log가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(rerunLogText, {
    promptMessage: 'target evidence command rerun log를 복사하세요.',
    shownNotice: 'target evidence command rerun log를 표시했습니다.',
    successNotice: 'target evidence command rerun log를 복사했습니다.',
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceCommandRerunLog({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceProviderOnlyCommandRerunLog({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only command log는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const rerunLogText = buildReleaseTargetEvidenceCommandRerunLogText(copyScope);
  if (!rerunLogText) {
    setUiNotice('복사할 provider-only target evidence command rerun log가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(rerunLogText, {
    promptMessage: 'provider-only target evidence command rerun log를 복사하세요.',
    shownNotice: 'provider-only target evidence command rerun log를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence command rerun log를 복사했습니다.`,
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceCommandRerunLog({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceDecisionRecord({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const decisionText = buildReleaseTargetEvidenceReviewerDecisionRecordText(copyScope);
  if (!decisionText) {
    setUiNotice('복사할 target evidence reviewer decision record가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(decisionText, {
    promptMessage: 'target evidence reviewer decision record를 복사하세요.',
    shownNotice: 'target evidence reviewer decision record를 표시했습니다.',
    successNotice: 'target evidence reviewer decision record를 복사했습니다.',
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceDecisionRecord({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceProviderOnlyDecisionRecord({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only decision record는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const decisionText = buildReleaseTargetEvidenceReviewerDecisionRecordText(copyScope);
  if (!decisionText) {
    setUiNotice('복사할 provider-only target evidence reviewer decision record가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(decisionText, {
    promptMessage: 'provider-only target evidence reviewer decision record를 복사하세요.',
    shownNotice: 'provider-only target evidence reviewer decision record를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence reviewer decision record를 복사했습니다.`,
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceDecisionRecord({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceBlockerDispositionRegister({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const registerText = buildReleaseTargetEvidenceBlockerDispositionRegisterText(copyScope);
  if (!registerText) {
    setUiNotice('복사할 target evidence blocker disposition register가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(registerText, {
    promptMessage: 'target evidence blocker disposition register를 복사하세요.',
    shownNotice: 'target evidence blocker disposition register를 표시했습니다.',
    successNotice: 'target evidence blocker disposition register를 복사했습니다.',
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceBlockerDisposition({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceProviderOnlyBlockerDispositionRegister({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only disposition register는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const registerText = buildReleaseTargetEvidenceBlockerDispositionRegisterText(copyScope);
  if (!registerText) {
    setUiNotice('복사할 provider-only target evidence blocker disposition register가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(registerText, {
    promptMessage: 'provider-only target evidence blocker disposition register를 복사하세요.',
    shownNotice: 'provider-only target evidence blocker disposition register를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence blocker disposition register를 복사했습니다.`,
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceBlockerDisposition({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceReleaseRefreshEvidence({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const evidenceText = buildReleaseTargetEvidenceReleaseRefreshEvidenceText(copyScope);
  if (!evidenceText) {
    setUiNotice('복사할 target evidence release refresh evidence가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(evidenceText, {
    promptMessage: 'target evidence release refresh evidence를 복사하세요.',
    shownNotice: 'target evidence release refresh evidence를 표시했습니다.',
    successNotice: 'target evidence release refresh evidence를 복사했습니다.',
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceReleaseRefresh({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceProviderOnlyReleaseRefreshEvidence({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only refresh evidence는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const evidenceText = buildReleaseTargetEvidenceReleaseRefreshEvidenceText(copyScope);
  if (!evidenceText) {
    setUiNotice('복사할 provider-only target evidence release refresh evidence가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(evidenceText, {
    promptMessage: 'provider-only target evidence release refresh evidence를 복사하세요.',
    shownNotice: 'provider-only target evidence release refresh evidence를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence release refresh evidence를 복사했습니다.`,
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceReleaseRefresh({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceIntakePacket({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const packetText = buildReleaseTargetEvidenceIntakePacketText(copyScope);
  if (!packetText) {
    setUiNotice('복사할 target evidence intake packet이 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(packetText, {
    promptMessage: 'target evidence intake packet을 복사하세요.',
    shownNotice: 'target evidence intake packet을 표시했습니다.',
    successNotice: 'target evidence intake packet을 복사했습니다.',
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceIntakePacket({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseTargetEvidenceProviderOnlyIntakePacket({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only target evidence packet은 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const packetText = buildReleaseTargetEvidenceIntakePacketText(copyScope);
  if (!packetText) {
    setUiNotice('복사할 provider-only target evidence packet이 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(packetText, {
    promptMessage: 'provider-only target evidence packet을 복사하세요.',
    shownNotice: 'provider-only target evidence packet을 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence packet을 복사했습니다.`,
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceIntakePacket({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseBlockerFilterHandoff({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const handoffText = buildReleaseBlockerSliceHandoffText(copyScope);
  if (!handoffText) {
    setUiNotice('복사할 release blocker slice handoff가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(handoffText, {
    promptMessage: 'release blocker slice handoff를 복사하세요.',
    shownNotice: 'release blocker slice handoff를 표시했습니다.',
    successNotice: 'release blocker slice handoff를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerHandoff({
      action: 'copy-release-blocker-filter-handoff',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseBlockerProviderOnlyHandoff({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only handoff는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const handoffText = buildReleaseBlockerSliceHandoffText(copyScope);
  if (!handoffText) {
    setUiNotice('복사할 provider-only release blocker slice handoff가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(handoffText, {
    promptMessage: 'provider-only release blocker slice handoff를 복사하세요.',
    shownNotice: 'provider-only release blocker slice handoff를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only release blocker slice handoff를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerHandoff({
      action: 'copy-release-blocker-provider-only-handoff',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseBlockerFilterCommands({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const commandText = buildReleaseBlockerSliceCommandText(copyScope);
  if (!commandText) {
    setUiNotice('복사할 release blocker slice command가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(commandText, {
    promptMessage: 'release blocker slice command를 복사하세요.',
    shownNotice: 'release blocker slice command를 표시했습니다.',
    successNotice: 'release blocker slice command를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerCommands({
      action: 'copy-release-blocker-filter-commands',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseBlockerProviderOnlyCommands({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only slice commands는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const commandText = buildReleaseBlockerSliceCommandText(copyScope);
  if (!commandText) {
    setUiNotice('복사할 provider-only release blocker slice commands가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(commandText, {
    promptMessage: 'provider-only release blocker slice commands를 복사하세요.',
    shownNotice: 'provider-only release blocker slice commands를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only release blocker slice commands를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerCommands({
      action: 'copy-release-blocker-provider-only-commands',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseBlockerFilterEvidence({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const evidenceText = buildReleaseBlockerSliceEvidenceText(copyScope);
  if (!evidenceText) {
    setUiNotice('복사할 release blocker slice evidence가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(evidenceText, {
    promptMessage: 'release blocker slice evidence를 복사하세요.',
    shownNotice: 'release blocker slice evidence를 표시했습니다.',
    successNotice: 'release blocker slice evidence를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerEvidence({
      action: 'copy-release-blocker-filter-evidence',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseBlockerProviderOnlyEvidence({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only slice evidence는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const evidenceText = buildReleaseBlockerSliceEvidenceText(copyScope);
  if (!evidenceText) {
    setUiNotice('복사할 provider-only release blocker slice evidence가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(evidenceText, {
    promptMessage: 'provider-only release blocker slice evidence를 복사하세요.',
    shownNotice: 'provider-only release blocker slice evidence를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only release blocker slice evidence를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerEvidence({
      action: 'copy-release-blocker-provider-only-evidence',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

async function copyReleaseEvidenceDocLink({
  copyAction = 'copy-release-evidence-doc-link',
  copyKey = '',
  href = '',
  label = '',
} = {}) {
  const normalizedHref = String(href || '').trim();
  const normalizedLabel = String(label || 'release evidence doc').trim();
  if (!normalizedHref) {
    setUiNotice('복사할 evidence doc 링크가 없습니다.');
    return;
  }

  const docUrl = getAbsoluteReleaseUrl(normalizedHref);
  const result = await copyUiLink(docUrl, {
    promptMessage: `${normalizedLabel} 링크를 복사하세요.`,
    shownNotice: `${normalizedLabel} 링크를 표시했습니다.`,
    successNotice: `${normalizedLabel} 링크를 복사했습니다.`,
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseLink(copyAction, copyKey || normalizedHref);
  }
}

async function copyReleaseHandoffPreviewLink({
  artifactId = state.releaseHandoffPreviewId,
  successNotice = '',
} = {}) {
  const normalizedArtifactId = normalizeUiParam(artifactId);
  const handoffArtifacts = state.releaseStatus?.handoffArtifacts || [];
  const handoffArtifact = handoffArtifacts.find((item) => String(item.id || '').trim() === normalizedArtifactId) || null;

  if (!isReleaseHandoffPreviewable(handoffArtifact)) {
    setUiNotice('복사할 handoff preview 링크가 없습니다.');
    return;
  }

  const previewUrl = `${window.location.origin}${buildUiStateUrl({
    detailTab: 'release',
    releaseHandoffPreviewId: normalizedArtifactId,
    stepId: 'step-output',
  })}`;

  const copyResult = await copyUiLink(previewUrl, {
    promptMessage: `${handoffArtifact.label || 'handoff preview'} 링크를 복사하세요.`,
    shownNotice: `${handoffArtifact.label || 'handoff preview'} 링크를 표시했습니다.`,
    successNotice: successNotice || `${handoffArtifact.label || 'handoff preview'} 링크를 복사했습니다.`,
  });
  if (copyResult?.method === 'clipboard') {
    markCopiedReleaseHandoffPreviewLink(normalizedArtifactId);
  }
}

async function copyReleaseHandoffStructuredSummary({
  artifactId = state.releaseHandoffPreviewId,
  successNotice = '',
} = {}) {
  const normalizedArtifactId = normalizeUiParam(artifactId);
  const handoffArtifacts = state.releaseStatus?.handoffArtifacts || [];
  const handoffArtifact = handoffArtifacts.find((item) => String(item.id || '').trim() === normalizedArtifactId) || null;
  const overviewLine = getReleaseHandoffStructuredSummaryOverviewLine(handoffArtifact);
  if (!overviewLine) {
    setUiNotice('복사할 handoff summary가 없습니다.');
    return;
  }
  const copyResult = await copyPlainTextValue(overviewLine, {
    promptMessage: `${handoffArtifact?.label || 'handoff summary'} overview line을 복사하세요.`,
    shownNotice: `${handoffArtifact?.label || 'handoff summary'} overview line을 표시했습니다.`,
    successNotice: successNotice || `${handoffArtifact?.label || 'handoff summary'} overview line을 복사했습니다.`,
  });
  if (copyResult?.method === 'clipboard') {
    markCopiedReleaseHandoffSummary(normalizedArtifactId);
  }
}

async function copyReleaseHandoffStructuredSummaryDetail({
  artifactId = state.releaseHandoffPreviewId,
  detailKey = '',
  successNotice = '',
} = {}) {
  const normalizedArtifactId = normalizeUiParam(artifactId);
  const normalizedDetailKey = normalizeUiParam(detailKey);
  const handoffArtifacts = state.releaseStatus?.handoffArtifacts || [];
  const handoffArtifact = handoffArtifacts.find((item) => String(item.id || '').trim() === normalizedArtifactId) || null;
  const detailEntry = getReleaseHandoffStructuredSummaryDetails(handoffArtifact).find(
    (detail) => normalizeUiParam(detail.key) === normalizedDetailKey,
  );
  const overviewLine = String(detailEntry?.overviewLine || '').trim();
  if (!overviewLine) {
    setUiNotice('복사할 handoff summary detail이 없습니다.');
    return;
  }
  const copyResult = await copyPlainTextValue(overviewLine, {
    promptMessage: `${handoffArtifact?.label || 'handoff summary'} ${detailEntry?.label || 'detail'} line을 복사하세요.`,
    shownNotice: `${handoffArtifact?.label || 'handoff summary'} ${detailEntry?.label || 'detail'} line을 표시했습니다.`,
    successNotice: successNotice || `${handoffArtifact?.label || 'handoff summary'} ${detailEntry?.label || 'detail'} line을 복사했습니다.`,
  });
  if (copyResult?.method === 'clipboard') {
    markCopiedReleaseHandoffSummaryDetail(normalizedArtifactId, normalizedDetailKey);
  }
}

async function copyReleaseHandoffStructuredSummaryStableLine({
  artifactId = state.releaseHandoffPreviewId,
  detailKey = '',
  lineIndex = -1,
  successNotice = '',
} = {}) {
  const normalizedArtifactId = normalizeUiParam(artifactId);
  const normalizedDetailKey = normalizeUiParam(detailKey);
  const normalizedLineIndex = Number.isInteger(lineIndex) ? lineIndex : Number.parseInt(lineIndex, 10);
  const handoffArtifacts = state.releaseStatus?.handoffArtifacts || [];
  const handoffArtifact = handoffArtifacts.find((item) => String(item.id || '').trim() === normalizedArtifactId) || null;
  const detailEntry = getReleaseHandoffStructuredSummaryDetails(handoffArtifact).find(
    (detail) => normalizeUiParam(detail.key) === normalizedDetailKey,
  );
  const stableLine = String(detailEntry?.stableLines?.[normalizedLineIndex] || '').trim();
  if (!stableLine) {
    setUiNotice('복사할 handoff stable line이 없습니다.');
    return;
  }
  const copyResult = await copyPlainTextValue(stableLine, {
    promptMessage: `${handoffArtifact?.label || 'handoff summary'} ${detailEntry?.label || 'detail'} stable line을 복사하세요.`,
    shownNotice: `${handoffArtifact?.label || 'handoff summary'} ${detailEntry?.label || 'detail'} stable line을 표시했습니다.`,
    successNotice: successNotice || `${handoffArtifact?.label || 'handoff summary'} ${detailEntry?.label || 'detail'} stable line을 복사했습니다.`,
  });
  if (copyResult?.method === 'clipboard') {
    markCopiedReleaseHandoffSummaryStableLine(normalizedArtifactId, normalizedDetailKey, normalizedLineIndex);
  }
}

async function copyReleaseHandoffOpenLink({
  artifactId = '',
  successNotice = '',
} = {}) {
  const normalizedArtifactId = normalizeUiParam(artifactId);
  const handoffArtifacts = state.releaseStatus?.handoffArtifacts || [];
  const handoffArtifact = handoffArtifacts.find((item) => String(item.id || '').trim() === normalizedArtifactId) || null;

  if (!handoffArtifact?.href) {
    setUiNotice('복사할 handoff artifact 링크가 없습니다.');
    return;
  }

  const artifactUrl = `${window.location.origin}${handoffArtifact.href}`;
  const copyResult = await copyUiLink(artifactUrl, {
    promptMessage: `${handoffArtifact.label || 'handoff artifact'} 열기 링크를 복사하세요.`,
    shownNotice: `${handoffArtifact.label || 'handoff artifact'} 열기 링크를 표시했습니다.`,
    successNotice: successNotice || `${handoffArtifact.label || 'handoff artifact'} 열기 링크를 복사했습니다.`,
  });
  if (copyResult?.method === 'clipboard') {
    markCopiedReleaseHandoffPreviewLink(normalizedArtifactId);
  }
}

async function copyRetrievalSourceLink({
  sourceType = state.retrievalSourceFocusType,
  sourceLabel = state.retrievalSourceFocusLabel,
  successNotice = '현재 retrieval source 링크를 복사했습니다.',
} = {}) {
  const normalizedType = getSanitizedRetrievalSourceType(sourceType);
  const normalizedLabel = normalizeUiParam(sourceLabel);

  if (!state.selectedMissionId || !normalizedType || !normalizedLabel) {
    setUiNotice('복사할 retrieval source 링크가 없습니다.');
    return;
  }

  const retrievalUrl = `${window.location.origin}${buildUiStateUrl({
    detailTab: 'harness',
    retrievalSourceLabel: normalizedLabel,
    retrievalSourceType: normalizedType,
    stepId: 'step-setup',
  })}`;

  const copyResult = await copyUiLink(retrievalUrl, {
    promptMessage: '현재 retrieval source 링크를 복사하세요.',
    shownNotice: '현재 retrieval source 링크를 표시했습니다.',
    successNotice,
  });
  if (copyResult?.method === 'clipboard') {
    markCopiedRetrievalSource(normalizedType, normalizedLabel);
  }
}

function getFlowState() {
  if (!state.selectedMissionId || !state.missionDetail) {
    return {
      buttonLabel: '1단계에서 시작',
      completedSteps: [],
      copy: '왼쪽 미션 큐에서 고르거나 템플릿으로 새 미션을 만들면 실행 준비를 시작할 수 있습니다.',
      currentStepLabel: '1단계 · 미션 정하기',
      blocker: '아직 선택된 미션이 없습니다.',
      label: '실행할 미션을 먼저 정하세요',
      pendingActionCount: 0,
      pendingApprovalCount: 0,
      recommendedStep: 'step-setup',
      secondaryActionLabel: '입력값과 설정 보기',
      secondaryActionTab: 'config',
    };
  }

  const latestSession = state.missionDetail.summary?.latestSession || null;
  const pendingApprovalCount = state.approvals.filter((item) => item.missionId === state.selectedMissionId).length;
  const pendingActionCount = Number(state.missionActions?.summary?.pendingActionCount || 0);
  const completedSteps = ['step-setup'];

  if (latestSession?.status === 'failed') {
    return {
      buttonLabel: '실행 단계 다시 보기',
      completedSteps,
      copy: latestSession.reviewerSummary || latestSession.outputSummary || '최근 실행이 중간에 멈췄습니다. 오류 원인을 확인한 뒤 다시 실행해야 합니다.',
      currentStepLabel: '2단계 · 실행하기',
      blocker: '최근 실행이 실패했습니다.',
      label: '실행 오류를 확인하고 다시 시작하세요',
      pendingActionCount,
      pendingApprovalCount,
      recommendedStep: 'step-run',
      secondaryActionLabel: '실행 기록 보기',
      secondaryActionTab: 'runs',
    };
  }

  if (!latestSession) {
    return {
      buttonLabel: '2단계 실행으로 이동',
      completedSteps,
      copy: '입력값은 준비됐습니다. 제공자를 선택하고 첫 실행을 시작하면 검토와 결과가 생성됩니다.',
      currentStepLabel: '2단계 · 실행하기',
      blocker: '아직 첫 실행 세션이 없습니다.',
      label: '제공자를 고르고 실행을 시작하세요',
      pendingActionCount,
      pendingApprovalCount,
      recommendedStep: 'step-run',
      secondaryActionLabel: '입력값과 설정 보기',
      secondaryActionTab: 'config',
    };
  }

  completedSteps.push('step-run');

  if (pendingApprovalCount > 0 || pendingActionCount > 0) {
    return {
      buttonLabel: '3단계 검토 열기',
      completedSteps,
      copy: `승인 ${pendingApprovalCount}건, 후속 작업 ${pendingActionCount}건이 남아 있습니다. 이 항목을 정리해야 결과를 확정할 수 있습니다.`,
      currentStepLabel: '3단계 · 검토하기',
      blocker:
        pendingApprovalCount > 0
          ? `사람의 승인 ${pendingApprovalCount}건이 남아 있습니다.`
          : `후속 작업 ${pendingActionCount}건을 먼저 처리해야 합니다.`,
      label: '검토와 승인 처리가 필요합니다',
      pendingActionCount,
      pendingApprovalCount,
      recommendedStep: 'step-review',
      secondaryActionLabel: '검토 이력 보기',
      secondaryActionTab: 'reviews',
    };
  }

  const execution = getExecutionStatusPayload();
  const latestExecutionSession = execution?.latestExecutionSession || null;
  if (state.missionDetail?.mission?.mode === 'engineering' && execution?.supported) {
    if (latestExecutionSession?.status === 'running') {
      return {
        buttonLabel: '실행 콘솔 열기',
        completedSteps,
        copy: '현재 리포에서 실행 세션이 돌고 있습니다. 라이브 로그와 step 상태를 확인하세요.',
        currentStepLabel: '2단계 · 실행하기',
        blocker: '실행 세션이 진행 중입니다.',
        label: '실행 로그와 step 상태를 모니터링하세요',
        pendingActionCount,
        pendingApprovalCount,
        recommendedStep: 'step-run',
        secondaryActionLabel: '실행 기록 보기',
        secondaryActionTab: 'runs',
      };
    }

    if (latestExecutionSession && ['failed', 'stopped', 'blocked'].includes(latestExecutionSession.status)) {
      completedSteps.push('step-run');
      return {
        buttonLabel: '3단계 검토 열기',
        completedSteps,
        copy: latestExecutionSession.verification?.summary || '실행 세션이 멈췄습니다. 실패 원인과 변경 파일을 검토하세요.',
        currentStepLabel: '3단계 · 검토하기',
        blocker: '실행 실패 또는 중단 상태입니다.',
        label: '실행 결과를 검토하고 다음 조치를 정하세요',
        pendingActionCount,
        pendingApprovalCount,
        recommendedStep: 'step-review',
        secondaryActionLabel: '실행 기록 보기',
        secondaryActionTab: 'runs',
      };
    }

    if (latestExecutionSession?.status === 'completed') {
      completedSteps.push('step-run', 'step-review');
      return {
        buttonLabel: '4단계 결과 열기',
        completedSteps,
        copy: latestExecutionSession.verification?.summary || '실행 세션이 완료됐습니다. 결과와 검증 흔적을 확인하세요.',
        currentStepLabel: '4단계 · 결과 보기',
        blocker: '실행과 검증이 끝났습니다.',
        label: '최종 결과와 변경 파일을 확인하세요',
        pendingActionCount,
        pendingApprovalCount,
        recommendedStep: 'step-output',
        secondaryActionLabel: '실행 기록 보기',
        secondaryActionTab: 'runs',
      };
    }

    return {
      buttonLabel: execution?.currentLease ? '실행 시작' : '실행 준비 확인',
      completedSteps,
      copy: execution?.currentLease
        ? '승인 lease가 준비됐습니다. 현재 리포에서 한 번의 실행 세션을 시작할 수 있습니다.'
        : execution?.blockedReasons?.length
          ? execution.blockedReasons[0]
          : '검토를 통과한 제안서를 기준으로 preflight, 승인, 실행 시작을 진행하세요.',
      currentStepLabel: '2단계 · 실행하기',
      blocker: execution?.currentLease
        ? 'one-time execution lease가 활성 상태입니다.'
        : execution?.latestApproval?.status === 'pending'
          ? '실행 승인 대기 중입니다.'
          : execution?.blockedReasons?.length
            ? '정책 또는 범위 문제로 실행이 막혔습니다.'
            : '실행 preflight가 아직 시작되지 않았습니다.',
      label: execution?.currentLease ? '현재 리포 실행을 시작할 수 있습니다' : '실행 preflight와 승인 상태를 먼저 확인하세요',
      pendingActionCount,
      pendingApprovalCount,
      recommendedStep: 'step-run',
      secondaryActionLabel: '입력값과 설정 보기',
      secondaryActionTab: 'config',
    };
  }

  completedSteps.push('step-review');

  return {
    buttonLabel: '4단계 결과 열기',
    completedSteps,
    copy: '막힌 항목이 없습니다. 최종 산출물, 실행 흐름, 세션 기록을 확인하고 이번 미션을 마무리하세요.',
    currentStepLabel: '4단계 · 결과 보기',
    blocker: '승인 대기와 후속 작업이 모두 정리되었습니다.',
    label: '최종 결과를 확인하고 확정하세요',
    pendingActionCount,
    pendingApprovalCount,
    recommendedStep: 'step-output',
    secondaryActionLabel: '실행 기록 보기',
    secondaryActionTab: 'runs',
  };
}

export function renderFlowState() {
  const flow = getFlowState();
  const harnessState = getHarnessSummaryState();
  const hasHarnessRecommendation = Boolean(harnessState.topRecommendation);
  const topHarnessAction = harnessState.recommendationAction;
  const hasMissionSelection = Boolean(state.selectedMissionId);
  const isOutputFocus = state.activeStep === 'step-output';
  const flowActionTargetLabel =
    state.missionDetail?.mission?.title || state.selectedMissionId || flow.currentStepLabel || '현재 흐름';
  const flowPrimaryActionLabel = `${flow.buttonLabel}: ${flow.currentStepLabel} · ${flowActionTargetLabel}`;
  const flowSecondaryActionLabel = `${flow.secondaryActionLabel}: ${flowActionTargetLabel}`;
  const flowHarnessActionLabel = topHarnessAction
    ? `${topHarnessAction.label}: ${flowActionTargetLabel}`
    : '';
  const flowResetViewLabel = hasMissionSelection
    ? `보기 초기화: ${flowActionTargetLabel}`
    : '초기 상태로 되돌리기';

  if (elements.flowStatus) {
    elements.flowStatus.innerHTML = `
      <p class="flow-status-label">지금 해야 할 일</p>
      <div class="flow-status-main">
        <div class="flow-status-copyblock">
          <strong class="flow-status-value">${escapeHtml(flow.label)}</strong>
          <p class="flow-status-copy">${escapeHtml(flow.copy)}</p>
        </div>
        <div class="flow-status-actions">
          ${renderFlowQuickActionButton({
            action: 'jump-step',
            actionLabel: flowPrimaryActionLabel,
            buttonText: flow.buttonLabel,
            className: 'primary-button',
            value: flow.recommendedStep,
          })}
          ${renderFlowQuickActionButton({
            action: 'switch-tab',
            actionLabel: flowSecondaryActionLabel,
            buttonText: flow.secondaryActionLabel,
            value: flow.secondaryActionTab,
          })}
          ${
            hasHarnessRecommendation
              ? renderFlowQuickActionButton({
                  action: topHarnessAction.action,
                  actionLabel: flowHarnessActionLabel,
                  buttonText: topHarnessAction.label,
                  value: topHarnessAction.value,
                })
              : ''
          }
          ${
            isOutputFocus
              ? ''
              : `
                ${renderCurrentViewLinkCopyButton({ targetLabel: flowActionTargetLabel })}
                ${renderFlowQuickActionButton({
                  action: 'reset-view',
                  actionLabel: flowResetViewLabel,
                  buttonText: hasMissionSelection ? '보기 초기화' : '초기 상태로',
                })}
              `
          }
          ${
            isOutputFocus
              ? `
                ${renderOutputToolbarToggleButton({
                  action: 'toggle-output-rail',
                  actionLabel: state.outputRailCollapsed ? `결과 사이드바 펼치기: ${flowActionTargetLabel}` : `결과 사이드바 접기: ${flowActionTargetLabel}`,
                  buttonText: state.outputRailCollapsed ? '사이드바 펼치기' : '사이드바 접기',
                  expanded: !state.outputRailCollapsed,
                })}
              `
              : ''
          }
        </div>
      </div>
      <div class="flow-status-inline">
        <span class="flow-inline-item">
          <em>현재 단계</em>
          <strong>${escapeHtml(flow.currentStepLabel)}</strong>
        </span>
        <span class="flow-inline-item">
          <em>진행 상태</em>
          <strong>${escapeHtml(flow.blocker)}</strong>
        </span>
        <span class="flow-inline-item ${hasHarnessRecommendation ? 'is-warning' : ''}">
          <em>하네스</em>
          <strong>${escapeHtml(hasHarnessRecommendation ? harnessState.topRecommendation.title : `권장 조치 없음 · 문서 ${harnessState.docsAvailableCount}/${harnessState.docsTotalCount}`)}</strong>
        </span>
      </div>
      ${
        state.uiNotice
          ? `<p class="flow-status-note">${escapeHtml(state.uiNotice)}</p>`
          : ''
      }
    `;
    wireQuickActions(elements.flowStatus);
  }

  elements.stepButtons.forEach((button) => {
    const stepId = button.dataset.stepTarget;
    button.classList.toggle('is-done', flow.completedSteps.includes(stepId));
    button.classList.toggle('is-ready', flow.recommendedStep === stepId);
  });
}

function wireTemplateSelectionButtons() {
  elements.templateList.querySelectorAll('[data-template-index]').forEach((button) => {
    button.addEventListener('click', () => {
      applyTemplate(Number(button.dataset.templateIndex));
    });
  });
}

function renderTemplates() {
  elements.templateList.innerHTML = missionTemplates
    .map((template, index) => renderTemplateChipButton({ index, template }))
    .join('');

  wireTemplateSelectionButtons();
}

function inferPlaybook(mission) {
  const haystack = [mission?.title, mission?.objective, ...(mission?.constraints || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (haystack.includes('manager->planner->executor->reviewer') || haystack.includes('staged manager')) {
    return missionPlaybooks.find((playbook) => playbook.id === 'team-pipeline') || null;
  }

  if (haystack.includes('근거 기반') || haystack.includes('research summary') || haystack.includes('unknown')) {
    return missionPlaybooks.find((playbook) => playbook.id === 'research-first') || null;
  }

  if (haystack.includes('product/design/engineering') || haystack.includes('readiness checklist')) {
    return missionPlaybooks.find((playbook) => playbook.id === 'review-stack') || null;
  }

  if (haystack.includes('verification evidence') || haystack.includes('completion gate')) {
    return missionPlaybooks.find((playbook) => playbook.id === 'verify-before-close') || null;
  }

  return missionPlaybooks.find((playbook) => playbook.id === state.selectedPlaybookId) || null;
}

function wirePlaybookSelectionButtons() {
  elements.playbookList.querySelectorAll('[data-playbook-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const playbook = missionPlaybooks.find((entry) => entry.id === button.dataset.playbookId);
      if (!playbook) {
        return;
      }
      state.selectedPlaybookId = playbook.id;
      renderPlaybooks();
      elements.missionForm.elements.mode.value = playbook.values.mode;
      elements.missionForm.elements.deliverableType.value = playbook.values.deliverableType;
      elements.missionForm.elements.title.value = playbook.values.title;
      elements.missionForm.elements.objective.value = playbook.values.objective;
      elements.missionForm.elements.constraints.value = playbook.values.constraints;
      renderAgentBlueprintBuilder();
      openComposer();
    });
  });
}

function renderPlaybooks() {
  elements.playbookList.innerHTML = missionPlaybooks
    .map((playbook) => renderPlaybookCardButton({ playbook, active: playbook.id === state.selectedPlaybookId }))
    .join('');

  wirePlaybookSelectionButtons();
}

function applyTemplate(index) {
  const template = missionTemplates[index];
  if (!template) {
    return;
  }

  const fields = template.values;
  elements.missionForm.elements.mode.value = fields.mode;
  elements.missionForm.elements.deliverableType.value = fields.deliverableType;
  elements.missionForm.elements.title.value = fields.title;
  elements.missionForm.elements.objective.value = fields.objective;
  elements.missionForm.elements.constraints.value = fields.constraints;
  renderAgentBlueprintBuilder();
  openComposer();
}

function renderAgentBlueprintBuilder() {
  if (!elements.agentBlueprintBuilder) {
    return;
  }

  const mode = getMissionFormMode();
  const catalog = getAgentBlueprintCatalog(mode);
  const intentCatalog = getAgentIntentCatalog(mode);
  const selectedBlueprint = getSelectedAgentBlueprint(mode);
  const pendingAttachmentCount = Number(elements.missionAttachmentInput?.files?.length || 0);
  const selectedMissionLearning = state.missionDetail?.mission?.id === state.selectedMissionId ? state.missionDetail : null;
  const learningSummary = selectedMissionLearning?.harness || null;
  const retrievalPreview = learningSummary?.retrieval || null;
  const retrievalPreviewItems = retrievalPreview?.previewItems || [];
  const retrievalRolePreview = retrievalPreview?.roles || [];
  const missionMemoryCount = Number(learningSummary?.memory?.missionCounts?.total || 0);
  const workspaceMemoryCount = Number(learningSummary?.memory?.workspaceCount || 0);
  const attachmentCount = selectedMissionLearning
    ? Number(learningSummary?.attachments?.summary?.total || 0)
    : pendingAttachmentCount;
  const qualityGateCopy = selectedBlueprint?.specialistKinds?.includes('verification')
    ? '검증 AI 신호를 품질 게이트에 반영합니다.'
    : selectedBlueprint?.specialistKinds?.includes('research')
      ? '리서치 AI 신호를 실행 전 근거 기준으로 반영합니다.'
      : '기본 4-agent 흐름으로 manager → planner → executor → reviewer만 사용합니다.';
  const learningReadiness = attachmentCount + missionMemoryCount + workspaceMemoryCount;

  elements.agentBlueprintBuilder.innerHTML = `
    <div class="agent-blueprint-shell">
      <div class="agent-blueprint-steps">
        <div class="agent-blueprint-step">
          <span class="agent-blueprint-step-index">01</span>
          <div>
            <strong>작업 모드 선택</strong>
            <p>${escapeHtml(mode === 'engineering' ? '엔지니어링 작업 기준으로 AI 구성을 추천합니다.' : '지식 작업 기준으로 AI 구성을 추천합니다.')}</p>
          </div>
        </div>
        <div class="agent-blueprint-step">
          <span class="agent-blueprint-step-index">02</span>
          <div>
            <strong>AI 카드 고르기</strong>
            <p>카드를 누르면 필요한 specialist와 orchestration directive가 자동으로 연결됩니다.</p>
          </div>
        </div>
        <div class="agent-blueprint-step">
          <span class="agent-blueprint-step-index">03</span>
          <div>
            <strong>읽힐 자료 넣기</strong>
            <p>첨부 파일과 메모가 다음 실행 prompt와 retrieval context에 들어가 AI가 같은 맥락으로 이어서 작업합니다.</p>
          </div>
        </div>
      </div>

      <div class="agent-intent-strip">
        ${intentCatalog
          .map((intent) => {
            const active = intent.blueprintId === selectedBlueprint?.id;
            return renderAgentIntentPillButton({ intent, active });
          })
          .join('')}
      </div>

      <div class="agent-blueprint-hero">
        <div class="agent-blueprint-hero-copy">
          <span class="section-kicker">AI를 어떻게 추가하나</span>
          <h4>${escapeHtml(mode === 'engineering' ? '엔지니어링 AI 조합 선택' : '지식 작업 AI 조합 선택')}</h4>
          <p>${escapeHtml('카드를 고르면 specialist AI 구성이 mission constraint에 자동 반영됩니다. 별도 directive를 외울 필요가 없습니다.')}</p>
          <div class="agent-blueprint-current">
            <span class="mini-badge">${escapeHtml(selectedBlueprint?.emphasis || '기본 구성')}</span>
            <strong>${escapeHtml(selectedBlueprint?.title || 'Core 4')}</strong>
            <p>${escapeHtml(selectedBlueprint?.bestFor || '기본 4-agent 흐름으로 빠르게 시작합니다.')}</p>
          </div>
        </div>
        <div class="agent-blueprint-hero-stats">
          <div class="summary-chip summary-chip-strong">
            <span>현재 선택</span>
            <strong>${escapeHtml(selectedBlueprint?.title || 'Core 4')}</strong>
          </div>
          <div class="summary-chip">
            <span>추가 AI</span>
            <strong>${escapeHtml(String(selectedBlueprint?.specialistKinds?.length || 0))}개</strong>
          </div>
          <div class="summary-chip">
            <span>AI가 읽는 자료</span>
            <strong>${escapeHtml(String(attachmentCount))}개 파일</strong>
          </div>
          <div class="summary-chip summary-chip-soft">
            <span>선택 결과</span>
            <strong>${escapeHtml(selectedBlueprint?.outcome || '기본 실행 제안을 받습니다.')}</strong>
          </div>
        </div>
      </div>

      <section class="loop-engineering-panel" data-loop-engineering-panel="true">
        <div class="loop-engineering-head">
          <div>
            <p class="section-kicker">Loop Engineering</p>
            <h4>프롬프트가 아니라 검증 루프를 설계합니다</h4>
          </div>
          <span class="mini-badge status-completed">closed-loop default</span>
        </div>
        <p class="loop-engineering-copy">
          ${escapeHtml('OpenClaw식 backbone이 session, workspace, permission, sandbox, provider routing을 고정하고 Hermes식 engine이 memory, skill, template, provider lesson 후보를 승인/검증 뒤에만 반영합니다. Harness Engineering guardrails가 query heartbeat, context budget, recovery, independent verification을 보호합니다.')}
        </p>
        <div class="loop-engineering-cycle">
          ${renderLoopEngineeringCycleList()}
        </div>
        <div class="harness-guardrail-grid">
          ${renderHarnessEngineeringGuardrails()}
        </div>
        <div class="loop-engineering-foundations">
          <span class="summary-label">운영 기반</span>
          <div class="tag-list">
            ${renderLoopEngineeringFoundationTags()}
          </div>
        </div>
      </section>

      <div class="agent-blueprint-grid">
        ${catalog
          .map((blueprint) =>
            renderAgentBlueprintCardButton({ blueprint, active: blueprint.id === selectedBlueprint?.id }),
          )
          .join('')}
      </div>

      <div class="agent-blueprint-preview-grid">
        <section class="agent-blueprint-preview">
          <div class="mini-head">
            <div>
              <p class="section-kicker">선택하면 추가되는 AI</p>
              <h4>${escapeHtml(selectedBlueprint?.title || 'Core 4')}</h4>
            </div>
          </div>
          <div class="agent-role-strip">
            <span class="tag">매니저</span>
            <span class="tag">플래너</span>
            <span class="tag">실행</span>
            <span class="tag">리뷰어</span>
            ${selectedBlueprint?.specialistKinds?.map((kind) => `<span class="tag tag-accent">${escapeHtml(formatSpecialistShortLabel(kind))}</span>`).join('') || ''}
          </div>
          <div class="agent-function-list">
            ${selectedBlueprint?.specialistKinds?.length
              ? selectedBlueprint.specialistKinds
                  .map((kind) => {
                    const meta = SPECIALIST_KIND_META[kind];
                    return `
                      <div class="agent-function-row">
                        <span class="agent-function-badge">${escapeHtml(meta?.badge || kind.slice(0, 3).toUpperCase())}</span>
                        <div>
                          <strong>${escapeHtml(meta?.label || kind)}</strong>
                          <p>${escapeHtml(meta?.description || getDisplayLabel(kind, kind))}</p>
                        </div>
                      </div>
                    `;
                  })
                  .join('')
              : `<div class="agent-function-row">
                   <span class="agent-function-badge">CORE</span>
                   <div>
                     <strong>기본 4-agent</strong>
                     <p>추가 specialist 없이 manager → planner → executor → reviewer 흐름으로 실행합니다.</p>
                   </div>
                 </div>`}
          </div>
          <div class="agent-blueprint-footer">
            <span class="mini-badge">${escapeHtml(selectedBlueprint?.directive || '추가 directive 없음')}</span>
            ${
              selectedBlueprint?.recommendedProvider
                ? `<span class="mini-badge status-completed">${escapeHtml(`provider:${selectedBlueprint.recommendedProvider}`)}</span>`
                : ''
            }
            <span class="item-meta">${escapeHtml(qualityGateCopy)}</span>
          </div>
        </section>

        <section class="agent-learning-panel">
          <div class="mini-head">
            <div>
              <p class="section-kicker">AI가 지금 읽는 자료</p>
              <h4>현재는 지식 주입 + retrieval memory</h4>
            </div>
          </div>
          <div class="agent-learning-summary">
            <div class="summary-chip">
              <span>첨부 파일</span>
              <strong>${escapeHtml(String(attachmentCount))}개</strong>
            </div>
            <div class="summary-chip">
              <span>미션 메모</span>
              <strong>${escapeHtml(String(missionMemoryCount))}개</strong>
            </div>
            <div class="summary-chip">
              <span>워크스페이스 메모</span>
              <strong>${escapeHtml(String(workspaceMemoryCount))}개</strong>
            </div>
            <div class="summary-chip ${learningReadiness ? 'summary-chip-strong' : 'summary-chip-soft'}">
              <span>readiness</span>
              <strong>${escapeHtml(learningReadiness ? 'retrieval-ready' : '아직 읽을 자료 없음')}</strong>
            </div>
          </div>
          <div class="agent-learning-capability-list">
            <div class="agent-learning-capability is-ready">
              <strong>지금 되는 것</strong>
              <p>텍스트 첨부, 미션 메모, 워크스페이스 메모는 다음 run prompt와 rerun context에 반영되고, retrieval memory가 역할별로 중요한 snippet을 먼저 올립니다.</p>
            </div>
            <div class="agent-learning-capability is-ready">
              <strong>입력 방법</strong>
              <p>미션 생성 시 텍스트 파일을 첨부하고, 실행 후에는 하네스 탭에서 미션/워크스페이스 메모를 누적하면 됩니다.</p>
            </div>
            <div class="agent-learning-capability is-blocked">
              <strong>아직 없는 것</strong>
              <p>모델 fine-tuning, OCR, binary 파일 이해, vector retrieval index는 아직 붙어 있지 않습니다. 현재 retrieval은 text-first lexical memory입니다.</p>
            </div>
          </div>
          <div class="agent-learning-preview">
            <div class="harness-filter-row">
              <p class="summary-label">다음 실행 retrieval preview</p>
              <span class="item-meta">snippet ${escapeHtml(String(retrievalPreview?.summary?.snippetCount || 0))}개 · 메모 ${escapeHtml(String(retrievalPreview?.summary?.memorySourceCount || 0))} · 첨부 ${escapeHtml(String(retrievalPreview?.summary?.attachmentSourceCount || 0))}</span>
            </div>
            ${
              retrievalRolePreview.length
                ? `<div class="tag-list">
                    ${retrievalRolePreview
                      .map(
                        (entry) =>
                          `<span class="tag tag-muted">${escapeHtml(entry.label)} · ${escapeHtml(String(entry.itemCount || 0))}</span>`,
                      )
                      .join('')}
                  </div>`
                : ''
            }
            ${renderRetrievalCompareCallout(retrievalPreview)}
            ${
              retrievalPreviewItems.length
                ? `<div class="agent-retrieval-list">
                    ${retrievalPreviewItems
                      .map(
                        (item) => `
                          <div class="agent-retrieval-row">
                            <div class="agent-retrieval-meta">
                              <strong>${escapeHtml(formatRetrievalSourceLabel(item))}</strong>
                              <span>${escapeHtml((item.roles || []).join(', ') || '-')}</span>
                              <span>${escapeHtml(item.retrievalReason || `score ${item.score ?? '-'}`)}</span>
                            </div>
                            <p>${escapeHtml(summarizeRetrievalSnippet(item.snippet, '-'))}</p>
                          </div>
                        `,
                      )
                      .join('')}
                  </div>`
                : `<div class="agent-learning-capability">
                    <strong>retrieval preview 비어 있음</strong>
                    <p>미션 첨부나 메모를 추가하면 다음 실행 전에 어떤 snippet이 먼저 올라가는지 여기서 바로 확인할 수 있습니다.</p>
                  </div>`
            }
          </div>
        </section>
      </div>
    </div>
  `;
  wireQuickActions(elements.agentBlueprintBuilder);
  wireRetrievalSourceButtons(elements.agentBlueprintBuilder);
  wireAgentBlueprintSelectionButtons(mode);
}

function wireAgentBlueprintSelectionButtons(mode) {
  elements.agentBlueprintBuilder.querySelectorAll('[data-agent-blueprint-id]').forEach((button) => {
    button.addEventListener('click', () => {
      setSelectedAgentBlueprint(String(button.dataset.agentBlueprintId || '').trim(), mode);
    });
  });
}

function buildProviderEventFilterParams() {
  const params = new URLSearchParams({ family: 'fallback' });
  const fallbackPolicy = String(state.providerEventFallbackPolicyFilter || '').trim();
  const fallbackStopReason = String(state.providerEventFallbackStopReasonFilter || '').trim();

  if (fallbackPolicy) {
    params.set('fallbackPolicy', fallbackPolicy);
  }
  if (fallbackStopReason) {
    params.set('fallbackStopReason', fallbackStopReason);
  }

  return params;
}

function renderProviderFallbackEventSelectOptions(options = [], selectedValue = '', fallbackLabel = '전체') {
  const selected = String(selectedValue || '').trim();
  return options
    .map((value) => {
      const normalizedValue = String(value || '').trim();
      const label = normalizedValue ? getDisplayLabel(normalizedValue, normalizedValue) : fallbackLabel;
      return `<option value="${escapeHtml(normalizedValue)}" ${normalizedValue === selected ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    })
    .join('');
}

function renderProviderFallbackEventCountChips(counts = {}, marker = '') {
  const entries = getReleaseCountRecordEntries(counts);
  if (!entries.length) {
    return '<span class="filter-chip"><em>count</em><strong>없음</strong></span>';
  }
  return entries
    .map(
      ([key, value]) => `
        <span class="filter-chip" ${marker ? `${marker}="${escapeHtml(key)}"` : ''}>
          <em>${escapeHtml(getDisplayLabel(key, key))}</em>
          <strong>${escapeHtml(String(value))}</strong>
        </span>
      `,
    )
    .join('');
}

function renderProviderFallbackEventListEmptyState() {
  return '<div class="empty-state">현재 필터에 해당하는 fallback event가 없습니다.</div>';
}

function buildProviderFallbackEventAuditCommand({
  fallbackPolicy = state.providerEventFallbackPolicyFilter,
  fallbackStopReason = state.providerEventFallbackStopReasonFilter,
} = {}) {
  const parts = ['node src/cli.mjs provider events --family fallback'];
  const normalizedPolicy = String(fallbackPolicy || '').trim();
  const normalizedStopReason = String(fallbackStopReason || '').trim();
  if (normalizedPolicy) {
    parts.push(`--fallback-policy ${normalizedPolicy}`);
  }
  if (normalizedStopReason) {
    parts.push(`--fallback-stop-reason ${normalizedStopReason}`);
  }
  return parts.join(' ');
}

function buildProviderFallbackEventAuditPackageText(payload = state.providerEvents) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const summary = payload.summary || {};
  const filters = payload.filters || {};
  const fallbackPolicy = String(filters.fallbackPolicy || state.providerEventFallbackPolicyFilter || '').trim();
  const fallbackStopReason = String(
    filters.fallbackStopReason || state.providerEventFallbackStopReasonFilter || '',
  ).trim();
  const timeline = Array.isArray(payload.timeline) ? payload.timeline : [];
  const latestEvents = timeline.slice().reverse().slice(0, 5);
  const latestEventLines = latestEvents.length
    ? latestEvents.map(
        (event, index) =>
          `- ${index + 1}. ${event.kind || event.eventKind || 'fallback-event'} | at=${event.at || '-'} | provider=${event.providerId || '-'} | primary=${event.primaryProviderId || '-'} | policy=${event.fallbackPolicy || '-'} | stopReason=${event.fallbackStopReason || '-'} | mission=${event.missionId || '-'}`,
      )
    : ['- none'];

  return [
    'Provider fallback event audit package',
    '',
    'Scope:',
    '- Source: /api/providers/events?family=fallback',
    '- Purpose: target provider operations fallback runtime audit handoff',
    '- This package is audit evidence only and does not change production readiness.',
    '',
    'Filters:',
    `- fallbackPolicy: ${fallbackPolicy || 'all'}`,
    `- fallbackStopReason: ${fallbackStopReason || 'all'}`,
    '',
    'Summary:',
    `- total events: ${summary.total ?? 0}`,
    `- fallback events: ${summary.familyCounts?.fallback ?? summary.total ?? 0}`,
    '',
    'Fallback policy counts:',
    ...formatProviderFallbackEventCountLines(summary.fallbackPolicyCounts, 'no fallback policy counts'),
    '',
    'Fallback stop reason counts:',
    ...formatProviderFallbackEventCountLines(summary.fallbackStopReasonCounts, 'no fallback stop reason counts'),
    '',
    'Latest fallback events:',
    ...latestEventLines,
    '',
    'Verification commands:',
    `- ${buildProviderFallbackEventAuditCommand({ fallbackPolicy, fallbackStopReason })}`,
    '- npm run smoke:provider-fallback-policy',
    '- npm run smoke:provider-events',
    '- npm run smoke:provider-attention-remediation',
    '- npm run smoke:ui-harness-browse',
    '',
    'Production readiness boundary:',
    '- productionReadyClaim must remain false until target provider operations evidence records provider account or architecture approval proof, target secret injection proof, target-boundary live validation proof, model and endpoint pinning proof, quota, cost, and resource guard proof, fallback and disable path proof, provider fallback runtime audit proof, provider telemetry proof, incident triage proof, data and transcript handling proof, remediation and renewal review proof, evidence retention proof, provider failure containment evidence, release artifact hygiene result, and refreshed execution-v1 snapshot evidence from the same approved target boundary.',
    '- provider fallback runtime audit proof must include mission run --fallback-provider --fallback-policy, mission timeline, workspace timeline, overview operator-timeline, provider events --family fallback, action remediate-provider-attention --fallback-provider --fallback-policy, selected fallback provider, fallback policy id, fallback stop reason, non-provider-failure stop condition, non-recoverable provider failure stop condition, event family, and operator chronology evidence.',
    '- recoverable-provider-failure-only stops non-recoverable provider failures instead of silently failing over, and the stop reason must remain visible in provider events plus mission, workspace, and operator timelines.',
  ].join('\n');
}

function renderProviderFallbackEventAudit() {
  const payload = state.providerEvents || null;
  const summary = payload?.summary || {};
  const filters = payload?.filters || {};
  const timeline = Array.isArray(payload?.timeline) ? payload.timeline : [];
  const latestEvents = timeline.slice().reverse().slice(0, 5);
  const filtered = Boolean(state.providerEventFallbackPolicyFilter || state.providerEventFallbackStopReasonFilter);
  const fallbackPolicyFilterLabel = state.providerEventFallbackPolicyFilter
    ? `fallback policy 필터 변경: 현재 ${state.providerEventFallbackPolicyFilter}`
    : 'fallback policy 필터 선택: 모든 fallback policy';
  const fallbackStopReasonFilterLabel = state.providerEventFallbackStopReasonFilter
    ? `fallback stop reason 필터 변경: 현재 ${state.providerEventFallbackStopReasonFilter}`
    : 'fallback stop reason 필터 선택: 모든 stop reason';
  const fallbackEventFilterSummary = [
    state.providerEventFallbackPolicyFilter ? `policy ${state.providerEventFallbackPolicyFilter}` : '',
    state.providerEventFallbackStopReasonFilter ? `stop reason ${state.providerEventFallbackStopReasonFilter}` : '',
  ]
    .filter(Boolean)
    .join(', ');
  const fallbackEventResetLabel = filtered
    ? `provider fallback event 필터 초기화: ${fallbackEventFilterSummary}`
    : 'provider fallback event 필터 초기화: 적용된 필터 없음';
  const fallbackEventPackageLabel = filtered
    ? `provider fallback event audit package 복사: ${fallbackEventFilterSummary}`
    : 'provider fallback event audit package 복사: 전체 fallback events';

  return `
    <section class="provider-item provider-event-audit" data-provider-fallback-event-audit="true">
      <div class="status-row">
        <span class="status-badge status-running">fallback audit</span>
        <span class="mini-badge ${filtered ? 'status-awaiting-approval' : 'status-completed'}">${escapeHtml(
          filtered ? '필터 적용' : '전체 fallback',
        )}</span>
      </div>
      <div class="item-title">Provider fallback event audit</div>
      <div class="item-meta">policy와 stop reason 기준으로 target provider operations의 fallback runtime audit 근거를 확인합니다.</div>
      <div class="dispatch-controls provider-event-filter-controls">
        <select data-provider-fallback-event-policy-filter="true" aria-label="${escapeHtml(fallbackPolicyFilterLabel)}" title="${escapeHtml(fallbackPolicyFilterLabel)}">
          ${renderProviderFallbackEventSelectOptions(
            PROVIDER_FALLBACK_POLICY_FILTER_OPTIONS,
            state.providerEventFallbackPolicyFilter,
            '모든 fallback policy',
          )}
        </select>
        <select data-provider-fallback-event-stop-filter="true" aria-label="${escapeHtml(fallbackStopReasonFilterLabel)}" title="${escapeHtml(fallbackStopReasonFilterLabel)}">
          ${renderProviderFallbackEventSelectOptions(
            PROVIDER_FALLBACK_STOP_REASON_FILTER_OPTIONS,
            state.providerEventFallbackStopReasonFilter,
            '모든 stop reason',
          )}
        </select>
        ${renderProviderFallbackEventActionButton({
          action: 'reset',
          actionLabel: fallbackEventResetLabel,
          buttonText: '필터 초기화',
        })}
        ${renderProviderFallbackEventActionButton({
          action: 'package',
          actionLabel: fallbackEventPackageLabel,
          buttonText: 'audit package 복사',
          className: 'secondary-button',
        })}
      </div>
      <div class="quick-actions provider-event-counts">
        <div class="summary-chip" data-provider-fallback-event-total="true">
          <span>fallback events</span>
          <strong>${escapeHtml(String(summary.familyCounts?.fallback ?? summary.total ?? 0))}</strong>
        </div>
        <div class="summary-chip">
          <span>policy filter</span>
          <strong>${escapeHtml(filters.fallbackPolicy || 'all')}</strong>
        </div>
        <div class="summary-chip">
          <span>stop filter</span>
          <strong>${escapeHtml(filters.fallbackStopReason || 'all')}</strong>
        </div>
      </div>
      <div class="release-history-filter-chips">
        ${renderProviderFallbackEventCountChips(
          summary.fallbackPolicyCounts,
          'data-provider-fallback-policy-count',
        )}
      </div>
      <div class="release-history-filter-chips">
        ${renderProviderFallbackEventCountChips(
          summary.fallbackStopReasonCounts,
          'data-provider-fallback-stop-reason-count',
        )}
      </div>
      ${
        latestEvents.length
          ? `<div class="provider-event-list">
              ${latestEvents
                .map(
                  (event) => `
                    <article class="provider-event-row" data-provider-fallback-event-row="${escapeHtml(event.eventKind || event.kind || '')}">
                      <div class="status-row">
                        <span class="mini-badge ${event.kind === 'provider-fallback-used' ? 'status-completed' : 'status-pending'}">${escapeHtml(getDisplayLabel(event.kind || event.eventKind, event.kind || event.eventKind || 'event'))}</span>
                        <span class="mini-badge status-running">${escapeHtml(getDisplayLabel(event.fallbackPolicy, event.fallbackPolicy || '-'))}</span>
                      </div>
                      <div class="item-title">${escapeHtml(event.primaryProviderId || event.providerId || 'provider')} → ${escapeHtml(event.providerId || '-')}</div>
                      <div class="item-meta">${escapeHtml(event.missionTitle || event.missionId || '-')} · ${escapeHtml(formatDate(event.at))}</div>
                      <div class="item-meta mono">stopReason=${escapeHtml(event.fallbackStopReason || '-')}</div>
                    </article>
                  `,
                )
                .join('')}
            </div>`
          : renderProviderFallbackEventListEmptyState()
      }
    </section>
  `;
}

function wireProviderFallbackEventAuditControls() {
  const policyFilter = elements.providerList.querySelector('[data-provider-fallback-event-policy-filter]');
  const stopFilter = elements.providerList.querySelector('[data-provider-fallback-event-stop-filter]');
  const resetButton = elements.providerList.querySelector('[data-provider-fallback-event-reset]');
  const packageButton = elements.providerList.querySelector('[data-provider-fallback-event-package]');

  policyFilter?.addEventListener('change', async (event) => {
    state.providerEventFallbackPolicyFilter = String(event.target.value || '').trim();
    await loadProviderEvents();
  });
  stopFilter?.addEventListener('change', async (event) => {
    state.providerEventFallbackStopReasonFilter = String(event.target.value || '').trim();
    await loadProviderEvents();
  });
  resetButton?.addEventListener('click', async () => {
    state.providerEventFallbackPolicyFilter = '';
    state.providerEventFallbackStopReasonFilter = '';
    await loadProviderEvents();
  });
  packageButton?.addEventListener('click', () => {
    void copyProviderFallbackEventAuditPackage();
  });
}

function renderProviderListEmptyState() {
  return emptyStateCard({
    action: 'open-create',
    actionLabel: '미션부터 시작',
    icon: 'API',
    message: '제공자 목록이 비어 있으면 먼저 로컬 워크스페이스와 미션 흐름부터 확인하세요.',
    title: '표시할 제공자 정보가 없습니다',
  });
}

function renderProviders() {
  const providerCards = state.providers
    .map((provider) => {
      const configured = Boolean(provider.configured);
      return `
        <div class="provider-item">
          <div class="status-row">
            <span class="status-badge ${configured ? 'status-configured' : 'status-env-missing'}">${escapeHtml(
              configured ? '설정 완료' : '환경 변수 누락',
            )}</span>
            ${provider.defaultProvider ? '<span class="mini-badge status-awaiting-approval">기본값</span>' : ''}
          </div>
          <div class="item-title">${escapeHtml(provider.displayName || provider.id)}</div>
          <div class="item-meta mono">${escapeHtml(provider.id)}</div>
          <div class="item-meta">${escapeHtml(provider.transport || '')}</div>
          ${
            provider.missingEnv?.length
              ? `<div class="item-meta">누락 환경 변수: ${escapeHtml(provider.missingEnv.join(', '))}</div>`
              : ''
          }
        </div>
      `;
    })
    .join('');

  elements.providerList.innerHTML =
    `${renderProviderFallbackEventAudit()}${providerCards}` || renderProviderListEmptyState();
  wireProviderFallbackEventAuditControls();
  wireQuickActions(elements.providerList);
}

export function filteredMissions() {
  const workspaceId = getSelectedWorkspaceId();
  const keyword = String(elements.missionFilter.value || '').trim().toLowerCase();
  return state.missions.filter(({ mission, latestSession, workspace }) => {
    if (workspaceId && mission.workspaceId !== workspaceId) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    const haystack = [
      mission.title,
      mission.objective,
      mission.status,
      mission.mode,
      latestSession?.status,
      latestSession?.provider,
      workspace?.name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(keyword);
  });
}

function getMissionQueueSnapshot(mission, latestSession) {
  if (!latestSession) {
    return {
      nextAction: '다음: 제공자를 고르고 첫 실행 시작',
      stage: '1단계 · 실행 준비',
      status: getDisplayLabel(mission.status, mission.status),
    };
  }

  if (latestSession.status === 'failed') {
    return {
      nextAction: '다음: 실행 오류 확인 후 다시 실행',
      stage: '2단계 · 실행 점검',
      status: '실행 실패',
    };
  }

  if (mission.status === 'awaiting_approval' || latestSession.currentStage === 'reviewer') {
    return {
      nextAction: '다음: 승인 또는 후속 작업 처리',
      stage: '3단계 · 검토',
      status: getDisplayLabel(mission.status, mission.status),
    };
  }

  if (mission.status === 'completed' || latestSession.status === 'completed') {
    return {
      nextAction: '다음: 결과물과 실행 기록 확인',
      stage: '4단계 · 결과 확인',
      status: '완료',
    };
  }

  return {
    nextAction: '다음: 진행 상태 확인',
    stage: '2단계 · 실행 중',
    status: getDisplayLabel(latestSession.status, latestSession.status),
  };
}

export function getSelectedMissionRecord() {
  if (!state.selectedMissionId) {
    return null;
  }

  return state.missions.find(({ mission }) => mission.id === state.selectedMissionId) || null;
}

function wireMissionListSelectionButtons() {
  elements.missionList.querySelectorAll('[data-mission-id]').forEach((button) => {
    button.addEventListener('click', () => selectMission(button.dataset.missionId, { urlMode: 'push' }));
  });
}

function renderMissionListFilteredEmptyState() {
  return emptyStateCard({
    action: 'clear-filter',
    actionLabel: '필터 초기화',
    icon: 'FL',
    message: '현재 필터나 워크스페이스 범위에서 보이는 미션이 없습니다.',
    title: '조건에 맞는 미션이 없습니다',
  });
}

function renderMissionListUncreatedEmptyState() {
  return emptyStateCard({
    action: 'open-create',
    actionLabel: '첫 미션 만들기',
    icon: 'GO',
    message: '템플릿을 선택하거나 목표와 제약 조건을 직접 적어서 첫 실행 흐름을 만들어보세요.',
    title: '아직 생성된 미션이 없습니다',
  });
}

export function renderMissionList() {
  const missions = filteredMissions();
  const selectedFlow =
    state.selectedMissionId && state.missionDetail?.mission?.id === state.selectedMissionId ? getFlowState() : null;
  renderWorkspaceCurrent();
  renderMissionQueueSummary(missions);
  if (!missions.length) {
    elements.missionList.innerHTML = state.missions.length
      ? renderMissionListFilteredEmptyState()
      : renderMissionListUncreatedEmptyState();
    wireQuickActions(elements.missionList);
    return;
  }

  elements.missionList.innerHTML = missions
    .map(({ mission, latestSession, workspace }) => {
      const active = mission.id === state.selectedMissionId ? 'is-active' : '';
      const snapshot = getMissionQueueSnapshot(mission, latestSession);
      const activeStageLabel = active && selectedFlow ? getStepLabel(state.activeStep) : snapshot.stage;
      const providerLabel = latestSession?.provider || '미정';
      const providerUiLabel = getDisplayLabel(providerLabel, providerLabel);
      const updatedLabel = formatDate(mission.updatedAt);
      const workspaceLabel = workspace?.name || mission.workspaceId;
      const contextLabel = `${getDisplayLabel(mission.mode, mission.mode)} · ${providerUiLabel}`;
      const summary = summarizeText(
        mission.objective,
        latestSession?.reviewerSummary || snapshot.nextAction.replace(/^다음:\s*/, ''),
      );
      const missionSelectionLabel = active
        ? `현재 미션 선택됨: ${mission.title} · ${snapshot.stage}`
        : `미션 선택: ${mission.title} · ${snapshot.stage}`;
      const showExpandedAction = active;
      return `
        <div class="mission-row ${active}">
          ${renderMissionSelectionButton({
            active,
            mission,
            missionSelectionLabel,
            content: `
            <div class="mission-row-topline">
              <div class="mission-row-topline-main">
                <span class="mission-row-stage">${escapeHtml(snapshot.stage)}</span>
                ${active ? '<span class="mission-row-focus">현재 작업 중</span>' : ''}
              </div>
              <span class="mission-row-updated">${escapeHtml(updatedLabel)}</span>
            </div>
            <div class="mission-row-head">
              <div class="mission-row-main">
                <div class="item-title">${escapeHtml(mission.title)}</div>
                <div class="mission-row-summary">${escapeHtml(summary)}</div>
              </div>
              <div class="mission-row-state">
                <span class="status-badge ${getStatusClass(mission.status)}">${escapeHtml(snapshot.status)}</span>
                ${
                  latestSession
                    ? `<span class="mini-badge ${getStatusClass(providerLabel)}">${escapeHtml(providerUiLabel)}</span>`
                    : ''
                }
              </div>
            </div>
            ${
              showExpandedAction
                ? `
                  <div class="mission-next-action">
                    <span class="mission-next-label">다음 액션</span>
                    <strong>${escapeHtml(snapshot.nextAction.replace(/^다음:\s*/, ''))}</strong>
                  </div>
                `
                : ''
            }
            ${
              active
                ? `
                  <div class="mission-row-focusline">
                    <span>현재 작업판</span>
                    <strong>${escapeHtml(activeStageLabel)}</strong>
                  </div>
                `
                : ''
            }
            <div class="mission-row-foot">
              <span>${escapeHtml(workspaceLabel)}</span>
              <span>${escapeHtml(contextLabel)}</span>
            </div>
            `,
          })}
        </div>
      `;
    })
    .join('');

  wireMissionListSelectionButtons();
}

function renderMissionQueueSummary(missions = filteredMissions()) {
  if (!elements.missionQueueSummary) {
    return;
  }

  if (!missions.length) {
    elements.missionQueueSummary.innerHTML = `
      <div class="queue-pill"><span>표시 중</span><strong>0개</strong></div>
      <div class="queue-pill"><span>검토 필요</span><strong>0개</strong></div>
      <div class="queue-pill"><span>완료</span><strong>0개</strong></div>
    `;
    return;
  }

  const reviewNeeded = missions.filter(({ mission, latestSession }) => {
    return mission.status === 'awaiting_approval' || latestSession?.currentStage === 'reviewer';
  }).length;
  const completed = missions.filter(({ mission, latestSession }) => {
    return mission.status === 'completed' || latestSession?.status === 'completed';
  }).length;

  elements.missionQueueSummary.innerHTML = `
    <div class="queue-pill"><span>표시 중</span><strong>${escapeHtml(String(missions.length))}개</strong></div>
    <div class="queue-pill"><span>검토 필요</span><strong>${escapeHtml(String(reviewNeeded))}개</strong></div>
    <div class="queue-pill"><span>완료</span><strong>${escapeHtml(String(completed))}개</strong></div>
  `;
}

function renderDetailTabLabels() {
  const detailTabMeta = getDetailTabMeta();
  detailTabMeta.tabs.forEach((tab) => {
    tab.button.textContent = tab.label;
    tab.button.classList.toggle('is-primary', tab.isPrimary);
    tab.button.classList.toggle('is-secondary', tab.isSecondary);
    tab.button.classList.toggle(
      'is-collapsed',
      tab.shouldCollapse,
    );
  });
}

function renderHeroMetrics() {
  const runtimeJobs = state.runtimeJobs?.jobs || {};
  const runtimeRequests = state.runtimeRequests?.requests || {};
  const runtimeJobMetric = [
    'Runtime jobs',
    `active ${Number(runtimeJobs.activeCount || 0)} · recent ${Number(runtimeJobs.recentCount || 0)}`,
  ];
  const runtimeRequestMetric = [
    'Runtime requests',
    `active ${Number(runtimeRequests.activeCount || 0)} · recent ${Number(runtimeRequests.recentCount || 0)}`,
  ];

  if (!state.missionDetail) {
    elements.heroMetrics.innerHTML = `
      <div class="metric-card">
        <span>현재 단계</span>
        <strong>1단계 · 미션 정하기</strong>
      </div>
      <div class="metric-card">
        <span>검토와 후속</span>
        <strong>승인 0건 · 후속 0건</strong>
      </div>
      <div class="metric-card">
        <span>최근 실행</span>
        <strong>아직 실행 전</strong>
      </div>
      <div class="metric-card" data-runtime-request-metric="true">
        <span>${escapeHtml(runtimeRequestMetric[0])}</span>
        <strong>${escapeHtml(runtimeRequestMetric[1])}</strong>
      </div>
      <div class="metric-card" data-runtime-job-metric="true">
        <span>${escapeHtml(runtimeJobMetric[0])}</span>
        <strong>${escapeHtml(runtimeJobMetric[1])}</strong>
      </div>
    `;
    return;
  }

  const summary = state.missionDetail.summary || {};
  const latestSession = summary.latestSession || {};
  const flow = getFlowState();
  const actionSummary = state.missionActions?.summary || {};
  const metrics =
    state.activeStep === 'step-output'
      ? [
          ['현재 단계', flow.currentStepLabel],
          ['최근 실행', latestSession ? `${latestSession.provider || '-'} · ${getDisplayLabel(latestSession.status)}` : '아직 실행 전'],
          [
            '검토 상태',
            summary.approvalCounts?.pending
              ? `승인 ${summary.approvalCounts.pending}건 대기`
              : actionSummary.pendingActionCount
                ? `후속 ${actionSummary.pendingActionCount}건 남음`
                : '정리 완료',
          ],
          runtimeRequestMetric,
          runtimeJobMetric,
        ]
      : [
          ['현재 단계', flow.currentStepLabel],
          ['검토와 후속', `승인 ${summary.approvalCounts?.pending ?? 0}건 · 후속 ${actionSummary.pendingActionCount ?? 0}건`],
          ['최근 실행', latestSession ? `${latestSession.provider || '-'} · ${getDisplayLabel(latestSession.status)}` : '아직 실행 전'],
          runtimeRequestMetric,
          runtimeJobMetric,
        ];

  elements.heroMetrics.innerHTML = metrics
    .map(
      ([label, value]) => `
        <div class="metric-card"${label === 'Runtime requests' ? ' data-runtime-request-metric="true"' : label === 'Runtime jobs' ? ' data-runtime-job-metric="true"' : ''}>
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `,
    )
    .join('');
}

function renderHeroSignals() {
  if (!state.missionDetail) {
    elements.heroSignals.innerHTML = `
      <span class="hero-signal">상태 없음</span>
      <span class="hero-signal">실행 전</span>
      <span class="hero-signal">결과 없음</span>
    `;
    return;
  }

  const mission = state.missionDetail.mission;
  const playbook = inferPlaybook(mission);
  const latestSession = state.missionDetail.summary?.latestSession || {};
  const signals = [
    `상태 · ${getDisplayLabel(mission.status, mission.status)}`,
    mission.deliverableType ? `산출물 · ${getDisplayLabel(mission.deliverableType, mission.deliverableType)}` : '산출물 유형 미정',
    latestSession.provider ? `제공자 · ${latestSession.provider}` : '제공자 선택 전',
    state.missionDetail.harness
      ? `하네스 · 문서 ${state.missionDetail.harness.documents?.summary?.availableCount || 0} / 메모 ${state.missionDetail.harness.memory?.missionCounts?.total || 0}`
      : '하네스 정보 없음',
    playbook ? `플레이북 · ${playbook.title}` : '사용자 정의 미션',
  ];

  elements.heroSignals.innerHTML = signals
    .map((signal) => `<span class="hero-signal">${escapeHtml(signal)}</span>`)
    .join('');
}

function renderAgentLaneEmptyState() {
  return emptyStateCard({
    action: 'open-create',
    actionLabel: '미션 작성 열기',
    icon: 'AG',
    message: '미션이 선택되면 core agent 4개와 추가 specialist AI 구성을 여기서 바로 볼 수 있습니다.',
    title: '에이전트 진행 흐름이 아직 없습니다',
  });
}

function renderAgentLane() {
  if (!state.missionDetail) {
    elements.agentLane.innerHTML = renderAgentLaneEmptyState();
    wireQuickActions(elements.agentLane);
    return;
  }

  const latestSession = state.missionDetail.summary?.latestSession || {};
  const aiConfig = getMissionAiConfiguration(state.missionDetail);
  const currentStage = String(latestSession.currentStage || '').toLowerCase();
  const sessionCompleted = latestSession.status === 'completed';
  const stageOrder = ['manager', 'planner', 'executor', 'reviewer'];
  const stageLabels = {
    manager: '방향 설정',
    planner: '계획 수립',
    executor: '산출물 생성',
    reviewer: '검토',
  };
  const stageDescriptions = {
    manager: '목표와 맥락을 정리합니다.',
    planner: '실행 가능한 산출물 구조를 만듭니다.',
    executor: '문서 또는 구현 산출물을 생성합니다.',
    reviewer: '규칙과 품질 기준을 검증합니다.',
  };
  const stageTitles = {
    manager: '매니저',
    planner: '플래너',
    executor: '실행 담당',
    reviewer: '리뷰어',
  };
  const stageStateLabels = {
    pending: '대기',
    done: '완료',
    active: '진행 중',
    failed: '실패',
  };

  const coreLane = stageOrder
    .map((stage, index) => {
      const currentIndex = stageOrder.indexOf(currentStage);
      let visualState = 'pending';
      if (sessionCompleted || (currentIndex !== -1 && index < currentIndex)) {
        visualState = 'done';
      }
      if (!sessionCompleted && stage === currentStage) {
        visualState = latestSession.status === 'failed' ? 'failed' : 'active';
      }
      if (sessionCompleted && stage === 'reviewer') {
        visualState = 'done';
      }

      return `
        <article class="agent-stage stage-${visualState}">
          <div class="agent-stage-head">
            <span class="agent-stage-index">0${index + 1}</span>
            <span class="mini-badge">${escapeHtml(stageLabels[stage])}</span>
          </div>
          <h3>${escapeHtml(stageTitles[stage])}</h3>
          <p>${escapeHtml(stageDescriptions[stage])}</p>
          <div class="agent-stage-foot">
            <span class="stage-state">${escapeHtml(stageStateLabels[visualState] || visualState)}</span>
          </div>
        </article>
      `;
    })
    .join('');

  const specialistLane = aiConfig.specialistKinds.length
    ? `
        <div class="specialist-lane-shell">
          <div class="specialist-lane-head">
            <div>
              <p class="section-kicker">추가 specialist AI</p>
              <strong>${escapeHtml(aiConfig.profileDisplayName)}</strong>
            </div>
            <span class="mini-badge">${escapeHtml(`+${aiConfig.specialistKinds.length} agents`)}</span>
          </div>
          <div class="specialist-lane">
            ${aiConfig.specialistKinds
              .map((kind) => {
                const meta = SPECIALIST_KIND_META[kind];
                const required = aiConfig.requiredKinds.includes(kind);
                return `
                  <article class="specialist-stage ${required ? 'is-required' : ''}">
                    <div class="specialist-stage-head">
                      <span class="agent-function-badge">${escapeHtml(meta?.badge || kind.slice(0, 3).toUpperCase())}</span>
                      <span class="mini-badge">${escapeHtml(required ? 'quality gate' : 'specialist')}</span>
                    </div>
                    <h3>${escapeHtml(meta?.label || kind)}</h3>
                    <p>${escapeHtml(meta?.description || getDisplayLabel(kind, kind))}</p>
                  </article>
                `;
              })
              .join('')}
          </div>
        </div>
      `
    : `
        <div class="specialist-lane-shell specialist-lane-shell-empty">
          <div class="specialist-lane-head">
            <div>
              <p class="section-kicker">추가 specialist AI</p>
              <strong>Core 4 only</strong>
            </div>
          </div>
          <p class="summary-note">현재 미션은 추가 specialist 없이 기본 4-agent 흐름으로 실행됩니다. 필요하면 1단계에서 AI 구성 카드를 바꾸면 됩니다.</p>
        </div>
      `;

  elements.agentLane.innerHTML = `
    <div class="agent-lane-core">
      ${coreLane}
    </div>
    ${specialistLane}
  `;
}

function renderMissionSummaryEmptyState() {
  return emptyStateCard({
    action: 'open-create',
    actionLabel: '새 미션 작성',
    icon: '01',
    message: '원하는 결과를 짧게 적고 실행하면, 이 영역에 목표, 제약 조건, 리뷰어 신호가 정리됩니다.',
    title: '아직 선택된 미션이 없습니다',
  });
}

function renderMissionSummary() {
  if (!state.missionDetail) {
    elements.missionTitle.textContent = '미션을 선택하세요';
    elements.missionSubtitle.textContent = '왼쪽 목록에서 미션을 선택하면 개요, 산출물, 타임라인을 바로 확인할 수 있습니다.';
    elements.missionSummary.innerHTML = renderMissionSummaryEmptyState();
    elements.runMissionButton.disabled = true;
    renderSelectionBridge();
    renderHeroMetrics();
    renderHeroSignals();
    renderAgentLane();
    renderFlowState();
    wireQuickActions(elements.missionSummary);
    return;
  }

  const { mission, summary } = state.missionDetail;
  const playbook = inferPlaybook(mission);
  const aiConfig = getMissionAiConfiguration(state.missionDetail);
  if (playbook) {
    state.selectedPlaybookId = playbook.id;
    renderPlaybooks();
  }
  const latestSession = summary?.latestSession || null;
  const constraints = mission.constraints || [];
  const flow = getFlowState();
  elements.missionTitle.textContent = mission.title;
  elements.missionSubtitle.textContent = summarizeText(
    mission.objective,
    latestSession?.reviewerSummary || '목표가 없습니다.',
  );
  elements.runMissionButton.disabled = false;
  renderSelectionBridge();

  if (state.activeStep === 'step-output') {
    const latestExecutionLabel = latestSession
      ? `${latestSession.provider || '-'} · ${getDisplayLabel(latestSession.status)}`
      : '아직 실행 전';
    const learningLabel = `첨부 ${summary?.attachmentCounts?.total ?? 0} · 메모 ${summary?.memoryCounts?.total ?? 0}`;
    const missionSummaryTargetLabel = mission.title || mission.id || state.selectedMissionId || '선택된 미션';
    const missionSummarySetupLabel = `입력 다시 보기: ${missionSummaryTargetLabel}`;
    const reviewLabel =
      summary?.approvalCounts?.pending
        ? `승인 ${summary.approvalCounts.pending}건 대기`
        : state.missionActions?.summary?.pendingActionCount
          ? `후속 ${state.missionActions.summary.pendingActionCount}건 남음`
          : '검토 정리됨';
    const compactCards = [
      ['현재 단계', flow.currentStepLabel, 'is-emphasis'],
      ['최근 실행', latestExecutionLabel, ''],
      ['AI 구성', aiConfig.specialistKinds.length ? `${aiConfig.profileDisplayName} · +${aiConfig.specialistKinds.length}` : 'Core 4 only', ''],
      ['읽는 자료', learningLabel, ''],
      ['검토 상태', reviewLabel, ''],
      ['다음 액션', flow.label, 'is-wide'],
    ];

    if (!state.outputMissionSummaryExpanded) {
      const compactRibbonCards = [
        ['현재 단계', flow.currentStepLabel],
        ['최근 실행', latestExecutionLabel],
        ['검토 상태', reviewLabel],
      ];

      elements.missionSummary.innerHTML = `
        <section class="mission-summary-output-ribbon">
          <div class="mission-summary-output-ribbon-copy">
            <p class="summary-label">선택한 미션 요약</p>
            <strong>${escapeHtml(mission.title)}</strong>
            <p class="summary-note">결과 확인에 필요한 상태만 남겼습니다. 입력/구성 상세는 필요할 때만 펼칩니다.</p>
          </div>
          <div class="mission-summary-output-ribbon-grid">
            ${compactRibbonCards
              .map(
                ([label, value]) => `
                  <div class="mission-summary-output-ribbon-card">
                    <span>${escapeHtml(label)}</span>
                    <strong>${escapeHtml(value)}</strong>
                  </div>
                `,
              )
              .join('')}
          </div>
          <div class="action-row">
            ${renderOutputToolbarToggleButton({
              action: 'toggle-output-mission-summary',
              actionLabel: `결과 미션 요약 펼치기: ${missionSummaryTargetLabel}`,
              buttonText: '요약 펼치기',
              expanded: false,
            })}
            ${renderFlowQuickActionButton({
              action: 'jump-step',
              actionLabel: missionSummarySetupLabel,
              buttonText: '입력 다시 보기',
              className: 'secondary-button',
              value: 'step-setup',
            })}
          </div>
        </section>
      `;

      renderHeroMetrics();
      renderHeroSignals();
      renderAgentLane();
      renderFlowState();
      wireQuickActions(elements.missionSummary);
      return;
    }

    elements.missionSummary.innerHTML = `
      <section class="mission-summary-compact-shell">
        <div class="mission-summary-compact-head">
          <div>
            <p class="summary-label">선택한 미션 요약</p>
            <h4>결과 확인에 필요한 문맥만 유지</h4>
            <p class="summary-note">입력값과 전체 플레이북을 반복하지 않고, 이번 단계에서 바로 필요한 상태만 남겼습니다.</p>
          </div>
          <div class="action-row action-row-compact">
            ${renderOutputToolbarToggleButton({
              action: 'toggle-output-mission-summary',
              actionLabel: `결과 미션 요약 접기: ${missionSummaryTargetLabel}`,
              buttonText: '요약 접기',
              expanded: true,
            })}
            ${renderFlowQuickActionButton({
              action: 'jump-step',
              actionLabel: missionSummarySetupLabel,
              buttonText: '입력 다시 보기',
              value: 'step-setup',
            })}
          </div>
        </div>
        <div class="mission-summary-compact-grid">
          ${compactCards
            .map(
              ([label, value, modifier]) => `
                <div class="mission-summary-compact-card ${modifier}">
                  <span>${escapeHtml(label)}</span>
                  <strong>${escapeHtml(value)}</strong>
                </div>
              `,
            )
            .join('')}
        </div>
      </section>
    `;

    renderHeroMetrics();
    renderHeroSignals();
    renderAgentLane();
    renderFlowState();
    wireQuickActions(elements.missionSummary);
    return;
  }

  elements.missionSummary.innerHTML = `
    <section class="summary-section summary-emphasis">
      <p class="summary-label">미션 목표</p>
      <h3 class="summary-statement">${escapeHtml(mission.objective || '아직 목표가 정의되지 않았습니다.')}</h3>
      <div class="summary-meta-row">
        <span class="mini-badge ${getStatusClass(mission.status)}">${escapeHtml(getDisplayLabel(mission.status))}</span>
        <span class="mini-badge">${escapeHtml(mission.mode)}</span>
        <span class="mini-badge">${escapeHtml(getDisplayLabel(mission.deliverableType, mission.deliverableType))}</span>
      </div>
    </section>
    <div class="summary-grid">
      <section class="summary-section">
        <p class="summary-label">제약 조건</p>
        ${
          constraints.length
            ? `<div class="tag-list">${constraints
                .map((constraint) => `<span class="tag">${escapeHtml(constraint)}</span>`)
                .join('')}</div>`
            : '<p class="empty-state">제약 조건이 없습니다.</p>'
        }
      </section>
      <section class="summary-section">
        <p class="summary-label">운영 플레이북</p>
        ${
          playbook
            ? `
              <div class="definition-item">
                <span>참고 흐름</span>
                <strong>${escapeHtml(playbook.title)} · ${escapeHtml(playbook.origin)}</strong>
              </div>
              <p class="summary-note">${escapeHtml(playbook.description)}</p>
            `
            : '<p class="summary-note">선택된 플레이북 없이 사용자 정의 미션으로 실행 중입니다.</p>'
        }
      </section>
      <section class="summary-section summary-section-ai">
        <p class="summary-label">AI 구성</p>
        <div class="definition-list">
          <div class="definition-item"><span>현재 구성</span><strong>${escapeHtml(aiConfig.profileDisplayName)}</strong></div>
          <div class="definition-item"><span>추가 AI</span><strong>${escapeHtml(String(aiConfig.specialistKinds.length))}개</strong></div>
          <div class="definition-item"><span>품질 게이트</span><strong>${escapeHtml(getDisplayLabel(aiConfig.qualityGate, aiConfig.qualityGate || 'none'))}</strong></div>
          <div class="definition-item"><span>필수 신호</span><strong>${escapeHtml(aiConfig.requiredKinds.length ? aiConfig.requiredKinds.map((kind) => formatSpecialistShortLabel(kind)).join(', ') : '없음')}</strong></div>
          <div class="definition-item"><span>권장 provider</span><strong>${escapeHtml(aiConfig.recommendedProvider || '사용자 선택')}</strong></div>
          <div class="definition-item"><span>runtime blueprint</span><strong>${escapeHtml(aiConfig.runtimeBlueprint || '-')}</strong></div>
        </div>
        <div class="tag-list">
          ${renderSpecialistTagList(aiConfig.specialistKinds)}
          ${aiConfig.profileHarnessPatterns.map((pattern) => `<span class="tag tag-muted">${escapeHtml(pattern)}</span>`).join('')}
        </div>
        <p class="summary-note">${escapeHtml(aiConfig.profileId ? `directive · orchestration-profile:${aiConfig.profileId}` : '별도 specialist directive 없이 core 4-agent 흐름으로 실행됩니다.')}</p>
      </section>
      <section class="summary-section">
        <p class="summary-label">최근 세션</p>
        <div class="definition-list">
          <div class="definition-item"><span>상태</span><strong>${escapeHtml(getDisplayLabel(latestSession?.status))}</strong></div>
          <div class="definition-item"><span>제공자</span><strong>${escapeHtml(latestSession?.provider || '-')}</strong></div>
          <div class="definition-item"><span>현재 단계</span><strong>${escapeHtml(getDisplayLabel(latestSession?.currentStage))}</strong></div>
          <div class="definition-item"><span>최근 갱신</span><strong>${escapeHtml(formatDate(mission.updatedAt))}</strong></div>
        </div>
      </section>
      <section class="summary-section">
        <p class="summary-label">승인과 기억 상태</p>
        <div class="definition-list">
          <div class="definition-item"><span>승인 합계</span><strong>${escapeHtml(String(summary?.approvalCounts?.total ?? 0))}</strong></div>
          <div class="definition-item"><span>승인 대기</span><strong>${escapeHtml(String(summary?.approvalCounts?.pending ?? 0))}</strong></div>
          <div class="definition-item"><span>기억 항목</span><strong>${escapeHtml(String(summary?.memoryCounts?.total ?? 0))}</strong></div>
          <div class="definition-item"><span>제공자 상태</span><strong>${escapeHtml(getDisplayLabel(summary?.providerHealthDriftStatus, '안정'))}</strong></div>
        </div>
      </section>
      <section class="summary-section summary-section-learning">
        <p class="summary-label">AI가 읽는 자료</p>
        <div class="definition-list">
          <div class="definition-item"><span>첨부 파일</span><strong>${escapeHtml(String(summary?.attachmentCounts?.total ?? 0))}개</strong></div>
          <div class="definition-item"><span>미션 메모</span><strong>${escapeHtml(String(summary?.memoryCounts?.total ?? 0))}개</strong></div>
          <div class="definition-item"><span>누적 chars</span><strong>${escapeHtml(String(summary?.attachmentCounts?.totalChars ?? 0))}</strong></div>
          <div class="definition-item"><span>지식 방식</span><strong>prompt grounding + retrieval memory</strong></div>
        </div>
        <p class="summary-note">현재는 모델 재학습이 아니라, 텍스트 첨부와 메모리를 저장한 뒤 다음 실행에서 retrieval + grounding으로 다시 읽히는 운영형 지식 루프입니다.</p>
      </section>
      <section class="summary-section">
        <p class="summary-label">리뷰어 신호</p>
        <p class="summary-note">${escapeHtml(latestSession?.reviewerSummary || '아직 리뷰어 요약이 없습니다.')}</p>
      </section>
      <section class="summary-section">
        <p class="summary-label">다음 권장 단계</p>
        <div class="definition-item">
          <span>현재 안내</span>
          <strong>${escapeHtml(flow.label)}</strong>
        </div>
        <p class="summary-note">${escapeHtml(flow.copy)}</p>
        <div class="action-row">
          ${renderFlowQuickActionButton({
            action: 'jump-step',
            actionLabel: `${flow.buttonLabel}: ${mission.title || mission.id || state.selectedMissionId || '선택된 미션'}`,
            buttonText: flow.buttonLabel,
            className: 'primary-button',
            value: flow.recommendedStep,
          })}
        </div>
      </section>
    </div>
  `;

  renderHeroMetrics();
  renderHeroSignals();
  renderAgentLane();
  renderFlowState();
  wireQuickActions(elements.missionSummary);
}

function renderSelectionBridge() {
  if (!elements.selectionBridge) {
    return;
  }

  if (state.activeStep === 'step-output') {
    elements.selectionBridge.classList.add('is-hidden');
    elements.selectionBridge.innerHTML = '';
    return;
  }

  elements.selectionBridge.classList.remove('is-hidden');

  const selectedRecord = getSelectedMissionRecord();
  if (!selectedRecord) {
    elements.selectionBridge.innerHTML = `
      <div class="selection-bridge-empty">왼쪽 작업 대기열에서 미션을 고르면 현재 작업면, 결과물, 실행 기록이 같은 기준으로 묶여 보여집니다.</div>
    `;
    return;
  }

  const mission = state.missionDetail?.mission?.id === selectedRecord.mission.id ? state.missionDetail.mission : selectedRecord.mission;
  const latestSession =
    state.currentSessionPayload?.session ||
    state.missionDetail?.summary?.latestSession ||
    selectedRecord.latestSession ||
    null;
  const workspaceLabel = selectedRecord.workspace?.name || mission.workspaceId;
  const snapshot = getMissionQueueSnapshot(mission, latestSession);
  const aiConfig = getMissionAiConfiguration(state.missionDetail);
  const flow =
    state.missionDetail?.mission?.id === selectedRecord.mission.id
      ? getFlowState()
      : {
          buttonLabel: '미션 불러오는 중',
          copy: '세부 정보를 가져오는 동안 현재 단계와 다음 액션을 동기화하고 있습니다.',
          currentStepLabel: getStepLabel(state.activeStep),
          label: '선택한 미션을 불러오는 중입니다',
          recommendedStep: state.activeStep,
        };
  const latestExecutionLabel = latestSession
    ? `${getDisplayLabel(latestSession.provider, latestSession.provider)} · ${getDisplayLabel(latestSession.status)}`
    : '아직 실행 전';
  const harnessState = getHarnessSummaryState();
  const learningLabel = state.missionDetail?.summary
    ? `첨부 ${state.missionDetail.summary.attachmentCounts?.total || 0} · 메모 ${state.missionDetail.summary.memoryCounts?.total || 0}`
    : `첨부 0 · 메모 ${harnessState.memoryTotalCount}개`;
  const selectionBridgeStepLabel = `${getStepLabel(flow.recommendedStep, { short: true })}: ${mission.title || mission.id || '선택한 미션'}`;
  const operatorHandoffItems = buildOperatorHandoffItems({
    aiConfig,
    flow,
    latestSession,
    mission,
  });

  elements.selectionBridge.innerHTML = `
    <div class="selection-bridge-main selection-bridge-main-compact">
      <div class="selection-bridge-copy selection-bridge-copy-compact">
        <span class="selection-bridge-kicker">선택한 미션 컨텍스트</span>
        <strong>${escapeHtml(`${getDisplayLabel(snapshot.status)} · ${workspaceLabel}`)}</strong>
        <p>${escapeHtml(`${getStepLabel(state.activeStep, { short: true })} 기준으로 실행, 결과, 하네스가 같은 미션에 맞춰 연결되어 있습니다.`)}</p>
      </div>
      <div class="selection-bridge-actions">
        <span class="mini-badge">${escapeHtml(latestExecutionLabel)}</span>
        ${renderFlowQuickActionButton({
          action: 'jump-step',
          actionLabel: selectionBridgeStepLabel,
          buttonText: getStepLabel(flow.recommendedStep, { short: true }),
          value: flow.recommendedStep,
        })}
      </div>
    </div>
    <div class="selection-bridge-track selection-bridge-track-compact">
      <div class="selection-bridge-pill is-active">
        <span>현재 단계</span>
        <strong>${escapeHtml(getStepLabel(state.activeStep, { short: true }))}</strong>
      </div>
      <div class="selection-bridge-pill">
        <span>AI 구성</span>
        <strong>${escapeHtml(aiConfig.specialistKinds.length ? `${aiConfig.profileDisplayName} · +${aiConfig.specialistKinds.length}` : 'Core 4 only')}</strong>
      </div>
      <div class="selection-bridge-pill">
        <span>최근 실행</span>
        <strong>${escapeHtml(latestExecutionLabel)}</strong>
      </div>
      <div class="selection-bridge-pill ${harnessState.topRecommendation ? 'is-active' : ''}">
        <span>읽는 자료</span>
        <strong>${escapeHtml(learningLabel)}</strong>
      </div>
      <div class="selection-bridge-pill">
        <span>다음 액션</span>
        <strong>${escapeHtml(snapshot.nextAction.replace(/^다음:\s*/, ''))}</strong>
      </div>
    </div>
    <div class="selection-bridge-handoff" aria-label="Operator handoff evidence">
      ${operatorHandoffItems
        .map(
          (item) => `
            <div class="selection-bridge-handoff-item">
              <span>${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(item.value)}</strong>
              <small>${escapeHtml(item.detail)}</small>
            </div>
          `,
        )
        .join('')}
    </div>
  `;
  wireQuickActions(elements.selectionBridge);
}

function renderSetupHarnessEmptyState() {
  return emptyStateCard({
    action: 'open-create',
    actionLabel: '새 미션 작성',
    icon: 'HS',
    message: '미션을 고르면 문서 기준점, 기억, 운영 루프 기준으로 지금 먼저 정리할 항목을 여기에서 보여줍니다.',
    title: '하네스 준비 상태를 계산할 미션이 없습니다',
  });
}

function renderSetupHarnessSummary() {
  if (!elements.setupHarnessSummary) {
    return;
  }

  if (!state.missionDetail?.harness) {
    elements.setupHarnessSummary.innerHTML = renderSetupHarnessEmptyState();
    wireQuickActions(elements.setupHarnessSummary);
    return;
  }

  const harnessState = getHarnessSummaryState();
  const topRecommendation = harnessState.topRecommendation;
  const topHarnessAction = topRecommendation
    ? harnessState.recommendationAction
    : {
        action: 'jump-step',
        label: '2단계 실행 열기',
        value: 'step-run',
      };
  const secondaryButton = topRecommendation?.code
    ? renderFlowQuickActionButton({
        action: topHarnessAction.secondaryAction,
        actionLabel: `${topHarnessAction.secondaryLabel}: 하네스 준비 상태`,
        buttonText: topHarnessAction.secondaryLabel,
        value: topHarnessAction.secondaryValue,
      })
    : renderFlowQuickActionButton({
        action: 'switch-tab',
        actionLabel: '하네스 탭 열기: 하네스 준비 상태',
        buttonText: '하네스 탭 열기',
        value: 'harness',
      });
  const setupHarnessPrimaryLabel = `${topRecommendation ? topHarnessAction.label : '2단계 실행 열기'}: 하네스 준비 상태`;

  elements.setupHarnessSummary.innerHTML = `
    <div class="stage-summary-card harness-prep-card">
      <div class="harness-overview-grid">
        <div class="summary-chip">
          <span>문서 기준점</span>
          <strong>${escapeHtml(String(harnessState.docsAvailableCount))}/${escapeHtml(String(harnessState.docsTotalCount))}</strong>
        </div>
        <div class="summary-chip">
          <span>미션 메모리</span>
          <strong>${escapeHtml(String(harnessState.memoryTotalCount))}개</strong>
        </div>
        <div class="summary-chip">
          <span>운영 루프</span>
          <strong>${escapeHtml(`승인 ${harnessState.pendingApprovalCount} · 후속 ${harnessState.pendingActionCount}`)}</strong>
        </div>
      </div>
      <div class="harness-callout">
        <strong>${escapeHtml(topRecommendation ? '지금 먼저 정리할 하네스 항목' : '하네스 기준점이 준비되어 있습니다')}</strong>
        <p>${escapeHtml(topRecommendation?.title || '문서 source-of-record, memory, 운영 루프가 현재 안정 상태입니다. 실행 전 세부 기준만 마지막으로 확인하면 됩니다.')}</p>
      </div>
      <div class="action-row">
        ${renderFlowQuickActionButton({
          action: topHarnessAction.action,
          actionLabel: setupHarnessPrimaryLabel,
          buttonText: topRecommendation ? topHarnessAction.label : '2단계 실행 열기',
          className: 'primary-button',
          value: topHarnessAction.value,
        })}
        ${secondaryButton}
      </div>
    </div>
  `;
  wireQuickActions(elements.setupHarnessSummary);
}

function renderRunStageEmptyState() {
  return emptyStateCard({
    action: 'jump-step',
    actionLabel: '1단계 열기',
    actionValue: 'step-setup',
    icon: 'RN',
    message: '미션을 먼저 선택하면 어떤 제공자로 언제 실행할지 여기에서 정리됩니다.',
    title: '실행할 미션이 없습니다',
  });
}

function renderRunStageSummary() {
  if (!elements.runStageSummary) {
    return;
  }

  if (!state.missionDetail) {
    elements.runStageSummary.innerHTML = renderRunStageEmptyState();
    wireQuickActions(elements.runStageSummary);
    return;
  }

  const latestSession = state.missionDetail.summary?.latestSession || null;
  const execution = getExecutionStatusPayload();
  const flow = getFlowState();
  const runStageMissionLabel = state.missionDetail?.mission?.title || state.selectedMissionId || '선택된 미션';
  elements.runStageSummary.innerHTML = `
    <div class="stage-summary-card">
      <p class="summary-label">현재 안내</p>
      <h4 class="summary-statement">${escapeHtml(flow.label)}</h4>
      <p class="summary-note">${escapeHtml(latestSession?.reviewerSummary || latestSession?.outputSummary || flow.copy)}</p>
      <div class="definition-list">
        <div class="definition-item">
          <span>최근 세션</span>
          <strong>${escapeHtml(latestSession ? getDisplayLabel(latestSession.status) : '아직 실행 전')}</strong>
        </div>
        <div class="definition-item">
          <span>제공자</span>
          <strong>${escapeHtml(latestSession?.provider || '선택 전')}</strong>
        </div>
        <div class="definition-item">
          <span>현재 단계</span>
          <strong>${escapeHtml(flow.currentStepLabel)}</strong>
        </div>
        <div class="definition-item">
          <span>최근 업데이트</span>
          <strong>${escapeHtml(formatDate(state.missionDetail.mission.updatedAt))}</strong>
        </div>
        ${
          isExecutionMissionSelected()
            ? `
              <div class="definition-item">
                <span>실행 자격</span>
                <strong>${escapeHtml(execution?.supported ? (execution.currentLease ? '실행 가능' : getDisplayLabel(execution.eligibility || 'required', execution.eligibility || 'required')) : '미지원')}</strong>
              </div>
            `
            : ''
        }
      </div>
      <div class="action-row">
        ${renderFlowQuickActionButton({
          action: 'switch-tab',
          actionLabel: `실행 기록 보기: ${runStageMissionLabel}`,
          buttonText: '실행 기록 보기',
          value: 'runs',
        })}
      </div>
    </div>
  `;
  wireQuickActions(elements.runStageSummary);
}

function renderExecutionConsole() {
  if (!elements.executionConsole) {
    return;
  }

  if (!state.missionDetail) {
    elements.executionConsole.innerHTML = '<p class="empty-state">미션을 선택하면 실행 preflight와 live log를 여기에 표시합니다.</p>';
    return;
  }

  if (!isExecutionMissionSelected()) {
    elements.executionConsole.innerHTML = '<p class="empty-state">지식 작업 모드는 직접 shell 실행을 지원하지 않습니다.</p>';
    return;
  }

  const execution = getExecutionStatusPayload();
  const executionSession = execution?.latestExecutionSession || null;
  const latestLease = execution?.currentLease || execution?.latestLease || null;
  const logs = state.executionLogs?.lines || [];
  const reviewSessionId = execution?.reviewSessionId || '-';
  const policy = execution?.policy || { allowedCount: 0, warningCount: 0, blockedCount: 0 };
  const verification = executionSession?.verification || null;
  const rollback = executionSession?.rollback || null;
  const executionMissionLabel = state.missionDetail?.mission?.title || state.selectedMissionId || '선택된 미션';
  const executionSessionLabel = executionSession?.id || latestLease?.id || executionMissionLabel;
  const mutationAuditCount = Array.isArray(executionSession?.mutationAudits) ? executionSession.mutationAudits.length : 0;
  const rollbackAvailable = Boolean(
    executionSession?.id &&
    mutationAuditCount > 0 &&
    !['pending', 'running'].includes(executionSession.status) &&
    rollback?.status !== 'completed',
  );
  const rollbackActions = rollbackAvailable
    ? `
      <div class="action-row">
        ${renderExecutionControlActionButton({
          action: 'execution-rollback-preview',
          actionLabel: `rollback preview: ${executionSessionLabel}`,
          buttonText: 'rollback preview',
        })}
        ${renderExecutionControlActionButton({
          action: 'execution-rollback',
          actionLabel: `rollback 실행: ${executionSessionLabel}`,
          buttonText: 'rollback 실행',
          className: 'danger-button',
        })}
      </div>
    `
    : rollback?.status
      ? `<p class="summary-note">${escapeHtml(rollback.summary || `rollback ${rollback.status}`)}</p>`
      : '';
  const primaryAction = execution?.currentLease
    ? renderExecutionControlActionButton({
        action: 'execution-start',
        actionLabel: `실행 시작: ${executionMissionLabel}`,
        buttonText: '실행 시작',
        className: 'primary-button',
      })
    : execution?.latestApproval?.status === 'pending'
      ? renderExecutionApprovalPendingButton({
          actionLabel: `승인 대기 중: ${executionMissionLabel}`,
        })
      : renderExecutionControlActionButton({
          action: 'execution-preflight',
          actionLabel: `실행 승인 요청: ${executionMissionLabel}`,
          buttonText: '실행 승인 요청',
          className: 'primary-button',
          value: 'request-approval',
        });
  const secondaryAction = executionSession?.status === 'running'
    ? renderExecutionControlActionButton({
        action: 'execution-stop',
        actionLabel: `실행 중단: ${executionSessionLabel}`,
        buttonText: '실행 중단',
      })
    : renderExecutionControlActionButton({
        action: 'execution-preflight',
        actionLabel: `preflight 새로고침: ${executionMissionLabel}`,
        buttonText: 'preflight 새로고침',
      });
  const manifestSteps = Array.isArray(execution?.manifest?.steps) ? execution.manifest.steps : [];
  const blockedList = (execution?.blockedReasons || []).slice(0, 3);
  const changedFiles = (executionSession?.changedFiles || []).slice(0, 5);
  const stepRows = (executionSession?.steps || manifestSteps || [])
    .map(
      (step, index) => `
        <li class="execution-step-row">
          <span class="execution-step-index">${escapeHtml(String(index + 1).padStart(2, '0'))}</span>
          <div class="execution-step-copy">
            <strong>${escapeHtml(step.title || `${getDisplayLabel(step.kind || 'command', step.kind || 'command')} step`)}</strong>
            <p>${escapeHtml(step.reason || getDisplayLabel(step.kind || 'command', step.kind || 'command'))}</p>
          </div>
          <span class="status-badge ${getStatusClass(step.status || 'pending')}">${escapeHtml(getDisplayLabel(step.status || 'pending', step.status || 'pending'))}</span>
        </li>
      `,
    )
    .join('');

  elements.executionConsole.innerHTML = `
    <div class="execution-console-grid">
      <section class="execution-card">
        <p class="summary-label">preflight</p>
        <h4 class="summary-statement">${escapeHtml(execution?.supported ? '현재 리포 실행 가능 여부를 확인했습니다.' : '이 미션은 실행 대상이 아닙니다.')}</h4>
        <div class="definition-list">
          <div class="definition-item"><span>실행 자격</span><strong>${escapeHtml(getDisplayLabel(execution?.eligibility || 'required', execution?.eligibility || 'required'))}</strong></div>
          <div class="definition-item"><span>검토 세션</span><strong>${escapeHtml(reviewSessionId)}</strong></div>
          <div class="definition-item"><span>manifest step</span><strong>${escapeHtml(String(manifestSteps.length))}건</strong></div>
          <div class="definition-item"><span>정책 상태</span><strong>${escapeHtml(`허용 ${policy.allowedCount} · 경고 ${policy.warningCount} · 차단 ${policy.blockedCount}`)}</strong></div>
        </div>
        ${
          blockedList.length
            ? `<div class="execution-inline-list">${blockedList.map((item) => `<span class="tag tag-warning">${escapeHtml(item)}</span>`).join('')}</div>`
            : '<p class="summary-note">차단 사유가 없으면 approval lease 발급 후 한 번의 실행 세션을 시작할 수 있습니다.</p>'
        }
        <div class="action-row">
          ${primaryAction}
          ${secondaryAction}
        </div>
      </section>
      <section class="execution-card">
        <p class="summary-label">승인 lease</p>
        <h4 class="summary-statement">${escapeHtml(execution?.currentLease ? '승인 lease 활성 상태' : execution?.latestApproval?.status === 'pending' ? '사람의 승인을 기다리는 중' : latestLease ? `최근 lease 상태 · ${getDisplayLabel(latestLease.status, latestLease.status)}` : '아직 발급된 lease가 없습니다.')}</h4>
        <div class="definition-list">
          <div class="definition-item"><span>최근 승인</span><strong>${escapeHtml(execution?.latestApproval ? `${getDisplayLabel(execution.latestApproval.status)} · ${formatDate(execution.latestApproval.createdAt)}` : '없음')}</strong></div>
          <div class="definition-item"><span>manifest hash</span><strong class="mono">${escapeHtml(execution?.manifestHash ? execution.manifestHash.slice(0, 12) : '-')}</strong></div>
          <div class="definition-item"><span>브랜치</span><strong>${escapeHtml(latestLease?.gitBranch || execution?.latestApproval?.metadata?.gitBranch || '-')}</strong></div>
          <div class="definition-item"><span>워크스페이스</span><strong class="mono">${escapeHtml(execution?.workspacePath || '-')}</strong></div>
        </div>
        <p class="summary-note">${escapeHtml(execution?.currentLease ? '현재 manifest hash와 브랜치에 묶인 one-time lease입니다. 실행 1회 후 자동 소진됩니다.' : latestLease?.status === 'used' ? '가장 최근 lease는 이미 사용 완료되었습니다. 다시 실행하려면 새 승인이 필요합니다.' : '승인 후 manifest가 바뀌면 기존 lease는 자동 무효화됩니다.')}</p>
      </section>
      <section class="execution-card execution-card-log">
        <p class="summary-label">execution session</p>
        <h4 class="summary-statement">${escapeHtml(executionSession ? `${getDisplayLabel(executionSession.status)} · ${executionSession.id}` : '아직 실행 세션이 없습니다.')}</h4>
        <div class="definition-list">
          <div class="definition-item"><span>현재 step</span><strong>${escapeHtml(executionSession?.steps?.[executionSession?.currentStepIndex]?.title || '-')}</strong></div>
          <div class="definition-item"><span>검증</span><strong>${escapeHtml(getDisplayLabel(verification?.status, verification?.status || 'pending'))}</strong></div>
          <div class="definition-item"><span>변경 파일</span><strong>${escapeHtml(String(executionSession?.changedFiles?.length || 0))}건</strong></div>
          <div class="definition-item"><span>rollback</span><strong>${escapeHtml(rollback?.status ? getDisplayLabel(rollback.status, rollback.status) : mutationAuditCount ? `${mutationAuditCount}건 가능` : '-')}</strong></div>
          <div class="definition-item"><span>종료 코드</span><strong>${escapeHtml(executionSession?.exitCode === null || executionSession?.exitCode === undefined ? '-' : String(executionSession.exitCode))}</strong></div>
        </div>
        ${
          verification?.summary
            ? `<p class="summary-note">${escapeHtml(verification.summary)}</p>`
            : ''
        }
        ${
          stepRows
            ? `<ul class="execution-step-list">${stepRows}</ul>`
            : '<p class="summary-note">실행 step 목록이 아직 없습니다.</p>'
        }
        ${
          changedFiles.length
            ? `<div class="execution-inline-list">${changedFiles.map((file) => `<span class="tag">${escapeHtml(file)}</span>`).join('')}</div>`
            : ''
        }
        ${rollbackActions}
        <pre class="execution-log-surface">${escapeHtml(logs.slice(-24).join('\n') || '실행 로그가 아직 없습니다.')}</pre>
      </section>
    </div>
  `;
  wireQuickActions(elements.executionConsole);
}

function renderReviewStageEmptyState() {
  return emptyStateCard({
    action: 'jump-step',
    actionLabel: '미션 선택하기',
    actionValue: 'step-setup',
    icon: 'RV',
    message: '미션을 고르면 승인 대기와 후속 작업 상태를 이 단계에서 바로 판단할 수 있습니다.',
    title: '검토할 미션이 없습니다',
  });
}

function renderReviewStageSummary() {
  if (!elements.reviewStageSummary) {
    return;
  }

  if (!state.missionDetail) {
    elements.reviewStageSummary.innerHTML = renderReviewStageEmptyState();
    wireQuickActions(elements.reviewStageSummary);
    return;
  }

  const latestSession = state.missionDetail.summary?.latestSession || null;
  const execution = getExecutionStatusPayload();
  const latestExecutionSession = execution?.latestExecutionSession || null;
  const pendingApprovalCount = state.approvals.filter((item) => item.missionId === state.selectedMissionId).length;
  const pendingActionCount = Number(state.missionActions?.summary?.pendingActionCount || 0);
  const flow = getFlowState();
  const reviewStageMissionLabel = state.missionDetail?.mission?.title || state.selectedMissionId || '선택된 미션';
  const primaryDecision =
    pendingApprovalCount > 0
      ? `승인 ${pendingApprovalCount}건부터 처리하세요`
      : pendingActionCount > 0
        ? `후속 작업 ${pendingActionCount}건을 먼저 정리하세요`
        : '검토 단계 정리가 끝났습니다';
  const decisionCopy =
    pendingApprovalCount > 0
      ? '사람의 승인 항목이 남아 있어 결과를 확정할 수 없습니다.'
      : pendingActionCount > 0
        ? '후속 작업을 닫아야 승인과 결과 확정이 깔끔하게 이어집니다.'
        : '승인 대기와 후속 작업이 모두 정리되어 결과 확인 단계로 넘어갈 수 있습니다.';

  elements.reviewStageSummary.innerHTML = `
    <div class="stage-summary-card review-spotlight">
      <p class="summary-label">지금 판단할 내용</p>
      <div class="review-decision-strip">
        <div class="decision-chip ${pendingApprovalCount > 0 ? 'is-active' : 'is-clear'}">
          <span>승인 대기</span>
          <strong>${escapeHtml(String(pendingApprovalCount))}건</strong>
        </div>
        <div class="decision-chip ${pendingActionCount > 0 ? 'is-active' : 'is-clear'}">
          <span>후속 작업</span>
          <strong>${escapeHtml(String(pendingActionCount))}건</strong>
        </div>
        <div class="decision-chip is-neutral">
          <span>최근 세션</span>
          <strong>${escapeHtml(latestSession ? `${getDisplayLabel(latestSession.currentStage)} · ${getDisplayLabel(latestSession.status)}` : '세션 없음')}</strong>
        </div>
        ${
          latestExecutionSession
            ? `
              <div class="decision-chip is-neutral">
                <span>실행 세션</span>
                <strong>${escapeHtml(`${getDisplayLabel(latestExecutionSession.status)} · 검증 ${getDisplayLabel(latestExecutionSession.verification?.status, latestExecutionSession.verification?.status || 'pending')}`)}</strong>
              </div>
            `
            : ''
        }
      </div>
      <h4 class="summary-statement">${escapeHtml(primaryDecision)}</h4>
      <p class="summary-note review-priority-copy">${escapeHtml(decisionCopy)}</p>
      <p class="summary-note">${escapeHtml(latestExecutionSession?.verification?.summary || latestSession?.reviewerSummary || flow.copy)}</p>
      <div class="action-row">
        ${renderFlowQuickActionButton({
          action: 'switch-tab',
          actionLabel: `승인 항목 보기: ${reviewStageMissionLabel}`,
          buttonText: '승인 항목 보기',
          className: 'primary-button',
          value: 'reviews',
        })}
        ${renderFlowQuickActionButton({
          action: 'switch-tab',
          actionLabel: `후속 작업 보기: ${reviewStageMissionLabel}`,
          buttonText: '후속 작업 보기',
          value: 'reviews',
        })}
        ${renderFlowQuickActionButton({
          action: 'switch-tab',
          actionLabel: `실행 기록 보기: ${reviewStageMissionLabel}`,
          buttonText: '실행 기록 보기',
          className: 'secondary-button',
          value: 'runs',
        })}
      </div>
    </div>
  `;
  wireQuickActions(elements.reviewStageSummary);
}

function renderOutputStageCollapsedState({
  artifactLabel = '',
  flowLabel = '',
  flowBlocker = '',
  latestArtifact = null,
  latestRetrievalArtifact = null,
  latestRetrievalArtifactOpenLabel = '',
  outputStageTargetLabel = '',
  pendingActionCount = 0,
  pendingApprovalCount = 0,
  resultStateLabel = '',
} = {}) {
  return `
    <div class="stage-summary-card result-spotlight result-spotlight-collapsed">
      <div class="result-spotlight-head">
        <div class="definition-item">
          <span>결과 지원 패널</span>
          <strong>${escapeHtml(artifactLabel || flowLabel)}</strong>
        </div>
        <span class="status-badge ${latestArtifact ? 'status-completed' : 'status-pending'}">${escapeHtml(resultStateLabel)}</span>
      </div>
      <div class="result-spotlight-compact-meta">
        <span>${escapeHtml(`승인 ${pendingApprovalCount}건`)}</span>
        <span>${escapeHtml(`후속 ${pendingActionCount}건`)}</span>
        <span>${escapeHtml(`검토 · ${flowBlocker}`)}</span>
      </div>
      <div class="action-row">
        ${renderOutputToolbarToggleButton({
          action: 'toggle-output-support',
          actionLabel: `지원 패널 펼치기: ${outputStageTargetLabel}`,
          buttonText: '지원 패널 펼치기',
          className: 'primary-button',
          expanded: false,
        })}
        ${renderFlowQuickActionButton({
          action: 'switch-tab',
          actionLabel: `결과물 열기: ${outputStageTargetLabel}`,
          buttonText: '결과물 열기',
          value: 'artifacts',
        })}
        ${
          latestRetrievalArtifact
            ? renderRetrievalArtifactOpenButton({
                artifact: latestRetrievalArtifact,
                buttonText: 'retrieval 근거',
                openLabel: latestRetrievalArtifactOpenLabel,
              })
            : ''
        }
      </div>
    </div>
  `;
}

function renderOutputStageExpandedState({
  artifactLabel = '',
  artifactPath = '',
  compactMetaItems = [],
  flow = {},
  isOutputFocus = false,
  latestArtifact = null,
  latestExecutionSession = null,
  latestRetrievalArtifact = null,
  latestRetrievalArtifactOpenLabel = '',
  latestSession = null,
  outputStageTargetLabel = '',
  resultStateLabel = '',
  resultSummary = '',
  retrieval = null,
} = {}) {
  return `
    <div class="stage-summary-card result-spotlight">
      <div class="result-spotlight-head">
        <div class="definition-item">
          <span>대표 결과물</span>
          <strong>${escapeHtml(artifactLabel || flow.label)}</strong>
        </div>
        <span class="status-badge ${latestArtifact ? 'status-completed' : 'status-pending'}">${escapeHtml(resultStateLabel)}</span>
      </div>
      <p class="summary-note result-spotlight-note">${escapeHtml(resultSummary)}</p>
      <div class="summary-inline">
        <div class="summary-chip">
          <span>최근 세션</span>
          <strong>${escapeHtml(latestSession ? `${latestSession.provider || '-'} · ${getDisplayLabel(latestSession.status)}` : '아직 실행 전')}</strong>
        </div>
        <div class="summary-chip">
          <span>현재 단계</span>
          <strong>${escapeHtml(flow.currentStepLabel)}</strong>
        </div>
        ${
          latestExecutionSession
            ? `
              <div class="summary-chip">
                <span>검증 결과</span>
                <strong>${escapeHtml(getDisplayLabel(latestExecutionSession.verification?.status, latestExecutionSession.verification?.status || 'pending'))}</strong>
              </div>
            `
            : ''
        }
        <div class="definition-item">
          <span>결과 유형</span>
          <strong>${escapeHtml(latestArtifact ? getDisplayLabel(latestArtifact.kind, latestArtifact.kind) : '준비 중')}</strong>
        </div>
      </div>
      ${
        isOutputFocus
          ? `
            <div class="result-spotlight-compact-meta">
              <strong class="mono">${escapeHtml(artifactPath)}</strong>
              ${compactMetaItems.map((item) => `<span>${escapeHtml(item)}</span>`).join('')}
            </div>
          `
          : `
            <div class="definition-list result-definition-list">
              <div class="definition-item">
                <span>결과 파일</span>
                <strong class="mono">${escapeHtml(artifactPath)}</strong>
              </div>
              <div class="definition-item">
                <span>검토 상태</span>
                <strong>${escapeHtml(flow.blocker)}</strong>
              </div>
              ${
                latestExecutionSession
                  ? `
                    <div class="definition-item">
                      <span>변경 파일</span>
                      <strong>${escapeHtml(String(latestExecutionSession.changedFiles?.length || 0))}건</strong>
                    </div>
                  `
                  : ''
              }
            </div>
          `
      }
      ${
        latestRetrievalArtifact
          ? `
            <div class="harness-callout">
              <strong>최근 실행 retrieval evidence</strong>
              <p>${escapeHtml(`${latestRetrievalArtifact.role || 'agent'} · ${formatDate(latestRetrievalArtifact.updatedAt)} · ${latestRetrievalArtifact.path || latestRetrievalArtifact.fileName}`)}</p>
            </div>
          `
          : ''
      }
      ${renderRetrievalCompareCallout(retrieval, { includeAction: false })}
      <div class="action-row">
        ${renderFlowQuickActionButton({
          action: 'switch-tab',
          actionLabel: `결과물 열기: ${outputStageTargetLabel}`,
          buttonText: '결과물 열기',
          className: 'primary-button',
          value: 'artifacts',
        })}
        ${renderFlowQuickActionButton({
          action: 'switch-tab',
          actionLabel: `실행 기록 보기: ${outputStageTargetLabel}`,
          buttonText: '실행 기록 보기',
          value: 'runs',
        })}
        ${renderFlowQuickActionButton({
          action: 'switch-tab',
          actionLabel: `검토 상태 보기: ${outputStageTargetLabel}`,
          buttonText: '검토 상태 보기',
          className: 'secondary-button',
          value: 'reviews',
        })}
        ${
          latestRetrievalArtifact
            ? renderRetrievalArtifactOpenButton({
                artifact: latestRetrievalArtifact,
                openLabel: latestRetrievalArtifactOpenLabel,
              })
            : ''
        }
      </div>
    </div>
  `;
}

function renderOutputStageEmptyState() {
  return emptyStateCard({
    action: 'jump-step',
    actionLabel: '1단계 열기',
    actionValue: 'step-setup',
    icon: 'OT',
    message: '미션을 선택하고 실행이 끝나면 결과 요약이 이 단계에 표시됩니다.',
    title: '확인할 결과가 없습니다',
  });
}

function renderOutputStageSummary() {
  if (!elements.outputStageSummary) {
    return;
  }

  const latestArtifact = getPrimaryArtifact(state.currentSessionPayload?.artifacts || []);
  const latestSession = state.missionDetail?.summary?.latestSession || null;
  const retrieval = state.missionDetail?.harness?.retrieval || null;
  const latestRetrievalArtifact = retrieval?.latestArtifact || null;
  const latestRetrievalArtifactOpenLabel = latestRetrievalArtifact
    ? getRetrievalArtifactOpenLabel(latestRetrievalArtifact)
    : '';
  const execution = getExecutionStatusPayload();
  const latestExecutionSession = execution?.latestExecutionSession || null;
  const flow = getFlowState();
  const isOutputFocus = state.activeStep === 'step-output';

  if (!state.missionDetail) {
    elements.outputStageSummary.innerHTML = renderOutputStageEmptyState();
    wireQuickActions(elements.outputStageSummary);
    return;
  }

  const artifactLabel = getArtifactLabel(latestArtifact);
  const outputStageTargetLabel = artifactLabel || state.missionDetail?.mission?.title || state.selectedMissionId || '선택된 미션';
  const artifactPath = latestArtifact?.path || latestArtifact?.fileName || '결과 파일 경로가 아직 없습니다.';
  const resultStateLabel = latestArtifact ? '결과 확정 가능' : '결과 준비 중';
  const resultSummary = latestSession?.reviewerSummary || flow.copy;
  const pendingApprovalCount = state.approvals.filter((item) => item.missionId === state.selectedMissionId).length;
  const pendingActionCount = Number(state.missionActions?.summary?.pendingActionCount || 0);
  const compactMetaItems = [
    `검토 · ${flow.blocker}`,
    latestExecutionSession ? `변경 ${String(latestExecutionSession.changedFiles?.length || 0)}건` : null,
    latestArtifact ? `${getDisplayLabel(latestArtifact.kind, latestArtifact.kind)} 결과` : '결과 준비 중',
  ].filter(Boolean);

  if (isOutputFocus && !state.outputSupportExpanded) {
    elements.outputStageSummary.innerHTML = renderOutputStageCollapsedState({
      artifactLabel,
      flowBlocker: flow.blocker,
      flowLabel: flow.label,
      latestArtifact,
      latestRetrievalArtifact,
      latestRetrievalArtifactOpenLabel,
      outputStageTargetLabel,
      pendingActionCount,
      pendingApprovalCount,
      resultStateLabel,
    });
    wireRetrievalArtifactButtons(elements.outputStageSummary);
    wireQuickActions(elements.outputStageSummary);
    return;
  }

  elements.outputStageSummary.innerHTML = renderOutputStageExpandedState({
    artifactLabel,
    artifactPath,
    compactMetaItems,
    flow,
    isOutputFocus,
    latestArtifact,
    latestExecutionSession,
    latestRetrievalArtifact,
    latestRetrievalArtifactOpenLabel,
    latestSession,
    outputStageTargetLabel,
    resultStateLabel,
    resultSummary,
    retrieval,
  });
  wireRetrievalArtifactButtons(elements.outputStageSummary);
  wireRetrievalSourceButtons(elements.outputStageSummary);
  wireQuickActions(elements.outputStageSummary);
}

function renderOutputCloseoutState(closeoutItems = [], { isOutputFocus = false } = {}) {
  return closeoutItems
    .map(
      (item, index) => `
        <div class="closeout-item ${item.ready ? 'is-ready' : 'is-blocked'} ${isOutputFocus ? 'is-output-compact' : ''}">
          <div class="closeout-item-head">
            <span class="closeout-index">${escapeHtml(String(index + 1).padStart(2, '0'))}</span>
            <div class="closeout-item-body">
              <span class="closeout-label">${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(item.ready ? '바로 확인 가능' : '확인 필요')}</strong>
              <p class="closeout-copy">${escapeHtml(item.detail)}</p>
            </div>
            <span class="status-badge ${item.ready ? 'status-completed' : 'status-pending'}">${escapeHtml(item.ready ? '준비됨' : '확인 필요')}</span>
          </div>
          <div class="closeout-actions">
            ${renderFlowQuickActionButton({
              action: 'switch-tab',
              actionLabel: `${item.actionLabel}: ${item.label || item.actionValue}`,
              buttonText: item.actionLabel,
              value: item.actionValue,
            })}
          </div>
        </div>
      `,
    )
    .join('');
}

function renderOutputCloseoutEmptyState() {
  return emptyStateCard({
    action: 'jump-step',
    actionLabel: '1단계 열기',
    actionValue: 'step-setup',
    icon: 'CK',
    message: '미션을 선택하면 최종 결과를 닫기 전 확인할 체크리스트를 보여줍니다.',
    title: '확인할 마무리 항목이 없습니다',
  });
}

function renderOutputCloseout() {
  if (!elements.outputCloseout) {
    return;
  }

  if (!state.missionDetail) {
    elements.outputCloseout.innerHTML = renderOutputCloseoutEmptyState();
    wireQuickActions(elements.outputCloseout);
    return;
  }

  const latestSession = state.missionDetail.summary?.latestSession || null;
  const pendingApprovalCount = state.approvals.filter((item) => item.missionId === state.selectedMissionId).length;
  const pendingActionCount = Number(state.missionActions?.summary?.pendingActionCount || 0);
  const latestArtifact = getPrimaryArtifact(state.currentSessionPayload?.artifacts || []);
  const isOutputFocus = state.activeStep === 'step-output';
  const closeoutItems = [
    {
      actionLabel: '결과물 열기',
      actionValue: 'artifacts',
      detail: latestArtifact ? getArtifactLabel(latestArtifact) : '대표 결과물이 아직 준비되지 않았습니다.',
      label: '대표 결과물 확인',
      ready: Boolean(latestArtifact),
    },
    {
      actionLabel: '실행 기록 보기',
      actionValue: 'runs',
      detail: latestSession
        ? `${latestSession.provider || '-'} 제공자 기준 ${getDisplayLabel(latestSession.status)}`
        : '최근 세션이 아직 없습니다.',
      label: '최근 실행 상태 확인',
      ready: Boolean(latestSession && latestSession.status === 'completed'),
    },
    {
      actionLabel: '검토 상태 보기',
      actionValue: 'reviews',
      detail:
        pendingApprovalCount > 0
          ? `승인 ${pendingApprovalCount}건이 남아 있습니다.`
          : pendingActionCount > 0
            ? `후속 작업 ${pendingActionCount}건을 먼저 처리해야 합니다.`
            : '승인 대기와 후속 작업이 모두 정리되었습니다.',
      label: '검토와 승인 상태 정리',
      ready: pendingApprovalCount === 0 && pendingActionCount === 0,
    },
    {
      actionLabel: '입력값 확인',
      actionValue: 'config',
      detail: '최종 결과를 공유하거나 넘기기 전, 목표와 제약 조건이 결과와 맞는지 마지막으로 점검합니다.',
      label: '입력값과 설정 재확인',
      ready: true,
    },
  ];

  if (isExecutionMissionSelected() && state.releaseStatus) {
    const releaseSummary = state.releaseStatus.summary || {};
    closeoutItems.push({
      actionLabel: 'v1 마감 상태 보기',
      actionValue: 'release',
      detail: releaseSummary.ready
        ? 'execution v1 closeout checklist가 현재 HEAD 기준으로 닫혀 있습니다.'
        : releaseSummary.baselineReady
          ? 'verified snapshot 기준 필수 closeout은 닫혀 있고, current surface evidence/closeout/handoff만 새 HEAD 기준으로 다시 맞추면 됩니다.'
          : releaseSummary.checklistOpen
            ? `열린 체크리스트 ${releaseSummary.checklistOpen}건 · 환경 gap ${releaseSummary.blockedItems || 0}건`
            : 'execution v1 closeout 상태를 다시 확인해야 합니다.',
      label: '실행형 에이전트 v1 준비 상태',
      ready: Boolean(releaseSummary.ready || releaseSummary.baselineReady),
    });
  }

  elements.outputCloseout.innerHTML = renderOutputCloseoutState(closeoutItems, { isOutputFocus });
  wireQuickActions(elements.outputCloseout);
}

function renderDetailContextbarEmptyState() {
  return `
    <div class="detail-context-empty">미션을 선택하면 결과물, 실행 기록, 검토 이력의 기준 맥락이 여기에 표시됩니다.</div>
  `;
}

function renderDetailContextbarReleaseState(summary = {}) {
  return `
    <div class="detail-context-main">
      <span class="detail-context-label">현재 세부 보기</span>
      <strong>execution v1 마감 상태 확인 중</strong>
      <p>검증 근거, closeout checklist, provider readiness를 같은 작업면에서 확인합니다.</p>
    </div>
    <div class="detail-context-stats">
      <div class="detail-context-pill">
        <span>deterministic</span>
        <strong>${escapeHtml(summary.deterministicLabel)}</strong>
      </div>
      <div class="detail-context-pill">
        <span>열린 체크리스트</span>
        <strong>${escapeHtml(String(summary.checklistOpen))}건</strong>
      </div>
      <div class="detail-context-pill">
        <span>환경 gap</span>
        <strong>${escapeHtml(String(summary.blockedItems))}건</strong>
      </div>
      <div class="detail-context-pill">
        <span>갱신 시각</span>
        <strong>${escapeHtml(formatDate(summary.generatedAt))}</strong>
      </div>
    </div>
  `;
}

function renderDetailContextbarMissionState({
  approvals = [],
  artifacts = [],
  currentTabLabel = '',
  highlightedArtifact = '',
  latestSession = null,
  mission = {},
  missionHarness = {},
} = {}) {
  return `
    <div class="detail-context-main">
      <span class="detail-context-label">현재 세부 보기</span>
      <strong>${escapeHtml(currentTabLabel || '세부 보기')}</strong>
      <p>${escapeHtml(mission.title)} 기준으로 결과와 기록을 한곳에서 확인합니다.</p>
    </div>
    <div class="detail-context-stats">
      <div class="detail-context-pill">
        <span>최근 세션</span>
        <strong>${escapeHtml(latestSession ? `${latestSession.provider || '-'} · ${getDisplayLabel(latestSession.status)}` : '없음')}</strong>
      </div>
      <div class="detail-context-pill">
        <span>결과물</span>
        <strong>${escapeHtml(String(artifacts.length))}개 · ${escapeHtml(highlightedArtifact || '없음')}</strong>
      </div>
      <div class="detail-context-pill">
        <span>검토 상태</span>
        <strong>${escapeHtml(approvals.length ? `승인 ${approvals.length}건 기록` : '승인 기록 없음')}</strong>
      </div>
      <div class="detail-context-pill">
        <span>하네스</span>
        <strong>${escapeHtml(`${missionHarness?.recommendations?.length || 0}건 권장 · 메모 ${missionHarness?.memory?.missionCounts?.total || 0}개`)}</strong>
      </div>
    </div>
  `;
}

function renderDetailContextbar() {
  if (!elements.detailContextbar) {
    return;
  }

  if (state.activeDetailTab === 'release' && state.releaseStatus) {
    const summary = getReleaseStatusSummary();
    elements.detailContextbar.innerHTML = renderDetailContextbarReleaseState(summary);
    return;
  }

  if (!state.missionDetail) {
    elements.detailContextbar.innerHTML = renderDetailContextbarEmptyState();
    return;
  }

  const mission = state.missionDetail.mission;
  const latestSession = state.currentSessionPayload?.session || state.missionDetail.summary?.latestSession || null;
  const artifacts = state.currentSessionPayload?.artifacts || [];
  const approvals = state.currentSessionPayload?.approvals || [];
  const primaryArtifact = getPrimaryArtifact(artifacts);
  const currentTabLabel = {
    artifacts: '결과물 확인 중',
    runs: '실행 기록 확인 중',
    reviews: '검토 이력 확인 중',
    config: '입력값과 설정 확인 중',
    harness: '하네스 상태 확인 중',
  }[state.activeDetailTab];

  const highlightedArtifact =
    state.selectedArtifactId && state.artifactsById.has(state.selectedArtifactId)
      ? state.artifactsById.get(state.selectedArtifactId)?.artifact?.title ||
        state.artifactsById.get(state.selectedArtifactId)?.artifact?.fileName
      : getArtifactLabel(primaryArtifact) ||
        '선택된 결과물 없음';

  elements.detailContextbar.innerHTML = renderDetailContextbarMissionState({
    approvals,
    artifacts,
    currentTabLabel,
    highlightedArtifact,
    latestSession,
    mission,
    missionHarness: state.missionDetail?.harness,
  });
}

export function renderHarnessPanel() {
  syncHarnessDocumentLogControls();

  if (!state.missionDetail?.harness) {
    const empty = renderHarnessPanelEmptyState();
    elements.harnessSource.innerHTML = empty;
    elements.harnessMemory.innerHTML = empty;
    elements.harnessLoops.innerHTML = empty;
    wireHarnessEmptyPanelActions();
    return;
  }

  const harnessPanel = buildHarnessPanelViewModel(state.missionDetail.harness);

  elements.harnessSource.innerHTML = renderHarnessSourcePanel(harnessPanel.sourcePanel);
  elements.harnessMemory.innerHTML = renderHarnessMemoryPanel(harnessPanel.memoryPanel);
  elements.harnessLoops.innerHTML = renderHarnessLoopsPanel(harnessPanel.loopsPanel);
  wireHarnessPanelActions();
}

function renderReleaseStatusEmptyState() {
  return emptyStateCard({
    action: 'refresh-release-status',
    actionLabel: '마감 상태 불러오기',
    icon: 'V1',
    message: 'execution v1 검증 요약, evidence, closeout checklist를 같은 화면에서 확인할 수 있습니다.',
    title: 'v1 마감 상태가 아직 로드되지 않았습니다',
  });
}

export function renderReleaseStatus() {
  if (!elements.releaseStatus) {
    return;
  }

  if (!state.releaseStatus) {
    elements.releaseStatus.innerHTML = renderReleaseStatusEmptyState();
    wireQuickActions(elements.releaseStatus);
    return;
  }

  const release = state.releaseStatus;
  const summary = release.summary || {};
  const closeout = release.closeout || {};
  const evidence = release.evidence || {};
  const handoff = release.handoff || {};
  const values = release.values || {};
  const checklist = release.checklist || [];
  const gaps = release.gaps || [];
  const releaseReadiness = release.releaseReadiness || {};
  const productionBlockers = Array.isArray(releaseReadiness.productionBlockers)
    ? releaseReadiness.productionBlockers
    : [];
  const currentOpenBlockers = Array.isArray(releaseReadiness.currentOpenBlockers)
    ? releaseReadiness.currentOpenBlockers
    : [];
  const currentOpenBlockerActions = getReleaseCurrentOpenBlockerActions(release);
  const currentOpenBlockerActionSummary = releaseReadiness.currentOpenBlockerActionSummary || {};
  const currentOpenBlockerCategoryEntries = getReleaseCountRecordEntries(currentOpenBlockerActionSummary.categoryCounts);
  const currentOpenBlockerOwnerEntries = getReleaseCountRecordEntries(currentOpenBlockerActionSummary.ownerCounts);
  const currentOpenBlockerProviderEntries = getReleaseCountRecordEntries(currentOpenBlockerActionSummary.providerCounts);
  const topPriorityBlockerId = String(currentOpenBlockerActionSummary.topPriorityBlockerId || '').trim();
  const topPriorityBlockerLabel = String(
    currentOpenBlockerActionSummary.topPriorityBlocker
      || currentOpenBlockerActionSummary.topPriorityStopReason
      || 'current open blocker',
  ).trim();
  const blockerCategoryFilter = String(state.releaseBlockerCategoryFilter || '').trim();
  const blockerIncludeSharedProviderOperations = state.releaseBlockerIncludeSharedProviderOperations !== false;
  const blockerOwnerFilter = String(state.releaseBlockerOwnerFilter || '').trim();
  const blockerProviderFilter = String(state.releaseBlockerProviderFilter || '').trim();
  const hasBlockerFilter = Boolean(
    blockerCategoryFilter || blockerOwnerFilter || blockerProviderFilter || !blockerIncludeSharedProviderOperations,
  );
  const visibleCurrentOpenBlockerActions = currentOpenBlockerActions.filter((item) =>
    isReleaseBlockerActionVisibleForFilter(item, {
      category: blockerCategoryFilter,
      includeShared: blockerIncludeSharedProviderOperations,
      owner: blockerOwnerFilter,
      provider: blockerProviderFilter,
    }),
  );
  const hasEmptyBlockerFilter = hasBlockerFilter
    && currentOpenBlockerActions.length > 0
    && visibleCurrentOpenBlockerActions.length === 0;
  const currentOpenBlockerSliceSummary = getReleaseBlockerSliceSummary({
    blockerActions: visibleCurrentOpenBlockerActions,
    totalActions: currentOpenBlockerActions,
  });
  const productionBlockerCount = Number.isFinite(Number(summary.productionBlockerCount))
    ? Number(summary.productionBlockerCount)
    : productionBlockers.length;
  const focusedProductionBlockerIndex = getValidReleaseProductionBlockerIndex(
    state.releaseFocusedProductionBlockerIndex,
    release,
  );
  const focusedProductionBlockerIndexNumber =
    focusedProductionBlockerIndex === '' ? -1 : Number(focusedProductionBlockerIndex);
  const focusedProductionBlocker = focusedProductionBlockerIndexNumber >= 0
    ? String(productionBlockers[focusedProductionBlockerIndexNumber] || '').trim()
    : '';
  const focusedProductionBlockerOrdinal = getReleaseProductionBlockerOrdinal(focusedProductionBlockerIndex);
  const productionBlockersExpanded = Boolean(
    state.releaseProductionBlockersExpanded || focusedProductionBlockerIndexNumber >= 8,
  );
  const visibleProductionBlockers = productionBlockersExpanded
    ? productionBlockers
    : productionBlockers.slice(0, 8);
  const hiddenProductionBlockerCount = Math.max(0, productionBlockers.length - visibleProductionBlockers.length);
  const currentOpenBlockerCount = Number.isFinite(Number(summary.currentOpenBlockerCount))
    ? Number(summary.currentOpenBlockerCount)
    : currentOpenBlockers.length;
  const productionReadyStatus = String(
    summary.productionReadyStatus || releaseReadiness.productionReadyStatus || 'not tracked',
  ).trim();
  const productionReadyStopReason = String(
    summary.productionReadyStopReason || releaseReadiness.productionReadyStopReason || productionBlockers[0] || '',
  ).trim();
  const productionBlockerEvidenceDocHref = '/api/execution-v1/release-doc?path=docs%2Frelease-readiness-v1.md';
  const productionBlockerEvidenceDocLabel = 'release-readiness production-ready blockers';
  const liveValidation = release.liveValidation || [];
  const providerReadiness = release.providerReadiness || [];
  const handoffArtifacts = release.handoffArtifacts || [];
  const deterministicRuntime = Array.isArray(release.deterministicRuntime) ? release.deterministicRuntime : [];
  const releaseActionHistory = release.releaseActionHistory || [];
  const recommendedActions = release.recommendedActions || [];
  const runtimeJobs = release.runtimeJobs || {};
  const activeRuntimeJobs = Array.isArray(runtimeJobs.active) ? runtimeJobs.active.slice(0, 5) : [];
  const recentRuntimeJobs = Array.isArray(runtimeJobs.recent) ? runtimeJobs.recent.slice(0, 5) : [];
  const visibleRuntimeJobs = [
    ...activeRuntimeJobs.map((item) => ({ bucket: 'active', item })),
    ...recentRuntimeJobs.map((item) => ({ bucket: 'recent', item })),
  ].slice(0, 8);
  const refreshPlan = release.refreshPlan || null;
  const liveRefreshPreflight = state.releaseLiveRefreshPreflight || null;
  const releaseRefreshPreflight = state.releaseRefreshPreflight || null;
  const releaseSnapshotPreflight = state.releaseSnapshotPreflight || null;
  const releaseAllPreflight = state.releaseAllPreflight || null;
  const staleReasons = release.staleReasons || [];
  const localArtifactNotes = release.localArtifactNotes || [];
  const liveConfirmProvider = String(state.releaseLiveConfirmProvider || '').trim();
  const focusedBlockerId = String(state.releaseFocusedBlockerId || '').trim();
  const focusedProvider = String(state.releaseFocusedProvider || '').trim();
  const focusedHistoryId = String(state.releaseFocusedHistoryId || '').trim();
  const expandedHistoryId = String(state.releaseExpandedHistoryId || '').trim();
  const historyFilterOutcome = String(state.releaseHistoryFilterOutcome || '').trim();
  const historyFilterScope = String(state.releaseHistoryFilterScope || '').trim();
  const historyFilterProvider = String(state.releaseHistoryFilterProvider || '').trim();
  const focusedBlockerEntry =
    currentOpenBlockerActions.find((item) => String(item.id || '').trim() === focusedBlockerId) || null;
  const focusedBlockerEvidenceDocs = Array.isArray(focusedBlockerEntry?.evidenceDocs)
    ? focusedBlockerEntry.evidenceDocs.slice(0, 3)
    : [];
  const focusedBlockerCommands = Array.isArray(focusedBlockerEntry?.commands)
    ? focusedBlockerEntry.commands.slice(0, 3)
    : [];
  const coreDeterministicPassed = summary.coreDeterministicPassed ?? summary.deterministicPassed ?? 0;
  const coreDeterministicTotal = summary.coreDeterministicTotal ?? summary.deterministicTotal ?? 0;
  const referenceAdoptionPassed = Number(summary.referenceAdoptionPassed || 0);
  const referenceAdoptionTotal = Number(summary.referenceAdoptionTotal || 0);
  const referenceAdoptionLabel = referenceAdoptionTotal > 0
    ? `${referenceAdoptionPassed}/${referenceAdoptionTotal} passed`
    : 'not tracked';
  const referenceAdoptionAggregate = release.referenceAdoptionAggregate || {};
  const referenceAdoptionAggregateScripts = Array.isArray(referenceAdoptionAggregate.scripts)
    ? referenceAdoptionAggregate.scripts
    : [];
  const referenceAdoptionAggregateScriptCount = Number(
    summary.referenceAdoptionAggregateScriptCount || referenceAdoptionAggregate.scriptCount || referenceAdoptionAggregateScripts.length || 0,
  );
  const executionV1HelperPassed = Number(summary.executionV1HelperPassed || 0);
  const executionV1HelperTotal = Number(summary.executionV1HelperTotal || 0);
  const executionV1HelperLabel = executionV1HelperTotal > 0
    ? `${executionV1HelperPassed}/${executionV1HelperTotal} passed`
    : 'not tracked';
  const executionV1HandoffPassed = Number(summary.executionV1HandoffPassed || 0);
  const executionV1HandoffTotal = Number(summary.executionV1HandoffTotal || 0);
  const executionV1HandoffLabel = executionV1HandoffTotal > 0
    ? `${executionV1HandoffPassed}/${executionV1HandoffTotal} passed`
    : 'not tracked';
  const focusedProviderEntry = providerReadiness.find((item) => String(item.provider || '').trim() === focusedProvider) || null;
  const focusedProviderActionLabel = focusedProviderEntry?.label || focusedProvider || 'provider';
  const focusedProviderPreflight = focusedProviderEntry
    ? state.releasePreflightResults?.[focusedProviderEntry.provider] || null
    : null;
  const focusedProviderBlockerActions = focusedProvider
    ? getReleaseProviderBlockerActions({ provider: focusedProvider, releaseStatus: release })
    : [];
  const focusedProviderClosureSummary = focusedProviderEntry
    ? getReleaseProviderClosureSummary(focusedProviderEntry, focusedProviderBlockerActions)
    : null;
  const focusedProviderTopBlocker = focusedProviderBlockerActions[0] || null;
  const focusedProviderTopBlockerId = String(focusedProviderTopBlocker?.id || '').trim();
  const focusedProviderHistory = focusedProvider
    ? releaseActionHistory.filter((item) => String(item.provider || '').trim() === focusedProvider)
    : [];
  const focusedProviderLatestAction = focusedProviderHistory[0] || null;
  const focusedProviderAttentionHistory = focusedProviderHistory.filter((item) => isReleaseAttentionOutcome(item?.outcome));
  const focusedProviderLatestAttentionAction = focusedProviderAttentionHistory[0] || null;
  const focusedProviderLatestActionLabel = focusedProviderLatestAction
    ? getReleaseActionLabel(focusedProviderLatestAction.action)
    : 'provider record';
  const focusedProviderLatestAttentionLabel = focusedProviderLatestAttentionAction
    ? getReleaseActionLabel(focusedProviderLatestAttentionAction.action)
    : 'provider attention';
  const { attentionFlowActive: focusedProviderAttentionFlowActive, sameFlowActive: focusedProviderFlowActive } = focusedProviderLatestAction
    ? isRecommendationFlowActive({
        attentionAction: focusedProviderLatestAttentionAction,
        latestAction: focusedProviderLatestAction,
      }, {
        focusedHistoryId,
        historyFilterOutcome,
        historyFilterProvider,
        historyFilterScope,
      })
    : { attentionFlowActive: false, sameFlowActive: false };
  const orderedProviderReadiness = focusedProvider
    ? [
        ...providerReadiness.filter((item) => String(item.provider || '').trim() === focusedProvider),
        ...providerReadiness.filter((item) => String(item.provider || '').trim() !== focusedProvider),
      ]
    : providerReadiness;
  const regenerationConfirmArmed = Boolean(state.releaseRegenerationConfirmArmed);
  const snapshotConfirmArmed = Boolean(state.releaseSnapshotConfirmArmed);
  const snapshot = release.snapshot || null;
  const snapshotEligibility = release.snapshotEligibility || { allowed: false, reason: 'snapshot 상태를 확인할 수 없습니다.' };
  const releaseActionLabel = summary.commit
    || snapshot?.verifiedCommit
    || snapshot?.commit
    || handoff?.commit
    || evidence?.commit
    || values?.commit
    || 'execution-v1 release';
  const blockerFilterLabel = [
    `category ${blockerCategoryFilter || 'all'}`,
    `owner ${blockerOwnerFilter || 'all'}`,
    `provider ${blockerProviderFilter || 'all'}`,
    `shared provider ops ${blockerIncludeSharedProviderOperations ? 'included' : 'excluded'}`,
  ].join(' · ');
  const blockerProviderLabel = blockerProviderFilter || focusedProvider || 'provider';
  const productionBlockerActionLabel = `${productionBlockerCount} production blockers · ${productionReadyStopReason || 'stop reason not recorded'}`;
  const blockerTriageFilterActionLabel = `current open blocker slice · ${blockerFilterLabel}`;
  const blockerTriageProviderOnlyActionLabel = `provider-only ${blockerProviderLabel} · ${blockerFilterLabel}`;
  const targetEvidenceActionLabel = `target evidence intake · ${blockerTriageFilterActionLabel}`;
  const targetEvidenceProviderOnlyActionLabel = `provider-only target evidence · ${blockerTriageProviderOnlyActionLabel}`;
  const focusedBlockerLabel = focusedBlockerEntry
    ? `${focusedBlockerId || 'blocker'} · ${focusedBlockerEntry.blocker || focusedBlockerEntry.stopReason || 'current open blocker'}`
    : focusedBlockerId || '';
  const focusedProductionBlockerActionLabel =
    focusedProductionBlockerIndex !== ''
      ? `production blocker #${focusedProductionBlockerOrdinal} · ${focusedProductionBlocker || 'production-ready blocker'}`
      : '';
  const baseline = release.baseline || null;
  const docStatuses = release.docStatuses || [];
  const artifactStateLabel =
    release.artifactState === 'local-current'
      ? '로컬 갱신됨'
      : release.stale
        ? '갱신 필요'
        : '최신';
  const baselineStateLabel = baseline?.ready
    ? 'verified snapshot ready'
    : snapshot
      ? 'snapshot archived'
      : 'snapshot 없음';
  const readyHandoffArtifacts = handoffArtifacts.filter((item) => item.exists);
  const recommendedHandoffArtifacts = handoffArtifacts.filter((item) => item.recommended);
  const handoffPreviewArtifactId = String(state.releaseHandoffPreviewId || '').trim();
  const handoffPreviewArtifact = handoffArtifacts.find(
    (item) => String(item.id || '').trim() === handoffPreviewArtifactId && isReleaseHandoffPreviewable(item),
  ) || null;
  const handoffPreviewStatus = handoffPreviewArtifact ? String(state.releaseHandoffPreviewStatus || 'idle').trim() : 'idle';
  const handoffPreviewContent = handoffPreviewArtifact ? String(state.releaseHandoffPreviewContent || '') : '';
  const handoffPreviewError = handoffPreviewArtifact ? String(state.releaseHandoffPreviewError || '') : '';
  const handoffPreviewLineCount = handoffPreviewArtifact ? Number(state.releaseHandoffPreviewLineCount || 0) : 0;
  const handoffPreviewTruncated = Boolean(handoffPreviewArtifact && state.releaseHandoffPreviewTruncated);
  const handoffPreviewStructuredSummaryRows = handoffPreviewArtifact
    ? getReleaseHandoffStructuredSummaryRows(handoffPreviewArtifact)
    : [];
  const handoffPreviewStructuredSummaryOverviewLine = handoffPreviewArtifact
    ? getReleaseHandoffStructuredSummaryOverviewLine(handoffPreviewArtifact)
    : '';
  const handoffPreviewStructuredSummarySha = handoffPreviewArtifact
    ? getReleaseHandoffStructuredSummarySha(handoffPreviewArtifact)
    : '';
  const filteredReleaseActionHistory = releaseActionHistory.filter((item) => {
    const itemOutcome = String(item?.outcome || '').trim().toLowerCase();
    const itemScope = String(item?.scope || '').trim();
    const itemProvider = String(item?.provider || '').trim();
    if (historyFilterOutcome === 'attention' && !isReleaseAttentionOutcome(itemOutcome)) {
      return false;
    }
    if (historyFilterScope && itemScope !== historyFilterScope) {
      return false;
    }
    if (historyFilterProvider && itemProvider !== historyFilterProvider) {
      return false;
    }
    return true;
  });
  const orderedReleaseActionHistory = focusedHistoryId
    ? [
        ...filteredReleaseActionHistory.filter((item) => String(item?.id || '').trim() === focusedHistoryId),
        ...filteredReleaseActionHistory.filter((item) => String(item?.id || '').trim() !== focusedHistoryId),
      ]
    : filteredReleaseActionHistory;
  const releaseHeadline = summary.ready
    ? (release.artifactState === 'local-current'
      ? 'execution v1 closeout ready (local evidence)'
      : 'execution v1 closeout ready')
    : baseline?.ready && release.stale
      ? 'execution v1 baseline ready · current surface refresh needed'
      : baseline?.ready
        ? 'execution v1 baseline ready'
        : release.stale
          ? 'execution v1 evidence 갱신 필요'
          : 'execution v1 closeout 미완료';
  const releaseCopy = summary.ready
    ? (release.artifactState === 'local-current'
      ? '현재 HEAD 기준 evidence/closeout/handoff가 로컬에서 갱신되었습니다. 커밋되지 않았지만 근거 문서는 최신입니다.'
      : 'deterministic 검증과 closeout checklist가 모두 닫혔습니다.')
    : baseline?.ready && release.stale
      ? '마지막 verified snapshot 기준 필수 closeout은 이미 닫혔습니다. 현재 화면의 evidence/closeout/handoff는 최신 HEAD와 어긋나 있어 current surface만 다시 생성하면 됩니다.'
      : baseline?.ready
        ? 'verified snapshot 기준 release baseline은 준비되어 있습니다. current surface evidence/closeout/handoff를 다시 만들면 현재 HEAD 기준 closeout 상태도 맞출 수 있습니다.'
        : release.stale
          ? '현재 HEAD와 evidence/closeout/handoff 문서 상태가 어긋나 있습니다. rerun 또는 refresh로 근거 문서를 다시 맞춰야 합니다.'
          : '남은 gap과 환경 block을 먼저 정리해야 closeout을 닫을 수 있습니다.';
  const aggregatePreflightLabel = releaseAllPreflight
    ? `${releaseAllPreflight.status || 'unknown'} · ready ${Number(releaseAllPreflight.readyForLiveCount || 0)} · env ${Number(releaseAllPreflight.missingEnvCount || 0)}`
    : 'not-run';
  const aggregatePreflightReadyLabel = releaseAllPreflight
    ? `ready ${Number(releaseAllPreflight.readyForLiveCount || 0)}`
    : 'ready not tracked';
  const aggregatePreflightMissingEnvLabel = releaseAllPreflight
    ? `missing env ${Number(releaseAllPreflight.missingEnvCount || 0)}`
    : 'missing env not tracked';
  const aggregatePreflightBlockedLabel = releaseAllPreflight
    ? `blocked ${Number(releaseAllPreflight.blockedCount || 0)}`
    : 'blocked not tracked';

  elements.releaseStatus.innerHTML = `
    <div class="release-status-shell">
      <section class="release-summary-grid">
        <div class="summary-chip">
          <span>deterministic smoke</span>
          <strong>${escapeHtml(`${coreDeterministicPassed}/${coreDeterministicTotal} passed`)}</strong>
        </div>
        <div class="summary-chip">
          <span>reference gate</span>
          <strong>${escapeHtml(referenceAdoptionLabel)}</strong>
        </div>
        <div class="summary-chip">
          <span>live helper</span>
          <strong>${escapeHtml(executionV1HelperLabel)}</strong>
        </div>
        <div class="summary-chip">
          <span>handoff generator</span>
          <strong>${escapeHtml(executionV1HandoffLabel)}</strong>
        </div>
        <div class="summary-chip">
          <span>열린 체크리스트</span>
          <strong>${escapeHtml(String(summary.checklistOpen || 0))}건</strong>
        </div>
        <div class="summary-chip">
          <span>필수 gap</span>
          <strong>${escapeHtml(String(summary.blockedItems || 0))}건</strong>
        </div>
        <div class="summary-chip">
          <span>verified baseline</span>
          <strong>${escapeHtml(baselineStateLabel)}</strong>
        </div>
        <div class="summary-chip">
          <span>optional provider gap</span>
          <strong>${escapeHtml(String(summary.optionalBlockedItems || 0))}건</strong>
        </div>
        <div class="summary-chip">
          <span>production blockers</span>
          <strong>${escapeHtml(String(productionBlockerCount))}건</strong>
        </div>
        <div class="summary-chip">
          <span>open blockers</span>
          <strong>${escapeHtml(String(currentOpenBlockerCount))}건</strong>
        </div>
        <div class="summary-chip">
          <span>production status</span>
          <strong>${escapeHtml(productionReadyStatus)}</strong>
        </div>
        <div class="summary-chip">
          <span>evidence 상태</span>
          <strong>${escapeHtml(artifactStateLabel)}</strong>
        </div>
        <div class="summary-chip" data-release-runtime-job-metric="true">
          <span>runtime jobs</span>
          <strong>${escapeHtml(`active ${Number(runtimeJobs.activeCount || 0)} · recent ${Number(runtimeJobs.recentCount || 0)}`)}</strong>
        </div>
        <div class="summary-chip">
          <span>최종 갱신</span>
          <strong>${escapeHtml(formatDate(release.updatedAt))}</strong>
        </div>
      </section>

      <section class="release-callout">
        <div>
          <p class="section-kicker">릴리스 상태</p>
          <h4>${escapeHtml(releaseHeadline)}</h4>
          <p>${escapeHtml(releaseCopy)}</p>
          ${release.stale
            ? `
                <div class="release-stale-note">
                  ${staleReasons
                    .map((item) => `<div class="release-stale-line">${escapeHtml(item)}</div>`)
                    .join('')}
                </div>
              `
            : ''}
          ${!release.stale && localArtifactNotes.length
            ? `
                <div class="release-stale-note">
                  ${localArtifactNotes
                    .map((item) => `<div class="release-stale-line">${escapeHtml(item)}</div>`)
                    .join('')}
                </div>
              `
            : ''}
          ${baseline?.ready
            ? `
                <div class="release-stale-note">
                  <div class="release-stale-line">verified snapshot 기준 필수 closeout ${escapeHtml(String(baseline.checklistOpen || 0))}건 · 필수 gap ${escapeHtml(String(baseline.blockedItems || 0))}건입니다.</div>
                  <div class="release-stale-line">snapshot commit ${escapeHtml(baseline.commit || '-')} · archived ${escapeHtml(formatDate(baseline.archivedAt || baseline.generatedAt || ''))}</div>
                </div>
              `
            : ''}
          ${refreshPlan
            ? `
                <div class="release-stale-note">
                  <div class="release-stale-line">${escapeHtml(refreshPlan.summary || 'current surface regeneration preview를 확인할 수 없습니다.')}</div>
                  ${(refreshPlan.notes || [])
                    .map((item) => `<div class="release-stale-line">${escapeHtml(item)}</div>`)
                    .join('')}
                </div>
              `
            : ''}
          ${regenerationConfirmArmed
            ? `
                <div class="release-stale-note">
                  <div class="release-stale-line">${escapeHtml(releaseRefreshPreflight?.summary || '재생성 확인이 활성화되었습니다. 이 작업은 current surface evidence, closeout, handoff를 다시 쓰고, deterministic verification을 다시 실행합니다.')}</div>
                  <div class="release-stale-line">실행하려면 아래의 재생성 확인을 누르고, 취소하려면 현재 재생성 취소를 선택하세요.</div>
                  ${(releaseRefreshPreflight?.notes || [])
                    .map((item) => `<div class="release-stale-line">${escapeHtml(item)}</div>`)
                    .join('')}
                </div>
              `
            : ''}
          ${snapshotConfirmArmed
            ? `
                <div class="release-stale-note">
                  <div class="release-stale-line">${escapeHtml(releaseSnapshotPreflight?.summary || 'release snapshot 고정 확인이 활성화되었습니다.')}</div>
                  <div class="release-stale-line">실행하려면 아래의 snapshot 고정 확인을 누르고, 취소하려면 현재 snapshot 고정 취소를 선택하세요.</div>
                  ${(releaseSnapshotPreflight?.notes || [])
                    .map((item) => `<div class="release-stale-line">${escapeHtml(item)}</div>`)
                    .join('')}
                </div>
              `
            : ''}
        </div>
        <div class="action-row">
          ${renderReleaseStatusRefreshButton({
            actionLabel: `상태 다시 읽기: ${releaseActionLabel}`,
          })}
          ${renderReleasePreflightAllButton({
            actionLabel: `전체 preflight 실행: ${releaseActionLabel}`,
          })}
          ${renderReleaseCommandCopyButton({
            actionLabel: `전체 preflight 명령 복사: ${releaseActionLabel}`,
            buttonText: '전체 preflight 명령 복사',
            command: 'npm run preflight:execution-v1:all',
            label: '전체 preflight 명령',
          })}
          ${renderReleaseConfirmActionButton({
            action: 'regenerate-release-surface',
            actionLabel: regenerationConfirmArmed
              ? `current surface 재생성 확인: ${releaseActionLabel}`
              : `current surface 재생성: ${releaseActionLabel}`,
            buttonText: regenerationConfirmArmed ? '재생성 확인' : 'current surface 재생성',
            className: regenerationConfirmArmed ? 'primary-button' : 'ghost-button',
            pressed: regenerationConfirmArmed,
          })}
          ${regenerationConfirmArmed
            ? renderReleaseSimpleActionButton({
                action: 'cancel-regenerate-release-surface',
                actionLabel: `current surface 재생성 취소: ${releaseActionLabel}`,
                buttonText: '현재 재생성 취소',
              })
            : ''}
          ${renderReleaseConfirmActionButton({
            action: 'archive-release-snapshot',
            actionLabel: snapshotConfirmArmed
              ? `release snapshot 고정 확인: ${releaseActionLabel}`
              : `release snapshot 고정: ${releaseActionLabel}`,
            buttonText: snapshotConfirmArmed ? 'snapshot 고정 확인' : 'release snapshot 고정',
            className: snapshotConfirmArmed ? 'primary-button' : 'ghost-button',
            disabled: !snapshotConfirmArmed && !snapshotEligibility.allowed,
            pressed: snapshotConfirmArmed,
          })}
          ${snapshotConfirmArmed
            ? renderReleaseSimpleActionButton({
                action: 'cancel-archive-release-snapshot',
                actionLabel: `release snapshot 고정 취소: ${releaseActionLabel}`,
                buttonText: '현재 snapshot 고정 취소',
              })
            : ''}
          ${renderReleaseTabActionButton({
            actionLabel: `실행 기록 보기: ${releaseActionLabel}`,
            buttonText: '실행 기록 보기',
            value: 'runs',
          })}
          ${renderReleaseTabActionButton({
            actionLabel: `하네스 보기: ${releaseActionLabel}`,
            buttonText: '하네스 보기',
            value: 'harness',
          })}
        </div>
      </section>

      <section class="surface" data-release-deterministic-runtime="true">
        <div class="mini-head">
          <div>
            <p class="section-kicker">Deterministic Runtime Summary</p>
            <h4>smoke 실행 시간과 출력 크기</h4>
          </div>
          <div class="release-meta release-meta-secondary">
            <span class="item-meta">${escapeHtml(String(deterministicRuntime.length))} checks</span>
          </div>
        </div>
        <div class="release-current-status">
          ${deterministicRuntime.length
            ? deterministicRuntime
              .map(
                (item) => `
                  <div class="harness-row" data-release-deterministic-runtime-row="${escapeHtml(item.script || '')}">
                    <div>
                      <div class="item-title">${escapeHtml(item.script || 'unknown smoke')}</div>
                      <div class="item-meta">${escapeHtml(item.summary || 'runtime summary unavailable')}</div>
                    </div>
                    <div class="harness-row-meta">
                      <span class="mini-badge status-running">${escapeHtml(item.elapsed || 'n/a')}</span>
                      <span class="item-meta">stdout ${escapeHtml(item.stdout || 'n/a')}</span>
                      <span class="item-meta">stderr ${escapeHtml(item.stderr || 'n/a')}</span>
                      <span class="item-meta">timeout ${escapeHtml(item.timeout || 'n/a')}</span>
                    </div>
                  </div>
                `,
              )
              .join('')
            : `
                <article class="release-snapshot-card is-empty">
                  <div class="item-title">deterministic runtime summary가 없습니다.</div>
                  <p class="item-meta">archived live proof를 유지하려면 기존 evidence를 재사용하고, provider proof를 갱신할 때만 selected live evidence command를 실행하세요.</p>
                </article>
              `}
        </div>
      </section>

      <section class="surface" data-release-reference-adoption-aggregate="true">
        <div class="mini-head">
          <div>
            <p class="section-kicker">Reference Adoption Aggregate</p>
            <h4>외부 레퍼런스 채택 회귀 게이트</h4>
          </div>
          <div class="release-meta release-meta-secondary">
            <span class="item-meta">${escapeHtml(String(referenceAdoptionAggregateScriptCount))} scripts</span>
            <span class="item-meta">${escapeHtml(referenceAdoptionAggregate.totalDuration || 'duration n/a')}</span>
          </div>
        </div>
        <div class="release-current-status">
          ${referenceAdoptionAggregateScripts.length
            ? referenceAdoptionAggregateScripts
              .map(
                (item) => `
                  <div class="harness-row" data-release-reference-adoption-row="${escapeHtml(item.script || '')}">
                    <div>
                      <div class="item-title">${escapeHtml(item.script || 'unknown reference smoke')}</div>
                      <div class="item-meta">borrowed-pattern regression coverage</div>
                    </div>
                    <div class="harness-row-meta">
                      <span class="mini-badge ${item.status === 'passed' ? 'status-completed' : 'status-failed'}">${escapeHtml(item.status || 'unknown')}</span>
                      <span class="item-meta">${escapeHtml(item.duration || 'duration n/a')}</span>
                      ${item.timeout ? `<span class="item-meta">timeout ${escapeHtml(item.timeout)}</span>` : ''}
                      ${typeof item.timedOut === 'boolean'
                        ? `<span class="item-meta">timedOut ${escapeHtml(String(item.timedOut))}</span>`
                        : ''}
                    </div>
                  </div>
                `,
              )
              .join('')
            : `
                <article class="release-snapshot-card is-empty">
                  <div class="item-title">reference adoption aggregate details가 없습니다.</div>
                  <p class="item-meta">archived live proof를 유지하려면 기존 evidence를 재사용하고, provider proof를 갱신할 때만 selected live evidence command를 실행하세요.</p>
                </article>
              `}
        </div>
      </section>

      <section class="surface" data-release-runtime-job-list="true">
        <div class="mini-head">
          <div>
            <p class="section-kicker">Runtime Job History</p>
            <h4>active/recent release runtime jobs</h4>
          </div>
          <div class="release-meta release-meta-secondary">
            <span class="item-meta">active ${escapeHtml(String(activeRuntimeJobs.length))}</span>
            <span class="item-meta">recent ${escapeHtml(String(runtimeJobs.recentCount || recentRuntimeJobs.length))}</span>
          </div>
        </div>
        <div class="release-history-list">
          ${visibleRuntimeJobs.length
            ? visibleRuntimeJobs
              .map(({ bucket, item }) => renderReleaseRuntimeJobCard(item, bucket))
              .join('')
            : `
                <article class="release-snapshot-card is-empty">
                  <div class="item-title">최근 runtime job 기록이 없습니다.</div>
                  <p class="item-meta">current surface 재생성 또는 release snapshot 고정을 실행하면 job id, request id, duration, status가 여기에 표시됩니다.</p>
                </article>
              `}
        </div>
      </section>

      <div class="detail-grid detail-grid-two release-detail-grid">
        <section class="surface">
          <div class="mini-head">
            <div>
              <p class="section-kicker">Closeout Checklist</p>
              <h4>마감 체크리스트와 현재 상태</h4>
            </div>
          </div>
          <div class="release-meta">
            <span class="item-meta">branch ${escapeHtml(release.branch || '-')}</span>
            <span class="item-meta mono">${escapeHtml(release.commit || '-')}</span>
          </div>
          ${(release.currentCommit || release.currentBranch)
            ? `
                <div class="release-meta release-meta-secondary">
                  <span class="item-meta">current ${escapeHtml(release.currentBranch || '-')}</span>
                  <span class="item-meta mono">${escapeHtml(release.currentCommit || '-')}</span>
                </div>
              `
            : ''}
          <div class="release-checklist">
            ${checklist
              .map(
                (item) => `
                  <div class="release-checklist-item ${item.done ? 'is-ready' : 'is-blocked'}">
                    <span class="status-badge ${item.done ? 'status-completed' : 'status-failed'}">${escapeHtml(item.done ? '완료' : '남음')}</span>
                    <div>
                      <strong>${escapeHtml(item.label)}</strong>
                    </div>
                  </div>
                `,
              )
              .join('')}
          </div>
          <div class="release-current-status">
            ${Object.entries(values)
              .map(
                ([label, value]) => `
                  <div class="harness-row">
                    <div>
                      <div class="item-title">${escapeHtml(label)}</div>
                    </div>
                    <div class="harness-row-meta">
                      <span class="mini-badge ${getReleaseStatusBadge(value)}">${escapeHtml(value)}</span>
                    </div>
                  </div>
                `,
              )
              .join('')}
          </div>
          ${docStatuses.length
            ? `
                <div class="release-doc-status-list">
                  ${docStatuses
                    .map(
                      (item) => `
                        <div class="harness-row">
                          <div>
                            <div class="item-title">${escapeHtml(item.path)}</div>
                          </div>
                          <div class="harness-row-meta">
                            <span class="mini-badge status-failed">${escapeHtml(item.status)}</span>
                          </div>
                        </div>
                      `,
                    )
                    .join('')}
                </div>
              `
            : ''}
        </section>

        <section class="surface">
          <div class="mini-head">
            <div>
              <p class="section-kicker">Release Evidence</p>
              <h4>남은 gap, provider readiness, 증거 문서</h4>
            </div>
          </div>
          <div class="release-list">
            <div class="release-recommendation-list">
              ${(recommendedActions.length
                ? recommendedActions
                  .map(
                    (item) => {
                      const historyContext = getRecommendationHistoryContext(item, releaseActionHistory, providerReadiness);
                      const recommendationCommand = getRecommendationCommandContext(item, providerReadiness);
                      const recommendationProvider = getRecommendationProviderEntry(item, providerReadiness);
                      const latestAction = historyContext.latestAction;
                      const latestAttentionAction = historyContext.latestAttentionAction;
                      const recommendationProviderId = String(recommendationProvider?.provider || '').trim();
                      const recommendationProviderActionLabel = recommendationProvider?.label || recommendationProviderId || 'provider';
                      const sameProviderFocused = Boolean(recommendationProviderId && recommendationProviderId === focusedProvider);
                      const recommendationProviderFocusLabel = sameProviderFocused
                        ? `현재 provider 카드: ${recommendationProviderActionLabel}`
                        : `provider 카드 보기: ${recommendationProviderActionLabel}`;
                      const recommendationActionTargetLabel = item.label || item.action || recommendationProviderActionLabel || '권장 액션';
                      const latestActionTargetLabel = latestAction
                        ? `${getReleaseActionLabel(latestAction.action)} · ${latestAction.provider || 'provider 미지정'} · ${latestAction.id || latestAction.scope || '최근 기록'}`
                        : '';
                      const latestAttentionActionTargetLabel = latestAttentionAction
                        ? `${getReleaseActionLabel(latestAttentionAction.action)} · ${latestAttentionAction.provider || latestAction?.provider || 'provider 미지정'} · ${latestAttentionAction.id || latestAttentionAction.scope || latestAction?.scope || '최근 문제'}`
                        : '';
                      const { sameFlowActive, attentionFlowActive } = latestAction
                        ? isRecommendationFlowActive({
                          attentionAction: latestAttentionAction,
                          latestAction,
                        }, {
                          focusedHistoryId,
                          historyFilterOutcome,
                          historyFilterProvider,
                          historyFilterScope,
                        })
                        : { attentionFlowActive: false, sameFlowActive: false };
                      return `
                      <article class="release-recommendation-card release-recommendation-${escapeHtml(item.category || 'info')} ${sameFlowActive || attentionFlowActive ? 'is-active-flow' : ''} ${sameProviderFocused ? 'is-active-provider' : ''} ${historyContext.attentionCount ? 'has-attention-flow' : ''}">
                        <div>
                          <div class="item-title">${escapeHtml(item.label || '권장 액션')}</div>
                          <div class="item-meta">${escapeHtml(item.description || '')}</div>
                          ${latestAction
                            ? `
                                <div class="item-meta">
                                  최근 시도 · ${escapeHtml(getReleaseActionLabel(latestAction.action))} · ${escapeHtml(latestAction.outcome || 'unknown')} · ${escapeHtml(formatDate(latestAction.createdAt))}
                                </div>
                                <div class="item-meta">${escapeHtml(latestAction.summary || '최근 action summary가 없습니다.')}</div>
                                <div class="release-history-filter-chips">
                                  <span class="mini-badge status-running">같은 flow ${escapeHtml(String(historyContext.matchCount || 0))}건</span>
                                  ${historyContext.attentionCount
                                    ? `<span class="mini-badge status-failed">문제 흐름 ${escapeHtml(String(historyContext.attentionCount))}건</span>`
                                    : ''}
                                </div>
                                ${latestAttentionAction
                                  ? `
                                      <div class="item-meta">
                                        최근 문제 · ${escapeHtml(getReleaseActionLabel(latestAttentionAction.action))} · ${escapeHtml(formatDate(latestAttentionAction.createdAt))}
                                      </div>
                                      <div class="item-meta">${escapeHtml(latestAttentionAction.summary || '최근 문제 summary가 없습니다.')}</div>
                                    `
                                  : ''}
                                ${(sameFlowActive || attentionFlowActive)
                                  ? `
                                      <div class="release-history-filter-chips">
                                        ${sameFlowActive ? '<span class="mini-badge status-running">현재 flow 적용 중</span>' : ''}
                                        ${attentionFlowActive ? '<span class="mini-badge status-failed">현재 문제 흐름 적용 중</span>' : ''}
                                        ${sameProviderFocused ? '<span class="mini-badge status-running">현재 provider 적용 중</span>' : ''}
                                      </div>
                                    `
                                  : ''}
                              `
                            : ''}
                        </div>
                        <div class="release-provider-meta">
                          <span class="mini-badge ${getReleaseStatusBadge(item.category === 'required' ? 'blocked' : item.category === 'release' ? 'ready' : 'not-run')}">${escapeHtml(item.category || 'info')}</span>
                          ${latestAction
                            ? `
                                <div class="release-recommendation-actions">
                                  ${renderReleaseProviderNavigationButton({
                                    action: 'focus-release-history',
                                    actionLabel: `최근 기록 보기: ${latestActionTargetLabel}`,
                                    buttonText: '최근 기록 보기',
                                    pressed: String(latestAction.id || '').trim() === focusedHistoryId,
                                    value: latestAction.id || '',
                                  })}
                                  ${renderReleaseLinkCopyButton({
                                    action: 'copy-release-history-link',
                                    actionLabel: `기록 링크 복사: ${latestActionTargetLabel}`,
                                    buttonText: '기록 링크 복사',
                                    value: latestAction.id || '',
                                  })}
                                  ${latestAttentionAction && latestAttentionAction.id !== latestAction.id
                                    ? `
                                        ${renderReleaseProviderNavigationButton({
                                          action: 'focus-release-history',
                                          actionLabel: `최근 문제 보기: ${latestAttentionActionTargetLabel}`,
                                          buttonText: '최근 문제 보기',
                                          pressed: String(latestAttentionAction.id || '').trim() === focusedHistoryId,
                                          value: latestAttentionAction.id || '',
                                        })}
                                        ${renderReleaseLinkCopyButton({
                                          action: 'copy-release-history-link',
                                          actionLabel: `문제 기록 링크 복사: ${latestAttentionActionTargetLabel}`,
                                          buttonText: '문제 기록 링크 복사',
                                          value: latestAttentionAction.id || '',
                                        })}
                                      `
                                    : ''}
                                  ${renderReleaseProviderNavigationButton({
                                    action: 'focus-release-flow',
                                    actionLabel: sameFlowActive ? `현재 flow: ${latestActionTargetLabel}` : `같은 flow 보기: ${latestActionTargetLabel}`,
                                    buttonText: sameFlowActive ? '현재 flow' : '같은 flow 보기',
                                    disabled: sameFlowActive ? true : null,
                                    outcome: isReleaseAttentionOutcome(latestAction.outcome) ? 'attention' : '',
                                    pressed: sameFlowActive,
                                    provider: String(latestAction.provider || '').trim(),
                                    scope: String(latestAction.scope || '').trim(),
                                    value: latestAction.id || '',
                                  })}
                                  ${renderReleaseLinkCopyButton({
                                    action: 'copy-release-flow-link',
                                    actionLabel: `flow 링크 복사: ${latestActionTargetLabel}`,
                                    attributes: `data-ui-outcome="${escapeHtml(isReleaseAttentionOutcome(latestAction.outcome) ? 'attention' : '')}" data-ui-scope="${escapeHtml(String(latestAction.scope || '').trim())}" data-ui-provider="${escapeHtml(String(latestAction.provider || '').trim())}"`,
                                    buttonText: 'flow 링크 복사',
                                    value: latestAction.id || '',
                                  })}
                                  ${latestAttentionAction
                                    ? `
                                        ${renderReleaseProviderNavigationButton({
                                          action: 'focus-release-flow',
                                          actionLabel: attentionFlowActive ? `현재 문제 흐름: ${latestAttentionActionTargetLabel}` : `같은 문제 흐름 보기: ${latestAttentionActionTargetLabel}`,
                                          buttonText: attentionFlowActive ? '현재 문제 흐름' : '같은 문제 흐름 보기',
                                          disabled: attentionFlowActive ? true : null,
                                          outcome: 'attention',
                                          pressed: attentionFlowActive,
                                          provider: String(latestAttentionAction.provider || latestAction.provider || '').trim(),
                                          scope: String(latestAttentionAction.scope || latestAction.scope || '').trim(),
                                          value: latestAttentionAction.id || '',
                                        })}
                                        ${renderReleaseLinkCopyButton({
                                          action: 'copy-release-flow-link',
                                          actionLabel: `문제 흐름 링크 복사: ${latestAttentionActionTargetLabel}`,
                                          attributes: `data-ui-outcome="attention" data-ui-scope="${escapeHtml(String(latestAttentionAction.scope || latestAction.scope || '').trim())}" data-ui-provider="${escapeHtml(String(latestAttentionAction.provider || latestAction.provider || '').trim())}"`,
                                          buttonText: '문제 흐름 링크 복사',
                                          value: latestAttentionAction.id || '',
                                        })}
                                      `
                                    : ''}
                                  ${recommendationCommand
                                    ? `
                                        ${renderReleaseCommandCopyButton({
                                          actionLabel: `${recommendationCommand.buttonLabel}: ${recommendationCommand.label}`,
                                          buttonText: recommendationCommand.buttonLabel,
                                          command: recommendationCommand.command,
                                          label: recommendationCommand.label,
                                        })}
                                      `
                                    : ''}
                                  ${recommendationProviderId
                                    ? `
                                        ${renderReleaseProviderFocusActionButton({
                                          actionLabel: recommendationProviderFocusLabel,
                                          buttonText: sameProviderFocused ? '현재 provider 카드' : 'provider 카드 보기',
                                          disabled: sameProviderFocused,
                                          pressed: sameProviderFocused,
                                          provider: recommendationProviderId,
                                        })}
                                        ${renderReleaseLinkCopyButton({
                                          action: 'copy-release-provider-link',
                                          actionLabel: `provider 링크 복사: ${recommendationProviderActionLabel}`,
                                          attributes: `data-ui-provider="${escapeHtml(recommendationProviderId)}"`,
                                          buttonText: 'provider 링크 복사',
                                          value: recommendationProviderId,
                                        })}
                                      `
                                    : ''}
                                </div>
                              `
                            : item.action
                              ? `
                                <div class="release-recommendation-actions">
                                  ${renderReleaseRecommendationActionButton({
                                    action: item.action,
                                    actionLabel: `권장 액션 실행: ${recommendationActionTargetLabel}`,
                                    provider: item.actionProvider,
                                  })}
                                  ${recommendationCommand
                                    ? `
                                        ${renderReleaseCommandCopyButton({
                                          actionLabel: `${recommendationCommand.buttonLabel}: ${recommendationCommand.label}`,
                                          buttonText: recommendationCommand.buttonLabel,
                                          command: recommendationCommand.command,
                                          label: recommendationCommand.label,
                                        })}
                                      `
                                    : ''}
                                  ${recommendationProviderId
                                    ? `
                                        ${renderReleaseProviderFocusActionButton({
                                          actionLabel: recommendationProviderFocusLabel,
                                          buttonText: sameProviderFocused ? '현재 provider 카드' : 'provider 카드 보기',
                                          disabled: sameProviderFocused,
                                          pressed: sameProviderFocused,
                                          provider: recommendationProviderId,
                                        })}
                                        ${renderReleaseLinkCopyButton({
                                          action: 'copy-release-provider-link',
                                          actionLabel: `provider 링크 복사: ${recommendationProviderActionLabel}`,
                                          attributes: `data-ui-provider="${escapeHtml(recommendationProviderId)}"`,
                                          buttonText: 'provider 링크 복사',
                                          value: recommendationProviderId,
                                        })}
                                      `
                                    : ''}
                                </div>
                              `
                              : item.envKey
                                ? `
                                    <div class="release-recommendation-actions">
                                      <span class="item-meta mono">${escapeHtml(item.envKey)}</span>
                                      ${recommendationCommand
                                        ? `
                                            ${renderReleaseCommandCopyButton({
                                              actionLabel: `${recommendationCommand.buttonLabel}: ${recommendationCommand.label}`,
                                              buttonText: recommendationCommand.buttonLabel,
                                              command: recommendationCommand.command,
                                              label: recommendationCommand.label,
                                            })}
                                      `
                                        : ''}
                                      ${recommendationProviderId
                                        ? `
                                            ${renderReleaseProviderFocusActionButton({
                                              actionLabel: recommendationProviderFocusLabel,
                                              buttonText: sameProviderFocused ? '현재 provider 카드' : 'provider 카드 보기',
                                              disabled: sameProviderFocused,
                                              pressed: sameProviderFocused,
                                              provider: recommendationProviderId,
                                            })}
                                            ${renderReleaseLinkCopyButton({
                                              action: 'copy-release-provider-link',
                                              actionLabel: `provider 링크 복사: ${recommendationProviderActionLabel}`,
                                              attributes: `data-ui-provider="${escapeHtml(recommendationProviderId)}"`,
                                              buttonText: 'provider 링크 복사',
                                              value: recommendationProviderId,
                                            })}
                                          `
                                        : ''}
                                    </div>
                                  `
                                : ''}
                        </div>
                      </article>
                    `;
                    },
                  )
                  .join('')
                : `
                    <article class="release-recommendation-card release-recommendation-release">
                      <div>
                        <div class="item-title">필수 다음 액션 없음</div>
                        <div class="item-meta">verified baseline 기준 필수 closeout은 닫혀 있고, 남은 것은 optional provider expansion 또는 mutable current surface 운영뿐입니다.</div>
                      </div>
                    </article>
                  `)}
            </div>
            <div class="harness-callout" data-release-production-blockers="true">
              <strong>Production-ready blocker ${escapeHtml(String(productionBlockerCount))}건</strong>
              <p>${escapeHtml(productionReadyStopReason || 'production-ready stop reason이 release readiness 문서에 아직 기록되지 않았습니다.')}</p>
                      <div class="release-history-filter-chips">
                        ${renderReleaseProductionBlockerSummaryCopyButton({
                          actionLabel: `production blocker summary 복사: ${productionBlockerActionLabel}`,
                          attributes: 'data-release-production-blocker-summary-copy="true"',
                          buttonText: 'production summary 복사',
                          copyKey: 'production-blocker-summary',
                          disabled: !productionBlockers.length,
                        })}
                        ${renderReleaseLinkCopyButton({
                          action: 'copy-release-evidence-doc-link',
                          actionLabel: `release-readiness 링크 복사: ${productionBlockerActionLabel}`,
                          attributes: 'data-release-production-blocker-release-doc="true" data-ui-href="/api/execution-v1/release-doc?path=docs%2Frelease-readiness-v1.md" data-ui-label="release-readiness"',
                          buttonText: 'release-readiness 링크 복사',
                          value: '/api/execution-v1/release-doc?path=docs%2Frelease-readiness-v1.md',
                        })}
              </div>
            </div>
            <div class="harness-callout" data-release-current-open-blocker-triage="true">
              <strong>Open blocker triage · ${escapeHtml(String(Number(currentOpenBlockerActionSummary.actionCount || currentOpenBlockerActions.length || 0)))} actions</strong>
              <p>${escapeHtml(topPriorityBlockerId ? `Top priority ${topPriorityBlockerId}: ${topPriorityBlockerLabel}` : 'current open blocker triage summary가 없습니다.')}</p>
              ${hasBlockerFilter
                ? `<p class="item-meta" data-release-current-open-blocker-filter-summary="true">filtered ${escapeHtml(String(visibleCurrentOpenBlockerActions.length))}/${escapeHtml(String(currentOpenBlockerActions.length))} · category ${escapeHtml(blockerCategoryFilter || 'all')} · owner ${escapeHtml(blockerOwnerFilter || 'all')} · provider ${escapeHtml(blockerProviderFilter || 'all')} · shared provider ops ${escapeHtml(blockerIncludeSharedProviderOperations ? 'included' : 'excluded')}</p>`
                : '<p class="item-meta" data-release-current-open-blocker-filter-summary="true">all current open blockers visible · shared provider ops included</p>'}
              ${hasEmptyBlockerFilter
                ? `<p class="item-meta" data-release-current-open-blocker-filter-empty="true">이 category/owner/provider 조합에 해당하는 current open blocker가 없습니다. category, owner, provider 중 하나만 유지하거나 필터를 해제하세요.</p>`
                : ''}
              <p class="item-meta" data-release-current-open-blocker-slice-summary="true">
                slice metrics ·
                <span data-release-current-open-blocker-slice-closure-count="${escapeHtml(String(currentOpenBlockerSliceSummary.closureVerificationCount))}">closure verifications ${escapeHtml(String(currentOpenBlockerSliceSummary.closureVerificationCount))}</span>
                ·
                <span data-release-current-open-blocker-slice-required-proof-count="${escapeHtml(String(currentOpenBlockerSliceSummary.requiredProofCount))}">required proofs ${escapeHtml(String(currentOpenBlockerSliceSummary.requiredProofCount))}</span>
                ·
                <span data-release-current-open-blocker-slice-command-count="${escapeHtml(String(currentOpenBlockerSliceSummary.commandCount))}">commands ${escapeHtml(String(currentOpenBlockerSliceSummary.commandCount))}</span>
                ·
                <span data-release-current-open-blocker-slice-evidence-count="${escapeHtml(String(currentOpenBlockerSliceSummary.evidenceDocCount))}">evidence docs ${escapeHtml(String(currentOpenBlockerSliceSummary.evidenceDocCount))}</span>
                ·
                <span data-release-current-open-blocker-slice-top="${escapeHtml(currentOpenBlockerSliceSummary.topVisibleBlockerId || 'none')}">top ${escapeHtml(currentOpenBlockerSliceSummary.topVisibleBlockerId || 'none')}</span>
              </p>
              <div class="release-history-filter-chips">
                ${currentOpenBlockerCategoryEntries.length
                  ? currentOpenBlockerCategoryEntries
                    .map(
                      ([category, count]) => `
                        ${renderReleaseBlockerFilterButton({
                          actionLabel: `blocker category 필터: ${category} ${count}건 · ${blockerFilterLabel}`,
                          buttonText: `${category} ${count}`,
                          category,
                          countAttributeName: 'data-release-current-open-blocker-category-count',
                          countAttributeValue: category,
                          disabled: blockerCategoryFilter === category,
                          owner: blockerOwnerFilter,
                          pressed: blockerCategoryFilter === category,
                          provider: blockerProviderFilter,
                        })}
                      `,
                    )
                    .join('')
                  : '<span class="mini-badge status-running">category 없음</span>'}
                ${currentOpenBlockerOwnerEntries.length
                  ? currentOpenBlockerOwnerEntries
                    .map(
                      ([owner, count]) => `
                        ${renderReleaseBlockerFilterButton({
                          actionLabel: `blocker owner 필터: ${owner} ${count}건 · ${blockerFilterLabel}`,
                          buttonText: `${owner} ${count}`,
                          category: blockerCategoryFilter,
                          countAttributeName: 'data-release-current-open-blocker-owner-count',
                          countAttributeValue: owner,
                          disabled: blockerOwnerFilter === owner,
                          owner,
                          pressed: blockerOwnerFilter === owner,
                          provider: blockerProviderFilter,
                        })}
                      `,
                    )
                    .join('')
                  : '<span class="mini-badge status-running">owner 없음</span>'}
                ${currentOpenBlockerProviderEntries.length
                  ? currentOpenBlockerProviderEntries
                    .map(
                      ([provider, count]) => `
                        ${renderReleaseBlockerFilterButton({
                          actionLabel: `blocker provider 필터: ${provider} ${count}건 · ${blockerFilterLabel}`,
                          buttonText: `${provider} ${count}`,
                          category: blockerCategoryFilter,
                          countAttributeName: 'data-release-current-open-blocker-provider-count',
                          countAttributeValue: provider,
                          disabled: blockerProviderFilter === provider,
                          owner: blockerOwnerFilter,
                          pressed: blockerProviderFilter === provider,
                          provider,
                        })}
                      `,
                    )
                    .join('')
                  : '<span class="mini-badge status-running">provider blocker 없음</span>'}
                <span
                  class="mini-badge ${blockerIncludeSharedProviderOperations ? 'status-running' : 'status-blocked'}"
                  data-release-current-open-blocker-shared-scope="${blockerIncludeSharedProviderOperations ? 'included' : 'excluded'}"
                >shared provider ops ${blockerIncludeSharedProviderOperations ? 'included' : 'excluded'}</span>
                ${renderReleaseBlockerFilterButton({
                  actionLabel: blockerIncludeSharedProviderOperations ? `shared provider ops 제외: ${blockerTriageFilterActionLabel}` : `shared provider ops 포함: ${blockerTriageFilterActionLabel}`,
                  buttonText: blockerIncludeSharedProviderOperations ? 'shared provider ops 제외' : 'shared provider ops 포함',
                  category: blockerCategoryFilter,
                  countAttributeName: 'data-release-current-open-blocker-shared-scope-toggle',
                  countAttributeValue: 'true',
                  includeShared: !blockerIncludeSharedProviderOperations,
                  owner: blockerOwnerFilter,
                  pressed: blockerIncludeSharedProviderOperations,
                  provider: blockerProviderFilter,
                })}
                        ${renderReleaseBlockerSummaryCopyButton({
                          action: 'copy-release-blocker-filter-summary',
                          actionLabel: `slice 요약 복사: ${blockerTriageFilterActionLabel}`,
                          attributes: 'data-release-current-open-blocker-filter-summary-copy="true"',
                          buttonText: 'slice 요약 복사',
                          category: blockerCategoryFilter,
                          includeShared: true,
                          owner: blockerOwnerFilter,
                          provider: blockerProviderFilter,
                        })}
                ${blockerProviderFilter
                  ? `
                            ${renderReleaseBlockerSummaryCopyButton({
                              action: 'copy-release-blocker-provider-only-summary',
                              actionLabel: `provider-only summary 복사: ${blockerTriageProviderOnlyActionLabel}`,
                              attributes: 'data-release-current-open-blocker-provider-only-summary-copy="true"',
                              buttonText: 'provider-only summary 복사',
                              category: blockerCategoryFilter,
                              includeShared: false,
                              owner: blockerOwnerFilter,
                              provider: blockerProviderFilter,
                            })}
                  `
                  : ''}
                        ${renderReleaseLinkCopyButton({
                          action: 'copy-release-blocker-api-link',
                          actionLabel: `API 링크 복사: ${blockerTriageFilterActionLabel}`,
                          attributes: 'data-release-current-open-blocker-api-link="true"',
                          buttonText: 'API 링크 복사',
                          value: buildReleaseBlockerApiUrl({
                            category: blockerCategoryFilter,
                            includeShared: true,
                            owner: blockerOwnerFilter,
                            provider: blockerProviderFilter,
                          }),
                        })}
                ${blockerProviderFilter
                  ? `
                            ${renderReleaseLinkCopyButton({
                              action: 'copy-release-blocker-provider-only-api-link',
                              actionLabel: `provider-only API 링크 복사: ${blockerTriageProviderOnlyActionLabel}`,
                              attributes: 'data-release-current-open-blocker-provider-only-api-link="true"',
                              buttonText: 'provider-only API 링크 복사',
                              value: buildReleaseBlockerApiUrl({
                                category: blockerCategoryFilter,
                                includeShared: false,
                                owner: blockerOwnerFilter,
                                provider: blockerProviderFilter,
                              }),
                            })}
                  `
                  : ''}
                        ${renderReleaseBlockerPackageCopyButton({
                          action: 'copy-release-blocker-filter-package',
                          actionLabel: `slice package 복사: ${blockerTriageFilterActionLabel}`,
                          attributes: 'data-release-current-open-blocker-filter-package="true"',
                          buttonText: 'slice package 복사',
                          category: blockerCategoryFilter,
                          includeShared: true,
                          owner: blockerOwnerFilter,
                          provider: blockerProviderFilter,
                        })}
                ${blockerProviderFilter
                  ? `
                            ${renderReleaseBlockerPackageCopyButton({
                              action: 'copy-release-blocker-provider-only-package',
                              actionLabel: `provider-only package 복사: ${blockerTriageProviderOnlyActionLabel}`,
                              attributes: 'data-release-current-open-blocker-provider-only-package="true"',
                              buttonText: 'provider-only package 복사',
                              category: blockerCategoryFilter,
                              includeShared: false,
                              owner: blockerOwnerFilter,
                              provider: blockerProviderFilter,
                            })}
                  `
                  : ''}
                        ${renderReleaseBlockerClosureChecklistCopyButton({
                          action: 'copy-release-blocker-filter-closure-checklist',
                          actionLabel: `slice closure 체크리스트 복사: ${blockerTriageFilterActionLabel}`,
                          attributes: 'data-release-current-open-blocker-filter-closure-checklist="true"',
                          buttonText: 'slice closure 체크리스트 복사',
                          category: blockerCategoryFilter,
                          includeShared: true,
                          owner: blockerOwnerFilter,
                          provider: blockerProviderFilter,
                        })}
                ${blockerProviderFilter
                  ? `
                            ${renderReleaseBlockerClosureChecklistCopyButton({
                              action: 'copy-release-blocker-provider-only-closure-checklist',
                              actionLabel: `provider-only closure checklist 복사: ${blockerTriageProviderOnlyActionLabel}`,
                              attributes: 'data-release-current-open-blocker-provider-only-closure-checklist="true"',
                              buttonText: 'provider-only closure checklist 복사',
                              category: blockerCategoryFilter,
                              includeShared: false,
                              owner: blockerOwnerFilter,
                              provider: blockerProviderFilter,
                            })}
                  `
                  : ''}
                        ${renderReleaseBlockerClosureMatrixCopyButton({
                          action: 'copy-release-blocker-filter-closure-matrix',
                          actionLabel: `closure matrix 복사: ${blockerTriageFilterActionLabel}`,
                          attributes: 'data-release-current-open-blocker-filter-closure-matrix="true"',
                          buttonText: 'closure matrix 복사',
                          category: blockerCategoryFilter,
                          includeShared: true,
                          owner: blockerOwnerFilter,
                          provider: blockerProviderFilter,
                        })}
                ${blockerProviderFilter
                  ? `
                            ${renderReleaseBlockerClosureMatrixCopyButton({
                              action: 'copy-release-blocker-provider-only-closure-matrix',
                              actionLabel: `provider-only closure matrix 복사: ${blockerTriageProviderOnlyActionLabel}`,
                              attributes: 'data-release-current-open-blocker-provider-only-closure-matrix="true"',
                              buttonText: 'provider-only closure matrix 복사',
                              category: blockerCategoryFilter,
                              includeShared: false,
                              owner: blockerOwnerFilter,
                              provider: blockerProviderFilter,
                            })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceIntakeSummaryCopyButton({
                  action: 'copy-release-target-evidence-intake-summary',
                  actionLabel: `target evidence summary 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-intake-summary="true"',
                  buttonText: 'target evidence summary 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceIntakeSummaryCopyButton({
                      action: 'copy-release-target-evidence-provider-only-intake-summary',
                      actionLabel: `provider-only target summary 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-intake-summary="true"',
                      buttonText: 'provider-only target summary 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceCaptureTemplateCopyButton({
                  action: 'copy-release-target-evidence-capture-template',
                  actionLabel: `target capture template 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-capture-template="true"',
                  buttonText: 'target capture template 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceCaptureTemplateCopyButton({
                      action: 'copy-release-target-evidence-provider-only-capture-template',
                      actionLabel: `provider-only capture template 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-capture-template="true"',
                      buttonText: 'provider-only capture template 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceRequiredCommandsCopyButton({
                  action: 'copy-release-target-evidence-required-commands',
                  actionLabel: `target required commands 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-required-commands="true"',
                  buttonText: 'target required commands 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceRequiredCommandsCopyButton({
                      action: 'copy-release-target-evidence-provider-only-required-commands',
                      actionLabel: `provider-only commands 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-required-commands="true"',
                      buttonText: 'provider-only commands 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceProductionGapCopyButton({
                  action: 'copy-release-target-evidence-production-gap',
                  actionLabel: `target production gap 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-production-gap="true"',
                  buttonText: 'target production gap 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceProductionGapCopyButton({
                      action: 'copy-release-target-evidence-provider-only-production-gap',
                      actionLabel: `provider-only gap 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-production-gap="true"',
                      buttonText: 'provider-only gap 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceExceptionRegisterCopyButton({
                  action: 'copy-release-target-evidence-exception-register',
                  actionLabel: `target exception register 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-exception-register="true"',
                  buttonText: 'target exception register 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceExceptionRegisterCopyButton({
                      action: 'copy-release-target-evidence-provider-only-exception-register',
                      actionLabel: `provider-only exception 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-exception-register="true"',
                      buttonText: 'provider-only exception 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceRiskDecisionRegisterCopyButton({
                  action: 'copy-release-target-evidence-risk-decision-register',
                  actionLabel: `target risk decision 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-risk-decision-register="true"',
                  buttonText: 'target risk decision 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceRiskDecisionRegisterCopyButton({
                      action: 'copy-release-target-evidence-provider-only-risk-decision-register',
                      actionLabel: `provider-only risk 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-risk-decision-register="true"',
                      buttonText: 'provider-only risk 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceProviderReferencesCopyButton({
                  action: 'copy-release-target-evidence-provider-references',
                  actionLabel: `target provider refs 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-provider-references="true"',
                  buttonText: 'target provider refs 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceProviderReferencesCopyButton({
                      action: 'copy-release-target-evidence-provider-only-provider-references',
                      actionLabel: `provider-only refs 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-provider-references="true"',
                      buttonText: 'provider-only refs 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceResidualBlockersCopyButton({
                  action: 'copy-release-target-evidence-residual-blockers',
                  actionLabel: `target residual blockers 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-residual-blockers="true"',
                  buttonText: 'target residual blockers 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceResidualBlockersCopyButton({
                      action: 'copy-release-target-evidence-provider-only-residual-blockers',
                      actionLabel: `provider-only residual 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-residual-blockers="true"',
                      buttonText: 'provider-only residual 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceClosureRulesCopyButton({
                  action: 'copy-release-target-evidence-closure-rules',
                  actionLabel: `target closure rules 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-closure-rules="true"',
                  buttonText: 'target closure rules 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceClosureRulesCopyButton({
                      action: 'copy-release-target-evidence-provider-only-closure-rules',
                      actionLabel: `provider-only closure 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-closure-rules="true"',
                      buttonText: 'provider-only closure 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceSubmissionManifestCopyButton({
                  action: 'copy-release-target-evidence-submission-manifest',
                  actionLabel: `target submission manifest 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-submission-manifest="true"',
                  buttonText: 'target submission manifest 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceSubmissionManifestCopyButton({
                      action: 'copy-release-target-evidence-provider-only-submission-manifest',
                      actionLabel: `provider-only manifest 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-submission-manifest="true"',
                      buttonText: 'provider-only manifest 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceSanitizedRegisterCopyButton({
                  action: 'copy-release-target-evidence-sanitized-register',
                  actionLabel: `target sanitized register 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-sanitized-register="true"',
                  buttonText: 'target sanitized register 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceSanitizedRegisterCopyButton({
                      action: 'copy-release-target-evidence-provider-only-sanitized-register',
                      actionLabel: `provider-only sanitized 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-sanitized-register="true"',
                      buttonText: 'provider-only sanitized 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceBoundaryMapCopyButton({
                  action: 'copy-release-target-evidence-boundary-map',
                  actionLabel: `target boundary map 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-boundary-map="true"',
                  buttonText: 'target boundary map 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceBoundaryMapCopyButton({
                      action: 'copy-release-target-evidence-provider-only-boundary-map',
                      actionLabel: `provider-only boundary 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-boundary-map="true"',
                      buttonText: 'provider-only boundary 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceCommandRerunLogCopyButton({
                  action: 'copy-release-target-evidence-command-rerun-log',
                  actionLabel: `target command log 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-command-rerun-log="true"',
                  buttonText: 'target command log 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceCommandRerunLogCopyButton({
                      action: 'copy-release-target-evidence-provider-only-command-rerun-log',
                      actionLabel: `provider-only command log 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-command-rerun-log="true"',
                      buttonText: 'provider-only command log 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceDecisionRecordCopyButton({
                  action: 'copy-release-target-evidence-decision-record',
                  actionLabel: `target decision record 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-decision-record="true"',
                  buttonText: 'target decision record 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceDecisionRecordCopyButton({
                      action: 'copy-release-target-evidence-provider-only-decision-record',
                      actionLabel: `provider-only decision 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-decision-record="true"',
                      buttonText: 'provider-only decision 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceBlockerDispositionCopyButton({
                  action: 'copy-release-target-evidence-blocker-disposition',
                  actionLabel: `target disposition register 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-blocker-disposition="true"',
                  buttonText: 'target disposition register 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceBlockerDispositionCopyButton({
                      action: 'copy-release-target-evidence-provider-only-blocker-disposition',
                      actionLabel: `provider-only disposition 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-blocker-disposition="true"',
                      buttonText: 'provider-only disposition 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceReleaseRefreshCopyButton({
                  action: 'copy-release-target-evidence-release-refresh',
                  actionLabel: `target refresh evidence 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-release-refresh="true"',
                  buttonText: 'target refresh evidence 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceReleaseRefreshCopyButton({
                      action: 'copy-release-target-evidence-provider-only-release-refresh',
                      actionLabel: `provider-only refresh 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-release-refresh="true"',
                      buttonText: 'provider-only refresh 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceIntakePacketCopyButton({
                  action: 'copy-release-target-evidence-intake-packet',
                  actionLabel: `target evidence packet 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-intake-packet="true"',
                  buttonText: 'target evidence packet 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceIntakePacketCopyButton({
                      action: 'copy-release-target-evidence-provider-only-intake-packet',
                      actionLabel: `provider-only target packet 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-intake-packet="true"',
                      buttonText: 'provider-only target packet 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseBlockerHandoffCopyButton({
                  action: 'copy-release-blocker-filter-handoff',
                  actionLabel: `slice handoff 복사: ${blockerTriageFilterActionLabel}`,
                  attributes: 'data-release-current-open-blocker-filter-handoff="true"',
                  buttonText: 'slice handoff 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseBlockerHandoffCopyButton({
                      action: 'copy-release-blocker-provider-only-handoff',
                      actionLabel: `provider-only handoff 복사: ${blockerTriageProviderOnlyActionLabel}`,
                      attributes: 'data-release-current-open-blocker-provider-only-handoff="true"',
                      buttonText: 'provider-only handoff 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseBlockerCommandsCopyButton({
                  action: 'copy-release-blocker-filter-commands',
                  actionLabel: `slice 명령 복사: ${blockerTriageFilterActionLabel}`,
                  attributes: 'data-release-current-open-blocker-filter-command="true"',
                  buttonText: 'slice 명령 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseBlockerCommandsCopyButton({
                      action: 'copy-release-blocker-provider-only-commands',
                      actionLabel: `provider-only slice 명령 복사: ${blockerTriageProviderOnlyActionLabel}`,
                      attributes: 'data-release-current-open-blocker-provider-only-command="true"',
                      buttonText: 'provider-only slice 명령 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseBlockerEvidenceCopyButton({
                  action: 'copy-release-blocker-filter-evidence',
                  actionLabel: `slice 근거 복사: ${blockerTriageFilterActionLabel}`,
                  attributes: 'data-release-current-open-blocker-filter-evidence="true"',
                  buttonText: 'slice 근거 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseBlockerEvidenceCopyButton({
                      action: 'copy-release-blocker-provider-only-evidence',
                      actionLabel: `provider-only slice 근거 복사: ${blockerTriageProviderOnlyActionLabel}`,
                      attributes: 'data-release-current-open-blocker-provider-only-evidence="true"',
                      buttonText: 'provider-only slice 근거 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${hasEmptyBlockerFilter && blockerCategoryFilter && blockerOwnerFilter
                  ? `
                    ${renderReleaseBlockerFilterButton({
                      actionLabel: `empty blocker filter category만 유지: ${blockerCategoryFilter} · ${blockerFilterLabel}`,
                      buttonText: 'category만 유지',
                      category: blockerCategoryFilter,
                      countAttributeName: 'data-release-current-open-blocker-filter-empty-category',
                      countAttributeValue: 'true',
                      owner: '',
                      pressed: Boolean(blockerCategoryFilter),
                      provider: '',
                    })}
                    ${renderReleaseBlockerFilterButton({
                      actionLabel: `empty blocker filter owner만 유지: ${blockerOwnerFilter} · ${blockerFilterLabel}`,
                      buttonText: 'owner만 유지',
                      category: '',
                      countAttributeName: 'data-release-current-open-blocker-filter-empty-owner',
                      countAttributeValue: 'true',
                      owner: blockerOwnerFilter,
                      pressed: Boolean(blockerOwnerFilter),
                      provider: '',
                    })}
                    ${blockerProviderFilter
                      ? `
                        ${renderReleaseBlockerFilterButton({
                          actionLabel: `empty blocker filter provider만 유지: ${blockerProviderFilter} · ${blockerFilterLabel}`,
                          buttonText: 'provider만 유지',
                          category: '',
                          countAttributeName: 'data-release-current-open-blocker-filter-empty-provider',
                          countAttributeValue: 'true',
                          owner: '',
                          pressed: Boolean(blockerProviderFilter),
                          provider: blockerProviderFilter,
                        })}
                      `
                      : ''}
                  `
                  : hasEmptyBlockerFilter && blockerProviderFilter
                    ? `
                      ${renderReleaseBlockerFilterButton({
                        actionLabel: `empty blocker filter provider만 유지: ${blockerProviderFilter} · ${blockerFilterLabel}`,
                        buttonText: 'provider만 유지',
                        category: '',
                        countAttributeName: 'data-release-current-open-blocker-filter-empty-provider',
                        countAttributeValue: 'true',
                        owner: '',
                        pressed: Boolean(blockerProviderFilter),
                        provider: blockerProviderFilter,
                      })}
                    `
                    : ''}
                ${hasBlockerFilter
                  ? renderReleaseClearActionButton({
                      action: 'clear-release-blocker-filter',
                      actionLabel: `${hasEmptyBlockerFilter ? 'empty blocker filter 조합 해제' : 'blocker 필터 해제'}: ${blockerFilterLabel}`,
                      attributes: `data-release-current-open-blocker-filter-empty-clear="${hasEmptyBlockerFilter ? 'true' : 'false'}"`,
                      buttonText: hasEmptyBlockerFilter ? '조합 해제' : '필터 해제',
                    })
                  : ''}
              </div>
            </div>
            ${focusedBlockerId
              ? `
                  <div class="harness-callout release-blocker-focus-callout" data-release-current-open-blocker-focus="${escapeHtml(focusedBlockerId)}">
                    <strong>Focused current open blocker</strong>
                    <p>${escapeHtml(focusedBlockerEntry?.blocker || focusedBlockerEntry?.stopReason || focusedBlockerId)}</p>
                    ${focusedBlockerEvidenceDocs.length
                      ? `
                          <div class="release-history-filter-chips release-evidence-doc-chips" data-release-current-open-blocker-focus-evidence-list="${escapeHtml(focusedBlockerId)}">
                            ${focusedBlockerEvidenceDocs
                              .map((doc) => {
                                const docHref = String(doc.href || '').trim();
                                const docLabel = String(doc.label || doc.path || 'evidence doc').trim();
                                const docPath = String(doc.path || '').trim();
                                const evidenceDocOpenLabel = `근거 문서 열기: ${docPath || docLabel} · blocker ${focusedBlockerId}`;
                                return `
                                  <span
                                    class="release-evidence-doc-chip"
                                    data-release-current-open-blocker-evidence-doc="${escapeHtml(focusedBlockerId)}"
                                    data-release-current-open-blocker-focus-evidence-doc="${escapeHtml(focusedBlockerId)}"
                                  >
                                    ${docHref
                                      ? `
                                          <a
                                            class="mini-badge status-running release-evidence-doc-link"
                                            href="${escapeHtml(docHref)}"
                                            target="_blank"
                                            rel="noreferrer"
                                            data-release-evidence-doc-href="${escapeHtml(docHref)}"
                                            data-release-evidence-doc-path="${escapeHtml(docPath)}"
                                            aria-label="${escapeHtml(evidenceDocOpenLabel)}"
                                            title="${escapeHtml(evidenceDocOpenLabel)}"
                                          >${escapeHtml(docPath || docLabel)}</a>
                                        `
                                      : `<span class="mini-badge status-running">${escapeHtml(docPath || docLabel)}</span>`}
                                    ${docHref
                                      ? `
                                          ${renderReleaseLinkCopyButton({
                                            action: 'copy-release-evidence-doc-link',
                                            actionLabel: `문서 링크 복사: ${evidenceDocOpenLabel}`,
                                            attributes: `data-ui-href="${escapeHtml(docHref)}" data-ui-label="${escapeHtml(docLabel)}"`,
                                            buttonText: '문서 링크 복사',
                                            className: 'ghost-button release-evidence-doc-copy',
                                            value: docHref,
                                          })}
                                        `
                                      : ''}
                                  </span>
                                `;
                              })
                              .join('')}
                          </div>
                        `
                      : ''}
                    <div class="release-history-focus-actions">
                      ${renderReleaseBlockerHandoffCopyButton({
                        actionLabel: `focused blocker handoff 복사: ${focusedBlockerLabel || focusedBlockerId}`,
                        attributes: `data-release-current-open-blocker-handoff="${escapeHtml(focusedBlockerId)}"`,
                        blockerId: focusedBlockerId,
                        buttonText: 'handoff 복사',
                      })}
                      ${renderReleaseBlockerClosureChecklistCopyButton({
                        actionLabel: `focused blocker closure 체크리스트 복사: ${focusedBlockerLabel || focusedBlockerId}`,
                        attributes: `data-release-current-open-blocker-closure-checklist="${escapeHtml(focusedBlockerId)}"`,
                        blockerId: focusedBlockerId,
                        buttonText: 'closure 체크리스트 복사',
                      })}
                      ${renderReleaseBlockerPackageCopyButton({
                        actionLabel: `focused blocker package 복사: ${focusedBlockerLabel || focusedBlockerId}`,
                        attributes: `data-release-current-open-blocker-package="${escapeHtml(focusedBlockerId)}"`,
                        blockerId: focusedBlockerId,
                        buttonText: 'package 복사',
                      })}
                      ${renderReleaseLinkCopyButton({
                        action: 'copy-release-blocker-link',
                        actionLabel: `focused blocker 링크 복사: ${focusedBlockerLabel || focusedBlockerId}`,
                        attributes: `data-ui-blocker="${escapeHtml(focusedBlockerId)}"`,
                        buttonText: 'blocker 링크 복사',
                        value: focusedBlockerId,
                      })}
                      ${focusedBlockerCommands
                        .map(
                          (command) => renderReleaseCommandCopyButton({
                            actionLabel: `focused blocker 명령 복사: ${command.label || 'blocker command'} · ${focusedBlockerLabel || focusedBlockerId}`,
                            attributes: `data-release-current-open-blocker-command="${escapeHtml(focusedBlockerId)}" data-release-current-open-blocker-focus-command="${escapeHtml(focusedBlockerId)}"`,
                            buttonText: command.label || 'command 복사',
                            command: command.command || '',
                            label: command.label || 'blocker command',
                          }),
                        )
                        .join('')}
                      ${renderReleaseClearActionButton({
                        action: 'clear-release-blocker-focus',
                        actionLabel: `focused blocker 포커스 해제: ${focusedBlockerLabel || focusedBlockerId}`,
                        buttonText: '포커스 해제',
                      })}
                    </div>
                  </div>
                `
              : ''}
            <div class="release-current-status" data-release-current-open-blocker-list="true">
              ${visibleCurrentOpenBlockerActions.length
                ? visibleCurrentOpenBlockerActions
                  .map(
                    (item) => {
                      const commands = Array.isArray(item.commands) ? item.commands.slice(0, 3) : [];
                      const evidenceDocs = Array.isArray(item.evidenceDocs) ? item.evidenceDocs.slice(0, 3) : [];
                      const actionId = String(item.id || '').trim();
                      const isFocusedBlocker = Boolean(actionId) && actionId === focusedBlockerId;
                      const blockerActionLabel = `${actionId || 'blocker'} · ${item.blocker || item.stopReason || 'current open blocker'}`;
                      return `
                      <div class="harness-row ${isFocusedBlocker ? 'is-focused-blocker' : ''}" data-release-current-open-blocker-row="true" data-release-current-open-blocker-action-row="${escapeHtml(actionId)}">
                        <div>
                          <div class="item-title">${escapeHtml(item.blocker || item.stopReason || 'current open blocker')}</div>
                          <div class="item-meta">${escapeHtml(item.nextEvidence || 'release-readiness current open blocker')}</div>
                          ${evidenceDocs.length
                            ? `
                                <div class="release-history-filter-chips release-evidence-doc-chips">
                                  ${evidenceDocs
                                    .map((doc) => {
                                      const docHref = String(doc.href || '').trim();
                                      const docLabel = String(doc.label || doc.path || 'evidence doc').trim();
                                      const docPath = String(doc.path || '').trim();
                                      const evidenceDocOpenLabel = `근거 문서 열기: ${docPath || docLabel} · blocker ${actionId}`;
                                      return `
                                        <span class="release-evidence-doc-chip" data-release-current-open-blocker-evidence-doc="${escapeHtml(actionId)}">
                                          ${docHref
                                            ? `
                                                <a
                                                  class="mini-badge status-running release-evidence-doc-link"
                                                  href="${escapeHtml(docHref)}"
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  data-release-evidence-doc-href="${escapeHtml(docHref)}"
                                                  data-release-evidence-doc-path="${escapeHtml(docPath)}"
                                                  aria-label="${escapeHtml(evidenceDocOpenLabel)}"
                                                  title="${escapeHtml(evidenceDocOpenLabel)}"
                                                >${escapeHtml(docPath || docLabel)}</a>
                                              `
                                            : `<span class="mini-badge status-running">${escapeHtml(docPath || docLabel)}</span>`}
                                          ${docHref
                                            ? `
                                                ${renderReleaseLinkCopyButton({
                                                  action: 'copy-release-evidence-doc-link',
                                                  actionLabel: `문서 링크 복사: ${evidenceDocOpenLabel}`,
                                                  attributes: `data-ui-href="${escapeHtml(docHref)}" data-ui-label="${escapeHtml(docLabel)}"`,
                                                  buttonText: '문서 링크 복사',
                                                  className: 'ghost-button release-evidence-doc-copy',
                                                  value: docHref,
                                                })}
                                              `
                                            : ''}
                                        </span>
                                      `;
                                    })
                                    .join('')}
                                </div>
                              `
                            : ''}
                        </div>
                        <div class="harness-row-meta">
                          <span class="mini-badge status-failed">${escapeHtml(item.category || 'stop-condition')}</span>
                          ${item.provider
                            ? `<span class="mini-badge status-failed" data-release-current-open-blocker-provider="${escapeHtml(actionId)}">${escapeHtml(item.provider)}</span>`
                            : ''}
                          <span class="item-meta">${escapeHtml(item.owner || 'release-owner')}</span>
                          <span class="mini-badge status-failed">stop-condition</span>
                          ${renderReleaseBlockerFocusButton({
                            actionLabel: `${isFocusedBlocker ? '현재 blocker' : 'blocker 보기'}: ${blockerActionLabel}`,
                            blocker: actionId,
                            buttonText: isFocusedBlocker ? '현재 blocker' : 'blocker 보기',
                            disabled: isFocusedBlocker,
                            pressed: isFocusedBlocker,
                          })}
                          ${renderReleaseBlockerHandoffCopyButton({
                            actionLabel: `blocker handoff 복사: ${blockerActionLabel}`,
                            attributes: `data-release-current-open-blocker-handoff="${escapeHtml(actionId)}"`,
                            blockerId: actionId,
                            buttonText: 'handoff 복사',
                          })}
                          ${renderReleaseBlockerClosureChecklistCopyButton({
                            actionLabel: `blocker closure 체크리스트 복사: ${blockerActionLabel}`,
                            attributes: `data-release-current-open-blocker-closure-checklist="${escapeHtml(actionId)}"`,
                            blockerId: actionId,
                            buttonText: 'closure 체크리스트 복사',
                          })}
                          ${renderReleaseBlockerPackageCopyButton({
                            actionLabel: `blocker package 복사: ${blockerActionLabel}`,
                            attributes: `data-release-current-open-blocker-package="${escapeHtml(actionId)}"`,
                            blockerId: actionId,
                            buttonText: 'package 복사',
                          })}
                          ${renderReleaseLinkCopyButton({
                            action: 'copy-release-blocker-link',
                            actionLabel: `blocker 링크 복사: ${blockerActionLabel}`,
                            attributes: `data-ui-blocker="${escapeHtml(actionId)}"`,
                            buttonText: 'blocker 링크 복사',
                            value: actionId,
                          })}
                          ${commands
                            .map(
                              (command) => renderReleaseCommandCopyButton({
                                actionLabel: `blocker 명령 복사: ${command.label || 'blocker command'} · ${blockerActionLabel}`,
                                attributes: `data-release-current-open-blocker-command="${escapeHtml(actionId)}"`,
                                buttonText: command.label || 'command 복사',
                                command: command.command || '',
                                label: command.label || 'blocker command',
                              }),
                            )
                            .join('')}
                        </div>
                      </div>
                    `;
                    },
                  )
                  .join('')
                : `
                    <article class="release-snapshot-card is-empty">
                      <div class="item-title">${hasBlockerFilter ? '현재 triage 필터에 맞는 blocker가 없습니다.' : 'current open blocker가 없습니다.'}</div>
                      <p class="item-meta">${hasBlockerFilter ? 'category 또는 owner 필터를 해제해 전체 current open blocker를 확인하세요.' : 'release-readiness 문서의 Current Open Blockers 섹션이 비어 있습니다.'}</p>
                    </article>
                  `}
            </div>
            ${focusedProductionBlockerIndex !== ''
              ? `
                  <div class="harness-callout release-blocker-focus-callout" data-release-production-blocker-focus="${escapeHtml(focusedProductionBlockerOrdinal)}">
                    <strong>Focused production-ready blocker</strong>
                    <p>${escapeHtml(focusedProductionBlocker || `production-ready blocker #${focusedProductionBlockerOrdinal}`)}</p>
                    <div class="release-history-focus-actions">
                      ${renderReleaseProductionBlockerDetailCopyButton({
                        action: 'copy-release-production-blocker-handoff',
                        actionLabel: `focused production blocker handoff 복사: ${focusedProductionBlockerActionLabel}`,
                        attributes: `data-release-production-blocker-handoff="${escapeHtml(focusedProductionBlockerIndex)}"`,
                        blockerIndex: focusedProductionBlockerIndex,
                        buttonText: 'handoff 복사',
                      })}
                      ${renderReleaseLinkCopyButton({
                        action: 'copy-release-production-blocker-link',
                        actionLabel: `focused production blocker 링크 복사: ${focusedProductionBlockerActionLabel}`,
                        attributes: `data-release-production-blocker-link="${escapeHtml(focusedProductionBlockerIndex)}" data-ui-index="${escapeHtml(focusedProductionBlockerIndex)}"`,
                        buttonText: 'blocker 링크 복사',
                        value: focusedProductionBlockerIndex,
                      })}
                      <a
                        class="ghost-button"
                        href="${escapeHtml(productionBlockerEvidenceDocHref)}"
                        target="_blank"
                        rel="noreferrer"
                        data-release-production-blocker-evidence-doc="${escapeHtml(focusedProductionBlockerIndex)}"
                        data-release-production-blocker-evidence-doc-href="${escapeHtml(productionBlockerEvidenceDocHref)}"
                        aria-label="${escapeHtml(`근거 문서 열기: ${productionBlockerEvidenceDocLabel} · production blocker #${focusedProductionBlockerOrdinal}`)}"
                        title="${escapeHtml(`근거 문서 열기: ${productionBlockerEvidenceDocLabel} · production blocker #${focusedProductionBlockerOrdinal}`)}"
                      >근거 문서 열기</a>
                      ${renderReleaseLinkCopyButton({
                        action: 'copy-release-evidence-doc-link',
                        actionLabel: `focused production blocker 근거 링크 복사: ${productionBlockerEvidenceDocLabel} · ${focusedProductionBlockerActionLabel}`,
                        attributes: `data-release-production-blocker-evidence-doc-copy="${escapeHtml(focusedProductionBlockerIndex)}" data-ui-href="${escapeHtml(productionBlockerEvidenceDocHref)}" data-ui-label="${escapeHtml(productionBlockerEvidenceDocLabel)}"`,
                        buttonText: '근거 링크 복사',
                        value: productionBlockerEvidenceDocHref,
                      })}
                      ${renderReleaseProductionBlockerDetailCopyButton({
                        action: 'copy-release-production-blocker-commands',
                        actionLabel: `focused production blocker 검증 명령 복사: ${focusedProductionBlockerActionLabel}`,
                        attributes: `data-release-production-blocker-commands="${escapeHtml(focusedProductionBlockerIndex)}"`,
                        blockerIndex: focusedProductionBlockerIndex,
                        buttonText: '검증 명령 복사',
                      })}
                      ${renderReleaseProductionBlockerDetailCopyButton({
                        action: 'copy-release-production-blocker-package',
                        actionLabel: `focused production blocker package 복사: ${focusedProductionBlockerActionLabel}`,
                        attributes: `data-release-production-blocker-package="${escapeHtml(focusedProductionBlockerIndex)}"`,
                        blockerIndex: focusedProductionBlockerIndex,
                        buttonText: 'package 복사',
                      })}
                      ${renderReleaseClearActionButton({
                        action: 'clear-release-production-blocker-focus',
                        actionLabel: `focused production blocker 포커스 해제: ${focusedProductionBlockerActionLabel}`,
                        buttonText: '포커스 해제',
                      })}
                    </div>
                  </div>
                `
              : ''}
            <div
              class="release-current-status"
              data-release-production-blocker-list="true"
              data-release-production-blocker-list-expanded="${productionBlockersExpanded ? 'true' : 'false'}"
              data-release-production-blocker-visible-count="${escapeHtml(String(visibleProductionBlockers.length))}"
            >
              ${productionBlockers.length
                ? visibleProductionBlockers
                  .map(
                    (item, index) => {
                      const isFocusedProductionBlocker = index === focusedProductionBlockerIndexNumber;
                      const productionBlockerRowActionLabel = `production blocker #${index + 1} · ${item || 'production-ready blocker'}`;
                      return `
                      <div class="harness-row ${isFocusedProductionBlocker ? 'is-focused-blocker' : ''}" data-release-production-blocker-row="true" data-release-production-blocker-row-index="${escapeHtml(String(index))}" data-release-production-blocker-focused="${isFocusedProductionBlocker ? 'true' : 'false'}">
                        <div>
                          <div class="item-title">${escapeHtml(item)}</div>
                          <div class="item-meta">production-ready claim blocker</div>
                        </div>
                        <div class="harness-row-meta">
                          ${isFocusedProductionBlocker ? '<span class="mini-badge status-running">focused</span>' : ''}
                          <span class="mini-badge status-failed">blocked</span>
                          ${renderReleaseBlockerFocusButton({
                            action: 'focus-release-production-blocker',
                            actionLabel: `${isFocusedProductionBlocker ? 'production blocker 포커스됨' : 'production blocker 포커스'}: ${productionBlockerRowActionLabel}`,
                            buttonText: isFocusedProductionBlocker ? '포커스됨' : '포커스',
                            disabled: isFocusedProductionBlocker,
                            index,
                            pressed: isFocusedProductionBlocker,
                          })}
                          ${renderReleaseLinkCopyButton({
                            action: 'copy-release-production-blocker-link',
                            actionLabel: `production blocker 링크 복사: ${productionBlockerRowActionLabel}`,
                            attributes: `data-release-production-blocker-link="${escapeHtml(String(index))}" data-ui-index="${escapeHtml(String(index))}"`,
                            buttonText: '링크 복사',
                            value: String(index),
                          })}
                          <a
                            class="ghost-button"
                            href="${escapeHtml(productionBlockerEvidenceDocHref)}"
                            target="_blank"
                            rel="noreferrer"
                            data-release-production-blocker-evidence-doc="${escapeHtml(String(index))}"
                            data-release-production-blocker-evidence-doc-href="${escapeHtml(productionBlockerEvidenceDocHref)}"
                            aria-label="${escapeHtml(`근거 문서 열기: ${productionBlockerEvidenceDocLabel} · production blocker #${index + 1}`)}"
                            title="${escapeHtml(`근거 문서 열기: ${productionBlockerEvidenceDocLabel} · production blocker #${index + 1}`)}"
                          >근거 문서</a>
                          ${renderReleaseLinkCopyButton({
                            action: 'copy-release-evidence-doc-link',
                            actionLabel: `production blocker 근거 링크 복사: ${productionBlockerEvidenceDocLabel} · ${productionBlockerRowActionLabel}`,
                            attributes: `data-release-production-blocker-evidence-doc-copy="${escapeHtml(String(index))}" data-ui-href="${escapeHtml(productionBlockerEvidenceDocHref)}" data-ui-label="${escapeHtml(productionBlockerEvidenceDocLabel)}"`,
                            buttonText: '근거 링크 복사',
                            value: productionBlockerEvidenceDocHref,
                          })}
                          ${renderReleaseProductionBlockerDetailCopyButton({
                            action: 'copy-release-production-blocker-commands',
                            actionLabel: `production blocker 검증 명령 복사: ${productionBlockerRowActionLabel}`,
                            attributes: `data-release-production-blocker-commands="${escapeHtml(String(index))}"`,
                            blockerIndex: String(index),
                            buttonText: '검증 명령 복사',
                          })}
                          ${renderReleaseProductionBlockerDetailCopyButton({
                            action: 'copy-release-production-blocker-package',
                            actionLabel: `production blocker package 복사: ${productionBlockerRowActionLabel}`,
                            attributes: `data-release-production-blocker-package="${escapeHtml(String(index))}"`,
                            blockerIndex: String(index),
                            buttonText: 'package 복사',
                          })}
                          ${renderReleaseProductionBlockerDetailCopyButton({
                            action: 'copy-release-production-blocker-handoff',
                            actionLabel: `production blocker handoff 복사: ${productionBlockerRowActionLabel}`,
                            attributes: `data-release-production-blocker-handoff="${escapeHtml(String(index))}"`,
                            blockerIndex: String(index),
                            buttonText: 'blocker handoff 복사',
                          })}
                        </div>
                      </div>
                    `;
                    },
                  )
                  .join('')
                : `
                    <article class="release-snapshot-card is-empty">
                      <div class="item-title">production-ready blocker가 없습니다.</div>
                      <p class="item-meta">release-readiness 문서의 Production Ready blocker list가 비어 있습니다.</p>
                    </article>
                  `}
              ${productionBlockers.length > 8
                ? `
                    <div class="harness-row" data-release-production-blocker-overflow="true" data-release-production-blocker-hidden-count="${escapeHtml(String(hiddenProductionBlockerCount))}">
                      <div>
                        <div class="item-title">${productionBlockersExpanded ? '전체 production-ready blocker 표시 중' : `추가 blocker ${escapeHtml(String(hiddenProductionBlockerCount))}건`}</div>
                        <div class="item-meta">현재 ${escapeHtml(String(visibleProductionBlockers.length))}/${escapeHtml(String(productionBlockers.length))}건을 표시합니다. 전체 목록은 docs/release-readiness-v1.md의 Production Ready 섹션을 기준으로 합니다.</div>
                      </div>
                      <div class="harness-row-meta">
                        <span class="mini-badge status-running">${productionBlockersExpanded ? 'expanded' : 'summarized'}</span>
                        ${renderReleaseToggleActionButton({
                          action: 'toggle-release-production-blockers',
                          actionLabel: `production blocker 목록 ${productionBlockersExpanded ? '축소' : '확장'}: ${visibleProductionBlockers.length}/${productionBlockers.length} 표시`,
                          attributes: `data-release-production-blocker-toggle="${productionBlockersExpanded ? 'collapse' : 'expand'}"`,
                          buttonText: productionBlockersExpanded ? '8개만 보기' : '전체 보기',
                          expanded: productionBlockersExpanded,
                        })}
                      </div>
                    </div>
                  `
                : ''}
            </div>
            <div class="harness-callout">
              <strong>남은 gap ${escapeHtml(String(gaps.length))}건</strong>
              <p>${escapeHtml(gaps[0] || '남은 gap이 없습니다.')}</p>
            </div>
            <div class="mini-head">
              <div>
                <p class="section-kicker">Release Action History</p>
                <h4>최근 preflight, refresh, snapshot, live action</h4>
              </div>
            </div>
            ${focusedHistoryId
              ? `
                  <div class="harness-callout release-history-focus-callout">
                      <strong>현재 포커스된 release action</strong>
                      <p>선택한 기록을 리스트 상단에 유지하고 있습니다. 상세를 확인한 뒤 포커스를 해제할 수 있습니다.</p>
                      <div class="release-history-focus-actions">
                        ${renderReleaseClearActionButton({
                          action: 'clear-release-history-focus',
                          actionLabel: `release history 포커스 해제: ${focusedHistoryId}`,
                          buttonText: '포커스 해제',
                        })}
                        ${renderReleaseLinkCopyButton({
                          actionLabel: `현재 triage 링크 복사: focused release history ${focusedHistoryId}`,
                          buttonText: '현재 triage 링크 복사',
                          value: `focused-history:${focusedHistoryId}`,
                        })}
                        ${historyFilterOutcome || historyFilterScope || historyFilterProvider
                          ? renderReleaseClearActionButton({
                              action: 'clear-release-history-filter',
                              actionLabel: `release history 필터 해제: ${releaseActionLabel}`,
                              buttonText: '필터 해제',
                            })
                          : ''}
                    </div>
                    ${(historyFilterOutcome || historyFilterScope || historyFilterProvider)
                      ? `
                          <div class="release-history-filter-chips">
                            ${historyFilterOutcome === 'attention' ? '<span class="mini-badge status-failed">outcome · 주의 상태만</span>' : ''}
                            ${historyFilterScope ? `<span class="mini-badge status-running">scope · ${escapeHtml(getReleaseActionScopeLabel(historyFilterScope))}</span>` : ''}
                            ${historyFilterProvider ? `<span class="mini-badge status-running">provider · ${escapeHtml(historyFilterProvider)}</span>` : ''}
                          </div>
                        `
                      : ''}
                  </div>
                `
              : ''}
            <div class="release-history-list">
              ${orderedReleaseActionHistory.length
                ? orderedReleaseActionHistory
                  .map(
                      (item) => {
                        const itemId = String(item.id || '').trim();
                        const isFocused = Boolean(focusedHistoryId && itemId === focusedHistoryId);
                        const isExpanded = Boolean(expandedHistoryId && itemId === expandedHistoryId);
                        const historyActionLabel = `${itemId || 'release action'} · ${getReleaseActionLabel(item.action)} · ${item.outcome || 'unknown'} · ${getReleaseActionScopeLabel(item.scope)}${item.provider ? ` · ${item.provider}` : ''}`;
                        return `
                      <article class="release-snapshot-card ${isFocused ? 'is-highlighted' : ''} ${isExpanded ? 'is-expanded' : ''}" data-release-history-id="${escapeHtml(itemId)}">
                        <div class="release-provider-meta">
                          <div>
                            <div class="item-title">${escapeHtml(getReleaseActionLabel(item.action))}</div>
                            <div class="item-meta">${escapeHtml(getReleaseActionScopeLabel(item.scope))}${item.provider ? ` · ${escapeHtml(item.provider)}` : ''}</div>
                          </div>
                          <div class="release-history-actions">
                            <span class="mini-badge ${getReleaseStatusBadge(item.outcome)}">${escapeHtml(item.outcome || 'unknown')}</span>
                            ${isFocused
                              ? `
                                  ${renderReleaseClearActionButton({
                                    action: 'clear-release-history-focus',
                                    actionLabel: `release history 포커스 해제: ${historyActionLabel}`,
                                    buttonText: '포커스 해제',
                                    pressed: isFocused,
                                  })}
                                `
                              : `
                                  ${renderReleaseProviderNavigationButton({
                                    action: 'focus-release-history',
                                    actionLabel: `release history 기록 고정: ${historyActionLabel}`,
                                    buttonText: '이 기록 고정',
                                    pressed: isFocused,
                                    value: itemId,
                                  })}
                                `}
                            ${renderReleaseToggleActionButton({
                              action: 'toggle-release-history',
                              actionLabel: `release history ${isExpanded ? '상세 닫기' : '상세 보기'}: ${historyActionLabel}`,
                              buttonText: isExpanded ? '상세 닫기' : '상세 보기',
                              expanded: isExpanded,
                              value: itemId,
                            })}
                          </div>
                        </div>
                        <div class="item-meta">${escapeHtml(item.summary || 'release action summary가 없습니다.')}</div>
                        <div class="release-meta release-meta-secondary">
                          <span class="item-meta">${escapeHtml(formatDate(item.createdAt))}</span>
                          ${item.branch ? `<span class="item-meta">${escapeHtml(item.branch)}</span>` : ''}
                          ${item.commit ? `<span class="item-meta mono">${escapeHtml(String(item.commit).slice(0, 12))}</span>` : ''}
                        </div>
                        ${isExpanded
                          ? `
                              <div class="release-history-detail">
                                <div class="release-history-filter-actions">
                                  ${renderReleaseLinkCopyButton({
                                    action: 'copy-release-history-link',
                                    actionLabel: `release history 링크 복사: ${historyActionLabel}`,
                                    buttonText: '이 기록 링크 복사',
                                    value: itemId,
                                  })}
                                  ${renderReleaseLinkCopyButton({
                                    action: 'copy-release-flow-link',
                                    actionLabel: `release flow 링크 복사: ${historyActionLabel}`,
                                    attributes: `data-ui-outcome="${escapeHtml(isReleaseAttentionOutcome(item.outcome) ? 'attention' : '')}" data-ui-scope="${escapeHtml(String(item.scope || '').trim())}" data-ui-provider="${escapeHtml(String(item.provider || '').trim())}"`,
                                    buttonText: '이 flow 링크 복사',
                                    value: itemId,
                                  })}
                                  ${renderReleaseProviderNavigationButton({
                                    action: 'filter-release-history-attention',
                                    actionLabel: `release history 주의 상태만 보기: ${historyActionLabel}`,
                                    buttonText: '주의 상태만',
                                    outcome: 'attention',
                                    pressed: historyFilterOutcome === 'attention',
                                  })}
                                  ${renderReleaseProviderNavigationButton({
                                    action: 'filter-release-history-scope',
                                    actionLabel: `release history 같은 scope 보기: ${historyActionLabel}`,
                                    buttonText: '같은 scope 보기',
                                    pressed: historyFilterScope === String(item.scope || '').trim(),
                                    scope: String(item.scope || '').trim(),
                                  })}
                                  ${item.provider
                                    ? `
                                        ${renderReleaseProviderNavigationButton({
                                          action: 'filter-release-history-provider',
                                          actionLabel: `release history 같은 provider 보기: ${historyActionLabel}`,
                                          buttonText: '같은 provider 보기',
                                          pressed: historyFilterProvider === String(item.provider || '').trim(),
                                          provider: String(item.provider || '').trim(),
                                        })}
                                      `
                                    : ''}
                                    ${(historyFilterOutcome || historyFilterScope || historyFilterProvider)
                                      ? renderReleaseClearActionButton({
                                          action: 'clear-release-history-filter',
                                          actionLabel: `release history 필터 해제: ${historyActionLabel}`,
                                          buttonText: '필터 해제',
                                        })
                                      : ''}
                                </div>
                                <div class="release-history-detail-grid">
                                  <div>
                                    <span class="section-kicker">Action Id</span>
                                    <div class="item-meta mono">${escapeHtml(itemId || 'id 없음')}</div>
                                  </div>
                                  <div>
                                    <span class="section-kicker">Outcome</span>
                                    <div class="item-meta">${escapeHtml(item.outcome || 'unknown')}</div>
                                  </div>
                                  <div>
                                    <span class="section-kicker">Scope</span>
                                    <div class="item-meta">${escapeHtml(getReleaseActionScopeLabel(item.scope))}</div>
                                  </div>
                                  <div>
                                    <span class="section-kicker">Provider</span>
                                    <div class="item-meta">${escapeHtml(item.provider || '없음')}</div>
                                  </div>
                                </div>
                              </div>
                            `
                          : ''}
                      </article>
                    `;
                    },
                  )
                  .join('')
                : `
                    <article class="release-snapshot-card is-empty">
                      <div class="item-title">${historyFilterOutcome || historyFilterScope || historyFilterProvider ? '현재 필터와 맞는 release action 기록이 없습니다.' : '최근 release action 기록이 없습니다.'}</div>
                      <p class="item-meta">${historyFilterOutcome || historyFilterScope || historyFilterProvider ? '필터를 해제하면 전체 history를 다시 볼 수 있습니다.' : 'preflight, current surface 재생성, snapshot 고정, provider live validation을 실행하면 이 영역에 최근 action history가 쌓입니다.'}</p>
                    </article>
                  `}
            </div>
          ${focusedProvider
              ? `
                  <div class="harness-callout release-provider-focus-callout">
                    <strong>현재 포커스된 provider readiness 카드</strong>
                    <p>${escapeHtml(focusedProvider)} provider card를 강조하고 있습니다. preflight/live action이나 command handoff를 확인한 뒤 포커스를 해제할 수 있습니다.</p>
                    ${focusedProviderEntry
                      ? `
                          <div class="release-history-filter-chips">
                            <span class="mini-badge ${getReleaseStatusBadge(focusedProviderEntry.status)}">${escapeHtml(focusedProviderEntry.status)}</span>
                            <span class="mini-badge ${getReleaseStatusBadge(focusedProviderPreflight?.status || 'not-run')}">${escapeHtml(focusedProviderPreflight?.status || 'not-run')}</span>
                          </div>
                        `
                      : ''}
                    <p class="item-meta" data-release-provider-blocker-summary="${escapeHtml(focusedProvider)}">
                      provider blockers ${escapeHtml(String(focusedProviderBlockerActions.length))}
                      ${focusedProviderTopBlocker
                        ? ` · top ${escapeHtml(focusedProviderTopBlockerId || 'unknown')}: ${escapeHtml(String(focusedProviderTopBlocker.stopReason || focusedProviderTopBlocker.blocker || '').trim())}`
                        : ''}
                    </p>
                    ${focusedProviderClosureSummary
                      ? `
                          <p class="item-meta" data-release-provider-closure-summary="${escapeHtml(focusedProvider)}">
                            closure verifications ${escapeHtml(String(focusedProviderClosureSummary.closureVerificationCount))}
                            · required proofs ${escapeHtml(String(focusedProviderClosureSummary.requiredProofCount))}
                            · commands ${escapeHtml(String(focusedProviderClosureSummary.commandCount))}
                            · evidence docs ${escapeHtml(String(focusedProviderClosureSummary.evidenceDocCount))}
                          </p>
                          <div class="release-history-filter-chips" data-release-provider-closure-metrics="${escapeHtml(focusedProvider)}">
                            <span class="mini-badge status-failed" data-release-provider-closure-count="${escapeHtml(focusedProvider)}">${escapeHtml(`closure ${focusedProviderClosureSummary.closureVerificationCount}`)}</span>
                            <span class="mini-badge status-running" data-release-provider-required-proof-count="${escapeHtml(focusedProvider)}">${escapeHtml(`proofs ${focusedProviderClosureSummary.requiredProofCount}`)}</span>
                            <span class="mini-badge status-running" data-release-provider-command-count="${escapeHtml(focusedProvider)}">${escapeHtml(`commands ${focusedProviderClosureSummary.commandCount}`)}</span>
                            <span class="mini-badge status-running" data-release-provider-evidence-doc-count="${escapeHtml(focusedProvider)}">${escapeHtml(`evidence ${focusedProviderClosureSummary.evidenceDocCount}`)}</span>
                            <span class="mini-badge ${focusedProviderClosureSummary.productionReadyClaimAllowed ? 'status-completed' : 'status-failed'}" data-release-provider-production-ready-claim="${escapeHtml(focusedProvider)}">${escapeHtml(focusedProviderClosureSummary.productionReadyClaimAllowed ? 'claim allowed' : 'claim blocked')}</span>
                            <span class="mini-badge ${focusedProviderClosureSummary.targetBoundaryRequiredCount ? 'status-failed' : 'status-completed'}" data-release-provider-target-boundary-count="${escapeHtml(focusedProvider)}">${escapeHtml(`target boundary ${focusedProviderClosureSummary.targetBoundaryRequiredCount}`)}</span>
                          </div>
                        `
                      : ''}
                    ${focusedProviderLatestAction
                      ? `
                          <div class="item-meta">
                            최근 provider 시도 · ${escapeHtml(getReleaseActionLabel(focusedProviderLatestAction.action))} · ${escapeHtml(focusedProviderLatestAction.outcome || 'unknown')} · ${escapeHtml(formatDate(focusedProviderLatestAction.createdAt))}
                          </div>
                          <div class="item-meta">${escapeHtml(focusedProviderLatestAction.summary || '최근 provider action summary가 없습니다.')}</div>
                          <div class="release-history-filter-chips">
                            <span class="mini-badge status-running">같은 provider ${escapeHtml(String(focusedProviderHistory.length))}건</span>
                            ${focusedProviderAttentionHistory.length
                              ? `<span class="mini-badge status-failed">문제 흐름 ${escapeHtml(String(focusedProviderAttentionHistory.length))}건</span>`
                              : ''}
                            ${focusedProviderFlowActive
                              ? '<span class="mini-badge status-running">현재 provider flow 적용 중</span>'
                              : ''}
                            ${focusedProviderAttentionFlowActive
                              ? '<span class="mini-badge status-failed">현재 provider 문제 흐름 적용 중</span>'
                              : ''}
                          </div>
                          ${focusedProviderLatestAttentionAction
                            ? `
                                <div class="item-meta">
                                  최근 provider 문제 · ${escapeHtml(getReleaseActionLabel(focusedProviderLatestAttentionAction.action))} · ${escapeHtml(formatDate(focusedProviderLatestAttentionAction.createdAt))}
                                </div>
                                <div class="item-meta">${escapeHtml(focusedProviderLatestAttentionAction.summary || '최근 provider 문제 summary가 없습니다.')}</div>
                              `
                            : ''}
                        `
                      : `
                          <div class="item-meta">이 provider에 연결된 release action history가 아직 없습니다.</div>
                        `}
                    <div class="release-history-focus-actions">
                      ${focusedProviderEntry
                        ? `
                            ${renderReleaseProviderActionButton({
                              action: 'run-release-preflight',
                              actionLabel: `provider preflight 실행: ${focusedProviderActionLabel}`,
                              buttonText: 'preflight 실행',
                              provider: focusedProviderEntry.provider,
                            })}
                            ${renderReleaseCommandCopyButton({
                              actionLabel: `provider preflight 명령 복사: ${focusedProviderActionLabel}`,
                              buttonText: 'preflight 명령 복사',
                              command: focusedProviderEntry.preflightCommand || `npm run preflight:execution-v1:${focusedProviderEntry.provider}`,
                              label: `${focusedProviderEntry.label} preflight 명령`,
                            })}
                            ${renderReleaseProviderActionButton({
                              action: 'refresh-release-status-live',
                              actionLabel: focusedProviderEntry.ready
                                ? (liveConfirmProvider === focusedProviderEntry.provider ? `provider live 검증 확인: ${focusedProviderActionLabel}` : `provider live 검증 실행: ${focusedProviderActionLabel}`)
                                : `provider env 필요: ${focusedProviderActionLabel}`,
                              buttonText: focusedProviderEntry.ready ? (liveConfirmProvider === focusedProviderEntry.provider ? 'live 검증 확인' : 'live 검증 실행') : 'env 필요',
                              className: liveConfirmProvider === focusedProviderEntry.provider ? 'primary-button' : 'ghost-button',
                              disabled: !focusedProviderEntry.ready,
                              pressed: liveConfirmProvider === focusedProviderEntry.provider,
                              provider: focusedProviderEntry.provider,
                            })}
                            ${renderReleaseCommandCopyButton({
                              actionLabel: `provider live 명령 복사: ${focusedProviderActionLabel}`,
                              buttonText: 'live 명령 복사',
                              command: getProviderLiveCommand(focusedProviderEntry, focusedProviderPreflight),
                              label: `${focusedProviderEntry.label} live 명령`,
                            })}
                            ${renderReleaseProviderReadinessPackageCopyButton({
                              actionLabel: `provider package 복사: ${focusedProviderActionLabel}`,
                              buttonText: 'provider package 복사',
                              provider: focusedProviderEntry.provider,
                            })}
                          `
                        : ''}
                      ${focusedProviderTopBlocker
                        ? `
                            ${renderReleaseProviderNavigationButton({
                              action: 'focus-release-blocker',
                              actionLabel: `provider blocker 보기: ${focusedProviderActionLabel}`,
                              blocker: focusedProviderTopBlockerId,
                              buttonText: 'provider blocker 보기',
                              pressed: focusedProviderTopBlockerId === focusedBlockerId,
                              provider: focusedProvider,
                            })}
                            ${renderReleaseBlockerPackageCopyButton({
                              actionLabel: `provider blocker package 복사: ${focusedProviderActionLabel}`,
                              attributes: 'data-release-provider-blocker-package="true"',
                              blockerId: focusedProviderTopBlockerId,
                              buttonText: 'provider blocker package 복사',
                              provider: focusedProvider,
                            })}
                          `
                        : ''}
                      ${focusedProviderLatestAction
                        ? `
                            ${renderReleaseProviderNavigationButton({
                              action: 'focus-release-history',
                              actionLabel: `최근 provider 기록 보기: ${focusedProviderActionLabel} ${focusedProviderLatestActionLabel}`,
                              buttonText: '최근 provider 기록 보기',
                              pressed: String(focusedProviderLatestAction.id || '').trim() === focusedHistoryId,
                              value: String(focusedProviderLatestAction.id || '').trim(),
                            })}
                            ${renderReleaseProviderNavigationButton({
                              action: 'filter-release-history-provider',
                              actionLabel: `같은 provider 기록만 보기: ${focusedProviderActionLabel}`,
                              buttonText: '같은 provider 기록만 보기',
                              pressed: historyFilterProvider === focusedProvider,
                              provider: focusedProvider,
                            })}
                            ${renderReleaseProviderNavigationButton({
                              action: 'focus-release-flow',
                              actionLabel: focusedProviderFlowActive
                                ? `현재 provider flow: ${focusedProviderActionLabel} ${focusedProviderLatestActionLabel}`
                                : `같은 provider flow 보기: ${focusedProviderActionLabel} ${focusedProviderLatestActionLabel}`,
                              buttonText: focusedProviderFlowActive ? '현재 provider flow' : '같은 provider flow 보기',
                              disabled: focusedProviderFlowActive,
                              outcome: isReleaseAttentionOutcome(focusedProviderLatestAction.outcome) ? 'attention' : '',
                              pressed: focusedProviderFlowActive,
                              provider: String(focusedProviderLatestAction.provider || '').trim(),
                              scope: String(focusedProviderLatestAction.scope || '').trim(),
                              value: String(focusedProviderLatestAction.id || '').trim(),
                            })}
                            ${renderReleaseLinkCopyButton({
                              action: 'copy-release-flow-link',
                              actionLabel: `provider flow 링크 복사: ${focusedProviderActionLabel} ${focusedProviderLatestActionLabel}`,
                              attributes: `data-ui-outcome="${escapeHtml(isReleaseAttentionOutcome(focusedProviderLatestAction.outcome) ? 'attention' : '')}" data-ui-scope="${escapeHtml(String(focusedProviderLatestAction.scope || '').trim())}" data-ui-provider="${escapeHtml(String(focusedProviderLatestAction.provider || '').trim())}"`,
                              buttonText: 'provider flow 링크 복사',
                              value: String(focusedProviderLatestAction.id || '').trim(),
                            })}
                          `
                        : ''}
                      ${focusedProviderLatestAttentionAction
                        ? `
                            ${renderReleaseProviderNavigationButton({
                              action: 'focus-release-history',
                              actionLabel: `최근 provider 문제 보기: ${focusedProviderActionLabel} ${focusedProviderLatestAttentionLabel}`,
                              buttonText: '최근 provider 문제 보기',
                              pressed: String(focusedProviderLatestAttentionAction.id || '').trim() === focusedHistoryId,
                              value: String(focusedProviderLatestAttentionAction.id || '').trim(),
                            })}
                            ${renderReleaseProviderNavigationButton({
                              action: 'filter-release-history-attention',
                              actionLabel: `주의 상태만 보기: ${focusedProviderActionLabel}`,
                              buttonText: '주의 상태만',
                              outcome: 'attention',
                              pressed: historyFilterOutcome === 'attention',
                            })}
                            ${renderReleaseProviderNavigationButton({
                              action: 'focus-release-flow',
                              actionLabel: focusedProviderAttentionFlowActive
                                ? `현재 provider 문제 흐름: ${focusedProviderActionLabel} ${focusedProviderLatestAttentionLabel}`
                                : `같은 provider 문제 흐름 보기: ${focusedProviderActionLabel} ${focusedProviderLatestAttentionLabel}`,
                              buttonText: focusedProviderAttentionFlowActive ? '현재 provider 문제 흐름' : '같은 provider 문제 흐름 보기',
                              disabled: focusedProviderAttentionFlowActive,
                              outcome: 'attention',
                              pressed: focusedProviderAttentionFlowActive,
                              provider: String(focusedProviderLatestAttentionAction.provider || focusedProviderLatestAction?.provider || '').trim(),
                              scope: String(focusedProviderLatestAttentionAction.scope || focusedProviderLatestAction?.scope || '').trim(),
                              value: String(focusedProviderLatestAttentionAction.id || '').trim(),
                            })}
                            ${renderReleaseLinkCopyButton({
                              action: 'copy-release-flow-link',
                              actionLabel: `provider 문제 흐름 링크 복사: ${focusedProviderActionLabel} ${focusedProviderLatestAttentionLabel}`,
                              attributes: `data-ui-outcome="attention" data-ui-scope="${escapeHtml(String(focusedProviderLatestAttentionAction.scope || focusedProviderLatestAction?.scope || '').trim())}" data-ui-provider="${escapeHtml(String(focusedProviderLatestAttentionAction.provider || focusedProviderLatestAction?.provider || '').trim())}"`,
                              buttonText: 'provider 문제 흐름 링크 복사',
                              value: String(focusedProviderLatestAttentionAction.id || '').trim(),
                            })}
                          `
                        : ''}
                      ${renderReleaseClearActionButton({
                        action: 'clear-release-provider-focus',
                        actionLabel: `provider 포커스 해제: ${focusedProviderActionLabel}`,
                        buttonText: 'provider 포커스 해제',
                      })}
                      ${renderReleaseLinkCopyButton({
                        action: 'copy-release-provider-link',
                        actionLabel: `provider 링크 복사: ${focusedProviderActionLabel}`,
                        attributes: `data-ui-provider="${escapeHtml(focusedProvider)}"`,
                        buttonText: 'provider 링크 복사',
                        value: focusedProvider,
                      })}
                      ${renderReleaseLinkCopyButton({
                        actionLabel: `현재 triage 링크 복사: ${focusedProviderActionLabel}`,
                        buttonText: '현재 triage 링크 복사',
                        value: `focused-provider:${focusedProvider}`,
                      })}
                    </div>
                  </div>
                `
              : ''}
            <div class="harness-callout release-provider-focus-callout">
              <strong>전체 provider preflight</strong>
              <p>OpenAI, Anthropic, local, Hermes live validation prerequisites를 한 번에 확인합니다. 현재 결과: ${escapeHtml(aggregatePreflightLabel)}</p>
              <div class="release-history-filter-chips">
                <span class="mini-badge ${getReleaseStatusBadge(releaseAllPreflight?.status || 'not-run')}">${escapeHtml(releaseAllPreflight?.status || 'not-run')}</span>
                <span class="mini-badge status-running">${escapeHtml(aggregatePreflightReadyLabel)}</span>
                <span class="mini-badge ${releaseAllPreflight ? 'status-failed' : 'status-running'}">${escapeHtml(aggregatePreflightMissingEnvLabel)}</span>
                <span class="mini-badge ${releaseAllPreflight?.blockedCount ? 'status-failed' : 'status-completed'}">${escapeHtml(aggregatePreflightBlockedLabel)}</span>
              </div>
              <div class="release-history-focus-actions">
                ${renderReleasePreflightAllButton({
                  actionLabel: `전체 preflight 실행: ${releaseActionLabel}`,
                })}
                ${renderReleaseCommandCopyButton({
                  actionLabel: `전체 preflight 명령 복사: ${releaseActionLabel}`,
                  buttonText: '전체 preflight 명령 복사',
                  command: 'npm run preflight:execution-v1:all',
                  label: '전체 preflight 명령',
                })}
                ${renderReleaseProviderReadinessPackageCopyButton({
                  actionLabel: `전체 readiness package 복사: ${releaseActionLabel}`,
                  buttonText: '전체 readiness package 복사',
                })}
              </div>
            </div>
            <div class="release-provider-grid">
              ${orderedProviderReadiness
                .map(
                  (item) => `
                    ${(() => {
                      const preflight = state.releasePreflightResults?.[item.provider] || null;
                      const liveConfirmArmed = liveConfirmProvider === item.provider;
                      const isFocusedProvider = focusedProvider === item.provider;
                      const providerActionLabel = item.label || item.provider || 'provider';
                      const preflightStatus = preflight?.status || 'not-run';
                      const liveCommand = getProviderLiveCommand(item, preflight);
                      const providerLiveButtonLabel = item.ready
                        ? liveConfirmArmed
                          ? `provider live 검증 확인: ${providerActionLabel}`
                          : `provider live 검증 실행: ${providerActionLabel}`
                        : `provider env 필요: ${providerActionLabel}`;
                      const providerFocusButtonLabel = isFocusedProvider
                        ? `provider 포커스 해제: ${providerActionLabel}`
                        : `이 provider 카드 보기: ${providerActionLabel}`;
                      const providerBlockerActions = getReleaseProviderBlockerActions({
                        provider: item.provider,
                        releaseStatus: release,
                      });
                      const providerTopBlocker = providerBlockerActions[0] || null;
                      const providerTopBlockerId = String(providerTopBlocker?.id || '').trim();
                      const providerClosureSummary = getReleaseProviderClosureSummary(item, providerBlockerActions);
                      const preflightSummary = preflight
                        ? preflight.status === 'ready-for-live-validation'
                          ? `preflight 통과 · ${preflight.checks?.length || 0}개 smoke passed`
                          : preflight.status === 'ready-but-missing-env'
                            ? `preflight 통과 · ${preflight.envKey} 필요`
                            : preflight.status === 'blocked'
                              ? `preflight blocked · ${(preflight.checks || []).filter((check) => check.status !== 'passed').length}개 실패`
                              : `preflight ${preflight.status}`
                        : 'preflight를 아직 실행하지 않았습니다.';
                      return `
                    <article class="release-provider-card ${item.ready ? 'is-ready' : 'is-blocked'} ${isFocusedProvider ? 'is-highlighted' : ''}" data-release-provider="${escapeHtml(item.provider)}">
                      <div>
                        <div class="item-title">${escapeHtml(item.label)}</div>
                        <div class="item-meta mono">${escapeHtml(item.envKey)}</div>
                      </div>
                      <div class="release-provider-meta">
                        <span class="mini-badge ${getReleaseStatusBadge(item.status)}">${escapeHtml(item.status)}</span>
                        <span class="mini-badge ${getReleaseStatusBadge(preflightStatus)}">${escapeHtml(preflightStatus)}</span>
                        <span
                          class="mini-badge ${providerBlockerActions.length ? 'status-failed' : 'status-completed'}"
                          data-release-provider-blocker-count="${escapeHtml(item.provider)}"
                        >blockers ${escapeHtml(String(providerBlockerActions.length))}</span>
                        <span
                          class="mini-badge ${providerClosureSummary.productionReadyClaimAllowed ? 'status-completed' : 'status-failed'}"
                          data-release-provider-closure-count="${escapeHtml(item.provider)}"
                        >closure ${escapeHtml(String(providerClosureSummary.closureVerificationCount))}</span>
                        <span
                          class="mini-badge status-running"
                          data-release-provider-required-proof-count="${escapeHtml(item.provider)}"
                        >proofs ${escapeHtml(String(providerClosureSummary.requiredProofCount))}</span>
                      </div>
                      <div class="release-provider-meta">
                        ${renderReleaseProviderActionButton({
                          action: 'run-release-preflight',
                          actionLabel: `provider preflight 실행: ${providerActionLabel}`,
                          buttonText: 'preflight 실행',
                          provider: item.provider,
                        })}
                        ${renderReleaseCommandCopyButton({
                          actionLabel: `provider preflight 명령 복사: ${providerActionLabel}`,
                          buttonText: 'preflight 명령 복사',
                          command: item.preflightCommand || `npm run preflight:execution-v1:${item.provider}`,
                          label: `${item.label} preflight 명령`,
                        })}
                        ${renderReleaseProviderActionButton({
                          action: 'refresh-release-status-live',
                          actionLabel: providerLiveButtonLabel,
                          buttonText: item.ready ? (liveConfirmArmed ? 'live 검증 확인' : 'live 검증 실행') : 'env 필요',
                          className: liveConfirmArmed ? 'primary-button' : 'ghost-button',
                          disabled: !item.ready,
                          pressed: liveConfirmArmed,
                          provider: item.provider,
                        })}
                        ${renderReleaseCommandCopyButton({
                          actionLabel: `provider live 명령 복사: ${providerActionLabel}`,
                          buttonText: 'live 명령 복사',
                          command: liveCommand,
                          label: `${item.label} live 명령`,
                        })}
                        ${renderReleaseProviderReadinessPackageCopyButton({
                          actionLabel: `provider package 복사: ${providerActionLabel}`,
                          buttonText: 'provider package 복사',
                          provider: item.provider,
                        })}
                        ${providerTopBlocker
                          ? `
                              ${renderReleaseBlockerFocusButton({
                                actionLabel: `provider blocker 보기: ${providerActionLabel}`,
                                blocker: providerTopBlockerId,
                                buttonText: 'provider blocker 보기',
                                pressed: providerTopBlockerId === focusedBlockerId,
                                provider: item.provider,
                              })}
                              ${renderReleaseBlockerPackageCopyButton({
                                actionLabel: `provider blocker package 복사: ${providerActionLabel}`,
                                attributes: 'data-release-provider-blocker-package="true"',
                                blockerId: providerTopBlockerId,
                                buttonText: 'blocker package 복사',
                                provider: item.provider,
                              })}
                            `
                          : ''}
                        ${renderReleaseProviderFocusActionButton({
                          action: isFocusedProvider ? 'clear-release-provider-focus' : 'focus-release-provider',
                          actionLabel: providerFocusButtonLabel,
                          buttonText: isFocusedProvider ? 'provider 포커스 해제' : '이 provider 카드 보기',
                          pressed: isFocusedProvider,
                          provider: item.provider,
                        })}
                        ${renderReleaseLinkCopyButton({
                          action: 'copy-release-provider-link',
                          actionLabel: `provider 링크 복사: ${providerActionLabel}`,
                          attributes: `data-ui-provider="${escapeHtml(item.provider)}"`,
                          buttonText: 'provider 링크 복사',
                          value: item.provider,
                        })}
                        ${liveConfirmArmed
                          ? renderReleaseSimpleActionButton({
                              action: 'cancel-refresh-release-status-live',
                              actionLabel: `provider live 검증 취소: ${providerActionLabel}`,
                              buttonText: '현재 live 검증 취소',
                            })
                          : ''}
                      </div>
                      <p class="item-meta">${escapeHtml(item.ready ? `준비됨 · ${item.command}` : `실행 전 ${item.envKey}가 필요합니다 · ${liveCommand}`)}</p>
                      <p class="item-meta">${escapeHtml(preflightSummary)}</p>
                      <p class="item-meta" data-release-provider-closure-summary="${escapeHtml(item.provider)}">
                        ${escapeHtml(`closure verifications ${providerClosureSummary.closureVerificationCount} · required proofs ${providerClosureSummary.requiredProofCount} · commands ${providerClosureSummary.commandCount} · evidence docs ${providerClosureSummary.evidenceDocCount} · target boundary ${providerClosureSummary.targetBoundaryRequiredCount}`)}
                      </p>
                      ${providerTopBlocker
                        ? `<p class="item-meta" data-release-provider-blocker-summary="${escapeHtml(item.provider)}">linked blocker · ${escapeHtml(providerTopBlockerId || 'unknown')} · ${escapeHtml(String(providerTopBlocker.stopReason || providerTopBlocker.blocker || '').trim())}</p>`
                        : `<p class="item-meta" data-release-provider-blocker-summary="${escapeHtml(item.provider)}">linked blocker 없음</p>`}
                      ${liveConfirmArmed && liveRefreshPreflight
                        ? `
                            <div class="release-stale-note">
                              <div class="release-stale-line">${escapeHtml(liveRefreshPreflight.summary || 'live validation 확인이 준비되었습니다.')}</div>
                              ${(liveRefreshPreflight.notes || [])
                                .map((note) => `<div class="release-stale-line">${escapeHtml(note)}</div>`)
                                .join('')}
                            </div>
                          `
                        : ''}
                    </article>
                  `;
                    })()}
                  `,
                )
                .join('')}
            </div>
            ${refreshPlan
              ? `
                  <article class="release-snapshot-card">
                    <div class="item-title">Current Surface 재생성 영향</div>
                    <div class="release-doc-status-list">
                      ${(refreshPlan.affectsPaths || [])
                        .map(
                          (item) => `
                            <div class="harness-row">
                              <div>
                                <div class="item-title">rewrite target</div>
                                <div class="item-meta mono">${escapeHtml(item)}</div>
                              </div>
                            </div>
                          `,
                        )
                        .join('')}
                      <div class="harness-row">
                        <div>
                          <div class="item-title">deterministic verification</div>
                          <div class="item-meta">${escapeHtml(refreshPlan.rerunsDeterministicVerification ? '다시 실행됨' : '다시 실행되지 않음')}</div>
                        </div>
                      </div>
                      <div class="harness-row">
                        <div>
                          <div class="item-title">provider live validation</div>
                          <div class="item-meta">${escapeHtml(refreshPlan.rerunsLiveValidation ? '재실행됨' : '기본 regenerate에서는 재실행되지 않음')}</div>
                        </div>
                      </div>
                      <div class="harness-row">
                        <div>
                          <div class="item-title">release snapshot</div>
                          <div class="item-meta">${escapeHtml(refreshPlan.snapshotChanges ? '같이 갱신됨' : '자동으로 변경되지 않음')}</div>
                        </div>
                      </div>
                    </div>
                  </article>
                `
              : ''}
            <div class="release-stale-note">
              <div class="release-stale-line">${escapeHtml(snapshotEligibility.allowed ? 'current HEAD 기준 evidence/closeout/handoff가 fresh해서 snapshot을 바로 고정할 수 있습니다.' : snapshotEligibility.reason || '현재 상태에서는 snapshot을 고정할 수 없습니다.')}</div>
            </div>
            ${snapshot
              ? `
                  <article class="release-snapshot-card">
                    <div class="mini-head">
                      <div>
                        <p class="section-kicker">Release Snapshot</p>
                        <h4>마지막으로 고정한 verified artifact</h4>
                      </div>
                    </div>
                    <div class="release-meta">
                      <span class="item-meta">verified ${escapeHtml(snapshot.verifiedCommit || '-')}</span>
                      <span class="item-meta">${escapeHtml(formatDate(snapshot.archivedAt))}</span>
                    </div>
                    <div class="release-meta release-meta-secondary">
                      <span class="mini-badge ${baseline?.ready ? 'status-completed' : 'status-pending'}">${escapeHtml(
                        baseline?.ready ? 'baseline ready' : 'baseline 검토 필요',
                      )}</span>
                      <span class="mini-badge ${snapshot.matchesCurrentHead ? 'status-completed' : 'status-pending'}">${escapeHtml(snapshot.matchesCurrentHead ? 'current head와 일치' : '이전 verified snapshot')}</span>
                      <span class="mini-badge ${snapshot.matchesGeneratedCommit ? 'status-completed' : 'status-pending'}">${escapeHtml(snapshot.matchesGeneratedCommit ? '현재 evidence와 연결됨' : '현재 evidence와 분리됨')}</span>
                    </div>
                    <div class="release-doc-status-list">
                      <div class="harness-row">
                        <div>
                          <div class="item-title">snapshot evidence</div>
                          <div class="item-meta mono">${escapeHtml(snapshot.evidencePath || '-')}</div>
                        </div>
                      </div>
                      <div class="harness-row">
                        <div>
                          <div class="item-title">snapshot closeout</div>
                          <div class="item-meta mono">${escapeHtml(snapshot.closeoutPath || '-')}</div>
                        </div>
                      </div>
                      <div class="harness-row">
                        <div>
                          <div class="item-title">snapshot handoff</div>
                          <div class="item-meta mono">${escapeHtml(snapshot.handoffPath || '-')}</div>
                        </div>
                      </div>
                    </div>
                  </article>
                `
              : `
                  <article class="release-snapshot-card is-empty">
                    <div class="item-title">Release snapshot이 아직 없습니다.</div>
                    <p class="item-meta">상태 다시 읽기는 read-only reload이고, current surface evidence/closeout/handoff를 다시 만들려면 위의 current surface 재생성 또는 provider별 live validation을 실행하면 됩니다.</p>
                  </article>
                `}
            <div class="release-live-list">
              ${(liveValidation.length ? liveValidation : [{ provider: 'live validation', status: 'not requested' }])
                .map(
                  (item) => `
                    <div class="harness-row">
                      <div>
                        <div class="item-title">${escapeHtml(item.provider)}</div>
                      </div>
                      <div class="harness-row-meta">
                        <span class="mini-badge ${getReleaseStatusBadge(item.status)}">${escapeHtml(item.status)}</span>
                      </div>
                    </div>
                  `,
                )
                .join('')}
            </div>
            ${handoffArtifacts.length
              ? `
                  <article class="release-snapshot-card">
                    <div class="mini-head">
                      <div>
                        <p class="section-kicker">Release Handoff</p>
                        <h4>검토용 artifact 바로가기</h4>
                      </div>
                    </div>
                    <div class="release-meta">
                      <span class="item-meta">ready ${escapeHtml(String(readyHandoffArtifacts.length))}/${escapeHtml(String(handoffArtifacts.length))}</span>
                      <span class="item-meta">recommended ${escapeHtml(String(recommendedHandoffArtifacts.length))}개</span>
                    </div>
                    <div class="release-handoff-grid">
                      ${handoffArtifacts
                        .map((item) => {
                          const previewable = isReleaseHandoffPreviewable(item);
                          const previewActive = handoffPreviewArtifactId === String(item.id || '').trim();
                          const structuredSummaryRows = getReleaseHandoffStructuredSummaryRows(item);
                          const structuredSummaryDetails = getReleaseHandoffStructuredSummaryDetails(item);
                          const structuredSummaryOverviewLine = getReleaseHandoffStructuredSummaryOverviewLine(item);
                          const structuredSummarySha = getReleaseHandoffStructuredSummarySha(item);
                          const handoffActionTargetLabel = item.label || item.id || item.path || 'handoff artifact';
                          const previewButtonLabel = previewActive
                            ? (handoffPreviewStatus === 'loading'
                              ? '미리보는 중'
                              : handoffPreviewStatus === 'error'
                                ? '다시 시도'
                                : '미리보기 닫기')
                            : '미리보기';
                          return `
                            <article class="release-handoff-card ${item.exists ? 'is-ready' : 'is-missing'} ${item.recommended ? 'is-recommended' : ''} ${previewActive ? 'is-preview-active' : ''}" data-release-handoff-id="${escapeHtml(item.id || '')}">
                              <div class="release-handoff-head">
                                <div>
                                  <div class="item-title">${escapeHtml(item.label || '-')}</div>
                                  <div class="item-meta">${escapeHtml(item.description || '')}</div>
                                </div>
                                <div class="release-provider-meta">
                                  <span class="mini-badge ${getReleaseStatusBadge(item.exists ? 'ready' : 'blocked')}">${escapeHtml(item.exists ? 'ready' : 'missing')}</span>
                                  <span class="mini-badge status-running">${escapeHtml(item.kind || 'artifact')}</span>
                                  <span class="mini-badge">${escapeHtml(item.format || 'file')}</span>
                                  ${item.recommended ? '<span class="mini-badge status-completed">recommended</span>' : ''}
                                </div>
                              </div>
                              <div class="item-meta mono release-handoff-path">${escapeHtml(item.path || '-')}</div>
                              <div class="release-handoff-meta">
                                <span class="item-meta">${escapeHtml(item.exists ? formatByteCount(item.bytes) : '파일 없음')}</span>
                                <span class="item-meta">${escapeHtml(item.updatedAt ? formatDate(item.updatedAt) : '미생성')}</span>
                              </div>
                              ${structuredSummaryRows.length
                                ? `
                                    <div class="release-handoff-summary">
                                      ${structuredSummaryRows
                                        .map(
                                          (row) => `
                                            <div class="harness-row">
                                              <div class="item-title">${escapeHtml(row.label)}</div>
                                              <div class="item-meta">${escapeHtml(row.value)}</div>
                                            </div>
                                          `,
                                        )
                                        .join('')}
                                      ${structuredSummaryDetails.length
                                        ? `
                                            <div class="release-handoff-summary-details">
                                              ${structuredSummaryDetails
                                                .map(
                                                  (detail) => `
                                                    <div class="release-handoff-summary-detail" data-release-handoff-structured-summary-detail="${escapeHtml(item.id || '')}">
                                                      <div class="release-handoff-summary-detail-head">
                                                        <span class="item-title">${escapeHtml(detail.label)}</span>
                                                        ${renderReleaseHandoffStructuredSummaryCopyButton({
                                                          action: 'copy-release-handoff-structured-summary-detail',
                                                          actionLabel: `handoff summary line 복사: ${handoffActionTargetLabel} ${detail.label || detail.key || 'detail'}`,
                                                          artifactId: item.id || '',
                                                          attributes: `data-release-handoff-structured-summary-detail-copy="${escapeHtml(`${item.id || ''}:${detail.key || ''}`)}"`,
                                                          buttonText: 'line 복사',
                                                          detailKey: detail.key || '',
                                                          successNotice: `${item.label || 'handoff summary'} ${detail.label || 'detail'} line을 복사했습니다.`,
                                                        })}
                                                      </div>
                                                      <span class="item-meta mono">${escapeHtml(detail.overviewLine)}</span>
                                                      ${detail.stableLines?.length
                                                        ? `
                                                            <div class="release-handoff-summary-stable-lines">
                                                              <span class="item-meta">stable lines ${escapeHtml(String(detail.stableLineCount || detail.stableLines.length || 0))}</span>
                                                              ${detail.stableLines
                                                                .map(
                                                                  (line, lineIndex) => `
                                                                    <div class="release-handoff-summary-stable-line-row">
                                                                      <span class="item-meta mono release-handoff-summary-stable-line">${escapeHtml(line)}</span>
                                                                      ${renderReleaseHandoffStructuredSummaryCopyButton({
                                                                        action: 'copy-release-handoff-structured-summary-stable-line',
                                                                        actionLabel: `handoff summary stable line 복사: ${handoffActionTargetLabel} ${detail.label || detail.key || 'detail'} ${lineIndex + 1}`,
                                                                        artifactId: item.id || '',
                                                                        attributes: `data-release-handoff-structured-summary-stable-line-copy="${escapeHtml(`${item.id || ''}:${detail.key || ''}:${lineIndex}`)}"`,
                                                                        buttonText: 'stable line 복사',
                                                                        detailKey: detail.key || '',
                                                                        lineIndex,
                                                                        successNotice: `${item.label || 'handoff summary'} ${detail.label || 'detail'} stable line을 복사했습니다.`,
                                                                      })}
                                                                    </div>
                                                                  `,
                                                                )
                                                                .join('')}
                                                            </div>
                                                          `
                                                        : ''}
                                                    </div>
                                                  `,
                                                )
                                                .join('')}
                                            </div>
                                          `
                                        : ''}
                                      ${structuredSummaryOverviewLine
                                        ? `
                                            <div class="item-meta mono release-handoff-summary-overview" data-release-handoff-structured-summary-overview="${escapeHtml(item.id || '')}">
                                              ${escapeHtml(structuredSummaryOverviewLine)}
                                            </div>
                                            <div class="release-handoff-summary-actions">
                                              ${renderReleaseHandoffStructuredSummaryCopyButton({
                                                action: 'copy-release-handoff-structured-summary',
                                                actionLabel: `handoff summary overview 복사: ${handoffActionTargetLabel}`,
                                                artifactId: item.id || '',
                                                attributes: `data-release-handoff-structured-summary-copy="${escapeHtml(item.id || '')}"`,
                                                buttonText: 'overview 복사',
                                                successNotice: `${item.label || 'handoff summary'} overview line을 복사했습니다.`,
                                              })}
                                            </div>
                                          `
                                        : ''}
                                      ${structuredSummarySha
                                        ? `
                                            <div class="item-meta mono release-handoff-summary-sha" data-release-handoff-structured-summary-sha="${escapeHtml(item.id || '')}">
                                              sha ${escapeHtml(structuredSummarySha)}
                                            </div>
                                          `
                                        : ''}
                                    </div>
                                  `
                                : ''}
                              <div class="release-provider-meta">
                                ${previewable
                                  ? `
                                      ${renderReleaseToggleActionButton({
                                        action: 'toggle-release-handoff-preview',
                                        actionLabel: `${previewButtonLabel}: ${handoffActionTargetLabel}`,
                                        attributes: `data-release-handoff-preview-trigger="${escapeHtml(item.id || '')}"`,
                                        buttonText: previewButtonLabel,
                                        disabled: previewActive && handoffPreviewStatus === 'loading',
                                        expanded: previewActive,
                                        value: item.id || '',
                                      })}
                                      ${renderReleaseHandoffLinkCopyButton({
                                        action: 'copy-release-handoff-preview-link',
                                        actionLabel: `handoff preview 링크 복사: ${handoffActionTargetLabel}`,
                                        artifactId: item.id || '',
                                        attributes: `data-release-handoff-preview-link-copy="${escapeHtml(item.id || '')}"`,
                                        buttonText: '링크',
                                        successNotice: `${item.label || 'handoff preview'} 링크를 복사했습니다.`,
                                      })}
                                    `
                                  : ''}
                                ${item.href
                                  ? `
                                      ${!previewable
                                        ? `
                                            ${renderReleaseHandoffLinkCopyButton({
                                              action: 'copy-release-handoff-open-link',
                                              actionLabel: `handoff artifact 열기 링크 복사: ${handoffActionTargetLabel}`,
                                              artifactId: item.id || '',
                                              attributes: `data-release-handoff-open-link-copy="${escapeHtml(item.id || '')}"`,
                                              buttonText: '링크',
                                              successNotice: `${item.label || 'handoff artifact'} 열기 링크를 복사했습니다.`,
                                            })}
                                          `
                                        : ''}
                                      <a
                                        class="ghost-button"
                                        data-release-handoff-open="true"
                                        href="${escapeHtml(item.href)}"
                                        rel="noreferrer"
                                        target="_blank"
                                        aria-label="${escapeHtml(`handoff artifact 열기: ${item.label || item.id || item.path || 'artifact'}`)}"
                                        title="${escapeHtml(`handoff artifact 열기: ${item.label || item.id || item.path || 'artifact'}`)}"
                                      >열기</a>
                                    `
                                  : ''}
                                ${renderReleaseCommandCopyButton({
                                  actionLabel: `handoff artifact 경로 복사: ${handoffActionTargetLabel}`,
                                  buttonText: '경로 복사',
                                  command: item.path || '',
                                  label: `${item.label || 'artifact'} 경로`,
                                })}
                              </div>
                            </article>
                          `;
                        })
                        .join('')}
                    </div>
                    ${handoffPreviewArtifact
                      ? `
                          <section
                            class="release-handoff-preview"
                            data-release-handoff-preview-panel="${escapeHtml(handoffPreviewArtifact.id || '')}"
                            data-release-handoff-preview-state="${escapeHtml(handoffPreviewStatus || 'idle')}"
                          >
                            <div class="release-handoff-preview-head">
                              <div>
                                <p class="section-kicker">Inline Preview</p>
                                <div class="item-title">${escapeHtml(handoffPreviewArtifact.label || '-')}</div>
                                <div class="item-meta">${escapeHtml(handoffPreviewArtifact.description || '')}</div>
                              </div>
                              <div class="release-provider-meta">
                                <span class="mini-badge status-running" data-release-handoff-preview-format>${escapeHtml(handoffPreviewArtifact.format || 'file')}</span>
                                <span class="mini-badge">${escapeHtml(handoffPreviewArtifact.kind || 'artifact')}</span>
                                ${handoffPreviewArtifact.href
                                  ? `
                                      <a
                                        class="ghost-button"
                                        href="${escapeHtml(handoffPreviewArtifact.href)}"
                                        rel="noreferrer"
                                        target="_blank"
                                        aria-label="${escapeHtml(`handoff preview 새 탭 열기: ${handoffPreviewArtifact.label || handoffPreviewArtifact.id || handoffPreviewArtifact.path || 'artifact'}`)}"
                                        title="${escapeHtml(`handoff preview 새 탭 열기: ${handoffPreviewArtifact.label || handoffPreviewArtifact.id || handoffPreviewArtifact.path || 'artifact'}`)}"
                                      >새 탭 열기</a>
                                    `
                                  : ''}
                                ${renderReleaseHandoffLinkCopyButton({
                                  action: 'copy-release-handoff-preview-link',
                                  actionLabel: `현재 handoff preview 링크 복사: ${handoffPreviewArtifact.label || handoffPreviewArtifact.id || handoffPreviewArtifact.path || 'artifact'}`,
                                  artifactId: handoffPreviewArtifact.id || '',
                                  attributes: 'data-release-handoff-current-preview-link-copy="true"',
                                  buttonText: '현재 링크 복사',
                                  copiedText: '현재 링크 복사됨',
                                  successNotice: `${handoffPreviewArtifact.label || '현재 handoff preview'} 링크를 복사했습니다.`,
                                })}
                                ${renderReleaseClearActionButton({
                                  action: 'clear-release-handoff-preview',
                                  actionLabel: `handoff preview 닫기: ${handoffPreviewArtifact.label || handoffPreviewArtifact.id || handoffPreviewArtifact.path || 'artifact'}`,
                                  buttonText: '미리보기 닫기',
                                })}
                              </div>
                            </div>
                            <div class="release-handoff-meta">
                              <span class="item-meta mono">${escapeHtml(handoffPreviewArtifact.path || '-')}</span>
                              <span class="item-meta">${escapeHtml(handoffPreviewArtifact.updatedAt ? formatDate(handoffPreviewArtifact.updatedAt) : '미생성')}</span>
                              ${handoffPreviewLineCount
                                ? `<span class="item-meta">${escapeHtml(String(handoffPreviewLineCount))}줄</span>`
                                : ''}
                            </div>
                            ${handoffPreviewStructuredSummaryRows.length
                              ? `
                                  <div class="release-handoff-summary release-handoff-preview-summary">
                                    ${handoffPreviewStructuredSummaryRows
                                      .map(
                                        (row) => `
                                          <div class="harness-row">
                                            <div class="item-title">${escapeHtml(row.label)}</div>
                                            <div class="item-meta">${escapeHtml(row.value)}</div>
                                          </div>
                                        `,
                                      )
                                      .join('')}
                                    ${getReleaseHandoffStructuredSummaryDetails(handoffPreviewArtifact).length
                                      ? `
                                          <div class="release-handoff-summary-details">
                                            ${getReleaseHandoffStructuredSummaryDetails(handoffPreviewArtifact)
                                              .map(
                                                (detail) => `
                                                  <div class="release-handoff-summary-detail" data-release-handoff-preview-structured-summary-detail="true">
                                                    <div class="release-handoff-summary-detail-head">
                                                      <span class="item-title">${escapeHtml(detail.label)}</span>
                                                      ${renderReleaseHandoffStructuredSummaryCopyButton({
                                                        action: 'copy-release-handoff-structured-summary-detail',
                                                        actionLabel: `현재 handoff summary line 복사: ${handoffPreviewArtifact.label || handoffPreviewArtifact.id || handoffPreviewArtifact.path || 'artifact'} ${detail.label || detail.key || 'detail'}`,
                                                        artifactId: handoffPreviewArtifact.id || '',
                                                        attributes: `data-release-handoff-current-preview-structured-summary-detail-copy="${escapeHtml(detail.key || '')}"`,
                                                        buttonText: '현재 line 복사',
                                                        copiedText: '현재 line 복사됨',
                                                        detailKey: detail.key || '',
                                                        successNotice: `${handoffPreviewArtifact.label || '현재 handoff summary'} ${detail.label || 'detail'} line을 복사했습니다.`,
                                                      })}
                                                    </div>
                                                    <span class="item-meta mono">${escapeHtml(detail.overviewLine)}</span>
                                                    ${detail.stableLines?.length
                                                      ? `
                                                          <div class="release-handoff-summary-stable-lines">
                                                            <span class="item-meta">stable lines ${escapeHtml(String(detail.stableLineCount || detail.stableLines.length || 0))}</span>
                                                            ${detail.stableLines
                                                              .map(
                                                                (line, lineIndex) => `
                                                                  <div class="release-handoff-summary-stable-line-row">
                                                                    <span class="item-meta mono release-handoff-summary-stable-line">${escapeHtml(line)}</span>
                                                                    ${renderReleaseHandoffStructuredSummaryCopyButton({
                                                                      action: 'copy-release-handoff-structured-summary-stable-line',
                                                                      actionLabel: `현재 handoff summary stable line 복사: ${handoffPreviewArtifact.label || handoffPreviewArtifact.id || handoffPreviewArtifact.path || 'artifact'} ${detail.label || detail.key || 'detail'} ${lineIndex + 1}`,
                                                                      artifactId: handoffPreviewArtifact.id || '',
                                                                      attributes: `data-release-handoff-current-preview-structured-summary-stable-line-copy="${escapeHtml(`${detail.key || ''}:${lineIndex}`)}"`,
                                                                      buttonText: '현재 stable line 복사',
                                                                      copiedText: '현재 stable line 복사됨',
                                                                      detailKey: detail.key || '',
                                                                      lineIndex,
                                                                      successNotice: `${handoffPreviewArtifact.label || '현재 handoff summary'} ${detail.label || 'detail'} stable line을 복사했습니다.`,
                                                                    })}
                                                                  </div>
                                                                `,
                                                              )
                                                              .join('')}
                                                          </div>
                                                        `
                                                      : ''}
                                                  </div>
                                                `,
                                              )
                                              .join('')}
                                          </div>
                                        `
                                      : ''}
                                    ${handoffPreviewStructuredSummaryOverviewLine
                                      ? `
                                          <div class="item-meta mono release-handoff-summary-overview" data-release-handoff-preview-structured-summary-overview="true">
                                            ${escapeHtml(handoffPreviewStructuredSummaryOverviewLine)}
                                          </div>
                                          <div class="release-handoff-summary-actions">
                                            ${renderReleaseHandoffStructuredSummaryCopyButton({
                                              action: 'copy-release-handoff-structured-summary',
                                              actionLabel: `현재 handoff summary overview 복사: ${handoffPreviewArtifact.label || handoffPreviewArtifact.id || handoffPreviewArtifact.path || 'artifact'}`,
                                              artifactId: handoffPreviewArtifact.id || '',
                                              attributes: 'data-release-handoff-current-preview-structured-summary-copy="true"',
                                              buttonText: '현재 요약 복사',
                                              copiedText: '현재 요약 복사됨',
                                              successNotice: `${handoffPreviewArtifact.label || '현재 handoff summary'} overview line을 복사했습니다.`,
                                            })}
                                          </div>
                                        `
                                      : ''}
                                    ${handoffPreviewStructuredSummarySha
                                      ? `
                                          <div class="item-meta mono release-handoff-summary-sha" data-release-handoff-preview-structured-summary-sha="true">
                                            sha ${escapeHtml(handoffPreviewStructuredSummarySha)}
                                          </div>
                                        `
                                      : ''}
                                  </div>
                                `
                              : ''}
                            ${handoffPreviewStatus === 'loading'
                              ? `
                                  <div class="release-handoff-preview-body release-handoff-preview-loading" data-release-handoff-preview-body>
                                    선택한 artifact를 불러오는 중입니다.
                                  </div>
                                `
                              : handoffPreviewStatus === 'error'
                                ? `
                                    <div class="release-stale-note">
                                      <div class="release-stale-line" data-release-handoff-preview-body>${escapeHtml(handoffPreviewError || 'artifact preview를 불러오지 못했습니다.')}</div>
                                    </div>
                                  `
                                : String(handoffPreviewArtifact.format || '').trim().toLowerCase() === 'markdown'
                                  ? `
                                      <div class="release-handoff-preview-body markdown-surface" data-release-handoff-preview-body>
                                        ${markdownToHtml(handoffPreviewContent || '미리볼 내용이 없습니다.')}
                                      </div>
                                    `
                                  : `
                                      <pre class="release-handoff-preview-code" data-release-handoff-preview-body>${escapeHtml(handoffPreviewContent || '미리볼 내용이 없습니다.')}</pre>
                                    `}
                            ${handoffPreviewStatus === 'ready' && handoffPreviewTruncated
                              ? `
                                  <div class="item-meta" data-release-handoff-preview-note>
                                    총 ${escapeHtml(String(handoffPreviewLineCount))}줄 중 앞부분만 표시했습니다. 전체 내용은 열기 링크로 확인하세요.
                                  </div>
                                `
                              : ''}
                          </section>
                        `
                      : ''}
                  </article>
                `
              : ''}
            <div class="release-doc-grid">
              <article class="release-doc-surface markdown-surface" data-release-doc-kind="closeout">
                <div class="release-doc-head">
                  <strong>closeout</strong>
                  <span class="item-meta mono">${escapeHtml(closeout.path || '-')}</span>
                </div>
                ${markdownToHtml(closeout.markdown || '문서가 없습니다.')}
              </article>
              <article class="release-doc-surface markdown-surface" data-release-doc-kind="evidence">
                <div class="release-doc-head">
                  <strong>evidence</strong>
                  <span class="item-meta mono">${escapeHtml(evidence.path || '-')}</span>
                </div>
                ${markdownToHtml(evidence.markdown || '문서가 없습니다.')}
              </article>
              <article class="release-doc-surface markdown-surface" data-release-doc-kind="handoff">
                <div class="release-doc-head">
                  <strong>handoff</strong>
                  <span class="item-meta mono">${escapeHtml(handoff.path || '-')}</span>
                </div>
                ${markdownToHtml(handoff.markdown || '문서가 없습니다.')}
              </article>
            </div>
          </div>
        </section>
      </div>
    </div>
  `;
  applyReleaseActionButtonLabels(elements.releaseStatus, {
    blockerFilterLabel,
    blockerProviderLabel,
    focusedBlockerLabel,
    releaseActionLabel,
  });
  wireQuickActions(elements.releaseStatus);
  wireReleaseStatusActionButtons();
}

function wireReleaseStatusActionButtons() {
  elements.releaseStatus.querySelectorAll('[data-ui-action="run-release-preflight"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const provider = String(button.dataset.uiProvider || '').trim();
      if (!provider) {
        return;
      }
      await runReleasePreflight(provider);
    });
  });
  elements.releaseStatus.querySelectorAll('[data-ui-action="run-release-preflight-all"]').forEach((button) => {
    button.addEventListener('click', async () => {
      await runReleasePreflightAll();
    });
  });
  elements.releaseStatus.querySelectorAll('[data-ui-action="refresh-release-status-live"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const provider = String(button.dataset.uiProvider || '').trim();
      if (!provider) {
        return;
      }
      if (state.releaseLiveConfirmProvider === provider) {
        await refreshReleaseStatusWithOptions(provider, { confirmLiveValidation: true });
        return;
      }
      await armReleaseLiveConfirm(provider);
    });
  });
}

function wireDocumentRowActions() {
  if (!elements.harnessSource) {
    return;
  }

  wireDocumentMutationActionButtons();
  wireDocumentBrowsePaginationButtons();
}

function wireDocumentBrowsePaginationButtons() {
  elements.harnessSource.querySelector('#document-log-sort')?.addEventListener('change', async (event) => {
    try {
      state.harnessDocumentSort = String(event.target.value || 'latest').trim() || 'latest';
      state.harnessDocumentOffset = 0;
      await loadHarnessDocuments();
      renderHarnessPanel();
    } catch (error) {
      window.alert(error.message);
    }
  });

  elements.harnessSource.querySelector('#document-log-limit')?.addEventListener('change', async (event) => {
    try {
      state.harnessDocumentVisibleCount = Number(event.target.value || 12) || 12;
      state.harnessDocumentOffset = 0;
      await loadHarnessDocuments();
      renderHarnessPanel();
    } catch (error) {
      window.alert(error.message);
    }
  });

  elements.harnessSource.querySelectorAll('[data-document-action="reset-browse"]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        resetHarnessDocumentBrowseState();
        await loadHarnessDocuments();
        renderHarnessPanel();
      } catch (error) {
        window.alert(error.message);
      }
    });
  });

  elements.harnessSource.querySelectorAll('[data-document-action="prev-page"]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        state.harnessDocumentOffset = Math.max(
          Number(state.harnessDocumentOffset || 0) - Number(state.harnessDocumentVisibleCount || 12),
          0,
        );
        await loadHarnessDocuments();
        renderHarnessPanel();
      } catch (error) {
        window.alert(error.message);
      }
    });
  });

  elements.harnessSource.querySelectorAll('[data-document-action="next-page"]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        state.harnessDocumentOffset += Number(state.harnessDocumentVisibleCount || 12);
        await loadHarnessDocuments();
        renderHarnessPanel();
      } catch (error) {
        window.alert(error.message);
      }
    });
  });
}

function wireDocumentMutationActionButtons() {
  elements.harnessSource.querySelectorAll('[data-document-action="edit"]').forEach((button) => {
    button.addEventListener('click', () => {
      const entryId = String(button.dataset.documentId || '').trim();
      const entry = getHarnessDocumentEntry(entryId);
      if (!entry) {
        window.alert('문서 기록을 다시 불러오지 못했습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.');
        return;
      }
      populateDocumentLogForm(entry);
    });
  });

  elements.harnessSource.querySelectorAll('[data-document-action="delete"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const entryId = String(button.dataset.documentId || '').trim();
      try {
        await handleDocumentLogDelete(entryId);
      } catch (error) {
        window.alert(error.message);
      }
    });
  });

  elements.harnessSource.querySelectorAll('[data-document-action="migrate-legacy"]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await handleLegacyDocumentMigration();
      } catch (error) {
        window.alert(error.message);
      }
    });
  });
}

function wireMemoryRowActions() {
  if (!elements.harnessMemory) {
    return;
  }

  wireMemoryMutationActionButtons();
  wireMemoryBrowsePaginationButtons();
}

function wireMemoryBrowsePaginationButtons() {
  elements.harnessMemory.querySelector('#harness-memory-search')?.addEventListener('input', async (event) => {
    try {
      state.retrievalSourceFocusType = '';
      state.retrievalSourceFocusLabel = '';
      state.harnessMemoryQuery = String(event.target.value || '');
      state.harnessMemoryOffset = 0;
      await loadHarnessMemory();
      renderHarnessPanel();
      writeUiStateToUrl();
    } catch (error) {
      window.alert(error.message);
    }
  });

  elements.harnessMemory.querySelector('#harness-memory-scope-filter')?.addEventListener('change', async (event) => {
    try {
      state.retrievalSourceFocusType = '';
      state.retrievalSourceFocusLabel = '';
      state.harnessMemoryFilterScope = String(event.target.value || 'all');
      state.harnessMemoryOffset = 0;
      await loadHarnessMemory();
      renderHarnessPanel();
      writeUiStateToUrl();
    } catch (error) {
      window.alert(error.message);
    }
  });

  elements.harnessMemory.querySelector('#harness-memory-kind-filter')?.addEventListener('change', async (event) => {
    try {
      state.retrievalSourceFocusType = '';
      state.retrievalSourceFocusLabel = '';
      state.harnessMemoryFilterKind = String(event.target.value || 'all');
      state.harnessMemoryOffset = 0;
      await loadHarnessMemory();
      renderHarnessPanel();
      writeUiStateToUrl();
    } catch (error) {
      window.alert(error.message);
    }
  });

  elements.harnessMemory.querySelector('#harness-memory-limit')?.addEventListener('change', async (event) => {
    try {
      state.harnessMemoryVisibleCount = Number(event.target.value || 12) || 12;
      state.harnessMemoryOffset = 0;
      await loadHarnessMemory();
      renderHarnessPanel();
    } catch (error) {
      window.alert(error.message);
    }
  });

  elements.harnessMemory.querySelector('#harness-memory-sort')?.addEventListener('change', async (event) => {
    try {
      state.harnessMemorySort = String(event.target.value || 'latest').trim() || 'latest';
      state.harnessMemoryOffset = 0;
      await loadHarnessMemory();
      renderHarnessPanel();
    } catch (error) {
      window.alert(error.message);
    }
  });

  elements.harnessMemory.querySelectorAll('[data-memory-action="reset-browse"]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        resetHarnessMemoryBrowseState();
        await loadHarnessMemory();
        renderHarnessPanel();
        writeUiStateToUrl();
      } catch (error) {
        window.alert(error.message);
      }
    });
  });

  elements.harnessMemory.querySelectorAll('[data-memory-action="prev-page"]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        state.harnessMemoryOffset = Math.max(
          Number(state.harnessMemoryOffset || 0) - Number(state.harnessMemoryVisibleCount || 12),
          0,
        );
        await loadHarnessMemory();
        renderHarnessPanel();
      } catch (error) {
        window.alert(error.message);
      }
    });
  });

  elements.harnessMemory.querySelectorAll('[data-memory-action="next-page"]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        state.harnessMemoryOffset += Number(state.harnessMemoryVisibleCount || 12);
        await loadHarnessMemory();
        renderHarnessPanel();
      } catch (error) {
        window.alert(error.message);
      }
    });
  });
}

function wireMemoryMutationActionButtons() {
  elements.harnessMemory.querySelectorAll('[data-memory-action="edit"]').forEach((button) => {
    button.addEventListener('click', () => {
      const scope = String(button.dataset.memoryScope || 'mission').trim();
      const memoryId = String(button.dataset.memoryId || '').trim();
      const entry = getHarnessMemoryEntry(scope, memoryId);
      if (!entry) {
        window.alert('메모 항목을 다시 불러오지 못했습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.');
        return;
      }
      populateMemoryForm(scope, entry);
    });
  });

  elements.harnessMemory.querySelectorAll('[data-memory-action="delete"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const scope = String(button.dataset.memoryScope || 'mission').trim();
      const memoryId = String(button.dataset.memoryId || '').trim();
      try {
        await handleMemoryDelete(scope, memoryId);
      } catch (error) {
        window.alert(error.message);
      }
    });
  });
}

function resetHarnessFilterState() {
  state.harnessAttachmentFocus = '';
  state.retrievalSourceFocusLabel = '';
  state.retrievalSourceFocusType = '';
  state.harnessDocumentFilter = 'all';
  state.harnessDocumentOffset = 0;
  state.harnessDocumentQuery = '';
  state.harnessDocumentSort = 'latest';
  state.harnessDocumentVisibleCount = 12;
  state.harnessMemoryFilterKind = 'all';
  state.harnessMemoryFilterScope = 'all';
  state.harnessMemoryOffset = 0;
  state.harnessMemoryQuery = '';
  state.harnessMemorySort = 'latest';
  state.harnessMemoryVisibleCount = 12;
}

function resetHarnessDocumentBrowseState() {
  state.harnessDocumentFilter = 'all';
  state.harnessDocumentOffset = 0;
  state.harnessDocumentQuery = '';
  state.harnessDocumentSort = 'latest';
  state.harnessDocumentVisibleCount = 12;
}

export function resetHarnessMemoryBrowseState() {
  state.harnessAttachmentFocus = '';
  state.retrievalSourceFocusLabel = '';
  state.retrievalSourceFocusType = '';
  state.harnessMemoryFilterKind = 'all';
  state.harnessMemoryFilterScope = 'all';
  state.harnessMemoryOffset = 0;
  state.harnessMemoryQuery = '';
  state.harnessMemorySort = 'latest';
  state.harnessMemoryVisibleCount = 12;
}

function resetHarnessFilterInputs() {
  if (elements.documentLogSearch) {
    elements.documentLogSearch.value = '';
  }
  if (elements.documentLogFilter) {
    elements.documentLogFilter.value = 'all';
  }
}

function renderStageSummaries() {
  renderRunStageSummary();
  renderExecutionConsole();
  renderReviewStageSummary();
  renderOutputStageSummary();
  renderOutputCloseout();
}

function getArtifactLabel(artifact) {
  if (!artifact) {
    return '';
  }

  return artifact.title || artifact.fileName || getDisplayLabel(artifact.kind, artifact.kind);
}

function getReadinessItems() {
  if (!state.missionDetail) {
    return [];
  }

  const latestSession = state.missionDetail.summary?.latestSession || null;
  const pendingApprovalCount = state.approvals.filter((item) => item.missionId === state.selectedMissionId).length;
  const pendingActionCount = Number(state.missionActions?.summary?.pendingActionCount || 0);
  const hasArtifact =
    Boolean(state.selectedArtifactId) ||
    Boolean(latestSession?.latestArtifactFileName) ||
    Boolean(state.currentSessionPayload?.artifacts?.length);

  return [
    {
      detail: '미션 프레임과 목표가 정해져 있습니다.',
      label: '미션 선택 완료',
      state: state.selectedMissionId ? 'ready' : 'blocked',
    },
    {
      detail: latestSession ? `${latestSession.provider || '제공자 미정'} · ${latestSession.status || '-'}` : '아직 실행된 세션이 없습니다.',
      label: '최근 세션 존재',
      state: latestSession ? 'ready' : 'blocked',
    },
    {
      detail: latestSession?.reviewerSummary || '리뷰어 요약이 아직 없습니다.',
      label: '리뷰어 신호 확보',
      state: latestSession?.reviewerSummary ? 'ready' : 'blocked',
    },
    {
      detail: pendingApprovalCount > 0 ? `승인 ${pendingApprovalCount}건 대기` : '승인 대기 없음',
      label: '승인 대기 정리',
      state: pendingApprovalCount === 0 ? 'ready' : 'blocked',
    },
    {
      detail: pendingActionCount > 0 ? `후속 액션 ${pendingActionCount}건 열림` : '후속 액션 없음',
      label: '후속 작업 정리',
      state: pendingActionCount === 0 ? 'ready' : 'blocked',
    },
    {
      detail: hasArtifact ? '확인 가능한 산출물이 준비되었습니다.' : '아직 확인 가능한 산출물이 없습니다.',
      label: '산출물 확인 가능',
      state: hasArtifact ? 'ready' : 'blocked',
    },
  ];
}

function renderReviewReadinessEmptyState() {
  return emptyStateCard({
    action: 'jump-step',
    actionLabel: '1단계로 이동',
    actionValue: 'step-setup',
    icon: 'RV',
    message: '미션을 고르면 승인, 후속 요청, 산출물 기준으로 준비 상태를 자동 계산합니다.',
    title: '리뷰 준비 상태를 계산할 미션이 없습니다',
  });
}

function renderReviewReadiness() {
  if (!state.missionDetail) {
    const empty = renderReviewReadinessEmptyState();
    elements.reviewReadiness.innerHTML = empty;
    if (elements.reviewReadinessDetail) {
      elements.reviewReadinessDetail.innerHTML = empty;
    }
    wireQuickActions(elements.reviewReadiness);
    if (elements.reviewReadinessDetail) {
      wireQuickActions(elements.reviewReadinessDetail);
    }
    return;
  }

  const readinessItems = getReadinessItems();
  const content = readinessItems
    .map(
      (item) => `
        <article class="readiness-item readiness-${escapeHtml(item.state)}">
          <div class="status-row">
            <span class="status-badge ${item.state === 'ready' ? 'status-completed' : 'status-failed'}">${escapeHtml(
              item.state === 'ready' ? '준비됨' : '막힘',
            )}</span>
          </div>
          <div class="item-title">${escapeHtml(item.label)}</div>
          <div class="item-meta">${escapeHtml(item.detail)}</div>
        </article>
      `,
    )
    .join('');
  elements.reviewReadiness.innerHTML = content;
  if (elements.reviewReadinessDetail) {
    elements.reviewReadinessDetail.innerHTML = content;
  }
}

function inferProviderFromCommand(command = '') {
  return inferCommandOption(command, '--provider');
}

async function copyLearningPromotionAuditPackage(item) {
  const packageText = buildLearningPromotionAuditPackageText(item);
  if (!packageText) {
    setUiNotice('복사할 learning promotion audit package가 없습니다.');
    return;
  }

  await copyPlainTextValue(packageText, {
    promptMessage: 'learning promotion audit package를 복사하세요.',
    shownNotice: 'learning promotion audit package를 표시했습니다.',
    successNotice: 'learning promotion audit package를 복사했습니다.',
  });
}

function getMissionActionsFilterLabel(filter = state.missionActionsFilter) {
  if (filter === 'needs-reminder') {
    return '재알림 필요';
  }
  if (filter === 'overdue') {
    return '기한 초과';
  }
  return '전체';
}

function applyMissionActionsFilterUrlState({ actionInboxFilter = 'all', actionInboxFallbackStopReason = '' } = {}) {
  state.missionActionsFilter = getSanitizedMissionActionsFilter(actionInboxFilter);
  state.missionActionsFallbackStopReasonFilter = normalizeUiParam(actionInboxFallbackStopReason);
}

async function copyMissionActionsViewLink() {
  if (!state.selectedMissionId) {
    setUiNotice('복사할 action inbox 링크가 없습니다.');
    return;
  }
  const actionInboxUrl = `${window.location.origin}${buildUiStateUrl({
    detailTab: 'reviews',
    stepId: 'step-review',
  })}`;
  await copyUiLink(actionInboxUrl, {
    promptMessage: '현재 action inbox 링크를 복사하세요.',
    shownNotice: '현재 action inbox 링크를 표시했습니다.',
    successNotice: '현재 action inbox 링크를 복사했습니다.',
  });
}

function getMissionActionsVisibleFilterLabel() {
  const filter = state.missionActionsFilter || 'all';
  const baseLabel = getMissionActionsFilterLabel(filter);
  const fallbackStopReasonFilter = String(state.missionActionsFallbackStopReasonFilter || '').trim();
  if (!fallbackStopReasonFilter) {
    return baseLabel;
  }
  const fallbackStopLabel = `fallback stop ${fallbackStopReasonFilter}`;
  return filter === 'all' ? fallbackStopLabel : `${baseLabel} · ${fallbackStopLabel}`;
}

function hasActiveMissionActionsFilter() {
  return (
    (state.missionActionsFilter || 'all') !== 'all' ||
    Boolean(String(state.missionActionsFallbackStopReasonFilter || '').trim())
  );
}

function renderMissionActionsFilterButton(filter, label, count) {
  const active = (state.missionActionsFilter || 'all') === filter;
  const countLabel = String(count ?? 0);
  const filterButtonTitle = `${label} action 필터, ${countLabel}건, ${active ? '선택됨' : '선택 안 됨'}`;
  return `<button class="${active ? 'primary-button' : 'ghost-button'}" type="button" data-action-inbox-filter="${escapeHtml(filter)}" aria-label="${escapeHtml(filterButtonTitle)}" aria-pressed="${active ? 'true' : 'false'}" title="${escapeHtml(filterButtonTitle)}">${escapeHtml(label)} ${escapeHtml(countLabel)}</button>`;
}

function renderActionInboxCopyLinkButton({
  buttonText = '현재 action 링크 복사',
  className = 'ghost-button',
  hasSelectedMission = Boolean(state.selectedMissionId),
} = {}) {
  const copyLinkTitle = hasSelectedMission
    ? '현재 action inbox 링크 복사'
    : '선택된 mission이 없어 action inbox 링크를 복사할 수 없습니다';
  return `<button class="${escapeHtml(className)}" type="button" data-action-inbox-copy-link="true" aria-disabled="${hasSelectedMission ? 'false' : 'true'}" aria-label="${escapeHtml(copyLinkTitle)}" title="${escapeHtml(copyLinkTitle)}" ${hasSelectedMission ? '' : 'disabled'}>${escapeHtml(buttonText)}</button>`;
}

function renderActionInboxFallbackStopResetButton({
  buttonText = 'stop 필터 초기화',
  className = 'ghost-button',
  hasFallbackStopReason = Boolean(String(state.missionActionsFallbackStopReasonFilter || '').trim()),
} = {}) {
  const resetTitle = hasFallbackStopReason
    ? 'fallback stop 필터 초기화'
    : '초기화할 fallback stop 필터가 없습니다';
  return `<button class="${escapeHtml(className)}" type="button" data-action-inbox-fallback-stop-reset="true" aria-disabled="${hasFallbackStopReason ? 'false' : 'true'}" aria-label="${escapeHtml(resetTitle)}" title="${escapeHtml(resetTitle)}" ${hasFallbackStopReason ? '' : 'disabled'}>${escapeHtml(buttonText)}</button>`;
}

function renderActionInboxClearFiltersButton({
  buttonText = '필터 전체 초기화',
  className = 'ghost-button',
  hasActiveFilter = hasActiveMissionActionsFilter(),
} = {}) {
  const clearFiltersTitle = hasActiveFilter
    ? 'action inbox 필터 전체 초기화'
    : '초기화할 action inbox 필터가 없습니다';
  return `<button class="${escapeHtml(className)}" type="button" data-action-inbox-clear-filters="true" aria-disabled="${hasActiveFilter ? 'false' : 'true'}" aria-label="${escapeHtml(clearFiltersTitle)}" title="${escapeHtml(clearFiltersTitle)}" ${hasActiveFilter ? '' : 'disabled'}>${escapeHtml(buttonText)}</button>`;
}

function getMissionActionsFallbackStopReasonCounts(payload = state.missionActions) {
  return (payload?.items || []).reduce((counts, item) => {
    Object.entries(item.providerFallbackStopReasonCounts || {}).forEach(([reason, count]) => {
      const normalizedReason = String(reason || '').trim();
      if (!normalizedReason) {
        return;
      }
      counts[normalizedReason] = (counts[normalizedReason] || 0) + Number(count || 0);
    });
    return counts;
  }, {});
}

function renderMissionActionsFallbackStopReasonOptions() {
  const counts = getMissionActionsFallbackStopReasonCounts(state.missionActions);
  const activeReason = String(state.missionActionsFallbackStopReasonFilter || '').trim();
  if (activeReason && counts[activeReason] === undefined) {
    counts[activeReason] = 0;
  }
  return Object.entries(counts)
    .sort(([leftReason, leftCount], [rightReason, rightCount]) =>
      Number(rightCount || 0) - Number(leftCount || 0) || leftReason.localeCompare(rightReason),
    )
    .map(
      ([reason, count]) =>
        `<option value="${escapeHtml(reason)}">${escapeHtml(reason)} (${escapeHtml(String(count))})</option>`,
    )
    .join('');
}

function renderActionInboxSummary({
  fallbackStopReasonFilter = '',
  fallbackStopReasonOptions = '',
  fallbackStopReasonPlaceholder = 'fallback stop 없음',
  fullSummary = {},
  hasActiveFilter = false,
  hasFallbackStopReasonOptions = false,
  hasSelectedMission = false,
  summary = {},
} = {}) {
  return `
    ${renderActionInboxSummaryChip('전체 작업', fullSummary.pendingActionCount)}
    ${renderActionInboxSummaryChip('표시 작업', summary.pendingActionCount)}
    ${renderActionInboxSummaryChip('재알림 필요', fullSummary.reminderCounts?.needsReminder)}
    ${renderActionInboxSummaryChip('기한 초과', fullSummary.overdueCounts?.overdue)}
    ${renderActionInboxSummaryChip('fallback stop', fallbackStopReasonFilter || 'all')}
    <div class="action-row action-filter-row">
      ${renderMissionActionsFilterButton('all', '전체', fullSummary.pendingActionCount)}
      ${renderMissionActionsFilterButton('needs-reminder', '재알림 필요', fullSummary.reminderCounts?.needsReminder)}
      ${renderMissionActionsFilterButton('overdue', '기한 초과', fullSummary.overdueCounts?.overdue)}
      ${renderActionInboxFallbackStopFilterSelect({
        hasFallbackStopReasonOptions,
        options: fallbackStopReasonOptions,
        placeholder: fallbackStopReasonPlaceholder,
      })}
      ${renderActionInboxFallbackStopResetButton({ hasFallbackStopReason: Boolean(fallbackStopReasonFilter) })}
      ${renderActionInboxClearFiltersButton({ hasActiveFilter })}
      ${renderActionInboxCopyLinkButton({ hasSelectedMission })}
    </div>
  `;
}

function wireMissionActionsFilterControls() {
  elements.actionSummary.querySelectorAll('[data-action-inbox-filter]').forEach((button) => {
    button.addEventListener('click', async () => {
      const nextFilter = button.dataset.actionInboxFilter || 'all';
      if (state.missionActionsFilter === nextFilter) {
        return;
      }
      state.missionActionsFilter = nextFilter;
      await loadMissionActions(state.selectedMissionId);
      renderMissionActions();
      writeUiStateToUrl();
    });
  });
  elements.actionSummary.querySelector('[data-action-inbox-fallback-stop-filter]')?.addEventListener('change', async (event) => {
    const nextFilter = String(event.target.value || '').trim();
    if (state.missionActionsFallbackStopReasonFilter === nextFilter) {
      return;
    }
    state.missionActionsFallbackStopReasonFilter = nextFilter;
    await loadMissionActions(state.selectedMissionId);
    renderMissionActions();
    writeUiStateToUrl();
  });
  elements.actionSummary.querySelector('[data-action-inbox-fallback-stop-reset]')?.addEventListener('click', async () => {
    if (!state.missionActionsFallbackStopReasonFilter) {
      return;
    }
    state.missionActionsFallbackStopReasonFilter = '';
    await loadMissionActions(state.selectedMissionId);
    renderMissionActions();
    writeUiStateToUrl();
  });
  elements.actionSummary.querySelector('[data-action-inbox-clear-filters]')?.addEventListener('click', async () => {
    if ((state.missionActionsFilter || 'all') === 'all' && !state.missionActionsFallbackStopReasonFilter) {
      return;
    }
    state.missionActionsFilter = 'all';
    state.missionActionsFallbackStopReasonFilter = '';
    await loadMissionActions(state.selectedMissionId);
    renderMissionActions();
    writeUiStateToUrl();
  });
  elements.actionSummary.querySelector('[data-action-inbox-copy-link]')?.addEventListener('click', () => {
    void copyMissionActionsViewLink();
  });
}

function wireActionInboxOpenButtons() {
  elements.actionList.querySelectorAll('[data-action-open]').forEach((button) => {
    button.addEventListener('click', async () => {
      await selectMission(button.dataset.actionOpen, {
        preferredDetailTab: 'reviews',
        preferredStep: 'step-review',
        urlMode: 'push',
      });
    });
  });
}

function wireActionInboxRerunButtons(items = []) {
  elements.actionList.querySelectorAll('[data-action-rerun]').forEach((button) => {
    button.addEventListener('click', async () => {
      const item = items.find((entry) => entry.actionId === button.dataset.actionRerun);
      if (!item?.missionId) {
        return;
      }
      const provider = inferProviderFromCommand(item.recommendedCommand || item.commandHint || '');
      const confirmed = window.confirm(
        provider
          ? `이 미션을 ${provider} 제공자로 다시 실행할까요?`
          : '이 미션을 현재 기본 제공자 정책으로 다시 실행할까요?',
      );
      if (!confirmed) {
        return;
      }

      await api(`/api/missions/${encodeURIComponent(item.missionId)}/run`, {
        body: JSON.stringify({ provider }),
        method: 'POST',
      });

      await Promise.all([loadMissions(), loadApprovals()]);
      if (state.selectedMissionId === item.missionId) {
        await selectMission(item.missionId, { urlMode: 'replace' });
      }
    });
  });
}

function wireActionInboxProviderAttentionButtons(items = []) {
  elements.actionList.querySelectorAll('[data-provider-attention-remediate]').forEach((button) => {
    button.addEventListener('click', async () => {
      const actionId = button.dataset.providerAttentionRemediate;
      const mode = button.dataset.providerAttentionMode || 'primary';
      const item = items.find((entry) => entry.actionId === actionId);
      if (!item) {
        return;
      }

      const payload = getProviderAttentionRemediationPayload(item, mode);
      if (mode !== 'primary' && !payload.fallbackProvider) {
        window.alert('fallback provider를 찾을 수 없습니다.');
        return;
      }

      const confirmed = window.confirm(
        mode === 'recoverable-fallback'
          ? `${item.providerDisplayName || item.providerId || 'provider'} failure가 recoverable일 때만 fallback 복구를 실행할까요?`
          : mode === 'fallback'
            ? `${payload.fallbackProvider} fallback provider로 provider attention 복구를 실행할까요?`
            : `${item.providerDisplayName || item.providerId || 'provider'} remediation을 실행할까요?`,
      );
      if (!confirmed) {
        return;
      }

      await api(`/api/actions/provider-attention/${encodeURIComponent(actionId)}/remediate`, {
        body: JSON.stringify(payload),
        method: 'POST',
      });

      await Promise.all([loadMissions(), loadApprovals()]);
      if (state.selectedMissionId) {
        await refreshSelectedMissionContext({ preserveHarnessBrowse: true });
      }
    });
  });
}

function wireActionInboxSpecialistFollowUpButtons(items = []) {
  elements.actionList.querySelectorAll('[data-specialist-follow-up-remediate]').forEach((button) => {
    button.addEventListener('click', async () => {
      const actionId = button.dataset.specialistFollowUpRemediate;
      const item = items.find((entry) => entry.actionId === actionId);
      if (!item) {
        return;
      }

      const specialistLabel = item.specialistKind ? `${item.specialistKind} specialist` : 'specialist';
      const confirmed = window.confirm(`${specialistLabel} follow-up remediation을 실행할까요?`);
      if (!confirmed) {
        return;
      }

      await api(`/api/actions/specialist-follow-ups/${encodeURIComponent(actionId)}/remediate`, {
        method: 'POST',
      });

      await Promise.all([loadMissions(), loadApprovals()]);
      if (state.selectedMissionId) {
        await refreshSelectedMissionContext({ preserveHarnessBrowse: true });
      }
    });
  });
}

function wireActionInboxLearningPromotionResolveButtons(items = []) {
  elements.actionList.querySelectorAll('[data-learning-promotion-resolve]').forEach((button) => {
    button.addEventListener('click', async () => {
      const candidateId = button.dataset.learningPromotionResolve;
      const decision = button.dataset.learningPromotionDecision || 'approve';
      const item = items.find((entry) => getLearningPromotionCandidateId(entry) === candidateId);
      if (!item) {
        return;
      }

      const note = window.prompt(
        decision === 'approve' ? '학습 승인 메모를 입력하세요.' : '학습 반려 메모를 입력하세요.',
        decision === 'approve' ? 'UI에서 검토 후 scoped learning promotion 승인' : 'UI에서 검토 후 learning promotion 반려',
      );
      if (!note) {
        return;
      }

      await api(`/api/actions/learning-promotions/${encodeURIComponent(candidateId)}/resolve`, {
        body: JSON.stringify({
          decision,
          note,
          scope: item.scope || 'mission',
          target: item.proposalTarget || 'memory',
        }),
        method: 'POST',
      });

      await Promise.all([loadMissions(), loadApprovals()]);
      if (state.selectedMissionId) {
        await refreshSelectedMissionContext({ preserveHarnessBrowse: true });
      }
    });
  });
}

function wireActionInboxLearningPromotionAuditCopyButtons(items = []) {
  elements.actionList.querySelectorAll('[data-learning-promotion-audit-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const candidateId = button.dataset.learningPromotionAuditCopy;
      const item = items.find((entry) => getLearningPromotionCandidateId(entry) === candidateId);
      await copyLearningPromotionAuditPackage(item);
    });
  });
}

function wireActionInboxLearningPromotionExpireButtons(items = []) {
  elements.actionList.querySelectorAll('[data-learning-promotion-expire]').forEach((button) => {
    button.addEventListener('click', async () => {
      const candidateId = button.dataset.learningPromotionExpire;
      const item = items.find((entry) => getLearningPromotionCandidateId(entry) === candidateId);
      if (!item) {
        return;
      }

      const confirmed = window.confirm('이 pending learning promotion을 만료 처리할까요?');
      if (!confirmed) {
        return;
      }

      const note = window.prompt('만료 메모를 입력하세요.', 'UI에서 pending learning promotion 만료');
      if (!note) {
        return;
      }

      await api('/api/actions/learning-promotions/expire', {
        body: JSON.stringify({
          before: item.expirationPolicy?.expiresAt || new Date().toISOString(),
          missionId: item.missionId || '',
          note,
          recordType: item.recordType || '',
          scope: item.scope || '',
          target: item.proposalTarget || '',
          workspaceId: item.workspaceId || '',
        }),
        method: 'POST',
      });

      await Promise.all([loadMissions(), loadApprovals()]);
      if (state.selectedMissionId) {
        await refreshSelectedMissionContext({ preserveHarnessBrowse: true });
      }
    });
  });
}

function wireActionInboxLearningPromotionRollbackButtons(items = []) {
  elements.actionList.querySelectorAll('[data-learning-promotion-rollback]').forEach((button) => {
    button.addEventListener('click', async () => {
      const candidateId = button.dataset.learningPromotionRollback;
      const item = items.find((entry) => getLearningPromotionCandidateId(entry) === candidateId);
      if (!item) {
        return;
      }

      const note = window.prompt('rollback 메모를 입력하세요.', 'UI에서 promoted learning candidate rollback');
      if (!note) {
        return;
      }

      await api(`/api/actions/learning-promotions/${encodeURIComponent(candidateId)}/rollback`, {
        body: JSON.stringify({ note }),
        method: 'POST',
      });

      await Promise.all([loadMissions(), loadApprovals()]);
      if (state.selectedMissionId) {
        await refreshSelectedMissionContext({ preserveHarnessBrowse: true });
      }
    });
  });
}

function wireActionInboxLearningPromotionRemindButtons(items = []) {
  elements.actionList.querySelectorAll('[data-learning-promotion-remind]').forEach((button) => {
    button.addEventListener('click', async () => {
      const candidateId = button.dataset.learningPromotionRemind;
      const item = items.find((entry) => getLearningPromotionCandidateId(entry) === candidateId);
      if (!item) {
        return;
      }

      const note = window.prompt(
        'stop-condition 재알림 메모를 입력하세요.',
        'UI에서 blocked learning promotion stop-condition 후속 조치 재알림',
      );
      if (!note) {
        return;
      }

      await api(`/api/actions/learning-promotions/${encodeURIComponent(candidateId)}/remind`, {
        body: JSON.stringify({
          dueOnly: true,
          missionId: item.missionId || '',
          note,
          workspaceId: item.workspaceId || '',
        }),
        method: 'POST',
      });

      await Promise.all([loadMissions(), loadApprovals()]);
      if (state.selectedMissionId) {
        await refreshSelectedMissionContext({ preserveHarnessBrowse: true });
      }
    });
  });
}

function wireActionInboxReviewerFollowUpResolveButtons() {
  elements.actionList.querySelectorAll('[data-action-resolve]').forEach((button) => {
    button.addEventListener('click', async () => {
      const actionId = button.dataset.actionResolve;
      const kind = window.prompt(
        'resolution kind를 입력하세요. (rerun-fixed | superseded | scope-reduced | accepted-risk)',
        'rerun-fixed',
      );
      if (!kind) {
        return;
      }
      const note = window.prompt('해소 메모를 입력하세요.', 'UI에서 처리 완료');
      if (!note) {
        return;
      }
      await api(`/api/actions/reviewer-follow-ups/${encodeURIComponent(actionId)}/resolve`, {
        body: JSON.stringify({ kind, note }),
        method: 'POST',
      });
      if (state.selectedMissionId) {
        await selectMission(state.selectedMissionId, { urlMode: 'replace' });
      }
    });
  });
}

function wireApprovalOpenButtons() {
  elements.approvalList.querySelectorAll('[data-approval-open]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (button.dataset.approvalOpen) {
        await selectMission(button.dataset.approvalOpen, {
          preferredDetailTab: 'reviews',
          preferredStep: 'step-review',
          urlMode: 'push',
        });
      }
    });
  });
}

function wireApprovalApproveButtons() {
  elements.approvalList.querySelectorAll('[data-approval-approve]').forEach((button) => {
    button.addEventListener('click', async () => {
      const reason = window.prompt('승인 사유를 입력하세요.', 'UI에서 확인 후 승인');
      if (!reason) {
        return;
      }
      await resolveApproval(button.dataset.approvalApprove, 'approve', reason);
    });
  });
}

function wireApprovalRejectButtons() {
  elements.approvalList.querySelectorAll('[data-approval-reject]').forEach((button) => {
    button.addEventListener('click', async () => {
      const reason = window.prompt('반려 사유를 입력하세요.', '추가 수정 필요');
      if (!reason) {
        return;
      }
      await resolveApproval(button.dataset.approvalReject, 'reject', reason);
    });
  });
}

function wireSessionListSelectionButtons() {
  elements.sessionList.querySelectorAll('[data-session-id]').forEach((button) => {
    button.addEventListener('click', () => selectSession(button.dataset.sessionId, { urlMode: 'push' }));
  });
}

function wireSessionArtifactSelectionButtons() {
  elements.sessionDetail.querySelectorAll('[data-artifact-id]').forEach((button) => {
    button.addEventListener('click', () => loadArtifact(button.dataset.artifactId, { urlMode: 'push' }));
  });
}

function wireTimelineSessionSelectionButtons() {
  elements.timelineList.querySelectorAll('[data-session-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      await selectSession(button.dataset.sessionId, { urlMode: 'push' });
      setActiveStep('step-output', { syncDetailTab: false, syncUrl: false });
      setActiveDetailTab('artifacts', { urlMode: 'push' });
    });
  });
}

function renderMissionActions() {
  if (!state.missionActions) {
    const unavailableState = renderActionInboxUnavailableState();
    elements.actionSummary.innerHTML = unavailableState.summaryHtml;
    elements.actionList.innerHTML = unavailableState.listHtml;
    wireQuickActions(elements.actionList);
    return;
  }

  const visibleActions = getVisibleMissionActionsPayload() || state.missionActions;
  const summary = visibleActions.summary || {};
  const fullSummary = state.missionActions.summary || summary;
  const fallbackStopReasonFilter = String(state.missionActionsFallbackStopReasonFilter || '').trim();
  const fallbackStopReasonOptions = renderMissionActionsFallbackStopReasonOptions();
  const hasFallbackStopReasonOptions = Boolean(fallbackStopReasonOptions.trim());
  const fallbackStopReasonPlaceholder = hasFallbackStopReasonOptions ? 'fallback stop 전체' : 'fallback stop 없음';
  const visibleFilterLabel = getMissionActionsVisibleFilterLabel();
  const hasActiveFilter = hasActiveMissionActionsFilter();
  const hasSelectedMission = Boolean(state.selectedMissionId);
  elements.actionSummary.innerHTML = renderActionInboxSummary({
    fallbackStopReasonFilter,
    fallbackStopReasonOptions,
    fallbackStopReasonPlaceholder,
    fullSummary,
    hasActiveFilter,
    hasFallbackStopReasonOptions,
    hasSelectedMission,
    summary,
  });
  const fallbackStopSelect = elements.actionSummary.querySelector('[data-action-inbox-fallback-stop-filter]');
  if (fallbackStopSelect) {
    fallbackStopSelect.value = fallbackStopReasonFilter;
  }
  wireMissionActionsFilterControls();

  const items = visibleActions.items || [];
  if (!items.length) {
    elements.actionList.innerHTML = renderActionInboxEmptyList({
      hasActiveFilter,
      visibleFilterLabel,
    });
    return;
  }

  elements.actionList.innerHTML = renderActionInboxList({
    hasActiveFilter,
    items,
    visibleFilterLabel,
  });

  wireActionInboxOpenButtons();
  wireActionInboxRerunButtons(items);
  wireActionInboxProviderAttentionButtons(items);
  wireActionInboxSpecialistFollowUpButtons(items);
  wireActionInboxLearningPromotionResolveButtons(items);
  wireActionInboxLearningPromotionAuditCopyButtons(items);
  wireActionInboxLearningPromotionExpireButtons(items);
  wireActionInboxLearningPromotionRollbackButtons(items);
  wireActionInboxLearningPromotionRemindButtons(items);
  wireActionInboxReviewerFollowUpResolveButtons();
}

function renderApprovalListEmptyState() {
  return emptyStateCard({
    icon: 'AP',
    message: '지금은 사람이 결정해야 할 승인 항목이 없습니다. 새로운 실행이 생기면 이 패널에 바로 나타납니다.',
    title: '승인 대기 항목이 없습니다',
  });
}

function renderApprovals() {
  const items = state.approvals || [];
  if (!items.length) {
    elements.approvalList.innerHTML = renderApprovalListEmptyState();
    return;
  }

  const callout = `
    <div class="review-callout review-callout-approval">
      <strong>사람의 승인 ${escapeHtml(String(items.length))}건이 남아 있습니다</strong>
      <p>이 항목을 먼저 처리해야 현재 미션을 결과 확정 단계로 넘길 수 있습니다.</p>
    </div>
  `;

  elements.approvalList.innerHTML = `${callout}${items
    .map(
      (item) => `
        <div class="approval-item">
          <div class="status-row">
            <span class="status-badge ${getStatusClass(item.missionStatus || 'pending')}">${escapeHtml(getDisplayLabel(item.missionStatus, item.missionStatus || 'pending'))}</span>
            <span class="mini-badge ${getStatusClass(item.priority || 'medium')}">${escapeHtml(getDisplayLabel(item.priority, item.priority || 'medium'))}</span>
          </div>
          <div class="item-title">${escapeHtml(item.title || item.approvalId)}</div>
          <div class="item-subtitle">${escapeHtml(item.missionTitle || item.missionId || '')}</div>
          <div class="item-meta">${escapeHtml(item.reason || '')}</div>
          <div class="action-row">
            ${renderApprovalActionButton({
              actionLabelPrefix: '미션 열기',
              actionLabelValue: item.missionTitle || item.title || item.missionId || item.approvalId,
              buttonText: '미션 열기',
              className: 'secondary-button',
              dataAttribute: 'data-approval-open',
              dataValue: item.missionId || '',
            })}
            ${renderApprovalActionButton({
              actionLabelPrefix: '승인',
              actionLabelValue: item.title || item.approvalId || item.missionId,
              buttonText: '승인',
              className: 'primary-button',
              dataAttribute: 'data-approval-approve',
              dataValue: item.approvalId,
            })}
            ${renderApprovalActionButton({
              actionLabelPrefix: '반려',
              actionLabelValue: item.title || item.approvalId || item.missionId,
              buttonText: '반려',
              dataAttribute: 'data-approval-reject',
              dataValue: item.approvalId,
            })}
          </div>
        </div>
      `,
    )
    .join('')}`;

  wireApprovalOpenButtons();
  wireApprovalApproveButtons();
  wireApprovalRejectButtons();
}

function renderSessionListEmptyState() {
  return emptyStateCard({
    action: 'open-create',
    actionLabel: '미션 작성 열기',
    icon: 'SE',
    message: '실행을 시작하면 세션 이력이 시간순으로 쌓이고, 여기서 각 세션으로 바로 들어갈 수 있습니다.',
    title: '아직 세션이 없습니다',
  });
}

function renderSessionListState(sessions = []) {
  return sessions
    .slice()
    .reverse()
    .map((session) => {
      const active = session.id === state.selectedSessionId ? 'is-active' : '';
      const providerUiLabel = getDisplayLabel(session.provider || '미정', session.provider || '미정');
      const sessionTitle = `${formatDate(session.startedAt)} 실행`;
      const sessionSelectionLabel = active
        ? `현재 세션 선택됨: ${sessionTitle} · ${providerUiLabel}`
        : `세션 선택: ${sessionTitle} · ${providerUiLabel}`;
      const sessionButtonContent = `
        <div class="status-row">
          <span class="status-badge ${getStatusClass(session.status)}">${escapeHtml(getDisplayLabel(session.status))}</span>
          <span class="mini-badge ${getStatusClass(session.provider || '')}">${escapeHtml(providerUiLabel)}</span>
        </div>
        <div class="item-title">${escapeHtml(formatDate(session.startedAt))} 실행</div>
        <div class="item-meta">
          단계 ${escapeHtml(getDisplayLabel(session.currentStage))} · 실행 ${escapeHtml(
            String(session.agentRunCount || 0),
          )}회
        </div>
        <div class="item-meta mono">${escapeHtml(session.id)}</div>
      `;
      return `
        <div class="session-row ${active}">
          ${renderSelectableDetailButton({
            active: Boolean(active),
            content: sessionButtonContent,
            dataAttribute: 'data-session-id',
            dataValue: session.id,
            selectionLabel: sessionSelectionLabel,
          })}
        </div>
      `;
    })
    .join('');
}

function renderSessionList() {
  const sessions = state.missionDetail?.sessions || [];
  if (!sessions.length) {
    elements.sessionList.innerHTML = renderSessionListEmptyState();
    wireQuickActions(elements.sessionList);
    return;
  }

  elements.sessionList.innerHTML = renderSessionListState(sessions);

  wireSessionListSelectionButtons();
}

function renderSessionDetailEmptyState() {
  return emptyStateCard({
    action: 'jump-step',
    actionLabel: '세션 섹션 보기',
    actionValue: 'step-output',
    icon: 'IN',
    message: '세션을 선택하면 실행 이력, 승인 이력, 산출물이 이 상세 영역에 정리됩니다.',
    title: '현재 선택된 세션이 없습니다',
  });
}

function renderSessionDetailRunListEmptyState() {
  return '<p class="empty-state">실행 정보가 없습니다.</p>';
}

function renderSessionDetailApprovalListEmptyState() {
  return '<p class="empty-state">승인 이력이 없습니다.</p>';
}

function renderSessionDetailArtifactListEmptyState() {
  return '<p class="empty-state">산출물이 없습니다.</p>';
}

function renderSessionDetailState({
  approvalCount = 0,
  approvals = '',
  artifactCount = 0,
  artifacts = '',
  runCount = 0,
  runs = '',
} = {}) {
  return `
    <div class="inspector-stack">
      <div class="inspector-group">
        <h4>실행 이력 <span class="section-count">${escapeHtml(String(runCount))}</span></h4>
        ${runs || renderSessionDetailRunListEmptyState()}
      </div>
      <div class="inspector-group">
        <h4>승인 이력 <span class="section-count">${escapeHtml(String(approvalCount))}</span></h4>
        ${approvals || renderSessionDetailApprovalListEmptyState()}
      </div>
      <div class="inspector-group">
        <h4>산출물 목록 <span class="section-count">${escapeHtml(String(artifactCount))}</span></h4>
        ${artifacts || renderSessionDetailArtifactListEmptyState()}
      </div>
    </div>
  `;
}

function renderSessionDetailRunList(agentRuns = [], fallbackProvider = '-') {
  return agentRuns
    .slice()
    .reverse()
    .map(
      (run) => `
        <div class="inspector-block">
          <h3>${escapeHtml(getDisplayLabel(run.role || run.workflowRole || run.id, run.role || run.workflowRole || run.id))}</h3>
          <div class="item-meta">
            ${escapeHtml(getDisplayLabel(run.status))} · ${escapeHtml(run.providerId || fallbackProvider)} · ${formatDate(run.startedAt)}
          </div>
          <div class="item-meta">${escapeHtml(run.outputSummary || run.inputSummary || '')}</div>
        </div>
      `,
    )
    .join('');
}

function renderSessionDetailApprovalList(approvals = []) {
  return approvals
    .slice()
    .reverse()
    .map(
      (approval) => `
        <div class="inspector-block">
          <h3>${escapeHtml(approval.title || approval.id)}</h3>
          <div class="item-meta">${escapeHtml(getDisplayLabel(approval.status))} · ${formatDate(approval.createdAt)}</div>
          <div class="item-meta">${escapeHtml(approval.reason || '')}</div>
        </div>
      `,
    )
    .join('');
}

function renderSessionDetailArtifactList(artifacts = []) {
  return artifacts
    .slice()
    .reverse()
    .map((artifact) => {
      const active = artifact.id === state.selectedArtifactId ? 'is-active' : '';
      const artifactTitle = artifact.title || artifact.fileName || artifact.id;
      const artifactSelectionLabel = active
        ? `현재 산출물 선택됨: ${artifactTitle}`
        : `산출물 선택: ${artifactTitle}`;
      const artifactButtonContent = `
        <div class="status-row">
          <span class="mini-badge ${getStatusClass(artifact.kind || 'artifact')}">${escapeHtml(getDisplayLabel(artifact.kind, artifact.kind || 'artifact'))}</span>
        </div>
        <div class="item-title">${escapeHtml(artifact.title || artifact.fileName || artifact.id)}</div>
        <div class="item-meta">${escapeHtml(artifact.fileName || '')}</div>
      `;
      return `
        <div class="artifact-link ${active}">
          ${renderSelectableDetailButton({
            active: Boolean(active),
            content: artifactButtonContent,
            dataAttribute: 'data-artifact-id',
            dataValue: artifact.id,
            selectionLabel: artifactSelectionLabel,
          })}
        </div>
      `;
    })
    .join('');
}

function renderSessionDetail(sessionPayload) {
  if (!sessionPayload) {
    elements.sessionDetail.innerHTML = renderSessionDetailEmptyState();
    wireQuickActions(elements.sessionDetail);
    renderDetailTabLabels();
    renderDetailContextbar();
    return;
  }

  const runCount = (sessionPayload.agentRuns || []).length;
  const approvalCount = (sessionPayload.approvals || []).length;
  const artifactCount = (sessionPayload.artifacts || []).length;

  const runs = renderSessionDetailRunList(sessionPayload.agentRuns || [], sessionPayload.session?.provider || '-');

  const approvals = renderSessionDetailApprovalList(sessionPayload.approvals || []);

  const artifacts = renderSessionDetailArtifactList(sessionPayload.artifacts || []);

  elements.sessionDetail.innerHTML = renderSessionDetailState({
    approvalCount,
    approvals,
    artifactCount,
    artifacts,
    runCount,
    runs,
  });

  wireSessionArtifactSelectionButtons();
  renderDetailTabLabels();
  renderDetailContextbar();
}

function renderArtifactMetaState({
  artifactKind = 'artifact',
  artifactMetaToggleLabel = '',
  artifactPath = '',
  artifactTitle = '',
  outputArtifactMetaExpanded = false,
  outputFocus = false,
} = {}) {
  return outputFocus
    ? `
        <div class="artifact-meta-compact">
          <strong>${escapeHtml(artifactTitle)}</strong>
          <div class="artifact-meta-row artifact-meta-row-compact">
            <span class="mini-badge ${getStatusClass(artifactKind)}">${escapeHtml(getDisplayLabel(artifactKind, artifactKind))}</span>
            ${renderOutputToolbarToggleButton({
              action: 'toggle-output-artifact-meta',
              actionLabel: artifactMetaToggleLabel,
              buttonText: outputArtifactMetaExpanded ? '경로 닫기' : '경로',
              className: 'ghost-button artifact-meta-toggle',
              expanded: outputArtifactMetaExpanded,
            })}
          </div>
          ${
            outputArtifactMetaExpanded
              ? `<span class="artifact-meta-path mono">${escapeHtml(artifactPath)}</span>`
              : ''
          }
        </div>
      `
    : `
        <span class="detail-context-label">선택된 결과물</span>
        <strong>${escapeHtml(artifactTitle)}</strong>
        <div class="artifact-meta-row">
          <span class="mini-badge ${getStatusClass(artifactKind)}">${escapeHtml(getDisplayLabel(artifactKind, artifactKind))}</span>
          <div class="item-meta mono">${escapeHtml(artifactPath)}</div>
        </div>
      `;
}

function renderArtifactViewerEmptyState() {
  return emptyStateCard({
    action: 'jump-step',
    actionLabel: '세션 섹션으로 이동',
    actionValue: 'step-output',
    icon: 'AR',
    message: '세션 상세에서 산출물을 선택하면 이 영역에서 문서를 바로 읽을 수 있습니다.',
    title: '선택된 산출물이 없습니다',
  });
}

function renderArtifactViewerState(content = '') {
  return markdownToHtml(content || '');
}

function renderArtifact(payload) {
  if (!payload) {
    elements.artifactMeta.textContent = '아직 선택된 산출물이 없습니다.';
    elements.artifactViewer.innerHTML = renderArtifactViewerEmptyState();
    wireQuickActions(elements.artifactViewer);
    renderDetailContextbar();
    return;
  }

  const outputFocus = state.activeStep === 'step-output';
  const artifactTitle = payload.artifact.title || payload.artifact.fileName || payload.artifact.id;
  const artifactMetaToggleLabel = state.outputArtifactMetaExpanded
    ? `결과물 경로 닫기: ${artifactTitle}`
    : `결과물 경로 보기: ${artifactTitle}`;
  elements.artifactMeta.innerHTML = renderArtifactMetaState({
    artifactKind: payload.artifact.kind || 'artifact',
    artifactMetaToggleLabel,
    artifactPath: payload.path,
    artifactTitle,
    outputArtifactMetaExpanded: state.outputArtifactMetaExpanded,
    outputFocus,
  });
  wireQuickActions(elements.artifactMeta);
  elements.artifactViewer.innerHTML = renderArtifactViewerState(payload.content);
  renderDetailContextbar();
}

async function loadArtifact(artifactId, { activateTab = true, syncUrl = true, urlMode = 'replace' } = {}) {
  if (!artifactId) {
    return;
  }

  if (state.artifactsById.has(artifactId)) {
    state.selectedArtifactId = artifactId;
    state.outputArtifactMetaExpanded = false;
    renderArtifact(state.artifactsById.get(artifactId));
    renderSessionDetail(state.currentSessionPayload);
    if (activateTab) {
      setActiveStep('step-output', { syncDetailTab: false, syncUrl: false });
      setActiveDetailTab('artifacts', { syncUrl: false });
    }
    if (syncUrl) {
      writeUiStateToUrl({ historyMode: urlMode });
    }
    return;
  }

  const payload = await api(`/api/artifacts/${encodeURIComponent(artifactId)}`);
  state.artifactsById.set(artifactId, payload);
  state.selectedArtifactId = artifactId;
  state.outputArtifactMetaExpanded = false;
  renderArtifact(payload);
  renderSessionDetail(state.currentSessionPayload);
  if (activateTab) {
    setActiveStep('step-output', { syncDetailTab: false, syncUrl: false });
    setActiveDetailTab('artifacts', { syncUrl: false });
  }
  if (syncUrl) {
    writeUiStateToUrl({ historyMode: urlMode });
  }
}

function renderTimelineEmptyState() {
  return emptyStateCard({
    action: 'open-create',
    actionLabel: '새 미션 시작',
    icon: 'TL',
    message: '미션을 실행하면 제공자 실행, 리뷰어 판정, 승인, 유지보수 이벤트가 시간순으로 정리됩니다.',
    title: '표시할 타임라인이 없습니다',
  });
}

function renderTimelineState(timeline = []) {
  return timeline
    .slice()
    .reverse()
    .slice(0, 32)
    .map((item) => {
      const timelineEventTitle = `${getTimelineKindLabel(item.kind)} · ${formatDate(item.at)}`;
      const isActiveSessionEvent = Boolean(item.sessionId && item.sessionId === state.selectedSessionId);
      const timelineEventLabel = item.sessionId
        ? isActiveSessionEvent
          ? `현재 세션 타임라인 이벤트 선택됨: ${timelineEventTitle}`
          : `세션 타임라인 이벤트 열기: ${timelineEventTitle}`
        : `타임라인 이벤트 보기: ${timelineEventTitle}`;
      const timelineEventContent = `
        <div class="timeline-time">${escapeHtml(formatDate(item.at))}</div>
        <div class="timeline-kind">${escapeHtml(getTimelineKindLabel(item.kind))}</div>
        <div class="item-title">${escapeHtml(item.detail || '')}</div>
        <div class="item-meta">${escapeHtml(
          getDisplayLabel(
            item.providerId || item.providerDisplayName || item.status || item.role || '',
            item.providerId || item.providerDisplayName || item.status || item.role || '',
          ),
        )}</div>
      `;
      return `
        ${renderSelectableDetailButton({
          active: isActiveSessionEvent,
          className: `timeline-event ${isActiveSessionEvent ? 'is-active' : ''}`,
          content: timelineEventContent,
          dataAttribute: item.sessionId ? 'data-session-id' : '',
          dataValue: item.sessionId || '',
          selectionLabel: timelineEventLabel,
        })}
      `;
    })
    .join('');
}

function renderTimeline() {
  const timeline = state.missionTimeline?.timeline || [];
  if (!timeline.length) {
    elements.timelineList.innerHTML = renderTimelineEmptyState();
    wireQuickActions(elements.timelineList);
    return;
  }

  elements.timelineList.innerHTML = renderTimelineState(timeline);

  wireTimelineSessionSelectionButtons();
}

async function selectSession(
  sessionId,
  { focusRuns = true, preferredArtifactId = null, syncUrl = true, urlMode = 'replace' } = {},
) {
  if (!state.selectedMissionId || !sessionId) {
    return;
  }

  state.selectedSessionId = sessionId;
  if (focusRuns) {
    setActiveDetailTab('runs', { syncUrl: false });
  }
  renderSessionList();

  const payload = await api(
    `/api/missions/${encodeURIComponent(state.selectedMissionId)}/session?sessionId=${encodeURIComponent(sessionId)}`,
  );
  state.currentSessionPayload = payload;
  renderSelectionBridge();
  renderSessionDetail(payload);

  const latestDeliverable = (payload.artifacts || [])
    .slice()
    .reverse()
    .find((artifact) =>
      ['deliverable', 'execution-handoff', 'approval-resolution'].includes(artifact.kind),
    );

  const sessionArtifacts = payload.artifacts || [];
  const targetArtifactId =
    preferredArtifactId && sessionArtifacts.some((artifact) => artifact.id === preferredArtifactId)
      ? preferredArtifactId
      : latestDeliverable?.id || null;

  if (targetArtifactId) {
    await loadArtifact(targetArtifactId, { activateTab: false, syncUrl: false });
  } else {
    state.selectedArtifactId = null;
    renderArtifact(null);
  }

  renderStageSummaries();
  if (syncUrl) {
    writeUiStateToUrl({ historyMode: urlMode });
  }
}

export function clearMissionSelection({ syncUrl = true, urlMode = 'replace' } = {}) {
  stopExecutionPolling();
  state.currentSessionPayload = null;
  state.executionLogs = null;
  state.executionStatus = null;
  state.harnessDocumentResult = null;
  state.harnessMemoryResult = null;
  resetHarnessFilterState();
  state.missionActions = null;
  state.missionActionsView = null;
  state.missionDetail = null;
  state.missionTimeline = null;
  state.selectedArtifactId = null;
  state.selectedMissionId = null;
  state.selectedSessionId = null;

  resetHarnessFilterInputs();
  resetDocumentLogForm();
  resetMemoryForm('mission');
  resetMemoryForm('workspace');
  renderMissionList();
  renderSelectionBridge();
  renderMissionSummary();
  renderSetupHarnessSummary();
  renderStageSummaries();
  renderMissionActions();
  renderReviewReadiness();
  renderHarnessPanel();
  renderTimeline();
  renderSessionList();
  renderSessionDetail(null);
  renderArtifact(null);
  renderFlowState();
  renderAgentBlueprintBuilder();
  renderDetailTabLabels();
  renderDetailContextbar();
  setActiveStep('step-setup', { syncDetailTab: false, syncUrl: false });
  setActiveDetailTab('config', { syncUrl: false });
  if (syncUrl) {
    writeUiStateToUrl({ historyMode: urlMode });
  }
}

async function selectMission(
  missionId,
  {
    preferredArtifactId = null,
    preferredDetailTab = null,
    preferredSessionId = null,
    preferredStep = null,
    syncUrl = true,
    urlMode = 'replace',
  } = {},
) {
  if (!missionId) {
    return;
  }

  resetHarnessFilterState();
  state.selectedMissionId = missionId;
  state.selectedArtifactId = null;
  state.harnessDocumentResult = null;
  state.harnessMemoryResult = null;
  resetHarnessFilterInputs();
  resetDocumentLogForm();
  resetMemoryForm('mission');
  resetMemoryForm('workspace');
  renderMissionList();
  renderSelectionBridge();

  const [detail, timelinePayload] = await Promise.all([
    api(`/api/missions/${encodeURIComponent(missionId)}`),
    api(`/api/missions/${encodeURIComponent(missionId)}/timeline`),
    loadMissionActions(missionId),
  ]);

  state.missionDetail = detail;
  state.missionTimeline = timelinePayload;
  await loadHarnessBrowsers(missionId);
  await loadExecutionStatus(missionId);
  ensureExecutionPolling();

  renderMissionSummary();
  renderSetupHarnessSummary();
  renderStageSummaries();
  renderMissionActions();
  renderReviewReadiness();
  renderHarnessPanel();
  renderTimeline();
  renderSessionList();

  const latestSession = (detail.sessions || []).at(-1) || null;
  const targetSessionId =
    preferredSessionId && (detail.sessions || []).some((session) => session.id === preferredSessionId)
      ? preferredSessionId
      : latestSession?.id || null;

  if (targetSessionId) {
    await selectSession(targetSessionId, {
      focusRuns: false,
      preferredArtifactId,
      syncUrl: false,
    });
  } else {
    state.selectedSessionId = null;
    state.currentSessionPayload = null;
    renderSessionDetail(null);
    renderArtifact(null);
  }

  const flow = getFlowState();
  const resolvedStep =
    getSanitizedStepId(preferredStep) ||
    (preferredArtifactId ? 'step-output' : null) ||
    flow.recommendedStep;
  const resolvedDetailTab =
    getSanitizedDetailTab(preferredDetailTab) ||
    (preferredArtifactId ? 'artifacts' : null) ||
    STEP_TO_DETAIL_TAB[resolvedStep] ||
    'artifacts';

  setActiveStep(resolvedStep, { syncDetailTab: false, syncUrl: false });
  setActiveDetailTab(resolvedDetailTab, { syncUrl: false });
  renderFlowState();

  if (syncUrl) {
    writeUiStateToUrl({ historyMode: urlMode });
  }
}

async function resolveApproval(approvalId, decision, reason) {
  await api(`/api/approvals/${encodeURIComponent(approvalId)}/resolve`, {
    body: JSON.stringify({ decision, reason }),
    method: 'POST',
  });

  await Promise.all([loadApprovals(), loadMissions()]);
  if (state.selectedMissionId) {
    await selectMission(state.selectedMissionId);
  }
}

async function loadProviders() {
  const [payload, providerEvents] = await Promise.all([
    api('/api/providers'),
    api(`/api/providers/events?${buildProviderEventFilterParams().toString()}`),
  ]);
  state.providers = payload.providers || payload;
  state.providerEvents = providerEvents;
  renderProviders();
}

async function loadProviderEvents() {
  state.providerEvents = await api(`/api/providers/events?${buildProviderEventFilterParams().toString()}`);
  renderProviders();
}

async function loadRuntimeRequests() {
  state.runtimeRequests = await api('/api/runtime/requests');
  renderHeroMetrics();
}

async function loadRuntimeJobs() {
  state.runtimeJobs = await api('/api/runtime/jobs');
  renderHeroMetrics();
}

export async function loadApprovals() {
  const payload = await api('/api/approvals');
  state.approvals = payload.items || [];
  renderApprovals();
  renderReviewReadiness();
  renderStageSummaries();
  renderFlowState();
  renderHeroMetrics();
}

export async function loadMissions() {
  const payload = await api('/api/missions');
  state.missions = payload.missions || [];
  renderMissionList();
}

async function loadExecutionStatus(missionId = state.selectedMissionId) {
  if (!missionId) {
    state.executionStatus = null;
    state.executionLogs = null;
    stopExecutionPolling();
    renderExecutionConsole();
    return null;
  }

  const payload = await api(`/api/missions/${encodeURIComponent(missionId)}/execution`);
  state.executionStatus = payload;
  if (state.missionDetail?.mission?.id === missionId) {
    state.missionDetail.execution = payload.execution;
  }
  const executionId = payload.execution?.latestExecutionSession?.id || '';
  if (executionId) {
    state.executionLogs = await api(
      `/api/missions/${encodeURIComponent(missionId)}/execution/logs?executionId=${encodeURIComponent(executionId)}`,
    );
  } else {
    state.executionLogs = {
      execution: null,
      lines: [],
      logFilePath: null,
    };
  }
  renderExecutionConsole();
  return payload;
}

async function loadReleaseStatus({
  preserveHandoffPreview = false,
  previewArtifactId = '',
} = {}) {
  const previousReleaseState = {
    blockerCategoryFilter: state.releaseBlockerCategoryFilter,
    blockerIncludeSharedProviderOperations: state.releaseBlockerIncludeSharedProviderOperations,
    blockerOwnerFilter: state.releaseBlockerOwnerFilter,
    blockerProviderFilter: state.releaseBlockerProviderFilter,
    focusedBlockerId: state.releaseFocusedBlockerId,
    focusedProductionBlockerIndex: state.releaseFocusedProductionBlockerIndex,
    focusedProvider: state.releaseFocusedProvider,
    focusedHistoryId: state.releaseFocusedHistoryId,
    historyFilterOutcome: state.releaseHistoryFilterOutcome,
    historyFilterProvider: state.releaseHistoryFilterProvider,
    historyFilterScope: state.releaseHistoryFilterScope,
  };
  const targetPreviewArtifactId = preserveHandoffPreview
    ? String(previewArtifactId || state.releaseHandoffPreviewId || '').trim()
    : '';
  const payload = await api('/api/execution-v1/status');
  state.releaseStatus = payload;
  if (!targetPreviewArtifactId) {
    clearReleaseHandoffPreview();
  }
  if (!payload.providerReadiness?.some((item) => String(item.provider || '').trim() === state.releaseFocusedProvider)) {
    state.releaseFocusedProvider = '';
  }
  if (!getReleaseCurrentOpenBlockerActions(payload).some((item) => String(item.id || '').trim() === state.releaseFocusedBlockerId)) {
    state.releaseFocusedBlockerId = '';
  }
  state.releaseFocusedProductionBlockerIndex = getValidReleaseProductionBlockerIndex(
    state.releaseFocusedProductionBlockerIndex,
    payload,
  );
  if (
    state.releaseFocusedProductionBlockerIndex !== ''
    && Number(state.releaseFocusedProductionBlockerIndex) >= 8
  ) {
    state.releaseProductionBlockersExpanded = true;
  }
  if (
    state.releaseBlockerCategoryFilter
    && !getReleaseCurrentOpenBlockerActions(payload).some(
      (item) => String(item.category || '').trim() === state.releaseBlockerCategoryFilter,
    )
  ) {
    state.releaseBlockerCategoryFilter = '';
  }
  if (
    state.releaseBlockerOwnerFilter
    && !getReleaseCurrentOpenBlockerActions(payload).some(
      (item) => String(item.owner || '').trim() === state.releaseBlockerOwnerFilter,
    )
  ) {
    state.releaseBlockerOwnerFilter = '';
  }
  if (
    state.releaseBlockerProviderFilter
    && !payload.providerReadiness?.some(
      (item) => String(item.provider || '').trim() === state.releaseBlockerProviderFilter,
    )
  ) {
    state.releaseBlockerProviderFilter = '';
  }
  if (state.releaseBlockerProviderFilter && !state.releaseFocusedProvider) {
    state.releaseFocusedProvider = state.releaseBlockerProviderFilter;
  }
  if (
    state.releaseFocusedBlockerId
    && !getFilteredReleaseCurrentOpenBlockerActions(payload).some(
      (item) => String(item.id || '').trim() === state.releaseFocusedBlockerId,
    )
  ) {
    state.releaseFocusedBlockerId = '';
  }
  if (!payload.releaseActionHistory?.some((item) => item.id === state.releaseFocusedHistoryId)) {
    state.releaseFocusedHistoryId = '';
  }
  if (!payload.releaseActionHistory?.some((item) => item.id === state.releaseExpandedHistoryId)) {
    state.releaseExpandedHistoryId = '';
  }
  if (
    state.releaseHistoryFilterOutcome &&
    state.releaseHistoryFilterOutcome === 'attention' &&
    !payload.releaseActionHistory?.some((item) => isReleaseAttentionOutcome(item.outcome))
  ) {
    state.releaseHistoryFilterOutcome = '';
  }
  if (
    state.releaseHistoryFilterScope &&
    !payload.releaseActionHistory?.some((item) => String(item.scope || '').trim() === state.releaseHistoryFilterScope)
  ) {
    state.releaseHistoryFilterScope = '';
  }
  if (
    state.releaseHistoryFilterProvider &&
    !payload.releaseActionHistory?.some((item) => String(item.provider || '').trim() === state.releaseHistoryFilterProvider)
  ) {
    state.releaseHistoryFilterProvider = '';
  }
  state.releaseLiveConfirmProvider = '';
  state.releaseLiveRefreshPreflight = null;
  state.releaseRegenerationConfirmArmed = false;
  state.releaseRefreshPreflight = null;
  state.releaseSnapshotConfirmArmed = false;
  state.releaseSnapshotPreflight = null;
  renderReleaseStatus();
  renderDetailTabLabels();
  renderDetailContextbar();
  if (targetPreviewArtifactId) {
    await applyReleaseHandoffPreviewUrlState(targetPreviewArtifactId);
  }
  if (
    previousReleaseState.focusedBlockerId !== state.releaseFocusedBlockerId
    || previousReleaseState.focusedProductionBlockerIndex !== state.releaseFocusedProductionBlockerIndex
    || previousReleaseState.blockerCategoryFilter !== state.releaseBlockerCategoryFilter
    || previousReleaseState.blockerIncludeSharedProviderOperations !== state.releaseBlockerIncludeSharedProviderOperations
    || previousReleaseState.blockerOwnerFilter !== state.releaseBlockerOwnerFilter
    || previousReleaseState.blockerProviderFilter !== state.releaseBlockerProviderFilter
    || previousReleaseState.focusedProvider !== state.releaseFocusedProvider
    || previousReleaseState.focusedHistoryId !== state.releaseFocusedHistoryId
    || previousReleaseState.historyFilterOutcome !== state.releaseHistoryFilterOutcome
    || previousReleaseState.historyFilterProvider !== state.releaseHistoryFilterProvider
    || previousReleaseState.historyFilterScope !== state.releaseHistoryFilterScope
  ) {
    writeUiStateToUrl();
  }
  return payload;
}

async function reloadReleaseStatus() {
  try {
    setUiNotice('v1 마감 상태를 다시 읽는 중입니다.');
    await loadReleaseStatus({ preserveHandoffPreview: true });
    setActiveDetailTab('release', { urlMode: 'push' });
    setUiNotice('v1 마감 상태를 다시 읽었습니다.');
  } catch (error) {
    window.alert(error.message || 'v1 마감 상태를 다시 읽지 못했습니다.');
  }
}

async function refreshReleaseStatus(liveMode = '') {
  return refreshReleaseStatusWithOptions(liveMode, {});
}

async function armReleaseRegenerationConfirm() {
  try {
    setUiNotice('current surface 재생성 preflight를 확인 중입니다.');
    const payload = await api('/api/execution-v1/refresh/preflight', {
      body: JSON.stringify({
        liveAnthropic: false,
        liveHermes: false,
        liveLocal: false,
        liveOpenAI: false,
      }),
      method: 'POST',
    });
    if (!payload.preflight?.allowed) {
      window.alert(payload.preflight?.summary || 'current surface 재생성 preflight가 차단되었습니다.');
      return;
    }
    state.releaseStatus = payload.status || state.releaseStatus;
    state.releaseRefreshPreflight = payload.preflight;
    state.releaseRegenerationConfirmArmed = true;
    renderReleaseStatus();
    renderDetailTabLabels();
    renderDetailContextbar();
    setUiNotice('current surface 재생성 확인이 준비되었습니다. 영향 요약을 확인한 뒤 재생성 확인을 눌러 주세요.');
  } catch (error) {
    window.alert(error.message || 'current surface 재생성 preflight 확인에 실패했습니다.');
  }
}

async function refreshReleaseStatusWithOptions(
  liveMode = '',
  {
    confirmCurrentSurfaceRewrite = false,
    confirmLiveValidation = false,
  } = {},
) {
  try {
    const normalizedLiveMode = String(liveMode || '').trim();
    const isLiveRun = Boolean(normalizedLiveMode);
    state.releaseLiveConfirmProvider = '';
    state.releaseLiveRefreshPreflight = null;
    state.releaseRegenerationConfirmArmed = false;
    state.releaseRefreshPreflight = null;
    state.releaseSnapshotConfirmArmed = false;
    state.releaseSnapshotPreflight = null;
    setUiNotice(
      isLiveRun
        ? `${normalizedLiveMode} live validation과 current surface를 갱신 중입니다.`
        : 'current surface evidence/closeout/handoff를 재생성 중입니다.',
    );
    const payload = await api('/api/execution-v1/refresh', {
      body: JSON.stringify({
        confirmCurrentSurfaceRewrite,
        confirmLiveValidation,
        liveAnthropic: normalizedLiveMode === 'anthropic',
        liveHermes: normalizedLiveMode === 'hermes',
        liveLocal: normalizedLiveMode === 'local',
        liveOpenAI: normalizedLiveMode === 'openai',
      }),
      method: 'POST',
    });
    state.releaseStatus = payload;
    renderReleaseStatus();
    renderDetailTabLabels();
    renderDetailContextbar();
    setActiveDetailTab('release', { urlMode: 'push' });
    setUiNotice(
      isLiveRun
        ? `${normalizedLiveMode} live validation 결과로 current surface를 갱신했습니다.`
        : 'current surface evidence/closeout/handoff를 재생성했습니다.',
    );
  } catch (error) {
    window.alert(
      error.message
      || (isLiveRun
        ? 'provider live validation 기반 current surface 갱신에 실패했습니다.'
        : 'current surface 재생성에 실패했습니다.'),
    );
  }
}

async function runReleasePreflight(provider = '') {
  try {
    const normalizedProvider = String(provider || '').trim();
    if (!normalizedProvider) {
      return;
    }
    setUiNotice(`${normalizedProvider} preflight를 실행 중입니다.`);
    const payload = await api('/api/execution-v1/preflight', {
      body: JSON.stringify({
        provider: normalizedProvider,
      }),
      method: 'POST',
    });
    state.releasePreflightResults = {
      ...state.releasePreflightResults,
      [normalizedProvider]: payload.preflight,
    };
    renderReleaseStatus();
    renderDetailContextbar();
    setActiveDetailTab('release', { urlMode: 'push' });
    setUiNotice(`${normalizedProvider} preflight를 완료했습니다. (${payload.preflight.status})`);
  } catch (error) {
    window.alert(error.message || 'release preflight 실행에 실패했습니다.');
  }
}

async function runReleasePreflightAll() {
  try {
    setUiNotice('전체 provider preflight를 실행 중입니다.');
    const payload = await api('/api/execution-v1/preflight', {
      body: JSON.stringify({
        provider: 'all',
      }),
      method: 'POST',
    });
    const aggregatePreflight = payload.preflight || null;
    const providerResults = Array.isArray(aggregatePreflight?.providers)
      ? aggregatePreflight.providers
      : [];
    const nextPreflightResults = { ...state.releasePreflightResults };
    for (const providerPreflight of providerResults) {
      const provider = String(providerPreflight?.provider || '').trim();
      if (provider) {
        nextPreflightResults[provider] = providerPreflight;
      }
    }
    state.releaseAllPreflight = aggregatePreflight;
    state.releasePreflightResults = nextPreflightResults;
    renderReleaseStatus();
    renderDetailContextbar();
    setActiveDetailTab('release', { urlMode: 'push' });
    setUiNotice(
      `전체 provider preflight 완료: ${aggregatePreflight?.status || 'unknown'} · missing env ${Number(aggregatePreflight?.missingEnvCount || 0)}`,
    );
  } catch (error) {
    window.alert(error.message || '전체 provider preflight 실행에 실패했습니다.');
  }
}

async function armReleaseLiveConfirm(provider = '') {
  try {
    const normalizedProvider = String(provider || '').trim();
    if (!normalizedProvider) {
      return;
    }
    setUiNotice(`${normalizedProvider} live validation preflight를 확인 중입니다.`);
    const payload = await api('/api/execution-v1/refresh/preflight', {
      body: JSON.stringify({
        liveAnthropic: normalizedProvider === 'anthropic',
        liveHermes: normalizedProvider === 'hermes',
        liveLocal: normalizedProvider === 'local',
        liveOpenAI: normalizedProvider === 'openai',
      }),
      method: 'POST',
    });
    if (!payload.preflight?.allowed) {
      window.alert(payload.preflight?.summary || `${normalizedProvider} live validation preflight가 차단되었습니다.`);
      return;
    }
    state.releaseStatus = payload.status || state.releaseStatus;
    state.releaseLiveConfirmProvider = normalizedProvider;
    state.releaseLiveRefreshPreflight = payload.preflight;
    state.releasePreflightResults = {
      ...state.releasePreflightResults,
      [normalizedProvider]: payload.preflight.providerPreflight || state.releasePreflightResults?.[normalizedProvider] || null,
    };
    renderReleaseStatus();
    renderDetailTabLabels();
    renderDetailContextbar();
    setUiNotice(`${normalizedProvider} live validation 확인이 준비되었습니다. impact를 확인한 뒤 live 검증 확인을 눌러 주세요.`);
  } catch (error) {
    window.alert(error.message || 'provider live validation preflight 확인에 실패했습니다.');
  }
}

async function armReleaseSnapshotConfirm() {
  try {
    setUiNotice('release snapshot 고정 preflight를 확인 중입니다.');
    const payload = await api('/api/execution-v1/snapshot/preflight', {
      method: 'POST',
    });
    if (!payload.preflight?.allowed) {
      window.alert(payload.preflight?.summary || 'release snapshot 고정 preflight가 차단되었습니다.');
      return;
    }
    state.releaseStatus = payload.status || state.releaseStatus;
    state.releaseSnapshotPreflight = payload.preflight;
    state.releaseSnapshotConfirmArmed = true;
    renderReleaseStatus();
    renderDetailTabLabels();
    renderDetailContextbar();
    setUiNotice('release snapshot 고정 확인이 준비되었습니다. impact를 확인한 뒤 snapshot 고정 확인을 눌러 주세요.');
  } catch (error) {
    window.alert(error.message || 'release snapshot 고정 preflight 확인에 실패했습니다.');
  }
}

async function archiveReleaseSnapshot({ confirmSnapshotFreeze = false } = {}) {
  try {
    state.releaseRegenerationConfirmArmed = false;
    state.releaseRefreshPreflight = null;
    state.releaseSnapshotConfirmArmed = false;
    state.releaseSnapshotPreflight = null;
    setUiNotice('release snapshot을 고정 중입니다.');
    const payload = await api('/api/execution-v1/snapshot', {
      body: JSON.stringify({
        confirmSnapshotFreeze,
      }),
      method: 'POST',
    });
    state.releaseStatus = payload.status;
    renderReleaseStatus();
    renderDetailTabLabels();
    renderDetailContextbar();
    setActiveDetailTab('release', { urlMode: 'push' });
    const verifiedCommit = payload.archiveResult?.verifiedCommit || state.releaseStatus?.snapshot?.verifiedCommit || '';
    setUiNotice(verifiedCommit ? `release snapshot을 고정했습니다. (${verifiedCommit.slice(0, 7)})` : 'release snapshot을 고정했습니다.');
  } catch (error) {
    window.alert(error.message || 'release snapshot 고정에 실패했습니다.');
  }
}

function ensureExecutionPolling() {
  stopExecutionPolling();
  const execution = getExecutionStatusPayload()?.latestExecutionSession;
  if (!execution || execution.status !== 'running' || !state.selectedMissionId) {
    return;
  }

  state.executionPollTimer = setInterval(async () => {
    if (!state.selectedMissionId) {
      stopExecutionPolling();
      return;
    }
    try {
      await Promise.all([loadExecutionStatus(state.selectedMissionId), loadApprovals()]);
      await refreshSelectedMissionContext({ preserveHarnessBrowse: true });
    } catch {
      stopExecutionPolling();
    }
  }, 2000);
}

function resolveRestoredMissionId(urlState, visibleMission = []) {
  if (urlState.missionId && visibleMission.some(({ mission }) => mission.id === urlState.missionId)) {
    return urlState.missionId;
  }
  return visibleMission[0]?.mission?.id || null;
}

async function restoreTargetMissionUrlState(targetMissionId, urlState) {
  await selectMission(targetMissionId, {
    preferredArtifactId: urlState.artifactId,
    preferredDetailTab: urlState.detailTab,
    preferredSessionId: urlState.sessionId,
    preferredStep: urlState.stepId,
    syncUrl: false,
  });
  await applyRetrievalSourceUrlState({
    sourceLabel: urlState.retrievalSourceLabel,
    sourceType: urlState.retrievalSourceType,
  });
  renderAgentBlueprintBuilder();
  renderHarnessPanel();
  renderOutputStageSummary();
}

async function restoreReleaseDetailUrlState(urlState) {
  if (urlState.detailTab === 'release') {
    applyReleaseHistoryUrlState({
      focusedHistoryId: urlState.releaseFocusedHistoryId,
      outcome: urlState.releaseHistoryOutcome,
      provider: urlState.releaseHistoryProvider,
      scope: urlState.releaseHistoryScope,
    });
    applyReleaseBlockerFilterUrlState({
      category: urlState.releaseBlockerCategoryFilter,
      includeShared: urlState.releaseBlockerIncludeSharedProviderOperations,
      owner: urlState.releaseBlockerOwnerFilter,
      provider: urlState.releaseBlockerProviderFilter,
    });
    applyReleaseBlockerUrlState(urlState.releaseFocusedBlockerId);
    applyReleaseProductionBlockerUrlState(urlState.releaseFocusedProductionBlockerIndex);
    applyReleaseProviderUrlState(urlState.releaseFocusedProvider);
    await applyReleaseHandoffPreviewUrlState(urlState.releaseHandoffPreviewId);
  } else {
    applyReleaseHistoryUrlState();
    applyReleaseBlockerFilterUrlState();
    applyReleaseBlockerUrlState();
    applyReleaseProductionBlockerUrlState();
    applyReleaseProviderUrlState();
    clearReleaseHandoffPreview();
    renderReleaseStatus();
  }
}

function restoreMissingMissionUrlState(urlState) {
  clearMissionSelection({ syncUrl: false });
  if (urlState.stepId) {
    setActiveStep(urlState.stepId, { syncDetailTab: false, syncUrl: false });
  }
  if (urlState.detailTab) {
    setActiveDetailTab(urlState.detailTab, { syncUrl: false });
  }
}

function restoreMissionTargetUrlState(urlState) {
  renderMissionList();

  const visibleMission = filteredMissions();
  const targetMissionId = resolveRestoredMissionId(urlState, visibleMission);
  return targetMissionId;
}

function restoreMissionActionsFilterUrlState(urlState) {
  applyMissionActionsFilterUrlState({
    actionInboxFallbackStopReason: urlState.actionInboxFallbackStopReason,
    actionInboxFilter: urlState.actionInboxFilter,
  });
}

async function restoreMissionSelectionUrlState(targetMissionId, urlState) {
  if (targetMissionId) {
    await restoreTargetMissionUrlState(targetMissionId, urlState);
  } else {
    restoreMissingMissionUrlState(urlState);
  }
}

function syncRestoredUiStateToUrl(syncUrl) {
  if (syncUrl) {
    writeUiStateToUrl();
  }
}

async function applyRestoredUiState(urlState) {
  restoreWorkspaceSelectionUrlState(urlState);

  const targetMissionId = restoreMissionTargetUrlState(urlState);

  restoreMissionActionsFilterUrlState(urlState);

  await restoreMissionSelectionUrlState(targetMissionId, urlState);

  await restoreReleaseDetailUrlState(urlState);
}

async function restoreUiStateFromUrl({ syncUrl = true } = {}) {
  const urlState = parseUiStateFromUrl();

  await applyRestoredUiState(urlState);

  syncRestoredUiStateToUrl(syncUrl);
}

function buildHarnessDocumentsQueryParams() {
  return new URLSearchParams({
    limit: String(state.harnessDocumentVisibleCount || 12),
    offset: String(state.harnessDocumentOffset || 0),
    query: String(state.harnessDocumentQuery || ''),
    sort: String(state.harnessDocumentSort || 'latest'),
    type: String(state.harnessDocumentFilter || 'all'),
  });
}

async function loadHarnessDocuments(missionId = state.selectedMissionId) {
  if (!missionId) {
    state.harnessDocumentResult = null;
    return null;
  }

  const params = buildHarnessDocumentsQueryParams();
  const payload = await api(`/api/missions/${encodeURIComponent(missionId)}/harness/documents?${params.toString()}`);
  state.harnessDocumentOffset = Number(payload.filters?.offset || 0);
  state.harnessDocumentResult = payload;
  return payload;
}

function buildHarnessMemoryQueryParams() {
  return new URLSearchParams({
    kind: String(state.harnessMemoryFilterKind || 'all'),
    limit: String(state.harnessMemoryVisibleCount || 12),
    offset: String(state.harnessMemoryOffset || 0),
    query: String(state.harnessMemoryQuery || ''),
    scope: String(state.harnessMemoryFilterScope || 'all'),
    sort: String(state.harnessMemorySort || 'latest'),
  });
}

export async function loadHarnessMemory(missionId = state.selectedMissionId) {
  if (!missionId) {
    state.harnessMemoryResult = null;
    return null;
  }

  const params = buildHarnessMemoryQueryParams();
  const payload = await api(`/api/missions/${encodeURIComponent(missionId)}/harness/memory?${params.toString()}`);
  state.harnessMemoryOffset = Number(payload.filters?.offset || 0);
  state.harnessMemoryResult = payload;
  return payload;
}

async function loadHarnessBrowsers(missionId = state.selectedMissionId) {
  const [documents, memory] = await Promise.all([loadHarnessDocuments(missionId), loadHarnessMemory(missionId)]);
  return { documents, memory };
}

function buildMissionActionsUrl(missionId, { filter = 'all', includeFallbackStopReason = true } = {}) {
  const params = new URLSearchParams({
    missionId: String(missionId || ''),
    promotionStatus: 'operator-active',
  });

  if (filter === 'needs-reminder') {
    params.set('needsReminderOnly', 'true');
  }

  if (filter === 'overdue') {
    params.set('overdueOnly', 'true');
  }

  const fallbackStopReason = includeFallbackStopReason
    ? String(state.missionActionsFallbackStopReasonFilter || '').trim()
    : '';
  if (fallbackStopReason) {
    params.set('providerFallbackStopReason', fallbackStopReason);
  }

  return `/api/actions?${params.toString()}`;
}

async function loadMissionActions(missionId = state.selectedMissionId) {
  if (!missionId) {
    state.missionActions = null;
    state.missionActionsView = null;
    return null;
  }

  const filter = state.missionActionsFilter || 'all';
  const fallbackStopReason = String(state.missionActionsFallbackStopReasonFilter || '').trim();
  const fullPayloadPromise = api(buildMissionActionsUrl(missionId, { filter: 'all', includeFallbackStopReason: false }));
  const viewPayloadPromise =
    filter === 'all' && !fallbackStopReason
      ? Promise.resolve(null)
      : api(buildMissionActionsUrl(missionId, { filter }));
  const [fullPayload, viewPayload] = await Promise.all([fullPayloadPromise, viewPayloadPromise]);
  state.missionActions = fullPayload;
  state.missionActionsView = viewPayload;
  return {
    fullPayload,
    viewPayload,
  };
}

function getVisibleMissionActionsPayload() {
  return state.missionActionsView || state.missionActions;
}

export async function refreshSelectedMissionContext({ preserveHarnessBrowse = false } = {}) {
  if (!state.selectedMissionId) {
    return;
  }

  const missionId = state.selectedMissionId;
  const [detail, timelinePayload] = await Promise.all([
    api(`/api/missions/${encodeURIComponent(missionId)}`),
    api(`/api/missions/${encodeURIComponent(missionId)}/timeline`),
    loadMissionActions(missionId),
  ]);

  state.missionDetail = detail;
  state.missionTimeline = timelinePayload;
  await loadExecutionStatus(missionId);
  ensureExecutionPolling();

  if (preserveHarnessBrowse) {
    await loadHarnessBrowsers(missionId);
  }

  renderSelectionBridge();
  renderMissionSummary();
  renderSetupHarnessSummary();
  renderStageSummaries();
  renderMissionActions();
  renderReviewReadiness();
  renderHarnessPanel();
  renderTimeline();
  renderSessionList();
  renderFlowState();
  renderHeroMetrics();
  renderAgentBlueprintBuilder();
  renderDetailTabLabels();
  renderDetailContextbar();
  renderDetailToolbarActions();
}

async function handleMissionCreate(event) {
  event.preventDefault();
  const formData = new FormData(elements.missionForm);
  const attachments = await readMissionAttachmentFiles(elements.missionAttachmentInput?.files || []);
  const payload = {
    attachments,
    constraints: buildMissionConstraintPayload(String(formData.get('constraints') || '')),
    deliverableType: String(formData.get('deliverableType') || ''),
    mode: String(formData.get('mode') || ''),
    objective: String(formData.get('objective') || ''),
    title: String(formData.get('title') || ''),
    workspaceId: getSelectedWorkspaceId(),
  };

  const result = await api('/api/missions', {
    body: JSON.stringify(payload),
    method: 'POST',
  });

  elements.missionForm.reset();
  renderAgentBlueprintBuilder();
  await loadMissions();
  await selectMission(result.mission.id, {
    preferredDetailTab: 'runs',
    preferredStep: 'step-run',
    urlMode: 'push',
  });
}

async function handleMissionRun() {
  if (!state.selectedMissionId) {
    return;
  }

  const provider = String(elements.runProviderSelect.value || '').trim();
  const fallbackProvider = String(elements.runFallbackProviderSelect?.value || '').trim();
  const fallbackPolicy = fallbackProvider
    ? String(elements.runFallbackPolicySelect?.value || 'provider-failure-only').trim()
    : '';
  elements.runMissionButton.disabled = true;
  elements.runMissionButton.textContent = '실행 중...';

  try {
    await api(`/api/missions/${encodeURIComponent(state.selectedMissionId)}/run`, {
      body: JSON.stringify({ fallbackPolicy, fallbackProvider, provider }),
      method: 'POST',
    });
    await Promise.all([loadMissions(), loadApprovals()]);
    await selectMission(state.selectedMissionId, { urlMode: 'replace' });
    const pendingApproval = state.approvals.some((item) => item.missionId === state.selectedMissionId);
    const pendingActionCount = Number(state.missionActions?.summary?.pendingActionCount || 0);
    setActiveStep(pendingApproval || pendingActionCount ? 'step-review' : 'step-output', { urlMode: 'push' });
  } finally {
    elements.runMissionButton.disabled = false;
    elements.runMissionButton.textContent = '이 미션 실행';
  }
}

async function handleExecutionPreflight(requestApproval = false) {
  if (!state.selectedMissionId || !isExecutionMissionSelected()) {
    return;
  }

  try {
    const result = await api(`/api/missions/${encodeURIComponent(state.selectedMissionId)}/execution/preflight`, {
      body: JSON.stringify({ requestApproval }),
      method: 'POST',
    });

    await Promise.all([loadMissions(), loadApprovals()]);
    await refreshSelectedMissionContext({ preserveHarnessBrowse: true });
    setActiveStep('step-run', { syncDetailTab: false });
    setActiveDetailTab('runs');

    if (requestApproval && result.approval?.status === 'pending') {
      setUiNotice('실행 승인 요청을 생성했습니다.');
      return;
    }

    if (result.execution?.currentLease) {
      setUiNotice('실행 lease가 준비됐습니다. 실행을 시작할 수 있습니다.');
      return;
    }

    if (result.execution?.blockedReasons?.length) {
      setUiNotice(`실행 preflight가 막혔습니다: ${result.execution.blockedReasons[0]}`);
      return;
    }

    setUiNotice('실행 preflight를 새로고침했습니다.');
  } catch (error) {
    window.alert(error.message || '실행 preflight 처리에 실패했습니다.');
  }
}

async function handleExecutionStart() {
  if (!state.selectedMissionId || !isExecutionMissionSelected()) {
    return;
  }

  try {
    await api(`/api/missions/${encodeURIComponent(state.selectedMissionId)}/execution/start`, {
      method: 'POST',
    });
    await Promise.all([loadMissions(), loadApprovals()]);
    await refreshSelectedMissionContext({ preserveHarnessBrowse: true });
    setActiveStep('step-run', { syncDetailTab: false });
    setActiveDetailTab('runs');
    setUiNotice('실행 세션을 시작했습니다.');
  } catch (error) {
    window.alert(error.message || '실행 시작에 실패했습니다.');
  }
}

async function handleExecutionStop() {
  if (!state.selectedMissionId || !isExecutionMissionSelected()) {
    return;
  }

  const executionSession = getExecutionStatusPayload()?.latestExecutionSession || null;
  if (executionSession?.status === 'running' && !window.confirm('현재 실행 세션을 중단할까요?')) {
    return;
  }

  try {
    await api(`/api/missions/${encodeURIComponent(state.selectedMissionId)}/execution/stop`, {
      method: 'POST',
    });
    await Promise.all([loadMissions(), loadApprovals()]);
    await refreshSelectedMissionContext({ preserveHarnessBrowse: true });
    setActiveStep('step-run', { syncDetailTab: false });
    setActiveDetailTab('runs');
    setUiNotice('실행 세션 중단을 요청했습니다.');
  } catch (error) {
    window.alert(error.message || '실행 중단에 실패했습니다.');
  }
}

async function handleExecutionRollback({ dryRun = false } = {}) {
  if (!state.selectedMissionId || !isExecutionMissionSelected()) {
    return;
  }

  const executionSession = getExecutionStatusPayload()?.latestExecutionSession || null;
  if (!executionSession?.id) {
    return;
  }

  if (!dryRun && !window.confirm('현재 execution session의 승인된 mutation을 rollback할까요? 현재 파일 hash가 실행 직후 상태와 다르면 중단됩니다.')) {
    return;
  }

  try {
    const payload = await api(`/api/missions/${encodeURIComponent(state.selectedMissionId)}/execution/rollback`, {
      body: JSON.stringify({
        dryRun,
        executionId: executionSession.id,
      }),
      method: 'POST',
    });
    await Promise.all([loadMissions(), loadApprovals()]);
    await refreshSelectedMissionContext({ preserveHarnessBrowse: true });
    setActiveStep('step-run', { syncDetailTab: false });
    setActiveDetailTab('runs');

    if (payload.rollback?.status === 'preview') {
      setUiNotice(payload.rollback.ready ? 'rollback preview가 준비됐습니다.' : 'rollback preview에서 차단 항목이 발견됐습니다.');
      return;
    }

    setUiNotice(payload.rollback?.summary || 'rollback 명령을 실행했습니다.');
  } catch (error) {
    window.alert(error.message || 'rollback 실행에 실패했습니다.');
  }
}

async function handleMemoryCreate(event) {
  event.preventDefault();
  if (!state.selectedMissionId || !elements.memoryForm) {
    return;
  }

  const currentStep = state.activeStep;
  const formData = new FormData(elements.memoryForm);
  const editingId = getFormEditingId(elements.memoryForm);
  const payload = {
    content: String(formData.get('content') || '').trim(),
    kind: String(formData.get('kind') || '').trim(),
  };

  if (!payload.content) {
    window.alert('저장할 메모 내용을 입력해 주세요.');
    return;
  }

  elements.memorySubmitButton.disabled = true;
  elements.memorySubmitButton.textContent = '저장 중...';

  try {
    await api(
      editingId
        ? `/api/missions/${encodeURIComponent(state.selectedMissionId)}/memory/${encodeURIComponent(editingId)}`
        : `/api/missions/${encodeURIComponent(state.selectedMissionId)}/memory`,
      {
      body: JSON.stringify(payload),
      method: editingId ? 'PATCH' : 'POST',
    },
    );
    resetMemoryForm('mission');
    await Promise.all([loadMissions(), loadApprovals()]);
    await refreshSelectedMissionContext({ preserveHarnessBrowse: true });
    setActiveStep(currentStep, { syncDetailTab: false });
    setActiveDetailTab('harness');
  } finally {
    elements.memorySubmitButton.disabled = false;
    elements.memorySubmitButton.textContent = getMemoryFormConfig('mission').submitText;
  }
}

async function handleMemoryDelete(scope, memoryId) {
  if (!memoryId) {
    return;
  }

  const currentStep = state.activeStep;
  const scopeId =
    scope === 'workspace'
      ? state.missionDetail?.mission?.workspaceId || getSelectedWorkspaceId()
      : state.selectedMissionId;

  if (!scopeId) {
    return;
  }

  const entry = getHarnessMemoryEntry(scope, memoryId);
  const confirmMessage = `이 ${scope === 'workspace' ? '워크스페이스' : '미션'} 메모를 삭제할까요?\n\n${summarizeText(entry?.content || '', '메모 내용 없음')}`;
  if (!window.confirm(confirmMessage)) {
    return;
  }

  await api(`/${['api', scope === 'workspace' ? 'workspaces' : 'missions', encodeURIComponent(scopeId), 'memory', encodeURIComponent(memoryId)].join('/')}`, {
    method: 'DELETE',
  });

  if (scope === 'workspace') {
    resetMemoryForm('workspace');
  } else {
    resetMemoryForm('mission');
  }

  await Promise.all([loadMissions(), loadApprovals()]);
  if (state.selectedMissionId) {
    await refreshSelectedMissionContext({ preserveHarnessBrowse: true });
    setActiveStep(currentStep, { syncDetailTab: false });
    setActiveDetailTab('harness');
  }
}

async function handleDocumentLogCreate(event) {
  event.preventDefault();
  if (!state.selectedMissionId || !elements.documentLogForm) {
    return;
  }

  const currentStep = state.activeStep;
  const formData = new FormData(elements.documentLogForm);
  const editingId = getFormEditingId(elements.documentLogForm);
  const title = String(formData.get('title') || '').trim();
  const content = String(formData.get('content') || '').trim();
  const type = String(formData.get('type') || '').trim();

  if (!title) {
    window.alert('기록할 문서 제목을 입력해 주세요.');
    return;
  }
  if (!content) {
    window.alert('기록할 Markdown 본문을 입력해 주세요.');
    return;
  }

  elements.documentLogSubmitButton.disabled = true;
  elements.documentLogSubmitButton.textContent = '저장 중...';

  try {
    await api(
      editingId
        ? `/api/missions/${encodeURIComponent(state.selectedMissionId)}/document-log/${encodeURIComponent(editingId)}`
        : `/api/missions/${encodeURIComponent(state.selectedMissionId)}/document-log`,
      {
      body: JSON.stringify({ content, title, type }),
      method: editingId ? 'PATCH' : 'POST',
    },
    );
    resetDocumentLogForm();
    await Promise.all([loadMissions(), loadApprovals()]);
    await refreshSelectedMissionContext({ preserveHarnessBrowse: true });
    setActiveStep(currentStep, { syncDetailTab: false });
    setActiveDetailTab('harness');
  } finally {
    elements.documentLogSubmitButton.disabled = false;
    elements.documentLogSubmitButton.textContent = '문서 기록 저장';
  }
}

async function handleDocumentLogDelete(entryId) {
  if (!entryId || !state.selectedMissionId) {
    return;
  }

  const currentStep = state.activeStep;
  const entry = getHarnessDocumentEntry(entryId);
  const confirmMessage = `이 문서 기록을 삭제할까요?\n\n${entry?.title || '제목 없음'}`;
  if (!window.confirm(confirmMessage)) {
    return;
  }

  await api(`/api/missions/${encodeURIComponent(state.selectedMissionId)}/document-log/${encodeURIComponent(entryId)}`, {
    method: 'DELETE',
  });

  resetDocumentLogForm();
  await Promise.all([loadMissions(), loadApprovals()]);
  await refreshSelectedMissionContext({ preserveHarnessBrowse: true });
  setActiveStep(currentStep, { syncDetailTab: false });
  setActiveDetailTab('harness');
}

async function handleLegacyDocumentMigration() {
  if (!state.selectedMissionId) {
    return;
  }

  const legacyCount = Number(state.missionDetail?.harness?.documents?.summary?.legacyDevlogCount || 0);
  if (!legacyCount) {
    window.alert('전환할 기존 개발 로그가 없습니다.');
    return;
  }

  const confirmMessage = `기존 개발 로그 ${legacyCount}건을 tracked entry로 전환할까요?\n\n전환 후에는 하네스에서 바로 수정하거나 삭제할 수 있습니다.`;
  if (!window.confirm(confirmMessage)) {
    return;
  }

  const currentStep = state.activeStep;
  if (elements.documentLogFormStatus) {
    elements.documentLogFormStatus.textContent = `기존 개발 로그 ${legacyCount}건을 tracked entry로 전환하는 중입니다.`;
  }

  const result = await api(`/api/missions/${encodeURIComponent(state.selectedMissionId)}/document-log/migrate-legacy`, {
    method: 'POST',
  });

  resetDocumentLogForm();
  await Promise.all([loadMissions(), loadApprovals()]);
  await refreshSelectedMissionContext({ preserveHarnessBrowse: true });
  setActiveStep(currentStep, { syncDetailTab: false });
  setActiveDetailTab('harness');

  if (elements.documentLogFormStatus) {
    elements.documentLogFormStatus.textContent = `기존 개발 로그 ${result.migratedCount || 0}건을 tracked entry로 전환했습니다.`;
  }
}

async function handleHarnessDocumentSearch(event) {
  state.harnessDocumentQuery = String(event.target?.value || '');
  state.harnessDocumentOffset = 0;
  await loadHarnessDocuments();
  renderHarnessPanel();
}

async function handleHarnessDocumentFilter(event) {
  state.harnessDocumentFilter = String(event.target?.value || 'all').trim() || 'all';
  state.harnessDocumentOffset = 0;
  await loadHarnessDocuments();
  renderHarnessPanel();
}

async function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('선택한 파일을 읽을 수 없습니다.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsText(file);
  });
}

async function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('선택한 파일을 읽을 수 없습니다.'));
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',').pop() : result);
    };
    reader.readAsDataURL(file);
  });
}

async function readMissionAttachmentFiles(fileList) {
  const files = Array.from(fileList || []);
  const attachments = [];

  for (const file of files) {
    const baseAttachment = {
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      source: 'ui',
    };

    if (isTextMissionAttachmentFile(file)) {
      attachments.push({
        ...baseAttachment,
        content: await readTextFile(file),
        mimeType: file.type || 'text/plain',
      });
    } else {
      attachments.push({
        ...baseAttachment,
        contentBase64: await readFileAsBase64(file),
        contentEncoding: 'base64',
      });
    }
  }

  return attachments;
}

async function handleDocumentLogFilePick(event) {
  const file = event.target?.files?.[0];
  if (!file || !elements.documentLogForm) {
    return;
  }

  const content = await readTextFile(file);
  const titleField = elements.documentLogForm.querySelector('input[name="title"]');
  const contentField = elements.documentLogForm.querySelector('textarea[name="content"]');

  if (titleField && !String(titleField.value || '').trim()) {
    titleField.value = stripFileExtension(file.name);
  }

  if (contentField) {
    contentField.value = content;
  }
}

async function handleMissionAttachmentUpload(event) {
  event.preventDefault();
  if (!state.selectedMissionId || !elements.harnessSource) {
    return;
  }

  const attachmentInput = elements.harnessSource.querySelector('#mission-harness-attachment-input');
  const files = attachmentInput?.files || [];
  if (!files.length) {
    window.alert('업로드할 첨부 파일을 선택해 주세요.');
    return;
  }

  const currentStep = state.activeStep;
  const attachments = await readMissionAttachmentFiles(files);
  await api(`/api/missions/${encodeURIComponent(state.selectedMissionId)}/attachments`, {
    body: JSON.stringify({ attachments }),
    method: 'POST',
  });

  if (attachmentInput) {
    attachmentInput.value = '';
  }

  await Promise.all([loadMissions(), loadApprovals()]);
  await refreshSelectedMissionContext({ preserveHarnessBrowse: true });
  setActiveStep(currentStep, { syncDetailTab: false });
  setActiveDetailTab('harness');
  setUiNotice(`${attachments.length}개의 첨부 파일을 미션 입력으로 추가했습니다.`);
}

function wireMissionAttachmentActions() {
  if (!elements.harnessSource) {
    return;
  }

  elements.harnessSource.querySelector('#mission-harness-attachment-form')?.addEventListener('submit', async (event) => {
    try {
      await handleMissionAttachmentUpload(event);
    } catch (error) {
      window.alert(error.message);
      const attachmentInput = elements.harnessSource.querySelector('#mission-harness-attachment-input');
      if (attachmentInput) {
        attachmentInput.value = '';
      }
    }
  });
}

function wireDocumentLogFormActions() {
  elements.documentLogForm?.addEventListener('submit', async (event) => {
    try {
      await handleDocumentLogCreate(event);
    } catch (error) {
      window.alert(error.message);
      elements.documentLogSubmitButton.disabled = false;
      elements.documentLogSubmitButton.textContent = '문서 기록 저장';
    }
  });

  elements.documentLogSearch?.addEventListener('input', async (event) => {
    try {
      await handleHarnessDocumentSearch(event);
    } catch (error) {
      window.alert(error.message);
    }
  });

  elements.documentLogFilter?.addEventListener('change', async (event) => {
    try {
      await handleHarnessDocumentFilter(event);
    } catch (error) {
      window.alert(error.message);
    }
  });

  elements.documentLogCancelButton?.addEventListener('click', () => resetDocumentLogForm());

  elements.documentLogFile?.addEventListener('change', async (event) => {
    try {
      await handleDocumentLogFilePick(event);
    } catch (error) {
      window.alert(error.message);
      if (elements.documentLogFile) {
        elements.documentLogFile.value = '';
      }
    }
  });
}

function wireMemoryFormActions() {
  elements.memoryForm?.addEventListener('submit', async (event) => {
    try {
      await handleMemoryCreate(event);
    } catch (error) {
      window.alert(error.message);
      elements.memorySubmitButton.disabled = false;
      elements.memorySubmitButton.textContent = getMemoryFormConfig('mission').submitText;
    }
  });

  elements.memoryCancelButton?.addEventListener('click', () => resetMemoryForm('mission'));

  elements.workspaceMemoryForm?.addEventListener('submit', async (event) => {
    try {
      await handleWorkspaceMemoryCreate(event);
    } catch (error) {
      window.alert(error.message);
      elements.workspaceMemorySubmitButton.disabled = false;
      elements.workspaceMemorySubmitButton.textContent = getMemoryFormConfig('workspace').submitText;
    }
  });

  elements.workspaceMemoryCancelButton?.addEventListener('click', () => resetMemoryForm('workspace'));
}

function wireMissionFormActions() {
  elements.missionForm.addEventListener('submit', async (event) => {
    try {
      await handleMissionCreate(event);
    } catch (error) {
      window.alert(error.message);
    }
  });

  elements.missionForm.elements.mode?.addEventListener('change', () => {
    renderAgentBlueprintBuilder();
  });

  elements.missionAttachmentInput?.addEventListener('change', () => {
    renderAgentBlueprintBuilder();
  });
}

function wireMissionRunActions() {
  elements.runMissionButton.addEventListener('click', async () => {
    try {
      await handleMissionRun();
    } catch (error) {
      window.alert(error.message);
      elements.runMissionButton.disabled = false;
      elements.runMissionButton.textContent = '이 미션 실행';
    }
  });

  elements.runFallbackProviderSelect?.addEventListener('change', updateRunFallbackControls);
}

function wireWorkspaceComposerActions() {
  elements.toggleCreateButton.addEventListener('click', () => openComposer());
  elements.toggleWorkspaceFormButton?.addEventListener('click', () => {
    const nextOpen = Boolean(elements.workspaceForm?.hidden);
    setWorkspaceFormOpen(nextOpen, { focus: nextOpen });
  });
  elements.cancelWorkspaceFormButton?.addEventListener('click', () => setWorkspaceFormOpen(false));
  elements.workspaceForm?.addEventListener('submit', async (event) => {
    try {
      await handleWorkspaceCreate(event);
    } catch (error) {
      setWorkspaceFormStatus(error.message || '워크스페이스를 추가하지 못했습니다.');
      window.alert(error.message);
    }
  });
}

function wireMissionBrowseControls() {
  elements.missionFilter.addEventListener('input', renderMissionList);
  elements.workspaceSelect.addEventListener('change', async () => {
    renderMissionList();
    const visibleMission = filteredMissions();
    if (!visibleMission.length) {
      clearMissionSelection({ urlMode: 'push' });
      openComposer();
      return;
    }
    if (!visibleMission.some(({ mission }) => mission.id === state.selectedMissionId)) {
      await selectMission(visibleMission[0].mission.id, { urlMode: 'push' });
      return;
    }
    writeUiStateToUrl({ historyMode: 'push' });
  });
}

function wireNavigationTabControls() {
  elements.stepButtons.forEach((button) => {
    button.addEventListener('click', () => setActiveStep(button.dataset.stepTarget, { urlMode: 'push' }));
  });
  elements.detailTabButtons.forEach((button) => {
    button.addEventListener('click', () => setActiveDetailTab(button.dataset.detailTab, { urlMode: 'push' }));
  });
}

function wireBrowserHistoryControls() {
  window.addEventListener('popstate', async () => {
    try {
      await restoreUiStateFromUrl({ syncUrl: false });
    } catch (error) {
      window.alert(error.message);
    }
  });
}

function attachEvents() {
  wireWorkspaceComposerActions();
  wireMissionBrowseControls();
  wireMissionFormActions();
  wireMemoryFormActions();
  wireDocumentLogFormActions();
  wireMissionRunActions();
  wireNavigationTabControls();
  wireBrowserHistoryControls();
}

function renderBootstrapStaticSurfaces() {
  renderPlaybooks();
  renderTemplates();
  renderAgentBlueprintBuilder();
  updateRunFallbackControls();
  setActiveStep('step-setup', { syncUrl: false });
}

async function loadBootstrapData() {
  await Promise.all([
    loadDoctor(),
    loadWorkspaces(),
    loadProviders(),
    loadRuntimeRequests(),
    loadRuntimeJobs(),
    loadApprovals(),
    loadMissions(),
    loadReleaseStatus(),
  ]);
}

async function hydrateBootstrapDataAndRestoreState() {
  try {
    await loadBootstrapData();
    await restoreUiStateFromUrl();
  } catch (error) {
    window.alert(error.message);
  }
}

async function bootstrap() {
  attachEvents();
  renderBootstrapStaticSurfaces();
  await hydrateBootstrapDataAndRestoreState();
}

bootstrap();
