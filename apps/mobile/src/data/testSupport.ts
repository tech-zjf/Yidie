import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { createEntryRepository } from './entryRepository';
import type { SqlDatabase, WriteTransaction } from './sqlDatabase';
import type { ImportedPhoto, Sticker } from '../domain/records';
export function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  const db: SqlDatabase = {
    execAsync: async (sql) => {
      sqlite.exec(sql);
    },
    runAsync: async (sql, ...params) => ({
      changes: Number(sqlite.prepare(sql).run(...params).changes),
    }),
    getFirstAsync: async <T>(sql: string, ...params: (string | number | null)[]) =>
      (sqlite.prepare(sql).get(...params) ?? null) as T | null,
    getAllAsync: async <T>(sql: string, ...params: (string | number | null)[]) =>
      sqlite.prepare(sql).all(...params) as T[],
  };
  const write: WriteTransaction = async (action) => {
    sqlite.exec('BEGIN IMMEDIATE');
    try {
      const result = await action(db);
      sqlite.exec('COMMIT');
      return result;
    } catch (error) {
      sqlite.exec('ROLLBACK');
      throw error;
    }
  };
  return { sqlite, db, write, repository: createEntryRepository(db, write) };
}
export function photo(id: string): ImportedPhoto {
  return {
    id,
    originalPath: `originals/${id}.source`,
    contentHash: createHash('sha256').update(id).digest('hex'),
    exifDateTime: null,
    createdAt: null,
  };
}
export function sticker(id: string): Sticker {
  return {
    stickerPath: `stickers/${id}.png`,
    thumbnailPath: `previews/${id}.png`,
    width: 100,
    height: 200,
    instanceCount: 1,
  };
}
export async function ready(
  r: ReturnType<typeof fixture>,
  id: string,
  date: string | null = '2026-06-12',
) {
  const ticket = await r.repository.begin(photo(id), { date, source: date ? 'user' : 'unknown' });
  await r.repository.finish(ticket, sticker(id));
}
