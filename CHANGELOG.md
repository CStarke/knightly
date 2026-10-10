# Changelog

All notable changes to the Knightly application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to semantic application versioning defined in `AGENTS.md`.

## [0.4.6] - 2026-10-07

### Added
- **Centralized Responsive Layout Hook (`useResponsiveLayout`)**: Implemented `client/src/hooks/use-responsive-layout.ts` providing reactive window breakpoints (`compact` <768px, `medium` 768–899px, `expanded` 900–1399px, `wide` 1400–1799px, `ultrawide` >=1800px), column counts (1 to 5), and layout flags (`isCompact`, `isMobileWeb`, `isDesktopWeb`).
- **First-Class Desktop Web Post Studio & Zero-Scroll Canvas (`PostWebView`)**: Overhauled `client/src/components/post-web-view.tsx` from feeling like a reformatted mobile app inside boxed card containers into an expansive web authoring studio (Notion/Substack aesthetic):
  - **Unboxed Direct-on-Background Canvas**: Purged enclosing `<Card>` containers and faux-mobile pill badges ("POST DETAILS", "MEDIA & SCHEDULE", "OFFICIAL ANNOUNCEMENTS") from Columns 1 and 2. All form controls sit directly on the page background canvas with clean, professional spacing.
  - **Commanding Web Headline & Clean Placeholder**: Upgraded the page title to `30px` (`fontWeight: '800'`) and transformed the Post Title input into a commanding `22px` hero headline input (`titleInput`) with clean, concise `"Post title"` placeholder (replacing verbose truncated strings) and multiline document wrapping (`numberOfLines={2}`, `blurOnSubmit={true}`).
  - **Expansive Banner Picker**: Expanded the 16:9 banner canvas and enlarged preset palette swatches to `42px` diameter (`presetCircleButton`) in `client/src/components/post-banner-section.tsx`, complete with a taller `125px` upload dropzone.
  - **Direct-on-Background Event Logistics**: Added `flat` prop support to `client/src/components/post-date-time-section.tsx` to render date segment inputs and masked time range directly on the canvas without nested card frames.
  - **Preserved Dedicated Preview Card**: Column 3 retains the dedicated `PostCard` preview (`variant="editorial"`) as a physical artifact representation, flanked by the primary "Publish as [Club Name]" button and guidance tips.
  - **Top Breathing Room & Zero-Scroll Desktop Constraint**: Increased top breathing room (`paddingTop: Spacing.five` = 32px) and updated fallback draft title to `"Your Title Will Appear Here"`. Calibrated layout height to ~662px, utilizing desktop vertical headroom while strictly guaranteeing zero scrolling on normal desktop monitor viewports (1366x768, 1440x900, 1920x1080) via `scroll={!isSideBySide}`.
- **Handheld Mobile Post Composer (`PostMobileView`)**: Extracted `client/src/components/post-mobile-view.tsx`, preserving soft keyboard lift animations, input scroll centering, and edge-to-edge mobile ergonomic controls.
- **Decoupled Post Composer Hook (`usePostComposer`)**: Centralized all form state, validation pipelines, image manipulation/cropping, calendar/time masking, and post creation dispatch into `client/src/hooks/use-post-composer.ts`, decoupling business logic from platform presentation trees.
- **Anti-Monolith Screen Router (`post.tsx`)**: Refactored `client/src/app/(tabs)/post.tsx` from a 1,281-line monolith to a concise ~60-line router delegating between `PostMobileView` (if `isCompact`), `PostWebView` (if `!isCompact`), and `PostNotLeaderView` (if student has not claimed leadership).
- **Extracted Modular Modals & Guards**: Extracted `LocationInfoModal` (`client/src/components/location-info-modal.tsx`) and `PostNotLeaderView` (`client/src/components/post-not-leader-view.tsx`).
- **Progressive Mobile Web Access & Smart App Banner**: Created `client/src/components/smart-app-banner.tsx`, a non-blocking, dismissible header banner ("Get the Knightly App") for mobile browsers with persistent dismissal state (`knightly_app_banner_dismissed`).
- **Mobile Web App Shell & Grounded Navigation**: Updated `client/src/components/app-tabs.web.tsx` to detect compact phone viewports (< 768px) and automatically mount the mobile shell (regal masthead, tab slot, and grounded bottom navigation bar) rather than squeezing the desktop sidebar onto handheld screens.
- **Shared Modular Bottom Tab Bar**: Extracted `BottomBar` and `TabButton` components into `client/src/components/bottom-tab-bar.tsx` with spring pop motion, icon crossfading, Calvin Gold 33° active indicators, and rigid bottom grounding, shared across native mobile and mobile web without code duplication.
- **Ultra-Wide Desktop Grid Scaling (Up to 5 Columns)**: Extended `resolveFeedColumnCount` in `client/src/data/feed.ts` and `FeedWebView` to support 4-card grids on full-screen 1080p desktop monitors (1400px–1799px) and 5-card grids on ultrawide monitors (>=1800px, capped at 5), dynamically adjusting container `maxWidth` up to 1880px.

