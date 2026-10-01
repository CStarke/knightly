# Knightly — Calvin University Student App

> **Current Version:** `v.0.1.0`

Knightly is a mobile application built for Calvin University students, providing a centralized hub for everyday campus life, student organizations, dining, safety, and campus resources.

---

## Vision Statement

> **Knightly envisions simplifying everyday campus life by giving Calvin students one convenient starting point for frequently used resources such as dining, printing, campus safety, news, and other student services, rather than requiring students to navigate multiple apps, websites, and platforms.**

---

## The Creators

David Idowu, Daniel Okereke, Caleb Starkenburg, Kellen Morford, and John Zhan

---

## Tech Stack & Architecture

- **Mobile Client (`client/`)**: Built on **Expo SDK 57** (React Native 0.86, Expo Router v54, Reanimated 4, Gesture Handler).
- **Backend API (`server/`)**: Express & Node.js backend with Supabase integration and offline/mock fallback layers.
- **Design Tokens**: Standardized Calvin maroon (`#862633`), gold (`#FFC72C`), typography, and light/dark theme palettes in `client/src/constants/theme.ts`.
- **Testing**: Over 440 comprehensive automated unit & integration tests covering tab navigation invariants, gesture state machines, stress lifecycles, and date/time formatting.

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation & Launch

```bash
# 1. Install dependencies across both client and server
npm run install:all

# 2. Start the Expo development client
npm start
# Press 'a' for Android, 'i' for iOS simulator, or 'w' for Web

# 3. (Optional) Run the backend API server in a separate terminal
npm run server
```

### Running Tests

```bash
# Run all tests (server + client)
npm test

# Run client tests specifically (439+ passing tests)
npm --prefix client test

# Run server tests specifically
npm --prefix server test
```

---

## What's in the App

### 1. Authentication & Onboarding
- **Interactive Login (`client/src/components/login-screen.tsx`)**: Calvin student credential authentication with username/password validation and demo student fallbacks (e.g. `jmd42`).
- **Keyboard-Aware Elevation**: Smooth physics-based input lift animation (`formRaise`) ensuring input fields remain centered and clear of the virtual keyboard.
- **Subtle Version Watermark**: Displays the current application version (`v.0.1.0`) in the bottom-right corner.

### 2. Tabs & Navigation
The application features a custom bottom tab bar with fluid horizontal follow-my-finger pan gestures and a 340ms bidirectional ease-in-out cubic-bezier lateral camera glide:

- **Knightly Feed (`client/src/app/(tabs)/index.tsx`)**:
  - In-place announcement cards that can be read fully without nested page transitions.
  - **For You**: Aggregates updates from followed organizations alongside verified campus-wide news.
  - **All Campus**: Complete catalog featuring instant search and category filter pills (*The Arts, Athletics, Music, Academics, Faith, Service, Social, Outdoors*).
  - Quick-access Campus Clubs banner for instant club discovery.

- **Campus Clubs Ecosystem**:
  - **Clubs Directory (`client/src/components/clubs-directory-view.tsx`)**: Searchable and filterable directory of student organizations.
  - **Follow Context (`client/src/context/club-follow-context.tsx`)**: Real-time follow/unfollow actions with dynamic feed updates.
  - **Club Claiming (`client/src/components/claim-club-modal.tsx`)**: Student leaders can claim organization ownership via passcodes.
  - **Profile Completion (`client/src/components/complete-club-profile-view.tsx`)**: Guided onboarding for leaders to customize organization details.
  - **Dynamic Post Tab**: Verified club leaders automatically unlock the 5th **Post** tab in the navigation bar.

- **Post Creation Studio (`client/src/app/(tabs)/post.tsx`)** *(Club Leaders)*:
  - **Banner Media**: Interactive cropper (`inline-image-cropper.tsx`) locked to standard 16:9 banner dimensions with photo picker integration.
  - **Organization Selector**: Switch between managed clubs for posting.
  - **Scheduling & Details**: Segmented date/time input components (`segmented-date-input.tsx`, `masked-time-input.tsx`) and calendar modal (`date-picker-modal.tsx`).
  - **Publishing Confirmation**: Instant post confirmation modal (`post-success-modal.tsx`) with a "View in Feed" smooth navigation shortcut.

- **Dining & Digital Knight Card (`client/src/app/(tabs)/dining.tsx`)**:
  - **Digital Student ID (`client/src/app/card.tsx`)**: Full-screen modal presenting an on-device vector-rendered Code 39 barcode (`barcode.tsx`), brightness auto-elevation via `expo-brightness`, and tap-to-dismiss.
  - **Venue Hours & Status**: Real-time status indicators and meal periods for Commons, Knollcrest, Johnny's Cafe, and Peet's Coffee.
  - **Meal Counters & Dash Meters**: Visual unit-based meters for meal swipes and guest passes.
  - **Dining Activity Ledger (`client/src/components/dining-activity.tsx`)**: Detailed transaction history tracking meal swipe usage and dining dollars.

- **Campus Safety (`client/src/app/(tabs)/safety.tsx`)**:
  - One-touch emergency calling (`tel:`) connecting directly to Campus Safety dispatch.
  - Direct entry points for Safe Walk requests, incident reporting, and Blue Light locations.
  - Live campus alerts banner and essential campus contact directory.

- **Campus Directory (`client/src/app/(tabs)/directory.tsx`)**:
  - Searchable, filterable directory of Calvin faculty and staff with one-tap email composition.

---

## Native Reliability & Gesture Engine

- **Decoupled Intent Interception (`client/src/app/+native-intent.ts`)**: Drops spurious unrouted root intents (`/`) triggered when returning from external Android native activities (e.g. system image picker) while preserving genuine deep links.
- **Gesture Priority & Edge Snapping**: Follow-my-finger horizontal swiping coordinates between inner scroll views and root pager gestures to eliminate gesture conflicts.
- **Cinematic Easing**: Utilizes an ease-in-out curve (`Easing.bezier(0.4, 0.0, 0.2, 1.0)`) with zero initial derivative, preventing frame drops during concurrent slot mountings.

---

## Application Versioning Policy

Knightly uses strict semantic application versioning defined in `client/src/constants/version.ts`, package manifests, and displayed on the Login Screen:

- **Current Version:** `v.0.1.0`
- **Feature Push:** Increment the **center digit** (`0.#.0`) and reset the last digit to 0 (e.g., `v.0.1.0` → `v.0.2.0`).
- **Bugfix / Hotfix:** Increment the **last digit** (`0.0.#`) (e.g., `v.0.1.0` → `v.0.1.1`).
- **Major Release:** Increment the **first digit** (`#.0.0`) when major application overhauls occur (e.g., `v.0.9.0` → `v.1.0.0`).

All contributors and AI agents must update `client/src/constants/version.ts` and `client/package.json` according to these rules before pushing changes.
