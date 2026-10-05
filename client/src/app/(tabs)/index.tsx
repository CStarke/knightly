/**
 * Campus Feed Home Screen (Slot 0)
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * This is the primary landing screen for Knightly (`/`). It presents an aggregated,
 * reverse-chronological timeline of campus happenings, student organization meetings,
 * and university announcements.
 *
 * MINIMUM-CLICKS FILTERING & EVEN GRID PHILOSOPHY:
 * 1. Even Grid Rows: Posts are grouped into strictly uniform rows (2 columns on mobile/tablet,
 *    3 columns on desktop web) with identical cell widths, equal stretch heights, and alignment spacers.
 * 2. 1-Click Unified Filters: Eliminates nested tabs and extra submenus. Feed scope ("All", "★ Following")
 *    and interest categories ("Athletics", "Academics", "Faith", etc.) are merged into a single-tier
 *    filter strip where every action takes exactly 1 click.
 * 3. 0-Click Instant Search: Permanent top search field activates live keyword filtering on keystroke,
 *    with a 1-click clear button.
 * 4. Server-Authoritative Timestamps: All filtered posts are strictly sorted by server-assigned
 *    creation times in descending order.
 */

import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { PostCard } from "@/components/post-card";
import { ThemedText } from "@/components/themed-text";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/search-field";
import { Brand, Radius, Spacing } from "@/constants/theme";
import { useClubFollow } from "@/context/club-follow-context";
import { useClubsNavigation } from "@/context/clubs-navigation-context";
import { useFeed } from "@/context/feed-context";
import {
  feedCategories,
  sortPostsByDate,
  type FeedCategory,
  type Post,
} from "@/data/feed";

/**
 * Filter options combining feed scopes ("All", "Following") and categories in a single tier.
 */
type FeedFilterOption = "All" | "Following" | FeedCategory;

const allFilterOptions: FeedFilterOption[] = [
  "All",
  "Following",
  ...feedCategories,
];

/**
 * Primary Campus Feed screen component.
 *
 * WHAT IT DOES:
 * - Provides live search and single-click filter selection across all campus events and followed clubs.
 * - Filters and sorts posts newest-first using server-authoritative timestamps.
 * - Renders an even, balanced multi-column grid where cards align in uniform rows.
 */
