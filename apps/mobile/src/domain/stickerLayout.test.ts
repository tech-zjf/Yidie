import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stickerLayout } from './stickerLayout';
test('whole rotated stacks fit narrow, six-week and export cells', () => {
  const subjects = [
    { width: 120, height: 500 },
    { width: 400, height: 210 },
    { width: 300, height: 310 },
  ];
  for (const width of [40, 44, 49, 56])
    for (const height of [54, 63, 66, 82]) {
      const result = stickerLayout(subjects, { width, height });
      assert.deepEqual(result, stickerLayout(subjects, { width, height }));
      for (const p of result) {
        const rad = (p.rotation * Math.PI) / 180;
        const w = Math.abs(p.width * Math.cos(rad)) + Math.abs(p.height * Math.sin(rad));
        const h = Math.abs(p.width * Math.sin(rad)) + Math.abs(p.height * Math.cos(rad));
        const cx = p.x + p.width / 2,
          cy = p.y + p.height / 2;
        assert.ok(cx - w / 2 >= 5 - 1e-8 && cx + w / 2 <= width - 5 + 1e-8);
        assert.ok(cy - h / 2 >= 9 - 1e-8 && cy + h / 2 <= height - 9 + 1e-8);
      }
    }
});
test('at most three layers; empty days have no sticker', () => {
  assert.deepEqual(stickerLayout([], { width: 44, height: 63 }), []);
  assert.equal(
    stickerLayout(Array(10).fill({ width: 100, height: 300 }), { width: 44, height: 63 }).length,
    3,
  );
});
