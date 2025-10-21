
// Particles background (soft)
(function(){
  const c = document.getElementById('bgParticles');
  if(!c) return;
  const ctx = c.getContext('2d');
  let w, h, particles = [];
  const R = () => Math.random();

  function resize(){
    w = c.width = window.innerWidth;
    h = c.height = window.innerHeight;
    const count = Math.min(120, Math.floor(w*h/15000));
    particles = Array.from({length: count}, ()=> ({
      x:R()*w, y:R()*h, vx:(R()-.5)*0.25, vy:(R()-.5)*0.25,
      r: 1 + R()*2, a: .12 + R()*.28
    }));
  }
  window.addEventListener('resize', resize); resize();

  function step(){
    ctx.clearRect(0,0,w,h);
    for(const p of particles){
      p.x += p.vx; p.y += p.vy;
      if(p.x<0||p.x>w) p.vx*=-1;
      if(p.y<0||p.y>h) p.vy*=-1;
      const grd = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*7);
      grd.addColorStop(0, `rgba(200,16,46,${p.a})`);
      grd.addColorStop(1, 'rgba(200,16,46,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r*2,0,Math.PI*2); ctx.fill();
    }
    requestAnimationFrame(step);
  }
  step();
})();

// Subtle ripple on buttons
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('.btn');
  if(!btn) return;
  const ripple = document.createElement('span');
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.className = 'ripple';
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
  ripple.style.top  = (e.clientY - rect.top  - size/2) + 'px';
  btn.appendChild(ripple);
  setTimeout(()=> ripple.remove(), 600);
});
