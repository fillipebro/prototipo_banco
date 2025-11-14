// server.js
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ----------------- CONFIGURAÇÕES -----------------
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'segredo-dev';

// Admin configurado via .env
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
const ADMIN_CPF = (process.env.ADMIN_CPF || '00000000000').replace(/\D+/g, '');
const ADMIN_NAME = process.env.ADMIN_NAME || 'Administrador';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456';

// Mapa em memória para 2FA de admin
// chave: CPF do admin, valor: { code, expiresAt, adminId }
const adminTokens = new Map();

// --------------- SMTP (GMAIL) --------------------
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || ADMIN_EMAIL,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

transporter.verify((err) => {
  if (err) {
    console.error('Erro SMTP:', err.message || err);
  } else {
    console.log('SMTP Gmail OK');
  }
});

// --------------- HELPERS DE AUTENTICAÇÃO ----------------
function gerarTokenJWT(payload, expiresIn = '8h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function authUser(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ ok: false, message: 'Token ausente.' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'Token inválido.' });
  }
}

function authAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ ok: false, message: 'Token ausente.' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ ok: false, message: 'Acesso não autorizado.' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'Token inválido.' });
  }
}

// --------------- CRIAR ADMIN NO BANCO ----------------
async function ensureAdminUser() {
  // Verifica se já existe algum admin
  const [rows] = await pool.execute(
    "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
  );
  if (rows.length) {
    console.log('Administrador já existe no banco.');
    return;
  }

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const [result] = await pool.execute(
    "INSERT INTO users (name,email,cpf,password_hash,role,status) VALUES (?,?,?,?, 'admin','active')",
    [ADMIN_NAME, ADMIN_EMAIL, ADMIN_CPF, hash]
  );
  const adminId = result.insertId;

  await pool.execute(
    "INSERT INTO accounts (user_id,agency,account_number,balance) VALUES (?,?,?,?)",
    [adminId, '0001', '000000-0', 0.00]
  );

  console.log('Usuário administrador criado automaticamente.');
}

