const API_BASE = '/api';

function getToken(){
  return localStorage.getItem('token');
}

function exigirLogin(){
  if(!getToken()){
    alert('Faça login para acessar sua conta.');
    window.location.href = 'login.html';
  }
}

exigirLogin();

async function carregarConta(){
  try{
    const res = await fetch(`${API_BASE}/me/account`, {
      headers:{ Authorization:`Bearer ${getToken()}` }
    });
    const data = await res.json();
    if(!data.ok){
      alert(data.message || 'Erro ao carregar conta.');
      return;
    }
    document.getElementById('agencia').textContent = data.account.agency;
    document.getElementById('conta').textContent = data.account.account_number;
    document.getElementById('saldo').textContent =
      Number(data.account.balance).toFixed(2).replace('.', ',');
if(data.account.name){
  document.getElementById('cliente-nome').textContent = data.account.name;
}
if(data.account.cpf){
  document.getElementById('cliente-cpf').textContent = data.account.cpf;
}
if(data.account.email){
  document.getElementById('cliente-email').textContent = data.account.email;
}

  }catch(err){
    console.error(err);
    alert('Erro ao buscar dados da conta.');
  }
}

async function carregarChavesPix(){
  try{
    const res = await fetch(`${API_BASE}/me/pix-keys`, {
      headers:{ Authorization:`Bearer ${getToken()}` }
    });
    const data = await res.json();
    const tbody = document.getElementById('lista-chaves');
    if(!data.ok || !data.keys || !data.keys.length){
      tbody.innerHTML = '<tr><td class="muted" colspan="3">Nenhuma chave cadastrada.</td></tr>';
      return;
    }
    tbody.innerHTML = data.keys.map(k => {
      const dt = k.created_at ? new Date(k.created_at).toLocaleString('pt-BR') : '-';
      return `<tr>
        <td>${k.key_type}</td>
        <td>${k.key_value}</td>
        <td>${dt}</td>
      </tr>`;
    }).join('');
  }catch(err){
    console.error(err);
    document.getElementById('lista-chaves').innerHTML =
      '<tr><td class="muted" colspan="3">Erro ao carregar chaves.</td></tr>';
  }
}

document.getElementById('tipo-chave').addEventListener('change', (e)=>{
  const field = document.getElementById('field-valor-chave');
  const input = document.getElementById('valor-chave');
  if(e.target.value === 'random'){
    field.style.display = 'none';
    input.value = '';
  }else{
    field.style.display = 'flex';
  }
});

document.getElementById('form-chave-pix').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const tipo = document.getElementById('tipo-chave').value;
  const valorInput = document.getElementById('valor-chave');
  let valor = valorInput.value.trim();

  if(tipo !== 'random' && !valor){
    alert('Informe o valor da chave.');
    return;
  }

  const body = { tipo, valor: tipo === 'random' ? undefined : valor };

  try{
    const res = await fetch(`${API_BASE}/me/pix-keys`, {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        Authorization:`Bearer ${getToken()}`
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if(!data.ok){
      alert(data.message || 'Erro ao cadastrar chave PIX.');
      return;
    }
    alert('Chave PIX cadastrada com sucesso.');
    valorInput.value = '';
    carregarChavesPix();
  }catch(err){
    console.error(err);
    alert('Erro de conexão ao cadastrar chave.');
  }
});

document.getElementById('form-transferencia').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const chave = document.getElementById('chave-destino').value.trim();
  const valor = document.getElementById('valor-transferencia').value.trim();
  const descricao = document.getElementById('descricao-transferencia').value.trim();

  if(!chave || !valor){
    alert('Preencha a chave de destino e o valor.');
    return;
  }

  const ok = confirm(`Confirmar envio de R$ ${valor} para a chave PIX:\n\n${chave} ?`);
  if(!ok) return;

  try{
    const res = await fetch(`${API_BASE}/me/pix-transfer`, {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        Authorization:`Bearer ${getToken()}`
      },
      body: JSON.stringify({
        chaveDestino: chave,
        valor,
        descricao
      })
    });
    const data = await res.json();
    if(!data.ok){
      alert(data.message || 'Erro ao realizar PIX.');
      return;
    }
    alert('PIX realizado com sucesso.');
    document.getElementById('form-transferencia').reset();
    carregarConta();
  }catch(err){
    console.error(err);
    alert('Erro de conexão ao enviar PIX.');
  }
});



async function carregarExtrato(){
  try{
    const res = await fetch(`${API_BASE}/me/statement`, {
      headers:{ Authorization:`Bearer ${getToken()}` }
    });
    const data = await res.json();
    const tbody = document.getElementById('extrato-body');
    if(!data.ok || !data.items || !data.items.length){
      tbody.innerHTML = '<tr><td class="muted" colspan="4">Nenhuma movimentação encontrada.</td></tr>';
      return;
    }
    tbody.innerHTML = data.items.map(t => {
      const tipo = t.kind === 'sent' ? 'Enviado' : 'Recebido';
      const valor = Number(t.amount).toFixed(2).replace('.', ',');
      const desc = t.description || '-';
      const dt = t.created_at ? new Date(t.created_at).toLocaleString('pt-BR') : '-';
      return `<tr>
        <td>${tipo}</td>
        <td>R$ ${valor}</td>
        <td>${desc}</td>
        <td>${dt}</td>
      </tr>`;
    }).join('');
  }catch(err){
    console.error(err);
    document.getElementById('extrato-body').innerHTML =
      '<tr><td class="muted" colspan="4">Erro ao carregar extrato.</td></tr>';
  }
}

// inicialização
carregarConta();
carregarChavesPix();
carregarExtrato();
