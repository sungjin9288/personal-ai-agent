import fs from 'node:fs';
import path from 'node:path';

const input = path.resolve(
  process.env.FINE_TUNING_TEST_REPLACE_INPUT_AFTER_PUBLISH || '',
);
const rename = fs.renameSync.bind(fs);
let replaced = false;

fs.renameSync = (source, destination) => {
  const result = rename(source, destination);
  if (
    !replaced &&
    path.basename(source).startsWith(
      '.fine-tuning-private-answer-quality-case-payload-pending-',
    ) &&
    /^[a-f0-9]{64}$/u.test(path.basename(destination))
  ) {
    const bytes = fs.readFileSync(input);
    fs.unlinkSync(input);
    fs.writeFileSync(input, bytes);
    fs.chmodSync(input, 0o600);
    replaced = true;
  }
  return result;
};
