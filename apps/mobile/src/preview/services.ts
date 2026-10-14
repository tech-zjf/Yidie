import type { AppServices } from '../services';
import type { Entry, EntryRepository, QueueCounts } from '../domain/records';
import { createEntryActions } from '../domain/entryActions';

async function readOnly(): Promise<never> {
  throw new Error('PREVIEW_READ_ONLY');
}
/** No imports of the real composition root or native adapter: no database, files, or permissions. */
export async function previewServices(entries: Entry[]): Promise<AppServices> {
  const repository: EntryRepository = {
    list: async (options = {}) =>
      entries.filter((entry) => !options.month || entry.date?.startsWith(options.month)),
    get: async (id) => entries.find((entry) => entry.id === id) ?? null,
    getMany: async (ids) => entries.filter((entry) => ids.includes(entry.id)),
    queueCounts: async () => {
      const counts: QueueCounts = { queued: 0, running: 0, paused: 0, failed: 0 };
      for (const entry of entries) if (entry.status !== 'ready') counts[entry.status]++;
      return counts;
    },
    begin: readOnly,
    retry: readOnly,
    finish: readOnly,
    fail: readOnly,
    changeDate: readOnly,
    setCover: readOnly,
    remove: readOnly,
    pendingDeletions: async () => [],
    acknowledgeDeletion: readOnly,
    stageOrphanDeletions: readOnly,
    savePhotoPreview: readOnly,
    findDuplicate: readOnly,
    queueBatch: readOnly,
    claimNext: readOnly,
    pauseQueued: readOnly,
    resumePaused: readOnly,
  };
  const photos: AppServices['photos'] = {
    capabilities: () => ({ simulator: true, minimumIOS: 17 }),
    prepareStorage: readOnly,
    requestPermission: readOnly,
    listPhotos: readOnly,
    thumbnail: readOnly,
    importPhoto: readOnly,
    createSticker: readOnly,
    discardImport: readOnly,
    listImportIDs: readOnly,
    createPhotoPreview: readOnly,
  };
  const actions = createEntryActions(repository, photos);
  await actions.queue.refresh();
  return {
    repository,
    photos,
    actions,
    rootUri: '',
    images: { reconcile: readOnly, ensurePreview: readOnly },
    maintenancePending: false,
  };
}
