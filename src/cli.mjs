#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createStore } from './core/store.mjs';
import { createMissionService } from './core/mission-service.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function readOption(args, name, fallback = '') {
  const index = args.indexOf(name);
  if (index === -1) {
    return fallback;
  }

  return args[index + 1] || fallback;
}

function printHelp() {
  console.log(`Personal AI Agent

Commands:
  workspace add <path> [--name <name>]
  workspace list
  mission create --workspace <workspaceId> --mode <engineering|knowledge> --title <title> [--objective <text>] [--deliverable <type>] [--constraints <text>]
  mission run <missionId>
  mission show <missionId>
`);
}

function printJson(payload) {
  console.log(JSON.stringify(payload, null, 2));
}

function main() {
  const args = process.argv.slice(2);
  const [group, command, ...rest] = args;

  const store = createStore({ rootDir: repoRoot });
  const service = createMissionService(store);

  if (!group) {
    printHelp();
    return;
  }

  if (group === 'workspace' && command === 'add') {
    const workspacePath = rest[0];
    const workspace = service.addWorkspace({
      workspacePath,
      name: readOption(rest, '--name', ''),
    });
    printJson(workspace);
    return;
  }

  if (group === 'workspace' && command === 'list') {
    printJson(store.listWorkspaces());
    return;
  }

  if (group === 'mission' && command === 'create') {
    const constraints = readOption(rest, '--constraints', '')
      .split('|')
      .map((item) => item.trim())
      .filter(Boolean);

    const mission = service.createMission({
      workspaceId: readOption(rest, '--workspace'),
      mode: readOption(rest, '--mode', 'knowledge'),
      title: readOption(rest, '--title', 'Untitled mission'),
      objective: readOption(rest, '--objective', 'Clarify the next best move.'),
      deliverableType: readOption(rest, '--deliverable', 'decision-memo'),
      constraints,
    });
    printJson(mission);
    return;
  }

  if (group === 'mission' && command === 'run') {
    const missionId = rest[0];
    const result = service.runMission(missionId);
    printJson({
      missionId: result.mission.id,
      status: result.mission.status,
      promptPath: result.promptPath,
      artifactPath: result.artifactPath,
    });
    return;
  }

  if (group === 'mission' && command === 'show') {
    const mission = store.getMission(rest[0]);
    if (!mission) {
      throw new Error(`Mission not found: ${rest[0]}`);
    }

    printJson(mission);
    return;
  }

  printHelp();
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
