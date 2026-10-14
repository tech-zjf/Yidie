import { useRef } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AppServices } from '../../services';
import { Text } from '../../ui/Text';
import { Button } from '../../ui/Button';
import { colors, fonts } from '../../ui/tokens';
import { copy } from '../../ui/copy';
import { MonthGrid } from './MonthGrid';
import { DaySheet } from './DaySheet';
import { RecordList } from './RecordList';
import { useCalendar } from './useCalendar';
import { PhotoImportSheet } from '../import/PhotoImportSheet';
import { QueuePanel } from '../processing/QueuePanel';
import { BrandMark } from '../../ui/BrandMark';

export function CalendarScreen({
  services,
  initialMonth,
  today,
}: {
  services: AppServices;
  initialMonth?: { year: number; month: number };
  today?: string;
}) {
  const model = useCalendar(services, initialMonth),
    { width } = useWindowDimensions();
  const nextImportDate = useRef<string | undefined>(undefined);
  const padding = width <= 360 ? 6 : 16;
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.top}>
        <View style={styles.wordmark} accessibilityLabel={copy.name}>
          <BrandMark />
          <Text style={styles.brand}>{copy.name}</Text>
        </View>
        <Button
          label={copy.settings}
          onPress={() =>
            Alert.alert(
              copy.aboutTitle,
              copy.about +
                (services.photos.capabilities().simulator ? '\n\n' + copy.simulator : ''),
            )
          }
        />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: padding, paddingBottom: 12 }}
      >
        <View style={styles.month}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.previous}
            hitSlop={8}
            onPress={() => model.changeMonth(-1)}
            style={[styles.monthArrow, styles.monthArrowLeft]}
          >
            <View style={[styles.chevron, styles.chevronLeft]} />
          </Pressable>
          <Text
            accessibilityRole="header"
            style={styles.title}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {copy.months[model.month.month - 1]} ’{String(model.month.year).slice(-2)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.next}
            hitSlop={8}
            onPress={() => model.changeMonth(1)}
            style={[styles.monthArrow, styles.monthArrowRight]}
          >
            <View style={[styles.chevron, styles.chevronRight]} />
          </Pressable>
        </View>
        <MonthGrid
          {...model.month}
          entries={model.entries}
          services={services}
          today={today}
          onDay={model.setDay}
          onSwipeMonth={model.changeMonth}
        />
        {model.entries.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{copy.empty}</Text>
            <Text style={styles.hint}>{copy.monthEmptyHelp}</Text>
          </View>
        )}
        {!!model.error && (
          <Text accessibilityRole="alert" style={{ color: colors.danger }}>
            {model.error}
          </Text>
        )}
        {services.maintenancePending && <Text style={styles.hint}>{copy.maintenancePending}</Text>}
      </ScrollView>
      <QueuePanel services={services} />
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Button
            label={copy.all}
            labelStyle={{ fontSize: 13 }}
            onPress={() => model.setShowAll(true)}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.add}
          onPress={() => model.setImportDate(null)}
          style={styles.add}
        >
          <Text style={styles.plus}>+</Text>
        </Pressable>
      </View>
      <DaySheet
        date={model.day}
        entries={model.entries.filter((e) => e.date === model.day)}
        services={services}
        onChanged={() => {
          void model.refresh();
        }}
        onClose={() => model.setDay(null)}
        onDismiss={() => {
          if (nextImportDate.current) {
            model.setImportDate(nextImportDate.current);
            nextImportDate.current = undefined;
          }
        }}
        onAdd={() => {
          nextImportDate.current = model.day ?? undefined;
          model.setDay(null);
        }}
      />
      {model.importDate !== undefined && (
        <PhotoImportSheet
          services={services}
          selectedDate={model.importDate ?? undefined}
          onClose={() => {
            model.setImportDate(undefined);
            void model.refresh();
          }}
          onSaved={() => {
            void model.refresh();
          }}
        />
      )}
      {model.showAll && (
        <RecordList
          services={services}
          onClose={() => model.setShowAll(false)}
          onChanged={() => {
            void model.refresh();
          }}
        />
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  top: {
    paddingHorizontal: 24,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brand: { fontFamily: fonts.heading, letterSpacing: 1, fontSize: 21, lineHeight: 30 },
  month: {
    position: 'relative',
    marginTop: 28,
    marginBottom: 18,
    height: 68,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthArrow: {
    position: 'absolute',
    top: 8,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthArrowLeft: { left: 0 },
  monthArrowRight: { right: 0 },
  chevron: {
    width: 12,
    height: 12,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
    borderColor: colors.action,
  },
  chevronLeft: { transform: [{ rotate: '-135deg' }] },
  chevronRight: { transform: [{ rotate: '45deg' }] },
  title: {
    fontFamily: fonts.month,
    fontSize: 53,
    lineHeight: 68,
    letterSpacing: -2,
    textAlign: 'center',
    maxWidth: '78%',
    flexShrink: 1,
  },
  empty: { alignItems: 'center', gap: 8, marginTop: 24 },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 19, lineHeight: 26, textAlign: 'center' },
  hint: { fontSize: 12, color: colors.muted },
  footer: {
    position: 'relative',
    paddingHorizontal: 24,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLeft: { position: 'absolute', left: 16, top: 0, bottom: 0, justifyContent: 'center' },
  add: {
    borderRadius: 30,
    backgroundColor: colors.blue,
    minHeight: 56,
    width: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: { color: colors.paper, fontSize: 36, lineHeight: 44 },
});
