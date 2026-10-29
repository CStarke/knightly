/**
 * Unified Posts & Scraped Events Data Access Layer (DAL)
 *
 * ARCHITECTURAL RATIONALE:
 * Ingests and retrieves both student-authored club announcements and scraped
 * `calvin.edu/events/all` Drupal events within a unified `posts` table.
 * Enforces server-authoritative timestamps, category taxonomy, and RLS author checks.
 */

const { getDefaultClient } = require('./supabase-client');

/**
 * Fetches published posts with optional category filtering, text search, and pagination.
 *
 * @param {object} [filters={}] - Filter criteria
 * @param {string} [filters.category] - 13-category taxonomy filter
 * @param {string} [filters.search] - Search string
 * @param {number} [filters.limit=50] - Result limit
 * @param {number} [filters.offset=0] - Pagination offset
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional client
 * @returns {Promise<Array<object>>} List of posts ordered descending by posted_at
 */
async function getPosts(filters = {}, client = getDefaultClient()) {
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  // Step 1: Base query on published posts ordered descending
  let query = client
    .from('posts')
    .select('*')
    .eq('status', 'published')
    .order('posted_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Step 2: Apply category filter if not 'All'
  if (filters.category && filters.category.toLowerCase() !== 'all') {
    query = query.ilike('category', filters.category);
  }

  // Step 3: Apply search filter across headline, body, or org_name
  if (filters.search) {
    const q = filters.search.trim();
    if (q) {
      query = query.or(`headline.ilike.%${q}%,body.ilike.%${q}%,org_name.ilike.%${q}%`);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`[posts-dal.getPosts] Failed: ${error.message}`);
  }

  return data || [];
}

/**
 * Retrieves a single post by UUID.
 *
 * @param {string} id - Post UUID
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional client
 * @returns {Promise<object|null>} Post or null
 */
async function getPostById(id, client = getDefaultClient()) {
  const { data, error } = await client
    .from('posts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`[posts-dal.getPostById] Failed: ${error.message}`);
  }

  return data;
}

/**
 * Creates a student-authored club flyer or announcement.
 * Timestamps (`posted_at` and `created_at_ms`) are strictly server-authoritative.
 *
 * @param {object} post - Post attributes
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional client
 * @returns {Promise<object>} Created post record
 */
async function createPost(post, client = getDefaultClient()) {
  const now = new Date();

  // Step 1: Resolve author_student_id: support both UUID and 7-digit student IDs
  let authorId = post.author_student_id || post.authorStudentId || null;
  if (authorId) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authorId);
    if (!isUuid) {
      const { data: st } = await client.from('students').select('id').eq('student_id', authorId).single();
      if (st && st.id) {
        authorId = st.id;
      } else {
        const { data: stUser } = await client.from('students').select('id').eq('username', authorId).single();
        authorId = stUser?.id || null;
      }
    }
  }

  // Step 2: Resolve club_id: check if club exists in clubs table; if not, set to null
  let clubId = post.club_id || post.clubId || null;
  if (clubId) {
    const { data: cl } = await client.from('clubs').select('id').eq('id', clubId).single();
    if (!cl) {
      clubId = null;
    }
  }

  const payload = {
    club_id: clubId,
    author_student_id: authorId,
    org_name: post.org_name || post.orgName,
    mark: post.mark || (post.org_name || post.orgName).slice(0, 2).toUpperCase(),
    headline: post.headline,
    body: post.body,
    category: post.category,
    event_date: post.event_date || post.eventDate || null,
    start_time: post.start_time || post.startTime || null,
    end_time: post.end_time || post.endTime || null,
    when_text: post.when_text || post.whenText || null,
    where_text: post.where_text || post.whereText || null,
    image_url: post.image_url !== undefined ? post.image_url : (post.imageUrl || null),
    fallback_banner_svg: post.fallback_banner_svg !== undefined ? post.fallback_banner_svg : (post.fallbackBannerSvg || null),
    campus_wide: !!(post.campus_wide !== undefined ? post.campus_wide : post.campusWide),
    source: post.source || 'club',
    external_event_id: post.external_event_id || post.externalEventId || null,
    status: post.status || 'published',
    posted_at: post.posted_at || now.toISOString(),
    created_at_ms: post.created_at_ms || now.getTime(),
  };

  const { data, error } = await client
    .from('posts')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`[posts-dal.createPost] Failed: ${error.message}`);
  }

  return data;
}

