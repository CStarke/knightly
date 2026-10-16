/**
 * Campus Safety & Emergency Dispatch Shared Sections
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Consolidated templates for emergency dialing, Safe Walk requests, incident reporting,
 * and active safety advisories (AGENTS.md Rule 4.3 & 4.5).
 * Reused in identical parity between `SafetyMobileView` and `SafetyWebView` with zero code drift.
 */

import { Linking, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { emergencyContacts, safetyAlerts, type SafetyAlert } from '@/data/safety';
import { useTheme } from '@/hooks/use-theme';
import { router } from 'expo-router';

export const severityTone = {
  critical: 'danger',
  warning: 'warning',
  info: 'info',
} as const;

/**
 * Triggers native device telephony dialer via tel: URI scheme.
 */
export function dialPhone(phone: string) {
  return Linking.openURL(`tel:${phone}`);
}

/**
 * Primary 1-Tap Emergency Action Button anchored to Calvin Campus Safety Dispatch.
 */
export function SafetyEmergencyButton() {
  return (
    <Button
      label="Call Campus Safety (Emergency)"
      variant="danger"
      size="large"
      sf="phone.fill"
      md="call"
      onPress={() => dialPhone('6165263333')}
    />
  );
}

/**
 * Quick Assistance Actions Card (Safe Walk, Incident Reporting, Blue Light Locator).
 */
export function SafetyQuickAssistCard() {
  return (
    <Card flush>
      <ListRow
        title="Request a Safe Walk"
        subtitle="Have a friend view your location temporarily"
        sf="figure.walk"
        md="directions_walk"
        onPress={() => {}}
      />
      <ListRow
        title="Report an incident"
        subtitle="Anonymous if you want it to be"
        sf="exclamationmark.bubble.fill"
        md="report"
        onPress={() => {}}
      />
      <ListRow
        title="Blue light phones"
        subtitle="31 locations across campus"
        sf="light.beacon.max.fill"
        md="emergency"
        onPress={() => {}}
      />
      {/* Open the building map on its own screen for more viewing space. */}
      <ListRow
        title="Campus map"
        subtitle="View campus buildings and paths"
        sf="map.fill"
        md="map"
        onPress={() => router.push('/campus-map' as any)}
        last
      />
    </Card>
  );
}

/**
 * Active Campus Safety Advisories & Weather Alerts Stream (Last 48 Hours).
 */
export function SafetyAlertsSection() {
  const theme = useTheme();

  return (
    <View style={styles.section}>
      <SectionHeader title="Alerts" caption="Last 48 hours" />
      <Card flush>
        {safetyAlerts.map((alert: SafetyAlert, index: number) => (
          <View
            key={alert.id}
            style={[
              styles.alert,
              index < safetyAlerts.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.border,
              },
            ]}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: theme[severityTone[alert.severity]] },
              ]}
            />
            <View style={styles.alertBody}>
              <ThemedText type="smallBold">{alert.title}</ThemedText>
              <ThemedText type="caption" themeColor="textMuted">
                {alert.area} · {alert.at}
              </ThemedText>
              {alert.detail ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.alertDetail}>
                  {alert.detail}
                </ThemedText>
              ) : null}
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}

/**
 * Essential Campus Emergency & University Services Directory.
 */
export function SafetyNumbersSection() {
  return (
    <View style={styles.section}>
      <SectionHeader title="Numbers" />
      <Card flush>
        {emergencyContacts.map((contact, index) => (
          <ListRow
            key={contact.id}
            title={contact.name}
            subtitle={contact.detail}
            sf="phone.fill"
            md="call"
            tone={contact.urgent ? 'danger' : 'default'}
            onPress={() => dialPhone(contact.phone)}
            last={index === emergencyContacts.length - 1}
          />
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
  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  alertBody: {
    flex: 1,
    gap: 3,
  },
  alertDetail: {
    marginTop: 2,
    lineHeight: 18,
  },
});
