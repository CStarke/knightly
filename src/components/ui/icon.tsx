import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type SymbolViewProps = ComponentProps<typeof SymbolView>;
type SymbolNames = Extract<SymbolViewProps['name'], object>;

export type SfSymbolName = NonNullable<SymbolNames['ios']>;
export type MaterialSymbolName = NonNullable<SymbolNames['android']>;

export type IconProps = {
  /** SF Symbol name (iOS). */
  sf: SfSymbolName;
  /** Material Symbol name (Android + web). */
  md: MaterialSymbolName;
  size?: number;
  color?: string;
  weight?: SymbolViewProps['weight'];
  style?: StyleProp<ViewStyle>;
};

export function Icon({ sf, md, size = 20, color, weight = 'medium', style }: IconProps) {
  const theme = useTheme();

  return (
    <SymbolView
      name={{ ios: sf, android: md, web: md }}
      size={size}
      tintColor={color ?? theme.text}
      weight={weight}
      style={style}
    />
  );
}
