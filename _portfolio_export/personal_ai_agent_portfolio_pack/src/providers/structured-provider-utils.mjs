import { createProviderFailure } from './provider-runtime-utils.mjs';
import {
  assertCouncilSeatTargetBinding,
  resolveCouncilSeatPromptContract,
} from '../core/council-seat-prompt-contract.mjs';
import { ensureMissionQualityGateSection } from '../core/mission-quality-gate.mjs';

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
- include section Mission Quality Gate with Success Criteria, Assumptions, Minimal Change, and Verification
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
        "command": "workspace-local shell command for inspect/command/test/build steps",
        "filePath": "relative/path for edit steps",
        "mutationTemplate": "text-append | text-replace | text-write-new for edit steps",
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
- include section Mission Quality Gate with Success Criteria, Assumptions, Minimal Change, and Verification
- Next Action must name the next owner or the next review step
- executionManifest is required for engineering mode and must stay workspace-local
- edit steps must use approved mutation templates: text-append for additive text, text-replace for exact bounded replacement, or text-write-new for new files only
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

function buildCouncilRoleContract(input) {
  if (input.role === 'specialist') {
    const opening = input.councilPhase === 'opening-position';
    const seatContract = resolveCouncilSeatPromptContract({
      councilBrief: input.councilBrief,
      phase: input.councilPhase,
      profile: input.councilPromptProfile,
      seatId: input.councilSeatId,
    });
    if (seatContract?.profile === 'seat-scoped-v2') {
      return buildRobustCouncilSpecialistContract({
        input,
        opening,
        seatContract,
      });
    }
    if (seatContract?.profile === 'seat-scoped-v3') {
      return buildRebuttalCompletionCouncilSpecialistContract({
        input,
        opening,
        seatContract,
      });
    }
    const rebuttalTargets = opening
      ? []
      : (input.councilBrief?.claims || [])
          .filter((claim) => claim?.seatId !== input.councilSeatId)
          .map((claim) => normalizeText(claim?.id))
          .filter(Boolean);
    const expectedTargets = seatContract?.requiredTargetClaimId
      ? [seatContract.requiredTargetClaimId]
      : opening
        ? []
        : ['opening claim id from Council Context'];
    const seatRules = seatContract
      ? `
Seat responsibility:
- seat: ${seatContract.seatId}
- responsibility: ${seatContract.responsibility}
- keep the claim inside this responsibility and do not imitate another seat's responsibility
${opening
  ? '- opening input contains only the shared CouncilFrame and no other opening statement'
  : `- rebuttal targetClaimIds must equal exactly: ${JSON.stringify(expectedTargets)}`}`
      : '';
    return `Return only valid JSON with this shape:
{
  "summaryText": "bounded council position",
  "artifactContent": "# Council ${opening ? 'Opening' : 'Rebuttal'}\\n...",
  "nextAction": "single next action sentence",
  "councilStatement": {
    "claims": [
      {
        "id": "${opening ? 'claim-1' : 'claim-2'}",
        "position": "support | challenge | unknown",
        "summary": "bounded claim",
        "evidenceRefs": ["available evidence id from Council Context"],
        "severity": "normal | critical"
      }
    ],
    "targetClaimIds": ${JSON.stringify(expectedTargets)},
    "rejectedOptionIds": [],
    "nextAction": "single next action sentence"
  }
}

Council rules:
- use only evidence ids present in Council Context
- targetClaimIds and rejectedOptionIds may reference only claim ids present in Council Context
- return exactly one claim; the runtime assigns its fixed seat and round id
- opening targetClaimIds and rejectedOptionIds must be empty
- rebuttal targetClaimIds must contain at least one other seat opening claim
${opening || seatContract ? '' : `- rebuttal targetClaimIds must choose from: ${rebuttalTargets.join(', ')}`}
- do not include raw attachments, memory, paths, URLs, or hidden reasoning
${seatRules}`;
  }

  if (input.role === 'executor' && input.councilPhase === 'synthesis') {
    return `Return only valid JSON with this shape:
{
  "summaryText": "bounded chair summary",
  "artifactContent": "# Council Decision\\n...",
  "nextAction": "single next action sentence",
  "councilSynthesis": {
    "acceptedClaimIds": [],
    "rejectedClaims": [
      {
        "claimId": "claim id from Council Context",
        "reason": "bounded reason"
      }
    ],
    "agreementIds": [],
    "unresolvedConflictIds": [],
    "unresolvedCriticalConflictIds": [],
    "evidenceRefs": [],
    "verificationPlan": ["bounded verification step"],
    "nextOwner": "workspace-owner",
    "nextAction": "single next action sentence"
  }
}

Council rules:
- use only claim and evidence ids present in Council Context
- every accepted or agreed claim must have evidence and its evidence id must be listed
- every unresolved challenge claim must appear in unresolvedConflictIds
- every unresolved critical challenge must also appear in unresolvedCriticalConflictIds
- nextOwner must be workspace-owner
- do not include raw attachments, memory, paths, URLs, or hidden reasoning`;
  }

  throw new Error(`Unsupported council provider role: ${input.role}`);
}