async function ensureAdminUserWithRetry(retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      await ensureAdminUser();
      return;
    } catch (err) {
      console.log(`MySQL ainda não respondeu... tentativa ${i + 1}/${retries}`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  console.error('Não foi possível conectar ao MySQL após várias tentativas.');
}
ensureAdminUserWithRetry();

// --------------- ROTAS BÁSICAS ----------------
app.get('/api/test', (req, res) => {
  res.json({ ok: true, message: 'API ok' });
});

// --------------- AUTENTICAÇÃO USUÁRIO ----------------
// Cadastro
app.post('/api/auth/register', async (req, res) => {
  try {
    const { nome, email, cpf, senha } = req.body || {};
    const nomeFinal = (nome || '').trim();
    const emailFinal = (email || '').trim().toLowerCase();
    const cpfNum = (cpf || '').replace(/\D+/g, '');
    const senhaFinal = senha;

    if (!nomeFinal || !emailFinal || !cpfNum || !senhaFinal) {
      return res
        .status(400)
        .json({ ok: false, message: 'Preencha todos os campos.' });
    }

    const [existe] = await pool.execute(
      'SELECT id FROM users WHERE email = ? OR cpf = ? LIMIT 1',
      [emailFinal, cpfNum]
    );
    if (existe.length) {
      return res
        .status(409)
        .json({ ok: false, message: 'Já existe cadastro com este e-mail ou CPF.' });
    }

    const hash = await bcrypt.hash(senhaFinal, 10);
    const [result] = await pool.execute(
      "INSERT INTO users (name,email,cpf,password_hash,role,status) VALUES (?,?,?,?,'user','pending')",
      [nomeFinal, emailFinal, cpfNum, hash]
    );
    const userId = result.insertId;

    const agencia = '0001';
    const conta = String(100000 + userId);
    await pool.execute(
      'INSERT INTO accounts (user_id,agency,account_number,balance) VALUES (?,?,?,0)',
      [userId, agencia, conta]
    );

    return res.json({
      ok: true,
      message: 'Cadastro realizado. Sua conta está em análise pelo administrador.'
    });
  } catch (err) {
    console.error('Erro /api/auth/register:', err);
    return res.status(500).json({ ok: false, message: 'Erro ao cadastrar.' });
  }
});

// Login (cpf ou email, igual front usa identifier/by)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, by, password, cpf, email } = req.body || {};
    let where = '';
    let param = '';

    if (identifier && by === 'cpf') {
      where = 'cpf = ?';
      param = identifier.replace(/\D+/g, '');
    } else if (identifier && by === 'email') {
      where = 'LOWER(email) = LOWER(?)';
      param = identifier.toLowerCase();
    } else if (cpf) {
      where = 'cpf = ?';
      param = cpf.replace(/\D+/g, '');
    } else if (email) {
      where = 'LOWER(email) = LOWER(?)';
      param = email.toLowerCase();
    } else {
      return res
        .status(400)
        .json({ ok: false, message: 'Informe CPF ou e-mail e senha.' });
    }

    const [rows] = await pool.execute(
      `SELECT id,name,email,cpf,password_hash,role,status FROM users WHERE ${where} LIMIT 1`,
      [param]
    );
    if (!rows.length) {
      return res
        .status(404)
        .json({ ok: false, message: 'Usuário não encontrado.' });
    }
    const user = rows[0];

    const okPass = await bcrypt.compare(password || '', user.password_hash);
    if (!okPass) {
      return res.status(401).json({ ok: false, message: 'Senha inválida.' });
    }

    if (user.role === 'user') {
      if (user.status === 'pending') {
        return res.status(403).json({
          ok: false,
          message: 'Cadastro em análise pelo administrador.'
        });
      }
      if (user.status === 'rejected') {
        return res.status(403).json({
          ok: false,
          message: 'Cadastro reprovado pelo administrador.'
        });
      }
    }

    const token = gerarTokenJWT({ id: user.id, role: user.role }, '8h');

    return res.json({
      ok: true,
      token,
      role: user.role,
      name: user.name
    });
  } catch (err) {
    console.error('Erro /api/auth/login:', err);
    return res.status(500).json({ ok: false, message: 'Erro interno no login.' });
  }
});

// --------------- DADOS DA CONTA / SALDO ----------------
app.get('/api/balance', authUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.execute(
      'SELECT balance FROM accounts WHERE user_id = ? LIMIT 1',
      [userId]
    );
    if (!rows.length) {
      return res.status(404).json({ ok: false, balance: 0 });
    }
    return res.json({ ok: true, balance: rows[0].balance });
  } catch (err) {
    console.error('Erro /api/balance:', err);
    return res.status(500).json({ ok: false, balance: 0 });
  }
});

app.get('/api/me/account', authUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.execute(
      `SELECT
        a.id,
        a.agency,
        a.account_number,
        a.balance,
        u.name,
        u.cpf,
        u.email
       FROM accounts a
       JOIN users u ON u.id = a.user_id
       WHERE a.user_id = ? LIMIT 1`,
      [userId]
    );
    if (!rows.length) {
      return res
        .status(404)
        .json({ ok: false, message: 'Conta não encontrada.' });
    }
    return res.json({ ok: true, account: rows[0] });
  } catch (err) {
    console.error('Erro /api/me/account:', err);
    return res.status(500).json({ ok: false, message: 'Erro ao buscar conta.' });
  }
});

// --------------- PIX: CHAVES ----------------
app.get('/api/me/pix-keys', authUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.execute(
      'SELECT id,key_type,key_value,created_at FROM pix_keys WHERE user_id = ?',
      [userId]
    );
    return res.json({ ok: true, keys: rows });
  } catch (err) {
    console.error('Erro /api/me/pix-keys GET:', err);
    return res
      .status(500)
      .json({ ok: false, message: 'Erro ao buscar chaves PIX.' });
  }
});

