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
}
export interface EntryRepository {
  list(options?: { month?: string; offset?: number }): Promise<Entry[]>;
  begin(photo: ImportedPhoto, date: DateProposal): Promise<void>;
  finish(id: string, sticker: Sticker): Promise<void>;
  fail(id: string, code: string): Promise<void>;
}
export interface PhotoProcessor {
  createSticker(id: string): Promise<Sticker>;
  discardImport(id: string): Promise<void>;
}
