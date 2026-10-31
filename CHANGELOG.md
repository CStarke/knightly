# Changelog

All notable changes to the Knightly application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to semantic application versioning defined in `AGENTS.md`.

## [0.8.0] - Unreleased

### Added
- **Campus Map Phantom Page**: Safety opens the bundled map inside the native p\
ager. Swipe right on the header, tap Back, or use Android Back to return to Saf\
ety; map dragging remains independent.
- **Phantom Page Lifecycle Tests**: Cover transition completion, rapid reopen, \
gesture cancellation and thresholds, rotation, activity resume, parent navigati\
on, and trailing-slot visibility.

### Changed
- Reuse the standard header and map body across the native phantom page and the existing web/direct-link route. Preserve map pan/zoom controls, offline data, and the existing load-error message.
- Isolate the new subpage lifecycle in a reusable hook; keep the map rendered until its close animation finishes.

## [0.7.1] - 2026-10-29

### Fixed
- **Login Screen Password Handler Syntax & Build Recovery**: Repaired corrupted `handlePasswordChange` callback in `client/src/components/login-screen.tsx` where an accidental code fragment duplication caused TypeScript syntax compilation errors (`TS1005`, `TS1128`) and broke application startup and bundling. Restored password masking logic with `processPasswordMaskInput`.

## [0.7.0] - 2026-10-28

### Added
- **Relational Database Model & Supabase Architecture (SD2)**: Designed and implemented a production-grade 3NF relational data model on PostgreSQL/Supabase documented in `docs/DATABASE_DESIGN.md`. Authored initialization migrations `server/db/migrations/001_initial_schema.sql` (17 tables, triggers, and full-text search indexes) and `server/db/migrations/002_rls_policies.sql` (PostgreSQL Row-Level Security policies enforcing data isolation by `auth.uid()`).
- **Autonomous Dining Engine & Ledger Triggers**: Implemented self-authoritative dining replacement for Calvin's legacy Transact system with an immutable transaction ledger (`dining_transactions`), atomic balance trigger (`apply_dining_transaction`), time-windowed weekly swipe calculations (`date_trunc('week')`), and support for weekly Core plans and semester block plans.
- **Layered Backend Architecture (DAL & BLL)**: Built clean separation of concerns with Database Access Layer (`server/dal/`: student, dining, clubs, posts, safety, directory) and Business Logic Layer (`server/services/`).
- **Cryptographic Club Claim Codes & Role-Free Authorization**: Added salted SHA-256 claim code verification and normalization for club claiming. Completely removed club roles: claiming a club grants posting authorization as that organization directly via `club_memberships` without role hierarchy. Post accountability is strictly enforced via database check constraint and RLS requiring `author_student_id` on all club announcements. Restricted system roles in `students.role` to `'student'`, `'moderator'`, and `'admin'`.
- **FERPA Directory Onboarding & Privacy**: Added `DirectoryOnboardingModal` inheriting `ModalDialog` to prompt students on initial sign-in, keeping student records unlisted by default in compliance with FERPA.
- **BLL Unit Test Suite & In-Memory Mock DAL (VV7, VV10)**: Created 4 comprehensive BLL test suites in `server/__tests__/bll/` using Node's native test runner (`node --test`) and an in-memory test double `mock-dal.js`.
- **Live Supabase Cloud Connection & Non-Social Privacy Invariant**: Verified live cloud connectivity via `server/scripts/test-db-connection.js` with Data API privilege grants (`003_grant_api_privileges.sql`). Enforced strict omission of `follower_count` across all DAL projections to ensure Knightly remains informative and free of social media metrics. Added `server/.env.example`.
- **Unified Posts & Supabase Feed Client Integration (Workstream 1)**: Integrated Expo client with backend Unified Posts API (`/api/posts`). Created `client/src/services/posts-api.ts` and `client/src/utils/post-database-adapter.ts`. Connected `FeedContext` to fetch real posts from Supabase on mount and persist newly authored club flyers directly to the database with server-authoritative timestamps and student author accountability (`author_student_id`). Preserved offline resilience with fallback to isolated seed data (`defaultPosts` & `CALVIN_EVENTS_SEED`). Added automated background synchronization of scraped Calvin Drupal events on server startup, added `DELETE /api/posts/:id` and `POST /api/events/sync` routes, and expanded test suite with `client/tests/posts-api-and-db-sync.test.ts`.
- **Club Claiming & Follow Subscriptions Database Integration (Workstream 2)**: Added `client/src/services/clubs-api.ts` providing client interfaces for `fetchClubsApi`, `claimClubApi`, `fetchFollowedClubsApi`, `followClubApi`, and `unfollowClubApi`. Connected `ClubFollowContext` to synchronize followed organizations to the `club_follows` table in Supabase in the background while preserving synchronous O(1) Set lookups. Connected `ClubLeadershipContext` to persist claim code authorizations to Supabase. Connected `ClubsDirectoryView` to asynchronously refresh directory listings from the cloud database while preserving instant initial render from `CALVIN_CLUBS`. Added follow and membership REST endpoints in `server/server.js` (`GET/POST/DELETE /api/clubs/follow`, `GET /api/clubs/memberships`), and created comprehensive invariant test suite `client/tests/clubs-api-and-claim-sync.test.ts`.
- **Student Profile & FERPA Directory Onboarding Database Integration (Workstream 3)**: Added `client/src/services/student-api.ts` with `fetchStudentProfile` and `updateDirectoryPreferenceApi`. Connected `AuthContext` to asynchronously synchronize student profile attributes (academic standing, major, minor, class year, physical card barcode) with Supabase while maintaining instant synchronous first-frame sign-in. Connected `_layout.tsx` to mount `DirectoryOnboardingModal` whenever a student has not yet consented to campus directory preferences (`directory_prompted = false`), adhering to FERPA by keeping student records private by default. Connected `card.tsx` to dynamically render authenticated student credentials and variable-length barcodes (`00000{studentId}00`). Updated `student-dal.js` and in-memory mock DAL to transparently resolve both UUIDs and 7-digit student IDs. Added comprehensive invariant tests in `client/tests/student-api-and-ferpa-sync.test.ts`.
- **Autonomous Dining Services & Meal Swipes Integration (Workstream 4)**: Created `client/src/services/dining-api.ts` providing `fetchDiningVenuesApi`, `fetchDiningSummaryApi`, and `recordDiningTransactionApi`. Integrated `KnightIdCardSection`, `MealPlanStats`, and `DiningHallsSection` to dynamically read live account balances, remaining meal swipes (synchronized to the Sunday 12:00 a.m. weekly reset cycle), KnightBucks, and Dining Dollars from Supabase `student_dining_accounts` and `dining_venues`. Updated `dining-dal.js` to automatically resolve 7-digit student IDs to primary account UUIDs. Preserved complete offline resilience with automatic fallback to isolated seed data (`diningHalls`, `mealPlan`, `CALVIN_MEAL_PLANS`). Added comprehensive invariant tests in `client/tests/dining-api-and-transactions.test.ts`.

