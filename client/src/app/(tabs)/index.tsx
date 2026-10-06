/**
 * Campus Feed Home Screen (Slot 0)
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * This is the primary landing screen for Knightly (`/`). It presents an aggregated,
 * reverse-chronological timeline of campus happenings, student organization meetings,
 * and university announcements.
 *
 * MINIMUM-CLICKS FILTERING & RESPONSIVE FEED PHILOSOPHY:
 * 1. Mobile App Dedicated Scope Toggle & Category Chips: On the mobile app alone, the feed scope
 *    ("ALL CLUBS" vs "FOLLOWING") is elevated to a wide, prominent Segmented toggle above the category filters.
 *    The horizontal scrolling chip banner is styled to be less wide than the toggle bar and contains
 *    exclusively topic categories, cleanly decoupling audience scope from content filtering.
 * 2. Singular Column on Mobile Alone & Even Grid on Web: On the mobile app alone, the feed
 *    is strictly 1 singular column for optimal phone reading ergonomics and full-width card layout.
 *    On web, posts are grouped into uniform even rows (3 columns on desktop web, 2 columns on tablet/web)
 *    with identical cell widths, equal stretch heights, and alignment spacers.
 * 3. 0-Click Instant Search: Permanent top search field activates live keyword filtering on keystroke,
 *    with a 1-click clear button.
 * 4. Server-Authoritative Timestamps: All filtered posts are strictly sorted by server-assigned
 *    creation times in descending order.
 */

