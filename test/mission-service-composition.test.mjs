import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';

const PUBLIC_METHODS = [
  'acknowledgeOwnerHandoff',
  'acknowledgeProviderAttention',
  'addMemory',
  'addMissionAttachment',
  'addWorkspace',
  'authorizeLearningPromotionScope',
  'browseMissionHarnessDocuments',
  'browseMissionHarnessMemory',
  'checkProvider',
  'clearUserLearningSelectionOverride',
  'clearWorkspaceLearningSelectionOverride',
  'createMission',
  'deleteDocumentLog',
  'deleteMemory',
  'expireLearningPromotions',
  'getActionInbox',
  'getApprovalInbox',
  'getChannelAdapter',
  'getEscalatedInbox',
  'getExecutionLogs',
  'getExecutionStatus',
  'getGatewayEventAudit',
  'getGlobalOperatorTimeline',
  'getGlobalOverview',
  'getIdentitySessionAudit',
  'getLearningCandidateAudit',
  'getLearningPromotionQueue',
  'getMaintenanceOverview',
  'getMissionTimeline',
  'getOrchestrationProfilesOverview',
  'getOwnerHandoffInbox',
  'getProviderAttentionInbox',
  'getProviderEventTimeline',
  'getProviderExecutionHistory',
  'getProviderExecutionTimeline',
  'getProviderHealthDriftInbox',
  'getProviderOverview',
  'getProviderProbeTimeline',
  'getReviewerFollowUpInbox',
  'getSpecialistFollowUpInbox',
  'getUserLearningSelectionOverrideReadModel',
  'getWorkspace',
  'getWorkspaceOverview',
  'getWorkspaceTimeline',
  'listApprovals',
  'listChannelAdapters',
  'listFactGraph',
  'listMemory',
  'listMissionAttachments',
  'listMissions',
  'listProviderProbeHistory',
  'listProviders',
  'listSessions',
  'logDocument',
  'logOverdueActions',
  'migrateLegacyDocumentLogs',
  'preflightExecution',
  'probeProvider',
  'remediateProviderAttention',
  'remediateSpecialistFollowUp',
  'remindEscalations',
  'remindLearningPromotionStopConditions',
  'remindOwnerHandoffs',
  'remindProviderAttention',
  'remindSpecialistFollowUps',
  'resolveApproval',
  'resolveEscalation',
  'resolveLearningPromotion',
  'resolveProviderAttention',
  'resolveReviewerFollowUp',
  'rollbackExecution',
  'rollbackLearningPromotion',
  'runActionMaintenance',
  'runMission',
  'setUserLearningSelectionOverride',
  'setWorkspaceLearningSelectionOverride',
  'showMission',
  'showSession',
  'startExecution',
  'stopExecution',
  'syncEscalations',
  'updateDocumentLog',
  'updateMemory',
].sort();

test('createMissionService preserves the facade and exposes learning override actions', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-composition-'));

  try {
    const service = createMissionService({ rootDir, store: createStore({ rootDir }) });

    assert.deepEqual(Object.keys(service).sort(), PUBLIC_METHODS);
    assert.ok(Object.values(service).every((method) => typeof method === 'function'));
  } finally {
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
});
