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
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import {
  FeedEmptyState,
  FeedFilterChips,
  FeedFollowingBanner,
  FeedSearchField,
} from "@/components/feed-controls";
import { PostCard } from "@/components/post-card";
import { Screen } from "@/components/ui/screen";
import { Spacing } from "@/constants/theme";
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
type FeedFilterOption = "All" | "Following" | "Favorites" | FeedCategory;

const allFilterOptions: FeedFilterOption[] = [
  "All",
  "Following",
  "Favorites",
  ...feedCategories,
];

export function FeedWebView() {
  const { width } = useWindowDimensions();

  // Web unified filter state ("All" | "Following" | "Favorites" | specific categories)
  const [selectedFilters, setSelectedFilters] = useState<Set<FeedFilterOption>>(new Set(["All"]));
  const [query, setQuery] = useState("");

  const deferredSelectedFilters = useDeferredValue(selectedFilters);
  const deferredQuery = useDeferredValue(query);

  const { posts: dynamicPosts, favoritePosts } = useFeed();
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
    const isFavorites = deferredSelectedFilters.has("Favorites");
    const webScope = deferredSelectedFilters.has("Following") ? "Following" : "All";
    const webCategories = deferredSelectedFilters.has("All")
      ? []
      : Array.from(deferredSelectedFilters).filter(
          (opt): opt is FeedCategory => opt !== "All" && opt !== "Following" && opt !== "Favorites"
        );

    return filterFeedPosts(isFavorites ? (favoritePosts ?? []) : dynamicPosts, {
      scope: isFavorites ? "All" : webScope,
      categories: webCategories,
      query: deferredQuery,
      isFollowing,
    });
  }, [dynamicPosts, favoritePosts, deferredSelectedFilters, deferredQuery, isFollowing]);

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
      <FeedSearchField
        value={query}
        onChangeText={setQuery}
        isFollowingScope={selectedFilters.has("Following") && !selectedFilters.has("All")}
      />

      <FeedFilterChips
        options={allFilterOptions.map((opt) => ({
          key: opt,
          label: opt === "Following" ? `★ Following (${followedCount})` : opt,
          selected: selectedFilters.has(opt),
        }))}
        onSelectOption={(key) => toggleFilter(key as FeedFilterOption)}
        isFilterActive={isFilterActive}
        onClear={handleClear}
        wrap={width >= 720}
      />

      {selectedFilters.has("Following") && (
        <FeedFollowingBanner
          followedCount={followedCount}
          onPress={openClubsDirectory}
          showStar={true}
          interactiveHint={true}
        />
      )}
    </View>
  );

  const isNoFollowingPosts =
    deferredSelectedFilters.has("Following") &&
    !deferredSelectedFilters.has("All") &&
    Array.from(deferredSelectedFilters).filter((o) => o !== "All" && o !== "Following").length === 0 &&
    !deferredQuery.trim();

  const listEmpty = visible.length === 0 ? (
    <View style={styles.screenInner}>
      <FeedEmptyState
        type={isNoFollowingPosts ? "no-following-posts" : "no-filter-matches"}
        onBrowseClubs={openClubsDirectory}
        onClearFilters={handleClear}
      />
    </View>
  ) : null;

  // Dynamically expand container maxWidth on wide and extra-wide/ultrawide displays
  // so 4 and 5 columns retain comfortable ~320-350px card breathing room
  const maxContentWidth = numColumns >= 5 ? 1880 : numColumns >= 4 ? 1520 : 1200;

  return (
    <Screen style={[styles.screenInner, { maxWidth: maxContentWidth }]}>
      {listHeader}
      <View style={styles.evenGrid}>
        {evenRows.map((row, rowIdx) => (
          <View key={`grid-row-${rowIdx}`} style={styles.evenGridRow}>
            {row.map((post) => (
              <View key={post.id} style={styles.evenGridCell}>
                <PostCard post={post} variant="grid" />
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
});
