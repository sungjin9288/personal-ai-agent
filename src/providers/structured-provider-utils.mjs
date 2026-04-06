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

export function parseJsonText(text, providerLabel) {
  const normalized = stripCodeFence(text);
  if (!normalized) {
    throw new Error(`${providerLabel} provider returned an empty response.`);
  }

  try {
    return JSON.parse(normalized);
  } catch (error) {
    throw new Error(
      `${providerLabel} provider returned non-JSON content: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
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
  "nextAction": "single next action sentence"
}

Artifact rules:
- artifactContent must be Markdown
- include all required sections exactly once
- required sections: ${pack.requiredSections.join(', ')}`;
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
- verdict must match findings`;
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
  return {
    artifactContent: normalizeText(output.artifactContent),
    artifactFileName: 'manager-context.md',
    artifactTitle: 'Manager Context',
    summaryText: normalizeText(output.summaryText, 'Manager context generated.'),
    type: 'manager',
  };
}

function normalizePlannerOutput(output) {
  return {
    adaptationNotes: normalizeStringArray(output.adaptationNotes),
    artifactContent: normalizeText(output.artifactContent),
    artifactFileName: 'planner-plan.md',
    artifactTitle: 'Planner Plan',
    planSteps: normalizeStringArray(output.planSteps),
    summaryText: normalizeText(output.summaryText, 'Planner plan generated.'),
    type: 'planner',
  };
}

function normalizeExecutorOutput(output, input) {
  return {
    adaptationNotes: normalizeStringArray(output.adaptationNotes),
    artifactContent: normalizeText(output.artifactContent),
    artifactFileName: input.pack.artifactFileName,
    artifactTitle: input.pack.artifactTitle,
    nextAction: normalizeText(
      output.nextAction,
      input.pack.riskProfile.requiresApproval
        ? 'Pause for approval before any workspace mutation.'
        : 'Share the draft with the owner and collect follow-up decisions.',
    ),
    proposedAction: {
      kind: input.pack.riskProfile.actionKind,
      reason: input.pack.riskProfile.reason,
      requiresApproval: input.pack.riskProfile.requiresApproval,
      title: input.pack.riskProfile.title,
    },
    summaryText: normalizeText(output.summaryText, `${input.pack.artifactTitle} generated.`),
    type: 'executor',
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
  if (!['pass', 'fail'].includes(verdict)) {
    throw new Error(`${providerLabel} reviewer output must include verdict pass|fail. Received: ${output.verdict}`);
  }

  return {
    artifactContent: normalizeText(output.artifactContent),
    artifactFileName: 'reviewer-report.md',
    artifactTitle: 'Reviewer Report',
    checks: normalizeReviewerChecks(output.checks),
    findings: normalizeStringArray(output.findings),
    summaryText: normalizeText(output.summaryText, `Reviewer ${verdict} verdict generated.`),
    type: 'reviewer',
    verdict,
  };
}

export function normalizeStructuredOutput(result, input, providerLabel) {
  const output = result?.output || result;
  const role = normalizeText(result?.role || input?.role);

  if (role === 'manager') {
    return normalizeManagerOutput(output);
  }

  if (role === 'planner') {
    return normalizePlannerOutput(output);
  }

  if (role === 'executor') {
    return normalizeExecutorOutput(output, input);
  }

  if (role === 'reviewer') {
    return normalizeReviewerOutput(output, providerLabel);
  }

  throw new Error(`Unsupported ${providerLabel} provider role: ${role}`);
}
