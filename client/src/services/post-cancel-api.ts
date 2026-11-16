import type { Post } from '@/data/feed';
import { API_BASE_URL } from '@/services/api-config';
import { createTimedFetch } from '@/services/timed-fetch';
import { adaptDatabasePostToClientPost, type DatabasePostRow } from '@/utils/post-database-adapter';

/** Cancels a server-backed post. Failures throw so the UI can offer a retry. */
export async function cancelPostApi(id: string, studentId: string): Promise<Post> {
  const request = createTimedFetch(8000);
  const response = await request(`${API_BASE_URL}/posts/${encodeURIComponent(id)}/cancel`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.error || 'Unable to cancel the post. Please try again.');
  }
  if (!result || result.id !== id || result.is_cancelled !== true
      || typeof result.headline !== 'string' || typeof result.body !== 'string') {
    throw new Error('The server returned an invalid cancellation. Refresh before trying again.');
  }
  return adaptDatabasePostToClientPost(result as DatabasePostRow);
}
