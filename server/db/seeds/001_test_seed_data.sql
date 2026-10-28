-- ============================================================================
-- Knightly Test & Development Seed Script: 001_test_seed_data.sql
--
-- ARCHITECTURAL DIRECTIVE & PRODUCTION NOTICE:
-- THIS SEED SCRIPT IS STRICTLY FOR LOCAL DEVELOPMENT, PROTOTYPE DEMONSTRATION,
-- AND AUTOMATED UNIT/INTEGRATION TESTING.
--
-- IN PRODUCTION:
-- 1. All student accounts will be provisioned dynamically via Calvin University's
--    enterprise Microsoft Entra ID (Azure AD) tenant.
-- 2. John Doe is a prototype test persona and will NOT exist in production.
-- 3. Live dining balances and club leadership will be managed by authorized
--    university entities and the self-authoritative dining ledger.
-- ============================================================================

-- 1. Insert Standard Meal Plans catalog
INSERT INTO meal_plans (id, name, cadence, swipes_total, flex_meals, guest_passes, bundled_knight_bucks, week_resets_on, description)
VALUES
    ('core21', 'Core 21', 'weekly', 21, 3, 2, 160.00, 'Sunday at 12:00 a.m.', '21 meals/week + 3 flex meals + 2 guest passes. Best for students eating 3 meals/day.'),
    ('core17', 'Core 17', 'weekly', 17, 3, 2, 125.00, 'Sunday at 12:00 a.m.', '17 meals/week + 3 flex meals + 2 guest passes.'),
    ('core14', 'Core 14', 'weekly', 14, 2, 2, 80.00, 'Sunday at 12:00 a.m.', '14 meals/week + 2 flex meals + 2 guest passes. Most popular choice.'),
    ('core10', 'Core 10', 'weekly', 10, 2, 2, 70.00, 'Sunday at 12:00 a.m.', '10 meals/week + 2 flex meals + 2 guest passes.'),
    ('core5', 'Core 5', 'weekly', 5, 1, 0, 35.00, 'Sunday at 12:00 a.m.', '5 meals/week + 1 flex meal. No guest passes.'),
    ('knollcrest60', 'Knollcrest 60 Block', 'semester', 60, 0, 0, 30.00, NULL, '60 meals per semester for apartments or commuters.'),
    ('joust30', 'Joust 30 Block', 'semester', 30, 0, 0, 15.00, NULL, '30 meals per semester for light campus dining.')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    swipes_total = EXCLUDED.swipes_total,
    flex_meals = EXCLUDED.flex_meals,
    guest_passes = EXCLUDED.guest_passes,
    bundled_knight_bucks = EXCLUDED.bundled_knight_bucks;

