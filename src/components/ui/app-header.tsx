import type { PropsWithChildren, ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import {
  Brand,
  Fonts,
  MaxContentWidth,
  Spacing,
  WebHeaderInset,
} from "@/constants/theme";

type AppHeaderProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
}>;

/**
 * Calvin Maroon masthead with the title, gold period, and signature 33° scaffolding gold rule.
 */
export function AppHeader({
  title,
  subtitle,
  left,
  right,
  children,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const paddingTop =
    Platform.OS === "web" ? WebHeaderInset : insets.top + Spacing.one;

  return (
    <View
      style={[styles.header, { paddingTop, backgroundColor: Brand.maroon }]}
    >
      <View style={styles.inner}>
        <View style={styles.titleRow}>
          <View style={styles.titleGroup}>
            <View style={styles.wordmarkRow}>
              {left ? <View style={styles.leftContainer}>{left}</View> : null}
              <ThemedText type="title" style={styles.title}>
                {title}
              </ThemedText>
              <View style={styles.dot} />
            </View>
            {subtitle ? (
              <ThemedText type="caption" style={styles.subtitle}>
                {subtitle}
              </ThemedText>
            ) : null}
          </View>

          {right}
        </View>

        {children}
      </View>

      {/* Gold rule with 33° brand scaffolding accent */}
      <View style={styles.ruleContainer}>
        <View style={styles.rule} />
        <View style={styles.ruleAccent} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
    backgroundColor: Brand.maroon,
  },
  inner: {
    width: "100%",
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
    zIndex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  titleGroup: {
    flexShrink: 1,
    gap: 2,
  },
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.one,
  },
  leftContainer: {
    marginRight: Spacing.two,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    color: "#FFFFFF",
    fontFamily: Fonts.serif,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Brand.gold,
    marginBottom: 6,
  },
  subtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  ruleContainer: {
    width: "100%",
    height: 3,
    backgroundColor: Brand.gold,
    position: "relative",
    overflow: "hidden",
  },
  rule: {
    flex: 1,
    backgroundColor: Brand.gold,
  },
  ruleAccent: {
    position: "absolute",
    left: "25%",
    width: 32,
    height: 3,
    backgroundColor: "#FFFFFF",
    transform: [{ skewX: "-33deg" }],
  },
});