### Fixed
- **Post Persistence Across Sessions & Offline Resilience**: Fixed issue where authored flyers were lost across sessions by integrating persistent local storage caching (`knightly_local_authored_posts`) in `client/src/context/feed-context.tsx` alongside backend REST API synchronization. Authored posts now persist immediately upon creation and survive app reloads even during network dropouts, seamlessly synchronizing with Supabase when online.
- **Express Payload Size & Server Diagnostics**: Increased Express JSON body limit in `server/server.js` from 100KB to 50MB (`express.json({ limit: '50mb' })`), resolving `PayloadTooLargeError` HTTP 413 rejections when uploading high-resolution cropped flyer banners. Added structured server-side and client-side logging for post creation, retrieval, and error diagnostics.
- **Synchronous Follow State Persistence**: Added user-scoped local storage persistence (`knightly_followed_club_ids_${accountId}`) in `client/src/context/club-follow-context.tsx` so followed club subscriptions (and newly authored club affiliations) are available synchronously on the first frame of app reload, ensuring authored club flyers are never hidden by the default "Following" feed scope.
- **Universal API Dynamic Resolution**: Enhanced `client/src/services/api-config.ts` to dynamically resolve `window.location.hostname` on web browsers and safely unwrap `expo-constants` across physical mobile devices and local dev machines.
- **Development Process Runner Hardening**: Hardened `scripts/dev.js` to isolate `stdin` from the backend process, monitor for child process exits, and clearly report port conflicts (EADDRINUSE) or server exceptions.
- **Dynamic Relative Timestamp Ticker & Scraped Event Age Preservation**: Added a dynamic 30-second relative timestamp ticker in `client/src/components/post-card.tsx` so card footer timestamps continuously transition in real time ("Just now" -> "X minutes ago" -> "1 hour ago" -> "X days ago") without requiring app reloads. Scraped Drupal events now record the server clock on initial ingestion and preserve their original `posted_at` and `created_at_ms` timestamps indefinitely across subsequent scraper intervals in `server/dal/posts-dal.js`, preventing duplicate post entries via `onConflict: 'external_event_id'`.
- **Clubs Directory Search & Tagline Removal**: Removed `tagline` from the `Club` model and directory cards across client, server, and seed datasets, standardizing exclusively on `name`, `category`, and `description`. Updated multi-vector search predicate in `clubs-directory-view.tsx` with safe null-coalescing guards (`(club.name ?? '')`, `(club.description ?? '')`, `(club.category ?? '')`, `(club.location ?? '')`), resolving unhandled `toLowerCase` exceptions.
- **Universal Student Profile & Persona Deprecation**: Migrated John Doe from mock fixture UUID `00000000-0000-0000-0000-000000000042` to a genuine cryptographically random Version 4 UUID (`9b919086-788b-48de-85c6-df9a204f05c5`) in the live Supabase PostgreSQL database, updating all relational foreign keys across `student_dining_accounts`, `club_follows`, `posts`, and `club_claim_codes`. Completely eliminated all hardcoded `isJohn` code branches from `AuthContext`, `LoginScreen`, `ClubLeadershipContext`, and `ClubFollowContext`. Implemented automatic student auto-provisioning in `server/dal/student-dal.js` (`provisionStudent`) so that logging in as any Calvin student automatically provisions a personal profile with random v4 UUID, 7-digit ID, barcode, and Core 14 meal plan in Supabase. Converted static fallback constants in `client/src/data/student.ts` into a neutral generic guest template (`"Calvin Student"`, `"2400001"`).
- **Profile Modal Student ID Resolution**: Fixed profile sheet (`client/src/components/header-avatar.tsx`) and card view (`client/src/app/card.tsx`) displaying internal PostgreSQL primary key UUIDs (`00000000-0000-0000-0000-000000000042`) instead of 7-digit student numbers by prioritizing `user.studentId` / `user.cardNumber` and suppressing hyphenated UUID strings.
- **Client API Dynamic Resolution**: Corrected platform and test environment detection in `client/src/services/api-config.ts` so web browsers and mobile devices reliably resolve the active Express backend (`http://localhost:3000/api` or LAN IP) instead of falling back to isolated test ports.
- **Feed Timestamp Authority & Student Post Ordering**: Fixed `server/dal/posts-dal.js` `upsertScrapedEvent` to preserve original `posted_at` and `created_at_ms` timestamps during automated Drupal syncs, preventing re-scraped campus calendar events from displacing newly authored student club flyers at the top of the feed. Seeded all 23 Calvin clubs into the Supabase database and added polymorphic UUID student ID resolution to `server/dal/clubs-dal.js`.
- **Desktop Web Login Input Focus**: Resolved issue where username and password text inputs could not be focused on desktop web by only rendering `TouchableWithoutFeedback` on native platforms and assigning `zIndex: 20` to the login form container.
- **Login Footer Text Encoding**: Replaced corrupted bullet character mojibake (`Â·`) in the campus address footer with Unicode escape `\u2022`.

