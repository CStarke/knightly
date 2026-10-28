-- ============================================================================
-- Knightly Database Migration: 001_initial_schema.sql
-- Fulfills Project Implementation SD2: Relational Database Schema
-- Target: PostgreSQL 15+ / Supabase
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Standalone environment compatibility shim:
-- Ensures auth.users exists when running migrations in local non-Supabase PostgreSQL instances
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'auth' AND tablename = 'users') THEN
        CREATE SCHEMA IF NOT EXISTS auth;
        CREATE TABLE auth.users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid()
        );
        ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ============================================================================
-- 1. STUDENTS & ACADEMIC CREDENTIALS
-- ============================================================================
-- ARCHITECTURAL NOTE ON VARIABLE STUDENT ID LENGTHS:
-- Calvin University student ID numbers historically vary in length (6, 7, 8, or 9 digits).
-- student_id and card_number use VARCHAR(32) and barcode uses VARCHAR(48) to guarantee
-- 100% immunity against length overflow errors regardless of student enrollment era.
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id VARCHAR(32) NOT NULL UNIQUE,
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE CHECK (email LIKE '%@calvin.edu'),
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    class_year INT CHECK (class_year >= 1950 AND class_year <= 2050),
    standing VARCHAR(32) NOT NULL DEFAULT 'Freshman' CHECK (standing IN ('Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'Alum', 'Faculty', 'Staff')),
    major VARCHAR(150) NOT NULL,
    minor VARCHAR(150),
    card_number VARCHAR(32) NOT NULL,
    barcode VARCHAR(48) GENERATED ALWAYS AS ('00000' || student_id || '00') STORED,
    residence VARCHAR(150),
    advisor VARCHAR(150),
    role VARCHAR(32) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'moderator', 'admin')),
    directory_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    directory_prompted BOOLEAN NOT NULL DEFAULT FALSE,
    directory_visible_fields JSONB NOT NULL DEFAULT '{"email": true, "phone": false, "residence": false}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_username ON students(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);

-- ============================================================================
-- 2. CAMPUS CLUBS & STUDENT ORGANIZATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS clubs (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(64) NOT NULL,
    mark VARCHAR(8) NOT NULL,
    tagline VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    meeting_schedule VARCHAR(255),
    location VARCHAR(150),
    contact_email VARCHAR(255) NOT NULL,
    leader_name VARCHAR(150),
    primary_color VARCHAR(16) NOT NULL DEFAULT '#8C2131',
    secondary_color VARCHAR(16) NOT NULL DEFAULT '#E8B019',
    sf_icon VARCHAR(64) NOT NULL DEFAULT 'sparkles',
    md_icon VARCHAR(64) NOT NULL DEFAULT 'auto_awesome',
    image_url TEXT,
    is_department BOOLEAN NOT NULL DEFAULT FALSE,
    -- Follower count is purely internal for feed recommendation algorithms and admin analytics. Never exposed to clubs or public UI (non-social invariant).
    follower_count INT NOT NULL DEFAULT 0 CHECK (follower_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clubs_category ON clubs(category);

-- Salted SHA-256 Claim Codes for Club Leadership Authorization
CREATE TABLE IF NOT EXISTS club_claim_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id VARCHAR(64) NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    code_hash VARCHAR(128) NOT NULL UNIQUE,
    formatted_preview VARCHAR(16) NOT NULL,
    is_redeemed BOOLEAN NOT NULL DEFAULT FALSE,
    redeemed_by_student_id UUID REFERENCES students(id),
    redeemed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Many-to-many club leadership registry (supports multiple co-leaders with posting access)
CREATE TABLE IF NOT EXISTS club_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    club_id VARCHAR(64) NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    claim_code_id UUID REFERENCES club_claim_codes(id),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, club_id)
);

CREATE TABLE IF NOT EXISTS club_follows (
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    club_id VARCHAR(64) NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    followed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(student_id, club_id)
);

-- Trigger: Automatically update follower_count in clubs table
CREATE OR REPLACE FUNCTION update_club_follower_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE clubs SET follower_count = follower_count + 1 WHERE id = NEW.club_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE clubs SET follower_count = GREATEST(0, follower_count - 1) WHERE id = OLD.club_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_club_follower_count
    AFTER INSERT OR DELETE ON club_follows
    FOR EACH ROW
    EXECUTE FUNCTION update_club_follower_count();

-- ============================================================================
-- 3. AUTONOMOUS DINING SERVICES & TRANSACTION LEDGER
-- ============================================================================
CREATE TABLE IF NOT EXISTS meal_plans (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    cadence VARCHAR(16) NOT NULL CHECK (cadence IN ('weekly', 'semester')),
    swipes_total INT NOT NULL DEFAULT 0 CHECK (swipes_total >= 0),
    flex_meals INT NOT NULL DEFAULT 0 CHECK (flex_meals >= 0),
    guest_passes INT NOT NULL DEFAULT 0 CHECK (guest_passes >= 0),
    bundled_knight_bucks NUMERIC(8, 2) NOT NULL DEFAULT 0.00 CHECK (bundled_knight_bucks >= 0.00),
    week_resets_on VARCHAR(64),
    description TEXT
);

