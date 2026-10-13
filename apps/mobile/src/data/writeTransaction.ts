import { openDatabaseAsync } from 'expo-sqlite';
import type { SqlDatabase } from './sqlDatabase';

/** Every write owns a dedicated connection, configured before BEGIN. */
export async function withWriteTransaction<T>(
  directory: string,
  action: (tx: SqlDatabase) => Promise<T>,
) {
  const tx = await openDatabaseAsync('yidie.sqlite', { useNewConnection: true }, directory);
  try {
    await tx.execAsync('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    const foreignKeys = await tx.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys');
    if (foreignKeys?.foreign_keys !== 1) throw new Error('FOREIGN_KEYS_DISABLED');
    await tx.execAsync('BEGIN IMMEDIATE');
    try {
      const result = await action(tx);
      await tx.execAsync('COMMIT');
      return result;
    } catch (error) {
      await tx.execAsync('ROLLBACK');
      throw error;
    }
  } finally {
    await tx.closeAsync();
  }
}