app.post('/api/me/pix-keys', authUser, async (req, res) => {
  try {
    const userId = req.user.id;
    let { tipo, valor } = req.body || {};

    if (!tipo) {
      return res
        .status(400)
        .json({ ok: false, message: 'Informe o tipo da chave.' });
    }
    if (tipo !== 'random' && !valor) {
      return res
        .status(400)
        .json({ ok: false, message: 'Informe o valor da chave.' });
    }
    if (tipo === 'random' && !valor) {
      valor = 'RND-' + crypto.randomBytes(6).toString('hex');
    }

    await pool.execute(
      'INSERT INTO pix_keys (user_id,key_type,key_value) VALUES (?,?,?)',
      [userId, tipo, valor]
    );

    return res.json({ ok: true, message: 'Chave PIX cadastrada com sucesso.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res
        .status(409)
        .json({ ok: false, message: 'Esta chave PIX já está em uso.' });
    }
    console.error('Erro /api/me/pix-keys POST:', err);
    return res
      .status(500)
      .json({ ok: false, message: 'Erro ao cadastrar chave PIX.' });
  }
});

// --------------- PIX: TRANSFERÊNCIA ----------------
app.post('/api/me/pix-transfer', authUser, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.id;
    const { chaveDestino, valor, descricao } = req.body || {};

    if (!chaveDestino || !valor) {
      conn.release();
      return res
        .status(400)
        .json({ ok: false, message: 'Informe chave de destino e valor.' });
    }
    const valorNum = parseFloat(String(valor).replace(',', '.'));
    if (isNaN(valorNum) || valorNum <= 0) {
      conn.release();
      return res
        .status(400)
        .json({ ok: false, message: 'Valor inválido.' });
    }

    await conn.beginTransaction();

    const [origRows] = await conn.execute(
      'SELECT id,balance FROM accounts WHERE user_id = ? FOR UPDATE',
      [userId]
    );
    if (!origRows.length) throw new Error('Conta de origem não encontrada.');
    const contaOrig = origRows[0];

    if (Number(contaOrig.balance) < valorNum) {
      await conn.rollback();
      conn.release();
      return res
        .status(400)
        .json({ ok: false, message: 'Saldo insuficiente.' });
    }

    const [pixRows] = await conn.execute(
      'SELECT a.id AS account_id FROM pix_keys pk JOIN accounts a ON a.user_id = pk.user_id WHERE pk.key_value = ? LIMIT 1',
      [chaveDestino]
    );
    if (!pixRows.length) {
      await conn.rollback();
      conn.release();
      return res
        .status(404)
        .json({ ok: false, message: 'Chave PIX de destino não encontrada.' });
    }
    const contaDest = pixRows[0];

    await conn.execute(
      'UPDATE accounts SET balance = balance - ? WHERE id = ?',
      [valorNum, contaOrig.id]
    );
    await conn.execute(
      'UPDATE accounts SET balance = balance + ? WHERE id = ?',
      [valorNum, contaDest.account_id]
    );
    await conn.execute(
      'INSERT INTO transfers (from_account_id,to_account_id,amount,description) VALUES (?,?,?,?)',
      [contaOrig.id, contaDest.account_id, valorNum, descricao || null]
    );

    await conn.commit();
    conn.release();
    return res.json({ ok: true, message: 'PIX realizado com sucesso.' });
  } catch (err) {
    console.error('Erro /api/me/pix-transfer:', err);
    try {
      await conn.rollback();
    } catch (_) {}
    conn.release();
    return res
      .status(500)
      .json({ ok: false, message: 'Erro ao processar transferência PIX.' });
  }
});

