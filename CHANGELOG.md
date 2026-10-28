# Changelog

All notable changes to the Knightly application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to semantic application versioning defined in `AGENTS.md`.

## [0.7.0] - 2026-10-28

### Added
- **Relational Database Model & Supabase Architecture (SD2)**: Designed and implemented a production-grade 3NF relational data model on PostgreSQL/Supabase documented in `docs/DATABASE_DESIGN.md`. Authored initialization migrations `server/db/migrations/001_initial_schema.sql` (17 tables, triggers, and full-text search indexes) and `server/db/migrations/002_rls_policies.sql` (PostgreSQL Row-Level Security policies enforcing data isolation by `auth.uid()`).
- **Autonomous Dining Engine & Ledger Triggers**: Implemented self-authoritative dining replacement for Calvin's legacy Transact system with an immutable transaction ledger (`dining_transactions`), atomic balance trigger (`apply_dining_transaction`), time-windowed weekly swipe calculations (`date_trunc('week')`), and support for weekly Core plans and semester block plans.
- **Layered Backend Architecture (DAL & BLL)**: Built clean separation of concerns with Database Access Layer (`server/dal/`: student, dining, clubs, posts, safety, directory) and Business Logic Layer (`server/services/`).
- **Cryptographic Club Claim Codes & Role-Free Authorization**: Added salted SHA-256 claim code verification and normalization for club claiming. Completely removed club roles: claiming a club grants posting authorization as that organization directly via `club_memberships` without role hierarchy. Post accountability is strictly enforced via database check constraint and RLS requiring `author_student_id` on all club announcements. Restricted system roles in `students.role` to `'student'`, `'moderator'`, and `'admin'`.
- **FERPA Directory Onboarding & Privacy**: Added `DirectoryOnboardingModal` inheriting `ModalDialog` to prompt students on initial sign-in, keeping student records unlisted by default in compliance with FERPA.
- **BLL Unit Test Suite & In-Memory Mock DAL (VV7, VV10)**: Created 4 comprehensive BLL test suites in `server/__tests__/bll/` using Node's native test runner (`node --test`) and an in-memory test double `mock-dal.js`.
- **Live Supabase Cloud Connection & Non-Social Privacy Invariant**: Verified live cloud connectivity via `server/scripts/test-db-connection.js` with Data API privilege grants (`003_grant_api_privileges.sql`). Enforced strict omission of `follower_count` across all DAL projections to ensure Knightly remains informative and free of social media metrics. Added `server/.env.example`.

### Fixed
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
