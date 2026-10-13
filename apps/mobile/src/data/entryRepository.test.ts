import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeDatabase } from './initializeDatabase';
import { schema } from './schema.generated';
import type { PhotoProcessor } from '../domain/records';
import { fixture, photo, sticker, ready } from './testSupport';
import { createEntryActions } from '../domain/entryActions';
import { importPhoto } from '../domain/importPhoto';

test('fresh schema and v1 migration preserve records and recover interrupted jobs', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  r.sqlite.exec(schema);
  r.sqlite.exec('PRAGMA user_version=1');
  r.sqlite
    .exec(`INSERT INTO entries(id,date_source,original_path,processing_state,layout_seed,sort_key,imported_at,updated_at)
    VALUES ('interrupted','unknown','originals/interrupted.source','running',0,1,'now','now');
    INSERT INTO processing_jobs VALUES ('interrupted','interrupted','running',0,1,NULL,'now','now')`);
  await initializeDatabase(r.db, r.write);
  assert.equal(r.sqlite.prepare('PRAGMA user_version').get()?.user_version, 3);
  assert.equal((await r.repository.get('interrupted'))?.status, 'paused');
  assert.equal(r.sqlite.prepare('SELECT state FROM processing_jobs').get()?.state, 'paused');
  assert.deepEqual(await r.repository.pendingDeletions(), []);
  await initializeDatabase(r.db, r.write); // Restart is idempotent.
  assert.equal((await r.repository.list()).length, 1);
});

test('moving a cover preserves destination cover; unknown dates can be filed and unfiled', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  await initializeDatabase(r.db, r.write);
  await ready(r, 'a');
  await ready(r, 'b', '2026-06-13');
  await r.repository.setCover('a', 0);
  await r.repository.setCover('b', 0);
  await r.repository.changeDate('a', 0, '2026-06-13');
  assert.equal((await r.repository.get('a'))?.isCover, false);
  assert.equal((await r.repository.get('b'))?.isCover, true);
  assert.equal(
    r.sqlite.prepare("SELECT count(*) AS n FROM days WHERE record_date='2026-06-12'").get()?.n,
    0,
  );
  await r.repository.changeDate('a', 1, null);
  assert.equal((await r.repository.get('a'))?.dateSource, 'unknown');
  await assert.rejects(r.repository.setCover('a', 2), /DATE_REQUIRED/);
  await r.repository.changeDate('a', 2, '2024-02-29');
  assert.equal((await r.repository.get('a'))?.dateSource, 'user');
  await assert.rejects(r.repository.changeDate('a', 3, '2026-02-29'), /INVALID_DATE/);
  assert.deepEqual(r.sqlite.prepare('PRAGMA foreign_key_check').all(), []);
});

test('stale editors and in-flight edits are rejected without partial mutations', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  await initializeDatabase(r.db, r.write);
  const ticket = await r.repository.begin(photo('a'), { date: '2026-06-12', source: 'user' });
  await assert.rejects(r.repository.changeDate('a', 0, '2026-06-13'), /ENTRY_BUSY/);
  await assert.rejects(r.repository.remove('a', 0), /ENTRY_BUSY/);
  await r.repository.finish(ticket, sticker('a'));
  await r.repository.changeDate('a', 0, '2026-06-13');
  await assert.rejects(r.repository.remove('a', 0), /STALE_RESULT/);
  await assert.rejects(r.repository.setCover('a', 0), /STALE_RESULT/);
  assert.deepEqual(await r.repository.pendingDeletions(), []);
  assert.equal((await r.repository.get('a'))?.date, '2026-06-13');
});

test('retry revisions reject duplicate work and late results; failed finish rolls back both states', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  await initializeDatabase(r.db, r.write);
  const original = await r.repository.begin(photo('a'), { date: null, source: 'unknown' });
  await r.repository.fail(original, 'NO_FOREGROUND');
  const retry = await r.repository.retry('a', 0);
  assert.equal(retry.revision, 1);
  await assert.rejects(r.repository.retry('a', 0), /STALE_RESULT/);
  await assert.rejects(r.repository.finish(original, sticker('a')), /STALE_RESULT/);
  await r.repository.fail(original, 'OLD_ERROR');
  assert.equal((await r.repository.get('a'))?.status, 'running');
  await assert.rejects(r.repository.finish(retry, { ...sticker('a'), width: 0 }));
  assert.equal((await r.repository.get('a'))?.status, 'running');
  assert.equal(r.sqlite.prepare('SELECT state FROM processing_jobs').get()?.state, 'running');
  await r.repository.finish(retry, sticker('a'));
  assert.equal((await r.repository.get('a'))?.status, 'ready');
  assert.equal((await r.repository.get('a'))?.errorCode, null);
  assert.equal(r.sqlite.prepare('SELECT attempt FROM processing_jobs').get()?.attempt, 2);
});

