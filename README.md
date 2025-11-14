# 💳 Bradesco Digital — Simulador de Banco Seguro

Este repositório contém o desenvolvimento de um **banco digital simulado**, inspirado no **Desafio Bradesco** e com foco em **segurança, autenticação forte e educação contra golpes financeiros**.

A aplicação foi pensada como um ambiente controlado, onde é possível:

- Cadastrar clientes;
- Aprovar ou reprovar cadastros como **administrador**;
- Acessar um **dashboard bancário** com conta individual;
- Realizar transferências via **PIX simulado** entre contas;
- Acompanhar **extrato de movimentações**;
- Gerenciar clientes pelo painel administrativo (inclusive **excluir contas** para não acumular dados).

---

## 🏗 Arquitetura da Solução

A solução foi organizada em três camadas principais:

- **Frontend (Web)**  
  - Páginas HTML simulando o internet banking do Bradesco.  
  - CSS próprio, com identidade visual de banco.  
  - JavaScript vanilla para chamadas à API e controle de sessão.

- **API Backend (Node.js + Express)**  
  - Responsável por regras de negócio, autenticação e integração com o banco de dados.  
  - Implementa todo o fluxo de cadastro, login, aprovação, PIX, extrato e administração.

- **Banco de Dados (MySQL)**  
  - Armazena usuários, contas, chaves PIX e transferências.  
  - Comunicação feita via pool de conexões.

- **Infraestrutura (Docker + Nginx)**  
  - Contêiner para o **MySQL**.  
  - Contêiner para a **API Node.js**.  
  - Contêiner para o **Nginx**, servindo o frontend e fazendo proxy reverso para a API.  

---

## ⚙️ Tecnologias Utilizadas

**Backend / API**
- Node.js + Express
- JWT (JSON Web Token) para autenticação
- Bcrypt para hash de senhas
- Nodemailer para envio de e-mail (2FA do administrador via Gmail SMTP)
- MySQL com pool de conexões
- Transações SQL para operações de PIX (débito/crédito com segurança)

**Frontend**
- HTML5
- CSS3 (layout responsivo, cards, aparência de banco)
- JavaScript (fetch API, manipulação de DOM, localStorage para token de sessão)
- Canvas com animação (`anim.js`) para o fundo

**Infra**
- Docker e Docker Compose
- Nginx (servidor web + proxy reverso)
- Arquivo `.env` para configuração de segredos e credenciais

---

## 🔐 Segurança Implementada

A aplicação foi construída com foco em **boas práticas básicas de segurança**:

- **Hash de senhas** com `bcrypt` (nenhuma senha é armazenada em texto puro).  
- **Autenticação com JWT**:
  - Cliente: token com `role = "user"`.
  - Administrador: token com `role = "admin"`.
  - Rotas protegidas com middlewares `authUser` e `authAdmin`.

- **Fluxo de 2FA para Administrador**:
  - O administrador informa **e-mail + CPF**.
  - A API valida se corresponde ao admin configurado no `.env`.
  - É gerado um código de **6 dígitos**, enviado por e-mail via Gmail (Nodemailer).
  - O código é salvo em memória com **tempo de expiração**, e então validado.
  - Após validação, o admin recebe um **JWT de sessão**.

- **Controle de status do cliente**:
  - `pending` → cadastro aguardando aprovação do admin.  
  - `active` → cliente aprovado, pode logar e movimentar conta.  
  - `rejected` → cadastro reprovado (o cliente pode tentar se cadastrar novamente).  

- **Transações PIX consistentes**:
  - Uso de transações (`BEGIN`, `COMMIT`, `ROLLBACK`) no MySQL.
  - `SELECT ... FOR UPDATE` para bloquear o saldo da conta de origem durante a operação.
  - Registro de transferências na tabela de `transfers`.

---

## 💼 Funcionalidades do Sistema

### 👤 Cadastro de Cliente

- O usuário informa **nome, e-mail, CPF e senha**.
- A API:
  - Normaliza e valida os dados;
  - Verifica se já existe usuário com aquele **CPF ou e-mail**;
  - Cria um registro em `users` com:
    - `role = "user"`
    - `status = "pending"` (aguardando aprovação)
  - Cria automaticamente uma conta em `accounts` associada ao usuário.

- Se o usuário já existia e estava com status **rejected**, o sistema:
  - Permite recadastrar e reenviar para análise (**reuso de cadastro reprovado**).