function buildRobustCouncilSpecialistContract({
  input,
  opening,
  seatContract,
}) {
  const evidenceIds = opening
    ? (input.councilFrame?.evidenceCatalog || []).map((item) => item?.id)
    : (input.councilBrief?.evidenceRefs || []);
  const availableEvidenceIds = evidenceIds
    .map((value) => normalizeText(value))
    .filter(Boolean);
  if (availableEvidenceIds.length === 0) {
    throw new Error('seat-scoped-v2 requires at least one available evidence id.');
  }
  const exampleEvidenceId = availableEvidenceIds[0];
  const targetClaimIds = seatContract.requiredTargetClaimId
    ? [seatContract.requiredTargetClaimId]
    : [];

  return `Return only valid JSON matching this single example:
{
  "summaryText": "bounded council position",
  "artifactContent": "# Council ${opening ? 'Opening' : 'Rebuttal'}\\n...",
  "nextAction": "single next action sentence",
  "councilStatement": {
    "claims": [
      {
        "id": "${opening ? 'claim-1' : 'claim-2'}",
        "position": "unknown",
        "summary": "bounded claim",
        "evidenceRefs": [${JSON.stringify(exampleEvidenceId)}],
        "severity": "normal"
      }
    ],
    "targetClaimIds": ${JSON.stringify(targetClaimIds)},
    "rejectedOptionIds": [],
    "nextAction": "single next action sentence"
  }
}

Exact claim rules:
- return exactly one claim
- position must be exactly one JSON string: "support", "challenge", or "unknown"
- severity must be exactly one JSON string: "normal" or "critical"
- never return an enum description or a list of alternatives as a field value
- evidenceRefs must be a JSON array containing only these exact evidence ids: ${JSON.stringify(availableEvidenceIds)}
- use no field other than id, position, summary, evidenceRefs, and severity inside the claim
- the runtime assigns the fixed seat prefix to the claim id; do not invent another seat

Round rules:
- opening targetClaimIds and rejectedOptionIds must be empty arrays
${opening
  ? '- opening input contains only the shared CouncilFrame and no other opening statement'
  : `- rebuttal targetClaimIds must equal exactly ${JSON.stringify(targetClaimIds)}`}
- do not include raw attachments, memory, paths, URLs, or hidden reasoning

Seat responsibility:
- seat: ${seatContract.seatId}
- responsibility: ${seatContract.responsibility}
- keep the claim inside this responsibility and do not imitate another seat's responsibility`;
}

