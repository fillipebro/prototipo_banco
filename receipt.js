
// receipt.js — captura comprovante da resposta do backend e exibe modal/impressão
(function(){
  const modal = document.getElementById('receiptModal');
  const btnClose = document.getElementById('rc_close');
  const btnPrint = document.getElementById('rc_print');

  function setText(id, val){ const el = document.getElementById(id); if(el) el.textContent = val; }

  // Hook na função do transfer.js
  const origFetch = window.fetch;
  window.fetch = async function(url, options){
    const res = await origFetch.apply(this, arguments);
    try{
      if(String(url).includes('/api/transfer')){
        const clone = res.clone();
        const isJson = (clone.headers.get('content-type')||'').includes('application/json');
        const payload = isJson ? await clone.json().catch(()=>null) : null;
        if(payload && payload.receipt){
          const r = payload.receipt;
          setText('rc_status', 'Aprovada');
          setText('rc_type', (r.type||'').toUpperCase());
          setText('rc_amount', new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(r.amount));
          setText('rc_cpf', r.to_cpf ? r.to_cpf.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2') : '—');
          setText('rc_ts', new Date(r.ts || Date.now()).toLocaleString('pt-BR'));
          setText('rc_id', r.id);
          setText('rc_verif', r.verification);
          if(modal){ modal.setAttribute('aria-hidden','false'); }
          // atualiza saldo visual se veio no payload
          if(typeof payload.balance === 'number'){
            const balEl = document.querySelector('.widget h4 + p');
            if(balEl) balEl.textContent = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(payload.balance);
          }
        }
      }
    }catch(e){ /* ignore */ }
    return res;
  };

  if(btnClose){
    btnClose.addEventListener('click', ()=> modal && modal.setAttribute('aria-hidden','true'));
  }
  if(btnPrint){
    btnPrint.addEventListener('click', ()=> window.print());
  }
})();
