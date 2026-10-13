import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRecordDate, proposeDate, monthCells, shiftMonth } from './datePolicy';
test('Gregorian dates reject impossible dates and handle century leap years', () => {
  for (const d of ['2026-02-29', '1900-02-29', '2026-04-31', '0000-01-01', '2026-1-01'])
    assert.equal(isRecordDate(d), false, d);
  for (const d of ['2000-02-29', '2024-02-29', '2026-12-31'])
    assert.equal(isRecordDate(d), true, d);
});
test('user date wins; EXIF literal date stays stable across time zones', () => {
  assert.equal(
    proposeDate({
      selectedDate: '2026-06-11',
      exifDateTime: '2026:06:12 00:01:00',
      timeZone: 'UTC',
    }).date,
    '2026-06-11',
  );
  for (const timeZone of ['UTC', 'America/Los_Angeles', 'Asia/Shanghai'])
    assert.equal(proposeDate({ exifDateTime: '2026:06:12 00:01:00', timeZone }).date, '2026-06-12');
  assert.throws(() => proposeDate({ selectedDate: '2026-02-29', timeZone: 'UTC' }));
});
test('absolute library timestamps respect selected timezone; missing dates stay pending', () => {
  assert.equal(
    proposeDate({ createdAt: '2026-06-11T17:00:00Z', timeZone: 'Asia/Shanghai' }).date,
    '2026-06-12',
  );
  assert.equal(
    proposeDate({ createdAt: '2026-06-11T17:00:00Z', timeZone: 'America/Los_Angeles' }).date,
    '2026-06-11',
  );
  assert.equal(proposeDate({ createdAt: '2026-06-11', timeZone: 'UTC' }).date, null);
  assert.equal(proposeDate({ exifDateTime: '2026:02:29 00:01:00', timeZone: 'UTC' }).date, null);
});
test('4, 5, 6 week months and year transitions', () => {
  assert.equal(monthCells(2026, 2).length, 28);
  assert.equal(monthCells(2026, 6).length, 35);
  assert.equal(monthCells(2026, 8).length, 42);
  assert.equal(monthCells(2026, 8).filter(Boolean).length, 31);
  assert.deepEqual(shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
  assert.deepEqual(shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
});
