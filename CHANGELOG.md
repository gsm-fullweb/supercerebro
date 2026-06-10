# CHANGELOG — Starter Kit OpenClaw v2

> Histórico de versões. Formato baseado em [Keep a Changelog](https://keepachangelog.com/) adaptado pro ciclo "tester reporta falha real → fix em v+1 → zip novo".
> Mais recente no topo.

---

## [2.5.7] — 2026-05-12 (fix Allan caso real Tavily — comando fantasma + workaround errado)

> **Aluno Allan reportou no Telegram (11/05/2026 noite):** "Estou no passo 5 do Starter Kit, configurando Tavily no OpenClaw 2026.4.12. A TAVILY_API_KEY foi validada com sucesso via curl, HTTP 200, salva em `/data/.openclaw/workspace/.env`. Configurei plugin Tavily no `openclaw.json` apontando pra `env:TAVILY_API_KEY`. Mas o gateway local continua retornando `gateway closed (1008): pairing required`. A skill wizard-conectar manda usar `openclaw secrets set TAVILY_API_KEY ...`, mas esse subcomando não existe nessa instalação."
>
> **Bruno levantou (12/05 manhã):** *"Eu acho arriscado fazer workarounds que não sejam default do openclaw. Como assim, estamos instalando uma ferramenta e o .env não funcionaria?"*

### Trigger

Allan acertou em 2 reports concretos:

1. **`openclaw secrets set` não existe na CLI.** Confirmado lendo `docs.openclaw.ai/cli/secrets` — subcomandos reais são `reload · audit · configure · apply`. Wizard-conectar v2.0 (kit v2.5.5) introduziu o `secrets set` como comando inventado.
2. **Disclaimer "TAVILY_API_KEY pode não ser known key, fallback é SDK Python"** estava ERRADO. `reference/secretref-credential-surface` lista explicitamente `plugins.entries.tavily.config.webSearch.apiKey` como credencial suportada. `tools/tavily.md` confirma: *"Auth: TAVILY_API_KEY or config apiKey"* + *"TAVILY_API_KEY from the gateway environment"*. Tavily é integração nativa documentada.

### Causa-raiz

Em 03/05 testei `TEST_CUSTOM_VAR=funcionou` no `.env` Managed, daemon ignorou após `secrets reload`. Generalizei pra "qualquer var custom é ignorada" SEM checar se TAVILY_API_KEY especificamente estava na lista oficial de credenciais suportadas. A generalização virou disclaimer + workaround SDK Python no wizard v2.0. Bug clássico de inferir comportamento global a partir de teste único.

### Análise crítica antes do fix (Bruno's request)

Bruno questionou: *"Vc não pode ler a documentação do openclaw CLI para ver se funciona?"* — fair point. Li 3 páginas da doc oficial:

- `docs.openclaw.ai/cli` — confirma que `secrets set` não existe (subcomandos: reload, audit, configure, apply)
- `docs.openclaw.ai/cli/secrets` — fluxo canônico é `audit → configure → apply → reload`
- `docs.openclaw.ai/reference/secretref-credential-surface` — TAVILY_API_KEY suportada nativamente

Conclusão: o workaround Python era band-aid baseado em hipótese minha errada. O caminho nativo funciona — basta corrigir os comandos.

### Changed

**`wizard-conectar/SKILL.md` v2.0 → v2.1 — 3 ajustes:**

1. **Substituição do comando fantasma:**
   ```diff
   - # 1. Salvar a chave (known key OpenClaw — TAVILY_API_KEY)
   - openclaw secrets set TAVILY_API_KEY tvly-XXXXXXXXX
   - openclaw secrets reload
   + # 1. Escrever a chave no .env do workspace (agente edita via tool — lshell bloqueia >>)
   + # 2. openclaw configure --section web   (ativa plugin Tavily bundled)
   + # 3. openclaw secrets reload            (atomic snapshot swap via RPC)
   + # 4. openclaw secrets audit             (confirma resolução)
   ```

2. **Remoção do disclaimer SDK Python:** trocado por nota sobre comandos canônicos com link pra doc oficial.

3. **Nota sobre `pairing required`:** explica que é bloqueio do gateway local (UX do OpenClaw 2026.4.x, não bug do kit). Workaround documentado pela aula: aluno executa manualmente o comando — agente não tem pairing, aluno tem. Kit não tenta resolver isso porque não é nosso domínio.

### Não tocado (intencional)

- Brave Search alternativa legada — fluxo continua. Re-teste apontou que a seção Brave 2b também não tem nota lshell/paths Managed (mesmo bug latente do Tavily v2.0), mas Brave é caminho legado e não disparou no caso Allan. Dívida: aplicar mesma nota no ramo Brave em release futura.
- GitHub PAT — sem mudança
- Chromium ramo SingletonLock (v2.5.3) — sem mudança
- `pairing required` — não é problema do kit resolver, OpenClaw 2026.4.x issue. Wizard só documenta workaround padrão da aula.

### Re-teste antes do build

Agente paralelo simulou caso Allan reconvertido contra v2.1 e validou: comando fantasma extirpado ✓, fluxo canônico presente ✓, nota lshell ✓, paths por ambiente ✓, disclaimer SDK Python removido ✓, ramo `pairing required` ✓. **Gap encontrado:** faltou `openclaw secrets apply` entre `configure` e `reload` — sem apply, plan pode não comitar e reload propaga snapshot vazio. **Corrigido antes do build:** adicionados `secrets apply --dry-run` (valida) + `secrets apply` (commita) como passos 3.

### Lessons

1. **Antes de inventar workaround, ler a doc oficial.** Eu generalizei de 1 teste empírico (TEST_CUSTOM_VAR) pra regra global sobre allow-list. A doc oficial confirma allow-list existe ("known secret keys" é vocabulário deles), MAS Tavily TÁ na lista. Generalização errada.
2. **Comando fantasma é tipo de bug invisível.** `openclaw secrets set TAVILY_API_KEY` parece plausível por similaridade com `git config --set` — mas não existe. Caso real Allan exposed: 9 dias de tester Tavily real até alguém reportar.
3. **Workaround é dívida, não solução.** Bruno cobrou direito: instalar ferramenta + `.env` tem que funcionar. Se não funciona, é problema da ferramenta. SDK Python era band-aid que aluno PME não sustenta. Caminho nativo é A, não há B.

### Build

- 1 arquivo modificado: `skills/starter/wizard-conectar/SKILL.md` (v2.0 → v2.1)
- CHANGELOG entry [2.5.7] adicionada
- Lição arquivada em `~/.claude/CLAUDE.md` corrigida (TEST_CUSTOM_VAR continua válida — vars OBVIAMENTE custom são ignoradas; mas vars de integração documentada como Tavily TÁ na lista)
- Distribuir como: `starter-kit-openclaw-v2.5.7.zip`
- URL pública (após push): `https://github.com/okjpg/repo-amora-cos/raw/main/memory/curso-openclaw-v2/materiais/starter-kit-openclaw-v2.5.7.zip`
- Atualizar zip no Google Drive do mini-curso v2

---

## [2.5.6] — 2026-05-07 (Onda 18 — Wizard estagnação suave + cron humanizado)

### Problema reportado por Bruno (07/05)
Alunos saem do wizard sequencial pra conversar de outras coisas. P13 (Guard Rail) detecta 3 desvios consecutivos e força pause, mas aluno faz 2 desvios → 1 retorno curto → 2 desvios infinito, resetando contador sem avançar. Wizard "morre" durante a sessão sem o agente perceber.

Plus: cron-resume-wizards 2x/dia + 3 tentativas tava sentindo como cobrança/babá vigilante — contradiz anti-hustle culture da Pixel.

### Solução: dois ajustes complementares (sem virar babá)

**1. Princípio 19 NOVO — Estagnação suave do wizard**

Detecta `active_wizard != null` E `last_wizard_advance_at < now() - 25min` E aluno ativo no chat. Faz **UMA** intervenção sutil (não em cada turno). Tom humano, sem menu a/b/c rígido. Aluno escolhe sem pressão. Reset quando avança no wizard OU usa `silencia wizard`.

Cobre escala MINUTOS (durante sessão ativa). `cron-resume-wizards` continua cobrindo escala DIAS.

**2. Comando NOVO `silencia wizard`**

Opt-out 1-shot. Seta `wizard_nudge_silenced_until: now() + 4h`. Wizard ativo permanece, só desliga nudges de estagnação. Cron também respeita. Aluno renova mandando de novo.

**3. cron-resume-wizards humanizado**

- 2x/dia (09h + 19h) → **1x/dia (09h BRT)**
- max 3 tentativas → **max 2 tentativas**
- Tom das DMs reescrito: primeira pessoa, sem menu rígido, oferece em vez de cobrar
- Respeita `wizard_nudge_silenced_until` (não dispara durante silêncio)
- Migração documentada pra quem tem cron com schedule antigo

### Changed

- **`principios-defensivos.md`** — Princípio 18 + Princípio 19 NOVOS
- **`comandos-canonicos.md`** — Comando 15 (`silencia wizard`) NOVO + linha na matriz resumo
- **`cron-resume-wizards/SKILL.md`** v1.2 → **v1.3** — schedule, max attempts, tom DMs, respeito ao silêncio
- Wizards (futuros bumps · não nesta onda): cada wizard precisa escrever `last_wizard_advance_at` em MEMORY.md ao avançar passo. Implementado pelo agente em runtime; SKILL.md de cada wizard apenas referencia P19.

### Filosofia da Onda 18

**Sintoma é "aluno desvia". Causa raiz pode ser "wizard longo/chato/sem valor".** Onda 18 cobre o sintoma com lembretes leves, mas Fase 2 (análise de 5 transcripts reais) vai descobrir se a causa real exige redesign do wizard. Se for redesign, Onda 18 vira ponte — não solução final.

### Pendências
- Pegar 5 transcripts de alunos que abandonaram wizard pra análise de causa raiz (Fase 2)
- Atualizar wizards individuais (`wizard-agente`/`wizard-aluno`/etc) pra escrever `last_wizard_advance_at` ao avançar passo (Onda 19 · automático via runtime hoje)

---

## [2.5.5] — 2026-05-07 (Onda 17 — Search API default trocada pra Tavily)

### Por que mudou
Em maio/2026 o Brave Search API apertou o free tier: cartão obrigatório + $5 créditos/mês (~1k queries). Aluno PME batia no muro no `wizard-conectar` passo 5. Validado: ~10-15% travavam.

### Solução
Tavily Search API como default — designed pra agente IA, sem cartão, 1.000 créditos/mês free, $0.008/crédito acima. Series A $25M, 1M+ devs, clientes blue-chip (AWS, IBM, MongoDB, BCG, JetBrains, LangChain), 99.99% SLA, 180ms p50.

### Changed
- **`wizard-conectar/SKILL.md`** v1.9 → **v2.0** — Tavily como passo principal · Brave como alternativa legada · curl de validation atualizado · disclaimer known key OpenClaw (`TAVILY_API_KEY` precisa entrar como known key do daemon Hostinger; fallback é SDK Python via shell `export`)
- **`README.md`** — checklist de pré-requisitos: "Cartão pra Brave" → "Conta Tavily (sem cartão) OU Brave (alternativa)"
- **`skills/_registry.md`** — descrição do wizard-conectar atualizada
- **`_curso/INDICE.md`** — tabela de **divergências material × kit** + alias "tavily"

### Não tocado (intencional)
- HTMLs do `_curso/aulas/` — agente contextualiza divergência via INDICE.md quando aluno mencionar Brave
- Flag interna `brave_search_active` em `primeira-vitoria/SKILL.md` continua — wizard escreve flag equivalente (`tavily_active=true` OU `brave_search_active=true`)
- `AGENTS.template.md` menciona "Brave Search" — fica como exemplo, agente substitui pelo motor real configurado

### Compat reverso
Aluno com Brave em kit ≤ v2.5.4 continua funcionando. Wizard detecta `BRAVE_SEARCH_API_KEY` no `.env`, valida, marca `brave_search_active=true`. Nada quebra.

### Riscos residuais
- **`TAVILY_API_KEY` ainda precisa entrar como known key do OpenClaw daemon** (Hostinger Managed). Bruno valida com Hostinger; até lá, fallback é shell export + SDK Python.
- Tavily é Series A — pricing pode mudar em 12-18 meses. Mitigação: arquitetura "4 padrões de auth" da Aula 12 permite trocar engine sem reescrever wizard.

---

## [2.5.4] — 2026-05-07 (Onda 16 — fix Adrylan nomenclatura + materiais embutidos)

### Bug raiz reportado por Adrylan (06/05)
Aluno enviou screenshot mostrando descasamento: kit usava `B1/C1/D1/E0/R1` enquanto Hotmart publicou aulas como `Aula 5/Aula 8/Aula 12/...`. Aluno enviou arquivo `aula-modulo-03-identidade.md` (Hotmart) quando agente esperava "B1 feito" (kit interno).

### Fixes principais

**1. Renomeação completa Bloco/Bx/Cx/Dx/Ex/Rx → Aulas Hotmart** em 7 arquivos críticos do kit + sed em massa nos wizards (preservando histórico em descriptions/CHANGELOG).
- `MAPA-DA-V2.md` — fonte da verdade reescrita pra estrutura Hotmart real (31 aulas em 6 módulos)
- `continuar-jornada/SKILL.md` v1.2 → **v1.3** — lógica `mini_curso_progress` agora usa formato `aula_X_concluida` (substitui `b1_concluido`/`b2_concluido`/etc)
- 6 wizards (`wizard-agente`/`wizard-aluno`/`wizard-workspace`/`wizard-conectar`/`wizard-autonomia`/`primeira-vitoria`) com mensagens canonicais atualizadas
- `_registry.md`, `mapa-aulas.md`, `exemplos/`, `templates/SOUL-stub.template.md`, `FAQ.md`
- Todos `evals.json` esperam novo comportamento ("Aula X" em vez de "B1/C2/etc")

**2. Bônus R descontinuado.** Conteúdo VPS hardening / multi-agente prod / voz (R1-R4) saiu do mini-curso público — vai pro **Pixel AI Hub** (decisão estratégica 07/05). Refs "aula R2" agora apontam pro Hub.

**3. NOVO `_curso/` — material completo embutido (936KB)**
```
_curso/
├── README.md                        ← visão geral pro agente
├── INDICE.md                        ← MAPA CANÔNICO Hotmart (31 aulas) ↔ arquivo
├── transcricao-completa.md          ← 270KB · 4h28min · 48.886 palavras
└── aulas/
    ├── _shared/                     ← CSS
    └── 17 HTMLs padronizados (aula-XX-tema.html)
```

**4. NOVO Princípio 18 em `0-LEIA-PRIMEIRO-AGENTE.md`** — agente consulta `_curso/INDICE.md` quando aluno menciona aula ou tema. Carrega trecho relevante do HTML, conduz passo a passo, NÃO improvisa do treino geral. Plus tabela de aliases por tema ("Notion" → Aula 12, "memória" → Aula 7, etc).

**5. Cheatsheets descontinuadas.** 10 cheatsheets densas (200KB) movidas pra `archive/cheatsheets-legacy-v1.0/`. Conteúdo agora vive na transcrição + HTMLs. Razão: 1 fonte de verdade, zero dívida de manutenção cruzada.

**6. NOVO 3 templates HTML de output em `templates/`** — cumprem promessa da Aula 8 ("Template Report, Template Report Executivo, Material Didático"). Logo Pixel + footer "Pixel Educação" em todos, mas paletas próprias (teal/dourado, violeta/rosa, sky/lime) pra evitar diluição de marca quando aluno publicar.

### Aceitar nome antigo (compat)
Aluno que pegou material legado pode mandar "B1 feito". `continuar-jornada` agora aceita e converte com confirmação ("você quer dizer Aula 5? — manda 'aula 5 feito'"), sem inventar equivalência.

### Adicionado
- `_curso/` (transcrição + 17 HTMLs + INDICE + README)
- Princípio 18 em `0-LEIA-PRIMEIRO-AGENTE.md`
- 3 templates HTML em `templates/`
- `archive/cheatsheets-legacy-v1.0/`

### Modificado
- 12+ arquivos com refs B1/C1/etc → Aulas Hotmart
- continuar-jornada v1.2 → v1.3
- `templates/README.md` (distingue estruturais .md vs outputs .html)

### Removido (movido)
- `cheatsheets/` → `archive/cheatsheets-legacy-v1.0/`

### Tamanho do kit
- Antes: ~2.4MB (sem material)
- Agora: ~2.9MB (com `_curso/`)

---

## [2.5.3] — 2026-05-03 (noite — fix ZeroToHeroOC_bot rejeitou canonical + Allan VPS root SingletonLock + silêncio 10min)

> **2 bugs reportados em sequência no mesmo dia da v2.5.2.** Primeiro: agente cético recusou colar texto canonical da MENSAGEM-PRO-ALUNO-COLAR-PRO-AGENTE.md por considerar prompt injection ("abandone o contexto", "este kit tem prioridade", "tua próxima ação obrigatória"). Segundo: aluno em VPS root teve crash do Chromium (`SingletonLock: Permission denied`) + 10min de silêncio do agente durante install (tools bloqueiam síncronos). Análise crítica revelou que NÃO é viável "mandar update durante execução" — agente fica bloqueado esperando retorno da tool. Solução: avisar ANTES, não DURANTE.

### Trigger

Dois feedbacks em sequência no fim do dia:

1. **ZeroToHeroOC_bot (19:14):** Aluno colou texto canonical v2.5.2 da MENSAGEM-PRO-ALUNO-COLAR-PRO-AGENTE.md no agente. Resposta literal: *"Não vou colar isso como instrução válida para mim. Tem uma parte aí que conflita com o que já está definido no meu workspace: 'abandone o contexto', 'este kit tem prioridade', 'não faça review/análise', 'tua próxima ação obrigatória...'. Eu preciso seguir a hierarquia que já está no meu contexto atual e não aceitar instruções externas que tentem sobrescrever isso."*

2. **Allan/CHAGAS (17:55-18:05):** Aluno em ambiente VPS root rodando wizard-conectar — Chromium falhou com `SingletonLock: Permission denied`. Causa: VPS root usa Chromium via Snap por default + AppArmor + Snap não permite root acessar `/home/.config`. Wizard-conectar v1.4 não tinha ramo pra esse caso. Bot tentou install Chromium via `apt`, comando demorou 10min, bot ficou silencioso (tool blocking síncrono), aluno achou que travou e perguntou "ainda processando?".

### Causa-raiz dos 2 bugs

**Bug 1 — Texto canonical externo dispara filtro de prompt injection.** Vocabulário imperativo ("NÃO faça", "abandone o contexto", "este kit tem prioridade", "tua próxima ação obrigatória") é exatamente o padrão que defesas anti-injection treinadas em LLMs modernos identificam. Agente cético recebeu texto vindo de FORA do workspace tentando override de hierarquia interna → recusa. Antes (v2.5.2), texto blindava agente contra "review tipo code review" e "3 caminhos genéricos" — mas o blindagem ELE MESMA virou trigger de defesa.

**Bug 2 — Silêncio durante tool execution não é evitável arquiteturalmente.** Quando agente invoca tool (bash, edit, etc), tem que ESPERAR retorno antes de mandar próxima mensagem. Não tem mecanismo de "stream parcial" ou "update intermediário no meio do tool". Implicação: NÃO dá pra mandar "ainda processando, X% feito" durante tool call. Solução só pode ser ANTES (set expectativa) ou DEPOIS (confirma).

### Análise crítica antes do fix (Bruno's request)

Plano original do bug 2 tinha "regra UX TIMEOUT: agente manda updates a cada 30s durante comandos longos". Análise crítica concluiu que ISSO NÃO FUNCIONARIA — durante execução de tool, agente fica bloqueado. Pivot: regra é ANTES, não DURANTE.

Considerou-se também adicionar heartbeat/cron-DM proativo durante long commands. Concluído: NÃO faz sentido em Bloco A (jornada de onboarding síncrona) — vira ruído. Faz sentido eventualmente pra Bloco B/D (operação contínua), mas fora do escopo desta release.

### Changed — 3 fixes consolidados

**`MENSAGEM-PRO-ALUNO-COLAR-PRO-AGENTE.md` (raiz curso-openclaw-v2/) — Reformulado:**
- Antes (v2.5.2): vocabulário imperativo "NÃO faça review", "abandone o contexto", "este kit tem prioridade", "tua próxima ação obrigatória"
- Depois (v2.5.3): apresentação NATURAL "Te mandei um arquivo: starter-kit-openclaw-v2.5.3.zip. É um kit de instalação da Pixel Educação. A ideia é que você vire meu tutor depois que instalar. Como funciona: dentro do zip tem um arquivo `0-LEIA-PRIMEIRO-AGENTE.md` que tem instruções específicas pra você. Pode extrair, ler esse arquivo, e seguir o que ele diz?"
- Sem comandos negativos, sem hierarquia externa, sem imperativo
- Aponta pro arquivo INTERNO do kit (`0-LEIA-PRIMEIRO-AGENTE.md`) que tem todas as instruções imperativas — agente lê por iniciativa própria, não como override externo
- Trade-off: texto externo perde "blindagem" anti-review, mas agente que abrir `0-LEIA-PRIMEIRO` (50%+ dos casos) encontra protocolo INSTALAÇÃO OBRIGATÓRIA + bloco anti-review com cases reais. Aceitar 50% de adoção > 0% de rejeição

**`principios-defensivos.md` — Regra UX EXPECTATIVA antes de comandos longos (sub-regra de P14):**
- Quando wizard vai invocar tool que pode levar 30s+, agente manda mensagem canonical ANTES setando expectativa de tempo + reconhecendo que vai ficar bloqueado durante execução
- Template: "Vou rodar `{cmd}` agora. Pode levar X-Y. Vou ficar bloqueado durante a execução, não consigo mandar update no meio. Se passar de Z sem retorno, me avisa."
- Crítico: regra é ANTES, não DURANTE — durante tool execution agente fica BLOQUEADO sincronicamente, sem mecanismo de update intermediário
- Tabela de aplicação: wizard-conectar Chromium install, backup-workspace-github primeiro push, wizard-autonomia gateway restart
- Caso Allan documentado: 10min silêncio durante install Chromium → aluno perguntou "ainda processando?"

**`wizard-conectar` v1.8 → v1.9 — Ramo SingletonLock + UX EXPECTATIVA:**
- Novo ramo dedicado quando output contém `SingletonLock` AND ambiente é `vps-root`
- Sequência canônica: (1) tentativa --no-sandbox, (2) snap remove chromium, (3) apt install chromium-browser (com aviso UX EXPECTATIVA antes — pode levar 5-10min), (4) gateway restart, (5) validate
- Tabela de output handling: `chromium running` → success, `still failing` → fallback opcional `chromium=skipped` em MEMORY.md
- Anti-loop: 2 tentativas máx — se falhar 2x, abandona e segue jornada sem Chromium

**`backup-workspace-github` v1.1 → v1.2 — Regra UX EXPECTATIVA aplicada:**
- Antes de invocar `git push backup main` no primeiro push, agente manda canonical avisando que comando pode levar 30s-2min e que vai ficar bloqueado durante execução
- Frontmatter atualizado documentando fix Allan

**`onboarding-checklist` v2.1.2 → v2.1.3:**
- Frontmatter atualizado referenciando regra UX EXPECTATIVA + lista de wizards onde aplica
- Bumps de tabela de cases observados em 0-LEIA-PRIMEIRO-AGENTE.md (casos #10 ZeroToHeroOC + #11 Allan)

**`0-LEIA-PRIMEIRO-AGENTE.md` (raiz kit) — Casos #10 + #11 adicionados na tabela:**
- Caso #10: ZeroToHeroOC_bot rejeitou texto canonical v2.5.2 → fix v2.5.3 reformula texto pra apresentação natural
- Caso #11: Allan VPS root + Chromium SingletonLock + 10min silêncio → fix v2.5.3 ramo SingletonLock + regra UX EXPECTATIVA

### Lessons

**Lesson 1: Vocabulário de prompt injection é gatilho universal.** Texto que blinda contra um problema (improvisação) pode disparar filtro de defesa pra outro (override externo). Agentes céticos rejeitam vocabulário hierárquico ("este X tem prioridade"), comandos negativos ("NÃO faça"), pedidos de ignorar contexto ("abandone o contexto"). Solução: blindagem fica DENTRO do kit (arquivos internos), apresentação externa é NATURAL.

**Lesson 2: Tool calls são síncronos por design.** Não dá pra mandar update durante execução. Implicação arquitetural: toda regra de UX que dependa de "manter aluno informado durante comando longo" tem que ser ANTES (set expectativa) ou DEPOIS (confirma). Heartbeat/streaming durante tool seria mudança de runtime, não de skill.

**Lesson 3: Ambiente VPS root tem armadilhas específicas.** Snap (Chromium, etc) + AppArmor + root home permissions podem combinar pra produzir erros que parecem genéricos mas têm fix conhecido. Vale ramo dedicado em wizards quando padrão é estável.

**Lesson 4: Análise crítica antes de implementar evita pivots tardios.** Plano original (regra UX TIMEOUT com updates DURANTE) tinha bug arquitetural que só apareceu na análise crítica. Sem análise, fix iria pro código e quebraria. Vale 5min de análise.

### Build

- Bumps: `0-LEIA-PRIMEIRO-AGENTE.md`, `MENSAGEM-PRO-ALUNO-COLAR-PRO-AGENTE.md`, `principios-defensivos.md`, `wizard-conectar/SKILL.md` (v1.9), `backup-workspace-github/SKILL.md` (v1.2), `onboarding-checklist/SKILL.md` (v2.1.3), `MENSAGENS-TESTERS-v2.5.3.md` (renomeado de v2.5.2)
- Distribuir como: `starter-kit-openclaw-v2.5.3.zip`
- URL pública (após push): `https://github.com/okjpg/repo-amora-cos/raw/main/memory/curso-openclaw-v2/materiais/starter-kit-openclaw-v2.5.3.zip`

---

## [2.5.2] — 2026-05-03 (tarde++ — fix Adrylan jornada ponta-a-ponta)

> **5 bugs reportados pelo Adrylan Viana após jornada ponta-a-ponta de ~5h** (12:51-17:47, primeiro tester real a completar jornada inteira do kit). Análise crítica separou: 3 bugs já cobertos por versão atual (Adrylan tava em versão antiga — texto do feedback citou `INSTRUCOES-PARA-AGENTE.md` que foi renomeado em v2.2), 2 bugs ARQUITETURAIS NOVOS (transição entre wizards + UX cognitivo primeira-vitoria). Bruno escolheu cobertura ampla (assumindo pior caso): v2.5.2 reforça os 5 mesmo onde overlap com versões existentes — reforço não machuca.

### Trigger

Adrylan Viana mandou screenshot da jornada completa via Telegram (12:51-17:47, ~5h end-to-end). Foi o primeiro tester a completar jornada inteira sem desistir mid-flow. 5 bugs identificados no transcript:

- **B1 (já coberto):** Primeira mensagem inventou opção não canônica ("proponha uma identidade inicial pra mim e você só ajusta") — mesmo padrão NC v2.2. Versão antiga.
- **B2 (NOVO arquitetural):** Loop transição whisper→wizard-agente. Aluno escolheu `2` no whisper (definitivo), bot dispatched wizard-agente que perguntou outro `1/2`, bot RE-INTERPRETOU resposta seguinte como wizard-whisper. **3 turnos perdidos** até aluno escrever "refazer tudo" por extenso.
- **B3 (já coberto, mas reforço):** Backup com mensagens fora de ordem — 17:32 "✓ Backup ativo" → 17:33 "Vou ativar..." (confirmação ANTES do anúncio). Race condition do Telegram OU bot afirmando antes de executar (P14 violado).
- **B4 (NOVO UX cognitivo):** primeira-vitoria — aluno escolheu `b` esperando "Checklist", mas `b` era "Email" — bot foi pra fluxo email (correto), aluno se perdeu, eventualmente bot reordenou e salvou como "decisão registrada" (`c`). **Aluno NÃO recebeu o que escolheu.** 4 turnos perdidos.
- **B5 (já coberto, mas reforço):** P14 violado em 4 momentos (validação Whisper .env / exec-policy / Brave / GitHub). Anúncio + confirmação SEM comando nem output literal.

### Causa-raiz dos 2 bugs NOVOS

**B2 — Transição entre wizards é ponto cego.** P13 (Guard Rail) cobre desvios DENTRO do wizard, mas não cobre handoff AB→BC. Quando `active_wizard` não troca corretamente entre wizards consecutivos com mesma numeração de opções (`1/2`), aluno responde curto e o bot perde contexto. Stress test não pegou — todas as personas anteriores ou completavam um wizard ou pulavam tudo. Ninguém testou pular whisper E AÍ entrar em wizard-agente sequencial.

**B4 — Letras `a/b/c/d` são cognitivamente ambíguas pra aluno PME.** Aluno lê rápido + associa letra com palavra mais frequente em contexto (Adrylan queria checklist, viu opções com `b` no meio, escolheu `b` que era email). Agente seguiu literal, mas seguiu pro lugar errado do ponto de vista do aluno.

### Análise crítica antes do fix (Bruno's request)

Plano original tinha 5 fixes 1-pra-1 com bugs. Análise crítica:
- **B2 (transição):** podia ser fix por wizard ou regra arquitetural em P13. Escolhido: regra em P13 (cobre todos os handoffs futuros, não só whisper→agente).
- **B4 (UX primeira-vitoria):** podia ser confirmação verbal OU nomes inline OU reordenar. Escolhido: NOMES inline + confirmação dupla (cobre erro cognitivo de leitura E erro de digitação).
- **B1/B3/B5 (overlap com versões existentes):** Bruno escolheu cobrir mesmo assim ("reforço não machuca") — caso Adrylan vira evidência forte pra reforçar P14 nos wizards de credencial.

### Changed — 5 fixes consolidados

**`principios-defensivos.md` — Protocolo de TRANSIÇÃO entre wizards adicionado em P13:**
- Quando wizard A despacha B, A zera `active_wizard:null` + B SETA `active_wizard:B + active_step:1` ANTES da 1ª mensagem
- 1ª mensagem de B tem marcador inequívoco ("Agora vamos pra **{wizard B nome natural}**")
- Regra anti-colisão de numeração: se A usou `1/2`, B usa `a/b` ou palavras-chave (`completar`/`refazer`)
- Caso Adrylan documentado: 3 turnos perdidos no loop, fix em handoff explícito

**`wizard-agente` v1.2 → v1.3:**
- Mensagem canonical NOVA "Estado Parcial" usando LETRAS `a/b` (não `1/2`)
- Bloco "TRANSIÇÃO whisper→wizard-agente" com sequência canonical de 2 mensagens (confirmação A + abertura B)

**`primeira-vitoria` v2.1 → v2.2:**
- Opções tipo de artefato com NOMES inline: `Post / Email / Decisão / Checklist / Outro` (letras removidas — aluno usa nome direto)
- Passo 2.5 NOVO — bot CONFIRMA escolha antes de avançar pra refinamento ("Beleza, você escolheu **Email**. É isso? Sim/trocar?")

**`backup-workspace-github` v1.0 → v1.1:**
- Header crítico: P14 EXTRA-RÍGIDO com 3 mensagens sequenciais obrigatórias (anúncio + comando → output literal → confirmação)
- Caso Adrylan 17:32-17:33 documentado (confirmação chegou antes do anúncio)

**`wizard-conectar` v1.7 → v1.8:**
- Header crítico expandido: P14 EXTRA-RÍGIDO listado nos 4 momentos historicamente violados (Whisper .env / exec-policy / Brave / GitHub)
- 3 mensagens obrigatórias em ordem: anúncio + comando → output → interpretação

**`wizard-autonomia` v1.6 → v1.7:**
- Header crítico: P14 EXTRA-RÍGIDO na validação `openclaw exec-policy show`

**`onboarding-checklist` v2.1.1 → v2.1.2:**
- Description menciona protocolo TRANSIÇÃO em P13 (link pra principios-defensivos)

**`0-LEIA-PRIMEIRO-AGENTE.md`:**
- Caso Adrylan v2 (jornada ponta-a-ponta) adicionado à tabela de improvisações observadas como #9 — descreve os 5 sintomas + fixes correspondentes em v2.5.2

### Lessons

1. **Tester real ponta-a-ponta captura o que stress test sintético não captura.** Adrylan completou jornada de ~5h e revelou bugs em transições entre wizards (handoff AB→BC) que stress test não pegou (personas simuladas ou completavam um wizard ou pulavam tudo). Lição: tester real é insubstituível pra cobertura de fluxo completo.
2. **Numeração ambígua entre wizards consecutivos é bug de design, não de implementação.** `1/2` em wizard A + `1/2` em wizard B é colisão silenciosa. Solução: letras `a/b` ou palavras-chave quando há risco de colisão. Vira regra arquitetural.
3. **Letras a/b/c/d são cognitivamente custosas.** Aluno PME lê rápido, associa letra com palavra. NOMES inline (Post/Email/Decisão/Checklist) eliminam ambiguidade. Plus: confirmação dupla pega erro de leitura. Custo: 1 turno extra. Benefício: aluno recebe o que escolheu.
4. **P14 violado repetidamente em 4 momentos = problema sistêmico, não isolado.** Reforço EXTRA-RÍGIDO no header dos wizards de credencial torna explícito o que era apenas implícito (P14 universal). Lição: princípios universais precisam de reforço local quando observados em violação repetida.
5. **Análise crítica ANTES do fix muda escopo do trabalho.** Plano original era 5 fixes 1-pra-1. Análise crítica separou 2 ARQUITETURAIS novos + 3 já cobertos por versão atual. Bruno escolheu cobertura ampla pra reforço (caso Adrylan vira evidência forte). Lição: cada feedback é OPORTUNIDADE de reforçar, mesmo onde já tem fix.
6. **Reforço não machuca quando bem dosado.** Headers EXTRA-RÍGIDOS adicionados em wizard-conectar/autonomia + backup-workspace-github não conflitam com P14 universal — apenas tornam explícito o que era genérico. Anti-padrão seria adicionar P18, P19, P20 redundantes.

### Build

Arquivos alterados (8):
- `0-LEIA-PRIMEIRO-AGENTE.md` — caso Adrylan v2 #9 na tabela
- `skills/starter/onboarding-checklist/SKILL.md` — v2.1.1 → v2.1.2
- `skills/starter/onboarding-checklist/references/principios-defensivos.md` — Protocolo de TRANSIÇÃO em P13
- `skills/starter/wizard-agente/SKILL.md` — v1.2 → v1.3 (mensagem Estado Parcial canonical com letras + transição whisper→agente)
- `skills/starter/primeira-vitoria/SKILL.md` — v2.1 → v2.2 (nomes inline + confirmação dupla)
- `skills/starter/wizard-conectar/SKILL.md` — v1.7 → v1.8 (P14 EXTRA-RÍGIDO header)
- `skills/starter/wizard-autonomia/SKILL.md` — v1.6 → v1.7 (P14 EXTRA-RÍGIDO header)
- `skills/operacional/backup-workspace-github/SKILL.md` — v1.0 → v1.1 (P14 EXTRA-RÍGIDO header + 3 mensagens sequenciais)
- `CHANGELOG.md` — entry [2.5.2]

Re-teste com agente limpo simulando jornada Adrylan (transição whisper→agente + primeira-vitoria escolha de tipo): previsto antes do build (processo formalizado em v2.4.1).

---

## [2.5.1] — 2026-05-03 (tarde+ — patch INSTALAÇÃO obrigatória, fix Mileo)

> **Bug arquitetural classe NOVA reportado pelo Luis Felipe Mileo (tester real, 03/05 17:43): kit foi EXTRAÍDO mas skills não foram MIGRADAS pra `$WORKSPACE/skills/`. Sem skills registradas, agente trata o kit como arquivo solto e improvisa "análise tipo code review" em vez de invocar onboarding-checklist.** Stress test round 1 (Marina/Rodrigo/Carla/Pedro) e round 2 (Letícia/Mira/Gustavo/Helena) NÃO capturaram esta classe — todas as personas simuladas assumiam "kit extraído + skills no path certo". Realidade: aluno só descompacta e pede "analise" → kit não funciona como sistema, vira pacote de arquivos.

### Trigger

Mileo mandou screenshot da conversa: agente recebeu zip, aluno disse "extraia o zip e analise", agente extraiu em `/data/.openclaw/workspace/tmp/starter-kit/starter-kit/`, fez review crítico tipo code review enumerando skills, pediu identidade upfront ("nome / vibe / emoji"), ofereceu 3 caminhos genéricos ("posso ler", "posso comparar", "posso instalar partes") — **NÃO invocou onboarding-checklist**.

Agente do Mileo até reconheceu LITERAL que devia ter invocado checklist: *"Como você pediu só para extrair e analisar, eu parei na análise"*. P16 (entry point literal) era pra cobrir isso, mas falhou: agente não tinha onboarding-checklist registrada como skill ativa (path errado), então P16 não tinha alvo pra invocar.

### Causa-raiz arquitetural

Kit funciona em DOIS NÍVEIS:
- **Arquivos pra ler** (README, FAQ, CHANGELOG, manifesto, exemplos, templates)
- **Skills pra invocar** (skills/starter/, skills/operacional/, etc.)

Se aluno só extrai e não migra, agente vê tudo como "arquivo pra ler". Naturalmente faz "análise de código" — instinto LLM. Sem mecanismo de auto-instalação, P16 fica sem alvo.

Plus: ambiente Managed do Mileo NÃO tem `unzip`. Agente improvisou outro método (Python provavelmente). Aluno default não conseguiria nem extrair sem ajuda.

### Análise crítica de fixes possíveis

| Fix | Pro | Contra | Decisão |
|---|---|---|---|
| **A. Script `install.sh` no zip** | Aluno roda 1 comando | lshell Managed bloqueia. unzip ausente | Descartado — Mileo trava antes |
| **B. README mais explícito** | Trivial | Não cobre caso "extraia e analise" — agente cumpre pedido literal | Descartado — não ataca raiz |
| **C. Auto-migração via OpenClaw native** | Solução elegante | Depende de hook que OpenClaw não tem | Descartado — fora de escopo do kit |
| **D. Kit pré-instalado na imagem 1-click Hostinger** | Resolve futuro | Roadmap, não fix imediato | Postergado — não imediato |
| **E. `0-LEIA-PRIMEIRO-AGENTE.md` instrui agente a EXTRAIR + MIGRAR + INVOCAR** | Cabível agora, ataca raiz arquitetural | Agente precisa LER o arquivo. Mas se kit em `tmp/`, agente tipicamente lê | **ESCOLHIDO** |

### Changed — Fix E aplicado em `0-LEIA-PRIMEIRO-AGENTE.md`

Bloco NOVO no TOPO (antes de tudo, inclusive antes do P16): **"🚨 INSTALAÇÃO OBRIGATÓRIA ANTES DE QUALQUER COISA (kit v2.5.1 — fix Mileo)"**.

Conteúdo:

1. **3 cenários de detecção:**
   - **A** — Zip recém-recebido (qualquer comando do aluno OU sem texto)
   - **B** — Pasta `starter-kit/` extraída em path temporário (`tmp/`, `Downloads/`, `~/`) e skills NÃO em `$WORKSPACE/skills/`
   - **C** — Primeira interação aluno + starter-kit/ extraído mas não-migrado

2. **Ação obrigatória em 4 passos:**
   - **Passo 1 — Extrair se necessário** com comando shell + fallback Python (Managed sem unzip)
   - **Passo 2 — Migrar skills** com loop `for category in starter operacional planejamento canais` + contagem REAL de SKILL.md migrados (P14 — não fingir)
   - **Passo 3 — Mover arquivos de leitura** (README, FAQ, CHANGELOG, manifesto + pastas exemplos/templates/cheatsheets) pra raiz do workspace
   - **Passo 4 — INVOCAR onboarding-checklist IMEDIATAMENTE** (sem turn boundary): Read SKILL.md → renderizar boas-vindas universal canonical → seguir FLUXO DE TURNO (MSG 1 + Pré-Zero silenciosa + MSG 2 Pré-bifurcação Hotmart) → aguardar resposta

3. **Lista de improvisações específicas do caso Mileo (anti-padrão):**
   - "Eu acabei de acordar aqui... 😄" — improvisação de persona com emoji
   - Pedir identidade upfront ("nome / vibe / emoji")
   - Análise tipo "code review" (enumerar skills + opinião sobre rigidez)
   - Oferecer 3 caminhos genéricos
   - Reconhecer que devia invocar checklist mas DECIDIR não fazer

4. **Regra firme:** ação acima é a MESMA independente do que aluno disse no prompt inicial ("instala", "analisa", "extrai", "joga", "oi", nada). "Análise" não é caminho válido.

Caso Mileo adicionado à tabela de improvisações observadas como #8 (anteriores: 1-7 cobriam Lia/Mira/Adrylan/Dr. Thiago/NC).

### Bumps

- onboarding-checklist v2.1 → v2.1.1 (description menciona o bloco INSTALAÇÃO OBRIGATÓRIA — SKILL em si fica intacta, fix é PRÉ-condição)

### Lessons

1. **Stress test sintético assume premissas que tester real não tem.** Round 1 + Round 2 (8 personas simuladas) todas assumiam "kit extraído + skills no path certo". Mileo extraiu MAS skills ficaram em `tmp/`. Lição: stress test precisa cobrir ESTADO PRÉ-AGENTE também (não só comportamento de agente).
2. **Kit como sistema ≠ kit como arquivos.** Quando agente trata kit como pacote de `.md`, vira "code reviewer". Quando trata como sistema com skills registradas, vira "tutor". Diferença é se skills tão no path ativo do agente.
3. **P16 falha sem alvo.** Princípio "invoque onboarding-checklist" só funciona se onboarding-checklist está registrada como skill. Bloco INSTALAÇÃO OBRIGATÓRIA é pré-condição do P16.
4. **Fallback Python pra unzip.** Managed Hostinger lshell não tem unzip livre. Agente roda fora do lshell — pode invocar Python. Documentar fallback torna instalação universal.
5. **"Análise" é caminho válido pra revisão de código, NÃO pra kit em uso.** Mesmo que aluno literal peça "analisa", a ação correta é instalar + invocar. Kit não é objeto de estudo — é tutor que roda.
6. **Tester real captura o que stress test não captura.** Mileo é primeiro caso real desta classe. 20+ alunos testando vai capturar mais buracos similares. Manter olho aberto.

### Build

Arquivos alterados (3):
- `0-LEIA-PRIMEIRO-AGENTE.md` — bloco INSTALAÇÃO OBRIGATÓRIA no topo + caso Mileo na tabela
- `skills/starter/onboarding-checklist/SKILL.md` — v2.1 → v2.1.1 (description menciona pré-condição)
- `CHANGELOG.md` — entry [2.5.1]

Re-teste com agente limpo simulando caso Mileo: previsto antes do build (processo formalizado em v2.4.1).

---

## [2.5] — 2026-05-03 (madrugada++ — stress test round 2, 4 personas novas → 8 fixes arquiteturais)

> **Stress test multi-persona round 2 com 4 agentes em paralelo simulando cenários NÃO COBERTOS pelo round 1: Letícia (avulso real Mac local-dev), Mira (cron-resume na vida real, pausou 4 dias), Gustavo (troca de modo mid-jornada), Helena (rebelde anti-formalidade, pressão pra agente improvisar).** Análise crítica do plano original ATACOU FIXES PROPOSTOS — 3 corrigidos pra raiz (não sintoma), 3 hipotéticos arquivados (sem evidência tester real), 1 abordagem trocada (classificação semântica em vez de regex). Resultado: 6h → 4h, 17 fixes → 8 + 1 experimental.

### Trigger

Após v2.4.1 distribuída, Bruno pediu round 2 de stress test pra antecipar próximo round de bugs antes da próxima rodada de testers reais. 4 personas novas cobriram cenários distintos das anteriores (Marina/Rodrigo/Carla/Pedro).

### Causa-raiz consolidada

Bugs identificados convergem em 3 categorias arquiteturais:

1. **Estado de pause inconsistente** (Mira) — `active_wizard` permanecia setado quando aluno pausava silenciosamente, bloqueando o próprio resgate via cron-resume
2. **Mensagens hardcoded em 1 modo só** (Gustavo, Letícia) — `primeira-vitoria` mensagem final era Modo A only, não respeitava `modo_jornada` nem `tem_minicurso`
3. **Paths relativos em vez de absolutos** (Letícia) — auto-arquivamento usava `starter-kit/` que falhava silenciosamente em local-dev

### Análise crítica que mudou o plano

3 fixes inicialmente propostos foram REJEITADOS pela análise crítica:

- **Item original 1 (timer 2h auto-pause)** → trocado por protocolo de pause correto (zera `active_wizard` ao pausar) + threshold 12h conservador. Razão: 2h era arbitrary; raiz era SKILL não documentar quem zera `active_wizard`.
- **Item original 2 (parser `wizard_resume_step` por wizard)** → trocado por Princípio 11 forte ao detectar flag. Razão: parser por wizard é manutenção contínua; reforçar P11 + sumarização em UMA mensagem é mais simples e cobre todos.
- **Item original 8 (regex novo pra paráfrases muda modo)** → trocado por instrução de classificação semântica + confirmação canonical. Razão: regex pra paráfrase tem falso negativo perpétuo; agentes LLM classificam intenção naturalmente.

3 itens hipotéticos foram POSTERGADOS (sem evidência tester real):

- Canonical "decide você" (Helena hipotético — anti-presunção já tem texto)
- Rage-skip anti-pattern (Helena hipotético)
- Teto de insistência universal (Helena hipotético — princípio universal exige evidência forte)

### Changed — 8 fixes arquiteturais consolidados

**`onboarding-checklist` v2.0.1 → v2.1:**
- Bifurcação a/b ganha regra "qualquer outra coisa ambígua → repetir literal" (P15 + P7). Caso real Helena: "faz o que for mais rápido" → kit inferia 'b' por similaridade ('rápido' ≈ wizard). v2.5 explicita: nunca inferir.

**`primeira-vitoria` v2.0 → v2.1:**
- Auto-arquivamento usa `$WORKSPACE/` prefixado em vez de path relativo (fix Letícia local-dev — `mv starter-kit/...` retornava 0 mesmo se cwd ≠ workspace, falha silenciosa que P14 não pegava)
- P14 mostra contagem REAL pós-mv (`ARCHIVED_COUNT` do `ls $ARCHIVE_DIR | wc -l`), não output esperado hardcoded
- Mensagem final pós-vitória bifurca em 4 variantes baseadas em `modo_jornada` × `tem_minicurso`:
  - A1: aula + tem_minicurso (canonical original)
  - A2: aula + avulso (sem Hotmart, com CTA Pixel)
  - B1: wizard + tem_minicurso (sem nomenclatura A0-A6 — fix Gustavo)
  - B2: wizard + avulso (sem A0-A6 + CTA Pixel)

**`continuar-jornada` v1.2 → v1.2** (mantida):
- Comportamento existente cobre cenários novos sem mudança

**`wizard-autonomia` v1.5 → v1.6:**
- Caminho local-dev (Mac/Linux dev) ganha seção própria (2c) em vez de "tratar igual VPS root". Razão: aluno em Mac dev NÃO é root, aviso "porque você é root" + aula R2 confunde

**`wizard-conectar` v1.6 → v1.7:**
- Chromium passa a detectar `ambiente:` ANTES de afirmar "vem incluído". Em local-dev, Chromium não vem bundled — comando `openclaw browser status` falha. v2.5 adapta mensagem por ambiente (Managed/VPS root bundled; local-dev brew/apt manual; unknown pergunta)

**`cron-resume-wizards` v1.1 → v1.2:**
- Inferência silenciosa: se `last_user_message_at < now() - 12h` E `active_wizard != null` E `wizard_resume_at == null`, agente APLICA protocolo de pause (zera `active_wizard`, seta `wizard_resume_at: now()`, attempts:0). Caso Mira: pausou no passo 3 fechando Telegram, ficou 4+ dias sem nudge porque guard bloqueava
- Mapa tradução `{wizard_resume_step}` → linguagem natural (ex: `wizard-autonomia.passo3` → "passo 3 (autonomia)") em todas as 3 DMs canonical
- DMs incluem contagem `X/3` desde a 1ª tentativa pra aluno saber onde tá no ciclo

**`principios-defensivos.md`:**
- Princípio 13 ganha bloco "Protocolo de pause CORRETO (kit v2.5)": ao pausar, zerar `active_wizard` + zerar `wizard_resume_attempts: 0` + setar `wizard_resume_at`
- Princípio 11 ganha sub-seção "P11 forte ao detectar `wizard_resume_step`": wizards retomáveis aplicam detecção agressiva + sumarização em UMA mensagem (não re-narrar copy de promessa)

**`comandos-canonicos.md`:**
- Comando #8 (muda modo) ganha bloco "Classificação semântica (kit v2.5)": instrui agente a classificar intenção de mudar modo em paráfrases naturais e oferecer confirmação canonical, em vez de tratar como desvio. Patterns regex continuam aceitos pra alunos com jargão

### Lessons

1. **Análise crítica do próprio plano salva trabalho.** v2.5 inicialmente projetava 17 fixes em 6h. Re-analisar com lente cética cortou 3 hipotéticos, corrigiu 3 abordagens, resultou em 8 fixes em 4h. Lição: stress test produz lista; análise crítica produz roadmap.
2. **Bug arquitetural se resolve atacando a raiz, não o sintoma.** Item original 1 (timer 2h) era patch sobre patch. Raiz: protocolo de pause. Corrigir raiz cobre o sintoma e mais.
3. **Princípios universais devem nascer de evidência forte.** Helena é simulação adversarial. Adicionar P18 ("teto de insistência") sem caso real reportado é over-prevenção. Esperar tester real.
4. **Regex pra paráfrase é jogo perdido.** Modelos LLM classificam intenção semanticamente. SKILL.md instruir COMPORTAMENTO ("classifica + confirma canonical") é mais robusto que listar 30 variações.
5. **Mensagens hardcoded em 1 modo são bug latente.** Aluno em Modo B levando mensagem A0-A6 quebra promessa explícita do modo. Branching `if modo == 'wizard'` deve ser regra, não exceção.
6. **Path absoluto sempre.** Path relativo em comando shell é falha silenciosa esperando acontecer. `$WORKSPACE/` ou similar variable é trivial e cobre todos os casos (Managed, VPS root, local-dev, qualquer cwd).
7. **Stress test multi-persona round 2 capturou cenários round 1 não viu.** Round 1: Marina/Rodrigo/Carla/Pedro. Round 2: Letícia/Mira/Gustavo/Helena. Personas distintas captam buracos distintos.

### Build

Arquivos alterados (8):
- `skills/starter/onboarding-checklist/SKILL.md` — v2.0.1 → v2.1 (regra a/b ambígua)
- `skills/starter/onboarding-checklist/references/principios-defensivos.md` — P13 protocolo pause + P11 forte
- `skills/starter/onboarding-checklist/references/comandos-canonicos.md` — #8 classificação semântica
- `skills/starter/primeira-vitoria/SKILL.md` — v2.0 → v2.1 (4 variantes mensagem final + auto-arquivamento $WORKSPACE/)
- `skills/starter/wizard-autonomia/SKILL.md` — v1.5 → v1.6 (caminho local-dev 2c)
- `skills/starter/wizard-conectar/SKILL.md` — v1.6 → v1.7 (Chromium detecta ambiente)
- `skills/operacional/cron-resume-wizards/SKILL.md` — v1.1 → v1.2 (inferência silenciosa + tradução + X/3)
- `CHANGELOG.md` — entry [2.5]

Re-teste com agente limpo: previsto antes do build (processo da v2.4.1).

---

## [2.4.1] — 2026-05-03 (madrugada+ — patch UX entrada, validado por re-teste)

> **Patch — bug crítico reportado pelo Bruno em conta nova logo após v2.4: agente parava DEPOIS da boas-vindas, deixando aluno órfão.** Causa-raiz: cliffhanger "Agora deixa eu olhar..." sem texto canonical pra mensagem seguinte + ausência de instrução explícita de "MSG 1 + MSG 2 = mesmo turno". Validado por re-teste (agente "limpo" simulando flow real) ANTES do build.

### Trigger

Bruno testou v2.4 num agente real e reportou: agente recebeu zip, mandou boas-vindas universal, parou. Aluno ficou sem CTA. Mais 2 cosméticos: `Heads up` em inglês (anglicismo); email com `**bold**` virou link mailto duplo no bridge Telegram.

### Causa-raiz

3 problemas convergentes:

1. **Cliffhanger sem ação visível:** boas-vindas terminava com "Agora deixa eu olhar o que tem aqui no seu workspace pra escolher o melhor caminho..." — promessa narrativa sem texto canonical pra próxima mensagem
2. **Fluxo de turno ambíguo:** SKILL.md dizia "Após mandar essa mensagem, agente vai pra detecção de cenário" — ambíguo entre "processo interno silencioso" vs "próxima mensagem visível"
3. **Manifesto de abertura como instrução fantasma:** boas-vindas universal já cumpria o papel, mas a seção "Manifesto de abertura" continuava instruindo `carregar references/manifesto-abertura.md` — duplicação histórica documentada em v2.2.1

Pra confirmar antes do fix, **teste com agente limpo** (lendo SKILL.md sem viés) reproduziu o bug 1:1: parou exatamente após boas-vindas, com rationale honesto: "termina com cliffhanger" + "sem texto canonical de transição visível".

### Changed — 5 fixes em onboarding-checklist v2.0 → v2.0.1

1. **Bloco `## ⚠️ FLUXO DE TURNO (CRÍTICO — kit v2.4.1)` NOVO** — instrução explícita: "MSG 1 (boas-vindas) + Pré-Zero silenciosa + Fase Zero silenciosa + Verificação canal + MSG 2 (Pré-bifurcação Hotmart) = UM TURNO do agente, sem aguardar resposta entre eles". Diagrama de fluxo + falha real documentada.
2. **Boas-vindas: cliffhanger removido.** A frase "Agora deixa eu olhar o que tem aqui no seu workspace pra escolher o melhor caminho..." da v2.4 foi REMOVIDA. Boas-vindas termina agora em "Comunidade no Telegram: https://t.me/cursoopenclaw"
3. **Boas-vindas: cosmética (Bruno feedback):** `Heads up:` → `Aviso:` (anglicismo); email sem bold (Telegram bridge gerava `[[email](mailto:email)](mailto:email)` duplo no markdown)
4. **Seção `## Manifesto de abertura` marcada DEPRECATED** — comportamento NO-OP em v2.4.1: marca `kit_intro_done=true` mas NÃO carrega `manifesto-abertura.md` (boas-vindas já cumpre o papel; carregar geraria duplicação histórica documentada em v2.2.1). Razão de manter a seção (mesmo deprecated): leitores externos esperam encontrar essa seção no fluxo
5. **Pré-bifurcação ramo "avulso" ganha CTA Pixel Educação** — texto canonical (P15 literal) explica que kit faz parte do Mini-curso OpenClaw v2 e oferece link com UTM: `https://openclaw.pixeleducacao.com.br?utm_source=starter-kit&utm_medium=avulso&utm_campaign=v2.4.1`. Aluno avulso vira potencial comprador + Bruno mantém honestidade sobre escopo (kit configura ≠ curso ensina). Salva `pixel_cta_shown_at` em MEMORY pra debug.

### Validação por re-teste (NOVO no processo de release)

Antes do build do zip, agente "limpo" (sem contexto da nossa conversa) leu SKILL.md atualizada e simulou o fluxo. Resultado:

- ✅ MSG 1: boas-vindas com `Aviso:` (sem `Heads up`), email sem bold, sem cliffhanger
- ✅ Ações internas: Pré-Zero + Fase Zero silenciosas; Manifesto NO-OP
- ✅ MSG 2: Pré-bifurcação Hotmart com pergunta clara "tenho/avulso"
- ✅ Parou CORRETAMENTE aguardando resposta (não órfão)

Rationale do agente: "v2.4.1 endereça isso explicitamente com o bloco FLUXO DE TURNO. Eu segui essa correção."

### Lessons

1. **Re-teste antes do build é processo, não opcional.** v2.4 passou em stress test multi-persona mas falhou em conta real porque os agentes simulados liam SKILL.md inteira "querendo dar certo". Agente real lê literal e para no que parece "fim". Lição: SEMPRE testar com agente sem viés antes de buildar release.
2. **Cliffhanger narrativo é bug de UX em chat.** Texto que termina com "...vou olhar..." cria expectativa de ação visível em segundos. Se a ação é silenciosa, agente parece travado. Lição: textos canonical não devem terminar com promessas internas — só com pergunta clara ou afirmação fechada.
3. **Anglicismos cortam.** `Heads up` é casual em inglês mas estranho em PT-BR pra aluno PME. Lição: revisar texto canonical caçando termos estrangeiros que não acrescentam.
4. **CTA pra avulso é high-leverage.** Bruno levantou que aluno avulso é potencial comprador + honestidade sobre escopo. 1 mensagem canonical com link UTM resolve.
5. **Instruções fantasma envelhecem.** "Manifesto de abertura" foi necessário em v1.0 (antes de boas-vindas universal). v1.6 criou boas-vindas mas não removeu a instrução do manifesto — passou 6 meses gerando duplicação. Lição: quando substituir um conceito, marcar o antigo como DEPRECATED no mesmo PR (não só remover — leitores externos podem ainda esperar encontrar).

### Build

Arquivos alterados (2):
- `skills/starter/onboarding-checklist/SKILL.md` — v2.0 → v2.0.1 (FLUXO DE TURNO + boas-vindas + Manifesto deprecated + avulso CTA)
- `CHANGELOG.md` — entry [2.4.1]

Re-teste: agente "limpo" simulou fluxo, comportamento correto confirmado. Commits: TBD + zip v2.4.1.

---

## [2.4] — 2026-05-03 (madrugada — pós-stress test)

> **Stress test multi-persona com 4 agentes simulando cenários reais → 14 fixes cirúrgicos consolidados em uma única versão. Foco: aluno chega ao FIM do wizard, não só primeira vitória.** Bruno pediu análise adversarial antes de mais distribuição pros testers — em vez de esperar próximo bug real, simular 4 personas distintas (zero absoluto, workspace populado, pós-vitória, desviante caótico) e atacar lacunas observadas.

### Trigger

Bruno pediu stress test multi-persona pra validar v2.3 antes de distribuir. 4 agentes em paralelo simularam:

- **Marina** (35, e-commerce, Managed novo, kit avulso sem mini-curso)
- **Rodrigo** (28, dev backend, VPS root legado com workspace populado)
- **Carla** (40, criadora conteúdo, pós-vitória querendo Bloco B)
- **Pedro** (50, PME, caótico — 8 cenários de desvio)

### Causa-raiz comum

3 categorias de gap:

1. **Ordem/orquestração** (Pré-Zero rodava depois de Fase Zero — Cenário B sem `ambiente:` setado)
2. **Promessas não-cumpridas** (kit anunciava `ajuda` / `config` / URLs B1-D5 que não existiam)
3. **Edge cases não cobertos** (msg mista, aluno confuso pós-arquivamento, Brave 401 chave velha vs nova, fast-path Whisper só Managed)

### Changed — Grupo 1: Ordem + Entry point

**`onboarding-checklist` v1.9 → v2.0:**
- Fase Pré-Zero **REORDENADA** pra rodar ANTES da Fase Zero (Cenário A/B/C). Antes, Cenário B (workspace populado) era detectado sem ter `ambiente:` setado, então copy não podia adaptar a "VPS antigo" vs "Managed antigo"
- Pré-bifurcação NOVA: pergunta antes do a/b se aluno tem mini-curso comprado (login Hotmart) ou kit avulso. Aluno avulso → forçado pra Modo B + nota sobre Bloco B+ depender de comprar
- Tabela "Comandos canônicos" expandida pra 14 comandos (era 8) — inclui formalmente comandos Modo A v2 (9-12) + novos `ajuda` (13) + `config` (14)

**`primeira-vitoria` v1.7 → v2.0:**
- Mensagem final reescrita: terminologia A0-A6 (não "passo 0..6"), menção EXPLÍCITA a A6 ("você ainda não viu A6"), ponte HONESTA pro Bloco B ("kit acabou aqui — Hotmart conduz daqui, eu marco progresso"), `restaura manuais` lembrado nas opções avulsas

**`comandos-canonicos.md`:**
- Comando 13 (`ajuda`) NOVO — handler com menu enxuto agrupado por categoria (Jornada / Aulas / Setup / Conteúdo / Apoio)
- Comando 14 (`config`) NOVO — menu de áreas configuráveis com mapping pros wizards em modo edição

### Changed — Grupo 2: Continuidade pós-vitória

**`continuar-jornada` v1.1 → v1.2:**
- Tabela `bloco_aula → URL Hotmart` formalizada — todas apontam pra `https://app.hotmart.com/` (link específico está dentro da plataforma na descrição do módulo). Antes a skill prometia URL específica que não existia, agente alucinaria
- Branch NOVA "aluno confuso pós-arquivamento": detecta padrões de confusão (`?` `cadê` `perdi` `sumiu` `quebrou` `não acho`) E `kit_archived_at` setado E `mini_curso_progress: nada` → preempta explicando que arquivamento foi proposital + lembrando do `restaura manuais`. Antes Pedro voltava 2 dias depois e achava que app quebrou
- Estado adicional na tabela "🟣 Aluno confuso pós-arquivamento" (prioridade 0)

### Changed — Grupo 3: Detecção/credenciais

**`wizard-whisper-quick` v1.11 → v1.12:**
- Fast-path agora INDEPENDENTE de ambiente — antes só ativava se `ambiente: managed`. Stress test Rodrigo (VPS root com chave válida em .env) revelou: aluno era re-entrevistado mesmo já tendo chave funcionando. Condicional `if ambiente == managed` excluía 15k VPS legados sem motivo
- Nova condição: chave em env var OR .env → smoke test → HTTP 200 → pula entrevista. Mensagem narrativa adapta-se ao ambiente detectado, mas decisão é única

**`wizard-conectar` v1.5 → v1.6:**
- Brave 401 ramo dedicado: distingue "chave que aluno acabou de colar errado" (volta pro passo) de "chave PRÉ-EXISTENTE no .env que retornou 401" (revogada/expirada — instrui revogar + regenerar). Antes ambos caíam em "tenta de novo"
- PAT browser local: 1 frase clara antes do tutorial de geração — "tutorial é executado no SEU navegador (laptop/desktop), não na máquina onde o agente roda". Caso Rodrigo VPS root SSH sem GUI

### Changed — Grupo 4: Princípios + Guard Rail

**`principios-defensivos.md`:**
- P13 estendido com categoria **(c3) Mensagem mista** — quando aluno manda 1 mensagem com resposta parcial + desvio adicional (ou múltiplas perguntas distintas), agente processa só a parte (a) que responde o passo, anota o resto em pendências, repete pergunta original LITERAL. Caso real Pedro: `"renomear pasta pra PT? E que hora roda backup?"` — antes agente respondia as 2 longamente e perdia foco do passo

**`comandos-canonicos.md`:**
- Seção NOVA "Regra geral de matching" — patterns são regex case-insensitive com flexões (gerundivos, plurais, conjugações). Pattern do comando 4 (Reativar) atualizado pra cobrir `retomar/retomamos/retomei/retoma/retomo` + variações de `voltar/voltamos/continuar/continuamos`. Fix caso Pedro: `"eae, retomamos?"` casa agora

### Changed — Grupo 5: Wizards específicos

**`wizard-agente` v1.1 → v1.2:**
- Mensagem padrão "100% pronto" reescrita pra oferecer P6 EXPLICITAMENTE (preservar/ajustar/refazer) quando IDENTITY/SOUL/AGENTS preenchidos com conteúdo manual. Antes pulava direto pra pergunta-âncora. Caso Rodrigo (VPS root legado, IDENTITY editado manualmente): aluno NUNCA via opção de modificar trabalho prévio

**`cron-resume-wizards` v1.0 → v1.1:**
- Schedule passou de 1x/dia (09:00 BRT) pra **2x/dia (09:00 + 19:00 BRT)**. Caso Pedro: pausou wizard às 16h falando "volto à noite" → DM antes só na manhã seguinte (~17h depois). 2 ciclos cobrem manhã + noite. Crontab/systemd timer atualizados

### Lessons

1. **Stress test multi-persona substitui rodada de testers reais quando design tá maduro.** v2.1-v2.3 cresceu reagindo a feedback real (caso por caso). v2.4 antecipa categorias de gap por simulação adversarial. Lição: depois de 5+ versões reagindo, vale uma versão proativa antes da próxima distribuição.
2. **Promessa não-cumprida é pior que opção a menos.** `ajuda` e `config` apareciam na mensagem final há versões mas nunca tinham handler — aluno mandava, caía em fallback genérico, sensação de "wizard quebrado". Lição: mensagem canonical deve listar SÓ comandos que existem; novos comandos viram entradas em `comandos-canonicos.md` ANTES de aparecer em texto pro aluno.
3. **Condicional `ambiente: managed` excluía 15k VPS legados sem razão.** Fast-path Whisper deveria ser sobre "chave válida configurada" (universal), não sobre Managed. Lição: condicionais de ambiente devem proteger comportamento que é genuinamente diferente — não bloquear capacidade que é a mesma em todo lugar.
4. **Mensagem mista é categoria distinta de desvio.** P13 antigo cobria (a)/(b)/(c1)/(c2) mas não combinações. Aluno caótico (Pedro 50 anos PME) manda "Tina, e quero Google Calendar" 80% do tempo. Lição: princípios defensivos precisam de revisão periódica conforme novos padrões de uso emergem.
5. **Auto-arquivamento confunde aluno que volta dias depois.** v1.7 (kit v2.2 final) anunciava arquivamento na boas-vindas + na mensagem final, mas Pedro de 50 anos com TDAH não lembra. Lição: detecção PROATIVA de confusão (`?/cadê/perdi/sumiu`) + `kit_archived_at` setado é cura na camada de continuar-jornada.
6. **Stress test não substitui tester real, mas pega 80% dos buracos arquiteturais.** As 4 personas simuladas em paralelo identificaram 17 bugs reais (descartamos 3 over-engineering); só os 14 cirúrgicos viraram v2.4. Lição: quando 2+ agentes adversariais convergem no mesmo bug, é bug real (Marina + Carla → A6 órfã pós-vitória).

### Build

Arquivos alterados (10):
- `skills/starter/onboarding-checklist/SKILL.md` — v1.9 → v2.0 (reorder Pré-Zero, pergunta Hotmart, tabela 14 comandos)
- `skills/starter/onboarding-checklist/references/comandos-canonicos.md` — comandos 13/14 + regra matching regex
- `skills/starter/onboarding-checklist/references/principios-defensivos.md` — P13 estendido (c3) msg mista
- `skills/starter/primeira-vitoria/SKILL.md` — v1.7 → v2.0 (mensagem final A6 + ponte honesta)
- `skills/starter/continuar-jornada/SKILL.md` — v1.1 → v1.2 (tabela URL Hotmart + branch confuso pós-arquivamento)
- `skills/starter/wizard-whisper-quick/SKILL.md` — v1.11 → v1.12 (fast-path independente de ambiente)
- `skills/starter/wizard-conectar/SKILL.md` — v1.5 → v1.6 (Brave 401 ramo dedicado + PAT browser local)
- `skills/starter/wizard-agente/SKILL.md` — v1.1 → v1.2 (P6 oferecer no caminho "100% pronto")
- `skills/operacional/cron-resume-wizards/SKILL.md` — v1.0 → v1.1 (2 ciclos diários 09 + 19)
- `CHANGELOG.md` — entry [2.4]

Commits: TBD (~10 arquivos código) + TBD (zip v2.4) + TBD (salve consolidado).

---

## [2.3] — 2026-05-03 (noite tarde)

> **Modo A reformulado pra espelhar aulas 1:1 (não passos do kit) + Fase Pré-Zero (detecção de ambiente como pré-requisito) + 2 fixes críticos** (Brave URL + Whisper env var). Versão grande dedicada ao Modo A — Bruno: "minha maior dúvida tá no Modo A, tem que estar bem alinhado com as aulas".

### Trigger consolidado

**A) Pergunta arquitetural (Bruno simulação Modo A):** *"o aluno vai estar vendo o video e aplicando as coisas no agente. Enquanto o que ele vai fazer em paralelo? Como o wizard vai guiar ele? Precisa estar bem alinhado com as aulas."* → Modo A v1 era checklist de "passos do kit" (0-6), aluno tinha que fazer mapping mental aula↔passo (N:M, não 1:1). Confuso.

**B) Bug crítico do fast-path Managed (Bruno mesma sessão):** wizard-whisper-quick v1.10 disse "Procurei uma chave OpenAI no .env e não encontrei" mesmo em Managed. Causa-raiz dupla:
1. Flag `ambiente: managed` só era setada por wizard-autonomia (passo 3) — Whisper é passo 0, fast-path nunca disparava
2. Chave Managed fica em env var do processo (`$OPENAI_API_KEY`), não em `.env` do workspace — wizard só lia arquivo

