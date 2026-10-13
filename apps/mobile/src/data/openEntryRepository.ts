import { openDatabaseAsync } from 'expo-sqlite';
import { createEntryRepository } from './entryRepository';
import { initializeDatabase } from './initializeDatabase';
import { withWriteTransaction } from './writeTransaction';
import type { WriteTransaction } from './sqlDatabase';

export async function openEntryRepository(directory: string) {
  const db = await openDatabaseAsync('yidie.sqlite', {}, directory);
  const write: WriteTransaction = (action) => withWriteTransaction(directory, action);
  try {
    await initializeDatabase(db, write);
    return createEntryRepository(db, write);
  } catch (error) {
    await db.closeAsync();
    throw error;
  }
}
