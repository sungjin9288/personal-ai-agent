const RealDate = globalThis.Date;
const timestamps = [
  requireTimestamp(process.env.FINE_TUNING_TEST_FIRST_NO_ARG_DATE),
  requireTimestamp(process.env.FINE_TUNING_TEST_SECOND_NO_ARG_DATE),
];
let index = 0;

function TestDate(...args) {
  if (!new.target) {
    return RealDate();
  }
  if (args.length > 0) {
    return new RealDate(...args);
  }
  const timestamp = timestamps[Math.min(index, timestamps.length - 1)];
  index += 1;
  return new RealDate(timestamp);
}

Object.setPrototypeOf(TestDate, RealDate);
TestDate.prototype = RealDate.prototype;
TestDate.now = RealDate.now;
TestDate.parse = RealDate.parse;
TestDate.UTC = RealDate.UTC;

globalThis.Date = TestDate;

function requireTimestamp(value) {
  const timestamp = Date.parse(String(value || ''));
  if (!Number.isFinite(timestamp)) {
    throw new Error('Test date preload requires two valid timestamps.');
  }
  return new RealDate(timestamp).toISOString();
}
