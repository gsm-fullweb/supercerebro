# Demo para Antônio — Smartcompany / A4 SmartSites

> Criado em 2026-06-03. Objetivo: orientar apresentação comercial e técnica do MVP para Antônio.

## Mensagem central

Antônio, hoje seu site está bonito e no ar, mas qualquer alteração depende de alguém mexer no código/GitHub. Nossa proposta é transformar esse site em um site inteligente: você pede alterações por painel, WhatsApp ou áudio, e o sistema registra, executa ou pede aprovação, com histórico/auditoria.

## O que mostrar

### 1. Site atual

- URL: https://smartcompany.a4ia.com.br/
- Mostrar que o site existe e já é o piloto.
- Explicar o problema atual: conteúdo hardcoded no frontend React/Vite/GitHub, sem banco de dados/CMS.

### 2. Dor que vamos resolver

Exemplos para Antônio:

- “Quero trocar o WhatsApp do rodapé.”
- “Quero publicar um novo artigo.”
- “Quero alterar texto da página Quem Somos.”
- “Quero mandar isso por áudio no WhatsApp.”

Hoje isso exige técnico. No novo modelo, vira solicitação simples.

### 3. MVP técnico já funcionando

- Backend A4 SmartSites criado em `/root/.openclaw/workspace/a4-smartsites-backend`.
- Banco Supabase staging com tabelas de sites, posts, contatos, `change_requests` e `audit_logs`.
- Admin-chat local em `http://127.0.0.1:4050/admin`.
- JWT server-side já implementado no admin.
- Fluxo testado: pedido → interpretação → `change_request` → execução segura → `audit_logs`.

### 4. Demonstração ideal

Roteiro:

1. Abrir o site atual.
2. Mostrar uma informação do site que poderia ser alterada, por exemplo contato/WhatsApp.
3. Abrir o admin-chat MVP.
4. Digitar: “Troque o WhatsApp do rodapé para 11 99999-9999”.
5. Mostrar que o sistema cria histórico/solicitação.
6. Explicar que em produção isso virá do WhatsApp/ChatHook e poderá aceitar áudio.
7. Mostrar o conceito do Kanban ChatHook:
   - Solicitações do Site
   - Pendente
   - Executado
   - Precisa aprovação
   - Aprovado

### 5. O que NÃO prometer como pronto ainda

- Site atual ainda não está consumindo conteúdo do banco.
- Admin ainda é MVP local/staging, não portal final público.
- Integração ChatHook → SmartSites ainda precisa ser conectada.
- Aprovação por mover card no Kanban ainda precisa ser implementada.

## Oferta sugerida

“Vamos migrar seu site para uma versão inteligente, onde você mantém o design e passa a atualizar conteúdo pelo WhatsApp, inclusive por áudio. Nós cuidamos da tecnologia, hospedagem, segurança, histórico de alterações e publicação.”

## Proposta de escopo piloto

### Fase 1 — Migração inteligente

- Migrar conteúdo do site atual para banco gerenciável.
- Criar painel/admin-chat básico.
- Permitir alteração de contatos/textos/posts.

### Fase 2 — WhatsApp/ChatHook

- Conectar WhatsApp do cliente via ChatHook.
- Receber texto e áudio transcrito.
- Criar solicitações automaticamente.

### Fase 3 — Aprovação e automação

- Kanban de solicitações.
- Aprovação/rejeição.
- Logs e histórico.
- Publicação controlada.

## Frase de fechamento

“Antônio, a diferença é que você deixa de depender de abrir chamado técnico para cada alteração simples. Seu site passa a ser atualizado como uma conversa.”
