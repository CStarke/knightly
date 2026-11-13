const { cancelPost } = require('../services/post-cancel-service');

/** Registers the cancellation endpoint with injected DALs for testing. */
function registerPostCancelRoute(app, postsDal, clubsDal) {
  app.patch('/api/posts/:id/cancel', async (req, res) => {
    try {
      res.json(await cancelPost(req.params.id, req.body, postsDal, clubsDal));
    } catch (error) {
      const status = error.status || 500;
      if (status === 500) console.error('[posts.cancel]', error.message);
      res.status(status).json({
        error: status === 500 ? 'Unable to cancel the post. Please try again.' : error.message,
      });
    }
  });
}

module.exports = { registerPostCancelRoute };
