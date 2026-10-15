import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
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
import { SheetHandle } from '../../ui/SheetHandle';
import { useReducedMotion } from '../../ui/useReducedMotion';

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
  const [progress] = useState(() => new Animated.Value(0));
  const [closing, setClosing] = useState(false);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (date === null) return;
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const frame = requestAnimationFrame(() => {
      Animated.spring(progress, {
        toValue: 1,
        damping: 26,
        stiffness: 245,
        mass: 0.9,
        useNativeDriver: true,
      }).start();
    });
    return () => {
      cancelAnimationFrame(frame);
      progress.stopAnimation();
    };
  }, [date, progress, reduceMotion]);

  const closeAfterAnimation = useCallback(
    (afterClose: () => void = () => {}) => {
      if (closing) return;
      setClosing(true);
      if (reduceMotion) {
        setEditing(null);
        onClose();
        afterClose();
        setClosing(false);
        return;
      }
      Animated.timing(progress, {
        toValue: 0,
        duration: 230,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          setClosing(false);
          return;
        }
        setEditing(null);
        onClose();
        afterClose();
        setClosing(false);
      });
    },
    [closing, onClose, progress, reduceMotion],
  );

  const sheetHeight = editing || fontScale > 1.4 ? height - insets.top - 12 : height * 0.72;
  const backdropOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.28] });
  const sheetTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [sheetHeight + 32, 0],
  });
  // Only the handle owns vertical dismissal; the photo strip owns horizontal swipes.
  const dismissGesture = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dy > 10 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 2,
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 56) closeAfterAnimation();
        },
      }),
    [closeAfterAnimation],
  );
  return (
    <Modal
      visible={date !== null}
      transparent
      animationType="none"
      onRequestClose={() => closeAfterAnimation()}
      onDismiss={onDismiss}
    >
      <View style={styles.overlay}>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}
        />
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => closeAfterAnimation()}
          accessible={false}
        />
        <Animated.View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              paddingBottom: Math.max(insets.bottom, 16),
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
          accessibilityViewIsModal
          onAccessibilityEscape={() => closeAfterAnimation()}
        >
          <View {...dismissGesture.panHandlers} accessible={false}>
            <SheetHandle />
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
              onClose={() => closeAfterAnimation()}
              onAdd={() => closeAfterAnimation(onAdd)}
              onEdit={setEditing}
            />
          )}
        </Animated.View>
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
  return (
    <>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text
            accessibilityRole="header"
            accessibilityLabel={date ? `${copy.dayTitle(date)}, ${date.slice(0, 4)}` : ''}
            style={styles.title}
          >
            {date ? copy.dayTitle(date) : ''}
          </Text>
          <Text style={styles.help}>
            {date?.slice(0, 4)} · {copy.dayCount(entries.length)}
          </Text>
        </View>
        <Button label={copy.close} onPress={onClose} />
      </View>
      <FlatList
        horizontal
        accessibilityHint={copy.swipe}
        data={entries}
        keyExtractor={(entry) => entry.id}
        showsHorizontalScrollIndicator={false}
        snapToInterval={itemWidth + 16}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        contentContainerStyle={styles.photos}
        style={styles.photoList}
        renderItem={({ item, index }) => (
          <View style={[styles.photoPage, { width: itemWidth }]}>
            <RecordImage
              entry={item}
              services={services}
              variant="detail"
              accessibilityLabel={`${copy.outfitPhoto}, ${copy.dayPosition(index + 1, entries.length)}`}
              style={{ width: '100%', height: Math.min(300, height * 0.3) }}
            />
            <View style={styles.itemMeta}>
              {item.status !== 'ready' && (
                <Text style={styles.state}>
                  {item.status === 'failed' && item.errorCode
                    ? (copy.errors[item.errorCode] ?? copy.recordState[item.status])
                    : copy.recordState[item.status]}
                </Text>
              )}
              <Button
                label={copy.edit}
                labelStyle={styles.actionLabel}
                onPress={() => onEdit(item)}
              />
              <Text style={styles.position} accessibilityLiveRegion="polite">
                {copy.dayPosition(index + 1, entries.length)}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={[styles.empty, { width: itemWidth }]}>{copy.noDay}</Text>}
      />
      <View style={styles.footer}>
        <Button primary label={copy.addToDay} onPress={onAdd} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: '#000000' },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 20 },
  title: { fontFamily: fonts.month, fontSize: 42, lineHeight: 56, letterSpacing: -1 },
  help: { color: colors.muted, fontSize: 13 },
  photoList: { flex: 1 },
  photos: { paddingHorizontal: 24, gap: 16 },
  photoPage: { alignItems: 'stretch' },
  itemMeta: { alignItems: 'center', paddingTop: 8 },
  state: {
    alignSelf: 'stretch',
    color: colors.muted,
    fontFamily: fonts.accent,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  actionLabel: { fontFamily: fonts.accent, fontSize: 16 },
  empty: { paddingVertical: 64, textAlign: 'center', color: colors.muted },
  position: {
    fontFamily: fonts.number,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
  },
  footer: { paddingHorizontal: 24, paddingTop: 12 },
});
