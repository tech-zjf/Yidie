import { ActivityIndicator, FlatList, Modal, StyleSheet, View } from 'react-native';
import type { AppServices } from '../../services';
import { batchLimit } from '../../domain/batchDraft';
import { Text } from '../../ui/Text';
import { Button } from '../../ui/Button';
import { colors, fonts } from '../../ui/tokens';
import { copy } from '../../ui/copy';
import { useBatchImport } from './useBatchImport';
import { usePhotoLibrary } from './usePhotoLibrary';
import { PhotoTile } from './PhotoTile';
import { BatchReview } from './BatchReview';
import { QueuePanel } from '../processing/QueuePanel';

export function PhotoImportSheet({
  services,
  selectedDate,
  onClose,
  onSaved,
}: {
  services: AppServices;
  selectedDate?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const library = usePhotoLibrary(services);
  const model = useBatchImport(services, selectedDate, onSaved);
  const busy = model.busy || library.busy;
  const title = { select: copy.choose, review: copy.dateTitle, submitted: copy.done }[model.stage];
  const libraryError = model.stage === 'select' ? library.error : '';
  let content;
  if (model.stage === 'submitted') {
    content = (
      <View style={{ gap: 24, paddingTop: 24 }}>
        <Text style={styles.heading}>{copy.batch.submitted(model.submittedCount)}</Text>
        <Text style={styles.muted}>{copy.batch.submittedHelp}</Text>
        <QueuePanel services={services} />
        <Button primary label={copy.batch.returnCalendar} onPress={onClose} />
      </View>
    );
  } else if (model.stage === 'review') {
    content = (
      <>
        <BatchReview
          drafts={model.drafts}
          failures={model.failures}
          busy={busy}
          onRemove={model.remove}
          onToggle={model.toggleDuplicate}
          onDates={model.changeDates}
          onRetry={model.retryReading}
          onConfirm={model.confirm}
        />
      </>
    );
  } else if (!library.permission) {
    content = (
      <View style={{ gap: 16, paddingTop: 40 }}>
        <Text>{copy.permissionHelp}</Text>
        <Button primary label={copy.permissionButton} onPress={library.authorize} disabled={busy} />
      </View>
    );
  } else {
    const selected = new Set(model.selected.map((asset) => asset.id));
    content = (
      <>
        <FlatList
          data={library.assets}
          numColumns={3}
          keyExtractor={(item) => item.id}
          initialNumToRender={12}
          windowSize={5}
          extraData={model.selected}
          renderItem={({ item }) => (
            <PhotoTile
              asset={item}
              services={services}
              selected={selected.has(item.id)}
              onPress={() => model.toggle(item)}
              disabled={busy}
            />
          )}
          ListEmptyComponent={<Text>{copy.noPhotos}</Text>}
          ListFooterComponent={
            library.hasMore || library.error ? (
              <Button label={copy.morePhotos} onPress={library.loadMore} disabled={busy} />
            ) : null
          }
        />
        <Text style={styles.muted}>{copy.batch.limit(batchLimit)}</Text>
        <Button
          primary
          label={copy.batch.review(model.selected.length)}
          onPress={model.prepare}
          disabled={busy || model.selected.length === 0}
        />
      </>
    );
  }
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <View style={styles.screen} accessibilityViewIsModal>
        <View style={styles.header}>
          <Text style={styles.heading}>{title}</Text>
          <Button label={copy.close} onPress={onClose} disabled={busy} />
        </View>
        <Text style={styles.muted}>
          {selectedDate ? copy.batch.targetDate(selectedDate) : copy.local}
        </Text>
        {!!(model.error || libraryError) && (
          <Text accessibilityRole="alert" style={{ color: colors.danger }}>
            {model.error || libraryError}
          </Text>
        )}
        {busy && (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.action} />
            <Text style={styles.muted}>{model.progress || copy.preparing}</Text>
            {!!model.progress && (
              <Button label={copy.batch.stopReading} onPress={model.stopReading} />
            )}
          </View>
        )}
        {content}
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, padding: 20, paddingBottom: 32, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontFamily: fonts.heading, fontSize: 22, lineHeight: 30, flexShrink: 1 },
  muted: { color: colors.muted, fontSize: 13 },
  loading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
});
