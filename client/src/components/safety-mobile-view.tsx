/**
 * Campus Safety Mobile View Component
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Mobile presentation for Campus Safety & Emergency Dispatch (Slot 2).
 * Displays a focused vertical stack inside `<Screen>` for phone displays (AGENTS.md Rule 4.3).
 * Reuses `SafetyEmergencyButton`, `SafetyQuickAssistCard`, `SafetyAlertsSection`, and `SafetyNumbersSection`.
 */

import { StyleSheet } from 'react-native';

import {
  SafetyAlertsSection,
  SafetyEmergencyButton,
  SafetyNumbersSection,
  SafetyQuickAssistCard,
} from '@/components/safety-sections';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';

export function SafetyMobileView() {
  return (
    <Screen style={styles.screenInner}>
      {/* Primary Emergency Action: Immediate 1-tap dialer to Calvin Dispatch */}
      <SafetyEmergencyButton />

      {/* Quick Assistance Actions (Safe Walk, Incident Reporting, Blue Light Locator) */}
      <SafetyQuickAssistCard />

      {/* Active Campus Safety Advisories & Alerts Stream */}
      <SafetyAlertsSection />

      {/* Essential Emergency & University Services Directory */}
      <SafetyNumbersSection />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenInner: {
    gap: Spacing.three,
    width: '100%',
  },
});
