import type { Entry, PhotoPreview } from './records';

export interface EntryImage {
  path: string;
  cacheKey: string;
  width: number;
  height: number;
  kind: 'sticker' | 'photo';
}
export function entryImage(
  entry: Entry,
  variant: 'thumbnail' | 'detail',
  repaired?: PhotoPreview,
): EntryImage | null {
  if (entry.status === 'ready' && entry.width && entry.height) {
    const path = variant === 'thumbnail' ? entry.thumbnailPath : entry.stickerPath;
    if (path)
      return {
        path,
        cacheKey: `${path}:${entry.revision}`,
        width: entry.width,
        height: entry.height,
        kind: 'sticker',
      };
  }
  if (entry.photoPreviewPath && entry.photoWidth && entry.photoHeight) {
    return {
      path: entry.photoPreviewPath,
      cacheKey: entry.photoPreviewPath,
      width: entry.photoWidth,
      height: entry.photoHeight,
      kind: 'photo',
    };
  }
  if (repaired) return { ...repaired, cacheKey: repaired.path, kind: 'photo' };
  // Missing derived files get a placeholder, never an unbounded original-image fallback.
  return null;
}
