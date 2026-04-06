const DELIVERABLES = {
  'decision-memo': {
    fileName: 'decision-memo.md',
    title: 'Decision Memo',
    sections: ['Context', 'Options', 'Recommendation', 'Why This Path', 'Next Actions'],
  },
  prd: {
    fileName: 'prd.md',
    title: 'Product Requirements Document',
    sections: ['Problem', 'Goals', 'Requirements', 'Acceptance Signals', 'Open Questions'],
  },
  'execution-plan': {
    fileName: 'execution-plan.md',
    title: 'Execution Plan',
    sections: ['Objective', 'Milestones', 'Owners', 'Dependencies', 'Risks'],
  },
  'research-brief': {
    fileName: 'research-brief.md',
    title: 'Research Brief',
    sections: ['Question', 'Findings', 'Evidence Gaps', 'Implications', 'Next Actions'],
  },
  checklist: {
    fileName: 'checklist.md',
    title: 'Checklist',
    sections: ['Objective', 'Checklist', 'Readiness Signals'],
  },
};

function renderSectionBody(sectionName) {
  if (sectionName === 'Checklist') {
    return '- [ ] confirm scope\n- [ ] gather context\n- [ ] draft first pass\n- [ ] review next action';
  }

  if (sectionName === 'Acceptance Signals' || sectionName === 'Readiness Signals') {
    return '- explicit success criteria\n- clear next owner\n- bounded follow-up';
  }

  return `- fill this section with grounded context for: ${sectionName.toLowerCase()}`;
}

export function renderKnowledgePack({ mission, workspace }) {
  const definition = DELIVERABLES[mission.deliverableType] || DELIVERABLES['decision-memo'];
  const artifactContent = `# ${definition.title}

## Mission
- title: ${mission.title}
- workspace: ${workspace.name}
- path: ${workspace.path}

## Objective
${mission.objective}

${definition.sections
  .map((sectionName) => `## ${sectionName}\n${renderSectionBody(sectionName)}`)
  .join('\n\n')}
`;

  const promptContent = `# Knowledge Mission Prompt

You are helping with a bounded knowledge-work task.

Workspace:
- name: ${workspace.name}
- path: ${workspace.path}

Mission:
- title: ${mission.title}
- objective: ${mission.objective}
- deliverable type: ${mission.deliverableType}

Required sections:
${definition.sections.map((sectionName) => `- ${sectionName}`).join('\n')}

Required output:
1. a grounded first draft
2. one explicit next action
3. open questions that still need human judgment
`;

  return {
    artifactContent,
    artifactFileName: definition.fileName,
    promptContent,
    promptFileName: 'prompt.md',
  };
}
