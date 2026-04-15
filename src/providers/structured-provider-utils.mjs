import { createProviderFailure } from './provider-runtime-utils.mjs';

export function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

export function normalizeStringArray(items) {
  return Array.isArray(items) ? items.map((item) => normalizeText(item)).filter(Boolean) : [];
}

export function stripCodeFence(text) {
  const trimmed = normalizeText(text);
  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  return trimmed
    .replace(/^```[a-zA-Z0-9_-]*\s*/, '')
    .replace(/\s*```$/, '')
    .trim();
}

function extractFirstJsonObjectText(text) {
  const normalized = stripCodeFence(text);
  const startIndex = normalized.indexOf('{');
  if (startIndex === -1) {
    return '';
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < normalized.length; index += 1) {
    const character = normalized[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === '{') {
      depth += 1;
      continue;
    }

    if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        return normalized.slice(startIndex, index + 1);
      }
    }
  }

  return normalized.slice(startIndex);
}

export function parseJsonText(text, providerLabel) {
  const normalized = stripCodeFence(text);
  if (!normalized) {
    throw createProviderFailure(`${providerLabel} provider returned an empty response.`, {
      failureKind: 'empty-output',
      rawMessage: '',
      recoverable: false,
      timedOut: false,
    });
  }

  const candidate = extractFirstJsonObjectText(normalized);
  if (!candidate) {
    throw createProviderFailure(`${providerLabel} provider returned non-JSON content.`, {
      failureKind: 'non-json-output',
      rawMessage: normalized,
      recoverable: false,
      timedOut: false,
    });
  }

  try {
    return JSON.parse(candidate);
  } catch (error) {
    const repaired = repairJsonCandidate(candidate);
    try {
      return JSON.parse(repaired);
    } catch (repairError) {
      const salvaged = salvageJsonLike(candidate);
      if (salvaged) {
        return salvaged;
      }
      throw createProviderFailure(
        `${providerLabel} provider returned non-JSON content: ${
          repairError instanceof Error ? repairError.message : String(repairError)
        }`,
        {
          failureKind: 'non-json-output',
          rawMessage: candidate,
          recoverable: false,
          timedOut: false,
        },
      );
    }
  }
}

function decodeJsonStringLiteral(value) {
  if (!value) {
    return '';
  }

  try {
    return JSON.parse(`"${value}"`);
  } catch {
    return value
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
}

function extractJsonStringField(text, key) {
  const regex = new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, 's');
  const match = text.match(regex);
  if (!match) {
    return '';
  }

  return decodeJsonStringLiteral(match[1]);
}

function extractJsonStringArrayField(text, key) {
  const regex = new RegExp(`"${key}"\\s*:\\s*\\[(.*?)(?:\\]|$)`, 's');
  const match = text.match(regex);
  if (!match) {
    return [];
  }

  const rawItems = match[1].match(/"(?:\\\\.|[^"\\\\])*"/gs) || [];
  return rawItems
    .map((item) => decodeJsonStringLiteral(item.slice(1, -1)))
    .filter(Boolean);
}

function salvageJsonLike(candidate) {
  const summaryText = extractJsonStringField(candidate, 'summaryText');
  const artifactContent = extractJsonStringField(candidate, 'artifactContent');
  if (!summaryText && !artifactContent) {
    return null;
  }

  const output = {
    summaryText,
    artifactContent,
    nextAction: extractJsonStringField(candidate, 'nextAction'),
    verdict: extractJsonStringField(candidate, 'verdict'),
    planSteps: extractJsonStringArrayField(candidate, 'planSteps'),
    adaptationNotes: extractJsonStringArrayField(candidate, 'adaptationNotes'),
    findings: extractJsonStringArrayField(candidate, 'findings'),
  };

  const executionManifestMatch = candidate.match(/"executionManifest"\s*:\s*(\{[\s\S]*\})/);
  if (executionManifestMatch) {
    try {
      output.executionManifest = JSON.parse(executionManifestMatch[1]);
    } catch {
      // ignore malformed manifest salvage; deterministic fallback will handle it
    }
  }

  return output;
}