// --------------- EXTRATO ----------------
app.get('/api/me/statement', authUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const [accRows] = await pool.execute(
      'SELECT id FROM accounts WHERE user_id = ? LIMIT 1',
      [userId]
    );
    if (!accRows.length) {
      return res
        .status(404)
        .json({ ok: false, message: 'Conta não encontrada.' });
    }
    const accountId = accRows[0].id;

    const [rows] = await pool.execute(
      `SELECT id,from_account_id,to_account_id,amount,description,created_at
         FROM transfers
        WHERE from_account_id = ? OR to_account_id = ?
        ORDER BY created_at DESC`,
      [accountId, accountId]
    );

    const items = rows.map((t) => ({
      id: t.id,
      kind: t.from_account_id === accountId ? 'sent' : 'received',
      amount: t.amount,
      description: t.description,
      created_at: t.created_at
    }));

    return res.json({ ok: true, items });
  } catch (err) {
    console.error('Erro /api/me/statement:', err);
    return res
      .status(500)
      .json({ ok: false, message: 'Erro ao buscar extrato.' });
  }
});

// --------------- CONTATOS FAVORITOS ----------------
app.get('/api/contacts', authUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.execute(
      'SELECT id,name,cpf,created_at FROM contacts WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return res.json({ ok: true, items: rows });
  } catch (err) {
    console.error('Erro GET /api/contacts:', err);
    return res
      .status(500)
      .json({ ok: false, message: 'Erro ao listar contatos.' });
  }
});

app.post('/api/contacts', authUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, cpf } = req.body || {};
    const nome = (name || '').trim();
    const cpfNum = (cpf || '').replace(/\D+/g, '');
    if (!nome || cpfNum.length !== 11) {
      return res
        .status(400)
        .json({ ok: false, message: 'Nome ou CPF inválidos.' });
    }
    await pool.execute(
      'INSERT INTO contacts (user_id,name,cpf) VALUES (?,?,?)',
      [userId, nome, cpfNum]
    );
    return res.json({ ok: true, message: 'Contato salvo.' });
  } catch (err) {
    console.error('Erro POST /api/contacts:', err);
    return res
      .status(500)
      .json({ ok: false, message: 'Erro ao salvar contato.' });
  }
});

app.delete('/api/contacts/:id', authUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const id = req.params.id;
    await pool.execute('DELETE FROM contacts WHERE id = ? AND user_id = ?', [
      id,
      userId
    ]);
    return res.json({ ok: true, message: 'Contato removido.' });
  } catch (err) {
    console.error('Erro DELETE /api/contacts/:id:', err);
    return res
      .status(500)
      .json({ ok: false, message: 'Erro ao remover contato.' });
  }
});

// --------------- ADMIN 2FA: SOLICITAR CÓDIGO ----------------
// Alinhado com admin-login.html: envia só { email, cpf }
async function handleRequest2FA(req, res) {
  try {
    const { email, cpf } = req.body || {};
    const emailFinal = (email || '').trim().toLowerCase();
    const cpfNum = (cpf || '').replace(/\D+/g, '');

    if (!emailFinal || !cpfNum) {
      return res
        .status(400)
        .json({ ok: false, message: 'Preencha e-mail e CPF.' });
    }

    if (emailFinal !== ADMIN_EMAIL || cpfNum !== ADMIN_CPF) {
      return res
        .status(401)
        .json({ ok: false, message: 'Administrador inválido.' });
    }

    const [rows] = await pool.execute(
      "SELECT id FROM users WHERE email = ? AND role = 'admin' LIMIT 1",
      [ADMIN_EMAIL]
    );
    if (!rows.length) {
      return res
        .status(404)
        .json({ ok: false, message: 'Administrador não encontrado no banco.' });
    }
    const adminDb = rows[0];

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutos

    adminTokens.set(ADMIN_CPF, { code, expiresAt, adminId: adminDb.id });

    const html = `
      <p>Olá, ${ADMIN_NAME}.</p>
      <p>Seu código de autenticação é:</p>
      <p style="font-size:26px;font-weight:bold;letter-spacing:4px;">${code}</p>
      <p>Válido por 10 minutos.</p>
    `;

    await transporter.sendMail({
      from: `"Banco Bradesco" <${process.env.SMTP_USER || ADMIN_EMAIL}>`,
      to: ADMIN_EMAIL,
      subject: 'Código 2FA - Acesso Administrador',
      html
    });

    return res.json({
      ok: true,
      message: 'Código 2FA enviado para o e-mail do administrador.'
    });
  } catch (err) {
    console.error('Erro /api/admin/request-2fa:', err);
    return res
      .status(500)
      .json({ ok: false, message: 'Erro ao enviar código 2FA.' });
  }
}

