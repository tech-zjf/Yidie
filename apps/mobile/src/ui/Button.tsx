import { Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors } from './tokens';
export function Button({
  label,
  accessibilityLabel,
  onPress,
  primary = false,
  disabled = false,
}: {
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        primary && styles.primary,
        { opacity: disabled ? 0.4 : pressed ? 0.65 : 1 },
      ]}
    >
      <Text style={{ color: primary ? colors.paper : colors.action }}>{label}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  base: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  primary: { backgroundColor: colors.action, borderRadius: 26, minHeight: 50 },
});
