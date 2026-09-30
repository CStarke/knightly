import { useEffect, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Brand } from '@/constants/theme';

export type BlinkingCursorProps = {
  /** Color of the cursor line (defaults to Brand.gold) */
  color?: string;
  /** Height of the cursor line in dp (defaults to 16) */
  height?: number;
  /** Width of the cursor line in dp (defaults to 1.5) */
  width?: number;
  /** Optional custom container style overrides */
  style?: StyleProp<ViewStyle>;
};

/**
 * Standardized blinking cursor for masked numeric and segmented text inputs.
 * Blinks at 530ms cadence matching native iOS / Android text cursors.
 */
export function BlinkingCursor({
  color = Brand.gold,
  height = 16,
  width = 1.5,
  style,
}: BlinkingCursorProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible((prev) => !prev);
    }, 530);
    return () => clearInterval(id);
  }, []);

  return (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: color,
          borderRadius: 0,
          opacity: visible ? 1 : 0,
        },
        style,
      ]}
    />
  );
}
