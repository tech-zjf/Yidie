import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import type { Entry } from '../../domain/records';
import type { AppServices } from '../../services';
import { Button } from '../../ui/Button';
import { DateField } from '../../ui/DateField';
import { Text } from '../../ui/Text';
import { colors, fonts } from '../../ui/tokens';
import { copy } from '../../ui/copy';
import { useEntryEditor } from './useEntryEditor';

/** Content inside an existing sheet; never presents a second iOS Modal. */
export function EntryEditor({
  entry,
  services,
  onChanged,
  onClose,
}: {
  entry: Entry;
  services: AppServices;
  onChanged: () => void;
  onClose: () => void;
}) {
  const model = useEntryEditor(entry, services, onChanged, onClose);
  const current = model.entry;
  const processing = current.status === 'running' || current.status === 'queued';
  const disabled = model.busy || processing;
  return (
    <KeyboardAvoidingView behavior="padding" style={styles.page}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          {copy.editRecord}
        </Text>
        <Button label={copy.back} onPress={onClose} disabled={model.busy} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {model.deleted ? (
          <Text accessibilityRole="alert">{model.notice}</Text>
        ) : (
          <>
            <Image
              source={{
                uri: services.rootUri + (current.stickerPath ?? current.originalPath),
                cacheKey: `${current.id}:${current.revision}:detail`,
              }}
              contentFit="contain"
              style={styles.image}
              accessibilityLabel={copy.outfitPhoto}
            />
            <Text style={styles.muted}>{copy.recordState[current.status]}</Text>
            {!!model.error && (
              <Text accessibilityRole="alert" style={{ color: colors.danger }}>
                {model.error}
              </Text>
            )}
            {!!model.notice && <Text accessibilityRole="alert">{model.notice}</Text>}
            <View style={styles.field}>
              <DateField value={model.date} onChange={model.setDate} disabled={disabled} />
              <Button
                primary
                label={copy.saveDate}
                onPress={model.saveDate}
                disabled={disabled || model.date.trim() === (current.date ?? '')}
              />
            </View>
            {current.date && current.status === 'ready' && (
              <Button
                label={current.isCover ? copy.currentCover : copy.setCover}
                onPress={model.setCover}
                disabled={disabled || current.isCover}
              />
            )}
            {(current.status === 'failed' || current.status === 'paused') && (
              <View style={styles.field}>
                {!!current.errorCode && (
                  <Text style={styles.muted}>{copy.errors[current.errorCode] ?? copy.failed}</Text>
                )}
                <Button
                  label={model.busy ? copy.processing : copy.retrySticker}
                  onPress={model.retry}
                  disabled={disabled}
                />
              </View>
            )}
            <Button
              label={copy.deleteRecord}
              destructive
              disabled={disabled}
              onPress={() =>
                Alert.alert(copy.deleteTitle, copy.deleteHelp, [
                  { text: copy.cancel, style: 'cancel' },
                  { text: copy.deleteRecord, style: 'destructive', onPress: model.remove },
                ])
              }
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper, paddingTop: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  title: { fontFamily: fonts.heading, fontSize: 24, lineHeight: 34 },
  content: { padding: 24, paddingBottom: 40, gap: 16 },
  image: { width: '100%', height: 260 },
  field: { gap: 12 },
  muted: { color: colors.muted, fontSize: 13 },
});