// Rota usada pelo admin-login.html: API_BASE = '/api'; path '/admin/request-2fa'
app.post('/api/admin/request-2fa', handleRequest2FA);

// --------------- ADMIN 2FA: VALIDAR CÓDIGO ----------------
app.post('/api/admin/verify-2fa', (req, res) => {
  const { cpf, code, codigo } = req.body || {};
  const cpfNum = (cpf || '').replace(/\D+/g, '');
  const codeFinal = code || codigo;

  if (!cpfNum || !codeFinal) {
    return res
      .status(400)
      .json({ ok: false, message: 'Informe CPF e código.' });
  }
  if (cpfNum !== ADMIN_CPF) {
    return res
      .status(401)
      .json({ ok: false, message: 'Administrador inválido.' });
  }

  const info = adminTokens.get(ADMIN_CPF);
  if (!info) {
    return res
      .status(400)
      .json({ ok: false, message: 'Nenhum código pendente. Gere um novo.' });
  }
  if (Date.now() > info.expiresAt) {
    adminTokens.delete(ADMIN_CPF);
    return res
      .status(400)
      .json({ ok: false, message: 'Código expirado. Gere um novo.' });
  }
  if (String(info.code) !== String(codeFinal)) {
    return res.status(400).json({ ok: false, message: 'Código inválido.' });
  }

  adminTokens.delete(ADMIN_CPF);

  const token = gerarTokenJWT({ id: info.adminId, role: 'admin' }, '2h');
  return res.json({
    ok: true,
    token,
    role: 'admin',
    name: ADMIN_NAME
  });
});

// --------------- ADMIN: VALIDAR SESSÃO ----------------
app.get('/api/admin/validate-token', authAdmin, (req, res) => {
  return res.json({ ok: true });
});

// --------------- ADMIN: GERENCIAR CADASTROS ----------------
app.get('/api/admin/pending-users', authAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id,name,email,cpf,created_at FROM users WHERE role = 'user' AND status = 'pending' ORDER BY created_at ASC"
    );
    return res.json({ ok: true, users: rows });
  } catch (err) {
    console.error('Erro /api/admin/pending-users:', err);
    return res
      .status(500)
      .json({ ok: false, message: 'Erro ao buscar cadastros pendentes.' });
  }
});

app.post('/api/admin/users/:id/approve', authAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    await pool.execute('UPDATE users SET status = "active" WHERE id = ?', [
      userId
    ]);

    const [accRows] = await pool.execute(
      'SELECT id FROM accounts WHERE user_id = ? LIMIT 1',
      [userId]
    );
    if (!accRows.length) {
      const conta = String(100000 + parseInt(userId, 10));
      await pool.execute(
        'INSERT INTO accounts (user_id,agency,account_number,balance) VALUES (?,?,?,0)',
        [userId, '0001', conta]
      );
    }

    return res.json({ ok: true, message: 'Usuário aprovado.' });
  } catch (err) {
    console.error('Erro /api/admin/users/:id/approve:', err);
    return res
      .status(500)
      .json({ ok: false, message: 'Erro ao aprovar usuário.' });
  }
});

app.post('/api/admin/users/:id/reject', authAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    await pool.execute('UPDATE users SET status = "rejected" WHERE id = ?', [
      userId
    ]);
    return res.json({ ok: true, message: 'Usuário reprovado.' });
  } catch (err) {
    console.error('Erro /api/admin/users/:id/reject:', err);
    return res
      .status(500)
      .json({ ok: false, message: 'Erro ao reprovar usuário.' });
  }
});

// --------------- START SERVER ----------------
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API Banco rodando na porta ${PORT}`);
});
