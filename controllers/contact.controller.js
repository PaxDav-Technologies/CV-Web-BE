const { pool } = require('../config/db');

exports.createContact = async (req, res) => {
  let connection;
  const { name, email, subject, message } = req.body;
  try {
    connection = await pool.getConnection();
    const [result] = await connection.query(
      `INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)`,
      [name, email, subject, message]
    );

    return res.status(201).json({ message: `Contact message sent` });
  } catch (error) {
    console.log(`An error occurred: ${error}`);
    return res.status(500).json({ message: `Internal Server Error` });
  } finally {
    if (connection) connection.release();
  }
};

exports.getAllContacts = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [allContacts] = await connection.query(`SELECT * FROM contacts`);
    return res.status(200).json(allContacts);
  } catch (error) {
    console.log(`An error occurred: ${error}`);
    return res.status(500).json({ message: `Internal Server Error` });
  } finally {
    if (connection) connection.release();
  }
};

exports.getContactById = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [contact] = await connection.query(
      `SELECT * FROM contacts WHERE id = ?`,
      [req.params.contactId]
    );
    if (contact.length < 0) {
      return res.status(404).json({ message: `Contact not found` });
    }
    return res.status(200).json({ message: `Success`, contact: contact[0] });
  } catch (error) {
    console.log(`An error occurred: ${error}`);
    return res.status(500).json({ message: `Internal Server Error` });
  } finally {
    if (connection) connection.release();
  }
};
