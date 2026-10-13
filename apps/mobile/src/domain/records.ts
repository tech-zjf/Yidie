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
  contentHash: string;
  exifDateTime: string | null;
  createdAt: string | null;
}
export interface Sticker {
  stickerPath: string;
  thumbnailPath: string;
  width: number;
  height: number;
  instanceCount: number;
}
export interface Entry {
  id: string;
  date: string | null;
  dateSource: DateSource;
  originalPath: string;
  stickerPath: string | null;
  thumbnailPath: string | null;
  width: number | null;
  height: number | null;
  status: 'queued' | 'running' | 'ready' | 'failed' | 'paused';
  revision: number;
  sortKey: number;
  isCover: boolean;
  errorCode: string | null;
}
export interface EntryCursor {
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
  list(options?: { month?: string; before?: EntryCursor }): Promise<Entry[]>;
  get(id: string): Promise<Entry | null>;
  changeDate(id: string, expectedRevision: number, date: string | null): Promise<void>;
  setCover(id: string, expectedRevision: number): Promise<void>;
  remove(id: string, expectedRevision: number): Promise<void>;
  pendingDeletions(): Promise<string[]>;
  acknowledgeDeletion(id: string): Promise<void>;
}
export interface PhotoProcessor {
  createSticker(id: string): Promise<Sticker>;
  discardImport(id: string): Promise<void>;
}
