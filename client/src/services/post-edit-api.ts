import type { Post } from '@/data/feed';
import { API_BASE_URL } from '@/services/api-config';
import { createTimedFetch } from '@/services/timed-fetch';
import { adaptDatabasePostToClientPost, type DatabasePostRow } from '@/utils/post-database-adapter';

/** Partial text edits. Omitted fields retain their database values. */
export type PostTextChanges = {
  headline?: string;
  body?: string;
  whenText?: string;
  whereText?: string;
};

/**
 * Saves edits and returns the server record. Failure throws so the dialog keeps its draft.
 * studentId follows the existing prototype API convention and is not a verified token.
 */
export async function editPostApi(id: string, studentId: string, changes: PostTextChanges): Promise<Post> {
  const request = createTimedFetch(8000);
  const response = await request(`${API_BASE_URL}/posts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...changes, studentId }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.error || 'Unable to save changes. Please try again.');
  }
  if (!result || result.id !== id || typeof result.headline !== 'string' || typeof result.body !== 'string') {
    throw new Error('The server returned an invalid post. Refresh before trying again.');
  }
  return adaptDatabasePostToClientPost(result as DatabasePostRow);
}