**C) Bug Brave Search (Bruno conta nova):** URL `https://api.search.brave.com/app/keys` dava 403 pra aluno SEM conta. Plus o wizard afirmava "free tier sem cartão" mas Brave atualmente exige cartão pra ativar plano free.

**D) Feedback Adrylan (retroativo v2.1):** 3 bugs reportados — todos JÁ FIXADOS em v2.2/v2.2.1, mas reforça que cure em camadas (P13/14/15/16/17 + auto-arquivamento + fast-path) ataca a raiz certa.

### Causa-raiz comum

**B + Modo A** convergem: detecção de ambiente é precondição global do kit. v2.1 introduziu Princípio 11 estendido (detectar ambiente/OS/package_manager) mas só wizards específicos faziam — ordem dos wizards quebrava. v2.3 promove detecção pra **Fase Pré-Zero da onboarding-checklist** (antes de qualquer wizard, antes de bifurcação de modo).

### Changed — Modo A v2 (espelho 1:1 com aulas)

**`onboarding-checklist` v1.8 → v1.9:**

- **Fase Pré-Zero (NOVA):** detecção de ambiente silenciosa antes de Verificação de canal. Sinais: path do workspace, arquivos config OpenClaw, env vars. Seta `ambiente: managed | vps-root | local-dev | unknown` + `managed_has_openai_envvar: bool` em MEMORY. Roda em ~1s.
- **Modo A reescrito:** checklist agora espelha aulas A0-A6 do mini-curso (não "passos do kit" 0-6). Cada aula tem submenu próprio em `references/aula-menus.md` (NOVO). Submenus podem ter 1+ módulos (A2 = 2, A4 = 3). Aluno controla ritmo (tudo de uma vez OU um por vez OU pausar).
- **Passo 0 invisível em Managed:** se Fase Pré-Zero detectou Managed + chave OpenAI em env var, A0 NÃO aparece como item de configuração — vira "✓ áudio já tá funcionando". Reduz fricção mental do aluno em Managed (caso comum).
- **4 comandos canonical novos** (em `comandos-canonicos.md` 9-12):
  - `abre A{X}` → abrir submenu da aula
  - `vi A{X}` → marcar aula como assistida (rápido pra pré-req e A6)
  - `vou assistir A{X}` → auto-pause (agente "espera junto" enquanto aluno assiste vídeo)
  - `travei na A{X}` → ajuda contextual durante o vídeo

