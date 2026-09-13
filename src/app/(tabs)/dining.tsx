import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { AppHeader } from "@/components/ui/app-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DashMeter } from "@/components/ui/dash-meter";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { Brand, Radius, Spacing } from "@/constants/theme";
import {
  diningHalls,
  formatAmount,
  guestPassesRemaining,
  hallStatus,
  mealPlan,
  swipesRemaining,
  transactions,
} from "@/data/dining";
import { fullName } from "@/data/student";
import { useTheme } from "@/hooks/use-theme";

export default function DiningScreen() {
  const theme = useTheme();
  const commons = diningHalls[0];

  return (
    <Screen header={<AppHeader title="Dining" subtitle={mealPlan.name} />}>
      <Pressable
        onPress={() => router.push('/card')}
        accessibilityRole="button"
        accessibilityLabel="Show student ID full screen"
        style={({ pressed }) => pressed && styles.pressed}
      >
        <View
          style={[
            styles.cardHero,
            {
              experimental_backgroundImage: `linear-gradient(140deg, ${Brand.maroon}, ${Brand.maroonDark})`,
            },
          ]}
        >
          <View style={styles.cardTop}>
            <View style={styles.cardIdentity}>
              <ThemedText type="caption" style={styles.cardLabel}>
                Calvin University
              </ThemedText>
              <ThemedText type="subtitle" style={styles.cardName}>
                {fullName}
              </ThemedText>
            </View>
            <Icon
              sf="viewfinder.rectangular"
              md="barcode_scanner"
              size={26}
              color={Brand.gold}
            />
          </View>

          <View style={styles.cardStats}>
            <View style={styles.cardStat}>
              <ThemedText style={styles.cardStatValue}>
                {swipesRemaining}
              </ThemedText>
              <ThemedText type="caption" style={styles.cardLabel}>
                Swipes left this week
              </ThemedText>
            </View>
            <View style={styles.cardStat}>
              <ThemedText style={styles.cardStatValue}>
                ${mealPlan.knightBucks.toFixed(2)}
              </ThemedText>
              <ThemedText type="caption" style={styles.cardLabel}>
                KnightBucks
              </ThemedText>
            </View>
          </View>

          <DashMeter
            total={mealPlan.swipesPerWeek}
            remaining={swipesRemaining}
            color={Brand.gold}
            emptyColor="rgba(255,255,255,0.22)"
          />

          <ThemedText type="caption" style={styles.cardHint}>
            Tap anywhere on the card to show your ID
          </ThemedText>
        </View>
      </Pressable>

      <Card>
        <View style={styles.balance}>
          <View style={styles.balanceRow}>
            <ThemedText type="smallBold">Guest passes</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {guestPassesRemaining} of {mealPlan.guestPasses} left
            </ThemedText>
          </View>
          <DashMeter
            total={mealPlan.guestPasses}
            remaining={guestPassesRemaining}
          />
        </View>

        <View style={[styles.moneyRow, { borderTopColor: theme.border }]}>
          <ThemedText type="smallBold">Dining Dollars</ThemedText>
          <ThemedText type="smallBold">
            ${mealPlan.diningDollars.toFixed(2)}
          </ThemedText>
        </View>
        <View style={[styles.moneyRow, { borderTopColor: theme.border }]}>
          <ThemedText type="smallBold">KnightBucks</ThemedText>
          <ThemedText type="smallBold">
            ${mealPlan.knightBucks.toFixed(2)}
          </ThemedText>
        </View>

        <ThemedText
          type="caption"
          themeColor="textMuted"
          style={styles.resetNote}
        >
          Swipes reset {mealPlan.weekResetsOn}
        </ThemedText>
      </Card>

      <Card style={[styles.nfc, { borderColor: theme.tint }]}>
        <Icon sf="wave.3.right" md="contactless" size={22} color={theme.tint} />
        <View style={styles.nfcBody}>
          <View style={styles.nfcTitle}>
            <ThemedText type="smallBold">Tap to enter</ThemedText>
            <Badge label="Coming soon" tone="brand" />
          </View>
          <ThemedText type="caption" themeColor="textSecondary">
            Unlock dining halls and residence halls with your phone over NFC.
            Pilot sign-ups open in November.
          </ThemedText>
        </View>
      </Card>

      <View style={styles.section}>
        <SectionHeader title="Dining halls" caption="Hours for today" />
        <Card flush>
          {diningHalls.map((hall, index) => {
            const status = hallStatus(hall);

            return (
              <View
                key={hall.id}
                style={[
                  styles.hall,
                  index < diningHalls.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: theme.border,
                  },
                ]}
              >
                <View style={styles.hallTitle}>
                  <ThemedText type="smallBold">{hall.name}</ThemedText>
                  <ThemedText type="caption" themeColor="textMuted">
                    {status.detail} ·{" "}
                    {hall.acceptsSwipes ? "Accepts swipes" : "KnightBucks only"}
                  </ThemedText>
                </View>
                <Badge
                  label={status.open ? status.label : "Closed"}
                  tone={status.open ? "success" : "neutral"}
                />
              </View>
            );
          })}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title={`Today at ${commons.name}`} />
        <Card>
          {commons.stations?.map((station) => (
            <View key={station.name} style={styles.station}>
              <ThemedText type="caption" style={{ color: theme.tint }}>
                {station.name.toUpperCase()}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {station.items.join(" · ")}
              </ThemedText>
            </View>
          ))}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Recent activity" caption="Last 7 days" />
        <Card flush>
          {transactions.map((tx, index) => (
            <View
              key={tx.id}
              style={[
                styles.tx,
                index < transactions.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.border,
                },
              ]}
            >
              <View style={styles.txBody}>
                <ThemedText type="smallBold">{tx.location}</ThemedText>
                <ThemedText type="caption" themeColor="textMuted">
                  {tx.detail} · {tx.at}
                </ThemedText>
              </View>
              <ThemedText
                type="smallBold"
                style={{ color: tx.amount > 0 ? theme.success : theme.text }}
              >
                {formatAmount(tx)}
              </ThemedText>
            </View>
          ))}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.9,
  },
  cardHero: {
    borderRadius: Radius.xl,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  cardIdentity: {
    flex: 1,
    gap: 1,
  },
  cardLabel: {
    color: "rgba(255,255,255,0.7)",
  },
  cardName: {
    color: "#FFFFFF",
  },
  cardStats: {
    flexDirection: "row",
    gap: Spacing.five,
  },
  cardStat: {
    gap: Spacing.half,
  },
  cardStatValue: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
  },
  cardHint: {
    color: "rgba(255,255,255,0.6)",
  },
  balance: {
    gap: Spacing.two,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  moneyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Spacing.three,
    marginTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  resetNote: {
    marginTop: Spacing.three,
  },
  nfc: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.three,
    borderStyle: "dashed",
    borderWidth: 1,
  },
  nfcBody: {
    flex: 1,
    gap: Spacing.one,
  },
  nfcTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  section: {
    gap: Spacing.two,
  },
  hall: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
    padding: Spacing.three,
  },
  hallTitle: {
    flex: 1,
    gap: 1,
  },
  station: {
    gap: Spacing.half,
    marginBottom: Spacing.three,
  },
  tx: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
    padding: Spacing.three,
  },
  txBody: {
    flex: 1,
    gap: 1,
  },
});
