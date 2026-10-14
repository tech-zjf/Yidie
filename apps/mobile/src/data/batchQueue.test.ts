import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeDatabase } from './initializeDatabase';
import { schema, migrations } from './schema.generated';
import { fixture, photo, ready, sticker } from './testSupport';
import { createEntryActions } from '../domain/entryActions';
import type { BatchItem, PhotoProcessor } from '../domain/records';
const item = (id: string): BatchItem => ({
  photo: { ...photo(id), sourceAssetId: `asset-${id}` },
  date: { date: '2026-06-12', source: 'user' },
  allowDuplicate: false,
});
const processor: PhotoProcessor = {
  createSticker: async (id) => sticker(id),
  discardImport: async () => {},
};
function latch() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
test('batch persists every record before processing; invalid items roll back the whole batch', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  await initializeDatabase(r.db, r.write);
  await assert.rejects(
    r.repository.queueBatch([
      item('a'),
      { ...item('b'), date: { date: '2026-02-29', source: 'user' } },
    ]),
    /INVALID_DATE/,
  );
  assert.equal((await r.repository.list()).length, 0);
  await r.repository.queueBatch([item('a'), item('b')]);
  assert.deepEqual(await r.repository.queueCounts(), {
    queued: 2,
    running: 0,
    paused: 0,
    failed: 0,
  });
  assert.equal(
    r.sqlite.prepare("SELECT source_asset_id FROM entries WHERE id='a'").get()?.source_asset_id,
    'asset-a',
  );
  const actions = createEntryActions(r.repository, processor);
  await actions.queue.start();
  assert.ok((await r.repository.list()).every((row) => row.status === 'ready'));
  assert.equal(actions.queue.getSnapshot().completed, 2);
});
test('duplicates are rechecked atomically by hash and asset ID; explicit opt-in is required', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  await initializeDatabase(r.db, r.write);
  await ready(r, 'existing');
  const duplicate = {
    ...item('duplicate'),
    photo: { ...photo('duplicate'), contentHash: photo('existing').contentHash },
  };
  await assert.rejects(r.repository.queueBatch([item('new'), duplicate]), /DUPLICATE_REVIEW/);
  assert.equal(await r.repository.get('new'), null);
  await r.repository.queueBatch([{ ...duplicate, allowDuplicate: true }]);
  const a = item('a'),
    b = item('b');
  b.photo.sourceAssetId = a.photo.sourceAssetId;
  await assert.rejects(r.repository.queueBatch([a, b]), /DUPLICATE_REVIEW/);
  assert.equal(await r.repository.get('a'), null);
  await assert.rejects(r.repository.queueBatch([]), /BATCH_LIMIT/);
  await assert.rejects(
    r.repository.queueBatch(Array.from({ length: 11 }, (_, n) => item(String(n)))),
    /BATCH_LIMIT/,
  );
});
test('one image failing does not block later jobs or delete any originals', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  await initializeDatabase(r.db, r.write);
  await r.repository.queueBatch([item('a'), item('b'), item('c')]);
  const calls: string[] = [];
  const actions = createEntryActions(r.repository, {
    createSticker: async (id) => {
      calls.push(id);
      if (id === 'b') throw new Error('NO_FOREGROUND');
      return sticker(id);
    },
    discardImport: async () => {
      assert.fail('No originals should be deleted');
    },
  });
  await actions.queue.start();
  assert.deepEqual(calls, ['a', 'b', 'c']);
  assert.equal((await r.repository.get('b'))?.status, 'failed');
  assert.equal((await r.repository.get('c'))?.status, 'ready');
  assert.equal(actions.queue.getSnapshot().failed, 1);
});
test('pause finishes only the current image; resume claims remaining jobs with new revisions', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  await initializeDatabase(r.db, r.write);
  await r.repository.queueBatch([item('a'), item('b'), item('c')]);
  const entered = latch(),
    release = latch();
  const actions = createEntryActions(r.repository, {
    ...processor,
    createSticker: async (id) => {
      if (id === 'a') {
        entered.resolve();
        await release.promise;
      }
      return sticker(id);
    },
  });
  const run = actions.queue.start();
  await entered.promise;
  const pause = actions.queue.pause();
  release.resolve();
  await Promise.all([run, pause]);
  assert.equal((await r.repository.get('a'))?.status, 'ready');
  assert.equal((await r.repository.get('b'))?.status, 'paused');
  await actions.queue.setForeground(false);
  await actions.queue.setForeground(true);
  assert.equal((await r.repository.get('b'))?.status, 'paused');
  await actions.queue.resume();
  assert.equal((await r.repository.get('b'))?.revision, 1);
  assert.ok((await r.repository.list()).every((row) => row.status === 'ready'));
});
test('foreground return resumes only background work, preserving manually paused items', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  await initializeDatabase(r.db, r.write);
  await r.repository.queueBatch([item('old')]);
  await r.repository.pauseQueued('user');
  await r.repository.queueBatch([item('a'), item('b')]);
  const entered = latch(),
    release = latch();
  const actions = createEntryActions(r.repository, {
    ...processor,
    createSticker: async (id) => {
      if (id === 'a') {
        entered.resolve();
        await release.promise;
      }
      return sticker(id);
    },
  });
  const run = actions.queue.start();
  await entered.promise;
  const background = actions.queue.setForeground(false);
  release.resolve();
  await Promise.all([run, background]);
  assert.equal((await r.repository.get('b'))?.status, 'paused');
  await actions.queue.setForeground(true);
  assert.equal((await r.repository.get('b'))?.status, 'ready');
  assert.equal((await r.repository.get('old'))?.status, 'paused');
});
test('backup suspension waits for the active photo and resumes only work it suspended', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  await initializeDatabase(r.db, r.write);
  await r.repository.queueBatch([item('old')]);
  await r.repository.pauseQueued('user');
  await r.repository.queueBatch([item('a'), item('b')]);
  const entered = latch(),
    release = latch();
  const actions = createEntryActions(r.repository, {
    ...processor,
    createSticker: async (id) => {
      if (id === 'a') {
        entered.resolve();
        await release.promise;
      }
      return sticker(id);
    },
  });
  const run = actions.queue.start();
  await entered.promise;
  const suspension = actions.queue.suspend();
  release.resolve();
  const resume = await suspension;
  await run;
  assert.equal((await r.repository.get('a'))?.status, 'ready');
  assert.equal((await r.repository.get('b'))?.status, 'paused');
  assert.equal(
    r.sqlite.prepare("SELECT pause_reason FROM processing_jobs WHERE entry_id='b'").get()
      ?.pause_reason,
    'background',
  );
  await resume();
  assert.equal((await r.repository.get('b'))?.status, 'ready');
  assert.equal((await r.repository.get('old'))?.status, 'paused');
});
test('restart pauses persisted jobs and requires explicit resume; old results are rejected', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  await initializeDatabase(r.db, r.write);
  await r.repository.queueBatch([item('a'), item('b')]);
  const old = await r.repository.claimNext();
  assert.ok(old);
  await initializeDatabase(r.db, r.write);
  const actions = createEntryActions(r.repository, processor);
  await actions.queue.refresh();
  await actions.queue.setForeground(true);
  assert.equal(actions.queue.getSnapshot().paused, 2);
  assert.equal(actions.queue.getSnapshot().requested, false);
  await actions.queue.resume();
  await assert.rejects(r.repository.finish(old, sticker(old.id)), /STALE_RESULT/);
  assert.ok((await r.repository.list()).every((row) => row.status === 'ready'));
});
test('insufficient storage stops remaining jobs and retains every original record', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  await initializeDatabase(r.db, r.write);
  await r.repository.queueBatch([item('a'), item('b')]);
  const actions = createEntryActions(r.repository, {
    ...processor,
    createSticker: async () => {
      throw new Error('INSUFFICIENT_STORAGE');
    },
  });
  await actions.queue.start();
  assert.equal((await r.repository.get('a'))?.status, 'failed');
  assert.equal((await r.repository.get('b'))?.status, 'paused');
  assert.equal(actions.queue.getSnapshot().error, 'INSUFFICIENT_STORAGE');
  assert.equal((await r.repository.list()).length, 2);
});
test('queue and manual retry share one image worker', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  await initializeDatabase(r.db, r.write);
  const ticket = await r.repository.begin(photo('failed'), { date: null, source: 'unknown' });
  await r.repository.fail(ticket, 'NO_FOREGROUND');
  await r.repository.queueBatch([item('a'), item('b')]);
  let running = 0,
    maximum = 0;
  const actions = createEntryActions(r.repository, {
    ...processor,
    createSticker: async (id) => {
      running++;
      maximum = Math.max(maximum, running);
      await new Promise((resolve) => setTimeout(resolve, 1));
      running--;
      return sticker(id);
    },
  });
  await Promise.all([actions.queue.start(), actions.retry('failed', 0)]);
  assert.equal(maximum, 1);
  assert.ok((await r.repository.list()).every((row) => row.status === 'ready'));
});

