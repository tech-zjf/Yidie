import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { RecordImage } from './RecordImage';
import type { Entry, StickerBorderColor } from '../../domain/records';
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
            {model.stylePreview ? (
              <Image
                source={{
                  uri: services.rootUri + model.stylePreview.thumbnailPath,
                  cacheKey: model.stylePreview.thumbnailPath,
                }}
                contentFit="contain"
                style={styles.image}
                accessibilityLabel={copy.outfitPhoto}
              />
            ) : (
              <RecordImage
                entry={current}
                services={services}
                variant="detail"
                style={styles.image}
                accessibilityLabel={copy.outfitPhoto}
              />
            )}
            <Text style={styles.muted}>
              {model.stylePreview ? copy.previewNotSaved : copy.recordState[current.status]}
            </Text>
            {!!model.error && (
              <Text accessibilityRole="alert" style={{ color: colors.danger }}>
                {model.error}
              </Text>
            )}
            {!!model.notice && <Text accessibilityRole="alert">{model.notice}</Text>}
            {current.status === 'ready' && (
              <View style={styles.styleSection}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  {copy.stickerStyle}
                </Text>
                <Text style={styles.muted}>{copy.outlineWidth}</Text>
                <View style={styles.options}>
                  {[0, 2, 4, 6, 8].map((width) => (
                    <Pressable
                      key={width}
                      accessibilityRole="button"
                      accessibilityState={{ selected: model.borderWidth === width }}
                      accessibilityLabel={copy.outlineWidthOption(width)}
                      onPress={() => model.setBorderWidth(width)}
                      style={[
                        styles.widthOption,
                        model.borderWidth === width && styles.selectedOption,
                      ]}
                    >
                      <Text style={model.borderWidth === width ? styles.selectedText : undefined}>
                        {width === 0 ? copy.none : width}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.muted}>{copy.outlineColor}</Text>
                <View style={styles.options}>
                  {(
                    [
                      ['#FFFFFF', copy.white],
                      ['#242424', copy.inkColor],
                      ['#0786A8', copy.blue],
                    ] as [StickerBorderColor, string][]
                  ).map(([color, label]) => (
                    <Pressable
                      key={color}
                      accessibilityRole="button"
                      accessibilityState={{ selected: model.borderColor === color }}
                      accessibilityLabel={label}
                      onPress={() => model.setBorderColor(color)}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        model.borderColor === color && styles.selectedColor,
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.muted}>{copy.styleHelp}</Text>
                <Button
                  label={model.busy ? copy.processing : copy.previewStyle}
                  onPress={model.previewStyle}
                  disabled={
                    disabled ||
                    (model.borderWidth === current.borderWidth &&
                      model.borderColor === current.borderColor)
                  }
                />
                {!!model.stylePreview && (
                  <Button
                    primary
                    label={copy.saveStyle}
                    onPress={model.saveStickerStyle}
                    disabled={disabled}
                  />
                )}
              </View>
            )}
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
  styleSection: { gap: 10, paddingTop: 8 },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 28 },
  options: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  widthOption: {
    minWidth: 44,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.wash,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedOption: { backgroundColor: colors.action },
  selectedText: { color: colors.paper },
  colorOption: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.muted,
  },
  selectedColor: { borderWidth: 3, borderColor: colors.action },
  muted: { color: colors.muted, fontSize: 13 },
});
