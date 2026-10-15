import { isRecordDate } from '../domain/datePolicy';
import type { EntryRepository, Sticker } from '../domain/records';
import type { SqlDatabase, WriteTransaction } from './sqlDatabase';

interface MutableEntry {
  record_date: string | null;
  revision: number;
  processing_state: string;
  style_revision: number;
}
async function editable(tx: SqlDatabase, id: string, expectedRevision: number) {
  const entry = await tx.getFirstAsync<MutableEntry>(
    'SELECT record_date,revision,processing_state,style_revision FROM entries WHERE id=?',
    id,
  );
  if (!entry) throw new Error('ENTRY_NOT_FOUND');
  if (entry.revision !== expectedRevision) throw new Error('STALE_RESULT');
  if (entry.processing_state === 'running' || entry.processing_state === 'queued')
    throw new Error('ENTRY_BUSY');
  return entry;
}
async function pruneEmptyDays(tx: SqlDatabase) {
  await tx.runAsync(
    'DELETE FROM days WHERE NOT EXISTS (SELECT 1 FROM entries WHERE entries.record_date=days.record_date)',
  );
}

export function createEntryMutations(
  write: WriteTransaction,
): Pick<EntryRepository, 'changeDate' | 'updateStickerStyle' | 'setCover' | 'remove'> {
  return {
    async changeDate(id, revision, date) {
      if (date !== null && !isRecordDate(date)) throw new Error('INVALID_DATE');
      await write(async (tx) => {
        const entry = await editable(tx, id, revision);
        if (entry.record_date === date) return;
        if (date) await tx.runAsync('INSERT OR IGNORE INTO days(record_date) VALUES (?)', date);
        // The cover trigger clears the previous day in this same transaction.
        await tx.runAsync(
          'UPDATE entries SET record_date=?,date_source=?,revision=revision+1,updated_at=? WHERE id=?',
          date,
          date ? 'user' : 'unknown',
          new Date().toISOString(),
          id,
        );
        await tx.runAsync(
          'UPDATE processing_jobs SET expected_revision=? WHERE entry_id=?',
          revision + 1,
          id,
        );
        await pruneEmptyDays(tx);
      });
    },
    updateStickerStyle: (id, revision, sticker: Sticker) =>
      write(async (tx) => {
        const entry = await editable(tx, id, revision);
        if (entry.processing_state !== 'ready') throw new Error('STICKER_NOT_READY');
        if (
          sticker.stickerPath !== `stickers/${id}-v${sticker.styleRevision}.png` ||
          sticker.cutoutPath !== `cutouts/${id}.png` ||
          sticker.thumbnailPath !== `previews/${id}-v${sticker.styleRevision}.png` ||
          !Number.isInteger(sticker.styleRevision) ||
          sticker.styleRevision !== entry.style_revision + 1 ||
          !Number.isFinite(sticker.borderWidth) ||
          sticker.borderWidth < 0 ||
          sticker.borderWidth > 8 ||
          !['#FFFFFF', '#242424', '#0786A8'].includes(sticker.borderColor) ||
          !['original', 'outline', 'comic', 'dimensional', 'shimmer'].includes(sticker.effect) ||
          !Number.isInteger(sticker.width) ||
          !Number.isInteger(sticker.height) ||
          sticker.width <= 0 ||
          sticker.height <= 0
        )
          throw new Error('INVALID_STICKER_STYLE');
        const result = await tx.runAsync(
          `UPDATE entries SET sticker_path=?,cutout_path=?,thumbnail_path=?,sticker_width=?,sticker_height=?,
            border_width=?,border_color=?,sticker_effect=?,style_revision=?,revision=revision+1,updated_at=?
           WHERE id=? AND revision=? AND processing_state='ready'`,
          sticker.stickerPath,
          sticker.cutoutPath,
          sticker.thumbnailPath,
          sticker.width,
          sticker.height,
          sticker.borderWidth,
          sticker.borderColor,
          sticker.effect,
          sticker.styleRevision,
          new Date().toISOString(),
          id,
          revision,
        );
        if (result.changes !== 1) throw new Error('STALE_RESULT');
        await tx.runAsync(
          'UPDATE processing_jobs SET expected_revision=? WHERE entry_id=?',
          revision + 1,
          id,
        );
      }),
    setCover: (id, revision) =>
      write(async (tx) => {
        const entry = await editable(tx, id, revision);
        if (!entry.record_date) throw new Error('DATE_REQUIRED');
        if (entry.processing_state !== 'ready') throw new Error('STICKER_NOT_READY');
        await tx.runAsync(
          'UPDATE days SET cover_entry_id=? WHERE record_date=?',
          id,
          entry.record_date,
        );
      }),
    remove: (id, revision) =>
      write(async (tx) => {
        await editable(tx, id, revision);
        // Durable cleanup survives interruption after commit but before file removal.
        await tx.runAsync(
          'INSERT INTO file_deletions(entry_id,created_at) VALUES (?,?)',
          id,
          new Date().toISOString(),
        );
        await tx.runAsync('DELETE FROM entries WHERE id=?', id);
        await pruneEmptyDays(tx);
      }),
  };
}
