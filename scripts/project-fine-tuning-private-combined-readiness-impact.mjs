import fs from 'node:fs';

import {
  buildFineTuningPrivateCombinedReadinessImpactShadow,
} from '../src/core/fine-tuning-private-combined-readiness-impact.mjs';
import {
  parseFineTuningPrivateCombinedReadinessArguments,
  withFineTuningPrivateCombinedReadinessAuthority,
} from './helpers/fine-tuning-private-combined-readiness-authority.mjs';

const repoDir = fs.realpathSync(process.cwd());
const label = 'F1.24';
const filenames = parseFineTuningPrivateCombinedReadinessArguments(
  process.argv.slice(2),
  { label },
);
const projection = withFineTuningPrivateCombinedReadinessAuthority({
  filenames,
  label,
  lockLabel: 'F1.24 combined readiness impact shadow lock',
  project: buildFineTuningPrivateCombinedReadinessImpactShadow,
  repoDir,
});

console.log(JSON.stringify(projection, null, 2));
