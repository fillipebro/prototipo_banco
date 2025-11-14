// transfer.js — formulário de transferência protegido (requer token)
(function(){
  const token = localStorage.getItem('token') || '';
  const userName = localStorage.getItem('userName') || 'Usuário';
  // Mostra nome (caso guard.js ainda não tenha feito)
  const nameEl = document.getElementById('userName');
  if(nameEl) nameEl.textContent = userName;

  // Se não houver token, deixe o guard.js redirecionar (já incluído na página)
  if(!token) return;

  // Gera fingerprint estável (persistido)
  function getDeviceFP(){
    try{
      const key = 'device_fp_v1';
      const cached = localStorage.getItem(key);
      if(cached) return cached;
      const parts = [
        navigator.userAgent, navigator.language, navigator.platform,
        screen.width+'x'+screen.height, Intl.DateTimeFormat().resolvedOptions().timeZone || 'tz?'
      ];
      // adiciona um UUID simples para estabilidade local
      const rnd = Math.random().toString(36).slice(2) + Date.now().toString(36);
      parts.push(rnd);
      const fp = parts.join('|');
      localStorage.setItem(key, fp);
      return fp;
    }catch(e){
      return 'nofp';
    }
  }

  const form = document.getElementById('transferForm');
  const alertBox = document.getElementById('transferAlert');
  const submitBtn = document.getElementById('transferSubmit');

  function showAlert(type, msg){
    alertBox.className = 'alert show ' + type;
    alertBox.textContent = msg;
  }

  async function doTransfer(e){
    e.preventDefault();
    alertBox.className = 'alert'; alertBox.textContent='';
    const amount = parseFloat(document.getElementById('amount').value.replace(',', '.'));
    const type = document.getElementById('type').value;
    const to_cpf = (document.getElementById('to_cpf').value || '').replace(/\D/g, '');

    if(!amount || amount <= 0){ showAlert('error','Informe um valor válido.'); return; }
    if(!['pix','ted'].includes(type)){ showAlert('error','Selecione PIX ou TED.'); return; }
    if(to_cpf && to_cpf.length !== 11){ showAlert('error','CPF do destinatário deve ter 11 dígitos.'); return; }

    submitBtn.disabled = true; submitBtn.textContent = 'Enviando...';
    try{
      const res = await fetch('/api/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
          'x-device-fp': getDeviceFP()
        },
        body: JSON.stringify({ amount, type, to_cpf })
      });
      const contentType = res.headers.get('content-type') || '';
      const payload = contentType.includes('application/json') ? await res.json().catch(()=> ({})) : await res.text();

      if(!res.ok){
        const msg = (payload && payload.message) ? payload.message : (typeof payload === 'string' ? payload : 'Erro na solicitação.');
        showAlert('error', msg);
        return;
      }
      showAlert('success', payload.message || 'Transferência enviada com sucesso.');
      window.dispatchEvent(new CustomEvent('transfer:done'));
    }catch(err){
      showAlert('error', err.message || 'Falha na transferência.');
    }finally{
      submitBtn.disabled = false; submitBtn.textContent = 'Transferir';
    }
  }

  if(form){
    form.addEventListener('submit', doTransfer);
  }
})();