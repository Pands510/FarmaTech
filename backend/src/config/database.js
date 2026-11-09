const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'erp_farmacia',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  dateStrings: true, // Garante que datas retornem em formato string ISO/SQL sem distorção de fuso
  decimalNumbers: true // Converte colunas DECIMAL do MySQL para Number do JS
});

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`[Database] Conexão com MySQL estabelecida com sucesso na base '${process.env.DB_NAME || 'erp_farmacia'}'!`);
    connection.release();
    return true;
  } catch (error) {
    console.error('[Database] ATENÇÃO: Falha ao conectar ao MySQL:', error.message);
    console.error('[Database] Certifique-se de que o serviço MySQL está rodando e o script banco_farmatech_completo.sql foi importado.');
    return false;
  }
}

module.exports = {
  pool,
  testConnection
};
