const { pool } = require('../config/db');

exports.getAllBlogs = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [blogs] = await connection.query('SELECT * FROM blogs');
    return res.status(200).json({ message: `success`, blogs });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: `Internal Server Error` });
  } finally {
    if (connection) connection.release();
  }
};

exports.getBlogById = async (req, res) => {
  let connection;
  const { blogId } = req.params;
  try {
    connection = await pool.getConnection();
    const [blog] = await connection.query('SELECT * FROM blogs WHERE id = ?', [
      blogId,
    ]);
    if (!blog || blog.length == 0) {
      return res.status(404).json({ message: `Blog post not found` });
    }
    return res.status(200).json({ message: 'success', blog });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: `Internal Server Error` });
  } finally {
    if (connection) connection.release();
  }
};

exports.createBlog = async (req, res) => {
  let connection;
  try {
    const {
      title,
      subtitle,
      content,
      main_photo,
      category_id = null,
    } = req.body;
    const author_id = req.user.id;

    if (!title || !content) {
      return res.status(400).json({
        message: 'Missing required fields: title, content',
      });
    }
    let thumbnail = await uploadDataURIToCloudinary(
      main_photo,
      'blog_thumbnails'
    );
    connection = await pool.getConnection();
    const [result] = await connection.query(
      `INSERT INTO blogs (title, subtitle, content, main_photo, category_id, author_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        title,
        subtitle || null,
        content,
        thumbnail || null,
        category_id || null,
        author_id,
      ]
    );
    if (!result.insertId) {
      return res.status(500).json({ message: `Failed to create blog post` });
    }
    return res.status(201).json({
      message: `Blog post created successfully`,
      blogId: result.insertId,
    });
  } catch (error) {
    console.log(`Error creating blog post: ${error}`);
    return res.status(500).json({ message: `Internal Server Error` });
  } finally {
    if (connection) connection.release();
  }
};

exports.updateBlog = async (req, res) => {};

exports.deleteBlog = async (req, res) => {};
