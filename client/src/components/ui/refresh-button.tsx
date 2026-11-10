/**
 * Reusable Manual Refresh Button Template
 *
 * ARCHITECTURAL CONTEXT & RATIONALE (AGENTS.md Rule 4.5 & US-N06):
 * Knightly provides 1-tap manual refresh buttons across feed, dining, and safety screens.
 * This component consolidates the manual refresh UI pattern into a unified, accessible,
 * and animated control conforming to Knightly brand tokens (Collegiate Gold & Calvin Maroon).
 *
 * ANIMATION PHILOSOPHY:
 * - When `refreshing` is true, the refresh glyph continuously spins (360-degree loop) using
 *   declarative Reanimated timing.
 * - When tapped, a tactile micro-spring bounce confirms receipt of the tap immediately before
 *   the asynchronous network request begins.
 */

import { useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type RefreshButtonVariant = 'pill' | 'ghost' | 'icon';
export type RefreshButtonSize = 'small' | 'medium';

export type RefreshButtonProps = {
  /** Callback triggered when the student presses the manual refresh button. */
  onRefresh?: () => void | Promise<void>;
  /** Whether the underlying data query is actively loading/refreshing. */
  refreshing?: boolean;
  /** Optional visible button text label (e.g., "Refresh", "Check Alerts"). */
  label?: string;
  /** Visual presentation style: 'pill' with border/background, 'ghost' text-forward, or 'icon' only. */
  variant?: RefreshButtonVariant;
  /** Component height and scale: 'small' (28px) or 'medium' (36px). */
  size?: RefreshButtonSize;
  /** Accessible description for screen readers. Defaults to "Refresh [label] content". */
  accessibilityLabel?: string;
  /** Additional container layout styles. */
  style?: StyleProp<ViewStyle>;
  /** Optional custom icon tint color overriding the default Collegiate Gold token. */
  color?: string;
  /** Disable interaction when offline or locked. */
  disabled?: boolean;
};

/**
 * Knightly Consolidated Manual Refresh Button
 */
export function RefreshButton({
  onRefresh,
  refreshing = false,
  label,
  variant = label ? 'pill' : 'icon',
  size = 'small',
  accessibilityLabel,
  style,
  color = Brand.gold,
  disabled = false,
}: RefreshButtonProps) {
  const theme = useTheme();

  // Step 1: Initialize Reanimated shared values for rotation (continuous spin) and scale (tactile press)
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  // Step 2: Manage continuous rotational spin while refreshing is active
  useEffect(() => {
    if (refreshing) {
      // Step 2a: Spin continuously 0 -> 360 degrees indefinitely until refreshing terminates
      rotation.value = 0;
      rotation.value = withRepeat(
        withTiming(360, {
          duration: 900,
          easing: Easing.linear,
        }),
        -1, // infinite repeat
        false
      );
    } else {
      // Step 2b: Smoothly cancel rotational spin and reset back to rest position (0 deg)
      cancelAnimation(rotation);
      rotation.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.ease) });
    }
  }, [refreshing, rotation]);

  // Step 3: Handle press with spring feedback and invoke callback
  const handlePress = () => {
    if (disabled || refreshing) return;
    // Tactile spring feedback
    scale.value = 0.85;
    scale.value = withSpring(1, { damping: 12, stiffness: 220 });
    onRefresh?.();
  };

  // Step 4: Animated styles for the icon wrapper and the pressable root
  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const rootAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isSmall = size === 'small';
  const iconSize = isSmall ? 13 : 16;
  const a11yLabel =
    accessibilityLabel ||
    (label ? `Refresh ${label}` : 'Refresh updated content');

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || refreshing}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ busy: refreshing, disabled: disabled || refreshing }}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        variant === 'pill' && [
          styles.pill,
          isSmall ? styles.pillSmall : styles.pillMedium,
          {
            backgroundColor: theme.backgroundElement ?? 'rgba(232, 176, 25, 0.08)',
            borderColor: theme.border ?? 'rgba(232, 176, 25, 0.3)',
          },
        ],
        variant === 'icon' && [
          styles.iconOnly,
          isSmall ? styles.iconSmall : styles.iconMedium,
          {
            backgroundColor: 'rgba(232, 176, 25, 0.1)',
            borderColor: 'rgba(232, 176, 25, 0.25)',
          },
        ],
        variant === 'ghost' && styles.ghost,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.innerRow,
          label ? styles.innerRowWithLabel : styles.innerRowIconOnly,
          rootAnimatedStyle,
        ]}
      >
        <Animated.View style={[styles.iconWrapper, iconAnimatedStyle]}>
          <Icon
            sf="arrow.clockwise"
            md="refresh"
            size={iconSize}
            color={color}
          />
        </Animated.View>

        {label ? (
          <ThemedText
            style={[
              styles.labelText,
              isSmall ? styles.labelSmall : styles.labelMedium,
              { color },
            ]}
            numberOfLines={1}
          >
            {label}
          </ThemedText>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerRowWithLabel: {
    gap: 6,
  },
  innerRowIconOnly: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
  },
  pill: {
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  pillSmall: {
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 5,
    height: 28,
  },
  pillMedium: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 7,
    height: 42,
  },
  iconOnly: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSmall: {
    width: 28,
    height: 28,
  },
  iconMedium: {
    width: 42,
    height: 42,
  },
  ghost: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  labelText: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  labelSmall: {
    fontSize: 12,
  },
  labelMedium: {
    fontSize: 13,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.5,
  },
});
