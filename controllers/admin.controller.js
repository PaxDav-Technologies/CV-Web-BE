const { pool } = require('../config/db');

exports.getAllCustomers = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [allCustomers] = await connection.query(
      'SELECT * FROM account WHERE role = ?',
      ['customer']
    );
    return res.status(200).json({ message: `success`, allCustomers });
  } catch (error) {
    console.log(`Error getting all customers: ${error}`);
    return res.status(500).json({ message: `Internal Server Error` });
  } finally {
    if (connection) connection.release();
  }
};

exports.getAllAgents = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [allCustomers] = await connection.query(
      'SELECT * FROM account WHERE role = ?',
      ['agent']
    );
    return res.status(200).json({ message: `success`, allCustomers });
  } catch (error) {
    console.log(`Error getting all agents: ${error}`);
    return res.status(500).json({ message: `Internal Server Error` });
  } finally {
    if (connection) connection.release();
  }
};

exports.approveProperty = async (req, res) => {
  let connection;
  try {
    const { propertyId } = req.body;

    if (!propertyId) {
      return res.status(400).json({ message: 'propertyId is required' });
    }

    connection = await pool.getConnection();

    const [result] = await connection.query(
      `UPDATE property SET publicized = TRUE WHERE id = ?`,
      [propertyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

    return res.status(200).json({ message: 'Property approved successfully' });
  } catch (error) {
    console.error(`Error approving property: ${error}`);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (connection) connection.release();
  }
};