test('a failed database transition stops work until restart and preserves all records', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  await initializeDatabase(r.db, r.write);
  await r.repository.queueBatch([item('a'), item('b')]);
  r.sqlite.exec(`CREATE TRIGGER reject_result BEFORE UPDATE OF processing_state ON entries
    WHEN NEW.processing_state IN ('ready','failed')
    BEGIN SELECT RAISE(ABORT, 'DISK_WRITE_FAILED'); END`);
  const calls: string[] = [];
  const actions = createEntryActions(r.repository, {
    ...processor,
    createSticker: async (id) => {
      calls.push(id);
      return sticker(id);
    },
  });
  await actions.queue.start();
  assert.deepEqual(calls, ['a']);
  assert.equal(actions.queue.getSnapshot().requiresRestart, true);
  assert.equal((await r.repository.get('a'))?.status, 'running');
  assert.equal((await r.repository.get('b'))?.status, 'queued');
  await actions.queue.resume();
  await actions.queue.start();
  assert.deepEqual(calls, ['a']);
  r.sqlite.exec('DROP TRIGGER reject_result');
  await initializeDatabase(r.db, r.write);
  const recovered = createEntryActions(r.repository, processor);
  await recovered.queue.refresh();
  assert.equal(recovered.queue.getSnapshot().paused, 2);
  await recovered.queue.resume();
  assert.ok((await r.repository.list()).every((row) => row.status === 'ready'));
});

