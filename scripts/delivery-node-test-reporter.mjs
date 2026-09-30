import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import { captureDeliverySource, validateNodeTestSummary } from '../src/core/delivery-evidence-import.mjs';

// Freeze the declared source before consuming test events, not at the first summary.
const repoDir = process.cwd();
const initial = captureDeliverySource(repoDir);
if (!/^v24\./.test(process.version) || process.env.NODE_OPTIONS ||
  process.execArgv.filter(arg => arg.startsWith('--test-reporter=')).length !== 1 || process.execArgv.some(arg =>
  arg !== '--test' && !arg.startsWith('--test-reporter=') && !/^--test-concurrency=([1-9]|1[0-6])$/.test(arg))) {
  throw new Error('Delivery reporter requires Node 24 and an unfiltered test invocation.');
}

export default async function* deliveryReporter(events) {
  let summary;
  const files = new Set();
  let fileFailed = false;
  for await (const event of events) {
    if (event.type !== 'test:summary') continue;
    const { file, success, counts } = event.data;
    if (file !== undefined) {
      // Node can fold an aborted file into a failed root count.
      if (counts.cancelled !== 0) throw new Error('Delivery reporter does not support cancelled tests.');
      const relative = path.relative(repoDir, path.resolve(repoDir, file));
      if (files.has(relative)) throw new Error('Delivery reporter received duplicate file summaries.');
      files.add(relative);
      fileFailed ||= !success;
      continue;
    }
    if (summary) throw new Error('Delivery reporter received duplicate root summaries.');
    summary = Object.fromEntries(['tests', 'passed', 'failed', 'cancelled', 'skipped', 'todo'].map(key => [key, counts[key]]));
    summary.success = success;
  }
  validateNodeTestSummary(summary);
  if (!isDeepStrictEqual([...files].sort(), initial.testFiles) || fileFailed === summary.success ||
    !isDeepStrictEqual(initial, captureDeliverySource(repoDir))) {
    throw new Error('Delivery reporter rejected incomplete coverage or source drift.');
  }
  yield `${JSON.stringify({ schemaVersion: 'delivery-node-test-receipt/v1', source: initial, summary }, null, 2)}\n`;
}