CREATE TABLE IF NOT EXISTS student_dining_accounts (
    student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
    meal_plan_id VARCHAR(32) NOT NULL REFERENCES meal_plans(id),
    swipes_used INT NOT NULL DEFAULT 0 CHECK (swipes_used >= 0),
    flex_meals_used INT NOT NULL DEFAULT 0 CHECK (flex_meals_used >= 0),
    guest_passes_used INT NOT NULL DEFAULT 0 CHECK (guest_passes_used >= 0),
    knight_bucks NUMERIC(8, 2) NOT NULL DEFAULT 0.00 CHECK (knight_bucks >= 0.00),
    dining_dollars NUMERIC(8, 2) NOT NULL DEFAULT 0.00 CHECK (dining_dollars >= 0.00),
    external_transact_id VARCHAR(64),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dining_venues (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    accepts_swipes BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS dining_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id VARCHAR(32) NOT NULL REFERENCES dining_venues(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    meal_period VARCHAR(64) NOT NULL,
    start_minute_after_midnight INT NOT NULL CHECK (start_minute_after_midnight >= 0 AND start_minute_after_midnight < 1440),
    end_minute_after_midnight INT NOT NULL CHECK (end_minute_after_midnight >= 0 AND end_minute_after_midnight <= 1440)
);

CREATE TABLE IF NOT EXISTS dining_stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id VARCHAR(32) NOT NULL REFERENCES dining_venues(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS dining_menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES dining_stations(id) ON DELETE CASCADE,
    item_name VARCHAR(150) NOT NULL,
    is_vegetarian BOOLEAN NOT NULL DEFAULT FALSE,
    is_vegan BOOLEAN NOT NULL DEFAULT FALSE,
    is_gluten_free BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS dining_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    venue_id VARCHAR(32) NOT NULL REFERENCES dining_venues(id),
    transaction_type VARCHAR(32) NOT NULL CHECK (transaction_type IN ('meal_swipe', 'flex_meal', 'guest_pass', 'knight_bucks', 'dining_dollars')),
    amount NUMERIC(8, 2) NOT NULL CHECK (amount > 0),
    register_id VARCHAR(64) NOT NULL DEFAULT 'kiosk-main',
    cashier_id VARCHAR(64),
    description VARCHAR(255),
    external_transact_ref VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dining_tx_student_created ON dining_transactions(student_id, created_at DESC);

-- Autonomous Dining Ledger Trigger: Updates student balances atomically upon transaction creation
CREATE OR REPLACE FUNCTION apply_dining_transaction()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_type = 'meal_swipe' THEN
        UPDATE student_dining_accounts
        SET swipes_used = swipes_used + NEW.amount::INT,
            updated_at = NOW()
        WHERE student_id = NEW.student_id;
    ELSIF NEW.transaction_type = 'flex_meal' THEN
        UPDATE student_dining_accounts
        SET flex_meals_used = flex_meals_used + NEW.amount::INT,
            updated_at = NOW()
        WHERE student_id = NEW.student_id;
    ELSIF NEW.transaction_type = 'guest_pass' THEN
        UPDATE student_dining_accounts
        SET guest_passes_used = guest_passes_used + NEW.amount::INT,
            updated_at = NOW()
        WHERE student_id = NEW.student_id;
    ELSIF NEW.transaction_type = 'knight_bucks' THEN
        UPDATE student_dining_accounts
        SET knight_bucks = knight_bucks - NEW.amount,
            updated_at = NOW()
        WHERE student_id = NEW.student_id;
    ELSIF NEW.transaction_type = 'dining_dollars' THEN
        UPDATE student_dining_accounts
        SET dining_dollars = dining_dollars - NEW.amount,
            updated_at = NOW()
        WHERE student_id = NEW.student_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_apply_dining_transaction
    AFTER INSERT ON dining_transactions
    FOR EACH ROW
    EXECUTE FUNCTION apply_dining_transaction();

-- ============================================================================
-- 4. UNIFIED CAMPUS FEED & ANNOUNCEMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id VARCHAR(64) REFERENCES clubs(id) ON DELETE SET NULL,
    author_student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    org_name VARCHAR(150) NOT NULL,
    mark VARCHAR(8),
    headline VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    category VARCHAR(64) NOT NULL,
    event_date DATE,
    start_time TIME,
    end_time TIME,
    when_text VARCHAR(150),
    where_text VARCHAR(150),
    image_url TEXT,
    fallback_banner_svg VARCHAR(64),
    campus_wide BOOLEAN NOT NULL DEFAULT FALSE,
    source VARCHAR(32) NOT NULL DEFAULT 'club' CHECK (source IN ('club', 'calvin_drupal', 'admin')),
    external_event_id VARCHAR(255) UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft', 'archived')),
    posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at_ms BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    CONSTRAINT chk_student_post_author CHECK (source != 'club' OR author_student_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_posts_posted_at ON posts(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_search ON posts USING gin(to_tsvector('english', headline || ' ' || body || ' ' || org_name));

-- Student Bookmarks / Saved Posts
CREATE TABLE IF NOT EXISTS saved_posts (
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(student_id, post_id)
);

-- ============================================================================
-- 5. CAMPUS SAFETY & DIRECTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS campus_safety_contacts (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    detail VARCHAR(255) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    urgent BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS campus_safety_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    severity VARCHAR(32) NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
    title VARCHAR(255) NOT NULL,
    detail TEXT NOT NULL,
    area VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS directory_people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('Faculty', 'Staff', 'Student')),
    title VARCHAR(150) NOT NULL,
    department VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(32),
    office_location VARCHAR(150),
    office_hours VARCHAR(255),
    pronouns VARCHAR(32),
    interests TEXT,
    is_public_visible BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_directory_people_role ON directory_people(role);
CREATE INDEX IF NOT EXISTS idx_directory_people_search ON directory_people USING gin(to_tsvector('english', first_name || ' ' || last_name || ' ' || department || ' ' || title));

-- ============================================================================
-- 6. IMMUTABLE AUDIT LOG
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES students(id) ON DELETE SET NULL,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(64) NOT NULL,
    target_id VARCHAR(128) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON audit_logs(actor_id, created_at DESC);
