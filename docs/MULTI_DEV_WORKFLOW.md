# Multi-Developer Collaboration & Git Workflow Guide

This document outlines the collaborative engineering protocols for teams of **2–3 developers (and AI assistants)** working concurrently on Knightly with GitHub as the shared origin. Following these rules eliminates merge conflicts, prevents version drift, and ensures rapid, stable feature integration.

---

## 1. Branching Strategy & Naming Conventions

Never push code directly to `main`. All work must occur in dedicated feature or fix branches branched off the latest `origin/main`.

### 1.1 Branch Naming Taxonomy
| Branch Type | Format | Example | Purpose |
| :--- | :--- | :--- | :--- |
| **Feature** | `feat/<short-description>` | `feat/time-range-picker` | New UI capabilities, API endpoints, or services |
| **Bugfix** | `fix/<bug-description>` | `fix/dining-shadow-artifact` | Targeted fixes for defects or rendering anomalies |
| **Refactor** | `refactor/<scope>` | `refactor/debloat-post-screen` | Code reorganization without functional changes |
| **Documentation**| `docs/<topic>` | `docs/multi-dev-workflow` | Documentation, guides, or comment additions |
| **Chores / Tests**| `chore/<task>` or `test/<scope>` | `test/starfield-density` | Dependency updates, tooling, or test additions |

### 1.2 Branch Lifecycle
1. **Sync with Main**:
   ```bash
   git checkout main
   git pull origin main
   ```
2. **Create Feature Branch**:
   ```bash
   git checkout -b feat/my-feature-name
   ```
3. **Rebase Frequently** (at least daily, or before testing):
   ```bash
   git fetch origin
   git rebase origin/main
   ```

---

## 2. Preventing & Resolving Merge Collisions

When 2–3 developers write code simultaneously, certain files are high-risk collision zones:
1. `client/src/constants/version.ts` and `client/package.json`
2. Monolithic screen files (e.g. `client/src/app/(tabs)/post.tsx`)
3. Generated seed data (`client/src/data/calvin-events-seed.ts`)
4. Lockfiles (`client/package-lock.json` and `server/package-lock.json`)

### 2.1 The Version Collision Protocol
Knightly enforces semantic versioning (`v.0.#.#`). To avoid constant merge conflicts on the version line:
- **Do not bump the version on every minor commit on your feature branch.**
- Keep your local branch at the current baseline during active development.
- **Increment the version only once**, right before opening your Pull Request or executing the final commit of the feature.
- **If `main` moved forward while you were working**:
  ```bash
  git fetch origin
  git rebase origin/main
  ```
  If git flags a conflict in `version.ts`:
  1. Inspect the version on `main` (e.g. `0.4.0`).
  2. If your branch introduces a new feature, increment the center digit above `main` (e.g. `0.5.0`).
  3. If your branch is a bugfix, increment the last digit above `main` (e.g. `0.4.1`).
  4. Synchronize `APP_VERSION` in `version.ts` and `version` in `client/package.json`.
  5. Stage and continue rebase: `git add client/src/constants/version.ts client/package.json && git rebase --continue`.

### 2.2 Component Modularization (The Anti-Monolith Rule)
To prevent developers from colliding in the same file:
- **Never write monolithic 1000-line screen files.**
- If you are adding a major UI section (e.g. Date/Time picker, Follow Button, Guidance Modal):
  1. Extract it into its own focused component file under `client/src/components/` (e.g. `post-date-time-section.tsx`, `masked-time-input.tsx`).
  2. Import the modular component into the screen.
- This ensures Developer A working on the banner selector and Developer B working on date/time inputs modify completely separate files, producing 0 git conflicts.

### 2.3 Dependency Management & Package Lockfiles
- When installing packages in the client, **always use Expo's version-pinned installer**:
  ```bash
  cd client
  npx expo install <package-name>
  ```
  *Why*: Prevents mismatched native library versions that break React Native 0.86 / Expo SDK 57 native builds.
- Never manually resolve `package-lock.json` conflict blocks by hand. Instead:
  ```bash
  git checkout --theirs package-lock.json
  npm install
  git add package-lock.json
  ```

---

## 3. Seed Data & Offline Fallback Coordination (Sprint 1 SLO SC2)

Knightly has a strict requirement: **The application must never crash when the local backend server is offline.**

- **Shared Fallback Dataset**: `client/src/data/calvin-events-seed.ts` contains pre-scraped events that feed the client when `GET /api/events` cannot be reached.
- **Syncing Live Data**: If you run `node server/scripts/sync-calvin-events.js`, it scrapes live events and updates `calvin-events-seed.ts`.
- **Merge Hygiene**: If multiple developers update seed data, prefer the newer scrape or re-run `node server/scripts/sync-calvin-events.js` after rebasing onto `main`.

---

## 4. Server-Authoritative Database & API Protocols

When multiple developers interact with Supabase or the Express backend:

### 4.1 Server-Authoritative Timestamps (Non-Negotiable)
- All post creation timestamps (`postedAt` ISO 8601 string and `createdAt` UTC epoch milliseconds) **must be stamped by the server clock**, never trusted from the client request body.
- *Reason*: If Developer A implements client-side timestamps and Developer B implements server-side timestamps, feed ordering becomes inconsistent and vulnerable to client device clock tampering.

### 4.2 API Contract First
- Before changing an endpoint in `server/server.js` or `server/services/`, update [docs/api.md](file:///C:/Users/cjsta/Desktop/-/Knightly/docs/api.md) so teammates know what payload format to expect.
- Ensure both light and dark mode colors are supported in client feeds when introducing new data fields.

---

## 5. Pre-Merge Verification Checklist

Before pushing your branch or submitting a pull request to `main`, run this 3-step checklist:

```bash
# Step 1: Run client test suite (all tests must pass)
npm --prefix client test

# Step 2: Run server test suite (all tests must pass)
npm --prefix server test

# Step 3: Verify TypeScript compiler diagnostics (must be 0 errors)
npx --prefix client tsc --noEmit
```

If all 3 pass, your branch is safe, robust, and guaranteed not to break teammates' work.
