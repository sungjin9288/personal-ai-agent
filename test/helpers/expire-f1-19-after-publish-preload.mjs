import fs from 'node:fs';
import path from 'node:path';

const RealDate = globalThis.Date;
const before = timestamp(
  process.env.FINE_TUNING_TEST_BEFORE_PUBLISH_DATE,
);
const expired = timestamp(
  process.env.FINE_TUNING_TEST_AFTER_PUBLISH_DATE,
);
const rename = fs.renameSync.bind(fs);
let published = false;

function TestDate(...args) {
  if (!new.target) {
    return RealDate();
  }
  if (args.length > 0) {
    return new RealDate(...args);
  }
  return new RealDate(published ? expired : before);
}

Object.setPrototypeOf(TestDate, RealDate);
TestDate.prototype = RealDate.prototype;
TestDate.now = () => RealDate.parse(published ? expired : before);
TestDate.parse = RealDate.parse;
TestDate.UTC = RealDate.UTC;

fs.renameSync = (source, destination) => {
  const result = rename(source, destination);
  if (
    path.basename(source).startsWith(
      '.fine-tuning-private-answer-quality-case-payload-pending-',
    ) &&
    /^[a-f0-9]{64}$/u.test(path.basename(destination))
  ) {
    published = true;
  }
  return result;
};

globalThis.Date = TestDate;

function timestamp(value) {
  const parsed = RealDate.parse(String(value || ''));
  if (!Number.isFinite(parsed)) {
    throw new Error('F1.19 post-publish expiry preload timestamp is invalid.');
  }
  return new RealDate(parsed).toISOString();
}