### Reverted
- **Login Screen Modularization Revert**: Reverted `client/src/components/login-screen.tsx` back to its pre-modularization single-file implementation (commit `1a5ea85` / `b4fbc66~1`), consolidating login flight animation shared values, layout measurements, masked password inputs, and container shrinking into a unified component. Removed modular subcomponent files (`login-flight-container.tsx`, `login-form-fields.tsx`, `login-footer.tsx`, and `use-login-flight.ts`) and aligned Suite 10 tests in `auth-and-student.test.ts` to enforce Reanimated worklet thread-boundary invariants directly on `login-screen.tsx`.

## [0.6.1] - 2026-10-27

### Changed
- **Expo SDK 58 & React Native 0.88 Upgrade**: Upgraded core framework dependencies: Expo SDK to 58.0.19, React Native to 0.88.0, React to 19.3.0, React Native Reanimated to 4.7.1, React Native Gesture Handler to 3.3.0, Expo Router to 58.0.26, and React Native WebView to 14.0.1.
- **React Native 0.88 Type Conformance**: Updated ref typing and event handlers to native instance types (ViewInstance, TextInputInstance, ScrollViewInstance, TextInputContentSizeChangeEvent, TextInputKeyPressEvent) across form components, modal dialogs, and navigation triggers.
- **Anti-Monolith Invariant Test Relaxation**: Updated test assertions across `auth-and-student.test.ts`, `dining-and-services.test.ts`, and `post-composer.test.ts` to enforce the universal `< 1000` line anti-monolith limit without brittle sub-caps.
- **Clarified Versioning Policy**: Updated `AGENTS.md`, `MULTI_DEV_WORKFLOW.md`, and `version.ts` to explain baseline anchoring and single increment rules clearly without examples.

