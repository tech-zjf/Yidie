import type { DateProposal, DateSource } from './datePolicy';
export interface Asset {
  id: string;
  createdAt: string | null;
  width: number;
  height: number;
}
export interface ImportedPhoto {
  id: string;
  originalPath: string;
  photoPreviewPath: string;
  photoWidth: number;
  photoHeight: number;
  contentHash: string;
  exifDateTime: string | null;
  createdAt: string | null;
  sourceAssetId?: string;
}
export interface Sticker {
  stickerPath: string;
  cutoutPath: string;
  thumbnailPath: string;
  width: number;
  height: number;
  instanceCount: number;
  borderWidth: number;
  borderColor: StickerBorderColor;
  styleRevision: number;
}
export type StickerBorderColor = '#FFFFFF' | '#242424' | '#0786A8';
export interface Entry {
  id: string;
  date: string | null;
  dateSource: DateSource;
  originalPath: string;
  photoPreviewPath: string | null;
  photoWidth: number | null;
  photoHeight: number | null;
  stickerPath: string | null;
  cutoutPath: string | null;
  thumbnailPath: string | null;
  borderWidth: number;
  borderColor: StickerBorderColor;
  styleRevision: number;
  width: number | null;
  height: number | null;
  status: 'queued' | 'running' | 'ready' | 'failed' | 'paused';
  revision: number;
  sortKey: number;
  isCover: boolean;
  errorCode: string | null;
}
export interface EntryCursor {
  date: string | null;
  sortKey: number;
  id: string;
}
export interface ProcessingTicket {
  id: string;
  revision: number;
}
export interface ProcessingRepository {
  begin(photo: ImportedPhoto, date: DateProposal): Promise<ProcessingTicket>;
  retry(id: string, expectedRevision: number): Promise<ProcessingTicket>;
  finish(ticket: ProcessingTicket, sticker: Sticker): Promise<void>;
  fail(ticket: ProcessingTicket, code: string): Promise<void>;
}
export interface EntryRepository extends ProcessingRepository {
  close(): Promise<void>;
  list(options?: { month?: string; before?: EntryCursor }): Promise<Entry[]>;
  get(id: string): Promise<Entry | null>;
  getMany(ids: string[]): Promise<Entry[]>;
  changeDate(id: string, expectedRevision: number, date: string | null): Promise<void>;
  updateStickerStyle(id: string, expectedRevision: number, sticker: Sticker): Promise<void>;
  setCover(id: string, expectedRevision: number): Promise<void>;
  remove(id: string, expectedRevision: number): Promise<void>;
  pendingDeletions(): Promise<string[]>;
  acknowledgeDeletion(id: string): Promise<void>;
  stageOrphanDeletions(ids: string[]): Promise<number>;
  savePhotoPreview(id: string, preview: PhotoPreview): Promise<void>;
  findDuplicate(photo: ImportedPhoto): Promise<DuplicateEntry | null>;
  queueBatch(items: BatchItem[]): Promise<void>;
  claimNext(): Promise<ProcessingTicket | null>;
  pauseQueued(reason: PauseReason): Promise<void>;
  resumePaused(reason?: PauseReason): Promise<void>;
  queueCounts(): Promise<QueueCounts>;
}
export interface DuplicateEntry {
  id: string;
  date: string | null;
}
export interface BatchItem {
  photo: ImportedPhoto;
  date: DateProposal;
  allowDuplicate: boolean;
}
export type PauseReason = 'user' | 'background' | 'interrupted' | 'storage';
export interface QueueCounts {
  queued: number;
  running: number;
  paused: number;
  failed: number;
}
export interface PhotoProcessor {
  createSticker(id: string): Promise<Sticker>;
  discardImport(id: string): Promise<void>;
}
export interface PhotoPreview {
  path: string;
  width: number;
  height: number;
}
export interface ImageFileStore {
  listImportIDs(): Promise<string[]>;
  createPhotoPreview(id: string): Promise<PhotoPreview>;
}