import { useMemo, useState, useDeferredValue } from "react";
import {
  Platform,
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
import { Screen, ScreenFlatList } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/search-field";
import { Brand, Radius, Spacing } from "@/constants/theme";
import { useClubFollow } from "@/context/club-follow-context";
import { useClubsNavigation } from "@/context/clubs-navigation-context";
import { useFeed } from "@/context/feed-context";
import {
  feedCategories,
  filterFeedPosts,
  resolveFeedColumnCount,
  type FeedCategory,
  type Post,
} from "@/data/feed";

/**
 * Filter options combining feed scopes ("All", "Following") and categories in a single tier (used for web).
 */
type FeedFilterOption = "All" | "Following" | FeedCategory;

const allFilterOptions: FeedFilterOption[] = [
  "All",
  "Following",
  ...feedCategories,
];

const mobileToggleOptions = ["Following", "All Campus"] as const;
type MobileScope = (typeof mobileToggleOptions)[number];

const mobileCategoryOptions: ("All" | FeedCategory)[] = [
  "All",
  ...feedCategories,
];

/**
 * Primary Campus Feed screen component.
 *
 * WHAT IT DOES:
 * - On Mobile: Elevates "Following" vs "All Campus" to an animated, wider Segmented toggle positioned directly
 *   above the category filter strip. Search bar is hidden on "Following" and pops up below the toggle on "All Campus".
 *   Category strip scrolls edge-to-edge with "All" as an active filter option.
 * - On Web: Preserves the unified single-tier filter pills row with 1-click multi-select.
 * - Filters and sorts posts newest-first using server-authoritative timestamps.
 * - Renders a singular column feed on the mobile app, and a balanced multi-column grid on web.
 */
export default function FeedScreen() {
  const { width } = useWindowDimensions();
  const isMobileApp = Platform.OS !== "web";

  // Web unified filter state ("All" | "Following" | specific categories)
  const [selectedFilters, setSelectedFilters] = useState<Set<FeedFilterOption>>(new Set(["All"]));

  // Mobile dedicated scope toggle ("Following" on left vs "All Campus" on right) and topic category filters
  const [mobileScope, setMobileScope] = useState<MobileScope>("Following");
  const [mobileCategories, setMobileCategories] = useState<Set<"All" | FeedCategory>>(new Set(["All"]));

  const [query, setQuery] = useState("");

  const deferredMobileScope = useDeferredValue(mobileScope);
  const deferredMobileCategories = useDeferredValue(mobileCategories);
  const deferredQuery = useDeferredValue(query);
  const deferredSelectedFilters = useDeferredValue(selectedFilters);

  const { posts: dynamicPosts } = useFeed();
  const { isFollowing, followedCount } = useClubFollow();
  const { openClubsDirectory } = useClubsNavigation();

  // Step 1: Responsive Column Count
  const numColumns = resolveFeedColumnCount(width, Platform.OS);

  // Step 2a: Web Multi-Selection Filter Toggle Logic
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

  // Step 2b: Mobile Scope Change Handler
  const handleMobileScopeChange = (nextScope: MobileScope) => {
    setMobileScope(nextScope);
    // When switching to "Following", clear search text so hidden search does not filter posts
    if (nextScope === "Following") {
      setQuery("");
    }
  };

  // Step 2c: Mobile Category Filter Toggle Logic
  const toggleMobileCategory = (cat: "All" | FeedCategory) => {
    if (cat === "All") {
      setMobileCategories(new Set(["All"]));
      return;
    }

    setMobileCategories((prev) => {
      const next = new Set(prev);
      next.delete("All");
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      if (next.size === 0) {
        return new Set(["All"]);
      }
      return next;
    });
  };

  // Step 3: Filtering Pipeline
  const visible = useMemo(() => {
    if (isMobileApp) {
      const activeCats = deferredMobileCategories.has("All")
        ? []
        : Array.from(deferredMobileCategories).filter((c): c is FeedCategory => c !== "All");

      return filterFeedPosts(dynamicPosts, {
        scope: deferredMobileScope,
        categories: activeCats,
        query: deferredMobileScope === "All Campus" ? deferredQuery : "",
        isFollowing,
      });
    }

    // Web filtering logic
    const webScope = deferredSelectedFilters.has("Following") ? "Following" : "All";
    const webCategories = deferredSelectedFilters.has("All")
      ? []
      : Array.from(deferredSelectedFilters).filter(
          (opt): opt is FeedCategory => opt !== "All" && opt !== "Following"
        );

    return filterFeedPosts(dynamicPosts, {
      scope: webScope,
      categories: webCategories,
      query: deferredQuery,
      isFollowing,
    });
  }, [dynamicPosts, isMobileApp, deferredMobileScope, deferredMobileCategories, deferredSelectedFilters, deferredQuery, isFollowing]);

  // Step 4: Chunk visible posts into even rows of `numColumns` items
  const evenRows = useMemo(() => {
    const rows: Post[][] = [];
    for (let i = 0; i < visible.length; i += numColumns) {
      rows.push(visible.slice(i, i + numColumns));
    }
    return rows;
  }, [visible, numColumns]);

  const isFilterActive = isMobileApp
    ? (mobileScope === "All Campus" && query.trim().length > 0) ||
      (mobileCategories.size > 0 && !mobileCategories.has("All"))
    : query.trim().length > 0 || !selectedFilters.has("All");

  // Step 5: Reset handler
  const handleClear = () => {
    setQuery("");
    if (isMobileApp) {
      setMobileCategories(new Set(["All"]));
    } else {
      setSelectedFilters(new Set(["All"]));
    }
  };

  const listHeader = (
    <View style={styles.filterSection}>
      {isMobileApp ? (
        <>
          <View style={styles.mobileToggleWrapper}>
            <Segmented
              options={mobileToggleOptions}
              value={mobileScope}
              onChange={handleMobileScopeChange}
            />
          </View>

          {mobileScope === "All Campus" && (
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder="Search all events, clubs, locations..."
            />
          )}

          <View style={styles.mobileFiltersBanner}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mobileFiltersContent}
            >
              {mobileCategoryOptions.map((cat) => {
                const selected =
                  cat === "All"
                    ? mobileCategories.size === 0 || mobileCategories.has("All")
                    : mobileCategories.has(cat) && !mobileCategories.has("All");
                return (
                  <Chip
                    key={cat}
                    label={cat}
                    selected={selected}
                    onPress={() => toggleMobileCategory(cat)}
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

          {mobileScope === "Following" && (
            <Pressable
              onPress={openClubsDirectory}
              accessibilityRole="button"
              accessibilityLabel={`Following ${followedCount} clubs. Campus-wide events included.`}
              style={({ pressed }) => [styles.followingBar, pressed && styles.pressed]}
            >
              <ThemedText
                type="caption"
                themeColor="textMuted"
                numberOfLines={1}
                style={styles.followingCaption}
              >
                Following {followedCount} {followedCount === 1 ? "club" : "clubs"} · campus-wide events included
              </ThemedText>
            </Pressable>
          )}
        </>
      ) : (
        <>
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder={
              selectedFilters.has("Following") && !selectedFilters.has("All")
                ? "Search your followed clubs & campus alerts..."
                : "Search all events, clubs, locations..."
            }
          />

          {width >= 720 ? (
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
        </>
      )}
    </View>
  );

  const listEmpty = (
    <View style={[styles.screenInner, isMobileApp && styles.mobileEmptyContainer]}>
      {visible.length === 0 ? (
        (isMobileApp
          ? deferredMobileScope === "Following" && (deferredMobileCategories.size === 0 || deferredMobileCategories.has("All")) && !deferredQuery.trim()
          : deferredSelectedFilters.has("Following") &&
            !deferredSelectedFilters.has("All") &&
            Array.from(deferredSelectedFilters).filter((o) => o !== "All" && o !== "Following").length === 0 &&
            !deferredQuery.trim()
        ) ? (
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
    </View>
  );

  if (isMobileApp) {
    return (
      <ScreenFlatList
        style={styles.screenInner}
        data={evenRows}
        keyExtractor={(_, rowIdx) => `grid-row-${rowIdx}`}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={true}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        renderItem={({ item: row, index: rowIdx }) => (
          <View style={[styles.evenGridRow, styles.mobileCardRow]}>
            {row.map((post) => (
              <View key={post.id} style={styles.evenGridCell}>
                <PostCard post={post} />
              </View>
            ))}
          </View>
        )}
      />
    );
  }

  // Web Layout (Scroll View)
  return (
    <Screen style={styles.screenInner}>
      {listHeader}
      <View style={styles.evenGrid}>
        {evenRows.map((row, rowIdx) => (
          <View key={`grid-row-${rowIdx}`} style={styles.evenGridRow}>
            {row.map((post) => (
              <View key={post.id} style={styles.evenGridCell}>
                <PostCard post={post} />
              </View>
            ))}
            {row.length < numColumns &&
              Array.from({ length: numColumns - row.length }).map((_, i) => (
                <View key={`spacer-${rowIdx}-${i}`} style={styles.evenGridCell} />
              ))}
          </View>
        ))}
      </View>
      {listEmpty}
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
  mobileToggleWrapper: {
    marginHorizontal: -Spacing.two - 2,
    alignSelf: "stretch",
  },
  mobileFiltersBanner: {
    marginHorizontal: -Spacing.three,
  },
  mobileFiltersContent: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.one + 2,
    alignItems: "center",
    paddingVertical: Spacing.half,
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
  mobileCardRow: {
    // Step: Mobile screen margin for feed posts
    // WHY HORIZONTAL MARGIN ON MOBILE POSTS:
    // Cards feature rounded corners (Radius.lg). Applying Spacing.three (16px) horizontal padding
    // provides clean breathing room from the device display edges, aligns the card boundaries with
    // the top search field, and prevents full-bleed border clipping on handheld screens.
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.three,
    alignSelf: "center",
    maxWidth: 1200,
  },
  mobileEmptyContainer: {
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.75,
  },
});
