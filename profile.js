
// profile.js — atualização de nome e foto do usuário
(function(){
  const token = localStorage.getItem('token') || '';
  if(!token) return;

  const nameInput = document.getElementById('pf_name');
  const photoInput = document.getElementById('pf_photo');
  const preview = document.getElementById('pf_preview');
  const info = document.getElementById('pf_info');
  const form = document.getElementById('profileForm');

  async function dataURLFromFile(file){
    return new Promise((resolve,reject)=>{
      const r = new FileReader();
      r.onload = ()=> resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  async function loadProfile(){
    const res = await fetch('/api/profile', { headers: { 'Authorization':'Bearer '+token }});
    const data = await res.json().catch(()=>({}));
    if(data.name) nameInput.value = data.name;
    if(data.hasPhoto){
      preview.src = '/api/profile/photo';
      preview.style.display = 'block';
      info.textContent = 'Sua foto está salva.';
    }
  }

  if(photoInput){
    photoInput.addEventListener('change', async (e)=>{
      const file = photoInput.files && photoInput.files[0];
      if(!file) return;
      const ok = /image\/(png|jpeg)/.test(file.type);
      if(!ok){ info.textContent='Formato não suportado.'; return; }
      const url = await dataURLFromFile(file);
      preview.src = url; preview.style.display = 'block';
      info.textContent = 'Prévia — clique em Salvar para aplicar.';
      preview.dataset.pending = url;
    });
  }

  if(form){
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const name = (nameInput.value||'').trim();
      const photoDataUrl = preview.dataset.pending || null;
      await fetch('/api/profile', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+token },
        body: JSON.stringify({ name, photoDataUrl })
      });
      delete preview.dataset.pending;
      info.textContent = 'Dados atualizados.';
    });
  }

  loadProfile();
})();
