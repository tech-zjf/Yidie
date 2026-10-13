import { Text as NativeText, type TextProps } from 'react-native';
import { colors, fonts } from './tokens';
export function Text({ style, ...props }: TextProps) {
  return (
    <NativeText
      {...props}
      style={[{ fontFamily: fonts.body, fontSize: 15, lineHeight: 24, color: colors.ink }, style]}
    />
  );
}
