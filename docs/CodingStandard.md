# Knightly Coding Standards & Engineering Guidelines

This document outlines the engineering standards, architectural principles, and quality guidelines for the Knightly codebase. All contributors and AI agents must adhere to these practices to ensure codebase longevity, type safety, cross-platform stability (iOS, Android, and Web), and visual fidelity with Calvin University branding.

---

## 1. Core Engineering Philosophy

1. **Safety & Predictability Over Cleverness**: Code must be explicit, self-documenting, and resilient to device edge cases, network drops, and OS lifecycle interruptions.
2. **Strict Invariant Enforcement**: Critical contracts (timestamps, theme tokens, route reconciliation, data structures) must be guarded by automated invariant test suites.
3. **Platform Symmetry**: Every feature must render and behave consistently across Android, iOS, and Web without platform-specific layout breaks or memory leaks.

---

## 2. TypeScript & Language Standards

The project utilizes TypeScript with strict compiler options enabled.

### 2.1 Typing & Safety
- **No Implicit `any`**: Never use `any`. If a type is truly dynamic or uncertain from an external boundary, use `unknown` accompanied by runtime type guards or zod/assertion validators.
- **Discriminated Unions**: Prefer discriminated unions over loose optional fields for state modeling, UI variants, and API responses.
  ```typescript
  // Preferred
  export type BannerState =
    | { mode: 'photo'; uri: string; cropTransform?: CropMatrix }
    | { mode: 'preset'; colorId: PresetColorId; patternId: PresetPatternId };
  ```
- **Explicit Return Types**: All exported functions, hooks, and context providers must specify explicit return types. Internal helper closures may leverage type inference where readability is preserved.
- **Literal Union Constants**: Use string literal union types backed by `as const` arrays for enumerations rather than TypeScript `enum`.
  ```typescript
  export const PRESET_COLOR_IDS = ['maroon', 'gold', 'navy', 'forest'] as const;
  export type PresetColorId = (typeof PRESET_COLOR_IDS)[number];
  ```

### 2.2 Immutability & Functional Transforms
- Avoid in-place array/object mutations (`push`, `splice`, direct property assignment). Use immutable functional operations (`map`, `filter`, spread syntax `[...arr]`, `{ ...obj }`).
- For complex sorting or state reductions, ensure pure functional comparators that do not alter the source collection.

---

## 3. Expo & React Native Guidelines

Knightly is built on modern Expo (SDK 57+), React 19, React Native 0.86, and Expo Router.

