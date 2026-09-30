/**
 * Campus Dining & Digital ID Screen (Slot 1)
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * The Dining screen serves two critical daily student routines:
 * 1. Digital Student ID Barcode Card: Tapping the top hero card expands to a full-screen
 *    high-brightness barcode (`/card`) for scanning at dining hall turnstiles and library checkouts,
 *    eliminating the need to carry physical plastic student ID cards.
 * 2. Real-Time Balance & Reset Meters: Visualizes remaining meal swipes, Flex dollars, and guest
 *    passes alongside exact reset schedules (e.g. Sunday midnight reset vs semester block counts),
 *    preventing unexpected meal swipe expirations.
 */

import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DashMeter } from "@/components/ui/dash-meter";
import { Icon } from "@/components/ui/icon";
import { MealPlanStats } from "@/components/meal-plan-stats";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { Brand, Fonts, Radius, Spacing } from "@/constants/theme";
import { useDiningActivity } from "@/context/dining-activity-context";
import {
  diningHalls,
  flexMealsRemaining,
  getSwipeResetText,
  getSwipesTotal,
  guestPassesRemaining,
  hallStatus,
  hasFlexMeals,
  hasGuestPasses,
  isBlockPlan,
  mealPlan,
  swipesRemaining,
} from "@/data/dining";
import { fullName } from "@/data/student";
import { useTheme } from "@/hooks/use-theme";

export default function DiningScreen() {
  const theme = useTheme();
  const { openActivity } = useDiningActivity();
  const commons = diningHalls[0];

  return (
    <Screen>
      <Pressable
        onPress={() => router.push("/card")}
        accessibilityRole="button"
        accessibilityLabel="Show student ID full screen"
        style={({ pressed }) => pressed && styles.pressed}
      >
        <View style={styles.cardHero}>
          <View style={styles.cardTop}>
            <View style={styles.cardIdentityRow}>
              <View style={styles.cardIdentity}>
                <ThemedText type="subtitle" style={styles.cardName}>
                  {fullName}
                </ThemedText>
                <ThemedText style={styles.cardMealPlan}>
                  {mealPlan.name.toUpperCase()}
                </ThemedText>
              </View>
            </View>
            <Icon
              sf="viewfinder.rectangular"
              md="barcode_scanner"
              size={24}
              color={Brand.gold}
            />
          </View>

          {/* 3 Metrics: Swipes Left / Meals Left, KnightBucks, Dining Dollars */}
          <MealPlanStats variant="hero" />

          {/* Main Swipes DashMeter in Calvin Gold */}
          <DashMeter
            total={getSwipesTotal(mealPlan)}
            remaining={swipesRemaining}
            color={Brand.gold}
            emptyColor="rgba(255,255,255,0.22)"
            variant={isBlockPlan(mealPlan) ? "solid" : "chips"}
          />

          {/* Secondary Allotments: Flex Meals (Renew Blue dot) & Guest Passes (True Green dot) */}
          {(hasFlexMeals(mealPlan) || hasGuestPasses(mealPlan)) && (
            <View style={styles.subMetersRow}>
              {hasFlexMeals(mealPlan) && (
                <SubMeter
                  label="Flex meals"
                  color={Brand.renewBlue}
                  remaining={flexMealsRemaining}
                  total={mealPlan.flexMeals ?? 0}
                />
              )}

              {hasGuestPasses(mealPlan) && (
                <SubMeter
                  label="Guest passes"
                  color={Brand.trueGreen}
                  remaining={guestPassesRemaining}
                  total={mealPlan.guestPasses ?? 0}
                />
              )}
            </View>
          )}

          <ThemedText type="caption" style={styles.cardHint}>
            Tap anywhere on the card to show your ID
          </ThemedText>
        </View>
      </Pressable>

      {/* Info Bar immediately below the Knight Card on ambient background */}
      <View style={styles.subCardBar}>
        <ThemedText type="caption" themeColor="textMuted">
          {getSwipeResetText(mealPlan)}
        </ThemedText>

        <Pressable
          onPress={openActivity}
          style={({ pressed }) => [
            styles.historyLink,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="View recent transaction history"
          hitSlop={8}
        >
          <ThemedText
            type="caption"
            style={[styles.historyLinkText, { color: theme.tint }]}
          >
            Recent history
          </ThemedText>
          <Icon
            sf="chevron.right"
            md="chevron_right"
            size={13}
            color={theme.tint}
          />
        </Pressable>
      </View>

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
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {hall.name}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    themeColor="textMuted"
                    numberOfLines={1}
                  >
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.9,
  },
  cardHero: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.three,
    position: "relative",
    overflow: "hidden",
    backgroundColor: Brand.maroon,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  cardIdentityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two + 2,
    flex: 1,
  },
  cardIdentity: {
    flex: 1,
    gap: 3,
  },
  cardMealPlan: {
    color: Brand.gold,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  cardName: {
    color: "#FFFFFF",
    fontFamily: Fonts.serif,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "700",
  },
  subMetersRow: {
    flexDirection: "row",
    gap: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.18)",
  },
  subMeterCol: {
    flex: 1,
    gap: Spacing.one,
  },
  subMeterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subMeterTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  colorPip: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subMeterLabel: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  cardHint: {
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
  subCardBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.half,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  historyLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  historyLinkText: {
    fontWeight: "700",
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
    minWidth: 0,
    gap: 1,
  },
  station: {
    gap: Spacing.half,
    marginBottom: Spacing.three,
  },
});

function SubMeter({
  label,
  color,
  remaining,
  total,
}: {
  label: string;
  color: string;
  remaining: number;
  total: number;
}) {
  return (
    <View style={styles.subMeterCol}>
      <View style={styles.subMeterHeader}>
        <View style={styles.subMeterTitleRow}>
          <View style={[styles.colorPip, { backgroundColor: color }]} />
          <ThemedText type="caption" style={styles.subMeterLabel} numberOfLines={1}>
            {label}
          </ThemedText>
        </View>
        <ThemedText type="caption" style={styles.subMeterLabel} numberOfLines={1}>
          {remaining} of {total}
        </ThemedText>
      </View>
      <DashMeter
        total={total}
        remaining={remaining}
        color={color}
        height={6}
        emptyColor="rgba(255,255,255,0.2)"
      />
    </View>
  );
}
