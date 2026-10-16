/** Public app contracts re-export current runtime types instead of redefining them. */
export type { DateProposal, DateSource } from '../apps/mobile/src/domain/datePolicy';
export type { Asset, ImportedPhoto, Sticker, StickerEffect, Entry, EntryRepository, PhotoProcessor } from '../apps/mobile/src/domain/records';
export type { BatchItem, DuplicateEntry, PauseReason, QueueCounts } from '../apps/mobile/src/domain/records';
export type { PhotoPreview, ImageFileStore } from '../apps/mobile/src/domain/records';
export type { LocalModule as YidieNative } from '../apps/mobile/modules/yidie-native';
export type RecordDate = string; // Validated Gregorian YYYY-MM-DD.

export interface StickerPlacement {
  entryId: string;
  imageRelativePath: string;
  x: number; y: number; width: number; height: number;
  rotationDeg: number; zIndex: number;
}

export interface MonthLayout {
  version: number;
  year: number; month: number;
  logicalWidth: number; logicalHeight: number;
  showAttribution: boolean;
  days: Array<{
    date: RecordDate;
    totalCount: number;
    showDateLabel: boolean; // False when this day has stickers; also applies to export.
    dateLabel: { x: number; y: number; size: number };
    placements: StickerPlacement[]; // At most 3, deterministic.
  }>;
}

export interface BackupManifest {
  format: 'yidie'; schemaVersion: number; appVersion: string;
  exportedAt: string; entryCount: number;
  files: Array<{ path: string; bytes: number; sha256: string }>;
}
