const { deleteClubPost } = require('../services/post-delete-service');

/** Registers authorized deletion, replacing the old unguarded endpoint. */
function registerPostDeleteRoute(app, postsDal, clubsDal) {
  app.delete('/api/posts/:id', async (req, res) => {
    try {
      await deleteClubPost(req.params.id, req.body, postsDal, clubsDal);
      res.json({ success: true });
    } catch (error) {
      const status = error.status || 500;
      if (status === 500) console.error('[posts.delete]', error.message);
      res.status(status).json({
        error: status === 500 ? 'Unable to delete the post. Please try again.' : error.message,
        // A retry can distinguish an absent post from a missing endpoint or proxy error.
        code: status === 404 ? 'POST_NOT_FOUND' : 'POST_DELETE_FAILED',
      });
    }
  });
}

module.exports = { registerPostDeleteRoute };
