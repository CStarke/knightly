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

import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

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
import { getClubById } from '@/data/clubs';
import { getPostsByClubId } from '@/data/feed';

export function ClubDetailView({ clubId }: { clubId: string }) {
  const { isFollowing, toggleFollow } = useClubFollow();
  const { closeClubDetail } = useClubsNavigation();

  const club = clubId ? getClubById(clubId) : undefined;
  const clubPosts = club ? getPostsByClubId(club.id) : [];

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
    <Screen style={styles.screenInner}>
      {/* Hero Card */}
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

      {/* About & Logistics Card */}
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

      {/* Club Posts & Activity */}
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
          <PostCard key={post.id} post={post} />
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

