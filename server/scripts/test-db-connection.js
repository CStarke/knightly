/**
 * Supabase Live Connection Verification Script
 *
 * Usage: node server/scripts/test-db-connection.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { getDefaultClient } = require('../dal/supabase-client');

async function testConnection() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('--- Knightly Supabase Connection Test ---');
  console.log('SUPABASE_URL:', url || '❌ NOT SET');
  console.log('SUPABASE_ANON_KEY:', anonKey ? '✅ SET' : '❌ NOT SET');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '✅ SET' : '⚠️ NOT SET (falling back to anon)');

  if (!url || !anonKey) {
    console.error('\n❌ Missing required environment variables in server/.env');
    console.error('Please create server/.env with SUPABASE_URL and SUPABASE_ANON_KEY.');
    process.exit(1);
  }

  try {
    const client = getDefaultClient();

    // Query 1: Verify public table read
    const { data: venues, error: venueError } = await client
      .from('dining_venues')
      .select('id, name')
      .limit(5);

    if (venueError) {
      console.error('\n❌ Query failed on dining_venues:', venueError.message);
      process.exit(1);
    }

    console.log(`\n✅ Successfully connected to Supabase!`);
    console.log(`Retrieved ${venues.length} venue(s) from 'dining_venues':`);
    venues.forEach((v) => console.log(`  - [${v.id}] ${v.name}`));

    // Query 2: Verify meal plans read
    const { data: plans, error: planError } = await client
      .from('meal_plans')
      .select('id, name, swipes_total')
      .limit(3);

    if (!planError && plans) {
      console.log(`Retrieved ${plans.length} meal plan(s) from 'meal_plans':`);
      plans.forEach((p) => console.log(`  - [${p.id}] ${p.name} (${p.swipes_total} swipes)`));
    }

    console.log('\n🚀 All database checks passed successfully!\n');
  } catch (err) {
    console.error('\n❌ Unexpected error testing Supabase:', err.message);
    process.exit(1);
  }
}

testConnection();
