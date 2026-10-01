# Changelog

All notable changes to the Knightly application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to semantic application versioning defined in `AGENTS.md`.

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
