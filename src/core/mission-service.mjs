import path from 'node:path';

import { createId } from './id.mjs';
import { renderEngineeringPack } from '../packs/engineering.mjs';
import { renderKnowledgePack } from '../packs/knowledge.mjs';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

export function createMissionService(store) {
  function addWorkspace({ workspacePath, name }) {
    const normalizedPath = normalizeText(workspacePath);
    if (!normalizedPath) {
      throw new Error('workspacePath is required.');
    }

    const existingWorkspace = store
      .listWorkspaces()
      .find((workspace) => workspace.path === normalizedPath);

    if (existingWorkspace) {
      return existingWorkspace;
    }

    return store.saveWorkspace({
      id: createId('workspace'),
      name: normalizeText(name, path.basename(normalizedPath) || 'workspace'),
      path: normalizedPath,
      createdAt: new Date().toISOString(),
    });
  }

  function createMission(input) {
    const workspace = store.getWorkspace(input.workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${input.workspaceId}`);
    }

    const mode = normalizeText(input.mode, 'knowledge');
    if (!['engineering', 'knowledge'].includes(mode)) {
      throw new Error(`Unsupported mode: ${mode}`);
    }

    const mission = {
      id: createId('mission'),
      workspaceId: workspace.id,
      mode,
      title: normalizeText(input.title, 'Untitled mission'),
      objective: normalizeText(input.objective, 'Clarify the next best move.'),
      constraints: Array.isArray(input.constraints)
        ? input.constraints.map((item) => normalizeText(item)).filter(Boolean)
        : [],
      deliverableType: mode === 'knowledge' ? normalizeText(input.deliverableType, 'decision-memo') : null,
      status: 'created',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      artifacts: [],
    };

    return store.saveMission(mission);
  }

  function runMission(missionId) {
    const mission = store.getMission(missionId);
    if (!mission) {
      throw new Error(`Mission not found: ${missionId}`);
    }

    const workspace = store.getWorkspace(mission.workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found for mission: ${mission.workspaceId}`);
    }

    const packOutput =
      mission.mode === 'engineering'
        ? renderEngineeringPack({ mission, workspace })
        : renderKnowledgePack({ mission, workspace });

    const promptPath = store.writeMissionArtifact(mission.id, packOutput.promptFileName, packOutput.promptContent);
    const artifactPath = store.writeMissionArtifact(
      mission.id,
      packOutput.artifactFileName,
      packOutput.artifactContent,
    );

    const nextMission = store.updateMission(mission.id, (currentMission) => ({
      ...currentMission,
      status: 'planned',
      updatedAt: new Date().toISOString(),
      lastRunAt: new Date().toISOString(),
      artifacts: [
        {
          kind: 'prompt',
          path: promptPath,
        },
        {
          kind: 'plan',
          path: artifactPath,
        },
      ],
    }));

    return {
      artifactPath,
      mission: nextMission,
      promptPath,
      workspace,
    };
  }

  return {
    addWorkspace,
    createMission,
    runMission,
  };
}
