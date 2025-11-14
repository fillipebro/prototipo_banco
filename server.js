const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('./db');
require('dotenv').config();

// ⚠️ DEV APENAS: ignora erro de certificado TLS (self-signed)
// NÃO use isso em produção real.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'segredo-dev';

// --- Configuração do administrador padrão ---
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'rfillipe21@gmail.com').toLowerCase();
const ADMIN_CPF = (process.env.ADMIN_CPF || '55781176861').replace(/\D+/g, '');
const ADMIN_NAME = process.env.ADMIN_NAME || 'Fillipe de Oliveira Ribeiro';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456';

// Mapa em memória para códigos 2FA do admin
const adminTokens = new Map();

// --- Configuração SMTP (Gmail) com TLS relaxado (DEV) ---
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // SSL direto
  auth: {
    user: process.env.SMTP_USER || ADMIN_EMAIL,
    pass: process.env.SMTP_PASS
  },
  tls: {
    // ⚠️ APENAS PARA DESENVOLVIMENTO:
    // Ignora certificado autoassinado no caminho até o Gmail
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

// --- Funções auxiliares de autenticação ---
function gerarTokenJWT(payload, expiresIn = '8h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function authUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token ausente' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

function authAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token ausente' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Permissão negada' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// --- Criação do admin padrão e tentativa de conexão ao MySQL ---
async function ensureAdminUser() {
  try {
    const [rows] = await pool.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
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
  } catch (err) {
    console.error('Erro ao criar admin padrão:', err);
  }
}

async function ensureAdminUserWithRetry(retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      await ensureAdminUser();
      return;
    } catch (err) {
      console.log(`MySQL não pronto ainda... tentativa ${i + 1}/${retries}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  console.error('Falha ao conectar ao MySQL após várias tentativas.');
}

ensureAdminUserWithRetry();

// --- Rotas básicas de teste ---
app.get('/', (req, res) => {
  res.json({ ok: true, message: 'API Banco Bradesco ONLINE' });
});

app.get('/api/test', (req, res) => {
  res.json({ ok: true, message: 'GET /api/test ok' });
});

// --- Cadastro de usuário (cliente) ---
async function registerHandler(req, res) {
  try {
    const { nome, name, email, cpf, senha, password } = req.body || {};

    const nomeFinal  = (nome || name || '').trim();
    const emailFinal = (email || '').trim().toLowerCase();
    const cpfNum     = (cpf || '').replace(/\D+/g, '');
    const senhaFinal = senha || password || '';

    if (!nomeFinal || !emailFinal || !cpfNum || !senhaFinal) {
      return res
        .status(400)
        .json({ ok: false, message: 'Preencha todos os campos.' });
    }

    // verifica se já existe usuário com esse CPF ou e-mail
    const [existe] = await pool.execute(
      'SELECT id,status FROM users WHERE cpf = ? OR email = ? LIMIT 1',
      [cpfNum, emailFinal]
    );

    if (existe.length) {
      const existing = existe[0];

      // se já existia mas foi REPROVADO, permitimos "recadastro"
      if (existing.status === 'rejected') {
        const hash = await bcrypt.hash(senhaFinal, 10);

        await pool.execute(
          'UPDATE users SET name = ?, email = ?, cpf = ?, password_hash = ?, status = "pending" WHERE id = ?',
          [nomeFinal, emailFinal, cpfNum, hash, existing.id]
        );

        // garante conta
        const [accRows] = await pool.execute(
          'SELECT id FROM accounts WHERE user_id = ? LIMIT 1',
          [existing.id]
        );
        if (!accRows.length) {
          const conta = String(100000 + parseInt(existing.id, 10));
          await pool.execute(
            'INSERT INTO accounts (user_id,agency,account_number,balance) VALUES (?,?,?,0)',
            [existing.id, '0001', conta]
          );
        }

        return res.json({
          ok: true,
          message: 'Cadastro reenviado. Sua conta está em análise novamente pelo administrador.'
        });
      }

      // se está pendente ou ativo, não deixa recadastrar
      return res
        .status(409)
        .json({ ok: false, message: 'Já existe cadastro com este CPF ou e-mail.' });
    }

    // cadastro novo
    const hash = await bcrypt.hash(senhaFinal, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (name,email,cpf,password_hash,role,status) VALUES (?,?,?,?,"user","pending")',
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
    console.error('Erro registerHandler:', err);
    let msg = 'Erro ao cadastrar.';
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      msg = 'Tabelas do banco não encontradas. Confira se o schema.mysql.sql foi carregado.';
    } else if (err && err.code === 'ER_ACCESS_DENIED_ERROR') {
      msg = 'Erro de acesso ao MySQL. Confira usuário e senha do banco.';
    } else if (err && err.code === 'ECONNREFUSED') {
      msg = 'Não foi possível conectar ao banco de dados. Verifique se o serviço mysql está ativo.';
    } else if (err && err.sqlMessage) {
      msg = err.sqlMessage;
    }
    return res.status(500).json({ ok: false, message: msg });
  }
}

app.post('/api/auth/register', registerHandler);
app.post('/auth/register', registerHandler);

// --- Login do cliente ---
async function loginHandler(req, res) {
  try {
    const { identifier, by, password, cpf, email } = req.body || {};

    let where = '';
    let param = '';

    if (identifier && by) {
      if (by === 'cpf') {
        const cpfNum = identifier.replace(/\D+/g, '');
        where = 'cpf = ?';
        param = cpfNum;
      } else if (by === 'email') {
        where = 'LOWER(email) = LOWER(?)';
        param = identifier.toLowerCase();
      }
    } else if (cpf) {
      const cpfNum = cpf.replace(/\D+/g, '');
      where = 'cpf = ?';
      param = cpfNum;
    } else if (email) {
      where = 'LOWER(email) = LOWER(?)';
      param = email.toLowerCase();
    } else {
      return res.status(400).json({ ok: false, message: 'Informe CPF ou e-mail e senha.' });
    }

    const [rows] = await pool.execute(
      `SELECT id,name,email,cpf,password_hash,role,status FROM users WHERE ${where} LIMIT 1`,
      [param]
    );
    if (!rows.length) {
      return res.status(404).json({ ok: false, message: 'Usuário não encontrado.' });
    }

    const user = rows[0];
    const okPass = await bcrypt.compare(password, user.password_hash);
    if (!okPass) {
      return res.status(401).json({ ok: false, message: 'Senha inválida.' });
    }

    if (user.role === 'user') {
      if (user.status === 'pending') {
        return res.status(403).json({ ok: false, message: 'Cadastro em análise pelo administrador.' });
      }
      if (user.status === 'rejected') {
        return res.status(403).json({ ok: false, message: 'Cadastro reprovado pelo administrador.' });
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
    console.error('Erro loginHandler:', err);
    return res.status(500).json({ ok: false, message: 'Erro interno no login.' });
  }
}

app.post('/api/auth/login', loginHandler);
app.post('/auth/login', loginHandler);

// --- Rotas da conta do usuário ---
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
      return res.status(404).json({ ok: false, message: 'Conta não encontrada.' });
    }
    return res.json({ ok: true, account: rows[0] });
  } catch (err) {
    console.error('Erro /api/me/account:', err);
    return res.status(500).json({ ok: false, message: 'Erro ao buscar conta.' });
  }
});

// --- PIX: listar chaves ---
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
    return res.status(500).json({ ok: false, message: 'Erro ao buscar chaves PIX.' });
  }
});

// --- PIX: cadastrar chave ---
app.post('/api/me/pix-keys', authUser, async (req, res) => {
  try {
    const userId = req.user.id;
    let { tipo, valor } = req.body || {};
    if (!tipo) {
      return res.status(400).json({ ok: false, message: 'Informe o tipo da chave.' });
    }
    if (tipo !== 'random' && !valor) {
      return res.status(400).json({ ok: false, message: 'Informe o valor da chave.' });
    }
    if (tipo === 'random' && !valor) {
      valor = 'RND-' + crypto.randomBytes(6).toString('hex');
    }

    await pool.execute(
      'INSERT INTO pix_keys (user_id,key_type,key_value) VALUES (?,?,?)',
      [userId, tipo, valor]
    );

    return res.json({
      ok: true,
      message: 'Chave PIX cadastrada com sucesso.',
      key: { tipo, valor }
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ ok: false, message: 'Esta chave PIX já está em uso.' });
    }
    console.error('Erro /api/me/pix-keys POST:', err);
    return res.status(500).json({ ok: false, message: 'Erro ao cadastrar chave PIX.' });
  }
});

// --- PIX: transferência ---
app.post('/api/me/pix-transfer', authUser, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.id;
    const { chaveDestino, valor, descricao } = req.body || {};
    if (!chaveDestino || !valor) {
      conn.release();
      return res.status(400).json({ ok: false, message: 'Informe chave de destino e valor.' });
    }
    const valorNum = parseFloat(String(valor).replace(',', '.'));
    if (isNaN(valorNum) || valorNum <= 0) {
      conn.release();
      return res.status(400).json({ ok: false, message: 'Valor inválido.' });
    }

    await conn.beginTransaction();

    const [origRows] = await conn.execute(
      'SELECT id,balance FROM accounts WHERE user_id = ? FOR UPDATE',
      [userId]
    );
    if (!origRows.length) throw new Error('Conta de origem não encontrada.');
    const contaOrig = origRows[0];

    if (Number(contaOrig.balance) < valorNum) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ ok: false, message: 'Saldo insuficiente.' });
    }

    const [pixRows] = await conn.execute(
      'SELECT a.id AS account_id FROM pix_keys pk JOIN accounts a ON a.user_id = pk.user_id WHERE pk.key_value = ? LIMIT 1',
      [chaveDestino]
    );
    if (!pixRows.length) {
      await conn.rollback(); conn.release();
      return res.status(404).json({ ok: false, message: 'Chave PIX de destino não encontrada.' });
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
    try { await conn.rollback(); } catch (_) {}
    conn.release();
    return res.status(500).json({ ok: false, message: 'Erro ao processar transferência PIX.' });
  }
});

// --- Extrato ---
app.get('/api/me/statement', authUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const [accRows] = await pool.execute(
      'SELECT id FROM accounts WHERE user_id = ? LIMIT 1',
      [userId]
    );
    if (!accRows.length) {
      return res.status(404).json({ ok: false, message: 'Conta não encontrada.' });
    }
    const accountId = accRows[0].id;

    const [rows] = await pool.execute(
      `SELECT
        t.id,
        t.from_account_id,
        t.to_account_id,
        t.amount,
        t.description,
        t.created_at
       FROM transfers t
       WHERE t.from_account_id = ? OR t.to_account_id = ?
       ORDER BY t.created_at DESC`,
      [accountId, accountId]
    );

    const items = rows.map(t => ({
      id: t.id,
      kind: t.from_account_id === accountId ? 'sent' : 'received',
      amount: t.amount,
      description: t.description,
      created_at: t.created_at
    }));

    return res.json({ ok: true, items });
  } catch (err) {
    console.error('Erro /api/me/statement:', err);
    return res.status(500).json({ ok: false, message: 'Erro ao buscar extrato.' });
  }
});

// --- ADMIN 2FA: solicitar código (sem exigir senha) ---
async function handleRequest2FA(req, res) {
  try {
    const { email, cpf } = req.body || {};
    const emailFinal = (email || '').trim().toLowerCase();
    const cpfNum = (cpf || '').replace(/\D+/g, '');

    if (!emailFinal || !cpfNum) {
      return res.status(400).json({ ok: false, message: 'Preencha e-mail e CPF.' });
    }

    if (emailFinal !== ADMIN_EMAIL || cpfNum !== ADMIN_CPF) {
      return res.status(401).json({ ok: false, message: 'Administrador inválido.' });
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
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 min

    adminTokens.set(ADMIN_CPF, { code, expiresAt, adminId: adminDb.id });

    const html = `
      <p>Olá, ${ADMIN_NAME}.</p>
      <p>Seu código de autenticação é:</p>
      <p style="font-size:26px;font-weight:bold;letter-spacing:4px;">${code}</p>
      <p>Válido por 10 minutos.</p>
    `;

    await transporter.sendMail({
      from: `"Banco" <${process.env.SMTP_USER || ADMIN_EMAIL}>`,
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
    const msgDetalhe = err && err.message ? ` Detalhe: ${err.message}` : '';
    return res
      .status(500)
      .json({ ok: false, message: 'Erro ao enviar código 2FA.' + msgDetalhe });
  }
}

app.post('/api/admin/request-2fa', handleRequest2FA);
app.post('/admin/request-2fa', handleRequest2FA);

// --- 2FA Admin: validar código ---
function handleVerify2FA(req, res) {
  const { cpf, code, codigo } = req.body || {};
  const cpfNum = (cpf || '').replace(/\D+/g, '');
  const codeFinal = code || codigo;

  if (!cpfNum || !codeFinal) {
    return res.status(400).json({ ok: false, message: 'Informe CPF e código.' });
  }
  if (cpfNum !== ADMIN_CPF) {
    return res.status(401).json({ ok: false, message: 'Administrador inválido.' });
  }

  const info = adminTokens.get(ADMIN_CPF);
  if (!info) {
    return res.status(400).json({ ok: false, message: 'Nenhum código pendente. Gere um novo.' });
  }
  if (Date.now() > info.expiresAt) {
    adminTokens.delete(ADMIN_CPF);
    return res.status(400).json({ ok: false, message: 'Código expirado. Gere um novo.' });
  }
  if (String(codeFinal) !== String(info.code)) {
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
}

app.post('/api/admin/verify-2fa', handleVerify2FA);
app.post('/admin/verify-2fa', handleVerify2FA);

// --- Admin: validar sessão ---
app.get('/api/admin/validate-token', authAdmin, (req, res) => {
  return res.json({ ok: true });
});

// --- Admin: listar pendentes ---
app.get('/api/admin/pending-users', authAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id,name,email,cpf,created_at FROM users WHERE role = 'user' AND status = 'pending' ORDER BY created_at ASC"
    );
    return res.json({ ok: true, users: rows });
  } catch (err) {
    console.error('Erro /api/admin/pending-users:', err);
    return res.status(500).json({ ok: false, message: 'Erro ao buscar cadastros pendentes.' });
  }
});

// --- Admin: listar TODOS os clientes (com status) ---
app.get('/api/admin/users', authAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id,name,email,cpf,status,created_at FROM users WHERE role = 'user' ORDER BY created_at DESC"
    );
    return res.json({ ok: true, users: rows });
  } catch (err) {
    console.error('Erro /api/admin/users:', err);
    return res.status(500).json({ ok: false, message: 'Erro ao buscar usuários.' });
  }
});

// --- Admin: aprovar / reprovar usuário ---
app.post('/api/admin/users/:id/approve', authAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    await pool.execute(
      "UPDATE users SET status = 'active' WHERE id = ?",
      [userId]
    );

    const [accRows] = await pool.execute(
      'SELECT id FROM accounts WHERE user_id = ? LIMIT 1',
      [userId]
    );
    if (!accRows.length) {
      const accountNumber = String(100000 + parseInt(userId, 10));
      await pool.execute(
        'INSERT INTO accounts (user_id,agency,account_number,balance) VALUES (?,?,?,0)',
        [userId, '0001', accountNumber]
      );
    }

    return res.json({ ok: true, message: 'Usuário aprovado com sucesso.' });
  } catch (err) {
    console.error('Erro /api/admin/users/:id/approve:', err);
    return res.status(500).json({ ok: false, message: 'Erro ao aprovar usuário.' });
  }
});

app.post('/api/admin/users/:id/reject', authAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    await pool.execute(
      "UPDATE users SET status = 'rejected' WHERE id = ?",
      [userId]
    );

    return res.json({ ok: true, message: 'Usuário reprovado.' });
  } catch (err) {
    console.error('Erro /api/admin/users/:id/reject:', err);
    return res.status(500).json({ ok: false, message: 'Erro ao reprovar usuário.' });
  }
});

// --- Inicialização do servidor ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API Banco Bradesco rodando na porta ${PORT}`);
});
