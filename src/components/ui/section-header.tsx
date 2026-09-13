import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SectionHeaderProps = {
  title: string;
  caption?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, caption, actionLabel, onAction }: SectionHeaderProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <View style={styles.titleGroup}>
        <ThemedText type="sectionTitle">{title}</ThemedText>
        {caption ? (
          <ThemedText type="small" themeColor="textSecondary">
            {caption}
          </ThemedText>
        ) : null}
      </View>

      {actionLabel ? (
        <Pressable onPress={onAction} style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText type="smallBold" style={{ color: theme.tint }}>
            {actionLabel}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  titleGroup: {
    flexShrink: 1,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.6,
  },
});
