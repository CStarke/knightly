/** Direction-aware header state; distances use logical pixels and offsets start at zero. */
export type HeaderScrollState = {
  offset: number;
  down: number;
  up: number;
  opacity: number;
};

/** Initial visible header state, also used when switching away from the feed. */
export const INITIAL_HEADER_SCROLL: HeaderScrollState = { offset: 0, down: 0, up: 0, opacity: 1 };

const DOWNWARD_GRACE_DISTANCE = 192;
const DOWNWARD_FADE_DISTANCE = 1000;

/**
 * Fades over 1000px after 192px of downward travel; 20px upward restores the header anywhere.
 * Negative overscroll is clamped to zero so top bounce cannot hide the masthead.
 * @param previous - State from the preceding scroll event.
 * @param rawOffset - Current vertical scroll offset in logical pixels.
 * @returns Fresh immutable state suitable for a Reanimated shared value.
 */
export function advanceHeaderScroll(previous: HeaderScrollState, rawOffset: number): HeaderScrollState {
  'worklet';
  if (!Number.isFinite(rawOffset)) return previous;
  const offset = Math.max(0, rawOffset);
  const delta = offset - previous.offset;
  if (offset <= 32) return { ...INITIAL_HEADER_SCROLL, offset };
  if (delta === 0) return previous;

  if (delta < 0) {
    const up = previous.up - delta;
    return { offset, down: 0, up, opacity: up >= 20 ? 1 : previous.opacity };
  }

  // Restart the long fade after a direction change instead of using absolute page depth.
  const down = Math.min(DOWNWARD_GRACE_DISTANCE + DOWNWARD_FADE_DISTANCE, previous.down + delta);
  const opacity = Math.min(previous.opacity, Math.max(0, 1 - Math.max(0, down - DOWNWARD_GRACE_DISTANCE) / DOWNWARD_FADE_DISTANCE));
  return { offset, down, up: 0, opacity };
}
