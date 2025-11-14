
// transfer_confirm.js — confirmação forte para PIX/TED com PIN e resumo antes de enviar
(function(){
  const form = document.getElementById('transferForm');
  const btn = document.getElementById('transferSubmit');
  const alertBox = document.getElementById('transferAlert');
  const modal = document.getElementById('confirmModal');
  if(!form || !btn || !alertBox || !modal) return;

  const fmtBRL = (v)=> new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(String(v).replace(/\./g,'').replace(',','.')) || 0);

  function showAlert(type, msg){
    alertBox.className = 'alert show ' + type;
    alertBox.textContent = msg;
  }

  function openModal(){
    modal.setAttribute('aria-hidden','false');
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');
  }

  // Preenche resumo e abre modal
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    alertBox.className = 'alert'; alertBox.textContent = '';

    const amount = document.getElementById('amount').value.trim();
    const type = document.getElementById('type').value;
    const toCpf = document.getElementById('to_cpf').value.trim();

    // regras de horário/valor (client-side; servidor deve reforçar)
    try {
      const hours = new Date().getHours();
      const v = Number(String(amount).replace(/\./g,'').replace(',','.')) || 0;
      if(v <= 0) throw new Error('Informe um valor maior que zero.');
      if(v > 2000 && hours >= 19) throw new Error('Transações acima de R$ 2.000,00 após 19:00 são bloqueadas.');
    } catch (err){
      showAlert('error', err.message); return;
    }

    document.getElementById('cf_amount').textContent = fmtBRL(amount);
    document.getElementById('cf_type').textContent = type.toUpperCase();
    document.getElementById('cf_cpf').textContent = toCpf || '—';
    document.getElementById('cf_consent').checked = false;
    document.getElementById('cf_pin').value = '';
    openModal();
  });

  // Ações do modal
  document.getElementById('cf_cancel').addEventListener('click', closeModal);
  document.getElementById('cf_confirm').addEventListener('click', async ()=>{
    const pin = (document.getElementById('cf_pin').value || '').trim();
    const consent = document.getElementById('cf_consent').checked;
    if(pin.length !== 6 || !/^\d{6}$/.test(pin)){ showAlert('error','Informe o PIN de 6 dígitos.'); return; }
    if(!consent){ showAlert('error','Você precisa confirmar que revisou os dados.'); return; }

    btn.disabled = true; btn.textContent = 'Enviando...';

    try{
      const payload = {
        amount: Number(String(document.getElementById('amount').value).replace(/\./g,'').replace(',','.')),
        type: document.getElementById('type').value,
        to_cpf: document.getElementById('to_cpf').value.trim(),
        pin
      };
      const data = await API.apiPost('/api/transfer', payload);
      closeModal();
      showAlert('success','Transferência enviada! Abrindo comprovante…');

      // preencher comprovante existente
      if(data && data.receipt){
        const r = data.receipt;
        document.getElementById('rc_status').textContent = r.status || 'Processando';
        document.getElementById('rc_type').textContent = r.type || payload.type;
        document.getElementById('rc_amount').textContent = fmtBRL(payload.amount);
        document.getElementById('rc_cpf').textContent = payload.to_cpf || '—';
        document.getElementById('rc_ts').textContent = r.timestamp || new Date().toLocaleString('pt-BR');
        document.getElementById('rc_id').textContent = r.reference || r.id || '—';
        document.getElementById('rc_verif').textContent = r.checksum || r.signature || '—';
        document.getElementById('receiptModal').setAttribute('aria-hidden','false');
      }
      form.reset();
    }catch(err){
      showAlert('error', err.message || 'Falha na transferência.');
    }finally{
      btn.disabled = false; btn.textContent = 'Transferir';
    }
  });

  // Fechar modal com ESC
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false'){
      closeModal();
    }
  });
})();