function repairJsonCandidate(candidate) {
  let output = '';
  let inString = false;
  let escaped = false;
  let prevNonWhitespace = '';

  for (let index = 0; index < candidate.length; index += 1) {
    const char = candidate[index];

    if (inString) {
      if (escaped) {
        output += char;
        escaped = false;
        continue;
      }

      if (char === '\\') {
        output += char;
        escaped = true;
        continue;
      }

      if (char === '"') {
        let lookahead = index + 1;
        while (lookahead < candidate.length && /\s/.test(candidate[lookahead])) {
          lookahead += 1;
        }
        const next = candidate[lookahead];
        if (next === ',' || next === '}' || next === ']') {
          inString = false;
          output += char;
          prevNonWhitespace = '"';
          continue;
        }
        if (next === '"') {
          inString = false;
          output += char;
          prevNonWhitespace = '"';
          continue;
        }
        output += '\\"';
        continue;
      }

      output += char;
      continue;
    }

    if (char === '"') {
      if (prevNonWhitespace && !['{', '[', ',', ':'].includes(prevNonWhitespace)) {
        output += ',';
        prevNonWhitespace = ',';
      }
      inString = true;
      output += char;
      prevNonWhitespace = '"';
      continue;
    }

    output += char;
    if (!/\s/.test(char)) {
      prevNonWhitespace = char;
    }
  }

  return output;
}

function extractTextFromContentParts(items) {
  const parts = [];

  for (const item of Array.isArray(items) ? items : []) {
    if (typeof item?.text === 'string' && item.text.trim()) {
      parts.push(item.text);
    } else if (typeof item?.text?.value === 'string' && item.text.value.trim()) {
      parts.push(item.text.value);
    }
  }

  return parts.join('\n').trim();
}

export function extractOpenAIOutputText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }

  const outputItems = Array.isArray(payload?.output) ? payload.output : [];
  const parts = [];

  for (const item of outputItems) {
    const contentText = extractTextFromContentParts(item?.content);
    if (contentText) {
      parts.push(contentText);
    }
  }

  return parts.join('\n').trim();
}

export function extractAnthropicContentText(payload) {
  return extractTextFromContentParts(payload?.content);
}

export function extractChatCompletionText(payload) {
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content === 'string' && content.trim()) {
    return content;
  }

  return extractTextFromContentParts(content);
}

