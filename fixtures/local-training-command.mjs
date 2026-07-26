import { createHash } from 'node:crypto';

const mode = readOption('--mode', 'success');
const candidateArtifactSha256 = readOption('--candidate-artifact-sha256', '');
const forbiddenEnvironmentKeys = [
  'ANTHROPIC_API_KEY',
  'AWS_SECRET_ACCESS_KEY',
  'OPENAI_API_KEY',
];

if (forbiddenEnvironmentKeys.some((key) => process.env[key])) {
  process.stderr.write('forbidden parent environment reached local trainer');
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
  process.stdout.write('x'.repeat(2 * 1024 * 1024));
} else if (mode === 'invalid-json') {
  process.stdout.write('not-json');
} else {
  const trainSha256 = payload.dataset.train.sha256;
  const validationSha256 = payload.dataset.validation.sha256;
  const artifactSha256 = createHash('sha256')
    .update([
      payload.baseModelId,
      payload.dataset.datasetHash,
      trainSha256,
      validationSha256,
    ].join(':'))
    .digest('hex');
  const result = {
    baseModelId: payload.baseModelId,
    candidate: {
      artifactFormat: 'fixture-candidate-metadata/v1',
      artifactSha256: /^[a-f0-9]{64}$/.test(candidateArtifactSha256)
        ? candidateArtifactSha256
        : artifactSha256,
      modelId: 'fixture-local-candidate-v1',
    },
    datasetHash: mode === 'mismatch' ? '0'.repeat(64) : payload.dataset.datasetHash,
    executionKind: payload.executionKind,
    readinessHash: payload.dataset.readinessHash,
    schemaVersion: payload.schemaVersion,
    status: 'completed',
    trainerReportedActualModelTrainingExecuted:
      mode === 'simulate-local-model-training',
    trainerId: payload.trainerId,
    trainSha256,
    validationSha256,
  };
  if (mode === 'unsupported-field') {
    result.trainingText = payload.dataset.train.content;
  }
  if (mode === 'unsafe-metadata') {
    result.candidate.modelId = 'password=raw-customer-secret';
  }
  process.stdout.write(JSON.stringify(result));
}

function readOption(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}