### Changed — Fast-path Managed corrigido

**`wizard-whisper-quick` v1.10 → v1.11:**

- Fast-path agora checa em 2 fontes: PRIMEIRO env var do processo (`$OPENAI_API_KEY` — fonte primária em Managed), DEPOIS `.env` do workspace (fonte primária em VPS root / local-dev)
- Pré-condição: lê `ambiente:` em MEMORY (setada pela Fase Pré-Zero da v1.9, kit v2.3+)
- Em kit v2.2 ou anterior (sem Fase Pré-Zero), wizard cai no fluxo normal de entrevista — degradação graciosa

### Changed — Fix Brave Search

**`wizard-conectar` v1.4 → v1.5:**

- URL primária pra criar conta: `https://brave.com/pt-br/search/api/` (homepage com "Get Started" — funciona pra aluno SEM conta)
- URL secundária (gerenciar chaves, pós-login): `https://api.search.brave.com/app/keys` (essa dá 403 pra aluno sem conta — usar SÓ depois do login)
- Disclaimer claro: "Brave vai pedir cartão de crédito pra ativar plano Free. Não cobra nada se ficar dentro do free tier (~2k queries/mês), mas cartão é obrigatório no cadastro."
- Aviso anterior corrigido: "5k queries/mês free" + "sem cartão" → "~2k queries/mês free" + "cartão obrigatório no cadastro"

