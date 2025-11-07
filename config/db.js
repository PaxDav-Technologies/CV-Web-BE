const mysql = require('mysql2/promise');
const fs = require('fs')
const path = require('path')

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  port: process.env.DB_PORT || 3306,
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'testdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const testConnection = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT NOW()');
    // Read and execute schema.sql
    const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split and execute multiple statements
    const statements = schema.split(/;\s*$/m).filter((line) => line.trim());
    for (const stmt of statements) {
      await connection.query(stmt);
    }
    console.log(`⏰ Current time from DB: ${rows[0].current_time} ✅`);
    await connection.release();
  } catch (err) {
    console.error(`❌ MySQL connection failed: ${err.message}`);
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { pool, testConnection };
