/**
 * Campus Dining Mobile View Component
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Mobile presentation for Campus Dining & Digital ID (Slot 1).
 * Displays a focused vertical stack inside `<Screen>` for phone displays (AGENTS.md Rule 4.3).
 * Reuses `KnightIdCardSection`, `DiningHallsSection`, and `DiningMenuSection` templates with zero duplication.
 */

import { StyleSheet } from 'react-native';

import { KnightIdCardSection } from '@/components/dining-card-section';
import { DiningHallsSection, DiningMenuSection } from '@/components/dining-venues-section';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';

export function DiningMobileView() {
  return (
    <Screen style={styles.screenInner}>
      <KnightIdCardSection />
      <DiningHallsSection />
      <DiningMenuSection />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenInner: {
    gap: Spacing.three,
    width: '100%',
  },
});
