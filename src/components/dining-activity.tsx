import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Card } from "@/components/ui/card";
import {
  Icon,
  type MaterialSymbolName,
  type SfSymbolName,
} from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { Brand, Spacing } from "@/constants/theme";
import {
  diningDollarsSpentLastWeek,
  formatAmount,
  knightBucksSpentLastWeek,
  swipesUsedLastWeek,
  transactions,
  type Transaction,
} from "@/data/dining";
import { useTheme } from "@/hooks/use-theme";

function getTxIcon(tx: Transaction): {
  sf: SfSymbolName;
  md: MaterialSymbolName;
  color: string;
} {
  switch (tx.kind) {
    case "swipe":
      return { sf: "fork.knife", md: "restaurant", color: Brand.maroon };
    case "deposit":
      return {
        sf: "arrow.down.circle.fill",
        md: "add_circle",
        color: "#2E7D32",
      };
    case "dining-dollars":
      return { sf: "bag.fill", md: "shopping_bag", color: "#D97706" };
    case "knightbucks":
    default:
      if (tx.location.toLowerCase().includes("coffee")) {
        return {
          sf: "cup.and.saucer.fill",
          md: "local_cafe",
          color: Brand.maroon,
        };
      }
      return {
        sf: "creditcard.fill",
        md: "credit_card",
        color: Brand.goldDark,
      };
  }
}

export function DiningActivityView() {
  const theme = useTheme();

  return (
    <Screen>
      {/* Summary of usage over the last 7 days */}
      <Card>
        <View style={styles.cardHeader}>
          <ThemedText style={styles.cardHeaderTitle}>
            Used in the past 7 days
          </ThemedText>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <ThemedText style={styles.summaryNum}>
              {swipesUsedLastWeek}
            </ThemedText>
            <ThemedText
              type="caption"
              style={styles.summaryLabel}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              Swipes used
            </ThemedText>
          </View>

          <View
            style={[styles.summaryDivider, { backgroundColor: theme.border }]}
          />

          <View style={styles.summaryBox}>
            <ThemedText style={styles.summaryNum}>
              ${knightBucksSpentLastWeek.toFixed(2)}
            </ThemedText>
            <ThemedText
              type="caption"
              style={styles.summaryLabel}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              KnightBucks
            </ThemedText>
          </View>

          <View
            style={[styles.summaryDivider, { backgroundColor: theme.border }]}
          />

          <View style={styles.summaryBox}>
            <ThemedText style={styles.summaryNum}>
              ${diningDollarsSpentLastWeek.toFixed(2)}
            </ThemedText>
            <ThemedText
              type="caption"
              style={styles.summaryLabel}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              Dining Dollars
            </ThemedText>
          </View>
        </View>
      </Card>

      {/* Full Recent Activity List */}
      <Card flush>
        {transactions.map((tx, index) => {
          const icon = getTxIcon(tx);
          const isDeposit = tx.amount > 0;

          return (
            <View
              key={tx.id}
              style={[
                styles.txRow,
                index < transactions.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.border,
                },
              ]}
            >
              <View
                style={[styles.iconPill, { backgroundColor: theme.tintSoft }]}
              >
                <Icon sf={icon.sf} md={icon.md} size={18} color={icon.color} />
              </View>

              <View style={styles.txInfo}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {tx.location}
                </ThemedText>
                <ThemedText
                  type="caption"
                  themeColor="textMuted"
                  numberOfLines={1}
                >
                  {tx.detail} · {tx.at}
                </ThemedText>
              </View>

              <ThemedText
                type="smallBold"
                style={{
                  color: isDeposit ? theme.success : theme.text,
                  fontWeight: "700",
                }}
              >
                {formatAmount(tx)}
              </ThemedText>
            </View>
          );
        })}
      </Card>

      {/* Footnote */}
      <ThemedText type="caption" themeColor="textMuted" style={styles.footnote}>
        Transactions from the last 7 days are displayed. Full transaction
        statements are available in the Calvin Student Life portal.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: Spacing.one,
  },
  cardHeaderTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.one,
  },
  summaryBox: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 2,
  },
  summaryNum: {
    fontSize: 20,
    fontWeight: "800",
    color: Brand.gold,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9CA3AF",
    letterSpacing: 1.2,
    textAlign: "center",
    width: "100%",
  },
  summaryDivider: {
    width: 1,
    height: 34,
    alignSelf: "center",
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - 2,
  },
  iconPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  txInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  footnote: {
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: Spacing.three,
    marginTop: -Spacing.one,
  },
});
