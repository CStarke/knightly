/**
 * Supabase Client Factory & Connection Manager (DAL)
 *
 * ARCHITECTURAL RATIONALE:
 * Centralizes Supabase client initialization for the backend server.
 * Supports both:
 * 1. Default anon/service-role client for background synchronization (e.g. Drupal scraping).
 * 2. Authenticated scoped client forwarding the student's JWT token, ensuring
 *    PostgreSQL Row-Level Security (RLS) policies are natively enforced at the database engine level.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Fallback configuration for local development / testing
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJh...mock-anon-key';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

// Global singleton client for server-level operations
let defaultClient = null;

/**
 * Retrieves or initializes the default Supabase client.
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient} Default client instance
 */
function getDefaultClient() {
  // Step 1: Return cached client if already initialized
  if (!defaultClient) {
    // Step 2: Initialize Supabase client with connection pooling and auto-refresh disabled for server environments
    defaultClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return defaultClient;
}

/**
 * Creates an authenticated Supabase client scoped to a student's JWT session.
 * Forwarding the student's access token ensures that PostgreSQL RLS policies
 * evaluate `auth.uid()` against the authenticated student.
 *
 * @param {string} [accessToken] - JWT token from student's Authorization header
 * @returns {import('@supabase/supabase-js').SupabaseClient} Token-scoped client
 */
function getScopedClient(accessToken) {
  // Step 1: If no token provided, fall back to default server client
  if (!accessToken) {
    return getDefaultClient();
  }

  // Step 2: Clean Bearer prefix if present
  const cleanToken = accessToken.replace(/^Bearer\s+/i, '').trim();

  // Step 3: Instantiate client with student's JWT injected in global auth headers
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
      },
    },
  });
}

module.exports = {
  getDefaultClient,
  getScopedClient,
};
