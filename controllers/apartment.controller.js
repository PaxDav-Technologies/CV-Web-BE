const { pool } = require('../config/db');

exports.getAllApartments = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { bedrooms, toilets, parking_space, draft } = req.params;
    const [allApartments] = await connection.query(
      `SELECT * FROM apartment
      WHERE bedrooms = ? AND toilets = ? AND parking_space = ? AND draft = ?`,
      [bedrooms, toilets, parking_space, draft]
    );
    return res.status(200).json({ message: `Success`, data: allApartments });
  } catch (error) {
    return res.status(500).json({ message: `Internal Server Error` });
  }
};
