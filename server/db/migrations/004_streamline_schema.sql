-- ============================================================================
-- Knightly Database Migration: 004_streamline_schema.sql
-- Fulfills: Streamline Database Model & De-emphasize Academic Focus
-- Target: PostgreSQL 15+ / Supabase
-- ============================================================================

-- Step 1: Remove unneeded academic & personal location fields from students
ALTER TABLE students DROP COLUMN IF EXISTS advisor;
ALTER TABLE students DROP COLUMN IF EXISTS residence;

-- Step 2: Update default visible directory fields (removing residence)
ALTER TABLE students ALTER COLUMN directory_visible_fields SET DEFAULT '{"email": true, "phone": false}'::jsonb;
UPDATE students 
SET directory_visible_fields = jsonb_build_object(
    'email', COALESCE((directory_visible_fields->>'email')::boolean, true),
    'phone', COALESCE((directory_visible_fields->>'phone')::boolean, false)
)
WHERE directory_visible_fields ? 'residence';

-- Step 3: Remove tagline from clubs (consolidated to name, category, description)
ALTER TABLE clubs DROP COLUMN IF EXISTS tagline;

-- Step 4: Drop unused speculative tables
DROP TABLE IF EXISTS dining_menu_items CASCADE;
DROP TABLE IF EXISTS dining_stations CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
