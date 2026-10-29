/**
 * Clubs & Cryptographic Claim Codes Data Access Layer (DAL)
 *
 * ARCHITECTURAL RATIONALE:
 * Handles club directory retrieval, follower relationships, and cryptographic
 * claim code redemption for multi-leader club authorization.
 * Plaintext claim codes are NEVER stored in the database — only salted SHA-256 hashes.
 */

const { getDefaultClient } = require('./supabase-client');

/**
 * Publicly visible club columns.
 *
 * NON-SOCIAL METRIC INVARIANT:
 * `follower_count` is stored purely for backend feed distribution algorithms and administrative
 * telemetry. It is strictly excluded from public queries and club leader views so clubs cannot
 * see their follower numbers, preventing Knightly from becoming a social media popularity contest.
 */
const PUBLIC_CLUB_COLUMNS = [
  'id',
  'name',
  'category',
  'mark',
  'description',
  'meeting_schedule',
  'location',
  'contact_email',
  'leader_name',
  'primary_color',
  'secondary_color',
  'sf_icon',
  'md_icon',
  'hero_image_url',
  'is_department',
  'created_at',
  'updated_at',
].join(', ');

/**
 * Retrieves registered clubs with optional category filtering and search.
 * Excludes follower_count to preserve non-social media privacy.
 *
 * @param {object} [filters={}] - Filter criteria
 * @param {string} [filters.category] - 13-category taxonomy filter
 * @param {string} [filters.search] - Search string
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional client
 * @returns {Promise<Array<object>>} List of clubs
 */
async function getClubs(filters = {}, client = getDefaultClient()) {
  let query = client
    .from('clubs')
    .select(PUBLIC_CLUB_COLUMNS)
    .order('name', { ascending: true });

  if (filters.category && filters.category.toLowerCase() !== 'all') {
    query = query.ilike('category', filters.category);
  }

  if (filters.search) {
    const q = filters.search.trim();
    if (q) {
      query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`[clubs-dal.getClubs] Failed: ${error.message}`);
  }

  return data || [];
}

/**
 * Retrieves a single club by its slug identifier (e.g. 'acm', 'abstraction').
 *
 * @param {string} id - Club slug ID
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional client
 * @returns {Promise<object|null>} Club record or null
 */
async function getClubById(id, client = getDefaultClient()) {
  const { data, error } = await client
    .from('clubs')
    .select(PUBLIC_CLUB_COLUMNS)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`[clubs-dal.getClubById] Failed: ${error.message}`);
  }

  return data;
}

/**
 * Looks up a claim code record by its salted SHA-256 hash.
 *
 * @param {string} codeHash - SHA-256 hexadecimal hash
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional client
 * @returns {Promise<object|null>} Claim code record or null
 */
async function getClaimCodeByHash(codeHash, client = getDefaultClient()) {
  const { data, error } = await client
    .from('club_claim_codes')
    .select('*')
    .eq('code_hash', codeHash)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`[clubs-dal.getClaimCodeByHash] Failed: ${error.message}`);
  }

  return data;
}

/**
 * Polymorphic student ID resolver: supports both UUID and 7-digit student IDs.
 */
async function resolveStudentUuid(studentId, client = getDefaultClient()) {
  if (!studentId) return null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId);
  if (isUuid) return studentId;
  const { data } = await client.from('students').select('id').eq('student_id', studentId).single();
  if (data?.id) return data.id;
  const { data: stUser } = await client.from('students').select('id').eq('username', studentId).single();
  return stUser?.id || null;
}

/**
 * Marks a claim code as redeemed and inserts the club membership.
 *
 * @param {string} codeId - Claim code UUID
 * @param {string} studentId - Student UUID
 * @param {string} clubId - Club slug ID
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional client
 * @returns {Promise<object>} Created membership record
 */
