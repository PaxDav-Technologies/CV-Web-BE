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
  const { blogId } = req.body;
  try {
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

exports.createBlog = async (req, res) => {};

exports.updateBlog = async (req, res) => {};

exports.deleteBlog = async (req, res) => {};
