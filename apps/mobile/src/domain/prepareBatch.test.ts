import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareBatch } from './prepareBatch';
import type { Asset, ImportedPhoto } from './records';
const assets: Asset[] = ['a', 'b', 'c'].map((id) => ({
  id,
  createdAt: null,
  width: 10,
  height: 20,
}));
const photo = (id: string): ImportedPhoto => ({
  id,
  contentHash: id,
  originalPath: `${id}.source`,
  createdAt: null,
  exifDateTime: '2026:06:12 23:30:00',
});
const options = { timeZone: 'Asia/Shanghai', isCancelled: () => false, onProgress: () => {} };
function rig(read: (id: string) => Promise<ImportedPhoto>) {
  const retained: string[] = [],
    released: string[] = [];
  return {
    retained,
    released,
    ports: {
      source: { importPhoto: read, thumbnail: async () => null },
      repository: { findDuplicate: async () => null },
      retain: (p: ImportedPhoto) => {
        retained.push(p.id);
      },
      release: async (p: ImportedPhoto) => {
        released.push(p.id);
      },
    },
  };
}
test('preparation reads sequentially, respects selected date, and marks within-batch duplicates', async () => {
  let running = 0,
    maximum = 0;
  const r = rig(async (id) => {
    running++;
    maximum = Math.max(maximum, running);
    await Promise.resolve();
    running--;
    return { ...photo(id), contentHash: 'same' };
  });
  const result = await prepareBatch(assets, [], r.ports, {
    ...options,
    selectedDate: '2024-02-29',
  });
  assert.equal(maximum, 1);
  assert.equal(result.drafts.length, 3);
  assert.ok(
    result.drafts.every(
      (draft) => draft.date.date === '2024-02-29' && draft.date.source === 'user',
    ),
  );
  assert.deepEqual(
    result.drafts.map((draft) => draft.include),
    [true, false, false],
  );
});
test('source errors allow later photos; storage errors stop further copies', async () => {
  const r = rig(async (id) => {
    if (id === 'b') throw new Error('SOURCE_NOT_LOCAL');
    return photo(id);
  });
  const result = await prepareBatch(assets, [], r.ports, options);
  assert.deepEqual(
    result.drafts.map((draft) => draft.asset.id),
    ['a', 'c'],
  );
  assert.equal(result.failures[0].code, 'SOURCE_NOT_LOCAL');
  const disk = rig(async (id) => {
    if (id === 'b') throw new Error('INSUFFICIENT_STORAGE');
    return photo(id);
  });
  const stopped = await prepareBatch(assets, [], disk.ports, options);
  assert.deepEqual(disk.retained, ['a']);
  assert.deepEqual(
    stopped.failures.map((failure) => failure.code),
    ['INSUFFICIENT_STORAGE', 'SKIPPED_STORAGE'],
  );
});
test('cancellation during a copy releases its staging ownership and does not read the next asset', async () => {
  let cancelled = false;
  const r = rig(async (id) => {
    cancelled = true;
    return photo(id);
  });
  const result = await prepareBatch(assets, [], r.ports, {
    ...options,
    isCancelled: () => cancelled,
  });
  assert.deepEqual(r.retained, ['a']);
  assert.deepEqual(r.released, ['a']);
  assert.equal(result.drafts.length, 0);
  assert.equal(result.failures.length, 3);
});
test('duplicate lookup failures release copied drafts instead of permitting unchecked imports', async () => {
  const r = rig(async (id) => photo(id));
  r.ports.repository.findDuplicate = async () => {
    throw new Error('DB_ERROR');
  };
  const result = await prepareBatch(assets, [], r.ports, options);
  assert.equal(result.drafts.length, 0);
  assert.deepEqual(r.released, ['a', 'b', 'c']);
});
