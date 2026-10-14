import { requireOptionalNativeModule } from 'expo-modules-core';
import type { Asset, ImportedPhoto, Sticker, ImageFileStore } from '../../src/domain/records';
export interface LocalModule extends ImageFileStore {
  capabilities(): { simulator: boolean; minimumIOS: number };
  prepareStorage(): Promise<{ rootUri: string; databaseUri: string }>;
  requestPermission(): Promise<'authorized' | 'limited' | 'denied'>;
  permissionStatus(): 'authorized' | 'limited' | 'denied';
  presentLimitedLibraryPicker(): Promise<void>;
  listPhotos(offset: number, limit: number): Promise<Asset[]>;
  thumbnail(assetId: string): Promise<string | null>;
  importPhoto(assetId: string): Promise<ImportedPhoto>;
  createSticker(id: string): Promise<Sticker>;
  discardImport(id: string): Promise<void>;
}
export const native = requireOptionalNativeModule<LocalModule>('YidieNative');
