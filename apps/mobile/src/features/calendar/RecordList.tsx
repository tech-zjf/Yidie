import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { RecordImage } from '../records/RecordImage';
import type { AppServices } from '../../services';
import { useRecordList } from './useRecordList';
import { Text } from '../../ui/Text';
import { Button } from '../../ui/Button';
import { colors, fonts } from '../../ui/tokens';
import { copy } from '../../ui/copy';
import type { Entry } from '../../domain/records';
import { EntryEditor } from '../records/EntryEditor';
import { SheetHandle } from '../../ui/SheetHandle';
import { useReducedMotion } from '../../ui/useReducedMotion';
export function RecordList({
  services,
  onClose,
  onChanged,
}: {
  services: AppServices;
  onClose: () => void;
  onChanged: () => void;
}) {
  const model = useRecordList(services);
  const { width, fontScale } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const columns = fontScale >= 1.8 ? 1 : 2;
  const cardWidth = (width - 48 - (columns - 1) * 14) / columns;
  const [editing, setEditing] = useState<Entry | null>(null);
  return (
    <Modal
      visible
      presentationStyle="pageSheet"
      animationType={reduceMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
    >
      {editing ? (
        <EntryEditor
          key={editing.id}
          entry={editing}
          services={services}
          onClose={() => setEditing(null)}
          onChanged={() => {
            void model.refresh();
            onChanged();
          }}
        />
      ) : (
        <View style={styles.page} accessibilityViewIsModal>
          <SheetHandle />
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>
              {copy.all}
            </Text>
            <Button label={copy.close} onPress={onClose} />
          </View>
          <FlatList
            key={columns}
            numColumns={columns}
            columnWrapperStyle={columns === 2 ? styles.columns : undefined}
            contentContainerStyle={styles.content}
            data={model.entries}
            keyExtractor={(entry) => entry.id}
            initialNumToRender={8}
            windowSize={5}
            ListEmptyComponent={<Text>{model.loading ? copy.loading : copy.noRecords}</Text>}
            ListFooterComponent={
              <View>
                {!!model.error && <Text accessibilityRole="alert">{model.error}</Text>}
                {(model.hasMore || !!model.error) && (
                  <Button
                    label={copy.moreRecords}
                    onPress={model.loadMore}
                    disabled={model.loading}
                  />
                )}
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                style={{ width: cardWidth, marginBottom: 18 }}
                onPress={() => setEditing(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.date ?? copy.pending}, ${copy.editRecord}`}
              >
                <View style={styles.photo}>
                  <RecordImage
                    entry={item}
                    services={services}
                    variant="thumbnail"
                    photoFit="cover"
                    style={{ width: cardWidth, height: cardWidth * 1.35 }}
                  />
                  <View style={styles.caption} pointerEvents="none">
                    <Text style={styles.date}>
                      {item.date ? copy.dateChip(item.date) : copy.pending}
                    </Text>
                  </View>
                </View>
                {item.status !== 'ready' && (
                  <Text style={styles.status}>{copy.recordState[item.status]}</Text>
                )}
              </Pressable>
            )}
          />
        </View>
      )}
    </Modal>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper, paddingTop: 8 },
  heading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  title: { fontFamily: fonts.heading, fontSize: 22, lineHeight: 34, flexShrink: 1 },
  columns: { gap: 14 },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  photo: { borderRadius: 20, overflow: 'hidden', backgroundColor: colors.wash },
  caption: { position: 'absolute', bottom: 12, left: 8, right: 8, alignItems: 'center' },
  date: {
    fontSize: 12,
    lineHeight: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 3,
    textAlign: 'center',
  },
  status: { fontSize: 12, lineHeight: 19, color: colors.muted, marginTop: 8, paddingHorizontal: 4 },
});
