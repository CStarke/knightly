/**
 * Campus Feed Home Screen (Slot 0)
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * This is the primary landing screen for Knightly (`/`). It presents an aggregated,
 * reverse-chronological timeline of campus happenings, student organization meetings,
 * and university announcements.
 *
 * MINIMUM-CLICKS FILTERING & RESPONSIVE FEED PHILOSOPHY:
 * 1. 0-Click Instant Search (SearchField):
 *    Permanent top search field activates live keyword filtering on keystroke,
 *    searching across title, body, organization, venue, and category.
 * 2. Audience Scope Toggle (Segmented):
 *    Students can switch between "Following" (their followed clubs + campus-wide alerts)
 *    and "All Campus" (unrestricted university discovery).
 * 3. Topical Category Filtering (ChipRow):
 *    Horizontal scrolling chip row containing all 13 official Calvin University categories
 *    plus "All". Tapping a chip filters the feed instantly; tapping again deselects it.
 * 4. Responsive Layout:
 *    - Mobile App (Platform.OS !== 'web'): Strictly 1 column via ScreenFlatList for handheld ergonomics.
 *    - Web App: Multi-column responsive grid (2-3 columns depending on viewport width) via Screen.
 * 5. Server-Authoritative Timestamps:
 *    All posts are strictly sorted by server-assigned timestamps newest-first.
 */

import { useDeferredValue, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { PostCard } from "@/components/post-card";
import { ThemedText } from "@/components/themed-text";
import { Card } from "@/components/ui/card";
import { ChipRow } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import { Screen, ScreenFlatList } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/search-field";
import { Segmented } from "@/components/ui/segmented";
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

const scopeOptions = ["Following", "All Campus", "Saved"] as const;
type FeedScope = (typeof scopeOptions)[number] | "Favorites";

const categoryOptions: ("All" | FeedCategory)[] = [
  "All",
  ...feedCategories,
];

export default function FeedScreen() {
  const { width } = useWindowDimensions();
  const isMobileApp = Platform.OS !== "web";

  // Dedicated audience scope ("Following" vs "All Campus" vs "Saved")
  // Saved posts is accessible across both web and mobile toggle bars.
  const [scope, setScope] = useState<FeedScope>("Following");
  // Topical category filter
  const [category, setCategory] = useState<"All" | FeedCategory>("All");
  // Live keyword search query
  const [query, setQuery] = useState("");

  const deferredScope = useDeferredValue(scope);
  const deferredCategory = useDeferredValue(category);
  const deferredQuery = useDeferredValue(query);

  // Get all feed posts and the student's saved favorite posts.
  const { posts: dynamicPosts, savedPosts, favoritePosts } = useFeed();
  const { isFollowing, followedCount } = useClubFollow();
  const { openClubsDirectory } = useClubsNavigation();

  // Step 1: Responsive Column Count (1 for mobile native, 2-3 for web)
  const numColumns = resolveFeedColumnCount(width, Platform.OS);

  // Step 2: Category Chip Toggle Logic
  const handleCategoryChange = (cat: "All" | FeedCategory) => {
    if (cat === category) {
      setCategory("All");
    } else {
      setCategory(cat);
    }
  };

  // Step 3: Filtering Pipeline
  const visible = useMemo(() => {
    const activeCats = deferredCategory === "All" ? [] : [deferredCategory];
    // Show only saved posts when the student selects Favorites.
    // Saved posts must remain visible regardless of whether their club is followed.
    const isSavedScope = deferredScope === "Saved" || deferredScope === "Favorites";
    const activeSavedPosts = savedPosts ?? favoritePosts ?? [];

    // Filtering logic shares category and keyword pipeline across both platforms.
    return filterFeedPosts(isSavedScope ? activeSavedPosts : dynamicPosts, {
      scope: isSavedScope ? "All Campus" : deferredScope,
      categories: activeCats,
      query: deferredQuery,
      isFollowing,
    });
  }, [dynamicPosts, savedPosts, favoritePosts, deferredScope, deferredCategory, deferredQuery, isFollowing]);

  // Step 4: Chunk visible posts into even rows of `numColumns` items
  const evenRows = useMemo(() => {
    const rows: Post[][] = [];
    for (let i = 0; i < visible.length; i += numColumns) {
      rows.push(visible.slice(i, i + numColumns));
    }
    return rows;
  }, [visible, numColumns]);

  const isFilterActive = query.trim().length > 0 || category !== "All";

  // Step 5: Reset handler
  const handleClear = () => {
    setQuery("");
    setCategory("All");
  };

  const listHeader = (
    <View style={styles.filterSection}>
      {/* Step A: Live Keyword Search Input */}
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder={
          scope === "Favorites"
            ? "Search saved favorite posts..."
            : scope === "Following"
            ? "Search followed clubs & campus alerts..."
            : "Search all events, clubs, locations..."
        }
      />

      {/* Step B: Audience Scope Toggle */}
      <View style={styles.scopeToggleWrapper}>
        <Segmented
          options={scopeOptions}
          value={scope}
          onChange={setScope}
        />
      </View>

      {/* Step C: Topical Category Filter Chips */}
      <View style={styles.chipRowWrapper}>
        <ChipRow
          options={categoryOptions}
          value={category}
          onChange={handleCategoryChange}
          tone="gold"
        />
      </View>

      {/* Step D: Active Filter Indicator & Reset */}
      {isFilterActive && (
        <View style={styles.clearRow}>
          <Pressable
            onPress={handleClear}
            accessibilityRole="button"
            accessibilityLabel="Clear active filters"
            style={({ pressed }) => [styles.resetPill, pressed && styles.pressed]}
          >
            <Icon sf="xmark.circle.fill" md="cancel" size={13} color={Brand.brightRed} />
            <ThemedText style={styles.resetPillText}>Clear Filters</ThemedText>
          </Pressable>
        </View>
      )}

      {/* Step E: Following Context Banner */}
      {scope === "Following" && (
        <Pressable
          onPress={openClubsDirectory}
          accessibilityRole="button"
          accessibilityLabel={`Following ${followedCount} clubs. Campus-wide events included.`}
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

  const listEmpty = (
    <View style={[styles.screenInner, isMobileApp && styles.mobileEmptyContainer]}>
      {visible.length === 0 ? (
        // Show a message when the student has no favorite posts.
        (deferredScope === "Saved" || (deferredScope as string) === "Favorites") && (savedPosts?.length === 0 || favoritePosts?.length === 0) ? (
          <Card style={styles.emptyCard}>
            <Icon
              sf="star"
              md="star_border"
              size={28}
              color={Brand.gold}
            />

            <ThemedText type="smallBold">
              No saved posts yet
            </ThemedText>

            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.emptySub}
            >
              Tap the star on any announcement or event to save it here for quick reference.
            </ThemedText>
          </Card>
        ) : (
          deferredScope === "Following" && deferredCategory === "All" && !deferredQuery.trim() ? (
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
        renderItem={({ item: row }) => (
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

  // Web Layout (Scroll View with multi-column grid)
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
    marginBottom: Spacing.two,
  },
  scopeToggleWrapper: {
    alignSelf: "stretch",
  },
  chipRowWrapper: {
    marginHorizontal: -Spacing.three,
  },
  clearRow: {
    flexDirection: "row",
    alignItems: "center",
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
