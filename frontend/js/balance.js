
// balance.js — anima o saldo e atualiza de tempos em tempos
(function(){
  const token = localStorage.getItem('token') || '';
  if(!token) return;

  const el = document.querySelector('.widget h4 + p'); // parágrafo do saldo
  if(!el) return;

  let current = 0;

  function animateTo(target){
    const start = current;
    const diff = target - start;
    const steps = 30;
    let i = 0;
    function step(){
      i++;
      const val = start + diff * (i/steps);
      el.textContent = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(val);
      if(i<steps) requestAnimationFrame(step);
      else current = target;
    }
    step();
  }

  async function refresh(){
    try{
      const res = await fetch('/api/balance', { headers: { 'Authorization':'Bearer '+token }});
      const data = await res.json().catch(()=>({balance:0}));
      const target = Number(data.balance||0);
      animateTo(target);
    }catch(e){ /* ignore */ }
  }

  // inicial e a cada 20s
  refresh();
  setInterval(refresh, 20000);
})();
