import React, { type PropsWithChildren } from 'react';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type AccessoryButtonProps = PropsWithChildren<{
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: 'button';
  accessibilityLabel?: string;
  disabled?: boolean;
}>;

/**
 * Reusable accessory action button matching input field heights (40px)
 * with themed background, border, and responsive spring bounce animation.
 */
export function AccessoryButton({
  children,
  onPress,
  style,
  accessibilityRole = 'button',
  accessibilityLabel,
  disabled = false,
}: AccessoryButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const handlePress = () => {
    if (disabled) return;
    scale.value = 0.82;
    scale.value = withSpring(1, { damping: 12, stiffness: 240 });
    onPress?.();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        },
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Animated.View style={[styles.inner, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});
