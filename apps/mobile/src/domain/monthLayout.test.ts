import assert from 'node:assert/strict';
import test from 'node:test';
import type { Entry } from './records';
import { monthExportPayload, monthLayout } from './monthLayout';

function entry(id: string, date: string, index: number, ready = true): Entry {
  return {
    id,
    date,
    dateSource: 'user',
    originalPath: `originals/${id}.source`,
    photoPreviewPath: `photo-previews/${id}.jpg`,
    photoWidth: 300,
    photoHeight: 520,
    stickerPath: ready ? `stickers/${id}-v0.png` : null,
    cutoutPath: null,
    thumbnailPath: ready ? `previews/${id}-v0.png` : null,
    effect: 'outline',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    styleRevision: 0,
    width: ready ? 300 : null,
    height: ready ? 520 : null,
    status: ready ? 'ready' : 'failed',
    revision: 0,
    sortKey: index,
    isCover: false,
    errorCode: ready ? null : 'NO_FOREGROUND',
  };
}

test('month layout shares bounded stack, count badge, and safe geometry', () => {
  const ids = ['a', 'b', 'c', 'd'];
  const entries = ids.map((id, index) => entry(id, '2026-06-17', index));
  entries.push(entry('failed', '2026-06-18', 4, false));

  const compact = monthLayout({
    year: 2026,
    month: 6,
    screenWidth: 375,
    fontScale: 1,
    entries,
  });
  const stack = compact.cells.find((cell) => cell?.date === '2026-06-17');
  assert.ok(stack);
  assert.equal(stack.entries.length, 4);
  assert.deepEqual(
    stack.stickers.map((sticker) => sticker.id),
    ['a', 'b', 'c'],
  );
  assert.deepEqual(
    stack.stickers.map((sticker) => sticker.rotation),
    [-4, 9, -11],
  );
  assert.equal(stack.badge?.top !== undefined, true);
  assert.equal(stack.badge?.right !== undefined, true);

  const failed = compact.cells.find((cell) => cell?.date === '2026-06-18');
  assert.equal(failed?.stickers[0]?.kind, 'photoPreview');
  assert.equal(failed?.badge, null);
  assert.equal(compact.contentWidth, 343);

  const exported = monthExportPayload({
    year: 2026,
    month: 6,
    screenWidth: 375,
    fontScale: 1,
    entries,
    today: '2026-06-17',
  });
  assert.equal(exported.monthTitle, 'Jun ’26');
  assert.equal(exported.includeSignature, false);
  assert.equal(exported.cells[17]?.count, 4);
  assert.equal(exported.cells[17]?.stickers.length, 3);
  assert.deepEqual(
    exported.cells[17]?.stickers.map((sticker) => sticker.id),
    ['a', 'b', 'c'],
  );
  assert.equal(
    monthExportPayload({
      year: 2026,
      month: 6,
      screenWidth: 375,
      fontScale: 1,
      entries: [],
      today: '2026-06-17',
      includeSignature: true,
    }).includeSignature,
    true,
  );

  const accessibleSize = monthLayout({
    year: 2026,
    month: 6,
    screenWidth: 320,
    fontScale: 1.5,
    entries: [],
  });
  assert.equal(accessibleSize.cellHeight, 66);
  assert.ok(accessibleSize.cells.length === 35 || accessibleSize.cells.length === 42);
  assert.equal(accessibleSize.cells.filter(Boolean).length, 30);
});
