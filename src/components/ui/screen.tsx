import type { PropsWithChildren, ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { MaxContentWidth, Spacing, WebHeaderInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ScreenProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  /** Fixed masthead rendered above the scroll area. */
  header?: ReactNode;
  scroll?: boolean;
}>;

export function Screen({ children, style, header, scroll = true }: ScreenProps) {
  const theme = useTheme();
  const body = <View style={[styles.inner, style]}>{children}</View>;
  const topPadding = header
    ? Spacing.three
    : Platform.OS === 'web'
      ? WebHeaderInset + Spacing.three
      : Spacing.three;

  return (
    <View style={[styles.fill, { backgroundColor: theme.background }]}>
      {header}

      {scroll ? (
        <ScrollView
          style={styles.fill}
          contentContainerStyle={[styles.outer, { paddingTop: topPadding }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.fill, styles.outer, { paddingTop: topPadding }]}>{body}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  outer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: Spacing.five,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    gap: Spacing.four,
  },
});
