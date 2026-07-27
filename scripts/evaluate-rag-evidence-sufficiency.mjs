import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertRagEvidenceSufficiencyArtifact,
  buildRagEvidenceSufficiencyArtifact,
  evaluateRagEvidenceSufficiencySuite,
} from '../src/core/rag-evidence-sufficiency-evaluation.mjs';

const repoDir = process.cwd();
const fixturePath = path.join(repoDir, 'fixtures/rag-evidence-sufficiency-cases-v1.json');
const outputPath = path.join(repoDir, 'evidence/output-artifacts/rag-evidence-sufficiency.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const suite = evaluateRagEvidenceSufficiencySuite(JSON.parse(fixtureText));
const artifact = buildRagEvidenceSufficiencyArtifact({
  fixtureHash: sha256(fixtureText),
  suite,
});
assertRagEvidenceSufficiencyArtifact(artifact);
fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  caseCount: artifact.aggregate.caseCount,
  externalProviderCalls: artifact.externalProviderCalls,
  mode: 'rag-evidence-sufficiency-evaluation',
  ok: true,
  outputPath: path.relative(repoDir, outputPath),
  productionReadyClaim: artifact.productionReadyClaim,
  stateCounts: artifact.aggregate.stateCounts,
}, null, 2));

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}
