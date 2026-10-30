import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PHANTOM_TABS, getActivePhantomTab, getBlankAfterSlot, type PhantomTabState } from '@/constants/phantom-tabs';
import { constrainPhantomOffset, shouldClosePhantomPage, transitionPhantomPage, type PhantomPageState } from '@/utils/phantom-page';

const safety: PhantomTabState = {
  pathname: '/safety', activeIndex: 2, isClaimSetupOpen: false,
  clubsLevel: 0, showClubsDirectory: false, showClubDetail: false,
  isActivityOpen: false, showActivity: false, hasActiveClubId: false,
};

describe('Campus map phantom navigation', () => {
  it('attaches Map to Safety without adding a permanent main tab', () => {
    assert.equal(PHANTOM_TABS['campus-map'].parentSlotIndex, 2);
    assert.equal(PHANTOM_TABS['campus-map'].slotIndex, 3);
    assert.equal(PHANTOM_TABS['campus-map'].rootPath, '/safety');
    assert.equal(getActivePhantomTab({ ...safety, isMapOpen: true })?.id, 'campus-map');
    assert.equal(getActivePhantomTab(safety), null);
  });
  it('does not leak Map into another tab or a stale route', () => {
    assert.equal(getActivePhantomTab({ ...safety, isMapOpen: true, activeIndex: 3 }), null);
    assert.equal(getBlankAfterSlot({ ...safety, showMap: true, pathname: '/directory' }), null);
    assert.equal(getBlankAfterSlot({ ...safety, showMap: true, activeIndex: 0 }), null);
  });
  it('preserves the closing map and blanks the leader-only Post slot', () => {
    assert.equal(getBlankAfterSlot({ ...safety, isMapOpen: true }), 3);
    assert.equal(getBlankAfterSlot({ ...safety, showMap: true }), 3);
    assert.equal(getBlankAfterSlot(safety), null);
  });
  it('keeps the page mounted through close and releases it on completion', () => {
    const initial: PhantomPageState = { phase: 'closed', revision: 0 };
    const opened = transitionPhantomPage(initial, { type: 'open' });
    const closing = transitionPhantomPage(opened, { type: 'close' });
    assert.equal(opened.phase, 'open');
    assert.equal(closing.phase, 'closing');
    assert.equal(transitionPhantomPage(closing, { type: 'settled', revision: closing.revision }).phase, 'closed');
    assert.deepEqual(initial, { phase: 'closed', revision: 0 });
  });
  it('ignores stale close callbacks after a rapid reopen', () => {
    const closing = transitionPhantomPage({ phase: 'open', revision: 1 }, { type: 'close' });
    const reopened = transitionPhantomPage(closing, { type: 'open' });
    assert.strictEqual(transitionPhantomPage(reopened, { type: 'settled', revision: closing.revision }), reopened);
  });
  it('makes repeated Back presses harmless and invalidates callbacks on navigation away', () => {
    const closing: PhantomPageState = { phase: 'closing', revision: 8 };
    assert.strictEqual(transitionPhantomPage(closing, { type: 'close' }), closing);
    const reset = transitionPhantomPage(closing, { type: 'reset' });
    assert.equal(reset.phase, 'closed');
    assert.strictEqual(transitionPhantomPage(reset, { type: 'settled', revision: 8 }), reset);
  });
});

describe('Header swipe boundaries', () => {
  it('returns to Safety after sufficient distance or a rightward flick', () => {
    assert.equal(shouldClosePhantomPage(157, 0, 390), true);
    assert.equal(shouldClosePhantomPage(21, 401, 390), true);
  });
  it('retains Map on taps, short drags, leftward swipes, and exact thresholds', () => {
    for (const [distance, velocity] of [[0, 0], [80, 100], [-200, -700], [156, 400]]) {
      assert.equal(shouldClosePhantomPage(distance, velocity, 390), false);
    }
  });
  it('rejects invalid gesture measurements instead of navigating', () => {
    for (const width of [0, -1, NaN, Infinity]) assert.equal(shouldClosePhantomPage(300, 900, width), false);
    assert.equal(shouldClosePhantomPage(NaN, 900, 390), false);
    assert.equal(shouldClosePhantomPage(300, Infinity, 390), false);
  });
  it('scales the distance threshold with rotated and resized viewports', () => {
    for (const width of [320, 390, 844, 1280]) {
      assert.equal(shouldClosePhantomPage(width * 0.39, 0, width), false);
      assert.equal(shouldClosePhantomPage(width * 0.41, 0, width), true);
    }
  });
  it('tracks the finger with elastic overscroll on both ends', () => {
    assert.equal(constrainPhantomOffset(-1000, 390, 2, 3), -1000);
    assert.equal(constrainPhantomOffset(-1270, 390, 2, 3), -1198);
    assert.equal(constrainPhantomOffset(-680, 390, 2, 3), -752);
  });
});
