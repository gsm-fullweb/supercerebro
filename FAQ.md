# FAQ — Starter Kit OpenClaw v1

> 10 perguntas essenciais. Aluno acessa via comando `"faq"` no Telegram (carrega esta página inteira ou seção específica).
> Mais que isso polui — preferi ter pouco e bom em vez de muito e confuso.
> Atualizado: 02/05/2026.

---

## Operação dia-a-dia

### 1. CLI de emergência — quando algo trava

Agente parou de responder no Telegram, comportamento estranho, suspeita de bug?

**Fluxo padrão (do mais leve pro mais pesado):**

```
1. openclaw status              ← visão geral, vê se tá tudo no ar
2. openclaw gateway restart     ← fix #1 mais comum (95% dos casos)
3. openclaw doctor              ← diagnóstico estruturado
4. openclaw doctor --fix        ← auto-conserta (faz backup config antes)
5. openclaw logs --tail 50      ← investigação se ainda não funcionou
6. Kodee (chat painel Hostinger) ← último recurso humano
```

**⚠️ NÃO use `openclaw reset`** a não ser como ÚLTIMO recurso — perde workspace inteiro (memory, skills custom, configs). Antes disso, restaura snapshot do painel Hostinger (mais info: item 3).

Doc completa de comandos CLI: [docs.openclaw.ai/cli](https://docs.openclaw.ai/cli)

---

### 2. Como atualizar o OpenClaw e o kit

**OpenClaw (a plataforma):**
- Atualização é gerenciada pela Hostinger
- Verificar versão: `openclaw update status`
- ⚠️ **Boa prática:** ANTES de qualquer update, tira snapshot manual no painel Hostinger (Painel → seu OpenClaw → Snapshots). 30 segundos te salvam horas.

**Starter Kit (skills + templates):**
- Versões futuras (v1.1, v2) virão como `.zip` novo
- Pra atualizar, descompacta o novo zip por cima do `skills/` atual — backup-workspace-github do Princípio 1 cobre se algo sobrescrever errado
- Mudanças de breaking change vêm com migration guide separado

**Update quebrou tudo, e agora?**
```
1. openclaw update status        ← confirma versão atual
2. Painel Hostinger → snapshots → restaura snapshot anterior
3. Sem snapshot? openclaw doctor --fix
4. Último recurso: openclaw reset (perde estado)
```

---

### 3. Backup / restaurar workspace

**Backup automático (já configurado pelo passo 5 da jornada):**
- Skill `backup-workspace-github` faz commit diário às 03:00 BRT do workspace inteiro pro seu repo privado no GitHub
- Histórico: 30+ dias garantidos
- O que NÃO vai pro backup: `.env` (chaves secret) — protegido pelo `.gitignore`

**Como restaurar arquivo perdido:**
```bash
# No terminal do Managed (Painel Hostinger → OpenClaw → "Abrir linha de comando")
cd $WORKSPACE
git log --oneline content/drafts/post-X.md     # vê histórico do arquivo
git checkout {commit_hash} -- content/drafts/post-X.md  # restaura versão antiga
```

**Como restaurar workspace inteiro (caso `openclaw reset` ou pior):**
1. Painel Hostinger → seu OpenClaw → Snapshots → restaura
2. OU clona seu backup do GitHub: `git clone https://github.com/{seu-user}/{seu-repo}-backup`
3. Reativar skills no novo workspace + reconectar chaves do `.env`

---

### 4. Privacidade — quem vê o que tá no meu workspace?

Pergunta crítica pra todo PME. Resposta direta:

| Quem | Vê o quê |
|---|---|
| **Você** | Tudo — workspace é seu |
| **Bruno / Pixel Educação** | NADA. Não temos backdoor, não acessamos workspace de aluno. Eu (Bruno) só vejo o que você mandar pro grupo @cursoopenclaw ou pro meu email |
| **Hostinger (provedor da infra)** | Acesso técnico ao container (igual qualquer hospedagem). Política de privacidade: hostinger.com/legal/privacy-policy |
| **OpenAI / Anthropic / outros LLMs** | Processam suas mensagens enquanto o agente trabalha. Política de retenção varia por provider — OpenAI retém ~30 dias por default, Anthropic não treina em conversa de cliente API. Verifica policy do provider que você usa. |
| **Telegram** | O canal NÃO é E2E criptografado em chats com bot. Telegram pode ler conteúdo em teoria. Pra alta sensibilidade, considera Signal ou outro canal. |
| **GitHub (do backup)** | Repo privado. Só você vê (e qualquer colaborador que você adicionar). GitHub processa pra hospedar. |

**Boa prática:** dados super sensíveis (CPF de cliente, contrato confidencial, segredo industrial) → **não passa pro agente**. Use o agente pra tarefas onde "Bruno-do-OpenAI lendo isso" não te incomoda.

---

### 5. Custo escapou — como cortar gastos?

3 vetores de custo:

**A) Hostinger Managed (~$15-30/mês fixo):**
- Não cresce com uso
- Pra cortar: downgrade plano OU pausar agente (`openclaw stop` — não perde dados)

