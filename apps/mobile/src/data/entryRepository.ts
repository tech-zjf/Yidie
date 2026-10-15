import type { Entry, EntryRepository } from '../domain/records';
import { createSerialWork } from '../domain/serialWork';
import { createEntryMutations } from './entryMutations';
import { createImageRepository } from './imageRepository';
import { createQueueRepository } from './queueRepository';
import { createProcessingRepository } from './processingRepository';
import type { SqlDatabase, WriteTransaction } from './sqlDatabase';

const select = `SELECT e.id, e.record_date AS date, e.date_source AS dateSource,
  e.original_path AS originalPath, e.sticker_path AS stickerPath, e.cutout_path AS cutoutPath,
  e.thumbnail_path AS thumbnailPath,e.border_width AS borderWidth,e.border_color AS borderColor,
  e.style_revision AS styleRevision,
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
  const write = transaction;
  const repository: EntryRepository = {
    async close() {
      await db.closeAsync?.();
    },
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
      let rows: Entry[];
      if (cursor?.date) {
        rows = await db.getAllAsync<Entry>(
          `${select} WHERE e.record_date IS NULL OR e.record_date < ? OR
            (e.record_date = ? AND (e.sort_key,e.id) < (?,?))
            ORDER BY e.record_date DESC,e.sort_key DESC,e.id DESC LIMIT 60`,
          cursor.date,
          cursor.date,
          cursor.sortKey,
          cursor.id,
        );
      } else if (cursor) {
        rows = await db.getAllAsync<Entry>(
          `${select} WHERE e.record_date IS NULL AND (e.sort_key,e.id) < (?,?)
            ORDER BY e.record_date DESC,e.sort_key DESC,e.id DESC LIMIT 60`,
          cursor.sortKey,
          cursor.id,
        );
      } else {
        rows = await db.getAllAsync<Entry>(
          `${select} ORDER BY e.record_date DESC,e.sort_key DESC,e.id DESC LIMIT 60`,
        );
      }
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
  return serializeRepositoryOperations(repository);
}

/**
 * Expo SQLite dispatches native calls on a concurrent queue. Keep each repository operation on a
 * single lane because writes use short-lived connections alongside the long-lived read connection.
 * This prevents native statement execution/finalization and connection close from overlapping.
 */
function serializeRepositoryOperations(repository: EntryRepository): EntryRepository {
  const enqueue = createSerialWork();
  let closing = false;
  let closePromise: Promise<void> | undefined;

  function run<T>(operation: () => Promise<T>): Promise<T> {
    if (closing) return Promise.reject(new Error('DATABASE_CLOSED'));
    return enqueue(operation);
  }

  return {
    begin: (...args) => run(() => repository.begin(...args)),
    retry: (...args) => run(() => repository.retry(...args)),
    finish: (...args) => run(() => repository.finish(...args)),
    fail: (...args) => run(() => repository.fail(...args)),
    list: (...args) => run(() => repository.list(...args)),
    get: (...args) => run(() => repository.get(...args)),
    getMany: (...args) => run(() => repository.getMany(...args)),
    changeDate: (...args) => run(() => repository.changeDate(...args)),
    updateStickerStyle: (...args) => run(() => repository.updateStickerStyle(...args)),
    setCover: (...args) => run(() => repository.setCover(...args)),
    remove: (...args) => run(() => repository.remove(...args)),
    pendingDeletions: () => run(() => repository.pendingDeletions()),
    acknowledgeDeletion: (...args) => run(() => repository.acknowledgeDeletion(...args)),
    stageOrphanDeletions: (...args) => run(() => repository.stageOrphanDeletions(...args)),
    savePhotoPreview: (...args) => run(() => repository.savePhotoPreview(...args)),
    findDuplicate: (...args) => run(() => repository.findDuplicate(...args)),
    queueBatch: (...args) => run(() => repository.queueBatch(...args)),
    claimNext: () => run(() => repository.claimNext()),
    pauseQueued: (...args) => run(() => repository.pauseQueued(...args)),
    resumePaused: (...args) => run(() => repository.resumePaused(...args)),
    queueCounts: () => run(() => repository.queueCounts()),
    close() {
      if (closePromise) return closePromise;
      closing = true;
      closePromise = enqueue(() => repository.close());
      return closePromise;
    },
  };
}
