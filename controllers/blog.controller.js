const { pool } = require('../config/db');
const { uploadDataURIToCloudinary } = require('../utils/fileUpload');

// 🟢 Get All Blogs
exports.getAllBlogs = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const user = req.user || null; // optionalAuth may not set this

    let sql = 'SELECT * FROM blogs';
    const params = [];

    // Apply visibility filters
    if (!user) {
      sql += ' WHERE draft = 0'; // unauthenticated users: only published
    } else if (user.role !== 'admin') {
      // regular user
      sql += ' WHERE draft = 0 OR author_id = ?';
      params.push(user.id);
    }

    const [blogs] = await connection.query(sql, params);

    return res.status(200).json({ message: 'success', blogs });
  } catch (error) {
    console.error('getAllBlogs error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (connection) connection.release();
  }
};

// 🟢 Get Blog by ID
exports.getBlogById = async (req, res) => {
  let connection;
  const { blogId } = req.params;
  try {
    connection = await pool.getConnection();

    const user = req.user || null;

    const [blogRows] = await connection.query(
      'SELECT * FROM blogs WHERE id = ?',
      [blogId]
    );

    if (blogRows.length === 0) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    const blog = blogRows[0];

    // Access control for draft
    if (blog.draft) {
      if (!user) {
        return res.status(403).json({ message: 'Unauthorized access' });
      }
      if (user.role !== 'admin' && user.id !== blog.author_id) {
        return res.status(403).json({ message: 'Unauthorized access' });
      }
    }

    return res.status(200).json({ message: 'success', blog });
  } catch (error) {
    console.error('getBlogById error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (connection) connection.release();
  }
};

// 🟢 Create Blog
exports.createBlog = async (req, res) => {
  let connection;
  try {
    const {
      title,
      subtitle,
      content,
      main_photo,
      category_id = null,
      draft = false,
    } = req.body;

    const author_id = req.user.id;

    if (!title || !content) {
      return res.status(400).json({
        message: 'Missing required fields: title, content',
      });
    }

    // Upload thumbnail if provided
    let thumbnail = null;
    if (main_photo) {
      thumbnail = await uploadDataURIToCloudinary(
        main_photo,
        'blog_thumbnails'
      );
    }

    connection = await pool.getConnection();

    const [result] = await connection.query(
      `INSERT INTO blogs 
        (title, subtitle, content, main_photo, category_id, author_id, draft, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        title,
        subtitle || null,
        content,
        thumbnail || null,
        category_id || null,
        author_id,
        draft ? 1 : 0,
      ]
    );

    if (!result.insertId) {
      return res.status(500).json({ message: 'Failed to create blog post' });
    }

    return res.status(201).json({
      message: 'Blog post created successfully',
      blogId: result.insertId,
    });
  } catch (error) {
    console.error('Error creating blog post:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (connection) connection.release();
  }
};

// 🟢 UPDATE BLOG
exports.updateBlog = async (req, res) => {
  let connection;
  const { blogId } = req.params;
  try {
    const { title, subtitle, content, main_photo, category_id, draft } =
      req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: token required' });
    }

    connection = await pool.getConnection();

    // Fetch blog to verify ownership or admin rights
    const [rows] = await connection.query(
      `SELECT author_id FROM blogs WHERE id = ?`,
      [blogId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    const blog = rows[0];

    if (user.role !== 'admin' && user.id !== blog.author_id) {
      return res
        .status(403)
        .json({ message: 'Forbidden: not allowed to edit' });
    }

    let thumbnail = null;
    if (main_photo && main_photo.startsWith('data:')) {
      thumbnail = await uploadDataURIToCloudinary(
        main_photo,
        'blog_thumbnails'
      );
    }

    // Build dynamic update query
    const fields = [];
    const values = [];

    if (title) {
      fields.push('title = ?');
      values.push(title);
    }
    if (subtitle !== undefined) {
      fields.push('subtitle = ?');
      values.push(subtitle || null);
    }
    if (content) {
      fields.push('content = ?');
      values.push(content);
    }
    if (thumbnail) {
      fields.push('main_photo = ?');
      values.push(thumbnail);
    }
    if (category_id !== undefined) {
      fields.push('category_id = ?');
      values.push(category_id || null);
    }
    if (draft !== undefined) {
      fields.push('draft = ?');
      values.push(draft ? 1 : 0);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    fields.push('updated_at = NOW()');
    const sql = `UPDATE blogs SET ${fields.join(', ')} WHERE id = ?`;
    values.push(blogId);

    await connection.query(sql, values);

    return res.status(200).json({ message: 'Blog updated successfully' });
  } catch (error) {
    console.error('updateBlog error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (connection) connection.release();
  }
};

// 🗑️ DELETE BLOG
exports.deleteBlog = async (req, res) => {
  let connection;
  const { blogId } = req.params;
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: token required' });
    }

    connection = await pool.getConnection();

    // Check existence and ownership
    const [rows] = await connection.query(
      `SELECT author_id FROM blogs WHERE id = ?`,
      [blogId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    const blog = rows[0];

    if (user.role !== 'admin' && user.id !== blog.author_id) {
      return res
        .status(403)
        .json({ message: 'Forbidden: not allowed to delete' });
    }

    await connection.query(`DELETE FROM blogs WHERE id = ?`, [blogId]);

    return res.status(200).json({ message: 'Blog deleted successfully' });
  } catch (error) {
    console.error('deleteBlog error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (connection) connection.release();
  }
};
