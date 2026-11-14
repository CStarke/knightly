const { requirePostLeadership } = require('./post-leadership');

/**
 * Marks a published club post as canceled while retaining its public visibility.
 * Repeated cancellation is safe, including retries after a lost response.
 * @param {string} id Server-issued post UUID.
 * @param {object} payload Prototype studentId, with no writable post fields.
 * @param {object} postsDal Injected post persistence operations.
 * @param {object} clubsDal Injected club leadership queries.
 * @returns {Promise<object>} The canceled post record.
 */
async function cancelPost(id, payload, postsDal, clubsDal) {
  const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!validId) {
    throw Object.assign(new Error('Only posts saved to the server can be canceled.'), { status: 400 });
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)
      || typeof payload.studentId !== 'string' || !payload.studentId.trim()
      || Object.keys(payload).some((key) => key !== 'studentId')) {
    throw Object.assign(new Error('Provide only the student identity for cancellation.'), { status: 400 });
  }

  // Verify authorization on every request, including an already-canceled post.
  const post = await requirePostLeadership(id, payload.studentId, postsDal, clubsDal);
  if (post.is_cancelled === true) return post;

  // Only the cancellation flag changes. Existing content and bookmarks retain their IDs.
  const updated = await postsDal.cancelPost(id, post.club_id);
  if (!updated) {
    throw Object.assign(new Error('This post changed or was removed. Refresh and try again.'), { status: 409 });
  }
  return updated;
}

module.exports = { cancelPost };
