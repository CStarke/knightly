const { requirePostLeadership } = require('./post-leadership');

/**
 * Permanently deletes a published club post, including a canceled post.
 * Uses the existing prototype identity convention and stored club membership.
 * @returns {Promise<void>} Resolves after deletion. Missing posts produce a typed 404.
 */
async function deleteClubPost(id, payload, postsDal, clubsDal) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw Object.assign(new Error('Only posts saved to the server can be deleted.'), { status: 400 });
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)
      || typeof payload.studentId !== 'string' || !payload.studentId.trim()
      || Object.keys(payload).some((key) => key !== 'studentId')) {
    throw Object.assign(new Error('Provide only the student identity for deletion.'), { status: 400 });
  }

  const post = await requirePostLeadership(id, payload.studentId, postsDal, clubsDal);
  // Retain the DAL's optional client argument and supply the verified club as a write filter.
  const deleted = await postsDal.deletePost(id, undefined, post.club_id);
  if (!deleted) {
    // A concurrent deletion is already the desired result. Other state changes need review.
    const remaining = await postsDal.getPostById(id);
    if (remaining) {
      throw Object.assign(new Error('This post changed. Refresh before deleting it.'), { status: 409 });
    }
  }
}

module.exports = { deleteClubPost };
