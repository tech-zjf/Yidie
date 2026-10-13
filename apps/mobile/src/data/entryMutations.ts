import { isRecordDate } from '../domain/datePolicy';
import type { EntryRepository } from '../domain/records';
import type { SqlDatabase, WriteTransaction } from './sqlDatabase';

interface MutableEntry {
  record_date: string | null;
  revision: number;
  processing_state: string;
}
async function editable(tx: SqlDatabase, id: string, expectedRevision: number) {
  const entry = await tx.getFirstAsync<MutableEntry>(
    'SELECT record_date,revision,processing_state FROM entries WHERE id=?',
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
): Pick<EntryRepository, 'changeDate' | 'setCover' | 'remove'> {
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