function buildRebuttalCompletionCouncilSpecialistContract({
  input,
  opening,
  seatContract,
}) {
  const evidenceIds = opening
    ? (input.councilFrame?.evidenceCatalog || []).map((item) => item?.id)
    : (input.councilBrief?.evidenceRefs || []);
  const availableEvidenceIds = evidenceIds.map((value) => normalizeText(value)).filter(Boolean);
  if (availableEvidenceIds.length === 0) {
    throw new Error('seat-scoped-v3 requires at least one available evidence id.');
  }

  const exampleEvidenceId = availableEvidenceIds[0];
  const targetClaimIds = seatContract.requiredTargetClaimId ? [seatContract.requiredTargetClaimId] : [];
  const phaseExample = opening
    ? `{
  "summaryText": "bounded opening position",
  "artifactContent": "# Council Opening\\n...",
  "nextAction": "single next action sentence",
  "councilStatement": {
    "claims": [{ "id": "claim-1", "position": "unknown", "summary": "bounded claim", "evidenceRefs": [${JSON.stringify(exampleEvidenceId)}], "severity": "normal" }],
    "targetClaimIds": [], "rejectedOptionIds": [], "nextAction": "single next action sentence"
  }
}`
    : `{
  "summaryText": "bounded rebuttal position",
  "artifactContent": "# Council Rebuttal\\n...",
  "nextAction": "single next action sentence",
  "councilStatement": {
    "claims": [{ "id": "claim-2", "position": "challenge", "summary": "bounded rebuttal claim", "evidenceRefs": [${JSON.stringify(exampleEvidenceId)}], "severity": "normal" }],
    "targetClaimIds": ${JSON.stringify(targetClaimIds)}, "rejectedOptionIds": [], "nextAction": "single next action sentence"
  }
}`;

  return `Return only valid JSON matching this ${opening ? 'opening' : 'rebuttal'} example:
${phaseExample}

Exact claim rules:
- return exactly one claim with exactly id, position, summary, evidenceRefs, and severity
- position must be exactly one JSON string: "support", "challenge", or "unknown"
- severity is required and must be exactly one non-empty JSON string: "normal" or "critical"
- evidenceRefs must be a JSON array containing only these exact evidence ids: ${JSON.stringify(availableEvidenceIds)}
- the runtime assigns the fixed seat prefix to the claim id; do not invent another seat

Round rules:
${opening
  ? '- opening targetClaimIds and rejectedOptionIds must be empty arrays\n- opening input contains only the shared CouncilFrame and no other opening statement'
  : `- rebuttal targetClaimIds must equal exactly ${JSON.stringify(targetClaimIds)}\n- rebuttal must include the required claim severity field`}
- do not include raw attachments, memory, paths, URLs, or hidden reasoning

Seat responsibility:
- seat: ${seatContract.seatId}
- responsibility: ${seatContract.responsibility}
- keep the claim inside this responsibility and do not imitate another seat's responsibility`;
}

export function buildRequestPrompt(input, delegatedPrompt) {
  return `${delegatedPrompt.trim()}

## Structured Output Contract
${input.councilPhase ? buildCouncilRoleContract(input) : buildRoleContract(input)}
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

function requiresExplicitWorkspaceApproval(input) {
  return Boolean(
    input?.pack?.riskProfile?.requiresApproval &&
      normalizeText(input?.pack?.riskProfile?.approvalKind) === 'workspace_execution',
  );
}

function buildApprovalNextAction(input) {
  const workspacePath = normalizeText(input?.workspace?.path, 'the target workspace');
  return `Request explicit approval before running shell commands or mutating files in ${workspacePath}.`;
}

function upsertMarkdownSection(markdown, sectionName, content) {
  const source = normalizeText(markdown);
  if (!source) {
    return `## ${sectionName}\n${content}`;
  }

  const sectionPattern = new RegExp(`## ${sectionName}\\n[\\s\\S]*?(?=\\n## |$)`, 'i');
  const replacement = `## ${sectionName}\n${content}`;
  if (sectionPattern.test(source)) {
    return source.replace(sectionPattern, replacement);
  }

  return `${source}\n\n${replacement}`;
}

