import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ChipTone = 'gold' | 'brand';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: ChipTone;
};

export function Chip({ label, selected, onPress, tone = 'gold' }: ChipProps) {
  const theme = useTheme();

  const isGold = tone === 'gold';
  const selectedBg = isGold ? Brand.gold : theme.tint;
  const selectedBorder = isGold ? Brand.gold : theme.tint;
  const selectedTextColor = isGold ? Brand.charcoal : theme.onTint;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? selectedBg : theme.backgroundElement,
          borderColor: selected ? selectedBorder : theme.border,
        },
        pressed && styles.pressed,
      ]}>
      <ThemedText
        type="smallBold"
        style={{
          color: selected ? selectedTextColor : theme.textSecondary,
        }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

type ChipRowProps<T extends string> = {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  tone?: ChipTone;
};

export function ChipRow<T extends string>({
  options,
  value,
  onChange,
  tone = 'gold',
}: ChipRowProps<T>) {
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
          tone={tone}
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
    borderWidth: 1,
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
