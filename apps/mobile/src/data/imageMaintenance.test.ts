import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeDatabase } from './initializeDatabase';
import { schema, migrations } from './schema.generated';
import { fixture, photo, ready, sticker } from './testSupport';
import { entryImage } from '../domain/entryImage';
import { createImageMaintenance } from '../domain/imageMaintenance';
import { createEntryActions } from '../domain/entryActions';
import { createSerialWork } from '../domain/serialWork';
import type { ImageFileStore } from '../domain/records';
const owned = 'AAAAAAAA-0000-4000-8000-000000000001';
const orphan = 'BBBBBBBB-0000-4000-8000-000000000002';
const referenced = 'CCCCCCCC-0000-4000-8000-000000000003';
const preview = (id: string) => ({ path: `photo-previews/${id}.jpg`, width: 300, height: 512 });
const files: ImageFileStore = {
  listImportIDs: async () => [],
  createPhotoPreview: async (id) => preview(id),
};

test('completing an image switches its resource and cache key on both image sizes', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  await initializeDatabase(r.db, r.write);
  const ticket = await r.repository.begin(photo(owned), { date: null, source: 'unknown' });
  const before = (await r.repository.get(owned))!;
  await r.repository.finish(ticket, sticker(owned));
  const after = (await r.repository.get(owned))!;
  assert.equal(before.revision, after.revision);
  for (const variant of ['thumbnail', 'detail'] as const) {
    const pendingImage = entryImage(before, variant)!;
    const readyImage = entryImage(after, variant)!;
    assert.equal(pendingImage.path, preview(owned).path);
    assert.equal(pendingImage.kind, 'photo');
    assert.equal(readyImage.kind, 'sticker');
    assert.notEqual(pendingImage.cacheKey, readyImage.cacheKey);
    assert.notEqual(pendingImage.path, before.originalPath);
  }
  assert.notEqual(entryImage(after, 'detail')?.cacheKey, entryImage(after, 'thumbnail')?.cacheKey);
});

test('legacy or unavailable previews never fall back to a full-size original', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  await initializeDatabase(r.db, r.write);
  await ready(r, owned);
  const entry = (await r.repository.get(owned))!;
  for (const status of ['queued', 'running', 'paused', 'failed'] as const) {
    const missing = {
      ...entry,
      status,
      photoPreviewPath: null,
      photoWidth: null,
      photoHeight: null,
    };
    assert.equal(entryImage(missing, 'thumbnail'), null);
    assert.equal(entryImage(missing, 'detail', preview(owned))?.path, preview(owned).path);
  }
  assert.notEqual(
    entryImage(entry, 'detail')?.cacheKey,
    entryImage({ ...entry, revision: 2 }, 'detail')?.cacheKey,
  );
});

test('orphan reconciliation preserves record ownership and exact legacy file references', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  await initializeDatabase(r.db, r.write);
  await ready(r, owned);
  await ready(r, 'legacy-reference');
  r.sqlite
    .prepare('UPDATE entries SET original_path=? WHERE id=?')
    .run(`originals/${referenced}.source`, 'legacy-reference');
  const serial = createSerialWork();
  const maintenance = createImageMaintenance(
    r.repository,
    { ...files, listImportIDs: async () => [owned, orphan, referenced, orphan] },
    serial,
  );
  assert.equal(await maintenance.reconcile(), 1);
  assert.deepEqual(await r.repository.pendingDeletions(), [orphan]);
  const deleted: string[] = [];
  const actions = createEntryActions(
    r.repository,
    {
      createSticker: async (id) => sticker(id),
      discardImport: async (id) => {
        deleted.push(id);
      },
    },
    serial,
  );
  await actions.resumeCleanup();
  assert.deepEqual(deleted, [orphan]);
  assert.ok(await r.repository.get(owned));
  assert.ok(await r.repository.get('legacy-reference'));
});

test('inventory failures and invalid candidates do not authorize any deletion', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  await initializeDatabase(r.db, r.write);
  const maintenance = createImageMaintenance(
    r.repository,
    {
      ...files,
      listImportIDs: async () => {
        throw new Error('READ_FAILED');
      },
    },
    createSerialWork(),
  );
  await assert.rejects(maintenance.reconcile(), /READ_FAILED/);
  await assert.rejects(
    r.repository.stageOrphanDeletions([orphan, '../database']),
    /INVALID_RESOURCE/,
  );
  assert.deepEqual(await r.repository.pendingDeletions(), []);
});

