export const KNOWLEDGE_DELIVERABLES = {
  'decision-memo': {
    fileName: 'decision-memo.md',
    title: 'Decision Memo',
    requiredSections: ['Context', 'Options', 'Recommendation', 'Why This Path', 'Next Action'],
    reviewRules: [
      {
        id: 'decision-next-owner',
        description: 'Next Action must point to the next owner or review step.',
        pattern: /## Next Action[\s\S]*?(owner|review)/i,
        message: 'Next Action does not identify the next owner or review step.',
      },
    ],
  },
  prd: {
    fileName: 'prd.md',
    title: 'Product Requirements Document',
    requiredSections: ['Problem', 'Goals', 'Requirements', 'Acceptance Signals', 'Next Action'],
    reviewRules: [
      {
        id: 'prd-acceptance-signals',
        description: 'Acceptance Signals must include explicit success criteria.',
        pattern: /## Acceptance Signals[\s\S]*?success criteria/i,
        message: 'Acceptance Signals do not include explicit success criteria.',
      },
    ],
  },
  'execution-plan': {
    fileName: 'execution-plan.md',
    title: 'Execution Plan',
    requiredSections: ['Objective', 'Milestones', 'Owners', 'Dependencies', 'Next Action'],
    reviewRules: [
      {
        id: 'execution-plan-milestones',
        description: 'Milestones section must remain present with bounded guidance.',
        pattern: /## Milestones[\s\S]*?grounded context/i,
        message: 'Milestones section does not contain bounded milestone guidance.',
      },
    ],
  },
  'research-brief': {
    fileName: 'research-brief.md',
    title: 'Research Brief',
    requiredSections: ['Question', 'Findings', 'Evidence Gaps', 'Implications', 'Next Action'],
    reviewRules: [
      {
        id: 'research-brief-findings',
        description: 'Findings section must contain grounded findings language.',
        pattern: /## Findings[\s\S]*?grounded context/i,
        message: 'Findings section does not contain grounded findings language.',
      },
    ],
  },
  checklist: {
    fileName: 'checklist.md',
    title: 'Checklist',
    requiredSections: ['Objective', 'Checklist', 'Readiness Signals', 'Next Action'],
    reviewRules: [
      {
        id: 'checklist-checkboxes',
        description: 'Checklist section must contain at least one checkbox item.',
        pattern: /## Checklist[\s\S]*?- \[ \]/,
        message: 'Checklist section does not contain checkbox items.',
      },
    ],
  },
};

function renderSectionBody(sectionName, { deliverableType, forceRubricFail }) {
  if (sectionName === 'Checklist') {
    if (deliverableType === 'checklist' && forceRubricFail) {
      return '- gather scope\n- confirm readiness';
    }
    return '- [ ] confirm scope\n- [ ] gather context\n- [ ] draft first pass\n- [ ] review decision with owner';
  }

  if (sectionName === 'Acceptance Signals' || sectionName === 'Readiness Signals') {
    if (deliverableType === 'prd' && forceRubricFail && sectionName === 'Acceptance Signals') {
      return '- vague outcome\n- informal follow-up';
    }
    return '- explicit success criteria\n- clear decision owner\n- bounded follow-up';
  }

  if (sectionName === 'Next Action') {
    return '- assign the next owner\n- schedule the next review or implementation step';
  }

  return `- fill this section with grounded context for: ${sectionName.toLowerCase()}`;
}

export function getKnowledgePack({ mission, workspace }) {
  const definition = KNOWLEDGE_DELIVERABLES[mission.deliverableType] || KNOWLEDGE_DELIVERABLES['decision-memo'];

  return {
    artifactFileName: definition.fileName,
    artifactTitle: definition.title,
    deliverableType: mission.deliverableType,
    mode: 'knowledge',
    requiredSections: definition.requiredSections,
    reviewRules: definition.reviewRules,
    riskProfile: {
      actionKind: 'document-draft',
      approvalKind: null,
      requiresApproval: false,
      reason: 'Knowledge missions in v1 stay inside var/ and produce reviewable document drafts.',
      title: '',
    },
    plannerGuidance: [
      'Collect only the context required for a bounded first draft.',
      'Preserve the exact required section contract for the deliverable type.',
      'End with one explicit next action that requires human ownership.',
    ],
    renderDraft({ forceReviewerFail = false, forceRubricFail = false, adaptationNotes = [] }) {
      const sections = definition.requiredSections.filter((sectionName) => !(forceReviewerFail && sectionName === 'Next Action'));
      const adaptationSection = adaptationNotes.length
        ? `## Prior Memory Signals\n${adaptationNotes.map((note) => `- ${note}`).join('\n')}\n\n`
        : '';

      return `# ${definition.title}

## Mission
- title: ${mission.title}
- workspace: ${workspace.name}
- path: ${workspace.path}

## Objective
${mission.objective}

${adaptationSection}${sections
  .map(
    (sectionName) =>
      `## ${sectionName}\n${renderSectionBody(sectionName, {
        deliverableType: mission.deliverableType,
        forceRubricFail,
      })}`,
  )
  .join('\n\n')}
`;
    },
  };
}