---

## [0.6.0] - 2026-10-15

### Added
- **Campus Map**: Added an in-app campus building map with zoom controls, panning, keyboard controls, and Fit Map button.
- **Separate Web & Native Viewers**: Created `campus-map-view.tsx` and `campus-map-view.web.tsx` using bundled SVG map data.
- **SRS Document Comprehensive Overhaul**: Extensively overhauled `docs/SRS_Document.md` to cover all subsystems, domain invariants (13-category taxonomy, server timestamps, placeholder fingerprinting, 16:9 crop geometry, starfield density, phantom tabs), database schemas, and hardware interfaces.

---

## [0.5.1] - 2026-10-11

### Added
- **Campus Safety Anti-Monolith Modularization**: Refactored `safety.tsx` into a 24-line router delegating between `SafetyMobileView` and `SafetyWebView`. Extracted `safety-sections.tsx` (`SafetyEmergencyButton`, `SafetyQuickAssistCard`, `SafetyAlertsSection`, `SafetyNumbersSection`) shared across web and mobile with zero code duplication.
- **Campus Dining Anti-Monolith Modularization**: Refactored `dining.tsx` from a 387-line monolith into a 22-line router delegating to `DiningMobileView` and `DiningWebView`. Extracted shared sections (`KnightIdCardSection`, `DiningHallsSection`, `DiningMenuSection`).
- **Campus People Directory 1â€“5 Column Responsive Grid**: Upgraded `DirectoryScreen` to scale dynamically from 1 to 5 columns matching Home Feed breakpoints and integrated `FeedEmptyState`.
- **Campus Clubs 5-Column Parity**: Aligned `ClubsDirectoryView` to scale from 1 to 5 columns using `resolveFeedColumnCount` and dynamic container widths.
- **Favorite Posts Functionality**: Added ability for students to favorite posts via heart icon and filter by favorites.
- **Safety Domain Invariant Test Suite**: Added Suite 12 to `dining-and-services.test.ts` verifying router brevity, shared section imports, and desktop layout constraints.

### Fixed
- **Campus Clubs & Card Back Navigation Resilience**: Eliminated unhandled `GO_BACK` warning and unresponsive back buttons across Campus Clubs and Student ID screens by checking `router.canGoBack()` and safely falling back to root tabs.
- **Dining & Safety Monoliths**: Eliminated 500+ lines of monolithic inline layouts across `dining.tsx` and `safety.tsx`.

---

## [0.5.0] - 2026-10-10

### Added
- **Reusable Input Template (`FormTextInput`)**: Consolidated text input primitive across web and mobile with Calvin Gold borders, gold carets, and browser outline suppression.
- **Feed Tab Search & Category Filter Chips**: Integrated canonical `SearchField` and 13-category `ChipRow` directly into feed controls for 0-click keyword and category filtering.
- **Unified Post Form Controls**: Extracted shared `PostTitleSection`, `PostDescriptionSection`, and `PostLocationSection` to keep placeholders and length limits in parity across mobile and web.
- **Shared Feed Page Controls (`feed-controls.tsx`)**: Consolidated `FeedSearchField`, `FeedFilterChips`, `FeedFollowingBanner`, and `FeedEmptyState` templates for single-source-of-truth feed search, chips, and empty states.
- **Campus Clubs 2-Column Desktop Studio**: Added 2-column desktop layout (profile & logistics on left, announcements stream on right) to `ClubDetailView`.
- **Enterprise Test Infrastructure (1,015+ Tests / 143+ Suites)**: Doubled automated test coverage with headless E2E user journeys, human interaction fuzzing, and concurrency stress tests. Consolidated 22 fragmented test files into 11 cohesive domain suites.
- **Template Architecture Invariant**: Mandated template-level consolidation across repeated controls (buttons, inputs, modals, tabs) in `AGENTS.md` and `docs/CodingStandard.md`.

