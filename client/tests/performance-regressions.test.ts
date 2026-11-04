import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { createSharedClock } from '@/utils/shared-clock';
import { createStarfieldLayerUri } from '@/utils/starfield-layer';
import { calculateStarCounts, generateStars } from '@/constants/starfield';
import { createTimedFetch } from '@/services/timed-fetch';
import { fetchFeedPosts } from '@/services/posts-api';
import { posts } from '@/data/feed';

test('a hundred timestamp subscribers share one timer and release it after the last unmount', () => {
  let schedules = 0;
  let stops = 0;
  let now = 1000;
  let tick = () => {};
  let notifications = 0;
  const clock = createSharedClock({ now: () => now, schedule: (callback) => {
    schedules++;
    tick = callback;
    return () => { stops++; };
  } });
  const unsubscribes = Array.from({ length: 100 }, () => clock.subscribe(() => notifications++));
  assert.equal(schedules, 1);
  now = 31_000;
  tick();
  assert.equal(notifications, 100);
  assert.equal(clock.getSnapshot(), 31_000);
  unsubscribes.slice(0, 99).forEach((unsubscribe) => unsubscribe());
  assert.equal(stops, 0);
  unsubscribes[99]();
  assert.equal(stops, 1);
});

test('shared clock sleeps in background and immediately refreshes on foreground resume', () => {
  let now = 10;
  let schedules = 0;
  let stops = 0;
  const clock = createSharedClock({ now: () => now, schedule: () => {
    schedules++;
    return () => { stops++; };
  } });
  clock.setActive(false);
  const unsubscribe = clock.subscribe(() => {});
  assert.equal(schedules, 0);
  now = 500;
  clock.setActive(true);
  assert.equal(schedules, 1);
  assert.equal(clock.getSnapshot(), 500);
  clock.setActive(false);
  assert.equal(stops, 1);
  unsubscribe();
  clock.setActive(true);
  assert.equal(schedules, 1, 'no timer should restart without subscribers');
});

test('batched star images preserve every generated star, deterministic layout and native-safe SVG', () => {
  const counts = calculateStarCounts(858, 1744);
  let total = 0;
  for (const count of [counts.distant, counts.midground, counts.foreground]) {
    const stars = generateStars(count, 858, 1744, 1337, [1, 3], [0.2, 0.8], ['#FFFFFF']);
    const uri = createStarfieldLayerUri(stars, 858, 1744, 0.5);
    assert.equal(uri, createStarfieldLayerUri(stars, 858, 1744, 0.5));
    const svg = decodeURIComponent(uri.split(',')[1]);
    total += (svg.match(/data-star=/g) ?? []).length;
    assert.doesNotMatch(svg, /<(?:defs|use|filter)\b/);
    assert.match(svg, /viewBox="0 0 858 1744"/);
  }
  assert.equal(total, counts.total);
  assert.equal(counts.distant / counts.foreground, 5);
  assert.equal(counts.midground / counts.foreground, 3);
});

test('request deadlines are cleaned up after immediate offline failures and successful responses', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  const abort = mock.method(AbortController.prototype, 'abort', () => {});
  const network = mock.method(globalThis, 'fetch', async () => { throw new Error('offline'); });
  try {
    await assert.rejects(createTimedFetch(1000)('https://example.test'), /offline/);
    network.mock.mockImplementation(async () => new Response('[]'));
    await createTimedFetch(1000)('https://example.test');
    mock.timers.tick(2000);
    assert.equal(abort.mock.callCount(), 0);
  } finally {
    mock.restoreAll();
    mock.timers.reset();
  }
});

test('slow requests abort at their deadline instead of hanging indefinitely', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  const network = mock.method(globalThis, 'fetch', (_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('deadline')), { once: true });
  }));
  try {
    const pending = createTimedFetch(1000)('https://example.test');
    const rejected = assert.rejects(pending, /deadline/);
    mock.timers.tick(1000);
    await rejected;
  } finally {
    network.mock.restore();
    mock.timers.reset();
  }
});

test('offline feed refresh preserves exact rendered records and array identity', async () => {
  const network = mock.method(globalThis, 'fetch', async () => { throw new Error('offline'); });
  try {
    const initial = posts.slice(0, 5);
    assert.equal(await fetchFeedPosts({}, initial), initial);
  } finally { network.mock.restore(); }
});
