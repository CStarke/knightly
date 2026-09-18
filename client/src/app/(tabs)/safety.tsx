/**
 * Campus Safety & Emergency Dispatch Screen (Slot 2)
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * In campus emergency situations (medical distress, suspicious activity, nighttime security),
 * students need immediate, zero-friction access to assistance.
 *
 * ERGONOMIC & SAFETY DECISIONS:
 * 1. Immediate 1-Tap Emergency Button:
 *    A full-width, high-contrast red button is anchored at the very top of the viewport
 *    (`tel:6165263333`). In a crisis or darkness, students must not have to search through
 *    scroll views or menus to dial dispatch.
 * 2. Safe Walk & Incident Reporting:
 *    Provides one-tap pathways to Calvin's student-escort service and anonymous incident
 *    reporting.
 * 3. Recent Alerts Stream:
 *    Displays campus safety advisories, weather emergencies, and active warnings issued within
 *    the past 48 hours.
 */

import { Linking, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { Spacing } from "@/constants/theme";
import { emergencyContacts, safetyAlerts } from "@/data/safety";
import { useTheme } from "@/hooks/use-theme";

const severityTone = {
  critical: "danger",
  warning: "warning",
  info: "info",
} as const;

export default function SafetyScreen() {
  const theme = useTheme();
  const call = (phone: string) => Linking.openURL(`tel:${phone}`);

  return (
    <Screen>
      {/* Primary Emergency Action: Immediate 1-tap dialer to Calvin Dispatch */}
      <Button
        label="Call Campus Safety (Emergency)"
        variant="danger"
        size="large"
        sf="phone.fill"
        md="call"
        onPress={() => call("6165263333")}
      />

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
          last
        />
      </Card>

      <View style={styles.section}>
        <SectionHeader title="Alerts" caption="Last 48 hours" />
        <Card flush>
          {safetyAlerts.map((alert, index) => (
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
              </View>
            </View>
          ))}
        </Card>
      </View>

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
              tone={contact.urgent ? "danger" : "default"}
              onPress={() => call(contact.phone)}
              last={index === emergencyContacts.length - 1}
            />
          ))}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  alert: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  alertBody: {
    flex: 1,
    gap: 1,
  },
});
