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
};

/**
 * Standardized 3-column meal plan balance row:
 * Displays remaining swipes / meals, KnightBucks, and Dining Dollars with vertical dividers.
 */
export function MealPlanStats({ variant = 'hero', style }: MealPlanStatsProps) {
  const isHero = variant === 'hero';

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
        {renderValue(swipesRemaining)}
        {renderLabel(getSwipeMetricLabel(mealPlan))}
      </View>

      <View style={isHero ? styles.heroDivider : styles.lightDivider} />

      {/* 2. KnightBucks */}
      <View style={isHero ? styles.heroStatBox : styles.lightStatBox}>
        {renderValue(`$${mealPlan.knightBucks.toFixed(2)}`)}
        {renderLabel(isHero ? 'KNIGHTBUCKS' : 'KnightBucks')}
      </View>

      <View style={isHero ? styles.heroDivider : styles.lightDivider} />

      {/* 3. Dining Dollars */}
      <View style={isHero ? styles.heroStatBox : styles.lightStatBox}>
        {renderValue(`$${mealPlan.diningDollars.toFixed(2)}`)}
        {renderLabel(isHero ? 'DINING DOLLARS' : 'Dining Dollars')}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  heroStatBox: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  heroStatValue: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 20,
    lineHeight: 24,
  },
  heroStatLabel: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '700',
    letterSpacing: 0.5,
    fontSize: 10,
  },
  heroDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },

  lightStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 12,
    paddingVertical: Spacing.two + 4,
    paddingHorizontal: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  lightStatBox: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  lightStatValue: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    color: Brand.maroon,
  },
  lightStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666666',
  },
  lightDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
});
