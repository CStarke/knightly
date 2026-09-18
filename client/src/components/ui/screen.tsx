import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabContentInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useStarfield } from '@/context/starfield-context';
import { useTheme } from '@/hooks/use-theme';

type ScreenProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  /** Fixed masthead rendered above the scroll area. */
  header?: ReactNode;
  scroll?: boolean;
}>;

export function Screen({ children, style, header, scroll = true }: ScreenProps) {
  const theme = useTheme();
  const starfield = useStarfield();
  const insets = useSafeAreaInsets();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (starfield) {
        starfield.scrollY.value = event.contentOffset.y;
      }
    },
  });

  const body = <View style={[styles.inner, style]}>{children}</View>;
  const topPadding = Spacing.three;
  const bottomPadding = Math.max(insets.bottom, Spacing.two) + BottomTabContentInset;

  return (
    <View style={[styles.fill, { backgroundColor: starfield ? 'transparent' : theme.background }]}>
      {header}

      {scroll ? (
        <Animated.ScrollView
          style={styles.fill}
          contentContainerStyle={[styles.outer, { paddingTop: topPadding, paddingBottom: bottomPadding }]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}>
          {body}
        </Animated.ScrollView>
      ) : (
        <View style={styles.fill}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  outer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: Spacing.five,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    gap: Spacing.four,
  },
});
