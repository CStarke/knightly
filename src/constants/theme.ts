/**
 * Design tokens for the Calvin University student app.
 * Brand colors follow Calvin's maroon + gold palette.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Brand = {
  maroon: '#862633',
  maroonDark: '#5E1A24',
  maroonLight: '#B04355',
  gold: '#FFC72C',
} as const;

export const Colors = {
  light: {
    text: '#11181C',
    textSecondary: '#5B6670',
    textMuted: '#8A9299',
    background: '#F7F7F9',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#ECEDF1',
    border: '#E2E4E9',
    tint: Brand.maroon,
    tintSoft: '#F6E9EB',
    onTint: '#FFFFFF',
    accent: Brand.gold,
    danger: '#C62828',
    dangerSoft: '#FDECEC',
    success: '#2E7D32',
    successSoft: '#E8F4E9',
    warning: '#B26A00',
    warningSoft: '#FDF2E0',
  },
  dark: {
    text: '#ECEDEE',
    textSecondary: '#9BA1A6',
    textMuted: '#6C7379',
    background: '#0C0D10',
    backgroundElement: '#17191D',
    backgroundSelected: '#23262B',
    border: '#2A2E34',
    tint: '#C55265',
    tintSoft: '#2A161A',
    onTint: '#FFFFFF',
    accent: Brand.gold,
    danger: '#F2685F',
    dangerSoft: '#2E1616',
    success: '#6FCF77',
    successSoft: '#14251A',
    warning: '#F2B544',
    warningSoft: '#2A2012',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type Theme = (typeof Colors)['light'];

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  pill: 999,
} as const;

/** Space reserved for the fixed top bar on web. */
export const WebHeaderInset = 72;
export const MaxContentWidth = 800;
