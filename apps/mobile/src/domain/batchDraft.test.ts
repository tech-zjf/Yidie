import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changeDraftDates, groupDrafts, toBatchItems, type PreparedDraft } from './batchDraft';
const draft = (id: string, date: string | null): PreparedDraft => ({
  asset: { id, createdAt: null, width: 10, height: 20 },
  photo: {
    id,
    originalPath: `originals/${id}.source`,
    contentHash: id,
    createdAt: null,
    exifDateTime: null,
  },
  date: { date, source: date ? 'exif' : 'unknown' },
  previewUri: null,
  duplicate: null,
  include: true,
});
test('groups same-day photos and leaves unknown dates pending without inventing today', () => {
  const groups = groupDrafts([
    draft('a', '2026-06-12'),
    draft('b', null),
    draft('c', '2026-06-12'),
    draft('d', '2026-06-13'),
  ]);
  assert.deepEqual(
    groups.map((group) => [group.date, group.data.length]),
    [
      ['2026-06-13', 1],
      ['2026-06-12', 2],
      [null, 1],
    ],
  );
});
test('group and single-photo edits validate dates and record explicit user intent', () => {
  const originals = [draft('a', '2026-06-12'), draft('b', '2026-06-12'), draft('c', null)];
  const edited = changeDraftDates(originals, ['a', 'b'], '2024-02-29');
  assert.equal(edited[0].date.source, 'user');
  assert.equal(edited[1].date.date, '2024-02-29');
  assert.equal(edited[2].date.date, null);
  assert.equal(originals[0].date.source, 'exif');
  assert.equal(changeDraftDates(edited, ['a'], '')[0].date.source, 'unknown');
  assert.throws(() => changeDraftDates(originals, ['a'], '2026-02-29'), /INVALID_DATE/);
});
test('skipped duplicates are excluded; explicit include carries consent to storage', () => {
  const original = draft('a', '2026-06-12');
  const duplicate = {
    ...draft('b', '2026-06-12'),
    duplicate: { id: 'a', date: '2026-06-12' },
    include: false,
  };
  assert.equal(toBatchItems([original, duplicate]).length, 1);
  assert.equal(toBatchItems([{ ...duplicate, include: true }])[0].allowDuplicate, true);
});
