const router = require('express').Router();
const {
  authenticate,
  authorizePermissions,
  optionalAuth,
  authorizeRoles,
} = require('../middlewares/auth.middleware');
const {
  getAllBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
} = require('../controllers/blog.controller');
const { PERMISSIONS } = require('../config/permissions');

router.get('/all', optionalAuth, getAllBlogs);
router.get('/:blogId', optionalAuth, getBlogById);
router.post(
  '/create',
  authenticate,
  authorizePermissions(PERMISSIONS.CREATE_BLOG),
  createBlog
);

router.patch(
  '/:blogId',
  authenticate,
  async (req, res, next) => {
    const { ROLES: _R, PERMISSIONS: _P } = require('../config/permissions');
    const user = req.user;

    // If super_admin → allow update immediately
    if (user.role === 'super_admin') {
      return updateBlog(req, res);
    }

    // Otherwise, check if the user owns the blog
    return authorizePermissions(_P.UPDATE_OWN_BLOG, {
      checkOwnership: true,
      resourceParam: 'blogId',
      resource: 'blogs',
    })(req, res, next);
  },
  updateBlog
);

router.delete(
  '/:blogId',
  authenticate,
  async (req, res, next) => {
    const { ROLES: _R, PERMISSIONS: _P } = require('../config/permissions');
    const user = req.user;

    // If super_admin → allow update immediately
    if (user.role === 'super_admin') {
      return deleteBlog(req, res);
    }

    // Otherwise, check if the user owns the blog
    return authorizePermissions(_P.UPDATE_OWN_BLOG, {
      checkOwnership: true,
      resourceParam: 'blogId',
      resource: 'blogs',
    })(req, res, next);
  },
  deleteBlog
);

module.exports = router;
