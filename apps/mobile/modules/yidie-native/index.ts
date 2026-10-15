import { requireOptionalNativeModule } from 'expo-modules-core';
import type {
  Asset,
  ImportedPhoto,
  Sticker,
  StickerBorderColor,
  StickerEffect,
  StickerSubjectCandidate,
  ImageFileStore,
} from '../../src/domain/records';
import type { MonthExportPayload } from '../../src/domain/monthLayout';
import type { PhotoPermission } from '../../src/domain/photoPermission';
export interface LocalModule extends ImageFileStore {
  capabilities(): { simulator: boolean; minimumIOS: number };
  prepareStorage(): Promise<{ rootUri: string; databaseUri: string }>;
  requestPermission(): Promise<PhotoPermission>;
  permissionStatus(): PhotoPermission;
  chooseDate(currentDate: string | null): Promise<string | null>;
  presentLimitedLibraryPicker(): Promise<void>;
  listPhotos(offset: number, limit: number): Promise<Asset[]>;
  thumbnail(assetId: string): Promise<string | null>;
  importPhoto(assetId: string): Promise<ImportedPhoto>;
  createSticker(id: string): Promise<Sticker>;
  listStickerSubjects(id: string): Promise<StickerSubjectCandidate[]>;
  stageStickerSubject(id: string, candidatePath: string, styleRevision: number): Promise<string>;
  discardStickerSubjectDrafts(id: string): Promise<void>;
  renderStickerStyle(
    id: string,
    styleRevision: number,
    cutoutPath: string | null,
    effect: StickerEffect,
    borderWidth: number,
    borderColor: StickerBorderColor,
  ): Promise<Sticker>;
  discardStickerStyleVersion(
    id: string,
    styleRevision: number,
    cutoutPath?: string | null,
  ): Promise<void>;
  pruneStickerStyles(id: string, keepingRevision: number, cutoutPath: string): Promise<void>;
  discardImport(id: string): Promise<void>;
  exportBackup(): Promise<boolean>;
  prepareRestore(): Promise<{ entryCount: number; assetCount: number; totalBytes: number } | null>;
  discardRestore(): Promise<void>;
  activateRestore(): Promise<void>;
  shareSticker(id: string, styleRevision: number): Promise<boolean>;
  shareMonth(payload: MonthExportPayload): Promise<boolean>;
}
export const native = requireOptionalNativeModule<LocalModule>('YidieNative');
