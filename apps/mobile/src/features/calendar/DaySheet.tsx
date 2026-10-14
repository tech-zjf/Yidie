import { useCallback, useState } from 'react';
import {
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RecordImage } from '../records/RecordImage';
import type { Entry } from '../../domain/records';
import { Text } from '../../ui/Text';
import { Button } from '../../ui/Button';
import { colors, fonts } from '../../ui/tokens';
import { copy } from '../../ui/copy';
import type { AppServices } from '../../services';
import { EntryEditor } from '../records/EntryEditor';

const photoViewability = { itemVisiblePercentThreshold: 60 };

export function DaySheet({
  date,
  entries,
  services,
  onChanged,
  onClose,
  onDismiss,
  onAdd,
}: {
  date: string | null;
  entries: Entry[];
  services: AppServices;
  onChanged: () => void;
  onClose: () => void;
  onDismiss: () => void;
  onAdd: () => void;
}) {
  const { height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState<Entry | null>(null);
  // Only the handle owns vertical dismissal; the photo strip owns horizontal swipes.
  const dismissGesture = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) =>
      gesture.dy > 10 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 2,
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 56) onClose();
    },
  });
  return (
    <Modal
      visible={date !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onDismiss={() => {
        setEditing(null);
        onDismiss();
      }}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />
        <View
          style={[
            styles.sheet,
            {
              height: editing || fontScale > 1.4 ? height - insets.top - 12 : height * 0.72,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
        >
          <View style={styles.handleArea} {...dismissGesture.panHandlers} accessible={false}>
            <View style={styles.handle} />
          </View>
          {editing ? (
            <EntryEditor
              key={editing.id}
              entry={editing}
              services={services}
              onChanged={onChanged}
              onClose={() => setEditing(null)}
            />
          ) : (
            <DayContents
              key={date}
              date={date}
              entries={entries}
              services={services}
              onClose={onClose}
              onAdd={onAdd}
              onEdit={setEditing}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function DayContents({
  date,
  entries,
  services,
  onClose,
  onAdd,
  onEdit,
}: {
  date: string | null;
  entries: Entry[];
  services: AppServices;
  onClose: () => void;
  onAdd: () => void;
  onEdit: (entry: Entry) => void;
}) {
  const { width, height } = useWindowDimensions();
  const itemWidth = width - 64;
  const [visibleId, setVisibleId] = useState<string | null>(null);
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<Entry>[] }) => {
      const first = viewableItems.find((item) => item.isViewable);
      if (first) setVisibleId(first.item.id);
    },
    [],
  );
  const position = Math.max(
    0,
    entries.findIndex((entry) => entry.id === visibleId),
  );
  return (
    <>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" accessibilityLabel={date ?? ''} style={styles.title}>
            {date ? copy.dayTitle(date) : ''}
          </Text>
          <Text style={styles.help}>
            {date?.slice(0, 4)} · {copy.dayCount(entries.length)}
          </Text>
        </View>
        <Button label={copy.close} onPress={onClose} />
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <FlatList
          horizontal
          data={entries}
          keyExtractor={(entry) => entry.id}
          showsHorizontalScrollIndicator={false}
          snapToInterval={itemWidth + 16}
          decelerationRate="fast"
          contentContainerStyle={styles.photos}
          style={{ flexGrow: 0 }}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={photoViewability}
          renderItem={({ item }) => (
            <View style={{ width: itemWidth }}>
              <RecordImage
                entry={item}
                services={services}
                variant="detail"
                style={{ width: '100%', height: Math.min(300, height * 0.3) }}
              />
              {item.status !== 'ready' && (
                <Text style={styles.state}>{copy.recordState[item.status]}</Text>
              )}
              <Button label={copy.edit} onPress={() => onEdit(item)} />
            </View>
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, { width: itemWidth }]}>{copy.noDay}</Text>
          }
        />
        {entries.length > 0 && (
          <Text style={styles.position} accessibilityLiveRegion="polite">
            {copy.dayPosition(position + 1, entries.length)}
          </Text>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <Button primary label={copy.addToDay} onPress={onAdd} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.28)' },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  handleArea: { height: 28, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 32, height: 4, borderRadius: 2, backgroundColor: '#DADADA' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 20 },
  title: { fontFamily: fonts.month, fontSize: 42, lineHeight: 56, letterSpacing: -1 },
  help: { color: colors.muted, fontSize: 13 },
  photos: { paddingHorizontal: 24, gap: 16 },
  state: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 8 },
  empty: { paddingVertical: 64, textAlign: 'center', color: colors.muted },
  position: { textAlign: 'center', fontSize: 13, color: colors.muted, paddingVertical: 8 },
  footer: { paddingHorizontal: 24, paddingTop: 12 },
});
