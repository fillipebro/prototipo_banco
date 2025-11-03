const LS_USERS = 'bradesco_users_v1';
const LS_CURRENT = 'bradesco_current_user_v1';

function getUsers(){
  const raw = localStorage.getItem(LS_USERS);
  return raw ? JSON.parse(raw) : [];
}
function saveUsers(users){ localStorage.setItem(LS_USERS, JSON.stringify(users)); }

function registerUser({name, email, password}){
  const users = getUsers();
  if(users.find(u => u.email === email)) throw new Error('E-mail já cadastrado');
  const user = {id: Date.now(), name, email, password, createdAt: new Date().toISOString(), balance: 5250.00};
  users.push(user);
  saveUsers(users);
  return user;
}

function loginUser({email, password}){
  const users = getUsers();
  const u = users.find(x => x.email === email && x.password === password);
  if(!u) throw new Error('Credenciais inválidas');
  localStorage.setItem(LS_CURRENT, JSON.stringify(u));
  return u;
}

function currentUser(){
  const raw = localStorage.getItem(LS_CURRENT);
  return raw ? JSON.parse(raw) : null;
}

function logout(){
  localStorage.removeItem(LS_CURRENT);
  window.location.href = 'index.html';
}

// attach form handlers if present
document.addEventListener('DOMContentLoaded', ()=>{
  const loginForm = document.getElementById('loginForm');
  const cadastroForm = document.getElementById('cadastroForm');

  if(loginForm){
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();
      try {
        loginUser({email, password});
        window.location.href = 'dashboard.html';
      } catch (err) {
        alert(err.message);
      }
    });
  }

  if(cadastroForm){
    cadastroForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('nome').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('senha').value.trim();
      const confirm = document.getElementById('confirmarSenha').value.trim();
      if(password !== confirm){ alert('As senhas não coincidem'); return; }
      try {
        registerUser({name, email, password});
        alert('Conta criada com sucesso! Faça login.');
        window.location.href = 'login.html';
      } catch (err) {
        alert(err.message);
      }
    });
  }
});
