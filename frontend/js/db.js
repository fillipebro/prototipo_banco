const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'appdb',
  connectionLimit: 10,
  dateStrings: true
});

async function initDbIfNeeded(){
  // não faz DDL aqui; DDL é aplicado via init scripts. Aqui só checamos conectividade.
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
}

async function getConfigKeyHex(keyName){
  const [rows] = await pool.execute('SELECT hex_val FROM config WHERE name=? LIMIT 1', [keyName]);
  return rows.length ? rows[0].hex_val : null;
}

async function upsertConfigKeyHex(keyName, hexVal){
  await pool.execute('INSERT INTO config(name, hex_val) VALUES(?, ?) ON DUPLICATE KEY UPDATE hex_val=VALUES(hex_val)', [keyName, hexVal]);
}

module.exports = { pool, initDbIfNeeded, getConfigKeyHex, upsertConfigKeyHex };