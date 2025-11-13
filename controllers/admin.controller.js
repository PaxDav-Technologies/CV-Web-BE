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
    const [agents] = await connection.query(
      `
      SELECT 
        a.id,
        a.firstname,
        a.lastname,
        a.email,
        a.avatar,
        a.verified,
        a.suspended,
        a.method,
        COUNT(p.id) AS property_count
      FROM account a
      LEFT JOIN property p ON p.owner_id = a.id
      WHERE a.role = 'agent'
      GROUP BY a.id
      ORDER BY property_count DESC;
      `
    );
    return res.status(200).json({ message: 'success', agents });
  } catch (error) {
    console.log(`Error getting all agents: ${error}`);
    return res.status(500).json({ message: 'Internal Server Error' });
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

exports.getAllUsers = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [allCustomers] = await connection.query(
      'SELECT * FROM account WHERE role = ? OR role = ?',
      ['agent', 'customer']
    );
    return res.status(200).json({ message: `success`, allCustomers });
  } catch (error) {
    console.log(`Error getting all agents: ${error}`);
    return res.status(500).json({ message: `Internal Server Error` });
  } finally {
    if (connection) connection.release();
  }
};

exports.toggleSuspension = async (req, res) => {
  let connection;
  const { accountId } = req.body;
  try {
    connection = await pool.getConnection();
    const [existing] = await connection.query(
      `
      SELECT * FROM account where role = ? AND id = ?`,
      ['agent', accountId]
    );
    if (existing.length > 0) {
      await connection.query(`UPDATE account SET suspended = ?`, [
        existing[0].suspended ? 0 : 1,
      ]);
    }
    let message = existing[0].suspended ? 'suspended' : 'unsuspended';
    return res.status(200).json({ message: `Account ${message}` });
  } catch (error) {
    console.log(`Error suspending account: ${error}`);
    return res.status(500).json({ message: 'internal Server Error' });
  } finally {
    if (connection) connection.release();
  }
};
