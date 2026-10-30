import assert from 'node:assert/strict';
import Module from 'node:module';
import { mock, test } from 'node:test';
import type { ReactElement } from 'react';

type Element = ReactElement<Record<string, unknown>>;
type EndEvent = { translationX: number; velocityX: number };

/** Check the actual route's Back and header handlers with native rendering at the boundary. */
test('standalone map keeps web history, direct-link fallback, and header-only swipe-back', () => {
  const React = require('react') as Record<string, unknown>;
  let canGoBack = false;
  let backCalls = 0;
  let replacement = '';
  let onEnd: (event: EndEvent) => void = () => {};
  const pan = {
    minPointers: () => pan, maxPointers: () => pan,
    activeOffsetX: () => pan, failOffsetY: () => pan,
    onEnd: (callback: typeof onEnd) => { onEnd = callback; return pan; },
  };
  const stubs = new Map<string, unknown>([
    ['react', { ...React, useCallback: (callback: unknown) => callback, useMemo: (factory: () => unknown) => factory() }],
    ['react-native', { useWindowDimensions: () => ({ width: 390 }) }],
    ['expo-router', { router: {
      canGoBack: () => canGoBack,
      back: () => { backCalls++; },
      replace: (route: string) => { replacement = route; },
    } }],
    ['react-native-gesture-handler', { Gesture: { Pan: () => pan } }],
    ['react-native-reanimated', { runOnJS: (callback: unknown) => callback }],
    ['@/components/campus-map-content', { CampusMapContent: 'MapContent' }],
    ['@/components/ui/header-back-button', { HeaderBackButton: 'Back' }],
    ['@/components/ui/screen', { Screen: 'Screen' }],
    ['@/components/ui/swipeable-app-header', { SwipeableAppHeader: 'Header' }],
  ]);
  const loader = Module as unknown as { _load: (request: string, ...args: unknown[]) => unknown };
  const originalLoad = loader._load;
  const loadMock = mock.method(loader, '_load', (request: string, ...args: unknown[]) =>
    stubs.has(request) ? stubs.get(request) : Reflect.apply(originalLoad, loader, [request, ...args]));
  try {
    const Screen = (require('@/app/campus-map') as { default: () => Element }).default;
    const screen = Screen();
    const header = screen.props.header as Element;
    const back = header.props.left as Element;
    assert.equal(header.props.gesture, pan);
    assert.equal(back.props.accessibilityLabel, 'Go back to Safety');
    assert.equal((screen.props.children as Element).type, 'MapContent');
    assert.equal((screen.props.children as Element).props.gesture, undefined, 'map body must not capture header navigation');
    (back.props.onPress as () => void)();
    assert.equal(replacement, '/(tabs)/safety');
    canGoBack = true;
    (back.props.onPress as () => void)();
    assert.equal(backCalls, 1);
    onEnd({ translationX: 30, velocityX: 0 });
    assert.equal(backCalls, 1, 'short header movement keeps the map open');
    onEnd({ translationX: 200, velocityX: 0 });
    assert.equal(backCalls, 2);
    onEnd({ translationX: -200, velocityX: -700 });
    assert.equal(backCalls, 2, 'leftward swipe cannot go back');
  } finally {
    loadMock.mock.restore();
  }
});