test('v2 migration preserves archived entries and pending deletions while recovering old jobs', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  r.sqlite.exec(schema);
  r.sqlite.exec(migrations[2]);
  r.sqlite.exec(`PRAGMA user_version=2;
    INSERT INTO entries(id,date_source,original_path,processing_state,layout_seed,sort_key,imported_at,updated_at)
      VALUES ('paused','unknown','originals/paused.source','paused',0,1,'now','now');
    INSERT INTO processing_jobs VALUES ('paused','paused','paused',0,1,NULL,'now','now');
    INSERT INTO file_deletions VALUES ('deleted','now');`);
  r.sqlite.exec(`INSERT INTO days(record_date) VALUES ('2026-06-12');
    INSERT INTO entries(id,record_date,date_source,original_path,sticker_path,thumbnail_path,sticker_width,sticker_height,processing_state,layout_seed,sort_key,imported_at,updated_at)
      VALUES ('ready','2026-06-12','user','originals/ready.source','stickers/ready.png','previews/ready.png',100,200,'ready',0,2,'now','now');
    UPDATE days SET cover_entry_id='ready' WHERE record_date='2026-06-12';`);
  await initializeDatabase(r.db, r.write);
  assert.equal(r.sqlite.prepare('PRAGMA user_version').get()?.user_version, 5);
  assert.equal((await r.repository.get('ready'))?.isCover, true);
  assert.equal((await r.repository.get('ready'))?.status, 'ready');
  assert.equal(
    r.sqlite.prepare("SELECT pause_reason FROM processing_jobs WHERE entry_id='paused'").get()
      ?.pause_reason,
    'interrupted',
  );
  assert.deepEqual(await r.repository.pendingDeletions(), ['deleted']);
  assert.deepEqual(r.sqlite.prepare('PRAGMA foreign_key_check').all(), []);
});

test('visible-record refresh handles multiple SQL chunks and omits deleted records', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  await initializeDatabase(r.db, r.write);
  await ready(r, 'a');
  await ready(r, 'b');
  await r.repository.setCover('b', 0);
  await r.repository.remove('a', 0);
  const ids = Array.from({ length: 501 }, (_, i) => `missing-${i}`);
  const rows = await r.repository.getMany(['a', ...ids, 'b']);
  assert.deepEqual(
    rows.map((row) => row.id),
    ['b'],
  );
  assert.equal(rows[0].isCover, true);
  assert.deepEqual(await r.repository.getMany([]), []);
});