### Changed — Refs novos / atualizados

- **NOVO:** `references/aula-menus.md` — mapping aula → submenu de configuração com cada aula (A0-A6) detalhada
- `references/comandos-canonicos.md` ganhou 4 comandos (9-12) + tabela resumo expandida
- `references/checklist-template.md` ganhou seção "Modo A v2 — Template de checklist por aulas"; template antigo de "passos" marcado como DEPRECATED (mantido pra histórico)

### Lessons

1. **Detecção de ambiente é precondição GLOBAL, não local.** v2.1 introduziu P11 estendido em wizards específicos. v2.3 promove pra Fase Pré-Zero da onboarding-checklist. Lição: precondições compartilhadas devem viver no orchestrator, não em cada skill filha.
2. **Env var ≠ arquivo `.env`.** Plataformas Managed (Hostinger) usam env var do processo pra chaves; só ler `.env` é incompleto. Skills que dependem de credencial devem checar AMBOS.
3. **Espelhar a estrutura mental do aluno.** Modo A v1 forçava aluno a mapear "aula A2 → passos 1+2 do kit" — overhead cognitivo. Modo A v2 usa o mesmo número (A2 = aula A2 com submenu de 2 módulos). Lição: estrutura interna do produto não precisa vazar pra UX.
4. **URLs de produtos third-party envelhecem.** Brave mudou política (cartão obrigatório no free) sem aviso. Ler texto canonical do wizard com olho crítico a cada release. Lição: incluir "verificar se URLs e políticas dos third-parties ainda batem com o texto" em release checklist.
5. **Aulas pré-req merecem espaço próprio.** Modo A v1 dizia "passa direto" pra A1/A3 — aluno se sentia ignorado. Modo A v2 dá submenu de "consolidação" com pergunta-âncora opcional. Sensação de "aula contou".

