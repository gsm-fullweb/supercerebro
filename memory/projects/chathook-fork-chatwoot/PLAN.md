# Plano: ChatHook Fork Real do Chatwoot

> Criado em 2026-06-02. Status: planejamento.

## Objetivo

Construir a nova versao do ChatHook como um fork real do Chatwoot, preservando o core de multiatendimento e embutindo os modulos CRM do ChatHook na experiencia principal. O produto deve parecer um CRM de WhatsApp nativo, nao um app externo acoplado.

## Sucesso =

- [ ] Base existente do ChatHook reaproveitada: backup local, staging funcional e repositorio privado `gsm-fullweb/chatrook_2026` validados antes de qualquer reimplementacao.
- [ ] Fork baseado na mesma linha da producao atual: `chatwoot/chatwoot:v4.11.1`.
- [ ] Core de multiatendimento preservado: inboxes, conversas, mensagens, atribuicao, equipes, contatos, permissoes, realtime e notas internas.
- [ ] Modulo CRM ChatHook embutido na interface do Chatwoot, com funis, cards, tarefas e follow-ups ligados a conversas/contatos.
- [ ] Ambiente staging na VPS `srv603856.hstgr.cloud` rodando o fork, separado da producao antiga.
- [ ] Usuario consegue acessar a experiencia ChatHook sem token manual na URL.
- [ ] Fluxo de primeiro uso (`/setup`) permite conectar WhatsApp e iniciar CRM sem suporte tecnico.

## Diretriz de produto

ChatHook = Chatwoot com alma de CRM comercial para WhatsApp.

Preservar do Chatwoot:

- Multiatendimento.
- Inboxes/caixas de entrada.
- Conversas em tempo real.
- Atribuicao por agentes e equipes.
- Contatos e historico de mensagens.
- Permissoes por conta/equipe.
- Notas internas.
- Labels.
- Webhooks/APIs.

Embutir como ChatHook:

- Funil comercial dentro da conversa.
- Etapas do negocio.
- Cards vinculados a contato/conversa.
- Tarefas, follow-ups e lembretes.
- Automacoes por etapa.
- Visao de vendedor e gestor.
- Campanhas/disparos controlados.
- Onboarding e setup self-service.

## Tarefas

### Fase 0: Consolidar o que ja existe

- [x] **T0.1** — Acessar e validar o repositorio privado `gsm-fullweb/chatrook_2026`.
  - Verificacao: clone/checkout autenticado disponivel localmente, branch principal identificada e historico preservado.
  - Resultado: clonado em `chatrook_2026` via SSH com chave `atlas_chathook_vps`; branch `main`; remoto `git@github.com:gsm-fullweb/chatrook_2026.git`.
  - Estimativa: 30min.
  - Depende de: acesso GitHub/PAT/conector autorizado.

- [x] **T0.2** — Comparar repositorio GitHub com backups recuperados da VPS.
  - Verificacao: matriz indica o que vem do repo, do backup `chathook-audit`, da stack `chathook-staging-stack` e do staging funcional.
  - Resultado: repo GitHub contem o arquivo `chathook-audit-2026-06-01.tar.gz` dividido em 6 partes base64; checksum `9536be2112c5d50be6ff333d70eea2129fccc9db8081aed32796e249cf1463a2`, igual ao tar local. O repo e backup tecnico da VPS, nao fonte original completo.
  - Estimativa: 1h.
  - Depende de: T0.1.

- [ ] **T0.3** — Definir base editavel da nova versao.
  - Verificacao: decisao registrada sobre qual fonte sera base do produto: repo GitHub, codigo reconstruido a partir do backup, ou combinacao.
  - Estimativa: 45min.
  - Depende de: T0.2.

### Fase 1: Base do fork

- [ ] **T1.1** — Criar repositorio/checkout base do Chatwoot v4.11.1 em ramo separado, sem substituir a base atual do ChatHook.
  - Verificacao: `git describe --tags` ou commit/tag equivalente confirmado; README interno registra versao base.
  - Estimativa: 1h.
  - Depende de: T0.3.

- [ ] **T1.2** — Mapear stack atual de producao do Chatwoot.
  - Verificacao: documento com imagem Docker, envs sem segredos, servicos, banco, Redis, storage e dominios.
  - Estimativa: 1h.
  - Depende de: nenhuma.

- [ ] **T1.3** — Subir Chatwoot fork limpo em staging separado para integracao, sem derrubar o staging externo atual.
  - Verificacao: URL staging responde login/health, Sidekiq sobe, banco migra, Redis conecta.
  - Estimativa: 2h.
  - Depende de: T1.1, T1.2.

### Fase 2: Preservar multiatendimento

- [ ] **T2.1** — Mapear modelos/tabelas core do multiatendimento.
  - Verificacao: documento lista `Account`, `Inbox`, `Conversation`, `Message`, `Contact`, `Team`, `User`, assignments, labels e permissoes.
  - Estimativa: 1h.
  - Depende de: T1.1.

