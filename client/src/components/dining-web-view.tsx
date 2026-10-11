/**
 * Campus Dining Desktop Web View Component
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Desktop and widescreen web presentation for Campus Dining & Digital ID (Slot 1).
 * Organizes content into a 2-column split dashboard (AGENTS.md Rule 4.3):
 * - Left Column (380px fixed): Digital Student ID Card, balance DashMeters, reset schedules, and NFC tap teaser.
 * - Right Column (Flex): Live dining halls stream (hours, open status, swipe acceptance) and daily station menus.
 *
 * Reuses `KnightIdCardSection`, `DiningHallsSection`, and `DiningMenuSection` templates with zero duplication.
 */

import { StyleSheet, View } from 'react-native';

import { KnightIdCardSection } from '@/components/dining-card-section';
import { DiningHallsSection, DiningMenuSection } from '@/components/dining-venues-section';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';

export function DiningWebView() {
  return (
    <Screen style={styles.screenInner}>
      <View style={styles.desktopSplit}>
        {/* Left Column: Digital Student ID Card & Balance DashMeters */}
        <View style={styles.desktopLeftCol}>
          <KnightIdCardSection />
        </View>

        {/* Right Column: Dining Halls & Station Menus */}
        <View style={styles.desktopRightCol}>
          <DiningHallsSection />
          <DiningMenuSection />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenInner: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.three,
  },
  desktopSplit: {
    flexDirection: 'row',
    gap: Spacing.four,
    alignItems: 'flex-start',
    width: '100%',
  },
  desktopLeftCol: {
    width: 380,
    gap: Spacing.three,
  },
  desktopRightCol: {
    flex: 1,
    gap: Spacing.three,
  },
});
