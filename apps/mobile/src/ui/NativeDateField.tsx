import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors, fonts } from './tokens';
import { copy } from './copy';

export function NativeDateField({
  value,
  onChoose,
  onClear,
  disabled = false,
}: {
  value: string;
  onChoose: () => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text>{copy.dateLabel}</Text>
      <View style={styles.row}>
        <Text style={styles.value}>{value || copy.noDate}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.chooseDate}
          disabled={disabled}
          onPress={onChoose}
          style={({ pressed }) => [styles.choose, pressed && styles.pressed]}
        >
          <Text style={styles.chooseText}>{copy.chooseDate}</Text>
        </Pressable>
      </View>
      {!!value && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.clearDate}
          disabled={disabled}
          onPress={onClear}
          hitSlop={8}
        >
          <Text style={styles.clear}>{copy.clearDate}</Text>
        </Pressable>
      )}
      <Text style={styles.hint}>{copy.dateHelp}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 12 },
  row: {
    minHeight: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.wash,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  value: { fontSize: 18, fontFamily: fonts.body, color: colors.ink, flex: 1 },
  choose: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chooseText: { color: colors.action, fontFamily: fonts.body },
  pressed: { opacity: 0.65 },
  clear: { color: colors.action, paddingVertical: 2 },
  hint: { fontSize: 13, color: colors.muted },
});
