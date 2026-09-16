import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/ui/icon';

export type HeaderBackButtonProps = {
  onPress: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  color?: string;
  size?: number;
};

/**
 * Standardized header back button matching the Calvin Knightly design system.
 */
export function HeaderBackButton({
  onPress,
  accessibilityLabel = 'Go back',
  style,
  color = '#FFFFFF',
  size = 24,
}: HeaderBackButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={12}
      style={({ pressed }) => [styles.backBtn, style, pressed && styles.pressed]}
    >
      <Icon sf="chevron.left" md="arrow_back" size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
