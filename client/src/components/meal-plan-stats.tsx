import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import {
  getSwipeMetricLabel,
  mealPlan,
  swipesRemaining,
} from '@/data/dining';

export type MealPlanStatsProps = {
  /** Variant theme: 'hero' for maroon dining hero card, 'light' for white student ID card */
  variant?: 'hero' | 'light';
  style?: StyleProp<ViewStyle>;
  /** Optional dynamic overrides from Supabase dining account */
  swipesRemaining?: number;
  knightBucks?: number;
  diningDollars?: number;
  swipeMetricLabel?: string;
};

/**
 * Standardized 3-column meal plan balance row:
 * Displays remaining swipes / meals, KnightBucks, and Dining Dollars with vertical dividers.
 */
export function MealPlanStats({
  variant = 'hero',
  style,
  swipesRemaining: propSwipes,
  knightBucks: propKnightBucks,
  diningDollars: propDiningDollars,
  swipeMetricLabel: propLabel,
}: MealPlanStatsProps) {
  const isHero = variant === 'hero';

  const effectiveSwipes = propSwipes !== undefined ? propSwipes : swipesRemaining;
  const effectiveKnightBucks = propKnightBucks !== undefined ? propKnightBucks : mealPlan.knightBucks;
  const effectiveDiningDollars = propDiningDollars !== undefined ? propDiningDollars : mealPlan.diningDollars;
  const effectiveLabel = propLabel !== undefined ? propLabel : getSwipeMetricLabel(mealPlan);

  const renderValue = (val: string | number) => {
    if (isHero) {
      return (
        <ThemedText style={styles.heroStatValue} numberOfLines={1}>
          {val}
        </ThemedText>
      );
    }
    return (
      <Text style={styles.lightStatValue} numberOfLines={1}>
        {val}
      </Text>
    );
  };

  const renderLabel = (label: string) => {
    if (isHero) {
      return (
        <ThemedText
          type="caption"
          style={styles.heroStatLabel}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {label.toUpperCase()}
        </ThemedText>
      );
    }
    return (
      <Text
        style={styles.lightStatLabel}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {label}
      </Text>
    );
  };

  return (
    <View style={[isHero ? styles.heroStatsRow : styles.lightStatsRow, style]}>
      {/* 1. Meal Swipes */}
      <View style={isHero ? styles.heroStatBox : styles.lightStatBox}>
        {renderValue(effectiveSwipes)}
        {renderLabel(effectiveLabel)}
      </View>

      <View style={isHero ? styles.heroDivider : styles.lightDivider} />

      {/* 2. KnightBucks */}
      <View style={isHero ? styles.heroStatBox : styles.lightStatBox}>
        {renderValue(`$${effectiveKnightBucks.toFixed(2)}`)}
        {renderLabel(isHero ? 'KNIGHTBUCKS' : 'KnightBucks')}
      </View>

      <View style={isHero ? styles.heroDivider : styles.lightDivider} />

      {/* 3. Dining Dollars */}
      <View style={isHero ? styles.heroStatBox : styles.lightStatBox}>
        {renderValue(`$${effectiveDiningDollars.toFixed(2)}`)}
        {renderLabel(isHero ? 'DINING DOLLARS' : 'Dining Dollars')}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    marginBottom: Spacing.two,
  },
  lightStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F7',
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    marginBottom: Spacing.three,
  },
  heroStatBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  lightStatBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  lightStatValue: {
    color: '#11181C',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  heroStatLabel: {
    color: Brand.gold,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  lightStatLabel: {
    color: '#666666',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  heroDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  lightDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: '#D1D5DB',
  },
});
