import { memo, useMemo, useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { RecordImage } from '../records/RecordImage';
import { entryImage } from '../../domain/entryImage';
import type { AppServices } from '../../services';
import { localDate } from '../../domain/datePolicy';
import { monthLayout } from '../../domain/monthLayout';
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
  const layout = monthLayout({ year, month, screenWidth: width, fontScale, entries });
  const { cells, cellWidth, cellHeight } = layout;
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
        {cells.map((cell, index) => {
          if (!cell)
            return <View key={`empty-${index}`} style={{ width: cellWidth, height: cellHeight }} />;
          const { date, entries: day, stickers, badge } = cell;
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
                <>
                  {stickers.map((sticker, i) => {
                    const entry = day[i];
                    const resource = entryImage(entry, 'thumbnail');
                    if (!resource) return null;
                    return (
                      <RecordImage
                        key={entry.id}
                        entry={entry}
                        services={services}
                        style={{
                          position: 'absolute',
                          left: sticker.x,
                          top: sticker.y,
                          width: sticker.width,
                          height: sticker.height,
                          zIndex: 3 - i,
                          transform: [{ rotate: `${sticker.rotation}deg` }],
                        }}
                      />
                    );
                  })}
                  {badge && (
                    <View style={[styles.countBadge, badge]} pointerEvents="none">
                      <Text style={styles.countText}>{day.length > 99 ? '99+' : day.length}</Text>
                    </View>
                  )}
                </>
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
  countBadge: {
    position: 'absolute',
    zIndex: 8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { color: colors.ink, fontSize: 10, lineHeight: 12, fontFamily: fonts.number },
});
