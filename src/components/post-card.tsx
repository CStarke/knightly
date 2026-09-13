import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import type { Post } from '@/data/feed';
import { useTheme } from '@/hooks/use-theme';

/** A whole post, readable without tapping into anything. */
export function PostCard({ post }: { post: Post }) {
  const theme = useTheme();
  const [from, to] = post.colors;

  return (
    <Card flush>
      <View style={styles.top}>
        <View
          style={[
            styles.mark,
            { experimental_backgroundImage: `linear-gradient(140deg, ${from}, ${to})` },
          ]}>
          <ThemedText type="caption" style={styles.markText}>
            {post.mark}
          </ThemedText>
        </View>

        <View style={styles.topText}>
          <ThemedText type="smallBold">{post.org}</ThemedText>
          <ThemedText type="caption" themeColor="textMuted">
            {post.category}
            {post.followed ? ' · Following' : ''}
          </ThemedText>
        </View>

        <ThemedText type="caption" themeColor="textMuted">
          {post.postedAt}
        </ThemedText>
      </View>

      <View
        style={[
          styles.poster,
          { experimental_backgroundImage: `linear-gradient(145deg, ${from}, ${to})` },
        ]}>
        <Icon sf={post.sf} md={post.md} size={30} color="rgba(255,255,255,0.85)" />
        <ThemedText type="subtitle" style={styles.posterTitle}>
          {post.headline}
        </ThemedText>
      </View>

      <View style={styles.caption}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.body}>
          {post.body}
        </ThemedText>

        {post.when ? (
          <View style={styles.metaRow}>
            <Icon sf="calendar" md="event" size={14} color={theme.tint} />
            <ThemedText type="caption" themeColor="text">
              {post.when}
            </ThemedText>
          </View>
        ) : null}

        {post.where ? (
          <View style={styles.metaRow}>
            <Icon sf="mappin.and.ellipse" md="place" size={14} color={theme.tint} />
            <ThemedText type="caption" themeColor="textSecondary">
              {post.where}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  topText: {
    flex: 1,
    gap: 1,
  },
  poster: {
    minHeight: 168,
    padding: Spacing.three,
    gap: Spacing.two,
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  posterTitle: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  caption: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  body: {
    lineHeight: 21,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
