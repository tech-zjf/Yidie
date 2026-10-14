import type { EntryRepository, ImageFileStore } from './records';
import type { SerialWork } from './processingQueue';

export function createImageMaintenance(
  repository: EntryRepository,
  files: ImageFileStore,
  serial: SerialWork,
) {
  return {
    /** Cold start only, before any UI can create a new import draft. */
    reconcile: () =>
      serial(async () => {
        const candidates = await files.listImportIDs();
        return repository.stageOrphanDeletions(candidates);
      }),
    ensurePreview: (id: string) =>
      serial(async () => {
        const entry = await repository.get(id);
        if (!entry) throw new Error('ENTRY_NOT_FOUND');
        if (entry.photoPreviewPath && entry.photoWidth && entry.photoHeight) {
          return {
            path: entry.photoPreviewPath,
            width: entry.photoWidth,
            height: entry.photoHeight,
          };
        }
        const preview = await files.createPhotoPreview(id);
        await repository.savePhotoPreview(id, preview);
        return preview;
      }),
  };
}
export type ImageMaintenance = ReturnType<typeof createImageMaintenance>;
