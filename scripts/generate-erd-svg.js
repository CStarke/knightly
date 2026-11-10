const fs = require('fs');
const path = require('path');

/**
 * Knightly Relational Database ERD SVG Generator
 * Generates an ultra-crisp, production-grade vector Entity-Relationship Diagram
 * representing the streamlined PostgreSQL schema for Calvin University Knightly.
 */

const WIDTH = 2060;
const HEIGHT = 1320;

// Color Palette
const COLORS = {
  bg: '#0B0F19',
  bgCard: '#151D2E',
  bgCardHeader: '#1E293B',
  border: '#2A364F',
  borderHighlight: '#E8B019',
  maroon: '#8C2131',
  maroonDark: '#5C1420',
  maroonBright: '#A62B3D',
  gold: '#E8B019',
  goldSoft: '#F6D27E',
  textLight: '#F8FAFC',
  textMuted: '#94A3B8',
  textType: '#64748B',
  pkBadge: '#E8B019',
  fkBadge: '#38BDF8',
  ukBadge: '#A78BFA',
  lineColor: '#475569',
  lineActive: '#E8B019',
  lineDining: '#F59E0B',
  lineClubs: '#EC4899',
  linePosts: '#10B981',
};

// Tables Definition
const tables = [
  // COLUMN 1: Identity & Profiles
  {
    id: 'students',
    title: 'STUDENTS',
    subtitle: 'Core Student Identity & FERPA',
    badge: 'Core Identity',
    x: 60,
    y: 120,
    w: 350,
    headerColor: COLORS.maroon,
    columns: [
      { name: 'id', type: 'UUID', key: 'PK', desc: 'auth.users.id' },
      { name: 'student_id', type: 'VARCHAR(32)', key: 'UK', desc: 'e.g. 2346052' },
      { name: 'username', type: 'VARCHAR(64)', key: 'UK', desc: 'e.g. jmd42' },
      { name: 'email', type: 'VARCHAR(255)', key: 'UK', desc: 'institutional' },
      { name: 'first_name', type: 'VARCHAR(100)', key: '', desc: 'given name' },
      { name: 'middle_name', type: 'VARCHAR(100)', key: '', desc: 'optional' },
      { name: 'last_name', type: 'VARCHAR(100)', key: '', desc: 'surname' },
      { name: 'class_year', type: 'INT', key: '', desc: 'e.g. 2028' },
      { name: 'standing', type: 'VARCHAR(32)', key: '', desc: 'Freshman..Senior' },
      { name: 'major', type: 'VARCHAR(150)', key: '', desc: 'primary major' },
      { name: 'minor', type: 'VARCHAR(150)', key: '', desc: 'optional minor' },
      { name: 'card_number', type: 'VARCHAR(32)', key: '', desc: 'Knight Card ID' },
      { name: 'barcode', type: 'VARCHAR(48)', key: '', desc: '00000{id}00' },
      { name: 'role', type: 'VARCHAR(32)', key: '', desc: 'student|admin' },
      { name: 'directory_opt_in', type: 'BOOLEAN', key: '', desc: 'FERPA consent' },
      { name: 'directory_prompted', type: 'BOOLEAN', key: '', desc: 'popup seen' },
      { name: 'directory_visible_fields', type: 'JSONB', key: '', desc: 'email, phone' },
      { name: 'created_at', type: 'TIMESTAMPTZ', key: '', desc: 'timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', key: '', desc: 'timestamp' },
    ]
  },
  {
    id: 'directory_people',
    title: 'DIRECTORY_PEOPLE',
    subtitle: 'Campus-Wide Directory Lookup',
    badge: 'FERPA Protected',
    x: 60,
    y: 670,
    w: 350,
    headerColor: '#1E3A8A',
    columns: [
      { name: 'id', type: 'UUID', key: 'PK', desc: 'gen_random_uuid()' },
      { name: 'student_id', type: 'UUID', key: 'FK', desc: 'students.id (null)' },
      { name: 'first_name', type: 'VARCHAR(100)', key: '', desc: 'first name' },
      { name: 'last_name', type: 'VARCHAR(100)', key: '', desc: 'last name' },
      { name: 'role', type: 'VARCHAR(32)', key: '', desc: 'Faculty|Staff|Student' },
      { name: 'title', type: 'VARCHAR(150)', key: '', desc: 'title / major' },
      { name: 'department', type: 'VARCHAR(150)', key: '', desc: 'department' },
      { name: 'email', type: 'VARCHAR(255)', key: 'UK', desc: 'calvin email' },
      { name: 'phone', type: 'VARCHAR(32)', key: '', desc: 'office / contact' },
      { name: 'office_location', type: 'VARCHAR(150)', key: '', desc: 'hall & room' },
      { name: 'office_hours', type: 'VARCHAR(150)', key: '', desc: 'office hours' },
      { name: 'pronouns', type: 'VARCHAR(32)', key: '', desc: 'she/her etc' },
      { name: 'is_public_visible', type: 'BOOLEAN', key: '', desc: 'FERPA filtered' },
    ]
  },
  {
    id: 'saved_posts',
    title: 'SAVED_POSTS',
    subtitle: 'Private Student Bookmarks',
    badge: 'RLS Isolated',
    x: 60,
    y: 1080,
    w: 350,
    headerColor: '#0F766E',
    columns: [
      { name: 'student_id', type: 'UUID', key: 'PK, FK', desc: 'students.id' },
      { name: 'post_id', type: 'UUID', key: 'PK, FK', desc: 'posts.id' },
      { name: 'saved_at', type: 'TIMESTAMPTZ', key: '', desc: 'default NOW()' },
    ]
  },

  // COLUMN 2: Leadership, Follows & Posts
  {
    id: 'club_memberships',
    title: 'CLUB_MEMBERSHIPS',
    subtitle: 'Student Organization Officers',
    badge: 'Posting Auth',
    x: 460,
    y: 120,
    w: 340,
    headerColor: '#9D174D',
    columns: [
      { name: 'id', type: 'UUID', key: 'PK', desc: 'gen_random_uuid()' },
      { name: 'student_id', type: 'UUID', key: 'FK', desc: 'students.id' },
      { name: 'club_id', type: 'VARCHAR(64)', key: 'FK', desc: 'clubs.id' },
      { name: 'claim_code_id', type: 'UUID', key: 'FK', desc: 'club_claim_codes.id' },
      { name: 'granted_at', type: 'TIMESTAMPTZ', key: '', desc: 'default NOW()' },
    ]
  },
  {
    id: 'club_follows',
    title: 'CLUB_FOLLOWS',
    subtitle: 'Feed Content Subscriptions',
    badge: 'Personalized',
    x: 460,
    y: 320,
    w: 340,
    headerColor: '#831843',
    columns: [
      { name: 'student_id', type: 'UUID', key: 'PK, FK', desc: 'students.id' },
      { name: 'club_id', type: 'VARCHAR(64)', key: 'PK, FK', desc: 'clubs.id' },
      { name: 'followed_at', type: 'TIMESTAMPTZ', key: '', desc: 'default NOW()' },
    ]
  },
  {
    id: 'posts',
    title: 'POSTS',
    subtitle: 'Campus Announcements & Events',
    badge: 'Unified Feed',
    x: 460,
    y: 490,
    w: 340,
    headerColor: '#047857',
    columns: [
      { name: 'id', type: 'UUID', key: 'PK', desc: 'gen_random_uuid()' },
      { name: 'club_id', type: 'VARCHAR(64)', key: 'FK', desc: 'clubs.id (null)' },
      { name: 'author_student_id', type: 'UUID', key: 'FK', desc: 'students.id (null)' },
      { name: 'org_name', type: 'VARCHAR(150)', key: '', desc: 'sponsor name' },
      { name: 'mark', type: 'VARCHAR(8)', key: '', desc: 'monogram badge' },
      { name: 'headline', type: 'VARCHAR(255)', key: '', desc: 'event headline' },
      { name: 'body', type: 'TEXT', key: '', desc: 'flyer text / markdown' },
      { name: 'category', type: 'VARCHAR(64)', key: '', desc: '13 taxonomy' },
      { name: 'event_date', type: 'DATE', key: '', desc: 'calendar date' },
      { name: 'start_time', type: 'TIME', key: '', desc: 'start time' },
      { name: 'end_time', type: 'TIME', key: '', desc: 'end time' },
      { name: 'when_text', type: 'VARCHAR(150)', key: '', desc: 'preview string' },
      { name: 'where_text', type: 'VARCHAR(150)', key: '', desc: 'location' },
      { name: 'image_url', type: 'TEXT', key: '', desc: 'storage CDN URL' },
      { name: 'fallback_banner_svg', type: 'VARCHAR(64)', key: '', desc: 'preset banner' },
      { name: 'campus_wide', type: 'BOOLEAN', key: '', desc: 'broad reach' },
      { name: 'source', type: 'VARCHAR(32)', key: '', desc: 'club|drupal|admin' },
      { name: 'external_event_id', type: 'VARCHAR(255)', key: 'UK', desc: 'drupal sync hash' },
      { name: 'status', type: 'VARCHAR(32)', key: '', desc: 'published|draft' },
      { name: 'posted_at', type: 'TIMESTAMPTZ', key: '', desc: 'server author' },
      { name: 'created_at_ms', type: 'BIGINT', key: '', desc: 'epoch millis' },
    ]
  },
  {
    id: 'campus_safety_alerts',
    title: 'CAMPUS_SAFETY_ALERTS',
    subtitle: 'Emergency Alerts & Advisories',
    badge: 'Broadcast',
    x: 460,
    y: 1070,
    w: 340,
    headerColor: '#B91C1C',
    columns: [
      { name: 'id', type: 'UUID', key: 'PK', desc: 'gen_random_uuid()' },
      { name: 'severity', type: 'VARCHAR(32)', key: '', desc: 'critical|warning' },
      { name: 'title', type: 'VARCHAR(255)', key: '', desc: 'alert title' },
      { name: 'detail', type: 'TEXT', key: '', desc: 'instructions' },
      { name: 'area', type: 'VARCHAR(100)', key: '', desc: 'affected zone' },
      { name: 'is_active', type: 'BOOLEAN', key: '', desc: 'live broadcast' },
      { name: 'created_at', type: 'TIMESTAMPTZ', key: '', desc: 'timestamp' },
      { name: 'expires_at', type: 'TIMESTAMPTZ', key: '', desc: 'auto-dismiss' },
    ]
  },

  // COLUMN 3: Clubs & Safety Contacts
  {
    id: 'clubs',
    title: 'CLUBS',
    subtitle: 'Registered Organizations & Depts',
    badge: 'Taxonomy',
    x: 850,
    y: 120,
    w: 350,
    headerColor: COLORS.maroonDark,
    columns: [
      { name: 'id', type: 'VARCHAR(64)', key: 'PK', desc: 'slug (e.g. acm)' },
      { name: 'name', type: 'VARCHAR(150)', key: '', desc: 'official name' },
      { name: 'category', type: 'VARCHAR(64)', key: '', desc: '13 taxonomy' },
      { name: 'mark', type: 'VARCHAR(8)', key: '', desc: 'monogram' },
      { name: 'description', type: 'TEXT', key: '', desc: 'mission details' },
      { name: 'meeting_schedule', type: 'VARCHAR(150)', key: '', desc: 'cadence' },
      { name: 'location', type: 'VARCHAR(150)', key: '', desc: 'room / hall' },
      { name: 'contact_email', type: 'VARCHAR(255)', key: '', desc: 'contact email' },
      { name: 'leader_name', type: 'VARCHAR(150)', key: '', desc: 'primary officer' },
      { name: 'primary_color', type: 'VARCHAR(16)', key: '', desc: 'brand hex' },
      { name: 'secondary_color', type: 'VARCHAR(16)', key: '', desc: 'accent hex' },
      { name: 'sf_icon', type: 'VARCHAR(64)', key: '', desc: 'SF Symbol' },
      { name: 'md_icon', type: 'VARCHAR(64)', key: '', desc: 'Material Icon' },
      { name: 'image_url', type: 'TEXT', key: '', desc: 'avatar / flyer' },
      { name: 'is_department', type: 'BOOLEAN', key: '', desc: 'dept vs club' },
      { name: 'follower_count', type: 'INT', key: '', desc: 'admin suppressed' },
      { name: 'created_at', type: 'TIMESTAMPTZ', key: '', desc: 'timestamp' },
    ]
  },
  {
    id: 'club_claim_codes',
    title: 'CLUB_CLAIM_CODES',
    subtitle: 'Salted SHA-256 Claim Codes',
    badge: 'Security Vault',
    x: 850,
    y: 610,
    w: 350,
    headerColor: '#431407',
    columns: [
      { name: 'id', type: 'UUID', key: 'PK', desc: 'gen_random_uuid()' },
      { name: 'club_id', type: 'VARCHAR(64)', key: 'FK', desc: 'clubs.id' },
      { name: 'code_hash', type: 'VARCHAR(128)', key: 'UK', desc: 'salted SHA-256' },
      { name: 'formatted_preview', type: 'VARCHAR(16)', key: '', desc: 'XXXX-****-**' },
      { name: 'is_redeemed', type: 'BOOLEAN', key: '', desc: 'single-use flag' },
      { name: 'redeemed_by_student_id', type: 'UUID', key: 'FK', desc: 'students.id' },
      { name: 'redeemed_at', type: 'TIMESTAMPTZ', key: '', desc: 'timestamp' },
      { name: 'expires_at', type: 'TIMESTAMPTZ', key: '', desc: 'expiry limit' },
      { name: 'created_at', type: 'TIMESTAMPTZ', key: '', desc: 'timestamp' },
    ]
  },
  {
    id: 'campus_safety_contacts',
    title: 'CAMPUS_SAFETY_CONTACTS',
    subtitle: 'Emergency Quick-Dial Directory',
    badge: 'Rapid Response',
    x: 850,
    y: 950,
    w: 350,
    headerColor: '#7F1D1D',
    columns: [
      { name: 'id', type: 'VARCHAR(64)', key: 'PK', desc: 'dispatch, emergency' },
      { name: 'name', type: 'VARCHAR(100)', key: '', desc: 'contact title' },
      { name: 'detail', type: 'VARCHAR(150)', key: '', desc: 'availability' },
      { name: 'phone', type: 'VARCHAR(32)', key: '', desc: 'phone dialer' },
      { name: 'urgent', type: 'BOOLEAN', key: '', desc: '911 / emergency' },
      { name: 'sort_order', type: 'INT', key: '', desc: 'display priority' },
    ]
  },

  // COLUMN 4: Dining Engine & Transactions
  {
    id: 'meal_plans',
    title: 'MEAL_PLANS',
    subtitle: 'Calvin Meal Plan Archetypes',
    badge: 'Archetypes',
    x: 1250,
    y: 120,
    w: 350,
    headerColor: '#B45309',
    columns: [
      { name: 'id', type: 'VARCHAR(32)', key: 'PK', desc: 'core21..joust30' },
      { name: 'name', type: 'VARCHAR(100)', key: '', desc: 'Core 14 etc' },
      { name: 'cadence', type: 'VARCHAR(32)', key: '', desc: 'weekly|semester' },
      { name: 'swipes_total', type: 'INT', key: '', desc: 'period allotment' },
      { name: 'flex_meals', type: 'INT', key: '', desc: 'per week' },
      { name: 'guest_passes', type: 'INT', key: '', desc: 'per semester' },
      { name: 'bundled_knight_bucks', type: 'NUMERIC(8,2)', key: '', desc: 'credit balance' },
      { name: 'week_resets_on', type: 'VARCHAR(32)', key: '', desc: 'Sunday midnight' },
      { name: 'description', type: 'TEXT', key: '', desc: 'overview' },
    ]
  },
  {
    id: 'student_dining_accounts',
    title: 'STUDENT_DINING_ACCOUNTS',
    subtitle: 'Real-Time Balances & Tender',
    badge: 'Atomic Trigger',
    x: 1250,
    y: 420,
    w: 350,
    headerColor: '#D97706',
    columns: [
      { name: 'student_id', type: 'UUID', key: 'PK, FK', desc: 'students.id' },
      { name: 'meal_plan_id', type: 'VARCHAR(32)', key: 'FK', desc: 'meal_plans.id' },
      { name: 'swipes_used', type: 'INT', key: '', desc: 'cycle counter' },
      { name: 'flex_meals_used', type: 'INT', key: '', desc: 'weekly counter' },
      { name: 'guest_passes_used', type: 'INT', key: '', desc: 'semester counter' },
      { name: 'knight_bucks', type: 'NUMERIC(8,2)', key: '', desc: 'stored balance' },
      { name: 'dining_dollars', type: 'NUMERIC(8,2)', key: '', desc: 'stored balance' },
      { name: 'external_transact_id', type: 'VARCHAR(64)', key: '', desc: 'legacy sync ID' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', key: '', desc: 'auto-updated' },
    ]
  },
  {
    id: 'dining_transactions',
    title: 'DINING_TRANSACTIONS',
    subtitle: 'Event-Sourced Immutable Ledger',
    badge: 'Ledger Audit',
    x: 1250,
    y: 740,
    w: 350,
    headerColor: '#78350F',
    columns: [
      { name: 'id', type: 'UUID', key: 'PK', desc: 'gen_random_uuid()' },
      { name: 'student_id', type: 'UUID', key: 'FK', desc: 'students.id' },
      { name: 'venue_id', type: 'VARCHAR(32)', key: 'FK', desc: 'dining_venues.id' },
      { name: 'transaction_type', type: 'VARCHAR(32)', key: '', desc: 'meal_swipe|tender' },
      { name: 'amount', type: 'NUMERIC(8,2)', key: '', desc: 'deduction amount' },
      { name: 'register_id', type: 'VARCHAR(64)', key: '', desc: 'terminal / turnstile' },
      { name: 'cashier_id', type: 'VARCHAR(64)', key: '', desc: 'staff / kiosk' },
      { name: 'description', type: 'VARCHAR(255)', key: '', desc: 'receipt memo' },
      { name: 'external_transact_ref', type: 'VARCHAR(128)', key: '', desc: 'transact receipt' },
      { name: 'created_at', type: 'TIMESTAMPTZ', key: '', desc: 'timestamp' },
    ]
  },

  // COLUMN 5: Venues & Hours
  {
    id: 'dining_venues',
    title: 'DINING_VENUES',
    subtitle: 'Campus Dining Facilities',
    badge: 'Locations',
    x: 1650,
    y: 420,
    w: 340,
    headerColor: '#0369A1',
    columns: [
      { name: 'id', type: 'VARCHAR(32)', key: 'PK', desc: 'commons, peets, etc' },
      { name: 'name', type: 'VARCHAR(100)', key: '', desc: 'facility name' },
      { name: 'location', type: 'VARCHAR(150)', key: '', desc: 'campus building' },
      { name: 'description', type: 'TEXT', key: '', desc: 'venue overview' },
      { name: 'accepts_swipes', type: 'BOOLEAN', key: '', desc: 'swipe turnstile' },
    ]
  },
  {
    id: 'dining_hours',
    title: 'DINING_HOURS',
    subtitle: 'Operating Schedules & Periods',
    badge: 'Real-Time State',
    x: 1650,
    y: 670,
    w: 340,
    headerColor: '#0284C7',
    columns: [
      { name: 'id', type: 'UUID', key: 'PK', desc: 'gen_random_uuid()' },
      { name: 'venue_id', type: 'VARCHAR(32)', key: 'FK', desc: 'dining_venues.id' },
      { name: 'day_of_week', type: 'INT', key: '', desc: '0=Sun .. 6=Sat' },
      { name: 'meal_period', type: 'VARCHAR(64)', key: '', desc: 'Breakfast, Lunch, Dinner' },
      { name: 'start_minute_after_midnight', type: 'INT', key: '', desc: 'e.g. 420 (7am)' },
      { name: 'end_minute_after_midnight', type: 'INT', key: '', desc: 'e.g. 1260 (9pm)' },
    ]
  },
];

// Relationships Definition for Path Drawing
const relations = [
  // Students -> Directory People (1 : 0..1)
  { from: 'students', to: 'directory_people', fromSide: 'bottom', toSide: 'top', label: 'lists in (FERPA)' },
  // Students -> Saved Posts (1 : N)
  { from: 'students', to: 'saved_posts', fromSide: 'bottom', toSide: 'top', label: 'bookmarks' },
  // Students -> Club Memberships (1 : N)
  { from: 'students', to: 'club_memberships', fromSide: 'right', toSide: 'left', label: 'leads' },
  // Students -> Club Follows (1 : N)
  { from: 'students', to: 'club_follows', fromSide: 'right', toSide: 'left', label: 'follows' },
  // Students -> Dining Accounts (1 : 1)
  { from: 'students', to: 'student_dining_accounts', fromSide: 'right', toSide: 'left', label: 'has dining' },
  // Students -> Posts (1 : N author)
  { from: 'students', to: 'posts', fromSide: 'right', toSide: 'left', label: 'authors' },
  // Students -> Dining Transactions (1 : N)
  { from: 'students', to: 'dining_transactions', fromSide: 'right', toSide: 'left', label: 'conducts' },

  // Clubs -> Club Memberships (1 : N)
  { from: 'clubs', to: 'club_memberships', fromSide: 'left', toSide: 'right', label: 'officers' },
  // Clubs -> Club Follows (1 : N)
  { from: 'clubs', to: 'club_follows', fromSide: 'left', toSide: 'right', label: 'followers' },
  // Clubs -> Posts (1 : N)
  { from: 'clubs', to: 'posts', fromSide: 'left', toSide: 'right', label: 'publishes' },
  // Clubs -> Club Claim Codes (1 : N)
  { from: 'clubs', to: 'club_claim_codes', fromSide: 'bottom', toSide: 'top', label: 'issues' },

  // Meal Plans -> Student Dining Accounts (1 : N)
  { from: 'meal_plans', to: 'student_dining_accounts', fromSide: 'bottom', toSide: 'top', label: 'assigned to' },

  // Dining Venues -> Dining Hours (1 : N)
  { from: 'dining_venues', to: 'dining_hours', fromSide: 'bottom', toSide: 'top', label: 'operates' },
  // Dining Venues -> Dining Transactions (1 : N)
  { from: 'dining_venues', to: 'dining_transactions', fromSide: 'left', toSide: 'right', label: 'processes' },

  // Posts -> Saved Posts (1 : N)
  { from: 'posts', to: 'saved_posts', fromSide: 'left', toSide: 'right', label: 'saved in' },
];

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateSvg() {
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif">
  <defs>
    <!-- Grid Pattern Background -->
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E293B" stroke-width="0.7" opacity="0.4" />
    </pattern>

    <!-- Card Shadow -->
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.5" />
    </filter>

    <!-- Header Gradient -->
    <linearGradient id="headerGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#8C2131" />
      <stop offset="50%" stop-color="#5C1420" />
      <stop offset="100%" stop-color="#1E293B" />
    </linearGradient>

    <!-- Gold Accent Gradient -->
    <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#E8B019" />
      <stop offset="100%" stop-color="#F6D27E" />
    </linearGradient>

    <!-- Line Arrow Markers -->
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 9 5 L 0 9 z" fill="#E8B019" />
    </marker>
    <marker id="circle" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6">
      <circle cx="5" cy="5" r="3" fill="#38BDF8" stroke="#151D2E" stroke-width="1.5" />
    </marker>
  </defs>

  <!-- Canvas Background -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${COLORS.bg}" />
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#grid)" />

  <!-- Title & Metadata Banner -->
  <g transform="translate(60, 40)">
    <!-- Brand Mark Monogram -->
    <rect x="0" y="0" width="56" height="56" rx="14" fill="url(#headerGrad)" stroke="#E8B019" stroke-width="2" />
    <text x="28" y="36" fill="#F8FAFC" font-size="24" font-weight="800" text-anchor="middle">KN</text>

    <!-- System Headline -->
    <text x="72" y="24" fill="#F8FAFC" font-size="22" font-weight="700" letter-spacing="-0.3">Knightly &#x2014; Calvin University Campus Platform</text>
    <text x="72" y="46" fill="#94A3B8" font-size="13" font-weight="500">Relational Database Entity-Relationship Diagram (ERD) &#x2022; PostgreSQL 15+ / Supabase Schema Specification</text>

    <!-- Metadata Badges -->
    <g transform="translate(1420, 10)">
      <rect x="0" y="0" width="130" height="28" rx="6" fill="#1E293B" stroke="#334155" stroke-width="1" />
      <circle cx="14" cy="14" r="4" fill="#10B981" />
      <text x="26" y="18" fill="#F8FAFC" font-size="11" font-weight="600">15 Relational Tables</text>

      <rect x="140" y="0" width="120" height="28" rx="6" fill="#1E293B" stroke="#334155" stroke-width="1" />
      <circle cx="154" cy="14" r="4" fill="#38BDF8" />
      <text x="166" y="18" fill="#F8FAFC" font-size="11" font-weight="600">Row-Level Security</text>

      <rect x="270" y="0" width="150" height="28" rx="6" fill="#1E293B" stroke="#334155" stroke-width="1" />
      <circle cx="284" cy="14" r="4" fill="#E8B019" />
      <text x="296" y="18" fill="#F8FAFC" font-size="11" font-weight="600">Entra ID Synchronized</text>
    </g>
  </g>
`;

  // Draw Relationships (Connector lines behind tables)
  svg += `\n  <!-- RELATIONAL CONNECTORS -->\n  <g opacity="0.85">\n`;

  // Pre-calculate table center points
  const tableMap = {};
  for (const t of tables) {
    const colCount = t.columns.length;
    const h = 54 + colCount * 22 + 10;
    tableMap[t.id] = {
      ...t,
      h,
      cx: t.x + t.w / 2,
      cy: t.y + h / 2,
      top: { x: t.x + t.w / 2, y: t.y },
      bottom: { x: t.x + t.w / 2, y: t.y + h },
      left: { x: t.x, y: t.y + h / 2 },
      right: { x: t.x + t.w, y: t.y + h / 2 },
    };
  }

  // Draw connector lines
  for (const rel of relations) {
    const src = tableMap[rel.from];
    const dst = tableMap[rel.to];
    if (!src || !dst) continue;

    const p1 = src[rel.fromSide];
    const p2 = dst[rel.toSide];

    // Orthogonal bezier or stepped path
    let d = '';
    if (rel.fromSide === 'right' && rel.toSide === 'left') {
      const midX = (p1.x + p2.x) / 2;
      d = `M ${p1.x} ${p1.y} C ${midX} ${p1.y}, ${midX} ${p2.y}, ${p2.x} ${p2.y}`;
    } else if (rel.fromSide === 'bottom' && rel.toSide === 'top') {
      const midY = (p1.y + p2.y) / 2;
      d = `M ${p1.x} ${p1.y} C ${p1.x} ${midY}, ${p2.x} ${midY}, ${p2.x} ${p2.y}`;
    } else if (rel.fromSide === 'left' && rel.toSide === 'right') {
      const midX = (p1.x + p2.x) / 2;
      d = `M ${p1.x} ${p1.y} C ${midX} ${p1.y}, ${midX} ${p2.y}, ${p2.x} ${p2.y}`;
    } else {
      d = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
    }

    svg += `    <path d="${d}" fill="none" stroke="${COLORS.borderHighlight}" stroke-width="1.8" stroke-dasharray="4,4" marker-end="url(#arrow)" marker-start="url(#circle)" opacity="0.65" />\n`;
  }
  svg += `  </g>\n`;

  // Draw Tables
  svg += `\n  <!-- RELATIONAL ENTITY TABLES -->\n`;
  for (const t of tables) {
    const colCount = t.columns.length;
    const rowH = 22;
    const bodyH = colCount * rowH + 10;
    const totalH = 54 + bodyH;

    svg += `  <!-- Table: ${t.id} -->\n`;
    svg += `  <g transform="translate(${t.x}, ${t.y})" filter="url(#cardShadow)">\n`;

    // Outer card container
    svg += `    <rect width="${t.w}" height="${totalH}" rx="10" fill="${COLORS.bgCard}" stroke="${COLORS.border}" stroke-width="1.5" />\n`;

    // Header container
    svg += `    <path d="M 0 10 Q 0 0 10 0 L ${t.w - 10} 0 Q ${t.w} 0 ${t.w} 10 L ${t.w} 52 L 0 52 Z" fill="${t.headerColor}" />\n`;

    // Header border highlight
    svg += `    <line x1="0" y1="52" x2="${t.w}" y2="52" stroke="${COLORS.border}" stroke-width="1" />\n`;

    // Header title & subtitle
    svg += `    <text x="16" y="24" fill="${COLORS.textLight}" font-size="14" font-weight="800" letter-spacing="0.5">${escapeXml(t.title)}</text>\n`;
    svg += `    <text x="16" y="42" fill="#E2E8F0" font-size="11" font-weight="500" opacity="0.85">${escapeXml(t.subtitle)}</text>\n`;

    // Header category badge
    const badgeW = t.badge.length * 6.5 + 16;
    svg += `    <rect x="${t.w - badgeW - 14}" y="14" width="${badgeW}" height="20" rx="4" fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.2)" stroke-width="1" />\n`;
    svg += `    <text x="${t.w - 14 - badgeW / 2}" y="28" fill="#F8FAFC" font-size="9.5" font-weight="700" text-anchor="middle">${escapeXml(t.badge)}</text>\n`;

    // Column rows
    t.columns.forEach((col, idx) => {
      const rowY = 54 + idx * rowH;
      const textY = rowY + 16;
      const isEven = idx % 2 === 0;

      // Subtle row striping
      if (isEven) {
        svg += `    <rect x="1" y="${rowY}" width="${t.w - 2}" height="${rowH}" fill="rgba(255,255,255,0.015)" />\n`;
      }

      // Key Badge (PK / FK / UK)
      if (col.key) {
        let badgeColor = COLORS.pkBadge;
        let badgeText = col.key;
        if (col.key.includes('FK') && !col.key.includes('PK')) badgeColor = COLORS.fkBadge;
        if (col.key.includes('UK')) badgeColor = COLORS.ukBadge;

        svg += `    <rect x="12" y="${rowY + 4}" width="26" height="14" rx="3" fill="${badgeColor}" opacity="0.18" />\n`;
        svg += `    <text x="25" y="${rowY + 14.5}" fill="${badgeColor}" font-size="8.5" font-weight="800" text-anchor="middle">${escapeXml(badgeText)}</text>\n`;
      }

      // Column Name
      const colX = col.key ? 44 : 20;
      const isPk = col.key.includes('PK');
      const fontColor = isPk ? COLORS.goldSoft : COLORS.textLight;
      const fontWeight = isPk ? '700' : '500';
      svg += `    <text x="${colX}" y="${textY}" fill="${fontColor}" font-size="11" font-weight="${fontWeight}">${escapeXml(col.name)}</text>\n`;

      // Column Data Type
      svg += `    <text x="${t.w - 16}" y="${textY}" fill="${COLORS.textType}" font-size="9.5" font-family="'JetBrains Mono', Consolas, Monaco, monospace" font-weight="400" text-anchor="end">${escapeXml(col.type)}</text>\n`;
    });

    svg += `  </g>\n\n`;
  }

  // Legend at bottom
  svg += `  <!-- DIAGRAM LEGEND -->\n`;
  svg += `  <g transform="translate(60, ${HEIGHT - 55})">\n`;
  svg += `    <rect x="0" y="0" width="${WIDTH - 120}" height="40" rx="8" fill="#151D2E" stroke="#2A364F" stroke-width="1" />\n`;

  // Legend items
  svg += `    <g transform="translate(24, 14)">\n`;
  // PK
  svg += `      <rect x="0" y="0" width="26" height="14" rx="3" fill="${COLORS.pkBadge}" opacity="0.25" />\n`;
  svg += `      <text x="13" y="10.5" fill="${COLORS.pkBadge}" font-size="8.5" font-weight="800" text-anchor="middle">PK</text>\n`;
  svg += `      <text x="34" y="11" fill="${COLORS.textLight}" font-size="11" font-weight="500">Primary Key</text>\n`;

  // FK
  svg += `      <rect x="130" y="0" width="26" height="14" rx="3" fill="${COLORS.fkBadge}" opacity="0.25" />\n`;
  svg += `      <text x="143" y="10.5" fill="${COLORS.fkBadge}" font-size="8.5" font-weight="800" text-anchor="middle">FK</text>\n`;
  svg += `      <text x="164" y="11" fill="${COLORS.textLight}" font-size="11" font-weight="500">Foreign Key</text>\n`;

  // UK
  svg += `      <rect x="260" y="0" width="26" height="14" rx="3" fill="${COLORS.ukBadge}" opacity="0.25" />\n`;
  svg += `      <text x="273" y="10.5" fill="${COLORS.ukBadge}" font-size="8.5" font-weight="800" text-anchor="middle">UK</text>\n`;
  svg += `      <text x="294" y="11" fill="${COLORS.textLight}" font-size="11" font-weight="500">Unique Constraint</text>\n`;

  // Relations
  svg += `      <line x1="430" y1="7" x2="480" y2="7" stroke="${COLORS.borderHighlight}" stroke-width="2" stroke-dasharray="4,4" />\n`;
  svg += `      <circle cx="430" cy="7" r="3" fill="${COLORS.fkBadge}" />\n`;
  svg += `      <polygon points="480,4 486,7 480,10" fill="${COLORS.borderHighlight}" />\n`;
  svg += `      <text x="496" y="11" fill="${COLORS.textLight}" font-size="11" font-weight="500">1-to-Many Relational Foreign Key</text>\n`;

  // Invariants Note
  svg += `      <text x="1000" y="11" fill="${COLORS.textMuted}" font-size="11" font-weight="400">Streamlined Schema &#x2022; Academic Bloat &amp; Audit Logs Removed &#x2022; Dining Menus Consolidated &#x2022; FERPA Enforced</text>\n`;
  svg += `    </g>\n`;
  svg += `  </g>\n`;

  svg += `</svg>\n`;
  return svg;
}

const outputPath = path.join(__dirname, '..', 'docs', 'DATABASE_ERD.svg');
const svgContent = generateSvg();
fs.writeFileSync(outputPath, svgContent, 'utf8');
console.log(`Generated ERD SVG at ${outputPath} (${svgContent.length} bytes)`);
