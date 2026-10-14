import { StyleSheet, TextInput, View } from 'react-native';
import { Text } from './Text';
import { colors, fonts } from './tokens';
import { copy } from './copy';

/** Editable date field used by batch review, where dates must remain fast to change in groups. */
export function DateField({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text>{copy.dateLabel}</Text>
      <TextInput
        accessibilityLabel={copy.dateLabel}
        placeholder="YYYY-MM-DD"
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        autoCorrect={false}
        autoCapitalize="none"
        maxLength={10}
        style={styles.input}
      />
      <Text style={styles.hint}>{copy.dateHelp}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  field: { gap: 12 },
  hint: { fontSize: 13, color: colors.muted },
  input: {
    minHeight: 50,
    padding: 12,
    backgroundColor: colors.wash,
    borderRadius: 12,
    fontSize: 18,
    fontFamily: fonts.body,
    color: colors.ink,
  },
});