- [ ] **T2.2** — Validar fluxo completo de atendimento no fork limpo.
  - Verificacao: criar inbox teste, receber/criar conversa, atribuir agente/equipe, enviar mensagem/nota e ver realtime funcionando.
  - Estimativa: 2h.
  - Depende de: T1.3.

- [ ] **T2.3** — Definir fronteira "nao mexer primeiro".
  - Verificacao: lista de arquivos/models/servicos core que so podem ser alterados com justificativa clara.
  - Estimativa: 45min.
  - Depende de: T2.1.

### Fase 3: Embutir camada CRM

- [ ] **T3.1** — Migrar/adaptar o modelo CRM ja existente do ChatHook para dentro do fork.
  - Verificacao: funis, etapas, cards, tarefas/follow-ups e relacoes com Chatwoot reaproveitam o schema e dados existentes sempre que fizer sentido.
  - Estimativa: 2h.
  - Depende de: T0.2, T2.1.

- [ ] **T3.2** — Escolher primeira superficie visual do CRM.
  - Verificacao: decisao registrada: painel lateral na conversa, aba CRM, kanban embutido ou combinacao.
  - Estimativa: 1h.
  - Depende de: T2.2.

- [ ] **T3.3** — Implementar primeiro corte: card CRM vinculado a conversa.
  - Verificacao: numa conversa, usuario cria/visualiza/move card de funil sem sair do Chatwoot.
  - Estimativa: 4h.
  - Depende de: T3.1, T3.2.

### Fase 4: Experiencia unica ChatHook

- [ ] **T4.1** — Trocar sinais de produto de Chatwoot para ChatHook.
  - Verificacao: branding, menu, textos principais e navegacao inicial refletem CRM de WhatsApp.
  - Estimativa: 2h.
  - Depende de: T1.3.

- [ ] **T4.2** — Criar dashboard inicial orientado a venda.
  - Verificacao: primeira tela mostra oportunidades, conversas pendentes, follow-ups e proximas acoes.
  - Estimativa: 4h.
  - Depende de: T3.3.

- [ ] **T4.3** — Eliminar dependencia de token manual.
  - Verificacao: usuario acessa ChatHook autenticado pela sessao normal do fork.
  - Estimativa: 2h.
  - Depende de: T1.3.

### Fase 5: Setup self-service

- [ ] **T5.1** — Desenhar `/setup` do ChatHook.
  - Verificacao: fluxo cobre empresa, WhatsApp, equipe, funil inicial e teste guiado.
  - Estimativa: 1h.
  - Depende de: T4.1.

- [ ] **T5.2** — Implementar setup minimo.
  - Verificacao: nova conta consegue iniciar sem suporte tecnico e chega a uma conversa/cartao teste.
  - Estimativa: 6h.
  - Depende de: T5.1, T3.3.

## Dependencias externas

- Acesso ao repositorio privado `https://github.com/gsm-fullweb/chatrook_2026`.
- Decisao de dominio staging para o fork Chatwoot embutido.
- Credenciais/variaveis para Chatwoot staging sem expor producao.
- Estrategia de WhatsApp: manter WAHA atual primeiro ou integrar provider nativo depois.

## Riscos

- Mexer no core do multiatendimento cedo demais.
  - Mitigacao: primeira camada CRM deve ser aditiva e isolada.

- Divergir demais do upstream Chatwoot e dificultar updates.
  - Mitigacao: manter alteracoes em namespaces/componentes ChatHook quando possivel.

- Confundir produto com plugin externo.
  - Mitigacao: experiencia visual precisa ser unica desde as primeiras telas.

- Usar dados de producao em staging sem controle.
  - Mitigacao: backups, mascaramento quando necessario e acesso restrito.

- Token manual virar padrao.
  - Mitigacao: remover esse fluxo assim que fork autenticado estiver no ar.

## Estado atual

- Richard confirmou que `chathook.com.br` ja funciona e ja vende; a prioridade e deixar o produto mais intuitivo para cliente, nao comecar do zero.
- Existe backup local recuperado da VPS em `chathook-audit`, com backend compilado, frontend publicado, Prisma e plano self-service. Esse backup nao substitui fonte original, mas e referencia real do produto vendido.
- Existe stack local `chathook-staging-stack` e staging funcional na VPS nova.
- O repositorio GitHub indicado e `gsm-fullweb/chatrook_2026`; clonado via SSH com a chave `atlas_chathook_vps`. Ele contem o mesmo backup recuperado da VPS em partes base64, nao o codigo-fonte original completo.
- Producao antiga roda `chatwoot/chatwoot:v4.11.1`.
- VPS nova `srv603856.hstgr.cloud` ja tem staging do ChatHook externo funcional.
- Banco staging do ChatHook externo foi restaurado com dados reais do Kanban antigo.
- Decisao de produto tomada: fork real do Chatwoot preservando multiatendimento e embutindo CRM ChatHook.
- Proxima acao: obter acesso ao repo privado, comparar com os backups locais e definir a base editavel antes de subir o fork real.

---

*Atualizar este arquivo conforme execucao. Nao criar arquivo novo para o mesmo plano.*
