import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { runCli } from './cli-test-helpers.mjs';

const repoDir = process.cwd();
const serverEntry = path.join(repoDir, 'src', 'web', 'server.mjs');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-ui-learning-promotion-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'ui-learning-promotion-workspace'],
});

const promotedMission = createMission({
  objective: 'Create a success-pattern candidate and promote it through the web operator API.',
  title: 'UI learning promotion approve',
});
const promotedRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', promotedMission.id, '--provider', 'stub'],
});
assert.equal(promotedRun.status, 'completed');
assert.ok(promotedRun.learningCandidateId);

const expiredMission = createMission({
  objective: 'Create a learning candidate that will be expired through the web operator API.',
  title: 'UI learning promotion expire',
});
const expiredRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', expiredMission.id, '--provider', 'stub'],
});
assert.equal(expiredRun.status, 'completed');
assert.ok(expiredRun.learningCandidateId);

const rejectedMission = createMission({
  constraints: 'force-rubric-fail',
  deliverable: 'checklist',
  objective: 'Create a quality-regression candidate and reject it through the web operator API.',
  title: 'UI learning promotion reject',
});
const rejectedRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', rejectedMission.id, '--provider', 'stub'],
});
assert.equal(rejectedRun.status, 'failed');
assert.ok(rejectedRun.learningCandidateId);

const blockedMission = createMission({
  objective: 'Create a learning candidate that fails promotion verification and is closed from the web operator API.',
  title: 'UI learning promotion stop-condition',
});
const blockedRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', blockedMission.id, '--provider', 'stub'],
});
assert.equal(blockedRun.status, 'completed');
assert.ok(blockedRun.learningCandidateId);

const unsafeState = readState();
const unsafeCandidate = unsafeState.learningCandidates.find(
  (candidate) => candidate.id === blockedRun.learningCandidateId,
);
assert.ok(unsafeCandidate);
unsafeCandidate.safety.noRawSecrets = false;
unsafeCandidate.summary = `${unsafeCandidate.summary} UI fixture intentionally marks noRawSecrets=false.`;
writeState(unsafeState);

const blockedResult = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'resolve-learning-promotion',
    blockedRun.learningCandidateId,
    '--decision',
    'approve',
    '--target',
    'memory',
    '--scope',
    'mission',
    '--note',
    'Block unsafe memory promotion before the web operator resolves the stop-condition.',
  ],
});
assert.equal(blockedResult.learningCandidate.promotionStatus, 'verification-blocked');

const fallbackMission = createMission({
  deliverable: 'checklist',
  objective: 'Create provider fallback learning evidence and expose it through the web action audit package.',
  title: 'UI learning promotion fallback audit package',
});
const fallbackRun = runCli({
  rootDir: tempRoot,
  env: {
    ANTHROPIC_API_KEY: '',
    ANTHROPIC_BASE_URL: '',
    ANTHROPIC_MODEL: '',
  },
  args: ['mission', 'run', fallbackMission.id, '--provider', 'anthropic', '--fallback-provider', 'stub'],
});
assert.equal(fallbackRun.status, 'completed');
assert.ok(fallbackRun.learningCandidateId);
assert.equal(fallbackRun.providerFallback.fallbackUsed, true);
assert.equal(fallbackRun.providerFallback.policyId, 'provider-failure-only');

const agedBlockedState = readState();
const agedBlockedCandidate = agedBlockedState.learningCandidates.find(
  (candidate) => candidate.id === blockedRun.learningCandidateId,
);
assert.ok(agedBlockedCandidate);
const agedReminderBaseAt = '2000-01-01T00:00:00.000Z';
agedBlockedCandidate.createdAt = agedReminderBaseAt;
agedBlockedCandidate.updatedAt = agedReminderBaseAt;
agedBlockedCandidate.promotionDecision.decidedAt = agedReminderBaseAt;
agedBlockedCandidate.promotionStopCondition.blockedAt = agedReminderBaseAt;
writeState(agedBlockedState);

