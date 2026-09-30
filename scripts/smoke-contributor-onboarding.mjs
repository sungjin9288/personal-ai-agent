import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const contributingPath = path.join(repoDir, 'CONTRIBUTING.md');
const securityPath = path.join(repoDir, 'SECURITY.md');
const supportPath = path.join(repoDir, 'SUPPORT.md');
const forkGuidePath = path.join(repoDir, 'docs', 'fork-onboarding-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packageJsonPath = path.join(repoDir, 'package.json');
const pullRequestTemplatePath = path.join(repoDir, '.github', 'pull_request_template.md');
const providerWorkflowPath = path.join(repoDir, '.github', 'workflows', 'provider-smoke.yml');
const docsGateWorkflowPath = path.join(repoDir, '.github', 'workflows', 'docs-gate-smokes.yml');
const issueTemplateDir = path.join(repoDir, '.github', 'ISSUE_TEMPLATE');
const envExamplePath = path.join(repoDir, '.env.example');
const gitignorePath = path.join(repoDir, '.gitignore');
const expectedWorkflowTrigger = `on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - '**'
  workflow_dispatch:

`;

const contributing = readRequiredFile(contributingPath);
const security = readRequiredFile(securityPath);
const support = readRequiredFile(supportPath);
const forkGuide = readRequiredFile(forkGuidePath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packageJsonPath));
const pullRequestTemplate = readRequiredFile(pullRequestTemplatePath);
const providerWorkflow = readRequiredFile(providerWorkflowPath);
const docsGateWorkflow = readRequiredFile(docsGateWorkflowPath);
const bugTemplate = readRequiredFile(path.join(issueTemplateDir, 'bug_report.yml'));
const securityTemplate = readRequiredFile(path.join(issueTemplateDir, 'security_report.yml'));
const issueTemplateConfig = readRequiredFile(path.join(issueTemplateDir, 'config.yml'));
const envExample = readRequiredFile(envExamplePath);
const gitignore = readRequiredFile(gitignorePath);

assert.equal(packageJson.scripts['smoke:contributor-onboarding'], 'node scripts/smoke-contributor-onboarding.mjs');

for (const term of [
  '# Contributing',
  'Current validated claim: `provider-scoped pilot-ready`',
  'Do not describe this project as production-ready',
  'not a hosted interactive service',
  'cp .env.example .env',
  'npm run bootstrap:local',
  'npm run demo:local -- --plan',
  'runtime reads `process.env` directly',
  'Never commit `.env`',
  'npm run smoke:doctor',
  'npm run smoke:changelog',
  'npm run smoke:support-policy',
  'npm run smoke:contributor-onboarding',
  'npm run smoke:release-artifact-hygiene',
  'Read [SECURITY.md](SECURITY.md)',
  'Read [SUPPORT.md](SUPPORT.md)',
  'Blank issues are disabled',
  'npm run doctor:summary',
  'Doctor diagnostics summary',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/security_report.yml',
]) {
  assertContains(contributing, term, `CONTRIBUTING missing ${term}`);
}

for (const term of [
  '# Security Policy',
  'local-first PoC/MVP harness',
  'not a hosted SaaS product',
  'no production service endpoint or hosted interactive demo',
  'Do not include provider API keys',
  'npm run smoke:release-artifact-hygiene',
  '[SUPPORT.md](SUPPORT.md)',
]) {
  assertContains(security, term, `SECURITY missing ${term}`);
}

for (const term of [
  '# Support',
  'local-first PoC/MVP harness',
  'npm run demo:local',
  'npm run doctor',
  'npm run smoke:doctor',
  'npm run smoke:support-policy',
  'The public recorded walkthrough is access-verified',
]) {
  assertContains(support, term, `SUPPORT missing ${term}`);
}

