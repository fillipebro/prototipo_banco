document.addEventListener('DOMContentLoaded', ()=>{
  const user = currentUser();
  if(!user){ window.location.href = 'login.html'; return; }
  document.getElementById('userName').textContent = user.name.split(' ')[0];
  document.getElementById('balanceValue').textContent = Number(user.balance).toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2});

  const txList = document.getElementById('txList');
  const mock = [
    {id:1,desc:'Pagamento - Mercado', amount:-120.50, date:'2025-09-01'},
    {id:2,desc:'Depósito TED', amount:2000.00, date:'2025-08-28'},
    {id:3,desc:'Pix recebido - João', amount:350.00, date:'2025-08-25'},
    {id:4,desc:'Compra - Restaurante', amount:-85.90, date:'2025-08-20'}
  ];
  mock.forEach(t => {
    const li = document.createElement('li');
    li.className = 'tx-item';
    li.innerHTML = `<div class="tx-left"><strong>${t.desc}</strong><small style="color:var(--muted)">${t.date}</small></div><div class="tx-right"><div class="tx-amount ${t.amount<0?'negative':'positive'}">${t.amount<0?'- ':'+ '}${Math.abs(t.amount).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div></div>`;
    txList.appendChild(li);
  });
});