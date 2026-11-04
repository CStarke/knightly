import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';

/**
 * Calculates the mobile login surface's flight into the shared floating masthead.
 * @param progress - Morph progress clamped to [0, 1].
 * @param width - Current viewport width in logical pixels.
 * @param bannerOffset - Height occupied by the mobile-web app banner.
 * @returns Surface geometry and wordmark left edge; safe-area padding stays inside the header.
 */
export function getHeaderDockingFrame(progress: number, width: number, bannerOffset: number) {
  'worklet';
  const p = Math.max(0, Math.min(1, progress));
  const inset = Spacing.two;
  const targetWidth = Math.max(0, width - inset * 2);
  return {
    left: inset * p,
    top: bannerOffset + inset * p,
    width: width + (targetWidth - width) * p,
    borderRadius: Radius.xl * p,
    wordmarkLeft: inset + Math.max(0, (targetWidth - MaxContentWidth) / 2) + Spacing.three,
  };
}
