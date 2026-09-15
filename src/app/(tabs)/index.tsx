import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { PostCard } from "@/components/post-card";
import { ThemedText } from "@/components/themed-text";
import { Card } from "@/components/ui/card";
import { ChipRow } from "@/components/ui/chip";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/search-field";
import { Segmented } from "@/components/ui/segmented";
import { Spacing } from "@/constants/theme";
import {
  feedCategories,
  followedOrgs,
  forYouPosts,
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

  const forYou = useMemo(() => forYouPosts(), []);
  const explore = useMemo(
    () => searchPosts(query, category),
    [query, category],
  );
  const visible = tab === "Following" ? forYou : explore;

  return (
    <Screen>
      <Segmented options={tabs} value={tab} onChange={setTab} />

      {tab === "Following" ? (
        <ThemedText type="caption" themeColor="textMuted" style={styles.followingCaption}>
          Following {followedOrgs.length} orgs · campus-wide events included
        </ThemedText>
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
          <Card>
            <ThemedText type="smallBold">Nothing matches that</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Try a different word, or clear the category filter.
            </ThemedText>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  followingCaption: {
    marginTop: -Spacing.two,
    marginBottom: -Spacing.two,
  },
  filters: {
    gap: Spacing.two,
  },
  feed: {
    gap: Spacing.three,
    marginTop: -Spacing.two,
  },
});
