const API_BASE = '/api';

function getAdminToken() {
  return localStorage.getItem('adminToken');
}

async function exigirAdmin() {
  const token = getAdminToken();
  if (!token) {
    alert('Faça login como administrador.');
    window.location.href = 'admin-login.html';
    return;
  }

  try {
    const res = await fetch(API_BASE + '/admin/validate-token', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const ct = res.headers.get('content-type') || '';
    const payload = ct.includes('application/json')
      ? await res.json().catch(() => ({}))
      : await res.text();
    if (!res.ok || !payload.ok) {
      throw new Error('Sessão inválida');
    }
  } catch (err) {
    console.error('Erro ao validar token admin:', err);
    localStorage.removeItem('adminToken');
    alert('Sessão de administrador expirada. Faça login novamente.');
    window.location.href = 'admin-login.html';
  }
}

async function apiAdminGet(path) {
  const token = getAdminToken();
  const res = await fetch(API_BASE + path, {
    headers: { Authorization: `Bearer ${token}` }
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

async function apiAdminPost(path, body) {
  const token = getAdminToken();
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

function formatStatus(status) {
  if (status === 'active') return 'Ativo';
  if (status === 'pending') return 'Pendente';
  if (status === 'rejected') return 'Reprovado';
  return status || '-';
}

// --- carregar pendentes ---
async function carregarPendentes() {
  const tbody = document.getElementById('tbodyPendentes');
  tbody.innerHTML = '<tr><td colspan="5" class="muted">Carregando...</td></tr>';

  try {
    const data = await apiAdminGet('/admin/pending-users');
    if (!data.ok || !data.users || !data.users.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="muted">Nenhum cadastro pendente.</td></tr>';
      return;
    }
    tbody.innerHTML = data.users.map(u => `
      <tr>
        <td>${u.name}</td>
        <td>${u.cpf}</td>
        <td>${u.email}</td>
        <td>${new Date(u.created_at).toLocaleString('pt-BR')}</td>
        <td style="text-align:right;">
          <button class="btn btn-mini" data-act="approve" data-id="${u.id}">Aprovar</button>
          <button class="btn btn-mini danger" data-act="reject" data-id="${u.id}">Rejeitar</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Erro ao carregar pendentes:', err);
    tbody.innerHTML = `<tr><td colspan="5" class="muted">Erro: ${err.message}</td></tr>`;
  }
}

// --- carregar todos ---
async function carregarTodos() {
  const tbody = document.getElementById('tbodyTodos');
  tbody.innerHTML = '<tr><td colspan="5" class="muted">Carregando...</td></tr>';

  try {
    const data = await apiAdminGet('/admin/users');
    if (!data.ok || !data.users || !data.users.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="muted">Nenhum cliente encontrado.</td></tr>';
      return;
    }
    tbody.innerHTML = data.users.map(u => `
      <tr>
        <td>${u.name}</td>
        <td>${u.cpf}</td>
        <td>${u.email}</td>
        <td>${formatStatus(u.status)}</td>
        <td>${new Date(u.created_at).toLocaleString('pt-BR')}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Erro ao carregar todos:', err);
    tbody.innerHTML = `<tr><td colspan="5" class="muted">Erro: ${err.message}</td></tr>`;
  }
}

// ações aprovar / rejeitar
document.getElementById('tbodyPendentes').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const id = btn.getAttribute('data-id');
  const act = btn.getAttribute('data-act');

  try {
    if (act === 'approve') {
      await apiAdminPost(`/admin/users/${id}/approve`, {});
      alert('Usuário aprovado. Agora ele já pode fazer login e movimentar a conta.');
    }
    if (act === 'reject') {
      await apiAdminPost(`/admin/users/${id}/reject`, {});
      alert('Usuário reprovado.');
    }
    await carregarPendentes();
    await carregarTodos();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('btnLogout').addEventListener('click', () => {
  localStorage.removeItem('adminToken');
  window.location.href = 'admin-login.html';
});

(async () => {
  await exigirAdmin();
  await carregarPendentes();
  await carregarTodos();
})();
