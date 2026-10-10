/**
 * Shared Mobile Bottom Navigation Bar & Tab Triggers
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Extracted from app-tabs.tsx to provide cross-platform code reuse between native mobile (iOS/Android)
 * and mobile web browsers (< 768px viewports in app-tabs.web.tsx).
 *
 * BRANDING & ERGONOMICS:
 * 1. Signature Calvin Gold Rule: 3px brand rule with 33° white scaffolding accent skews across the top edge.
 * 2. Absolute Grounded Docking: Anchored flush with bottom screen edge and clears safe area insets.
 * 3. Spring Pop & Lift Motion: Bouncy spring pops active icon up to 1.16x and lifts it smoothly to make room for label.
 * 4. Dual-Layer Icon Crossfade: Crossfades between textMuted outline and theme.tint solid icon.
 */

import type { TabListProps, TabTriggerSlotProps } from 'expo-router/ui';
import { useEffect, useRef } from 'react';
import {
  AppState,
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Brand, Spacing } from '@/constants/theme';
import { useTabNavigation, type TabMeta } from '@/context/tab-navigation-context';
import { useTheme } from '@/hooks/use-theme';

export interface BottomBarProps extends TabListProps {
  translateY?: SharedValue<number>;
}

/**
 * Grounded bottom bar container with Calvin Gold rule and ambient shadow.
 */
export function BottomBar({
  children,
  style,
  translateY,
  ...props
}: BottomBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const animatedStyle = useAnimatedStyle(() => {
    const ty = translateY ? translateY.value : 0;
    return {
      transform: [{ translateY: ty }],
      opacity: ty > 60 ? 0 : 1 - ty / 60,
    };
  });

  return (
    <Animated.View
      style={[
        styles.bottomBarWrapper,
        {
          backgroundColor: theme.backgroundElement,
        },
        animatedStyle,
      ]}>
      {/* Signature Calvin Gold rule with 33° brand scaffolding accent */}
      <View style={styles.ruleContainer}>
        <View style={styles.rule} />
        <View style={styles.ruleAccent} />
      </View>

      <View
        {...props}
        style={[
          styles.bar,
          {
            backgroundColor: theme.backgroundElement,
            paddingBottom: Math.max(insets.bottom, Spacing.two),
          },
          style,
        ]}>
        {children}
      </View>
    </Animated.View>
  );
}

export interface TabButtonProps extends TabTriggerSlotProps {
  meta: TabMeta;
  index: number;
  activeTabIndex: number;
}

/**
 * Individual animated bottom tab trigger with spring pop and icon crossfade.
 */
export function TabButton({
  meta,
  index,
  activeTabIndex,
  isFocused: _isFocused,
  ...props
}: TabButtonProps) {
  const theme = useTheme();
  const tabNav = useTabNavigation();
  const effectivelyFocused = activeTabIndex === index;
  const progress = useSharedValue(effectivelyFocused ? 1 : 0);

  const effectivelyFocusedRef = useRef(effectivelyFocused);
  effectivelyFocusedRef.current = effectivelyFocused;

  useEffect(() => {
    if (AppState.currentState === 'active') {
      progress.value = withSpring(effectivelyFocused ? 1 : 0, {
        damping: 14,
        stiffness: 170,
        mass: 0.6,
      });
    } else {
      cancelAnimation(progress);
      progress.value = effectivelyFocused ? 1 : 0;
    }
  }, [effectivelyFocused, progress]);

  // Cleanly snap progress to current focus on foreground resume
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        cancelAnimation(progress);
        progress.value = effectivelyFocusedRef.current ? 1 : 0;
      }
    });
    return () => sub.remove();
  }, [progress]);

  const iconContainerAnimatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const scale = interpolate(p, [0, 0.55, 1], [0.94, 1.16, 1.0]);
    const translateY = interpolate(p, [0, 1], [6, -1]);

    return {
      transform: [{ translateY }, { scale }],
    };
  });

  const activeIconStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const inactiveIconStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
  }));

  const labelAnimatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0, 0.3, 1], [0, 0.4, 1]),
      transform: [
        { translateY: interpolate(p, [0, 1], [6, 0]) },
        { scale: interpolate(p, [0, 1], [0.8, 1]) },
      ],
    };
  });

  const handlePress = (e: GestureResponderEvent) => {
    e.preventDefault?.();
    tabNav?.navigateToTab(index, meta.href);
    props.onPress?.(e);
  };

  return (
    <Pressable
      {...props}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!effectivelyFocused }}
      accessibilityLabel={meta.label}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
      <View style={styles.tabContent}>
        <Animated.View style={[styles.iconWrapper, iconContainerAnimatedStyle]}>
          <Animated.View style={[styles.iconLayer, inactiveIconStyle]}>
            <Icon sf={meta.sf} md={meta.md} size={22} color={theme.textMuted} />
          </Animated.View>
          <Animated.View style={[styles.iconLayer, activeIconStyle]}>
            <Icon
              sf={meta.sfActive ?? meta.sf}
              md={meta.mdActive ?? meta.md}
              size={22}
              color={theme.tint}
            />
          </Animated.View>
        </Animated.View>

        <Animated.View pointerEvents="none" style={[styles.labelWrapper, labelAnimatedStyle]}>
          <ThemedText style={[styles.label, { color: theme.tint }]} numberOfLines={1}>
            {meta.label}
          </ThemedText>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bottomBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  ruleContainer: {
    width: '100%',
    height: 3,
    backgroundColor: Brand.gold,
    position: 'relative',
    overflow: 'hidden',
  },
  rule: {
    flex: 1,
    backgroundColor: Brand.gold,
  },
  ruleAccent: {
    position: 'absolute',
    left: '25%',
    width: 32,
    height: 3,
    backgroundColor: '#FFFFFF',
    transform: [{ skewX: '-33deg' }],
  },
  bar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.one + 2,
    paddingHorizontal: Spacing.one,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  iconWrapper: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrapper: {
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
