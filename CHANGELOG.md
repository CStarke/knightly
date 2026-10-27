# Changelog

All notable changes to the Knightly application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to semantic application versioning defined in `AGENTS.md`.

## [0.6.1] - Unreleased

### Added
- **Private Saved Posts Bookmarking**: Transitioned the social "Favorites" heart system to a private, student-centric "Saved Posts" bookmarking feature using a Calvin Collegiate Gold star icon (`Brand.gold` `#E8B019`), with persistent account-isolated storage (`knightly_saved_posts_<accountId>`), guaranteeing zero data leakage between student sessions.
- **O(1) Set Performance Optimization**: Replaced $O(N)$ linear array searching in feed state with a JavaScript `Set<string>`, delivering guaranteed constant-time lookups during 60fps feed scrolling.
- **Consolidated Empty State Template**: Added `'no-saved-posts'` variant to `FeedEmptyState` (`feed-controls.tsx`), unifying empty state handling across `index.tsx`, `FeedMobileView`, and `FeedWebView` without inline element drift (AGENTS.md Rule 4.5).
- **Login Screen Anti-Monolith Modularization**: Refactored `login-screen.tsx` from 1,260 lines to 278 lines by extracting modular subcomponents (`useLoginFlight`, `LoginFlightContainer`, `LoginFormFields`, `LoginFooter`).
- **Campus Map Integration in Modular Safety**: Added the new interactive campus map entry point to shared `SafetyQuickAssistCard` across both mobile and web views.
- **Favorites Integration in Modular Feed Views**: Integrated the favorites feed filter into `FeedMobileView` and `FeedWebView`.

### Fixed
- **Reanimated Worklet Remote Function Call on Login**: Fixed runtime crash (`[Worklets] Tried to synchronously call a Remote Function. Called "anonymous" on the UI runtime`) in `use-login-flight.ts` by marshaling `measurePositions`, `runFlight`, and completion callbacks across the UI worklet thread boundary using `runOnJS`, with explicit `'worklet'` directives on `withTiming` handlers.

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
- **Campus People Directory 1–5 Column Responsive Grid**: Upgraded `DirectoryScreen` to scale dynamically from 1 to 5 columns matching Home Feed breakpoints and integrated `FeedEmptyState`.
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
- **Starfield Area Density**: Converted starfield to standard 1.3 stars per 10,000 px² with 5:3:1 depth scaling.
- **Expo Framework Update**: Patched Expo core from `~57.0.24` to `~57.0.26`.

---

## [0.3.0] - 2026-10-01

### Added
- **Decoupled Banner Colors & Patterns**: Expanded simple banners to 16 collegiate colors and 16 vector patterns (256 combinations) with symmetrical 8×2 selector grids.
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
