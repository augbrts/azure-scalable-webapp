'use strict';

// Camada de acesso ao Azure Database for MySQL (Flexible Server).
// - Conexão via pool, com TLS (o Flexible Server exige require_secure_transport=ON).
// - Todas as queries são parametrizadas (proteção contra SQL injection).
// - Credenciais vêm de variáveis de ambiente, nunca do código.

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  // O certificado do Flexible Server encadeia numa CA pública (presente no Node).
  // Se a verificação falhar no seu ambiente, troque para { rejectUnauthorized: false }
  // (ainda criptografado, sem validar a cadeia) ou aponte uma CA com DB_SSL_CA.
  ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  connectTimeout: 10000,
});

async function initDb() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS atividades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        aluno VARCHAR(120) NOT NULL,
        titulo VARCHAR(200) NOT NULL,
        descricao TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } finally {
    conn.release();
  }
}

async function addAtividade(aluno, titulo, descricao) {
  await pool.query(
    'INSERT INTO atividades (aluno, titulo, descricao) VALUES (?, ?, ?)',
    [aluno, titulo, descricao]
  );
}

async function listAtividades(limit = 50) {
  // limit é um inteiro controlado pelo servidor; coagimos para evitar surpresa.
  const n = Number.isInteger(limit) ? limit : 50;
  const [rows] = await pool.query(
    `SELECT aluno, titulo, descricao, criado_em
       FROM atividades
      ORDER BY criado_em DESC
      LIMIT ${n}`
  );
  return rows;
}

async function countAtividades() {
  const [rows] = await pool.query('SELECT COUNT(*) AS total FROM atividades');
  return rows[0].total;
}

async function ping() {
  await pool.query('SELECT 1');
}

module.exports = { pool, initDb, addAtividade, listAtividades, countAtividades, ping };