for (const term of [
  '# Fork Onboarding v1',
  'publicHostedDemoUrl: https://github.com/sungjin9288/personal-ai-agent/releases/download/walkthrough-v1/personal-ai-agent-recorded-walkthrough-v1.mp4',
  'productionReadyClaim: false',
  'relatedContributing: [CONTRIBUTING.md](../CONTRIBUTING.md)',
  'relatedSecurity: [SECURITY.md](../SECURITY.md)',
  'relatedSupport: [SUPPORT.md](../SUPPORT.md)',
  'relatedEnvTemplate: [.env.example](../.env.example)',
  'credential-free local replay',
  'The public recorded walkthrough URL is access-verified',
  '`.env` is ignored by git',
  'npm run smoke:contributor-onboarding',
  'npm run smoke:env-example',
  'npm run smoke:demo-local',
  'Blank issues are disabled',
  'npm run doctor:summary',
  'Doctor diagnostics summary',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/security_report.yml',
]) {
  assertContains(forkGuide, term, `fork onboarding guide missing ${term}`);
}

for (const readmeTerm of [
  'Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)',
  'Fork onboarding: [docs/fork-onboarding-v1.md](docs/fork-onboarding-v1.md)',
  'Security policy: [SECURITY.md](SECURITY.md)',
  'Support: [SUPPORT.md](SUPPORT.md)',
  'Changelog: [CHANGELOG.md](CHANGELOG.md)',
  'npm run doctor',
  'npm run smoke:doctor',
  'npm run smoke:support-policy',
  'npm run smoke:changelog',
  'npm run smoke:contributor-onboarding',
]) {
  assertContains(readme, readmeTerm, `README missing contributor onboarding term ${readmeTerm}`);
}

for (const templateTerm of [
  'Do not include secrets',
  'machine-local paths',
  'public recorded walkthrough is not a hosted interactive demo',
]) {
  assertContains(bugTemplate, templateTerm, `bug report template missing ${templateTerm}`);
}

for (const templateTerm of [
  'Security report',
  'Do not include provider API keys',
  'Release artifact hygiene',
  'does not currently operate a public hosted service',
]) {
  assertContains(securityTemplate, templateTerm, `security report template missing ${templateTerm}`);
}

for (const configTerm of ['Contributing guide', 'Security policy', 'Support policy', 'blank_issues_enabled: false']) {
  assertContains(issueTemplateConfig, configTerm, `issue template config missing ${configTerm}`);
}

for (const configTerm of ['OPENAI_API_KEY=', 'ANTHROPIC_API_KEY=', 'PERSONAL_AI_AGENT_WEB_AUTH_MODE=']) {
  assertContains(envExample, configTerm, `.env.example missing ${configTerm}`);
}

for (const ignored of ['.env', '.env.local', 'var/']) {
  assertContains(gitignore, ignored, `.gitignore missing ${ignored}`);
}

const expectedProviderSmokeCommands = [
  'npm run test:delivery-evidence',
  'npm run smoke:demo-local',
  'npm run smoke:doctor',
  'npm run doctor:summary',
  'npm run smoke:ui-doctor-surface',
  'npm run smoke:env-example',
  'npm run smoke:contributor-onboarding',
  'npm run smoke:changelog',
  'npm run smoke:portfolio-zip',
  'npm run smoke:support-policy',
  'npm run smoke:demo-evidence-index',
  'npm run smoke:representative-demo-evidence',
  'npm run smoke:operator-surface-demo-evidence',
  'npm run smoke:pilot-export-package',
  'npm run smoke:readme-portfolio-overview',
  'npm run smoke:portfolio-docs-claim-boundary',
  'npm run smoke:release-artifact-hygiene',
  'npm run smoke:provider-fallback-policy',
  'npm run smoke:execution-v1-snapshot',
  'npm run smoke:execution-v1-artifact-refresh',
  'npm run smoke:provider-attention-remediation',
  'npm run smoke:provider-capability-rate-guard',
  'npm run smoke:provider-action-inbox',
  'npm run smoke:provider-events',
  'npm run smoke:provider-overview',
  'npm run smoke:target-provider-operations',
  'npm run smoke:production-provider-readiness',
  'npm run smoke:council-blueprint-preview',
  'npm run smoke:council-concurrent-schedule-shadow',
  'npm run smoke:council-concurrent-envelope-shadow',
  'npm run smoke:council-concurrent-retry-lineage-shadow',
  'npm run smoke:council-concurrent-retry-terminality-shadow',
  'npm run smoke:council-concurrent-retry-surface',
  'npm run smoke:ui-agent-blueprints',
];

