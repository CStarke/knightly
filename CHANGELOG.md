# Changelog

All notable changes to the Knightly application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to semantic application versioning defined in `AGENTS.md`.

## [0.4.2] - 2026-10-05

### Fixed
- **Sidebar Tab Jumbling on Hover**: Fixed the "jumbled" text wrapping artifact during sidebar expansion by applying a rigid 198px width constraint (`width: 198`) to the inner `tabSlidingContent` containers, allowing labels and descriptions to be revealed smoothly by the expanding outer mask rather than actively relayouting and wrapping across multiple lines during the 240ms transition.
- **Flight Handoff Duplication Artifacts**: Eliminated overlapping duplication and blurriness at the precise end of the sign-in flight animation:
  - Addressed fractional text scaling mismatches by instantly swapping the flying `fontSize: 34` wordmark for a native `fontSize: 24` wordmark (`targetWordmarkAnimatedStyle`) the exact millisecond the flight lands, ensuring the 160ms crossfade occurs between pixel-perfect identical native layers.
  - Stopped the underlying UI from abruptly popping in by removing the `!isAuthenticated && { opacity: 0 }` hack in `app-tabs.web.tsx`, replacing it with seamless continuous background rendering.
  - Fixed a ghostly duplication of the collapse button by directly reading `isCollapsedLocally` from `localStorage` during the login screen flight, ensuring the preview icon perfectly matches the user's saved pinning preference (`pin` vs `sidebar.left`).

## [0.4.1] - 2026-10-05

### Added
- **Desktop Web Sidebar Hover Expansion & Collapse**: Integrated dynamic mouse and pointer hover expansion into `app-tabs.web.tsx`. When the sidebar is collapsed into an icon-only navigation rail (76px), hovering over the rail smoothly animates width out to 270px (`Easing.bezier(0.2, 0, 0, 1)`), revealing full navigation tab labels, descriptive captions, and student profile metadata. Moving the mouse pointer away automatically collapses the sidebar back down to 76px. Users can pin the sidebar permanently open via the masthead toggle button.
- **Smooth Sidebar Sliding Element Transitions**: Replaced instantaneous conditional DOM switching with a unified component layout and Reanimated slide-out tray transitions driven by `expandProgress`:
  - **Stationary Icon Geometry**: Fixed squircle tab badges (36px), clubs icon box (36px), and student avatar (36px) at a stationary horizontal position (`x = 20px`), perfectly centered in the 76px collapsed rail and remaining stationary without a single pixel of jitter during expansion.
  - **Horizontal Slide-Out & Fade Tray**: Navigation labels, captions, trailing gold active indicator dots, "PORTAL" section heading, clubs directory description, and student profile metadata glide smoothly from left to right (`translateX: -18px -> 0px`, `opacity: 0 -> 1`) only after the container has widened sufficiently, completely eliminating squeezed, line-wrapping, or jumbled text artifacts.
  - **Masthead Dual Overlay Crossfade**: Centered "K." collapsed monogram cleanly fades out while the expanded "Knightly." wordmark and pin toggle slide into place without layout height jumps.
  - **Rounded Maroon Masthead Geometry**: Added 20px rounded corners (`borderRadius: 20`) to the Calvin Maroon masthead in both `app-tabs.web.tsx` and `login-screen.tsx`, sculpting the bottom corners of the maroon block with soft contours that seamlessly match the sidebar's 20px outer corner radius and eliminate sharp square dividers.

### Fixed
- **Web Sign-In Transition Smoothing & Absolute Element Deduplication**: Completely eliminated visual element duplication and jarring timing at the end of the desktop web sign-in animation (`login-screen.tsx`):
  - **Initial Height Alignment**: Fixed desktop viewport calculation to start at `windowHeight` instead of offscreen physical monitor `screenHeight`, removing the dead lag at the start of the flight.
  - **Fluid Animation Curve & Timing**: Tightened form fade-out to 260ms, removed artificial 100ms pauses in favor of a 30ms settle, and accelerated the flight to 900ms using a fluid cubic-bezier curve (`Easing.bezier(0.25, 0.1, 0.25, 1)`).
  - **Fixed Masthead Geometry Anchoring**: Pinned `webSidebarContainer` to a fixed 270px width within `maroonContainer`, preventing the collapse button from stretching across the screen or sliding horizontally over feed content during flight.
  - **Underlying Masthead Concealment**: Hidden underlying masthead content (`opacity: 0`) in `app-tabs.web.tsx` while unauthenticated (`!isAuthenticated`), guaranteeing zero duplicate collapse buttons, duplicate taglines, or duplicate wordmarks appear during flight or crossfade.
  - **Precise Measurement Anchor**: Added collapse toggle and tagline placeholders to `webTargetMeasurementAnchor` in `login-screen.tsx`, ensuring layout measurements report the true 86px masthead height and docking deltas align with subpixel accuracy.

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
