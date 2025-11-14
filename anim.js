
// anim.js — animação sutil + opacidade respirando
(function(){
  const el = document.querySelector('.logo');
  if(!el) return;

  let t = 0;
  function animate(){
    t += 0.008; // bem suave
    const y = Math.sin(t) * 2; // deslocamento pequeno
    const op = 0.92 + Math.sin(t) * 0.04; // respiração de opacidade 0.92–0.96

    el.style.transform = `translateY(${y}px)`;
    el.style.opacity = op.toFixed(2);

    requestAnimationFrame(animate);
  }
  animate();
})();