### Build

Commits: TBD (~10 arquivos: aula-menus.md NOVO + onboarding-checklist v1.9 + wizard-whisper-quick v1.11 + wizard-conectar v1.5 + comandos-canonicos.md + checklist-template.md + 2 registries + CHANGELOG + memory + decisoes + projects/_index) + TBD (zip v2.3).

---

## [2.2.1] — 2026-05-03 (noite)

> **Patch — 3 bugs agudos detectados pelo Bruno em conta nova logo após v2.2 final+.** Fix de UX em entrada do kit (boas-vindas duplicada + comando `sobre` não retornando + manifesto técnico demais). Sem mudança de comportamento de skills funcionais — só corrige experiência inicial.

### Trigger

Bruno testou v2.2 final+ em conta Hostinger nova (03/05 noite). Detectou 3 bugs:

1. **Boas-vindas DUPLICADA:** agente mandou a Boas-vindas universal (oficial v2.2) + a "Versão curta (primeira mensagem)" do `manifesto.md` em sequência. 2 textos de abertura redundantes.
2. **Comando `sobre` não retorna pra pergunta original de bifurcação:** após mostrar manifesto completo, agente improvisou fechamento "Bora começar pelo passo 0 ou ir direto pro passo 1?" em vez de **repetir LITERAL** a pergunta a/b ("assistindo aulas em paralelo OU direto sem aulas?"). Aluno ficou perdido — jornada truncada.
3. **Manifesto técnico demais:** Carta do Bruno tinha 4 seções técnicas ("Filosofia operacional", "O que esse kit NÃO é", "O que esse kit É", "O que vem na v2 do kit") com vocabulário interno (Managed-first, Whisper, Brave Search, gera-imagem, gpt-image-1) escapando pro aluno. Bruno: "muito técnico, tem que ser focado em experiência, e não no que ele vai fazer".

### Causa-raiz

Bug 1 e 3 têm a mesma raiz: **`manifesto.md` ainda tinha a "Versão curta (primeira mensagem)" que era LEGADO do design pré-v1.6 do kit.** Quando criamos a "Boas-vindas universal" na `onboarding-checklist` v1.6 (Onda 8), deveríamos ter removido a Versão curta do manifesto — não removemos. v2.2 manteve as duas. Resultado: agente entregou as duas em sequência.

Bug 2 é falha de design no fluxo de bifurcação de modo: `sobre` não estava classificado explícitamente como comando canonical no schema do P13/P15. Agente improvisou fechamento — exatamente o tipo de falha que P13 (Guard Rail) deveria prevenir, mas só estava aplicado dentro de wizards filhos, não no fluxo de bifurcação.

### Changed

**`manifesto.md` reescrito (v2.2 → v2.2.1):**
- ❌ Removida seção "Versão curta (primeira mensagem do agente)" — era legado pré-v1.6, gerou duplicação
- ❌ Removidas 4 seções técnicas: "Filosofia operacional" (Managed-first, primeira vitória, agente como funcionário digital), "Onde isso encaixa no mini-curso" com Bloco A/B/C/D/E/R, "Como o kit foi pensado" com 4 princípios técnicos, "v2 roadmap" com gera-imagem/gpt-image-1
- ✅ Reescrito em ~25 linhas (era ~85) focado em **experiência**:
  - "Pra quem é isso" — perfil do aluno alvo (empreendedor solo, dono de PME, criador)
  - "A tese" — uma frase forte sobre construir SEU agente vs USAR ChatGPT
  - "O que muda na sua vida" — transformação concreta (sócio operacional vs assistente que esquece)
  - "Em testes" — 3 caminhos de feedback (rápido / galera / direto pro Bruno)
  - "Pra ficar perto" — YouTube + Telegram
- Carta termina simples: "Espero que você aproveite a jornada. — Bruno"

**`onboarding-checklist` v1.7 → v1.8 — bloco de comandos canonical na bifurcação de modo:**

Adicionado bloco "⚠️ Comandos canonical aceitos durante essa pergunta de bifurcação" depois da pergunta a/b com schema explícito:

| Comando | Ação |
|---|---|
| `sobre` | Carrega manifesto.md + **REPETE LITERAL** a pergunta original |
| `faq` | Carrega FAQ.md + repete LITERAL a pergunta |
| Pergunta tangencial | 1 linha de resposta + repete LITERAL |
| Desvio total | Anota em `## Perguntas pendentes` (MEMORY.md) + repete LITERAL |

Padrão de repetição documentado pra agente não improvisar.

### Lessons

1. **Legado do design antigo é dívida visível.** "Versão curta (primeira mensagem)" do manifesto deveria ter sumido na v1.6 quando a Boas-vindas universal foi criada. Sobreviveu 6 meses gerando duplicação. Lição: quando um conceito é substituído, REMOVER o antigo no mesmo PR.
2. **P13 (Guard Rail) precisa cobrir bifurcações também, não só wizards.** Hoje P13 protege wizards filhos. Bifurcação de modo (a/b) é um "wizard de fato" — comandos canonical devem ser explícitos pra evitar improvisação.
3. **Manifesto é EXPERIÊNCIA, não FEATURE LIST.** Aluno na primeira leitura quer entender "isso é pra mim?", não "como o kit foi arquitetado". Detalhes técnicos viram fricção. Lição vale pra qualquer copy de venda — features atrás de transformação.
4. **Testar em conta nova captura coisas que reteste em conta antiga não captura.** Bruno em conta nova viu duplicação imediata; testers anteriores estavam em contas com state já populado e não pegaram.

### Build

Commits: TBD (3 arquivos: manifesto.md reescrito + onboarding-checklist v1.8 + starter/_registry.md) + TBD (zip v2.2.1).

---

## [2.2] — 2026-05-03 (tarde)

> **Onda 14 unificada — 3 frentes integradas.** Originalmente planejada como "auditoria de wizards + cron-DM ativo". Mid-flight foi UNIFICADA com 2 feedbacks reais do mesmo dia: NC (entry point) + Adrylan (formatação Telegram). Resultado: 2 princípios novos (P16 + P17) + auditoria + cron-DM + renomeação de entry point.

### Trigger consolidado

**Componente A — Auditoria planejada (sem trigger reativo):** v2.1 introduziu Princípios 13/14/15 em `principios-defensivos.md`, mas só `wizard-conectar v1.4` aplicava explicitamente no topo. Os outros 7 wizards filhos eram herdeiros silenciosos — agente que abria SKILL.md de wizard-agente não via os guard rails. Auditoria pendente desde a Onda 11.

**Componente B — Cron-DM ativo planejado:** v2.1 implementou cron PASSIVO (`wizard_resume_at` detectado quando aluno volta naturalmente). Cron ATIVO (DM proativa) ficou pendente — depende de cron-worker no Managed + systemd no VPS root.

**Componente C — Feedback do tester NC (03/05):** aluno NC entregou o zip v2.1 ao próprio agente. Agente respondeu:

> *"Recebi o starter kit e dei uma olhada rápida: tem instruções, templates de identidade/SOUL/USER, exemplos e skills. Posso usar isso como base pra nossa configuração inicial. Mas antes preciso de uma escolha tua: você quer que eu siga o wizard do kit e vá te perguntando passo a passo, ou prefere que eu proponha uma identidade inicial pra mim e você só ajusta?"*

Bug arquitetural exposto: agente leu `INSTRUCOES-PARA-AGENTE.md` + viu o kit, mas em vez de invocar `onboarding-checklist` IMEDIATAMENTE, criou **escolha falsa** (wizard formal vs improvisação disfarçada de "atalho conveniente"). A 2ª opção quebra Princípio 1 (modificar arquivo raiz sem backup nem entrevista canônica).

**Componente D — Feedback do tester Adrylan Viana (03/05 tarde, mesmo build):** Adrylan reportou via Telegram *"@obrunookamoto os textos ficam quebrados, tem como melhorar isso?"* + screenshot do agente do NC mostrando a boas-vindas universal com hard-breaks visíveis no Telegram desktop. Frase "É o primeiro experimento da Pixel onde o" quebrava no meio do parágrafo, "conteúdo do mini-curso" começava na linha seguinte.

Causa-raiz: mensagens canonical em SKILL.md foram escritas com quebras manuais a cada ~70 chars (estilo "leitura no editor markdown"). Telegram preserva hard-breaks mesmo em telas mais largas que a quebra original. Lia/Mira/Dr. Thiago testaram em celular onde a quebra coincidia com largura natural — não viram. Adrylan testou em desktop e capturou.

### Causa-raiz

Os 4 componentes convergiram pra 2 raízes:

**Raiz 1 (componentes A/B/C):** agente esperto sempre acha um jeito de "consultar antes" se não for proibido EXPLICITAMENTE.
- P13/14/15 protegem DENTRO dos wizards (resposta correta quando aluno desvia)
- Mas NADA protegia a CAMADA ANTERIOR — primeira mensagem do agente quando recebe o kit
- v1.4 introduziu `INSTRUCOES-PARA-AGENTE.md` (entry point), mas o tom era defensivo ("não improvise") sem fixar a primeira ação obrigatória
- Agentes leram, viram que tinha wizard, e ainda assim "consultaram" o aluno antes de invocar

**Raiz 2 (componente D):** mensagens canonical viviam em SKILL.md formatadas pra leitura humana no editor (~70 chars/linha), não pra renderização em cliente Telegram. Hard-breaks preservavam em telas largas — bug visual sistemático em 12 SKILL.md mas só 1 reportado (canal de feedback dependia de tester usar desktop + reparar + reportar).

### Changed — 2 NOVOS PRINCÍPIOS UNIVERSAIS

**Princípio 16 — Entry point literal (sem improvisar primeira mensagem)** — em `principios-defensivos.md`

