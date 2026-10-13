import { native, type LocalModule } from '../modules/yidie-native';
import { openEntryRepository } from './data/entryRepository';
import type { EntryRepository } from './domain/records';
export interface AppServices {
  repository: EntryRepository;
  photos: LocalModule;
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
  return { repository, photos: native, rootUri: storage.rootUri };
}