### Fixed
- **Unified Single-Input Date Field Architecture (`SegmentedDateInput`)**: Replaced the multi-box input arrangement with a zero-flicker masked architecture patterned after the Claim Club modal code field (`claim-club-modal.tsx`), using an invisible `<TextInput>` capturing raw digits coupled with a synchronous React presentation layer and high-fidelity `BlinkingCursor`:
  - **Zero Intermediate Frame Flicker**: Raw keystrokes are never painted directly into the browser/OS DOM text buffer before formatting. React computes formatted chunks (`month`, `day`, `year`) and ` / ` delimiters synchronously during render, completely eliminating visual frame flicker (e.g. typing `1` then `6` atomically displays `01 / 06 / ` with zero frames of `16` or `01/6`).
  - **Eliminated Focus Thrashing & Blur Ping-Pong**: Using a single native input completely purges synthetic focus jumping, cross-element ref bouncing, soft keyboard flicker on mobile, and premature blur triggers that previously caused false `"Please enter a day"` errors while typing.
  - **Single-Frame Month & Rollover Pipeline**: Formats unambiguous months (`2`..`9` -> `02`..`09 /`) and handles rollovers (typing `1` then `6` atomically formats as `01 / 06 / `; typing `1` then `3` formats as `01 / 3`) in a single render frame without visual flicker.
  - **Day-to-Year Overflow Cascading**: In any month, typing `3` followed by a digit that exceeds the month's maximum days (e.g. `1035` in October, `0230` in Feb, `0431` in April) automatically clamps Day to `03` and cascades the overflow digit into Year (`10 / 03 / 5`).
  - **Native Delimiter Traversal & Backspacing**: Backspacing at delimiter boundaries (`09 / 18 / `) seamlessly drops the trailing delimiter and digit in one fluid motion without getting stuck on slashes.
  - **Purged Premature Year Auto-Fill**: Removed `completeDateDigits` from `handleDateBlur` in `usePostComposer`, preventing unwanted `2026`/`2027` insertions upon finishing the day field.
  - **Native Caret Alignment & Web Styling**: Caret sits on the left of placeholder text `"MM / DD / YYYY"` via an out-of-flow `position: 'absolute'` `BlinkingCursor` (`left: -4`) when empty, strictly guaranteeing zero horizontal layout shifting of placeholder text on focus/blur, while browser focus rings are suppressed with `outlineStyle: none` and the full-width container prevents any `"MM"` vertical stacking.
