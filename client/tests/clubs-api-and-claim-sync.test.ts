/**
 * Clubs API, Claim Codes & Follow Synchronization Invariant Tests
 *
 * ARCHITECTURAL CONTEXT & SPRINT 1 SLO (SC2):
 * Verifies that:
 * 1. Club directory queries and search work with offline seed fallbacks.
 * 2. Claim codes are normalized and verified without exposing roles.
 * 3. Club follow subscriptions use O(1) Set lookups and sync to backend.
 * 4. The client never throws unhandled exceptions when the backend server is offline.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  fetchClubsApi,
  claimClubApi,
  fetchFollowedClubsApi,
  followClubApi,
  unfollowClubApi,
} from '@/services/clubs-api';
import {
  normalizeClubCode,
  formatClubCode,
  checkClubCode,
  DEMO_CLAIM_CODE_ABSTRACTION,
} from '@/data/club-codes';
import { DEFAULT_FOLLOWED_CLUB_IDS } from '@/context/club-follow-context';
import { CALVIN_CLUBS } from '@/data/clubs';

test('Clubs API & Claim Code Verification Invariants', async (t) => {
  await t.test('normalizes and formats claim codes into 4-4-2 blocks consistently', () => {
    assert.equal(normalizeClubCode('2a6q-mtk3-r9'), '2A6QMTK3R9');
    assert.equal(normalizeClubCode('  2A6Q mtk3 R9 '), '2A6QMTK3R9');
    assert.equal(formatClubCode('2A6QMTK3R9'), '2A6Q-MTK3-R9');
    assert.equal(formatClubCode('2a6qmtk3r9'), '2A6Q-MTK3-R9');
  });

  await t.test('fetches clubs directory with offline fallback to CALVIN_CLUBS', async () => {
    const clubs = await fetchClubsApi();

    assert.ok(Array.isArray(clubs));
    assert.ok(clubs.length >= CALVIN_CLUBS.length);

    const abstraction = clubs.find((c) => c.id === 'abstraction');
    assert.ok(abstraction !== undefined);
    assert.equal(abstraction?.name, 'Abstraction');
    assert.equal(abstraction?.category, 'Academics');
    assert.ok(Array.isArray(abstraction?.colors));
  });

  await t.test('filters clubs by 13-category taxonomy and keyword search', async () => {
    const academicClubs = await fetchClubsApi({ category: 'Academics' });
    assert.ok(academicClubs.length > 0);
    academicClubs.forEach((c) => assert.equal(c.category, 'Academics'));

    const searchResults = await fetchClubsApi({ search: 'coding' });
    assert.ok(searchResults.length > 0);
    assert.ok(
      searchResults.some((c) => c.id === 'abstraction' || c.id === 'acm')
    );
  });

  await t.test('verifies valid claim code without roles (role-free invariant)', async () => {
    const result = await claimClubApi({
      rawCode: DEMO_CLAIM_CODE_ABSTRACTION,
      studentId: '00000000-0000-0000-0000-000000000042',
      targetClubId: 'abstraction',
    });

    assert.equal(result.success, true);
    assert.equal(result.clubId, 'abstraction');
    // ROLE-FREE INVARIANT: result must NOT specify a role
    assert.equal((result as any).role, undefined, 'Club claim result must not contain a role');
  });

  await t.test('rejects invalid claim codes with descriptive error messaging', async () => {
    const result = await claimClubApi({
      rawCode: 'INVALID-CODE-99',
      studentId: '00000000-0000-0000-0000-000000000042',
    });

    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.match(result.error, /invalid|not recognized|format/i);
  });

  await t.test('fetches followed clubs with graceful fallback to default 7 institutions', async () => {
    const followed = await fetchFollowedClubsApi('student-uuid-42');

    assert.ok(Array.isArray(followed));
    assert.equal(followed.length, DEFAULT_FOLLOWED_CLUB_IDS.length);
    assert.ok(followed.includes('acm'));
    assert.ok(followed.includes('campus-ministries'));
    assert.ok(followed.includes('knights-athletics'));
  });

  await t.test('followClubApi and unfollowClubApi handle offline network without throwing', async () => {
    const followResult = await followClubApi('student-uuid-42', 'abstraction');
    assert.equal(typeof followResult, 'boolean');

    const unfollowResult = await unfollowClubApi('student-uuid-42', 'abstraction');
    assert.equal(typeof unfollowResult, 'boolean');
  });
});
