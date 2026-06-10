# MEMORY.md - Long-Term Memory

## Richard

- Richard Portela deve ser chamado de Richard.
- Ele e fundador da Comunidade Catolica Voz de Deus, empreendedor de tecnologia, especialista em automacao, IA e marketing digital, e fundador da ChatHook e da ZapCode.
- Suas frentes principais sao negocios e tecnologia, gestao, e evangelizacao.
- Ele quer o Atlas como braco direito estrategico: profissional, direto, pratico, sem enrolacao, capaz de discordar quando necessario.
- A missao principal do Atlas e ajudar Richard a transformar ideias em negocios lucrativos usando tecnologia, IA, automacao e visao estrategica, sem perder valores cristaos e compromisso com a evangelizacao.

## Working Style

- Responder em Portugues do Brasil.
- Evitar respostas genericas; trazer solucoes concretas, eficientes e orientadas a crescimento sustentavel.
- Questionar decisoes ruins e pensar como socio intelectual dos projetos de Richard.

## OpenClaw Operations

- Canal preferencial com Richard: Telegram. Terminal e Gateway ficam como infraestrutura/backoffice, nao como canal normal de conversa.
- Para validar provedores/modelos configurados pelo chat, orientar Richard a enviar `/model status` ou `/models` como mensagem separada no Telegram.
- API Key fica importante para infraestrutura na Hostinger e capacidades como Whisper/audio, embeddings e memoria semantica.
- Assinatura ChatGPT/OpenAI deve ser tratada como caminho preferencial para processamento principal quando configurada, reduzindo gasto por mensagem conforme o plano de Richard.
- Em 2026-06-01, o perfil `openai-openai:richard.fullweb@gmail.com` foi fixado como ordem explicita do provedor `openai-openai`; status local mostra `Runtime auth: openai via openai uses openai-openai | status=usable`.
- Documentacao oficial de referencia: https://docs.openclaw.ai/cli
- Em 2026-06-01, Richard indicou usar https://docs.openclaw.ai/start/getting-started como referencia no lugar do starter kit por enquanto.
- Quando Richard enviar o arquivo `starter-kit-openclaw`, extrair e ler primeiro `0-LEIA-PRIMEIRO-AGENTE.md`; seguir as instrucoes do kit e tratar como material da Pixel Educacao para virar tutor do curso.
- Em 2026-06-02, Richard enviou o `starter-kit-openclaw-v2.5.7`; o kit foi extraido, 19 skills foram migradas para `workspace/skills`, e a introducao do kit foi iniciada sem sobrescrever identidade/memoria existentes. Flags: `kit_intro_done=true`, `starter_kit_version=2.5.7`.
- Richard escolheu usar a instalacao do Starter Kit em modo Wizard (assistente), para uma condução guiada e didatica.
- Em 2026-06-10, `openclaw exec-policy show` retornou `security=full` com `ask=off` no workspace /root/.openclaw/workspace, equivalente a autonomia liberada (`yolo`).
- Em 2026-06-10, a exec-policy foi ajustada para o preset `cautious`, voltando a pedir aprovação em missões sensíveis (`ask=on-miss`).
- Em 2026-06-10, a exec-policy foi restaurada para `yolo` usando `HOME=/root/.openclaw/workspace openclaw exec-policy preset yolo`; validação atual ficou `security=full` e `ask=off`.
- Em 2026-06-10, o ambiente foi detectado como `vps-root` durante a sequência do starter kit.
- Em 2026-06-10, o workspace foi organizado com `MAPA.md` raiz e mapas locais em `content/`, `memory/`, `skills/` e `archive/`.
- Em 2026-06-10, `workspace_organizado=true` e `autonomia_liberada=true` foram consolidados como estado operacional do workspace.
- Em 2026-06-10, o arquivo `.env` base foi criado com nomes canônicos de credenciais, mas as chaves ainda estão vazias.
- Em 2026-06-10, `OPENAI_API_KEY`, `OPENAI_OAUTH_TOKEN`, `TAVILY_API_KEY`, `BRAVE_SEARCH_API_KEY` e `GITHUB_TOKEN` ainda estão ausentes no ambiente.
- Em 2026-06-10, `TAVILY_API_KEY` foi adicionada ao `.env` e validada com resposta HTTP 200 na API Tavily.
- Em 2026-06-10, `GITHUB_TOKEN` foi adicionada ao `.env` e validada na API GitHub (`/user` retornou 200), mas a criação do repositório privado de backup retornou 403 `Resource not accessible by personal access token`.
- Em 2026-06-10, um segundo `GITHUB_TOKEN` também validou em `/user`, mas a criação do repositório privado de backup continuou retornando 403 `Resource not accessible by personal access token`.
- Google Drive esta conectado em `richard.fullweb@gmail.com`; perfil e listagem da raiz foram validados em 2026-06-01. Usar Drive para ler arquivos quando Richard enviar links ou pedir analise de materiais.
