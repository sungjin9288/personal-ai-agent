#!/usr/bin/env node
import path from 'node:path';
import { createMissionService } from '../src/core/mission-service.mjs';
import { resolveRootDir } from '../src/core/root.mjs';
import { createStore } from '../src/core/store.mjs';

function readOption(args, name, fallback = '') {
  const index = args.indexOf(name);
  if (index === -1) {
    return fallback;
  }

  return args[index + 1] || fallback;
}

function hasOption(args, name) {
  return args.includes(name);
}

function parseConstraints(rawValue) {
  return String(rawValue || '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

function printJson(payload) {
  console.log(JSON.stringify(payload, null, 2));
}

async function main() {
  const rootDir = resolveRootDir();
  const store = createStore({ rootDir });
  const service = createMissionService({ store, rootDir });
  const args = process.argv.slice(2);

  const workspacePath = readOption(args, '--workspace', process.cwd());
  const name = readOption(args, '--name', '');
  const mode = readOption(args, '--mode', 'knowledge');
  const title = readOption(args, '--title', 'Bootstrap dry run');
  const objective = readOption(args, '--objective', 'Validate the local managed run flow.');
  const deliverableType = readOption(args, '--deliverable', '');
  const constraints = parseConstraints(readOption(args, '--constraints', ''));
  const provider = readOption(args, '--provider', 'stub');
  const shouldRun = hasOption(args, '--run');

  const workspace = service.addWorkspace({
    workspacePath: path.resolve(workspacePath),
    name,
  });

  const mission = service.createMission({
    workspaceId: workspace.id,
    mode,
    title,
    objective,
    constraints,
    deliverableType,
  });

  const result = {
    workspace,
    mission,
  };

  if (shouldRun) {
    result.run = await service.runMission(mission.id, {
      provider,
      providerSpecified: hasOption(args, '--provider'),
    });
  }

  printJson(result);
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
