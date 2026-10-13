import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { isRecordDate, type DateProposal } from '../domain/datePolicy';
import type { Entry, EntryRepository, ImportedPhoto, Sticker } from '../domain/records';
import { schema } from './schema.generated';
import { withWriteTransaction } from './writeTransaction';

export async function openEntryRepository(directory: string): Promise<EntryRepository> {
  const db = await openDatabaseAsync('yidie.sqlite', {}, directory);
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((version?.user_version ?? 0) > 1) throw new Error('DATABASE_VERSION_TOO_NEW');
  if (!version?.user_version) {
    await withWriteTransaction(directory, async (tx) => {
      await tx.execAsync(schema.replace(/PRAGMA[^;]+;/g, ''));
      await tx.execAsync('PRAGMA user_version = 1');
    });
  }
  await withWriteTransaction(directory, async (tx) => {
    await tx.runAsync(
      "UPDATE entries SET processing_state='paused' WHERE processing_state IN ('running','queued')",
    );
    await tx.runAsync(
      "UPDATE processing_jobs SET state='paused' WHERE state IN ('running','queued')",
    );
  });
  let writes = Promise.resolve();
  function write(action: (tx: SQLiteDatabase) => Promise<void>) {
    const pending = writes.then(() => withWriteTransaction(directory, action));
    writes = pending.catch(() => {});
    return pending;
  }
  return {
    list: (options = {}) => {
      const select = `SELECT id, record_date AS date, date_source AS dateSource,
      original_path AS originalPath, sticker_path AS stickerPath, thumbnail_path AS thumbnailPath,
      sticker_width AS width, sticker_height AS height, processing_state AS status FROM entries`;
      if (options.month) {
        if (!/^\d{4}-\d{2}$/.test(options.month)) return Promise.reject(new Error('INVALID_DATE'));
        return db.getAllAsync<Entry>(
          `${select} WHERE record_date BETWEEN ? AND ? ORDER BY sort_key,id`,
          `${options.month}-01`,
          `${options.month}-31`,
        );
      }
      return db.getAllAsync<Entry>(
        `${select} ORDER BY sort_key DESC,id DESC LIMIT 60 OFFSET ?`,
        Math.max(0, options.offset ?? 0),
      );
    },
    begin(photo: ImportedPhoto, date: DateProposal) {
      if (date.date !== null && !isRecordDate(date.date))
        return Promise.reject(new Error('INVALID_DATE'));
      return write(async (tx) => {
        if (date.date)
          await tx.runAsync('INSERT OR IGNORE INTO days(record_date) VALUES (?)', date.date);
        const now = new Date().toISOString();
        await tx.runAsync(
          `INSERT INTO entries
          (id, record_date, date_source, source_datetime, suggested_timezone, content_hash, original_path,
           processing_state, layout_seed, sort_key, imported_at, updated_at)
          VALUES (?,?,?,?,?,?,?,'running',0,?,?,?)`,
          photo.id,
          date.date,
          date.source,
          photo.exifDateTime ?? photo.createdAt,
          date.assumedTimeZone ?? null,
          photo.contentHash,
          photo.originalPath,
          Date.now(),
          now,
          now,
        );
        await tx.runAsync(
          `INSERT INTO processing_jobs(id,entry_id,state,expected_revision,attempt,created_at,updated_at)
          VALUES (?,?,'running',0,1,?,?)`,
          photo.id,
          photo.id,
          now,
          now,
        );
      });
    },
    finish(id: string, sticker: Sticker) {
      return write(async (tx) => {
        const now = new Date().toISOString();
        const change = await tx.runAsync(
          `UPDATE entries SET sticker_path=?, thumbnail_path=?, sticker_width=?, sticker_height=?, processing_state='ready', updated_at=?
          WHERE id=? AND revision=0 AND processing_state='running'`,
          sticker.stickerPath,
          sticker.thumbnailPath,
          sticker.width,
          sticker.height,
          now,
          id,
        );
        if (change.changes !== 1) throw new Error('STALE_RESULT');
        await tx.runAsync(
          "UPDATE processing_jobs SET state='ready',updated_at=? WHERE entry_id=?",
          now,
          id,
        );
      });
    },
    fail(id: string, code: string) {
      return write(async (tx) => {
        const now = new Date().toISOString();
        await tx.runAsync(
          "UPDATE entries SET processing_state='failed',error_code=?,updated_at=? WHERE id=? AND revision=0 AND processing_state='running'",
          code,
          now,
          id,
        );
        await tx.runAsync(
          "UPDATE processing_jobs SET state='failed',error_code=?,updated_at=? WHERE entry_id=? AND expected_revision=0 AND state='running'",
          code,
          now,
          id,
        );
      });
    },
  };
}
