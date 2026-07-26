import {
  assertFineTuningDataCollectionPlan,
  buildFineTuningDataCollectionPlan,
} from '../src/core/fine-tuning-data-collection-plan.mjs';
import { evaluateFineTuningDataSufficiency } from './evaluate-fine-tuning-data-sufficiency.mjs';

export function evaluateFineTuningDataCollectionPlan({
  repoDir = process.cwd(),
} = {}) {
  const assessment = evaluateFineTuningDataSufficiency({ repoDir });
  const plan = buildFineTuningDataCollectionPlan({ assessment });
  assertFineTuningDataCollectionPlan(plan, { assessment });
  return plan;
}
