import { isRecordDate, type DateProposal } from '../domain/datePolicy';
import type { ImportedPhoto } from '../domain/records';
import type { SqlDatabase } from './sqlDatabase';

export async function insertPhoto(
  tx: SqlDatabase,
  photo: ImportedPhoto,
  date: DateProposal,
  state: 'queued' | 'running',
) {
  if (date.date !== null && !isRecordDate(date.date)) throw new Error('INVALID_DATE');
  const deletion = await tx.getFirstAsync(
    'SELECT entry_id FROM file_deletions WHERE entry_id=?',
    photo.id,
  );
  if (deletion) throw new Error('INVALID_RESOURCE');
  if (date.date) await tx.runAsync('INSERT OR IGNORE INTO days(record_date) VALUES (?)', date.date);
  const now = new Date().toISOString();
  await tx.runAsync(
    `INSERT INTO entries
    (id,record_date,date_source,source_datetime,suggested_timezone,source_asset_id,content_hash,original_path,photo_preview_path,photo_width,photo_height,
    processing_state,layout_seed,sort_key,imported_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?)`,
    photo.id,
    date.date,
    date.source,
    photo.exifDateTime ?? photo.createdAt,
    date.assumedTimeZone ?? null,
    photo.sourceAssetId ?? null,
    photo.contentHash,
    photo.originalPath,
    photo.photoPreviewPath,
    photo.photoWidth,
    photo.photoHeight,
    state,
    Date.now(),
    now,
    now,
  );
  await tx.runAsync(
    `INSERT INTO processing_jobs(id,entry_id,state,expected_revision,attempt,created_at,updated_at)
    VALUES (?,?,?,0,?,?,?)`,
    photo.id,
    photo.id,
    state,
    state === 'running' ? 1 : 0,
    now,
    now,
  );
  return { id: photo.id, revision: 0 };
}
