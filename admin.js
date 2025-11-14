const API_BASE = '/api';

function getAdminToken(){
  return localStorage.getItem('adminToken');
}

async function exigirAdmin(){
  const token = getAdminToken();
  if(!token){
    alert('Faça login como administrador.');
    window.location.href = 'admin-login.html';
    return;
  }
  try{
    const res = await fetch(API_BASE + '/admin/validate-token', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if(!data.ok){
      localStorage.removeItem('adminToken');
      alert('Sessão de administrador expirada. Faça login novamente.');
      window.location.href = 'admin-login.html';
    }
  }catch(err){
    console.error('Erro ao validar token admin:', err);
    localStorage.removeItem('adminToken');
    alert('Erro ao validar sessão de administrador. Faça login novamente.');
    window.location.href = 'admin-login.html';
  }
}

async function apiAdminGet(path){
  const res = await fetch(API_BASE + path, {
    headers:{ Authorization:`Bearer ${getAdminToken()}` }
  });
  const contentType = res.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await res.json().catch(()=>({})) : await res.text();
  if(!res.ok){
    const msg = (payload && payload.message) ? payload.message : (typeof payload === 'string' ? payload : 'Erro na solicitação.');
    throw new Error(msg);
  }
  return payload;
}

async function apiAdminPost(path, body){
  const res = await fetch(API_BASE + path, {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      Authorization:`Bearer ${getAdminToken()}`
    },
    body: JSON.stringify(body || {})
  });
  const contentType = res.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await res.json().catch(()=>({})) : await res.text();
  if(!res.ok){
    const msg = (payload && payload.message) ? payload.message : (typeof payload === 'string' ? payload : 'Erro na solicitação.');
    throw new Error(msg);
  }
  return payload;
}

async function carregarPendentes(){
  const tbody = document.getElementById('tbody');
  tbody.innerHTML = '<tr><td colspan="5" class="muted">Carregando...</td></tr>';
  const data = await apiAdminGet('/admin/pending-users');
  if(!data.ok || !data.users || !data.users.length){
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
}

document.addEventListener('click', async (e)=>{
  const btn = e.target.closest('button[data-act]');
  if(!btn) return;
  const id = btn.getAttribute('data-id');
  const act = btn.getAttribute('data-act');
  try{
    if(act === 'approve') await apiAdminPost(`/admin/users/${id}/approve`, {});
    if(act === 'reject')  await apiAdminPost(`/admin/users/${id}/reject`, {});
    await carregarPendentes();
  }catch(err){
    alert(err.message);
  }
});

(async()=>{
  await exigirAdmin();
  await carregarPendentes();
})();
