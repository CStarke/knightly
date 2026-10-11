/**
 * Campus Feed Mobile View Component
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Dedicated mobile feed presentation extracted from (tabs)/index.tsx to eliminate
 * monolithic cross-platform entanglement and prevent web styling regressions on mobile.
 *
 * MOBILE ERGONOMIC INVARIANTS:
 * 1. Dedicated Scope Toggle: "Following" on left vs "All Campus" on right.
 * 2. 0-Click Search Field: Contextually revealed on "All Campus", hidden on "Following".
 * 3. Edge-to-Edge Category Chips: Horizontal scrolling strip with "All" reset option.
 * 4. Singular Full-Width Column: Optimized for handheld portrait reading.
 * 5. High-Performance Virtualization: Uses ScreenFlatList with useDeferredValue for 60fps toggling.
 */

import { useDeferredValue, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  FeedEmptyState,
  FeedFilterChips,
  FeedFollowingBanner,
  FeedSearchField,
} from "@/components/feed-controls";
import { PostCard } from "@/components/post-card";
import { ScreenFlatList } from "@/components/ui/screen";
import { Segmented } from "@/components/ui/segmented";
import { Spacing } from "@/constants/theme";
import { useClubFollow } from "@/context/club-follow-context";
import { useClubsNavigation } from "@/context/clubs-navigation-context";
import { useFeed } from "@/context/feed-context";
import {
  feedCategories,
  filterFeedPosts,
  type FeedCategory,
  type Post,
} from "@/data/feed";

const mobileToggleOptions = ["Following", "All Campus"] as const;
type MobileScope = (typeof mobileToggleOptions)[number];

const mobileCategoryOptions: ("All" | FeedCategory)[] = [
  "All",
  ...feedCategories,
];

export function FeedMobileView() {
  const [mobileScope, setMobileScope] = useState<MobileScope>("Following");
  const [mobileCategories, setMobileCategories] = useState<Set<"All" | FeedCategory>>(new Set(["All"]));
  const [query, setQuery] = useState("");

  const deferredMobileScope = useDeferredValue(mobileScope);
  const deferredMobileCategories = useDeferredValue(mobileCategories);
  const deferredQuery = useDeferredValue(query);

  const { posts: dynamicPosts } = useFeed();
  const { isFollowing, followedCount } = useClubFollow();
  const { openClubsDirectory } = useClubsNavigation();

  // Scope Toggle Handler
  const handleMobileScopeChange = (nextScope: MobileScope) => {
    setMobileScope(nextScope);
    // When switching to "Following", clear search text so hidden search does not filter posts
    if (nextScope === "Following") {
      setQuery("");
    }
  };

  // Category Filter Toggle Handler
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

  // Filtering Pipeline
  const visible = useMemo(() => {
    const activeCats = deferredMobileCategories.has("All")
      ? []
      : Array.from(deferredMobileCategories).filter((c): c is FeedCategory => c !== "All");

    return filterFeedPosts(dynamicPosts, {
      scope: deferredMobileScope,
      categories: activeCats,
      query: deferredMobileScope === "All Campus" ? deferredQuery : "",
      isFollowing,
    });
  }, [dynamicPosts, deferredMobileScope, deferredMobileCategories, deferredQuery, isFollowing]);

  const isFilterActive =
    (mobileScope === "All Campus" && query.trim().length > 0) ||
    (mobileCategories.size > 0 && !mobileCategories.has("All"));

  const handleClear = () => {
    setQuery("");
    setMobileCategories(new Set(["All"]));
  };

  // List Header Component
  const listHeader = (
    <View style={styles.filterSection}>
      <View style={styles.mobileToggleWrapper}>
        <Segmented
          options={mobileToggleOptions}
          value={mobileScope}
          onChange={handleMobileScopeChange}
        />
      </View>

      {mobileScope === "All Campus" && (
        <FeedSearchField
          value={query}
          onChangeText={setQuery}
        />
      )}

      <FeedFilterChips
        options={mobileCategoryOptions.map((cat) => ({
          key: cat,
          label: cat,
          selected:
            cat === "All"
              ? mobileCategories.size === 0 || mobileCategories.has("All")
              : mobileCategories.has(cat) && !mobileCategories.has("All"),
        }))}
        onSelectOption={(key) => toggleMobileCategory(key as "All" | FeedCategory)}
        isFilterActive={isFilterActive}
        onClear={handleClear}
      />

      {mobileScope === "Following" && (
        <FeedFollowingBanner
          followedCount={followedCount}
          onPress={openClubsDirectory}
        />
      )}
    </View>
  );

  // List Empty Component
  const isNoFollowingPosts =
    deferredMobileScope === "Following" &&
    (deferredMobileCategories.size === 0 || deferredMobileCategories.has("All")) &&
    !deferredQuery.trim();

  const listEmpty = visible.length === 0 ? (
    <View style={[styles.screenInner, styles.mobileEmptyContainer]}>
      <FeedEmptyState
        type={isNoFollowingPosts ? "no-following-posts" : "no-filter-matches"}
        onBrowseClubs={openClubsDirectory}
        onClearFilters={handleClear}
      />
    </View>
  ) : null;

  return (
    <ScreenFlatList
      style={styles.screenInner}
      data={visible}
      keyExtractor={(post: Post) => post.id}
      initialNumToRender={5}
      maxToRenderPerBatch={5}
      windowSize={5}
      removeClippedSubviews={true}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={listEmpty}
      renderItem={({ item: post }: { item: Post }) => (
        <View style={styles.mobileCardRow}>
          <PostCard post={post} />
        </View>
      )}
    />
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
  mobileToggleWrapper: {
    marginHorizontal: -Spacing.two - 2,
    alignSelf: "stretch",
  },
  mobileCardRow: {
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.three,
    alignSelf: "center",
    maxWidth: 1200,
    width: "100%",
  },
  mobileEmptyContainer: {
    paddingHorizontal: Spacing.three,
  },
});
