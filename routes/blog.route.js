const router = require('express').Router();
const { authenticate } = require('../middlewares/auth.middleware');
const {
  getAllBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
} = require('../controllers/blog.controller');

router.get('/all', getAllBlogs);
router.get('/:id', getBlogById);
router.post('/create', authenticate, createBlog);
router.patch('/:id', authenticate, updateBlog);
router.delete('/:id', authenticate, deleteBlog);

module.exports = router;