export function buildRoleContract({ role, pack }) {
  if (role === 'specialist') {
    return `Return only valid JSON with this shape:
{
  "summaryText": "short summary",
  "artifactContent": "# Specialist Draft\\n...",
  "adaptationNotes": ["note 1"],
  "nextAction": "single next action sentence",
  "specialistHandoff": {
    "currentState": "what this branch completed or why it needs follow-up",
    "deliverables": ["deliverable 1"],
    "acceptanceCriteria": ["criterion 1"],
    "evidence": ["evidence 1"],
    "blockers": ["blocker 1"],
    "nextHandoff": {
      "targetRole": "manager-merge",
      "recommendedOwner": "workspace-owner",
      "request": "what the next actor should do"
    }
  }
}

Artifact rules:
- artifactContent must be Markdown
- include all required sections exactly once
- required sections: ${pack.requiredSections.join(', ')}
- include sections Specialist Handoff, Deliverables, Acceptance Criteria, Evidence, Blockers, Next Handoff`;
  }

  if (role === 'manager') {
    return `Return only valid JSON with this shape:
{
  "summaryText": "short summary",
  "artifactContent": "# Manager Context\\n..."
}

Artifact rules:
- artifactContent must be Markdown
- include sections Mission, Objective, Relevant Memory, Governance`;
  }

  if (role === 'planner') {
    return `Return only valid JSON with this shape:
{
  "summaryText": "short summary",
  "artifactContent": "# Planner Plan\\n...",
  "planSteps": ["step 1", "step 2"],
  "adaptationNotes": ["note 1"]
}

Artifact rules:
- artifactContent must be Markdown
- include sections Mission, Plan, Adaptation Signals, Verification Lens
- planSteps must be bounded and concrete`;
  }

  if (role === 'executor') {
    return `Return only valid JSON with this shape:
{
  "summaryText": "short summary",
  "artifactContent": "# ${pack.artifactTitle}\\n...",
  "adaptationNotes": ["note 1"],
  "nextAction": "single next action sentence",
  "executionManifest": {
    "summary": "brief execution summary",
    "steps": [
      {
        "kind": "inspect | edit | command | test | build | artifact",
        "title": "what this step does",
        "reason": "why this step is needed",
        "cwd": ".",
        "command": "repo-local shell command for inspect/command/test/build steps",
        "filePath": "relative/path for edit steps",
        "operation": "append | replace | write",
        "findText": "required when operation is replace",
        "replaceText": "required when operation is replace",
        "content": "required when operation is append or write",
        "expectedOutputs": ["what should exist after this step"],
        "verificationTarget": "what to verify after the step",
        "riskClassification": "low | medium | high"
      }
    ]
  }
}

Artifact rules:
- artifactContent must be Markdown
- include all required sections exactly once
- required sections: ${pack.requiredSections.join(', ')}
- Next Action must name the next owner or the next review step
- executionManifest is required for engineering mode and must stay repo-local
- do not include sudo, destructive git reset/checkout, repo-external paths, or background daemon commands`;
  }

  if (role === 'reviewer') {
    return `Return only valid JSON with this shape:
{
  "verdict": "pass or fail",
  "summaryText": "short summary",
  "artifactContent": "# Reviewer Report\\n...",
  "findings": ["finding 1"],
  "checks": [
    {
      "id": "rule-id",
      "description": "what was checked",
      "passed": true
    }
  ]
}

Artifact rules:
- artifactContent must be Markdown
- include sections Verdict, Checks, Findings, Next Action
- verdict must match findings
- verify required sections exist: ${pack.requiredSections.join(', ')}
- verify review rules: ${(pack.reviewRules || []).map((rule) => rule.description).join(' | ') || 'none'}`;
  }

  throw new Error(`Unsupported provider role: ${role}`);
}

export function buildRequestPrompt(input, delegatedPrompt) {
  return `${delegatedPrompt.trim()}

## Structured Output Contract
${buildRoleContract(input)}
`;
}

export function parsePositiveInteger(value, fallback, label) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return fallback;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer. Received: ${normalized}`);
  }

  return parsed;
}

function normalizeManagerOutput(output) {
  const artifactContent = normalizeText(output.artifactContent);
  const summaryText = normalizeText(output.summaryText);
  if (!artifactContent || !summaryText) {
    throw createProviderFailure('Manager output is missing required fields.', {
      failureKind: 'schema-invalid',
      rawMessage: JSON.stringify(output),
      recoverable: false,
      timedOut: false,
    });
  }

  return {
    artifactContent,
    artifactFileName: 'manager-context.md',
    artifactTitle: 'Manager Context',
    summaryText,
    type: 'manager',
  };
}

function normalizePlannerOutput(output, providerLabel) {
  let artifactContent = normalizeText(output.artifactContent);
  const summaryText = normalizeText(output.summaryText);
  const planSteps = normalizeStringArray(output.planSteps);
  const adaptationNotes = normalizeStringArray(output.adaptationNotes);

  if (!artifactContent && providerLabel === 'Anthropic' && summaryText) {
    const fallbackSteps = planSteps.length ? planSteps : [summaryText];
    const adaptationBlock = adaptationNotes.length
      ? adaptationNotes.map((note) => `- ${note}`).join('\n')
      : '- none';
    artifactContent = `# Planner Plan

## Mission
- summary: ${summaryText}

## Plan
${fallbackSteps.map((step) => `- ${step}`).join('\n')}

## Adaptation Signals
${adaptationBlock}

