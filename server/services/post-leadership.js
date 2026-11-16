/**
 * Resolves a published club post and checks its club leadership grant.
 * Prototype student identities are client supplied until verified login is integrated.
 * @returns {Promise<object>} The stored post after authorization succeeds.
 */
async function requirePostLeadership(id, studentId, postsDal, clubsDal) {
  const post = await postsDal.getPostById(id);
  if (!post) throw Object.assign(new Error('This post no longer exists.'), { status: 404 });
  if (post.source !== 'club' || !post.club_id || post.status !== 'published') {
    throw Object.assign(new Error('Only published club posts can be managed.'), { status: 403 });
  }
  const memberships = await clubsDal.getMembershipsForStudent(studentId.trim());
  if (!memberships.some((membership) => membership.club_id === post.club_id)) {
    throw Object.assign(new Error('You must be a leader of this post’s club.'), { status: 403 });
  }
  return post;
}

module.exports = { requirePostLeadership };