const expectedCouncilWorkflowSteps = [
  {
    name: 'Run Council v1.1f focused unit gate',
    command:
      'node --test test/council-blueprint-preview.test.mjs test/council-concurrent-schedule-shadow.test.mjs test/council-concurrent-envelope-shadow.test.mjs test/council-concurrent-retry-lineage-shadow.test.mjs test/council-concurrent-retry-terminality-shadow.test.mjs test/council-concurrent-retry-surface.test.mjs test/smoke-council-blueprint-preview-stable-snapshot.test.mjs',
  },
  { name: 'Run Council v1.1f blueprint smoke', command: 'npm run smoke:council-blueprint-preview' },
  { name: 'Run Council v1.1f concurrent schedule smoke', command: 'npm run smoke:council-concurrent-schedule-shadow' },
  { name: 'Run Council v1.1f concurrent envelope smoke', command: 'npm run smoke:council-concurrent-envelope-shadow' },
  { name: 'Run Council v1.1f retry lineage smoke', command: 'npm run smoke:council-concurrent-retry-lineage-shadow' },
  { name: 'Run Council v1.1f retry terminality smoke', command: 'npm run smoke:council-concurrent-retry-terminality-shadow' },
  { name: 'Run Council v1.1f retry operator surface smoke', command: 'npm run smoke:council-concurrent-retry-surface' },
  { name: 'Run Council v1.1f UI blueprint smoke', command: 'npm run smoke:ui-agent-blueprints' },
];

const expectedNavigationWorkflowStep = {
  name: 'Run navigation and bootstrap regression gate',
  command:
    'node --test test/action-inbox-ui.test.mjs test/harness-browse.test.mjs test/mission-selection.test.mjs test/server-bootstrap.test.mjs',
  testFiles: [
    'test/action-inbox-ui.test.mjs',
    'test/harness-browse.test.mjs',
    'test/mission-selection.test.mjs',
    'test/server-bootstrap.test.mjs',
  ],
};

const pullRequestVerificationCommands = Array.from(
  pullRequestTemplate.matchAll(/- \[ \] `(npm run [^`]+)`/g),
  (match) => match[1],
);
const providerWorkflowRunCommands = extractWorkflowRunCommands(providerWorkflow);
const docsGateWorkflowRunCommands = extractWorkflowRunCommands(docsGateWorkflow);

assertWorkflowContract({
  workflow: providerWorkflow,
  workflowName: 'Provider smoke',
  jobId: 'provider-smoke',
  jobName: 'Provider fallback and attention smoke',
  label: 'Provider smoke workflow',
});
assertNavigationWorkflowContract(providerWorkflow);
const navigationNegativeCheckCount = assertNavigationWorkflowNegativeChecks(providerWorkflow);
assertContains(
  contributing,
  expectedNavigationWorkflowStep.command,
  'CONTRIBUTING must include the exact navigation and bootstrap regression gate command',
);
assertContains(
  pullRequestTemplate,
  `- [ ] \`${expectedNavigationWorkflowStep.command}\``,
  'PR template must include the exact navigation and bootstrap regression gate command',
);
assertCouncilWorkflowContract(providerWorkflow);
const councilNegativeCheckCount = assertCouncilWorkflowNegativeChecks(providerWorkflow);
assertWorkflowContract({
  workflow: docsGateWorkflow,
  workflowName: 'Docs gate smokes',
  jobId: 'docs-gate-smokes',
  jobName: 'Target and enterprise documentation gate smokes',
  label: 'Docs gate smoke workflow',
});
assert.equal(
  extractCheckoutBlock(providerWorkflow),
  `      - name: Checkout
        uses: actions/checkout@v6.0.2
        with:
          fetch-depth: 0
`,
  'Provider smoke workflow must retain the full checkout required for execution-v1 ancestry validation',
);
assert.equal(
  extractCheckoutBlock(docsGateWorkflow),
  `      - name: Checkout
        uses: actions/checkout@v6.0.2
        with:
          fetch-depth: 0
`,
  'Docs gate smoke workflow must retain the full checkout required for execution-v1 ancestry validation',
);

