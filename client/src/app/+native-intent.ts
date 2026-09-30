export async function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}): Promise<string | null> {
  // On Android Expo Go, returning from any external Activity (like ImagePicker or Permissions dialog)
  // often causes the system to re-deliver the initial dev server intent (e.g. `exp://...:8081`).
  // Because the dev server URL has no path, Expo Router attempts to route to `/` (Index 0).
  //
  // By unconditionally intercepting unrouted root intents when the app is already running (!initial),
  // we prevent Expo Router from forcefully resetting the user's active tab and destroying their
  // current UI state. Genuine deep links (like `exp://.../post/123`) will pass through untouched.
  if (!initial && (path === '/' || path === '' || path.startsWith('/?'))) {
    return null; // Drop the spurious intent, preserving the active tab
  }
  return path;
}
