import { forwardRef, type ComponentProps, type PropsWithChildren, type ReactNode, type RefObject } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle, FlatList, type FlatListProps, type ScrollViewInstance, RefreshControl } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabContentInset, Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { useStarfield } from '@/context/starfield-context';
import { useTheme } from '@/hooks/use-theme';
import { useHeaderOverlayInset } from '@/components/ui/header-overlay';
import { useScreenScrollHandler } from '@/hooks/use-screen-scroll';

/** Shared scroll surface for pages with custom keyboard/layout wrappers, including the composer. */
export const ScreenScrollView = forwardRef<ScrollViewInstance, ComponentProps<typeof Animated.ScrollView>>(
  ({ contentContainerStyle, ...props }, ref) => {
    const headerInset = useHeaderOverlayInset();
    const insets = useSafeAreaInsets();
    const scrollHandler = useScreenScrollHandler();
    return (
      <Animated.ScrollView {...props} ref={ref} onScroll={scrollHandler} scrollEventThrottle={16}
        contentContainerStyle={[contentContainerStyle, {
          paddingTop: headerInset + Spacing.three,
          paddingBottom: Math.max(insets.bottom, Spacing.two) + BottomTabContentInset,
        }]} />
    );
  }
);

type ScreenProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  /** Fixed masthead rendered above the scroll area. */
  header?: ReactNode;
  scroll?: boolean;
  /** Optional ref forwarded to the underlying Animated.ScrollView */
  scrollViewRef?: RefObject<Animated.ScrollView | null>;
  /** Whether a pull-to-refresh action is currently active and animating. */
  refreshing?: boolean;
  /** Callback triggered when the user performs a pull-to-refresh downward gesture. */
  onRefresh?: () => void | Promise<void>;
  /** Optional custom RefreshControl element overriding the default branded control. */
  refreshControl?: React.ReactElement;
}>;

export function Screen({
  children,
  style,
  header,
  scroll = true,
  scrollViewRef,
  refreshing,
  onRefresh,
  refreshControl,
}: ScreenProps) {
  const headerInset = useHeaderOverlayInset();
  const theme = useTheme();
  const starfield = useStarfield();
  const insets = useSafeAreaInsets();

  const scrollHandler = useScreenScrollHandler();

  // Template-level Calvin-branded pull-to-refresh control (AGENTS.md Rule 4.5 & 5)
  const defaultRefreshControl = onRefresh ? (
    <RefreshControl
      refreshing={Boolean(refreshing)}
      onRefresh={onRefresh}
      tintColor={Brand.gold}
      colors={[Brand.maroon, Brand.gold]}
      progressBackgroundColor={theme.backgroundElement}
    />
  ) : undefined;

  return (
    <View style={[styles.fill, { backgroundColor: starfield ? 'transparent' : theme.background }]}>
      {header}

      {scroll ? (
        <Animated.ScrollView
          ref={scrollViewRef}
          style={styles.fill}
          contentContainerStyle={[styles.outer, {
            paddingTop: headerInset + Spacing.three,
            paddingBottom: Math.max(insets.bottom, Spacing.two) + BottomTabContentInset,
          }]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          refreshControl={refreshControl ?? defaultRefreshControl}>
          <View style={[styles.inner, style]}>{children}</View>
        </Animated.ScrollView>
      ) : (
        <View style={[styles.fill, { paddingTop: headerInset }, style]}>{children}</View>
      )}
    </View>
  );
}

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList) as any;

type ScreenFlatListProps<T> = Omit<FlatListProps<T>, 'contentContainerStyle' | 'style' | 'refreshing' | 'onRefresh' | 'refreshControl'> & {
  style?: StyleProp<ViewStyle>;
  header?: ReactNode;
  listRef?: RefObject<FlatList<T> | null>;
  /** Whether a pull-to-refresh action is currently active and animating. */
  refreshing?: boolean;
  /** Callback triggered when the user performs a pull-to-refresh downward gesture. */
  onRefresh?: () => void | Promise<void>;
  /** Optional custom RefreshControl element overriding the default branded control. */
  refreshControl?: React.ReactElement;
};

export function ScreenFlatList<T>({
  style,
  header,
  listRef,
  ListHeaderComponent,
  refreshing,
  onRefresh,
  refreshControl,
  ...flatListProps
}: ScreenFlatListProps<T>) {
  const headerInset = useHeaderOverlayInset();
  const theme = useTheme();
  const starfield = useStarfield();
  const insets = useSafeAreaInsets();

  const scrollHandler = useScreenScrollHandler();

  // Template-level Calvin-branded pull-to-refresh control (AGENTS.md Rule 4.5 & 5)
  const defaultRefreshControl = onRefresh ? (
    <RefreshControl
      refreshing={Boolean(refreshing)}
      onRefresh={onRefresh}
      tintColor={Brand.gold}
      colors={[Brand.maroon, Brand.gold]}
      progressBackgroundColor={theme.backgroundElement}
    />
  ) : undefined;

  return (
    <View style={[styles.fill, { backgroundColor: starfield ? 'transparent' : theme.background }]}>
      {header}

      <AnimatedFlatList
        {...flatListProps}
        ref={listRef as any}
        style={styles.fill}
        contentContainerStyle={[styles.outer, {
          paddingTop: headerInset + Spacing.three,
          paddingBottom: Math.max(insets.bottom, Spacing.two) + BottomTabContentInset,
        }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={refreshControl ?? defaultRefreshControl}
        ListHeaderComponent={
          ListHeaderComponent ? (
            <View style={[styles.inner, style]}>{ListHeaderComponent as ReactNode}</View>
          ) : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  outer: {
    paddingBottom: Spacing.five,
  },
  inner: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    gap: Spacing.four,
  },
});
