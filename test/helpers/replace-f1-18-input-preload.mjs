import fs from 'node:fs';
import path from 'node:path';

const target = process.env.FINE_TUNING_F1_18_REPLACE_INPUT;
const mode = process.env.FINE_TUNING_F1_18_REPLACE_MODE;
const originalMkdirSync = fs.mkdirSync;
const originalRenameSync = fs.renameSync;
let replaced = false;

fs.mkdirSync = function replaceInputAfterPendingCaseCreation(directory, ...args) {
  const result = originalMkdirSync.call(this, directory, ...args);
  if (
    !replaced &&
    target &&
    path.basename(String(directory)).startsWith(
      '.fine-tuning-private-answer-quality-case-pending-',
    )
  ) {
    const bytes = fs.readFileSync(target);
    if (mode === 'bytes') {
      fs.writeFileSync(target, Buffer.concat([bytes, Buffer.from(' ')]));
      fs.chmodSync(target, 0o600);
    } else if (mode === 'inode') {
      const replacement = path.join(
        path.dirname(target),
        '.f1-18-same-byte-replacement.json',
      );
      fs.writeFileSync(replacement, bytes, { flag: 'wx', mode: 0o600 });
      fs.chmodSync(replacement, 0o600);
      originalRenameSync(replacement, target);
    }
    replaced = true;
  }
  return result;
};
