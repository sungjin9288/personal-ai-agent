const ENGINEERING_DELIVERABLE = {
  fileName: 'implementation-proposal.md',
  title: 'Implementation Proposal',
  requiredSections: ['Diagnosis', 'Implementation Plan', 'Verification Plan', 'Next Action', 'Risk Notes'],
  reviewRules: [
    {
      id: 'engineering-verification-plan',
      description: 'Verification Plan must mention a concrete smoke or test path.',
      pattern: /## Verification Plan[\s\S]*?(smoke|test)/i,
      message: 'Verification Plan does not mention a concrete smoke or test path.',
    },
    {
      id: 'engineering-approval-next-action',
      description: 'Next Action must explicitly call for approval before workspace execution.',
      pattern: /## Next Action[\s\S]*?approval/i,
      message: 'Next Action does not explicitly require approval before workspace execution.',
    },
  ],
};

function joinBullets(items, fallback) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) {
    return `- ${fallback}`;
  }

  return list.map((item) => `- ${item}`).join('\n');
}

export function getEngineeringPack({ mission, workspace }) {
  const constraints = mission.constraints.length ? mission.constraints : ['Keep blast radius small.'];

  return {
    artifactFileName: ENGINEERING_DELIVERABLE.fileName,
    artifactTitle: ENGINEERING_DELIVERABLE.title,
    deliverableType: mission.deliverableType || 'implementation-proposal',
    mode: 'engineering',
    requiredSections: ENGINEERING_DELIVERABLE.requiredSections,
    reviewRules: ENGINEERING_DELIVERABLE.reviewRules,
    riskProfile: {
      actionKind: 'workspace-shell',
      approvalKind: 'workspace_execution',
      requiresApproval: true,
      reason: `Engineering missions only produce bounded implementation proposals in v1. Applying shell or file changes against workspace ${workspace.path} requires explicit approval.`,
      title: `Approve engineering execution proposal for ${workspace.name}`,
    },
    plannerGuidance: [
      'Inspect the target workspace and identify the smallest safe change surface.',
      'Translate the objective into a bounded implementation and verification plan.',
      'Keep direct code mutation out of v1 execution. Produce an explicit proposal instead.',
    ],
    renderDraft({ planSteps, forceReviewerFail = false, forceRubricFail = false, adaptationNotes = [] }) {
      const nextActionSection = forceReviewerFail
        ? ''
        : `## Next Action\n${
            forceRubricFail
              ? `Request final review before moving ahead in ${workspace.path}.`
              : `Request explicit approval before running shell commands or mutating files in ${workspace.path}.`
          }`;

      const verificationLines = forceRubricFail
        ? '- confirm the proposal is readable\n- note remaining risks'
        : '- reproduce the target issue or flow\n- run the narrowest meaningful smoke/test path\n- capture explicit remaining risk after proposal review';

      const adaptationSection = adaptationNotes.length
        ? `## Prior Memory Signals\n${joinBullets(adaptationNotes, 'No prior mission memory recorded.')}\n\n`
        : '';

      return `# ${ENGINEERING_DELIVERABLE.title}

## Mission
- title: ${mission.title}
- workspace: ${workspace.name}
- path: ${workspace.path}

## Objective
${mission.objective}

${adaptationSection}## Diagnosis
- identify the smallest subsystem that can satisfy the mission objective
- confirm the verification surface before editing

## Constraints
${joinBullets(constraints, 'No explicit constraints recorded.')}

## Implementation Plan
${joinBullets(planSteps, 'Inspect repository shape and narrow the execution surface.')}

## Verification Plan
${verificationLines}

${nextActionSection}

## Risk Notes
- direct workspace mutation is intentionally deferred until approval
- repo-specific commands still need workspace-local validation before execution
`;
    },
  };
}
