/** Design-only contracts. No native module or RN implementation is provided yet. */
export type RecordDate = string; // Runtime validated Gregorian YYYY-MM-DD.
export type DateSource = 'user' | 'exif' | 'photo_library' | 'unknown';
export type ProcessingState = 'queued' | 'running' | 'ready' | 'failed' | 'paused';
export type NativeErrorCode =
  | 'UNSUPPORTED_DEVICE' | 'PHOTO_PERMISSION_DENIED' | 'SOURCE_NOT_LOCAL'
  | 'SOURCE_UNAVAILABLE' | 'INVALID_IMAGE' | 'NO_FOREGROUND'
  | 'PROCESSING_FAILED' | 'INSUFFICIENT_STORAGE' | 'CANCELLED';

export interface DateProposal {
  recordDate: RecordDate | null;
  source: DateSource;
  sourceDateTime?: string;
  offsetMinutes?: number;
  assumedTimeZone?: string;
  needsConfirmation: boolean;
}

export interface LocalPhoto {
  localUri: string; // Temporary native result: caller copies into owned storage.
  assetId?: string;
  contentHash: string;
  width: number;
  height: number;
  originalOrientation: number;
  date: DateProposal;
}

export interface StickerRequest {
  jobId: string;
  entryId: string;
  expectedRevision: number;
  originalUri: string;
  maxInputDimension: number;
  instanceIds?: number[];
  borderWidth: number;
  outputDirectory: string;
}

export interface StickerResult {
  entryId: string;
  expectedRevision: number;
  stickerUri: string;
  thumbnailUri: string;
  width: number;
  height: number;
  subjectBounds: { x: number; y: number; width: number; height: number };
  availableInstanceIds: number[];
}

export interface YidieNative {
  getCapabilities(): Promise<{ canSegment: boolean; canReadLocalPhotos: boolean }>;
  readLocalPhoto(assetId: string, options: { allowNetwork: false }): Promise<LocalPhoto>;
  createSticker(request: StickerRequest): Promise<StickerResult>;
  cancelJob(jobId: string): Promise<void>;
  excludeFromBackup(directoryUri: string): Promise<void>;
  renderMonth(layout: MonthLayout, options: { widthPx: number; outputUri: string }): Promise<string>;
}

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
