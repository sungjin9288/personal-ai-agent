import fs from 'node:fs';

import {
  buildFineTuningPrivateCollectionGapReplanShadow,
} from '../src/core/fine-tuning-private-collection-gap-replan.mjs';
import {
  parseFineTuningPrivateCombinedReadinessArguments,
  withFineTuningPrivateCombinedReadinessAuthority,
} from './helpers/fine-tuning-private-combined-readiness-authority.mjs';

const repoDir = fs.realpathSync(process.cwd());
const label = 'F1.25';
const filenames = parseFineTuningPrivateCombinedReadinessArguments(
  process.argv.slice(2),
  { label },
);
const projection = withFineTuningPrivateCombinedReadinessAuthority({
  filenames,
  label,
  lockLabel: 'F1.25 collection-gap replan shadow lock',
  project: buildFineTuningPrivateCollectionGapReplanShadow,
  repoDir,
});

console.log(JSON.stringify(projection, null, 2));