export default function FeedScreen() {
  const { width } = useWindowDimensions();
  const [selectedFilters, setSelectedFilters] = useState<Set<FeedFilterOption>>(new Set(["All"]));
  const [query, setQuery] = useState("");
  const { posts: dynamicPosts } = useFeed();
  const { isFollowing, followedCount } = useClubFollow();
  const { openClubsDirectory } = useClubsNavigation();

  // Step 1: Responsive Even Grid Column Count
  // WHY 2-3 EVEN COLUMNS:
  // - Desktop Web (width >= 900): 3 even columns
  // - Mobile & Tablet (width < 900): 2 even columns
  const numColumns = width >= 900 ? 3 : 2;

  // Step 2: Multi-Selection Filter Toggle Logic
  // WHY "ALL" IS MUTUALLY EXCLUSIVE:
  // Selecting "All" implies no category restrictions; choosing any specific category
  // narrows the view, so "All" is automatically cleared. Conversely, selecting "All"
  // clears all specific filters. Deselecting the last active filter defaults back to "All".
  const toggleFilter = (option: FeedFilterOption) => {
    if (option === "All") {
      setSelectedFilters(new Set(["All"]));
      return;
    }

    setSelectedFilters((prev) => {
      const next = new Set(prev);
      next.delete("All");

      if (next.has(option)) {
        next.delete(option);
      } else {
        next.add(option);
      }

      if (next.size === 0) {
        return new Set(["All"]);
      }
      return next;
    });
  };

  // Step 3: Multi-Select Filtering Pipeline
  // WHAT IT DOES:
  // Evaluates post criteria against active multi-selected filters and search text.
  // When multiple categories are selected, posts matching ANY of the active categories are returned.
  // When "Following" is selected alongside categories, posts must also be from a followed club (or campusWide).
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const isAll = selectedFilters.has("All");
    const hasFollowing = selectedFilters.has("Following");
    const selectedCategories = Array.from(selectedFilters).filter(
      (opt): opt is FeedCategory => opt !== "All" && opt !== "Following"
    );

    const filtered = dynamicPosts.filter((post) => {
      // Sub-step A: Filter by Scope and Categories
      if (!isAll) {
        // If "Following" is selected, require campusWide or followed club affiliation
        if (hasFollowing) {
          const clubId = post.clubId ?? post.org.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          const matchesFollow = post.campusWide || isFollowing(clubId);
          if (!matchesFollow) return false;
        }

        // If one or more categories are selected, post must match at least one
        if (selectedCategories.length > 0) {
          if (!selectedCategories.includes(post.category)) return false;
        }
      }

      // Sub-step B: Keyword search match
      if (needle.length > 0) {
        const matchesQuery =
          post.headline.toLowerCase().includes(needle) ||
          post.body.toLowerCase().includes(needle) ||
          post.org.toLowerCase().includes(needle) ||
          post.category.toLowerCase().includes(needle) ||
          (post.where ?? "").toLowerCase().includes(needle);
        if (!matchesQuery) return false;
      }

      return true;
    });

    // Sub-step C: Authoritative chronological sort
    return sortPostsByDate(filtered);
  }, [dynamicPosts, selectedFilters, query, isFollowing]);

  // Step 4: Chunk visible posts into even rows of `numColumns` items
  // WHY ROW CHUNKING FOR EVEN GRID:
  // Placing cards into horizontal flex rows ensures every card in a row has identical
  // width and height, preventing the staggered/jagged misalignment of masonry columns.
  const evenRows = useMemo(() => {
    const rows: Post[][] = [];
    for (let i = 0; i < visible.length; i += numColumns) {
      rows.push(visible.slice(i, i + numColumns));
    }
    return rows;
  }, [visible, numColumns]);

  const isFilterActive = query.trim().length > 0 || !selectedFilters.has("All");

  // Step 5: Reset handler
  const handleClear = () => {
    setQuery("");
    setSelectedFilters(new Set(["All"]));
  };

  return (
    <Screen style={styles.screenInner}>
      {/* ========================================================================= */}
      {/* MINIMUM-CLICKS FILTER CONTROLS                                            */}
      {/* ========================================================================= */}
      <View style={styles.filterSection}>
        {/* Step A: Always-Visible Search Bar (0 Clicks to use) */}
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={
            selectedFilters.has("Following") && !selectedFilters.has("All")
              ? "Search your followed clubs & campus alerts..."
              : "Search all events, clubs, locations..."
          }
        />

        {/* Step B: 1-Click Unified Filter Pills Row */}
        {width >= 720 ? (
          /* Desktop Web: Wrapped flex layout so all 14 filters are on screen at once */
          <View style={styles.desktopWrapRow}>
            {allFilterOptions.map((opt) => {
              const label =
                opt === "Following" ? `★ Following (${followedCount})` : opt;
              const selected = selectedFilters.has(opt);

              return (
                <Chip
                  key={opt}
                  label={label}
                  selected={selected}
                  onPress={() => toggleFilter(opt)}
                  tone="gold"
                />
              );
            })}

            {isFilterActive && (
              <Pressable
                onPress={handleClear}
                accessibilityRole="button"
                accessibilityLabel="Clear active filters"
                style={({ pressed }) => [styles.resetPill, pressed && styles.pressed]}
              >
                <Icon sf="xmark.circle.fill" md="cancel" size={13} color={Brand.brightRed} />
                <ThemedText style={styles.resetPillText}>Clear</ThemedText>
              </Pressable>
            )}
          </View>
        ) : (
          /* Mobile: Single horizontal scroll where All & Following are at index 0 & 1 */
          <View style={styles.mobileScrollContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mobileScrollContent}
            >
              {allFilterOptions.map((opt) => {
                const label =
                  opt === "Following" ? `★ Following (${followedCount})` : opt;
                const selected = selectedFilters.has(opt);

                return (
                  <Chip
                    key={opt}
                    label={label}
                    selected={selected}
                    onPress={() => toggleFilter(opt)}
                    tone="gold"
                  />
                );
              })}

              {isFilterActive && (
                <Pressable
                  onPress={handleClear}
                  accessibilityRole="button"
                  accessibilityLabel="Clear active filters"
                  style={({ pressed }) => [styles.resetPill, pressed && styles.pressed]}
                >
                  <Icon sf="xmark.circle.fill" md="cancel" size={13} color={Brand.brightRed} />
                  <ThemedText style={styles.resetPillText}>Clear</ThemedText>
                </Pressable>
              )}
            </ScrollView>
          </View>
        )}

        {/* Following context bar shown when Following filter is selected */}
        {selectedFilters.has("Following") && (
          <Pressable
            onPress={openClubsDirectory}
            accessibilityRole="button"
            accessibilityLabel={`Following ${followedCount} clubs. Tap to view and explore campus clubs.`}
            style={({ pressed }) => [styles.followingBar, pressed && styles.pressed]}
          >
            <Icon sf="star.fill" md="star" size={13} color={Brand.gold} />
            <ThemedText
              type="caption"
              themeColor="textMuted"
              numberOfLines={1}
              style={styles.followingCaption}
            >
              Following {followedCount} {followedCount === 1 ? "club" : "clubs"} · campus-wide events included (tap to browse clubs)
            </ThemedText>
          </Pressable>
        )}
      </View>

      {/* ========================================================================= */}
      {/* EVEN GRID ROWS LAYOUT                                                     */}
      {/* ========================================================================= */}
      <View style={styles.evenGrid}>
        {evenRows.map((row, rowIdx) => (
          <View key={`grid-row-${rowIdx}`} style={styles.evenGridRow}>
            {row.map((post) => (
              <View key={post.id} style={styles.evenGridCell}>
                <PostCard post={post} />
              </View>
            ))}

            {/* Invisible spacer cells for incomplete final row to preserve equal width */}
            {row.length < numColumns &&
              Array.from({ length: numColumns - row.length }).map((_, i) => (
                <View key={`spacer-${rowIdx}-${i}`} style={styles.evenGridCell} />
              ))}
          </View>
        ))}
      </View>

      {/* Empty State Card */}
      {visible.length === 0 ? (
        selectedFilters.has("Following") &&
        !selectedFilters.has("All") &&
        Array.from(selectedFilters).filter((o) => o !== "All" && o !== "Following").length === 0 &&
        !query.trim() ? (
          <Card style={styles.emptyCard}>
            <Icon sf="sparkles" md="auto_awesome" size={28} color={Brand.gold} />
            <ThemedText type="smallBold">No posts from your followed clubs</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptySub}>
              Follow campus clubs to see their upcoming events, workshops, and announcements here.
            </ThemedText>
            <Pressable
              onPress={openClubsDirectory}
              style={styles.emptyCta}
            >
              <ThemedText style={styles.emptyCtaText}>Browse Campus Clubs</ThemedText>
            </Pressable>
          </Card>
        ) : (
          <Card style={styles.emptyCard}>
            <Icon sf="magnifyingglass" md="search" size={26} color={Brand.gold} />
            <ThemedText type="smallBold">Nothing matches those filters</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptySub}>
              Try searching for a different keyword or select another category.
            </ThemedText>
            <Pressable
              onPress={handleClear}
              style={styles.emptyCta}
            >
              <ThemedText style={styles.emptyCtaText}>Clear Filters</ThemedText>
            </Pressable>
          </Card>
        )
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenInner: {
    maxWidth: 1200,
    width: "100%",
  },
  filterSection: {
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  desktopWrapRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one + 3,
    alignItems: "center",
    paddingVertical: Spacing.half,
  },
  mobileScrollContainer: {
    marginHorizontal: -Spacing.three,
  },
  mobileScrollContent: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.one + 2,
    alignItems: "center",
    paddingVertical: Spacing.half,
  },
  resetPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: "rgba(194, 0, 47, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(194, 0, 47, 0.25)",
  },
  resetPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: Brand.brightRed,
  },
  followingBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
  },
  followingCaption: {
    fontSize: 12,
  },
  evenGrid: {
    gap: Spacing.three,
    width: "100%",
  },
  evenGridRow: {
    flexDirection: "row",
    gap: Spacing.three,
    width: "100%",
    alignItems: "stretch",
  },
  evenGridCell: {
    flex: 1,
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.five,
    gap: Spacing.two,
  },
  emptySub: {
    textAlign: "center",
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
    color: "#0B0C0E",
    fontWeight: "700",
    fontSize: 13,
  },
  pressed: {
    opacity: 0.75,
  },
});