### Fixed
- **Motionless Home-Swipe Tab Desynchronization**: Resolved tab desync between content, header, and bottom bar on app resume by establishing a single source of truth (`activeTabIndex`), pure derived headers, and safe screen dimension resolution.
- **Claim Club Setup Success Header Latency**: Resolved delay where top header stayed stuck on "Complete Profile" after tapping "Got it" by synchronously resetting `claimSetupState.isOpen`.
- **Feed & Directory Empty State Consolidation**: Replaced duplicate inline empty cards and reset buttons across Feed, Campus Clubs, and People Directory with the unified `FeedEmptyState` template. Added web outline suppression and gold carets to `SearchField`.
- **Web Form Focus Outlines & Carets**: Standardized text carets and focus rings across post composer fields on web to match mobile brand styling.
- **Mobile & Web Input Divergence**: Purged duplicated inline text inputs across `PostMobileView` and `PostWebView` in favor of shared template sections.

---

## [0.4.4] - 2026-10-05

### Added
- **Mobile Feed Scope Toggle**: Added "Following" and "All Campus" toggle with contextual search bar and "All" category filter.
- **Centralized Feed Filter Helper**: Added `filterFeedPosts` supporting category sets, keyword search, and following-scope campus-wide inclusions.

### Fixed
- **Feed Virtualization & Performance**: Optimized mobile feed rendering with `ScreenFlatList` virtualization and deferred search filtering to eliminate toggle lag.
- **Feed Card Margins**: Added standard 16px horizontal card margins on mobile.

---

## [0.4.2] - 2026-10-05

### Fixed
- **Desktop Sidebar Hover Expansion**: Fixed label text wrapping artifacts during sidebar expansion and eliminated visual duplication during the web login flight handoff.

---

## [0.4.1] - 2026-10-05

### Added
- **Desktop Web Collapsible Sidebar**: Added hover expansion (76px to 270px) and pin toggle for the desktop navigation rail.
- **Sign-in Flight Animation**: Added smooth masthead docking transitions from the login screen to the desktop sidebar.

---

## [0.4.0] - 2026-10-05

### Added
- **Calvin Events Scraper & REST API**: Live crawler for `calvin.edu/events/all` with caching and `GET /api/events` endpoint.
- **Offline Seed Resilience**: Pre-scraped fallback dataset (`calvin-events-seed.ts`) and sync CLI tool for zero-crash offline operation.
- **Placeholder Image Fingerprinting**: Detects generic Calvin line-art graphics via SHA-256 hashes, replacing them with preset banners while preserving custom photos.
- **Event Time Range Inputs**: Added optional start and end time fields with chronological validation.

### Changed
- **Starfield Area Density**: Converted starfield to standard 1.3 stars per 10,000 pxÂ² with 5:3:1 depth scaling.
- **Expo Framework Update**: Patched Expo core from `~57.0.24` to `~57.0.26`.

---

## [0.3.0] - 2026-10-01

### Added
- **Decoupled Banner Colors & Patterns**: Expanded simple banners to 16 collegiate colors and 16 vector patterns (256 combinations) with symmetrical 8Ã—2 selector grids.
- **Layered Feed Rendering**: Added vector pattern overlays on cards with companion accent tinting.

---

## [0.2.2] - 2026-10-01

### Added
- **Animated Follow Button**: Added 3D roll and color interpolation on club follow actions.

### Fixed
- **Success Modal Centering**: Ensured checkmark halo stays centered cross-platform using native `Icon` components.

---

## [0.2.1] - 2026-10-01

### Added
- **Dynamic Post Timestamps**: Added relative time formatting ("Just now", hours, days) with timezone support.
- **Feed Chronological Sorting**: Implemented `sortPostsByDate` ensuring announcements order newest first.
- **Auto-Commit Photo Crop**: Switching tabs in the composer automatically commits active photo crops.

---

## [0.2.0] - 2026-10-01

### Added
- **Claimable Demo Clubs**: Added Knights Robotics and Abstraction claim codes in the Club Claim modal.
- **Directory Staff & Faculty Catalog**: Added 11 department profiles with privacy-compliant filtering.
- **Split Banner Selection**: Added side-by-side photo upload and preset banner pickers.

---

## [0.1.0] - 2026-09-18

### Added
- Baseline Knightly application launch.
- 4-tab bottom navigation with smooth camera glide and horizontal pager state machine.
- Dining swipe and Knight Dollars dash meters.
- Interactive post creation with banner image upload and 16:9 cropping.
- Club claim modal with Calvin Maroon and Gold brand identity system.
- Campus clubs feed and following system.
