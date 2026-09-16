import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type DashMeterProps = {
  total: number;
  remaining: number;
  color?: string;
  emptyColor?: string;
  height?: number;
  /**
   * Presentation variant:
   * - 'chips': Discrete rounded dashes (e.g. 5–21 chips for weekly Core plans).
   * - 'solid': Smooth solid progress bar (e.g. for semester block plans with 30–60 meals).
   * Defaults to 'solid' if total > 25, otherwise 'chips'.
   */
  variant?: 'chips' | 'solid';
};

/** Visual meter for meal allotments. Supports discrete chips or solid progress bar. */
export function DashMeter({
  total,
  remaining,
  color,
  emptyColor,
  height,
  variant,
}: DashMeterProps) {
  const theme = useTheme();
  const left = Math.max(0, Math.min(total, remaining));
  const isSolid = variant === 'solid' || (variant === undefined && total > 25);
  const defaultHeight = isSolid ? 8 : total > 16 ? 8 : 10;
  const actualHeight = height ?? defaultHeight;
  const gap = total > 16 ? 2 : 3;

  if (isSolid) {
    const fraction = total > 0 ? left / total : 0;
    const progressPercent: `${number}%` = `${Math.round(fraction * 1000) / 10}%`;

    return (
      <View
        style={[
          styles.solidTrack,
          {
            height: actualHeight,
            borderRadius: actualHeight / 2,
            backgroundColor: emptyColor ?? 'rgba(255, 255, 255, 0.22)',
          },
        ]}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: total, now: left }}
        accessibilityLabel={`${left} of ${total} remaining`}>
        <View
          style={[
            styles.solidFill,
            {
              width: progressPercent,
              borderRadius: actualHeight / 2,
              backgroundColor: color ?? theme.tint,
            },
          ]}
        />
      </View>
    );
  }

  return (
    <View style={[styles.row, { gap }]} accessibilityLabel={`${left} of ${total} remaining`}>
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={[
            styles.dash,
            {
              height: actualHeight,
              borderRadius: actualHeight / 2,
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
    alignItems: 'center',
  },
  dash: {
    flex: 1,
    borderRadius: Radius.pill,
  },
  solidTrack: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  solidFill: {
    height: '100%',
  },
});
