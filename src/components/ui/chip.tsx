import { useCallback, useMemo, useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  ScrollView as GHScrollView,
} from 'react-native-gesture-handler';

import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTabPagerPriority } from '@/context/tab-pager-priority-context';
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
  const { isInnerScrollActive, setInnerScrollActive } = useTabPagerPriority();
  const scrollRef = useRef<any>(null);

  // Gesture handler for immediately claiming touch interaction before pager pan can activate
  const panClaimGesture = useMemo(
    () =>
      Gesture.Pan()
        .simultaneousWithExternalGesture()
        .onTouchesDown(() => {
          'worklet';
          isInnerScrollActive.value = true;
        })
        .onTouchesUp(() => {
          'worklet';
          isInnerScrollActive.value = false;
        })
        .onTouchesCancelled(() => {
          'worklet';
          isInnerScrollActive.value = false;
        })
        .onFinalize(() => {
          'worklet';
          isInnerScrollActive.value = false;
        }),
    [isInnerScrollActive]
  );

  const handleTouchStart = useCallback(() => {
    isInnerScrollActive.value = true;
    setInnerScrollActive(true);
  }, [isInnerScrollActive, setInnerScrollActive]);

  const handleTouchEnd = useCallback(() => {
    isInnerScrollActive.value = false;
    setInnerScrollActive(false);
  }, [isInnerScrollActive, setInnerScrollActive]);

  // On desktop Web, allow mouse click-and-drag to scroll horizontally through the tags
  const mouseDragRef = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });

  const onMouseDown = useCallback(
    (e: any) => {
      if (Platform.OS !== 'web') return;
      if (e.button !== 0 && e.nativeEvent?.button !== 0) return;
      const clientX = e.clientX ?? e.nativeEvent?.clientX ?? 0;
      const domNode = scrollRef.current?.getScrollableNode?.() ?? scrollRef.current;
      mouseDragRef.current = {
        isDown: true,
        startX: clientX,
        scrollLeft: domNode?.scrollLeft ?? 0,
        moved: false,
      };
      handleTouchStart();
    },
    [handleTouchStart]
  );

  const onMouseMove = useCallback((e: any) => {
    if (Platform.OS !== 'web' || !mouseDragRef.current.isDown) return;
    const clientX = e.clientX ?? e.nativeEvent?.clientX ?? 0;
    const dx = clientX - mouseDragRef.current.startX;
    if (Math.abs(dx) > 3) {
      mouseDragRef.current.moved = true;
    }
    const domNode = scrollRef.current?.getScrollableNode?.() ?? scrollRef.current;
    if (domNode) {
      domNode.scrollLeft = mouseDragRef.current.scrollLeft - dx;
    }
  }, []);

  const onMouseUp = useCallback(() => {
    if (Platform.OS !== 'web') return;
    mouseDragRef.current.isDown = false;
    handleTouchEnd();
  }, [handleTouchEnd]);

  return (
    <GestureDetector gesture={panClaimGesture}>
      <View
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        {...(Platform.OS === 'web'
          ? {
              onMouseDown,
              onMouseMove,
              onMouseUp,
              onMouseLeave: onMouseUp,
            }
          : {})}>
        <GHScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled={true}
          disallowInterruption={true}
          onScrollBeginDrag={handleTouchStart}
          onScrollEndDrag={handleTouchEnd}
          onMomentumScrollEnd={handleTouchEnd}
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
        </GHScrollView>
      </View>
    </GestureDetector>
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
