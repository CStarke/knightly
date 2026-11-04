/** A subpage stays mounted while closing so its slide never reveals an empty slot. */
export type PhantomPageState = {
  phase: 'closed' | 'open' | 'closing';
  revision: number;
};

/** Animation completions carry the revision of the transition that created them. */
export type PhantomPageEvent =
  | { type: 'open' | 'close' | 'reset' }
  | { type: 'settled'; revision: number };

/**
 * Applies a subpage transition without mutating the previous state.
 * @param state Current logical phase and transition revision.
 * @param event Navigation action or animation completion.
 * @returns The next state; stale completions cannot close a newly reopened page.
 */
export function transitionPhantomPage(state: PhantomPageState, event: PhantomPageEvent): PhantomPageState {
  switch (event.type) {
    case 'open':
      return { phase: 'open', revision: state.revision + 1 };
    case 'close':
      return state.phase === 'open' ? { phase: 'closing', revision: state.revision + 1 } : state;
    case 'reset':
      return { phase: 'closed', revision: state.revision + 1 };
    case 'settled':
      return state.phase === 'closing' && event.revision === state.revision
        ? { ...state, phase: 'closed' }
        : state;
  }
}

/**
 * Resolves a rightward back swipe using the existing pager's 40% / 400dp/s thresholds.
 * @param translationX Rightward distance in layout pixels from the open page.
 * @param velocityX Horizontal release velocity; positive means rightward.
 * @param width Valid page width. Invalid measurements never dismiss a page.
 * @returns Whether to return to the parent; exact threshold values stay on the page.
 */
export function shouldClosePhantomPage(translationX: number, velocityX: number, width: number): boolean {
  'worklet';
  return Number.isFinite(width) && width > 0 && Number.isFinite(translationX)
    && Number.isFinite(velocityX) && (translationX > width * 0.4 || velocityX > 400);
}

/**
 * Keeps dragging between a subpage and its parent, with the pager's elastic edges.
 * @returns A horizontal offset; overscroll uses the existing 0.28 resistance factor.
 */
export function constrainPhantomOffset(offset: number, width: number, parentSlot: number, slot: number): number {
  'worklet';
  const minimum = -slot * width;
  const maximum = -parentSlot * width;
  if (offset < minimum) return minimum + (offset - minimum) * 0.28;
  if (offset > maximum) return maximum + (offset - maximum) * 0.28;
  return offset;
}

