# Campus map phantom page

## Agreed behavior

On iOS/Android, select **Safety → Campus map**. The map opens in the existing horizontal pager at slot 3, with Safety remaining the parent at slot 2. This does not add a permanent bottom tab. The bottom bar hides while the map is open, as it does for Dining Activity.

Drag inside the map to pan it. Swipe right on the header, tap the header Back button, or press Android Back to return to Safety. Short/cancelled header drags settle back on Map. The content pager is disabled for the map's entire mounted lifetime so it cannot steal the map's gestures. The map remains rendered through the closing animation.

Web retains the existing `/campus-map` route, matching the project's routed web subpage approach. Its header supports Back and a rightward swipe; direct visits without navigation history fall back to Safety. The native standalone route remains available for direct links, while normal entry from native Safety uses the phantom page.

## Adaptation to the October 30 upload

This revision applies the map feature to the latest supplied main snapshot, rather than replacing main with the previous feature ZIP. It preserves the new memoized starfield context, the tab-button fix that prevents duplicate navigation, directory privacy onboarding, the updated test setup, and all newly merged database/service and login changes. No removed login components were restored.

The only merge overlaps were the pager provider/header region and the standalone map route comment. The map wrapper now uses the existing `starfieldContextValue`; the root layout retains the full directory onboarding flow. Package and lockfile dependency entries are unchanged from the latest upload. The single feature version increment is recalculated from 0.7.1 to 0.8.0.

Use the patch in this ZIP, not the earlier patch based on 0.6.1. It includes the whole map feature relative to the latest main snapshot; do not apply it on top of an already-applied earlier map patch without reconciling that branch.

## Code to review

| File under `client/` | Purpose |
| --- | --- |
| `src/hooks/use-phantom-page.ts` | Reusable native lifecycle, header drag, Back handling, resize/resume recovery, and animation completion. |
| `src/utils/phantom-page.ts` | Pure, immutable transition rules and worklet-safe swipe calculations. |
| `src/constants/phantom-tabs.ts` | Map registration, Safety ownership, and trailing-slot blanking. |
| `src/components/app-tabs.tsx` | Connects the map controller to the existing camera, header, slot rendering, focus, and tab navigation. |
| `src/context/campus-map-navigation-context.tsx` | Native Map entry action with a routed web fallback. |
| `src/components/safety-sections.tsx` | Existing Map row calls that shared action; removes its unsafe route cast. |
| `src/components/campus-map-content.tsx` | Shared map body with memoized HTML and bottom safe-area inset. |
| `src/components/ui/swipeable-app-header.tsx` | Shared header-only gesture wrapper around the existing AppHeader. |
| `src/app/campus-map.tsx` | Standalone web/direct-link screen using the shared map body and header. |
| `src/app/_layout.tsx` | Updates the route comment to describe its retained web/direct-link purpose. |

Bundled map data, map HTML controls, native WebView restrictions/error handling, and the web iframe sandbox are unchanged. No new dependencies or backend/API changes were introduced.

## Automated tests

- `tests/campus-map-phantom.test.ts`: 11 tests covering registration, parent isolation, closing visibility, immutable transitions, stale completions, repeated close/reset, threshold boundaries, invalid measurements, resize scaling, and elastic drag bounds.
- `tests/campus-map-lifecycle.test.ts`: Executes the actual hook against mocked React/native boundaries. Covers header camera motion, Android Back, repeated Back during closing, rapid reopen, cancelled/short drags, rotation, activity transitions, completed exit, navigation away, invalid width, and listener cleanup.
- `tests/campus-map-route.test.ts`: Executes the actual standalone route. Covers header versus content gesture placement, accessible Back label, web history, Safety fallback, and short/right/left header swipes.
- `tests/navigation-and-tabs.test.ts`: Extends the existing registry invariant to include Map.

The hook test controls animation completion explicitly. It does not use real-time sleeps or duplicate the hook's navigation implementation. Native gesture recognizers, rendering, and animation physics remain device-test responsibilities.

## Verification results

- Client: **1,097 tests passed; 0 failed** (13 added map tests).
- Server: **45 tests passed; 0 failed**.
- TypeScript: **0 errors**.
- Expo production export: **web, iOS, and Android JavaScript bundles generated**.
- Whitespace/diff check: passed.

The normal client command was attempted, but this environment denied the Unix socket used by the `tsx` CLI (`listen EPERM`). The same Node test runner, TypeScript loader, setup file, and test files passed using:

```bash
cd client
node --import tsx -r ./test-setup.js --test --test-reporter=tap tests/*.test.ts
npx tsc --noEmit
```

The repository's test script was left unchanged. On your machine, run the team's normal commands from the repository root:

```bash
npm --prefix client ci
npm --prefix server ci
npm --prefix client test
npm --prefix server test
cd client
npx tsc --noEmit
```

## Device acceptance checks still required

These checks have not been performed on a physical device or emulator in this environment. Bundling and mocked native tests do not prove touch behavior.

1. On iOS and Android, open Safety → Campus map. Confirm a single standard header, full map area, hidden bottom bar, and no blank flash.
2. Pan the map horizontally and vertically, use its zoom/Fit controls, and verify the app does not switch tabs. Keep the existing supported map controls working.
3. Drag the header right a short distance and release: Map should stay open. Drag over 40% of the page width or flick right: Safety should return. A leftward header swipe must not reveal Directory/Post.
4. Cancel a header drag or add a second finger. The map page should settle rather than remain between slots.
5. Test header Back and Android Back, including repeated presses while the closing slide is running. Safety should remain the return destination and its bottom bar should reappear.
6. Rotate the device and background/foreground the app while Map is open, during a header drag, and during exit.
7. Test both student and club-leader accounts. Hidden pages must not receive screen-reader focus; the leader's Post page must not appear during map overscroll.
8. Close/reopen Map repeatedly; verify zoom does not reset merely from unrelated renders while open. Closing fully intentionally creates a fresh viewer on the next opening, preserving the existing error-recovery behavior.
9. Test light/dark themes and airplane mode. Check the existing native viewer error message and recovery by closing/reopening if a load fails.
10. On desktop and mobile web, open the map from Safety, use Back, refresh a direct `/campus-map` visit, and try a header swipe. Ensure map panning and keyboard controls still work.

## Version and integration

This change is based on the newly uploaded main snapshot, archive commit `84c14890c4da7366bfc931f4e5c8f1a5fae9c969`, whose application version was `0.7.1`. The feature version is `0.8.0`, synchronized in the source constant, client package, and lockfile. The changelog records the feature separately from the existing changes.

The download includes the complete updated repository and `campus-map.patch`, which contains only this feature’s changes against the uploaded snapshot. From a clean feature branch based on that snapshot, run `git apply --check /path/to/campus-map.patch` before `git apply /path/to/campus-map.patch`. If the check reports conflicts, reconcile against your current main rather than overwriting files.

No remote branch was fetched, pushed, or merged. Before your PR, rebase your feature branch onto the team's current main and recalculate the single feature-version increment if main has advanced. Keep the original snapshot's unrelated work intact.

This implementation and its tests were prepared with ChatGPT/Codex assistance. Review the code and record AI assistance in the format required for your course/team submission. Do not describe the pending device checks as completed.
