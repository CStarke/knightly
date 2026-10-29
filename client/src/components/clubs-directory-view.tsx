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

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { FeedEmptyState } from '@/components/feed-controls';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ChipRow } from '@/components/ui/chip';
import { FollowButton } from '@/components/ui/follow-button';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { Brand, Fonts, Radius, Spacing } from '@/constants/theme';
import { useClubFollow } from '@/context/club-follow-context';
import { useClubLeadership } from '@/context/club-leadership-context';
import { useClubsNavigation } from '@/context/clubs-navigation-context';
import { CALVIN_CLUBS, type Club } from '@/data/clubs';
import { fetchClubsApi } from '@/services/clubs-api';
import { feedCategories, resolveFeedColumnCount, type FeedCategory } from '@/data/feed';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

const filterCategories: ('All' | FeedCategory)[] = ['All', ...feedCategories];

/**
 * Campus Clubs Directory View component.
 *
 * WHAT IT DOES:
 * - Renders the central searchable list of all 50+ Calvin University student organizations.
 * - Supports instant real-time search across club name, tagline, description, category, and location.
 * - Allows quick filtering by category pills (Academics, Arts & Media, Sports, Faith, etc.).
 * - Displays a Club Leader Action Strip allowing officers to claim their organization with a Student Life code.
 * - Lets students view details or toggle follow status directly from the card.
 */