/**
 * Idempotently upserts a scraped event from `calvin.edu/events/all`.
 * Matches against `external_event_id` to prevent duplicate posts across sync cycles.
 *
 * @param {object} event - Scraped event attributes
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional client
 * @returns {Promise<object>} Upserted post record
 */
async function upsertScrapedEvent(event, client = getDefaultClient()) {
  const now = new Date();

  // If the scraped event was already recorded, preserve its original timestamp so restarts do not displace student posts
  let originalPostedAt = event.postedAt || null;
  let originalCreatedAtMs = event.createdAtMs || null;

  if (event.externalEventId) {
    const { data: existing } = await client
      .from('posts')
      .select('id, posted_at, created_at_ms')
      .eq('external_event_id', event.externalEventId)
      .single();

    if (existing) {
      originalPostedAt = existing.posted_at;
      originalCreatedAtMs = existing.created_at_ms;
    }
  }

  // Use current time when first scraped, and preserve original timestamp on subsequent sync cycles
  const postedAt = originalPostedAt || now.toISOString();
  const createdAtMs = originalCreatedAtMs || now.getTime();

  const payload = {
    club_id: null,
    author_student_id: null,
    org_name: event.orgName || 'Calvin Events',
    mark: event.mark || 'CE',
    headline: event.headline,
    body: event.body,
    category: event.category,
    event_date: event.eventDate || null,
    start_time: event.startTime || null,
    end_time: event.endTime || null,
    when_text: event.whenText || null,
    where_text: event.whereText || null,
    image_url: event.imageUrl || null,
    fallback_banner_svg: event.fallbackBannerSvg || null,
    campus_wide: true,
    source: 'calvin_drupal',
    external_event_id: event.externalEventId,
    status: 'published',
    posted_at: postedAt,
    created_at_ms: createdAtMs,
  };

  const { data, error } = await client
    .from('posts')
    .upsert(payload, { onConflict: 'external_event_id' })
    .select()
    .single();

  if (error) {
    throw new Error(`[posts-dal.upsertScrapedEvent] Failed: ${error.message}`);
  }

  return data;
}

/**
 * Saves a post to a student's personal bookmarks.
 *
 * @param {string} studentId - Student UUID
 * @param {string} postId - Post UUID
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional client
 * @returns {Promise<object>} Saved post record
 */
async function savePost(studentId, postId, client = getDefaultClient()) {
  const { data, error } = await client
    .from('saved_posts')
    .upsert({
      student_id: studentId,
      post_id: postId,
      saved_at: new Date().toISOString(),
    }, { onConflict: 'student_id,post_id' })
    .select()
    .single();

  if (error) {
    throw new Error(`[posts-dal.savePost] Failed: ${error.message}`);
  }

  return data;
}

/**
 * Removes a post from a student's bookmarks.
 *
 * @param {string} studentId - Student UUID
 * @param {string} postId - Post UUID
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional client
 * @returns {Promise<boolean>} True if removed
 */
async function unsavePost(studentId, postId, client = getDefaultClient()) {
  const { error } = await client
    .from('saved_posts')
    .delete()
    .eq('student_id', studentId)
    .eq('post_id', postId);

  if (error) {
    throw new Error(`[posts-dal.unsavePost] Failed: ${error.message}`);
  }

  return true;
}

/**
 * Retrieves all saved posts for a given student.
 *
 * @param {string} studentId - Student UUID
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional client
 * @returns {Promise<Array<object>>} List of saved posts
 */
async function getSavedPosts(studentId, client = getDefaultClient()) {
  const { data, error } = await client
    .from('saved_posts')
    .select(`
      saved_at,
      post:posts (*)
    `)
    .eq('student_id', studentId)
    .order('saved_at', { ascending: false });

  if (error) {
    throw new Error(`[posts-dal.getSavedPosts] Failed: ${error.message}`);
  }

  return (data || []).map((row) => ({
    ...row.post,
    savedAt: row.saved_at,
  }));
}

async function deletePost(id, client = getDefaultClient()) {
  const { error } = await client
    .from('posts')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`[posts-dal.deletePost] Failed: ${error.message}`);
  }

  return true;
}

module.exports = {
  getPosts,
  getPostById,
  createPost,
  deletePost,
  upsertScrapedEvent,
  savePost,
  unsavePost,
  getSavedPosts,
};
