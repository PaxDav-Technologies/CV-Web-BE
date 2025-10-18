const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'testdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT NOW()');
    console.log(`⏰ Current time from DB: ${rows[0].current_time}`);
    await connection.release();
  } catch (err) {
    console.error(`❌ MySQL connection failed: ${err.message}`);
  }
};

module.exports = { pool, testConnection };
