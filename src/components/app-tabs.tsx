import { router, usePathname } from 'expo-router';
import {
  TabList,
  TabSlot,
  TabTrigger,
  Tabs,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Icon, type MaterialSymbolName, type SfSymbolName } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TabMeta = {
  name: string;
  href: '/' | '/dining' | '/safety' | '/directory';
  label: string;
  sf: SfSymbolName;
  md: MaterialSymbolName;
  badge?: string;
};

const TABS: TabMeta[] = [
  { name: 'knightly', href: '/', label: 'Knightly', sf: 'sparkles', md: 'auto_awesome' },
  { name: 'dining', href: '/dining', label: 'Dining', sf: 'fork.knife', md: 'restaurant' },
  {
    name: 'safety',
    href: '/safety',
    label: 'Safety',
    sf: 'shield.lefthalf.filled',
    md: 'shield',
    badge: '1',
  },
  { name: 'directory', href: '/directory', label: 'Directory', sf: 'person.2.fill', md: 'group' },
];

/** Ease-out curve: leaves fast, settles slow. Used by both the fling and tab taps. */
const CURVE = Easing.bezier(0.22, 1, 0.36, 1);
const DURATION = 340;

export default function AppTabs() {
  return (
    <Tabs>
      <AnimatedTabSlot />

      <TabList asChild>
        <BottomBar>
          {TABS.map((meta) => (
            <TabTrigger key={meta.name} name={meta.name} href={meta.href} asChild>
              <TabButton meta={meta} />
            </TabTrigger>
          ))}
        </BottomBar>
      </TabList>
    </Tabs>
  );
}

/**
 * Flinging left or right moves to the neighbouring tab. Whichever way the tab
 * changes — fling or tap on the bar — the incoming screen slides in from that
 * side on a bezier curve.
 */
function AnimatedTabSlot() {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const index = TABS.findIndex((tab) => tab.href === pathname);
  const previous = useRef(index < 0 ? 0 : index);

  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Ignore routes outside the tabs, such as the full screen ID card.
    if (index < 0 || index === previous.current) return;

    const direction = index > previous.current ? 1 : -1;
    previous.current = index;

    translateX.value = direction * width * 0.32;
    opacity.value = 0.2;
    translateX.value = withTiming(0, { duration: DURATION, easing: CURVE });
    opacity.value = withTiming(1, { duration: DURATION * 0.7, easing: CURVE });
  }, [index, width, translateX, opacity]);

  const go = useCallback(
    (delta: number) => {
      const target = TABS[previous.current + delta];
      if (target) router.navigate(target.href);
    },
    []
  );

  const fling = useMemo(
    () =>
      Gesture.Race(
        Gesture.Fling()
          .direction(Directions.LEFT)
          .runOnJS(true)
          .onEnd(() => go(1)),
        Gesture.Fling()
          .direction(Directions.RIGHT)
          .runOnJS(true)
          .onEnd(() => go(-1))
      ),
    [go]
  );

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={fling}>
      <Animated.View style={[styles.scene, style]}>
        <TabSlot />
      </Animated.View>
    </GestureDetector>
  );
}

function BottomBar(props: TabListProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      {...props}
      style={[
        styles.bar,
        {
          backgroundColor: theme.backgroundElement,
          borderTopColor: theme.border,
          paddingBottom: Math.max(insets.bottom, Spacing.two),
        },
      ]}
    />
  );
}

function TabButton({ meta, isFocused, ...props }: TabTriggerSlotProps & { meta: TabMeta }) {
  const theme = useTheme();
  const color = isFocused ? theme.tint : theme.textSecondary;

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{ selected: !!isFocused }}
      accessibilityLabel={meta.label}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
      <View>
        <Icon sf={meta.sf} md={meta.md} size={22} color={color} />
        {meta.badge ? (
          <View style={[styles.badge, { backgroundColor: theme.danger }]}>
            <ThemedText style={styles.badgeText}>{meta.badge}</ThemedText>
          </View>
        ) : null}
      </View>

      <ThemedText style={[styles.label, { color }]} numberOfLines={1}>
        {meta.label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scene: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 15,
    height: 15,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
  },
});