**B) OpenAI API (pay-as-you-go, é onde escapa):**
- Setar limite mensal: https://platform.openai.com/account/billing/limits
- Recomendo: **hard limit de $20/mês** pra Whisper-only (mais que suficiente)
- Se usa embeddings + outras chamadas: $50-100/mês de hard limit
- Monitorar gasto: https://platform.openai.com/usage (dashboard com gasto diário)
- Alertas: setar trigger em 80% do limit (notifica antes de cortar)

**C) ChatGPT Plus OAuth ($20/mês fixo):**
- Não cresce com uso. Default da maioria do uso de modelo do agente.

**"Agente ficou ligado a noite toda processando coisa, gastei $X":**
- `openclaw stop` (preserva dados, só desliga)
- Investigar via `openclaw logs` o que rodou
- Geralmente é cron mal configurado ou loop infinito → corrigir e religar com `openclaw start`

---

## Configuração avançada

### 6. Outros modelos LLM (OpenRouter, Claude API, Gemini API)

**Default do kit:** ChatGPT Plus via OAuth = modelo principal do agente. $20/mês fixo, sem complicação.

⚠️ **OAuth no OpenClaw Managed só existe pra GPT (ChatGPT Plus).** Claude e Gemini precisam ser via API key direto ou via OpenRouter — não tem OAuth pra eles.

**Quando faz sentido trocar:**
- **OpenRouter** — 1 chave dá acesso a 50+ modelos (Claude, Gemini, DeepSeek, Qwen, etc). Pay-as-you-go. Bom pra laboratório / experimentos.
  - Cadastro: openrouter.ai
  - Configuração: salva `OPENROUTER_API_KEY` no `.env` (mesmo padrão do `OPENAI_API_KEY`)
  - Doc OpenClaw: docs.openclaw.ai/cli (busca "openrouter")

- **Claude API direta (Anthropic)** — robusto pra tarefas longas, contexto grande. Pay-as-you-go.
  - Cadastro: console.anthropic.com → API keys
  - Configuração: salva `ANTHROPIC_API_KEY` no `.env`

- **Gemini API direta (Google)** — útil se já usa Google Workspace.
  - Cadastro: aistudio.google.com → Get API key
  - Configuração: salva `GOOGLE_API_KEY` no `.env`

**NUNCA recomendo:** modelos "mini" / "lite" pra agente principal (gpt-5-mini, gemini-flash-lite). São burros pra tarefas agentic — geram bug, esquecem contexto, criam loop. Use só pra checagem simples (cron de heartbeat, classificação binária).

**Como trocar de modelo no agente:**
```bash
openclaw config set model claude-sonnet-4-6
# ou
openclaw config set model gpt-5
```

---

### 7. Compartilhar agente com outra pessoa

Aluno PME tipicamente quer dar acesso pra secretária / sócio / parceiro.

**Limitações honestas do v1:**
- Managed Hostinger é **single-tenant** por design — 1 conta Hostinger = 1 dono do OpenClaw
- Multi-user "real" (com permissões granulares) não existe ainda

**Workarounds que funcionam hoje:**

**A) Compartilhar acesso ao Telegram bot:**
- Adicionar ID do Telegram da pessoa na allowlist do bot
- Comando natural: *"permita que [@user_secretaria] me mande mensagem"*
- Pessoa adicionada conversa com o agente normalmente
- ⚠️ Pessoa adicionada vê **toda conversa do bot** (não tem isolamento por usuário) — limitação do Telegram

**B) Compartilhar credenciais Hostinger:**
- Cuidado: dá acesso completo (terminal, files, billing)
- Recomendo só pra co-fundador ou alguém de confiança 100%

**C) Acesso "leitor" via export periódico:**
- Skill custom (pós-vitória) que envia digest diário pro email da secretária
- Sem ela ter acesso ao agente diretamente

**Boas práticas multi-pessoa:**
- Configurar tom/restrições no `SOUL.md` ("quando @user_secretaria falar, modo profissional, sem gírias")
- Definir whitelist de tópicos que cada pessoa pode invocar
- Audit log: `openclaw logs` mostra quem mandou o quê

**Quando vale criar agente separado em vez de compartilhar:**
- Pessoa precisa de contexto MUITO diferente do seu (ex: agente sócio com acesso a financeiro que você não quer ver)
- Privacidade entre vocês
- Workspace independente com memória própria

---

### 8. Criar outro agente

Aluno avançado vai querer múltiplos agentes — multi-empresa (estilo Filippe César), separação contexto pessoal/profissional, etc.

**Como criar:**
1. Painel Hostinger → menu **OpenClaw**
2. Botão **"+ Adicionar OpenClaw"** (canto superior direito)
3. Configura novo OpenClaw (nome, plano)
4. Aguarda provisionamento (~5min)
5. Roda Starter Kit nesse OpenClaw novo (mesma jornada, workspace separado)

