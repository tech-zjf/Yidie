import type { Entry } from '../domain/records';
import type { PreparedDraft } from '../domain/batchDraft';

// Geometric stand-ins exercise aspect ratios and borders; they do not represent Vision output.
const shapes = ['#DAA6B2', '#333840', '#B9AD90'];
function image(index: number, photo: boolean) {
  const width = index % 3 === 0 ? 180 : 110;
  const height = index % 3 === 0 ? 210 : 340;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 200 360">${photo ? '<rect width="200" height="360" fill="#E6E8E5"/>' : ''}<g stroke="white" stroke-width="9" stroke-linejoin="round"><circle cx="100" cy="44" r="27" fill="#B89F89"/><path d="M68 78 L132 78 L162 206 L124 214 L134 334 L101 340 L85 231 L70 334 L40 329 L61 207 L34 200 Z" fill="${shapes[index % 3]}"/></g></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
function record(index: number, date: string | null, status: Entry['status'] = 'ready'): Entry {
  const cutout = image(index, false),
    photo = image(index, true);
  return {
    id: `fixture-${index}`,
    date,
    dateSource: date ? 'user' : 'unknown',
    originalPath: 'unavailable-original',
    photoPreviewPath: photo,
    photoWidth: index % 3 === 0 ? 180 : 110,
    photoHeight: index % 3 === 0 ? 210 : 340,
    stickerPath: status === 'ready' ? cutout : null,
    cutoutPath: status === 'ready' ? cutout : null,
    thumbnailPath: status === 'ready' ? cutout : null,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    styleRevision: 0,
    width: index % 3 === 0 ? 180 : 110,
    height: index % 3 === 0 ? 210 : 340,
    status,
    revision: 0,
    sortKey: index,
    isCover: false,
    errorCode: status === 'failed' ? 'NO_FOREGROUND' : null,
  };
}
export const scenarios = [
  'Everyday · multiple outfits',
  '31 days · six weeks',
  'Four-week month',
  'Empty calendar',
  'Processing and failures',
] as const;
export function calendarFixture(scenario: number) {
  if (scenario === 1)
    return {
      month: { year: 2026, month: 8 },
      entries: Array.from({ length: 31 }, (_, n) =>
        record(n, `2026-08-${String(n + 1).padStart(2, '0')}`),
      ),
    };
  if (scenario === 2)
    return {
      month: { year: 2026, month: 2 },
      entries: Array.from({ length: 28 }, (_, n) =>
        record(n, `2026-02-${String(n + 1).padStart(2, '0')}`),
      ),
    };
  const month = { year: 2026, month: 6 };
  if (scenario === 3) return { month, entries: [] };
  if (scenario === 4)
    return {
      month,
      entries: [
        record(0, '2026-06-10', 'queued'),
        record(1, '2026-06-11', 'running'),
        record(2, '2026-06-12', 'failed'),
        record(3, '2026-06-13', 'paused'),
        record(4, null),
      ],
    };
  return {
    month,
    entries: [
      record(0, '2026-06-10'),
      record(1, '2026-06-11'),
      ...Array.from({ length: 10 }, (_, n) => record(n + 2, '2026-06-12')),
      record(12, '2026-06-16'),
      record(13, '2026-06-18'),
      record(14, '2026-06-22'),
    ],
  };
}
export function importFixture(): PreparedDraft[] {
  return Array.from({ length: 5 }, (_, i) => {
    const entry = record(i, i === 4 ? null : '2026-06-12');
    return {
      asset: {
        id: entry.id,
        createdAt: null,
        width: entry.photoWidth!,
        height: entry.photoHeight!,
      },
      photo: {
        id: entry.id,
        originalPath: entry.originalPath,
        photoPreviewPath: entry.photoPreviewPath!,
        photoWidth: entry.photoWidth!,
        photoHeight: entry.photoHeight!,
        contentHash: 'preview-only',
        exifDateTime: null,
        createdAt: null,
      },
      date: { date: entry.date, source: entry.dateSource },
      previewUri: entry.photoPreviewPath,
      duplicate: i === 3 ? { id: 'existing', date: '2026-06-12' } : null,
      include: i !== 3,
    };
  });
}
