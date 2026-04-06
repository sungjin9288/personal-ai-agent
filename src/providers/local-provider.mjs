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

function extractChoiceText(payload) {
  const choices = Array.isArray(payload?.choices) ? payload.choices : [];
  const firstChoice = choices[0];
  const content = firstChoice?.message?.content;

  if (typeof content === 'string' && content.trim()) {
    return content;
  }

  if (Array.isArray(content)) {
    const parts = [];
    for (const part of content) {
      if (typeof part?.text === 'string' && part.text.trim()) {
        parts.push(part.text);
      } else if (typeof part?.text?.value === 'string' && part.text.value.trim()) {
        parts.push(part.text.value);
      }
    }
    return parts.join('\n').trim();
  }

  return '';
}

function parseJsonText(text) {
  const normalized = stripCodeFence(text);
  if (!normalized) {
    throw new Error('Local provider returned an empty response.');
  }

  try {
    return JSON.parse(normalized);
  } catch (error) {
    throw new Error(
      `Local provider returned non-JSON content: ${error instanceof Error ? error.message : String(error)}`,
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

  throw new Error(`Unsupported local provider role: ${role}`);
}

function buildRequestPrompt(input, delegatedPrompt) {
  return `${delegatedPrompt.trim()}

## Structured Output Contract
${buildRoleContract(input)}
`;
}

function parsePositiveInteger(value, fallback) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return fallback;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`LOCAL_PROVIDER_MAX_TOKENS must be a positive integer. Received: ${normalized}`);
  }

  return parsed;
}

function resolveLocalConfig(env) {
  const model = normalizeText(env.LOCAL_PROVIDER_MODEL);
  if (!model) {
    throw new Error('LOCAL_PROVIDER_MODEL is required to use --provider local.');
  }

  return {
    apiKey: normalizeText(env.LOCAL_PROVIDER_API_KEY),
    baseUrl: normalizeText(env.LOCAL_PROVIDER_BASE_URL, 'http://127.0.0.1:11434/v1').replace(/\/$/, ''),
    maxTokens: parsePositiveInteger(env.LOCAL_PROVIDER_MAX_TOKENS, 2048),
    model,
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
    throw new Error(`Local reviewer output must include verdict pass|fail. Received: ${output.verdict}`);
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

export function createLocalProvider({ rootDir, env = process.env, fetchImpl = globalThis.fetch }) {
  const delegatedProvider = createStubProvider({ rootDir });

  return {
    id: 'local',
    implemented: true,
    preparePrompt(input) {
      return delegatedProvider.preparePrompt(input);
    },
    async run(input) {
      if (typeof fetchImpl !== 'function') {
        throw new Error('Global fetch is not available for the local provider.');
      }

      const config = resolveLocalConfig(env);
      const delegatedPrompt = delegatedProvider.preparePrompt(input);
      const headers = {
        'Content-Type': 'application/json',
      };

      if (config.apiKey) {
        headers.Authorization = `Bearer ${config.apiKey}`;
      }

      const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          max_tokens: config.maxTokens,
          messages: [
            {
              content:
                'Return only valid JSON that matches the requested contract. Do not add code fences or explanatory prose.',
              role: 'system',
            },
            {
              content: buildRequestPrompt(input, delegatedPrompt),
              role: 'user',
            },
          ],
          model: config.model,
          temperature: 0,
        }),
      });

      if (!response.ok) {
        const errorText = typeof response.text === 'function' ? await response.text() : '';
        throw new Error(
          `Local provider request failed (${response.status}): ${normalizeText(errorText, 'No response body returned.')}`,
        );
      }

      const payload = await response.json();
      const outputText = extractChoiceText(payload);

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

      throw new Error(`Unsupported local provider role: ${role}`);
    },
  };
}
