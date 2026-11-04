# Rendering and scroll performance

The performance pass focuses on reducing work per frame and avoiding layout shifts, without changing News-only header fading, offline fallback behavior, category taxonomy, or star density.

## Changes and measurable work limits

| Area | Before | After |
| --- | --- | --- |
| Starfield | One native View per star, plus glow/shadow and sparkle views | Three cached SVG image layers with direct shapes; the existing seeded positions, density, 5:3:1 ratio and 1,800-star cap remain |
| Relative timestamps | One timer per mounted card, updating the entire card | One shared timer, stopped in background and when unused; only timestamp components update |
| News header | New timed animation on each scroll event | Direct downward scroll progress; one timed reveal after upward intent |
| Initial header layout | Content starts with zero header inset, then moves after measurement | Initial inset uses the actual title/caption line heights; measurement only reconciles changes |
| Native tab startup | Every tab screen renders immediately | Current and adjacent screens render first; visited screens stay mounted to retain state |
| Feed rows | Native index-based row keys; mobile web renders all cards | Stable post-ID row keys; narrow web uses the same bounded list as native |
| Offline feed refresh | Replaces visible seed records with re-timestamped fallback records | Preserves the rendered array and records when the request fails |
| Request deadlines | Rejected requests can leave timeout callbacks queued | All API calls release deadlines in a shared `finally` block |

`client/tests/performance-regressions.test.ts` verifies timer sharing/lifecycle, batched-star invariants, deadline cleanup/abort behavior and offline feed identity. Existing navigation, form, feed and lifecycle tests guard behavior.

`client/tests/header-animation.test.ts` exercises the real header component with native boundaries mocked: it verifies the initial content inset, zero timed animation restarts during downward scrolling, and a single timed reveal on upward intent. The feed screen regression also verifies virtualization and stable keys on narrow web viewports.

## Verification

- Client: 1,110 tests passed, zero failures.
- Server: 48 tests passed, zero failures.
- Documented root command `npx --prefix client tsc --noEmit`: zero errors.
- Production Expo export: iOS, Android and web bundles generated successfully in `client/.expo/performance-export`.
- `git diff --check`: passed.

The batched star glow uses concentric translucent circles rather than native per-star shadow blurs. This deliberately reduces compositing work; inspect both themes on devices for visual acceptance.

## Device measurement still required

Automated tests and successful bundles establish correctness and bounded work, not a measured FPS improvement. No low-end-device frame-time, memory or battery measurements were available during this pass.

Use the same physical device and data for before/after release-build profiles. Development-mode timing is not representative of production. Record JS/UI frame times, dropped frames and memory for:

1. Cold sign-in and the final wordmark handoff; the feed should not shift after the header measures.
2. A long News scroll, repeated direction changes, filtering and saving cards. Confirm images and text stay attached on iOS and Android.
3. Rapid tab changes, then return to a scrolled page and a partially completed post. Confirm retained state and smooth adjacent-page swiping.
4. Keyboard show/hide, image cropper, map pan/zoom and rotation. Confirm the sky does not regenerate merely because the keyboard resizes the window.
5. Background/foreground, sign-out/account switches and airplane mode. Confirm timestamps refresh on resume and fallback refresh does not rearrange the feed.

Useful references: [React Native list configuration](https://reactnative.dev/docs/optimizing-flatlist-configuration), [Expo SDK 58 image caching and recycling](https://docs.expo.dev/versions/v58.0.0/sdk/image/), and [Reanimated reactions](https://docs.swmansion.com/react-native-reanimated/docs/advanced/useAnimatedReaction/).
