/**
 * Club Detail View (In-Pager Level 2 Subpage)
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * When a student taps any club card in the Campus Clubs directory, the app slides into this
 * deep-dive view.
 *
 * WHY IN-PAGER SLIDE (VS STACK ROUTE PUSH):
 * Rendering this view as a subpage inside the Directory tab preserves:
 * 1. 3D Starfield Parallax: The background continuous canvas remains uninterrupted.
 * 2. Gesture Continuity: Swiping right from the edge or tapping the top header's back arrow
 *    slides smoothly back to the directory list with zero layout jumps.
 * 3. Feed Aggregation: Pulls all posts published by this club ID (`getPostsByClubId`), giving
 *    students a complete activity archive alongside logistics and contact details.
 */

import { useMemo, useRef } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import type Animated from 'react-native-reanimated';

import { PostCard } from '@/components/post-card';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { FollowButton } from '@/components/ui/follow-button';
import { Icon, type MaterialSymbolName, type SfSymbolName } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Brand, Fonts, Radius, Spacing } from '@/constants/theme';
import { useClubFollow } from '@/context/club-follow-context';
import { useClubsNavigation } from '@/context/clubs-navigation-context';
import { useOptionalFeed } from '@/context/feed-context';
import { getClubById } from '@/data/clubs';
import { getPostsByClubId } from '@/data/feed';

/**
 * Renders the in-pager subpage showing a single club's profile, logistics, and activity feed.
 *
 * @param props.clubId - The unique slug identifier of the club to display (e.g. 'acm', 'abstraction')
 */
