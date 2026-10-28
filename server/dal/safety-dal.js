/**
 * Campus Safety & Emergency Data Access Layer (DAL)
 *
 * ARCHITECTURAL RATIONALE:
 * Provides direct database access for campus emergency contacts and active safety alerts.
 * Fallback values are provided if the database is in cold-start or offline.
 */

const { getDefaultClient } = require('./supabase-client');

/**
 * Retrieves campus safety contacts ordered by priority.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional client
 * @returns {Promise<Array<object>>} List of contacts
 */
async function getSafetyContacts(client = getDefaultClient()) {
  const { data, error } = await client
    .from('campus_safety_contacts')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`[safety-dal.getSafetyContacts] Failed: ${error.message}`);
  }

  return data || [];
}

/**
 * Retrieves currently active campus safety alerts.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional client
 * @returns {Promise<Array<object>>} Active alerts
 */
async function getActiveSafetyAlerts(client = getDefaultClient()) {
  const now = new Date().toISOString();
  const { data, error } = await client
    .from('campus_safety_alerts')
    .select('*')
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`[safety-dal.getActiveSafetyAlerts] Failed: ${error.message}`);
  }

  return data || [];
}

module.exports = {
  getSafetyContacts,
  getActiveSafetyAlerts,
};