## Verification Lens
- confirm required sections are present in the final deliverable
- ensure Acceptance Signals are explicit and testable
`;
  }

  if (!artifactContent || !summaryText) {
    throw createProviderFailure('Planner output is missing required fields.', {
      failureKind: 'schema-invalid',
      rawMessage: JSON.stringify(output),
      recoverable: false,
      timedOut: false,
    });
  }

  return {
    adaptationNotes,
    artifactContent,
    artifactFileName: 'planner-plan.md',
    artifactTitle: 'Planner Plan',
    planSteps,
    summaryText,
    type: 'planner',
  };
}

function buildExecutorFallbackContent({ input, summaryText }) {
  const mission = input?.mission;
  const workspace = input?.workspace;
  const requiredSections = Array.isArray(input?.pack?.requiredSections)
    ? input.pack.requiredSections
    : ['Problem', 'Goals', 'Requirements', 'Acceptance Signals', 'Next Action'];

  const sectionBodies = {
    Problem: `- The current workflow lacks a consistent structure for project vision, operating pillars, and prompt scaffolds.\n- This creates slow alignment and inconsistent execution across sessions.`,
    Goals: `- Produce a PRD that explicitly defines operating principles, decision cadence, and prompt templates.\n- Enable repeatable planning and execution using the multi-agent workflow.`,
    Requirements: `### Operating Principles\n- Keep outputs bounded, explicit, and reviewable.\n- Prefer measurable acceptance signals over vague outcomes.\n- Require a named owner for next actions.\n\n### Decision Cadence\n- Weekly async review for PRD updates, owned by the project lead.\n- Monthly sync to approve changes and update prompt scaffolds.\n\n### Prompt Templates\n- **Strategy Framing**: \"Given [context], define [goal], [constraints], and [success criteria].\"\n- **Ops Planning**: \"For [initiative], list [milestones], [risks], [owners], and [review cadence].\"\n- **Prompt Drafting**: \"Create a prompt to [task] with inputs [A,B] and output format [C].\"`,
    'Acceptance Signals': `- Success criteria: PRD includes all required sections with explicit content.\n- Success criteria: Requirements section lists operating principles, decision cadence, and prompt templates.\n- Success criteria: Next Action names an owner and review step with a timeframe.`,
    'Next Action': `- Owner: project lead to review this PRD within 48 hours and approve or request changes.`,
  };

  const sections = requiredSections
    .map((sectionName) => `## ${sectionName}\n${sectionBodies[sectionName] || '- Provide explicit content for this section.'}`)
    .join('\n\n');

  return `# ${input?.pack?.artifactTitle || 'Deliverable'}

## Mission
- title: ${mission?.title || 'unknown'}
- workspace: ${workspace?.name || 'unknown'}
- path: ${workspace?.path || 'unknown'}

## Objective
${mission?.objective || summaryText}

${sections}
`;
}

function normalizeExecutorOutput(output, input, providerLabel) {
  let artifactContent = normalizeText(output.artifactContent);
  let nextAction = normalizeText(output.nextAction);
  const summaryText = normalizeText(output.summaryText);
  if (providerLabel === 'Anthropic' && summaryText && (!artifactContent || !nextAction)) {
    artifactContent = artifactContent || buildExecutorFallbackContent({ input, summaryText });
    nextAction = nextAction || 'Owner: project lead to review PRD within 48 hours.';
  }
  if (!artifactContent || !nextAction || !summaryText) {
    throw createProviderFailure('Executor output is missing required fields.', {
      failureKind: 'schema-invalid',
      rawMessage: JSON.stringify(output),
      recoverable: false,
      timedOut: false,
    });
  }

  return {
    adaptationNotes: normalizeStringArray(output.adaptationNotes),
    artifactContent,
    artifactFileName: input.pack.artifactFileName,
    artifactTitle: input.pack.artifactTitle,
    executionManifest: output.executionManifest && typeof output.executionManifest === 'object' ? output.executionManifest : null,
    nextAction,
    proposedAction: {
      kind: input.pack.riskProfile.actionKind,
      reason: input.pack.riskProfile.reason,
      requiresApproval: input.pack.riskProfile.requiresApproval,
      title: input.pack.riskProfile.title,
    },
    summaryText,
    type: 'executor',
  };
}

