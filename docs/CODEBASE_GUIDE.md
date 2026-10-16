# Knightly Codebase Guide

> A comprehensive, plain-English walkthrough of every major file, function, and concept in the Knightly app. Written for someone who didn't write the code and wants to understand it fully.

---

## Table of Contents

1. [What is Knightly?](#1-what-is-knightly)
2. [Project Structure Overview](#2-project-structure-overview)
3. [How the App Starts Up — Root Layout](#3-how-the-app-starts-up--root-layout)
4. [Authentication — Login Flow Deep Dive](#4-authentication--login-flow-deep-dive)
5. [The Login Screen — Animation & UI](#5-the-login-screen--animation--ui)
6. [The Tab Bar — Navigating Between Screens](#6-the-tab-bar--navigating-between-screens)
7. [The Campus Feed — Home Screen Deep Dive](#7-the-campus-feed--home-screen-deep-dive)
8. [The Post Card — How a Single Post is Rendered](#8-the-post-card--how-a-single-post-is-rendered)
9. [The Feed Data & Filtering Functions](#9-the-feed-data--filtering-functions)
10. [The Feed Context — Live State Management](#10-the-feed-context--live-state-management)
11. [The Events Pipeline — From Calvin's Website to Your Feed](#11-the-events-pipeline--from-calvins-website-to-your-feed)
12. [Club Following System](#12-club-following-system)
13. [Club Leadership & the "Post" Tab](#13-club-leadership--the-post-tab)
14. [Create Post Screen — The Composer](#14-create-post-screen--the-composer)
15. [Preset Banners — The Visual Fallback System](#15-preset-banners--the-visual-fallback-system)
16. [The Backend Server](#16-the-backend-server)
17. [Design System — Colors, Fonts, and Spacing](#17-design-system--colors-fonts-and-spacing)
18. [Global Context Providers — The "State Brain"](#18-global-context-providers--the-state-brain)
19. [Key Utility Functions](#19-key-utility-functions)
20. [Built-In Data Files](#20-built-in-data-files)
21. [Offline Resilience — What Happens Without the Server](#21-offline-resilience--what-happens-without-the-server)
22. [Quick Reference: Where Is X?](#22-quick-reference-where-is-x)

---

## 1. What is Knightly?

Knightly is a **mobile-first campus life super-app** for Calvin University students built with React Native and Expo. It runs on:
- **iOS** (native app)
- **Android** (native app)
- **Web browser** (same codebase, different layout)

The app has two completely separate codebases that work together:

| Part | Location | Technology | Purpose |
|------|----------|-----------|---------|
| **Client** | `client/` | React Native + Expo | The phone/browser app that users see and touch |
| **Server** | `server/` | Node.js + Express | A backend that scrapes Calvin's event website and serves data via REST API |

The key idea: the client **tries** to get live data from the server, but if the server is offline or slow, it silently falls back to pre-saved "seed" data so the app never crashes.

---

## 2. Project Structure Overview

Understanding the folder structure is the first step to navigating the code:

```
knightly/
├── client/                         ← The React Native mobile/web app
│   ├── src/
│   │   ├── app/                    ← SCREENS: Each file here = one page/route
│   │   │   ├── _layout.tsx         ← ROOT: Wraps the entire app, sets up providers & auth gate
│   │   │   ├── login.tsx           ← Login route (mostly delegates to LoginScreen component)
│   │   │   ├── card.tsx            ← Full-screen post card view (modal)
│   │   │   ├── complete-club-profile.tsx ← Club setup flow after claiming with a code
│   │   │   ├── dining-history.tsx  ← Dining transaction history
│   │   │   ├── +native-intent.ts   ← Android OS intent filter (prevents spurious root drops)
│   │   │   ├── (tabs)/             ← All bottom-tab screens (parentheses = group, no URL impact)
│   │   │   │   ├── _layout.tsx     ← Tab group layout (delegates to AppTabs component)
│   │   │   │   ├── index.tsx       ← HOME: Campus Feed (Tab 0)
│   │   │   │   ├── dining.tsx      ← Dining Hall status (Tab 1)
│   │   │   │   ├── safety.tsx      ← Campus Safety contacts (Tab 2)
│   │   │   │   ├── directory.tsx   ← Campus Directory (Tab 3)
│   │   │   │   └── post.tsx        ← Create Post composer (Tab 4, leaders only)
│   │   │   └── clubs/              ← Club sub-pages (outside tab bar)
│   │   │       ├── index.tsx       ← Clubs directory listing
│   │   │       └── [id].tsx        ← Dynamic club detail page (e.g. /clubs/acm)
│   │   ├── components/             ← Reusable UI building blocks
│   │   │   ├── post-card.tsx       ← The main feed post card component
│   │   │   ├── login-screen.tsx    ← The full login screen with animations
│   │   │   ├── club-detail-view.tsx ← Club profile page content
│   │   │   ├── clubs-directory-view.tsx ← The browseable clubs list
│   │   │   ├── post-date-time-section.tsx ← Date/time inputs for Create Post
│   │   │   ├── post-banner-section.tsx    ← Image + preset banner picker for Create Post
│   │   │   ├── post-club-selector.tsx     ← Club selector dropdown for Create Post
│   │   │   ├── claim-club-modal.tsx       ← Modal for entering a leadership code
│   │   │   └── ui/                        ← Primitive UI components (Button, Card, Badge, etc.)
│   │   ├── constants/              ← App-wide configuration values
│   │   │   ├── theme.ts            ← ALL colors, fonts, spacing — the design system
│   │   │   ├── preset-banners.ts   ← The 16 colors × 16 patterns banner system
│   │   │   ├── starfield.ts        ← Star density math for the animated background
│   │   │   ├── phantom-tabs.ts     ← Tab definitions (names, icons, hrefs)
│   │   │   ├── tab-headers.tsx     ← Header content per tab
│   │   │   └── version.ts          ← APP_VERSION constant (e.g. "0.3.0")
│   │   ├── context/                ← Global shared state (React Context providers)
│   │   │   ├── auth-context.tsx    ← Who is logged in?
│   │   │   ├── feed-context.tsx    ← All posts in the feed, createPost, deletePost
│   │   │   ├── club-follow-context.tsx    ← Which clubs the user follows
│   │   │   ├── club-leadership-context.tsx ← Which clubs the user leads
│   │   │   ├── clubs-navigation-context.tsx ← Cross-screen navigation to clubs directory
│   │   │   ├── starfield-context.tsx       ← Shared canvas dimensions for the starfield
│   │   │   ├── tab-navigation-context.tsx  ← Active tab index, used for crop auto-commit
│   │   │   ├── tab-pager-priority-context.tsx ← Gesture priority for horizontal tab swiping
│   │   │   ├── dining-activity-context.tsx ← Dining swipe animation state
│   │   │   └── image-cropper-context.tsx   ← Shared image crop state
│   │   ├── data/                   ← Built-in hardcoded data (always available offline)
│   │   │   ├── feed.ts             ← Post type, 17 sample posts, all filter functions
│   │   │   ├── clubs.ts            ← Full CALVIN_CLUBS array
│   │   │   ├── club-codes.ts       ← Valid leadership claim codes
│   │   │   ├── calvin-events-seed.ts ← ~50 pre-scraped Calvin events for offline fallback
│   │   │   ├── dining.ts           ← Dining hall menus and hours
│   │   │   ├── directory.ts        ← Campus directory entries
│   │   │   ├── safety.ts           ← Emergency contact numbers
│   │   │   └── student.ts          ← The default "John Mark Doe" demo profile
│   │   ├── hooks/                  ← Custom React hooks (reusable stateful logic)
│   │   │   ├── use-theme.ts        ← Returns the current light/dark color palette
│   │   │   ├── use-color-scheme.ts ← Detects system light/dark preference (native)
│   │   │   └── use-color-scheme.web.ts ← Same, but for web browsers
│   │   ├── services/               ← External API calls
│   │   │   └── events-api.ts       ← Fetches live events from the backend server
│   │   └── utils/                  ← Pure helper functions (no React, no state)
│   │       ├── calvin-event-adapter.ts ← Converts scraped events → Post format
│   │       ├── date-format.ts      ← All date/time formatting & validation
│   │       ├── image-fingerprint.ts ← Detects generic Calvin placeholder images
│   │       ├── image-crop.ts       ← 16:9 crop math utilities
│   │       ├── chip-layout.ts      ← Filter chip layout calculations
│   │       ├── masked-password.ts  ← Password masking helpers
│   │       ├── numeric-input.ts    ← DOM numeric keyboard filter (web-only)
│   │       └── smooth-input-focus.ts ← Smooth scroll-to-focused-input on web
├── server/                         ← The Node.js backend
│   ├── server.js                   ← Main Express server & all API routes
│   └── services/
│       ├── event-scraper.js        ← Scrapes calvin.edu/events/all HTML
│       ├── category-mapper.js      ← Maps Calvin's 150+ categories → Knightly's 13
│       └── image-fingerprint.js    ← Server-side placeholder image detection
├── supabase/                       ← PostgreSQL database schema & seed data
│   └── migrations/20240101000000_initial_schema.sql ← Table definitions
└── docs/                           ← Documentation
```

---

## 3. How the App Starts Up — Root Layout

**File:** [`client/src/app/_layout.tsx`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/app/_layout.tsx)

This is the **first file that Expo runs**. Everything in the app is nested inside it. Think of it as the outermost shell that controls what the user sees before, during, and after login.

### The Provider Tree

The most important thing in `_layout.tsx` is this nested structure:

```tsx
// From _layout.tsx, lines 51–64
<GestureHandlerRootView style={StyleSheet.absoluteFill}>
  <ThemeProvider value={isDark ? darkTheme : lightTheme}>
    <AuthProvider>
      <ClubFollowProvider>
        <ClubLeadershipProvider>
          <FeedProvider>
            <RootNavigator isDark={isDark} />
          </FeedProvider>
        </ClubLeadershipProvider>
      </ClubFollowProvider>
    </AuthProvider>
  </ThemeProvider>
</GestureHandlerRootView>
```

**What is a Provider?** In React, a "Provider" is a component that makes data available to every component nested inside it — like a global variable that any child can read without you passing it as a prop. Each provider here manages a different slice of the app's state:

- **`GestureHandlerRootView`** — Required at the root level so that swipe gestures on the tab bar work correctly on Android. Without this, horizontal swipe-between-tabs breaks on Android devices.
- **`ThemeProvider`** — Makes the current theme (light vs dark color object) available to every screen and component. It receives either `lightTheme` or `darkTheme` based on the phone's system setting.
- **`AuthProvider`** — Manages login state. Exposes `isAuthenticated`, the `user` object, `signIn`, and `signOut`.
- **`ClubFollowProvider`** — Tracks which clubs the user is following. Exposes `isFollowing(clubId)`, `toggleFollow(clubId)`, etc.
- **`ClubLeadershipProvider`** — Tracks which clubs the user has claimed leadership of. Exposes `isLeader`, `linkedClubs`, `claimClub(code)`.
- **`FeedProvider`** — Holds all feed posts in memory. Exposes `posts`, `createPost`, `deletePost`.

### The Auth Gate — Showing Login vs. Main App

The `RootNavigator` function (lines 67–119) is responsible for deciding what the user sees:

```tsx
// From _layout.tsx, lines 67–119
function RootNavigator({ isDark }: { isDark: boolean }) {
  const { isAuthenticated, isAppMounted } = useAuth();

  return (
    <View style={[styles.fill, { backgroundColor: !isAuthenticated ? Brand.maroon : '#0B0C0E' }]}>
      <StatusBar style={!isAuthenticated ? 'light' : isDark ? 'light' : 'dark'} />

      {/* The main app (tab bar + all screens) is only rendered AFTER successful login */}
      {isAppMounted && (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0C0E' } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="card" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          <Stack.Screen name="clubs/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="clubs/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="complete-club-profile" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="login" options={{ animation: 'fade' }} />
        </Stack>
      )}

      {/* Login screen floats on top of everything when not authenticated */}
      {!isAuthenticated && <LoginScreen />}

      {/* Global Claim Club Modal lives at root level so it can overlay any screen */}
      {isAuthenticated && <ClaimClubModal />}
    </View>
  );
}
```

**The two key boolean flags:**
- `isAuthenticated` — becomes `true` only after `signIn()` succeeds. Controls whether the login screen is shown.
- `isAppMounted` — becomes `true` at the same time as `isAuthenticated`. Controls whether the main app (the `Stack` navigator with all tab screens) is even rendered in memory. While `false`, the entire tab system doesn't exist at all — this is why you never see the bottom navigation bar flash on the login screen.

**Why separate `isAuthenticated` and `isAppMounted`?** During the login animation, the main app is actually mounted *behind* the maroon login screen before `signIn()` is fully called. This allows the app screens to load and settle before the animated transition completes. When the login animation finishes, `signIn()` is called, `isAuthenticated` becomes `true`, and the login screen disappears revealing the already-loaded app underneath.

The `Stack` component (from expo-router) is a navigation stack. Each `Stack.Screen` registers a screen:
- `(tabs)` — the main tab bar and all its screens
- `card` — the full-screen post card modal (note `presentation: 'fullScreenModal'` makes it slide up over everything)
- `clubs/index` and `clubs/[id]` — the clubs directory and individual club pages (note `slide_from_right` — they push in from the right)

---

## 4. Authentication — Login Flow Deep Dive

**File:** [`client/src/context/auth-context.tsx`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/context/auth-context.tsx)

This file is both the **auth state store** and the **auth logic engine**. It's entirely client-side — there's no server call for authentication (this is a prototype).

### The AuthUser Type

```tsx
// auth-context.tsx, lines 5–15
export type AuthUser = {
  id: string;        // Student ID, e.g. "2028420" (7 digits)
  username: string;  // Calvin username, e.g. "jmd42"
  firstName: string; // "John"
  lastName: string;  // "Doe"
  fullName: string;  // "John Doe"
  email: string;     // "jmd42@calvin.edu"
  standing: string;  // "Student", "Junior", etc.
  major: string;     // "Computer Science, B.S."
  classYear: number; // 2028
};
```

### The `signIn` Function — Step by Step

```tsx
// auth-context.tsx, lines 43–112
const signIn = (username: string, password: string): boolean => {
  const trimmedUser = username.trim();
  const hasPassword = password.trim().length > 0;

  // GUARD 1: Both fields must have content
  if (!trimmedUser || !hasPassword) return false;

  // GUARD 2: Pure digit strings are student IDs, not usernames
  // Calvin usernames are alphanumeric (e.g. "jmd42"), never pure numbers
  if (/^\d+$/.test(trimmedUser)) return false;

  // SPECIAL CASE: The demo account "jmd42" (and several aliases) loads the full
  // John Mark Doe profile from data/student.ts with real Calvin-looking data
  const isJohn =
    trimmedUser.toLowerCase() === 'jmd42' ||
    trimmedUser.toLowerCase() === 'jmd42@calvin.edu' ||
    trimmedUser.toLowerCase() === 'john' ||
    trimmedUser.toLowerCase() === 'jmd' ||
    trimmedUser.toLowerCase() === student.email.toLowerCase();

  if (isJohn) {
    setUser({
      id: student.id,          // The John Doe ID from data/student.ts
      username: 'jmd42',
      firstName: student.firstName,
      // ...
    });
  } else {
    // For ANY other username: auto-generate a plausible student profile
    const isEmail = trimmedUser.includes('@');
    const email = isEmail ? trimmedUser : `${trimmedUser}@calvin.edu`;
    const cleanUser = isEmail ? trimmedUser.split('@')[0] : trimmedUser;

    // Convert "john.doe" or "john-doe" → "John Doe" by splitting on separators
    const cleanName = cleanUser.replace(/[@._-]/g, ' ');
    const words = cleanName.split(' ').filter(Boolean);
    const firstName = words[0] ? words[0].charAt(0).toUpperCase() + words[0].slice(1) : 'Calvin';
    const lastName = words[1] ? words[1].charAt(0).toUpperCase() + words[1].slice(1) : 'Student';

    // Derive a stable 7-digit student ID using a simple hash of the username.
    // WHY HASH: Every time you log in with the same username, you get the same ID.
    // This is not security — it's just making the demo feel realistic and consistent.
    let hash = 0;
    const lowerUser = cleanUser.toLowerCase();
    for (let i = 0; i < lowerUser.length; i++) {
      hash = (hash << 5) - hash + lowerUser.charCodeAt(i); // Bitwise left shift + subtract
      hash |= 0; // Clamp to 32-bit integer to prevent overflow
    }
    const suffix = Math.abs(hash % 900) + 100; // Always between 100 and 999

    setUser({ id: `2028${suffix}`, ... }); // e.g. "2028420"
  }

  setIsAuthenticated(true);
  setIsAppMounted(true); // This triggers the main app to render in _layout.tsx
  return true;
};
```

**The hash algorithm explained:** `(hash << 5) - hash` is equivalent to `hash * 31`. This is the classic Java `String.hashCode()` polynomial rolling hash. For "jmd42", it always produces the same number, so the student ID is stable across sessions. The `|= 0` at the end forces the number to stay within JavaScript's 32-bit integer range.

### The `signOut` Function

```tsx
// auth-context.tsx, lines 114–118
const signOut = () => {
  setIsAuthenticated(false); // Hides the main app, shows login screen
  setIsAppMounted(false);    // Unmounts all tab screens from memory
  setUser(null);             // Clears the user profile
};
```

This is deliberately simple. In a real app with a backend, you'd also invalidate the session token here.

---

## 5. The Login Screen — Animation & UI

**File:** [`client/src/components/login-screen.tsx`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/components/login-screen.tsx)

This is one of the most complex files in the project — it implements a **cinematic login animation** using `react-native-reanimated`. Here's how the animation works:

### The Login Screen Layout
- A full-screen **maroon red background** covers the entire display.
- In the center of the screen are:
  - The "Knightly" wordmark (the app title text)
  - A sparkle icon above it
  - The "CALVIN UNIVERSITY" subtitle
  - Username and password input fields
  - A gold "Sign In" button

### What Happens When You Tap "Sign In"

The animation runs in two phases:

**Phase 1: Fade out the form (160ms)**
```tsx
// login-screen.tsx, around line 403–416
formOpacity.value = withTiming(0, { duration: 160, easing: Easing.out(Easing.cubic) }, (fadeFinished) => {
  if (fadeFinished) {
    runOnJS(triggerFlightAfterFade)();
  }
});
```
The form fields, subtitle, and icon all fade to invisible in 160ms. The "Knightly" wordmark stays visible.

**Phase 2: The "Flight" animation (520ms)**
On **mobile**: The maroon background shrinks vertically from full screen height down to the height of the app header bar. The "Knightly" wordmark flies from the center of the screen to the top-left corner (where it will live in the app header).

On **web**: The full-screen maroon block morphs into an inset rounded sidebar rectangle in the top-left corner.

```tsx
// login-screen.tsx, around lines 334–386
// The wordmark slides and scales from its hero position to the header position
wordmarkProgress.value = withTiming(1, { duration: ANIMATION_DURATION, easing: smoothSlideCurve });

// On mobile: shrink the maroon container height to match the AppHeader
headerHeight.value = withTiming(targetHeaderHeight, { duration: 520 }, onFlightFinished);

// On web: morph the container into the sidebar shape
sidebarMorphProgress.value = withTiming(1, { duration: 520 }, onFlightFinished);
```

**Phase 3: Cross-fade reveal (110ms)**
When the flight animation finishes, the maroon overlay fades to transparent, revealing the already-loaded main app underneath. At this exact moment, the flying wordmark disappears and the real wordmark in the app header appears simultaneously — creating the illusion of continuity.

```tsx
overlayOpacity.value = withTiming(0, { duration: 110 }, (crossfadeDone) => {
  if (crossfadeDone) {
    runOnJS(onTransitionComplete)(submittedUser, submittedPass);
    // ^ This calls signIn() which sets isAuthenticated = true
  }
});
```

### Keyboard Raising

When the user taps the username or password field and the on-screen keyboard appears, the entire login form smoothly moves upward:

```tsx
// login-screen.tsx, around lines 117–133
const raiseForm = (duration = 280) => {
  const formTop = (windowHeight - 402) / 2;          // Where the form normally sits
  const minTopClearance = insets.top + Spacing.four + 12; // Logo must not hit top edge
  const maxSafeRaise = Math.max(0, formTop - minTopClearance);
  const targetRaise = Math.min(105, maxSafeRaise);   // Move up max 105px

  formRaise.value = withTiming(targetRaise, { duration, easing: Easing.out(Easing.cubic) });
};
```

This ensures the password field is always visible above the keyboard, but the logo at the top never clips off the screen.

### Demo Credentials Button
```tsx
// login-screen.tsx, around line 432
const fillDemoCredentials = () => {
  setUsername('jmd42');
  setPassword('calvin2028');
  setErrorMessage('');
};
```
There's a small "Try demo account" button that pre-fills the credentials for the demo account, making it easy for reviewers to test the app.

---

## 6. The Tab Bar — Navigating Between Screens

**File:** [`client/src/app/(tabs)/_layout.tsx`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/app/(tabs)/_layout.tsx)

The tabs layout is intentionally minimal — it delegates everything to the `AppTabs` component:

```tsx
// (tabs)/_layout.tsx
import AppTabs from '@/components/app-tabs';
export default function TabsLayout() {
  return <AppTabs />;
}
```

**Why is the `(tabs)` folder named with parentheses?** This is an Expo Router convention. Parentheses create a "route group" — the folder name doesn't appear in the URL. So `(tabs)/index.tsx` maps to `/` (root), not `/tabs/`. This allows grouping related screens together without affecting URLs.

### Phantom Tabs — Hiding the Post Tab

**File:** [`client/src/constants/phantom-tabs.ts`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/constants/phantom-tabs.ts)

The "Create Post" tab (tab 4, the pencil icon) is a "phantom tab" — it exists in the navigation but only becomes **visible** once a user has claimed club leadership. Regular students see 4 tabs; club leaders see 5 tabs. The `AppTabs` component reads `isLeader` from `ClubLeadershipContext` to decide how many tabs to show.

### Screen Animations (from `_layout.tsx`)
| Screen | Animation Style | When it's used |
|--------|----------------|----------------|
| `(tabs)` | Default | Main tab experience |
| `card` | `fullScreenModal` + `fade` | Full-screen post detail |
| `clubs/index` | `slide_from_right` | Opening clubs directory |
| `clubs/[id]` | `slide_from_right` | Opening a club profile |
| `complete-club-profile` | `slide_from_right` | Club setup after claiming |

---

## 7. The Campus Feed — Home Screen Deep Dive

**File:** [`client/src/app/(tabs)/index.tsx`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/app/(tabs)/index.tsx)

This is the most complex screen. It's the first thing a student sees after logging in — a reverse-chronological scrollable feed of campus events and announcements.

### State Variables Explained

```tsx
// index.tsx, lines 89–99

// WEB ONLY: A Set of selected filter options (e.g. {"Following", "Music"})
const [selectedFilters, setSelectedFilters] = useState<Set<FeedFilterOption>>(new Set(['All']));

// MOBILE ONLY: The scope toggle — "Following" (my clubs) vs "All Campus" (everything)
const [mobileScope, setMobileScope] = useState<MobileScope>('Following');

// MOBILE ONLY: Which category chips are selected (e.g. {"Music", "Athletics"})
const [mobileCategories, setMobileCategories] = useState<Set<'All' | FeedCategory>>(new Set(['All']));

// Both platforms: the text typed in the search box
const [query, setQuery] = useState('');
```

**Why separate state for mobile and web?** The mobile and web layouts have fundamentally different filter UIs:
- **Mobile**: A large segmented toggle ("Following" | "All Campus") + horizontal scrolling category chip strip
- **Web**: A single unified row of filter pills that includes both scope and categories

### `useDeferredValue` — Why Your Typing Feels Instant

```tsx
// index.tsx, lines 97–100
const deferredMobileScope = useDeferredValue(mobileScope);
const deferredMobileCategories = useDeferredValue(mobileCategories);
const deferredQuery = useDeferredValue(query);
const deferredSelectedFilters = useDeferredValue(selectedFilters);
```

`useDeferredValue` is a React 18 feature. When you type in the search box, `query` updates immediately (so the text input stays responsive), but `deferredQuery` updates slightly later — during a low-priority render. This means: the filter computation doesn't block your typing from feeling instant. The feed might lag by one frame, but the text cursor stays perfectly snappy.

### The Filtering Pipeline — Step 3

```tsx
// index.tsx, lines 165–193
const visible = useMemo(() => {
  if (isMobileApp) {
    // Convert Set to array, removing 'All' pseudo-category
    const activeCats = deferredMobileCategories.has('All')
      ? []  // Empty array = show all categories
      : Array.from(deferredMobileCategories).filter((c): c is FeedCategory => c !== 'All');

    return filterFeedPosts(dynamicPosts, {
      scope: deferredMobileScope,        // "Following" or "All Campus"
      categories: activeCats,            // e.g. ["Music", "Athletics"]
      // Search only works in "All Campus" mode — Following mode hides the search box
      query: deferredMobileScope === 'All Campus' ? deferredQuery : '',
      isFollowing,                       // Function from ClubFollowContext
    });
  }

  // Web filtering (unified filter pills)
  const webScope = deferredSelectedFilters.has('Following') ? 'Following' : 'All';
  const webCategories = deferredSelectedFilters.has('All')
    ? []
    : Array.from(deferredSelectedFilters).filter(
        (opt): opt is FeedCategory => opt !== 'All' && opt !== 'Following'
      );

  return filterFeedPosts(dynamicPosts, {
    scope: webScope,
    categories: webCategories,
    query: deferredQuery,
    isFollowing,
  });
}, [dynamicPosts, isMobileApp, deferredMobileScope, deferredMobileCategories, deferredSelectedFilters, deferredQuery, isFollowing]);
```

`useMemo` means this calculation only re-runs when one of the dependencies changes. It doesn't re-run on every render — only when `dynamicPosts`, the filters, or the query actually change.

### Row Chunking — The Grid Layout

```tsx
// index.tsx, lines 196–202
const evenRows = useMemo(() => {
  const rows: Post[][] = [];
  for (let i = 0; i < visible.length; i += numColumns) {
    rows.push(visible.slice(i, i + numColumns));
    // e.g. with 3 columns: rows = [[post1, post2, post3], [post4, post5, post6], ...]
  }
  return rows;
}, [visible, numColumns]);
```

Posts are chunked into rows of `numColumns` posts each. `numColumns` is:
- `1` on mobile (from `resolveFeedColumnCount` in `data/feed.ts`)
- `2` on web tablet (width < 900px)
- `3` on web desktop (width >= 900px)

Each row is then rendered as a `<View style={{ flexDirection: 'row' }}>` containing the individual post cards side by side.

### FlatList vs ScrollView

```tsx
// index.tsx, lines 487–525

// MOBILE: Uses FlatList for virtualization (only renders visible posts)
if (isMobileApp) {
  return (
    <ScreenFlatList
      data={evenRows}
      initialNumToRender={5}     // Render 5 rows immediately
      maxToRenderPerBatch={5}    // Render 5 more rows per scroll batch
      windowSize={5}             // Keep 5 rows above/below visible in memory
      removeClippedSubviews={true} // Aggressively release off-screen views
      ListHeaderComponent={listHeader}
      ListEmptyComponent={listEmpty}
      renderItem={renderItem}
    />
  );
}

// WEB: Uses plain ScrollView (no virtualization needed — DOM handles it)
return (
  <Screen style={styles.screenInner}>
    {listHeader}
    <View style={styles.evenGrid}>
      {evenRows.map((row, rowIdx) => (
        <View key={`grid-row-${rowIdx}`} style={styles.evenGridRow}>
          {row.map((post) => (
            <View key={post.id} style={styles.evenGridCell}>
              <PostCard post={post} />
            </View>
          ))}
          {/* Spacer cells to fill incomplete last row */}
          {row.length < numColumns &&
            Array.from({ length: numColumns - row.length }).map((_, i) => (
              <View key={`spacer-${rowIdx}-${i}`} style={styles.evenGridCell} />
            ))}
        </View>
      ))}
    </View>
  </Screen>
);
```

**Why FlatList on mobile but ScrollView on web?** `FlatList` is a virtualized list — it only renders the items currently visible on screen plus a small buffer. When you have 50+ posts, rendering all of them at once would be very slow and memory-intensive. `FlatList` solves this by "recycling" cells as you scroll. On web, the browser's DOM already handles this efficiently, so a plain `ScrollView` is simpler and works fine.

### The "Following" Empty State

When a student has no followed clubs and switches to "Following" view:
```tsx
// index.tsx, lines 427–438
<Card style={styles.emptyCard}>
  <Icon sf="sparkles" md="auto_awesome" size={28} color={Brand.gold} />
  <ThemedText type="smallBold">No posts from your followed clubs</ThemedText>
  <ThemedText type="small" themeColor="textSecondary" style={styles.emptySub}>
    Follow campus clubs to see their upcoming events, workshops, and announcements here.
  </ThemedText>
  <Pressable onPress={openClubsDirectory} style={styles.emptyCta}>
    <ThemedText style={styles.emptyCtaText}>Browse Campus Clubs</ThemedText>
  </Pressable>
</Card>
```

`openClubsDirectory` comes from `ClubsNavigationContext` and navigates to the clubs listing screen — a cross-screen navigation call without the clubs screen needing to know about the feed screen.

---

## 8. The Post Card — How a Single Post is Rendered

**File:** [`client/src/components/post-card.tsx`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/components/post-card.tsx)

Every post in the feed is rendered as a `PostCard`. This is one of the most visually important components in the app. Here's how it's built step by step:

### The `memo` Wrapper

```tsx
// post-card.tsx, line 124
export const PostCard = memo(function PostCard({ post, onPressOrg }: PostCardProps) {
```

`memo` is a React performance optimization. It means the card only re-renders if `post` or `onPressOrg` actually changed. Since the feed can have 30–50 cards visible at once, preventing unnecessary re-renders is critical for smooth 60fps scrolling.

### Step 1: Deriving the Club ID

```tsx
// post-card.tsx, lines 132–133
// If the post doesn't have an explicit clubId, derive one by slugifying the org name
// e.g. "Knights Athletics" → "knights-athletics"
const clubId = post.clubId ?? post.org.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const followed = isFollowing(clubId); // O(1) Set lookup
```

The regex `/[^a-z0-9]+/g` replaces any character that is NOT a letter or number with a hyphen. So "Calvin Theatre Company" → "calvin-theatre-company".

### Step 2: Preset Banner Detection

```tsx
// post-card.tsx, lines 151–152
const isPreset = isPresetBanner(post.image); // Checks if image starts with "preset:"
const presetDetails = isPreset ? getPresetBannerDetails(post.image) : null;
```

If `post.image` is `"preset:maroon:diamonds"`, `isPresetBanner` returns `true` and `getPresetBannerDetails` decodes it into `{ colorHex: '#5E1A24', accentColor: '#E8B019', patternAsset: <SVG file> }`.

### Step 3: Rendering the Banner Image

```tsx
// post-card.tsx, lines 157–196
{post.image ? (
  <View style={styles.imageContainer}> {/* 16:9 aspect ratio container */}
    {presetDetails ? (
      // PRESET BANNER: Colored background + transparent SVG pattern overlay
      <View style={[styles.image, { backgroundColor: presetDetails.colorHex }]}>
        {presetDetails.patternAsset ? (
          <Image
            source={presetDetails.patternAsset}
            tintColor={presetDetails.accentColor}  // Tints the SVG with the accent color
            contentFit="cover"
            style={StyleSheet.absoluteFill}
            transition={250}  // Fade-in animation
          />
        ) : null}
      </View>
    ) : (
      // REAL PHOTO: Standard URL image
      <Image
        source={{ uri: post.image }}
        style={styles.image}
        contentFit="cover"
        transition={250}
      />
    )}

    {/* Translucent black gradient scrim at the top of the image */}
    {/* This ensures the org pill text is readable over bright photos */}
    <View style={styles.scrim} />

    {/* Org pill + category badge overlaid on the image */}
    <View style={styles.overlayBar}>
      <OrgBadge org={post.org} followed={followed} isOverlay onPress={handlePressOrg} />
      <Badge label={post.category} tone={categoryBadgeTone(post.category)} />
    </View>
  </View>
) : null}
```

### Step 4: Post Content Below the Banner

```tsx
// post-card.tsx, lines 198–255
<View style={styles.content}>
  {/* For posts WITHOUT an image: inline header strip instead of overlay */}
  {!post.image ? (
    <View style={styles.noImageHeader}>
      <OrgBadge org={post.org} followed={followed} isOverlay={false} onPress={handlePressOrg} />
      <Badge label={post.category} tone={categoryBadgeTone(post.category)} />
    </View>
  ) : null}

  {/* Headline — displayed in a serif font, max 3 lines */}
  <ThemedText style={styles.title} numberOfLines={3}>{post.headline}</ThemedText>

  {/* Event when + where metadata badges */}
  {post.when || post.where ? (
    <View style={styles.metaSection}>
      {post.when ? <MetaBadge icon={{ sf: 'calendar', md: 'event' }} text={post.when} bold /> : null}
      {post.where ? <MetaBadge icon={{ sf: 'mappin.and.ellipse', md: 'place' }} text={post.where} /> : null}
    </View>
  ) : null}

  {/* Body text — max 4 lines */}
  <ThemedText type="small" themeColor="textSecondary" numberOfLines={4}>{post.body}</ThemedText>

  {/* Footer: relative time + "Campus-wide" label */}
  <View style={styles.footer}>
    <ThemedText type="caption" themeColor="textMuted">
      {formatRelativeTime(post.postedAt, post.createdAt, post.monotonicCreatedAt)}
    </ThemedText>
    {post.campusWide ? <ThemedText type="caption" themeColor="textMuted">Campus-wide</ThemedText> : null}
  </View>
</View>
```

### The OrgBadge Component

```tsx
// post-card.tsx, lines 58–97
function OrgBadge({ org, followed, isOverlay, onPress }) {
  return (
    <Pressable onPress={onPress} style={isOverlay ? styles.orgPill : styles.noImageOrgRow}>
      {/* Gold checkmark seal when the student follows this club */}
      {followed ? (
        <Icon sf="checkmark.seal.fill" md="verified" size={isOverlay ? 14 : 15} color={Brand.gold} />
      ) : null}
      <ThemedText numberOfLines={1}>{org}</ThemedText>
    </Pressable>
  );
}
```

When `isOverlay` is true (post has an image), the badge renders as a dark frosted-glass pill floating over the image. When false (no image), it renders as a flat inline text header. Tapping either navigates to that club's detail page via `router.push('/clubs/[id]')`.

### Category Badge Colors

```tsx
// post-card.tsx, lines 27–42
function categoryBadgeTone(category: string): BadgeTone {
  switch (category) {
    case 'Academics': return 'info';     // Blue
    case 'Outdoors':  return 'success';  // Green
    case 'Athletics': return 'danger';   // Red
    case 'Faith':     return 'brand';    // Maroon
    case 'Official':  return 'gold';     // Gold
    default:          return 'gold';     // Gold for everything else
  }
}
```

Different category colors help students instantly identify post types while scrolling.

---

## 9. The Feed Data & Filtering Functions

**File:** [`client/src/data/feed.ts`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/data/feed.ts)

This file is the **source of truth for the post data model** and contains all the filtering and sorting logic.

### The `Post` Type — Every Field Explained

```typescript
// feed.ts, lines 36–64
export type Post = {
  id: string;
  // Unique identifier. Seed posts use "p1"–"p17". Locally created posts use "p-local-{timestamp}".
  // Calvin scraped events use "calvin-{nodeId}" where nodeId is the Drupal node ID.

  clubId?: string;
  // Optional club identifier matching a club in CALVIN_CLUBS. Used for navigation to /clubs/[id]
  // and for follow state lookups. Examples: "acm", "knights-athletics", "calvin-university"

  org: string;
  // The display name of the posting organization. E.g. "Knights Athletics", "Calvin University"

  mark?: string;
  // 2-letter monogram for the avatar placeholder. E.g. "KA", "CU", "SA"

  postedAt: string;
  // ISO 8601 datetime string. E.g. "2026-09-18T16:00:00.000Z"
  // Used as fallback for timestamp parsing when createdAt is not present.

  category: FeedCategory;
  // One of the 13 Knightly categories. Used for filtering and badge color selection.

  createdAt?: number;
  // UTC epoch milliseconds (e.g. 1726671600000). The PRIMARY sort key.
  // Should be assigned server-side in production to prevent clock manipulation.

  monotonicCreatedAt?: number;
  // performance.now() value at post creation — a monotonic (never-backward) timer.
  // Used as a secondary sort key for posts created in the same millisecond.

  headline: string;
  // The post title. Max 50 characters in the Create Post composer.

  body: string;
  // The post body text. Max 280 characters.

  when?: string;
  // Human-readable event time string. E.g. "Fri, Sep 19 · 7:00 PM" or "Saturdays · 8:30 AM"
  // Displayed with a calendar icon in the MetaBadge.

  where?: string;
  // Event location. E.g. "Van Noord Arena", "Commons Dining Hall"
  // Displayed with a map pin icon in the MetaBadge.

  image?: string;
  // Either a URL ("https://images.unsplash.com/...") or a preset URI ("preset:maroon:diamonds").
  // If undefined, the card renders without a banner image.

  followed: boolean;
  // Whether the posting club is in the student's followed set.
  // Drives the gold checkmark seal on OrgBadge.

  campusWide: boolean;
  // If true, this post appears in EVERYONE's feed regardless of follow state.
  // Used for university-wide announcements (Calvin events, weather alerts, etc.)

  colors?: [string, string];
  // Gradient colors for fallback poster rendering. E.g. ["#8C2131", "#E8B019"]

  sf?: SfSymbolName;
  // SF Symbol icon name for iOS. E.g. "music.mic", "soccerball"

  md?: MaterialSymbolName;
  // Material Symbol icon name for Android/Web. E.g. "mic", "sports_soccer"
};
```

### The 13 Feed Categories

```typescript
// feed.ts, lines 5–18
export type FeedCategory =
  | 'Academics'  // Lectures, department events, research, Kinesiology
  | 'Athletics'  // Varsity sports, intramurals, MIAA/NCAA games
  | 'Career'     // Career fairs, internships, networking, Startup Garage
  | 'Culture'    // Multicultural events, CISD, BSU, Bersama, international
  | 'Faith'      // Chapel, Campus Ministries, LOFT, worship, prayer
  | 'Gaming'     // Esports, board game nights, LAN parties, D&D
  | 'Music'      // Choirs, orchestra, jazz, recitals, hymnsing
  | 'Official'   // University notices, commencement, administrative
  | 'Outdoors'   // Ecosystem Preserve, hiking, Earthkeepers
  | 'Service'    // Volunteer, community service, food drives
  | 'Social'     // Cookouts, kickoff events, movie nights, student life
  | 'The Arts'   // Theatre, galleries, film, dance, sculpture, painting
  | 'Wellness';  // Mental health, Broene counseling, de-stress events
```

### Core Sorting Function

```typescript
// feed.ts, lines 392–395
export function sortPostsByDate(postList: Post[]): Post[] {
  // [...postList] creates a COPY before sorting — never mutates the original array
  // (b - a) sorts descending: bigger timestamp (newer) comes first
  return [...postList].sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a));
}
```

```typescript
// feed.ts, lines 378–386
export function getPostTimestamp(post: Post): number {
  // Use the numeric epoch ms if present and valid
  if (typeof post.createdAt === 'number' && !isNaN(post.createdAt) && post.createdAt > 0) {
    return post.createdAt;
  }
  // Otherwise parse the ISO 8601 string — e.g. "2026-09-18T16:00:00.000Z" → 1726671600000
  const parsed = new Date(post.postedAt).getTime();
  return isNaN(parsed) ? 0 : parsed; // Return 0 for invalid dates (sinks them to the bottom)
}
```

### The Main Filter Function — `filterFeedPosts`

```typescript
// feed.ts, lines 539–580
export function filterFeedPosts(postList: Post[], criteria: FeedFilterCriteria): Post[] {
  const { scope, categories = [], query = '', isFollowing } = criteria;
  const needle = query.trim().toLowerCase();

  // Is "Following" mode active?
  const hasFollowing = scope === 'Following' || scope === 'FOLLOWING';

  // Remove the 'All' pseudo-category before filtering (it means "no category filter")
  const cleanedCategories = categories.filter((c): c is FeedCategory => c !== 'All');
  const hasCategoryFilter = cleanedCategories.length > 0;

  const filtered = postList.filter((post) => {
    // SUB-STEP A: Follow scope check
    // If "Following" mode AND we have a follow checker function:
    if (hasFollowing && isFollowing) {
      // Derive the club ID (explicit clubId or slugified org name)
      const clubId = post.clubId ?? post.org.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      // Campus-wide posts always pass; followed clubs pass; others fail
      const matchesFollow = post.campusWide || isFollowing(clubId);
      if (!matchesFollow) return false;
    }

    // SUB-STEP B: Category filter check
    // If any specific categories are selected, the post must match one of them
    if (hasCategoryFilter) {
      if (!cleanedCategories.includes(post.category)) return false;
    }

    // SUB-STEP C: Text search check
    // The search needle must appear in headline, body, org name, category, or location
    if (needle.length > 0) {
      const matchesQuery =
        post.headline.toLowerCase().includes(needle) ||
        post.body.toLowerCase().includes(needle) ||
        post.org.toLowerCase().includes(needle) ||
        post.category.toLowerCase().includes(needle) ||
        (post.where ?? '').toLowerCase().includes(needle);
      if (!matchesQuery) return false;
    }

    return true; // Post passed all checks
  });

  // Always return sorted newest-first
  return sortPostsByDate(filtered);
}
```

### Responsive Column Count

```typescript
// feed.ts, lines 487–505
export function resolveFeedColumnCount(width: number, platform: string = Platform.OS): number {
  // Mobile native apps always use 1 column — phone screens are too narrow for multi-column card grids
  if (platform !== 'web') return 1;

  // Web: wider viewport = more columns
  return width >= 900 ? 3 : 2;
}
```

---

## 10. The Feed Context — Live State Management

**File:** [`client/src/context/feed-context.tsx`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/context/feed-context.tsx)

The `FeedProvider` is the **live memory of all feed posts**. It bridges the gap between static seed data and live server data.

### Initial Posts — `getInitialPosts()`

```typescript
// feed-context.tsx, lines 60–85
function getInitialPosts(): Post[] {
  const now = Date.now(); // Current wall-clock time

  // Step 2: Convert the first 15 offline Calvin seed events to Post format.
  // Each gets a timestamp 30 minutes before the previous (now - 1800000ms, now - 3600000ms, etc.)
  const calvinSeedPosts = CALVIN_EVENTS_SEED.slice(0, 15).map((e, idx) =>
    adaptCalvinEventToPost(e, now - (idx + 1) * 1800 * 1000)
  );

  // Step 3: Combine the 17 hardcoded demo posts with the 15 Calvin seed events
  const combined = [...defaultPosts, ...calvinSeedPosts]; // 32 posts total

  // Randomize order so the feed looks diverse on first load (not all Calvin events last)
  const shuffled = combined.sort(() => Math.random() - 0.5);

  // Step 4: Assign "fake" timestamps so posts appear spread across the past few days
  // DEMO_POST_OFFSETS_MS is an array like [25min, 45min, 1hr, 2hr, 3hr, ..., 35days]
  const populated = shuffled.map((post, idx) => {
    const offset = idx < DEMO_POST_OFFSETS_MS.length
      ? DEMO_POST_OFFSETS_MS[idx]
      : DEMO_POST_OFFSETS_MS[DEMO_POST_OFFSETS_MS.length - 1] + (idx - DEMO_POST_OFFSETS_MS.length + 1) * 86400 * 1000;
    const postTime = now - offset;
    return {
      ...post,
      postedAt: new Date(postTime).toISOString(), // ISO string for display
      createdAt: postTime,                         // Epoch ms for sorting
    };
  });

  // Step 5: Sort everything newest-first
  return sortPostsByDate(populated);
}
```

### Live Events Update — `useEffect`

```typescript
// feed-context.tsx, lines 94–107
useEffect(() => {
  let mounted = true; // Prevents state update if component unmounts before fetch completes

  fetchCampusEvents().then((liveEvents) => {
    if (mounted && liveEvents.length > 0) {
      setFeedPosts((prev) => {
        // Remove all offline Calvin seed posts (clubId === 'calvin-university')
        const nonCalvin = prev.filter((p) => p.clubId !== 'calvin-university');
        // Replace with the live events from the server, keep other posts
        return sortPostsByDate([...nonCalvin, ...liveEvents]);
      });
    }
  });

  return () => {
    mounted = false; // Cleanup: prevent the state update if the component already unmounted
  };
}, []); // Empty dependency array = runs exactly once when the app loads
```

This runs once when the app first mounts. If `fetchCampusEvents()` succeeds, it swaps out the offline seed data for fresh live events. If it fails (server offline, network error), nothing changes and the seed data remains.

### Creating a Post — `createPost`

```typescript
// feed-context.tsx, lines 129–168
const createPost = useCallback((input: CreatePostInput): Post => {
  const { club, title, description, image, when, where } = input;
  const now = Date.now();

  // Step 1: Capture timestamp — used as both the unique ID and the post time
  // In production, this timestamp would come from the server to prevent manipulation

  // Step 2: Build the Post object
  const newPost: Post = {
    id: `p-local-${now}`,            // Unique ID: "p-local-1728234000000"
    clubId: club.id,
    org: club.name,
    mark: club.mark,
    category: club.category as FeedCategory,
    postedAt: new Date(now).toISOString(),
    createdAt: now,
    // monotonicCreatedAt uses performance.now() — a high-resolution timer that never
    // goes backward (unlike Date.now() which can be manipulated by system clock changes)
    monotonicCreatedAt: typeof performance !== 'undefined' ? performance.now() : undefined,
    headline: title.trim(),
    body: description.trim(),
    when: when?.trim() ? when.trim() : undefined,
    where: where?.trim() ? where.trim() : undefined,
    image: image?.trim() ? image.trim() : undefined,
    followed: true,         // Always mark as followed (you just posted it!)
    campusWide: Boolean(club.isDepartment), // University departments = campus-wide
    colors: club.colors,
    sf: club.sf,
    md: club.md,
  };

  // Step 3: Auto-follow the club if not already followed
  // WHY: When you post on behalf of a club, you expect its posts to appear in "Following"
  if (!isFollowing(club.id)) {
    toggleFollow(club.id);
  }

  // Step 4: Insert at the top of the feed (sortPostsByDate puts newest first)
  setFeedPosts((prev) => sortPostsByDate([newPost, ...prev]));

  // Step 5: Return the post to the caller (used by the CreatePost screen to show success)
  return newPost;
}, [isFollowing, toggleFollow]);
```

---

## 11. The Events Pipeline — From Calvin's Website to Your Feed

This is the most technically interesting part of the app. Here's the complete journey:

### Step 1 — Server Scrapes Calvin's Website

**File:** [`server/services/event-scraper.js`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/server/services/event-scraper.js)

The server fetches raw HTML from `https://calvin.edu/events/all` — Calvin's public Drupal events calendar. Here's how it parses events from the HTML:

```javascript
// event-scraper.js, lines 82–166
function parseEventsHtml(html) {
  // Calvin's Drupal CMS wraps each event in a div with data-history-node-id
  // We split the HTML on those div openings to isolate each event block
  const chunks = html.split(/<div\s+data-history-node-id="(\d+)"\s+class="([^"]*node--type-provus-event[^"]*)"/i);

  const events = [];

  // The array from split has this pattern: [preamble, nodeId, classes, content, nodeId, classes, content, ...]
  // So we iterate i += 3 to step through (nodeId, classes, content) triples
  for (let i = 1; i < chunks.length; i += 3) {
    const id = chunks[i];     // The Drupal node ID number (e.g. "12345")
    const content = chunks[i + 2]; // The HTML content of this event block

    // Extract Title from <h4 class="event-calendar__title">...<a href="...">Title</a></h4>
    const titleMatch = content.match(/<h4[^>]*class="[^"]*event-calendar__title[^"]*"[^>]*>([\s\S]*?)<\/h4>/i);

    // Extract Date from <div class="event-calendar__date">...</div>
    const dateMatch = content.match(/<div\s+class="event-calendar__date">([\s\S]*?)<\/div>/i);

    // Extract Time from <div class="event-calendar__date-location__date">...</div>
    const timeMatch = content.match(/<div\s+class="event-calendar__date-location__date">([\s\S]*?)<\/div>/i);

    // Extract Location from <div class="event-calendar__date-location__location">...</div>
    const locMatch = content.match(/<div\s+class="event-calendar__date-location__location">([\s\S]*?)<\/div>/i);

    // Extract Hero Image from <div class="event-calendar__image">...<img src="...">
    const imgMatch = content.match(/<div\s+class="event-calendar__image"[\s\S]*?<img[^>]+src="([^"]+)"/i);

    // Push the parsed event
    events.push({
      id: `calvin-${id}`,
      title, date, time, location,
      imageUrl,
      category: classifyEvent({ title, summary, location }),
      campusWide: true, // All Calvin events are campus-wide
    });
  }
  return events;
}
```

**In-memory caching (30 minutes):**
```javascript
// event-scraper.js, lines 19–21
let cachedEvents = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

// event-scraper.js, lines 179–182
// If the cache is fresh (< 30 min old) and we're not forcing a refresh, return cached data
if (!forceRefresh && cachedEvents && now - lastFetchTime < CACHE_TTL_MS) {
  return cachedEvents;
}
```

This prevents hammering Calvin's website with repeated requests every time a student opens the app.

### Step 2 — Category Classification

**File:** [`server/services/category-mapper.js`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/server/services/category-mapper.js)

Calvin's Drupal CMS has 150+ categories. Knightly consolidates them into 13. The `classifyEvent` function uses a priority order of keyword matching:

```javascript
// category-mapper.js, lines 208–262
function classifyEvent(event = {}) {
  const title = (event.title || '').toLowerCase();
  const summary = (event.summary || '').toLowerCase();
  const location = (event.location || '').toLowerCase();

  // HARDCODED OVERRIDE: "Kinesiology" must ALWAYS go to Academics, never Athletics
  // (Kinesiology is a department, not a sport)
  if (title.includes('kinesiology') || summary.includes('kinesiology')) {
    return 'Academics';
  }

  // Step 2: Check if any TITLE word matches a category keyword
  // Title keywords have the highest priority (most specific signal)
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(title)) return rule.category;
    }
  }

  // Step 3: Check VENUE/LOCATION heuristics
  // e.g. "Chapel Sanctuary" → Faith, "Van Noord Arena" → Athletics
  for (const rule of CATEGORY_RULES) {
    for (const loc of rule.locations) {
      if (location.includes(loc)) return rule.category;
    }
  }

  // Step 4: Check SUMMARY/DESCRIPTION keywords
  // Lower priority than title — description is more verbose and less reliable
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(summary)) return rule.category;
    }
  }

  // Step 6: Guaranteed safe default
  return 'Culture'; // Fallback for anything unclassifiable
}
```

**Why word-boundary regex (`\b`)?** Without `\b`, "music" would match "kinesiology" because "music" is not in "kinesiology", but "concert" would accidentally match "concerto" as a substring. `\b` ensures we only match whole words: "music" matches "music festival" but not "musical" (unless "musical" is also in the keyword list).

### Step 3 — Server REST Endpoint

**File:** [`server/server.js`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/server/server.js) (lines 130–154)

```javascript
// server.js, lines 137–154
app.get('/api/events', async (req, res) => {
  try {
    const pages = parseInt(req.query.pages, 10) || 3;   // Default: scrape 3 pages (~30 events)
    const forceRefresh = req.query.refresh === 'true'; // ?refresh=true bypasses cache
    const category = req.query.category;               // Optional category filter

    const events = await scrapeEvents({ pages, forceRefresh });

    // Optional server-side category filtering
    let filtered = events;
    if (category && category !== 'All') {
      filtered = filtered.filter((e) => e.category.toLowerCase() === category.toLowerCase());
    }

    res.json(filtered); // Return array of scraped event objects
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events', message: err.message });
  }
});
```

### Step 4 — Client Fetches from Server

**File:** [`client/src/services/events-api.ts`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/services/events-api.ts)

```typescript
// events-api.ts, lines 26–50
export async function fetchCampusEvents(pages = 3): Promise<Post[]> {
  try {
    // AbortController lets us cancel the fetch request after a timeout
    const controller = new AbortController();
    // After 2000ms (2 seconds), automatically cancel the request
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`http://localhost:3000/api/events?pages=${pages}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId); // Cancel the timeout if request completes in time

    if (res.ok) {
      const data: ScrapedCalvinEvent[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // Adapt each scraped event into a Post, spacing timestamps 1 hour apart
        return data.map((e, idx) => adaptCalvinEventToPost(e, Date.now() - idx * 3600 * 1000));
      }
    }
  } catch {
    // This catch handles both: 2-second AbortController timeout AND actual network errors
    // The error is silently swallowed — fall through to the seed data fallback below
  }

  // OFFLINE FALLBACK: Return the pre-saved seed data as Posts
  return CALVIN_EVENTS_SEED.map((e, idx) =>
    adaptCalvinEventToPost(e, Date.now() - idx * 3600 * 1000)
  );
}
```

### Step 5 — Event → Post Adaptation

**File:** [`client/src/utils/calvin-event-adapter.ts`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/utils/calvin-event-adapter.ts)

```typescript
// calvin-event-adapter.ts, lines 45–91
export function adaptCalvinEventToPost(event: ScrapedCalvinEvent, baseTimestamp: number): Post {
  // Step 1: Ensure category is valid (use 'Culture' as fallback)
  const validCategory = (event.category as FeedCategory) || 'Culture';

  // Step 2: Determine the banner image
  let bannerImage: string;
  if (!event.imageUrl || event.imageUrl.trim().length === 0) {
    // Case A: No image at all → assign a category-appropriate preset banner
    bannerImage = CATEGORY_SIMPLE_BANNERS[validCategory] || 'preset:maroon:diamonds';
  } else if (isCalvinPlaceholderUrl(event.imageUrl)) {
    // Case B: Generic Calvin line-art placeholder detected → replace with preset banner
    // The fingerprint check uses exact path patterns AND SHA-256 hashes
    bannerImage = CATEGORY_SIMPLE_BANNERS[validCategory] || 'preset:maroon:diamonds';
  } else {
    // Case C: Authentic photography or event flyer → keep the real URL
    bannerImage = event.imageUrl;
  }

  // Step 3: Format the "when" string by combining date + time
  const when = event.time ? `${event.date} · ${event.time}` : event.date;
  // Result: "Oct 02, 2026 · 10:30 am–10:50 am"

  // Step 4: Build and return the complete Post object
  return {
    id: event.id,                          // e.g. "calvin-12345"
    clubId: 'calvin-university',           // All Calvin events use this canonical club ID
    org: 'Calvin University',
    mark: 'CU',
    category: validCategory,
    headline: event.title,
    body: event.description || event.summary || event.title,
    when,
    where: event.location || 'Calvin Campus',
    image: bannerImage,
    postedAt: new Date(baseTimestamp).toISOString(),
    createdAt: baseTimestamp,
    campusWide: true,                      // All official Calvin events are campus-wide
    followed: false,
    colors: ['#8C2131', '#E8B019'],        // Calvin Maroon & Collegiate Gold
    sf: 'building.columns',               // SF Symbol for iOS
    md: 'account_balance',                // Material Symbol for Android/Web
  };
}
```

The `CATEGORY_SIMPLE_BANNERS` map assigns a specific preset banner to each category:
```typescript
// calvin-event-adapter.ts, lines 22–36
const CATEGORY_SIMPLE_BANNERS: Record<FeedCategory, string> = {
  Faith:      'preset:maroon:diamonds',
  Academics:  'preset:navy:arches',
  Athletics:  'preset:maroon:stripes',
  Music:      'preset:plum:waves',
  'The Arts': 'preset:amethyst:crystals',
  Career:     'preset:bronze:grid',
  Outdoors:   'preset:forest:trees',
  Service:    'preset:teal:leaves',
  Wellness:   'preset:sage:ripples',
  Social:     'preset:orange:lattice',
  Culture:    'preset:cranberry:globe',
  Official:   'preset:maroon:none',
  Gaming:     'preset:slate:circuit',
};
```

---

## 12. Club Following System

**File:** [`client/src/context/club-follow-context.tsx`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/context/club-follow-context.tsx)

### Why a `Set` Instead of an Array

```typescript
// club-follow-context.tsx, lines 62–64
// A JavaScript Set gives O(1) (instant) membership lookup
const [followedIds, setFollowedIds] = useState<Set<string>>(
  () => new Set(initialFollowed)
);
```

**O(1) vs O(n) explained:** When the feed renders 50 post cards, each one calls `isFollowing(clubId)` to check whether to show the gold checkmark seal. If `followedIds` were an Array, each `isFollowing` call would scan the entire array — 50 cards × 20 followed clubs = 1,000 comparisons per render. A `Set` does each lookup in constant time regardless of how many clubs you follow.

### Default Followed Clubs

```typescript
// club-follow-context.tsx, lines 30–38
export const DEFAULT_FOLLOWED_CLUB_IDS: string[] = [
  'acm',              // ACM Computer Science Club
  'calvin-theatre',   // Calvin Theatre Company
  'knights-athletics',// Knights Athletics
  'campus-ministries',// Campus Ministries
  'outdoor-rec',      // Outdoor Recreation
  'jazz-collective',  // Jazz Collective
  'student-activities', // Student Activities
];
```

These 7 clubs are pre-followed for every new user. This ensures the "Following" feed tab is never empty on first launch — an important first-impression detail.

### Key Functions

```typescript
// club-follow-context.tsx, lines 67–104

// Check follow status — runs on EVERY post card render
const isFollowing = useCallback((clubId: string) => {
  return followedIds.has(clubId.toLowerCase()); // Case-insensitive lookup
}, [followedIds]);

// Add a club (immutable update: create new Set with the addition)
const followClub = useCallback((clubId: string) => {
  setFollowedIds((prev) => {
    const next = new Set(prev); // Copy the existing Set
    next.add(clubId.toLowerCase());
    return next; // Return new Set (triggers re-render)
  });
}, []);

// Toggle: add if not present, remove if present
const toggleFollow = useCallback((clubId: string) => {
  setFollowedIds((prev) => {
    const next = new Set(prev);
    const key = clubId.toLowerCase();
    if (next.has(key)) {
      next.delete(key); // Was following → unfollow
    } else {
      next.add(key);    // Was not following → follow
    }
    return next;
  });
}, []);
```

**Why always create a new Set?** React detects state changes by reference equality. If you mutate the existing Set (`prev.add(key)`), React sees the same object reference and won't re-render. Creating a `new Set(prev)` gives React a different reference, triggering the re-render.

---

## 13. Club Leadership & the "Post" Tab

**File:** [`client/src/context/club-leadership-context.tsx`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/context/club-leadership-context.tsx)

### Role System

- **General students**: 4 tabs (Home, Dining, Safety, Directory). No post creation.
- **Club leaders**: 5 tabs (same 4 + the "Post" tab with the pencil icon). Can publish announcements.

### The `claimClub` Function

This is how a regular student becomes a club leader:

```typescript
// club-leadership-context.tsx, lines 293–346
const claimClub = useCallback((code: string, initialDetails?: Partial<Club>) => {
  // Step 1: Validate the code against the list in data/club-codes.ts
  const check = checkClubCode(code);
  if (!check.valid) {
    return { success: false, error: check.error };
    // Example error: "Invalid code. Codes are 10 characters."
  }

  const targetClubId = check.record.clubId; // e.g. "acm"

  // Step 2: Add the club ID to the user's linked clubs array
  setLinkedClubIds((prev) => {
    if (prev.includes(targetClubId)) return prev; // Already linked, no change
    const next = [...prev, targetClubId];

    // Step 3: Persist to memory cache and localStorage so it survives page refresh
    if (user) {
      const accountId = (user.username || user.id || 'default').toLowerCase();
      inMemoryLinkedClubs[accountId] = next;
      localStorage.setItem(
        `knightly_linked_clubs_${accountId}`, // User-scoped key!
        JSON.stringify(next)
      );
    }
    return next;
  });

  // Step 4: Make the claimed club the active club for posting
  setActiveClubId(targetClubId);

  return { success: true, club: fullClub };
}, [user]);
```

### Account-Scoped Storage Keys

```typescript
// club-leadership-context.tsx, lines 39–45
export function getAccountStorageKey(
  user: { id?: string; username?: string } | null,
  prefix: string
): string {
  const accountId = user ? (user.username || user.id || 'default').toLowerCase() : 'guest';
  return `${prefix}${accountId}`;
  // Example: "knightly_linked_clubs_jmd42"
}
```

**Why user-scoped keys?** If two students share a device (common in dorms) and one is a club leader, their leadership should not appear when another student logs in. Scoping the localStorage key to the username prevents this cross-contamination.

### Custom Club Details — Override Merging

```typescript
// club-leadership-context.tsx, lines 251–268
const linkedClubs = useMemo(() => {
  return linkedClubIds.map((id) => {
    // Start with the static club data from CALVIN_CLUBS
    const baseClub = CALVIN_CLUBS.find((c) => c.id === id) ?? { /* fallback */ };

    // Merge in any customizations the leader entered (meeting time, description, contact email)
    const overrides = customClubDetails[id] || {};

    // Spread operator: overrides take precedence over base data
    return { ...baseClub, ...overrides };
  });
}, [linkedClubIds, customClubDetails]);
```

When a leader customizes their club profile (description, meeting schedule, contact email), those changes are stored in `customClubDetails` and merged over the static `CALVIN_CLUBS` data whenever the club is displayed.

---

## 14. Create Post Screen — The Composer

**File:** [`client/src/app/(tabs)/post.tsx`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/app/(tabs)/post.tsx)

This is the longest file in the project (1,281 lines). It handles the complete form for creating a campus post, including image picking, cropping, date/time validation, and publishing.

### Character Limits

```typescript
// post.tsx, lines 80–83
export const MAX_TITLE_LENGTH = 50;       // 2 lines on a small phone screen
export const MAX_DESCRIPTION_LENGTH = 280; // Standard micro-blogging length (like a tweet)
export const MAX_LOCATION_LENGTH = 25;     // Fits beside map pin icon in one line
export const MAX_CUSTOM_WHEN_LENGTH = 25;  // Fits inside the date pill badge
```

### Form Validation Gate — `canPublish`

```typescript
// post.tsx, lines 504–511
const canPublish =
  Boolean(isLeader) &&          // Must be a verified club leader
  Boolean(activeClub) &&        // Must have a club selected
  isTitleValid &&               // Title: 1–50 chars
  isDescValid &&                // Description: 1–280 chars
  isWhereValid &&               // Location: ≤ 25 chars
  isCustomWhenValid &&          // Custom when: ≤ 25 chars (if using freeform mode)
  (isCustomWhen || (isDateValid && isTimeValid && isEndTimeValid && !whenError));
  //   ↑ Freeform text OR structured date+time both valid
```

### Image Picking Flow — `handlePickImage`

```typescript
// post.tsx, lines 176–261
const handlePickImage = async () => {
  // Step 1: Request OS photo library permissions
  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Photo Library Access', 'Please enable photo library permissions...');
      return;
    }
  }

  // Step 2: Open the native photo picker
  // WHY allowsEditing: false?
  // iOS's native crop enforces square crops. We use our own InlineImageCropper
  // to enforce exactly 16:9 (widescreen banner aspect ratio).
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false, // Disable native crop
    quality: 1,           // Full quality
  });

  if (result.canceled) return;

  const asset = result.assets[0];
  let width = asset.width ?? 0;
  let height = asset.height ?? 0;

  // Step 3: Probe actual pixel dimensions
  // Some Android gallery providers return 0 for width/height in picker metadata.
  // manipulateAsync forces a no-op transform that returns accurate dimensions.
  try {
    const probe = await manipulateAsync(asset.uri, [], { compress: 1 });
    if (probe.width > 0 && probe.height > 0) {
      width = probe.width;
      height = probe.height;
    }
  } catch (probeErr) {
    // Fallback: use RNImage.getSize if manipulateAsync fails
  }

  // Step 4: Set the raw image state and enter interactive 16:9 crop mode
  setRawImage({ uri: finalUri, width, height });
  setIsEditing(true); // Shows the inline crop interface
};
```

### Auto-Commit Crop on Tab Switch

```typescript
// post.tsx, lines 314–319
useEffect(() => {
  if (!isPostTabActive && isEditing) {
    // The user switched to another tab while a crop was in progress
    // Automatically save their current crop transform (same as tapping "Done")
    handleSaveCropRef.current();
  }
}, [isPostTabActive, isEditing]);
```

### Publishing — `handlePublish`

```typescript
// post.tsx, lines 691–770
const handlePublish = async () => {
  // Step 1: Guard: only submit if all validation passes
  if (!canPublish || !activeClub) return;

  // Step 2: Auto-commit any active crop that the user didn't explicitly save
  if (isEditing && cropperRef.current) {
    const cropRes = await cropperRef.current.applyCrop();
    if (cropRes) finalImageUrl = cropRes.uri;
    setIsEditing(false);
  }

  // Step 3: Auto-complete 2-digit years (e.g. "26" → "2026")
  const completedDate = completeDateDigits(rawDate);
  if (completedDate !== rawDate) setRawDate(completedDate);

  // Step 4: Send the post to FeedContext
  createPost({
    club: activeClub,
    title: trimmedTitle,
    description: trimmedDescription,
    image: finalImageUrl ?? undefined,
    when: computedWhen,     // "Tuesday, Oct 24, 2026 · 7:00 – 9:00 PM"
    where: computedWhere,   // "North Hall 276"
  });

  // Step 5: Reset all form fields to blank/default
  setTitle(''); setDescription(''); setImageUrl(null);
  setRawDate(''); setRawTime(''); setRawEndTime('');
  // ... etc

  // Step 6: Dismiss keyboard, scroll to top, show success modal
  Keyboard.dismiss();
  scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  setShowSuccessModal(true);
};
```

---

## 15. Preset Banners — The Visual Fallback System

**File:** [`client/src/constants/preset-banners.ts`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/constants/preset-banners.ts)

When a Calvin event has no image (or has a generic Calvin placeholder), the adapter assigns a preset banner. These are bundled SVG files displayed as a colored background + transparent pattern overlay.

### The URI Format

Preset banners use a simple colon-delimited URI format:

```
preset:{color}:{pattern}
```

Examples:
- `preset:maroon:diamonds` — Calvin Maroon background with diamond pattern
- `preset:forest:trees` — Forest green background with tree silhouette pattern
- `preset:navy:arches` — Midnight navy background with arch pattern (used for Academics)
- `preset:maroon:none` — Solid maroon with no pattern (used for Official notices)

### Parsing the URI

```typescript
// preset-banners.ts, lines 340–359
export function parsePresetBannerUri(uri: string | null | undefined): {
  color: PresetColorId;
  pattern: PresetPatternId;
} {
  if (!isPresetBanner(uri)) {
    return { color: 'maroon', pattern: 'none' }; // Safe default
  }

  // Remove the "preset:" prefix and split on ":"
  const raw = uri.slice('preset:'.length); // e.g. "maroon:diamonds"
  const parts = raw.split(':');
  const colorPart = parts[0]; // "maroon"
  const patternPart = parts[1] ?? 'none'; // "diamonds"

  // Validate: if the color/pattern ID doesn't exist, fall back to safe defaults
  const validColor: PresetColorId = PRESET_COLORS[colorPart] ? colorPart : 'maroon';
  const validPattern: PresetPatternId = PRESET_PATTERNS[patternPart] ? patternPart : 'none';

  return { color: validColor, pattern: validPattern };
}
```

### Resolving to Render Details

```typescript
// preset-banners.ts, lines 384–404
export function getPresetBannerDetails(uriOrColor: string | null | undefined): PresetBannerDetails {
  const { color, pattern } = parsePresetBannerUri(uriOrColor);
  const colorConfig = PRESET_COLORS[color]; // e.g. { color: '#5E1A24', accentColor: '#E8B019' }
  const patternConfig = PRESET_PATTERNS[pattern]; // e.g. { patternAsset: require(...) }

  return {
    colorHex: colorConfig.color,           // Background fill color
    accentColor: colorConfig.accentColor,  // Used to tint the SVG pattern
    patternAsset: patternConfig.patternAsset, // The SVG file (null for 'none')
    colorName: colorConfig.name,           // Human-readable name
    patternName: patternConfig.name,
    colorId: color,
    patternId: pattern,
  };
}
```

In `PostCard`, this becomes:
```tsx
// post-card.tsx, lines 165–176
<View style={[styles.image, { backgroundColor: presetDetails.colorHex }]}>
  {presetDetails.patternAsset ? (
    <Image
      source={presetDetails.patternAsset}
      tintColor={presetDetails.accentColor}  // e.g. Gold tint over maroon background
      contentFit="cover"
      style={StyleSheet.absoluteFill}
    />
  ) : null}
</View>
```

---

## 16. The Backend Server

**File:** [`server/server.js`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/server/server.js)

A simple [Express](https://expressjs.com/) HTTP server running on port 3000. Express is a minimal web framework for Node.js — it lets you define API routes with very little boilerplate.

### Server Setup (lines 1–16)

```javascript
const express = require('express');
const cors = require('cors');    // Cross-Origin Resource Sharing — allows browser to call this API
require('dotenv').config();       // Loads .env file into process.env
const { createClient } = require('@supabase/supabase-js');
const { scrapeEvents } = require('./services/event-scraper');

const app = express();
const PORT = process.env.PORT || 3000; // Default port 3000

app.use(cors());           // Allow requests from any origin (needed for dev)
app.use(express.json());   // Parse JSON request bodies automatically
```

### All API Endpoints

**`GET /health`** (lines 19–25) — Quick check that the server is running:
```javascript
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'connected' });
});
```

**`GET /api/student`** (lines 28–55) — Returns the logged-in student's profile. Falls back to hardcoded demo data if the database is unavailable:
```javascript
app.get('/api/student', async (req, res) => {
  try {
    const { data, error } = await supabase.from('students').select('*').limit(1).single();
    if (error || !data) {
      // Database error or empty: return hardcoded "Alex Knight" demo profile
      return res.json({ id: '1234567', name: 'Alex Knight', email: 'ak23@calvin.edu', ... });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

**`GET /api/dining/venues`** (lines 58–89) — Returns dining hall status (currently hardcoded):
```javascript
app.get('/api/dining/venues', async (req, res) => {
  res.json([
    { id: 'commons', name: 'Commons Dining Hall', status: 'Open', hours: '4:45 PM - 7:30 PM' },
    { id: 'johnnys', name: "Johnny's Cafe", status: 'Open', hours: '7:30 AM - 11:00 PM' },
    // ...
  ]);
});
```

**`GET /api/clubs?category=&search=`** (lines 92–128) — Returns campus clubs with optional filtering.

**`GET /api/events?pages=3&category=&refresh=false`** (lines 130–154) — The main events endpoint. Calls the scraper and returns fresh or cached Calvin events.

**`GET /api/safety/contacts`** (lines 157–164) — Returns campus safety phone numbers.

### Why `module.exports = app` (line 172)?

```javascript
// server.js, lines 166–172
if (require.main === module) {
  // Only start listening if this file was run directly (node server/server.js)
  app.listen(PORT, () => console.log(`Knightly server running on port ${PORT}`));
}

module.exports = app; // Export the app for testing (so tests can import it without starting the server)
```

This pattern allows the server tests to `require('./server.js')` and test routes without actually starting an HTTP server.

---

## 17. Design System — Colors, Fonts, and Spacing

**File:** [`client/src/constants/theme.ts`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/constants/theme.ts)

Every color, spacing value, and border radius in the app comes from here. **Never hardcode hex values directly in components** — always import from this file.

### Brand Colors

```typescript
// theme.ts, lines 31–64
export const Brand = {
  // PRIMARY PALETTE
  maroon: '#5E1A24',         // Calvin Maroon — TUNED for screens (darker than official print color)
  maroonClassic: '#8C2131',  // Official Pantone 201 C — used as a reference / in banners
  maroonDark: '#450F18',     // Very dark maroon for press states
  maroonLight: '#8C2131',    // Lighter maroon for subtle accents
  gold: '#E8B019',           // Collegiate Gold
  goldDark: '#B38410',       // Darker gold for text on light backgrounds
  goldSoft: '#FFFBEA',       // Very pale gold for subtle backgrounds

  // SECONDARY PALETTE (Calvin official brand extensions)
  brightRed: '#C2002F',      // Error states, danger alerts
  renewBlue: '#71B1C8',      // Info/link color
  trueGreen: '#A2D683',      // Success states
};
```

> **Why `#5E1A24` instead of `#8C2131`?**
> Calvin's official print color is Pantone 201 C = `#8C2131`. On paper, ink absorbs ambient light giving it a dark, regal appearance. But on backlit phone OLED screens, the same color emits as bright saturated red/magenta — it looks like an error notification. The tuned value `#5E1A24` is darker and cooler, restoring the rich stately maroon feel on digital displays.

### Semantic Color Tokens — Light and Dark Mode

```typescript
// theme.ts, lines 66–115
export const Colors = {
  light: {
    text: '#11181C',            // Nearly black — primary text on light backgrounds
    textSecondary: '#545F68',   // Gray — secondary/caption text
    textMuted: '#838D95',       // Lighter gray — timestamps, subtle labels
    background: '#F6F6F8',      // Off-white — page/screen background
    backgroundElement: '#FFFFFF', // Pure white — card backgrounds, inputs
    backgroundSelected: '#ECECEF', // Light gray — selected states
    border: '#E0E2E7',           // Light gray — dividers, card outlines
    tint: Brand.maroon,          // Primary action color (buttons, active tabs, highlights)
    tintSoft: '#F7E9EB',         // Very pale maroon — soft accent backgrounds
    onTint: '#FFFFFF',           // White text on maroon backgrounds
    accent: Brand.gold,          // Secondary highlight (gold badges, CTA buttons)
    danger: Brand.brightRed,     // Error messages, delete buttons
  },
  dark: {
    text: '#F1F2F4',             // Near-white — text on dark backgrounds
    textSecondary: '#9CA3AF',    // Medium gray
    textMuted: '#6B7280',        // Darker gray
    background: '#0B0C0E',       // Almost black — screen background
    backgroundElement: '#141619', // Very dark gray — card backgrounds
    tint: '#D94D60',             // Lighter, brighter maroon for dark mode readability
    // ... (mirrors light mode structure with dark-appropriate values)
  },
};
```

**Why two sets of colors?** Every component uses tokens like `theme.background` instead of `#F6F6F8` directly. The `useTheme()` hook returns either `Colors.light` or `Colors.dark` based on the system setting. This means the entire app automatically switches between light and dark mode with zero component changes.

### The `useTheme` Hook

**File:** [`client/src/hooks/use-theme.ts`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/hooks/use-theme.ts)

```typescript
// use-theme.ts, lines 9–14
export function useTheme() {
  const scheme = useColorScheme(); // Returns 'light', 'dark', or 'unspecified'
  const theme = scheme === 'unspecified' ? 'light' : scheme; // Default to light if unknown
  return Colors[theme]; // Returns either Colors.light or Colors.dark
}
```

Usage in any component:
```typescript
const theme = useTheme();
<View style={{ backgroundColor: theme.background, borderColor: theme.border }}>
  <Text style={{ color: theme.text }}>Hello</Text>
</View>
```

### Spacing Scale

```typescript
// theme.ts, lines 147–155
export const Spacing = {
  half: 2,   // Micro gaps — inside chip labels, between icon and text
  one:  4,   // Small gap — between tightly related elements
  two:  8,   // Standard compact — padding inside small buttons
  three: 16, // Standard — card padding, section gaps (most common)
  four: 24,  // Medium large — between major sections
  five: 32,  // Large — hero section padding
  six:  64,  // Huge — full-screen centered content top offset
};
```

### Border Radius Scale

```typescript
// theme.ts, lines 157–163
export const Radius = {
  sm:   8,   // Small buttons, chips, badges
  md:   12,  // Cards, modal sheets
  lg:   18,  // Post cards, large cards
  xl:   26,  // Large modal dialogs
  pill: 999, // Fully rounded pills (any aspect ratio)
};
```

### Special Constants

```typescript
// theme.ts, lines 165–170
export const WebHeaderInset = 72;      // Height reserved for the top navigation bar on web
export const MaxContentWidth = 800;    // Max content width for centered layouts on wide screens
export const BottomTabContentInset = 96; // Bottom padding so content isn't hidden behind the tab bar
```

---

## 18. Global Context Providers — The "State Brain"

React Context is the mechanism for sharing data between components without manually passing props through every level. Each "Provider" component wraps parts of the tree and makes its data available to any descendant via a matching "hook".

### Complete Provider Map

| Context | File | Hook | What It Tracks |
|---------|------|------|----------------|
| Auth | [`auth-context.tsx`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/context/auth-context.tsx) | `useAuth()` | Login state, user profile, signIn/signOut |
| Feed | [`feed-context.tsx`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/context/feed-context.tsx) | `useFeed()` | All posts, createPost, deletePost |
| Club Follow | [`club-follow-context.tsx`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/context/club-follow-context.tsx) | `useClubFollow()` | Followed club IDs (Set), toggleFollow |
| Club Leadership | [`club-leadership-context.tsx`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/context/club-leadership-context.tsx) | `useClubLeadership()` | Linked clubs, isLeader, claimClub |
| Clubs Navigation | [`clubs-navigation-context.tsx`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/context/clubs-navigation-context.tsx) | `useClubsNavigation()` | `openClubsDirectory()` cross-screen call |
| Starfield | [`starfield-context.tsx`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/context/starfield-context.tsx) | `useStarfield()` | Canvas dimensions for animated star background |
| Tab Navigation | [`tab-navigation-context.tsx`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/context/tab-navigation-context.tsx) | `useTabNavigation()` | Active tab index, for auto-committing crops on tab switch |
| Tab Pager Priority | [`tab-pager-priority-context.tsx`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/context/tab-pager-priority-context.tsx) | — | Swipe gesture priority (prevents scroll conflict with tab swipe) |
| Dining Activity | [`dining-activity-context.tsx`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/context/dining-activity-context.tsx) | — | Dining card swipe animation state |
| Image Cropper | [`image-cropper-context.tsx`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/context/image-cropper-context.tsx) | — | Shared cropper state between post components |

### How to Use a Context

Step 1: Find the context you need (table above).  
Step 2: Import the hook at the top of your file.  
Step 3: Call the hook inside your component.

```typescript
// Example: Reading posts and creating a new one
import { useFeed } from '@/context/feed-context';

function MyComponent() {
  const { posts, createPost } = useFeed();
  
  return (
    <Text>You have {posts.length} posts in the feed</Text>
  );
}
```

The `@/` prefix is a TypeScript path alias that maps to `client/src/`. It's configured in `tsconfig.json`.

---

## 19. Key Utility Functions

### Date Formatting

**File:** [`client/src/utils/date-format.ts`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/utils/date-format.ts)

This file contains all the date and time logic used in the Create Post screen and post card timestamps.

```typescript
// Key functions:

formatEventDate('09/24/2026')
// → "Tuesday, Sep 24, 2026"

formatRelativeTime('2026-09-18T16:00:00Z', 1726678800000)
// → "Just now" (< 1 min)
// → "3 minutes ago" (1–59 min)
// → "2 hours ago" (1–23 hours)
// → "Yesterday" (24–48 hours)
// → "3 days ago" (2–6 days)
// → "Sep 12" (7+ days, same year)
// → "Sep 12, 2025" (different year)

validateDate({ month: '09', day: '31', year: '2026' })
// → "September only has 30 days" (semantic validation)

completeTimeDigits('700')
// → '0700' (pads single-digit hours to 4 digits)

resolveEventTimeRange('0700', 'PM', '0900', 'PM')
// → "7:00 – 9:00 PM" (smart shared AM/PM when both periods match)
```

### Image Fingerprinting

**File:** [`client/src/utils/image-fingerprint.ts`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/utils/image-fingerprint.ts)

```typescript
isCalvinPlaceholderUrl('/sites/default/files/2025-10/athletics.png')
// → true  (exact canonical Drupal path match)

isCalvinPlaceholderUrl('https://example.com/my-custom-athletics-photo.png')
// → false (custom photo — even though filename contains "athletics")
```

The function checks both the **URL path pattern** (Drupal's standard placeholder path structure) and optionally the **SHA-256 hash** of the image bytes for certainty. A custom event photo named `athletics.png` passes through unmodified; only the exact generic Calvin Drupal placeholder is replaced.

### Calvin Event Adapter

**File:** [`client/src/utils/calvin-event-adapter.ts`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/utils/calvin-event-adapter.ts)

Converts a `ScrapedCalvinEvent` (the raw server format) into a `Post` (the client feed format). The key decision it makes:
1. No image → assign category preset banner (`preset:color:pattern`)
2. Image is a generic Calvin placeholder → replace with category preset banner
3. Image is a real photo → keep it unchanged

### Chip Layout Utilities

**File:** [`client/src/utils/chip-layout.ts`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/utils/chip-layout.ts)

Helper functions for calculating the horizontal layout of filter chips on the home screen, ensuring consistent spacing and wrapping behavior.

---

## 20. Built-In Data Files

These files ship as part of the app bundle and are always available, even with no internet connection.

### `data/feed.ts` — Posts and Feed Logic
**File:** [`client/src/data/feed.ts`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/data/feed.ts)

Contains:
- The `Post` type definition (see Section 9)
- The 13 `FeedCategory` values
- 17 hardcoded sample posts (`p1`–`p17`) covering all 13 categories
- All filtering, sorting, and search functions

### `data/clubs.ts` — The Club Directory
**File:** [`client/src/data/clubs.ts`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/data/clubs.ts)

The `CALVIN_CLUBS` array contains every recognized Calvin University club and department with fields like `id`, `name`, `category`, `description`, `tagline`, `contactEmail`, `colors`, `mark`, and icon names.

### `data/club-codes.ts` — Leadership Verification Codes
**File:** [`client/src/data/club-codes.ts`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/data/club-codes.ts)

A table mapping 10-character alphanumeric codes to club IDs. The `checkClubCode(code)` function validates a code and returns the associated club. Real codes would be distributed by Student Life.

### `data/calvin-events-seed.ts` — Offline Event Backup
**File:** [`client/src/data/calvin-events-seed.ts`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/data/calvin-events-seed.ts)

An array of ~50 pre-scraped Calvin events stored as `ScrapedCalvinEvent` objects. Updated by running `node server/scripts/sync-calvin-events.js`. This is the offline fallback when the server is unavailable.

### `data/student.ts` — Default Demo Profile
**File:** [`client/src/data/student.ts`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/data/student.ts)

John Mark Doe (`jmd42@calvin.edu`), a Sophomore Computer Science major in Bolt Hall. Used as the default profile when signing in with the demo account.

### Other Data Files

| File | Contents |
|------|----------|
| [`data/dining.ts`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/data/dining.ts) | Dining hall menus, hours, meal plan info |
| [`data/directory.ts`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/data/directory.ts) | Campus directory entries (faculty, departments) |
| [`data/safety.ts`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/data/safety.ts) | Campus safety contacts (emergency: 616-526-3333) |

---

## 21. Offline Resilience — What Happens Without the Server

One of Knightly's core requirements is that it **never crashes when the backend is offline**. Here is the complete fallback chain:

```
App opens
   │
   ▼
FeedProvider.getInitialPosts() runs synchronously
   │  Uses: defaultPosts (17 hardcoded) + CALVIN_EVENTS_SEED (50 pre-saved)
   │  Assigns fake timestamps spread over past few days
   │  Sorts newest-first
   │
   ▼
Feed is immediately visible and scrollable
   │  ← User can already use the app at this point
   │
   ▼ (async, in background)
fetchCampusEvents() attempts HTTP request to localhost:3000/api/events
   │  AbortController: auto-cancels after 2000ms (2 seconds)
   │
   ├── Server responds in < 2s?
   │       ▼
   │   Replace CALVIN_EVENTS_SEED posts with live scraped events
   │   (non-Calvin posts remain unchanged)
   │
   └── Server timeout or error?
           ▼
       Catch block silently swallowed
       Seed data remains — app continues working perfectly
```

The 2-second timeout is the critical safety valve:

```typescript
// events-api.ts, lines 28–34
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second cutoff

const res = await fetch(`${API_BASE_URL}/events?pages=${pages}`, {
  signal: controller.signal, // This fetch is linked to the AbortController
});
clearTimeout(timeoutId); // If we got here, request succeeded before timeout
```

When `controller.abort()` is called, the `fetch` throws an `AbortError`, which the surrounding `try/catch` silently handles. The function then falls through to the seed data return at the bottom.

---

## 22. Quick Reference: Where Is X?

| "I want to..." | File | Key function/export |
|---|---|---|
| Change a color | [`constants/theme.ts`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/constants/theme.ts) | `Brand`, `Colors` |
| Add a new route/screen | Create file in [`app/`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/app) | Expo Router auto-discovers |
| Add a new post category | [`data/feed.ts`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/data/feed.ts) + [`server/services/category-mapper.js`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/server/services/category-mapper.js) | `FeedCategory`, `CATEGORY_RULES` |
| Add a new club | [`data/clubs.ts`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/data/clubs.ts) | `CALVIN_CLUBS` array |
| Change the login logic | [`context/auth-context.tsx`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/context/auth-context.tsx) | `signIn()` |
| Change how posts are filtered | [`data/feed.ts`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/data/feed.ts) | `filterFeedPosts()` |
| Change how events are fetched | [`services/events-api.ts`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/services/events-api.ts) | `fetchCampusEvents()` |
| Change how Calvin events are scraped | [`server/services/event-scraper.js`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/server/services/event-scraper.js) | `scrapeEvents()`, `parseEventsHtml()` |
| Change event category classification | [`server/services/category-mapper.js`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/server/services/category-mapper.js) | `classifyEvent()`, `CATEGORY_RULES` |
| Change what follows are pre-seeded | [`context/club-follow-context.tsx`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/context/club-follow-context.tsx) | `DEFAULT_FOLLOWED_CLUB_IDS` |
| Change post card appearance | [`components/post-card.tsx`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/components/post-card.tsx) | `PostCard` |
| Change the preset banner colors | [`constants/preset-banners.ts`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/constants/preset-banners.ts) | `PRESET_COLORS` |
| Change the version number | [`constants/version.ts`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/constants/version.ts) + `client/package.json` | `APP_VERSION` |
| Read which clubs a user leads | [`context/club-leadership-context.tsx`](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/client/src/context/club-leadership-context.tsx) | `useClubLeadership()` → `linkedClubs` |
| Update the offline seed events | Run: `node server/scripts/sync-calvin-events.js` | Writes to `data/calvin-events-seed.ts` |
| Run client tests | `npm --prefix client test` | — |
| Run server tests | `npm --prefix server test` | — |
| Check TypeScript errors | `npx --prefix client tsc --noEmit` | — |
| Start the backend server | `node server/server.js` | Runs on localhost:3000 |
| Start the Expo dev client | `npm --prefix client start` | — |

---

*Generated for the Knightly codebase — For the full technical architecture specification, see [ARCHITECTURE.md](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/docs/ARCHITECTURE.md). For coding standards, see [CodingStandard.md](file:///C:/Users/great/Documents/CSProjects/CS262/knightly/docs/CodingStandard.md).*
