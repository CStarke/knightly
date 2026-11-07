const test = require('node:test');
const assert = require('node:assert/strict');
const { createMockDal } = require('../mocks/mock-dal');
const {
  normalizeClaimCode,
  hashClaimCode,
  formatCodePreview,
  redeemClaimCode,
} = require('../../services/clubs-service');

test('Clubs & Cryptographic Claim Code BLL Invariants', async (t) => {
  await t.test('normalizes user-entered claim codes consistently', () => {
    assert.equal(normalizeClaimCode('2A6Q-MTK3-R9'), '2A6QMTK3R9');
    assert.equal(normalizeClaimCode('2a6q-mtk3-r9'), '2A6QMTK3R9');
    assert.equal(normalizeClaimCode('  2A6Q mtk3 R9 '), '2A6QMTK3R9');
  });

  await t.test('generates consistent, salted SHA-256 hashes', () => {
    const hash1 = hashClaimCode('2A6QMTK3R9', 'test-salt');
    const hash2 = hashClaimCode('2A6QMTK3R9', 'test-salt');
    const hashOther = hashClaimCode('9999999999', 'test-salt');

    assert.equal(hash1, hash2);
    assert.equal(hash1.length, 64);
    assert.notEqual(hash1, hashOther);
  });

  await t.test('formats secure preview masking middle digits', () => {
    assert.equal(formatCodePreview('2A6QMTK3R9'), '2A6Q-****-R9');
  });

  await t.test('successfully redeems a valid claim code and creates membership', async () => {
    const { clubsDal, state } = createMockDal();
    const rawCode = '2A6Q-MTK3-R9';
    const normalized = normalizeClaimCode(rawCode);
    const codeHash = hashClaimCode(normalized);

    // Seed claim code in mock database
    state.claimCodes.set(codeHash, {
      id: 'code-uuid-1',
      club_id: 'acm',
      code_hash: codeHash,
      formatted_preview: '2A6Q-****-R9',
      is_redeemed: false,
      redeemed_by_student_id: null,
      expires_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    });

    const result = await redeemClaimCode(
      {
        rawCode,
        studentId: 'student-uuid-42',
        targetClubId: 'acm',
      },
      clubsDal
    );

    assert.equal(result.success, true);
    assert.equal(result.clubId, 'acm');
    assert.ok(result.membership);
    assert.equal(result.membership.club_id, 'acm');
    assert.equal(result.membership.student_id, 'student-uuid-42');

    // Verify code marked redeemed in state
    const codeInDb = state.claimCodes.get(codeHash);
    assert.equal(codeInDb.is_redeemed, true);
    assert.equal(codeInDb.redeemed_by_student_id, 'student-uuid-42');
  });

  await t.test('rejects claim code that has already been redeemed', async () => {
    const { clubsDal, state } = createMockDal();
    const rawCode = 'REDEEMED01';
    const codeHash = hashClaimCode(rawCode);

    state.claimCodes.set(codeHash, {
      id: 'code-uuid-2',
      club_id: 'acm',
      code_hash: codeHash,
      is_redeemed: true,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    });

    await assert.rejects(
      async () => {
        await redeemClaimCode({ rawCode, studentId: 'student-uuid-99' }, clubsDal);
      },
      { message: /already been redeemed/ }
    );
  });

  await t.test('rejects claim code that has expired', async () => {
    const { clubsDal, state } = createMockDal();
    const rawCode = 'EXPIRED001';
    const codeHash = hashClaimCode(rawCode);

    state.claimCodes.set(codeHash, {
      id: 'code-uuid-3',
      club_id: 'acm',
      code_hash: codeHash,
      is_redeemed: false,
      expires_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    });

    await assert.rejects(
      async () => {
        await redeemClaimCode({ rawCode, studentId: 'student-uuid-99' }, clubsDal);
      },
      { message: /has expired/ }
    );
  });

  // Each attempt starts with its own unredeemed code unless the test explicitly retries.
  function createClaimFixture() {
    const { clubsDal, state } = createMockDal();
    const rawCode = '2A6Q-MTK3-R9';
    const codeHash = hashClaimCode(normalizeClaimCode(rawCode));
    const expiresAt = '2026-11-07T12:00:00.000Z';
    state.claimCodes.set(codeHash, {
      id: 'code-acm', club_id: 'acm', code_hash: codeHash, expires_at: expiresAt,
      is_redeemed: false, redeemed_by_student_id: null, redeemed_at: null,
    });
    return { clubsDal, state, codeHash, expiresAt, rawCode };
  }

  await t.test('rejects the wrong club and allows a retry for the intended club', async () => {
    const { clubsDal, state, codeHash, rawCode } = createClaimFixture();
    const claim = { rawCode, studentId: 'student-42', now: new Date('2026-11-07T11:00:00Z') };
    const originalCode = { ...state.claimCodes.get(codeHash) };

    await assert.rejects(
      redeemClaimCode({ ...claim, targetClubId: 'abstraction' }, clubsDal),
      /not valid for club/
    );
    assert.deepEqual(state.memberships, []);
    assert.deepEqual(state.claimCodes.get(codeHash), originalCode);

    // Retry with the same code to prove the rejected attempt did not consume it.
    await redeemClaimCode({ ...claim, targetClubId: 'acm' }, clubsDal);
    assert.equal(state.memberships.length, 1);
    assert.equal(state.memberships[0].club_id, 'acm');
    assert.equal(state.memberships[0].student_id, claim.studentId);
  });

  await t.test('accepts a claim one millisecond before expiration', async () => {
    const { clubsDal, state, rawCode, expiresAt } = createClaimFixture();
    const now = new Date(Date.parse(expiresAt) - 1);
    const result = await redeemClaimCode({ rawCode, studentId: 'student-42', targetClubId: 'acm', now }, clubsDal);
    assert.equal(result.success, true);
    assert.equal(state.memberships.length, 1);
    assert.equal(state.memberships[0].club_id, 'acm');
  });

  await t.test('rejects a claim exactly at expiration without consuming the code', async () => {
    const { clubsDal, state, codeHash, rawCode, expiresAt } = createClaimFixture();
    const originalCode = { ...state.claimCodes.get(codeHash) };
    // Passing the exact expiration instant makes the result independent of the system clock.
    await assert.rejects(
      redeemClaimCode({ rawCode, studentId: 'student-42', targetClubId: 'acm', now: new Date(expiresAt) }, clubsDal),
      /has expired/
    );
    assert.deepEqual(state.memberships, []);
    assert.deepEqual(state.claimCodes.get(codeHash), originalCode);
  });

  await t.test('strictly suppresses follower_count from public club queries (non-social invariant)', async () => {
    const { clubsDal, state } = createMockDal();
    state.clubs.set('acm', {
      id: 'acm',
      name: 'ACM Student Chapter',
      category: 'Academics',
      follower_count: 142,
    });

    const club = await clubsDal.getClubById('acm');
    assert.ok(club);
    assert.strictEqual(club.id, 'acm');
    assert.strictEqual(club.follower_count, undefined, 'follower_count must never be exposed to clubs or public UI');

    const allClubs = await clubsDal.getClubs();
    assert.ok(allClubs.length > 0);
    assert.strictEqual(allClubs[0].follower_count, undefined, 'follower_count must be stripped in lists');
  });
});
