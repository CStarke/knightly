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
  const [trackWidth, setTrackWidth] = useState(0);

  const selectedIndex = Math.max(0, options.indexOf(value));
  const translateX = useSharedValue(0);
  const isInitialized = useSharedValue(false);

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0 && Math.abs(width - trackWidth) > 1) {
      setTrackWidth(width);
    }
  };

  const pillWidth =
    trackWidth > 0 ? (trackWidth - TRACK_PADDING * 2) / options.length : 0;

  useEffect(() => {
    if (trackWidth <= 0) return;
    const innerWidth = trackWidth - TRACK_PADDING * 2;
    const widthPerSegment = innerWidth / options.length;
    const targetX = selectedIndex * widthPerSegment;

    if (!isInitialized.value) {
      translateX.value = targetX;
      isInitialized.value = true;
    } else {
      translateX.value = withSpring(targetX, {
        damping: 24,
        stiffness: 240,
        mass: 0.8,
      });
    }
  }, [selectedIndex, trackWidth, options.length]);

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.track,
        {
          backgroundColor: theme.backgroundSelected,
          borderColor: theme.border,
        },
      ]}>
      {/* Animated sliding indicator pill */}
      {pillWidth > 0 ? (
        <Animated.View
          style={[
            styles.pill,
            {
              width: pillWidth,
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
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    position: 'relative',
    borderRadius: Radius.pill,
    padding: TRACK_PADDING,
    borderWidth: 1,
  },
  pill: {
    position: 'absolute',
    top: TRACK_PADDING,
    left: TRACK_PADDING,
    bottom: TRACK_PADDING,
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
  },
});
