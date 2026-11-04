import type { Star } from '@/constants/starfield';

/**
 * Batches one deterministic star layer into a cached SVG image instead of one native View per star.
 * @param stars - Generated stars in canvas coordinates, with trusted theme hex colors.
 * @param width - Logical canvas width.
 * @param height - Logical canvas height.
 * @param glow - Glow intensity; zero for distant stars, up to one for foreground stars.
 * @returns An encoded SVG data URI containing direct shapes only, without definitions or references.
 */
export function createStarfieldLayerUri(stars: readonly Star[], width: number, height: number, glow: number): string {
  const shapes = stars.map((star) => {
    const radius = star.size / 2;
    // Transparent concentric circles approximate the glow without hundreds of native shadow layers.
    const halo = glow > 0
      ? `<circle cx="${star.x}" cy="${star.y}" r="${radius * 2.4}" fill="${star.color}" opacity="${star.opacity * glow * 0.12}"/><circle cx="${star.x}" cy="${star.y}" r="${radius * 1.6}" fill="${star.color}" opacity="${star.opacity * glow * 0.2}"/>`
      : '';
    const sparkle = star.isSparkle
      ? `<path d="M${star.x - star.size} ${star.y}h${star.size * 2}M${star.x} ${star.y - star.size}v${star.size * 2}" stroke="${star.color}" stroke-width="0.5" opacity="${star.opacity * 0.6}"/>`
      : '';
    return `${halo}<circle data-star="${star.id}" cx="${star.x}" cy="${star.y}" r="${radius}" fill="${star.color}" opacity="${star.opacity}"/>${sparkle}`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${shapes}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
