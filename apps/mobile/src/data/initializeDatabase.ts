import { schema, migrations } from './schema.generated';
import type { SqlDatabase, WriteTransaction } from './sqlDatabase';

const currentVersion = 4;

export async function initializeDatabase(db: SqlDatabase, write: WriteTransaction) {
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version > currentVersion) throw new Error('DATABASE_VERSION_TOO_NEW');
  await write(async (tx) => {
    if (version === 0) await tx.execAsync(schema.replace(/PRAGMA[^;]+;/g, ''));
    for (let next = Math.max(2, version + 1); next <= currentVersion; next++) {
      const migration = migrations[next];
      if (!migration) throw new Error('MIGRATION_MISSING');
      await tx.execAsync(migration);
    }
    await tx.execAsync(`PRAGMA user_version = ${currentVersion}`);
    // An interrupted process has no live worker after a cold start. Retry stays user-driven.
    await tx.runAsync(
      "UPDATE entries SET processing_state='paused' WHERE processing_state IN ('running','queued')",
    );
    await tx.runAsync(
      "UPDATE processing_jobs SET state='paused',pause_reason='interrupted' WHERE state IN ('running','queued')",
    );
  });
}
