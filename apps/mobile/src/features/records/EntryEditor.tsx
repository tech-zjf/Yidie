import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { RecordImage } from './RecordImage';
import type { Entry, StickerBorderColor, StickerEffect } from '../../domain/records';
import type { AppServices } from '../../services';
import { Button } from '../../ui/Button';
import { NativeDateField } from '../../ui/NativeDateField';
import { Text } from '../../ui/Text';
import { colors, fonts } from '../../ui/tokens';
import { copy } from '../../ui/copy';
import { errorCode } from '../../domain/importPhoto';
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
                  cacheKey: `${model.stylePreview.thumbnailPath}:${model.stylePreviewToken}`,
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
              {model.stylePreview
                ? copy.previewNotSaved
                : model.busy && current.status === 'ready'
                  ? copy.updatingSticker
                  : copy.recordState[current.status]}
            </Text>
            {!!model.error && (
              <Text accessibilityRole="alert" style={{ color: colors.danger }}>
                {model.error}
              </Text>
            )}
            {!!model.notice && <Text accessibilityRole="alert">{model.notice}</Text>}
            {current.status === 'ready' && (
              <View style={styles.styleSection}>
                <Button
                  label={copy.shareSticker}
                  disabled={model.busy || model.styleChanged || !!model.stylePreview}
                  onPress={() =>
                    void services.photos
                      .shareSticker(current.id, current.styleRevision)
                      .catch((cause) =>
                        Alert.alert(
                          copy.errorTitle,
                          copy.errors[errorCode(cause)] ?? copy.errors.PROCESSING_FAILED,
                        ),
                      )
                  }
                />
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  {copy.stickerStyle}
                </Text>
                <Button
                  label={model.subjectsVisible ? copy.cancel : copy.chooseSubject}
                  disabled={model.busy}
                  onPress={model.toggleSubjectPicker}
                />
                {model.subjectsVisible && model.subjectCandidates && (
                  <View style={styles.subjectPicker}>
                    <Text style={styles.muted}>{copy.subjectHelp}</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.subjectCandidates}
                    >
                      {model.subjectCandidates.map((candidate, index) => (
                        <Pressable
                          key={candidate.path}
                          disabled={model.busy}
                          accessibilityRole="button"
                          accessibilityState={{
                            selected: model.selectedSubjectCandidatePath === candidate.path,
                            disabled: model.busy,
                          }}
                          accessibilityLabel={copy.subjectCandidate(index)}
                          onPress={() => model.chooseSubject(candidate)}
                          style={[
                            styles.subjectOption,
                            model.selectedSubjectCandidatePath === candidate.path &&
                              styles.selectedSubject,
                            model.busy && styles.disabledOption,
                          ]}
                        >
                          <Image
                            source={{
                              uri: services.rootUri + candidate.path,
                              cacheKey: candidate.path,
                            }}
                            contentFit="contain"
                            style={styles.subjectImage}
                            accessible={false}
                          />
                          <Text numberOfLines={1} style={styles.subjectLabel}>
                            {copy.subjectCandidate(index)}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.effects}
                >
                  {(
                    ['original', 'outline', 'comic', 'dimensional', 'shimmer'] as StickerEffect[]
                  ).map((effect) => (
                    <Pressable
                      key={effect}
                      disabled={model.busy}
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: model.effect === effect,
                        disabled: model.busy,
                      }}
                      accessibilityLabel={copy.stickerEffects[effect]}
                      onPress={() => model.setEffect(effect)}
                      style={[
                        styles.effectOption,
                        model.effect === effect && styles.selectedEffect,
                        model.busy && styles.disabledOption,
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={model.effect === effect ? styles.selectedText : undefined}
                      >
                        {copy.stickerEffects[effect]}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {model.effect === 'outline' && (
                  <>
                    <Text style={styles.muted}>{copy.outlineWidth}</Text>
                    <View style={styles.options}>
                      {[2, 4, 6, 8].map((width) => (
                        <Pressable
                          key={width}
                          disabled={model.busy}
                          accessibilityRole="button"
                          accessibilityState={{
                            selected: model.borderWidth === width,
                            disabled: model.busy,
                          }}
                          accessibilityLabel={copy.outlineWidthOption(width)}
                          onPress={() => model.setBorderWidth(width)}
                          style={[
                            styles.widthOption,
                            model.borderWidth === width && styles.selectedOption,
                            model.busy && styles.disabledOption,
                          ]}
                        >
                          <Text
                            style={model.borderWidth === width ? styles.selectedText : undefined}
                          >
                            {width}
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
                          disabled={model.busy}
                          accessibilityRole="button"
                          accessibilityState={{
                            selected: model.borderColor === color,
                            disabled: model.busy,
                          }}
                          accessibilityLabel={label}
                          onPress={() => model.setBorderColor(color)}
                          style={[
                            styles.colorOption,
                            { backgroundColor: color },
                            model.borderColor === color && styles.selectedColor,
                            model.busy && styles.disabledOption,
                          ]}
                        />
                      ))}
                    </View>
                  </>
                )}
                <Text style={styles.muted}>{copy.styleHelp}</Text>
                {!!model.stylePreview && (
                  <Button
                    primary
                    label={copy.saveStyle}
                    onPress={model.saveStickerStyle}
                    disabled={disabled || !model.styleChanged}
                  />
                )}
              </View>
            )}
            <View style={styles.field}>
              <NativeDateField
                value={model.date}
                onChoose={model.chooseDate}
                onClear={() => model.setDate('')}
                disabled={disabled}
              />
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
  subjectPicker: { gap: 10 },
  subjectCandidates: { gap: 10, paddingVertical: 4 },
  subjectOption: {
    width: 88,
    minHeight: 126,
    padding: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedSubject: { borderColor: colors.action, borderWidth: 2 },
  subjectImage: { width: 72, height: 92 },
  subjectLabel: { width: '100%', textAlign: 'center', fontSize: 12 },
  effects: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 },
  effectOption: {
    minWidth: 88,
    minHeight: 40,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: colors.wash,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedEffect: { backgroundColor: colors.action },
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
  disabledOption: { opacity: 0.45 },
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
