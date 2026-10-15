import { openDatabaseAsync } from 'expo-sqlite';
import { createEntryRepository } from './entryRepository';
import { initializeDatabase } from './initializeDatabase';
import { createWriteTransaction } from './writeTransaction';
import type { WriteTransaction } from './sqlDatabase';

export async function openEntryRepository(directory: string) {
  // This connection belongs to this repository instance. Reads, transactions, and close
  // are all protected by the repository's single serial lane.
  const db = await openDatabaseAsync('yidie.sqlite', { useNewConnection: true }, directory);
  const write: WriteTransaction = createWriteTransaction(db);
  try {
    await initializeDatabase(db, write);
    return createEntryRepository(db, write);
  } catch (error) {
    await db.closeAsync();
    throw error;
  }
}
