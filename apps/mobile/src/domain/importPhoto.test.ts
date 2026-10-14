import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importPhoto } from './importPhoto';
import type {
  EntryRepository,
  ProcessingRepository,
  PhotoProcessor,
  ImportedPhoto,
  Sticker,
} from './records';
const photo: ImportedPhoto = {
  id: 'sample',
  originalPath: 'originals/sample.source',
  photoPreviewPath: 'photo-previews/sample.jpg',
  photoWidth: 300,
  photoHeight: 512,
  contentHash: 'hash',
  exifDateTime: null,
  createdAt: null,
};
const sticker: Sticker = {
  stickerPath: 'stickers/sample.png',
  cutoutPath: 'cutouts/sample.png',
  thumbnailPath: 'previews/sample.png',
  width: 100,
  height: 200,
  instanceCount: 1,
  borderWidth: 4,
  borderColor: '#FFFFFF',
  styleRevision: 0,
};
function rig(failure?: string) {
  const events: string[] = [];
  const repo: ProcessingRepository & Pick<EntryRepository, 'get'> = {
    get: async () => null,
    retry: async () => ({ id: photo.id, revision: 1 }),
    begin: async () => {
      events.push('begin');
      if (failure === 'db') throw new Error('DB');
      return { id: photo.id, revision: 0 };
    },
    finish: async () => {
      events.push('finish');
    },
    fail: async () => {
      events.push('failed');
    },
  };
  const native: PhotoProcessor = {
    createSticker: async () => {
      events.push('process');
      if (failure === 'vision') throw new Error('NO_FOREGROUND');
      return sticker;
    },
    discardImport: async () => {
      events.push('discard');
    },
  };
  return { events, repo, native };
}
test('persist original ownership before processing and ready only after files exist', async () => {
  const r = rig();
  await importPhoto(photo, { date: null, source: 'unknown' }, r.repo, r.native);
  assert.deepEqual(r.events, ['begin', 'process', 'finish']);
});
test('failed DB insert cleans staging files; failed Vision preserves owned original', async () => {
  const a = rig('db');
  await assert.rejects(importPhoto(photo, { date: null, source: 'unknown' }, a.repo, a.native));
  assert.deepEqual(a.events, ['begin', 'discard']);
  const b = rig('vision');
  await assert.rejects(importPhoto(photo, { date: null, source: 'unknown' }, b.repo, b.native));
  assert.deepEqual(b.events, ['begin', 'process', 'failed']);
});
