/**
 * Responsive Layout & Viewport Breakpoint Hook
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * Knightly runs across native iOS/Android, mobile web browsers (Safari, Chrome),
 * tablets (iPad, Galaxy Tab), foldables (Galaxy Z Fold, Pixel Fold), and desktop widescreen monitors.
 *
 * ANTI-SPAGHETTI DESIGN:
 * Rather than scattering `useWindowDimensions()` queries and `if (width < 768)` checks across
 * dozens of leaf components, this hook provides a centralized, pure reactive model.
 * Only root shell routers (`app-tabs.web.tsx`, `(tabs)/index.tsx`, `login-screen.tsx`) evaluate
 * these breakpoints, keeping all leaf components 100% size-agnostic.
 *
 * BREAKPOINT TAXONOMY:
 * - compact (< 768px): Handheld phones, folded foldables, narrow split browser windows.
 * - medium (768px - 899px): Tablets portrait, squarish unfolded foldables, half-screen laptop windows.
 * - expanded (900px - 1399px): Standard laptops and desktop monitors.
 * - wide (1400px - 1799px): Full-screen 1080p desktop monitors.
 * - ultrawide (>= 1800px): Extra-wide, 1440p, 4K, and ultrawide widescreen monitors.
 */

import { Platform, useWindowDimensions } from 'react-native';

export type ViewportBreakpoint = 'compact' | 'medium' | 'expanded' | 'wide' | 'ultrawide';

export interface ResponsiveLayoutState {
  /** Viewport logical pixel width */
  width: number;
  /** Viewport logical pixel height */
  height: number;
  /** Primary semantic breakpoint category */
  breakpoint: ViewportBreakpoint;
  /** True for phone screens (< 768px), both native and mobile web */
  isCompact: boolean;
  /** True for tablet portrait or narrow desktop split windows (768px - 899px) */
  isMedium: boolean;
  /** True for standard desktop and laptop screens (900px - 1399px) */
  isExpanded: boolean;
  /** True for wide desktop monitors (1400px - 1799px) */
  isWide: boolean;
  /** True for ultrawide / 4K monitors (>= 1800px) */
  isUltraWide: boolean;
  /** True if running inside a web browser */
  isWeb: boolean;
  /** True when accessing the web bundle on a mobile-sized viewport (< 768px) */
  isMobileWeb: boolean;
  /** True when accessing the web bundle on a tablet or desktop display (>= 768px) */
  isDesktopWeb: boolean;
  /** Number of grid columns for multi-card layouts (1 to 5, capped at 5) */
  columnCount: number;
}

/**
 * Resolves the semantic breakpoint for a given viewport width.
 */
export function resolveBreakpoint(width: number): ViewportBreakpoint {
  if (width < 768) return 'compact';
  if (width < 900) return 'medium';
  if (width < 1400) return 'expanded';
  if (width < 1800) return 'wide';
  return 'ultrawide';
}

/**
 * Resolves the recommended multi-card column count for a given viewport width (capped at 5).
 */
export function resolveColumnCount(width: number, isWeb: boolean = Platform.OS === 'web'): number {
  if (!isWeb || width < 768) return 1;
  if (width >= 1800) return 5;
  if (width >= 1400) return 4;
  if (width >= 900) return 3;
  return 2;
}

/**
 * React hook providing reactive viewport layout metadata.
 */
export function useResponsiveLayout(): ResponsiveLayoutState {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const breakpoint = resolveBreakpoint(width);
  const isCompact = width < 768;
  const isMedium = width >= 768 && width < 900;
  const isExpanded = width >= 900 && width < 1400;
  const isWide = width >= 1400 && width < 1800;
  const isUltraWide = width >= 1800;
  const columnCount = resolveColumnCount(width, isWeb);

  return {
    width,
    height,
    breakpoint,
    isCompact,
    isMedium,
    isExpanded,
    isWide,
    isUltraWide,
    isWeb,
    isMobileWeb: isWeb && isCompact,
    isDesktopWeb: isWeb && !isCompact,
    columnCount,
  };
}
