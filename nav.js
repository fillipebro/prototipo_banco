// nav.js — menu superior com botões card, scroll suave e logout
(function(){
  const topNav = document.getElementById('topNav');
  const logoutTop = document.getElementById('logoutTop');

  if(logoutTop){
    logoutTop.addEventListener('click', ()=>{
      localStorage.removeItem('token');
      localStorage.removeItem('userName');
      window.location.href = 'login.html';
    });
  }

  function smoothScrollTo(sel){
    const el = document.querySelector(sel);
    if(!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 10;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  function setActive(targetSel){
    const links = document.querySelectorAll('.topbar .tab-btn');
    links.forEach(a => a.classList.remove('active'));
    const current = document.querySelector(`.topbar .tab-btn[data-target="${targetSel}"]`) || document.querySelector(`.topbar .tab-btn[href="${targetSel}"]`);
    if(current) current.classList.add('active');
  }

  if(topNav){
    topNav.addEventListener('click', (e)=>{
      const a = e.target.closest('.tab-btn[href^="#"]');
      if(!a) return;
      e.preventDefault();
      const sel = a.getAttribute('data-target') || a.getAttribute('href');
      if(sel) { smoothScrollTo(sel); setActive(sel); }
    });
  }

  // observar rolagem para ativar tab correspondente
  const sections = ['#homeSection', '#transferSection', '#historySection'];
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry => {
      if(entry.isIntersecting){
        const idSel = '#' + entry.target.id;
        setActive(idSel);
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px', threshold: [0, 1.0] });
  sections.forEach(sel => {
    const el = document.querySelector(sel);
    if(el) io.observe(el);
  });

  // estado inicial
  setActive('#homeSection');
})();