const port = await getFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const serverOutput = { stderr: '', stdout: '' };
const serverProcess = spawn(process.execPath, [serverEntry], {
  cwd: repoDir,
  env: {
    ...process.env,
    PERSONAL_AI_AGENT_ROOT: tempRoot,
    PERSONAL_AI_AGENT_UI_HOST: '127.0.0.1',
    PERSONAL_AI_AGENT_UI_PORT: String(port),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

serverProcess.stdout.on('data', (chunk) => {
  serverOutput.stdout += String(chunk);
});

serverProcess.stderr.on('data', (chunk) => {
  serverOutput.stderr += String(chunk);
});

try {
  await waitForServer(baseUrl, serverProcess, serverOutput);

  const appJs = await fetchText(`${baseUrl}/app.js`);
  assert.equal(appJs.includes('data-learning-promotion-audit-copy'), true);
  assert.equal(appJs.includes('copyLearningPromotionAuditPackage'), true);
  assert.equal(appJs.includes('buildLearningPromotionAuditPackageText'), true);
  assert.equal(appJs.includes('Learning promotion audit package'), true);
  assert.equal(appJs.includes('renderLearningPromotionCommandMeta'), true);
  assert.equal(appJs.includes('function renderLearningPromotionCommandMeta(item)'), true);
  assert.equal(appJs.includes('renderLearningPromotionCommandMeta(item)'), true);
  assert.equal(appJs.includes("['resolve', item.resolveCommand]"), true);
  assert.equal(appJs.includes("['expire', item.expireCommand]"), true);
  assert.equal(appJs.includes("['rollback', item.rollbackCommand]"), true);
  assert.equal(appJs.includes("['stop-condition', item.stopConditionRejectCommand]"), true);
  assert.equal(appJs.includes("['reminder', item.remindCommand]"), true);
  assert.equal(appJs.includes('<div class="item-meta mono">${escapeHtml(label)}: ${escapeHtml(command)}</div>'), true);
  assert.equal(appJs.includes('providerFallbackPolicy'), true);
  assert.equal(appJs.includes('gatewayEventRoute'), true);
  assert.equal(appJs.includes('autoPromotionAllowed'), true);
  assert.equal(appJs.includes('rollbackEligible'), true);
  assert.equal(appJs.includes('data-action-open'), true);
  assert.equal(appJs.includes('renderMissionActionItemButton'), true);
  assert.equal(appJs.includes('renderMissionActionItemButton({'), true);
  assert.equal(appJs.includes("dataAttribute: 'data-action-open'"), true);
  assert.equal(appJs.includes("actionLabelPrefix: '미션 열기'"), true);
  assert.equal(appJs.includes('function wireActionInboxOpenButtons()'), true);
  assert.equal(appJs.includes('wireActionInboxOpenButtons();'), true);
  assert.equal(appJs.includes('data-action-rerun'), true);
  assert.equal(appJs.includes("dataAttribute: 'data-action-rerun'"), true);
  assert.equal(appJs.includes("actionLabelPrefix: '권장 재실행'"), true);
  assert.equal(appJs.includes('function wireActionInboxRerunButtons(items = [])'), true);
  assert.equal(appJs.includes('wireActionInboxRerunButtons(items);'), true);
  assert.equal(appJs.includes('data-provider-attention-remediate'), true);
  assert.equal(appJs.includes('renderProviderAttentionRemediationButton'), true);
  assert.equal(appJs.includes('renderProviderAttentionRemediationButton({ item })'), true);
  assert.equal(appJs.includes('data-provider-attention-mode="${escapeHtml(mode)}"'), true);
  assert.equal(appJs.includes('${actionLabelPrefix}: ${item.title || item.actionId || item.id || item.missionId}'), true);
  assert.equal(appJs.includes("actionLabelPrefix: 'fallback 복구'"), true);
  assert.equal(appJs.includes("mode: 'fallback'"), true);
  assert.equal(appJs.includes("actionLabelPrefix: '복구성 fallback'"), true);
  assert.equal(appJs.includes("mode: 'recoverable-fallback'"), true);
  assert.equal(appJs.includes('function wireActionInboxProviderAttentionButtons(items = [])'), true);
  assert.equal(appJs.includes('wireActionInboxProviderAttentionButtons(items);'), true);
  assert.equal(appJs.includes('/api/actions/provider-attention/${encodeURIComponent(actionId)}/remediate'), true);
  assert.equal(appJs.includes('data-specialist-follow-up-remediate'), true);
  assert.equal(appJs.includes("dataAttribute: 'data-specialist-follow-up-remediate'"), true);
  assert.equal(appJs.includes("actionLabelPrefix: '전문가 복구'"), true);
  assert.equal(appJs.includes('function wireActionInboxSpecialistFollowUpButtons(items = [])'), true);
  assert.equal(appJs.includes('wireActionInboxSpecialistFollowUpButtons(items);'), true);
  assert.equal(appJs.includes('/api/actions/specialist-follow-ups/${encodeURIComponent(actionId)}/remediate'), true);
  assert.equal(appJs.includes('data-action-resolve'), true);
  assert.equal(appJs.includes("dataAttribute: 'data-action-resolve'"), true);
  assert.equal(appJs.includes("actionLabelPrefix: '후속 요청 해소'"), true);
  assert.equal(appJs.includes('function wireActionInboxReviewerFollowUpResolveButtons()'), true);
  assert.equal(appJs.includes('wireActionInboxReviewerFollowUpResolveButtons();'), true);
  assert.equal(appJs.includes('/api/actions/reviewer-follow-ups/${encodeURIComponent(actionId)}/resolve'), true);
  assert.equal(appJs.includes('body: JSON.stringify({ kind, note })'), true);
  assert.equal(appJs.includes('data-approval-open'), true);
  assert.equal(appJs.includes('renderApprovalActionButton'), true);
  assert.equal(appJs.includes("dataAttribute: 'data-approval-open'"), true);
  assert.equal(appJs.includes('actionLabelValue: item.missionTitle || item.title || item.missionId || item.approvalId'), true);
  assert.equal(appJs.includes('function wireApprovalOpenButtons()'), true);
  assert.equal(appJs.includes('wireApprovalOpenButtons();'), true);
  assert.equal(appJs.includes("preferredDetailTab: 'reviews'"), true);
  assert.equal(appJs.includes("preferredStep: 'step-review'"), true);
  assert.equal(appJs.includes('data-output-primary-tab'), true);
  assert.equal(appJs.includes('data-output-secondary-tab'), true);
  assert.equal(appJs.includes('function wireOutputToolbarTabButtons()'), true);
  assert.equal(appJs.includes('wireOutputToolbarTabButtons();'), true);
  assert.equal(appJs.includes("setActiveDetailTab(button.dataset.outputPrimaryTab, { urlMode: 'push' })"), true);
  assert.equal(appJs.includes("setActiveDetailTab(button.dataset.outputSecondaryTab, { urlMode: 'push' })"), true);
  assert.equal(appJs.includes('data-template-index'), true);
  assert.equal(appJs.includes('function wireTemplateSelectionButtons()'), true);
  assert.equal(appJs.includes('wireTemplateSelectionButtons();'), true);
  assert.equal(appJs.includes('applyTemplate(Number(button.dataset.templateIndex))'), true);
  assert.equal(appJs.includes('data-playbook-id'), true);
  assert.equal(appJs.includes('function wirePlaybookSelectionButtons()'), true);
  assert.equal(appJs.includes('wirePlaybookSelectionButtons();'), true);
  assert.equal(appJs.includes('missionPlaybooks.find((entry) => entry.id === button.dataset.playbookId)'), true);
  assert.equal(appJs.includes('state.selectedPlaybookId = playbook.id'), true);
  assert.equal(appJs.includes('elements.missionForm.elements.mode.value = playbook.values.mode'), true);
  assert.equal(appJs.includes('data-agent-blueprint-id'), true);
  assert.equal(appJs.includes('function wireAgentBlueprintSelectionButtons(mode)'), true);
  assert.equal(appJs.includes('wireAgentBlueprintSelectionButtons(mode);'), true);
  assert.equal(appJs.includes("setSelectedAgentBlueprint(String(button.dataset.agentBlueprintId || '').trim(), mode)"), true);
  assert.equal(appJs.includes('function wireReleaseStatusActionButtons()'), true);
  assert.equal(appJs.includes('wireReleaseStatusActionButtons();'), true);
  assert.equal(appJs.includes('data-ui-action="run-release-preflight"'), true);
  assert.equal(appJs.includes('data-ui-action="run-release-preflight-all"'), true);
  assert.equal(appJs.includes('data-ui-action="refresh-release-status-live"'), true);
  assert.equal(appJs.includes('await runReleasePreflight(provider)'), true);
  assert.equal(appJs.includes('await runReleasePreflightAll()'), true);
  assert.equal(appJs.includes('await refreshReleaseStatusWithOptions(provider, { confirmLiveValidation: true })'), true);
  assert.equal(appJs.includes('await armReleaseLiveConfirm(provider)'), true);
  assert.equal(appJs.includes('function wireDocumentMutationActionButtons()'), true);
  assert.equal(appJs.includes('wireDocumentMutationActionButtons();'), true);
  assert.equal(appJs.includes('data-document-action="edit"'), true);
  assert.equal(appJs.includes('data-document-action="delete"'), true);
  assert.equal(appJs.includes('data-document-action="migrate-legacy"'), true);
  assert.equal(appJs.includes('populateDocumentLogForm(entry)'), true);
  assert.equal(appJs.includes('await handleDocumentLogDelete(entryId)'), true);
  assert.equal(appJs.includes('await handleLegacyDocumentMigration()'), true);
  assert.equal(appJs.includes('function wireDocumentLogFormActions()'), true);
  assert.equal(appJs.includes('wireDocumentLogFormActions();'), true);
  assert.equal(appJs.includes('await handleDocumentLogCreate(event)'), true);
  assert.equal(appJs.includes('await handleHarnessDocumentSearch(event)'), true);
  assert.equal(appJs.includes('await handleHarnessDocumentFilter(event)'), true);
  assert.equal(appJs.includes('resetDocumentLogForm()'), true);
  assert.equal(appJs.includes('await handleDocumentLogFilePick(event)'), true);
  assert.equal(appJs.includes('function wireMemoryMutationActionButtons()'), true);
  assert.equal(appJs.includes('wireMemoryMutationActionButtons();'), true);
  assert.equal(appJs.includes('data-memory-action="edit"'), true);
  assert.equal(appJs.includes('data-memory-action="delete"'), true);
  assert.equal(appJs.includes('populateMemoryForm(scope, entry)'), true);
  assert.equal(appJs.includes('await handleMemoryDelete(scope, memoryId)'), true);
  assert.equal(appJs.includes('function wireMemoryBrowsePaginationButtons()'), true);
  assert.equal(appJs.includes('wireMemoryBrowsePaginationButtons();'), true);
  assert.equal(appJs.includes('data-memory-action="reset-browse"'), true);
  assert.equal(appJs.includes('data-memory-action="prev-page"'), true);
  assert.equal(appJs.includes('data-memory-action="next-page"'), true);
  assert.equal(appJs.includes('resetHarnessMemoryBrowseState()'), true);
  assert.equal(appJs.includes('state.harnessMemoryOffset = Math.max('), true);
  assert.equal(appJs.includes('state.harnessMemoryOffset += Number(state.harnessMemoryVisibleCount || 12)'), true);
  assert.equal(appJs.includes('function wireDocumentBrowsePaginationButtons()'), true);
  assert.equal(appJs.includes('wireDocumentBrowsePaginationButtons();'), true);
  assert.equal(appJs.includes('#document-log-sort'), true);
  assert.equal(appJs.includes('#document-log-limit'), true);
  assert.equal(appJs.includes("state.harnessDocumentSort = String(event.target.value || 'latest').trim() || 'latest'"), true);
  assert.equal(appJs.includes('state.harnessDocumentVisibleCount = Number(event.target.value || 12) || 12'), true);
  assert.equal(appJs.includes('data-document-action="reset-browse"'), true);
  assert.equal(appJs.includes('data-document-action="prev-page"'), true);
  assert.equal(appJs.includes('data-document-action="next-page"'), true);
  assert.equal(appJs.includes('resetHarnessDocumentBrowseState()'), true);
  assert.equal(appJs.includes('state.harnessDocumentOffset = Math.max('), true);
  assert.equal(appJs.includes('state.harnessDocumentOffset += Number(state.harnessDocumentVisibleCount || 12)'), true);
  assert.equal(appJs.includes('data-approval-approve'), true);
  assert.equal(appJs.includes("dataAttribute: 'data-approval-approve'"), true);
  assert.equal(appJs.includes("actionLabelPrefix: '승인'"), true);
  assert.equal(appJs.includes('function wireApprovalApproveButtons()'), true);
  assert.equal(appJs.includes('wireApprovalApproveButtons();'), true);
  assert.equal(appJs.includes("resolveApproval(button.dataset.approvalApprove, 'approve', reason)"), true);
  assert.equal(appJs.includes('data-approval-reject'), true);
  assert.equal(appJs.includes("dataAttribute: 'data-approval-reject'"), true);
  assert.equal(appJs.includes("actionLabelPrefix: '반려'"), true);
  assert.equal(appJs.includes('function wireApprovalRejectButtons()'), true);
  assert.equal(appJs.includes('wireApprovalRejectButtons();'), true);
  assert.equal(appJs.includes("resolveApproval(button.dataset.approvalReject, 'reject', reason)"), true);
  assert.equal(appJs.includes('data-mission-id'), true);
  assert.equal(appJs.includes("dataAttribute: 'data-mission-id'"), true);
  assert.equal(appJs.includes('function wireMissionListSelectionButtons()'), true);
  assert.equal(appJs.includes('wireMissionListSelectionButtons();'), true);
  assert.equal(appJs.includes("selectMission(button.dataset.missionId, { urlMode: 'push' })"), true);
  assert.equal(appJs.includes('data-session-id'), true);
  assert.equal(appJs.includes("dataAttribute: 'data-session-id'"), true);
  assert.equal(appJs.includes('function wireSessionListSelectionButtons()'), true);
  assert.equal(appJs.includes('wireSessionListSelectionButtons();'), true);
  assert.equal(appJs.includes("selectSession(button.dataset.sessionId, { urlMode: 'push' })"), true);
  assert.equal(appJs.includes('data-artifact-id'), true);
  assert.equal(appJs.includes("dataAttribute: 'data-artifact-id'"), true);
  assert.equal(appJs.includes('function wireSessionArtifactSelectionButtons()'), true);
  assert.equal(appJs.includes('wireSessionArtifactSelectionButtons();'), true);
  assert.equal(appJs.includes("loadArtifact(button.dataset.artifactId, { urlMode: 'push' })"), true);
  assert.equal(appJs.includes('function wireTimelineSessionSelectionButtons()'), true);
  assert.equal(appJs.includes('wireTimelineSessionSelectionButtons();'), true);
  assert.equal(appJs.includes("setActiveStep('step-output', { syncDetailTab: false, syncUrl: false })"), true);
  assert.equal(appJs.includes("setActiveDetailTab('artifacts', { urlMode: 'push' })"), true);
  assert.equal(appJs.includes('data-learning-promotion-resolve'), true);
  assert.equal(appJs.includes('data-learning-promotion-expire'), true);
  assert.equal(appJs.includes('data-learning-promotion-rollback'), true);
  assert.equal(appJs.includes('data-learning-promotion-remind'), true);
  assert.equal(appJs.includes('renderLearningPromotionActionButton'), true);
  assert.equal(appJs.includes('renderLearningPromotionAuditCopyButton'), true);
  assert.equal(appJs.includes('function renderLearningPromotionAuditCopyButton({'), true);
  assert.equal(appJs.includes('renderLearningPromotionAuditCopyButton({ candidateId })'), true);
  assert.equal(appJs.includes('data-learning-promotion-audit-copy="${escapeHtml(candidateId)}"'), true);
  assert.equal(appJs.includes("label: 'audit package 복사'"), true);
  assert.equal(appJs.includes('function wireActionInboxLearningPromotionAuditCopyButtons(items = [])'), true);
  assert.equal(appJs.includes('wireActionInboxLearningPromotionAuditCopyButtons(items);'), true);
  assert.equal(appJs.includes('copyLearningPromotionAuditPackage(item)'), true);
  assert.equal(appJs.includes('renderLearningPromotionResolveButton'), true);
  assert.equal(appJs.includes('function renderLearningPromotionResolveButton({'), true);
  assert.equal(appJs.includes('renderLearningPromotionResolveButton({'), true);
  assert.equal(appJs.includes('data-learning-promotion-resolve="${escapeHtml(candidateId)}" data-learning-promotion-decision="${escapeHtml(decision)}"'), true);
  assert.equal(appJs.includes('function wireActionInboxLearningPromotionResolveButtons(items = [])'), true);
  assert.equal(appJs.includes('wireActionInboxLearningPromotionResolveButtons(items);'), true);
  assert.equal(appJs.includes('/api/actions/learning-promotions/${encodeURIComponent(candidateId)}/resolve'), true);
  assert.equal(appJs.includes("target: item.proposalTarget || 'memory'"), true);
  assert.equal(appJs.includes("decision: 'approve'"), true);
  assert.equal(appJs.includes("decision: 'reject'"), true);
  assert.equal(appJs.includes("label: '학습 승인'"), true);
  assert.equal(appJs.includes("label: '학습 반려'"), true);
  assert.equal(appJs.includes("label: 'stop-condition 반려'"), true);
  assert.equal(appJs.includes('renderLearningPromotionExpireButton'), true);
  assert.equal(appJs.includes('function renderLearningPromotionExpireButton({'), true);
  assert.equal(appJs.includes('renderLearningPromotionExpireButton({ candidateId })'), true);
  assert.equal(appJs.includes('data-learning-promotion-expire="${escapeHtml(candidateId)}"'), true);
  assert.equal(appJs.includes('function wireActionInboxLearningPromotionExpireButtons(items = [])'), true);
  assert.equal(appJs.includes('wireActionInboxLearningPromotionExpireButtons(items);'), true);
  assert.equal(appJs.includes("await api('/api/actions/learning-promotions/expire'"), true);
  assert.equal(appJs.includes('before: item.expirationPolicy?.expiresAt || new Date().toISOString()'), true);
  assert.equal(appJs.includes("label: '대기 만료'"), true);
  assert.equal(appJs.includes('renderLearningPromotionRemindButton'), true);
  assert.equal(appJs.includes('function renderLearningPromotionRemindButton({'), true);
  assert.equal(appJs.includes('renderLearningPromotionRemindButton({ candidateId })'), true);
  assert.equal(appJs.includes('data-learning-promotion-remind="${escapeHtml(candidateId)}"'), true);
  assert.equal(appJs.includes('function wireActionInboxLearningPromotionRemindButtons(items = [])'), true);
  assert.equal(appJs.includes('wireActionInboxLearningPromotionRemindButtons(items);'), true);
  assert.equal(appJs.includes('/api/actions/learning-promotions/${encodeURIComponent(candidateId)}/remind'), true);
  assert.equal(appJs.includes('dueOnly: true'), true);
  assert.equal(appJs.includes("label: 'stop-condition 재알림'"), true);
  assert.equal(appJs.includes('renderLearningPromotionRollbackButton'), true);
  assert.equal(appJs.includes('function renderLearningPromotionRollbackButton({'), true);
  assert.equal(appJs.includes('renderLearningPromotionRollbackButton({ candidateId })'), true);
  assert.equal(appJs.includes('data-learning-promotion-rollback="${escapeHtml(candidateId)}"'), true);
  assert.equal(appJs.includes('function wireActionInboxLearningPromotionRollbackButtons(items = [])'), true);
  assert.equal(appJs.includes('wireActionInboxLearningPromotionRollbackButtons(items);'), true);
  assert.equal(appJs.includes('/api/actions/learning-promotions/${encodeURIComponent(candidateId)}/rollback'), true);
  assert.equal(appJs.includes('body: JSON.stringify({ note })'), true);
  assert.equal(appJs.includes("label: '학습 rollback'"), true);
  assert.equal(appJs.includes('${label}: learning candidate ${candidateId}'), true);
  assert.equal(appJs.includes('aria-label="${escapeHtml(actionLabel)}"'), true);
  assert.equal(appJs.includes('title="${escapeHtml(actionLabel)}"'), true);
  assert.equal(appJs.includes('data-action-inbox-filter'), true);
  assert.equal(appJs.includes('renderActionInboxSummaryChip'), true);
  assert.equal(appJs.includes('function renderActionInboxSummaryChip(label, value)'), true);
  assert.equal(appJs.includes('<div class="summary-chip"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value ?? 0))}</strong></div>'), true);
  assert.equal(appJs.includes("renderActionInboxSummaryChip('전체 작업', fullSummary.pendingActionCount)"), true);
  assert.equal(appJs.includes("renderActionInboxSummaryChip('표시 작업', summary.pendingActionCount)"), true);
  assert.equal(appJs.includes("renderActionInboxSummaryChip('재알림 필요', fullSummary.reminderCounts?.needsReminder)"), true);
  assert.equal(appJs.includes("renderActionInboxSummaryChip('기한 초과', fullSummary.overdueCounts?.overdue)"), true);
  assert.equal(appJs.includes("renderActionInboxSummaryChip('fallback stop', fallbackStopReasonFilter || 'all')"), true);
  assert.equal(appJs.includes('renderActionInboxSummary'), true);
  assert.equal(appJs.includes('function renderActionInboxSummary({'), true);
  assert.equal(appJs.includes('renderActionInboxSummary({'), true);
  assert.equal(appJs.includes('fallbackStopReasonFilter,'), true);
  assert.equal(appJs.includes('fallbackStopReasonOptions,'), true);
  assert.equal(appJs.includes('fallbackStopReasonPlaceholder,'), true);
  assert.equal(appJs.includes('hasFallbackStopReasonOptions,'), true);
  assert.equal(appJs.includes('hasSelectedMission,'), true);
  assert.equal(appJs.includes('renderActionInboxEmptyList'), true);
  assert.equal(appJs.includes('function renderActionInboxEmptyList({'), true);
  assert.equal(appJs.includes('renderActionInboxEmptyList({'), true);
  assert.equal(appJs.includes('후속 작업 큐가 비어 있습니다'), true);
  assert.equal(appJs.includes('${visibleFilterLabel} 항목이 없습니다'), true);
  assert.equal(appJs.includes('${visibleFilterLabel} 필터에 맞는 열린 후속 작업이 없습니다.'), true);
  assert.equal(appJs.includes('renderActionInboxUnavailableState'), true);
  assert.equal(appJs.includes('function renderActionInboxUnavailableState()'), true);
  assert.equal(appJs.includes('const unavailableState = renderActionInboxUnavailableState()'), true);
  assert.equal(appJs.includes('elements.actionSummary.innerHTML = unavailableState.summaryHtml'), true);
  assert.equal(appJs.includes('elements.actionList.innerHTML = unavailableState.listHtml'), true);
  assert.equal(appJs.includes('후속 작업 큐가 준비되지 않았습니다'), true);
  assert.equal(appJs.includes('표시할 액션이 없습니다'), true);
  assert.equal(appJs.includes('renderActionInboxCallout'), true);
  assert.equal(appJs.includes('function renderActionInboxCallout({'), true);
  assert.equal(appJs.includes('renderActionInboxCallout({'), true);
  assert.equal(appJs.includes('review-callout review-callout-action'), true);
  assert.equal(appJs.includes('후속 작업 ${escapeHtml(String(count))}건'), true);
  assert.equal(appJs.includes('전체 작업 수는 summary chip에서 유지됩니다.'), true);
  assert.equal(appJs.includes('renderActionInboxItemStatus'), true);
  assert.equal(appJs.includes('function renderActionInboxItemStatus(item = {})'), true);
  assert.equal(appJs.includes('renderActionInboxItemStatus(item)'), true);
  assert.equal(appJs.includes("const actionClass = item.actionClass || 'open'"), true);
  assert.equal(appJs.includes("const priority = item.priority || 'medium'"), true);
  assert.equal(appJs.includes('status-badge ${getStatusClass(actionClass)}'), true);
  assert.equal(appJs.includes('mini-badge ${getStatusClass(priority)}'), true);
  assert.equal(appJs.includes('renderActionInboxItemHeader'), true);
  assert.equal(appJs.includes('function renderActionInboxItemHeader(item = {})'), true);
  assert.equal(appJs.includes('renderActionInboxItemHeader(item)'), true);
  assert.equal(appJs.includes('item-title">${escapeHtml(item.title || item.actionId || item.id)}</div>'), true);
  assert.equal(appJs.includes("item-subtitle\">${escapeHtml(item.reason || '')}</div>"), true);
  assert.equal(appJs.includes("담당 ${escapeHtml(item.recommendedOwner || '-')}"), true);
  assert.equal(appJs.includes('기한 ${escapeHtml(formatDate(item.dueAt))}'), true);
  assert.equal(appJs.includes('renderActionInboxItemCommandMeta'), true);
  assert.equal(appJs.includes('function renderActionInboxItemCommandMeta(item = {})'), true);
  assert.equal(appJs.includes('renderActionInboxItemCommandMeta(item)'), true);
  assert.equal(appJs.includes('item.fallbackRecommendedCommand ? `fallback: ${item.fallbackRecommendedCommand}` :'), true);
  assert.equal(appJs.includes('recoverable-only: ${item.recoverableFallbackRecommendedCommand}'), true);
  assert.equal(appJs.includes("item.actionType === 'specialist-follow-up' ? formatSpecialistFollowUpRoute(item) : ''"), true);
  assert.equal(appJs.includes("item.actionType === 'learning-promotion' ? formatLearningPromotionDetails(item) : ''"), true);
  assert.equal(appJs.includes('<div class="${escapeHtml(className)}">${escapeHtml(value)}</div>'), true);
  assert.equal(appJs.includes('renderActionInboxItemActions'), true);
  assert.equal(appJs.includes('function renderActionInboxItemActions(item = {})'), true);
  assert.equal(appJs.includes('renderActionInboxItemActions(item)'), true);
  assert.equal(appJs.includes('const actionButtons = ['), true);
  assert.equal(appJs.includes("item.actionType === 'provider-attention' && item.fallbackRecommendedCommand"), true);
  assert.equal(appJs.includes("item.actionType === 'provider-attention' && item.recoverableFallbackRecommendedCommand"), true);
  assert.equal(appJs.includes("item.actionType === 'specialist-follow-up'"), true);
  assert.equal(appJs.includes("!['provider-attention', 'specialist-follow-up', 'learning-promotion'].includes(item.actionType)"), true);
  assert.equal(appJs.includes("item.actionType === 'reviewer-follow-up'"), true);
  assert.equal(appJs.includes("actionButtons.filter(Boolean).join('')"), true);
  assert.equal(appJs.includes('renderActionInboxItem'), true);
  assert.equal(appJs.includes('function renderActionInboxItem(item = {})'), true);
  assert.equal(appJs.includes('items.map((item) => renderActionInboxItem(item)).join'), true);
  assert.equal(appJs.includes('<div class="action-item">'), true);
  assert.equal(appJs.includes('renderLearningPromotionCommandMeta(item)'), true);
  assert.equal(appJs.includes('renderActionInboxItemActions(item)'), true);
  assert.equal(appJs.includes('renderActionInboxList'), true);
  assert.equal(appJs.includes('function renderActionInboxList({'), true);
  assert.equal(appJs.includes('renderActionInboxList({'), true);
  assert.equal(appJs.includes('count: items.length'), true);
  assert.equal(appJs.includes("items.map((item) => renderActionInboxItem(item)).join('')"), true);
  assert.equal(appJs.includes("aria-pressed=\"${active ? 'true' : 'false'}\""), true);
  assert.equal(appJs.includes('filterButtonTitle'), true);
  assert.equal(appJs.includes("${label} action 필터, ${countLabel}건"), true);
  assert.equal(appJs.includes('aria-label="${escapeHtml(filterButtonTitle)}"'), true);
  assert.equal(appJs.includes('action 필터'), true);
  assert.equal(appJs.includes('data-action-inbox-fallback-stop-filter'), true);
  assert.equal(appJs.includes('renderActionInboxFallbackStopFilterSelect'), true);
  assert.equal(appJs.includes('function renderActionInboxFallbackStopFilterSelect({'), true);
  assert.equal(appJs.includes('renderActionInboxFallbackStopFilterSelect({'), true);
  assert.equal(appJs.includes('const selectTitle = hasFallbackStopReasonOptions'), true);
  assert.equal(appJs.includes("'fallback stop reason 필터 선택'"), true);
  assert.equal(appJs.includes('<option value="">${escapeHtml(placeholder)}</option>'), true);
  assert.equal(appJs.includes('options: fallbackStopReasonOptions'), true);
  assert.equal(appJs.includes('data-action-inbox-fallback-stop-reset'), true);
  assert.equal(appJs.includes('data-action-inbox-clear-filters'), true);
  assert.equal(appJs.includes('data-action-inbox-copy-link'), true);
  assert.equal(appJs.includes('copyMissionActionsViewLink'), true);
  assert.equal(appJs.includes('providerFallbackStopReason'), true);
  assert.equal(appJs.includes('counts[activeReason] = 0'), true);
  assert.equal(appJs.includes("${hasFallbackStopReasonOptions ? '' : 'disabled'}"), true);
  assert.equal(appJs.includes('selectTitle'), true);
  assert.equal(appJs.includes('선택 가능한 fallback stop reason이 없습니다'), true);
  assert.equal(appJs.includes('aria-label="${escapeHtml(selectTitle)}"'), true);
  assert.equal(appJs.includes('fallbackStopReasonPlaceholder'), true);
  assert.equal(appJs.includes('fallback stop 전체'), true);
  assert.equal(appJs.includes('fallback stop 없음'), true);
  assert.equal(appJs.includes('stop 필터 초기화'), true);
  assert.equal(appJs.includes('renderActionInboxFallbackStopResetButton'), true);
  assert.equal(appJs.includes('renderActionInboxFallbackStopResetButton({ hasFallbackStopReason: Boolean(fallbackStopReasonFilter) })'), true);
  assert.equal(appJs.includes('초기화할 fallback stop 필터가 없습니다'), true);
  assert.equal(appJs.includes('aria-label="${escapeHtml(resetTitle)}"'), true);
  assert.equal(appJs.includes('필터 전체 초기화'), true);
  assert.equal(appJs.includes("${hasFallbackStopReason ? '' : 'disabled'}"), true);
  assert.equal(appJs.includes('aria-disabled="${hasFallbackStopReason ? \'false\' : \'true\'}"'), true);
  assert.equal(appJs.includes("${hasActiveFilter ? '' : 'disabled'}"), true);
  assert.equal(appJs.includes('aria-disabled="${hasActiveFilter ? \'false\' : \'true\'}"'), true);
  assert.equal(appJs.includes('renderActionInboxClearFiltersButton'), true);
  assert.equal(appJs.includes('renderActionInboxClearFiltersButton({ hasActiveFilter })'), true);
  assert.equal(appJs.includes('clearFiltersTitle'), true);
  assert.equal(appJs.includes('초기화할 action inbox 필터가 없습니다'), true);
  assert.equal(appJs.includes('aria-label="${escapeHtml(clearFiltersTitle)}"'), true);
  assert.equal(appJs.includes('renderActionInboxCopyLinkButton'), true);
  assert.equal(appJs.includes('renderActionInboxCopyLinkButton({ hasSelectedMission })'), true);
  assert.equal(appJs.includes("${hasSelectedMission ? '' : 'disabled'}"), true);
  assert.equal(appJs.includes('aria-disabled="${hasSelectedMission ? \'false\' : \'true\'}"'), true);
  assert.equal(appJs.includes('copyLinkTitle'), true);
  assert.equal(appJs.includes('선택된 mission이 없어 action inbox 링크를 복사할 수 없습니다'), true);
  assert.equal(appJs.includes('aria-label="${escapeHtml(copyLinkTitle)}"'), true);
  assert.equal(appJs.includes('현재 action 링크 복사'), true);
  assert.equal(appJs.includes('현재 action inbox 링크를 복사했습니다.'), true);
  assert.equal(appJs.includes("detailTab: 'reviews'"), true);
  assert.equal(appJs.includes("stepId: 'step-review'"), true);
  assert.equal(appJs.includes('getMissionActionsVisibleFilterLabel'), true);
  assert.equal(appJs.includes('hasActiveMissionActionsFilter'), true);
  assert.equal(appJs.includes('fallback stop ${fallbackStopReasonFilter}'), true);
  assert.equal(appJs.includes('${visibleFilterLabel} 항목이 없습니다'), true);
  assert.equal(appJs.includes('${visibleFilterLabel} 필터로 표시 중입니다'), true);
  assert.equal(appJs.includes('applyMissionActionsFilterUrlState'), true);
  assert.equal(appJs.includes("params.get('afilter')"), true);
  assert.equal(appJs.includes("params.get('afstop')"), true);
  assert.equal(appJs.includes("params.set('afilter', actionInboxFilter)"), true);
  assert.equal(appJs.includes("params.set('afstop', actionInboxFallbackStopReason)"), true);
  assert.equal(appJs.includes("state.missionActionsFilter = 'all'"), true);
  assert.equal(appJs.includes("params.delete('afilter')"), true);
  assert.equal(appJs.includes("params.delete('afstop')"), true);
  assert.equal(appJs.includes('stop-condition 반려'), true);
  assert.equal(appJs.includes('stop-condition 재알림'), true);
  assert.equal(appJs.includes('재알림 필요'), true);
  assert.equal(appJs.includes('표시 작업'), true);
  assert.equal(appJs.includes('missionActionsView'), true);
  assert.equal(appJs.includes('stopConditionRejectCommand'), true);
  assert.equal(appJs.includes('remindCommand'), true);
  assert.equal(appJs.includes('needsReminderOnly'), true);
  assert.equal(appJs.includes('overdueOnly'), true);
  assert.equal(appJs.includes('/api/actions/learning-promotions/expire'), true);
  assert.equal(appJs.includes('/api/actions/learning-promotions/${encodeURIComponent(candidateId)}/resolve'), true);
  assert.equal(appJs.includes('/api/actions/learning-promotions/${encodeURIComponent(candidateId)}/rollback'), true);
  assert.equal(appJs.includes('/api/actions/learning-promotions/${encodeURIComponent(candidateId)}/remind'), true);
  assert.equal(appJs.includes("promotionStatus: 'operator-active'"), true);
  assert.match(appJs, /\['provider-attention', 'specialist-follow-up', 'learning-promotion'\]/);

  const initialInbox = await fetchJson(
    `${baseUrl}/api/actions?missionId=${encodeURIComponent(promotedMission.id)}&promotionStatus=all`,
  );
  const initialItem = findLearningItem(initialInbox, promotedRun.learningCandidateId);
  assert.equal(initialItem.actionType, 'learning-promotion');
  assert.equal(initialItem.actionClass, 'awaiting-human-decision');
  assert.equal(initialItem.promotionStatus, 'pending-review');
  assert.equal(initialItem.gatewayEventRoute, 'mission.run');
  assert.equal(initialItem.gatewayEventType, 'mission-run');
  assert.equal(initialItem.providerId, 'stub');
  assert.equal(initialItem.autoPromotion, false);
  assert.equal(initialItem.autoPromotionAllowed, false);
  assert.equal(initialItem.approvalRequired, true);
  assert.equal(initialItem.evidencePolicy.scopeLocked, true);
  assert.equal(initialItem.evidencePolicy.promotionRequiresApproval, true);
  assert.equal(initialItem.resolveCommand.includes('resolve-learning-promotion'), true);
  assert.equal(initialItem.expireCommand.includes('expire-learning-promotions'), true);
  assert.equal(initialItem.rollbackEligible, false);

  const fallbackInbox = await fetchJson(
    `${baseUrl}/api/actions?missionId=${encodeURIComponent(fallbackMission.id)}&promotionStatus=all`,
  );
  const fallbackItem = findLearningItem(fallbackInbox, fallbackRun.learningCandidateId);
  assert.equal(fallbackItem.recordType, 'provider-lesson');
  assert.equal(fallbackItem.proposalTarget, 'provider-policy');
  assert.equal(fallbackItem.gatewayEventRoute, 'mission.run');
  assert.equal(fallbackItem.providerId, 'stub');
  assert.equal(fallbackItem.providerFallbackPolicy, 'provider-failure-only');
  assert.equal(fallbackItem.providerFallbackUsed, true);
  assert.equal(fallbackItem.providerFallbackPrimaryProviderId, 'anthropic');
  assert.equal(fallbackItem.providerFallbackSelectedProviderId, 'stub');
  assert.equal(fallbackItem.providerFallbackStopReasonCounts['mission-status-completed'], 1);
  assert.equal(fallbackItem.providerFailureKind, 'config');
  assert.equal(fallbackItem.providerFailureRecoverable, false);
  assert.equal(fallbackItem.autoPromotionAllowed, false);
  assert.equal(fallbackItem.rollbackEligible, false);

  const fallbackStopReasonInbox = await fetchJson(
    `${baseUrl}/api/actions?missionId=${encodeURIComponent(fallbackMission.id)}&promotionStatus=all&providerFallbackStopReason=mission-status-completed`,
  );
  assert.equal(fallbackStopReasonInbox.filters.providerFallbackStopReason, 'mission-status-completed');
  assert.equal(fallbackStopReasonInbox.items.length, 2);
  assert.ok(
    fallbackStopReasonInbox.items.every(
      (item) => item.providerFallbackStopReasonCounts['mission-status-completed'] > 0,
    ),
  );

  const emptyFallbackStopReasonInbox = await fetchJson(
    `${baseUrl}/api/actions?missionId=${encodeURIComponent(fallbackMission.id)}&promotionStatus=all&providerFallbackStopReason=unknown-stop-reason`,
  );
  assert.equal(emptyFallbackStopReasonInbox.filters.providerFallbackStopReason, 'unknown-stop-reason');
  assert.equal(emptyFallbackStopReasonInbox.items.length, 0);

  const promotionResult = await postJson(
    `${baseUrl}/api/actions/learning-promotions/${encodeURIComponent(promotedRun.learningCandidateId)}/resolve`,
    {
      decision: 'approve',
      note: 'Approve scoped memory promotion from the web operator surface.',
      scope: initialItem.scope,
      target: 'memory',
    },
  );
  assert.equal(promotionResult.learningCandidate.promotionStatus, 'promoted');
  assert.equal(promotionResult.learningCandidate.promotionDecision.decision, 'approve');
  assert.ok(promotionResult.memoryEntry.id);

  const promotedInbox = await fetchJson(
    `${baseUrl}/api/actions?missionId=${encodeURIComponent(promotedMission.id)}&promotionStatus=operator-active`,
  );
  const promotedItem = findLearningItem(promotedInbox, promotedRun.learningCandidateId);
  assert.equal(promotedItem.promotionStatus, 'promoted');
  assert.equal(promotedItem.rollbackEligible, true);
  assert.equal(promotedItem.rollbackCommand.includes('rollback-learning-promotion'), true);

  const rollbackResult = await postJson(
    `${baseUrl}/api/actions/learning-promotions/${encodeURIComponent(promotedRun.learningCandidateId)}/rollback`,
    {
      note: 'Rollback promoted memory from the web operator surface.',
    },
  );
  assert.equal(rollbackResult.learningCandidate.promotionStatus, 'rolled-back');
  assert.equal(rollbackResult.learningCandidate.promotionRollback.memoryRollbackStatus, 'memory-deleted');
  assert.equal(rollbackResult.removedMemoryEntry.id, promotionResult.memoryEntry.id);

  const rolledBackInbox = await fetchJson(
    `${baseUrl}/api/actions?missionId=${encodeURIComponent(promotedMission.id)}&promotionStatus=operator-active`,
  );
  assert.equal(
    rolledBackInbox.items.some((item) => item.learningCandidateId === promotedRun.learningCandidateId),
    false,
  );

  const expireInbox = await fetchJson(
    `${baseUrl}/api/actions?missionId=${encodeURIComponent(expiredMission.id)}&promotionStatus=all`,
  );
  const expiringItem = findLearningItem(expireInbox, expiredRun.learningCandidateId);
  const expirationResult = await postJson(`${baseUrl}/api/actions/learning-promotions/expire`, {
    before: expiringItem.expirationPolicy.expiresAt,
    missionId: expiringItem.missionId,
    note: 'Expire pending promotion from the web operator surface.',
    recordType: expiringItem.recordType,
    scope: expiringItem.scope,
    target: expiringItem.proposalTarget,
    workspaceId: expiringItem.workspaceId,
  });
  assert.equal(expirationResult.summary.expiredCount, 1);
  assert.equal(expirationResult.expiredCandidates[0].id, expiredRun.learningCandidateId);
  assert.equal(expirationResult.expiredCandidates[0].promotionStatus, 'expired');

  const expiredInbox = await fetchJson(
    `${baseUrl}/api/actions?missionId=${encodeURIComponent(expiredMission.id)}&promotionStatus=operator-active`,
  );
  assert.equal(expiredInbox.items.some((item) => item.learningCandidateId === expiredRun.learningCandidateId), false);

  const rejectInbox = await fetchJson(
    `${baseUrl}/api/actions?missionId=${encodeURIComponent(rejectedMission.id)}&promotionStatus=all`,
  );
  const rejectingItem = findLearningItem(rejectInbox, rejectedRun.learningCandidateId);
  const rejectResult = await postJson(
    `${baseUrl}/api/actions/learning-promotions/${encodeURIComponent(rejectedRun.learningCandidateId)}/resolve`,
    {
      decision: 'reject',
      note: 'Reject forced regression candidate from the web operator surface.',
      scope: rejectingItem.scope,
      target: rejectingItem.proposalTarget,
    },
  );
  assert.equal(rejectResult.learningCandidate.promotionStatus, 'rejected');
  assert.equal(rejectResult.learningCandidate.promotionDecision.decision, 'reject');
  assert.equal(rejectResult.memoryEntry, null);

  const rejectedActiveInbox = await fetchJson(
    `${baseUrl}/api/actions?missionId=${encodeURIComponent(rejectedMission.id)}&promotionStatus=operator-active`,
  );
  assert.equal(
    rejectedActiveInbox.items.some((item) => item.learningCandidateId === rejectedRun.learningCandidateId),
    false,
  );

  const blockedActiveInbox = await fetchJson(
    `${baseUrl}/api/actions?missionId=${encodeURIComponent(blockedMission.id)}&promotionStatus=operator-active`,
  );
  const blockedItem = findLearningItem(blockedActiveInbox, blockedRun.learningCandidateId);
  assert.equal(blockedItem.actionClass, 'blocked');
  assert.equal(blockedItem.priority, 'high');
  assert.equal(blockedItem.promotionStatus, 'verification-blocked');
  assert.equal(blockedItem.promotionVerificationStatus, 'failed');
  assert.equal(blockedItem.promotionStopReason, 'learning-promotion-verification-no-raw-secrets');
  assert.equal(blockedItem.recommendedCommand.includes('--decision reject'), true);
  assert.equal(blockedItem.stopConditionRejectCommand.includes('--decision reject'), true);
  assert.equal(blockedItem.reminderCadenceHours, 12);
  assert.equal(blockedItem.reminderCount, 0);
  assert.equal(blockedItem.needsReminder, true);
  assert.equal(blockedItem.nextReminderAt, '2000-01-01T12:00:00.000Z');
  assert.equal(blockedItem.remindCommand.includes('remind-learning-promotion-stop-conditions'), true);

  const needsReminderFilteredInbox = await fetchJson(
    `${baseUrl}/api/actions?missionId=${encodeURIComponent(blockedMission.id)}&promotionStatus=operator-active&needsReminderOnly=true`,
  );
  assert.equal(needsReminderFilteredInbox.summary.pendingActionCount, 1);
  assert.equal(needsReminderFilteredInbox.filters.needsReminderOnly, true);
  assert.equal(needsReminderFilteredInbox.items[0].learningCandidateId, blockedRun.learningCandidateId);
  assert.equal(needsReminderFilteredInbox.items[0].needsReminder, true);

  const blockedNeedsReminderFilteredInbox = await fetchJson(
    `${baseUrl}/api/actions?missionId=${encodeURIComponent(blockedMission.id)}&promotionStatus=operator-active&actionClass=blocked&needsReminderOnly=true`,
  );
  assert.equal(blockedNeedsReminderFilteredInbox.summary.pendingActionCount, 1);
  assert.equal(blockedNeedsReminderFilteredInbox.filters.actionClass, 'blocked');
  assert.equal(blockedNeedsReminderFilteredInbox.filters.needsReminderOnly, true);
  assert.equal(blockedNeedsReminderFilteredInbox.items[0].learningCandidateId, blockedRun.learningCandidateId);

  const overdueFilteredInbox = await fetchJson(
    `${baseUrl}/api/actions?missionId=${encodeURIComponent(blockedMission.id)}&promotionStatus=operator-active&overdueOnly=true`,
  );
  assert.equal(overdueFilteredInbox.summary.pendingActionCount, 1);
  assert.equal(overdueFilteredInbox.filters.overdueOnly, true);
  assert.equal(overdueFilteredInbox.items[0].learningCandidateId, blockedRun.learningCandidateId);

  const reminderResult = await postJson(
    `${baseUrl}/api/actions/learning-promotions/${encodeURIComponent(blockedRun.learningCandidateId)}/remind`,
    {
      dueOnly: true,
      missionId: blockedItem.missionId,
      note: 'Remind approver from the web operator surface before rejecting the blocked stop-condition.',
      workspaceId: blockedItem.workspaceId,
    },
  );
  assert.equal(reminderResult.summary.dueCandidateCount, 1);
  assert.equal(reminderResult.summary.remindedCount, 1);
  assert.equal(reminderResult.items[0].learningCandidateId, blockedRun.learningCandidateId);
  assert.equal(reminderResult.items[0].reminderCount, 1);
  assert.equal(reminderResult.items[0].needsReminder, false);
  assert.equal(
    reminderResult.items[0].latestReminder.note,
    'Remind approver from the web operator surface before rejecting the blocked stop-condition.',
  );

  const remindedBlockedInbox = await fetchJson(
    `${baseUrl}/api/actions?missionId=${encodeURIComponent(blockedMission.id)}&promotionStatus=operator-active`,
  );
  const remindedBlockedItem = findLearningItem(remindedBlockedInbox, blockedRun.learningCandidateId);
  assert.equal(remindedBlockedItem.promotionStatus, 'verification-blocked');
  assert.equal(remindedBlockedItem.reminderCount, 1);
  assert.equal(remindedBlockedItem.needsReminder, false);
  assert.ok(remindedBlockedItem.lastReminderAt);

  const afterReminderFilteredInbox = await fetchJson(
    `${baseUrl}/api/actions?missionId=${encodeURIComponent(blockedMission.id)}&promotionStatus=operator-active&needsReminderOnly=true`,
  );
  assert.equal(afterReminderFilteredInbox.summary.pendingActionCount, 0);
  assert.equal(afterReminderFilteredInbox.filters.needsReminderOnly, true);

  const remindedState = readState();
  const remindedCandidate = remindedState.learningCandidates.find(
    (candidate) => candidate.id === blockedRun.learningCandidateId,
  );
  assert.equal(remindedCandidate.promotionStopCondition.reminderCount, 1);
  assert.equal(remindedCandidate.promotionStopCondition.reminders.length, 1);

  const stopConditionRejectResult = await postJson(
    `${baseUrl}/api/actions/learning-promotions/${encodeURIComponent(blockedRun.learningCandidateId)}/resolve`,
    {
      decision: 'reject',
      note: 'Reject blocked stop-condition from the web operator surface.',
      scope: blockedItem.scope,
      target: blockedItem.proposalTarget,
    },
  );
  assert.equal(stopConditionRejectResult.learningCandidate.promotionStatus, 'rejected');
  assert.equal(stopConditionRejectResult.learningCandidate.promotionDecision.decision, 'blocked');
  assert.equal(stopConditionRejectResult.learningCandidate.promotionDecision.remediationDecision, 'reject');
  assert.equal(stopConditionRejectResult.learningCandidate.promotionStopCondition.status, 'resolved');
  assert.equal(stopConditionRejectResult.learningCandidate.promotionStopCondition.resolution, 'rejected');
  assert.equal(stopConditionRejectResult.learningCandidate.promotionStopCondition.reminderCount, 1);

  const closedBlockedActiveInbox = await fetchJson(
    `${baseUrl}/api/actions?missionId=${encodeURIComponent(blockedMission.id)}&promotionStatus=operator-active`,
  );
  assert.equal(
    closedBlockedActiveInbox.items.some((item) => item.learningCandidateId === blockedRun.learningCandidateId),
    false,
  );

  const blockedTimeline = runCli({
    rootDir: tempRoot,
    args: ['mission', 'timeline', blockedMission.id],
  });
  const reminderTimelineEvent = blockedTimeline.timeline.find(
    (event) =>
      event.kind === 'learning-candidate-promotion-stop-condition-reminded' &&
      event.learningCandidateId === blockedRun.learningCandidateId,
  );
  assert.ok(reminderTimelineEvent);
  assert.equal(reminderTimelineEvent.promotionStopReason, 'learning-promotion-verification-no-raw-secrets');

  console.log(
    JSON.stringify(
      {
        mode: 'ui-learning-promotion-surface',
        ok: true,
        blockedCandidateId: blockedRun.learningCandidateId,
        expiredCandidateId: expiredRun.learningCandidateId,
        fallbackCandidateId: fallbackRun.learningCandidateId,
        promotedCandidateId: promotedRun.learningCandidateId,
        rejectedCandidateId: rejectedRun.learningCandidateId,
        rolledBackCandidateId: promotedRun.learningCandidateId,
      },
      null,
      2,
    ),
  );
} finally {
  if (!serverProcess.killed) {
    serverProcess.kill('SIGTERM');
  }
  await waitForExit(serverProcess);
}

function createMission({ constraints = '', deliverable = 'decision-memo', objective, title }) {
  const args = [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'knowledge',
    '--deliverable',
    deliverable,
    '--title',
    title,
    '--objective',
    objective,
  ];
  if (constraints) {
    args.push('--constraints', constraints);
  }
  return runCli({ rootDir: tempRoot, args });
}

function readState() {
  return JSON.parse(fs.readFileSync(path.join(tempRoot, 'var', 'state.json'), 'utf8'));
}

function writeState(state) {
  fs.writeFileSync(path.join(tempRoot, 'var', 'state.json'), `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function findLearningItem(inbox, learningCandidateId) {
  const item = inbox.items.find((entry) => entry.learningCandidateId === learningCandidateId);
  assert.ok(item, `Expected learning promotion item for ${learningCandidateId}`);
  return item;
}

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to allocate a local port.'));
        return;
      }
      const { port: resolvedPort } = address;
      server.close(() => resolve(resolvedPort));
    });
    server.on('error', reject);
  });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed (${response.status}): ${url} ${body}`);
  }
  return await response.json();
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${url}`);
  }
  return await response.text();
}

async function postJson(url, payload) {
  return await fetchJson(url, {
    body: JSON.stringify(payload),
    headers: {
      'content-type': 'application/json',
    },
    method: 'POST',
  });
}

async function waitForServer(baseUrl, childProcess, output, { timeoutMs = 20_000 } = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (childProcess.exitCode !== null) {
      throw new Error(`UI server exited early: ${output.stdout}\n${output.stderr}`);
    }

    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until timeout.
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for UI server at ${baseUrl}`);
}

async function waitForExit(childProcess) {
  if (childProcess.exitCode !== null || childProcess.signalCode !== null) {
    return;
  }

  await new Promise((resolve) => {
    childProcess.once('exit', resolve);
  });
}
