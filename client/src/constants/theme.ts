/**
 * Design Tokens & Brand System
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Knightly adheres to Calvin University's official brand guidelines (Maroon & Gold) while adapting
 * them specifically for modern high-DPI OLED and LCD displays.
 *
 * WHY COLOR TUNING (CALVIN MAROON #5E1A24 VS #8C2131):
 * Calvin University's official print spot color is Pantone 201 C (#8C2131).
 * On printed cardstock and fabric, ink absorbs ambient light to produce a dark, regal wine tone.
 * However, on backlit mobile OLED displays, emitting raw #8C2131 appears bright saturated red/magenta,
 * which looks like a critical error alert rather than collegiate maroon.
 * Tuning `Brand.maroon` to `#5E1A24` restores the rich, stately visual depth on digital screens.
 *
 * WHY DUAL-MODE SEMANTIC TOKENS (Colors.light & Colors.dark):
 * Every UI element references semantic tokens (`text`, `textSecondary`, `background`, `border`)
 * rather than hardcoded hex values, enabling seamless system appearance switching and WCAG AA
 * contrast compliance in both dark and light modes.
 */

import "@/global.css";

import { Platform } from "react-native";

export const Brand = {
  // Primary Palette
  maroon: '#5E1A24',
  maroonClassic: '#8C2131',
  maroonDark: '#450F18',
  maroonLight: '#8C2131',
  gold: '#F3CD00',
  goldDark: '#C9A900',
  goldSoft: '#FFFBEA',

  // Secondary Palette (Pantone 200 U, 7458 U, 359 U)
  brightRed: '#C2002F',
  renewBlue: '#71B1C8',
  renewBlueSoft: '#EEF6F9',
  trueGreen: '#A2D683',
  renewGreen: '#A2D683',
  trueGreenSoft: '#F2F9EE',
  renewGreenSoft: '#F2F9EE',

  // Official Neutrals
  charcoal: '#1C1D21',
  pureBlack: '#000000',
  pureWhite: '#FFFFFF',
} as const;

export const Colors = {
  light: {
    text: '#11181C',
    textSecondary: '#545F68',
    textMuted: '#838D95',
    background: '#F6F6F8',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#ECECEF',
    border: '#E0E2E7',
    tint: Brand.maroon,
    tintSoft: '#F7E9EB',
    onTint: '#FFFFFF',
    accent: Brand.gold,
    accentDark: Brand.goldDark,
    accentSoft: Brand.goldSoft,
    danger: Brand.brightRed,
    dangerSoft: '#FDE8EC',
    success: '#2E7D32',
    successSoft: Brand.trueGreenSoft,
    warning: '#D97706',
    warningSoft: '#FEF3C7',
    info: Brand.renewBlue,
    infoSoft: Brand.renewBlueSoft,
  },
  dark: {
    text: '#F1F2F4',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    background: '#0B0C0E',
    backgroundElement: '#141619',
    backgroundSelected: '#1F2328',
    border: '#2A2E35',
    tint: '#D94D60',
    tintSoft: '#291216',
    onTint: '#FFFFFF',
    accent: Brand.gold,
    accentDark: Brand.goldDark,
    accentSoft: '#2A2408',
    danger: Brand.brightRed,
    dangerSoft: '#301217',
    success: Brand.trueGreen,
    successSoft: '#182914',
    warning: '#F59E0B',
    warningSoft: '#2C1F0A',
    info: '#8AC3D8',
    infoSoft: '#132832',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type Theme = (typeof Colors)['light'];

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'Georgia',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  android: {
    sans: 'Roboto',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'Gotham, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    serif: 'Constantia, "Century Schoolbook", Georgia, serif',
    rounded: 'var(--font-rounded)',
    mono: 'ui-monospace, monospace',
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

/** Standard bottom content inset to provide generous breathing room above the floating tab bar across all tab screens. */
export const BottomTabContentInset = 96;
