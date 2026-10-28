/**
 * Student Data Access Layer (DAL)
 *
 * ARCHITECTURAL RATIONALE:
 * Isolates all PostgreSQL / Supabase table operations for the `students` entity.
 * Keeps raw SQL / PostgREST queries segregated from business validation rules.
 * Supports passing a scoped Supabase client to respect RLS policies.
 */

const { getDefaultClient } = require('./supabase-client');

/**
 * Retrieves a student record by their primary UUID.
 *
 * @param {string} id - Student UUID (matches auth.users.id)
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional scoped client
 * @returns {Promise<object|null>} Student record or null if not found
 */
async function getStudentById(id, client = getDefaultClient()) {
  // Step 1: Query the students table filtering by primary UUID
  const { data, error } = await client
    .from('students')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    // PostgREST returns PGRST116 when single row query finds 0 rows
    if (error.code === 'PGRST116') return null;
    throw new Error(`[student-dal.getStudentById] Failed: ${error.message}`);
  }

  return data;
}

/**
 * Retrieves a student record by Calvin username (case-insensitive).
 *
 * @param {string} username - Calvin username (e.g. 'jmd42')
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional scoped client
 * @returns {Promise<object|null>} Student record or null if not found
 */
async function getStudentByUsername(username, client = getDefaultClient()) {
  // Step 1: Normalize username to lowercase for index lookup
  const normalized = (username || '').trim().toLowerCase();

  // Step 2: Query students table filtering by lowercase username
  const { data, error } = await client
    .from('students')
    .select('*')
    .ilike('username', normalized)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`[student-dal.getStudentByUsername] Failed: ${error.message}`);
  }

  return data;
}

/**
 * Retrieves a student record by their 7-digit numeric Calvin student ID.
 *
 * @param {string} studentId - 7-digit student ID string (e.g. '2346052')
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional scoped client
 * @returns {Promise<object|null>} Student record or null if not found
 */
async function getStudentByStudentId(studentId, client = getDefaultClient()) {
  // Step 1: Query by 7-digit student_id
  const { data, error } = await client
    .from('students')
    .select('*')
    .eq('student_id', studentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`[student-dal.getStudentByStudentId] Failed: ${error.message}`);
  }

  return data;
}

/**
 * Updates a student's FERPA directory opt-in status and visible fields.
 *
 * @param {string} id - Student UUID
 * @param {object} preferences - Preferences object
 * @param {boolean} preferences.directoryOptIn - Whether student opted in to directory
 * @param {object} preferences.directoryVisibleFields - JSON object of visible fields
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional scoped client
 * @returns {Promise<object>} Updated student record
 */
async function updateDirectoryPreferences(id, { directoryOptIn, directoryVisibleFields }, client = getDefaultClient()) {
  // Step 1: Perform update and mark directory_prompted as TRUE
  const { data, error } = await client
    .from('students')
    .update({
      directory_opt_in: !!directoryOptIn,
      directory_prompted: true,
      directory_visible_fields: directoryVisibleFields || { email: true, phone: false, residence: false },
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`[student-dal.updateDirectoryPreferences] Failed: ${error.message}`);
  }

  return data;
}

/**
 * Upserts a student record from Microsoft Entra ID profile claims.
 *
 * @param {object} studentData - Student attributes
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional scoped client
 * @returns {Promise<object>} Upserted student record
 */
async function upsertStudent(studentData, client = getDefaultClient()) {
  // Step 1: Execute idempotent upsert on primary key `id`
  const { data, error } = await client
    .from('students')
    .upsert({
      ...studentData,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    throw new Error(`[student-dal.upsertStudent] Failed: ${error.message}`);
  }

  return data;
}

module.exports = {
  getStudentById,
  getStudentByUsername,
  getStudentByStudentId,
  updateDirectoryPreferences,
  upsertStudent,
};