function extractMarkdownSection(markdown, sectionName) {
  const source = normalizeText(markdown);
  if (!source) {
    return '';
  }

  const sectionPattern = new RegExp(`## ${sectionName}\\n([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const match = source.match(sectionPattern);
  return normalizeText(match?.[1] || '');
}

function renderExecutionManifestPlanSteps(executionManifest) {
  const steps = Array.isArray(executionManifest?.steps) ? executionManifest.steps : [];
  if (!steps.length) {
    return '- Inspect the repository and identify the smallest safe execution surface.';
  }

  return steps
    .map((step, index) => {
      const title = normalizeText(step?.title, `Execution step ${index + 1}`);
      const reason = normalizeText(step?.reason);
      return `- ${title}${reason ? ` — ${reason}` : ''}`;
    })
    .join('\n');
}

function buildEngineeringDiagnosisSection(input, summaryText) {
  const objective = normalizeText(input?.mission?.objective, summaryText || 'Clarify the bounded engineering objective.');
  return [
    `- Objective: ${objective}`,
    '- Confirm the smallest workspace-local surface required to satisfy the mission.',
    '- Keep direct workspace mutation behind an explicit approval gate.',
  ].join('\n');
}

function buildEngineeringVerificationPlan(executionManifest) {
  const verificationTargets = Array.isArray(executionManifest?.steps)
    ? executionManifest.steps
        .map((step) => normalizeText(step?.verificationTarget))
        .filter(Boolean)
    : [];

  const lines = [
    '- Run the narrowest meaningful smoke/test path before requesting workspace execution.',
    '- Validate that generated artifacts and bounded execution outputs match the expected schema.',
  ];

  for (const target of verificationTargets.slice(0, 3)) {
    lines.push(`- Verification target: ${target}`);
  }

  return lines.join('\n');
}

function buildEngineeringRiskNotes(input) {
  const workspacePath = normalizeText(input?.workspace?.path, 'the target workspace');
  return [
    '- Direct workspace mutation remains blocked until approval is granted.',
    `- Any shell execution must stay workspace-local to ${workspacePath}.`,
    '- Keep validation deterministic and bounded before any rerun or escalation.',
  ].join('\n');
}

function enforceEngineeringReviewContract({ artifactContent, executionManifest, input, summaryText }) {
  const requiredSections = Array.isArray(input?.pack?.requiredSections) ? input.pack.requiredSections : [];
  if (!requiredSections.length) {
    return artifactContent;
  }

  let content = artifactContent;

  if (!/## Diagnosis\b/i.test(content) && requiredSections.includes('Diagnosis')) {
    content = upsertMarkdownSection(content, 'Diagnosis', buildEngineeringDiagnosisSection(input, summaryText));
  }

  if (!/## Implementation Plan\b/i.test(content) && requiredSections.includes('Implementation Plan')) {
    content = upsertMarkdownSection(content, 'Implementation Plan', renderExecutionManifestPlanSteps(executionManifest));
  }

  const verificationSection = extractMarkdownSection(content, 'Verification Plan');
  if (requiredSections.includes('Verification Plan') && !/(smoke|test)/i.test(verificationSection)) {
    content = upsertMarkdownSection(content, 'Verification Plan', buildEngineeringVerificationPlan(executionManifest));
  }

  if (!/## Risk Notes\b/i.test(content) && requiredSections.includes('Risk Notes')) {
    content = upsertMarkdownSection(content, 'Risk Notes', buildEngineeringRiskNotes(input));
  }

  return content;
}

function enforceEngineeringApprovalNextAction({ artifactContent, input, nextAction }) {
  if (!requiresExplicitWorkspaceApproval(input)) {
    return {
      artifactContent,
      nextAction,
    };
  }

  const approvalRequired = /approval/i.test(nextAction) && /## Next Action[\s\S]*?approval/i.test(artifactContent);
  if (approvalRequired) {
    return {
      artifactContent,
      nextAction,
    };
  }

  const approvalNextAction = buildApprovalNextAction(input);
  return {
    artifactContent: upsertMarkdownSection(artifactContent, 'Next Action', approvalNextAction),
    nextAction: approvalNextAction,
  };
}

function normalizeExecutorOutput(output, input, providerLabel) {
  let artifactContent = normalizeText(output.artifactContent);
  let nextAction = normalizeText(output.nextAction);
  const summaryText = normalizeText(output.summaryText);
  const executionManifest = output.executionManifest && typeof output.executionManifest === 'object' ? output.executionManifest : null;
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

  artifactContent = enforceEngineeringReviewContract({
    artifactContent,
    executionManifest,
    input,
    summaryText,
  });
  artifactContent = ensureMissionQualityGateSection(artifactContent, {
    ...input,
    executionManifest,
  });

  const normalizedApprovalOutput = enforceEngineeringApprovalNextAction({
    artifactContent,
    input,
    nextAction,
  });
  artifactContent = normalizedApprovalOutput.artifactContent;
  nextAction = normalizedApprovalOutput.nextAction;

  return {
    adaptationNotes: normalizeStringArray(output.adaptationNotes),
    artifactContent,
    artifactFileName: input.pack.artifactFileName,
    artifactTitle: input.pack.artifactTitle,
    executionManifest,
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

function normalizeCouncilClaimIds(statement, input) {
  if (!statement || typeof statement !== 'object' || Array.isArray(statement)) {
    return statement;
  }
  const claims = Array.isArray(statement.claims)
    ? statement.claims.map((claim) => {
        if (!claim || typeof claim !== 'object' || Array.isArray(claim)) {
          return claim;
        }
        const id = normalizeText(claim.id);
        const fixedId = statement.claims.length === 1
          ? `${input.councilSeatId}:claim-${input.councilPhase === 'opening-position' ? 1 : 2}`
          : id;
        return {
          evidenceRefs: claim.evidenceRefs,
          id: fixedId,
          position: claim.position,
          severity: claim.severity,
          summary: claim.summary,
        };
      })
    : statement.claims;
  return {
    claims,
    nextAction: statement.nextAction,
    rejectedOptionIds: statement.rejectedOptionIds,
    targetClaimIds: statement.targetClaimIds,
  };
}

function normalizeCouncilSpecialistOutput(output, input, providerLabel) {
  const artifactContent = normalizeText(output.artifactContent);
  const nextAction = normalizeText(output.nextAction);
  const summaryText = normalizeText(output.summaryText);
  const normalizedStatement = normalizeCouncilClaimIds(output.councilStatement, input);
  const councilStatement = normalizedStatement && {
    ...normalizedStatement,
    nextAction: normalizeText(normalizedStatement.nextAction, nextAction),
  };
  if (!artifactContent || !nextAction || !summaryText || !councilStatement) {
    throw createProviderFailure(`${providerLabel} council specialist output is missing required fields.`, {
      failureKind: 'schema-invalid',
      rawMessage: JSON.stringify(output),
      recoverable: false,
      timedOut: false,
    });
  }
  try {
    assertCouncilSeatTargetBinding({
      councilBrief: input.councilBrief,
      phase: input.councilPhase,
      profile: input.councilPromptProfile,
      seatId: input.councilSeatId,
      targetClaimIds: councilStatement.targetClaimIds,
    });
  } catch (error) {
    throw createProviderFailure(
      `${providerLabel} council seat target binding failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      {
        failureKind: 'schema-invalid',
        rawMessage: JSON.stringify(output),
        recoverable: false,
        timedOut: false,
      },
    );
  }
  const evidence = Array.isArray(councilStatement.claims)
    ? [...new Set(councilStatement.claims.flatMap((claim) => claim?.evidenceRefs || []))]
    : [];
  const opening = input.councilPhase === 'opening-position';
  return {
    artifactContent,
    artifactFileName: `council-${input.councilSeatId}-${opening ? 'opening' : 'rebuttal'}.md`,
    artifactTitle: `${input.councilSeatId} council ${opening ? 'opening' : 'rebuttal'}`,
    councilStatement,
    nextAction,
    specialistHandoff: {
      acceptanceCriteria: ['The persisted council statement passes the council contract.'],
      blockers: [],
      currentState: summaryText,
      deliverables: [`${opening ? 'opening' : 'rebuttal'} council statement`],
      evidence: evidence.length ? evidence : ['No citable evidence was promoted.'],
      nextHandoff: {
        recommendedOwner: 'workspace-owner',
        request: nextAction,
        targetRole: opening ? 'council-brief' : 'manager-merge',
      },
    },
    summaryText,
    type: 'specialist',
  };
}