assert.deepEqual(
  pullRequestVerificationCommands,
  expectedProviderSmokeCommands,
  'PR template verification checklist must match provider smoke workflow commands',
);
assert.deepEqual(
  providerWorkflowRunCommands,
  expectedProviderSmokeCommands,
  'Provider smoke workflow commands must match PR template verification checklist',
);
assertNoDuplicates(pullRequestVerificationCommands, 'PR template verification checklist');
assert.deepEqual(
  docsGateWorkflowRunCommands,
  ['npm run smoke:docs-gates', 'npm run smoke:execution-v1-snapshot'],
  'Docs gate smoke workflow must run canonical documentation gates before execution-v1 freshness validation',
);
assertNoDuplicates(providerWorkflowRunCommands, 'provider smoke workflow commands');
assertNoDuplicates(docsGateWorkflowRunCommands, 'docs gate smoke workflow commands');

for (const risky of [
  'production-ready AI agent platform',
  'all-provider-complete achieved',
  'all providers are live validated',
  'hosted demo is live',
  'public hosted demo: yes',
]) {
  assert.equal(contributing.toLowerCase().includes(risky.toLowerCase()), false, `CONTRIBUTING contains risky claim: ${risky}`);
  assert.equal(security.toLowerCase().includes(risky.toLowerCase()), false, `SECURITY contains risky claim: ${risky}`);
  assert.equal(support.toLowerCase().includes(risky.toLowerCase()), false, `SUPPORT contains risky claim: ${risky}`);
  assert.equal(forkGuide.toLowerCase().includes(risky.toLowerCase()), false, `fork guide contains risky claim: ${risky}`);
}

assertNoLocalPaths(contributing);
assertNoLocalPaths(security);
assertNoLocalPaths(support);
assertNoLocalPaths(forkGuide);

console.log(
  JSON.stringify(
    {
      mode: 'contributor-onboarding-smoke',
      ok: true,
      checkedDocs: [
        'CONTRIBUTING.md',
        'SECURITY.md',
        'SUPPORT.md',
        'docs/fork-onboarding-v1.md',
        '.github/ISSUE_TEMPLATE/config.yml',
        '.github/ISSUE_TEMPLATE/bug_report.yml',
        '.github/workflows/provider-smoke.yml',
        '.github/workflows/docs-gate-smokes.yml',
      ],
      navigationGate: {
        command: expectedNavigationWorkflowStep.command,
        testFileCount: expectedNavigationWorkflowStep.testFiles.length,
        negativeChecks: navigationNegativeCheckCount,
      },
      councilGate: {
        focusedUnitCommand: expectedCouncilWorkflowSteps[0].command,
        smokeCommands: expectedCouncilWorkflowSteps.slice(1).map(({ command }) => command),
        negativeChecks: councilNegativeCheckCount,
        mutation: 'in-memory removal only; repository workflow restored unchanged',
      },
    },
    null,
    2,
  ),
);

function readRequiredFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`required file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function assertContains(text, needle, message) {
  assert.ok(String(text || '').includes(needle), message);
}

function assertNoDuplicates(items, label) {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of items) {
    if (seen.has(item)) {
      duplicates.add(item);
    }
    seen.add(item);
  }
  assert.deepEqual([...duplicates], [], `${label} must not contain duplicate commands`);
}

function extractWorkflowRunCommands(workflow) {
  return Array.from(workflow.matchAll(/^\s*run:\s+(npm run .+)$/gm), (match) => match[1].trim());
}

function navigationWorkflowStepText() {
  return `      - name: ${expectedNavigationWorkflowStep.name}\n        run: ${expectedNavigationWorkflowStep.command}`;
}

function assertNavigationWorkflowContract(workflow) {
  const providerJob = extractWorkflowJob(workflow, 'provider-smoke');
  const stepHeader = `      - name: ${expectedNavigationWorkflowStep.name}\n`;
  const occurrences = Array.from(providerJob.matchAll(new RegExp(`^${escapeRegExp(stepHeader)}`, 'gm')));
  assert.equal(occurrences.length, 1, 'Provider smoke job must include exactly one navigation and bootstrap regression gate');

  const start = occurrences[0].index;
  const end = providerJob.indexOf('\n      - ', start + stepHeader.length);
  const completeStep = providerJob.slice(start, end >= 0 ? end : providerJob.length).replace(/\n$/, '');
  assert.equal(
    completeStep,
    navigationWorkflowStepText(),
    'Navigation and bootstrap regression gate must match the exact canonical step',
  );

  const councilStart = providerJob.indexOf(councilWorkflowStepText(expectedCouncilWorkflowSteps[0]));
  assert.ok(councilStart >= 0, 'Provider smoke job must include the Council v1.1f focused unit gate');
  assert.ok(start < councilStart, 'Navigation and bootstrap regression gate must run before the Council v1.1f block');
}

function assertNavigationWorkflowNegativeChecks(workflow) {
  assertNavigationWorkflowContract(workflow);
  const canonicalStep = navigationWorkflowStepText();
  const mutations = [
    ['the step is removed', workflow.replace(`\n${canonicalStep}`, '')],
    ...expectedNavigationWorkflowStep.testFiles.map((testFile) => [
      `${testFile} is removed`,
      workflow.replace(` ${testFile}`, ''),
    ]),
    ['the step is duplicated', workflow.replace(canonicalStep, `${canonicalStep}\n\n${canonicalStep}`)],
    ['if false disables the step', workflow.replace(canonicalStep, `${canonicalStep}\n        if: false`)],
    [
      'continue-on-error weakens the step',
      workflow.replace(canonicalStep, `${canonicalStep}\n        continue-on-error: true`),
    ],
    ['the run key is commented out', workflow.replace(canonicalStep, canonicalStep.replace('        run:', '        # run:'))],
    [
      'the run command is replaced with echo',
      workflow.replace(canonicalStep, canonicalStep.replace(expectedNavigationWorkflowStep.command, 'echo navigation gate skipped')),
    ],
    ['the run command tolerates failure', workflow.replace(canonicalStep, `${canonicalStep} || true`)],
    [
      'the step is moved to another job',
      `${workflow.replace(`\n${canonicalStep}`, '')}\n  detached-navigation-gate:\n    steps:\n${canonicalStep}\n`,
    ],
  ];

  for (const [label, mutatedWorkflow] of mutations) {
    assert.notEqual(mutatedWorkflow, workflow, `negative check must mutate workflow when ${label}`);
    assert.throws(
      () => assertNavigationWorkflowContract(mutatedWorkflow),
      /navigation and bootstrap|Navigation and bootstrap/,
      `Navigation gate contract must fail closed when ${label}`,
    );
  }

  assert.equal(
    readRequiredFile(providerWorkflowPath),
    workflow,
    'Navigation gate negative checks must not mutate the repository workflow',
  );
  return mutations.length;
}

function extractWorkflowJob(workflow, jobId) {
  const startMarker = `  ${jobId}:\n`;
  const startMatch = new RegExp(`^${escapeRegExp(startMarker)}`, 'm').exec(workflow);
  assert.ok(startMatch, `workflow must include job ${jobId}`);
  const start = startMatch.index;
  const nextJob = workflow.slice(start + startMarker.length).search(/^  [A-Za-z0-9_-]+:\n/m);
  const end = nextJob >= 0 ? start + startMarker.length + nextJob : workflow.length;
  return workflow.slice(start, end);
}

function councilWorkflowStepText({ name, command }) {
  return `      - name: ${name}\n        run: ${command}`;
}

function assertCouncilWorkflowContract(workflow) {
  const expectedBlock = expectedCouncilWorkflowSteps.map(councilWorkflowStepText).join('\n\n');
  assertContains(
    workflow,
    expectedBlock,
    'Provider smoke workflow must retain the contiguous Council v1.1f deterministic gate block',
  );
  const commandPositions = expectedCouncilWorkflowSteps.map((step) => {
    const position = workflow.indexOf(councilWorkflowStepText(step));
    assert.ok(position >= 0, `Provider smoke workflow must include Council step: ${step.name}`);
    return position;
  });
  assert.deepEqual(
    [...commandPositions].sort((left, right) => left - right),
    commandPositions,
    'Council v1.1f workflow steps must remain in the canonical unit-then-smoke order',
  );
}

function assertCouncilWorkflowNegativeChecks(workflow) {
  assertCouncilWorkflowContract(workflow);
  let checks = 0;
  for (const step of expectedCouncilWorkflowSteps) {
    const stepText = councilWorkflowStepText(step);
    const mutatedWorkflow = workflow.replace(stepText, '');
    assert.notEqual(mutatedWorkflow, workflow, `negative check must remove ${step.name}`);
    assert.throws(
      () => assertCouncilWorkflowContract(mutatedWorkflow),
      /Council v1\.1f|Council step|contiguous/,
      `Council contract must fail closed when ${step.name} is removed`,
    );
    checks += 1;
  }
  assert.equal(
    readRequiredFile(providerWorkflowPath),
    workflow,
    'Council negative checks must restore the repository workflow without filesystem mutation',
  );
  return checks;
}

function assertWorkflowContract({ workflow, workflowName, jobId, jobName, label }) {
  assert.equal(
    extractWorkflowTriggerBlock(workflow),
    expectedWorkflowTrigger,
    `${label} trigger contract must preserve pull-request coverage and limit push coverage to main`,
  );
  assert.match(workflow, new RegExp(`^name: ${escapeRegExp(workflowName)}\\n\\non:`, 'm'), `${label} name must remain stable`);
  assert.match(
    workflow,
    new RegExp(`^jobs:\\n  ${escapeRegExp(jobId)}:\\n    name: ${escapeRegExp(jobName)}$`, 'm'),
    `${label} job id and check name must remain stable`,
  );
}

function extractWorkflowTriggerBlock(workflow) {
  const start = workflow.indexOf('on:\n');
  const end = workflow.indexOf('\njobs:', start);

  assert.ok(start >= 0, 'workflow trigger block must start with top-level on');
  assert.ok(end >= 0, 'workflow trigger block must end before top-level jobs');

  return workflow.slice(start, end + 1);
}

function extractCheckoutBlock(workflow) {
  const start = workflow.indexOf('      - name: Checkout\n');
  const end = workflow.indexOf('\n      - ', start + 1);

  assert.ok(start >= 0, 'workflow must include a checkout step');
  assert.ok(end >= 0, 'checkout step must end before the next workflow step');

  return workflow.slice(start, end);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertNoLocalPaths(text) {
  assert.doesNotMatch(String(text || ''), /\/Users\//);
  assert.doesNotMatch(String(text || ''), /\/private\/var\/folders\//);
  assert.doesNotMatch(String(text || ''), /\/var\/folders\//);
}
