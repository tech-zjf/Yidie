import type { EntryRepository } from '../domain/records';
import type { WriteTransaction } from './sqlDatabase';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createImageRepository(
  write: WriteTransaction,
): Pick<EntryRepository, 'stageOrphanDeletions' | 'savePhotoPreview'> {
  return {
    stageOrphanDeletions: (ids) =>
      write(async (tx) => {
        const candidates = [...new Set(ids)];
        if (candidates.some((id) => !uuid.test(id))) throw new Error('INVALID_RESOURCE');
        if (candidates.length === 0) return 0;
        // Read ownership once in this transaction, not a full table scan for each image.
        const rows = await tx.getAllAsync<{
          id: string;
          original_path: string;
          sticker_path: string | null;
          thumbnail_path: string | null;
          cutout_path: string | null;
          photo_preview_path: string | null;
        }>(
          'SELECT id,original_path,sticker_path,thumbnail_path,cutout_path,photo_preview_path FROM entries',
        );
        const owners = new Set(rows.map((row) => row.id));
        const paths = new Set<string>();
        for (const row of rows) {
          for (const path of [
            row.original_path,
            row.sticker_path,
            row.thumbnail_path,
            row.cutout_path,
            row.photo_preview_path,
          ]) {
            if (path) paths.add(path);
          }
        }
        let count = 0;
        for (const id of candidates) {
          // Protect both the expected owner and any legacy row referencing these exact files.
          if (
            owners.has(id) ||
            [
              `originals/${id}.source`,
              `stickers/${id}.png`,
              `previews/${id}.png`,
              `cutouts/${id}.png`,
              `photo-previews/${id}.jpg`,
            ].some((path) => paths.has(path))
          )
            continue;
          const result = await tx.runAsync(
            'INSERT OR IGNORE INTO file_deletions(entry_id,created_at) VALUES (?,?)',
            id,
            new Date().toISOString(),
          );
          count += result.changes;
        }
        return count;
      }),
    savePhotoPreview: (id, preview) =>
      write(async (tx) => {
        if (preview.path !== `photo-previews/${id}.jpg`) throw new Error('INVALID_RESOURCE');
        const changed = await tx.runAsync(
          'UPDATE entries SET photo_preview_path=?,photo_width=?,photo_height=? WHERE id=?',
          preview.path,
          preview.width,
          preview.height,
          id,
        );
        if (changed.changes !== 1) throw new Error('ENTRY_NOT_FOUND');
      }),
  };
}
