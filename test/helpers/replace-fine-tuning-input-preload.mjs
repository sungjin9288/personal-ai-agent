import fs from 'node:fs';
import path from 'node:path';

const target = process.env.FINE_TUNING_REPLACE_INPUT;
const lane = process.env.FINE_TUNING_REPLACE_LANE;
const replacePhase = process.env.FINE_TUNING_REPLACE_PHASE;
const originalMkdtempSync = fs.mkdtempSync;
const originalRenameSync = fs.renameSync;
let replaced = false;
let replacedLane = false;

fs.mkdtempSync = function replaceInputDuringStaging(...args) {
  if (!replacePhase) {
    replaceConfiguredInput();
  }
  const directory = originalMkdtempSync.apply(this, args);
  if (!replacePhase) {
    replaceConfiguredInput();
  }
  return directory;
};

fs.renameSync = function replaceDuringItemPublish(source, destination, ...args) {
  const itemPublish =
    path.basename(String(source)).startsWith('.fine-tuning-private-collection-item-staging-') &&
    path.basename(String(destination)).startsWith('fine-tuning-private-collection-item-');
  const lifecycleRemoval =
    path.basename(String(source)).startsWith('fine-tuning-private-collection-item-') &&
    path.basename(String(destination)).startsWith('.fine-tuning-private-collection-item-removal-');
  if (itemPublish && replacePhase === 'before-item-rename') {
    replaceConfiguredInput();
  }
  const result = originalRenameSync.call(this, source, destination, ...args);
  if (itemPublish && replacePhase === 'after-item-rename') {
    replaceConfiguredInput();
  }
  if (lifecycleRemoval && replacePhase === 'after-removal-rename') {
    replaceConfiguredInput();
  }
  return result;
};

function replaceConfiguredInput() {
  if (!replaced && target) {
    const bytes = fs.readFileSync(target);
    const temporary = path.join(path.dirname(target), '.same-byte-replacement.json');
    fs.writeFileSync(temporary, bytes, { mode: 0o600, flag: 'wx' });
    fs.chmodSync(temporary, 0o600);
    originalRenameSync(temporary, target);
    replaced = true;
  }
  if (!replacedLane && lane) {
    const replacement = `${lane}-replacement`;
    originalRenameSync(lane, replacement);
    fs.symlinkSync(replacement, lane);
    replacedLane = true;
  }
}
