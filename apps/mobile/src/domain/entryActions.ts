import { importPhoto, processEntry } from './importPhoto';
import type { DateProposal } from './datePolicy';
import type { EntryRepository, ImportedPhoto, PhotoProcessor } from './records';

/** One worker for image creation and deletion, so cleanup cannot race a late output. */
export function createEntryActions(repository: EntryRepository, processor: PhotoProcessor) {
  let tail: Promise<unknown> = Promise.resolve();
  function enqueue<T>(action: () => Promise<T>): Promise<T> {
    const pending = tail.then(action);
    tail = pending.catch(() => {});
    return pending;
  }
  async function clean(id: string): Promise<boolean> {
    try {
      await processor.discardImport(id);
      await repository.acknowledgeDeletion(id);
      return true;
    } catch {
      // Keep the durable cleanup row; missing files are safe to delete again.
      return false;
    }
  }
  return {
    import: (photo: ImportedPhoto, date: DateProposal) =>
      enqueue(() => importPhoto(photo, date, repository, processor)),
    retry: (id: string, revision: number) =>
      enqueue(async () => {
        const ticket = await repository.retry(id, revision);
        await processEntry(ticket, repository, processor);
      }),
    remove: (id: string, revision: number) =>
      enqueue(async () => {
        await repository.remove(id, revision);
        return { filesRemoved: await clean(id) };
      }),
    resumeCleanup: () =>
      enqueue(async () => {
        const ids = await repository.pendingDeletions();
        for (const id of ids) await clean(id);
      }),
  };
}
export type EntryActions = ReturnType<typeof createEntryActions>;
