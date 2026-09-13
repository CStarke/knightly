import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, type MaterialSymbolName, type SfSymbolName } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  sf?: SfSymbolName;
  md?: MaterialSymbolName;
  size?: 'regular' | 'large';
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
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
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background },
        size === 'large' && styles.large,
        pressed && styles.pressed,
        style,
      ]}>
      <View style={styles.inner}>
        {sf && md ? <Icon sf={sf} md={md} size={size === 'large' ? 20 : 16} color={foreground} /> : null}
        <ThemedText
          type={size === 'large' ? 'sectionTitle' : 'smallBold'}
          style={{ color: foreground }}>
          {label}
        </ThemedText>
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
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
  },
  pressed: {
    opacity: 0.8,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
