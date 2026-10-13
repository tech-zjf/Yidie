import { FlatList, Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import type { Entry } from '../../domain/records';
import { Text } from '../../ui/Text';
import { Button } from '../../ui/Button';
import { colors, fonts } from '../../ui/tokens';
import { copy } from '../../ui/copy';
export function DaySheet({
  date,
  entries,
  rootUri,
  onClose,
  onDismiss,
  onAdd,
}: {
  date: string | null;
  entries: Entry[];
  rootUri: string;
  onClose: () => void;
  onDismiss: () => void;
  onAdd: () => void;
}) {
  const { width } = useWindowDimensions();
  const itemWidth = width - 64;
  return (
    <Modal
      visible={date !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onDismiss={onDismiss}
    >
      <View style={styles.sheet} accessibilityViewIsModal>
        <View style={styles.header}>
          <Text style={styles.title}>{date}</Text>
          <Button label={copy.close} onPress={onClose} />
        </View>
        <Text style={styles.help}>
          {copy.dayLabel(date ?? '', entries.length)} · {copy.swipe}
        </Text>
        <FlatList
          horizontal
          data={entries}
          keyExtractor={(e) => e.id}
          showsHorizontalScrollIndicator={false}
          snapToInterval={itemWidth + 16}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}
          style={{ flexGrow: 0 }}
          renderItem={({ item }) => (
            <View style={[styles.card, { width: itemWidth }]}>
              <Image
                source={rootUri + (item.stickerPath ?? item.originalPath)}
                contentFit="contain"
                style={{ width: '100%', height: 340 }}
              />
              {item.status !== 'ready' && <Text style={styles.help}>{copy.failed}</Text>}
            </View>
          )}
          ListEmptyComponent={<Text style={{ width: itemWidth, padding: 32 }}>{copy.noDay}</Text>}
        />
        <Button primary label={copy.addToDay} onPress={onAdd} />
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.paper, paddingTop: 20, gap: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  title: { fontFamily: fonts.heading, fontSize: 24, lineHeight: 34 },
  help: { color: colors.muted, fontSize: 13, paddingHorizontal: 24 },
  card: { backgroundColor: colors.wash, borderRadius: 24, padding: 16 },
});
