import path from 'node:path';

import {
  describeLocalCandidateEvaluator,
} from '../src/core/local-candidate-evaluator-provenance.mjs';

export function createLocalCandidateEvaluatorFixture({
  command = process.execPath,
  repoDir = process.cwd(),
} = {}) {
  const definition = {
    assetPaths: [
      'fixtures/candidate-model-evaluation-cases-v1.json',
    ],
    command,
    entryPath:
      'fixtures/local-candidate-evaluation-command.mjs',
    rootDir: path.resolve(repoDir),
  };
  return {
    definition,
    entryPath: path.join(
      definition.rootDir,
      definition.entryPath,
    ),
    provenance:
      describeLocalCandidateEvaluator(definition),
  };
}
