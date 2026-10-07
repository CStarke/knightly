/**
 * Campus Feed Web View Component
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Dedicated desktop and widescreen web feed presentation extracted from (tabs)/index.tsx
 * to eliminate monolithic cross-platform entanglement (AGENTS.md Rule 4.3).
 *
 * DESKTOP WEB GRID INVARIANTS:
 * 1. Unified Single-Tier Filter Bar: All scopes and categories accessible in a single wrapping row.
 * 2. Multi-Column Balanced Layout: 3 columns on wide desktop (>=1024px), 2 columns on tablet/laptop.
 * 3. Equal-Height Stretched Cells: Grid rows with equal flex distribution and trailing spacer cells
 *    prevent orphan items from stretching across the entire width.
 * 4. 0-Click Instant Search: Live keyword filtering across all campus events.
 */

import { useDeferredValue, useMemo, useState } from "react";
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
  filterFeedPosts,
  resolveFeedColumnCount,
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

export function FeedWebView() {
  const { width } = useWindowDimensions();

  // Web unified filter state ("All" | "Following" | specific categories)
  const [selectedFilters, setSelectedFilters] = useState<Set<FeedFilterOption>>(new Set(["All"]));
  const [query, setQuery] = useState("");

  const deferredSelectedFilters = useDeferredValue(selectedFilters);
  const deferredQuery = useDeferredValue(query);

  const { posts: dynamicPosts } = useFeed();
  const { isFollowing, followedCount } = useClubFollow();
  const { openClubsDirectory } = useClubsNavigation();

  // Step 1: Responsive Column Count (Web grid)
  const numColumns = resolveFeedColumnCount(width, "web");

  // Step 2: Web Multi-Selection Filter Toggle Logic
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

  // Step 3: Filtering Pipeline
  const visible = useMemo(() => {
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
  }, [dynamicPosts, deferredSelectedFilters, deferredQuery, isFollowing]);

  // Step 4: Chunk visible posts into even rows of `numColumns` items
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

  const listHeader = (
    <View style={styles.filterSection}>
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
    </View>
  );

  const listEmpty = visible.length === 0 ? (
    <View style={styles.screenInner}>
      {deferredSelectedFilters.has("Following") &&
      !deferredSelectedFilters.has("All") &&
      Array.from(deferredSelectedFilters).filter((o) => o !== "All" && o !== "Following").length === 0 &&
      !deferredQuery.trim() ? (
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
      )}
    </View>
  ) : null;

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
    alignSelf: "center",
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
