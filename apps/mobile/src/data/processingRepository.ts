import { insertPhoto } from './insertPhoto';
import type { ProcessingRepository } from '../domain/records';
import type { WriteTransaction } from './sqlDatabase';

export function createProcessingRepository(write: WriteTransaction): ProcessingRepository {
  return {
    begin: (photo, date) => write((tx) => insertPhoto(tx, photo, date, 'running')),
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
          `UPDATE processing_jobs SET state='running',error_code=NULL,pause_reason=NULL,expected_revision=?,attempt=attempt+1,updated_at=?
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
          `UPDATE entries SET sticker_path=?,cutout_path=?,thumbnail_path=?,sticker_width=?,sticker_height=?,
        border_width=?,border_color=?,style_revision=?,
        processing_state='ready',error_code=NULL,updated_at=?
        WHERE id=? AND revision=? AND processing_state='running'`,
          sticker.stickerPath,
          sticker.cutoutPath,
          sticker.thumbnailPath,
          sticker.width,
          sticker.height,
          sticker.borderWidth,
          sticker.borderColor,
          sticker.styleRevision,
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
