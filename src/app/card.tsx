import * as Brightness from "expo-brightness";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { Barcode } from "@/components/barcode";
import { Brand, Spacing } from "@/constants/theme";
import { mealPlan, swipesRemaining } from "@/data/dining";
import { fullName, student } from "@/data/student";

/** Raise the screen while the ID is up so dining hall scanners can read it, then put it back. */
function useBoostedBrightness() {
  useEffect(() => {
    if (Platform.OS === "web") return;

    let previous: number | null = null;
    let cancelled = false;

    (async () => {
      try {
        previous = await Brightness.getBrightnessAsync();
        if (!cancelled) await Brightness.setBrightnessAsync(1);
      } catch {
        // Brightness control is unavailable on this device; the ID still shows.
      }
    })();

    return () => {
      cancelled = true;
      if (previous !== null) {
        Brightness.setBrightnessAsync(previous).catch(() => {});
      }
    };
  }, []);
}

export default function KnightCardScreen() {
  useBoostedBrightness();

  return (
    <Pressable
      style={styles.screen}
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel="Close student ID"
    >
      <StatusBar style="dark" />

      <View style={styles.content}>
        <View style={styles.identity}>
          <Text style={styles.university}>CALVIN UNIVERSITY</Text>
          <Text style={styles.name}>{fullName}</Text>
        </View>

        <Barcode value={student.cardNumber} height={110} />

        <View style={styles.identity}>
          <Text style={styles.meta}>
            {swipesRemaining} swipes left · ${mealPlan.knightBucks.toFixed(2)}{" "}
            KnightBucks
          </Text>
          <Text style={styles.hint}>Tap anywhere to close</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.four,
  },
  content: {
    width: "100%",
    maxWidth: 520,
    alignItems: "center",
    gap: Spacing.five,
  },
  identity: {
    alignItems: "center",
    gap: Spacing.one,
  },
  university: {
    color: Brand.maroon,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
  },
  name: {
    color: "#111111",
    fontSize: 26,
    fontWeight: "700",
  },
  meta: {
    color: "#555555",
    fontSize: 14,
  },
  hint: {
    color: "#999999",
    fontSize: 12,
    marginTop: Spacing.two,
  },
});
