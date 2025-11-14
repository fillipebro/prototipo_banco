const API_BASE = '/api';

function getUserToken() {
  return localStorage.getItem('userToken') || localStorage.getItem('token');
}

async function exigirLogin() {
  const token = getUserToken();
  if (!token) {
    alert('Faça login para acessar o dashboard.');
    window.location.href = 'login.html';
  }
}

async function apiUserGet(path) {
  const token = getUserToken();
  const res = await fetch(API_BASE + path, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const ct = res.headers.get('content-type') || '';
  const payload = ct.includes('application/json')
    ? await res.json().catch(() => ({}))
    : await res.text();
  if (!res.ok) {
    const msg = (payload && payload.message)
      ? payload.message
      : (typeof payload === 'string' ? payload : 'Erro na solicitação.');
    throw new Error(msg);
  }
  return payload;
}

async function apiUserPost(path, body) {
  const token = getUserToken();
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body || {})
  });
  const ct = res.headers.get('content-type') || '';
  const payload = ct.includes('application/json')
    ? await res.json().catch(() => ({}))
    : await res.text();
  if (!res.ok) {
    const msg = (payload && payload.message)
      ? payload.message
      : (typeof payload === 'string' ? payload : 'Erro na solicitação.');
    throw new Error(msg);
  }
  return payload;
}

function formatMoney(v) {
  const num = Number(v || 0);
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d) {
  return new Date(d).toLocaleString('pt-BR');
}

// --- carregar dados da conta ---
async function carregarConta() {
  const data = await apiUserGet('/me/account');
  if (!data.ok || !data.account) return;

  const acc = data.account;
  document.getElementById('userName').textContent = acc.name;
  document.getElementById('agency').textContent = acc.agency;
  document.getElementById('accountNumber').textContent = acc.account_number;
  document.getElementById('balance').textContent = formatMoney(acc.balance);
}

// --- carregar chaves PIX ---
async function carregarPix() {
  const lista = document.getElementById('listaPix');
  lista.innerHTML = '<li class="muted">Carregando...</li>';

  const data = await apiUserGet('/me/pix-keys');
  if (!data.ok) {
    lista.innerHTML = '<li class="muted">Erro ao carregar chaves.</li>';
    return;
  }
  if (!data.keys || !data.keys.length) {
    lista.innerHTML = '<li class="muted">Nenhuma chave cadastrada.</li>';
    return;
  }

  lista.innerHTML = data.keys.map(k => `
    <li>
      <strong>${k.key_type}:</strong> ${k.key_value}
      <span class="muted">(${formatDate(k.created_at)})</span>
    </li>
  `).join('');
}

// --- carregar extrato ---
async function carregarExtrato() {
  const tbody = document.getElementById('tbodyExtrato');
  tbody.innerHTML = '<tr><td colspan="4" class="muted">Carregando...</td></tr>';

  try {
    const data = await apiUserGet('/me/statement');
    if (!data.ok || !data.items || !data.items.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="muted">Nenhuma movimentação.</td></tr>';
      return;
    }
    tbody.innerHTML = data.items.map(it => `
      <tr>
        <td>${formatDate(it.created_at)}</td>
        <td>${it.kind === 'sent' ? 'Enviado' : 'Recebido'}</td>
        <td>${it.kind === 'sent' ? '-' : ''}R$ ${formatMoney(it.amount)}</td>
        <td>${it.description || '-'}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Erro extrato:', err);
    tbody.innerHTML = `<tr><td colspan="4" class="muted">Erro: ${err.message}</td></tr>`;
  }
}

// --- eventos PIX ---
document.getElementById('pixTipo').addEventListener('change', (e) => {
  const tipo = e.target.value;
  const row = document.getElementById('rowPixValor');
  if (tipo === 'random') {
    row.style.display = 'none';
  } else {
    row.style.display = '';
  }
});

document.getElementById('btnAddPix').addEventListener('click', async () => {
  try {
    const tipo = document.getElementById('pixTipo').value;
    let valor = document.getElementById('pixValor').value.trim();
    if (tipo !== 'random' && !valor) {
      alert('Informe o valor da chave.');
      return;
    }
    await apiUserPost('/me/pix-keys', { tipo, valor });
    alert('Chave PIX cadastrada com sucesso.');
    document.getElementById('pixValor').value = '';
    await carregarPix();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('btnEnviarPix').addEventListener('click', async () => {
  try {
    const chaveDestino = document.getElementById('pixChaveDestino').value.trim();
    const valor = document.getElementById('pixValorEnvio').value;
    const descricao = document.getElementById('pixDescricao').value.trim();
    if (!chaveDestino || !valor) {
      alert('Informe chave de destino e valor.');
      return;
    }
    await apiUserPost('/me/pix-transfer', { chaveDestino, valor, descricao });
    alert('PIX enviado com sucesso.');
    document.getElementById('pixValorEnvio').value = '';
    document.getElementById('pixDescricao').value = '';
    await carregarConta();
    await carregarExtrato();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('btnLogout').addEventListener('click', () => {
  localStorage.removeItem('userToken');
  localStorage.removeItem('token');
  window.location.href = 'login.html';
});

(async () => {
  await exigirLogin();
  await carregarConta();
  await carregarPix();
  await carregarExtrato();
})();
