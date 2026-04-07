import { loadAgentTemplate } from '../agents/loader.mjs';

function joinBullets(items, fallback) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) {
    return `- ${fallback}`;
  }

  return list.map((item) => `- ${item}`).join('\n');
}

function uniqueTexts(items) {
  return [...new Set(items.filter(Boolean))];
}

function deriveMemoryAdaptation(memoryEntries) {
  const relevantEntries = memoryEntries.filter((entry) => entry.scope === 'mission');
  const adaptationNotes = uniqueTexts(relevantEntries.map((entry) => entry.content));
  const adaptivePlanSteps = [];

  if (adaptationNotes.some((note) => /narrow the verification path/i.test(note))) {
    adaptivePlanSteps.push('Narrow the verification path before requesting workspace execution again.');
  }

  if (adaptationNotes.some((note) => /reviewer failed/i.test(note))) {
    adaptivePlanSteps.push('Address the prior reviewer finding before drafting the next proposal.');
  }

  if (!adaptivePlanSteps.length && adaptationNotes.length) {
    adaptivePlanSteps.push(`Incorporate the latest mission memory into the next draft: ${adaptationNotes[0]}`);
  }

  return {
    adaptationNotes,
    adaptivePlanSteps: uniqueTexts(adaptivePlanSteps),
  };
}

function buildPromptContext({
  mission,
  workspace,
  pack,
  memoryEntries,
  previousOutputs,
  parallelGroupId,
  parallelRequiredKinds,
  resumeFromRunId,
  specialistKind,
  specialistMergeMode,
}) {
  const memorySummary = memoryEntries.length
    ? memoryEntries.map((entry) => `- [${entry.scope}/${entry.kind}] ${entry.content}`).join('\n')
    : '- no memory entries loaded';

  const previousOutputSummary = Object.entries(previousOutputs || {})
    .filter(([key]) => key !== 'specialists')
    .map(([key, value]) => `## ${key}\n${value}`)
    .join('\n\n');
  const specialistSummary = Array.isArray(previousOutputs?.specialists) && previousOutputs.specialists.length
    ? previousOutputs.specialists
        .map(
          (item) =>
            `- ${item.specialistKind}: status=${item.status} summary=${item.summaryText || 'no summary'} path=${item.path || 'n/a'}`,
        )
        .join('\n')
    : '- no specialist branch outputs';
  const specialistArtifacts = Array.isArray(previousOutputs?.specialists) && previousOutputs.specialists.length
    ? previousOutputs.specialists
        .map(
          (item) =>
            `### ${item.specialistKind}\n- status: ${item.status}\n- path: ${item.path || 'n/a'}\n\n${item.content || '_no specialist artifact content_'}`,
        )
        .join('\n\n')
    : 'No specialist artifact content available.';
  const specialistContext = inputSpecialistContext({
    parallelGroupId,
    parallelRequiredKinds,
    resumeFromRunId,
    specialistKind,
    specialistMergeMode,
    workspace,
  });

  return `## Mission
- id: ${mission.id}
- title: ${mission.title}
- mode: ${mission.mode}
- deliverable: ${mission.deliverableType}
- objective: ${mission.objective}

## Workspace
- id: ${workspace.id}
- name: ${workspace.name}
- path: ${workspace.path}

## Constraints
${joinBullets(mission.constraints, 'No explicit constraints recorded.')}

## Required Sections
${joinBullets(pack.requiredSections, 'No required sections recorded.')}

## Memory
${memorySummary}

## Parallel Specialists
${specialistSummary}

## Specialist Artifacts
${specialistArtifacts}

${specialistContext}

${previousOutputSummary}`.trim();
}