**Custo:** cada agente é instância separada — ~$15-30/mês cada (Hostinger Managed). Não tem desconto por volume.

**Quando faz sentido criar agente novo:**
- Multi-empresa (cada empresa com workspace, regras, memória própria)
- Separação contexto pessoal vs profissional crítica
- Cliente PME e você como agência (1 agente por cliente)

**Quando NÃO faz sentido:**
- Você quer "agente de marketing" + "agente de vendas" — use 1 agente com SKILLs separadas, não 2 agentes
- Você só quer organizar tópicos diferentes — use tópicos do Telegram (item 9)
- Você quer dar acesso a outra pessoa — use compartilhamento (item 7)

**Coordenação entre agentes (avançado):**
Estilo Filippe — 1 CoS coordenador + N agentes de empresa. Cada um com workspace independente, CoS recebe relatórios e roteia tarefas. Vai pra Aula 13 do mini-curso (Multiagentes), fora do escopo do kit v1.

---

### 9. Liberar números / tópicos no Telegram

**Tópicos no Telegram (recomendado):**

Tópico = "canal" dentro de um supergrupo. Permite organizar conversas por contexto sem ter múltiplos bots.

```
Setup:
1. Cria um SUPERGRUPO no Telegram (não grupo simples — tem que ser super)
2. Configurações do grupo → Topics → Enable
3. Cria tópicos manualmente (ex: 📝 Conteúdo, ⚙️ Operação, 🧠 Aprendizado)
4. Adiciona seu bot como admin do grupo
5. Bot já reconhece tópicos automaticamente no boot
```

**⚠️ Limite recomendado: 3-4 tópicos.** Mais que isso, agente lota contexto e estoura rate limit da API.

**Configurar BotFather privacy mode (sem isso bot só lê DMs, não grupo):**
```
Telegram → @BotFather → /setprivacy → escolhe seu bot → Disable
```

**Whitelist de quem pode falar com o bot:**
Comando natural pro agente:
- *"permita que [@user] me mande mensagem"*
- *"todos do grupo X são autorizados"*
- *"responda só quando eu te marcar"* (mention only)

**Adicionar número Telegram extra (chip dedicado):**
- Skill `wizard-whatsapp` (em `skills/canais/`) cobre WhatsApp. Pra Telegram com número extra:
- Cria bot novo no @BotFather com nome diferente
- Configura no Managed via `openclaw channels add telegram --token {TOKEN_NOVO}`
- Roteia o que vai pra esse bot vs o principal via `openclaw channels routing`

Doc OpenClaw sobre channels: [docs.openclaw.ai/channels](https://docs.openclaw.ai/channels)

---

## Engajamento

### 10. Avaliação NPS do Mini-curso e feedback

**Avaliar o mini-curso:**
- Link na área de membros do Hotmart (formulário NPS oficial)
- Ou direto pra: bruno@microsaas.com.br (Bruno lê pessoalmente)

**Feedback estruturado pro Bruno:**
- **Email:** bruno@microsaas.com.br
- Use pra: bug reproduzível com passo-a-passo, sugestão de melhoria, caso de uso interessante que você criou, algo que travou e a comunidade não resolveu
- Bruno lê todos os emails — feedback bom vira melhoria na v2

**Comunidade (suporte horizontal):**
- Grupo Telegram: https://t.me/cursoopenclaw
- @Openclawzinho (bot IA do curso) — resposta rápida 24/7 no tópico Suporte
- Outros tópicos — galera do curso responde, Bruno aparece direto

**Cases pra Bruno citar (se você fez algo legal):**
- Mande email com fotos/prints/links
- Bruno cura cases reais em `memory/cases/openclaw/comunidade/` — pode virar conteúdo
- Ver exemplos em `starter-kit/exemplos/USER-amora.md` (Brunner Aurora, Igor Gouveia, Filippe César, Chris Everest)

---

## Sobre este FAQ

10 itens cobrem ~80% das dúvidas reais (baseado em 7.985 mensagens analisadas do tracker do @Openclawzinho de 04/2026). Se você tem dúvida que não tá aqui:

1. Manda pro grupo @cursoopenclaw — galera responde
2. @Openclawzinho responde dúvida rápida 24/7
3. Email pra bruno@microsaas.com.br se for coisa estruturada que merece virar item do FAQ

Versão futura (Fase 2 pós-launch): documentação agêntica em `docs.openclaw.bruno.com.br` com auto-update semanal baseado nas dúvidas reais.

Por enquanto, esse arquivo cobre o essencial sem virar enciclopédia.

---

*FAQ v2 — atualizado 02/05/2026 com base em decisões da v2 do curso (D14 Telegram-only, D08 .env first, D11 backup GitHub no setup, D23 backup antes de sobrescrever). Versões antigas em `archive/`.*