test('deletion is durable; failed file cleanup resumes on the next start and is idempotent', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  await initializeDatabase(r.db, r.write);
  await ready(r, 'a');
  await ready(r, 'b');
  await r.repository.setCover('a', 0);
  let fail = true;
  const removed: string[] = [];
  const processor: PhotoProcessor = {
    createSticker: async (id) => sticker(id),
    discardImport: async (id) => {
      if (fail) throw new Error('FILE_BUSY');
      removed.push(id);
    },
  };
  const actions = createEntryActions(r.repository, processor);
  assert.deepEqual(await actions.remove('a', 0), { filesRemoved: false });
  assert.equal(await r.repository.get('a'), null);
  assert.equal(
    r.sqlite.prepare("SELECT count(*) AS n FROM processing_jobs WHERE entry_id='a'").get()?.n,
    0,
  );
  assert.deepEqual(await r.repository.pendingDeletions(), ['a']);
  assert.equal((await r.repository.get('b'))?.isCover, false);
  await initializeDatabase(r.db, r.write);
  fail = false;
  await createEntryActions(r.repository, processor).resumeCleanup();
  assert.deepEqual(removed, ['a']);
  assert.deepEqual(await r.repository.pendingDeletions(), []);
  await actions.resumeCleanup();
  assert.deepEqual(removed, ['a']);
  assert.deepEqual(r.sqlite.prepare('PRAGMA foreign_key_check').all(), []);
});

test('cursor pagination survives insertions and deletions between pages', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  await initializeDatabase(r.db, r.write);
  for (let i = 0; i < 65; i++) {
    const id = `entry-${String(i).padStart(3, '0')}`;
    await ready(r, id);
    r.sqlite.prepare('UPDATE entries SET sort_key=? WHERE id=?').run(Math.floor(i / 4), id);
  }
  const first = await r.repository.list();
  assert.equal(first.length, 60);
  const last = first[first.length - 1];
  await r.repository.remove(first[0].id, 0);
  await ready(r, 'newer');
  const second = await r.repository.list({ before: { sortKey: last.sortKey, id: last.id } });
  assert.deepEqual(
    second.map((e) => e.id),
    ['entry-004', 'entry-003', 'entry-002', 'entry-001', 'entry-000'],
  );
  assert.equal(new Set([...first, ...second].map((e) => e.id)).size, 65);
});

test('a duplicate import never deletes the original already owned by an existing record', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  await initializeDatabase(r.db, r.write);
  await ready(r, 'a');
  const removed: string[] = [];
  const processor: PhotoProcessor = {
    createSticker: async (id) => sticker(id),
    discardImport: async (id) => {
      removed.push(id);
    },
  };
  await assert.rejects(
    importPhoto(photo('a'), { date: null, source: 'unknown' }, r.repository, processor),
  );
  assert.deepEqual(removed, []);
  assert.equal((await r.repository.get('a'))?.status, 'ready');
});

test('the image worker serializes imports and recovers after one failure', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  await initializeDatabase(r.db, r.write);
  let running = 0,
    maximum = 0;
  const processor: PhotoProcessor = {
    createSticker: async (id) => {
      running++;
      maximum = Math.max(maximum, running);
      await new Promise((resolve) => setTimeout(resolve, 2));
      running--;
      if (id === 'a') throw new Error('NO_FOREGROUND');
      return sticker(id);
    },
    discardImport: async () => {},
  };
  const actions = createEntryActions(r.repository, processor);
  const results = await Promise.allSettled(
    ['a', 'b'].map((id) => actions.import(photo(id), { date: null, source: 'unknown' })),
  );
  assert.equal(results[0].status, 'rejected');
  assert.equal(results[1].status, 'fulfilled');
  assert.equal(maximum, 1);
  assert.equal((await r.repository.get('a'))?.status, 'failed');
  assert.equal((await r.repository.get('b'))?.status, 'ready');
});

test('newer databases are refused without changing version or records', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  await initializeDatabase(r.db, r.write);
  await ready(r, 'a');
  r.sqlite.exec('PRAGMA user_version=99');
  await assert.rejects(initializeDatabase(r.db, r.write), /DATABASE_VERSION_TOO_NEW/);
  assert.equal(r.sqlite.prepare('PRAGMA user_version').get()?.user_version, 99);
  assert.equal((await r.repository.get('a'))?.status, 'ready');
});

test('a failed deletion transaction retains the record, cover and files', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  await initializeDatabase(r.db, r.write);
  await ready(r, 'a');
  await r.repository.setCover('a', 0);
  r.sqlite.exec(
    "CREATE TRIGGER fail_delete BEFORE DELETE ON entries BEGIN SELECT RAISE(ABORT,'SIMULATED_WRITE_FAILURE'); END",
  );
  let removed = false;
  const actions = createEntryActions(r.repository, {
    createSticker: async (id) => sticker(id),
    discardImport: async () => {
      removed = true;
    },
  });
  await assert.rejects(actions.remove('a', 0), /SIMULATED_WRITE_FAILURE/);
  assert.equal(removed, false);
  assert.equal((await r.repository.get('a'))?.isCover, true);
  assert.deepEqual(await r.repository.pendingDeletions(), []);
  assert.equal(r.sqlite.prepare('SELECT count(*) AS n FROM processing_jobs').get()?.n, 1);
});

test('failed migration rolls back its writes and leaves the v1 database readable', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  r.sqlite.exec(schema);
  r.sqlite.exec('PRAGMA user_version=1');
  r.sqlite.exec('CREATE INDEX entries_by_import_order ON entries(sort_key,id)');
  await assert.rejects(initializeDatabase(r.db, r.write), /already exists/);
  assert.equal(r.sqlite.prepare('PRAGMA user_version').get()?.user_version, 1);
  assert.equal(
    r.sqlite.prepare("SELECT value FROM app_meta WHERE key='schema_version'").get()?.value,
    '1',
  );
  assert.equal(
    r.sqlite.prepare("SELECT name FROM sqlite_master WHERE name='file_deletions'").get(),
    undefined,
  );
});
