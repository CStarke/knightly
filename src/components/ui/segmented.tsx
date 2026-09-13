import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Spacing } from '@/constants/theme';

type SegmentedProps<T extends string> = {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
};

/** Sits on the maroon header, so the selected segment is gold. */
export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <View style={styles.track}>
      {options.map((option) => {
        const selected = option === value;

        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              pressed && !selected && styles.pressed,
            ]}>
            <ThemedText
              type="smallBold"
              style={selected ? styles.labelSelected : styles.label}
              numberOfLines={1}>
              {option}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: Radius.pill,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two - 1,
    borderRadius: Radius.pill,
  },
  segmentSelected: {
    backgroundColor: Brand.gold,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    color: 'rgba(255,255,255,0.82)',
  },
  labelSelected: {
    color: Brand.maroonDark,
  },
});
