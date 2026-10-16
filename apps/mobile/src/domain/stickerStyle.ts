import type { Entry, StickerBorderColor, StickerEffect } from './records';

export function hasStickerStyleChanges(
  entry: Entry,
  draft: {
    effect: StickerEffect;
    borderWidth: number;
    borderColor: StickerBorderColor;
    cutoutPath: string | null;
  },
): boolean {
  return (
    draft.effect !== entry.effect ||
    (draft.cutoutPath !== null && draft.cutoutPath !== entry.cutoutPath) ||
    (draft.effect !== 'original' &&
      (draft.borderWidth !== entry.borderWidth || draft.borderColor !== entry.borderColor))
  );
}
