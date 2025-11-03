document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const cadastroForm = document.getElementById("cadastroForm");

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const user = document.getElementById("username").value;
      const pass = document.getElementById("password").value;
      if (user && pass) {
        alert("Login realizado com sucesso!");
        window.location.href = "dashboard.html";
      } else {
        alert("Preencha todos os campos!");
      }
    });
  }

  if (cadastroForm) {
    cadastroForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const nome = document.getElementById("nome").value;
      const email = document.getElementById("email").value;
      const senha = document.getElementById("senha").value;
      const confirmar = document.getElementById("confirmarSenha").value;

      if (senha !== confirmar) {
        alert("As senhas não coincidem!");
        return;
      }
      if (nome && email && senha) {
        alert("Cadastro realizado com sucesso!");
        window.location.href = "login.html";
      } else {
        alert("Preencha todos os campos!");
      }
    });
  }
});

function logout() {
  alert("Logout realizado!");
  window.location.href = "index.html";
}