-- ============================================================================
-- Knightly Database Migration: 002_rls_policies.sql
-- Fulfills Project Implementation SD2 / Security NFR-S1 to NFR-S6
-- Target: PostgreSQL 15+ / Supabase Row-Level Security (RLS)
-- ============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_dining_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dining_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_claim_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dining_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE dining_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE dining_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dining_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE campus_safety_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campus_safety_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE directory_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. PUBLIC READ POLICIES (anon & authenticated)
-- ============================================================================

-- Public read for published posts
CREATE POLICY "Public read published posts" ON posts
    FOR SELECT TO anon, authenticated
    USING (status = 'published');

-- Public read for clubs
CREATE POLICY "Public read clubs" ON clubs
    FOR SELECT TO anon, authenticated
    USING (true);

-- Public read for meal plans catalog
CREATE POLICY "Public read meal plans" ON meal_plans
    FOR SELECT TO anon, authenticated
    USING (true);

-- Public read for dining halls and schedules
CREATE POLICY "Public read dining venues" ON dining_venues
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "Public read dining hours" ON dining_hours
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "Public read dining stations" ON dining_stations
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "Public read dining menu items" ON dining_menu_items
    FOR SELECT TO anon, authenticated
    USING (true);

-- Public read for emergency safety contacts & active alerts
CREATE POLICY "Public read safety contacts" ON campus_safety_contacts
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "Public read active safety alerts" ON campus_safety_alerts
    FOR SELECT TO anon, authenticated
    USING (is_active = true);

-- ============================================================================
-- 3. STUDENT PERSONAL DATA POLICIES (authenticated)
-- ============================================================================

-- Students can ONLY view their own student profile
CREATE POLICY "Student read own profile" ON students
    FOR SELECT TO authenticated
    USING (id = auth.uid());

-- Students can update their own FERPA directory preferences
CREATE POLICY "Student update directory privacy" ON students
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Dining: Students can ONLY view their own balances and transactions
CREATE POLICY "Student view own dining balance" ON student_dining_accounts
    FOR SELECT TO authenticated
    USING (student_id = auth.uid());

CREATE POLICY "Student view own dining transactions" ON dining_transactions
    FOR SELECT TO authenticated
    USING (student_id = auth.uid());

-- Saved Posts: Strictly private to each student
CREATE POLICY "Student manage own saved posts" ON saved_posts
    FOR ALL TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

-- Club Follows: Students manage their own follows
CREATE POLICY "Student manage own club follows" ON club_follows
    FOR ALL TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

-- ============================================================================
-- 4. CLUB POSTING & POST AUTHORING POLICIES
-- ============================================================================

-- Club Memberships: Students can read their own memberships
CREATE POLICY "Student read own memberships" ON club_memberships
    FOR SELECT TO authenticated
    USING (student_id = auth.uid());

-- Club Claim Codes: Authenticated students can verify and redeem unredeemed codes
CREATE POLICY "Student view unredeemed claim codes" ON club_claim_codes
    FOR SELECT TO authenticated
    USING (is_redeemed = false OR redeemed_by_student_id = auth.uid());

CREATE POLICY "Student redeem claim codes" ON club_claim_codes
    FOR UPDATE TO authenticated
    USING (is_redeemed = false)
    WITH CHECK (redeemed_by_student_id = auth.uid());

-- Post Authoring: Only verified club members of that specific club or admins
-- SECURITY REQUIREMENT: Every club post MUST be linked directly to the authoring student (author_student_id = auth.uid())
CREATE POLICY "Club members author posts" ON posts
    FOR INSERT TO authenticated
    WITH CHECK (
        author_student_id = auth.uid()
        AND (
            EXISTS (
                SELECT 1 FROM club_memberships cm
                WHERE cm.student_id = auth.uid()
                  AND cm.club_id = posts.club_id
            )
            OR EXISTS (
                SELECT 1 FROM students s
                WHERE s.id = auth.uid() AND s.role IN ('admin', 'moderator')
            )
        )
    );

CREATE POLICY "Authors edit own club posts" ON posts
    FOR UPDATE TO authenticated
    USING (
        author_student_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM students s
            WHERE s.id = auth.uid() AND s.role IN ('admin', 'moderator')
        )
    )
    WITH CHECK (
        author_student_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM students s
            WHERE s.id = auth.uid() AND s.role IN ('admin', 'moderator')
        )
    );

CREATE POLICY "Authors delete own club posts" ON posts
    FOR DELETE TO authenticated
    USING (
        author_student_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM students s
            WHERE s.id = auth.uid() AND s.role IN ('admin', 'moderator')
        )
    );

-- ============================================================================
-- 5. FERPA DIRECTORY VISIBILITY POLICIES
-- ============================================================================

-- Faculty/Staff are visible to all; Students are only visible if is_public_visible is true
CREATE POLICY "Read directory people" ON directory_people
    FOR SELECT TO anon, authenticated
    USING (
        is_public_visible = true
        AND (
            role IN ('Faculty', 'Staff')
            OR EXISTS (
                SELECT 1 FROM students s
                WHERE s.id = directory_people.student_id
                  AND s.directory_opt_in = true
            )
        )
    );

-- ============================================================================
-- 6. AUDIT LOG POLICIES
-- ============================================================================

-- Audit logs: readable only by administrators
CREATE POLICY "Admins read audit logs" ON audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.id = auth.uid() AND s.role = 'admin'
        )
    );

-- Audit logs: authenticated users can insert activity traces
CREATE POLICY "Authenticated insert audit logs" ON audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);

-- ============================================================================
-- 7. DATA API ROLE PRIVILEGES (anon, authenticated, service_role)
-- ============================================================================
-- Required when "Automatically expose new tables" is disabled in Supabase.
-- Grants table privileges so PostgreSQL can reach the Row-Level Security policy layer.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON ROUTINES TO anon, authenticated;

