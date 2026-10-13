export type DateSource = 'user' | 'exif' | 'photo_library' | 'unknown';
export interface DateProposal {
  date: string | null;
  source: DateSource;
  assumedTimeZone?: string;
}
export function isRecordDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (y < 1 || m < 1 || m > 12 || d < 1) return false;
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  return d <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}
export function localDate(date = new Date()): string {
  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}
export function proposeDate(input: {
  selectedDate?: string;
  exifDateTime?: string | null;
  createdAt?: string | null;
  timeZone: string;
}): DateProposal {
  if (input.selectedDate !== undefined) {
    if (!isRecordDate(input.selectedDate)) throw new Error('INVALID_DATE');
    return { date: input.selectedDate, source: 'user' };
  }
  const exif = input.exifDateTime?.match(/^(\d{4}):(\d{2}):(\d{2})[ T]\d{2}:\d{2}:\d{2}/);
  const literal = exif && `${exif[1]}-${exif[2]}-${exif[3]}`;
  if (literal && isRecordDate(literal)) return { date: literal, source: 'exif' };
  if (input.createdAt && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(input.createdAt)) {
    const date = new Date(input.createdAt);
    if (Number.isFinite(date.valueOf())) {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: input.timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(date);
      const value = (key: string) => parts.find((p) => p.type === key)?.value;
      const result = `${value('year')}-${value('month')}-${value('day')}`;
      if (isRecordDate(result))
        return { date: result, source: 'photo_library', assumedTimeZone: input.timeZone };
    }
  }
  return { date: null, source: 'unknown' };
}
export function monthCells(year: number, month: number): (string | null)[] {
  const first = new Date(0);
  first.setUTCFullYear(year, month - 1, 1);
  first.setUTCHours(0, 0, 0, 0);
  const last = new Date(first);
  last.setUTCMonth(month, 0);
  const prefix = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-`;
  const cells: (string | null)[] = Array(first.getUTCDay()).fill(null);
  for (let d = 1; d <= last.getUTCDate(); d++) cells.push(prefix + String(d).padStart(2, '0'));
  while (cells.length % 7) cells.push(null);
  return cells;
}
export function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(0);
  d.setUTCFullYear(year, month - 1 + delta, 1);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}
