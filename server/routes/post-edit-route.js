const { editPost } = require('../services/post-edit-service');

/** Registers the edit endpoint with injected DALs for route and service testing. */
function registerPostEditRoute(app, postsDal, clubsDal) {
  app.patch('/api/posts/:id', async (req, res) => {
    try {
      const updated = await editPost(req.params.id, req.body, postsDal, clubsDal);
      res.json(updated);
    } catch (error) {
      const status = error.status || 500;
      if (status === 500) console.error('[posts.edit]', error.message);
      res.status(status).json({
        error: status === 500 ? 'Unable to save changes. Please try again.' : error.message,
      });
    }
  });
}

module.exports = { registerPostEditRoute };
