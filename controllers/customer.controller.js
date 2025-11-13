const { pool } = require('../config/db');

exports.toggleSaveProperty = async (req, res) => {
  let connection;
  try {
    const userId = req.user.id;
    const { propertyId } = req.body;
    connection = await pool.getConnection();

    const [existing] = await connection.query(
      'SELECT * FROM save WHERE account_id = ? AND property_id = ?',
      [userId, propertyId]
    );
    if (existing.length > 0) {
      await connection.query(
        'DELETE FROM save WHERE account_id = ? AND property_id = ?',
        [userId, propertyId]
      );
      return res.status(200).json({ message: 'Property unsaved successfully' });
    }
    await connection.query(
      'INSERT INTO save (account_id, property_id) VALUES (?, ?)',
      [userId, propertyId]
    );
    return res.status(200).json({ message: 'Property saved successfully' });
  } catch (error) {
    console.log(`Error toggling save property for customer: ${error.message}`);
    return res
      .status(500)
      .json({ message: 'Server Error', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.viewSavedProperties = async (req, res) => {
  let connection;
  try {
    const userId = req.user.id;
    connection = await pool.getConnection();

    const [savedProperties] = await connection.query(
      `SELECT p.* FROM property p
       JOIN save s ON p.id = s.property_id
       WHERE s.account_id = ?`,
      [userId]
    );

    return res.status(200).json({ savedProperties });
  } catch (error) {
    console.log(
      `Error fetching saved properties for customer: ${error.message}`
    );
    return res
      .status(500)
      .json({ message: 'Server Error', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};
