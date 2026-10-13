import { batchLimit, type PreparedDraft, type PreparationFailure } from './batchDraft';
import { isRecordDate, proposeDate } from './datePolicy';
import { errorCode } from './importPhoto';
import type { Asset, EntryRepository, ImportedPhoto } from './records';

interface PreparationPorts {
  source: {
    importPhoto(id: string): Promise<ImportedPhoto>;
    thumbnail(id: string): Promise<string | null>;
  };
  repository: Pick<EntryRepository, 'findDuplicate'>;
  retain(photo: ImportedPhoto): void;
  release(photo: ImportedPhoto): Promise<void>;
}
interface PreparationOptions {
  selectedDate?: string;
  timeZone: string;
  isCancelled(): boolean;
  onProgress(current: number, total: number): void;
}

/** Sequential reads bound memory; no Vision runs before date/duplicate confirmation. */
export async function prepareBatch(
  assets: Asset[],
  existing: PreparedDraft[],
  ports: PreparationPorts,
  options: PreparationOptions,
) {
  if (assets.length + existing.length > batchLimit) throw new Error('BATCH_LIMIT');
  if (options.selectedDate && !isRecordDate(options.selectedDate)) throw new Error('INVALID_DATE');
  const drafts = [...existing],
    failures: PreparationFailure[] = [];
  function skip(from: number, code: string) {
    failures.push(...assets.slice(from).map((asset) => ({ asset, code })));
  }
  for (const [index, asset] of assets.entries()) {
    if (options.isCancelled()) {
      skip(index, 'READ_CANCELLED');
      break;
    }
    options.onProgress(index + 1, assets.length);
    let photo: ImportedPhoto | undefined;
    try {
      photo = { ...(await ports.source.importPhoto(asset.id)), sourceAssetId: asset.id };
      ports.retain(photo);
      if (options.isCancelled()) {
        await ports.release(photo);
        skip(index, 'READ_CANCELLED');
        break;
      }
      const inBatch = drafts.find(
        (draft) => draft.photo.contentHash === photo?.contentHash || draft.asset.id === asset.id,
      );
      const persisted = await ports.repository.findDuplicate(photo);
      const duplicate =
        persisted ?? (inBatch ? { id: inBatch.photo.id, date: inBatch.date.date } : null);
      const date = proposeDate({
        ...photo,
        selectedDate: options.selectedDate,
        timeZone: options.timeZone,
      });
      let previewUri: string | null = null;
      try {
        previewUri = await ports.source.thumbnail(asset.id);
      } catch {
        /* Optional local preview. */
      }
      if (options.isCancelled()) {
        await ports.release(photo);
        skip(index, 'READ_CANCELLED');
        break;
      }
      drafts.push({ asset, photo, date, previewUri, duplicate, include: duplicate === null });
    } catch (error) {
      if (photo) await ports.release(photo);
      const code = errorCode(error);
      failures.push({ asset, code });
      if (code === 'INSUFFICIENT_STORAGE') {
        skip(index + 1, 'SKIPPED_STORAGE');
        break;
      }
    }
  }
  return { drafts, failures };
}
