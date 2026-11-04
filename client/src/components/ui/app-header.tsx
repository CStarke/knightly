import type { PropsWithChildren, ReactNode, Ref } from "react";
import { type LayoutChangeEvent, Platform, type StyleProp, StyleSheet, View, type ViewStyle, type ViewInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { navigationChromeStyles } from "@/components/ui/navigation-chrome";
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
  style?: StyleProp<ViewStyle>;
  onLayout?: (event: LayoutChangeEvent) => void;
  /** Measurement anchor for a continuous login-to-header wordmark handoff. */
  wordmarkRef?: Ref<ViewInstance>;
}>;

export function getAppHeaderHeight(insetsTop: number): number {
  const paddingTop = insetsTop > 0 ? insetsTop + Spacing.one : Spacing.three;
  // Title line (34), group gap (2), caption line (16), then bottom padding.
  return paddingTop + 34 + 2 + 16 + Spacing.three;
}

/**
 * Rounded Calvin Maroon masthead with the title and gold period.
 */
export function AppHeader({
  title,
  subtitle,
  left,
  right,
  style,
  children,
  onLayout,
  wordmarkRef,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const paddingTop = insets.top > 0 ? insets.top + Spacing.one : Spacing.three;

  return (
    <View
      onLayout={onLayout}
      style={[styles.header, navigationChromeStyles.header, { paddingTop, backgroundColor: Brand.maroon }, style]}
    >
      <View style={styles.inner}>
        <View style={styles.titleRow}>
          <View style={styles.titleGroup}>
            <View ref={wordmarkRef} collapsable={false} style={styles.wordmarkRow}>
              {left ? <View style={styles.leftContainer}>{left}</View> : null}
              <ThemedText type="title" style={styles.title} numberOfLines={1} ellipsizeMode="tail">
                {title}
              </ThemedText>
              <View style={styles.dot} />
            </View>
            {subtitle ? (
              <ThemedText type="caption" style={styles.subtitle} numberOfLines={1} ellipsizeMode="tail">
                {subtitle}
              </ThemedText>
            ) : null}
          </View>

          {right}
        </View>

        {children}
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
    // Measure the wordmark itself rather than the potentially wider subtitle beneath it.
    alignSelf: "flex-start",
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
});
