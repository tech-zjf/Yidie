import { useState } from 'react';
import { KeyboardAvoidingView, SectionList, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { groupDrafts, type PreparedDraft, type PreparationFailure } from '../../domain/batchDraft';
import { Text } from '../../ui/Text';
import { Button } from '../../ui/Button';
import { DateField } from '../../ui/DateField';
import { colors, fonts } from '../../ui/tokens';
import { copy } from '../../ui/copy';

export function BatchReview({
  drafts,
  failures,
  busy,
  onRemove,
  onToggle,
  onDates,
  onRetry,
  onConfirm,
}: {
  drafts: PreparedDraft[];
  failures: PreparationFailure[];
  busy: boolean;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
  onDates: (ids: string[], value: string) => boolean;
  onRetry: () => void;
  onConfirm: () => void;
}) {
  const [edit, setEdit] = useState<{ ids: string[]; value: string } | null>(null);
  if (edit)
    return (
      <KeyboardAvoidingView behavior="padding" style={styles.editor}>
        <Text style={styles.title}>{copy.batch.editDates(edit.ids.length)}</Text>
        <DateField
          value={edit.value}
          onChange={(value) => setEdit({ ...edit, value })}
          disabled={busy}
        />
        <Button
          primary
          label={copy.done}
          disabled={busy}
          onPress={() => {
            if (onDates(edit.ids, edit.value)) setEdit(null);
          }}
        />
        <Button label={copy.back} disabled={busy} onPress={() => setEdit(null)} />
      </KeyboardAvoidingView>
    );
  return (
    <>
      <SectionList
        sections={groupDrafts(drafts)}
        keyExtractor={(item) => item.photo.id}
        initialNumToRender={8}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        renderSectionHeader={({ section }) => (
          <View style={styles.group}>
            <Text style={styles.title}>
              {section.date ?? copy.pending} · {section.data.length}
            </Text>
            <Button
              label={copy.batch.editGroup}
              disabled={busy}
              onPress={() =>
                setEdit({
                  ids: section.data.map((item) => item.photo.id),
                  value: section.date ?? '',
                })
              }
            />
          </View>
        )}
        renderItem={({ item }) => (
          <View style={[styles.row, !item.include && { opacity: 0.6 }]}>
            {item.previewUri ? (
              <Image source={item.previewUri} contentFit="cover" style={styles.image} />
            ) : (
              <View style={styles.image}>
                <Text>{copy.cloudThumb}</Text>
              </View>
            )}
            <View style={styles.details}>
              <Text style={styles.hint}>{copy.source[item.date.source]}</Text>
              {!!item.duplicate && <Text>{copy.batch.duplicate}</Text>}
              <View style={styles.actions}>
                <Button
                  label={copy.batch.editDate}
                  disabled={busy}
                  onPress={() => setEdit({ ids: [item.photo.id], value: item.date.date ?? '' })}
                />
                <Button
                  label={copy.batch.remove}
                  disabled={busy}
                  onPress={() => onRemove(item.photo.id)}
                />
              </View>
              {!!item.duplicate && (
                <Button
                  label={item.include ? copy.batch.skipDuplicate : copy.batch.keepDuplicate}
                  disabled={busy}
                  onPress={() => onToggle(item.photo.id)}
                />
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.hint}>{copy.batch.noPrepared}</Text>}
        ListFooterComponent={
          failures.length ? (
            <View style={styles.failures}>
              <Text>{copy.batch.readFailures(failures.length)}</Text>
              {failures.map((item, index) => (
                <Text key={item.asset.id} style={styles.hint}>
                  {index + 1}. {copy.errors[item.code] ?? copy.errors.PROCESSING_FAILED}
                </Text>
              ))}
              <Button label={copy.batch.retryReading} onPress={onRetry} disabled={busy} />
            </View>
          ) : null
        }
      />
      <Button
        primary
        label={copy.batch.confirm(drafts.filter((item) => item.include).length)}
        onPress={onConfirm}
        disabled={busy || !drafts.some((item) => item.include)}
      />
    </>
  );
}
const styles = StyleSheet.create({
  editor: { flex: 1, gap: 16, paddingTop: 12 },
  group: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingTop: 12,
  },
  title: { fontFamily: fonts.heading, fontSize: 17 },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.future,
  },
  image: { width: 76, height: 110, borderRadius: 12, backgroundColor: colors.wash },
  details: { flex: 1, gap: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap' },
  hint: { color: colors.muted, fontSize: 13 },
  failures: { paddingVertical: 24, gap: 10 },
});
