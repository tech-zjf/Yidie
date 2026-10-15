import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calendarFixture } from './fixtures';
import { previewServices } from './services';

test('preview sticker edits stay in memory and never open real app storage', async () => {
  const entries = calendarFixture(0).entries.filter((entry) => entry.date === '2026-06-12');
  const services = await previewServices(entries);
  const entry = entries[0];
  assert.ok(entry);

  const style = await services.photos.renderStickerStyle(entry.id, 1, 6, '#242424');
  await services.repository.updateStickerStyle(entry.id, entry.revision, style);

  const updated = await services.repository.get(entry.id);
  assert.equal(updated?.borderWidth, 6);
  assert.equal(updated?.borderColor, '#242424');
  assert.equal(updated?.styleRevision, 1);
  assert.equal(updated?.revision, 1);
  await assert.rejects(services.photos.prepareStorage(), /PREVIEW_READ_ONLY/);
});

test('previewing the no-outline option produces no decorative stroke', async () => {
  const entries = calendarFixture(0).entries.filter((entry) => entry.date === '2026-06-12');
  const services = await previewServices(entries);
  const entry = entries[0];
  assert.ok(entry);

  const preview = await services.photos.renderStickerStyle(entry.id, 1, 0, '#FFFFFF');
  assert.ok(preview.thumbnailPath);
  const svg = decodeURIComponent(preview.thumbnailPath.slice('data:image/svg+xml;utf8,'.length));

  assert.doesNotMatch(svg, /\bstroke=/);
});
