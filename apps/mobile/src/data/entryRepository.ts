import type { Entry, EntryRepository } from '../domain/records';
import { createEntryMutations } from './entryMutations';
import { createImageRepository } from './imageRepository';
import { createQueueRepository } from './queueRepository';
import { createProcessingRepository } from './processingRepository';
import type { SqlDatabase, WriteTransaction } from './sqlDatabase';

const select = `SELECT e.id, e.record_date AS date, e.date_source AS dateSource,
  e.original_path AS originalPath, e.sticker_path AS stickerPath, e.thumbnail_path AS thumbnailPath,
  e.photo_preview_path AS photoPreviewPath,e.photo_width AS photoWidth,e.photo_height AS photoHeight,
  e.sticker_width AS width, e.sticker_height AS height, e.processing_state AS status,
  e.revision, e.sort_key AS sortKey, e.error_code AS errorCode,
  COALESCE(d.cover_entry_id=e.id,0) AS isCover
  FROM entries e LEFT JOIN days d ON d.record_date=e.record_date`;
const decode = (row: Entry): Entry => ({ ...row, isCover: Boolean(row.isCover) });

export function createEntryRepository(
  db: SqlDatabase,
  transaction: WriteTransaction,
): EntryRepository {
  // All mutations use the same queue; rejected writes cannot poison later work.
  let tail: Promise<unknown> = Promise.resolve();
  const write: WriteTransaction = (action) => {
    const pending = tail.then(() => transaction(action));
    tail = pending.catch(() => {});
    return pending;
  };
  return {
    ...createProcessingRepository(write),
    ...createQueueRepository(db, write),
    ...createEntryMutations(write),
    ...createImageRepository(write),
    async list(options = {}) {
      if (options.month) {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(options.month)) throw new Error('INVALID_DATE');
        const rows = await db.getAllAsync<Entry>(
          `${select} WHERE e.record_date BETWEEN ? AND ? ORDER BY isCover DESC,e.sort_key,e.id`,
          `${options.month}-01`,
          `${options.month}-31`,
        );
        return rows.map(decode);
      }
      const cursor = options.before;
      const rows = cursor
        ? await db.getAllAsync<Entry>(
            `${select} WHERE (e.sort_key,e.id) < (?,?) ORDER BY e.sort_key DESC,e.id DESC LIMIT 60`,
            cursor.sortKey,
            cursor.id,
          )
        : await db.getAllAsync<Entry>(`${select} ORDER BY e.sort_key DESC,e.id DESC LIMIT 60`);
      return rows.map(decode);
    },
    async get(id) {
      const row = await db.getFirstAsync<Entry>(`${select} WHERE e.id=?`, id);
      return row ? decode(row) : null;
    },
    async getMany(ids) {
      const rows: Entry[] = [];
      // Keep each query below the SQLite parameter limit, including older device builds.
      for (let start = 0; start < ids.length; start += 500) {
        const page = ids.slice(start, start + 500);
        const placeholders = page.map(() => '?').join(',');
        rows.push(
          ...(await db.getAllAsync<Entry>(`${select} WHERE e.id IN (${placeholders})`, ...page)),
        );
      }
      return rows.map(decode);
    },
    async pendingDeletions() {
      const rows = await db.getAllAsync<{ entry_id: string }>(
        'SELECT entry_id FROM file_deletions ORDER BY created_at,entry_id',
      );
      return rows.map((row) => row.entry_id);
    },
    acknowledgeDeletion: (id) =>
      write(async (tx) => {
        await tx.runAsync('DELETE FROM file_deletions WHERE entry_id=?', id);
      }),
  };
}
