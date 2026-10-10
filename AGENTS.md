# AGENTS.md — Knightly Autonomous AI Contributor Guide

Welcome to the Knightly codebase. This file is the primary orientation and operating protocol for AI coding assistants working on Knightly. Because you will often start without prior conversation history, and because **2–3 human and AI developers will be collaborating concurrently on GitHub as a shared origin**, you must strictly adhere to the standards, domain invariants, and collaboration protocols outlined below.

---

## 1. System Identity & Architecture Overview

Knightly is an offline-resilient, mobile-first campus life, announcements, and community super-app for **Calvin University**.

- **Frontend Tech Stack**: React Native 0.86, React 19, Expo SDK 57 (`expo-router` file-based routing), TypeScript (strict mode), `react-native-reanimated` 4.5.
- **Backend Tech Stack**: Node.js, Express, Supabase (PostgreSQL), native HTTP scraper for `calvin.edu/events/all`.
- **Deep Documentation**:
  - Technical Architecture Specification: [`docs/ARCHITECTURE.md`](file:///C:/Users/cjsta/Desktop/-/Knightly/docs/ARCHITECTURE.md)
  - Multi-Developer Git Collaboration Guide: [`docs/MULTI_DEV_WORKFLOW.md`](file:///C:/Users/cjsta/Desktop/-/Knightly/docs/MULTI_DEV_WORKFLOW.md)
  - Coding & Quality Standards: [`docs/CodingStandard.md`](file:///C:/Users/cjsta/Desktop/-/Knightly/docs/CodingStandard.md)
  - Backend REST API Contracts: [`docs/api.md`](file:///C:/Users/cjsta/Desktop/-/Knightly/docs/api.md)

---

## 2. Expo Versioned Documentation

### Expo HAS CHANGED
Read the exact versioned docs at [https://docs.expo.dev/versions/v57.0.0/](https://docs.expo.dev/versions/v57.0.0/) before writing any code. Do not use deprecated APIs from older Expo versions.

---

## 3. Versioning Policy

Knightly uses strict semantic application versioning defined in `client/src/constants/version.ts` and displayed as tiny text (`v.0.#.#`) in the bottom-right corner of the Login Screen:

- **Baseline:** `v.0.1.0`
- **Feature Push:** Increment the **center digit** (`0.#.0`) and reset the last digit to 0.
  - *Example:* `v.0.1.0` -> `v.0.2.0`
- **Bugfix / Hotfix:** Increment the **last digit** (`0.0.#`).
  - *Example:* `v.0.1.0` -> `v.0.1.1`
- **Major Release:** Increment the **first digit** (`#.0.0`) when major application overhauls occur.
  - *Example:* `v.0.9.0` -> `v.1.0.0`

### Cadence & Rules for AI Agents & Contributors:
- You do **NOT** have to increment the version on every single prompt or minor tweak.
- AI agents only have to change the version number **once between commits**.
- Each commit corresponds to a new version, and each commit should only have **1 number go up** (increment either feature center digit `0.#.0` or bugfix last digit `0.0.#`).
- If the current uncommitted batch of changes has already incremented the version since the last git commit, do **not** increment it again for subsequent tweaks within the same commit.
- Keep `APP_VERSION` in `client/src/constants/version.ts` and `version` in `client/package.json` in parity.

---

## 4. Multi-Developer & GitHub Team Protocol (2–3 Concurrent Contributors)

Multiple developers work in parallel against `origin`. To prevent merge conflicts, broken builds, and lost work:

### 4.1 Feature Branches & Commit Cadence
- Work on a dedicated feature branch (`feat/<name>`, `fix/<name>`). Never commit straight to `main`.
- Rebase frequently onto `origin/main` using `git pull --rebase origin main`.

### 4.2 Version Collision Prevention
- Do not bump the version on every intermediate commit on a feature branch.
- Bump the version **only on the final commit or PR boundary**.
- If `origin/main` advanced with another developer's version bump, rebase on `origin/main` and bump your version on top of the new baseline.

### 4.3 Anti-Monolith Component Modularization
- Never accumulate 1,000+ lines in a single screen file (e.g. `client/src/app/(tabs)/post.tsx`).
- Extract discrete sub-features into dedicated component files under `client/src/components/` (e.g. `post-date-time-section.tsx`, `masked-time-input.tsx`).
- This allows multiple developers/AIs to work on different sections of the same screen with zero git merge conflicts.

### 4.4 Offline Resilience & Seed Data (Sprint 1 SLO SC2)
- Knightly **must never crash** when the backend server is offline or unavailable.
- The client uses `client/src/data/calvin-events-seed.ts` as an isolated fallback dataset.
- Keep `events-api.ts` gracefully wrapped in try/catch with timeout fallback to `CALVIN_EVENTS_SEED`.
- Use `node server/scripts/sync-calvin-events.js` to refresh seed snapshots.

### 4.5 Template-Level Feature Implementation & Inheritance
- Cross-cutting behaviors intended across every modal, screen, or club view (e.g. software keyboard avoidance/elevation, edge-to-edge status/navigation bar translucency, backdrop dismissal, accessibility boundaries) **must strictly be implemented at the template level** (`client/src/components/ui/modal-dialog.tsx`, `client/src/components/ui/screen.tsx`).
- Leaf components (`SuccessModal`, `DatePickerModal`, `ClaimClubModal`, `LocationInfoModal`, etc.) **must inherit these features by default without duplicated code**.
- Never implement ad-hoc keyboard listeners, manual elevation math, custom `<Modal>` tags, or duplicate backdrops inside leaf components.

---

## 5. Non-Negotiable Domain Invariants

| Invariant | Strict Rule & Rationale | Guarded By |
| :--- | :--- | :--- |
| **Feed Taxonomy** | Standard 13 categories: `Faith`, `Academics`, `Athletics`, `Music`, `The Arts`, `Career`, `Outdoors`, `Service`, `Wellness`, `Social`, `Culture`, `Official`, `Gaming`. | `client/src/data/feed.ts`<br>`server/services/category-mapper.js` |
| **Template-Level Feature Inheritance** | Cross-cutting features across all modals, pages, or views **must be implemented at the template level** (`ModalDialog`, `Screen`) so child views inherit them automatically by default (`avoidKeyboard = true`). Never write duplicate `<Modal>` wrappers or per-component keyboard listeners. | `client/src/components/ui/modal-dialog.tsx`<br>`client/tests/modal-edge-to-edge.test.ts`<br>`client/tests/templates-and-debloat.test.ts` |
| **Server-Authoritative Timestamps** | Post creation timestamps (`postedAt` ISO 8601 string and `createdAt` UTC epoch ms) **must be generated server-side** (e.g. `DEFAULT NOW()`). Never accept client creation timestamps, preventing clock manipulation feed tampering. | `server/server.js`<br>`docs/api.md` |
| **Placeholder Fingerprinting & Same-Filename Immunity** | Generic Calvin Drupal line-art placeholders are identified by exact canonical paths (`/sites/default/files/2025-10/{name}.png`) and cryptographic SHA-256 hashes (`athletics.png` = `f8cecb98...`). **Never replace custom user photos even if they share the exact same filename**. | `server/services/image-fingerprint.js`<br>`client/src/utils/image-fingerprint.ts` |
| **Pure React Native SVG** | Simple banners and vector icons **must strictly avoid `<defs>` and `<use>` tags**. Use direct `<path>`, `<circle>`, `<rect>`, and `<polygon>` elements to prevent native GPU cache blackouts on iOS/Android. | `client/src/constants/preset-banners.ts`<br>`client/src/components/post-card.tsx` |
| **Starfield Area Density** | Star density is based on a standard **1.3 stars per 10,000 px²** (`STAR_DENSITY_UNIT_AREA_PX = 10_000`). Strictly preserves the 5:3:1 astrophotography depth ratio (`distant : midground : foreground`). Total count is capped at 1,800 stars. Decoupled from any specific phone model. | `client/src/constants/starfield.ts`<br>`client/src/components/ui/starfield.tsx` |
| **Centralized Theme Tokens** | All brand colors and spacing tokens must be consumed from `client/src/constants/theme.ts`. Never hardcode raw hex values in components (Calvin Maroon `#8C2131`, Collegiate Gold `#E8B019`). | `client/src/constants/theme.ts`<br>`client/tests/theme.test.ts` |
| **Android Intent Filtering** | External OS intents (e.g. returning from `expo-image-picker`) must be filtered via `+native-intent.tsx` to prevent spurious drops to root `/`. | `client/src/app/+native-intent.tsx` |

---

## 6. Code Commenting Standards

Maintain well-commented code across the entire codebase. Both "what" and "why" comments are integral:

- **"What" Comments (Execution & Steps):** Clearly describe what each function or logical block does step-by-step. Label multi-stage pipelines (e.g. `// Step 1: ...`, `// Step 2: ...`), explain variable transformations, regexes, math truncation, sorting comparator directions, and data sanitization so anyone skimming the code can immediately follow the execution flow without mentally tracing it.
- **"Why" Comments (Architecture & Rationale):** Explicitly explain non-obvious design decisions, architectural trade-offs, edge-case workarounds, and business logic requirements (e.g. `// WHY CAMPUS-WIDE INCLUSION: ...`, `// WHY SORTING BY DATE: ...`).
- **JSDoc Specifications:** Include JSDoc blocks above exported utility functions, hooks, and types detailing parameter expectations, return values, interval boundary rules, and timezone behaviors.
- **Preserve Existing Documentation:** Never strip or discard existing comments or docstrings unless explicitly instructed or replacing obsolete code.

---

## 7. Autonomous AI Standard Operating Procedure (SOP)

When assigned a task in this repository without prior conversation history:

1. **Orientation & Code Inspection**:
   - Inspect files using `view_file` or targeted directory searches.
   - Do not guess file locations or recreate existing utility functions.
2. **Implementation**:
   - Write clean, modular, and type-safe code following TypeScript strict mode.
   - Add step-by-step execution ("what") comments and architectural rationale ("why") comments.
3. **Verification (Mandatory Before Responding)**:
   - Run client tests: `npm --prefix client test` (must be 100% passing).
   - Run server tests: `npm --prefix server test` (must be 100% passing).
   - Run typecheck: `npx --prefix client tsc --noEmit` (must be 0 errors).
4. **Documentation & Changelog**:
   - Document changes in `CHANGELOG.md` under the current unreleased version.
   - Keep `APP_VERSION` in `client/src/constants/version.ts` and `client/package.json` in sync.
5. **Response Formatting**:
   - Format response with clickable file links (e.g. `[filename](file:///path/to/file)`).
   - Provide concise summaries of what was accomplished and test verification results.

---

## 8. Command Cheat Sheet

```bash
# Run Client Unit & Invariant Tests
npm --prefix client test

# Run Server Scraper & API Tests
npm --prefix server test

# Verify TypeScript Compiler Diagnostics
npx --prefix client tsc --noEmit

# Scrape Live Calvin Events to Offline Seed Snapshot
node server/scripts/sync-calvin-events.js

# Start Local Backend Express Server (:3000)
node server/server.js

# Start Expo Client Development Server
npm --prefix client start
```
