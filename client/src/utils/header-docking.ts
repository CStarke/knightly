import { HeaderHorizontalInset, HeaderTopInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';

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
  const targetWidth = Math.max(0, width - HeaderHorizontalInset * 2);
  return {
    left: HeaderHorizontalInset * p,
    top: bannerOffset + HeaderTopInset * p,
    width: width + (targetWidth - width) * p,
    borderRadius: Radius.xl * p,
    wordmarkLeft: HeaderHorizontalInset + Math.max(0, (targetWidth - MaxContentWidth) / 2) + Spacing.three,
  };
}
