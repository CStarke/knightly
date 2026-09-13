import { Linking, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppHeader } from '@/components/ui/app-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { emergencyContacts, safetyAlerts } from '@/data/safety';
import { useTheme } from '@/hooks/use-theme';

const severityColor = {
  critical: 'danger',
  warning: 'warning',
  info: 'textMuted',
} as const;

export default function SafetyScreen() {
  const theme = useTheme();
  const call = (phone: string) => Linking.openURL(`tel:${phone}`);

  return (
    <Screen header={<AppHeader title="Safety" subtitle="Campus Safety · staffed 24/7" />}>
      <Button
        label="Call Campus Safety"
        variant="danger"
        size="large"
        sf="phone.fill"
        md="call"
        onPress={() => call('6165263333')}
      />

      <Card flush>
        <ListRow
          title="Request a Safe Walk"
          subtitle="An escort meets you in about five minutes"
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
              ]}>
              <View style={[styles.dot, { backgroundColor: theme[severityColor[alert.severity]] }]} />
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
              sf={contact.urgent ? 'phone.fill' : 'phone'}
              md="call"
              tone={contact.urgent ? 'danger' : 'default'}
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
    flexDirection: 'row',
    alignItems: 'center',
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
