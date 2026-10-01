import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, type MaterialSymbolName, type SfSymbolName } from '@/components/ui/icon';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Standard button component props supporting Calvin brand variants.
 */
type ButtonProps = {
  label: string;
  caption?: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'gold';
  sf?: SfSymbolName;
  md?: MaterialSymbolName;
  size?: 'regular' | 'large';
  style?: StyleProp<ViewStyle>;
};

/**
 * Reusable pressable button component styled with semantic theme and brand colors.
 *
 * @param props.label - Primary button text
 * @param props.caption - Optional secondary caption displayed beneath the label
 * @param props.onPress - Click/touch event handler
 * @param props.disabled - Whether button is non-interactive with 50% opacity
 * @param props.variant - Visual style: 'primary' (Maroon), 'gold' (Calvin Gold with dark text), 'secondary' (Neutral), or 'danger' (Red)
 * @param props.sf - Optional SF Symbol icon
 * @param props.md - Optional Material Symbol icon
 * @param props.size - Button size scale ('regular' or 'large')
 * @param props.style - Additional custom container style overrides
 */
export function Button({
  label,
  caption,
  onPress,
  disabled = false,
  variant = 'primary',
  sf,
  md,
  size = 'regular',
  style,
}: ButtonProps) {
  const theme = useTheme();

  // Step 1: Resolve semantic background color by variant
  const background =
    variant === 'gold'
      ? Brand.gold
      : variant === 'primary'
      ? theme.tint
      : variant === 'danger'
      ? theme.danger
      : theme.backgroundSelected;

  // Step 2: Resolve high-contrast foreground color
  // Gold buttons use dark neutral #0B0C0E for maximal legibility on radiant gold
  const foreground =
    variant === 'gold'
      ? '#0B0C0E'
      : variant === 'secondary'
      ? theme.text
      : theme.onTint;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={caption ? `${label}, ${caption}` : label}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background },
        disabled && { opacity: 0.5 },
        size === 'large' && styles.large,
        pressed && !disabled && styles.pressed,
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
