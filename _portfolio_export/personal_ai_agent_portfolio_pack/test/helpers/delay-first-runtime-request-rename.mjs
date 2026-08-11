import fs from 'node:fs';
import path from 'node:path';

const delayMs = Number.parseInt(process.env.PERSONAL_AI_AGENT_TEST_RUNTIME_REQUEST_RENAME_DELAY_MS || '0', 10);
const delayedCompletionNumber = Number.parseInt(
  process.env.PERSONAL_AI_AGENT_TEST_RUNTIME_REQUEST_RENAME_COMPLETION_NUMBER || '1',
  10,
);
if (Number.isSafeInteger(delayMs) && delayMs > 0) {
  const originalRenameSync = fs.renameSync;
  let delayed = false;
  let completionCount = 0;

  fs.renameSync = function delayedRuntimeRequestRename(source, destination, ...options) {
    if (isRuntimeRequestCompletion(source, destination)) completionCount += 1;
    if (!delayed && completionCount === delayedCompletionNumber) {
      delayed = true;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs);
    }
    return originalRenameSync.call(this, source, destination, ...options);
  };
}

function isRuntimeRequestCompletion(source, destination) {
  const sourceName = path.basename(String(source));
  const destinationPath = String(destination);
  if (
    path.basename(destinationPath) !== 'runtime-requests.json' ||
    !sourceName.startsWith('runtime-requests.json.') ||
    !sourceName.endsWith('.tmp') ||
    !fs.existsSync(destinationPath)
  ) {
    return false;
  }

  try {
    const audit = JSON.parse(fs.readFileSync(source, 'utf8'));
    return Array.isArray(audit.active) && audit.active.length === 0;
  } catch {
    return false;
  }
}
