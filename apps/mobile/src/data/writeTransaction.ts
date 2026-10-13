import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

/** Every write owns a dedicated connection, configured before BEGIN. */
export async function withWriteTransaction(
  directory: string,
  action: (tx: SQLiteDatabase) => Promise<void>,
) {
  const tx = await openDatabaseAsync('yidie.sqlite', { useNewConnection: true }, directory);
  try {
    await tx.execAsync('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    const foreignKeys = await tx.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys');
    if (foreignKeys?.foreign_keys !== 1) throw new Error('FOREIGN_KEYS_DISABLED');
    await tx.execAsync('BEGIN IMMEDIATE');
    try {
      await action(tx);
      await tx.execAsync('COMMIT');
    } catch (error) {
      await tx.execAsync('ROLLBACK');
      throw error;
    }
  } finally {
    await tx.closeAsync();
  }
}
