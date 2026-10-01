# Changelog

All notable changes to the Knightly application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to semantic application versioning defined in `AGENTS.md`.

## [0.2.1] - 2026-10-01

### Added
- **Dynamic Post Timestamps & Future Countdowns**: Converted `postedAt` to an ISO 8601 creation timestamp rather than static display text. Posts now compute their relative display dynamically based on the current viewing time:
  - `0–5 minutes` (past or minor clock skew): `"Just now"`
  - `5–60 minutes`: `"${minutes} minutes ago"` (past) or `"In ${minutes} minutes"` (future)
  - `1–24 hours`: Truncated `# of hours` (`"1 hour ago"`, `"2 hours ago"`, `"In 1 hour"`, `"In 2 hours"`, e.g. 1 hour 50 minutes displays `"1 hour ago"` / `"In 1 hour"`)
  - `1–30 days`: `"${days} days ago"` (past) or `"In ${days} days"` (future)
  - `Past 30 days` & distant future: Formatted as exact post date (`"Posted 21 October 2026"`), with full support for international time zones via `Intl.DateTimeFormat`.
- **Feed Chronological Sorting**: Implemented `sortPostsByDate` across `FeedScreen` (both Following and All Campus explore tabs), `FeedContext`, and `data/feed` query helpers to guarantee posts are strictly ordered by publication timestamp with the newest at the top.
- **Auto-Commit Photo Crop on Tab Switch**: In the Create Post composer (`post.tsx`), switching away from the Post tab while in active photo cropping mode automatically ends the crop session and commits the adjusted transform matrix (equivalent to clicking the "Done" button), preserving the user's zoom and pan adjustments on the flyer banner.
- **Randomized Cold Start Photo Upload Stress Test (10,000 Iterations)**: Enhanced `tab-focus-preservation.test.ts` with controlled, realistic entropy across 10,000 iterations modeling OS hardware diversity (8 screen widths: 360–768px), 3 cold launch pathways, 3 user navigation patterns, 10 dev-server resume intent URLs, Android Low Memory Killer (LMK) activity recreations (`initial: true`), photo picker cancellations, 5 photo aspect ratios, and mid-crop tab switches with sub-second execution (~170–250ms).
- **Server-Authoritative Timestamp Guidelines**: Added architectural specifications in `AGENTS.md`, `client/AGENTS.md`, and `docs/api.md` mandating that post creation timestamps (`postedAt` and `createdAt`) are generated server-side upon backend integration, immunizing the feed against client-side device clock manipulation.

### Changed
- **Gold Publish Action Button**: Updated the primary post creation action button in the Create Post composer (`post.tsx`) to use the new `variant="gold"` button styling (`Brand.gold` with `#0B0C0E` high-contrast bold typography), highlighting the active publishing organization (e.g. "Publish as Abstraction").
- **Codebase Commenting & Documentation Standards**: Enriched the codebase with detailed "what" step-by-step pipeline labels, "why" architectural rationale comments, and comprehensive JSDoc blocks across post authoring, feed rendering, club directories, and context providers.

### Fixed
- **Club Page Live Announcements**: Connected `ClubDetailView` to the live `FeedContext` state, ensuring the "Recent Updates & Announcements" section and post counter dynamically update and immediately replace the "No announcements yet" placeholder whenever a student leader publishes a post on behalf of their organization.

---

## [0.2.0] - 2026-10-01

### Added
- **Second Claimable Demo Club**: Added `Knights Robotics` alongside `Abstraction` in the Claim Club modal with side-by-side quick-fill buttons and random 10-character alphanumeric claim code generation (`0-9`, `A-Z`).
- **Directory Staff & Faculty Catalog**: Added 11 new faculty and staff profiles spanning Biology, Business, Computer Science, Engineering, Education, Campus Safety, Dining Services, Nursing, and Student Life.
- **Split Banner Upload & Simple Banners**: Replaced the full-width upload box with two side-by-side equal-height buttons ("Upload Photo" and "Simple Banners") and unified header label to "Remove Banner". Added 8 preset solid-color banners arranged in chromatic rainbow order (Calvin Maroon, Sunset Terracotta, Honey Amber, Forest Green, Ocean Teal, Arctic Blue, Midnight Navy, and Royal Amethyst) with edge-filling vector art (including enlarged 33° Calvin scaffolding diamonds on Maroon, interlocking tapered mechanical gears on Navy, and opposing crystalline quartz formations on Amethyst) and instant in-place circle selection with gold border highlighting.
- **Randomized Demo Feed**: Knightly feed posts and relative timestamps now randomly shuffle upon app launch to provide fresh content order on every boot.

### Changed
- **Calvin Gold Brand Color**: Calibrated `Brand.gold` from canary yellow (`#F3CD00`) to radiant collegiate gold (`#E8B019`), with accompanying `Brand.goldDark` (`#B38410`) for rich contrast against Calvin Maroon and dark backgrounds.
- **Create Post Placeholder**: Updated post title placeholder to generic, student-wide prompt (`"e.g. Welcome Night & Info Session"`).
- **Directory Role Filters**: Updated directory filter chips to `Everyone`, `Faculty`, and `Staff`.
- **Versioning Policy**: Relaxed AI versioning rules to increment once per commit, removed rigid version test assertions, and reinforced 1-number-per-commit cadence.

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
