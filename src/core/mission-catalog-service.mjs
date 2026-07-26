import path from 'node:path';

import {
  KNOWLEDGE_DELIVERABLE_TYPES,
  MISSION_MODES,
} from './constants.mjs';
import { createId } from './id.mjs';
import {
  inferMissionAttachmentMimeType,
  isSupportedMissionAttachment,
  normalizeMissionAttachmentFileName,
  sanitizeMissionAttachmentContent,
} from './mission-attachments.mjs';
import { resolveMissionParallelPlan } from './mission-parallel-plan.mjs';

const MAX_ATTACHMENT_CONTENT_CHARS = 12_000;
const ATTACHMENT_PREVIEW_CHARS = 280;

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function summarizeAttachmentText(content, fallback = '내용 없음') {
  const normalized = String(content || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return fallback;
  }

  return normalized.length > ATTACHMENT_PREVIEW_CHARS
    ? `${normalized.slice(0, ATTACHMENT_PREVIEW_CHARS - 1)}…`
    : normalized;
}

function getDefaultDeliverableType(mode, requestedType) {
  if (mode === 'engineering') {
    const normalized = normalizeText(requestedType, 'implementation-proposal');
    if (normalized !== 'implementation-proposal') {
      throw new Error(`Unsupported engineering deliverable type: ${normalized}`);
    }
    return normalized;
  }

  const normalized = normalizeText(requestedType, 'decision-memo');
  if (!KNOWLEDGE_DELIVERABLE_TYPES.includes(normalized)) {
    throw new Error(`Unsupported knowledge deliverable type: ${normalized}`);
  }

  return normalized;
}

export function createMissionCatalogService({
  fileSystem,
  now,
  recordGatewayEvent,
  store,
}) {
  function addWorkspace({ workspacePath, name, tenantId = '' }) {
    const normalizedPath = normalizeText(workspacePath);
    if (!normalizedPath) {
      throw new Error('워크스페이스 경로를 입력하세요.');
    }

    const resolvedPath = path.resolve(normalizedPath);
    if (!fileSystem.existsSync(resolvedPath)) {
      throw new Error(`워크스페이스 경로를 찾을 수 없습니다: ${resolvedPath}`);
    }
    if (!fileSystem.statSync(resolvedPath).isDirectory()) {
      throw new Error(`워크스페이스 경로는 디렉터리여야 합니다: ${resolvedPath}`);
    }

    const existingWorkspace = store
      .listWorkspaces()
      .find((workspace) => path.resolve(String(workspace.path || '')) === resolvedPath);

    if (existingWorkspace) {
      return existingWorkspace;
    }

    return store.saveWorkspace({
      id: createId('workspace'),
      name: normalizeText(name, path.basename(resolvedPath) || 'workspace'),
      path: resolvedPath,
      tenantId: normalizeText(tenantId),
      createdAt: now(),
    });
  }

  function getWorkspace(workspaceId) {
    const workspace = store.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    return workspace;
  }

  function getMission(missionId) {
    const mission = store.getMission(missionId);
    if (!mission) {
      throw new Error(`Mission not found: ${missionId}`);
    }

    return mission;
  }

  function normalizeAttachmentConversion(conversion) {
    const source = ensureObject(conversion);
    if (!Object.keys(source).length) {
      return null;
    }

    return {
      converted: Boolean(source.converted),
      converter: normalizeText(source.converter),
      extension: normalizeText(source.extension),
      sourcePath: normalizeText(source.sourcePath),
      truncated: Boolean(source.truncated),
    };
  }

  function buildMissionAttachmentRecord({
    content,
    conversion = null,
    fileName,
    mimeType,
    missionId,
    source = 'mission-upload',
  }) {
    const mission = getMission(missionId);
    const normalizedFileName = normalizeMissionAttachmentFileName(fileName);
    const normalizedMimeType = normalizeText(mimeType, inferMissionAttachmentMimeType(normalizedFileName));
    const normalizedContent = sanitizeMissionAttachmentContent(content);

    if (
      !isSupportedMissionAttachment({
        content: normalizedContent,
        fileName: normalizedFileName,
        mimeType: normalizedMimeType,
      })
    ) {
      throw new Error(
        `Unsupported attachment type for ${normalizedFileName}. Attach text-oriented files such as Markdown, text, JSON, CSV, logs, or source code.`,
      );
    }

    const createdAt = now();
    const originalCharCount = normalizedContent.length;
    const storedContent = normalizedContent.slice(0, MAX_ATTACHMENT_CONTENT_CHARS);
    const truncated = originalCharCount > storedContent.length;
    const attachmentId = createId('missionattachment');
    const storedFileName = `${attachmentId}-${normalizedFileName}`;
    const attachmentPath = store.writeArtifactContent({
      missionId: mission.id,
      fileName: path.join('attachments', storedFileName),
      content: storedContent,
    });

    return {
      charCount: originalCharCount,
      conversion: normalizeAttachmentConversion(conversion),
      createdAt,
      excerpt: summarizeAttachmentText(storedContent),
      fileName: normalizedFileName,
      id: attachmentId,
      lineCount: storedContent.split('\n').length,
      mimeType: normalizedMimeType,
      missionId: mission.id,
      path: attachmentPath,
      source: normalizeText(source, 'mission-upload'),
      storedCharCount: storedContent.length,
      truncated,
      updatedAt: createdAt,
    };
  }

  function addMissionAttachment(input) {
    return store.saveMissionAttachment(buildMissionAttachmentRecord(input));
  }

  function createMission(input) {
    const workspace = getWorkspace(input.workspaceId);
    const mode = normalizeText(input.mode, 'knowledge');

    if (!MISSION_MODES.includes(mode)) {
      throw new Error(`Unsupported mode: ${mode}`);
    }

    const createdAt = now();
    const mission = {
      id: createId('mission'),
      workspaceId: workspace.id,
      mode,
      title: normalizeText(input.title, 'Untitled mission'),
      objective: normalizeText(input.objective, 'Clarify the next best move.'),
      constraints: ensureArray(input.constraints)
        .map((item) => normalizeText(item))
        .filter(Boolean),
      deliverableType: getDefaultDeliverableType(mode, input.deliverableType),
      status: 'created',
      createdAt,
      updatedAt: createdAt,
    };

    resolveMissionParallelPlan(mission);
    const savedMission = store.saveMission(mission);

    for (const attachment of ensureArray(input.attachments)) {
      addMissionAttachment({
        content: attachment.content,
        conversion: attachment.conversion,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        missionId: savedMission.id,
        source: normalizeText(attachment.source, 'mission-create'),
      });
    }

    const { gatewayEvent } = recordGatewayEvent({
      eventType: 'mission-create',
      mission: savedMission,
      route: normalizeText(input.sourceContext?.route, 'mission.create'),
      sourceContext: input.sourceContext,
      workspace,
    });

    return store.updateMission(savedMission.id, (current) => ({
      ...current,
      gatewayEventId: gatewayEvent.id,
      gatewayEventSchemaVersion: gatewayEvent.schemaVersion,
      updatedAt: now(),
    }));
  }

  function listMissionAttachments(missionId) {
    getMission(missionId);
    return store.listMissionAttachments({ missionId });
  }

  function listMissions() {
    return store.listMissions();
  }

  return {
    addMissionAttachment,
    addWorkspace,
    createMission,
    getMission,
    getWorkspace,
    listMissionAttachments,
    listMissions,
  };
}
