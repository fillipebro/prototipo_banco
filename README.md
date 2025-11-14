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

👨‍💻 **Desenvolvido por:** Fillipe de Oliveira Ribeiro - 12524114105, Rafael Henrique Teixeira 
RA: 12524146476, Nycolas Machado Amaral
RA: 12525189402, Ernesto C. O. De Miranda 
RA: 12524129426, Felipe Diego hespanhol Cea 
RA: 12524245980, Flávio Matheus Durão Romero 
RA: 12522169557, Felipe juan Sampaio da Silva RA: 12522211155 ** 

📚 **Disciplina:** Sistemas distribuidos e mobile
🏦 **Tema:** Prevenção de Golpes Financeiros — Desafio Bradesco


