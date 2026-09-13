import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'display'
    | 'title'
    | 'subtitle'
    | 'sectionTitle'
    | 'small'
    | 'smallBold'
    | 'caption'
    | 'link'
    | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        styles[type],
        type === 'link' && { color: theme.tint },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  display: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  link: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: '700' as const }) ?? ('500' as const),
    fontSize: 13,
  },
});