- **Mobile Web AppHeader Margin & Maroon Gap Purge**: Removed the obsolete `WebHeaderInset` (72px) from `client/src/components/ui/app-header.tsx` on web, replacing it with `insets.top > 0 ? insets.top + Spacing.one : Spacing.three` (16px). Completely eliminates the awkward 72px maroon gap between the smart app banner and the "Knightly" title, ensuring uniform 16px padding whether the banner is displayed or dismissed.
- **Login Screen Flight Docking Parity with Mobile Web Banner**: Updated `client/src/components/login-screen.tsx` to render `SmartAppBanner` on mobile web and incorporate `bannerOffset` (44px) into `headerPaddingTop`, `maroonBackgroundStyle`, and target docking delta calculations. Eliminates jump cuts during the sign-in flight and guarantees pixel-perfect handoff to the underlying feed header.
- **Expo Router UI Navigator Trigger Discovery**: Replaced the intermediate container `<View>` inside `<Tabs>` on mobile web (`app-tabs.web.tsx`) with a `React.Fragment`, enabling `parseTriggersFromChildren` to discover all tab routes without crashing React Navigation.
- **Mobile Web Login Screen Squeeze**: Confined the desktop sidebar docking and sign-in flight animation in `client/src/components/login-screen.tsx` to desktop web viewports (`isDesktopWeb`), rendering the standard centered mobile card layout on mobile phone browsers to prevent coordinate distortion.
- **Template-Level Feature Implementation & Inheritance Architecture**: Consolidated all modal dialogs across the application to delegate directly to the foundational `ModalDialog` template primitive (`client/src/components/ui/modal-dialog.tsx`), eliminating duplicated `<Modal>` tags, redundant backdrops, and manual keyboard listeners:
  - **Single Source of Truth for Modal Behavior**: Edge-to-edge status/navigation bar translucency, accessible backdrop dismissal, dynamic card height measurement via `onLayout`, and 60fps Reanimated soft-keyboard elevation (`avoidKeyboard = true` by default) are now implemented exclusively at the template level. All modals inherit these behaviors automatically with zero boilerplate.
  - **Leaf Modal Consolidation**:
    - Refactored `SuccessModal` (`client/src/components/ui/success-modal.tsx`) to delegate to `<ModalDialog>`, purging duplicated `<Modal>` tags and custom listeners while retaining playful checkmark spring physics.
    - Refactored `DatePickerModal` (`client/src/components/date-picker-modal.tsx`) to delegate to `<ModalDialog>` and `<ModalHeader>`, purging duplicated `<Modal>` wrappers, backdrop code, and custom keyboard state while maintaining vertical month grid stabilization.
    - Preserved existing delegation in `ClaimClubModal` (`client/src/components/claim-club-modal.tsx`), `LocationInfoModal` (`client/src/components/location-info-modal.tsx`), and `PostDateTimeSection` (`client/src/components/post-date-time-section.tsx`).
    - Added immediate virtual keyboard dismissals on presentation (`Keyboard.dismiss()`) to `DatePickerModal`, `SuccessModal`, `ClaimClubModal`, and `HeaderAvatar` profile sheet.
  - **Documentation & Invariants**: Enshrined the Template-Level Feature Inheritance rule in `AGENTS.md` (Sections 4.5 & 5), `docs/ARCHITECTURE.md` (Section 3.7), and `docs/CodingStandard.md` (Section 3.5), guarded by automated invariant test suites (`client/tests/modal-edge-to-edge.test.ts` and `client/tests/templates-and-debloat.test.ts`).
- **Anti-Spaghetti Dimension Isolation**: Kept leaf components (`PostCard`, `Chip`, `SearchField`, etc.) 100% agnostic to screen width and platform. Root routing boundaries (`app-tabs.web.tsx`, `(tabs)/index.tsx`, `login-screen.tsx`) alone manage view structure.

## [0.4.5] - 2026-10-07

### Fixed
- **LoginScreen TypeScript Compilation & Style Deduplication**: Resolved 7 `TS1117` object literal duplicate property errors in `client/src/components/login-screen.tsx`. Cleanly separated mobile `styles.maroonContainer` from desktop `webSidebarMasthead`, and purged obsolete duplicate style definitions.
- **Mobile Bottom Navigation Bar Grounding**: Restored strict absolute positioning (`position: 'absolute'`, `bottom: 0`, `left: 0`, `right: 0`) to `styles.bottomBarWrapper` in `client/src/components/app-tabs.tsx`, fixing native bottom tab bar layout across handheld screens.
- **Mobile Editorial Typography & Grid Platform Isolation**: Isolated desktop web multi-column grid constraints (`webCard`, `webContent`, `webTitle`) from mobile in `client/src/components/post-card.tsx`. Restored 22px serif headline typography (`fontSize: 22, lineHeight: 28`) and unconstrained body text on mobile while preserving equal-height multi-column grid alignment and line limits (`numberOfLines={3}`, `numberOfLines={4}`) on desktop web.
- **Anti-Monolith Feed Modularization**: Disentangled the 600-line cross-platform monolith in `client/src/app/(tabs)/index.tsx` into dedicated, cleanly decoupled components: `client/src/components/feed-mobile-view.tsx` (singular column, animated scope toggle, and direct-post virtualization) and `client/src/components/feed-web-view.tsx` (multi-column balanced grid, single-tier filter pills, and equal-height stretched rows with trailing spacers). Reduced `index.tsx` to a lightweight platform router delegating cleanly between them.
- **Feed Key Extractor & Empty View Null Guard**: Switched mobile feed `ScreenFlatList` keyExtractor from index-based string to stable post ID, eliminating list re-render artifacts. Cleaned `listEmpty` to return `null` when posts are visible rather than rendering an empty DOM container on web.
- **Web Tab Navigation Context Metadata**: Defined `BASE_TABS` and `LEADER_TABS` in `app-tabs.web.tsx`, accurately supplying tab navigation metadata through `useTabNavigation()` on web.
- **Platform Isolation Test Invariants**: Added test suite `Web and Mobile Layout Platform Isolation Invariants` in `client/tests/templates-and-debloat.test.ts` to prevent layout regressions across shared components.