function normalizeCouncilSynthesisOutput(output, input, providerLabel) {
  const artifactContent = normalizeText(output.artifactContent);
  const nextAction = normalizeText(output.nextAction);
  const summaryText = normalizeText(output.summaryText);
  const councilSynthesis = output.councilSynthesis;
  if (
    !artifactContent ||
    !nextAction ||
    !summaryText ||
    !councilSynthesis ||
    typeof councilSynthesis !== 'object' ||
    Array.isArray(councilSynthesis)
  ) {
    throw createProviderFailure(`${providerLabel} council synthesis output is missing required fields.`, {
      failureKind: 'schema-invalid',
      rawMessage: JSON.stringify(output),
      recoverable: false,
      timedOut: false,
    });
  }
  return {
    adaptationNotes: [],
    artifactContent,
    artifactFileName: input.councilRuntime?.artifactFileName || 'council-decision.md',
    artifactTitle: input.councilRuntime?.artifactTitle || 'Council Decision',
    councilSynthesis,
    executionManifest: null,
    nextAction,
    proposedAction: input.councilRuntime?.proposedAction || null,
    summaryText,
    type: 'executor',
  };
}

export function normalizeStructuredOutput(result, input, providerLabel) {
  const output = result?.output || result;
  const role = normalizeText(result?.role || input?.role || input?.providerRole);

  if (input?.councilPhase && role === 'specialist') {
    return normalizeCouncilSpecialistOutput(output, input, providerLabel);
  }

  if (input?.councilPhase === 'synthesis' && role === 'executor') {
    return normalizeCouncilSynthesisOutput(output, input, providerLabel);
  }

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
