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
        <Text style={styles.brand}>{copy.name}</Text>
        <Button
          label={copy.settings}
          onPress={() =>
            Alert.alert(
              copy.stage,
              copy.about +
                (services.photos.capabilities().simulator ? '\n\n' + copy.simulator : ''),
            )
          }
        />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: padding, paddingBottom: 24 }}>
        <View style={styles.month}>
          <Button
            label="‹"
            accessibilityLabel={copy.previous}
            onPress={() => model.changeMonth(-1)}
          />
          <Text
            accessibilityRole="header"
            style={styles.title}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {copy.months[model.month.month - 1]} ’{String(model.month.year).slice(-2)}
          </Text>
          <Button label="›" accessibilityLabel={copy.next} onPress={() => model.changeMonth(1)} />
        </View>
        <MonthGrid
          {...model.month}
          entries={model.entries}
          services={services}
          today={today}
          onDay={model.setDay}
        />
        {model.entries.length === 0 && (
          <View style={styles.empty}>
            <Text>{copy.empty}</Text>
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
        <Button label={copy.all} onPress={() => model.setShowAll(true)} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.add}
          onPress={() => model.setImportDate(null)}
          style={styles.add}
        >
          <Text style={styles.plus}>+</Text>
        </Pressable>
        <Text style={styles.hint}>{copy.name}</Text>
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
  brand: { fontFamily: fonts.heading, letterSpacing: 4, fontSize: 17 },
  month: {
    marginTop: 46,
    marginBottom: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.month,
    fontSize: 53,
    lineHeight: 68,
    letterSpacing: -2,
    flexShrink: 1,
  },
  empty: { alignItems: 'center', gap: 8, marginTop: 24 },
  hint: { fontSize: 12, color: colors.muted },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  add: {
    borderRadius: 30,
    backgroundColor: colors.blue,
    minHeight: 56,
    width: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: { color: colors.paper, fontSize: 36, lineHeight: 44 },
});
