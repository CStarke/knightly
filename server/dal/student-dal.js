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
 * Auto-provisions a new student record in Supabase with a random v4 UUID,
 * 7-digit student ID, and default meal plan account.
 *
 * @param {string} username - Calvin username
 * @param {import('@supabase/supabase-js').SupabaseClient} [client]
 * @returns {Promise<object>} Created student record
 */
async function provisionStudent(username, client = getDefaultClient()) {
  const normalized = (username || '').trim().toLowerCase();
  if (!normalized) throw new Error('[student-dal.provisionStudent] username is required');

  const cleanUser = normalized.includes('@') ? normalized.split('@')[0] : normalized;
  const email = `${cleanUser}@calvin.edu`;
  const cleanName = cleanUser.replace(/[@._-]/g, ' ');
  const words = cleanName.split(' ').filter(Boolean);
  const firstName = words[0] ? words[0].charAt(0).toUpperCase() + words[0].slice(1) : 'Calvin';
  const lastName = words[1] ? words[1].charAt(0).toUpperCase() + words[1].slice(1) : 'Student';

  // Stable 7-digit student ID derived from username hash
  let hash = 0;
  for (let i = 0; i < cleanUser.length; i++) {
    hash = (hash << 5) - hash + cleanUser.charCodeAt(i);
    hash |= 0;
  }
  const suffix = String(Math.abs(hash % 90000) + 10000).padStart(5, '0');
  const studentId = `24${suffix}`;

  let userId = require('crypto').randomUUID();
  try {
    if (client.auth && client.auth.admin) {
      const { data: authUser, error: authErr } = await client.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { username: cleanUser, first_name: firstName, last_name: lastName },
      });
      if (authUser?.user?.id) {
        userId = authUser.user.id;
      } else if (authErr && authErr.code === 'email_exists') {
        // Resolve existing user ID from auth.users
        const { data: listData } = await client.auth.admin.listUsers();
        const existingAuth = listData?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (existingAuth?.id) {
          userId = existingAuth.id;
        }
      }
    }
  } catch {
    // If auth user creation fails, continue with generated/resolved UUID
  }

  const { data: student, error: stErr } = await client
    .from('students')
    .insert({
      id: userId,
      student_id: studentId,
      username: cleanUser,
      email,
      first_name: firstName,
      last_name: lastName,
      class_year: 2028,
      standing: 'Freshman',
      major: 'Liberal Arts',
      card_number: studentId,
      role: 'student',
      directory_opt_in: false,
      directory_prompted: false,
      directory_visible_fields: { email: true, phone: false, residence: false },
    })
    .select()
    .single();

  if (stErr) {
    // If student already exists concurrently, fetch it
    const existing = await getStudentByUsername(cleanUser, client);
    if (existing) return existing;
    throw new Error(`[student-dal.provisionStudent] Failed: ${stErr.message}`);
  }

  // Provision default student dining account
  try {
    await client.from('student_dining_accounts').insert({
      student_id: userId,
      meal_plan_id: 'core14',
      swipes_used: 0,
      flex_meals_used: 0,
      guest_passes_used: 0,
      knight_bucks: 80.0,
      dining_dollars: 0.0,
    });
  } catch {
    // Ignore if dining account already created
  }

  return student;
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
  // Step 1: Detect whether id is a standard UUID or a numeric student_id
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  let query = client
    .from('students')
    .update({
      directory_opt_in: !!directoryOptIn,
      directory_prompted: true,
      directory_visible_fields: directoryVisibleFields || { email: true, phone: false, residence: false },
      updated_at: new Date().toISOString(),
    });

  if (isUuid) {
    query = query.eq('id', id);
  } else {
    query = query.eq('student_id', id);
  }

  const { data, error } = await query.select().single();

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
  provisionStudent,
  updateDirectoryPreferences,
  upsertStudent,
};
