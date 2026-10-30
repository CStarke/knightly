import assert from 'node:assert/strict';
import Module from 'node:module';
import { mock, test } from 'node:test';
import type { usePhantomPage } from '@/hooks/use-phantom-page';

type Event = { translationX: number; velocityX: number };
type Effect = () => void | (() => void);
type Cell = { value?: unknown; deps?: readonly unknown[]; cleanup?: () => void };

/** Records native gesture callbacks while keeping the hook's navigation code real. */
class PanBoundary {
  enabledValue = false;
  start: () => void = () => {};
  update: (event: Event) => void = () => {};
  end: (event: Event) => void = () => {};
  finalize: () => void = () => {};
  enabled(value: boolean): this { this.enabledValue = value; return this; }
  minPointers(): this { return this; }
  maxPointers(): this { return this; }
  activeOffsetX(): this { return this; }
  failOffsetY(): this { return this; }
  onStart(callback: () => void): this { this.start = callback; return this; }
  onUpdate(callback: (event: Event) => void): this { this.update = callback; return this; }
  onEnd(callback: (event: Event) => void): this { this.end = callback; return this; }
  onFinalize(callback: () => void): this { this.finalize = callback; return this; }
}

test('real phantom hook handles back, gestures, races, rotation, resume, and cleanup', () => {
  const React = require('react') as Record<string, unknown>;
  const cells: Cell[] = [];
  let cursor = 0;
  let effects: Array<() => void> = [];
  let appListener: (() => void) | undefined;
  let backListener: (() => boolean) | undefined;
  const completions: Array<{ target: number; finish: (finished: boolean) => void }> = [];
  const cell = (): Cell => cells[cursor++] ?? (cells[cursor - 1] = {});
  const changed = (previous: readonly unknown[] | undefined, next: readonly unknown[]): boolean =>
    !previous || previous.length !== next.length || next.some((value, index) => !Object.is(value, previous[index]));
  const memo = (factory: () => unknown, deps: readonly unknown[]): unknown => {
    const slot = cell();
    if (changed(slot.deps, deps)) { slot.value = factory(); slot.deps = deps; }
    return slot.value;
  };
  const timing = (target: number, _config: unknown, finish?: (finished: boolean) => void): number => {
    if (finish) completions.push({ target, finish });
    return target;
  };
  const stubs = new Map<string, unknown>([
    ['react', {
      ...React,
      useState: (initial: unknown) => {
        const slot = cell();
        if (!('value' in slot)) slot.value = initial;
        return [slot.value, (value: unknown) => { slot.value = value; }];
      },
      useRef: (initial: unknown) => memo(() => ({ current: initial }), []),
      useMemo: memo,
      useCallback: (callback: unknown, deps: readonly unknown[]) => memo(() => callback, deps),
      useEffect: (effect: Effect, deps: readonly unknown[]) => {
        const slot = cell();
        if (changed(slot.deps, deps)) {
          slot.deps = deps;
          effects.push(() => { slot.cleanup?.(); slot.cleanup = effect() || undefined; });
        }
      },
    }],
    ['react-native', {
      AppState: { addEventListener: (_event: string, listener: () => void) => {
        appListener = listener;
        return { remove: () => { appListener = undefined; } };
      } },
      BackHandler: { addEventListener: (_event: string, listener: () => boolean) => {
        backListener = listener;
        return { remove: () => { backListener = undefined; } };
      } },
    }],
    ['react-native-gesture-handler', { Gesture: { Pan: () => new PanBoundary() } }],
    ['react-native-reanimated', {
      useSharedValue: (initial: unknown) => memo(() => ({ value: initial }), []),
      cancelAnimation: () => {}, Easing: { bezier: () => () => {} },
      runOnJS: (callback: unknown) => callback, withTiming: timing, withSpring: timing,
    }],
  ]);
  const loader = Module as unknown as { _load: (request: string, ...args: unknown[]) => unknown };
  const originalLoad = loader._load;
  const loadMock = mock.method(loader, '_load', (request: string, ...args: unknown[]) =>
    stubs.has(request) ? stubs.get(request) : Reflect.apply(originalLoad, loader, [request, ...args]));
  try {
    const { usePhantomPage: usePage } = require('@/hooks/use-phantom-page') as { usePhantomPage: typeof usePhantomPage };
    const shared = (value: number) => ({ value, get: () => value, set: () => {}, addListener: () => {}, removeListener: () => {}, modify: () => {} });
    const camera = shared(-780);
    const bar = shared(0);
    let width = 390;
    let activeIndex = 2;
    const render = (): ReturnType<typeof usePhantomPage> => {
      cursor = 0;
      const result = usePage({ activeIndex, parentSlot: 2, slot: 3, width, translateX: camera, bottomBarTranslateY: bar });
      const pending = effects;
      effects = [];
      pending.forEach(effect => effect());
      return result;
    };
    let page = render();
    assert.equal(page.mounted, false);
    page.open(); page = render();
    assert.equal(page.isOpen, true);
    assert.equal(camera.value, -1170);
    assert.equal(bar.value, 120);
    assert.equal(backListener?.(), true);
    page = render();
    assert.equal(page.mounted, true, 'map remains rendered during its exit');
    assert.equal(page.isOpen, false);
    assert.equal(backListener?.(), true, 'repeated Android Back is consumed during close');
    const oldClose = completions.at(-1)!;
    page.open(); page = render();
    oldClose.finish(true); page = render();
    assert.equal(page.isOpen, true, 'stale completion must not dismiss a reopened map');

    let pan = page.headerGesture as unknown as PanBoundary;
    pan.start(); pan.update({ translationX: 60, velocityX: 0 });
    assert.equal(camera.value, -1110, 'header drag moves the real pager camera');
    pan.end({ translationX: 60, velocityX: 0 }); pan.finalize();
    assert.equal(camera.value, -1170, 'short swipe settles on Map');
    pan.start(); pan.update({ translationX: 100, velocityX: 0 }); pan.finalize();
    assert.equal(camera.value, -1170, 'cancelled gesture settles on Map');

    width = 844; page = render();
    assert.equal(camera.value, -2532, 'rotation retains the map slot');
    pan = page.headerGesture as unknown as PanBoundary;
    pan.start(); pan.update({ translationX: 80, velocityX: 0 });
    appListener?.();
    assert.equal(camera.value, -2532, 'activity transition settles an interrupted gesture');
    pan.finalize();
    pan.start(); pan.update({ translationX: 400, velocityX: 0 });
    pan.end({ translationX: 400, velocityX: 0 }); pan.finalize();
    page = render();
    assert.equal(camera.value, -1688);
    assert.equal(page.mounted, true);
    completions.at(-1)!.finish(true); page = render();
    assert.equal(page.mounted, false);
    assert.equal(bar.value, 0);
    assert.equal(backListener, undefined);

    page.open(); page = render(); page.close(); page = render();
    appListener?.(); page = render();
    assert.equal(page.mounted, false, 'background during close cannot strand a rendered map');
    page.open(); page = render(); activeIndex = 3; render(); page = render();
    assert.equal(page.mounted, false, 'external navigation releases the phantom slot');
    page.open(); page = render();
    assert.equal(page.mounted, false, 'Map cannot open from a different parent');
    activeIndex = 2; width = 0; page = render(); page.open(); page = render();
    assert.equal(page.mounted, false, 'invalid width cannot open Map');
    cells.forEach(slot => slot.cleanup?.());
    assert.equal(appListener, undefined);
    assert.equal(backListener, undefined);
  } finally {
    loadMock.mock.restore();
  }
});
