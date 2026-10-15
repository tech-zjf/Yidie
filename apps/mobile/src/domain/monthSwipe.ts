/**
 * Converts a completed touch gesture into a month change.
 *
 * The activation threshold is intentionally lower than the completion threshold:
 * a quick horizontal flick should feel responsive, while a slow diagonal scroll
 * should remain owned by the calendar's vertical ScrollView.
 */
export function monthSwipeDelta(dx: number, dy: number, velocityX: number): -1 | 0 | 1 {
  const horizontal = Math.abs(dx);
  const vertical = Math.abs(dy);
  if (horizontal < 28 || horizontal <= vertical * 1.25) return 0;

  const deliberateDrag = horizontal >= 56;
  const quickFlick = horizontal >= 28 && Math.abs(velocityX) >= 0.55 && dx * velocityX > 0;
  if (!deliberateDrag && !quickFlick) return 0;

  return dx < 0 ? 1 : -1;
}
