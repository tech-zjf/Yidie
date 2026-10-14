import { memo, useMemo, useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { RecordImage } from '../records/RecordImage';
import { entryImage } from '../../domain/entryImage';
import type { AppServices } from '../../services';
import { monthCells, localDate } from '../../domain/datePolicy';
import { stickerLayout } from '../../domain/stickerLayout';
import type { Entry } from '../../domain/records';
import { Text } from '../../ui/Text';
import { colors, fonts } from '../../ui/tokens';
import { copy } from '../../ui/copy';

export const MonthGrid = memo(function MonthGrid({
  year,
  month,
  entries,
  services,
  onDay,
  onSwipeMonth,
  today = localDate(),
}: {
  year: number;
  month: number;
  entries: Entry[];
  services: AppServices;
  onDay: (date: string) => void;
  onSwipeMonth: (delta: number) => void;
  today?: string;
}) {
  const { width, fontScale } = useWindowDimensions();
  const swipeMonth = useRef(onSwipeMonth);
  swipeMonth.current = onSwipeMonth;
  const monthSwipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.35,
        onPanResponderRelease: (_, gesture) => {
          if (Math.abs(gesture.dx) >= 56) swipeMonth.current(gesture.dx < 0 ? 1 : -1);
        },
      }),
    [],
  );
  const cells = monthCells(year, month),
    cellWidth = (width - (width <= 360 ? 12 : 32)) / 7;
  const compact = width <= 390;
  const cellHeight = Math.max(
    cells.length === 42 ? (compact ? 54 : 58) : compact ? 62 : 68,
    44 * fontScale,
  );
  const days = new Map<string, Entry[]>();
  for (const entry of entries) {
    if (!entry.date) continue;
    const day = days.get(entry.date);
    if (day) day.push(entry);
    else days.set(entry.date, [entry]);
  }
  return (
    <View {...monthSwipe.panHandlers}>
      <View style={styles.week}>
        {copy.weekdays.map((day, i) => (
          <Text key={i} style={[styles.weekday, { width: cellWidth }]}>
            {day}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((date, index) => {
          if (!date)
            return <View key={`empty-${index}`} style={{ width: cellWidth, height: cellHeight }} />;
          const day = days.get(date) ?? [];
          const visible = day.slice(0, 3);
          const layout = stickerLayout(
            visible.map((e) => {
              const resource = entryImage(e, 'thumbnail');
              return resource
                ? { width: resource.width, height: resource.height }
                : { width: 1, height: 1.6 };
            }),
            { width: cellWidth, height: cellHeight },
          );
          return (
            <Pressable
              key={date}
              onPress={() => onDay(date)}
              accessibilityRole="button"
              accessibilityLabel={copy.dayLabel(date, day.length)}
              style={[styles.cell, { width: cellWidth, height: cellHeight }]}
            >
              {day.length === 0 ? (
                <Text
                  style={[
                    styles.number,
                    {
                      color:
                        date === today ? colors.action : date > today ? colors.future : colors.ink,
                    },
                  ]}
                >
                  {Number(date.slice(-2))}
                </Text>
              ) : (
                visible.map((entry, i) => (
                  <RecordImage
                    key={entry.id}
                    entry={entry}
                    services={services}
                    style={{
                      position: 'absolute',
                      left: layout[i].x,
                      top: layout[i].y,
                      width: layout[i].width,
                      height: layout[i].height,
                      zIndex: 3 - i,
                      transform: [{ rotate: `${layout[i].rotation}deg` }],
                    }}
                  />
                ))
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});
const styles = StyleSheet.create({
  week: { flexDirection: 'row', marginBottom: 14 },
  weekday: { color: colors.muted, textAlign: 'center', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { alignItems: 'center', justifyContent: 'center' },
  number: { fontFamily: fonts.number, fontSize: 28, lineHeight: 36, letterSpacing: -0.8 },
});
