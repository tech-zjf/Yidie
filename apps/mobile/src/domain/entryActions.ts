import { importPhoto, processEntry } from './importPhoto';
import type { DateProposal } from './datePolicy';
import { createProcessingQueue } from './processingQueue';
import { createSerialWork } from './serialWork';
import type { BatchItem, EntryRepository, ImportedPhoto, PhotoProcessor } from './records';

/** One worker for image creation and deletion, so cleanup cannot race a late output. */
export function createEntryActions(
  repository: EntryRepository,
  processor: PhotoProcessor,
  enqueue = createSerialWork(),
) {
  const queue = createProcessingQueue(repository, processor, enqueue);
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
    queue,
    submitBatch: async (items: BatchItem[]) => {
      await enqueue(() => repository.queueBatch(items));
      await queue.refresh();
      void queue.start();
    },
    discardDrafts: (photos: ImportedPhoto[]) =>
      enqueue(async () => {
        for (const photo of photos) {
          try {
            if (!(await repository.get(photo.id))) await processor.discardImport(photo.id);
          } catch {
            /* Preserve uncertain ownership; cold-start reconciliation retries safely. */
          }
        }
      }),
    import: (photo: ImportedPhoto, date: DateProposal) =>
      enqueue(() => importPhoto(photo, date, repository, processor)),
    retry: (id: string, revision: number) =>
      enqueue(async () => {
        const ticket = await repository.retry(id, revision);
        try {
          await processEntry(ticket, repository, processor);
        } finally {
          await queue.refresh();
        }
      }),
    remove: (id: string, revision: number) =>
      enqueue(async () => {
        await repository.remove(id, revision);
        await queue.refresh();
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
