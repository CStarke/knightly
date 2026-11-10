/**
 * Reusable Loading Skeleton Templates
 *
 * ARCHITECTURAL CONTEXT & RATIONALE (AGENTS.md Rule 4.5 & US-N07):
 * Knightly provides explicit animated loading skeletons during asynchronous data queries,
 * eliminating jarring layout shifts and blank-screen flashes.
 *
 * CONSOLIDATION GUARANTEES:
 * 1. Template-Level Animation: Declarative Reanimated breathing opacity pulse (0.35 <-> 0.85)
 *    cycles infinitely at 60fps without heavy CPU paint loops or memory leaks.
 * 2. Theme Token Alignment: Skeletons consume semantic tokens (`backgroundSelected`,
 *    `backgroundElement`, `border`) from `useTheme()` for seamless light and dark mode parity.
 * 3. Compositional Primitives: `Skeleton`, `SkeletonLine`, `SkeletonCard`, `PostCardSkeleton`,
 *    and `FeedLoadingSkeleton` can be composed across screens without layout drift.
 * 4. Accessibility Compliance: Marked with `accessibilityRole="progressbar"`,
 *    `accessibilityLabel`, and `accessibilityState={{ busy: true }}`.
 */

import React, { useEffect } from 'react';
import {
  DimensionValue,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ============================================================================
// 1. Core Skeleton Atomic Primitive
// ============================================================================

export interface SkeletonProps {
  /** Width of the skeleton block (e.g. number, percentage, or '100%'). */
  width?: DimensionValue;
  /** Height of the skeleton block in points. */
  height?: DimensionValue;
  /** Corner border radius. Defaults to Radius.sm (4px). */
  borderRadius?: number;
  /** Optional layout style overrides. */
  style?: StyleProp<ViewStyle>;
  /** Accessible label for screen readers. */
  accessibilityLabel?: string;
  /** Test identifier for automated testing. */
  testID?: string;
}

/**
 * Atomic skeleton building block with declarative breathing opacity animation.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = Radius.sm,
  style,
  accessibilityLabel = 'Loading content...',
  testID = 'skeleton-block',
}: SkeletonProps) {
  const theme = useTheme();

  // Step 1: Initialize shared value for gentle pulsing opacity (0.35 -> 0.85)
  const opacity = useSharedValue(0.38);

  // Step 2: Kick off smooth infinite breathing animation loop
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.85, {
        duration: 850,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // infinite loop
      true // reverse direction on alternate cycles
    );

    return () => {
      cancelAnimation(opacity);
    };
  }, [opacity]);

  // Step 3: Map animated shared value to component style
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      testID={testID}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: true }}
      style={[
        styles.skeletonBase,
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.backgroundSelected,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

// ============================================================================
// 2. Convenience Skeleton Line (Text placeholder)
// ============================================================================

export interface SkeletonLineProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Text line skeleton primitive with rounded pill/sm borders.
 */
export function SkeletonLine({
  width = '100%',
  height = 14,
  borderRadius = Radius.sm,
  style,
  accessibilityLabel = 'Loading text...',
}: SkeletonLineProps) {
  return (
    <Skeleton
      width={width}
      height={height}
      borderRadius={borderRadius}
      accessibilityLabel={accessibilityLabel}
      style={style}
    />
  );
}

// ============================================================================
// 3. Card-Shaped Skeleton Container
// ============================================================================

export interface SkeletonCardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Container card mimicking Knightly `Card` dimensions with subtle theme borders.
 */
export function SkeletonCard({
  children,
  style,
  testID = 'skeleton-card',
}: SkeletonCardProps) {
  const theme = useTheme();

  return (
    <View
      testID={testID}
      style={[
        styles.cardContainer,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ============================================================================
// 4. Post Card Skeleton (Announcement Flyer Placeholder)
// ============================================================================

export interface PostCardSkeletonProps {
  showHeroImage?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Specialized skeleton simulating the layout structure of a `PostCard`:
 * - Header row: Avatar circle (36px), organization name line, category pill badge
 * - Optional hero banner / image block (140px)
 * - Headline (bold title lines)
 * - Logistics / Venue date line
 * - Description preview lines
 * - Footer: timestamp badge and bookmark action
 */
export function PostCardSkeleton({
  showHeroImage = true,
  style,
}: PostCardSkeletonProps) {
  return (
    <SkeletonCard style={[styles.postCardSpacing, style]} testID="post-card-skeleton">
      {/* Header: Club avatar mark, Org Name, Category chip */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Skeleton
            width={36}
            height={36}
            borderRadius={Radius.pill}
            accessibilityLabel="Loading author mark..."
          />
          <View style={styles.headerTitles}>
            <SkeletonLine width={110} height={13} />
            <SkeletonLine width={70} height={10} style={styles.marginTopXs} />
          </View>
        </View>
        <Skeleton width={64} height={20} borderRadius={Radius.pill} />
      </View>

      {/* Hero Image Banner Placeholder */}
      {showHeroImage && (
        <Skeleton
          width="100%"
          height={140}
          borderRadius={Radius.md}
          style={styles.heroPlaceholder}
          accessibilityLabel="Loading event image..."
        />
      )}

      {/* Headline & Body Details */}
      <View style={styles.bodySection}>
        <SkeletonLine width="88%" height={17} borderRadius={Radius.sm} />
        <SkeletonLine width="60%" height={17} borderRadius={Radius.sm} style={styles.marginTopXs} />

        {/* Date / Logistics Row */}
        <View style={styles.logisticsRow}>
          <Skeleton width={14} height={14} borderRadius={Radius.pill} />
          <SkeletonLine width="50%" height={12} />
        </View>

        {/* Multi-line Description Body */}
        <View style={styles.descriptionLines}>
          <SkeletonLine width="98%" height={11} />
          <SkeletonLine width="92%" height={11} style={styles.marginTopXs} />
          <SkeletonLine width="75%" height={11} style={styles.marginTopXs} />
        </View>
      </View>

      {/* Footer: Date Stamp & Bookmark Icon */}
      <View style={styles.footerRow}>
        <SkeletonLine width={80} height={10} />
        <Skeleton width={20} height={20} borderRadius={Radius.pill} />
      </View>
    </SkeletonCard>
  );
}

// ============================================================================
// 5. Feed Loading Skeleton (Multi-Card / Grid Layout)
// ============================================================================

export interface FeedLoadingSkeletonProps {
  /** Total number of placeholder cards to render. Defaults to 3 on mobile, 6 on web. */
  count?: number;
  /** Responsive column count (1 for mobile handheld, 2-3 for desktop grid). */
  numColumns?: number;
  /** Container style overrides. */
  style?: StyleProp<ViewStyle>;
}

/**
 * Screen-level skeleton renderer displaying animated placeholder post cards
 * across responsive mobile and desktop grid breakpoints.
 */
export function FeedLoadingSkeleton({
  count = 3,
  numColumns = 1,
  style,
}: FeedLoadingSkeletonProps) {
  // Step 1: Generate an array of placeholder card elements
  const items = Array.from({ length: count }, (_, index) => index);

  // Step 2: When single-column (mobile), render simple vertical stack
  if (numColumns <= 1) {
    return (
      <View
        testID="feed-loading-skeleton"
        accessible={true}
        accessibilityRole="progressbar"
        accessibilityLabel="Loading campus announcements..."
        accessibilityState={{ busy: true }}
        style={[styles.feedContainer, style]}
      >
        {items.map((key, idx) => (
          <View key={`skeleton-item-${key}`} style={styles.mobileCardWrapper}>
            <PostCardSkeleton showHeroImage={idx % 2 === 0} />
          </View>
        ))}
      </View>
    );
  }

  // Step 3: When multi-column (web), partition items into balanced rows of `numColumns`
  const rows: number[][] = [];
  for (let i = 0; i < items.length; i += numColumns) {
    rows.push(items.slice(i, i + numColumns));
  }

  return (
    <View
      testID="feed-loading-skeleton"
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading campus announcements..."
      accessibilityState={{ busy: true }}
      style={[styles.feedContainer, style]}
    >
      {rows.map((row, rowIdx) => (
        <View key={`skeleton-grid-row-${rowIdx}`} style={styles.gridRow}>
          {row.map((itemKey, colIdx) => (
            <View key={`grid-item-${itemKey}`} style={styles.gridCell}>
              <PostCardSkeleton showHeroImage={(rowIdx + colIdx) % 2 === 0} />
            </View>
          ))}
          {/* Pad trailing cells in incomplete rows to keep equal cell widths */}
          {row.length < numColumns &&
            Array.from({ length: numColumns - row.length }).map((_, padIdx) => (
              <View key={`grid-pad-${rowIdx}-${padIdx}`} style={styles.gridCell} />
            ))}
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// 6. Styles
// ============================================================================

const styles = StyleSheet.create({
  skeletonBase: {
    overflow: 'hidden',
  },
  cardContainer: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    overflow: 'hidden',
  },
  postCardSpacing: {
    gap: Spacing.two + 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerTitles: {
    justifyContent: 'center',
  },
  heroPlaceholder: {
    marginVertical: Spacing.half,
  },
  bodySection: {
    gap: Spacing.one + 2,
  },
  logisticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    marginVertical: 2,
  },
  descriptionLines: {
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.one,
  },
  marginTopXs: {
    marginTop: 4,
  },
  feedContainer: {
    width: '100%',
    gap: Spacing.three,
  },
  mobileCardWrapper: {
    width: '100%',
  },
  gridRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    width: '100%',
    alignItems: 'stretch',
  },
  gridCell: {
    flex: 1,
  },
});