export function ClubDetailView({ clubId }: { clubId: string }) {
  // Step 1: Hook Subscriptions & References
  const scrollRef = useRef<Animated.ScrollView>(null);
  const { isFollowing, toggleFollow } = useClubFollow();
  const { closeClubDetail } = useClubsNavigation();
  const feed = useOptionalFeed();

  // Step 2: Club Data Resolution & Posts Memoization
  const club = clubId ? getClubById(clubId) : undefined;

  // WHY REACTIVE FEED POSTS MEMOIZATION:
  // When a student officer creates a new post via the Create Post composer, it is appended to
  // `feed.posts` in FeedContext. Including `feed?.posts` in this dependency array guarantees that
  // `clubPosts` recalculates immediately, making newly published announcements show up in real-time
  // without requiring a screen remount or manual reload.
  const clubPosts = useMemo(
    () => (club ? getPostsByClubId(club.id, feed?.posts) : []),
    [club, feed?.posts]
  );

  // Step 3: Self-Club Tag Tap Handler (Scroll to Top)
  // WHY SCROLL TO TOP (VS DUPLICATE ROUTE PUSH):
  // When a student is already viewing a club's detailed profile page, clicking the organization
  // badge on any of its announcements should NOT push another identical instance of the club view.
  // Instead, it smoothly scrolls the page to the top, bringing the hero card, meeting logistics,
  // and follow button back into view. If an announcement references a different club ID, it navigates normally.
  const handlePressPostOrg = (postClubId: string) => {
    if (!postClubId || postClubId === club?.id) {
      const scrollComponent = scrollRef.current;
      if (!scrollComponent) return;

      if (typeof (scrollComponent as any).scrollTo === 'function') {
        (scrollComponent as any).scrollTo({ y: 0, animated: true });
      } else if (typeof (scrollComponent as any).getNode === 'function') {
        (scrollComponent as any).getNode()?.scrollTo?.({ y: 0, animated: true });
      }
    } else {
      router.push({
        pathname: '/clubs/[id]',
        params: { id: postClubId },
      });
    }
  };

  // Step 4: Club Not Found Fallback Guard
  // Displays a helpful recovery card if an invalid or stale club ID is provided.
  if (!club) {
    return (
      <Screen style={styles.screenInner}>
        <Card style={styles.notFoundCard}>
          <Icon sf="exclamationmark.triangle" md="warning" size={32} color={Brand.gold} />
          <ThemedText type="subtitle">Club not found</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.notFoundText}>
            The organization you are looking for might have moved or is not listed.
          </ThemedText>
          <Pressable onPress={closeClubDetail} style={styles.returnBtn}>
            <ThemedText style={styles.returnBtnText}>Return to Campus Clubs</ThemedText>
          </Pressable>
        </Card>
      </Screen>
    );
  }

  const following = isFollowing(club.id);

  return (
    <Screen scrollViewRef={scrollRef} style={styles.screenInner}>
      {/*
        Step 4: Hero Header Card
        Renders either a photo banner or a solid brand-color fallback, an overlapping avatar
        squircle with the club's official icon, category badge, title, tagline, and prominent Follow button.
      */}
      <Card flush style={styles.heroCard}>
        {club.image ? (
          <View style={styles.heroImageContainer}>
            <Image
              source={{ uri: club.image }}
              style={styles.heroImage}
              contentFit="cover"
              transition={250}
            />
            <View style={styles.heroScrim} />
          </View>
        ) : (
          <View
            style={[
              styles.fallbackBanner,
              { backgroundColor: club.colors[0] },
            ]}
          />
        )}

        <View style={styles.heroBody}>
          <View style={styles.avatarRow}>
            {/* Overlapping Club Icon Squircle */}
            <View
              style={[
                styles.avatarLarge,
                { backgroundColor: club.colors[0] },
              ]}
            >
              <Icon sf={club.sf} md={club.md} size={30} color="#FFFFFF" />
            </View>

            <Badge label={club.category} tone="gold" />
          </View>

          <View style={styles.heroTitles}>
            <ThemedText style={styles.heroTitle}>{club.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.heroTagline}>
              {club.tagline}
            </ThemedText>
          </View>

          {/* Prominent Follow Button */}
          <FollowButton
            following={following}
            onPress={() => toggleFollow(club.id)}
            clubName={club.name}
            variant="prominent"
          />
        </View>
      </Card>

      {/*
        Step 5: About & Logistics Card
        Presents the organization's mission statement alongside verified meeting schedule,
        meeting location, officer leadership, and official contact email.
      */}
      <Card style={styles.aboutCard}>
        <ThemedText type="smallBold" style={styles.sectionHeader}>
          About
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.aboutBody}>
          {club.description}
        </ThemedText>

        <View style={styles.metaList}>
          {club.meetingSchedule ? (
            <MetaItem
              sf="calendar"
              md="event"
              color={Brand.gold}
              label="Meeting Schedule"
              value={club.meetingSchedule}
            />
          ) : null}

          {club.location ? (
            <MetaItem
              sf="mappin.and.ellipse"
              md="place"
              color={Brand.maroon}
              label="Location"
              value={club.location}
            />
          ) : null}

          {club.leader ? (
            <MetaItem
              sf="person.fill"
              md="person"
              color={Brand.renewBlue}
              label="Leadership"
              value={club.leader}
            />
          ) : null}

          <MetaItem
            sf="envelope.fill"
            md="mail"
            color={Brand.trueGreen}
            label="Contact"
            value={club.contactEmail}
          />
        </View>
      </Card>

      {/*
        Step 6: Club Posts & Activity Stream
        Renders all historical and newly posted announcements for this club.
        If no announcements exist yet, renders an encouraging empty state card.
      */}
      <View style={styles.postsSection}>
        <View style={styles.postsHeaderRow}>
          <ThemedText type="smallBold" style={styles.sectionHeader}>
            Recent Updates & Announcements
          </ThemedText>
          <ThemedText type="caption" themeColor="textMuted">
            {clubPosts.length} {clubPosts.length === 1 ? 'post' : 'posts'}
          </ThemedText>
        </View>

        {clubPosts.map((post) => (
          <PostCard key={post.id} post={post} onPressOrg={handlePressPostOrg} />
        ))}

        {clubPosts.length === 0 ? (
          <Card style={styles.noPostsCard}>
            <Icon sf="sparkles" md="auto_awesome" size={24} color={Brand.gold} />
            <ThemedText type="smallBold">No announcements yet</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.noPostsSub}>
              {`${club.name} hasn't posted any updates or upcoming events recently. Follow to stay informed!`}
            </ThemedText>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenInner: {
    gap: Spacing.three,
  },
  heroCard: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  heroImageContainer: {
    width: '100%',
    height: 140,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  fallbackBanner: {
    width: '100%',
    height: 80,
    opacity: 0.65,
  },
  heroBody: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -Spacing.four,
  },
  avatarLarge: {
    width: 62,
    height: 62,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  heroTitles: {
    gap: 4,
    marginTop: 2,
  },
  heroTitle: {
    fontFamily: Fonts.serif,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  heroTagline: {
    fontSize: 14,
    lineHeight: 20,
  },
  aboutCard: {
    gap: Spacing.two,
    borderRadius: Radius.lg,
  },
  sectionHeader: {
    fontSize: 15,
    letterSpacing: -0.1,
  },
  aboutBody: {
    lineHeight: 20,
  },
  metaList: {
    gap: Spacing.two,
    marginTop: Spacing.one,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  metaListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  metaIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaListContent: {
    flex: 1,
    gap: 1,
  },
  postsSection: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  postsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  noPostsCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
    borderRadius: Radius.lg,
  },
  noPostsSub: {
    textAlign: 'center',
    maxWidth: 290,
  },
  notFoundCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
    borderRadius: Radius.lg,
    marginTop: Spacing.four,
  },
  notFoundText: {
    textAlign: 'center',
    maxWidth: 280,
  },
  returnBtn: {
    marginTop: Spacing.two,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: Radius.pill,
    backgroundColor: Brand.gold,
  },
  returnBtnText: {
    color: '#0B0C0E',
    fontWeight: '700',
    fontSize: 13,
  },
});

/**
 * Renders a row in the organization's logistics list with a circular icon and label/value pair.
 *
 * @param props.sf - iOS SF Symbol name
 * @param props.md - Android/Web Material Symbol name
 * @param props.color - Accent color for the icon glyph
 * @param props.bgColor - Optional circular background tint (defaults to 14% alpha tint of `color`)
 * @param props.label - Small uppercase/muted field description (e.g. 'Meeting Schedule', 'Location')
 * @param props.value - The substantive logistics information or email address
 */
function MetaItem({
  sf,
  md,
  color,
  bgColor,
  label,
  value,
}: {
  sf: SfSymbolName;
  md: MaterialSymbolName;
  color: string;
  bgColor?: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metaListItem}>
      <View style={[styles.metaIconCircle, { backgroundColor: bgColor ?? `${color}24` }]}>
        <Icon sf={sf} md={md} size={14} color={color} />
      </View>
      <View style={styles.metaListContent}>
        <ThemedText type="caption" themeColor="textMuted">
          {label}
        </ThemedText>
        <ThemedText type="smallBold">{value}</ThemedText>
      </View>
    </View>
  );
}

