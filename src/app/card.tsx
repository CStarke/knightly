import * as Brightness from "expo-brightness";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useRef } from "react";
import { AppState, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/avatar";
import { Barcode } from "@/components/barcode";
import { HeaderBackButton } from "@/components/ui/header-back-button";
import { Brand, Fonts, Radius, Spacing } from "@/constants/theme";
import { getSwipeMetricLabel, mealPlan, swipesRemaining } from "@/data/dining";
import { fullName, student } from "@/data/student";

/**
 * Raise the screen while the ID is up so dining hall scanners can read it reliably,
 * and guarantee it reverts back to the user's device default when exiting or backgrounding.
 */
function useBoostedBrightness() {
  const originalBrightnessRef = useRef<number | null>(null);
  const isBoostedRef = useRef(false);

  const restore = useCallback(async () => {
    if (Platform.OS === "web") return;
    if (!isBoostedRef.current && originalBrightnessRef.current === null) return;
    isBoostedRef.current = false;

    try {
      if (Platform.OS === "android") {
        await Brightness.restoreSystemBrightnessAsync();
      } else if (originalBrightnessRef.current !== null) {
        await Brightness.setBrightnessAsync(originalBrightnessRef.current);
      }
    } catch {
      // Ignore if brightness control unavailable
    }
  }, []);

  const boost = useCallback(async () => {
    if (Platform.OS === "web") return;
    try {
      if (originalBrightnessRef.current === null) {
        const current = await Brightness.getBrightnessAsync();
        // Guard against caching 1.0 in case of re-entry or double-mount
        if (current < 0.99 || originalBrightnessRef.current === null) {
          originalBrightnessRef.current = current;
        }
      }

      await Brightness.setBrightnessAsync(1);
      isBoostedRef.current = true;
    } catch {
      // Ignore if brightness control unavailable
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      boost();

      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") {
          boost();
        } else {
          restore();
        }
      });

      return () => {
        subscription.remove();
        restore();
      };
    }, [boost, restore])
  );

  return restore;
}

export default function KnightCardScreen() {
  const restoreBrightness = useBoostedBrightness();

  const handleClose = () => {
    restoreBrightness();
    router.back();
  };

  return (
    <Pressable
      style={styles.screen}
      onPress={handleClose}
      accessibilityRole="button"
      accessibilityLabel="Close student ID"
    >
      <StatusBar style="light" />

      <View style={styles.cardFrame}>
        {/* Calvin Maroon Header Bar */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <HeaderBackButton
              onPress={handleClose}
              accessibilityLabel="Close student ID"
            />
            <Text style={styles.universityTitle}>Calvin University</Text>
          </View>
          <Text style={styles.cardTypeLabel}>KNIGHT CARD</Text>
        </View>

        {/* 33-degree Gold Rule Accent */}
        <View style={styles.goldScaffoldingRule}>
          <View style={styles.goldLine} />
          <View style={styles.goldSlant} />
        </View>

        {/* Card Body */}
        <View style={styles.cardBody}>
          {/* Student Identity Row */}
          <View style={styles.studentRow}>
            <Avatar
              name={fullName}
              initials={`${student.firstName[0]}${student.lastName[0]}`}
              size={64}
            />
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{fullName}</Text>
              <Text style={styles.studentMeta}>
                {student.standing} · {student.major}
              </Text>
              <Text style={styles.studentIdNumber}>ID: {student.id}</Text>
            </View>
          </View>

          {/* Barcode Section */}
          <View style={styles.barcodeWell}>
            <Barcode value={student.barcode} height={100} />
          </View>

          {/* Balance & Meal Plan Metrics */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum} numberOfLines={1}>
                {swipesRemaining}
              </Text>
              <Text
                style={styles.statLabel}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {getSwipeMetricLabel(mealPlan)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNum} numberOfLines={1}>
                ${mealPlan.knightBucks.toFixed(2)}
              </Text>
              <Text
                style={styles.statLabel}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                KnightBucks
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNum} numberOfLines={1}>
                ${mealPlan.diningDollars.toFixed(2)}
              </Text>
              <Text
                style={styles.statLabel}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                Dining Dollars
              </Text>
            </View>
          </View>

          <Text style={styles.hint}>Tap anywhere to close</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "rgba(12, 13, 16, 0.88)",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.four,
  },
  cardFrame: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.xl,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
  cardHeader: {
    paddingLeft: Spacing.two,
    paddingRight: Spacing.four,
    paddingVertical: Spacing.three,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Brand.maroon,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  universityTitle: {
    color: "#FFFFFF",
    fontFamily: Fonts.serif,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  cardTypeLabel: {
    color: Brand.gold,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  goldScaffoldingRule: {
    height: 4,
    backgroundColor: Brand.gold,
    position: "relative",
    overflow: "hidden",
  },
  goldLine: {
    flex: 1,
    backgroundColor: Brand.gold,
  },
  goldSlant: {
    position: "absolute",
    right: 48,
    width: 24,
    height: 4,
    backgroundColor: "#FFFFFF",
    transform: [{ skewX: "-33deg" }],
  },
  cardBody: {
    padding: Spacing.four,
    gap: Spacing.four,
    alignItems: "center",
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    width: "100%",
  },
  studentInfo: {
    flex: 1,
    gap: 2,
  },
  studentName: {
    color: "#11181C",
    fontFamily: Fonts.serif,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  studentMeta: {
    color: "#545F68",
    fontSize: 13,
    fontWeight: "600",
  },
  studentIdNumber: {
    color: Brand.maroon,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  barcodeWell: {
    width: "100%",
    backgroundColor: "#FAFAFC",
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E2E4E9",
    padding: Spacing.two,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    paddingVertical: Spacing.two,
    backgroundColor: "#F6F6F8",
    borderRadius: Radius.md,
  },
  statBox: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 2,
  },
  statNum: {
    color: Brand.maroon,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  statLabel: {
    color: "#717982",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    textAlign: "center",
    width: "100%",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E2E4E9",
    alignSelf: "center",
  },
  hint: {
    color: "#838D95",
    fontSize: 12,
    fontWeight: "600",
  },
});
