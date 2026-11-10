/**
 * Campus Dining Halls, Venue Hours, & Station Menus Sections
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Consolidated template for dining hall status rows and daily station menus (AGENTS.md Rule 4.3 & 4.5).
 * Reused in identical parity between `DiningMobileView` and `DiningWebView` with zero code drift.
 */

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { RefreshButton } from '@/components/ui/refresh-button';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useDining } from '@/context/dining-context';
import { diningHalls } from '@/data/dining';
import { useTheme } from '@/hooks/use-theme';

export function DiningHallsSection() {
  const theme = useTheme();
  const { venues, refreshDining, isRefreshing } = useDining();

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Dining halls"
        caption="Hours for today"
        right={
          <RefreshButton
            onRefresh={refreshDining}
            refreshing={isRefreshing}
            label="Refresh"
            size="small"
            accessibilityLabel="Refresh dining hall hours and balances"
          />
        }
      />
      <Card flush>
        {venues.map((venue, index) => {
          const isOpen = venue.status === 'Open';

          return (
            <View
              key={venue.id}
              style={[
                styles.hall,
                index < venues.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.border,
                },
              ]}
            >
              <View style={styles.hallTitle}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {venue.name}
                </ThemedText>
                <ThemedText
                  type="caption"
                  themeColor="textMuted"
                  numberOfLines={1}
                >
                  {venue.hours} ·{' '}
                  {venue.acceptsSwipes ? 'Accepts swipes' : 'KnightBucks only'}
                </ThemedText>
              </View>
              <Badge
                label={isOpen ? venue.currentMeal : 'Closed'}
                tone={isOpen ? 'success' : 'neutral'}
              />
            </View>
          );
        })}
      </Card>
    </View>
  );
}

export function DiningMenuSection() {
  const theme = useTheme();
  const commons = diningHalls[0];

  return (
    <View style={styles.section}>
      <SectionHeader title={`Today at ${commons.name}`} />
      <Card>
        {commons.stations?.map((station) => (
          <View key={station.name} style={styles.station}>
            <ThemedText type="caption" style={{ color: theme.tint }}>
              {station.name.toUpperCase()}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {station.items.join(' · ')}
            </ThemedText>
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
    width: '100%',
  },
  hall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  hallTitle: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  station: {
    gap: Spacing.half,
    marginBottom: Spacing.three,
  },
});
