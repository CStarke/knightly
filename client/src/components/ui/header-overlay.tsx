import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedReaction, useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { advanceHeaderScroll, INITIAL_HEADER_SCROLL } from '@/utils/header-scroll';
import { HeaderMotion } from '@/constants/motion';
import { Spacing } from '@/constants/theme';
import { getAppHeaderHeight } from '@/components/ui/app-header';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HeaderOverlayInset = createContext(0);
const HeaderOverlayScroll = createContext<SharedValue<number> | null>(null);

/** Scroll channel shared by screen templates and their floating header. */
export function useHeaderOverlayScroll(): SharedValue<number> | null {
  return useContext(HeaderOverlayScroll);
}

/** Returns the measured floating header height, or zero outside an overlay layout. */
export function useHeaderOverlayInset(): number {
  return useContext(HeaderOverlayInset);
}

/** Lets page content scroll beneath the header while keeping initial content clear of it. */
export function HeaderOverlay({ header, children, fadeOnScroll = false, scrollKey }: {
  header: ReactNode;
  children: ReactNode;
  fadeOnScroll?: boolean;
  /** Resets header visibility when a persistent pager switches pages without remounting. */
  scrollKey?: string;
}) {
  const insets = useSafeAreaInsets();
  // Reserve the header before the first paint; measuring from zero made the entire page jump.
  const [height, setHeight] = useState(() => getAppHeaderHeight(insets.top) + Spacing.two);
  const scrollY = useSharedValue(0);
  const scrollState = useSharedValue(INITIAL_HEADER_SCROLL);
  const opacity = useSharedValue(1);

  // Restore navigation controls whenever a tab or nested page changes.
  useEffect(() => {
    scrollY.value = 0;
    scrollState.value = INITIAL_HEADER_SCROLL;
    opacity.value = 1;
  }, [fadeOnScroll, scrollKey, scrollY, scrollState, opacity]);

  useAnimatedReaction(
    () => scrollY.value,
    (offset) => {
      if (!fadeOnScroll) return;
      const previous = scrollState.value;
      const next = advanceHeaderScroll(previous, offset);
      if (next === previous) return;
      scrollState.value = next;
      // Downward progress follows the finger directly: restarting withTiming every frame caused lag.
      // Only upward intent starts a timed reveal, preserving the shared login easing.
      if (next.opacity > previous.opacity) {
        opacity.value = withTiming(next.opacity, { duration: HeaderMotion.revealDuration, easing: HeaderMotion.easing });
      } else if (next.opacity < previous.opacity) {
        opacity.value = next.opacity;
      }
    },
    [fadeOnScroll]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeOnScroll ? opacity.value : 1,
    transform: [
      { translateY: fadeOnScroll ? -Spacing.three * (1 - opacity.value) : 0 },
      { scale: fadeOnScroll ? 0.98 + 0.02 * opacity.value : 1 },
    ],
  }));
  const animatedProps = useAnimatedProps(() => ({
    // Invisible header controls must not block links or scrolling beneath them.
    pointerEvents: fadeOnScroll && opacity.value <= 0.01 ? 'none' as const : 'box-none' as const,
  }));

  return (
    <HeaderOverlayInset.Provider value={height}>
      <HeaderOverlayScroll.Provider value={scrollY}>
      <View style={styles.layout}>
        {children}
        {/* Only the header surface handles touches; the surrounding gap stays transparent. */}
        <Animated.View animatedProps={animatedProps} style={[styles.header, animatedStyle]}
          onLayout={(event) => {
            const measured = Math.round(event.nativeEvent.layout.height);
            if (measured > 0) setHeight((previous) => previous === measured ? previous : measured);
          }}>
          {header}
        </Animated.View>
      </View>
      </HeaderOverlayScroll.Provider>
    </HeaderOverlayInset.Provider>
  );
}

const styles = StyleSheet.create({
  layout: { flex: 1 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 },
});