### 3.1 Expo SDK Documentation
Always consult the versioned Expo documentation at [https://docs.expo.dev/versions/v57.0.0/](https://docs.expo.dev/versions/v57.0.0/) when using Expo APIs.

### 3.2 Pure React Native SVG Requirements
- **Strictly No `<defs>` or `<use>` Tags**: All vector SVG assets (patterns, icons, banners) must be implemented with direct path and shape elements (`<path>`, `<circle>`, `<rect>`, `<polygon>`).
  - *Rationale*: Mobile SVG rendering engines and GPU caching on native iOS/Android can drop definitions, produce render blackouts, or trigger out-of-memory exceptions when evaluating `<use>` symbol references in high-frequency list views.
- **Tinting & Layers**: Layer solid background colors with transparent SVG pattern overlays using `tintColor` or currentColor stroke/fill for optimal memory reuse.

### 3.3 Platform-Specific Layout & Edge-to-Edge Handling
- Support Android 15 edge-to-edge rendering by utilizing `react-native-safe-area-context` insets (`useSafeAreaInsets()`).
- Avoid hardcoded bottom or top padding; compute layout insets dynamically so modal sheets and bottom tab navigators clear system navigation pills and camera notches.

### 3.4 Navigation & Native Activity Reconciliation
- When handling external intent returns (such as `expo-image-picker` or camera dialogs on Android), protect tab navigators against spurious root intent (`/`) drops using custom intent filtering (`+native-intent.tsx`).
- Preserve user state and scroll positions during OS activity pausing and foreground resumption.

### 3.5 Template-Level Feature Inheritance & Broad Consolidation
- **Consolidation First**: Wherever possible, elements appearing multiple times **must strictly be consolidated into reusable templates** under `client/src/components/ui/` (e.g. `Button`, `FormTextInput`, `ModalDialog`, `Screen`, sliders, normal and phantom tabs).
- **Core Principle**: When adding functionality intended across every modal dialog, text field, or screen layout (e.g. soft-keyboard avoidance/elevation, web outline suppression, caret color tokens, edge-to-edge status/navigation bar translucency, backdrop dismissal, accessibility handling), **always implement the capability at the template level** (`client/src/components/ui/modal-dialog.tsx`, `client/src/components/ui/screen.tsx`, `client/src/components/ui/form-text-input.tsx`).
- **Zero-Boilerplate Leaf Components**: Leaf components (`PostMobileView`, `PostWebView`, `SuccessModal`, `DatePickerModal`, `ClaimClubModal`, `LocationInfoModal`, etc.) delegate directly to template primitives and inherit cross-cutting features by default.
- **Strict Prohibitions**:
  - Never duplicate `<Modal>` tags, raw backdrop pressables, or platform keyboard listeners in individual modal screens.
  - Never maintain per-screen manual `keyboardLift` state or layout math; rely on `ModalDialog`'s dynamic `onLayout` measurement and Reanimated translation engine (`avoidKeyboard = true`).
  - Never render unstyled raw `<TextInput>` tags that duplicate focus state logic, web outline suppression, or caret color tokens; use `FormTextInput`.

---

## 4. Code Commenting Standards

Clear comments bridge the gap between high-level architectural intent and low-level code mechanics.

### 4.1 "What" Comments (Execution Steps)
- Describe multi-stage processing pipelines step-by-step (`// Step 1: ...`, `// Step 2: ...`).
- Document mathematical derivations, regex patterns, truncation boundaries, and sorting comparator directions.
- Keep comments concise and close to the execution point.

### 4.2 "Why" Comments (Architecture & Rationale)
- Explicitly articulate non-obvious design decisions, trade-offs, and edge-case workarounds.
  ```typescript
  // WHY CAMPUS-WIDE INCLUSION: We intentionally do not filter by user club affiliations
  // in the main feed to encourage campus-wide discovery and cross-pollination.
  ```
- Detail business logic constraints (e.g. why specific color pairs are chosen or why a fallback is required).

### 4.3 JSDoc Specifications
- Provide JSDoc headers for all exported utility functions, custom hooks, and shared interfaces detailing:
  - `@param` expectations and formats.
  - `@returns` guarantees and potential nullish fallbacks.
  - Interval boundary rules, edge cases, and timezone behaviors.

### 4.4 Documentation Preservation
- Never remove or discard existing comments or docstrings unless replacing obsolete code or explicitly directed to do so.

---

## 5. Theme, Branding & UI Design System

Knightly's visual identity honors Calvin University traditions while maintaining accessible, modern mobile UI ergonomics.

### 5.1 Palette & Tokens
- **Centralized Tokens**: Consume color, spacing, radius, and typography tokens exclusively from `client/src/constants/theme.ts`. Avoid ad-hoc hex codes or magic dimension numbers in component stylesheets.
- **Calvin Palette**:
  - Primary Brand: **Calvin Maroon** (`#8C2131`)
  - Accent Brand: **Collegiate Gold** (`#E8B019`)
  - High-Contrast Text / Surface tokens supporting both Light and Dark themes.

### 5.2 Micro-Interactions & Animation
- Use `react-native-reanimated` for smooth 60/120fps gesture-driven animations.
- Ensure all interactive elements have active feedback states (`opacity`, scale springs, or haptics).
- Prevent layout shift when toggling between controls (e.g., maintaining identical dimensions between selector tabs).

---

## 6. Backend Integration & Data Integrity

### 6.1 Server-Authoritative Timestamps
- **Creation Timestamps**: When creating posts (`POST /api/posts`), announcements, or audit records, the creation timestamp (`postedAt` ISO 8601 string and `createdAt` epoch milliseconds) **must** be generated and stamped by the server clock (e.g., PostgreSQL `DEFAULT NOW()`), never accepted from client request payloads.
- **Clock Manipulation Immunity**: Relying on server-authoritative timestamps prevents malicious or accidental local device clock manipulation from artificially manipulating feed ranking or bypassing scheduling rules.

### 6.2 Date & Time Formatting
- Wire payloads must transmit timestamps formatted as ISO 8601 UTC strings (`YYYY-MM-DDTHH:mm:ss.sssZ`).
- Client UI presentation must format timestamps dynamically using relative elapsed time ("Just now", "12m ago", "3h ago", "Yesterday") or localized calendar dates.

---

## 7. Testing & Quality Assurance

Quality is verified continuously through automated test suites and strict typechecking.

### 7.1 Test Suite Standards
- All tests reside in `client/tests/` and are executed via Node's native test runner (`npm --prefix client test`).
- Keep tests fast, deterministic, and free of flaky network calls or timeouts.
- Include invariant validation tests:
  - Color palette hex validity and contrast ratios.
  - Theme token monotonicity and spacing scale invariants.
  - Compound URI generation and parser round-trip integrity.
  - State machine transitions and navigation focus mutual exclusion.
  - Automated stress simulations (e.g. 10,000 cold-start / activity resume iterations).

### 7.2 Pre-Push Verification Checklist
Before submitting code or pushing changes:
1. `npm --prefix client test` must pass 100% of tests.
2. `npx tsc --noEmit` must produce 0 TypeScript diagnostic errors.
3. Version parity must be verified across `version.ts` and `package.json`.

---

## 8. Versioning & Changelog Policy

Knightly enforces strict semantic application versioning defined in `client/src/constants/version.ts` and displayed in the login screen footer (`v.0.#.#`):

- **Baseline**: `v.0.1.0`
- **Feature Push**: Increment the **center digit** (`0.#.0`) and reset the last digit to 0 (e.g., `v.0.1.0` -> `v.0.2.0`).
- **Bugfix / Maintenance**: Increment the **last digit** (`0.0.#`) (e.g., `v.0.3.0` -> `v.0.3.1`).
- **Major Release**: Increment the **first digit** (`#.0.0`) on comprehensive overhauls (e.g., `v.0.9.0` -> `v.1.0.0`).

### Cadence Rules
- AI agents and contributors only change the version number **once between commits**.
- Keep `APP_VERSION` in `client/src/constants/version.ts` and `version` in `client/package.json` in lockstep parity.
- Record notable user-facing and architectural changes in [CHANGELOG.md](../CHANGELOG.md) following the [Keep a Changelog](https://keepachangelog.com/) standard.
