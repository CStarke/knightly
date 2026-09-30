let hasInitialized = false;

export function resetInitializationStateForTests() {
  hasInitialized = false;
}

export async function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}): Promise<string | null> {
  // If the path is empty, drop intent
  if (!path) return null;

  // 1. Strip protocol & host if present (e.g. 'exp://192.168.1.5:8081', 'calvinapp://', 'http://...')
  let clean = path.replace(/^[a-zA-Z0-9+.-]+:\/\/[^/]*/, '');

  // 2. Strip Expo Go prefix '/--/'
  clean = clean.replace(/^\/--\/?/, '');

  // 3. Strip query parameters and hash fragments
  clean = clean.split(/[?#]/)[0];

  // 4. Strip leading and trailing slashes
  clean = clean.replace(/^\/+|\/+$/g, '');

  // 5. Detect if what remains is empty or 'index' (unrouted root intent)
  const isRootIntent = clean === '' || clean === 'index';

  if (isRootIntent) {
    // If the JS runtime has already initialized, or if initial is false (activity resume),
    // unconditionally drop this intent so that the user's active tab and UI state are never destroyed.
    if (hasInitialized || !initial) {
      return null;
    }
    // True cold boot: mark initialized and let root pass through
    hasInitialized = true;
    return path;
  }

  // Deep links with a legitimate destination (e.g. /post, /dining, /clubs/123)
  hasInitialized = true;
  return path;
}

