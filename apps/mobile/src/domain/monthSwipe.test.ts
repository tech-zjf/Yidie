import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthSwipeDelta, shouldCaptureMonthSwipe } from './monthSwipe';

test('month swipe responder captures horizontal movement after slop, not vertical scrolling', () => {
  assert.equal(shouldCaptureMonthSwipe(12, 0), true);
  assert.equal(shouldCaptureMonthSwipe(-16, 8), true);
  assert.equal(shouldCaptureMonthSwipe(11, 0), false);
  assert.equal(shouldCaptureMonthSwipe(20, 16), false);
  assert.equal(shouldCaptureMonthSwipe(0, 30), false);
});

test('month swipe accepts deliberate horizontal drags in either direction', () => {
  assert.equal(monthSwipeDelta(-60, 8, -0.2), 1);
  assert.equal(monthSwipeDelta(60, 8, 0.2), -1);
});

test('a quick horizontal flick changes month before reaching drag distance', () => {
  assert.equal(monthSwipeDelta(-34, 4, -0.7), 1);
  assert.equal(monthSwipeDelta(34, 4, 0.7), -1);
});

test('small taps, vertical scrolling, and opposing flick velocity do not change month', () => {
  assert.equal(monthSwipeDelta(-12, 1, -1), 0);
  assert.equal(monthSwipeDelta(-60, 55, -0.8), 0);
  assert.equal(monthSwipeDelta(-34, 4, 0.7), 0);
  assert.equal(monthSwipeDelta(-40, 4, -0.3), 0);
});
