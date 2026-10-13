import type { DateProposal } from './datePolicy';
import type {
  ProcessingRepository,
  EntryRepository,
  ProcessingTicket,
  ImportedPhoto,
  PhotoProcessor,
} from './records';

export function errorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string')
    return error.code;
  return error instanceof Error ? error.message : 'PROCESSING_FAILED';
}

/** One foreground import for the phase-2 gate; persistent batch scheduling comes later. */
export async function importPhoto(
  photo: ImportedPhoto,
  date: DateProposal,
  repository: ProcessingRepository & Pick<EntryRepository, 'get'>,
  processor: PhotoProcessor,
) {
  let ticket: ProcessingTicket;
  try {
    ticket = await repository.begin(photo, date);
  } catch (error) {
    // Only discard unowned staging files. Never remove a persisted original on failure.
    try {
      // A duplicate submission may already own this UUID. Uncertain ownership keeps files.
      if (!(await repository.get(photo.id))) await processor.discardImport(photo.id);
    } catch {
      /* Reconcile unowned staging files later; never risk a persisted original. */
    }
    throw error;
  }
  await processEntry(ticket, repository, processor);
}

export async function processEntry(
  ticket: ProcessingTicket,
  repository: ProcessingRepository,
  processor: PhotoProcessor,
) {
  try {
    await repository.finish(ticket, await processor.createSticker(ticket.id));
  } catch (error) {
    await repository.fail(ticket, errorCode(error));
    throw error;
  }
}