---

### 🧑‍💼 Painel do Administrador

Após login com 2FA, o admin tem acesso a:

1. **Lista de cadastros pendentes**  
   - Nome, CPF, e-mail, data de cadastro.  
   - Botões:
     - **Aprovar** → muda status para `active`.  
     - **Rejeitar** → muda status para `rejected`.

2. **Lista de todos os clientes**  
   - Exibe todos os usuários com `role = "user"`, com:
     - Nome, CPF, e-mail, status (pendente/ativo/reprovado) e data de cadastro.
   - Botão **Excluir**:
     - Remove o usuário;
     - Remove as contas associadas;
     - Remove chaves PIX;
     - Remove transferências vinculadas às contas daquele cliente.
   - Isso evita “poluir” o banco com muitos cadastros de testes.

3. **Validação de sessão admin**  
   - A tela do admin chama `/api/admin/validate-token` ao carregar.
   - Caso o token seja inválido ou expirado, o admin é redirecionado para login.

---

### 🏦 Dashboard do Cliente

Após ser **aprovado** e realizar login, o cliente acessa o `dashboard.html`, que exibe:

- **Resumo da Conta**:
  - Nome do cliente;
  - Agência;
  - Número da conta;
  - Saldo atual.

- **Gestão de Chaves PIX**:
  - Cadastro de chave do tipo:
    - CPF
    - E-mail
    - Telefone
    - Aleatória (gerada automaticamente pelo sistema)
  - Listagem das chaves cadastradas com data de criação.

- **Envio de PIX**:
  - Cliente informa:
    - Chave de destino (correspondente a outra conta cadastrada);
    - Valor;
    - Descrição opcional.
  - A API:
    - Valida saldo;
    - Localiza conta de destino via tabela `pix_keys`;
    - Atualiza saldo da conta de origem e da conta destino;
    - Registra a movimentação em `transfers`.

- **Extrato**:
  - Tabela com registros de entrada e saída:
    - Data e hora;
    - Tipo: enviado ou recebido;
    - Valor;
    - Descrição.

- **Logout**:
  - Botão para encerrar sessão, removendo o token armazenado no navegador.

---

## 🌐 Fluxo Geral de Uso

1. **Admin** sobe a aplicação (ex: com Docker).  
2. **Cliente** acessa a página de cadastro, preenche dados e envia.  
3. Cadastro fica com status **pending**.  
4. **Admin** acessa o painel:
   - Visualiza pendentes, aprova ou rejeita.
5. Cliente aprovado:
   - Faz login;
   - Acessa o dashboard;
   - Cadastra chaves PIX;
   - Faz transferências e vê o extrato.
6. **Admin** pode:
   - Rejeitar novos cadastros;
   - Excluir clientes antigos de teste para limpar o banco.

---

## 🧱 Estrutura (resumida)

Alguns arquivos importantes do projeto:

- `server.js` → API Node.js (rotas de cadastro, login, PIX, extrato, admin, 2FA, exclusão de usuários).
- `db.js` → configuração de conexão com MySQL (pool).
- `schema.mysql.sql` → criação das tabelas (`users`, `accounts`, `pix_keys`, `transfers`, etc.).
- `docker-compose.yml` → orquestração dos contêineres (MySQL, API, Nginx).
- `nginx.conf` → configura o servidor Nginx e o proxy para a API.
- `admin.html`, `admin.js` → painel do administrador (pendentes, todos os clientes, aprovar, reprovar, excluir).
- `dashboard.html`, `dashboard.pix.js` → dashboard do cliente (conta, saldo, PIX, extrato).
- `login.html`, `cadastro.html`, `index.html` → telas principais do frontend.
- `anim.js` → animações de fundo em canvas para a experiência visual.

---

👨‍💻 **Desenvolvido por: Fillipe de Oliveira Ribeiro - 12524114105, Rafael Henrique Teixeira 
RA: 12524146476, Nycolas Machado Amaral
RA: 12525189402, Ernesto C. O. De Miranda 
RA: 12524129426, Felipe Diego hespanhol Cea 
RA: 12524245980, Flávio Matheus Durão Romero 
RA: 12522169557, Felipe juan Sampaio da Silva RA: 12522211155** 

📚 **Disciplina:** Sistemas distribuidos e mobile
🏦 **Tema:** Prevenção de Golpes Financeiros — Desafio Bradesco






