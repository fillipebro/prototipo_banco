
// contacts.js — CRUD simples de contatos favoritos + preenchimento no form de transferência
(function(){
  const token = localStorage.getItem('token') || '';
  if(!token) return;
  const table = document.getElementById('contactsTable');
  const form = document.getElementById('contactForm');
  const nameEl = document.getElementById('ct_name');
  const cpfEl = document.getElementById('ct_cpf');

  async function loadContacts(){
    const res = await fetch('/api/contacts', { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await res.json().catch(()=>({items:[]}));
    const items = data.items || [];
    const tbody = table.querySelector('tbody');
    if(items.length===0){
      tbody.innerHTML = `<tr><td colspan="3" class="muted">Nenhum contato salvo.</td></tr>`;
      return;
    }
    tbody.innerHTML = items.map(c => {
      const cpfMasked = (c.cpf||'').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');
      return `<tr>
        <td>${c.name}</td>
        <td>${cpfMasked}</td>
        <td>
          <button class="btn btn-ghost btn-mini" data-act="use" data-cpf="${c.cpf}">Usar</button>
          <button class="btn btn-ghost btn-mini" data-act="del" data-id="${c.id}">Remover</button>
        </td>
      </tr>`;
    }).join('');
  }

  if(table){
    table.addEventListener('click', async (e)=>{
      const btn = e.target.closest('button[data-act]');
      if(!btn) return;
      const act = btn.getAttribute('data-act');
      if(act==='use'){
        const cpf = btn.getAttribute('data-cpf');
        const input = document.getElementById('to_cpf');
        if(input){ input.value = (cpf||'').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2'); }
      }else if(act==='del'){
        const id = btn.getAttribute('data-id');
        await fetch('/api/contacts/'+id, { method:'DELETE', headers: { 'Authorization': 'Bearer ' + token }});
        loadContacts();
      }
    });
  }

  if(form){
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const name = (nameEl.value||'').trim();
      const cpf = (cpfEl.value||'').replace(/\D/g,'');
      if(!name || cpf.length!==11) return;
      await fetch('/api/contacts', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ name, cpf })
      });
      nameEl.value=''; cpfEl.value='';
      loadContacts();
    });
  }

  loadContacts();
})();