-- 2. Insert Core Dining Venues
INSERT INTO dining_venues (id, name, location, description, accepts_swipes)
VALUES
    ('commons', 'Commons Dining Hall', 'Commons Union, Level 1', 'All-you-care-to-eat with the new allergen-free station.', true),
    ('knollcrest', 'Knollcrest Dining', 'Knollcrest East', 'Quieter room on the east side, big breakfast spread.', true),
    ('uppercrust', 'Uppercrust', 'Commons Union, Level 2', 'Pizza, pasta, and late-night grab-and-go.', false),
    ('peets', 'Peet''s Coffee', 'Hekman Library lobby', 'Espresso, pastries, and outlet-heavy tables.', false),
    ('johnnys', 'Johnny''s Cafe', 'Spoelhof Center', 'Sandwiches, smoothies, and the cookie.', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Dining Operating Windows (Monday-Friday standard)
INSERT INTO dining_hours (venue_id, day_of_week, meal_period, start_minute_after_midnight, end_minute_after_midnight)
VALUES
    ('commons', 1, 'Breakfast', 420, 600),   -- 7:00 AM - 10:00 AM
    ('commons', 1, 'Lunch', 660, 840),       -- 11:00 AM - 2:00 PM
    ('commons', 1, 'Dinner', 990, 1260),     -- 4:30 PM - 9:00 PM
    ('knollcrest', 1, 'Brunch', 540, 840),   -- 9:00 AM - 2:00 PM
    ('knollcrest', 1, 'Dinner', 1020, 1200), -- 5:00 PM - 8:00 PM
    ('johnnys', 1, 'Open', 480, 960),        -- 8:00 AM - 4:00 PM
    ('peets', 1, 'Open', 450, 1320),         -- 7:30 AM - 10:00 PM
    ('uppercrust', 1, 'Open', 660, 1380)     -- 11:00 AM - 11:00 PM
ON CONFLICT DO NOTHING;

-- 4. Insert Core Campus Clubs
INSERT INTO clubs (id, name, category, mark, tagline, description, meeting_schedule, location, contact_email, leader_name, primary_color, secondary_color, sf_icon, md_icon, is_department)
VALUES
    ('calvin-university', 'Calvin University', 'Official', 'CU', 'Official university events, chapel services, lectures & community gatherings', 'Official campus events, daily chapel services, academic colloquia, arts performances, and university-wide gatherings.', 'Daily Chapel · 10:00 AM', 'Calvin Chapel', 'events@calvin.edu', 'Student Life', '#8C2131', '#E8B019', 'building.columns', 'account_balance', true),
    ('abstraction', 'Abstraction', 'Academics', 'AB', 'Calvin’s premier software & creative coding guild', 'A community of student developers building creative software projects, exploring algorithms, and participating in regional hackathons.', 'Wednesdays · 6:30 PM - 8:30 PM', 'North Hall 276 (CS Lab)', 'abstraction@calvin.edu', 'Sophia Chen (President)', '#0A2E36', '#14B8A6', 'chevron.left.forwardslash.chevron.right', 'code', false),
    ('acm', 'ACM Student Chapter', 'Academics', 'AC', 'Hack nights, coding challenges & tech projects', 'Calvin''s official student chapter of the Association for Computing Machinery. We host bi-weekly hack nights and tech talks.', 'Thursdays · 7:00 PM - 11:00 PM', 'North Hall 276', 'acm@calvin.edu', 'Sophia Chen', '#15514A', '#3FA08F', 'laptopcomputer', 'computer', false),
    ('calvin-theatre', 'Calvin Theatre Company', 'The Arts', 'CT', 'Student theatrical productions & performances', 'Dedicated to producing thought-provoking drama and comedy.', 'Rehearsals Mon/Wed/Fri', 'Gezon Auditorium', 'theatre@calvin.edu', 'David Kim', '#5C1D24', '#D48B30', 'theatermasks.fill', 'theater_comedy', false),
    ('knights-athletics', 'Knights Athletics', 'Athletics', 'KA', 'NCAA Division III varsity sports & student cheering section', 'Official home of the Calvin Knights.', 'Game schedules published weekly', 'Spoelhof Fieldhouse', 'athletics@calvin.edu', 'Coaching Staff', '#8C2131', '#E8B019', 'trophy.fill', 'emoji_events', true),
    ('student-activities', 'Student Activities Office', 'Social', 'SA', 'Campus traditions, concerts, and Airband', 'Fostering vibrant student life and traditions.', 'Van Noord Arena / Commons', 'Commons Union', 'activities@calvin.edu', 'SAO Staff', '#8C2131', '#F5CD00', 'sparkles', 'celebration', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Insert Prototype Test Student Persona (John Doe)
-- Insert corresponding auth.users row first so foreign key constraint succeeds
DO $$
BEGIN
    INSERT INTO auth.users (id, email)
    VALUES ('00000000-0000-0000-0000-000000000042', 'jmd42@calvin.edu')
    ON CONFLICT (id) DO NOTHING;
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Gracefully ignore if running in restricted environments
END $$;

INSERT INTO students (id, student_id, username, email, first_name, middle_name, last_name, class_year, standing, major, minor, card_number, residence, advisor, role, directory_opt_in, directory_prompted)
VALUES (
    '00000000-0000-0000-0000-000000000042',
    '2346052',
    'jmd42',
    'jmd42@calvin.edu',
    'John',
    'Mark',
    'Doe',
    2028,
    'Sophomore',
    'Computer Science',
    'Mathematics',
    '2346052',
    'Boer-Bennink Hall, Rm 214',
    'Dr. Naomi Vermeer',
    'student',
    false,
    false
) ON CONFLICT (id) DO NOTHING;

-- 6. Insert Test Student Dining Account
INSERT INTO student_dining_accounts (student_id, meal_plan_id, swipes_used, flex_meals_used, guest_passes_used, knight_bucks, dining_dollars)
VALUES (
    '00000000-0000-0000-0000-000000000042',
    'core14',
    7,
    1,
    0,
    30.00,
    18.50
) ON CONFLICT (student_id) DO NOTHING;

-- 7. Insert Test Claim Codes (Pre-hashed SHA-256 with salt 'knightly-claim-salt-v1' matching clubs-service.js)
-- Matches DEMO_CLAIM_CODE_ABSTRACTION: '2A6Q-MTK3-R9' -> '2A6QMTK3R9:knightly-claim-salt-v1'
INSERT INTO club_claim_codes (club_id, code_hash, formatted_preview, is_redeemed, expires_at)
VALUES
    ('abstraction', encode(digest('2A6QMTK3R9:knightly-claim-salt-v1', 'sha256'), 'hex'), '2A6Q-****-R9', false, NOW() + INTERVAL '1 year'),
    ('acm', encode(digest('9F2L8P4X6W:knightly-claim-salt-v1', 'sha256'), 'hex'), '9F2L-****-6W', false, NOW() + INTERVAL '1 year')
ON CONFLICT (code_hash) DO NOTHING;

-- 8. Insert Core Campus Safety Emergency Contacts
INSERT INTO campus_safety_contacts (id, name, detail, phone, urgent, sort_order)
VALUES
    ('dispatch', 'Campus Safety dispatch', 'Staffed 24/7, onsite in under three minutes', '6165263333', true, 1),
    ('emergency_911', 'Emergency (911)', 'Police, fire, and medical dispatch', '911', true, 2),
    ('non_emergency', 'Campus Safety non-emergency', 'Lockouts, parking, lost and found', '6165266452', false, 3),
    ('health_services', 'Health Services', 'On-campus clinic in Commons, Mon–Fri 8–5', '6165266187', false, 4),
    ('escort', 'Campus Safe Walk & Escort', 'Student or officer escort anywhere on campus', '6165266452', false, 5)
ON CONFLICT (id) DO NOTHING;
