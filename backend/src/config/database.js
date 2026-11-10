
const mysql = require('mysql2/promise');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const requiredVariables = [
  'DB_HOST',
  'DB_USER',
  'DB_NAME'
];

if (isProduction) {
  requiredVariables.push('DB_PASSWORD');
}

const missingVariables = requiredVariables.filter(
  (variable) => !process.env[variable]
);

if (missingVariables.length > 0) {
  throw new Error(
    `[Database] Variáveis de ambiente ausentes: ${missingVariables.join(', ')}`
  );
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'erp_farmacia',

  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,

  dateStrings: true,
  decimalNumbers: true
});

async function testConnection() {
  let connection;

  try {
    connection = await pool.getConnection();

    await connection.query('SELECT 1');

    console.log(
      `[Database] Conexão com MySQL estabelecida com sucesso na base '${process.env.DB_NAME || 'erp_farmacia'}'!`
    );

    return true;
  } catch (error) {
    console.error(
      '[Database] Falha ao conectar ao MySQL:',
      error.message
    );

    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

module.exports = {
  pool,
  testConnection
};
