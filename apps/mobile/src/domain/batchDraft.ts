import { isRecordDate, type DateProposal } from './datePolicy';
import type { Asset, BatchItem, DuplicateEntry, ImportedPhoto } from './records';

/** Development guardrail; revisit only after device memory/performance measurements. */
export const batchLimit = 10;
export type PreparedDraft = {
  asset: Asset;
  photo: ImportedPhoto;
  date: DateProposal;
  previewUri: string | null;
  duplicate: DuplicateEntry | null;
  include: boolean;
};
export interface PreparationFailure {
  asset: Asset;
  code: string;
}

export function changeDraftDates(
  drafts: PreparedDraft[],
  ids: string[],
  value: string,
): PreparedDraft[] {
  const date = value.trim() || null;
  if (date !== null && !isRecordDate(date)) throw new Error('INVALID_DATE');
  const selected = new Set(ids);
  return drafts.map((draft) =>
    selected.has(draft.photo.id)
      ? { ...draft, date: { date, source: date ? 'user' : 'unknown' } }
      : draft,
  );
}
export function groupDrafts(drafts: PreparedDraft[]) {
  const groups = new Map<string, PreparedDraft[]>();
  for (const draft of drafts) {
    const key = draft.date.date ?? '';
    const group = groups.get(key);
    if (group) group.push(draft);
    else groups.set(key, [draft]);
  }
  return [...groups]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, data]) => ({ date: date || null, data }));
}
export function toBatchItems(drafts: PreparedDraft[]): BatchItem[] {
  return drafts
    .filter((draft) => draft.include)
    .map((draft) => ({
      photo: draft.photo,
      date: draft.date,
      allowDuplicate: draft.duplicate !== null,
    }));
}
