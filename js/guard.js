
(function(){
  const token = localStorage.getItem('token');
  if(!token){
    window.location.href = 'login.html';
    return;
  }
  const userName = localStorage.getItem('userName') || 'Usuário';
  const el = document.getElementById('userName');
  if(el) el.textContent = userName;
})();
