/**
 * Feed Shared Controls & Filtering Templates
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Consolidated template-level controls for both FeedMobileView and FeedWebView
 * (AGENTS.md Rule 4.5). Unifies search inputs, category filter strips/chips,
 * scope toggles, following banners, and empty state cards.
 *
 * CONSOLIDATION GUARANTEES:
 * 1. Single Source of Truth for Feed Search placeholder copy and styling.
 * 2. Unified Category Filter layout supporting horizontal scrolling (mobile)
 *    and fluid wrapping rows (desktop web).
 * 3. Consistent Filter Reset pill ("Clear") with Calvin Bright Red tone.
 * 4. Zero duplicate styling or markup drift between mobile and desktop views.
 */

import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { SearchField } from '@/components/ui/search-field';
import { Brand, Radius, Spacing } from '@/constants/theme';

// ============================================================================
// 1. Feed Search Placeholder Constants & Helper
// ============================================================================

export const DEFAULT_FEED_SEARCH_PLACEHOLDER =
  'Search all events, clubs, locations...';

export const FOLLOWING_FEED_SEARCH_PLACEHOLDER =
  'Search your followed clubs & campus alerts...';

/**
 * Returns the contextual placeholder string based on active feed scope.
 */
export function getFeedSearchPlaceholder(isFollowingScope: boolean = false): string {
  return isFollowingScope
    ? FOLLOWING_FEED_SEARCH_PLACEHOLDER
    : DEFAULT_FEED_SEARCH_PLACEHOLDER;
}

// ============================================================================
// 2. Feed Search Field Component
// ============================================================================

export interface FeedSearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  /** When true, adapts the placeholder to emphasize followed clubs & campus alerts */
  isFollowingScope?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

/**
 * Standardized search input for the Campus Feed with context-aware placeholder.
 */
export function FeedSearchField({
  value,
  onChangeText,
  isFollowingScope = false,
  placeholder,
  autoFocus = false,
}: FeedSearchFieldProps) {
  const resolvedPlaceholder =
    placeholder ?? getFeedSearchPlaceholder(isFollowingScope);

  return (
    <SearchField
      value={value}
      onChangeText={onChangeText}
      placeholder={resolvedPlaceholder}
      autoFocus={autoFocus}
    />
  );
}

// ============================================================================
// 3. Feed Clear Pill Component
// ============================================================================

export interface FeedClearPillProps {
  onClear: () => void;
  label?: string;
}

/**
 * Active filter reset pill button with bright red cancel icon.
 */
export function FeedClearPill({
  onClear,
  label = 'Clear',
}: FeedClearPillProps) {
  return (
    <Pressable
      onPress={onClear}
      accessibilityRole="button"
      accessibilityLabel="Clear active filters"
      style={({ pressed }) => [styles.resetPill, pressed && styles.pressed]}
    >
      <Icon sf="xmark.circle.fill" md="cancel" size={13} color={Brand.brightRed} />
      <ThemedText style={styles.resetPillText}>{label}</ThemedText>
    </Pressable>
  );
}

// ============================================================================
// 5. Feed Filter Chips Section Component
// ============================================================================

export interface FeedChipOptionItem {
  key: string;
  label: string;
  selected: boolean;
}

