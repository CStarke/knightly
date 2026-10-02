# Changelog

All notable changes to the Knightly application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to semantic application versioning defined in `AGENTS.md`.

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
