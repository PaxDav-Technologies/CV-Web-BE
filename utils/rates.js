const axios = require('axios');
const { pool } = require('../config/db');
require('dotenv').config();

async function getRates(req, res) {
  let connection;
  try {
    connection = await pool.getConnection();
    const today = new Date().toLocaleDateString('en-CA')

    const [rows] = await connection.query(
      'SELECT * FROM exchange_rates LIMIT 1'
    );

    if (
      rows.length &&
      new Date(rows[0].last_updated).toISOString().split('T')[0] == today
    ) {
      return res.status(200).json({message: `Success`, data: rows[0]})
    }

    const result = await axios.get(
      `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API_KEY}/latest/NGN`
    );

    const usd = result.data.conversion_rates.USD;
    const eur = result.data.conversion_rates.EUR;
    const gbp = result.data.conversion_rates.GBP;

    if (rows.length === 0) {
      await connection.query(
        'INSERT INTO exchange_rates (usd, eur, gbp, last_updated) VALUES (?, ?, ?, ?)',
        [usd, eur, gbp, today]
      );
    } else {
      await connection.query(
        'UPDATE exchange_rates SET usd=?, eur=?, gbp=?, last_updated=? WHERE id=?',
        [usd, eur, gbp, today, rows[0].id]
      );
    }

    return res.status(200).json({
      usd,
      eur,
      gbp,
      message: 'Exchange rates updated successfully',
    });
  } catch (error) {
    console.error('Error updating exchange rates:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (connection) connection.release();
  }
}

module.exports = getRates;
