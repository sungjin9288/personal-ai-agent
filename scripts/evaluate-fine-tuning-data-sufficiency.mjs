import {
  assessFineTuningDataSufficiency,
  assertFineTuningDataSufficiencyAssessment,
} from '../src/core/fine-tuning-data-sufficiency.mjs';
import { buildDeterministicFineTuningReadinessFixture } from './local-training-permission-fixture.mjs';

export function evaluateFineTuningDataSufficiency({
  repoDir = process.cwd(),
} = {}) {
  const readinessPackage =
    buildDeterministicFineTuningReadinessFixture({ repoDir });
  const assessment = assessFineTuningDataSufficiency({ readinessPackage });
  assertFineTuningDataSufficiencyAssessment(assessment);
  return assessment;
}
