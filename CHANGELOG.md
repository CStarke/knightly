# Changelog

All notable changes to the Knightly application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to semantic application versioning defined in `AGENTS.md`.

## [0.5.0] - 2026-10-10

### Added
- **Reusable Input Template (`FormTextInput`)**: Consolidated text input primitive across web and mobile with Calvin Gold borders, gold carets, and browser outline suppression.
- **Unified Post Form Controls**: Extracted shared `PostTitleSection`, `PostDescriptionSection`, and `PostLocationSection` to keep placeholders and length limits in parity across mobile and web.
- **Enterprise Test Infrastructure (1,015 Tests / 143 Suites)**: Doubled automated test coverage with headless E2E user journeys, human interaction fuzzing, and concurrency stress tests. Consolidated 22 fragmented test files into 11 cohesive domain suites.
- **Template Architecture Invariant**: Mandated template-level consolidation across repeated controls (buttons, inputs, modals, tabs) in `AGENTS.md` and `docs/CodingStandard.md`.

### Fixed
- **Motionless Home-Swipe Tab Desynchronization**: Resolved tab desync between content, header, and bottom bar on app resume by establishing a single source of truth (`activeTabIndex`), pure derived headers, and safe screen dimension resolution.
- **Web Form Focus Outlines & Carets**: Standardized text carets and focus rings across post composer fields on web to match mobile brand styling.
- **Mobile & Web Input Divergence**: Purged duplicated inline text inputs across `PostMobileView` and `PostWebView` in favor of shared template sections.

---

## [0.4.6] - 2026-10-07

### Added
- **Desktop Web Post Studio**: Responsive 3-column layout for desktop web with hero headline input, live feed card preview, and zero-scroll canvas.
- **Modular Post Components**: Refactored `post.tsx` into a lightweight router delegating between `PostMobileView`, `PostWebView`, and `PostNotLeaderView`.
- **Responsive Layout Hook (`useResponsiveLayout`)**: Centralized breakpoint detection and dynamic grid column scaling (up to 5 columns on ultrawide displays).
- **Mobile Web App Shell & Smart Banner**: Added grounded mobile bottom navigation and a dismissible "Get the Knightly App" banner for mobile web browsers.

### Fixed
- **Single-Input Segmented Date Field**: Replaced multi-box date inputs with a zero-flicker masked architecture handling month rollovers, leap years, and delimiter navigation without focus thrashing.
- **Modal Dialog Template Consolidation**: Consolidated modals to inherit edge-to-edge translucency, backdrop dismissal, and keyboard avoidance from the `ModalDialog` template primitive.
- **Mobile Web Header Spacing**: Removed obsolete desktop header insets to fix spacing below the mobile web banner.

---

## [0.4.5] - 2026-10-07

### Fixed
- **Mobile Navigation Bar Grounding**: Docked the bottom tab bar flush with the screen bottom across handheld devices.
- **Modular Feed Layouts**: Separated mobile single-column feed (`FeedMobileView`) and desktop multi-column feed (`FeedWebView`) from `(tabs)/index.tsx`.
- **Card Typography & Platform Isolation**: Isolated mobile serif headline typography and unconstrained body text from desktop grid constraints.
- **Login Screen Diagnostics**: Fixed duplicate property styles and cleanly separated mobile and desktop layout containers.

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
