import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { RecordImage } from '../records/RecordImage';
import type { AppServices } from '../../services';
import { useRecordList } from './useRecordList';
import { Text } from '../../ui/Text';
import { Button } from '../../ui/Button';
import { colors, fonts } from '../../ui/tokens';
import { copy } from '../../ui/copy';
import type { Entry } from '../../domain/records';
import { EntryEditor } from '../records/EntryEditor';
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
  const [editing, setEditing] = useState<Entry | null>(null);
  return (
    <Modal visible presentationStyle="pageSheet" animationType="slide" onRequestClose={onClose}>
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
        <View style={styles.page}>
          <View style={styles.heading}>
            <Text style={{ fontFamily: fonts.heading, fontSize: 24 }}>{copy.all}</Text>
            <Button label={copy.close} onPress={onClose} />
          </View>
          <FlatList
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
                style={styles.row}
                onPress={() => setEditing(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.date ?? copy.pending}，${copy.editRecord}`}
              >
                <RecordImage
                  entry={item}
                  services={services}
                  variant="thumbnail"
                  style={{ width: 96, height: 130 }}
                />
                <View style={{ flex: 1, gap: 8 }}>
                  <Text>{item.date ?? copy.pending}</Text>
                  {item.status !== 'ready' && (
                    <Text style={{ color: colors.muted, fontSize: 13 }}>
                      {copy.recordState[item.status]}
                    </Text>
                  )}
                </View>
              </Pressable>
            )}
          />
        </View>
      )}
    </Modal>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper, padding: 24 },
  heading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  row: { flexDirection: 'row', gap: 24, alignItems: 'center', marginBottom: 16 },
});
