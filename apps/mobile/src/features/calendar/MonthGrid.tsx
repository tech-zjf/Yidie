import { memo } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
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
  rootUri,
  onDay,
}: {
  year: number;
  month: number;
  entries: Entry[];
  rootUri: string;
  onDay: (date: string) => void;
}) {
  const { width, fontScale } = useWindowDimensions();
  const cells = monthCells(year, month),
    cellWidth = (width - (width <= 360 ? 12 : 32)) / 7;
  const cellHeight = Math.max(cells.length === 42 ? 66 : 82, 44 * fontScale);
  const today = localDate();
  const days = new Map<string, Entry[]>();
  for (const entry of entries)
    if (entry.date) days.set(entry.date, [...(days.get(entry.date) ?? []), entry]);
  return (
    <View>
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
            visible.map((e) => ({ width: e.width ?? 1, height: e.height ?? 1.6 })),
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
                  <Image
                    key={entry.id}
                    source={rootUri + (entry.thumbnailPath ?? entry.originalPath)}
                    contentFit="contain"
                    accessible={false}
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
