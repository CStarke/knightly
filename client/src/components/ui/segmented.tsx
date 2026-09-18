import { useEffect, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SegmentedProps<T extends string> = {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
};

const TRACK_PADDING = 4;

/**
 * Animated segmented control with a smooth sliding indicator pill.
 */
export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  const theme = useTheme();
  const [contentWidth, setContentWidth] = useState(0);

  const selectedIndex = Math.max(0, options.indexOf(value));
  const translateX = useSharedValue(0);
  const isInitialized = useSharedValue(false);

  const handleInnerLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0 && Math.abs(width - contentWidth) > 0.5) {
      setContentWidth(width);
    }
  };

  const segmentWidth = contentWidth > 0 ? contentWidth / options.length : 0;

  useEffect(() => {
    if (contentWidth <= 0 || segmentWidth <= 0) return;
    const targetX = selectedIndex * segmentWidth;

    if (!isInitialized.value) {
      translateX.value = targetX;
      isInitialized.value = true;
    } else {
      translateX.value = withSpring(targetX, {
        damping: 26,
        stiffness: 260,
        mass: 0.7,
        overshootClamping: true,
      });
    }
  }, [selectedIndex, contentWidth, segmentWidth, translateX, isInitialized]);

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: theme.backgroundSelected,
          borderColor: theme.border,
        },
      ]}>
      <View style={styles.innerTrack} onLayout={handleInnerLayout}>
        {/* Animated sliding indicator pill */}
        {segmentWidth > 0 ? (
          <Animated.View
            style={[
              styles.pill,
              {
                width: segmentWidth,
                backgroundColor: Brand.maroon,
              },
              pillAnimatedStyle,
            ]}
          />
        ) : null}

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
                pressed && !selected && styles.pressed,
              ]}>
              <ThemedText
                type="smallBold"
                style={[
                  styles.label,
                  { color: selected ? '#FFFFFF' : theme.textSecondary },
                ]}
                numberOfLines={1}>
                {option}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: Radius.pill,
    padding: TRACK_PADDING,
    borderWidth: 1,
    overflow: 'hidden',
  },
  innerTrack: {
    flexDirection: 'row',
    position: 'relative',
    alignItems: 'center',
    width: '100%',
  },
  pill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: Radius.pill,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two + 1,
    paddingHorizontal: Spacing.one,
    borderRadius: Radius.pill,
    zIndex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
