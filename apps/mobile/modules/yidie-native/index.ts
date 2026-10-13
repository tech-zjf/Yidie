import { requireOptionalNativeModule } from 'expo-modules-core';
import type { Asset, ImportedPhoto, Sticker } from '../../src/domain/records';
export interface LocalModule {
  capabilities(): { simulator: boolean; minimumIOS: number };
  prepareStorage(): Promise<{ rootUri: string; databaseUri: string }>;
  requestPermission(): Promise<'authorized' | 'limited' | 'denied'>;
  listPhotos(offset: number, limit: number): Promise<Asset[]>;
  thumbnail(assetId: string): Promise<string | null>;
  importPhoto(assetId: string): Promise<ImportedPhoto>;
  createSticker(id: string): Promise<Sticker>;
  discardImport(id: string): Promise<void>;
}
export const native = requireOptionalNativeModule<LocalModule>('YidieNative');
