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
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { PostCard } from "@/components/post-card";
import { ThemedText } from "@/components/themed-text";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import { ScreenFlatList } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/search-field";
import { Segmented } from "@/components/ui/segmented";
import { Brand, Radius, Spacing } from "@/constants/theme";
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
    </View>
  );

  // List Empty Component
  const listEmpty = visible.length === 0 ? (
    <View style={[styles.screenInner, styles.mobileEmptyContainer]}>
      {(deferredMobileScope === "Following" && (deferredMobileCategories.size === 0 || deferredMobileCategories.has("All")) && !deferredQuery.trim()) ? (
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
  mobileFiltersBanner: {
    marginHorizontal: -Spacing.three,
  },
  mobileFiltersContent: {
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
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.three,
    alignSelf: "center",
    maxWidth: 1200,
    width: "100%",
  },
  mobileEmptyContainer: {
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.75,
  },
});
