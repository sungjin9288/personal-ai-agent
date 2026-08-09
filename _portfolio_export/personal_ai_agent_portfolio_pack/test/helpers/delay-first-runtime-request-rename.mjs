import fs from 'node:fs';
import path from 'node:path';

const delayMs = Number.parseInt(process.env.PERSONAL_AI_AGENT_TEST_RUNTIME_REQUEST_RENAME_DELAY_MS || '0', 10);
if (Number.isSafeInteger(delayMs) && delayMs > 0) {
  const originalRenameSync = fs.renameSync;
  let delayed = false;

  fs.renameSync = function delayedRuntimeRequestRename(source, destination, ...options) {
    if (!delayed && isRuntimeRequestCompletion(source, destination)) {
      delayed = true;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs);
    }
    return originalRenameSync.call(this, source, destination, ...options);
  };
}

function isRuntimeRequestCompletion(source, destination) {
  const sourceName = path.basename(String(source));
  const destinationPath = String(destination);
  return path.basename(destinationPath) === 'runtime-requests.json' &&
    sourceName.startsWith('runtime-requests.json.') &&
    sourceName.endsWith('.tmp') &&
    fs.existsSync(destinationPath);
}
