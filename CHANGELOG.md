# Changelog

All notable changes to the Knightly application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to semantic application versioning defined in `AGENTS.md`.

## [0.4.0] - 2026-10-05

### Added
- **Calvin Events Scraper & REST API**: Live crawler (`server/services/event-scraper.js`) for `calvin.edu/events/all` with in-memory caching, category mapping, and `GET /api/events` endpoint.
- **Offline Seed Resilience**: Pre-scraped 29-event fallback dataset (`calvin-events-seed.ts`) and sync CLI tool (`server/scripts/sync-calvin-events.js`) for zero-crash offline operation.
- **Placeholder Image Fingerprinting**: Detects generic Calvin line-art graphics via cryptographic SHA-256 hashes and canonical paths, replacing them with category Simple Banners while preserving custom user flyers.
- **Event Time Range Inputs**: Added optional start and end time fields with chronological range validation, period auto-sync, and formatted display ("7:00 – 9:00 PM").
- **Form Guidance Modals**: Added inline info triggers on post creation for date/time and location guidelines.
- **Multi-Dev & Architecture Documentation**: Added `docs/ARCHITECTURE.md`, `docs/MULTI_DEV_WORKFLOW.md`, and updated `AGENTS.md` with multi-developer Git protocols and domain standards.

### Changed
- **Standard Starfield Area Density**: Converted procedural starfield to a standard 1.3 stars per 10,000 px² benchmark with 5:3:1 astrophotography depth scaling, capped at 1,800 stars.
- **Expo Framework Update**: Patched Expo core from `~57.0.24` to `~57.0.26`.

### Fixed
- **Label & Icon Baseline Alignment**: Fixed vertical baseline creep in guidance modals and form labels using natural flexbox centering.
- **Dining Card Shadow Border**: Removed dark rectangular border artifact on meal swipe and dining dollar cards.

---

## [0.3.0] - 2026-10-01

### Added
- **Decoupled Banner Colors & Patterns (256 Combinations)**: Expanded simple banners to 16 collegiate colors and 16 vector patterns plus clean solid color options, yielding 256 unique combinations.
- **Symmetrical 8×2 Selector Grids**: Both Color swatches and Pattern icons render in non-scrolling 2-row grids of 36px circular buttons with an identical footprint, toggled via an animated `Segmented` slider with zero layout shift.
- **16 Collegiate Colors**: Added Velvet Plum, Granite Grey, Warm Chestnut, and Cafe Espresso alongside existing collegiate tones, each with paired companion accent tinting.
- **16 Vector Patterns & Mini Icons**: Added Globe, Circuit, Grid, Stripes, Arches, Constellation, and Topography alongside classic patterns, with matching 24×24 mini icons.
- **Layered Feed Rendering**: `PostCard` dynamically composites simple banners using a background color layer and a hardware-composited vector pattern overlay with companion accent tinting.

### Changed
- **Pure Calvin Maroon Pattern**: Removed white guide rails from the Calvin diamonds pattern for clean Collegiate Gold contrast on Maroon.
- **Snowflake Icon Symmetry**: Redesigned `icon-snowflakes.svg` with 60° rotational symmetry and center crystal node.
- **Circuit Bus Clearance**: Decluttered parallel traces in `pattern-circuit.svg` with 30px uniform spacing, an orthogonal vertical power rail, and non-overlapping perimeter breakout routing.

---

## [0.2.2] - 2026-10-01

### Added
- **Animated Follow Button**: Added a fluid micro-interaction on `FollowButton` with a 3D cylindrical roll, rotating icon morph, and background color interpolation.

### Fixed
- **Success Modal Centering**: Replaced raw SVG data URIs with the native `Icon` component and applied rigid cross-platform flex centering to guarantee the checkmark and halo remain perfectly centered on all screen sizes.
- **Amber Banner Selection Ring**: Standardized active selection styling on the amber color button to match all other preset circles.
- **Club Detail Navigation & Header**: Tapping a post's organization tag inside a club view now scrolls smoothly to top instead of opening duplicate views, and masthead titles are standardized to "View Club".

---

## [0.2.1] - 2026-10-01

### Added
- **Dynamic Post Timestamps & Countdown**: Converted `postedAt` to an ISO 8601 creation timestamp that calculates relative time dynamically ("Just now", minutes, hours, days, or full date) with international timezone support.
- **Feed Chronological Sorting**: Implemented `sortPostsByDate` across feed views and queries to ensure announcements strictly order newest first.
- **Auto-Commit Photo Crop**: Switching tabs in the composer now automatically commits the active crop transform matrix.
- **Stress & Concurrency Test Suite**: Added 10,000-iteration stress simulation modeling cold starts, photo picker backgrounding, and Android LMK activity drops.
- **Server-Authoritative Timestamp Policy**: Documented backend integration standards requiring server-authoritative timestamps to prevent client clock manipulation.

### Changed
- **Gold Publish Button**: Styled the composer publish action with prominent collegiate gold branding.
- **Documentation Standards**: Enriched the codebase with step-by-step pipeline labels, architectural rationale comments, and JSDoc blocks.

### Fixed
- **Club Page Live Announcements**: Linked `ClubDetailView` to live `FeedContext` so new announcements immediately replace empty-state placeholders.

---

## [0.2.0] - 2026-10-01

### Added
- **Second Claimable Demo Club**: Added Knights Robotics alongside Abstraction in the Claim Club modal with quick-fill buttons and random claim codes.
- **Directory Staff & Faculty Catalog**: Added 11 faculty and staff profiles across academic and campus departments.
- **Split Banner Selection**: Replaced full-width upload box with side-by-side "Upload Photo" and "Simple Banners" options, introducing chromatic preset banner options.
- **Randomized Demo Feed**: Shuffled posts upon app launch to provide fresh content order on each boot.

### Changed
- **Collegiate Gold Brand Color**: Calibrated `Brand.gold` to collegiate gold (`#E8B019`) with high-contrast companion tones.
- **Directory Filters & Privacy**: Updated filter chips to Everyone, Faculty, and Staff, and removed student entries for privacy compliance.

### Removed
- **Student Directory Records**: Removed student entries from the public directory in compliance with student data privacy standards.

---

## [0.1.0] - 2026-09-18

### Added
- Baseline Knightly application launch.
- 4-tab bottom navigation with smooth camera glide and horizontal pager state machine.
- Dining swipe and Knight Dollars dash meters.
- Interactive post creation with banner image upload and 16:9 cropping.
- Club claim modal with Calvin Maroon and Gold brand identity system.
- Campus clubs feed and following system.