async function redeemClaimCode(codeId, studentId, clubId, client = getDefaultClient()) {
  const resolvedStudentId = await resolveStudentUuid(studentId, client);
  const now = new Date().toISOString();

  // Step 1: Update claim code status
  const { error: codeError } = await client
    .from('club_claim_codes')
    .update({
      is_redeemed: true,
      redeemed_by_student_id: resolvedStudentId,
      redeemed_at: now,
    })
    .eq('id', codeId);

  if (codeError) {
    throw new Error(`[clubs-dal.redeemClaimCode] Failed code update: ${codeError.message}`);
  }

  // Step 2: Insert club membership (grants club posting authorization)
  const { data: membership, error: memError } = await client
    .from('club_memberships')
    .insert({
      student_id: resolvedStudentId,
      club_id: clubId,
      claim_code_id: codeId,
      granted_at: now,
    })
    .select()
    .single();

  if (memError) {
    throw new Error(`[clubs-dal.redeemClaimCode] Failed membership grant: ${memError.message}`);
  }

  return membership;
}

/**
 * Retrieves all club memberships for a student.
 *
 * @param {string} studentId - Student UUID
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional client
 * @returns {Promise<Array<object>>} List of club memberships with club details
 */
async function getMembershipsForStudent(studentId, client = getDefaultClient()) {
  const resolvedStudentId = await resolveStudentUuid(studentId, client);
  const { data, error } = await client
    .from('club_memberships')
    .select(`
      *,
      club:clubs (${PUBLIC_CLUB_COLUMNS})
    `)
    .eq('student_id', resolvedStudentId);

  if (error) {
    throw new Error(`[clubs-dal.getMembershipsForStudent] Failed: ${error.message}`);
  }

  return data || [];
}

/**
 * Creates a club follow relationship.
 *
 * @param {string} studentId - Student UUID
 * @param {string} clubId - Club slug ID
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional client
 * @returns {Promise<object>} Created follow record
 */
async function followClub(studentId, clubId, client = getDefaultClient()) {
  const resolvedStudentId = await resolveStudentUuid(studentId, client);
  const { data, error } = await client
    .from('club_follows')
    .upsert({
      student_id: resolvedStudentId,
      club_id: clubId,
      followed_at: new Date().toISOString(),
    }, { onConflict: 'student_id,club_id' })
    .select()
    .single();

  if (error) {
    throw new Error(`[clubs-dal.followClub] Failed: ${error.message}`);
  }

  return data;
}

/**
 * Removes a club follow relationship.
 *
 * @param {string} studentId - Student UUID
 * @param {string} clubId - Club slug ID
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional client
 * @returns {Promise<boolean>} True if removed
 */
async function unfollowClub(studentId, clubId, client = getDefaultClient()) {
  const resolvedStudentId = await resolveStudentUuid(studentId, client);
  const { error } = await client
    .from('club_follows')
    .delete()
    .eq('student_id', resolvedStudentId)
    .eq('club_id', clubId);

  if (error) {
    throw new Error(`[clubs-dal.unfollowClub] Failed: ${error.message}`);
  }

  return true;
}

/**
 * Retrieves the list of club IDs followed by a student.
 *
 * @param {string} studentId - Student UUID
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional client
 * @returns {Promise<Array<string>>} List of club slug IDs
 */
async function getFollowedClubIds(studentId, client = getDefaultClient()) {
  const resolvedStudentId = await resolveStudentUuid(studentId, client);
  const { data, error } = await client
    .from('club_follows')
    .select('club_id')
    .eq('student_id', resolvedStudentId);

  if (error) {
    throw new Error(`[clubs-dal.getFollowedClubIds] Failed: ${error.message}`);
  }

  return (data || []).map((r) => r.club_id);
}

module.exports = {
  getClubs,
  getClubById,
  getClaimCodeByHash,
  redeemClaimCode,
  getMembershipsForStudent,
  followClub,
  unfollowClub,
  getFollowedClubIds,
};
