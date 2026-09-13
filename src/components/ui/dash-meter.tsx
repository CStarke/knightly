import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type DashMeterProps = {
  total: number;
  remaining: number;
  color?: string;
  emptyColor?: string;
  height?: number;
};

/** One rounded dash per unit. A dash goes dim as each meal or pass is used. */
export function DashMeter({ total, remaining, color, emptyColor, height = 10 }: DashMeterProps) {
  const theme = useTheme();
  const left = Math.max(0, Math.min(total, remaining));

  return (
    <View style={styles.row} accessibilityLabel={`${left} of ${total} remaining`}>
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={[
            styles.dash,
            {
              height,
              borderRadius: height / 2,
              backgroundColor:
                index < left ? (color ?? theme.tint) : (emptyColor ?? theme.backgroundSelected),
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  dash: {
    flex: 1,
    borderRadius: Radius.pill,
  },
});
