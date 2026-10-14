import { native, type LocalModule } from '../modules/yidie-native';
import { openEntryRepository } from './data/openEntryRepository';
import { createEntryActions, type EntryActions } from './domain/entryActions';
import type { EntryRepository } from './domain/records';
import { createSerialWork } from './domain/serialWork';
import { createImageMaintenance, type ImageMaintenance } from './domain/imageMaintenance';
export interface AppServices {
  repository: EntryRepository;
  photos: LocalModule;
  actions: EntryActions;
  rootUri: string;
  images: ImageMaintenance;
  maintenancePending: boolean;
}
let pending: Promise<AppServices> | undefined;
export function resetServices() {
  pending = undefined;
}
export function getServices(): Promise<AppServices> {
  if (!pending)
    pending = create().catch((error) => {
      pending = undefined;
      throw error;
    });
  return pending;
}
async function create(): Promise<AppServices> {
  if (!native) throw new Error('NATIVE_MODULE_MISSING');
  const storage = await native.prepareStorage();
  const repository = await openEntryRepository(storage.databaseUri);
  const serial = createSerialWork();
  const actions = createEntryActions(repository, native, serial);
  const images = createImageMaintenance(repository, native, serial);
  let maintenancePending = false;
  try {
    await images.reconcile();
  } catch {
    // Preserve every file when inventory or ownership is uncertain. Retry on the next cold start.
    maintenancePending = true;
  }
  await actions.resumeCleanup();
  await actions.queue.refresh();
  return {
    repository,
    photos: native,
    actions,
    images,
    maintenancePending,
    rootUri: storage.rootUri,
  };
}
