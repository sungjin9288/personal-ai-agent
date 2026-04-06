function joinBullets(items) {
  if (!items.length) {
    return '- none recorded';
  }

  return items.map((item) => `- ${item}`).join('\n');
}

export function renderEngineeringPack({ mission, workspace }) {
  const constraints = mission.constraints.length ? mission.constraints : ['Keep blast radius small.'];
  const artifactContent = `# Engineering Plan

## Mission
- title: ${mission.title}
- workspace: ${workspace.name}
- path: ${workspace.path}

## Objective
${mission.objective}

## Constraints
${joinBullets(constraints)}

## Execution Plan
1. Inspect the target workspace and identify the smallest safe change surface.
2. Draft the implementation steps and the exact verification path before editing.
3. Execute the bounded change, then rerun the relevant checks.

## Verification
- reproduce the current issue or target flow
- run the narrowest meaningful smoke/test path
- capture remaining risks explicitly

## Risks
- model output may need a reviewer pass before code mutation
- repo-specific commands still need to be discovered from the target workspace
`;

  const promptContent = `# Engineering Mission Prompt

You are helping with a bounded engineering task.

Workspace:
- name: ${workspace.name}
- path: ${workspace.path}

Mission:
- title: ${mission.title}
- objective: ${mission.objective}

Constraints:
${joinBullets(constraints)}

Required output:
1. a concise diagnosis
2. a step-by-step implementation plan
3. a verification plan
4. explicit risks and open questions
`;

  return {
    artifactContent,
    artifactFileName: 'engineering-plan.md',
    promptContent,
    promptFileName: 'prompt.md',
  };
}
