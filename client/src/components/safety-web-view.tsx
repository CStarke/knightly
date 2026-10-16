/**
 * Campus Safety Desktop Web View Component
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Desktop and widescreen web presentation for Campus Safety & Emergency Dispatch (Slot 2).
 * Organizes content into a 2-column command center (AGENTS.md Rule 4.3):
 * - Left Column (380px fixed): 1-tap emergency dialer, Safe Walk & incident reporting card, and important emergency numbers.
 * - Right Column (Flex): Active advisories, weather emergencies, and 48-hour active alerts stream.
 *
 * Reuses `SafetyEmergencyButton`, `SafetyQuickAssistCard`, `SafetyAlertsSection`, and `SafetyNumbersSection` with zero duplication.
 */

import { StyleSheet, View } from 'react-native';

import {
  SafetyAlertsSection,
  SafetyEmergencyButton,
  SafetyNumbersSection,
  SafetyQuickAssistCard,
} from '@/components/safety-sections';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';

export function SafetyWebView() {
  return (
    <Screen style={styles.screenInner}>
      <View style={styles.desktopSplit}>
        {/* Left Column: Emergency Dialer, Quick Assistance, & Numbers */}
        <View style={styles.desktopLeftCol}>
          <SafetyEmergencyButton />
          <SafetyQuickAssistCard />
          <SafetyNumbersSection />
        </View>

        {/* Right Column: Active Alerts & Advisories Stream */}
        <View style={styles.desktopRightCol}>
          <SafetyAlertsSection />
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