export interface FeedFilterChipsProps {
  options: FeedChipOptionItem[];
  onSelectOption: (key: string) => void;
  isFilterActive: boolean;
  onClear: () => void;
  /** When true, wraps chips into fluid rows for desktop web; otherwise scrolls horizontally */
  wrap?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Unified category & scope chip strip with integrated filter reset pill.
 */
export function FeedFilterChips({
  options,
  onSelectOption,
  isFilterActive,
  onClear,
  wrap = false,
  containerStyle,
}: FeedFilterChipsProps) {
  if (wrap) {
    return (
      <View style={[styles.desktopWrapRow, containerStyle]}>
        {options.map((opt) => (
          <Chip
            key={opt.key}
            label={opt.label}
            selected={opt.selected}
            onPress={() => onSelectOption(opt.key)}
            tone="gold"
          />
        ))}

        {isFilterActive && <FeedClearPill onClear={onClear} />}
      </View>
    );
  }

  return (
    <View style={[styles.mobileScrollContainer, containerStyle]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.mobileScrollContent}
      >
        {options.map((opt) => (
          <Chip
            key={opt.key}
            label={opt.label}
            selected={opt.selected}
            onPress={() => onSelectOption(opt.key)}
            tone="gold"
          />
        ))}

        {isFilterActive && <FeedClearPill onClear={onClear} />}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// 6. Feed Following Banner Component
// ============================================================================

export interface FeedFollowingBannerProps {
  followedCount: number;
  onPress: () => void;
  showStar?: boolean;
  interactiveHint?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Explanatory status banner indicating followed clubs count and campus inclusion.
 */
export function FeedFollowingBanner({
  followedCount,
  onPress,
  showStar = false,
  interactiveHint = false,
  style,
}: FeedFollowingBannerProps) {
  const clubNoun = followedCount === 1 ? 'club' : 'clubs';
  const accessibilityLabel = `Following ${followedCount} ${clubNoun}. ${
    interactiveHint
      ? 'Tap to view and explore campus clubs.'
      : 'Campus-wide events included.'
  }`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.followingBar, pressed && styles.pressed, style]}
    >
      {showStar && <Icon sf="star.fill" md="star" size={13} color={Brand.gold} />}
      <ThemedText
        type="caption"
        themeColor="textMuted"
        numberOfLines={1}
        style={styles.followingCaption}
      >
        Following {followedCount} {clubNoun} · campus-wide events included
        {interactiveHint ? ' (tap to browse clubs)' : ''}
      </ThemedText>
    </Pressable>
  );
}

// ============================================================================
// 7. Feed Empty State Component
// ============================================================================

export type FeedEmptyStateType = 'no-following-posts' | 'no-filter-matches';

export interface FeedEmptyStateProps {
  type: FeedEmptyStateType;
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  onBrowseClubs?: () => void;
  onClearFilters?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Standardized empty state card for campus feed views.
 */
export function FeedEmptyState({
  type,
  title,
  subtitle,
  buttonLabel,
  onBrowseClubs,
  onClearFilters,
  style,
}: FeedEmptyStateProps) {
  if (type === 'no-following-posts') {
    return (
      <Card style={[styles.emptyCard, style]}>
        <Icon sf="sparkles" md="auto_awesome" size={28} color={Brand.gold} />
        <ThemedText type="smallBold">{title ?? 'No posts from your followed clubs'}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.emptySub}>
          {subtitle ?? 'Follow campus clubs to see their upcoming events, workshops, and announcements here.'}
        </ThemedText>
        {onBrowseClubs && (
          <Pressable onPress={onBrowseClubs} style={styles.emptyCta}>
            <ThemedText style={styles.emptyCtaText}>{buttonLabel ?? 'Browse Campus Clubs'}</ThemedText>
          </Pressable>
        )}
      </Card>
    );
  }

  return (
    <Card style={[styles.emptyCard, style]}>
      <Icon sf="magnifyingglass" md="search" size={26} color={Brand.gold} />
      <ThemedText type="smallBold">{title ?? 'Nothing matches those filters'}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.emptySub}>
        {subtitle ?? 'Try searching for a different keyword or select another category.'}
      </ThemedText>
      {onClearFilters && (
        <Pressable onPress={onClearFilters} style={styles.emptyCta}>
          <ThemedText style={styles.emptyCtaText}>{buttonLabel ?? 'Clear Filters'}</ThemedText>
        </Pressable>
      )}
    </Card>
  );
}

// ============================================================================
// 8. Shared Styles
// ============================================================================

const styles = StyleSheet.create({
  desktopWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 3,
    alignItems: 'center',
    paddingVertical: Spacing.half,
  },
  mobileScrollContainer: {
    marginHorizontal: -Spacing.three,
  },
  mobileScrollContent: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.one + 2,
    alignItems: 'center',
    paddingVertical: Spacing.half,
  },
  resetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(194, 0, 47, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(194, 0, 47, 0.25)',
  },
  resetPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.brightRed,
  },
  followingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  followingCaption: {
    fontSize: 12,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five,
    gap: Spacing.two,
  },
  emptySub: {
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  emptyCta: {
    marginTop: Spacing.two,
    backgroundColor: Brand.gold,
    paddingHorizontal: Spacing.three,
    paddingVertical: 9,
    borderRadius: Radius.pill,
  },
  emptyCtaText: {
    color: '#0B0C0E',
    fontWeight: '700',
    fontSize: 13,
  },
  pressed: {
    opacity: 0.75,
  },
});
