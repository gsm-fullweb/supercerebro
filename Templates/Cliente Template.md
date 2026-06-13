---
tags:
  - cliente
status: ativo # ativo | inativo | prospecção
empresa: 
inicio: YYYY-MM-DD
contato: 
email: 
whatsapp: 
updated_at: {{date}}
---

# Cliente: {{title}}

## 📌 Contexto Geral
*Breve resumo sobre a empresa do cliente, o nicho de atuação e as principais dores/desafios.*

---

## 💼 Serviços Contratados
- [ ] **SEO Programático** (Frequência: )
- [ ] **Tráfego Pago** (Canais: )
- [ ] **Social Media** (Frequência: )
- [ ] **Hospedagem & Manutenção**
- [ ] **Automações / ZapCode**

---

## 🔗 Links e Recursos Úteis
- **Site Oficial:** 
- **Google Drive / Pastas:** 
- **Google Search Console:** 
- **Google Analytics (GA4):** 
- **Contas de Ads (Google/Meta):** 

---

## 📂 Projetos Ativos
```dataview
TABLE status, prioridade, prazo
FROM #projeto
WHERE cliente = this.file.name AND status != "concluido"
SORT prioridade DESC
```

---

## 📝 Notas Operacionais
*Informações de funcionamento específicas do cliente, logins não confidenciais ou regras de negócio.*

---

## 📅 Histórico de Reuniões
```dataview
TABLE data, participantes
FROM #reuniao
WHERE cliente = this.file.name
SORT data DESC
```
