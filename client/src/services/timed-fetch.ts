/**
 * Creates a request function with an abort deadline and unconditional timer cleanup.
 * @param timeoutMs - Maximum wait for response headers, in milliseconds.
 * @returns Fetch-compatible function; callers retain their existing offline fallbacks.
 */
export function createTimedFetch(timeoutMs: number) {
  return async (input: string, init: RequestInit = {}): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      // Failed offline requests used to leave timeout callbacks queued until their full deadline.
      clearTimeout(timer);
    }
  };
}