## [0.4.4] - 2026-10-05

### Added
- **Mobile Feed Scope Toggle & Decoupled Category Filtering**: In the mobile app alone (`Platform.OS !== 'web'`), refined the scope toggle to feature "Following" on the left side and "All Campus" on the right side. On the "Following" toggle, the search bar is cleanly hidden for a streamlined feed. On the "All Campus" toggle, the search bar pops up directly below the toggle bar and above the filter banner, with full container tap-to-focus invoking the native soft keyboard.
- **Streamlined Mobile Following Subheader**: On the mobile app alone, simplified the context subheader underneath the filter banner by removing the leading star icon and the parenthetical "(tap to browse clubs)" hint, displaying a clean, minimal status string (`Following X clubs · campus-wide events included`).
- **"All" Category Option & Edge-to-Edge Filter Banner**: Added "All" as an active filter option in the mobile category strip, allowing students to easily reset or inspect all categories while retaining edge-to-edge horizontal scrolling (`marginHorizontal: -Spacing.three`, `paddingHorizontal: Spacing.three`).
- **Centralized Feed Filter Pipeline Domain Helper**: Added and exported `filterFeedPosts` and `FeedFilterCriteria` in `client/src/data/feed.ts` with comprehensive unit test invariants verifying scope independence, multi-category matching, query search, and chronological sorting across "All", "Following", "All Campus", "ALL CAMPUS", and legacy aliases.

### Fixed
- **Toggle Responsiveness & Low-End Mobile Performance**: Completely eliminated the severe synchronous rendering lag experienced when toggling between "All Campus" and "Following" scopes on the mobile app. Integrated React 18 `useDeferredValue` for all feed filtering state to prioritize immediate 60fps toggle highlighting while computing search arrays in the background. Upgraded the mobile feed renderer from a raw `Array.map` to a custom `ScreenFlatList` component (`Animated.FlatList`) decoupled from desktop layouts. Enforced mobile-specific list virtualization (`initialNumToRender: 5`, `removeClippedSubviews: true`) strictly ensuring smooth scrolling and memory efficiency on low-end hardware without breaking the global starfield parallax effect.
- **Mobile Bottom Navigation Bar Grounding & Anti-Bleed Anchoring**: Fixed the bottom tab bar on the mobile app alone (`client/src/components/app-tabs.tsx`, `Platform.OS !== 'web'`) to dock cleanly at the bottom in normal layout flow with full-width anchoring and solid Calvin theme background (`backgroundColor: theme.backgroundElement`). By placing the bar in normal layout flow rather than an unanchored floating absolute overlay without a background, screen viewports stop precisely at the top gold rule of the bar, completely preventing cards, text, and other screen elements from scrolling behind the nav bar or peeking out underneath.
- **Mobile Campus Feed Singular Column Layout**: Fixed the Knightly feed (`client/src/app/(tabs)/index.tsx`) on the mobile app alone (`Platform.OS !== 'web'`) to render in strictly one singular full-width column (`numColumns = 1`). Handheld mobile displays (iOS and Android) now feature an uncompressed, distraction-free vertical reading stream where card headlines, category badges, event logistics, and 16:9 hero artwork have full horizontal breathing room. Preserved the multi-column even-row grid layout on web displays (3 columns on desktop monitors `width >= 900`, 2 columns on tablet/responsive web).
- **Mobile Campus Feed Card Margins**: In the mobile app alone (`Platform.OS !== 'web'`), added comfortable `Spacing.three` (16px) horizontal margins (`mobileCardRow: { paddingHorizontal: Spacing.three }`) to the feed post card rows. This prevents cards from touching the physical screen edges edge-to-edge, perfectly showcases the card corner radii (`Radius.lg`), and aligns post boundaries with the top search field and empty state containers.
- **Column Count Resolution Domain Helper**: Exported `resolveFeedColumnCount(width, platform)` in `client/src/data/feed.ts` with comprehensive unit test invariants verifying singular column resolution across mobile device widths and multi-column responsive rules on web.

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