export function ClubsDirectoryView() {
  // Step 1: Context & Navigation Hooks
  const { isFollowing, toggleFollow } = useClubFollow();
  const { openClubDetail } = useClubsNavigation();
  const { openClaimModal, linkedClubs, isLeader, isClaimBannerDismissed } = useClubLeadership();
  const { width } = useResponsiveLayout();

  // Step 2: Responsive Columns Calculation (matching Home Feed: 1 on mobile, 2 to 5 on web with identical breakpoints)
  const numColumns = resolveFeedColumnCount(width, Platform.OS);
  const maxContentWidth = numColumns >= 5 ? 1880 : numColumns >= 4 ? 1520 : 1200;

  // Step 3: Filter States & Live Directory Catalog
  const [clubsCatalog, setClubsCatalog] = useState<Club[]>(CALVIN_CLUBS);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'All' | FeedCategory>('All');
  const [isDeferredReady, setIsDeferredReady] = useState(false);

  // SPRINT 1 SLO DIRECTIVE (SC2): Asynchronously refresh club directory from Supabase
  useEffect(() => {
    let mounted = true;
    fetchClubsApi().then((serverClubs) => {
      if (mounted && Array.isArray(serverClubs) && serverClubs.length > 0) {
        setClubsCatalog(serverClubs);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Defer full catalog rendering on initial mount to allow the horizontal camera slide (320ms) to glide at 60/120fps
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDeferredReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Step 4: Multi-field fuzzy search pipeline
  // WHY COMBINED PREDICATE:
  // Students often remember where a club meets ("North Hall CS Lab") or general mission keywords
  // ("coding", "robotics") rather than the exact club name ("Abstraction").
  const filteredClubs = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return clubsCatalog.filter((club) => {
      // Sub-step A: Category filter check
      if (category !== 'All' && club.category !== category) return false;
      // Sub-step B: If no search query, match all within the category
      if (!needle) return true;
      // Sub-step C: Match against name, tagline, description, category, or location
      return (
        (club.name ?? '').toLowerCase().includes(needle) ||

        (club.description ?? '').toLowerCase().includes(needle) ||
        (club.category ?? '').toLowerCase().includes(needle) ||
        (club.location ?? '').toLowerCase().includes(needle)
      );
    });
  }, [query, category]);

  // Progressive rendering slice: on initial entry while camera glides, render top 6 cards; once landed or searching, render all
  const visibleClubs = useMemo(() => {
    if (isDeferredReady || query || category !== 'All') {
      return filteredClubs;
    }
    return filteredClubs.slice(0, 6);
  }, [filteredClubs, isDeferredReady, query, category]);

  // Step 5: Chunk visible clubs into balanced rows of `numColumns` items
  const evenRows = useMemo(() => {
    const rows: Club[][] = [];
    for (let i = 0; i < visibleClubs.length; i += numColumns) {
      rows.push(visibleClubs.slice(i, i + numColumns));
    }
    return rows;
  }, [visibleClubs, numColumns]);

  return (
    <Screen style={[styles.screenInner, { maxWidth: maxContentWidth }]}>
      {/*
        Step 4: Club Leader Action Strip
        Visible unless permanently dismissed. Prompts student leaders to claim their club
        or shows their verified leadership status if already claimed.
      */}
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

      {/* Step 5: Search & Category Filter Controls */}
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

      {/* Step 6: Filtered Result Count Indicator */}
      <View style={styles.countRow}>
        <ThemedText type="caption" themeColor="textMuted">
          Showing {filteredClubs.length} {filteredClubs.length === 1 ? 'organization' : 'organizations'}
        </ThemedText>
      </View>

      {/* Step 7: Organization Cards Grid & Empty Search State */}
      <View style={styles.evenGrid}>
        {evenRows.map((row, rowIdx) => (
          <View key={`grid-row-${rowIdx}`} style={styles.evenGridRow}>
            {row.map((club) => (
              <View key={club.id} style={styles.evenGridCell}>
                <ClubCard
                  club={club}
                  following={isFollowing(club.id)}
                  onToggleFollow={toggleFollow}
                  onPress={openClubDetail}
                />
              </View>
            ))}
            {row.length < numColumns &&
              Array.from({ length: numColumns - row.length }).map((_, i) => (
                <View key={`spacer-${rowIdx}-${i}`} style={styles.evenGridCell} />
              ))}
          </View>
        ))}
      </View>

      {filteredClubs.length === 0 ? (
        <FeedEmptyState
          type="no-filter-matches"
          title="No clubs match that search"
          subtitle="Try searching for a different keyword or select another category."
          buttonLabel="Clear filters"
          onClearFilters={
            query || category !== 'All'
              ? () => {
                  setQuery('');
                  setCategory('All');
                }
              : undefined
          }
        />
      ) : null}
    </Screen>
  );
}

/**
 * Individual club listing card within the directory.
 *
 * @param props.club - The Club model to render
 * @param props.following - Whether the active user follows this club
 * @param props.onToggleFollow - Callback triggered when tapping the follow button
 * @param props.onPress - Callback triggered when tapping the card body to open deep details
 */
type ClubCardProps = {
  club: Club;
  following: boolean;
  onToggleFollow: (clubId: string) => void;
  onPress: (clubId: string) => void;
};

const ClubCard = memo(function ClubCard({
  club,
  following,
  onToggleFollow,
  onPress,
}: ClubCardProps) {
  const handlePress = useCallback(() => {
    onPress(club.id);
  }, [onPress, club.id]);

  const handleToggle = useCallback(
    (e?: any) => {
      e?.stopPropagation?.();
      onToggleFollow(club.id);
    },
    [onToggleFollow, club.id]
  );

  return (
    <Card flush style={styles.clubCard}>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`View ${club.name} details`}
        style={({ pressed }) => [styles.cardPressable, pressed && styles.pressed]}
      >
        {/* Step A: Header with Club Squircle Icon & Name/Tagline */}
        <View style={styles.cardHeader}>
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
              {club.description}
            </ThemedText>
          </View>
        </View>

        {/* Step B: Meeting Schedule & Location Metadata Badges */}
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

        {/*
          Step C: Footer with Category Badge & Follow Button
          WHY STOP PROPAGATION:
          Tapping the Follow button should only toggle the follow subscription; stopping event
          bubbling prevents accidentally triggering card navigation to the club detail subpage.
        */}
        <View style={styles.cardFooter}>
          <Badge label={club.category} tone="gold" />

          <FollowButton
            following={following}
            onPress={handleToggle}
            clubName={club.name}
            variant="compact"
          />
        </View>
      </Pressable>
    </Card>
  );
});

const styles = StyleSheet.create({
  screenInner: {
    gap: Spacing.three,
    width: '100%',
    alignSelf: 'center',
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
  evenGrid: {
    gap: Spacing.three,
    width: '100%',
  },
  evenGridRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    width: '100%',
    alignItems: 'stretch',
  },
  evenGridCell: {
    flex: 1,
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
});
