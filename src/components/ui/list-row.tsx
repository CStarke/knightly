import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, type MaterialSymbolName, type SfSymbolName } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ListRowProps = {
  title: string;
  subtitle?: string;
  sf: SfSymbolName;
  md: MaterialSymbolName;
  tone?: 'default' | 'danger';
  trailing?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
};

export function ListRow({
  title,
  subtitle,
  sf,
  md,
  tone = 'default',
  trailing,
  onPress,
  last,
}: ListRowProps) {
  const theme = useTheme();
  const accent = tone === 'danger' ? theme.danger : theme.tint;
  const wash = tone === 'danger' ? theme.dangerSoft : theme.tintSoft;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.iconWell, { backgroundColor: wash }]}>
        <Icon sf={sf} md={md} size={18} color={accent} />
      </View>

      <View style={styles.body}>
        <ThemedText type="smallBold" style={tone === 'danger' ? { color: theme.danger } : undefined}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="caption" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>

      {trailing ?? (onPress ? <Icon sf="chevron.right" md="chevron_right" size={14} color={theme.textMuted} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
  iconWell: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 1,
  },
});
