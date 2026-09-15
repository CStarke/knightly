import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Brand, Fonts, Radius, Spacing } from '@/constants/theme';
import type { Post } from '@/data/feed';
import { useTheme } from '@/hooks/use-theme';

function categoryBadgeTone(category: string): BadgeTone {
  switch (category) {
    case 'Academics':
      return 'info';
    case 'Outdoors':
      return 'success';
    case 'Athletics':
      return 'danger';
    case 'Faith':
      return 'brand';
    case 'The Arts':
    case 'Music':
    case 'Social':
    case 'Service':
    default:
      return 'gold';
  }
}

/**
 * Modern post card featuring:
 * - Edge-to-edge stock imagery with overlaid organization pill tag
 * - Sleek follow checkmark icon replacing verbose "Following" text
 * - Prominent display headline as the largest text on the card
 * - Graceful layout for non-image posts with an editorial header strip
 * - High-contrast event metadata & readable body copy
 */
export function PostCard({ post }: { post: Post }) {
  const theme = useTheme();

  return (
    <Card flush style={styles.card}>
      {post.image ? (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: post.image }}
            style={styles.image}
            contentFit="cover"
            transition={250}
          />
          {/* Subtle top scrim ensuring overlay badges contrast cleanly */}
          <View style={styles.scrim} />

          <View style={styles.overlayBar}>
            <View style={styles.orgPill}>
              {post.followed ? (
                <Icon sf="checkmark.seal.fill" md="verified" size={14} color={Brand.gold} />
              ) : null}
              <ThemedText style={styles.overlayOrgText} numberOfLines={1}>
                {post.org}
              </ThemedText>
            </View>

            <View style={styles.badgeWrapper}>
              <Badge label={post.category} tone={categoryBadgeTone(post.category)} />
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.content}>
        {/* Editorial header strip for posts without an image */}
        {!post.image ? (
          <View style={styles.noImageHeader}>
            <View style={styles.noImageOrgRow}>
              {post.followed ? (
                <Icon sf="checkmark.seal.fill" md="verified" size={15} color={Brand.goldDark} />
              ) : null}
              <ThemedText type="smallBold" style={styles.noImageOrgText}>
                {post.org}
              </ThemedText>
            </View>

            <Badge label={post.category} tone={categoryBadgeTone(post.category)} />
          </View>
        ) : null}

        {/* The title is the biggest and most commanding text */}
        <ThemedText style={styles.title}>{post.headline}</ThemedText>

        {post.when || post.where ? (
          <View style={styles.metaSection}>
            {post.when ? (
              <View style={styles.metaRow}>
                <View style={[styles.metaIconWrap, { backgroundColor: theme.tintSoft }]}>
                  <Icon sf="calendar" md="event" size={13} color={Brand.maroon} />
                </View>
                <ThemedText type="smallBold" style={styles.metaText}>
                  {post.when}
                </ThemedText>
              </View>
            ) : null}

            {post.where ? (
              <View style={styles.metaRow}>
                <View style={[styles.metaIconWrap, { backgroundColor: theme.tintSoft }]}>
                  <Icon sf="mappin.and.ellipse" md="place" size={13} color={Brand.maroon} />
                </View>
                <ThemedText type="small" themeColor="textSecondary" style={styles.metaText}>
                  {post.where}
                </ThemedText>
              </View>
            ) : null}
          </View>
        ) : null}

        <ThemedText type="small" themeColor="textSecondary" style={styles.body}>
          {post.body}
        </ThemedText>

        <View style={styles.footer}>
          <ThemedText type="caption" themeColor="textMuted">
            {post.postedAt} ago
          </ThemedText>
          {post.campusWide ? (
            <ThemedText type="caption" themeColor="textMuted">
              Campus-wide
            </ThemedText>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 195,
    position: 'relative',
    backgroundColor: '#1C1D21',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 72,
    experimental_backgroundImage:
      'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)',
  },
  overlayBar: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
    right: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  orgPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(17, 24, 28, 0.75)',
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    maxWidth: '70%',
  },
  overlayOrgText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  badgeWrapper: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  noImageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 2,
    gap: Spacing.two,
  },
  noImageOrgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  noImageOrgText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  metaSection: {
    gap: 6,
    paddingVertical: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 3,
  },
  metaIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaText: {
    fontSize: 13,
  },
  body: {
    lineHeight: 21,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.one,
  },
});
