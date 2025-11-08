const router = require('express').Router();
const {
  authenticate,
  authorizePermissions,
} = require('../middlewares/auth.middleware');
const {
  getAllBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
} = require('../controllers/blog.controller');
const { PERMISSIONS } = require('../config/permissions');

router.get('/all', authenticate, getAllBlogs);
router.get('/:blogId', authenticate, getBlogById);
router.post(
  '/create',
  authenticate,
  authorizePermissions(PERMISSIONS.CREATE_BLOG),
  createBlog
);
router.patch(
  '/:blogId',
  authenticate,
  (req, res, next) => {
    const { ROLES: _R, PERMISSIONS: _P } = require('../config/permissions');
    if ((_R[userRole] || []).includes(_P.UPDATE_ANY_BLOG)) {
      return updateBlog(req, res);
    }
    return authorizePermissions(_P.tUPDATE_OWN_BLOG, {
      checkOwnership: true,
      resourceParam: 'blogId',
      resource: 'blogs',
    })(req, res, next);
  },
  updateBlog
);
router.delete(
  '/:id',
  authenticate,
  authorizePermissions(PERMISSIONS.DELETE_OWN_BLOG),
  deleteBlog
);

module.exports = router;
