# Starter Kit — Curso OpenClaw v2

> **O kit que o aluno baixa.** Pacote agêntico que transforma o agente do aluno em tutor da própria configuração.

---

> ## 🤖 SE VOCÊ É O AGENTE QUE RECEBEU ESTE KIT
>
> **PARE.** Antes de fazer qualquer coisa, leia [`0-LEIA-PRIMEIRO-AGENTE.md`](0-LEIA-PRIMEIRO-AGENTE.md) na raiz deste kit.
>
> ### 🔴 Princípio 16 (kit v2.2) — Entry point literal
>
> Sua **PRIMEIRA AÇÃO** ao receber este kit é fazer `Read` em `skills/starter/onboarding-checklist/SKILL.md` e invocar a skill. **Sem perguntas prévias.** Sem "olhada rápida". Sem propor caminhos. Sem oferecer atalhos como "quer que eu siga o wizard ou prefere que eu proponha identidade?".
>
> Sua **PRIMEIRA MENSAGEM** ao aluno é a renderização literal da seção "Boas-vindas universal" da `onboarding-checklist`. Não invente preâmbulo. Não descreva o que viu no kit ("recebi o starter kit, dei uma olhada rápida..."). Vai DIRETO pra mensagem canonical.
>
> ### ❌ Improvisações observadas em testes reais (NÃO FAZER)
>
> - "Recebi o kit, dei uma olhada rápida..." (NC, 03/05) — sem preâmbulo, vai direto
> - "Posso usar isso como base pra nossa configuração inicial" (NC) — sem permissão própria
> - "Você quer que eu siga o wizard, ou prefere que eu proponha identidade inicial pra mim e você só ajusta?" (NC) — **escolha falsa**, ambas as opções viram improvisação
> - "Quer iniciar jornada agora ou só skills disponíveis?" (Lia, 02/05) — improvisou opção pós-instalação
> - "Vou copiar as skills pro workspace" (Lia, 02/05) — onboarding-checklist decide, não você
> - Modificar arquivos raiz (USER, IDENTITY, SOUL, AGENTS) por conta própria — Princípio 1 violado
> - Inventar opções pós-vitória customizadas — 4 opções FIXAS no design
> - Despachar wizard filho sem fazer Read da SKILL.md dele inteira — improvisar versão "rápida"
>
> Lista completa + casos analisados: [`0-LEIA-PRIMEIRO-AGENTE.md`](0-LEIA-PRIMEIRO-AGENTE.md).
>
> Falhas reais já aconteceram em **5 testes consecutivos** (Lia, Mira, Dr. Thiago, Adrylan, NC) por agentes que pularam ou interpretaram mal essa etapa.
>
> ### 🎨 Princípio 17 (kit v2.2 final) — Formatação Telegram-friendly
>
> Mensagens canonical pro aluno usam **parágrafos contínuos** (1 linha por parágrafo, separados por linha em branco). NÃO quebrar manualmente a cada ~70 chars achando que "fica mais legível no editor" — Telegram preserva quebras hard e fica feio em desktop. Listas explícitas (`-`/`•`/numéricas) e code blocks pra comandos preservam quebras intencionais.
>
> Caso reportado: Adrylan Viana (03/05) viu boas-vindas cortada em desktop ("os textos ficam quebrados, tem como melhorar isso?"). Fix em [`principios-defensivos.md`](skills/starter/onboarding-checklist/references/principios-defensivos.md) (P17).

📋 **Histórico de versões:** [`CHANGELOG.md`](CHANGELOG.md) — todas mudanças desde v1.0, com trigger (falha real que motivou) + diagnóstico + fix de cada uma.

---

## Tese

Em vez do aluno seguir tutorial, instalar coisa, ler doc, configurar manual — ele baixa esse kit, joga no Telegram do agente, e o agente conduz toda a jornada de setup como tutor.

Aluno termina em ~37min com agente personalizado, autônomo, com pesquisa real, backup automático e primeira entrega de trabalho concluída.

## Pra quem é

**Aluno novo do mini-curso v2.** Workspace OpenClaw vazio (instalação fresh).

**Não é pra:** aluno antigo do curso v1 com workspace populado. Pra esse caso, o kit detecta e entrega [prompt agentic de upgrade](skills/starter/onboarding-checklist/references/prompt-upgrade-para-aluno-antigo.md) que o agente do aluno executa.

## Pré-requisitos

Antes de rodar o kit, aluno precisa ter:

- [ ] Conta OpenClaw Managed na Hostinger criada e funcionando
- [ ] Telegram bot configurado (aula A3 do curso ensina antes do kit)
- [ ] ChatGPT Plus ativo (assinatura $20/mês — modelo via OAuth)
- [ ] Conta Tavily Search API (free tier — 1.000 queries/mês · sem cartão · default desde v2.5.5) — OU Brave Search se preferir (alternativa legada · cartão obrigatório)
- [ ] Cartão pra OpenAI API (~$5-10 inicial pra Whisper)
- [ ] Hostinger Managed (~$15-30/mês — hospedagem do agente)
- [ ] Conta GitHub (grátis, criar no setup)

Custo mensal estimado: **$40-60/mês** mínimo (essencial). Com Apify/Perplexity/1Password vai pra $60-90/mês.

## Estrutura

```
starter-kit/
├── README.md                    ← este arquivo
├── manifesto.md                 ← versão visível do manifesto que aluno lê
├── BUILD.md                     ← como gerar o zip distribuível
│
├── skills/                      ← código agêntico
│   ├── _registry.md
│   ├── starter/                 ← jornada obrigatória (6 wizards + 1 mestre)
│   │   ├── _registry.md
│   │   ├── onboarding-checklist/    ← SKILL MESTRE
│   │   ├── wizard-agente/
│   │   ├── wizard-aluno/
│   │   ├── wizard-autonomia/
│   │   ├── wizard-workspace/
│   │   ├── wizard-conectar/
│   │   └── primeira-vitoria/
│   ├── canais/                  ← opcional pós-vitória
│   │   └── wizard-whatsapp/
│   └── planejamento/            ← Superpowers curado (4 skills)
│       ├── brainstorming/
│       ├── writing-plans/
│       ├── executing-plans/
│       └── verification-before-completion/
│
└── templates/                   ← arquivos raiz pré-preenchidos
    ├── USER.md.template
    ├── IDENTITY.md.template
    ├── SOUL.md.stub.template
    ├── AGENTS.md.template
    └── .env.template
```

## Jornada do aluno (5+1 passos visíveis)

```
=== Antes da gente começar (5min, opcional) ===

[ ] 0. Chave OpenAI API (pra Whisper transcrever áudios)   👤 5min
       — manda "pulo" pra deixar pra depois

=== Comece sua jornada por aqui — total estimado: ~37min ===

🎭 [ ] 1. Vamos configurar a personalidade do seu agente   🤖 4min
🎭 [ ] 2. Vamos configurar a sua personalidade             🤖 3min
⚙️ [ ] 3. Vamos liberar autonomia pra ele trabalhar        👤 6min
⚙️ [ ] 4. Vamos mostrar onde tudo vive                     🤖 4min
⚙️ [ ] 5. Vamos conectar mais superpoderes                 👤 12min
🚀 [ ] 6. Vamos rodar sua primeira vitória                 🤖 5min

📞 Travou?
   → Resposta rápida 24/7: chama @Openclawzinho (bot IA) no tópico Suporte
   → Ajuda humana: galera do mini-curso tá nos outros tópicos
   Grupo: https://t.me/cursoopenclaw
✉️  Feedback estruturado pro Bruno: bruno@microsaas.com.br
🧭 Quer entender mais? Manda "sobre"
```

## Como o kit é distribuído

Aluno baixa zip do Hotmart (área de membros do mini-curso v2) e descompacta dentro do workspace OpenClaw Managed. Próxima mensagem que o aluno mandar no Telegram dispara a `onboarding-checklist`.

Build do zip: ver [BUILD.md](BUILD.md).

## Manifesto curto

> Esse Starter Kit foi feito pelo Bruno Okamoto, autor do mini-curso. A ideia é radical: em vez de você ler manual e configurar tudo na mão, **eu sou seu tutor**. Eu te guio passo a passo, executo o que dá pra executar, te explico o que tô fazendo e por quê.
>
> Esse é um curso construído pra dois tipos de aluno: **humanos e agentes**. Você é o humano. Eu sou o agente. A gente faz isso juntos.

Versão completa: [manifesto.md](manifesto.md).

## Status

| Componente | Status |
|---|---|
| Estrutura de pastas | ✅ Criada |
| `onboarding-checklist` (mestre) | 🟢 Em construção |
| 6 wizards da jornada | ⏳ Onda 2 |
| `wizard-whatsapp` opcional | ⏳ Onda 3 |
| Superpowers curado | ⏳ Onda 3 |
| Templates raiz | ⏳ Pendente |
| Build script do zip | ⏳ Pendente |

## Como contribuir

Esse kit tá em fase de testes. Feedback estruturado: bruno@microsaas.com.br
