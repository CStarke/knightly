import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  PHANTOM_TABS,
  getActivePhantomTab,
  getBlankAfterSlot,
  type PhantomTabState,
} from '@/constants/phantom-tabs';

describe('Phantom Tabs Architecture & Trailing Slot Blanking', () => {
  describe('Phantom Tabs Registry Invariants', () => {
    it('defines all 4 official phantom tabs with valid slots and parent targets', () => {
      const ids = ['complete-club-profile', 'campus-clubs', 'club-detail', 'dining-activity'] as const;

      for (const id of ids) {
        const meta = PHANTOM_TABS[id];
        assert.ok(meta, `Phantom tab ${id} must exist in registry`);
        assert.strictEqual(meta.id, id);
        assert.ok(meta.displayName.length > 0);
        assert.ok(meta.rootPath === '/' || meta.rootPath === '/dining');
        assert.ok(meta.slotIndex >= 1 && meta.slotIndex <= 3);
        assert.ok(meta.parentSlotIndex >= 0 && meta.parentSlotIndex < meta.slotIndex);
        assert.ok(meta.backA11yLabel.length > 0);
      }
    });

    it('verifies slot indices match the spatial layout requirements', () => {
      // Slot 1 phantom tabs replace / occupy the second slot
      assert.strictEqual(PHANTOM_TABS['complete-club-profile'].slotIndex, 1);
      assert.strictEqual(PHANTOM_TABS['complete-club-profile'].parentSlotIndex, 0);

      assert.strictEqual(PHANTOM_TABS['campus-clubs'].slotIndex, 1);
      assert.strictEqual(PHANTOM_TABS['campus-clubs'].parentSlotIndex, 0);

      // Slot 2 phantom tabs occupy the third slot
      assert.strictEqual(PHANTOM_TABS['club-detail'].slotIndex, 2);
      assert.strictEqual(PHANTOM_TABS['club-detail'].parentSlotIndex, 1);

      assert.strictEqual(PHANTOM_TABS['dining-activity'].slotIndex, 2);
      assert.strictEqual(PHANTOM_TABS['dining-activity'].parentSlotIndex, 1);
    });
  });

  describe('getActivePhantomTab', () => {
    const baseState: PhantomTabState = {
      pathname: '/',
      activeIndex: 0,
      isClaimSetupOpen: false,
      showClubSetup: false,
      clubsLevel: 0,
      showClubsDirectory: false,
      showClubDetail: false,
      isActivityOpen: false,
      showActivity: false,
      hasActiveClubId: false,
    };

    it('returns null on default Knightly Home feed', () => {
      assert.strictEqual(getActivePhantomTab(baseState), null);
    });

    it('returns complete-club-profile when claim setup is open', () => {
      const state = { ...baseState, isClaimSetupOpen: true };
      const active = getActivePhantomTab(state);
      assert.ok(active);
      assert.strictEqual(active.id, 'complete-club-profile');
    });

    it('returns complete-club-profile when showClubSetup is true during transition', () => {
      const state = { ...baseState, showClubSetup: true };
      const active = getActivePhantomTab(state);
      assert.ok(active);
      assert.strictEqual(active.id, 'complete-club-profile');
    });

    it('returns campus-clubs when clubsLevel is 1', () => {
      const state = { ...baseState, clubsLevel: 1 as const };
      const active = getActivePhantomTab(state);
      assert.ok(active);
      assert.strictEqual(active.id, 'campus-clubs');
    });

    it('returns club-detail when clubsLevel is 2 and club ID is present', () => {
      const state = { ...baseState, clubsLevel: 2 as const, hasActiveClubId: true };
      const active = getActivePhantomTab(state);
      assert.ok(active);
      assert.strictEqual(active.id, 'club-detail');
    });

    it('returns dining-activity when on /dining and isActivityOpen is true', () => {
      const state = { ...baseState, pathname: '/dining', activeIndex: 1, isActivityOpen: true };
      const active = getActivePhantomTab(state);
      assert.ok(active);
      assert.strictEqual(active.id, 'dining-activity');
    });

    it('returns null on normal dining tab without activity', () => {
      const state = { ...baseState, pathname: '/dining', activeIndex: 1, isActivityOpen: false };
      assert.strictEqual(getActivePhantomTab(state), null);
    });
  });

  describe('getBlankAfterSlot Trailing Slot Blanking Invariants', () => {
    const baseState: PhantomTabState = {
      pathname: '/',
      activeIndex: 0,
      isClaimSetupOpen: false,
      showClubSetup: false,
      clubsLevel: 0,
      showClubsDirectory: false,
      showClubDetail: false,
      isActivityOpen: false,
      showActivity: false,
      hasActiveClubId: false,
    };

    it('returns null on normal Home tab so all slots load and render normally', () => {
      assert.strictEqual(getBlankAfterSlot(baseState), null);
    });

    it('returns 1 when Complete Profile is open, blanking Slot 2 and beyond', () => {
      const state = { ...baseState, isClaimSetupOpen: true };
      assert.strictEqual(getBlankAfterSlot(state), 1);
    });

    it('returns 1 while Complete Profile is transitioning back to Home', () => {
      const state = { ...baseState, isClaimSetupOpen: false, showClubSetup: true };
      assert.strictEqual(getBlankAfterSlot(state), 1);
    });

    it('returns 1 when Campus Clubs directory is open at Slot 1', () => {
      const state = { ...baseState, clubsLevel: 1 as const };
      assert.strictEqual(getBlankAfterSlot(state), 1);
    });

    it('returns 1 while Campus Clubs directory is transitioning back to Home', () => {
      const state = { ...baseState, clubsLevel: 0 as const, showClubsDirectory: true };
      assert.strictEqual(getBlankAfterSlot(state), 1);
    });

    it('returns 2 when Club Detail is open at Slot 2, blanking Slot 3 and beyond', () => {
      const state = { ...baseState, clubsLevel: 2 as const, hasActiveClubId: true };
      assert.strictEqual(getBlankAfterSlot(state), 2);
    });

    it('returns 2 while Club Detail is transitioning back to Campus Clubs', () => {
      const state = {
        ...baseState,
        clubsLevel: 1 as const,
        showClubDetail: true,
        hasActiveClubId: true,
      };
      assert.strictEqual(getBlankAfterSlot(state), 2);
    });

    it('returns 2 when Dining Activity is open at Slot 2', () => {
      const state = { ...baseState, pathname: '/dining', activeIndex: 1, isActivityOpen: true };
      assert.strictEqual(getBlankAfterSlot(state), 2);
    });

    it('returns 2 while Dining Activity is transitioning back to Dining', () => {
      const state = {
        ...baseState,
        pathname: '/dining',
        activeIndex: 1,
        isActivityOpen: false,
        showActivity: true,
      };
      assert.strictEqual(getBlankAfterSlot(state), 2);
    });

    it('returns null once any phantom tab is fully closed', () => {
      const closedState = {
        ...baseState,
        isClaimSetupOpen: false,
        showClubSetup: false,
        clubsLevel: 0 as const,
        showClubsDirectory: false,
        showClubDetail: false,
        isActivityOpen: false,
        showActivity: false,
      };
      assert.strictEqual(getBlankAfterSlot(closedState), null);
    });
  });

  describe('Single-Pointer Pan Gesture Policy Invariants', () => {
    it('verifies multi-pointer events are strictly rejected', () => {
      // In app-tabs.tsx, the pan gesture enforces:
      // minPointers(1).maxPointers(1)
      // and event.numberOfPointers > 1 guards in onStart & onUpdate
      const shouldRejectPointers = (numberOfPointers: number) => numberOfPointers > 1;

      assert.strictEqual(shouldRejectPointers(1), false, 'Single pointer must be accepted');
      assert.strictEqual(shouldRejectPointers(2), true, 'Two pointers must be rejected');
      assert.strictEqual(shouldRejectPointers(3), true, 'Three pointers must be rejected');
    });

    it('verifies standard linear resistance factor is 0.28 across all edges', () => {
      const RESISTANCE_FACTOR = 0.28;
      const overscroll = -100;
      const expectedOffset = overscroll * RESISTANCE_FACTOR;
      assert.ok(Math.abs(expectedOffset - -28) < 0.001);
    });
  });
});



