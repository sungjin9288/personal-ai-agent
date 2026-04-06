import { createStubProvider } from './stub-provider.mjs';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function normalizeStringArray(items) {
  return Array.isArray(items) ? items.map((item) => normalizeText(item)).filter(Boolean) : [];
}

function stripCodeFence(text) {
  const trimmed = normalizeText(text);
  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  return trimmed
    .replace(/^```[a-zA-Z0-9_-]*\s*/, '')
    .replace(/\s*```$/, '')
    .trim();
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }

  const outputItems = Array.isArray(payload?.output) ? payload.output : [];
  const parts = [];

  for (const item of outputItems) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (typeof content?.text === 'string' && content.text.trim()) {
        parts.push(content.text);
      } else if (typeof content?.text?.value === 'string' && content.text.value.trim()) {
        parts.push(content.text.value);
      }
    }
  }

  return parts.join('\n').trim();
}

function parseJsonText(text) {
  const normalized = stripCodeFence(text);
  if (!normalized) {
    throw new Error('OpenAI provider returned an empty response.');
  }

  try {
    return JSON.parse(normalized);
  } catch (error) {
    throw new Error(
      `OpenAI provider returned non-JSON content: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function buildRoleContract({ role, pack }) {
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

  throw new Error(`Unsupported OpenAI provider role: ${role}`);
}

function buildRequestPrompt(input, delegatedPrompt) {
  return `${delegatedPrompt.trim()}

## Structured Output Contract
${buildRoleContract(input)}
`;
}

function resolveOpenAIConfig(env) {
  const apiKey = normalizeText(env.OPENAI_API_KEY);
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required to use --provider openai.');
  }

  return {
    apiKey,
    baseUrl: normalizeText(env.OPENAI_BASE_URL, 'https://api.openai.com/v1').replace(/\/$/, ''),
    model: normalizeText(env.OPENAI_MODEL, 'gpt-5.2'),
  };
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

function normalizeReviewerOutput(output) {
  const verdict = normalizeText(output.verdict).toLowerCase();
  if (!['pass', 'fail'].includes(verdict)) {
    throw new Error(`OpenAI reviewer output must include verdict pass|fail. Received: ${output.verdict}`);
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

export function createOpenAIProvider({ rootDir, env = process.env, fetchImpl = globalThis.fetch }) {
  const delegatedProvider = createStubProvider({ rootDir });

  return {
    id: 'openai',
    implemented: true,
    preparePrompt(input) {
      return delegatedProvider.preparePrompt(input);
    },
    async run(input) {
      if (typeof fetchImpl !== 'function') {
        throw new Error('Global fetch is not available for the OpenAI provider.');
      }

      const config = resolveOpenAIConfig(env);
      const delegatedPrompt = delegatedProvider.preparePrompt(input);
      const response = await fetchImpl(`${config.baseUrl}/responses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: buildRequestPrompt(input, delegatedPrompt),
          model: config.model,
        }),
      });

      if (!response.ok) {
        const errorText = typeof response.text === 'function' ? await response.text() : '';
        throw new Error(
          `OpenAI provider request failed (${response.status}): ${normalizeText(errorText, 'No response body returned.')}`,
        );
      }

      const payload = await response.json();
      const outputText = extractOutputText(payload);

      return {
        output: parseJsonText(outputText),
        providerResponseId: normalizeText(payload.id),
        role: input.role,
      };
    },
    normalizeOutput(result, input) {
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
        return normalizeReviewerOutput(output);
      }

      throw new Error(`Unsupported OpenAI provider role: ${role}`);
    },
  };
}
