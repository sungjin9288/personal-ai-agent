import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  evaluateAnswerQualitySuite,
} from '../src/core/answer-quality-evaluation.mjs';
import {
  buildRetrievalContext,
} from '../src/core/retrieval-service.mjs';

const mode = readOption('--mode', 'success');
const forbiddenEnvironmentKeys = [
  'ANTHROPIC_API_KEY',
  'AWS_SECRET_ACCESS_KEY',
  'OPENAI_API_KEY',
];

if (forbiddenEnvironmentKeys.some((key) => process.env[key])) {
  process.stderr.write(
    'forbidden parent environment reached local evaluator',
  );
  process.exit(70);
}

let input = '';
for await (const chunk of process.stdin) {
  input += chunk;
}
const payload = JSON.parse(input);

if (mode === 'hang') {
  setInterval(() => {}, 10_000);
} else if (mode === 'fail') {
  process.stderr.write('password=raw-customer-secret');
  process.exit(9);
} else if (mode === 'large-output') {
  process.stdout.write('x'.repeat(5 * 1024 * 1024));
} else if (mode === 'invalid-json') {
  process.stdout.write('not-json');
} else {
  assertCandidateRoot(payload.candidate.artifactRoot);
  const evaluation = buildCandidateEvaluation(payload);
  if (mode === 'case-drift') {
    evaluation.cases.pop();
    evaluation.summary.caseCount -= 1;
    evaluation.summary.passedCaseCount -= 1;
  }
  if (mode === 'threshold-drift') {
    evaluation.thresholds.minimumCasePassRate = 0.5;
  }
  if (mode === 'raw-output') {
    evaluation.cases[0].answer = {
      text: 'raw candidate answer',
    };
  }
  if (mode === 'invalid-summary') {
    evaluation.summary.totals.citedSourceCount += 1;
  }
  if (mode === 'tamper-candidate-view') {
    tamperCandidateView(payload.candidate.artifactRoot);
  }
  if (mode === 'tamper-suite-view') {
    tamperSuiteView(payload.evaluationSuite.artifact.path);
  }
  if (mode === 'tamper-evaluator-view') {
    tamperEvaluatorView();
  }
  const result = {
    actualModelEvaluated:
      payload.executionKind === 'local-model-evaluation',
    admissionId: payload.admission.id,
    candidate: {
      artifactSetSha256:
        payload.candidate.artifactSetSha256,
      modelId: payload.candidate.modelId,
    },
    candidateArtifactVerificationId:
      payload.candidateArtifactVerification.id,
    candidateEvaluation: evaluation,
    dataset: payload.dataset,
    evaluationSuite: payload.evaluationSuite,
    evaluatorId: payload.evaluatorId,
    executionKind: payload.executionKind,
    requestId:
      mode === 'mismatch'
        ? 'local-candidate-evaluation-request-mismatch'
        : payload.request.id,
    schemaVersion: payload.schemaVersion,
    status: 'completed',
  };
  if (mode === 'actual-mismatch') {
    result.actualModelEvaluated =
      !result.actualModelEvaluated;
  }
  if (mode === 'unsupported-field') {
    result.rawCandidateOutput =
      'must-not-cross-runtime-boundary';
  }
  process.stdout.write(JSON.stringify(result));
}

function buildCandidateEvaluation(payload) {
  const answerQualityFixture = readEvaluationSuite(
    payload.evaluationSuite.artifact,
  );
  const candidateFixture = readFixture(
    'candidate-model-evaluation-cases-v1.json',
  );
  const cases = answerQualityFixture.cases.map(
    ({ retrievalInput, ...definition }) => ({
      ...definition,
      answer: candidateFixture.passingAnswers[definition.id],
      retrievedItems: buildRetrievalContext(retrievalInput),
    }),
  );
  return evaluateAnswerQualitySuite({
    cases,
    thresholds: answerQualityFixture.thresholds,
  });
}

function resolveWorkspaceFile(relativePath) {
  const cwd = fs.realpathSync(process.cwd());
  const target = path.resolve(cwd, relativePath);
  const relative = path.relative(cwd, target);
  if (
    relative.startsWith('..') ||
    path.isAbsolute(relative)
  ) {
    throw new Error(
      'Evaluation input escaped the temporary workspace.',
    );
  }
  return target;
}

function readEvaluationSuite(artifact) {
  const suitePath = resolveWorkspaceFile(artifact.path);
  const stat = fs.lstatSync(suitePath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(
      'Evaluation suite must be a regular workspace file.',
    );
  }
  const content = fs.readFileSync(suitePath);
  const sha256 = createHash('sha256')
    .update(content)
    .digest('hex');
  const suite = JSON.parse(content.toString('utf8'));
  if (
    content.byteLength !== artifact.byteLength ||
    sha256 !== artifact.sha256 ||
    suite.schemaVersion !== artifact.schemaVersion
  ) {
    throw new Error(
      'Evaluation suite bytes do not match the admitted artifact.',
    );
  }
  return suite;
}

function assertCandidateRoot(relativeRoot) {
  const cwd = fs.realpathSync(process.cwd());
  const candidateRoot = fs.realpathSync(
    path.resolve(cwd, relativeRoot),
  );
  const relative = path.relative(cwd, candidateRoot);
  if (
    relative.startsWith('..') ||
    path.isAbsolute(relative) ||
    !fs.lstatSync(candidateRoot).isDirectory()
  ) {
    throw new Error(
      'Candidate artifact root escaped the evaluation workspace.',
    );
  }
}

function tamperCandidateView(relativeRoot) {
  const candidateRoot = resolveWorkspaceFile(relativeRoot);
  const target = findFirstRegularFile(candidateRoot);
  if (!target) {
    throw new Error(
      'Candidate execution view has no regular artifact file.',
    );
  }
  fs.chmodSync(target, 0o600);
  fs.appendFileSync(target, 'tampered-after-evaluation');
}

function findFirstRegularFile(directory) {
  for (const name of fs.readdirSync(directory).sort()) {
    const target = path.join(directory, name);
    const stat = fs.lstatSync(target);
    if (stat.isFile() && !stat.isSymbolicLink()) {
      return target;
    }
    if (stat.isDirectory() && !stat.isSymbolicLink()) {
      const nested = findFirstRegularFile(target);
      if (nested) {
        return nested;
      }
    }
  }
  return null;
}

function tamperSuiteView(relativePath) {
  const target = resolveWorkspaceFile(relativePath);
  fs.chmodSync(target, 0o600);
  fs.appendFileSync(target, '\n');
}

function tamperEvaluatorView() {
  const target = new URL(
    'candidate-model-evaluation-cases-v1.json',
    import.meta.url,
  );
  fs.chmodSync(target, 0o600);
  fs.appendFileSync(target, '\n');
}

function readFixture(fileName) {
  return JSON.parse(
    fs.readFileSync(
      new URL(fileName, import.meta.url),
      'utf8',
    ),
  );
}

function readOption(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}
