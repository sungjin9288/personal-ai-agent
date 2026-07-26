import {
  assertFineTuningDataIntakeRequest,
  buildFineTuningDataIntakeRequest,
} from '../src/core/fine-tuning-data-intake-request.mjs';
import { evaluateFineTuningDataCollectionPlan } from './evaluate-fine-tuning-data-collection-plan.mjs';
import { evaluateFineTuningDataSufficiency } from './evaluate-fine-tuning-data-sufficiency.mjs';

export function evaluateFineTuningDataIntakeRequest({
  expiresAt,
  repoDir = process.cwd(),
  requestedAt,
  requestedBy = 'local-operator-role',
} = {}) {
  const assessment = evaluateFineTuningDataSufficiency({ repoDir });
  const collectionPlan = evaluateFineTuningDataCollectionPlan({ repoDir });
  const request = buildFineTuningDataIntakeRequest({
    assessment,
    collectionPlan,
    expiresAt,
    requestedAt,
    requestedBy,
  });
  assertFineTuningDataIntakeRequest(request, {
    assessment,
    collectionPlan,
    now: requestedAt,
  });
  return request;
}
