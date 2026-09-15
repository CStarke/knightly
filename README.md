# Calvin — student app prototype

A prototype of a Calvin University student app, built on Expo SDK 57 (expo-router,
native tabs, React Native 0.86). **Every piece of data in here is hardcoded** — no
network calls, no auth, no backend.

## Running it

```bash
npm install
npm start      # then press i / a / w
```

## What's in it

Four tabs. You can swipe left and right between them, or tap the bottom bar.

**Knightly** (`src/app/(tabs)/index.tsx`) — the feed. Scrollable club and campus posts that
read fully in place; there is no article detail screen to tap into. Two modes:

- *For you* — orgs the student follows, plus anything campus-wide.
- *All campus* — every post, with a search field and category filters (The Arts,
  Athletics, Music, Academics, Faith, Service, Social, Outdoors).

**Dining** (`src/app/(tabs)/dining.tsx`) — meal plan and Knight Card. The maroon card
is one big button: tapping it opens the student ID full screen (`src/app/card.tsx`,
a root-level modal so it covers the tab bar too), raises
screen brightness via `expo-brightness` so a scanner can read it, and restores the
previous brightness when you tap again to dismiss. Swipes and guest passes use
unit-based dash meters — one rounded dash per meal. Also dining hall hours computed
against the current time, today's stations, and recent transactions.

**Safety** (`src/app/(tabs)/safety.tsx`) — a call button wired to `tel:`, Safe Walk /
report / blue light entry points, recent alerts, and the campus numbers list.

**Directory** (`src/app/(tabs)/directory.tsx`) — searchable, filterable list of
students, faculty, and staff. Rows open the mail client.

## Notes

- The barcode in `src/components/barcode.tsx` is a real Code 39 encoder drawn with
  views, so there is no barcode image to ship. It scales its bar width to fit.
- Design tokens (Calvin maroon `#862633`, gold `#FFC72C`, spacing, radii, light and
  dark palettes) live in `src/constants/theme.ts`.
- Tabs are the headless `expo-router/ui` navigator with a custom bottom bar
  (`src/components/app-tabs.tsx`). A follow-my-finger horizontal pan gesture allows
  swiping smoothly left and right between tabs in real time with elastic edge
  resistance and physics-based spring snapping on release. Tapping the bottom bar
  slides smoothly to the selected tab. Web keeps its own top bar in
  `src/components/app-tabs.web.tsx`.
- NFC building access is mocked as a "coming soon" card — nothing is wired up.

## Data

| File | Holds |
| --- | --- |
| `src/data/student.ts` | The signed-in student |
| `src/data/feed.ts` | Club and campus posts |
| `src/data/dining.ts` | Meal plan, halls, hours, transactions |
| `src/data/directory.ts` | People |
| `src/data/safety.ts` | Alerts and emergency numbers |