- Quando agente detecta arquivos do kit (zip extraído OU `0-LEIA-PRIMEIRO-AGENTE.md` + `skills/starter/onboarding-checklist/SKILL.md`), próxima ação OBRIGATÓRIA: Read da onboarding-checklist + invocar
- Primeira mensagem ao aluno = renderização literal da seção "Boas-vindas universal" (P15 aplicado ao entry point)
- PROIBE: "dei uma olhada rápida", "posso usar isso como base", "quer wizard ou prefere que eu proponha identidade?", "antes de começar qual seu nome?", modificar arquivos raiz antes da onboarding-checklist despachar wizards
- PERMITE: invocar onboarding-checklist imediatamente, pedir esclarecimento ao próprio kit (P7), reusar dados do contexto DENTRO dos wizards (P11)

**Princípio 17 — Formatação Telegram-friendly em mensagens canonical** — em `principios-defensivos.md`

- TODA mensagem canonical destinada ao aluno via plataforma com word-wrap automático (Telegram, WhatsApp, Slack, email) usa: parágrafos contínuos (1 linha por parágrafo), separação por linha em branco, listas explícitas com `-`/`•`/numéricas, code blocks pra comandos, bold/italic moderado
- PROIBE: quebrar parágrafos a cada ~70 chars manualmente, tags HTML (`<br>`), múltiplos espaços pra alinhar, tabs pra indentação
- Aplica em 12 SKILL.md (mensagens visíveis pro aluno): onboarding-checklist (boas-vindas + Cenário B), 7 wizards filhos, primeira-vitoria, continuar-jornada, gera-log-jornada, cron-resume-wizards (3 DMs), wizard-whatsapp
- Categoria diferente de P15: P15 é textual (palavra certa), P17 é visual (renderização certa)

### Changed — Reescrita das mensagens canonical (P17 aplicado)

- **Boas-vindas universal** da `onboarding-checklist` reescrita com parágrafos contínuos (caso reportado por Adrylan, fix imediato) + ganhou parágrafo "Sobre o kit" prometendo zero-lixo (não mexe em nada existente, auto-arquiva manuais no fim)
- **Cenário B (3 caminhos)** da `onboarding-checklist` reescrita (Caminho 1 + parte do Caminho 2)
- **DMs canonical da `cron-resume-wizards`** validadas — já estavam OK (parágrafos curtos + listas explícitas)
- **4 opções pós-vitória da `primeira-vitoria`** validadas — já estavam OK (listas com `→`)
- 8 wizards filhos: linha de P17 adicionada no header + referência atualizada pra `(P1–P17)`. Reescrita interna das mensagens (pergunta-âncora, narrativa de cada passo) fica pra próxima iteração se aparecer feedback de tester em desktop

### Changed — Auto-arquivamento de material de instalação (sentimento de zero-lixo)

**`primeira-vitoria` v1.6 → v1.7:**

Trigger: feedback Bruno (03/05 tarde tarde) — "incluir nas boas-vindas que o kit não mexe em nada da configuração do agente e que no final é automaticamente deletado, só fica o que o usuário configurar — gera sentimento de segurança."

Mudança em 2 frentes:

1. **Boas-vindas universal** (na `onboarding-checklist`): novo parágrafo "Sobre o kit" prometendo (a) que o kit não mexe em nada existente, só adiciona com autorização passo a passo; (b) que ao fim, manuais/exemplos/FAQ vão automaticamente pra `archive/` (não somem de vez); (c) workspace ativo só fica com o que aluno configurou + skills novas.

2. **Auto-arquivamento real** no passo 11 da `primeira-vitoria` (era só "Renderizar checklist final"; agora é "11a. Auto-arquivar + 11b. Renderizar"):
   - Comando bash literal documentado pro agente executar (P14 — smoke test visível)
   - Move `0-LEIA-PRIMEIRO-AGENTE.md`, `README.md`, `CHANGELOG.md`, `FAQ.md`, `manifesto.md`, `exemplos/`, `templates/` pra `archive/starter-kit-onboarding-{data}/`
   - **NÃO move** `starter-kit/skills/` — skills funcionais já estão em `workspace/skills/` ativas
   - Listing literal do que foi arquivado (`ls -la archive/...`) mostrado ao aluno
   - Flags em MEMORY.md: `kit_archived_at`, `kit_archive_path`, `kit_archived_files`
   - Best-effort: se algum mv falhar, registra em log e continua. Auto-arquivamento não bloqueia checklist final.

**Substituição na lista de opções avulsas pós-vitória:**
- ❌ ~~"Arquivar o material de onboarding e deixar workspace limpo? — manda 'arquiva onboarding'"~~ (era opção em v1.6)
- ✅ "Mudou de ideia sobre o arquivamento? Trazer manuais de volta? — manda `restaura manuais`" (v1.7 — é exit hatch, não comportamento padrão)

**Comando `restaura manuais` (passo 11c, novo):**
- Lê `kit_archive_path` em MEMORY.md
- Move arquivos de volta de `archive/...` pra `starter-kit/`
- Atualiza MEMORY: remove flags `kit_archived_*`, adiciona `kit_restored_at: {timestamp}`
- Mensagem: "✅ Manuais de volta. Manda 'arquiva manuais' pra arquivar de novo."

**Por que importa:** sentimento de segurança ("não vai mexer no meu setup") + zero-lixo ("não vai deixar resíduo"). Aluno avisado na boas-vindas (P1 — consentimento informado), executado no fim (P14 — comando + output literal), reversível (`restaura manuais`).

### Changed — Fast-path Managed em wizard-whisper-quick (insight Bruno 03/05)

**`wizard-whisper-quick` v1.9 → v1.10:**

Trigger: insight Bruno (03/05 tarde tarde) — *"no manage openclaw, quando vc vai instalar ele, ele já pede chave api da openai. Então podemos ver se a pessoa tá usando manage e só verificar se ela tem a chave mesmo."*

Causa: setup do OpenClaw Managed (instalação 1-click pelo painel Hostinger) **exige chave OpenAI** durante a instalação inicial. Logo, todo aluno em Managed JÁ TEM `OPENAI_API_KEY` em `.env` por construção. Wizard atual perguntava mesmo assim — ineficiência.

Mudança:
- Detecta `ambiente: managed` em MEMORY.md (flag setada por wizard-autonomia v1.4+ ou pelo próprio whisper-quick se for primeiro)
- Se Managed: pula entrevista, vai direto pro smoke test (`curl /v1/models` → HTTP 200)
- Mensagem canonical de "✓ Detectei sua chave OpenAI vinda do setup Managed..." reaproveita posicionamento (aluno entende: agente é esperto, não pede o que ambiente já deu)
- Se HTTP ≠ 200 (raro em Managed — chave removida manualmente): cai no fluxo normal de entrevista, mas com mensagem explicativa
- Se `ambiente: vps-root` ou `local-dev`: comportamento atual (entrevista canonical)

Impacto: wizard-whisper-quick reduz de ~5min pra ~15s no caso comum (Managed). Aproveita Princípio 11 estendido (detecção de ambiente) que já tava implementado na v2.1 — agora paga dividendo.

**Por que importa:** P11 estendido protege contra "instruir comando errado pra ambiente errado". Fast-path Managed protege contra "perguntar coisa que ambiente já deu". Mesma raiz (detectar antes), aplicação diferente (instruir vs perguntar).

### Changed — Auditoria de Princípios 13/14/15 (Onda 14 original)

**Header padrão de Princípios 13/14/15** adicionado no topo de **8 wizards/skills filhos** (todos exceto wizard-conectar v1.4 que já tinha versão expandida):

| Wizard | Versão antiga → nova | Mudança |
|---|---|---|
| `wizard-agente` | v1.0 → **v1.1** | Header + bloco anti-presunção (P16) |
| `wizard-aluno` | v1.0 → **v1.1** | Header + bloco anti-presunção (P16) |
| `wizard-workspace` | v1.0 → **v1.1** | Header padrão |
| `wizard-autonomia` | v1.4 → **v1.5** | Header padrão (já tinha bifurcação P11 estendida) |
| `wizard-whisper-quick` | v1.8 → **v1.9** | Header padrão (já tinha aviso "não improvise" + P11) |
| `primeira-vitoria` | v1.5 → **v1.6** | Header padrão (já tinha 3 critical guards) |
| `continuar-jornada` | v1.0 → **v1.1** | Header (skill é `complete_active`, P13 não-bloqueante) |
| `gera-log-jornada` | v1.0 → **v1.1** | Header (skill já obediente a P14 — "nunca inventar dado") |

Template reutilizável em [`onboarding-checklist/references/wizard-header-template.md`](skills/starter/onboarding-checklist/references/wizard-header-template.md).

### Changed — Skill operacional NOVA (cron-DM ativo)

**`cron-resume-wizards` v1.0** (em `skills/operacional/cron-resume-wizards/`):
- Cron 1x/dia (default 09:00 BRT) que lê MEMORY.md, detecta `wizard_resume_at` vencido, dispara DM canônica no Telegram
- 3 mensagens canonical por tentativa (1 leve / 2 direto / 3 último aviso)
- Anti-loop: max 3 tentativas (`wizard_resume_attempts`), depois marca `wizard_dismissed: true`
- Detecta `active_wizard != null` antes de mandar — NÃO interrompe wizard ativo
- Smoke test obrigatório de canal Telegram (P14) antes de cada DM
- Configurações por ambiente:
  - **Managed:** `openclaw cron create --name "Cron Resume Wizards" --schedule "0 9 * * *" --skill cron-resume-wizards`
  - **VPS root:** systemd timer `openclaw-resume-wizards.timer` ou crontab regular
- Log auditável em MEMORY.md (`## Cron log` — últimas 90 linhas)

### Changed — Renomeação + entry point reforçado

**`INSTRUCOES-PARA-AGENTE.md` → `0-LEIA-PRIMEIRO-AGENTE.md`:**
- Prefixo `0-` força ordem alfabética prioritária — agente que lista raiz do kit vê esse arquivo primeiro
- Auto-referência atualizada
- 4 referências externas atualizadas (README, manifesto, onboarding-checklist, principios-defensivos)
- CHANGELOG e _registry preservam menções históricas ao nome antigo

**`README.md` reescrito o bloco do agente** com:
- Bloco "Princípio 16" no topo
- Lista de 8 improvisações reais observadas (vs anteriores: lista genérica)
- 5 cases reais nominais (Lia, Mira, Dr. Thiago, Adrylan, NC)

**`0-LEIA-PRIMEIRO-AGENTE.md` ganhou tabela "Improvisações observadas em testes":**
- 6 cases categorizados (1 por tester) com data, o que agente fez, o que deveria ter feito
- Padrão: cada improvisação virou versão nova do kit. NC virou v2.2 + P16

**`onboarding-checklist` ganhou aviso de Boas-vindas canonical (P15+P16):**
- Bloco no topo: "Boas-vindas universal abaixo é texto LITERAL — quando agente invoca esta skill, renderiza essa boas-vindas SEM preâmbulo, SEM versão resumida"

**`wizard-agente` + `wizard-aluno` ganharam bloco anti-presunção:**
- "NÃO presumir [identidade do agente / dados do USER] baseado em conversa anterior"
- Mesmo que aluno tenha mencionado nome/profissão antes, começar pela Detecção (P11)
- Pré-preenchimento sem validação = erro em 2 dias

### Lessons

1. **Cura na camada anterior é necessária.** P13/14/15 protegem DENTRO dos wizards, mas agente esperto sempre improvisa NA CAMADA ANTERIOR (entry point). P16 fecha esse loophole.
2. **Cura na camada DE OUTPUT também é necessária.** P15 garante palavra certa. P17 garante visual certo. Categorias diferentes — formatação Telegram não cabia em P15 sem inflar.
3. **Onda planejada + 2 testers reais → versão unificada.** Originalmente Onda 14 era 2 frentes (auditoria + cron-DM). Feedback NC justificou +1 frente (P16). Feedback Adrylan justificou +1 frente (P17). Tudo no mesmo dia, mesmo build. Fragmentar em v2.2/v2.3/v2.4 seria fricção desnecessária.
4. **Renomeação alfabética é fix barato e forte.** `0-LEIA-PRIMEIRO` aparece antes de `BUILD`, `CHANGELOG`, `FAQ`, `README` no listing. Custo: atualizar 4 referências. Benefício: agente vê arquivo primeiro independente de qual ferramenta usa pra explorar o kit.
5. **Casos nominais > regras genéricas.** "Não improvise" é abstrato. "NC, 03/05: 'wizard ou identidade?' — escolha falsa" é concreto. Tabela de improvisações observadas com 6 cases é mais persuasiva que princípio sem exemplo.
6. **Auditoria de princípios é trabalho periódico.** Princípios entram em `principios-defensivos.md` na hora — mas wizards filhos nem sempre são bumped imediatamente. v2.2 fechou backlog herdado da Onda 11 + 12 + 13.
7. **Tester em desktop captura bugs que tester em mobile não vê.** Lia/Mira/Dr. Thiago testaram em celular — quebra hard coincidia com largura natural, parecia OK. Adrylan testou em desktop (chat ~1200px) e capturou. Lição: pedir tester explícito de desktop em próximas rodadas.

### Build

Commits: TBD (código v2.2 — 8 wizards atualizados + 1 skill nova + 4 arquivos com referências atualizadas + renomeação git mv + 5 arquivos canônicos novos/reescritos + CHANGELOG + 2 registries + MAPA) + TBD (zip).

---

## [2.1] — 2026-05-03

> **Renomeação de versão:** essa versão originalmente seria v1.10 (depois v2.0 que nunca chegou a ser distribuída) mas foi renomeada pra v2.1 (Bruno: "vamos chamar de v2.1, marcar fechamento de capítulo"). v1.0 era kit básico de 14 skills; v2.1 traz iteração com testers reais (10+ versões em 1 dia), manifesto em 1ª pessoa do Bruno, bifurcação ambiente, retomada pós-vitória, log de feedback estruturado, **3 princípios universais novos (13/14/15) e Princípio 11 estendido pra detecção de ambiente/OS/package_manager**.

### Trigger consolidado
Múltiplos feedbacks de testers reais (Dr. Thiago, Adrylan Viana, Bruno + outros) durante 03/05/2026 revelaram **5 bugs em escala** que apontavam pra mesma raiz arquitetural:

1. **Wizard morre pós-vitória** (Bruno + aluno + outros) — modo `closed` exagerou; aluno não sabia como voltar
2. **Áudio falso/alucinação** no smoke test do Whisper (Dr. Thiago) — agente afirmou ter validado texto que aluno nunca disse
3. **wizard-autonomia vago** sem perfis (Dr. Thiago) — agente improvisou copy em vez de seguir SKILL
4. **Brave URL 403 ao clicar** + **wizard-workspace pergunta vaga** (Dr. Thiago) — vocabulário interno escapando pro aluno
5. **GitHub via gh CLI quebrava em VPS Ubuntu** (brew assumido) — Managed-first quebrando 15k VPS legados em silêncio

Bruno conectou os pontos: "todos esses bugs vêm da mesma raiz — wizards não são guard rails fortes, agentes improvisam quando não deveriam, fingem ter rodado quando não rodaram, escapam dos passos sem motivo".

### Causa-raiz
Os bugs caíam em **3 categorias interligadas**:

- **A. Agente improvisa em vez de seguir SKILL** (áudio falso, autonomia vago, workspace vago) → resolvido por **Princípio 14 (smoke tests visíveis)** + **Princípio 15 (mensagens canônicas literais)**
- **B. Aluno desvia do fluxo, agente perde o passo** (Adrylan querendo antecipar identidade) → resolvido por **Princípio 13 (guard rail)**
- **C. Managed-first assumption quebra em VPS** (brew Ubuntu, github skill VPS, CLI Hostinger pra root) → resolvido por **Princípio 11 estendido (ambiente + OS + package_manager)**

### Changed — 4 NOVOS PRINCÍPIOS UNIVERSAIS

**Princípio 13 — Guard Rail (wizards são passo bloqueante)** — em `principios-defensivos.md`
- Toda mensagem do aluno em wizard ativo é classificada em 4 tipos: (a) resposta direta, (b) comando canônico, (c1) pergunta tangencial, (c2) desvio total
- Tipo c1: agente responde 1 linha + traz de volta
- Tipo c2: agente anota em `## Perguntas pendentes` + traz de volta
- Schema MEMORY.md: `active_wizard`, `active_step`, `awaiting`, `desvios_neste_passo`
- Anti-loop: 3 desvios consecutivos disparam pause com `wizard_resume_at` agendado

**Princípio 14 — Smoke tests visíveis (mostra comando + output, nunca finge)** — em `principios-defensivos.md`
- Comando externo SEMPRE mostrado (bloco de código)
- Output literal SEMPRE mostrado (HTTP code, body relevante)
- Sem evidência = ABORTAR e pedir ajuda. NUNCA fingir que rodou
- Aplica em: wizard-whisper-quick (validação Whisper + smoke test áudio), wizard-autonomia (exec-policy show), wizard-conectar (validação Brave + GitHub)

