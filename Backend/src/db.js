import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables from .env file. This call has no effect if
// dotenv is not installed or the file is missing; variables may already
// be present in the environment (e.g. when deployed).
dotenv.config();

// Create a connection pool to the MySQL database. Connection details are
// supplied via environment variables. The pool will manage its own
// connections and queue pending queries if necessary.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;