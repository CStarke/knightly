/**
 * Clubs & Cryptographic Claim Codes Business Logic Layer (BLL)
 *
 * ARCHITECTURAL RATIONALE:
 * Manages club leadership onboarding and cryptographic claim code verification.
 *
 * SECURITY INVARIANTS:
 * 1. Plaintext claim codes are NEVER persisted in the database.
 * 2. Only salted SHA-256 hashes are stored and queried.
 * 3. Codes are strictly normalized (hyphens and case stripped) to prevent human entry errors.
 * 4. Already redeemed or expired codes are rejected before granting memberships.
 */

const crypto = require('crypto');
const defaultClubsDal = require('../dal/clubs-dal');

const CLAIM_CODE_SALT = process.env.CLAIM_CODE_SALT || 'knightly-claim-salt-v1';

/**
 * Normalizes a raw claim code string:
 * - Strips all hyphens, spaces, and punctuation
 * - Converts to uppercase
 *
 * @param {string} rawCode - User-entered claim code (e.g. '2A6Q-MTK3-R9')
 * @returns {string} Normalized 10-character string (e.g. '2A6QMTK3R9')
 */
function normalizeClaimCode(rawCode) {
  if (typeof rawCode !== 'string') return '';
  return rawCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Computes a salted SHA-256 hash of a normalized claim code.
 *
 * @param {string} normalizedCode - 10-character normalized code
 * @param {string} [salt=CLAIM_CODE_SALT] - Salt string
 * @returns {string} 64-character hexadecimal SHA-256 hash
 */
function hashClaimCode(normalizedCode, salt = CLAIM_CODE_SALT) {
  return crypto
    .createHash('sha256')
    .update(`${normalizedCode}:${salt}`)
    .digest('hex');
}

/**
 * Formats a normalized 10-char code into masked preview format: 'XXXX-****-**'.
 *
 * @param {string} normalizedCode - 10-character string
 * @returns {string} Masked preview string
 */
function formatCodePreview(normalizedCode) {
  if (!normalizedCode || normalizedCode.length !== 10) return '****-****-**';
  const prefix = normalizedCode.slice(0, 4);
  const suffix = normalizedCode.slice(8, 10);
  return `${prefix}-****-${suffix}`;
}

/**
 * Validates and redeems a club leadership claim code for an authenticated student.
 * Claiming grants posting authorization as that club. Roles are not specified in the app.
 *
 * @param {object} params
 * @param {string} params.rawCode - Raw 10-character code entered by student
 * @param {string} params.studentId - Authenticated student UUID
 * @param {string} [params.targetClubId] - Optional target club ID to verify against
 * @param {Date} [params.now=new Date()] - Evaluation timestamp
 * @param {object} [dal=defaultClubsDal] - Injected DAL
 * @returns {Promise<object>} Redemption result
 */
async function redeemClaimCode(params, dal = defaultClubsDal) {
  const { rawCode, studentId, targetClubId } = params;
  const now = params.now || new Date();

  // Step 1: Normalize input string
  const normalized = normalizeClaimCode(rawCode);
  if (normalized.length !== 10) {
    throw new Error('Invalid claim code format: must be 10 alphanumeric characters');
  }

  // Step 2: Compute salted SHA-256 hash
  const codeHash = hashClaimCode(normalized);

  // Step 3: Lookup claim code by hash
  const codeRecord = await dal.getClaimCodeByHash(codeHash);
  if (!codeRecord) {
    throw new Error('Invalid claim code: code not recognized');
  }

  // Step 4: Ensure code is not already redeemed
  if (codeRecord.is_redeemed) {
    throw new Error('This claim code has already been redeemed');
  }

  // Step 5: Check expiration
  if (codeRecord.expires_at && new Date(codeRecord.expires_at) <= now) {
    throw new Error('This claim code has expired');
  }

  // Step 6: Verify club target match if specified
  if (targetClubId && codeRecord.club_id !== targetClubId) {
    throw new Error(`This claim code is not valid for club "${targetClubId}"`);
  }

  // Step 7: Atomically mark redeemed and grant club posting authorization
  const membership = await dal.redeemClaimCode(codeRecord.id, studentId, codeRecord.club_id);

  return {
    success: true,
    clubId: codeRecord.club_id,
    membership,
    message: `Successfully claimed club ${codeRecord.club_id}`,
  };
}

module.exports = {
  normalizeClaimCode,
  hashClaimCode,
  formatCodePreview,
  redeemClaimCode,
};