function inputSpecialistContext({ parallelGroupId, parallelRequiredKinds, resumeFromRunId, specialistKind, specialistMergeMode, workspace }) {
  return [
    parallelGroupId ? `## Parallel Group\n- id: ${parallelGroupId}` : '',
    specialistKind ? `## Specialist\n- kind: ${specialistKind}\n- workspace: ${workspace.name}` : '',
    resumeFromRunId ? `## Resume\n- resumeFromRunId: ${resumeFromRunId}` : '',
    parallelRequiredKinds?.length
      ? `## Specialist Coverage\n- required: ${parallelRequiredKinds.join(', ')}`
      : '',
    specialistMergeMode ? `## Merge Mode\n- enabled: true` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function buildManagerOutput({ mission, workspace, pack, memoryEntries }) {
  const memorySummary = memoryEntries.length
    ? memoryEntries.map((entry) => `- ${entry.scope}/${entry.kind}: ${entry.content}`).join('\n')
    : '- no relevant memory found';

  return {
    type: 'manager',
    summaryText: `Session context established for ${mission.title}.`,
    artifactFileName: 'manager-context.md',
    artifactTitle: 'Manager Context',
    artifactContent: `# Manager Context

## Mission
- title: ${mission.title}
- workspace: ${workspace.name}
- mode: ${mission.mode}
- deliverable: ${mission.deliverableType}

## Objective
${mission.objective}

## Relevant Memory
${memorySummary}

## Governance
- approval likely: ${pack.riskProfile.requiresApproval ? 'yes' : 'no'}
- risk reason: ${pack.riskProfile.reason}
`,
  };
}

function buildPlannerOutput({ mission, workspace, pack, memoryEntries }) {
  const adaptation = deriveMemoryAdaptation(memoryEntries);
  const uniquePlanSteps = uniqueTexts([...pack.plannerGuidance, ...adaptation.adaptivePlanSteps]);
  const planSteps = uniquePlanSteps.map((item, index) => `${index + 1}. ${item}`);

  return {
    type: 'planner',
    summaryText: `Planner produced ${uniquePlanSteps.length} bounded steps for ${mission.title}.`,
    artifactFileName: 'planner-plan.md',
    artifactTitle: 'Planner Plan',
    artifactContent: `# Planner Plan

## Mission
- title: ${mission.title}
- workspace: ${workspace.name}
- deliverable: ${pack.deliverableType}

## Plan
${planSteps.join('\n')}

## Adaptation Signals
${joinBullets(adaptation.adaptationNotes, 'No prior mission memory influenced this plan.')}

## Verification Lens
- preserve the required sections exactly
- keep one explicit next action in the final artifact
- avoid direct workspace mutation in v1
`,
    adaptationNotes: adaptation.adaptationNotes,
    planSteps: uniquePlanSteps,
  };
}

function buildExecutorOutput({ mission, pack, previousOutputs, memoryEntries }) {
  const forceReviewerFail = mission.constraints.includes('force-reviewer-fail');
  const forceRubricFail = mission.constraints.includes('force-rubric-fail');
  const planSteps = previousOutputs.planner ? previousOutputs.planner.planSteps : pack.plannerGuidance;
  const adaptationNotes = previousOutputs.planner
    ? previousOutputs.planner.adaptationNotes
    : deriveMemoryAdaptation(memoryEntries).adaptationNotes;
  let artifactContent = pack.renderDraft({
    planSteps,
    forceReviewerFail,
    forceRubricFail,
    adaptationNotes,
  });

  if (Array.isArray(previousOutputs.specialists) && previousOutputs.specialists.length) {
    artifactContent = `${artifactContent.trim()}\n\n## Specialist Inputs\n${previousOutputs.specialists
      .map((item) => `- ${item.specialistKind}: ${item.summaryText || 'no summary available'}`)
      .join('\n')}\n`;
  }

  return {
    type: 'executor',
    summaryText: `Executor produced a ${pack.deliverableType} draft for ${mission.title}${
      adaptationNotes.length ? ' using prior mission memory' : ''
    }.`,
    artifactFileName: pack.artifactFileName,
    artifactTitle: pack.artifactTitle,
    artifactContent,
    proposedAction: {
      kind: pack.riskProfile.actionKind,
      requiresApproval: pack.riskProfile.requiresApproval,
      title: pack.riskProfile.title,
      reason: pack.riskProfile.reason,
    },
    adaptationNotes,
    nextAction: pack.riskProfile.requiresApproval
      ? 'Pause for approval before any workspace mutation.'
      : 'Share the draft with the owner and collect follow-up decisions.',
  };
}

function buildSpecialistOutput(input) {
  const baseOutput = buildExecutorOutput(input);
  const specialistKind = input.specialistKind || 'implementation';
  const title = `${specialistKind[0].toUpperCase()}${specialistKind.slice(1)} Specialist Draft`;

  return {
    ...baseOutput,
    artifactTitle: title,
    artifactContent: `${baseOutput.artifactContent.trim()}\n\n## Specialist Role\n- kind: ${specialistKind}\n`,
    summaryText: `${title} generated for ${input.mission.title}.`,
    type: 'executor',
  };
}

function buildReviewerOutput({ pack, previousOutputs }) {
  const artifactContent = previousOutputs.executor ? previousOutputs.executor.artifactContent : '';
  const missingSections = pack.requiredSections.filter((sectionName) => !artifactContent.includes(`## ${sectionName}`));
  const missingNextAction = !artifactContent.includes('## Next Action');
  const findings = [...missingSections.map((sectionName) => `Missing required section: ${sectionName}`)];
  const checks = [];

  if (missingNextAction) {
    findings.push('Missing required section: Next Action');
  }

  for (const rule of pack.reviewRules || []) {
    const passed = rule.pattern.test(artifactContent);
    checks.push({
      id: rule.id,
      description: rule.description,
      passed,
    });

    if (!passed) {
      findings.push(rule.message);
    }
  }

  const verdict = findings.length ? 'fail' : 'pass';

  return {
    type: 'reviewer',
    verdict,
    summaryText:
      verdict === 'pass'
        ? `Reviewer accepted the draft for ${pack.artifactTitle}.`
        : `Reviewer rejected the draft for ${pack.artifactTitle}.`,
    artifactFileName: 'reviewer-report.md',
    artifactTitle: 'Reviewer Report',
    artifactContent: `# Reviewer Report

## Verdict
- verdict: ${verdict}

## Checks
${joinBullets(
  checks.map((check) => `${check.passed ? 'pass' : 'fail'}: ${check.id} - ${check.description}`),
  'No additional rubric checks recorded.',
)}

## Findings
${joinBullets(findings, 'No findings. The draft preserves required sections and includes a next action.')}

## Next Action
${verdict === 'pass' ? '- continue to completion or approval gate' : '- revise the draft before proceeding'}
`,
    checks,
    findings,
  };
}

export function createStubProvider({ rootDir }) {
  return {
    id: 'stub',
    implemented: true,
    preparePrompt(input) {
      const template = loadAgentTemplate({ rootDir, role: input.role });
      const context = buildPromptContext(input);

      return `${template.trim()}

${context}
`;
    },
    run(input) {
      if (input.role === 'manager') {
        return buildManagerOutput(input);
      }

      if (input.role === 'planner') {
        return buildPlannerOutput(input);
      }

      if (input.role === 'specialist') {
        return buildSpecialistOutput(input);
      }

      if (input.role === 'executor') {
        return buildExecutorOutput(input);
      }

      if (input.role === 'reviewer') {
        return buildReviewerOutput(input);
      }

      throw new Error(`Unsupported stub role: ${input.role}`);
    },
    async probe() {
      return {
        attemptCount: 1,
        attemptHistory: [
          {
            attempt: 1,
            durationMs: 0,
            failureKind: null,
            httpStatus: 200,
            ok: true,
            rawMessage: null,
            recoverable: false,
            timedOut: false,
          },
        ],
        checkedAt: new Date().toISOString(),
        durationMs: 0,
        endpoint: 'in-process',
        modelAvailable: true,
        modelCount: 1,
        note: 'Stub provider is deterministic and does not require network connectivity.',
        ok: true,
        retryCount: 0,
        sampleModels: ['stub'],
        transport: 'deterministic-local',
      };
    },
    normalizeOutput(output) {
      return output;
    },
  };
}
