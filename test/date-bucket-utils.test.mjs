import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  accumulateCountMap,
  buildCountMapDelta,
  formatDateUtc,
  getUtcMonthRange,
  getUtcWeekRange,
} from '../src/core/date-bucket-utils.mjs';

test('formatDateUtc', async (t) => {
  await t.test('formats a finite UTC timestamp as YYYY-MM-DD', () => {
    const timestamp = Date.UTC(2024, 0, 15); // 2024-01-15
    assert.equal(formatDateUtc(timestamp), '2024-01-15');
  });

  await t.test('returns an empty string for non-finite input', () => {
    assert.equal(formatDateUtc(NaN), '');
    assert.equal(formatDateUtc(undefined), '');
  });
});

test('getUtcWeekRange', async (t) => {
  await t.test('returns null for an unparseable timestamp', () => {
    assert.equal(getUtcWeekRange('not-a-date'), null);
    assert.equal(getUtcWeekRange(''), null);
  });

  await t.test('resolves the Monday-start week for a mid-week Wednesday', () => {
    // 2024-01-03 is a Wednesday.
    const result = getUtcWeekRange('2024-01-03T09:00:00.000Z');
    assert.deepEqual(result, {
      key: '2024-01-01',
      weekEndDate: '2024-01-07',
      weekStartDate: '2024-01-01',
    });
  });

  await t.test('rolls a Sunday back to the preceding Monday (weekday 0 edge case)', () => {
    // 2024-01-07 is a Sunday, part of the week starting 2024-01-01.
    const result = getUtcWeekRange('2024-01-07T23:59:59.000Z');
    assert.deepEqual(result, {
      key: '2024-01-01',
      weekEndDate: '2024-01-07',
      weekStartDate: '2024-01-01',
    });
  });

  await t.test('handles a week spanning a year rollover', () => {
    // 2025-01-01 is a Wednesday; the ISO week starts 2024-12-30.
    const result = getUtcWeekRange('2025-01-01T00:00:00.000Z');
    assert.deepEqual(result, {
      key: '2024-12-30',
      weekEndDate: '2025-01-05',
      weekStartDate: '2024-12-30',
    });
  });
});

test('getUtcMonthRange', async (t) => {
  await t.test('returns null for an unparseable timestamp', () => {
    assert.equal(getUtcMonthRange('not-a-date'), null);
    assert.equal(getUtcMonthRange(null), null);
  });

  await t.test('resolves month boundaries for the first day of a 31-day month', () => {
    const result = getUtcMonthRange('2024-01-01T00:00:00.000Z');
    assert.deepEqual(result, {
      key: '2024-01',
      monthEndDate: '2024-01-31',
      monthKey: '2024-01',
      monthStartDate: '2024-01-01',
    });
  });

  await t.test('resolves month boundaries for a mid-month timestamp in a leap-year February', () => {
    const result = getUtcMonthRange('2024-02-15T12:00:00.000Z');
    assert.deepEqual(result, {
      key: '2024-02',
      monthEndDate: '2024-02-29',
      monthKey: '2024-02',
      monthStartDate: '2024-02-01',
    });
  });

  await t.test('resolves month boundaries across a year rollover (December)', () => {
    const result = getUtcMonthRange('2024-12-31T23:59:59.000Z');
    assert.deepEqual(result, {
      key: '2024-12',
      monthEndDate: '2024-12-31',
      monthKey: '2024-12',
      monthStartDate: '2024-12-01',
    });
  });
});

test('accumulateCountMap', async (t) => {
  await t.test('adds new keys from source into an empty target', () => {
    const target = accumulateCountMap({}, { a: 2, b: 3 });
    assert.deepEqual(target, { a: 2, b: 3 });
  });

  await t.test('adds onto existing keys already present in target', () => {
    const target = accumulateCountMap({ a: 1, b: 5 }, { a: 2, c: 4 });
    assert.deepEqual(target, { a: 3, b: 5, c: 4 });
  });

  await t.test('is a no-op when source is empty or omitted', () => {
    assert.deepEqual(accumulateCountMap({ a: 1 }, {}), { a: 1 });
    assert.deepEqual(accumulateCountMap({ a: 1 }), { a: 1 });
  });

  await t.test('skips zero and falsy values without creating keys', () => {
    const target = accumulateCountMap({}, { a: 0, b: null, c: 5 });
    assert.deepEqual(target, { c: 5 });
  });

  await t.test('mutates and returns the same target reference', () => {
    const target = {};
    const result = accumulateCountMap(target, { a: 1 });
    assert.equal(result, target);
  });
});

test('buildCountMapDelta', async (t) => {
  await t.test('computes a positive delta when a key is present in both maps', () => {
    const delta = buildCountMapDelta({ a: 5 }, { a: 2 });
    assert.deepEqual(delta, { a: 3 });
  });

  await t.test('treats an absent previous-count key as zero', () => {
    const delta = buildCountMapDelta({ a: 4 }, {});
    assert.deepEqual(delta, { a: 4 });
  });

  await t.test('treats an absent current-count key as zero, producing a negative delta', () => {
    const delta = buildCountMapDelta({}, { a: 4 });
    assert.deepEqual(delta, { a: -4 });
  });

  await t.test('omits keys whose delta is zero', () => {
    const delta = buildCountMapDelta({ a: 3, b: 1 }, { a: 3, b: 0 });
    assert.deepEqual(delta, { b: 1 });
  });

  await t.test('returns an empty object when both maps are empty', () => {
    assert.deepEqual(buildCountMapDelta({}, {}), {});
    assert.deepEqual(buildCountMapDelta(), {});
  });

  await t.test('returns keys sorted alphabetically', () => {
    const delta = buildCountMapDelta({ c: 1, a: 1, b: 1 }, {});
    assert.deepEqual(Object.keys(delta), ['a', 'b', 'c']);
  });
});