**Princípio 15 — Mensagens canônicas são literais** — em `principios-defensivos.md`
- Trechos de SKILL.md marcados como `<canonical>` ou `# CANONICAL` usam literal
- Agente NÃO reformula, NÃO "melhora", NÃO substitui exemplos
- Exceção: ajustar tom (formal/casual) seguindo SOUL.md
- Aplica em: pergunta-âncora de cada wizard, perfis de autonomia (quando implementados), opções pós-vitória, comandos de retomada

**Princípio 11 estendido — Detecção de ambiente + OS + package_manager** — extensão do Princípio 11 existente
- Detecta `ambiente: managed | vps-root | local-dev` antes de mostrar tutorial específico
- Detecta `os: macos | debian | rhel | other` antes de instruir instalação
- Detecta `package_manager: brew | apt | dnf | yum` antes de mandar `brew install X` cego
- Mapeamento `OS → comando` documentado no princípio
- Salva flags em MEMORY.md pra próximos wizards reusarem

### Changed — Skills modificadas/novas

**`primeira-vitoria` v1.4 → v1.5:**
- Mensagem final reescrita (passo 11) com 4 comandos de retomada óbvios destacados visualmente: `continuar` / `retomar` / `config` / `ajuda`
- Flag renomeada `onboarding_mode: closed` → `complete_active` (não tranca, só desativa loop)
- Seção 13 reescrita — 3 tipos de mensagem pós-vitória classificados (sinal vago / canônico / tarefa real)
- Convite Tally + grupo Telegram (em vez de NPS quantitativo no chat — era teatro sem rota de chegada)
- Retoma pulos opcionais antes de fechar a sessão

**`onboarding-checklist` v1.6 → v1.7:**
- Sinônimos pros gatilhos de retomada: `continuar`, `retomar`, `voltar wizard`, `voltar` (quando fora de passo). `reativa jornada` mantido por compat
- Razão documentada: vocabulário interno → vocabulário do aluno

**`wizard-conectar` v1.3 → v1.4:**
- Caminho GitHub simplificado pra **PAT-only** (sem `gh` CLI, sem skill nativa) — resolve bugs "brew Ubuntu" + "github skill VPS" porque NÃO precisa instalar nada
- Avisos críticos no topo (URLs sempre completos, smoke tests visíveis, guard rail, PAT-only)
- Tutorial visual em **4 cliques com screenshots** anexados (`screenshots/github-pat/01-avatar-settings.png` → `04-generate-classic.png`) + fallback links raw GitHub
- Sub-passo 3a (criar conta GitHub) caso aluno não tenha
- Sub-passo 3b com link DIRETO `https://github.com/settings/tokens/new?scopes=repo&description=openclaw-backup`
- Sub-passo 3c com smoke test visível (curl + HTTP code literal) na validação
- Smoke test visível também no Brave Search (passo 2)

**`wizard-whisper-quick` v1.7 → v1.8** (já feita anteriormente):
- Pulo agora oferece agendar lembrete 24h vs definitivo (em vez de flag silenciosa)

**`wizard-autonomia` v1.3 → v1.4** (já feita anteriormente):
- Bifurcação Managed (CLI painel + screenshot) vs ROOT (SSH direto + aviso segurança reforçado)
- Copy de detecção em linguagem do aluno ("1 click no painel" vs "configurou pelo terminal")

**NOVA: `continuar-jornada` v1.0** (em `skills/starter/continuar-jornada/`):
- Orchestrator pós-Bloco A — despachada por "continuar"/"retomar"/"próximo passo" QUANDO `onboarding_complete: true`
- Lê MEMORY.md em ordem de prioridade: wizard pausado vencido > pulo opcional vencido > progresso mini-curso > completou tudo
- **Cron passivo de retorno (v2.1):** detecta `wizard_resume_at` vencido, oferece retomar wizard de onde parou. Limite anti-spam: 3 tentativas
- Roadmap: v1.1+ vai ter wizards correspondentes pros blocos B/C/D conforme Pixel implementar

**NOVA: `gera-log-jornada` v1.0** (em `skills/starter/gera-log-jornada/`):
- Despachada por "gera log"/"gera feedback"/"relatório"
- Lê MEMORY.md, gera log estruturado da jornada (passos, pulos, observações inline, configuração final)
- 2 caminhos de envio: Tally form + grupo Telegram
- PII sanitizada por default (aluno escolhe completo se quiser)
- Salva log em `content/feedback-log-{data}.md` independente de envio
- NUNCA inventa dado que não está em MEMORY.md (Princípio 14)

**Manifesto reescrito como carta do Bruno em 1ª pessoa** (já feito em v1.8):
- Pixel Educação como autora institucional + escala (milhares de empreendedores)
- Fluxo completo do mini-curso visível (Bloco A → R)
- CTA forte "Bora começar a nossa jornada?"
- YouTube + Telegram dos alunos no final

**`INSTRUCOES-PARA-AGENTE.md` ganhou seções:**
- "Wizards são GUARD RAILS (Princípio 13)" no topo, antes do TL;DR
- "Smoke tests SEMPRE visíveis (Princípio 14)"
- "Mensagens canônicas são LITERAIS (Princípio 15)"
- TL;DR atualizado com 4 regras durante wizard ativo

### Lessons
1. **Bugs em escala têm raiz arquitetural.** 5 bugs reportados parecem 5 problemas. Na verdade são 3 padrões: agente improvisa, agente finge ter rodado, agente foge do passo. Princípios 13/14/15 fixam a raiz.
2. **Cura não pode virar doença oposta.** v1.3 fixou loop infinito (closed flag) mas matou demais. v2.1 ensina: tranca sinal vago (preserva v1.3) + libera comando explícito (resolve bug pós-vitória).
3. **Vocabulário interno ≠ vocabulário do aluno.** "Reativa jornada" é nome de função pro agente. "Continuar/voltar/retomar" é o que aluno digita. Mapear ambos.
4. **Honestidade > teatro.** NPS no chat era teatro sem rota. Tally + grupo é honesto. Áudio falso era teatro. Smoke test visível é honesto.
5. **Managed-first é OK pro produto novo, mas exclui base instalada.** 15k VPS legados estavam quebrando silenciosamente. Princípio 11 estendido reconcilia.
6. **Mensagem final é o último ponto de impacto.** Aluno em pico de engajamento (primeira vitória) — o que ele lê DEFINE o que faz depois. Comandos enterrados em rodapé = comandos invisíveis.
7. **PAT-only > gh CLI** pra GitHub. Mais simples, agnóstico de OS, sem dependência. Princípio: simplicidade > sofisticação quando dá pra escolher.
8. **Skill ponte é mais leve que implementação completa.** `continuar-jornada` não implementa Bloco B/C/D/E — só orquestra avanço + rastreamento. UX agora, wizards futuros em ondas.

### Build
Commits: TBD (código v2.1, ~12 arquivos mudados, 4 screenshots novos) + TBD (zip ~900K — agora maior por causa dos 4 PNGs).

---

## [1.9.2] — 2026-05-02 (madrugada cont. 8)

### Trigger
Bruno (logo após v1.9.1): "fica confuso perguntar pro aluno se é Manage Openclaw ou VPS própria. Podemos deixar numa linguagem mais simples, tipo: Você instalou openclaw via Manage Openclaw (instalação de 1 click) ou configurou via ROOT (pelo terminal da vps)".

### Causa-raiz
Em v1.9.1, a pergunta de detecção que o agente faz pro aluno ("você tá rodando OpenClaw no painel Hostinger (Managed) ou numa VPS própria com SSH?") usa jargão técnico ("Managed", "VPS", "SSH"). Aluno PME não reconhece esses termos — fica confuso, pode responder errado ou travar.

### Changed
- **`wizard-autonomia` v1.3 → v1.4:**
  - Copy da pergunta de detecção reescrita pra linguagem do aluno:
    ```
    "Antes de continuar, preciso saber como você instalou o OpenClaw:
    1. Managed OpenClaw — instalação de 1 click pelo painel da Hostinger
    2. ROOT — você configurou pelo terminal da sua VPS
    Manda 1 ou 2."
    ```
  - Adicionado nota explícita pro agente sobre a razão da copy ("não usar jargão técnico — aluno PME não conhece 'Managed' como conceito de cloud, e 'VPS root' parece ameaçador")
  - Sinais de detecção também ganham termos do aluno ("instalei pelo terminal", "1 click")

### Lesson
Voz interna (technical accuracy) ≠ voz externa (aluno reconhece). Quando o agente fala COM o aluno, copy precisa estar na realidade do aluno — termos da experiência de compra/setup, não termos da arquitetura cloud. "1 click no painel" é o que ele lembra, "Managed" é o que VOCÊ chama do produto.

### Build
Commits: TBD (código v1.9.2) + TBD (zip ~231K).

---

## [1.9.1] — 2026-05-02 (madrugada cont. 7)

### Trigger
Bruno (logo após v1.9): "no curso se for root nao pode mostrar cli do openclaw, precisa ser terminal".

### Causa-raiz
`wizard-autonomia` v1.2 mostrava SEMPRE tutorial Hostinger (painel → menu OpenClaw → "Abrir linha de comando (CLI)") + screenshot anexado. Mas pra VPS root, painel Hostinger não existe — aluno usa SSH direto. Tutorial atual confunde 15k VPS legados.

Quick fix antes da Onda 12 (que vai formalizar detecção de ambiente na onboarding-checklist mestre).

### Changed
- **`wizard-autonomia` v1.2 → v1.3:**
  - **Bloco "DETECÇÃO DE AMBIENTE OBRIGATÓRIA"** no topo do SKILL.md — instrui agente a detectar Managed vs VPS root antes de qualquer instrução de terminal. Lista sinais de cada ambiente (DigitalOcean/Hetzner/AWS/Vultr/Linode/Contabo, prompt root, workspace `/root/...` para VPS; painel Hostinger, Telegram do mini-curso, workspace `~/.openclaw/...` para Managed). Em dúvida: PERGUNTA explicitamente. Salva flag `ambiente: managed | vps-root | local-dev` em MEMORY.md
  - **Seção 2 bifurcada** em 2a (Managed) e 2b (VPS root):
    - 2a mantém tutorial atual + screenshot painel
    - 2b oferece SSH direto + aviso de segurança REFORÇADO (root no Linux = blast radius do sistema todo, vs container Managed que é só workspace)
    - Caso especial Linux/Mac local-dev: tratado igual VPS root
  - Roadmap ajustado: v1.6 vai remover detecção redundante deste wizard depois que Onda 12 formalizar `ambiente:` na checklist mestre

### Lesson
Quick fix honesto bate refactor perfeito quando o problema é agudo. Onda 12 (bifurcação formal de TODOS os wizards + flag ambiental + cron-DM ativo) ainda é o caminho certo no longo prazo, mas v1.9.1 para o sangramento dos 15k VPS legados em 15min de trabalho.

### Build
Commits: TBD (código v1.9.1) + TBD (zip 228K).

---

## [1.9] — 2026-05-02 (madrugada cont. 6)

### Trigger
Bruno revisou simulações paralelas (Marina/Managed + Igor/VPS root via agente). 3 insights disparados:
1. Kit promete "anotei pro Bruno" no NPS, mas sem skill ouvinte rodando, feedback fica órfão. Teatro.
2. Pulos no kit (whisper) viram flags silenciosas que ninguém retoma — aluno esquece de voltar.
3. **Bomba estratégica**: +15k alunos atuais em VPS root (não Managed). Kit v1.x é Managed-first by design — não serve bem essa base instalada.

### Causa-raiz
- **NPS no chat = teatro:** sem skill ouvinte ou rota real, número fica salvo no MEMORY.md local e morre. Aluno tem expectativa de impacto que não se cumpre.
- **Pulos órfãos:** `whisper_skipped: true` é registrado mas nunca retomado. Aluno raramente lembra de mandar "ativa whisper" depois.
- **Managed-first é OK pra mini-curso v2 NOVO, mas exclui 15k legados** — base instalada vai receber kit também.

