/**
 * Campus Clubs Directory View
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * The Campus Clubs tab acts as the central directory of all student organizations,
 * academic societies, faith groups, and university departments at Calvin University.
 *
 * KEY CAPABILITIES:
 * 1. Multi-Vector Fuzzy Filtering: Searches simultaneously across club name, tagline,
 *    mission description, category, and physical meeting location.
 * 2. Category Quick Filters: Horizontal chip row allowing students to narrow 50+ clubs
 *    down to specific interests (Academics, Arts & Media, Sports, Faith, etc.).
 * 3. Club Leader Action Strip: Direct entry point for student officers to claim their
 *    organization using their Student Life code. Displays persistent leader status
 *    if already verified, and respects permanent dismissal if hidden.
 */

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ChipRow } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { Brand, Fonts, Radius, Spacing } from '@/constants/theme';
import { useClubFollow } from '@/context/club-follow-context';
import { useClubLeadership } from '@/context/club-leadership-context';
import { useClubsNavigation } from '@/context/clubs-navigation-context';
import { CALVIN_CLUBS, type Club } from '@/data/clubs';
import { feedCategories, type FeedCategory } from '@/data/feed';

const filterCategories: ('All' | FeedCategory)[] = ['All', ...feedCategories];

export function ClubsDirectoryView() {
  const { isFollowing, toggleFollow } = useClubFollow();
  const { openClubDetail } = useClubsNavigation();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'All' | FeedCategory>('All');

  // Multi-field search matching
  // WHY COMBINED PREDICATE:
  // Students often remember where a club meets ("North Hall CS Lab") or general mission keywords
  // ("coding", "robotics") rather than the exact club name ("Abstraction").
  const filteredClubs = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return CALVIN_CLUBS.filter((club) => {
      // 1. Category filter
      if (category !== 'All' && club.category !== category) {
        return false;
      }

      // 2. Search query filter
      if (needle.length > 0) {
        const matchesName = club.name.toLowerCase().includes(needle);
        const matchesTagline = club.tagline.toLowerCase().includes(needle);
        const matchesDesc = club.description.toLowerCase().includes(needle);
        const matchesCategory = club.category.toLowerCase().includes(needle);
        const matchesLocation = (club.location ?? '').toLowerCase().includes(needle);
        return matchesName || matchesTagline || matchesDesc || matchesCategory || matchesLocation;
      }

      return true;
    });
  }, [query, category]);

  const { openClaimModal, linkedClubs, isLeader, isClaimBannerDismissed } = useClubLeadership();

  return (
    <Screen style={styles.screenInner}>
      {/* Club Leader Action Strip */}
      {!isClaimBannerDismissed && (
        <Pressable
          onPress={() => openClaimModal('banner')}
          accessibilityRole="button"
          accessibilityLabel="Club Leader Access. Tap to claim a club with your 10-digit code."
          style={({ pressed }) => [
            styles.claimBanner,
            {
              backgroundColor: isLeader ? 'rgba(20, 184, 166, 0.08)' : 'rgba(243, 195, 0, 0.08)',
              borderColor: isLeader ? '#14B8A6' : Brand.gold,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <View style={styles.claimBannerLeft}>
            <Icon
              sf={isLeader ? 'checkmark.shield.fill' : 'key.fill'}
              md={isLeader ? 'verified_user' : 'vpn_key'}
              size={18}
              color={isLeader ? '#14B8A6' : Brand.gold}
            />
            <View>
              <ThemedText type="caption" style={{ fontWeight: '700', color: isLeader ? '#14B8A6' : Brand.gold }}>
                {isLeader
                  ? linkedClubs.length > 1
                    ? 'Leading multiple clubs'
                    : `Leading ${linkedClubs[0]?.name ?? ''}`
                  : 'Club Leader? Claim with code'}
              </ThemedText>
              <ThemedText type="caption" themeColor="textMuted" style={{ fontSize: 11 }}>
                {isLeader
                  ? 'Tap to link to another club'
                  : 'Enter 10-character code from Student Life'}
              </ThemedText>
            </View>
          </View>
          <Badge
            label={isLeader ? 'LEADER ACTIVE' : 'CLAIM'}
            tone={isLeader ? 'success' : 'gold'}
          />
        </Pressable>
      )}

      <View style={styles.filterControls}>
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Search clubs by name or interest..."
        />
        <ChipRow
          options={filterCategories}
          value={category}
          onChange={setCategory}
        />
      </View>

      <View style={styles.countRow}>
        <ThemedText type="caption" themeColor="textMuted">
          Showing {filteredClubs.length} {filteredClubs.length === 1 ? 'organization' : 'organizations'}
        </ThemedText>
      </View>

      <View style={styles.clubsList}>
        {filteredClubs.map((club) => (
          <ClubCard
            key={club.id}
            club={club}
            following={isFollowing(club.id)}
            onToggleFollow={() => toggleFollow(club.id)}
            onPress={() => openClubDetail(club.id)}
          />
        ))}

        {filteredClubs.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Icon sf="magnifyingglass" md="search" size={28} color={Brand.gold} />
            <ThemedText type="smallBold" style={styles.emptyTitle}>
              No clubs match that search
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptySub}>
              Try searching for a different keyword or select another category.
            </ThemedText>
            {(query || category !== 'All') && (
              <Pressable
                onPress={() => {
                  setQuery('');
                  setCategory('All');
                }}
                style={styles.clearBtn}
              >
                <ThemedText style={styles.clearBtnText}>Clear filters</ThemedText>
              </Pressable>
            )}
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

function ClubCard({
  club,
  following,
  onToggleFollow,
  onPress,
}: {
  club: Club;
  following: boolean;
  onToggleFollow: () => void;
  onPress: () => void;
}) {
  return (
    <Card flush style={styles.clubCard}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`View ${club.name} details`}
        style={({ pressed }) => [styles.cardPressable, pressed && styles.pressed]}
      >
        <View style={styles.cardHeader}>
          {/* Centered Icon Squircle */}
          <View
            style={[
              styles.avatarBox,
              {
                backgroundColor: club.colors[0],
              },
            ]}
          >
            <Icon sf={club.sf} md={club.md} size={25} color="#FFFFFF" />
          </View>

          {/* Title & Tagline */}
          <View style={styles.cardInfo}>
            <ThemedText style={styles.clubName} numberOfLines={1}>
              {club.name}
            </ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.clubTagline}
              numberOfLines={2}
            >
              {club.tagline}
            </ThemedText>
          </View>
        </View>

        {/* Meeting & Location Metadata Badges */}
        {club.meetingSchedule || club.location ? (
          <View style={styles.metaRow}>
            {club.meetingSchedule ? (
              <View style={styles.metaBadge}>
                <Icon sf="calendar" md="event" size={12} color={Brand.gold} />
                <ThemedText type="caption" themeColor="textMuted" numberOfLines={1} style={styles.metaText}>
                  {club.meetingSchedule}
                </ThemedText>
              </View>
            ) : null}
            {club.location ? (
              <View style={styles.metaBadge}>
                <Icon sf="mappin.and.ellipse" md="place" size={12} color={Brand.gold} />
                <ThemedText type="caption" themeColor="textMuted" numberOfLines={1} style={styles.metaText}>
                  {club.location}
                </ThemedText>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Footer: Category Badge & Follow Button */}
        <View style={styles.cardFooter}>
          <Badge label={club.category} tone="gold" />

          {/* Follow / Following Toggle Button */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onToggleFollow();
            }}
            accessibilityRole="button"
            accessibilityLabel={following ? `Unfollow ${club.name}` : `Follow ${club.name}`}
            style={({ pressed }) => [
              styles.followButton,
              following ? styles.followingButton : styles.unfollowedButton,
              pressed && styles.pressed,
            ]}
          >
            <Icon
              sf={following ? 'checkmark' : 'plus'}
              md={following ? 'check' : 'add'}
              size={13}
              color={following ? Brand.gold : '#0B0C0E'}
            />
            <ThemedText
              style={[
                styles.followButtonText,
                following ? styles.followingButtonText : styles.unfollowedButtonText,
              ]}
            >
              {following ? 'Following' : 'Follow'}
            </ThemedText>
          </Pressable>
        </View>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  screenInner: {
    gap: Spacing.three,
  },
  claimBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.two,
  },
  claimBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
  filterControls: {
    gap: Spacing.two,
  },
  countRow: {
    paddingHorizontal: 2,
    marginTop: -Spacing.one,
  },
  clubsList: {
    gap: Spacing.three,
  },
  clubCard: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  cardPressable: {
    padding: Spacing.three,
    gap: Spacing.two + 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
  },
  avatarBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  clubName: {
    fontFamily: Fonts.serif,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  clubTagline: {
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.one + 2,
    marginTop: 2,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    maxWidth: '100%',
  },
  metaText: {
    fontSize: 12,
    flexShrink: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  unfollowedButton: {
    backgroundColor: Brand.gold,
  },
  followingButton: {
    backgroundColor: 'rgba(217, 155, 38, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(217, 155, 38, 0.4)',
  },
  followButtonText: {
    fontWeight: '700',
    fontSize: 12,
  },
  unfollowedButtonText: {
    color: '#0B0C0E',
  },
  followingButtonText: {
    color: Brand.gold,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
    borderRadius: Radius.lg,
  },
  emptyTitle: {
    textAlign: 'center',
    marginTop: Spacing.one,
  },
  emptySub: {
    textAlign: 'center',
    maxWidth: 280,
  },
  clearBtn: {
    marginTop: Spacing.two,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(217, 155, 38, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(217, 155, 38, 0.4)',
  },
  clearBtnText: {
    color: Brand.gold,
    fontWeight: '600',
    fontSize: 13,
  },
});
