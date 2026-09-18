/**
 * ============================================================================
 * PHANTOM TABS ARCHITECTURE & REGISTRY
 * ============================================================================
 *
 * WHAT IS A "PHANTOM TAB"?
 * A Phantom Tab is an inline, full-height subpage that occupies an adjacent
 * horizontal slot within the primary swipeable tab pager (app-tabs.tsx) rather
 * than being pushed onto a traditional navigation stack or opened inside a Modal.
 *
 * WHY NOT USE A TRADITIONAL REACT NAVIGATION STACK PUSH (router.push)?
 * 1. Motion Continuity: In Knightly, the entire app exists over a unified,
 *    continuous parallax starfield canvas. Pushing a screen onto a stack breaks
 *    the coordinate system and replaces the starfield canvas with a blank screen transition.
 * 2. Instant 60 FPS Physical Gestures: Phantom Tabs sit in the same Reanimated
 *    horizontal pager track. Swiping back to the parent tab uses native worklet-driven
 *    finger tracking with zero latency, spring physics, and rubber-banding.
 * 3. Navigation History Integrity: Stack pushes alter browser history on web and
 *    create complex back-stack hierarchies on mobile. Phantom tabs cleanly live within
 *    the parent tab's domain without desynchronizing Expo Router's tab bar.
 *
 * WHY NOT USE REACT NATIVE <Modal>?
 * On iOS and Android, React Native's `<Modal>` spins up a separate native window
 * (`UIModalPresentationController` / `android.app.Dialog`). When dismissed, the OS
 * restores window focus to the underlying root view. In React Navigation, this unrouted
 * native focus restoration event triggers a fallback focus to the initial route (Index 0,
 * Knightly Home), desynchronizing the bottom tab bar and visual tab highlight from the active URL.
 * In-pager phantom tabs completely avoid native window creation.
 *
 * WHY TRAILING SLOT BLANKING (getBlankAfterSlot)?
 * The horizontal pager track renders all tabs side-by-side. If a user is on a Phantom
 * Tab (e.g. Slot 1 Campus Clubs) and drags left, elastic resistance pulls the track left,
 * which would reveal the tab at Slot 2 (Safety) or Slot 3 (Directory). To preserve the
 * mental model that the user is inside a dedicated subpage, all trailing slots to the right
 * are blanked out with empty, accessibility-hidden page frames.
 */

export type PhantomTabId =
  | 'complete-club-profile'
  | 'campus-clubs'
  | 'club-detail'
  | 'dining-activity'
  | 'photo-cropper';

export type PhantomTabMeta = {
  id: PhantomTabId;
  /** Human-readable display label for logging, analytics & testing */
  displayName: string;
  /** The root tab pathname this phantom tab attaches to */
  rootPath: '/' | '/dining' | '/post';
  /** The horizontal slot index in the pager (0-indexed) */
  slotIndex: number;
  /** The slot index that navigating back / swiping right returns to */
  parentSlotIndex: number;
  /** Default header title or null if dynamically derived */
  defaultTitle?: string;
  /** Default header subtitle or null if dynamically derived */
  defaultSubtitle?: string;
  /** Accessibility label for the header back button */
  backA11yLabel: string;
};

