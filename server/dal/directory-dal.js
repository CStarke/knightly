/**
 * Campus Directory Data Access Layer (DAL)
 *
 * ARCHITECTURAL RATIONALE:
 * Handles directory lookups across faculty, staff, and FERPA-consenting students.
 * Enforces privacy masking:
 * - Faculty and Staff entries are public.
 * - Student entries are ONLY visible if `is_public_visible = true` (derived from `students.directory_opt_in`).
 */

const { getDefaultClient } = require('./supabase-client');

/**
 * Searches the campus directory respecting FERPA visibility.
 *
 * @param {object} [filters={}] - Search criteria
 * @param {string} [filters.search] - Name, department, or title keyword
 * @param {string} [filters.role] - 'Faculty', 'Staff', or 'Student'
 * @param {string} [filters.department] - Academic/administrative department
 * @param {number} [filters.limit=50] - Result limit
 * @param {number} [filters.offset=0] - Offset
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional client
 * @returns {Promise<Array<object>>} Filtered directory people
 */
async function searchDirectory(filters = {}, client = getDefaultClient()) {
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  // Step 1: Base query strictly filtering on public visibility
  let query = client
    .from('directory_people')
    .select('*')
    .eq('is_public_visible', true)
    .order('last_name', { ascending: true })
    .range(offset, offset + limit - 1);

  // Step 2: Filter by role if specified
  if (filters.role) {
    query = query.ilike('role', filters.role);
  }

  // Step 3: Filter by department if specified
  if (filters.department) {
    query = query.ilike('department', filters.department);
  }

  // Step 4: Text search on first name, last name, department, title
  if (filters.search) {
    const q = filters.search.trim();
    if (q) {
      query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,department.ilike.%${q}%,title.ilike.%${q}%`);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`[directory-dal.searchDirectory] Failed: ${error.message}`);
  }

  return data || [];
}

/**
 * Upserts a directory listing for a student when their FERPA preferences update.
 *
 * @param {object} student - Student record
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional client
 * @returns {Promise<object>} Directory record
 */
async function syncStudentDirectoryListing(student, client = getDefaultClient()) {
  const visible = !!student.directory_opt_in;
  const fields = student.directory_visible_fields || {};

  const payload = {
    student_id: student.id,
    first_name: student.first_name,
    last_name: student.last_name,
    role: 'Student',
    title: `${student.standing} - ${student.major}`,
    department: student.major,
    email: fields.email !== false ? student.email : null,
    phone: fields.phone ? student.phone : null,
    office_location: fields.residence ? student.residence : null,
    office_hours: null,
    pronouns: null,
    interests: null,
    is_public_visible: visible,
  };

  const { data, error } = await client
    .from('directory_people')
    .upsert(payload, { onConflict: 'email' })
    .select()
    .single();

  if (error) {
    throw new Error(`[directory-dal.syncStudentDirectoryListing] Failed: ${error.message}`);
  }

  return data;
}

module.exports = {
  searchDirectory,
  syncStudentDirectoryListing,
};
