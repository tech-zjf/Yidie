import type {
  DuplicateEntry,
  EntryRepository,
  ImportedPhoto,
  QueueCounts,
  ProcessingTicket,
} from '../domain/records';
import { batchLimit } from '../domain/batchDraft';
import { insertPhoto } from './insertPhoto';
import type { SqlDatabase, WriteTransaction } from './sqlDatabase';

async function duplicate(db: SqlDatabase, photo: ImportedPhoto) {
  return db.getFirstAsync<DuplicateEntry>(
    'SELECT id,record_date AS date FROM entries WHERE content_hash=? OR source_asset_id=? ORDER BY sort_key,id LIMIT 1',
    photo.contentHash,
    photo.sourceAssetId ?? null,
  );
}
export function createQueueRepository(
  db: SqlDatabase,
  write: WriteTransaction,
): Pick<
  EntryRepository,
  'findDuplicate' | 'queueBatch' | 'claimNext' | 'pauseQueued' | 'resumePaused' | 'queueCounts'
> {
  return {
    findDuplicate: (photo) => duplicate(db, photo),
    queueBatch: (items) =>
      write(async (tx) => {
        if (!items.length || items.length > batchLimit) throw new Error('BATCH_LIMIT');
        for (const item of items) {
          // Check again inside the transaction; the library may have changed since preview.
          if (!item.allowDuplicate && (await duplicate(tx, item.photo)))
            throw new Error('DUPLICATE_REVIEW');
          await insertPhoto(tx, item.photo, item.date, 'queued');
        }
      }),
    claimNext: () =>
      write(async (tx) => {
        const ticket = await tx.getFirstAsync<ProcessingTicket>(
          "SELECT entry_id AS id,expected_revision AS revision FROM processing_jobs WHERE state='queued' ORDER BY created_at,id LIMIT 1",
        );
        if (!ticket) return null;
        const now = new Date().toISOString();
        const change = await tx.runAsync(
          "UPDATE entries SET processing_state='running',updated_at=? WHERE id=? AND revision=? AND processing_state='queued'",
          now,
          ticket.id,
          ticket.revision,
        );
        if (change.changes !== 1) throw new Error('STALE_RESULT');
        await tx.runAsync(
          "UPDATE processing_jobs SET state='running',attempt=attempt+1,pause_reason=NULL,updated_at=? WHERE entry_id=?",
          now,
          ticket.id,
        );
        return ticket;
      }),
    pauseQueued: (reason) =>
      write(async (tx) => {
        const now = new Date().toISOString();
        await tx.runAsync(
          "UPDATE entries SET processing_state='paused',updated_at=? WHERE id IN (SELECT entry_id FROM processing_jobs WHERE state='queued')",
          now,
        );
        await tx.runAsync(
          "UPDATE processing_jobs SET state='paused',pause_reason=?,updated_at=? WHERE state='queued'",
          reason,
          now,
        );
      }),
    resumePaused: (reason) =>
      write(async (tx) => {
        const filter = reason ? ' AND pause_reason=?' : '';
        const params = reason ? [reason] : [];
        const now = new Date().toISOString();
        await tx.runAsync(
          `UPDATE entries SET processing_state='queued',revision=revision+1,updated_at=?
        WHERE id IN (SELECT entry_id FROM processing_jobs WHERE state='paused'${filter})`,
          now,
          ...params,
        );
        await tx.runAsync(
          `UPDATE processing_jobs SET state='queued',expected_revision=expected_revision+1,pause_reason=NULL,updated_at=? WHERE state='paused'${filter}`,
          now,
          ...params,
        );
      }),
    async queueCounts() {
      const rows = await db.getAllAsync<{ state: keyof QueueCounts; count: number }>(
        "SELECT processing_state AS state,COUNT(*) AS count FROM entries WHERE processing_state <> 'ready' GROUP BY processing_state",
      );
      const counts: QueueCounts = { queued: 0, running: 0, paused: 0, failed: 0 };
      for (const row of rows) counts[row.state] = row.count;
      return counts;
    },
  };
}
