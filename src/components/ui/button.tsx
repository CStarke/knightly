import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, type MaterialSymbolName, type SfSymbolName } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = {
  label: string;
  caption?: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  sf?: SfSymbolName;
  md?: MaterialSymbolName;
  size?: 'regular' | 'large';
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  caption,
  onPress,
  variant = 'primary',
  sf,
  md,
  size = 'regular',
  style,
}: ButtonProps) {
  const theme = useTheme();

  const background =
    variant === 'primary' ? theme.tint : variant === 'danger' ? theme.danger : theme.backgroundSelected;
  const foreground = variant === 'secondary' ? theme.text : theme.onTint;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={caption ? `${label}, ${caption}` : label}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background },
        size === 'large' && styles.large,
        pressed && styles.pressed,
        style,
      ]}>
      <View style={styles.inner}>
        {sf && md ? <Icon sf={sf} md={md} size={size === 'large' ? 22 : 16} color={foreground} /> : null}
        <View style={styles.textWrap}>
          <ThemedText
            type={size === 'large' ? 'sectionTitle' : 'smallBold'}
            style={{ color: foreground, textAlign: 'center' }}>
            {label}
          </ThemedText>
          {caption ? (
            <ThemedText
              type="caption"
              style={[styles.caption, { color: foreground }]}>
              {caption}
            </ThemedText>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  large: {
    minHeight: 64,
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
  },
  pressed: {
    opacity: 0.8,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two + 2,
  },
  textWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  caption: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
    textAlign: 'center',
  },
});