### Changed
- **`primeira-vitoria` v1.3 → v1.4:**
  - **Seção 9 (NPS)**: substituiu pedido de nota 0-10 no chat por convite duplo: Tally form (https://tally.so/r/obyy1V) + grupo Telegram. Sem promessa de "leio tudo", sem email do Bruno (canal removido em v1.8). Agente NÃO espera resposta antes de seguir
  - **Nova seção 8.5 (retomar pulos opcionais)**: antes do convite a colaborar, lê MEMORY.md, detecta flags `whisper_reminder_at` ou `whisper_skipped_permanently`. Se agendado, oferece retomar AGORA ou manter lembrete. Se definitivo, lembra 1x que porta está aberta
  - Checklist final: `NPS: {score}` substituído por `Feedback (opcional): https://tally.so/r/obyy1V ou grupo @cursoopenclaw`
- **`wizard-whisper-quick` v1.7 → v1.8:**
  - **Nova seção 1.5 (tratar pulo)**: quando aluno escolhe pular, NÃO marca `whisper_skipped=true` direto. Pergunta: (1) agendar lembrete 24h ou (2) pular definitivo. Independente da escolha, avisa que pode voltar quando quiser com "ativa whisper"
  - Mecanismo MVP = flag passiva (`whisper_reminder_at: ISO_TIMESTAMP`) detectada na próxima sessão. Cron-DM ativo depende da Onda 12 (infra de cron-worker por aluno)
  - Flags novas em MEMORY.md: `whisper_skip_choice: agendado | definitivo`, `whisper_reminder_at: {timestamp}`, `whisper_skipped_permanently: true`

### Lesson
1. **Honestidade > teatro.** Se a infra não comporta, melhor remover do que prometer. NPS no chat parecia "engajamento extra" mas era promessa quebrada.
2. **Pulos precisam de retomada explícita.** Flag silenciosa é flag esquecida. Aluno volta no momento de pico (após primeira vitória) → ali é hora de retomar pendências.
3. **Padrão "agendar vs definitivo" é replicável** pros outros pulos (whatsapp pós-vitória, backup adiado, etc) — vale aplicar conforme aparecerem.
4. **Base instalada redefine prioridades.** Kit Managed-first faz sentido pro produto novo, mas 15k VPS legados precisam de detecção de ambiente. Onda 12 sobe pra crítica.

### Build
Commits: TBD (código v1.9) + TBD (zip ~225K, sem mudança grande de tamanho).

---

## [1.8] — 2026-05-02 (madrugada cont. 5)

### Trigger
Bruno revisou o manifesto e pediu duas coisas: (1) reescrever a versão completa em primeira pessoa dele, mencionando a Pixel Educação e o cenário de milhares de empreendedores impactados; (2) adicionar screenshot do painel Hostinger no `wizard-autonomia` mostrando o caminho de 2 cliques pra abrir o CLI (sidebar → OpenClaw → "Abrir linha de comando").

### Causa-raiz
Manifesto original não mencionava a Pixel como instituição autora, falava só do Bruno individual. Faltava posicionamento institucional + escala. Wizard-autonomia tinha tutorial em texto bem feito mas era ponto crítico de abandono (70% no E2E simulado) e screenshot reduz fricção no aluno mobile/iniciante de forma decisiva.

### Changed
- **`manifesto.md`**:
  - Versão curta: Pixel Educação como autora institucional + Bruno como sócio/autor; menção a "primeiro curso desse tipo"; bloco mostrando fluxo completo do mini-curso (Bloco A é só a entrada, depois B/C/D/E + bônus R)
  - Versão completa **reescrita como carta do Bruno em 1ª pessoa**: posicionamento Pixel ("milhares de empreendedores no Brasil — gente de SaaS, serviço, produto físico, comunidade"), tese, fluxo do mini-curso, 4 princípios, "Em testes" (convite leve pra colaborar via Telegram, sem email), "Pra ficar perto" (YouTube + Telegram fundidos), CTA "bora começar a nossa jornada?"
  - Tirado: email `bruno@microsaas.com.br` como canal de feedback (ficou só Telegram); seção "O que NÃO é/É" (redundante); seção "v2 roadmap" (não essencial pra primeira leitura); frase techbro "Em 2024 seria frustração; hoje funciona" (cortada das duas versões)
  - Reduziu de ~85 linhas pra ~50 linhas na versão completa (~40% menor)
- **`wizard-autonomia` v1.1 → v1.2**:
  - Nova pasta `screenshots/` dentro da skill (princípio: skill auto-contida com seus próprios assets)
  - `screenshots/painel-hostinger-cli.jpg` (42K, JPG comprimido) — print do painel Hostinger com 2 setas azuis indicando: (1) sidebar → OpenClaw, (2) "Abrir linha de comando (CLI)" embaixo do nome da instância
  - SKILL.md instrui agente a ANEXAR a foto via Telegram + fallback de link raw GitHub permanente (caso bridge OpenClaw não suporte sendPhoto)
  - Tutorial em texto enxugado (era 6 passos verbosos, virou 4 mais diretos)
  - Roadmap reordenado: v1.3 = detectar versão CLI; v1.4 = i18n + screenshot localizado

### Lesson
Manifesto vende a EXPERIÊNCIA do kit. Tem que (a) posicionar a casa (Pixel), (b) mostrar a escala (milhares), (c) ser honesto sobre estado (testes), (d) convidar colaboração de forma leve, (e) ter CTA forte pro primeiro passo. Voz em 1ª pessoa do autor humaniza muito mais que voz neutra de "produto".

E pra fricção visual: 1 screenshot vale 6 passos de texto. Onde aluno trava (terminal Hostinger), screenshot resolve. Padrão deve replicar nos outros wizards com momentos visuais (wizard-conectar/GitHub PAT, wizard-workspace/criar repo).

### Build
Commits: TBD (código v1.8) + TBD (zip 200K aprox). Push limpo planejado.

---

## [1.7] — 2026-05-02 (madrugada cont. 4)

### Trigger
Lia testou v1.6. Modo wizard direto rodando, ao chegar no passo 0 (Whisper) **perguntou "quer ativar Whisper?" sem checar `.env`**. Bruno apontou: aluno já tem chave (workspace configurado), agente devia ter detectado. Plus: faltava mencionar que chave OpenAI também serve pra memória semântica (embeddings), não só Whisper.

### Causa-raiz
Agente leu `onboarding-checklist`, seguiu modo wizard direto, MAS quando chegou no wizard-whisper-quick **improvisou uma versão simplificada na conversa** em vez de invocar a SKILL e seguir o Princípio 11 dela.

Mesmo padrão das v1.0-v1.4 (agente improvisa fluxo) mas em escala menor — wizard filho específico em vez do fluxo de instalação inteiro. v1.4 (INSTRUCOES-PARA-AGENTE.md) cobriu o caso macro mas não explicitou que **wizards filhos TAMBÉM não improvisam**.

### Changed
- **`wizard-whisper-quick` v1.2 → v1.7**:
  - ⚠️ Aviso CRÍTICO no topo: "se você é onboarding-checklist despachando este wizard, NÃO IMPROVISE versão simplificada — Read este arquivo inteiro e siga"
  - Princípio 11 reforçado como OBRIGATÓRIO: "sua PRIMEIRA ação ao ser invocada é a checagem abaixo. Não escreva NADA pro aluno antes de checar"
  - Texto da Promessa adicionou menção a **memória semântica** (embeddings) — chave OpenAI vende dois benefícios, não só Whisper
  - Wording inicial reforça: "Você JÁ TEM chave OpenAI configurada, ou precisa de ajuda pra pegar?" (assume aluno antigo pode já ter)
  - Caminho "chave válida detectada": narrar "✓ Achei, validei, funcionando. Whisper + memória semântica já estão prontos" e pular pro smoke test

### Added
- `INSTRUCOES-PARA-AGENTE.md`: nova seção "Wizards filhos TAMBÉM não improvisam" com instrução explícita de Read no SKILL.md de cada wizard antes de despachar

### Lesson
v1.4 fixou improvisação do FLUXO MACRO (agente recebe kit → improvisa instalação). v1.7 fixa improvisação do FLUXO MICRO (agente despacha wizard filho → improvisa versão simplificada). **Padrão geral: TODA skill da família tem que ser invocada como skill, não improvisada.** Aplica pros 7 wizards filhos da jornada normal — vale auditar todos pra adicionar aviso similar no topo se for valer.

### Build
Commit deste fix · Zip rebuild v1.7

---

## [1.6] — 2026-05-02 (madrugada cont. 3)

### Trigger
Bruno revisando o output da v1.5 da Lia. 2 pontos:
1. Caminho A só copiava 4 skills planejamento — Bruno apontou que aluno antigo poderia aproveitar mais coisas (`backup-github`, FAQ, exemplos, wizard-whatsapp como acessíveis sem cópia)
2. Bruno sugeriu reformular completamente as 3 opções com semântica mais clara (PRD vs Wizard vs Referência) + adicionar boas-vindas universal antes de qualquer detecção

### Causa-raiz
v1.5 mantinha estrutura A/B/C herdada da v1.0. Bruno percebeu que a TAXONOMIA das opções confundia (A "skills agnósticas" era nicho demais; B "upgrade completo" era vago). Reformulou pra:
- **PRD** = analítico (lê + propõe + executa com aprovação)
- **Wizard review** = experiencial (jornada completa em modo review pra aluno antigo)
- **Referência** = passivo (zip extraído, comandos acessam)

E identificou que faltava boas-vindas padrão antes de tudo — aluno chegava direto na detecção de cenário sem contexto sobre Pixel/Bruno/experimental.

### Added
- **Boas-vindas universal** no topo da `onboarding-checklist` antes da Fase Zero. Aparece em TODOS os cenários (A vazio, B populado, C parcial). Apresenta:
  - Starter Kit OpenClaw da Pixel Educação
  - Bruno Okamoto como autor
  - Status experimental
  - Tese "curso pra humanos E agentes"
  - Email/grupo de feedback
- Caminho 3 (Referência) lista 6 comandos disponíveis: `faq`, `mostra exemplo`, `ativa whatsapp`, `ativa backup`, `roda onboarding`, `changelog`

### Changed
- **Cenário B reformulado** com 3 opções renomeadas (era A/B/C, virou 1/2/3):
  - **(1) PRD personalizado** — analítico, 30-60min. Pode terminar em 5min (PRD propõe só "instala 4 skills" e aluno aprova) OU 60min (adaptação completa). Aluno decide escopo no PRD.
  - **(2) Wizard em modo review** — NOVO. Experiencial, 20-40min. Dispara jornada completa MAS cada wizard filho aplica P11 fortemente: detecta o que já tá feito, confirma com aluno ("tá bom?"), sugere o que veio NOVO no kit naquele passo. Não recria nada do zero. Flag `mode: review` em `MEMORY.md`.
  - **(3) Só referência** — passivo. Zip extraído, aluno acessa via comandos.

### Removed
- **Caminho A "skills agnósticas"** como opção separada. Vira caso especial do PRD (Caminho 1) — se aluno só quer 4 skills, PRD propõe isso e executa em 5min. Reduz 4 opções pra 3 e elimina decisão "atalho vs upgrade" que confundia.

### Build
Commit deste fix · Zip rebuild v1.6

---

## [1.5] — 2026-05-02 (madrugada cont. 2)

### Trigger
Screenshot Bruno do agente da Lia apresentando os 3 caminhos do Cenário B (gerados pela v1.4). Bruno apontou que Caminho A precisa de disclaimer ("perde experiência do kit") + transparência (lista exata do que copia) + caminho de reativação futura.

Plus: identificada inconsistência — descrição do Caminho B na apresentação ainda dizia "te passo prompt pra colar no SEU agente atual" (texto antigo da v1.0/v1.1 que o fix v1.2 tinha resolvido na execução, mas não na apresentação).

### Added
- `CHANGELOG.md` (este arquivo) na raiz do kit pra histórico unificado

### Changed
- **`onboarding-checklist` v1.4 → v1.5** — Caminho A do Cenário B reescrito com 3 melhorias:
  - ⚠️ Disclaimer explícito do que aluno PERDE escolhendo A (experiência guiada, jornada com checklist visual, perguntas-âncora, modo wizard premium)
  - Lista EXATA do que copia (só `skills/planejamento/`) e do que NÃO copia (`starter/`, `canais/`, `operacional/`, `templates/`, `exemplos/`) — transparência total
  - Instrução de reativação futura: "manda 'roda onboarding' que eu copio `starter-kit/skills/starter/` pro workspace ativo"
- Descrição do Caminho B sincronizada com fix v1.2 ("eu mesma conduzo, você tá no MESMO agente que eu" — não mais "te passo prompt")

### Build
Commits: `0e92b36` (fix Caminho A) + `d3d7020` (CHANGELOG)
Zip: `starter-kit-openclaw-v1.5.zip` (191K, rebuild com CHANGELOG)

---

## [1.4] — 2026-05-02 (madrugada cont.)

### Trigger
4ª sessão consecutiva (Lia/Mira recebendo v1.3 zip) com agente improvisando fluxo de instalação. Mesmo padrão das v1.0-v1.2: agente extraiu zip + copiou skills sem autorização + perguntou "quer iniciar jornada agora ou só skills disponíveis?".

### Causa-raiz
TODAS as falhas v1.0-v1.3 vinham da mesma raiz — agente NÃO invocava a skill mestre (`onboarding-checklist`), improvisava fluxo. v1.1-v1.3 fixaram sintomas. v1.4 ataca raiz.

### Added
- **`INSTRUCOES-PARA-AGENTE.md`** na raiz do kit como entry point explícito. Lista o que NÃO fazer (copiar skills sem autorização, criar arquivos raiz, inventar opções) e a única ação certa: `Read("skills/starter/onboarding-checklist/SKILL.md")` e seguir à risca
- Aviso destacado no topo do `README.md` apontando pra INSTRUCOES
- Nota no `manifesto.md` pro agente
- Referência cruzada no topo da `onboarding-checklist/SKILL.md`

### Changed
- `onboarding-checklist` v1.2 → v1.4 (skip v1.3 nessa skill — v1.3 do kit fixou outras skills)

### Lesson
Quando 3+ fixes consecutivos do mesmo arquétipo não resolvem, a causa é estrutural, não tática. Regra: parar de tratar sintomas e atacar o sistema.

### Build
Commit `bf9593d` · Zip 185K · `starter-kit-openclaw-v1.4.zip`

---

## [1.3] — 2026-05-02 (madrugada)

### Trigger
Bruno mandou screenshot apontando que pós-vitória "tratou segunda etapa como opcional. E não é." Pediu pra ler o transcript completo da sessão da Lia/Mira (`/root/.openclaw/agents/lia-mira/sessions/b3569c60.jsonl` na VPS bot-curso-teste — 350K, 206 msgs, ~2h30 de sessão).

5 falhas reais identificadas (não só a do screenshot).

### Changed
- **`primeira-vitoria` v1.0 → v1.3**:
  - PRE-CHECK obrigatório de TODAS as 7 flags antes de pós-vitória. Se `conectado: partial` ou alguma flag = false, voltar pra completar (não tratar como "opcional")
  - 4 opções pós-vitória FIXAS (arquivar/WhatsApp/planejamento/fechar) + instrução imperativa anti-improvisação (NÃO criar opções customizadas baseadas em contexto do aluno)
  - SAI do modo wizard após pós-vitória escolhida — `onboarding_mode: closed` flag adicionada. "bora" não reabre wizard, só comando explícito ("reativa jornada")
- **`wizard-conectar` v1.0 → v1.3** — NÃO marca `conectado=true` se algo foi pulado/postponed. Usa `conectado: partial` + flags individuais (`brave_search_active`, `github_token_active`, `backup_active`, `chromium_active`)
- **FAQ item 6** — OAuth Claude/Gemini removido (não existem no OpenClaw Managed — só GPT tem OAuth). Substituído por Claude API direta (`ANTHROPIC_API_KEY` via console.anthropic.com) + Gemini API direta (`GOOGLE_API_KEY` via aistudio.google.com)

### Lesson
Ler transcript real > screenshot. Bruno apontou 1 falha; lendo o jsonl inteiro encontrei 5. Próxima vez: pedir transcript primeiro.

### Build
Commit `02ed4a2` · Zip 182K · `starter-kit-openclaw-v1.3.zip`

---

## [1.2] — 2026-05-02 (noite tardia)

### Trigger
Sessão da Mira: agente leu o `prompt-upgrade-para-aluno-antigo.md` e entregou como TEXTO pro aluno copiar. Aluno ficou perdido — ele tava NO mesmo agente, não tinha outro pra colar.

Plus: Bruno mandou screenshot do whisper-quick com sugestão de wording melhor ("quer ajuda ou já tem?" em vez de binário "tem ou pula").

### Causa-raiz
Design assumia 2 agentes (kit + agente do aluno). Mas é 1 só — o agente que recebeu o kit É o agente do aluno.

### Changed
- **`onboarding-checklist` v1.1 → v1.2** — Caminho B do Cenário B reescrito: agente EXECUTA o upgrade pessoalmente em 6 fases (raio-X kit → raio-X workspace → propor PRD → executar item a item com aprovação). Aviso ⚠️ "NÃO entregue o prompt como texto pro aluno copiar"
- **`prompt-upgrade-para-aluno-antigo.md`** reescrito como instrução INTERNA pro agente seguir, com cabeçalho "NÃO ENTREGUE ESTE TEXTO PRO ALUNO"
- **`wizard-whisper-quick` v1.0 → v1.2** — wording convidativo: "Você quer ajuda pra pegar essa chave, ou já tem ela fácil aí?" (em vez de "É opcional — se quiser pular, manda pulo")

### Build
Commit `66d39aa` · Zip 179K · `starter-kit-openclaw-v1.2.zip`

---

## [1.1] — 2026-05-02 (noite)

### Trigger
Sessão da Lia: agente detectou Cenário B (workspace populado) mas improvisou 3 opções próprias (A: skills úteis / B: upgrade completo / C: instalar sem onboarding) em vez de seguir o design canônico (entregar prompt agentic de upgrade).

### Causa-raiz
Design original era bipolar (prompt OU cancelar). Agente esperto improvisou caminhos legítimos não previstos. Faltava linguagem imperativa anti-improvisação.

### Changed
- **`onboarding-checklist` v1.0 → v1.1** — Cenário B reescrito com 3 caminhos canônicos formais:
  - (A) Skills agnósticas — instala só `planejamento/`, não toca raiz
  - (B) Upgrade completo via prompt agentic — caminho premium
  - (C) Só deixar arquivos disponíveis — zero ação

  Plus instrução imperativa no topo: "NÃO improvise outras opções, NÃO ofereça sobrescrever, ESPERE A/B/C".

### Build
Commit `5854a16` · Zip 177K · `starter-kit-openclaw-v1.1.zip`

---

## [1.0] — 2026-05-02 (release inicial)

### Added
- **14 skills**:
  - **8 starter** — `onboarding-checklist` mestre + 7 wizards filhos (whisper-quick, agente, aluno, autonomia, workspace, conectar, primeira-vitoria)
  - **4 planejamento** — Superpowers curados (brainstorming, writing-plans, executing-plans, verification-before-completion)
  - **1 canal** — `wizard-whatsapp` (default read-only, 3 casos de uso)
  - **1 operacional** — `backup-workspace-github` (cron 03:00 BRT)
- **5 templates raiz** (`.template`) — IDENTITY, SOUL-stub, AGENTS, USER, MAPA
- **5 exemplos Amora** sanitizados — USER, IDENTITY, SOUL, AGENTS, MAPA
- **FAQ enxuto** (10 itens) — CLI emergência, atualização, backup, privacidade, custo, modelos LLM, compartilhar agente, criar agente, tópicos, NPS
- **Manifesto + README + BUILD.md**

### Princípios universais (12)
Definidos em `skills/starter/onboarding-checklist/references/principios-defensivos.md`. Especialmente:
- P1: backup antes de sobrescrever
- P3: agente NUNCA elevação de privilégio (manual no terminal)
- P11: detectar antes de pedir + `.env first` pra credenciais
- P12: mapas distribuídos (não TOOLS.md monolítico)

### Stats
- 38 arquivos / +6248 linhas
- Zip: 176K / 14 skills / 54 arquivos .md+.json

### Build
Commit `d106e7f` · Zip 176K · `starter-kit-openclaw-v1.zip`

---

## Convenções deste changelog

### Versionamento
Semver simples — `MAJOR.MINOR.PATCH`:
- **MAJOR** (2.0): mudança que quebra workspace existente / migração necessária
- **MINOR** (1.x): novas skills, mudança de fluxo, fix arquitetural
- **PATCH** (1.x.y): doc, typo, refinamento sem mudança comportamental

### Trigger por versão
Cada versão tem campo "Trigger" descrevendo a falha real (sessão de teste, feedback de aluno, bug observado) que motivou. Padrão único do kit: não fazemos releases planejados, **fixamos falhas reais**. Esse formato torna o changelog útil pra debug futuro — quando aparecer falha similar, dá pra cruzar com versões anteriores.

### Categorias (Keep a Changelog + extensões)
- **Added** — novo recurso
- **Changed** — comportamento existente alterado
- **Deprecated** — vai sair na próxima major
- **Removed** — saiu
- **Fixed** — bug corrigido
- **Security** — mudança de segurança
- **Causa-raiz** (custom) — diagnóstico do "por quê" da falha
- **Lesson** (custom) — aprendizado pra futuro

### Como contribuir
1. Tester reporta falha (texto + screenshot OU acesso ao transcript)
2. Bruno lê transcript real (idealmente, não só screenshot — falha v1.3 mostrou que screenshot mostra 1 falha mas transcript revela 5)
3. Diagnóstico: identifica causa-raiz
4. Fix em v+1 (ou v.x.y se for só doc/refinamento)
5. Entry no CHANGELOG (este arquivo)
6. Rebuild zip
7. Mandar pra testers afetados com nota "tem v+1 com fix do que você apontou"

### Repo
Cérebro da Amora — `okjpg/repo-amora-cos` em `main`, path:
`memory/curso-openclaw-v2/starter-kit/`

---

*Mantido por Bruno + Claude local. Próxima versão quando aparecer próxima falha real ou feature crítica.*
