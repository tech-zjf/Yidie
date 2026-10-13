import { native, type LocalModule } from '../modules/yidie-native';
import { openEntryRepository } from './data/openEntryRepository';
import { createEntryActions, type EntryActions } from './domain/entryActions';
import type { EntryRepository } from './domain/records';
export interface AppServices {
  repository: EntryRepository;
  photos: LocalModule;
  actions: EntryActions;
  rootUri: string;
}
let pending: Promise<AppServices> | undefined;
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
  const actions = createEntryActions(repository, native);
  await actions.resumeCleanup();
  return { repository, photos: native, actions, rootUri: storage.rootUri };
}
