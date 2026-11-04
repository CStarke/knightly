/** Injectable scheduling boundary for a single foreground-only relative-time clock. */
type ClockRuntime = {
  now: () => number;
  schedule: (tick: () => void) => () => void;
};

/**
 * Shares one timer across all timestamp subscribers, stops when unused/backgrounded, and refreshes on resume.
 * @param runtime - Wall-clock reader and interval scheduler; the scheduler returns its cleanup function.
 * @returns Stable external-store methods for React's useSyncExternalStore.
 */
export function createSharedClock(runtime: ClockRuntime) {
  const listeners = new Set<() => void>();
  let snapshot = runtime.now();
  let active = true;
  let stop: (() => void) | undefined;
  const tick = () => {
    snapshot = runtime.now();
    listeners.forEach((listener) => listener());
  };
  const reconcile = () => {
    if (active && listeners.size > 0 && !stop) stop = runtime.schedule(tick);
    else if ((!active || listeners.size === 0) && stop) { stop(); stop = undefined; }
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      if (listeners.size === 1) snapshot = runtime.now();
      reconcile();
      return () => { listeners.delete(listener); reconcile(); };
    },
    setActive: (next: boolean) => {
      if (active === next) return;
      active = next;
      if (active) tick();
      reconcile();
    },
  };
}
