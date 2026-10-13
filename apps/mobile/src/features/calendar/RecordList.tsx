import { FlatList, Modal, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import type { AppServices } from '../../services';
import { useRecordList } from './useRecordList';
import { Text } from '../../ui/Text';
import { Button } from '../../ui/Button';
import { colors, fonts } from '../../ui/tokens';
import { copy } from '../../ui/copy';
export function RecordList({ services, onClose }: { services: AppServices; onClose: () => void }) {
  const model = useRecordList(services);
  return (
    <Modal visible presentationStyle="pageSheet" animationType="slide" onRequestClose={onClose}>
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
            <View style={styles.row}>
              <Image
                source={services.rootUri + (item.thumbnailPath ?? item.originalPath)}
                contentFit="contain"
                style={{ width: 96, height: 130 }}
              />
              <View style={{ flex: 1, gap: 8 }}>
                <Text>{item.date ?? copy.pending}</Text>
                {item.status !== 'ready' && (
                  <Text style={{ color: colors.muted, fontSize: 13 }}>{copy.failed}</Text>
                )}
              </View>
            </View>
          )}
        />
      </View>
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
