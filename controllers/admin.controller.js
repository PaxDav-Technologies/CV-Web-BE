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

  if (!parseInt(accountId)) {
    return res.status(400).json({ message: 'Account ID must be a valid ID' });
  }

  try {
    connection = await pool.getConnection();

    const [existing] = await connection.query(
      `SELECT * FROM account WHERE role = ? AND id = ?`,
      ['agent', parseInt(accountId)]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Agent account not found' });
    }

    const newSuspendedStatus = !existing[0].suspended;

    await connection.query(`UPDATE account SET suspended = ? WHERE id = ?`, [
      newSuspendedStatus,
      parseInt(accountId),
    ]);

    const message = newSuspendedStatus ? 'suspended' : 'unsuspended';
    return res.status(200).json({
      message: `Account ${message} successfully`,
      suspended: newSuspendedStatus,
    });
  } catch (error) {
    console.error(`Error suspending account: ${error}`);
    return res.status(500).json({
      message: 'An error occurred while updating account status',
    });
  } finally {
    if (connection) connection.release();
  }
};
