import assert from 'node:assert/strict';
import test from 'node:test';
import type { Entry, StickerEffect } from './records';
import { hasStickerStyleChanges } from './stickerStyle';

const entry = {
  effect: 'outline',
  borderWidth: 4,
  borderColor: '#FFFFFF',
  cutoutPath: 'cutouts/entry.png',
} as Entry;

const draft = (
  overrides: Partial<{
    effect: StickerEffect;
    borderWidth: number;
    borderColor: Entry['borderColor'];
    cutoutPath: string | null;
  }> = {},
) => ({
  effect: entry.effect,
  borderWidth: entry.borderWidth,
  borderColor: entry.borderColor,
  cutoutPath: null,
  ...overrides,
});

test('recognizes a style restored to the saved appearance as unchanged', () => {
  assert.equal(hasStickerStyleChanges(entry, draft()), false);
});

test('detects effect, outline, color, and subject-cutout edits', () => {
  assert.equal(hasStickerStyleChanges(entry, draft({ effect: 'comic' })), true);
  assert.equal(hasStickerStyleChanges(entry, draft({ borderWidth: 6 })), true);
  assert.equal(hasStickerStyleChanges(entry, draft({ borderColor: '#242424' })), true);
  assert.equal(hasStickerStyleChanges(entry, draft({ cutoutPath: 'cutouts/entry-v1.png' })), true);
});

test('ignores hidden outline controls for the original style', () => {
  assert.equal(
    hasStickerStyleChanges(
      { ...entry, effect: 'original', borderWidth: 0 },
      draft({ effect: 'original', borderWidth: 4, borderColor: '#242424' }),
    ),
    false,
  );
});
