import { isRecordDate } from '../domain/datePolicy';
import type { ProcessingRepository } from '../domain/records';
import type { WriteTransaction } from './sqlDatabase';

export function createProcessingRepository(write: WriteTransaction): ProcessingRepository {
  return {
    async begin(photo, date) {
      if (date.date !== null && !isRecordDate(date.date)) throw new Error('INVALID_DATE');
      return write(async (tx) => {
        const deletion = await tx.getFirstAsync(
          'SELECT entry_id FROM file_deletions WHERE entry_id=?',
          photo.id,
        );
        if (deletion) throw new Error('INVALID_RESOURCE');
        if (date.date)
          await tx.runAsync('INSERT OR IGNORE INTO days(record_date) VALUES (?)', date.date);
        const now = new Date().toISOString();
        await tx.runAsync(
          `INSERT INTO entries
          (id,record_date,date_source,source_datetime,suggested_timezone,content_hash,original_path,
           processing_state,layout_seed,sort_key,imported_at,updated_at)
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
        return { id: photo.id, revision: 0 };
      });
    },
    retry: (id, revision) =>
      write(async (tx) => {
        const now = new Date().toISOString();
        const result = await tx.runAsync(
          `UPDATE entries SET processing_state='running',error_code=NULL,revision=revision+1,updated_at=?
        WHERE id=? AND revision=? AND processing_state IN ('failed','paused')`,
          now,
          id,
          revision,
        );
        if (result.changes !== 1) throw new Error('STALE_RESULT');
        const job = await tx.runAsync(
          `UPDATE processing_jobs SET state='running',error_code=NULL,expected_revision=?,attempt=attempt+1,updated_at=?
        WHERE entry_id=?`,
          revision + 1,
          now,
          id,
        );
        if (job.changes !== 1) throw new Error('JOB_NOT_FOUND');
        return { id, revision: revision + 1 };
      }),
    finish: (ticket, sticker) =>
      write(async (tx) => {
        const now = new Date().toISOString();
        const change = await tx.runAsync(
          `UPDATE entries SET sticker_path=?,thumbnail_path=?,sticker_width=?,sticker_height=?,
        processing_state='ready',error_code=NULL,updated_at=?
        WHERE id=? AND revision=? AND processing_state='running'`,
          sticker.stickerPath,
          sticker.thumbnailPath,
          sticker.width,
          sticker.height,
          now,
          ticket.id,
          ticket.revision,
        );
        if (change.changes !== 1) throw new Error('STALE_RESULT');
        const job = await tx.runAsync(
          "UPDATE processing_jobs SET state='ready',error_code=NULL,updated_at=? WHERE entry_id=? AND expected_revision=? AND state='running'",
          now,
          ticket.id,
          ticket.revision,
        );
        if (job.changes !== 1) throw new Error('STALE_RESULT');
      }),
    fail: (ticket, code) =>
      write(async (tx) => {
        const now = new Date().toISOString();
        await tx.runAsync(
          "UPDATE entries SET processing_state='failed',error_code=?,updated_at=? WHERE id=? AND revision=? AND processing_state='running'",
          code,
          now,
          ticket.id,
          ticket.revision,
        );
        await tx.runAsync(
          "UPDATE processing_jobs SET state='failed',error_code=?,updated_at=? WHERE entry_id=? AND expected_revision=? AND state='running'",
          code,
          now,
          ticket.id,
          ticket.revision,
        );
      }),
  };
}
