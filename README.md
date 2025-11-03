# 💳 Projeto: App Seguro — Desafio Bradesco x Banco Central

Olá! 👋  
Este é o meu projeto desenvolvido para o **Desafio Bradesco**, inspirado nos **problemas de golpes financeiros** destacados pelo **Banco Central** (https://www.bcb.gov.br/meubc/faqs/s/golpes).  
O objetivo foi criar uma **solução prática e educativa** que mostre como a tecnologia pode **proteger o usuário contra fraudes digitais**.

---

## 🎯 Visão Geral

O aplicativo simula um **sistema bancário seguro**, focado em **prevenção de golpes** como *engenharia social*, *PIX noturno acima do limite*, *transações indevidas* e *falsos contatos*.  

O projeto inclui:

- **Backend em Java + Spring Boot**, com autenticação **JWT**, regras antifraude e banco **MySQL**.  
- **Frontend HTML/CSS/JS**, simulando telas reais de **login**, **cadastro** e **dashboard bancário**.  
- **Docker e Docker Compose** para rodar tudo facilmente em qualquer ambiente.  

---

## 🧩 Como o Sistema Funciona

### 1️⃣ Cadastro e Login
O usuário se cadastra informando **nome, CPF, e-mail e senha**.  
O backend valida e armazena os dados no MySQL.  
No login, o servidor gera um **token JWT**, usado para autenticar todas as próximas requisições.

### 2️⃣ Sessão e Segurança
As rotas sensíveis exigem o **token JWT** no cabeçalho `Authorization: Bearer <token>`.  
Sem esse token, o acesso é negado.  
Tudo é **stateless** — o servidor não guarda sessões em memória, apenas valida o token.

### 3️⃣ Regras Antifraude
Implementei uma lógica inspirada nas recomendações do **Banco Central**:  
- Durante a **janela noturna (19h–06h)**, qualquer **PIX/TED acima de R$ 2.000,00** é **bloqueado automaticamente**.  
- Cada transação gera um **código de verificação único (checksum)**, simulando o comprovante bancário.  
- O usuário pode manter uma **lista de contatos seguros**, reduzindo risco de golpe por erro ou engenharia social.

### 4️⃣ Frontend Integrado
As telas do frontend chamam os endpoints do backend via JavaScript (`fetch`):  
- `login.html` → `/api/auth/login`  
- `cadastro.html` → `/api/auth/register`  
- `dashboard.html` → `/api/transfers`, `/api/contacts`  

O frontend mostra notificações e bloqueios automáticos conforme o comportamento do backend.

---

## ⚙️ Tecnologias Utilizadas

**Backend**
- Java 17
- Spring Boot 3 (Web, Security, JPA, Validation)
- MySQL
- JWT (segurança)
- Maven

**Frontend**
- HTML5, CSS3, JavaScript
- Scripts modulares (`auth.js`, `api.js`, `dashboard.js`, etc.)

**DevOps**
- Docker e Docker Compose
- Configuração para Azure Cloud (opcional)
- Testes unitários configuráveis (JUnit)

---

## 🖥️ Como Rodar o Projeto (VS Code + Docker)

### Passo 1: Abrir no VS Code
- Abra a pasta `bradesco-projeto-seguro` no **Visual Studio Code**.  
- Certifique-se de que o **Docker Desktop** está em execução.  

### Passo 2: Subir os Containers
No terminal integrado do VS Code, execute:
```bash
docker compose up --build
```
Isso irá:
- Criar o container **MySQL** (`root/root`);
- Criar e iniciar o container **API Spring Boot** (`http://localhost:8080`).

Aguarde até ver no terminal:
```
Started SecureBankApplication
```
➡️ Significa que o backend está rodando!

### Passo 3: Rodar o Frontend
Abra o arquivo `frontend/index.html` no navegador (ou use a extensão **Live Server** no VS Code).  

Garanta que no topo dos HTMLs exista:
```html
<script>window.API_BASE = 'http://localhost:8080';</script>
<script src="js/api.js"></script>
```
Agora as telas se comunicam com o backend via REST.

### Passo 4: Testar
1. Cadastre um usuário.  
2. Faça login.  
3. Tente realizar um **PIX** acima de **R$ 2.000,00** durante o horário noturno.  
   - O sistema deve **bloquear a transação** e retornar uma mensagem de alerta antifraude.  

### Passo 5: Encerrar
Para parar tudo:
```bash
Ctrl + C
docker compose down
```

---

## 🧪 Teste Rápido (curl)
```bash
# cadastro
curl -s http://localhost:8080/api/auth/register -H 'Content-Type: application/json'  -d '{"name":"Alice","cpf":"12345678901","email":"alice@ex.com","password":"123456"}'

# login
TOKEN=$(curl -s http://localhost:8080/api/auth/login -H 'Content-Type: application/json'  -d '{"identifier":"alice@ex.com","by":"email","password":"123456"}' | jq -r .token)

# transferência noturna acima do limite
curl -s http://localhost:8080/api/transfers -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json'  -d '{"type":"pix","amount":"3000.00","toCpf":"11122233344"}'
```

---

## 💡 Considerações Finais

Este projeto demonstra:
- Conhecimento em **Java + Spring Boot**;
- Aplicação de **lógica de programação e segurança**;
- Criação de **APIs REST** integradas ao **frontend**;
- Uso de **Docker**, **banco de dados** e **boas práticas antifraude**;
- Estrutura pronta para **evoluir com microsserviços, mensageria e deploy em nuvem**.

> A ideia é mostrar que é possível proteger o usuário **com tecnologia e educação digital**, seguindo as recomendações do Banco Central e da própria Bradesco.

---

👨‍💻 **Desenvolvido por:** Fillipe de Oliveira Ribeiro - 12524114105
📚 **Disciplina:** Sistemas distribuidos e mobile
🏦 **Tema:** Prevenção de Golpes Financeiros — Desafio Bradesco

