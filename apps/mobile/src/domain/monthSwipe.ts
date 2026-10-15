const horizontalDominance = 1.25;

/** Keep activation slop low so a deliberate flick can claim the responder early. */
export function shouldCaptureMonthSwipe(dx: number, dy: number): boolean {
  return Math.abs(dx) >= 12 && Math.abs(dx) > Math.abs(dy) * horizontalDominance;
}

/** Converts a completed touch gesture into a month change. */
export function monthSwipeDelta(dx: number, dy: number, velocityX: number): -1 | 0 | 1 {
  const horizontal = Math.abs(dx);
  if (horizontal < 28 || horizontal <= Math.abs(dy) * horizontalDominance) return 0;

  const deliberateDrag = horizontal >= 56;
  const quickFlick = horizontal >= 28 && Math.abs(velocityX) >= 0.55 && dx * velocityX > 0;
  if (!deliberateDrag && !quickFlick) return 0;

  return dx < 0 ? 1 : -1;
}
