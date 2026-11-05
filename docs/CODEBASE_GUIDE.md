# Knightly Codebase Guide

A plain-English map of the current implementation for contributors who need to find a feature, understand its data flow, or change it safely.

**Reviewed:** November 5, 2026. **Application version:** `0.8.4` (unreleased). This guide describes the working tree, including shared header fading and the latest code cleanup. Source files are the authority when implementation and older documentation disagree.

## Table of Contents

1. [What is Knightly?](#1-what-is-knightly)
2. [Project structure](#2-project-structure)
3. [Startup and providers](#3-startup-and-providers)
4. [Authentication and directory consent](#4-authentication-and-directory-consent)
5. [Login animation](#5-login-animation)
6. [Tabs, phantom pages, and headers](#6-tabs-phantom-pages-and-headers)
7. [Campus feed](#7-campus-feed)
8. [Post cards](#8-post-cards)
9. [Feed data and filtering](#9-feed-data-and-filtering)
10. [Feed state and publishing](#10-feed-state-and-publishing)
11. [Calvin events pipeline](#11-calvin-events-pipeline)
12. [Club following](#12-club-following)
13. [Club claims and publishing access](#13-club-claims-and-publishing-access)
14. [Post composer](#14-post-composer)
15. [Preset banners and image fingerprints](#15-preset-banners-and-image-fingerprints)
16. [Backend and database](#16-backend-and-database)
17. [Design system and shared templates](#17-design-system-and-shared-templates)
18. [Context reference](#18-context-reference)
19. [Utilities and rendering performance](#19-utilities-and-rendering-performance)
20. [Dining, digital ID, safety, and directory](#20-dining-digital-id-safety-and-directory)
21. [Offline behavior and current limits](#21-offline-behavior-and-current-limits)
22. [Development and verification](#22-development-and-verification)

## 1. What is Knightly?

Knightly is Calvin University's mobile-first campus life application for iOS, Android, and web. Students can browse announcements, discover and follow clubs, save posts, check dining information, display their digital ID, find safety contacts and the campus map, and browse the people directory. Accounts with linked clubs can open the Post composer.

The repository now contains a database-backed application with offline seed fallbacks, rather than only a client demo and event scraper. Authentication and some feature flows still have prototype behavior; see [current limits](#21-offline-behavior-and-current-limits).

| Layer | Current implementation | Responsibility |
| --- | --- | --- |
| Client | Expo SDK 58, React Native 0.88, React 19.3, TypeScript 6 | Screens, state, API adapters, offline presentation |
| Navigation and motion | Expo Router, Gesture Handler 3.3, Reanimated 4.7 | Routes, native pager, phantom pages, animation |
| Server | Node.js, Express 4 | REST endpoints, validation, scraper orchestration |
| Business and storage | Injectable services, Supabase/PostgreSQL DAL | Publishing, claims, dining rules, persistence |

Use [client/package.json](../client/package.json) for application dependencies. The root package has its own development dependencies and is not the authority for the client's Expo SDK.

## 2. Project structure

```text
Knightly/
  AGENTS.md                     Contributor rules and domain invariants
  CHANGELOG.md                  Unreleased and released changes
  package.json                  Combined development/test commands
  scripts/dev.js                Starts backend and Expo together
  client/
    AGENTS.md                   Additional client instructions
    package.json                App version, dependencies, commands
    tsconfig.json               Strict typing and unused-code checks
    test-setup.js               Unit-test environment setup
    playwright.config.ts        Separate browser-test configuration
    src/
      app/                      Expo Router routes and layouts
        _layout.tsx             Providers, login gate, global dialogs
        (tabs)/                 Feed, dining, safety, directory, post
        clubs/                  Standalone list/detail routes
        card.tsx                Full-screen student ID
        campus-map.tsx          Web/direct-link map route
        complete-club-profile.tsx
        dining-history.tsx      Redirects to /dining
        login.tsx
        +native-intent.ts        Filters external native intent returns
      components/               Feature views and reusable components
        app-tabs.tsx            Native swipe pager and phantom pages
        app-tabs.web.tsx        Web sidebar/mobile navigation
        ui/                     Shared screen/input/modal/header templates
      constants/                Theme, motion, tabs, banners, stars, version
      context/                  Account, feed, clubs, navigation, gestures
      data/                     Built-in data and bundled campus map
      hooks/                    Composer, phantom page, scroll, clock, layout
      services/                 API clients and request deadlines
      utils/                    Formatting, adapters, animation calculations
    tests/                      Unit, invariant, lifecycle, journey tests
  server/
    server.js                   Express routes and startup
    .env.example                Backend environment template
    dal/                        Supabase queries and client factory
    services/                   Business rules, scraper, category/image mapping
    db/migrations/              Schema, triggers, RLS, grants
    db/seeds/                   Database test seed
    scripts/                    Event snapshot refresh and DB connectivity check
    __tests__/                  Node tests, injected mock DAL, fixtures
  supabase/                     Supabase CLI configuration/migration artifacts
  docs/                         Architecture, API, database, workflow guides
```

Routes choose screens; components render features; contexts coordinate shared state; API services perform requests; adapters translate server records. Avoid copying business rules into screen JSX.

## 3. Startup and providers

[app/_layout.tsx](../client/src/app/_layout.tsx) wraps the app in this order:

```text
GestureHandlerRootView
  ThemeProvider
    AuthProvider
      ClubFollowProvider
        ClubLeadershipProvider
          FeedProvider
            RootNavigator
```

This lets club/feed providers read account state and publishing update follows. `RootNavigator` renders the Expo Router stack when `isAppMounted` is true and shows `LoginScreen` while `isAuthenticated` is false. Separate flags allow the app to mount behind the login animation before the login surface disappears.

The root also owns `ClaimClubModal` and `DirectoryOnboardingModal`. Stack screens include the tab group, digital ID, campus map, clubs list/detail, profile setup, and login. Native subpages can instead render within the pager.

`setupUniversalWebSmoothFocus()` is installed at startup and cleaned up on unmount. `+native-intent.ts` protects navigation when external activities such as image picking return to Android.

## 4. Authentication and directory consent

[auth-context.tsx](../client/src/context/auth-context.tsx) exposes `useAuth()`, user identity, sign-in/out, mount state, and directory privacy preferences.

Sign-in validates nonempty username/password and rejects numeric-only usernames. It immediately builds a provisional profile with a stable seven-digit ID derived from the username, then calls `fetchStudentProfile()` to reconcile with the backend. This is **prototype sign-in, not password verification or completed university SSO**.

`AuthUser` includes identity plus optional student ID, barcode, minor, residence, advisor, and directory privacy fields. The backend can look up/provision a profile by username. A provisional ID can be replaced by a database UUID, so `user.id` is not always a card number.

Directory preferences default to private. If the fetched profile has not been prompted, the root opens `DirectoryOnboardingModal`. Saving preferences optimistically updates local state and calls `/api/student/directory-preference`. Dismissing and saving are distinct operations; failed network writes do not establish durable persistence.

Sign-out clears authentication, app mount state, active user, and directory prompt.

## 5. Login animation

[login-screen.tsx](../client/src/components/login-screen.tsx) coordinates the maroon surface, password masking, keyboard positioning, and transition into the app. [header-docking.ts](../client/src/utils/header-docking.ts) calculates destination geometry; [motion.ts](../client/src/constants/motion.ts) defines shared header motion.

The destination wordmark is measured in the actual header/sidebar. During the final glide the animation crossfades into exact-size destination text, avoiding an abrupt end-of-flight swap. Native docking accounts for safe areas and header geometry; desktop web docks into the sidebar. The small version label comes from `constants/version.ts`.

Inspect the login surface, shared header geometry, and docking calculations together when changing this transition.

## 6. Tabs, phantom pages, and headers

### Native navigation

[app-tabs.tsx](../client/src/components/app-tabs.tsx) owns a Reanimated horizontal track. Regular tabs are Feed (`/`), Dining, Safety, and Directory; linked-club accounts receive Post. Tab buttons and swipes synchronize the active tab with Expo Router.

The pager initially renders current/adjacent screens and retains visited screens. It handles drag resistance, interrupted animations, foreground recovery, and accessibility hiding for inactive/blank pages. `TabPagerPriorityContext` lets an inner horizontal control or cropper claim a gesture before the parent pager.

A **phantom page** temporarily occupies an adjacent slot for a child view, preserving the continuous background and swipe-back motion. It is not another ordinary tab.

| Phantom page | Parent | Physical slot | Return slot |
| --- | --- | --- | --- |
| Campus Clubs | Feed | 1 | 0 |
| Complete Club Profile | Feed flow | 1 | 0 |
| Club Detail | Campus Clubs | 2 | 1 |
| Dining Activity | Dining | 2 | 1 |
| Campus Map | Safety | 3 | 2 |

Profile setup also handles entry from the clubs banner, where returning can stay in Clubs. [phantom-tabs.ts](../client/src/constants/phantom-tabs.ts) defines metadata and trailing-slot blanking. Logical navigation state and render-persistence flags differ so departing pages stay mounted until their return animation finishes.

Campus Map uses [use-phantom-page.ts](../client/src/hooks/use-phantom-page.ts) and [phantom-page.ts](../client/src/utils/phantom-page.ts) for lifecycle/gesture decisions. Only its header accepts pager back-swipes; map-body gestures remain available for pan/zoom. Header Back and Android Back return to Safety. See [CAMPUS_MAP_PHANTOM.md](CAMPUS_MAP_PHANTOM.md).

### Web navigation

[app-tabs.web.tsx](../client/src/components/app-tabs.web.tsx) is selected automatically on web. Wider layouts use a collapsible sidebar; narrow layouts use a shared header and bottom navigation. Web club navigation uses routes/history rather than the native phantom implementation. Standalone club/setup/map routes remain available for web and direct links.

### Shared headers

`AppHeader` renders titles and controls, `SwipeableAppHeader` adds a gesture surface, and `HeaderOverlay` reserves content space and overlays the header.

The native pager has **one stationary shared header outside the horizontal track**. Its title, subtitle, and controls change with the destination; the surface does not slide with pages.

All `HeaderOverlay` consumers inherit scroll fading by default, including standalone pages and narrow web tabs. Shared screen templates report vertical offsets through `useScreenScrollHandler()`. A non-scrolling view such as the map does not fade the header merely because the map is dragged. Desktop sidebar chrome is separate.

Current behavior in [header-scroll.ts](../client/src/utils/header-scroll.ts) and [header-overlay.tsx](../client/src/components/ui/header-overlay.tsx):

- Native: 64 logical pixels of downward grace, then a 160-pixel fade.
- Web overlay: 192 pixels of grace, then a 1,000-pixel fade.
- Twenty pixels upward restores visibility; approaching the top also restores it.
- Downward opacity follows scroll directly; upward reveal uses shared timing, lift, and scale.
- Hidden controls allow touch-through. Navigation keys reset visibility.

## 7. Campus feed

Start at [app/(tabs)/index.tsx](../client/src/app/(tabs)/index.tsx), which owns the routed feed's filtering and responsive rendering. Related extracted views and controls live in `feed-mobile-view.tsx`, `feed-web-view.tsx`, and `feed-controls.tsx`; inspect callers before assuming all feed rendering delegates to them.

The feed combines text search, Following / All Campus / Saved scopes, category selection, and newest-first ordering. Deferred filter/query values keep inputs responsive. Following includes followed organizations and campus-wide posts; Saved is personal bookmarking, not a public like count.

Native and narrow web use `ScreenFlatList` with a bounded render window. Wider layouts use responsive rows/grids. Row keys derive from post IDs so filtering does not reuse unrelated content under index-only keys. Prefer shared feed helpers over per-screen duplicate filtering.

## 8. Post cards

[post-card.tsx](../client/src/components/post-card.tsx) contains memoized cards, organization badges, image/banner rendering, logistics, and timestamp/bookmark presentation. Organization controls use the navigation context or route fallback to open club detail.

Image-backed cards can overlay an organization badge; cards without images use an inline strip. Preset URIs resolve through the banner system rather than remote URLs. Image caching/recycling and memoized banner details reduce list work.

Relative timestamps use `useRelativeClock()` and one shared clock. Timestamp and save-control updates are isolated so the whole card need not update every tick.

## 9. Feed data and filtering

[data/feed.ts](../client/src/data/feed.ts) defines `Post`, sample posts, and central feed helpers:

| Helper | Purpose |
| --- | --- |
| `getPostTimestamp()` | Resolves a sortable timestamp |
| `sortPostsByDate()` | Returns newest-first posts without mutating input |
| `forYouPosts()` | Applies followed/campus-wide inclusion |
| `searchPosts()` | Searches text and metadata |
| `getPostsByClubId()` | Selects an organization's posts |
| `resolveFeedColumnCount()` | Chooses responsive columns |
| `filterFeedPosts()` | Combines scope, categories, query, saved IDs |

A `Post` contains identity, organization, category, publication time, headline/body, optional logistics/image, followed/campus-wide flags, and optional branding. `postedAt` is a string; optional `createdAt` is epoch milliseconds. Optimistic posts can carry a monotonic session timestamp.

The fixed taxonomy is **Academics, Athletics, Career, Culture, Faith, Gaming, Music, Official, Outdoors, Service, Social, The Arts, Wellness**. Client types and server mapping must agree; never add a category in only one layer.

## 10. Feed state and publishing

[feed-context.tsx](../client/src/context/feed-context.tsx) exposes `useFeed()` and coordinates posts, bookmarks, locally authored records, and the unified posts API.

1. Initial state combines browser-cached authored posts, built-in sample posts, and the first 15 adapted Calvin seed events.
2. The provider calls `fetchFeedPosts()` in `posts-api.ts` to read `/api/posts`. This is the main live feed path; it no longer calls `fetchCampusEvents()` directly.
3. Successful refresh retains pending `p-local-` records and replaces the other feed records with database posts. Offline fallback returns the existing array to avoid rearranging/re-timestamping visible cards.
4. `createPost()` trims input, builds an optimistic post, follows its organization if needed, caches an authored copy where browser storage exists, and inserts it immediately.
5. `createPostApi()` sends content and author identity without client creation timestamps. A successful response replaces optimistic identity/timestamps in state and cache.
6. `deletePost()` removes the local record and sends a backend delete request.

Optimistic timestamps support immediate/offline display. **Persisted publication timestamps come from the server**; server publishing ignores client creation dates. Offline creation attempts a network write at creation time; there is no general durable retry queue.

Saved IDs use account-scoped browser storage, an in-memory cache, and `Set` lookups. `favoritePosts`, `toggleFavorite`, and `isFavorite` remain compatibility aliases. The authored-post cache uses a separate shared browser key; it is not account-scoped native durable storage.

## 11. Calvin events pipeline

```text
Calvin events HTML
  -> event-scraper.js (native HTTP, HTML parsing, memory cache)
  -> category-mapper.js and image-fingerprint.js
  -> feed-service.syncScrapedEvents()
  -> posts DAL / Supabase posts table
  -> GET /api/posts
  -> post-database-adapter.ts
  -> FeedProvider and PostCard
```

[event-scraper.js](../server/services/event-scraper.js) has a 30-minute memory cache and returns cached results or an empty list on fetch failure. Category mapping handles source labels and text signals. Known generic Drupal images receive banner fallbacks while custom photos remain untouched.

`syncScrapedEvents()` upserts by external event identity to prevent duplicates. The server attempts an initial three-page sync on startup when `SUPABASE_URL` is configured. `POST /api/events/sync` also imports events; `server.js` does not run a recurring sync scheduler.

The separate `GET /api/events` endpoint returns scraped events directly. [events-api.ts](../client/src/services/events-api.ts) retains `fetchCampusEvents()` with a two-second deadline and seed fallback. [calvin-event-adapter.ts](../client/src/utils/calvin-event-adapter.ts) converts scraped/seed events; database rows use `post-database-adapter.ts` instead.

Refresh the bundled snapshot explicitly with `node server/scripts/sync-calvin-events.js`. It fetches current events and writes the client seed file, so it is not part of normal unit testing.

## 12. Club following

[club-follow-context.tsx](../client/src/context/club-follow-context.tsx) stores followed IDs in a `Set` and exposes `isFollowing`, `followClub`, `unfollowClub`, and `toggleFollow`. Seven default campus organizations seed the first render.

On account changes it fetches server follows and merges them into state. Follow/unfollow actions update the UI immediately and send background requests through `clubs-api.ts`. Queried IDs are normalized; redundant server merges avoid unnecessary state changes.

The current provider does not use a durable local follow-storage helper. Do not infer offline follow persistence from older changelog entries or treat optimistic updates as a queued synchronization system.

## 13. Club claims and publishing access

[club-leadership-context.tsx](../client/src/context/club-leadership-context.tsx) manages linked club IDs, active publishing club, claim dialog/setup state, account-scoped linked-club/banner-dismissal storage, and in-memory profile overrides.

`isLeader` is the UI shorthand for linked-club access. The database represents that access through **club memberships**, not a separate club-leader student role. Global student roles and club publishing memberships are different concepts.

The claim flow checks bundled code records locally, updates UI/storage, and calls `claimClubApi()` in the background. That API can verify against the backend and has an offline code fallback. The backend `clubs-service.js` implements normalized, salted SHA-256 verification with expiration/redemption checks. An optimistic client claim does not prove server acceptance or persistence.

`startClaimSetup()`, `cancelClaimSetup()`, and `completeClaimSetup()` drive profile setup. `updateClubProfile()` merges in-memory overrides; there is no corresponding persisted club-profile update endpoint. `unlinkClub()` updates local linked state/storage.

## 14. Post composer

[app/(tabs)/post.tsx](../client/src/app/(tabs)/post.tsx) is now a small coordinator: it creates `usePostComposer()`, checks linked-club access, and chooses `PostMobileView`, `PostWebView`, or `PostNotLeaderView`.

[use-post-composer.ts](../client/src/hooks/use-post-composer.ts) owns form state, validation, image picking/manipulation, date/time entry, cropping, preview, publishing, and success state. Shared sections live in `post-club-selector.tsx`, `post-banner-section.tsx`, `post-date-time-section.tsx`, and `post-form-sections.tsx`.

Current hook-exported limits are 50 characters for title, 280 for description, and 25 each for location and custom when text. Date/time rules come from `utils/date-format.ts`; masked-time and segmented-date components handle interactive entry.

`InlineImageCropper` is an in-page surface that coordinates gesture ownership with the pager, not a phantom page. Composer logic commits crop state when leaving its editing context/tab. The route re-exports several helpers/constants for compatibility with callers and tests.

Change shared validation in the hook and cross-cutting input behavior in templates so desktop preview and mobile form stay consistent.

## 15. Preset banners and image fingerprints

[constants/preset-banners.ts](../client/src/constants/preset-banners.ts) defines colors, patterns, and preset URI parsing/resolution. Keep identifiers stable because posts can store preset values as images.

Client [image-fingerprint.ts](../client/src/utils/image-fingerprint.ts) and server [image-fingerprint.js](../server/services/image-fingerprint.js) recognize known placeholders using exact canonical paths and fingerprint information. **A filename alone is insufficient**: custom content named `athletics.png` must remain untouched. Fixture and same-filename immunity tests protect this rule.

Simple generated SVG icons/banners must use direct shapes, without `<defs>` or `<use>`, to avoid native rendering/cache failures.

## 16. Backend and database

[server.js](../server/server.js) loads environment configuration, creates Express with CORS and a 50 MB JSON/form limit, registers routes, and exports the app. It listens on `PORT` (default 3000) only when invoked directly, allowing tests to import it without starting a server.

| Directory | Responsibility |
| --- | --- |
| `server/services/` | Profile/privacy rules, claims, publishing/ingestion, dining calculations, scraper/category/image helpers |
| `server/dal/` | Student, club, post, dining, safety, directory queries and Supabase client factory |
| `server/db/migrations/` | Schema, triggers, RLS policies, API grants |
| `server/__tests__/mocks/mock-dal.js` | In-memory injectable DAL for business-rule tests |

Read [DATABASE_DESIGN.md](DATABASE_DESIGN.md) alongside the actual migrations. `server/db/migrations/001_initial_schema.sql` currently declares 18 tables spanning students, club codes/memberships/follows, meal plans/accounts/venues/hours/stations/menu items/transactions, posts/saved posts, safety contacts/alerts, directory people, and audit logs. It includes dining ledger balance triggers and post-author constraints. The separate `supabase/` directory contains CLI artifacts; its initial migration is not the entire current application schema.

### Implemented HTTP surface

| Method | Path | Responsibility |
| --- | --- | --- |
| GET | `/health` | Server status response |
| GET | `/api/student` | Profile lookup/provisioning by username with fallback |
| POST | `/api/student/directory-preference` | Consent and field visibility |
| GET | `/api/dining/venues` | Venue information |
| GET | `/api/dining/summary` | Student account/meal-plan summary |
| POST | `/api/dining/transaction` | Validated ledger transaction |
| GET | `/api/clubs` | Club listing/filtering |
| POST | `/api/clubs/claim` | Claim-code redemption |
| GET | `/api/clubs/follows` | Student followed club IDs |
| POST / DELETE | `/api/clubs/follow` | Follow/unfollow |
| GET | `/api/clubs/memberships` | Student club memberships |
| GET | `/api/events` | Direct scraper results |
| POST | `/api/events/sync` | Import scraped events into posts |
| GET / POST | `/api/posts` | Read unified feed / publish |
| DELETE | `/api/posts/:id` | Delete post |
| GET | `/api/safety/contacts` | Safety contacts |

See [api.md](api.md) for contracts and verify handlers when extending them. A directory DAL exists, but `server.js` has no public people-directory listing route. `/health` reports a database status label without actively probing connectivity.

`dal/supabase-client.js` caches a default server client and supports token-scoped clients when Authorization is supplied. Missing tokens use the default client, which can use the service-role key. Schema RLS support does not mean the prototype has a completed end-to-end authenticated client flow.

## 17. Design system and shared templates

[theme.ts](../client/src/constants/theme.ts) owns brand/semantic colors, platform fonts, spacing, radii, content width, and navigation/header inset tokens. Consume tokens instead of adding raw brand hex values. `useTheme()` selects the palette.

| Template | Responsibility |
| --- | --- |
| `ui/screen.tsx` | `Screen`, `ScreenFlatList`, `ScreenScrollView`: content bounds, scroll reporting, keyboard and bottom spacing |
| `ui/header-overlay.tsx` | Initial inset, default fade/reveal, touch-through, navigation reset |
| `ui/app-header.tsx` | Masthead content/layout and height calculation |
| `ui/navigation-chrome.ts` | Header/bottom navigation geometry |
| `ui/modal-dialog.tsx` | Dialog surface, backdrop, keyboard avoidance, accessibility, standard sections |
| `ui/form-text-input.tsx` | Shared input styling/platform behavior |
| `ui/button.tsx`, `chip.tsx`, `segmented.tsx`, `search-field.tsx` | Consistent interactive controls |

Native headers extend to top/side edges, with internal safe-area padding, square top corners, and rounded bottom corners. Web overlays retain inset rounded surfaces. The native floating bottom bar keeps the home-indicator safe area outside its surface to balance its icons vertically.

Implement cross-cutting keyboard, backdrop, focus, caret, accessibility, and header behavior in templates. Leaf pages/dialogs should inherit it rather than adding custom modal windows or per-page keyboard listeners.

## 18. Context reference

Paths below are under `client/src/context/`.

| File | Shared state |
| --- | --- |
| `auth-context.tsx` | User, provisional sign-in, app mounting, directory preferences |
| `feed-context.tsx` | Posts, optimistic publishing/deletion, saved posts |
| `club-follow-context.tsx` | Followed IDs and optimistic actions |
| `club-leadership-context.tsx` | Linked clubs, publishing club, claim/setup state |
| `tab-navigation-context.tsx` | Active tab and programmatic navigation |
| `clubs-navigation-context.tsx` | Clubs directory/detail navigation |
| `dining-activity-context.tsx` | Activity open/close state |
| `campus-map-navigation-context.tsx` | Safety/map navigation abstraction |
| `tab-pager-priority-context.tsx` | Inner gesture priority over pager |
| `starfield-context.tsx` | Shared horizontal/vertical animation values |
| `image-cropper-context.tsx` | Cropper contracts/state; inspect callers for usage |

Global account/content providers belong to the root layout; pager-specific providers belong to platform tab layouts. `HeaderOverlay` also exposes its own inset and scroll channels through hooks in that module.

## 19. Utilities and rendering performance

| File or hook | Purpose |
| --- | --- |
| `utils/date-format.ts` | Date/time masks, completion, validation, event/relative formatting |
| `utils/post-database-adapter.ts` | Database row to client post |
| `utils/calvin-event-adapter.ts` | Direct scraped/seed event to post |
| `services/api-config.ts` | Cross-platform backend URL |
| `services/timed-fetch.ts` | Abort deadlines with unconditional timer cleanup |
| `utils/header-scroll.ts`, `header-docking.ts` | Fade-state and login destination calculations |
| `utils/phantom-page.ts`, `hooks/use-phantom-page.ts` | Lifecycle, gestures, interrupted transitions |
| `utils/image-crop.ts`, `numeric-input.ts`, `masked-password.ts` | Crop geometry, numeric filtering, password display |
| `utils/modal-keyboard.ts`, `smooth-input-focus.ts` | Shared keyboard/focus behavior |
| `utils/campus-map-html.ts` | Bundled map HTML and controls |
| `utils/starfield-layer.ts` | Cached SVG star layers |
| `utils/shared-clock.ts`, `hooks/use-relative-clock.ts` | Shared foreground-aware timestamp clock |
| `hooks/use-responsive-layout.ts` | Common breakpoint/layout decisions |
| `hooks/use-screen-scroll.ts` | Connects scrolling to header/starfield |

`ui/starfield.tsx` renders three cached image layers instead of a native View per star. Density remains 1.3 stars per 10,000 square pixels, depth ratio 5:3:1, and total count is capped at 1,800. Stable sizing avoids sky regeneration solely because the keyboard resizes the viewport.

Other performance changes include memoized cards, isolated timestamp/bookmark updates, banner caching/recycling, virtualization, stable keys, deferred unvisited screens, and preserved feed objects on offline refresh. Tests verify these behaviors; frame-time, memory, and battery gains still require device profiling. [PERFORMANCE.md](PERFORMANCE.md) records the earlier pass; its News-only fade wording predates the all-overlay default.

## 20. Dining, digital ID, safety, and directory

### Dining and ID

`app/(tabs)/dining.tsx` selects `DiningMobileView` or `DiningWebView`. Shared card/venue/statistics components use `dining-api.ts` for live venue/account data with built-in fallback. Backend summary and transaction operations exist; `dining-activity.tsx` still reads sample transactions/totals from `data/dining.ts`.

`app/card.tsx` displays the **student digital ID**, not an expanded feed post. It derives identity/barcode from the profile with fallback data, boosts native brightness for scanning, and restores brightness on exit/backgrounding. `app/dining-history.tsx` redirects to Dining; native activity is a phantom page.

Server rules distinguish weekly Core and semester block plans, validate balances/tender, and write ledger transactions. The implemented weekly boundary is **Sunday 00:00 UTC**, with tests immediately before, at, and after reset. Campus-local timezone policy remains unconfirmed; do not call this a local-midnight reset.

### Safety and map

Safety uses mobile/web views and shared sections for contacts and map entry. Bundled `data/campus-map-svg.ts` feeds `campus-map-content.tsx` and map HTML generation. Native uses an inline restricted `WebView`; web uses a sandboxed iframe with `srcDoc`. Pan/zoom needs no external map website. Native viewer failures show a readable message and support reopening.

### People directory

`app/(tabs)/directory.tsx` searches/filters bundled `data/directory.ts`, renders responsive cards, and opens email through `mailto:`. Privacy preference writes are backend-connected, but the directory screen still uses built-in people rather than a live listing API.

Other built-in data includes clubs, claim codes, the sample student, safety, dining, sample posts, and refreshable Calvin event snapshots. These support offline use without implying that every feature is mock-only.

## 21. Offline behavior and current limits

API clients catch expected network failures and return seed/current data or explicit failure results. `createTimedFetch()` always clears deadlines in `finally`; operation timeouts differ (direct events: two seconds, unified feed: five, post creation: eight).

Backend URL selection prioritizes `EXPO_PUBLIC_API_URL`. Tests otherwise use a dedicated offline loopback address; web uses the current hostname on port 3000; native tries the Expo workstation host; Android can fall back to `10.0.2.2`; remaining cases use localhost. An explicit URL override should include `/api`.

| Feature | Current offline behavior | Persistence boundary |
| --- | --- | --- |
| Feed reads | Retains existing feed or built-in posts/events | No automatic refresh queue |
| New posts | Optimistic records | Browser authored cache; native memory without general durable storage |
| Saved posts | Account-scoped memory/browser IDs | Database table exists, but bookmark actions use local storage |
| Follows | Defaults/current Set | Background writes; no durable offline follow queue |
| Claims | Bundled codes and linked state | Browser/account memory; server acceptance is separate |
| Dining | Built-in venues and plan fallback | Activity remains sample-based |
| Directory | Bundled people | Consent writes optimistic; no live listing route |
| Map | Bundled SVG/HTML | No map-tile dependency |

Offline resilience is not a complete synchronization engine. Prototype sign-in does not verify passwords or establish a Supabase session. Client identity and optimistic access flags do not replace server authorization. Passing tests do not establish production readiness or live database connectivity.

## 22. Development and verification

### Local setup

From the repository root:

```sh
npm run install:all
npm run dev
```

The combined runner starts Express and Expo. Alternatively run `node server/server.js` and `npm --prefix client start` in separate terminals. Client platform scripts are `npm --prefix client run android`, `ios`, and `web`.

Copy [server/.env.example](../server/.env.example) to an untracked `server/.env` and supply `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for database-backed work. `PORT` defaults to 3000. Keep the service-role secret on the server. Explicit connectivity checking is available through `node server/scripts/test-db-connection.js`; schema setup requires reviewing the migrations and target database.

### Required checks

```sh
npm --prefix client test
npm --prefix server test
npx --prefix client tsc --noEmit
# Equivalent client typecheck script:
npm --prefix client run typecheck
```

Client tests use `tsx` with Node's test runner and `test-setup.js`. Server tests use Node's runner and mock/injected DALs. TypeScript is strict and now checks unused locals/parameters. The verified snapshot is **1,111 client tests, 48 server tests, zero TypeScript errors**; these counts describe this review, not a fixed requirement for future changes.

Coverage includes feed/filter behavior, date/time inputs, image fingerprints, claims, dining reset boundaries, header animation/docking, navigation/phantom lifecycles, offline fallback, timers/rendering, and account privacy. Many journey tests are simulations/invariant checks rather than physical-device UI tests.

`client/playwright.config.ts` is a separate browser configuration targeting Expo web on port 8081. Normal client tests do not invoke it; inspect dependencies and matching test files before treating it as an available passing browser suite.

### Where to change things

| Task | Start here |
| --- | --- |
| Startup, auth gate, global dialogs | `client/src/app/_layout.tsx` |
| User/profile/consent state | `client/src/context/auth-context.tsx` |
| Native tab/phantom gestures | `client/src/components/app-tabs.tsx`, `constants/phantom-tabs.ts` |
| Web sidebar/navigation | `client/src/components/app-tabs.web.tsx` |
| Header fade/login handoff | `components/ui/header-overlay.tsx`, `utils/header-scroll.ts`, `utils/header-docking.ts` |
| Routed feed and filtering | `client/src/app/(tabs)/index.tsx`, `client/src/data/feed.ts` |
| Feed sync/publishing/bookmarks | `client/src/context/feed-context.tsx`, `services/posts-api.ts` |
| Composer validation/image picking | `client/src/hooks/use-post-composer.ts` |
| Shared input/modal/keyboard behavior | `client/src/components/ui/` |
| API/business/query changes | `server/server.js`, `server/services/`, `server/dal/` |
| Schema, RLS, grants | `server/db/migrations/` |
| Theme/navigation geometry | `client/src/constants/theme.ts`, `components/ui/navigation-chrome.ts` |
| Version/package parity | `client/src/constants/version.ts`, `client/package.json` |
| Event snapshot refresh | `node server/scripts/sync-calvin-events.js` |

Follow [AGENTS.md](../AGENTS.md) and [CodingStandard.md](CodingStandard.md). Use a dedicated feature/fix branch, preserve collaborators' edits, consolidate shared behavior in templates, and update [CHANGELOG.md](../CHANGELOG.md). On commit/PR, calculate one version increment relative to latest main and keep client constants/package versions in parity.

Further reading: [ARCHITECTURE.md](ARCHITECTURE.md), [DATABASE_DESIGN.md](DATABASE_DESIGN.md), [api.md](api.md), [MULTI_DEV_WORKFLOW.md](MULTI_DEV_WORKFLOW.md), and [CAMPUS_MAP_PHANTOM.md](CAMPUS_MAP_PHANTOM.md). Links are repository-relative; copied line numbers/full implementations are avoided because they become stale as code moves.
