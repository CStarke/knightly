import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { PostCard } from "@/components/post-card";
import { ThemedText } from "@/components/themed-text";
import { Card } from "@/components/ui/card";
import { ChipRow } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/search-field";
import { Segmented } from "@/components/ui/segmented";
import { Brand, Radius, Spacing } from "@/constants/theme";
import { useClubFollow } from "@/context/club-follow-context";
import { useClubsNavigation } from "@/context/clubs-navigation-context";
import {
  feedCategories,
  posts,
  searchPosts,
  type FeedCategory,
} from "@/data/feed";

const tabs = ["Following", "All campus"] as const;
type FeedTab = (typeof tabs)[number];

const filterOptions: ("All" | FeedCategory)[] = ["All", ...feedCategories];

export default function FeedScreen() {
  const [tab, setTab] = useState<FeedTab>("Following");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"All" | FeedCategory>("All");
  const { isFollowing, followedCount } = useClubFollow();
  const { openClubsDirectory } = useClubsNavigation();

  const forYou = useMemo(() => {
    return posts.filter((post) => {
      // Campus-wide announcements always show in Following
      if (post.campusWide) return true;
      // Otherwise only show if user follows this club
      const clubId = post.clubId ?? post.org.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return isFollowing(clubId);
    });
  }, [isFollowing]);

  const explore = useMemo(
    () => searchPosts(query, category),
    [query, category],
  );
  const visible = tab === "Following" ? forYou : explore;

  return (
    <Screen>
      <Segmented options={tabs} value={tab} onChange={setTab} />

      {tab === "Following" ? (
        <Pressable
          onPress={openClubsDirectory}
          accessibilityRole="button"
          accessibilityLabel={`Following ${followedCount} clubs. Tap to view and explore campus clubs.`}
          style={({ pressed }) => [
            styles.followingBar,
            pressed && styles.pressed,
          ]}
        >
          <ThemedText
            type="caption"
            themeColor="textMuted"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={styles.followingCaption}
          >
            Following {followedCount} {followedCount === 1 ? "club" : "clubs"} · campus-wide events included
          </ThemedText>
        </Pressable>
      ) : (
        <View style={styles.filters}>
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder="Search events, clubs, places"
          />
          <ChipRow
            options={filterOptions}
            value={category}
            onChange={setCategory}
          />
        </View>
      )}

      <View style={styles.feed}>
        {visible.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}

        {visible.length === 0 ? (
          tab === "Following" ? (
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
              <ThemedText type="smallBold">Nothing matches that</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptySub}>
                Try a different word, or clear the category filter.
              </ThemedText>
            </Card>
          )
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  followingBar: {
    paddingVertical: Spacing.one,
    marginTop: -Spacing.two,
    marginBottom: -Spacing.two,
  },
  followingCaption: {
    fontSize: 12,
  },
  pressed: {
    opacity: 0.75,
  },
  filters: {
    gap: Spacing.two,
  },
  feed: {
    gap: Spacing.three,
    marginTop: -Spacing.two,
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
});