export const PHANTOM_TABS: Record<PhantomTabId, PhantomTabMeta> = {
  'photo-cropper': {
    id: 'photo-cropper',
    displayName: 'Photo Cropper',
    rootPath: '/post',
    slotIndex: 5,
    parentSlotIndex: 4,
    defaultTitle: 'Crop Banner',
    defaultSubtitle: '16:9 Post Aspect Ratio',
    backA11yLabel: 'Cancel photo crop',
  },
  'complete-club-profile': {
    id: 'complete-club-profile',
    displayName: 'Complete Club Profile',
    rootPath: '/',
    slotIndex: 1,
    parentSlotIndex: 0,
    defaultTitle: 'Complete Profile',
    defaultSubtitle: 'CLAIM VERIFIED',
    backA11yLabel: 'Go back to feed',
  },
  'campus-clubs': {
    id: 'campus-clubs',
    displayName: 'Campus Clubs Directory',
    rootPath: '/',
    slotIndex: 1,
    parentSlotIndex: 0,
    defaultTitle: 'Campus Clubs',
    defaultSubtitle: 'Student orgs & communities',
    backA11yLabel: 'Go back to feed',
  },
  'club-detail': {
    id: 'club-detail',
    displayName: 'Club Detail',
    rootPath: '/',
    slotIndex: 2,
    parentSlotIndex: 1,
    backA11yLabel: 'Go back to clubs',
  },
  'dining-activity': {
    id: 'dining-activity',
    displayName: 'Dining Activity',
    rootPath: '/dining',
    slotIndex: 2,
    parentSlotIndex: 1,
    defaultTitle: 'Activity',
    defaultSubtitle: 'LAST 7 DAYS',
    backA11yLabel: 'Go back to Dining',
  },
};

export type PhantomTabState = {
  pathname: string;
  activeIndex: number;
  isClaimSetupOpen: boolean;
  showClubSetup?: boolean;
  clubsLevel: 0 | 1 | 2;
  showClubsDirectory: boolean;
  showClubDetail: boolean;
  isActivityOpen: boolean;
  showActivity: boolean;
  hasActiveClubId: boolean;
  isCropperOpen?: boolean;
  showCropper?: boolean;
};

/**
 * Determines which Phantom Tab is currently active, if any.
 */
export function getActivePhantomTab(state: PhantomTabState): PhantomTabMeta | null {
  if (state.pathname === '/' && state.activeIndex === 0) {
    if (state.isClaimSetupOpen || state.showClubSetup) {
      return PHANTOM_TABS['complete-club-profile'];
    }
    if (state.clubsLevel === 2 && state.hasActiveClubId) {
      return PHANTOM_TABS['club-detail'];
    }
    if (state.clubsLevel === 1) {
      return PHANTOM_TABS['campus-clubs'];
    }
  }

  if (state.pathname === '/dining') {
    if (state.isActivityOpen) {
      return PHANTOM_TABS['dining-activity'];
    }
  }

  if (state.pathname === '/post') {
    if (state.isCropperOpen) {
      return PHANTOM_TABS['photo-cropper'];
    }
  }

  return null;
}

/**
 * Calculates the rightmost slot index that should remain visible/loaded.
 * Any slot with index > blankAfterSlot will be blanked out (unloaded) so that
 * elastic overscroll past the right boundary displays clean parallax starfield
 * canvas rather than exposing subsequent tabs.
 *
 * Crucially accounts for exit transitions (`showClubDetail`, `showActivity`, `showClubsDirectory`, `showClubSetup`, `showCropper`)
 * so that a closing phantom tab remains smoothly visible during its back-slide animation.
 */
export function getBlankAfterSlot(state: PhantomTabState): number | null {
  if (state.pathname === '/' && state.activeIndex === 0) {
    // If Club Detail is active OR transitioning out, slot 2 must be preserved, but slot 3+ blanked
    if ((state.clubsLevel === 2 || state.showClubDetail) && state.hasActiveClubId) {
      return 2;
    }
    // If Complete Profile is open/transitioning out OR Campus Clubs is open/transitioning out, slot 1 preserved, slot 2+ blanked
    if (state.isClaimSetupOpen || state.showClubSetup || state.clubsLevel === 1 || state.showClubsDirectory) {
      return 1;
    }
  }

  if (state.pathname === '/dining') {
    // If Dining Activity is open OR transitioning out, slot 2 preserved, slot 3+ blanked
    if (state.isActivityOpen || state.showActivity) {
      return 2;
    }
  }

  if (state.pathname === '/post') {
    // If Photo Cropper is open OR transitioning out, slot 5 preserved; otherwise slot 5 is blanked
    if (state.isCropperOpen || state.showCropper) {
      return 5;
    }
    return 4;
  }

  // Normal bottom tab navigation — all slots render normally
  return null;
}