function normalizeSpecialistHandoff(handoff, output) {
  const currentState = normalizeText(handoff?.currentState, output.summaryText);
  const deliverables = normalizeStringArray(handoff?.deliverables);
  const acceptanceCriteria = normalizeStringArray(handoff?.acceptanceCriteria);
  const evidence = normalizeStringArray(handoff?.evidence);
  const blockers = normalizeStringArray(handoff?.blockers);
  const targetRole = normalizeText(handoff?.nextHandoff?.targetRole, 'manager-merge');
  const recommendedOwner = normalizeText(handoff?.nextHandoff?.recommendedOwner, 'workspace-owner');
  const request = normalizeText(handoff?.nextHandoff?.request, output.nextAction);

  if (!currentState || !deliverables.length || !acceptanceCriteria.length || !evidence.length || !request) {
    throw createProviderFailure('Specialist output is missing required handoff fields.', {
      failureKind: 'schema-invalid',
      rawMessage: JSON.stringify(handoff),
      recoverable: false,
      timedOut: false,
    });
  }

  return {
    acceptanceCriteria,
    blockers,
    currentState,
    deliverables,
    evidence,
    nextHandoff: {
      recommendedOwner,
      request,
      targetRole,
    },
  };
}

function normalizeSpecialistOutput(output, input) {
  const baseOutput = normalizeExecutorOutput(output, input);

  return {
    ...baseOutput,
    specialistHandoff: normalizeSpecialistHandoff(output.specialistHandoff, baseOutput),
    type: 'specialist',
  };
}

function normalizeReviewerChecks(checks) {
  return Array.isArray(checks)
    ? checks
        .map((check) => ({
          description: normalizeText(check?.description),
          id: normalizeText(check?.id),
          passed: Boolean(check?.passed),
        }))
        .filter((check) => check.id && check.description)
    : [];
}

function normalizeReviewerOutput(output, providerLabel) {
  const verdict = normalizeText(output.verdict).toLowerCase();
  const artifactContent = normalizeText(output.artifactContent);
  const summaryText = normalizeText(output.summaryText);
  if (!['pass', 'fail'].includes(verdict)) {
    throw createProviderFailure(`${providerLabel} reviewer output must include verdict pass|fail. Received: ${output.verdict}`, {
      failureKind: 'schema-invalid',
      rawMessage: JSON.stringify(output),
      recoverable: false,
      timedOut: false,
    });
  }
  if (!artifactContent || !summaryText) {
    throw createProviderFailure(`${providerLabel} reviewer output is missing required fields.`, {
      failureKind: 'schema-invalid',
      rawMessage: JSON.stringify(output),
      recoverable: false,
      timedOut: false,
    });
  }

  return {
    artifactContent,
    artifactFileName: 'reviewer-report.md',
    artifactTitle: 'Reviewer Report',
    checks: normalizeReviewerChecks(output.checks),
    findings: normalizeStringArray(output.findings),
    summaryText,
    type: 'reviewer',
    verdict,
  };
}

export function normalizeStructuredOutput(result, input, providerLabel) {
  const output = result?.output || result;
  const role = normalizeText(result?.role || input?.role || input?.providerRole);

  if (role === 'manager') {
    return normalizeManagerOutput(output);
  }

  if (role === 'planner') {
    return normalizePlannerOutput(output, providerLabel);
  }

  if (role === 'executor') {
    return normalizeExecutorOutput(output, input, providerLabel);
  }

  if (role === 'specialist') {
    return normalizeSpecialistOutput(output, input);
  }

  if (role === 'reviewer') {
    return normalizeReviewerOutput(output, providerLabel);
  }

  throw new Error(`Unsupported ${providerLabel} provider role: ${role}`);
}
