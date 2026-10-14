import { monthCells } from './datePolicy';
import { stickerLayout, type Placement } from './stickerLayout';
import type { Entry } from './records';

export interface MonthStickerPlacement extends Placement {
  id: string;
  styleRevision: number;
  kind: 'sticker' | 'photoPreview';
}

export interface MonthCellLayout {
  date: string;
  day: number;
  entries: Entry[];
  stickers: MonthStickerPlacement[];
  badge: { top: number; right: number } | null;
}

export interface MonthLayout {
  cells: (MonthCellLayout | null)[];
  cellWidth: number;
  cellHeight: number;
  contentWidth: number;
  compact: boolean;
}

export interface MonthExportPayload {
  year: number;
  month: number;
  screenWidth: number;
  cellWidth: number;
  cellHeight: number;
  today: string;
  monthTitle: string;
  weekdays: string[];
  cells: ({
    date: string;
    day: number;
    count: number;
    badge: { top: number; right: number } | null;
    stickers: MonthStickerPlacement[];
  } | null)[];
}

/** One geometry contract for the interactive calendar and its exported PNG. */
export function monthLayout(input: {
  year: number;
  month: number;
  screenWidth: number;
  fontScale: number;
  entries: Entry[];
}): MonthLayout {
  const dates = monthCells(input.year, input.month);
  const compact = input.screenWidth <= 390;
  const contentWidth = input.screenWidth - (input.screenWidth <= 360 ? 12 : 32);
  const cellWidth = contentWidth / 7;
  const cellHeight = Math.max(
    dates.length === 42 ? (compact ? 54 : 58) : compact ? 62 : 68,
    44 * input.fontScale,
  );
  const entriesByDate = new Map<string, Entry[]>();
  for (const entry of input.entries) {
    if (!entry.date) continue;
    const day = entriesByDate.get(entry.date);
    if (day) day.push(entry);
    else entriesByDate.set(entry.date, [entry]);
  }

  return {
    cells: dates.map((date) => {
      if (!date) return null;
      const entries = entriesByDate.get(date) ?? [];
      const visible = entries.slice(0, 3);
      const placements = stickerLayout(
        visible.map((entry) => ({
          width: entry.width ?? entry.photoWidth ?? 1,
          height: entry.height ?? entry.photoHeight ?? 1.6,
        })),
        { width: cellWidth, height: cellHeight },
      );
      const stickers = visible.map((entry, index) => ({
        ...placements[index],
        id: entry.id,
        styleRevision: entry.styleRevision,
        kind: entry.status === 'ready' ? ('sticker' as const) : ('photoPreview' as const),
      }));
      const bounds = placements.map((item) => {
        const radians = (item.rotation * Math.PI) / 180;
        const width =
          Math.abs(item.width * Math.cos(radians)) + Math.abs(item.height * Math.sin(radians));
        const height =
          Math.abs(item.width * Math.sin(radians)) + Math.abs(item.height * Math.cos(radians));
        return {
          top: item.y + item.height / 2 - height / 2,
          right: item.x + item.width / 2 + width / 2,
        };
      });
      const badge =
        entries.length > 1 && bounds.length
          ? {
              top: Math.max(
                0,
                Math.min(cellHeight - 18, Math.min(...bounds.map((b) => b.top)) - 8),
              ),
              right: Math.max(
                0,
                Math.min(cellWidth - 18, cellWidth - Math.max(...bounds.map((b) => b.right)) - 8),
              ),
            }
          : null;
      return { date, day: Number(date.slice(-2)), entries, stickers, badge };
    }),
    cellWidth,
    cellHeight,
    contentWidth,
    compact,
  };
}

export function monthExportPayload(
  input: Parameters<typeof monthLayout>[0] & { today: string },
): MonthExportPayload {
  const layout = monthLayout(input);
  return {
    year: input.year,
    month: input.month,
    screenWidth: input.screenWidth,
    cellWidth: layout.cellWidth,
    cellHeight: layout.cellHeight,
    today: input.today,
    monthTitle: `${new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(input.year, input.month - 1, 1)))} ’${String(input.year).slice(-2)}`,
    weekdays: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    cells: layout.cells.map((cell) =>
      cell
        ? {
            date: cell.date,
            day: cell.day,
            count: cell.entries.length,
            badge: cell.badge,
            stickers: cell.stickers,
          }
        : null,
    ),
  };
}
