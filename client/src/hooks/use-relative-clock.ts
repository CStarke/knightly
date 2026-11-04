import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { createSharedClock } from '@/utils/shared-clock';

const clock = createSharedClock({
  now: () => Date.now(),
  schedule: (tick) => {
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  },
});
let subscribers = 0;
let lifecycle: ReturnType<typeof AppState.addEventListener> | undefined;

function subscribe(listener: () => void): () => void {
  if (subscribers++ === 0) {
    clock.setActive(!AppState.currentState || AppState.currentState === 'active');
    lifecycle = AppState.addEventListener('change', (state) => clock.setActive(state === 'active'));
  }
  const unsubscribe = clock.subscribe(listener);
  return () => {
    unsubscribe();
    if (--subscribers === 0) { lifecycle?.remove(); lifecycle = undefined; }
  };
}

/** Returns a shared 30-second wall-clock snapshot; no per-card timers or background wakeups. */
export function useRelativeClock(): number {
  return useSyncExternalStore(subscribe, clock.getSnapshot, clock.getSnapshot);
}
