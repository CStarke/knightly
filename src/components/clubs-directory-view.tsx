import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ChipRow } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { Segmented } from '@/components/ui/segmented';
import { Brand, Fonts, Radius, Spacing } from '@/constants/theme';
import { useClubFollow } from '@/context/club-follow-context';
import { useClubsNavigation } from '@/context/clubs-navigation-context';
import { CALVIN_CLUBS, type Club } from '@/data/clubs';
import { feedCategories, type FeedCategory } from '@/data/feed';

const filterCategories: ('All' | FeedCategory)[] = ['All', ...feedCategories];
const viewTabs = ['All clubs', 'Following'] as const;
type ViewTab = (typeof viewTabs)[number];

export function ClubsDirectoryView() {
  const { isFollowing, toggleFollow, followedCount } = useClubFollow();
  const { openClubDetail } = useClubsNavigation();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'All' | FeedCategory>('All');
  const [viewTab, setViewTab] = useState<ViewTab>('All clubs');

  const filteredClubs = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return CALVIN_CLUBS.filter((club) => {
      // 1. Follow filter
      if (viewTab === 'Following' && !isFollowing(club.id)) {
        return false;
      }

      // 2. Category filter
      if (category !== 'All' && club.category !== category) {
        return false;
      }

      // 3. Search query filter
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
  }, [query, category, viewTab, isFollowing]);

  return (
    <Screen style={styles.screenInner}>
      <Segmented
        options={viewTabs}
        value={viewTab}
        onChange={setViewTab}
      />

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
          {viewTab === 'Following'
            ? `${filteredClubs.length} of ${followedCount} followed clubs`
            : `Showing ${filteredClubs.length} ${filteredClubs.length === 1 ? 'organization' : 'organizations'}`}
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
              {viewTab === 'Following'
                ? 'No followed clubs match your filter'
                : 'No clubs match that search'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptySub}>
              {viewTab === 'Following'
                ? 'Try clearing your category filter or switch to "All clubs" to discover more communities.'
                : 'Try searching for a different keyword or select another category.'}
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
