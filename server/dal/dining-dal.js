/**
 * Autonomous Dining Services Data Access Layer (DAL)
 *
 * ARCHITECTURAL RATIONALE:
 * Handles direct database operations for Calvin Dining Services:
 * - Meal plan definitions (weekly Core plans vs semester block plans)
 * - Student balances (`student_dining_accounts`)
 * - Immutable transaction ledger (`dining_transactions`)
 * - Venues, operational windows (`dining_hours`), and station menus
 *
 * All ledger insertions rely on the server-authoritative trigger `apply_dining_transaction()`
 * to keep balance aggregates synchronized without race conditions.
 */

const { getDefaultClient } = require('./supabase-client');

/**
 * Retrieves all registered meal plan definitions.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional client
 * @returns {Promise<Array<object>>} List of meal plans
 */
async function getMealPlans(client = getDefaultClient()) {
  const { data, error } = await client
    .from('meal_plans')
    .select('*')
    .order('swipes_total', { ascending: false });

  if (error) {
    throw new Error(`[dining-dal.getMealPlans] Failed: ${error.message}`);
  }

  return data || [];
}

/**
 * Retrieves a meal plan by its unique plan ID (e.g. 'core17', 'knollcrest60').
 *
 * @param {string} id - Meal plan ID
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional client
 * @returns {Promise<object|null>} Meal plan or null
 */
async function getMealPlanById(id, client = getDefaultClient()) {
  const { data, error } = await client
    .from('meal_plans')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`[dining-dal.getMealPlanById] Failed: ${error.message}`);
  }

  return data;
}

/**
 * Retrieves a student's live dining account including their assigned meal plan details.
 *
 * @param {string} studentId - Student UUID
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional client
 * @returns {Promise<object|null>} Dining account record with meal plan or null
 */
async function getStudentDiningAccount(studentId, client = getDefaultClient()) {
  let targetUuid = studentId;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId);
  if (!isUuid) {
    const { data: st } = await client.from('students').select('id').eq('student_id', studentId).single();
    if (st && st.id) {
      targetUuid = st.id;
    }
  }

  const { data, error } = await client
    .from('student_dining_accounts')
    .select(`
      *,
      meal_plan:meal_plans (*)
    `)
    .eq('student_id', targetUuid)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`[dining-dal.getStudentDiningAccount] Failed: ${error.message}`);
  }

  return data;
}

/**
 * Inserts an immutable transaction into the dining ledger.
 * The database trigger `apply_dining_transaction()` automatically adjusts balances.
 *
 * @param {object} transaction - Transaction record
 * @param {string} transaction.studentId - Student UUID
 * @param {string} transaction.venueId - Venue identifier (e.g. 'commons')
 * @param {'meal_swipe'|'flex_meal'|'guest_pass'|'knight_bucks'|'dining_dollars'} transaction.transactionType - Tender type
 * @param {number} transaction.amount - Amount (1 for swipe/flex/guest; dollar amount for tenders)
 * @param {string} [transaction.registerId] - Kiosk or register identifier
 * @param {string} [transaction.cashierId] - Cashier staff identifier
 * @param {string} [transaction.description] - Transaction description
 * @param {string} [transaction.externalTransactRef] - External transition ID
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional client
 * @returns {Promise<object>} Created ledger record
 */
async function recordDiningTransaction(transaction, client = getDefaultClient()) {
  let targetUuid = transaction.studentId;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transaction.studentId);
  if (!isUuid) {
    const { data: st } = await client.from('students').select('id').eq('student_id', transaction.studentId).single();
    if (st && st.id) {
      targetUuid = st.id;
    }
  }

  const payload = {
    student_id: targetUuid,
    venue_id: transaction.venueId,
    transaction_type: transaction.transactionType,
    amount: transaction.amount,
    register_id: transaction.registerId || 'kiosk-main',
    cashier_id: transaction.cashierId || null,
    description: transaction.description || `${transaction.transactionType} at ${transaction.venueId}`,
    external_transact_ref: transaction.externalTransactRef || null,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from('dining_transactions')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`[dining-dal.recordDiningTransaction] Failed: ${error.message}`);
  }

  return data;
}

/**
 * Fetches transaction history for a given student.
 *
 * @param {string} studentId - Student UUID
 * @param {object} [options] - Pagination and date filtering options
 * @param {number} [options.limit=50] - Number of transactions to return
 * @param {string} [options.sinceDate] - ISO 8601 timestamp for time-windowed calculations
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional client
 * @returns {Promise<Array<object>>} List of transactions ordered descending
 */
async function getDiningTransactions(studentId, options = {}, client = getDefaultClient()) {
  let targetUuid = studentId;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId);
  if (!isUuid) {
    const { data: st } = await client.from('students').select('id').eq('student_id', studentId).single();
    if (st && st.id) {
      targetUuid = st.id;
    }
  }

  const limit = options.limit || 50;
  let query = client
    .from('dining_transactions')
    .select('*')
    .eq('student_id', targetUuid)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (options.sinceDate) {
    query = query.gte('created_at', options.sinceDate);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`[dining-dal.getDiningTransactions] Failed: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetches all dining venues along with operational hours and stations.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional client
 * @returns {Promise<Array<object>>} Venues list
 */
async function getDiningVenues(client = getDefaultClient()) {
  const { data, error } = await client
    .from('dining_venues')
    .select(`
      *,
      dining_hours (*),
      dining_stations (
        *,
        dining_menu_items (*)
      )
    `);

  if (error) {
    throw new Error(`[dining-dal.getDiningVenues] Failed: ${error.message}`);
  }

  return data || [];
}

/**
 * Upserts or resets a student dining account (e.g. at the start of a semester or during sync).
 *
 * @param {object} accountData - Student dining account attributes
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] - Optional client
 * @returns {Promise<object>} Upserted dining account
 */
async function upsertStudentDiningAccount(accountData, client = getDefaultClient()) {
  const { data, error } = await client
    .from('student_dining_accounts')
    .upsert({
      ...accountData,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'student_id' })
    .select()
    .single();

  if (error) {
    throw new Error(`[dining-dal.upsertStudentDiningAccount] Failed: ${error.message}`);
  }

  return data;
}

module.exports = {
  getMealPlans,
  getMealPlanById,
  getStudentDiningAccount,
  recordDiningTransaction,
  getDiningTransactions,
  getDiningVenues,
  upsertStudentDiningAccount,
};
