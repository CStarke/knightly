# Knightly System Architecture & Technical Specification

This document provides a comprehensive architectural breakdown of the Knightly application. It is designed to give software engineers and AI coding assistants complete system knowledge without requiring past conversation history.

---

## 1. High-Level System Architecture

Knightly is a mobile-first student campus life, announcements, and community super-app built specifically for **Calvin University**.

```mermaid
flowchart TD
    subgraph External Sources
        CalvinWeb["Calvin University Events (calvin.edu/events/all)"]
    end

    subgraph Backend Service (server/)
        Scraper["Event Scraper Service (services/event-scraper.js)"]
        Classifier["Category Mapper (services/category-mapper.js)"]
        Fingerprinter["Image Fingerprinter (services/image-fingerprint.js)"]
        Express["Express REST API (server.js - :3000)"]
        Supabase[("Supabase / PostgreSQL DB")]
    end

    subgraph Client Application (client/)
        EventsAPI["Events Client Service (services/events-api.ts)"]
        SeedFallback[("Offline Seed Snapshot (data/calvin-events-seed.ts)")]
        Adapter["Event to Post Adapter (utils/calvin-event-adapter.ts)"]
        FeedCtx["Feed Context Provider (context/feed-context.tsx)"]
        UI["Expo Router UI Screens & Tabs (app/)"]
    end

    CalvinWeb -->|Scrapes HTML| Scraper
    Scraper -->|Classifies| Classifier
    Scraper -->|Fingerprints Placeholders| Fingerprinter
    Scraper --> Express
    Supabase <--> Express
    Express -->|GET /api/events| EventsAPI
    SeedFallback -.->|Offline Fallback (SC2)| EventsAPI
    EventsAPI --> Adapter
    Adapter --> FeedCtx
    FeedCtx --> UI
```

---

## 2. Directory Anatomy & Responsibilities

```
Knightly/
├── client/                          # Frontend Expo / React Native project
│   ├── src/
│   │   ├── app/                     # File-based routing (Expo Router SDK 57)
│   │   │   ├── (tabs)/              # Persistent bottom tab screens (Home, Feed, Post, Profile)
│   │   │   ├── clubs/               # Club directory and subpages
│   │   │   └── +native-intent.tsx   # Android native intent filter (prevents activity drop to /)
│   │   ├── components/              # Modular UI components
│   │   │   ├── ui/                  # Primitives (FieldLabel, ModalDialog, Starfield, Screen)
│   │   │   ├── post-card.tsx        # Feed post renderer (photo vs simple banner compositing)
│   │   │   ├── post-date-time-section.tsx # Date & dual time range picker controls
│   │   │   ├── masked-time-input.tsx# Masked 12-hour clock input with AM/PM auto-sync
│   │   │   └── app-tabs.tsx         # Tab pager with 3D starfield continuous canvas
│   │   ├── constants/               # System invariants & design tokens
│   │   │   ├── theme.ts             # Calvin Maroon/Gold, light/dark semantic tokens, spacing
│   │   │   ├── preset-banners.ts    # 16 Colors x 16 Patterns = 256 simple banner combinations
│   │   │   ├── starfield.ts         # Parallax starfield area density (per 10k px²) and PRNG
│   │   │   └── version.ts           # Semantic version string (APP_VERSION)
│   │   ├── context/                 # Application state providers
│   │   │   ├── feed-context.tsx     # Feed announcements, reactions, and filter state
│   │   │   └── starfield-context.tsx# Continuous horizontal/vertical parallax scroll shared values
│   │   ├── data/                    # Static seed datasets and mock databases
│   │   │   ├── feed.ts              # Feed categories, post types, initial seed posts
│   │   │   ├── clubs.ts             # Calvin registered clubs and organizations
│   │   │   ├── student.ts           # Student profile, meal plan, and barcode mocks
│   │   │   └── calvin-events-seed.ts# Isolated offline campus events snapshot (Sprint 1 SC2)
│   │   ├── services/                # Backend API connectors
│   │   │   └── events-api.ts        # Live REST API client with zero-crash seed fallback
│   │   └── utils/                   # Pure helper functions
│   │       ├── calvin-event-adapter.ts # Converts scraped events to Knightly Post models
│   │       ├── image-fingerprint.ts # Client placeholder detection & banner resolution
│   │       └── date-format.ts       # DateUtils & TimeUtils (12-hour parsing, range validation)
│   └── tests/                       # Automated client test suites (Node test runner + tsx)
├── server/                          # Backend Node.js / Express microservice
│   ├── services/
│   │   ├── event-scraper.js         # calvin.edu/events/all crawler with TTL cache
│   │   ├── category-mapper.js       # Heuristic category classifier (100% classification guarantee)
│   │   └── image-fingerprint.js     # Cryptographic SHA-256 placeholder image fingerprinter
│   ├── scripts/
│   │   └── sync-calvin-events.js    # CLI sync utility: updates client/src/data/calvin-events-seed.ts
│   ├── __tests__/                   # Automated server tests (node:test)
│   └── server.js                    # Express app with endpoints (/health, /api/events, /api/student)
└── docs/                            # Documentation, design specs, and sprint rubrics
```

---

## 3. Core Domain Invariants & Business Logic

Every AI agent and contributor must honor these standard architectural guidelines:

