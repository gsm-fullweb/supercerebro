# Plano: A4 SmartSites — SaaS de sites inteligentes com WhatsApp/voz

> Criado em 2026-06-03. Status: planejamento.

## Objetivo

Criar um SaaS para migrar clientes de WordPress para sites inteligentes gerenciados por painel, WhatsApp e áudio, usando Smartcompany como piloto. O produto deve permitir que clientes atualizem textos, contatos, posts e páginas com linguagem natural, mantendo aprovação/auditoria para mudanças sensíveis.

## Posicionamento

“Seu site sem dor de cabeça: rápido, bonito, hospedado e atualizado por WhatsApp — inclusive por voz.”

## Arquitetura recomendada

- Frontend dos sites: React/Vite/Next, hospedado em Vercel ou infraestrutura própria.
- CMS/banco: Supabase multi-tenant.
- Admin-chat: painel web para chat, histórico e aprovações.
- ChatHook: camada principal de atendimento/CRM e inbox WhatsApp para clientes SmartSites, reaproveitando contatos, conversas, histórico, agentes, permissões, funis e automações já existentes.
- WhatsApp: entrada principal do cliente via ChatHook.
- n8n: orquestrador opcional de eventos do ChatHook/webhook, roteamento, enriquecimento e respostas; não precisa transcrever áudio se o ChatHook já entregar texto da mensagem de voz.
- Voz no WhatsApp: ChatHook recebe áudio e já transforma voz em texto na conversa; esse texto é enviado ao backend `/agent/commands`, direto ou via n8n, para interpretar e criar `change_request`.
- IA/interpretação: heurística para ações comuns + LLM fallback para linguagem livre.
- Executor: aplica somente ações seguras automaticamente; ações sensíveis exigem aprovação.
- Auditoria: toda solicitação vira `change_request` + `audit_logs`.
- Bolt: acelerador de UI/protótipos e possível base/fork para um “construtor visual assistido”, não como executor crítico de produção.

## Sucesso = critérios verificáveis

- [ ] Smartcompany migrada para conteúdo vindo do Supabase, não hardcoded.
- [ ] Cliente consegue alterar WhatsApp/telefone do site por mensagem.
- [ ] Cliente consegue criar rascunho de post por texto.
- [ ] Cliente consegue mandar áudio no WhatsApp; ChatHook transforma em texto e gera `change_request`.
- [ ] Painel operador mostra pendências, aprova/rejeita e grava `approved_by`/`approved_at`.
- [ ] Toda ação gera `audit_logs` rastreáveis.
- [ ] Nenhuma chave `SERVICE_ROLE_KEY` exposta no browser.

## Tarefas

### Fase 1: Segurança e auditoria do MVP

- [x] **T1.1** — Validar JWT server-side no admin.
  - Verificação: `/api/requests` sem token = 401; token inválido = 401.
  - Depende de: nenhuma.

- [ ] **T1.2** — Adicionar `approved_by` e `approved_at` no fluxo do operador.
  - Verificação: aprovar pendência registra operador e timestamp no banco.
  - Depende de: T1.1.

- [ ] **T1.3** — Proteger painel operador com autenticação.
  - Verificação: painel não lista pendências sem JWT válido.
  - Depende de: T1.1.

### Fase 2: Produto migrável do WordPress

- [ ] **T2.1** — Mapear conteúdo atual da Smartcompany para modelo Supabase.
  - Verificação: lista de páginas, seções, posts, contatos e assets pronta.
  - Depende de: nenhuma.

- [ ] **T2.2** — Alterar frontend Smartcompany para consumir rotas públicas do backend.
  - Verificação: site renderiza home/posts/contatos a partir do Supabase.
  - Depende de: T2.1.

- [ ] **T2.3** — Criar importador básico WordPress → Supabase.
  - Verificação: importar posts/páginas via export XML ou API REST do WordPress.
  - Depende de: T2.1.

### Fase 3: WhatsApp e voz

- [ ] **T3.0** — Definir integração ChatHook → SmartSites.
  - Verificação: evento/mensagem do ChatHook identificado, webhook funcionando e mapeamento `contact/conversation/account → site_slug` definido.
  - Depende de: staging ChatHook funcional.

- [ ] **T3.1** — Criar workflow n8n: WhatsApp texto via ChatHook → backend `/agent/commands`.
  - Verificação: mensagem real cria `change_request`.
  - Depende de: T3.0.

- [ ] **T3.2** — Usar transcrição de voz já gerada pelo ChatHook → backend.
  - Verificação: áudio “troque o telefone...” aparece como texto na conversa e cria a mesma ação que texto.
  - Depende de: T3.1.

- [ ] **T3.3** — Responder no WhatsApp com confirmação/status.
  - Verificação: cliente recebe “feito”, “precisa aprovação” ou “não entendi”.
  - Depende de: T3.1/T3.2.


### Fase 3.5: Reaproveitar automações do Kanban ChatHook

- [ ] **T3.5.1** — Criar automação/flow no ChatHook que chame SmartSites quando mensagem/comando chegar.
  - Verificação: node `httpRequest` ou webhook chama `/agent/commands` com `accountId`, `conversationId`, `contact`, `message_text` e `site_slug`.
  - Depende de: T3.0.

- [ ] **T3.5.2** — Criar stage/funil “Site / Solicitações” para organizar pedidos de alteração de site.
  - Verificação: comando de site cria/move card no Kanban e vincula ao `change_request_id`.
  - Depende de: T3.5.1.

- [ ] **T3.5.3** — Configurar webhook de `card.moved` para aprovar/rejeitar mudanças pelo movimento do card.
  - Verificação: mover card para “Aprovado” chama endpoint de aprovação no SmartSites e grava auditoria.
  - Depende de: T1.2 e T3.5.2.

### Fase 4: Bolt como acelerador

- [ ] **T4.1** — Usar Bolt para gerar UI v1 do admin-chat e painel operador.
  - Verificação: exportar código React funcional sem chaves sensíveis.
  - Depende de: endpoints definidos.

- [ ] **T4.2** — Revisar e integrar código gerado pelo Bolt no repo real.
  - Verificação: build passa e chamadas usam apenas endpoints seguros.
  - Depende de: T4.1.

- [ ] **T4.3** — Avaliar fork Bolt/Bolt DIY como “construtor visual assistido” futuro.
  - Verificação: decisão documentada: usar, adaptar ou descartar.
  - Depende de: MVP validado com clientes.

## Riscos

- Escopo grande demais: mitigação — vender primeiro atualização por WhatsApp/voz, não “construtor infinito”.
- Segurança: mitigação — service role só server-side, JWT obrigatório, logs completos.
- IA alterar coisa errada: mitigação — whitelist de ações seguras + aprovação para sensíveis.
- Bolt virar distração: mitigação — usar primeiro para UI, não para core.
- WordPress import complexo: mitigação — começar por posts/páginas/contatos, não tentar migrar plugin/theme completo.

## Estado atual

- Backend inicial criado.
- Supabase staging com tabelas MVP.
- Fluxo change_request/audit_logs testado.
- Admin-chat local criado.
- JWT server-side no admin implementado.
- Kanban ChatHook verificado em staging: existe `Stage.automations`, `ChatbotFlow`, `FlowExecution`, `SequenceExecution`, `WebhookConfig`, automações `newTicket`, `autoMessage`, `transferTo`, `sequenceId`, webhooks `card.*` e node `httpRequest`.
- Próxima ação recomendada: T1.2 + T1.3, depois integração ChatHook Kanban/flow → SmartSites.
