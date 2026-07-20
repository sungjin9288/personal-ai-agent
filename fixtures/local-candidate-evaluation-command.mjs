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
  const evaluation = buildCandidateEvaluation();
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

function buildCandidateEvaluation() {
  const answerQualityFixture = readFixture(
    'answer-quality-cases-v1.json',
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