### 3.1 Feed Category Taxonomy
Knightly features a 13-category campus taxonomy:
1. `Faith` (chapel, LOFT, campus ministries, Bible studies)
2. `Academics` (seminars, lectures, colloquia, advising)
3. `Athletics` (varsity and intramural sports matches, tournaments)
4. `Music` (choir festivals, orchestra, student seminars, band concerts)
5. `The Arts` (theatre, dance, gallery openings, film festivals)
6. `Career` (internships, job fairs, resume workshops)
7. `Outdoors` (hiking, stewardship workdays, nature preserve)
8. `Service` (volunteering, community outreach, food drives)
9. `Wellness` (mental health, counseling, fitness workshops)
10. `Social` (cookouts, game nights, residence hall parties)
11. `Culture` (international student events, cultural symposiums)
12. `Official` (university administration, governance, safety alerts)
13. `Gaming` (esports, tabletop, LAN parties)

### 3.2 Placeholder Fingerprinting & Same-Filename Immunity
- **Context**: When Calvin's Drupal calendar publishes events without photos, it attaches generic category line-art icons (`athletics.png`, `learning-academics.png`, `faith-worship.png`, `campus-life.png`, `arts-culture.png`).
- **Replacement**: Knightly detects these placeholders and replaces them with clean vector Simple Banners matching the event's category.
- **Immunity Invariant**: If a student or department uploads a genuine custom flyer that happens to be named `athletics.png`, **it must NOT be replaced**. Detection relies on:
  1. The exact canonical Drupal system path (`/sites/default/files/2025-10/{name}.png`).
  2. The cryptographic SHA-256 checksum of the binary payload (e.g. `f8cecb98...` for athletics).
- *Implementation*: `server/services/image-fingerprint.js` and `client/src/utils/image-fingerprint.ts`.

### 3.3 Collegiate Simple Banners (16 Colors × 16 Patterns)
- **Architecture**: `PostCard` composites banners using two layers:
  1. A solid background color layer (from 16 collegiate colors, e.g. Maroon, Gold, Navy, Forest, Plum).
  2. An SVG vector pattern overlay (from 16 patterns, e.g. Stripes, Diamonds, Arches, Waves, Circuit) tinted with a companion accent color.
- **Pure React Native SVG Rule**: All SVGs must use direct path and shape tags (`<path>`, `<rect>`, `<circle>`, `<polygon>`). **Strictly NO `<defs>` or `<use>` tags** (which cause blackouts or crashes on native mobile GPU engines).
- *Implementation*: `client/src/constants/preset-banners.ts` and `client/src/components/post-card.tsx`.

### 3.4 Parallax Starfield Standard Area Density
- **Density Formula**: Rather than calibrating to a single phone screen size (e.g. Pixel 9a), starfield density is defined as **1.3 stars per 10,000 px²** (`STAR_DENSITY_UNIT_AREA_PX = 10_000`).
- **5:3:1 Astrophotography Ratio**: Star counts strictly maintain the ratio of 5 distant : 3 midground : 1 foreground across all devices.
- **Performance Cap**: Total star count is capped at 1,800 stars to protect 60/120fps UI thread execution on massive multi-monitor desktop setups.
- *Implementation*: `client/src/constants/starfield.ts` and `client/src/components/ui/starfield.tsx`.

### 3.5 Event Scheduling & Time Ranges
- **Inputs**: Supports optional Start Time and optional End Time.
- **Validation Rules**:
  - All time fields are optional.
  - An event can have a date without a time, or a start time without an end time.
  - An event cannot have a time without a date.
  - End time must be chronologically after start time (overnight events spanning midnight are permitted).
- *Implementation*: `client/src/utils/date-format.ts` (`TimeUtils`) and `client/src/components/post-date-time-section.tsx`.

### 3.6 Server-Authoritative Timestamps
- **Rule**: When posts are published (`POST /api/posts`), the creation timestamp (`postedAt` ISO 8601 string and `createdAt` UTC epoch ms) must be assigned by the server clock, never accepted from the client request body.
- *Rationale*: Clock manipulation immunity—prevents students from changing device clocks to manipulate feed order.

### 3.7 UI Template System & Cross-Cutting Feature Inheritance
- **Rule**: When implementing a feature intended to operate across every modal, screen, or club view (e.g. software keyboard avoidance/elevation, edge-to-edge status/navigation bar translucency, accessible backdrop dismissals, card boundaries), it **must be implemented once at the template level** (`client/src/components/ui/modal-dialog.tsx`, `client/src/components/ui/screen.tsx`).
- **Inheritance by Default**: Leaf components (`SuccessModal`, `DatePickerModal`, `ClaimClubModal`, `LocationInfoModal`, etc.) inherit template capabilities automatically (`avoidKeyboard = true` by default) with zero duplicate code.
- **Prohibitions**: Never write ad-hoc keyboard listeners, manual elevation translateY state, custom `<Modal>` wrappers, or duplicated backdrops across individual modal screens.

---

## 4. Verification & Testing Playbook

Knightly utilizes Node's built-in native test runner for ultra-fast, zero-dependency testing.

```bash
# 1. Run Client Unit & Invariant Test Suite (~1.5s)
npm --prefix client test

# 2. Run Server Scraper & API Test Suite (~400ms)
npm --prefix server test

# 3. Verify TypeScript Compilation (Strict Mode, 0 Errors)
npx --prefix client tsc --noEmit

# 4. Sync Live Calvin Events to Offline Seed Snapshot
node server/scripts/sync-calvin-events.js
```
