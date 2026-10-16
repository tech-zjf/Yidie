import type { AppServices } from '../services';
import type {
  Entry,
  EntryRepository,
  QueueCounts,
  Sticker,
  StickerBorderColor,
  StickerEffect,
} from '../domain/records';
import { createEntryActions } from '../domain/entryActions';

async function readOnly(): Promise<never> {
  throw new Error('PREVIEW_READ_ONLY');
}

function sampleOutline(
  id: string,
  revision: number,
  effect: StickerEffect,
  width: number,
  color: StickerBorderColor,
) {
  const outline =
    width === 0 ? '' : `stroke="${color}" stroke-width="${width * 2}" stroke-linejoin="round"`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="360" viewBox="0 0 200 360"><g ${outline}><circle cx="100" cy="44" r="27" fill="#B89F89"/><path d="M68 78 L132 78 L162 206 L124 214 L134 334 L101 340 L85 231 L70 334 L40 329 L61 207 L34 200 Z" fill="#DAA6B2"/></g></svg>`;
  const path = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  return {
    id,
    path,
    sticker: {
      stickerPath: path,
      cutoutPath: `preview-cutout:${id}`,
      thumbnailPath: path,
      width: 200,
      height: 360,
      instanceCount: 1,
      effect,
      borderWidth: width,
      borderColor: color,
      styleRevision: revision,
    } satisfies Sticker,
  };
}

/** No imports of the real composition root or native adapter: no database, files, or permissions. */
export async function previewServices(entries: Entry[]): Promise<AppServices> {
  function findEntry(id: string) {
    const entry = entries.find((item) => item.id === id);
    if (!entry) throw new Error('ENTRY_NOT_FOUND');
    return entry;
  }

  const repository: EntryRepository = {
    close: async () => {},
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
    changeDate: async (id, expectedRevision, date) => {
      const entry = findEntry(id);
      if (entry.revision !== expectedRevision) throw new Error('STALE_RESULT');
      entry.date = date;
      entry.dateSource = date ? 'user' : 'unknown';
      entry.revision += 1;
    },
    updateStickerStyle: async (id, expectedRevision, sticker) => {
      const entry = findEntry(id);
      if (entry.revision !== expectedRevision) throw new Error('STALE_RESULT');
      if (entry.status !== 'ready') throw new Error('STICKER_NOT_READY');
      Object.assign(entry, sticker, { revision: entry.revision + 1 });
    },
    setCover: async (id, expectedRevision) => {
      const entry = findEntry(id);
      if (entry.revision !== expectedRevision) throw new Error('STALE_RESULT');
      if (!entry.date) throw new Error('DATE_REQUIRED');
      for (const other of entries) if (other.date === entry.date) other.isCover = false;
      entry.isCover = true;
    },
    remove: async (id, expectedRevision) => {
      const entry = findEntry(id);
      if (entry.revision !== expectedRevision) throw new Error('STALE_RESULT');
      entries.splice(entries.indexOf(entry), 1);
    },
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
    permissionStatus: () => 'notDetermined',
    chooseDate: readOnly,
    presentLimitedLibraryPicker: readOnly,
    listPhotos: readOnly,
    thumbnail: readOnly,
    importPhoto: readOnly,
    createSticker: readOnly,
    listStickerSubjects: async (id) => [{ path: `preview-subject:${id}`, width: 200, height: 360 }],
    stageStickerSubject: async (id) => `preview-cutout:${id}`,
    discardStickerSubjectDrafts: async () => {},
    renderStickerStyle: async (id, revision, cutoutPath, effect, borderWidth, borderColor) => ({
      ...sampleOutline(id, revision, effect, borderWidth, borderColor).sticker,
      cutoutPath: cutoutPath ?? findEntry(id).cutoutPath ?? `preview-cutout:${id}`,
    }),
    discardStickerStyleVersion: async () => {},
    pruneStickerStyles: async () => {},
    discardImport: readOnly,
    exportBackup: readOnly,
    prepareRestore: readOnly,
    discardRestore: readOnly,
    activateRestore: readOnly,
    shareSticker: readOnly,
    shareMonth: readOnly,
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
