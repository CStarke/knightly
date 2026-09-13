import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function Chip({ label, selected, onPress }: ChipProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.tint : theme.backgroundElement,
          borderColor: selected ? theme.tint : theme.border,
        },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="smallBold" style={{ color: selected ? theme.onTint : theme.textSecondary }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

type ChipRowProps<T extends string> = {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
};

export function ChipRow<T extends string>({ options, value, onChange }: ChipRowProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {options.map((option) => (
        <Chip
          key={option}
          label={option}
          selected={option === value}
          onPress={() => onChange(option)}
        />
      ))}
    </ScrollView>
  );
}

export function ChipWrap({ children }: { children: React.ReactNode }) {
  return <View style={styles.wrap}>{children}</View>;
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pressed: {
    opacity: 0.6,
  },
  row: {
    gap: Spacing.two,
    paddingVertical: Spacing.half,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
