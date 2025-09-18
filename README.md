# Kanarô — Assinatura de Termo de Consentimento

Front-end estático para **assinatura digital** de termo de responsabilidade/consentimento para cerimônias.  
Usa **HTML + Tailwind CSS + JavaScript** (sem ANON KEY exposta). Integra-se a **Supabase Edge Functions** para listar datas, checar CPF/participação e registrar a assinatura (PNG base64).

> **Demo (GitHub Pages):** [https://luckylee89.github.io/kanaro/](https://luckylee89.github.io/kanaro/)  
> **Repositório:** [https://github.com/LuckyLee89/kanaro](https://github.com/LuckyLee89/kanaro)

---

## ✨ Funcionalidades

- Consulta de **datas ativas** da cerimônia (listar vagas e local).
- Validação de **CPF + data** para pré-preenchimento ou aviso de “já assinou”.
- Formulário completo (dados pessoais, saúde, contato de emergência).
- **Assinatura digital**: desenhar no canvas _ou_ gerar pela digitação do nome.
- Envio do termo para a Edge Function (**sem expor chaves no cliente**).
- Telas dedicadas de **sucesso** e **termo já assinado**.

---

## 🗂 Estrutura de pastas

```
kanaro/
├─ docs/                     # origem do GitHub Pages
│  ├─ index.html             # início (CPF + escolha de data)
│  ├─ assets/
│  │  ├─ css/                # (se usar CSS próprio)
│  │  └─ js/
│  │     └─ script.js        # lógica do formulário e assinatura
│  └─ pages/
│     ├─ termo.html          # formulário + assinatura
│     ├─ sucesso.html        # pós-envio ok
│     └─ ja-assinou.html     # caso já exista assinatura nesse CPF/data
├─ README.md                 # este arquivo
```

> No GitHub Pages, em **Settings → Pages**, selecione “Deploy from a branch” e a pasta **`/docs`**.

---

## ▶️ Como rodar local

1. Clone o repositório e abra o `docs/index.html` no navegador.  
   Dica: use um servidor local para evitar bloqueios de CORS de `file://`:

   ```bash
   cd docs
   python -m http.server 5173
   # abra http://localhost:5173
   ```

2. Ajuste as constantes de URLs das funções no `index.html` e `docs/assets/js/script.js`.

3. Teste o fluxo:
   - `/` → informe **CPF** + **data** → continuar.
   - `/pages/termo.html` → preencha, assine e envie.
   - Redireciona para `/pages/sucesso.html` se OK.

---

## 🔐 Notas de segurança

- Sem ANON KEY no front; tudo via **Edge Functions**.
- PNG da assinatura tem **fundo branco** para evitar transparência.
- `sessionStorage` usado para **prefill** com expiração de 30 min.
- Inputs mascarados (CPF, RG, telefones) com **IMask**.
- HTTPS obrigatório (Pages já fornece).

---

## 📜 Licença

**MIT License**.

---
