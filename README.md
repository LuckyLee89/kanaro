# Kanarô — Assinatura Digital de Termo de Consentimento

Sistema web para gerenciamento e assinatura digital de termos de responsabilidade em cerimônias.  
Permite consulta por CPF, escolha de data da cerimônia, preenchimento de dados pessoais, contato de emergência e assinatura digital (desenho ou nome tipografado).

## 🚀 Demonstração
🔗 [Acesse aqui](https://luckylee89.github.io/kanaro/)

## ⚙️ Tecnologias
- **HTML5** + **TailwindCSS** (via CDN)
- **JavaScript (ES6)**
- **IMask.js** para máscaras de CPF, RG e telefone
- **Canvas API** para assinatura digital
- **Supabase Edge Functions** para validação e envio dos dados

## 📌 Funcionalidades
- Consulta de participante pelo CPF
- Listagem dinâmica de cerimônias disponíveis
- Preenchimento automático de dados (quando já cadastrados ao menos uma vez)
- Assinatura digital (desenho ou tipografia)
- Armazenamento e envio seguro para Supabase

## ▶️ Como rodar localmente
1. Clone o repositório:
   ```bash
   git clone git@github.com:LuckyLee89/kanaro.git
   cd kanaro
   ```
2. Abra o arquivo `index.html` no navegador (ou use uma extensão de servidor local, como o Live Server do VSCode).

## 🔧 Configuração do Supabase (necessário para back-end)
Para que o sistema funcione além da interface visual, é preciso configurar um projeto no [Supabase](https://supabase.com/):

1. Crie um projeto no Supabase.
2. Configure as tabelas necessárias (ex.: `participantes`, `termos`).
3. Implemente e publique as **Edge Functions**:
   - `lookup_cpf` → busca participante por CPF
   - `list_cerimonias` → lista cerimônias ativas
   - `submit_termo` → recebe e armazena assinatura + dados
4. Configure as variáveis de ambiente no Supabase para envio de e-mails (SMTP ou Resend).
5. Atualize as URLs das funções no código (`script.js` e `index.html`).

> 💡 Sem essa configuração, o front-end funciona normalmente (formulários, máscaras, assinatura digital), mas o envio e o registro no banco de dados **não acontecem**.

## 📄 Licença
Este projeto está sob a licença MIT.  
Sinta-se livre para usar, modificar e distribuir.
