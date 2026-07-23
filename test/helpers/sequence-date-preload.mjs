import fs from 'node:fs';
import path from 'node:path';

const RealDate = globalThis.Date;
const timestamps = JSON.parse(process.env.FINE_TUNING_TEST_DATE_SEQUENCE || '[]')
  .map(requireTimestamp);
let index = 0;

if (timestamps.length === 0) {
  throw new Error('Test date preload requires at least one timestamp.');
}

function TestDate(...args) {
  if (!new.target) {
    return RealDate();
  }
  if (args.length > 0) {
    return new RealDate(...args);
  }
  applyHook(index);
  const timestamp = timestamps[Math.min(index, timestamps.length - 1)];
  index += 1;
  return new RealDate(timestamp);
}

Object.setPrototypeOf(TestDate, RealDate);
TestDate.prototype = RealDate.prototype;
TestDate.now = () => new RealDate(timestamps[Math.min(index, timestamps.length - 1)]).getTime();
TestDate.parse = RealDate.parse;
TestDate.UTC = RealDate.UTC;

globalThis.Date = TestDate;

function requireTimestamp(value) {
  const parsed = RealDate.parse(String(value || ''));
  if (!Number.isFinite(parsed)) {
    throw new Error('Test date preload timestamp is invalid.');
  }
  return new RealDate(parsed).toISOString();
}

function applyHook(currentIndex) {
  const hook = JSON.parse(process.env.FINE_TUNING_TEST_DATE_HOOK || 'null');
  if (!hook || hook.index !== currentIndex) return;
  for (const directory of hook.directories || []) {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    fs.chmodSync(directory, 0o700);
  }
  for (const file of hook.files || []) {
    fs.mkdirSync(path.dirname(file.filename), { recursive: true, mode: 0o700 });
    fs.writeFileSync(file.filename, `${JSON.stringify(file.value, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
    fs.chmodSync(file.filename, 0o600);
  }
}
