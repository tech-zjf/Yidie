import type { SqlDatabase } from './sqlDatabase';

/** Writes share the repository's owned connection and serial lane. */
export function createWriteTransaction(db: SqlDatabase) {
  return async function write<T>(action: (tx: SqlDatabase) => Promise<T>): Promise<T> {
    await db.execAsync('BEGIN IMMEDIATE');
    try {
      const result = await action(db);
      await db.execAsync('COMMIT');
      return result;
    } catch (error) {
      // Keep the original failure; a failed rollback must not hide it.
      await db.execAsync('ROLLBACK').catch(() => {});
      throw error;
    }
  };
}
