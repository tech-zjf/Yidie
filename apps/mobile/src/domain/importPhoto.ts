import type { DateProposal } from './datePolicy';
import type { EntryRepository, ImportedPhoto, PhotoProcessor } from './records';

export function errorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string')
    return error.code;
  return error instanceof Error ? error.message : 'PROCESSING_FAILED';
}

/** One foreground import for the phase-2 gate; persistent batch scheduling comes later. */
export async function importPhoto(
  photo: ImportedPhoto,
  date: DateProposal,
  repository: EntryRepository,
  processor: PhotoProcessor,
) {
  try {
    await repository.begin(photo, date);
  } catch (error) {
    // No DB record owns this import yet. Never remove a persisted original on processing failure.
    await processor.discardImport(photo.id).catch(() => {});
    throw error;
  }
  try {
    await repository.finish(photo.id, await processor.createSticker(photo.id));
  } catch (error) {
    await repository.fail(photo.id, errorCode(error));
    throw error;
  }
}
