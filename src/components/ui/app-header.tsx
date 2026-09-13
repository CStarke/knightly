import type { PropsWithChildren, ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Brand, MaxContentWidth, Spacing, WebHeaderInset } from '@/constants/theme';

type AppHeaderProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  right?: ReactNode;
}>;

/** Maroon masthead with a gold rule. Kept short so it never eats a quarter of the screen. */
export function AppHeader({ title, subtitle, right, children }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const paddingTop = Platform.OS === 'web' ? WebHeaderInset : insets.top + Spacing.one;

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop,
          experimental_backgroundImage: `linear-gradient(160deg, ${Brand.maroon}, ${Brand.maroonDark})`,
        },
      ]}>
      <View style={styles.inner}>
        <View style={styles.titleRow}>
          <View style={styles.titleGroup}>
            <View style={styles.wordmarkRow}>
              <ThemedText type="title" style={styles.title}>
                {title}
              </ThemedText>
              <View style={styles.dot} />
            </View>
            {subtitle ? (
              <ThemedText type="caption" style={styles.subtitle}>
                {subtitle}
              </ThemedText>
            ) : null}
          </View>

          {right}
        </View>

        {children}
      </View>

      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  titleGroup: {
    flexShrink: 1,
    gap: 1,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 36,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Brand.gold,
    marginBottom: Spacing.two,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.68)',
    textTransform: 'uppercase',
  },
  rule: {
    height: 3,
    width: '100%',
    backgroundColor: Brand.gold,
  },
});