test('orphan deletion failures keep a durable retry and block reusing that ID', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  await initializeDatabase(r.db, r.write);
  await r.repository.stageOrphanDeletions([orphan]);
  const actions = createEntryActions(r.repository, {
    createSticker: async (id) => sticker(id),
    discardImport: async () => {
      throw new Error('FILE_LOCKED');
    },
  });
  await actions.resumeCleanup();
  assert.deepEqual(await r.repository.pendingDeletions(), [orphan]);
  await assert.rejects(
    r.repository.begin(photo(orphan), { date: null, source: 'unknown' }),
    /INVALID_RESOURCE/,
  );
  await initializeDatabase(r.db, r.write);
  const recovered = createEntryActions(r.repository, {
    createSticker: async (id) => sticker(id),
    discardImport: async () => {},
  });
  await recovered.resumeCleanup();
  assert.deepEqual(await r.repository.pendingDeletions(), []);
});

test('v3 records migrate without guessed paths and lazily persist a bounded preview once', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  r.sqlite.exec(schema);
  r.sqlite.exec(migrations[2]);
  r.sqlite.exec(migrations[3]);
  r.sqlite.exec(`PRAGMA user_version=3;
    INSERT INTO entries(id,date_source,original_path,processing_state,layout_seed,sort_key,revision,imported_at,updated_at)
    VALUES ('${owned}','unknown','originals/${owned}.source','failed',0,1,7,'now','now');`);
  await initializeDatabase(r.db, r.write);
  assert.equal((await r.repository.get(owned))?.photoPreviewPath, null);
  let generated = 0;
  const maintenance = createImageMaintenance(
    r.repository,
    {
      ...files,
      createPhotoPreview: async (id) => {
        generated++;
        return preview(id);
      },
    },
    createSerialWork(),
  );
  await Promise.all([maintenance.ensurePreview(owned), maintenance.ensurePreview(owned)]);
  assert.equal(generated, 1);
  const updated = (await r.repository.get(owned))!;
  assert.equal(updated.revision, 7);
  assert.equal(updated.status, 'failed');
  assert.equal(entryImage(updated, 'thumbnail')?.height, 512);
  assert.equal(r.sqlite.prepare('PRAGMA user_version').get()?.user_version, 6);
});

test('failed preview creation preserves the record and original reference', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  await initializeDatabase(r.db, r.write);
  await ready(r, owned);
  r.sqlite
    .prepare('UPDATE entries SET photo_preview_path=NULL,photo_width=NULL,photo_height=NULL')
    .run();
  const maintenance = createImageMaintenance(
    r.repository,
    {
      ...files,
      createPhotoPreview: async () => {
        throw new Error('INSUFFICIENT_STORAGE');
      },
    },
    createSerialWork(),
  );
  await assert.rejects(maintenance.ensurePreview(owned), /INSUFFICIENT_STORAGE/);
  assert.equal((await r.repository.get(owned))?.originalPath, photo(owned).originalPath);
  assert.deepEqual(await r.repository.pendingDeletions(), []);
});

test('lazy previews and deletion share a worker, leaving no late file after deletion', async (t) => {
  const r = fixture();
  t.after(() => r.sqlite.close());
  await initializeDatabase(r.db, r.write);
  await ready(r, owned);
  r.sqlite
    .prepare('UPDATE entries SET photo_preview_path=NULL,photo_width=NULL,photo_height=NULL')
    .run();
  const serial = createSerialWork(),
    events: string[] = [];
  const maintenance = createImageMaintenance(
    r.repository,
    {
      ...files,
      createPhotoPreview: async (id) => {
        events.push('preview');
        return preview(id);
      },
    },
    serial,
  );
  const actions = createEntryActions(
    r.repository,
    {
      createSticker: async (id) => sticker(id),
      discardImport: async () => {
        events.push('delete');
      },
    },
    serial,
  );
  await Promise.all([maintenance.ensurePreview(owned), actions.remove(owned, 0)]);
  assert.deepEqual(events, ['preview', 'delete']);
  await assert.rejects(maintenance.ensurePreview(owned), /ENTRY_NOT_FOUND/);
  assert.deepEqual(events, ['preview', 'delete']);
  assert.equal(await r.repository.get(owned), null);
});
