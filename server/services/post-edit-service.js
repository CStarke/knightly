const { requirePostLeadership } = require('./post-leadership');

/**
 * Edits published club posts using the prototype's student identity convention.
 * Memberships in this schema are leadership grants issued by claim codes.
 * SECURITY: studentId is client supplied until verified sign-in is integrated.
 */
const FIELD_LIMITS = { headline: 50, body: 280, whenText: 160, whereText: 25 };
const COLUMN_NAMES = {
  headline: 'headline', body: 'body', whenText: 'when_text', whereText: 'where_text',
};

/** Creates an HTTP-aware error without exposing database diagnostics to clients. */
function requestError(status, message) {
  return Object.assign(new Error(message), { status });
}

/**
 * Validates a partial text edit and verifies leadership of the stored post's club.
 * Identity, club, imagery, status and creation timestamps are never writable here.
 * @param {string} id Post UUID.
 * @param {object} payload Prototype studentId and one or more editable text fields.
 * @param {object} postsDal Post persistence operations.
 * @param {object} clubsDal Club leadership membership queries.
 * @returns {Promise<object>} Updated database row.
 */
async function editPost(id, payload, postsDal, clubsDal) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw requestError(400, 'Only posts saved to the server can be edited.');
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw requestError(400, 'An edit object is required.');
  }
  if (typeof payload.studentId !== 'string' || !payload.studentId.trim()) {
    throw requestError(400, 'A student identity is required.');
  }

  // Step 1: Reject unknown fields to prevent ownership or timestamp changes.
  const changes = {};
  for (const key of Object.keys(payload)) {
    if (key === 'studentId') continue;
    if (!Object.hasOwn(FIELD_LIMITS, key)) {
      throw requestError(400, `Field ${key} cannot be edited.`);
    }
    if (typeof payload[key] !== 'string') {
      throw requestError(400, `${key} must be text.`);
    }
    const value = payload[key].trim();
    if (value.length > FIELD_LIMITS[key]) {
      throw requestError(400, `${key} must be at most ${FIELD_LIMITS[key]} characters.`);
    }
    if ((key === 'headline' || key === 'body') && !value) {
      throw requestError(400, 'Title and description are required.');
    }
    changes[COLUMN_NAMES[key]] = value || null;
  }
  if (Object.keys(changes).length === 0) {
    throw requestError(400, 'Provide at least one field to edit.');
  }

  // Step 2: Resolve ownership from the database, never from the request's club ID.
  const post = await requirePostLeadership(id, payload.studentId, postsDal, clubsDal);

  // Step 3: Update only requested fields, keeping publication order and bookmarks stable.
  const updated = await postsDal.updatePost(id, post.club_id, changes);
  if (!updated) throw requestError(409, 'This post changed or was removed. Refresh and try again.');
  return updated;
}

module.exports = { editPost };
