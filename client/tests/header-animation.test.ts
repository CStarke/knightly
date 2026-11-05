import assert from 'node:assert/strict';
import Module from 'node:module';
import { mock, test } from 'node:test';
import type { ReactElement } from 'react';
import type { HeaderOverlay } from '@/components/ui/header-overlay';

test('page headers fade by default, reserve initial space and avoid per-frame timed animations', () => {
  const React = require('react') as Record<string, unknown>;
  const shared: Array<{ value: unknown }> = [];
  const timings: number[] = [];
  let reactToScroll: (offset: number) => void = () => {};
  const stubs = new Map<string, unknown>([
    ['react', { ...React,
      useState: (initial: unknown) => [typeof initial === 'function' ? initial() : initial, () => {}],
      useEffect: (effect: () => void) => effect(),
    }],
    ['react-native', { Platform: { OS: 'ios' }, View: 'View', StyleSheet: { create: (styles: unknown) => styles } }],
    ['react-native-safe-area-context', { useSafeAreaInsets: () => ({ top: 0 }) }],
    ['@/components/ui/app-header', { getAppHeaderHeight: () => 84 }],
    ['@/constants/theme', { HeaderTopInset: 0, Spacing: { two: 8, three: 16 } }],
    ['@/constants/motion', { HeaderMotion: { revealDuration: 340, easing: (value: number) => value } }],
    ['react-native-reanimated', {
      __esModule: true, default: { View: 'AnimatedView' },
      useSharedValue: (value: unknown) => { const cell = { value }; shared.push(cell); return cell; },
      useAnimatedReaction: (_prepare: unknown, react: typeof reactToScroll) => { reactToScroll = react; },
      useAnimatedStyle: (factory: () => unknown) => factory(),
      useAnimatedProps: (factory: () => unknown) => factory(),
      withTiming: (target: number) => { timings.push(target); return target; },
    }],
  ]);
  const loader = Module as unknown as { _load: (request: string, ...args: unknown[]) => unknown };
  const originalLoad = loader._load;
  const loadMock = mock.method(loader, '_load', (request: string, ...args: unknown[]) =>
    stubs.has(request) ? stubs.get(request) : Reflect.apply(originalLoad, loader, [request, ...args]));
  try {
    const Overlay = (require('@/components/ui/header-overlay') as { HeaderOverlay: typeof HeaderOverlay }).HeaderOverlay;
    const tree = Overlay({ header: 'Header', children: 'Content' }) as ReactElement<{ value: number }>;
    assert.equal(tree.props.value, 84, 'content must reserve header space on the very first render');
    for (const offset of [0, 192, 300, 400, 800, 1192]) reactToScroll(offset);
    assert.deepEqual(timings, [], 'downward scrolling must not restart an easing animation each frame');
    assert.equal(shared[2].value, 0);
    reactToScroll(1170);
    assert.deepEqual(timings, [1], 'a small upward scroll triggers a single smooth reveal');
    reactToScroll(1160);
    assert.deepEqual(timings, [1], 'continuing upward must not restart the reveal');
  } finally { loadMock.mock.restore(); }
});
