import { getEngineeringPack } from './engineering.mjs';
import { getKnowledgePack } from './knowledge.mjs';

export function getMissionPack({ mission, workspace }) {
  if (mission.mode === 'engineering') {
    return getEngineeringPack({ mission, workspace });
  }

  return getKnowledgePack({ mission, workspace });
}
