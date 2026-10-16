import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calendarFixture } from './fixtures';
import { previewServices } from './services';

test('preview sticker edits stay in memory and never open real app storage', async () => {
  const entries = calendarFixture(0).entries.filter((entry) => entry.date === '2026-06-12');
  const services = await previewServices(entries);
  const entry = entries[0];
  assert.ok(entry);

  const style = await services.photos.renderStickerStyle(
    entry.id,
    1,
    entry.cutoutPath,
    'dimensional',
    6,
    '#242424',
  );
  const beforeSave = await services.repository.get(entry.id);
  assert.equal(beforeSave?.styleRevision, entry.styleRevision);
  assert.equal(style.cutoutPath, entry.cutoutPath);
  assert.equal(style.instanceCount, 1);

  await services.repository.updateStickerStyle(entry.id, entry.revision, style);

  const updated = await services.repository.get(entry.id);
  assert.equal(updated?.borderWidth, 6);
  assert.equal(updated?.borderColor, '#242424');
  assert.equal(updated?.styleRevision, 1);
  assert.equal(updated?.revision, 1);
  assert.equal(updated?.originalPath, entry.originalPath);
  assert.equal(updated?.cutoutPath, entry.cutoutPath);
  await assert.rejects(services.photos.prepareStorage(), /PREVIEW_READ_ONLY/);
});

test('previewing the no-outline option produces no decorative stroke', async () => {
  const entries = calendarFixture(0).entries.filter((entry) => entry.date === '2026-06-12');
  const services = await previewServices(entries);
  const entry = entries[0];
  assert.ok(entry);

  const preview = await services.photos.renderStickerStyle(
    entry.id,
    1,
    entry.cutoutPath,
    'original',
    0,
    '#FFFFFF',
  );
  assert.ok(preview.thumbnailPath);
  const svg = decodeURIComponent(preview.thumbnailPath.slice('data:image/svg+xml;utf8,'.length));

  assert.doesNotMatch(svg, /\bstroke=/);
});

test('preview adapter preserves each selected sticker effect without touching persistent storage', async () => {
  const entries = calendarFixture(0).entries.filter((entry) => entry.date === '2026-06-12');
  const services = await previewServices(entries);
  const entry = entries[0];
  assert.ok(entry);

  for (const effect of ['original', 'outline', 'comic', 'dimensional', 'shimmer'] as const) {
    const borderWidth = effect === 'original' ? 0 : 4;
    const preview = await services.photos.renderStickerStyle(
      entry.id,
      entry.styleRevision + 1,
      entry.cutoutPath,
      effect,
      borderWidth,
      '#FFFFFF',
    );
    assert.equal(preview.effect, effect);
    assert.equal(preview.borderWidth, borderWidth);
    assert.equal(preview.cutoutPath, entry.cutoutPath);
  }
  assert.equal(entry.styleRevision, 0);
});
