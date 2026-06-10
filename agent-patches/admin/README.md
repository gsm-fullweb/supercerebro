MVP Admin (feature/admin-chat) — Patch (local)

Objetivo
---
Implementação mínima do /admin para o site smartcompany (MVP): login via Supabase Auth, chat administrativo, gravação em change_requests, execução de ações seguras (site_contacts, site_sections, posts) e registro em audit_logs.

Arquivos criados
---
- admin/
  - index.html                 # SPA admin (login, chat, histórico)
  - app.js                     # lógica cliente (Supabase Auth + UI + chamadas API)
  - style.css                  # estilos mínimos
- admin_server.js              # servidor Node minimal (serve arquivos e endpoints /api)
- operator_server_notes.txt    # notas de operação / variáveis de ambiente

Como testar localmente (STAGING)
---
1) Copie as credenciais de STAGING para o ambiente de teste (no host onde o patch está):

  export SUPABASE_URL="https://vdhcmaunhbvdwfiobhim.supabase.co"
  export SUPABASE_ANON_KEY="<supabase_anon_key>"          # usado pelo cliente (index.html)
  export SUPABASE_SERVICE_ROLE_KEY="<supabase_service_role_key>"  # usado pelo servidor para escrever no DB
  export ADMIN_ALLOWED_EMAILS="richard.fullweb@gmail.com" # recomendado; lista separada por vírgula
  export ADMIN_PORT=4050

OBS: As chaves de STAGING já estão em cache em /root/.hermes/cache/documents/doc_5c2e91f78bca_base.txt. Use-as apenas em STAGING.

2) Iniciar o servidor (no host):

  cd /root/.openclaw/workspace/agent-patches
  node admin_server.js

O servidor sobe em http://127.0.0.1:4050
Abra: http://127.0.0.1:4050/admin (ou http://localhost:4050/admin)

Funcionalidades implementadas (MVP)
---
- Login via Supabase Auth (magic link)
- Validação server-side do JWT Supabase nos endpoints /api/chat e /api/requests
- Autorização opcional por e-mail via ADMIN_ALLOWED_EMAILS / ALLOWED_ADMIN_EMAILS
- Chat UI para enviar pedidos (campo de texto + enviar)
- Histórico das últimas change_requests para site_slug=smartcompany
- Endpoint /api/chat que grava change_requests e aplica ações seguras automaticamente (heurística local)
- Endpoint /api/requests para listar change_requests (status, payload, created_at)
- Operações suportadas por heurística (update_contact, create_draft, schedule_post, noop)

Limitações conhecidas (MVP)
---
- O servidor usa SUPABASE_SERVICE_ROLE_KEY para executar ações no DB (ok para STAGING, NÃO para frontend em produção).
- O servidor agora valida o JWT Supabase via `/auth/v1/user`; o `user_email` enviado pelo cliente não é mais confiado para autorização/auditoria.
- Se `ADMIN_ALLOWED_EMAILS` não for definido, qualquer usuário autenticado no projeto Supabase consegue usar os endpoints admin. Para STAGING/produção, defina a allowlist.
- `ADMIN_REQUIRE_AUTH=0` existe apenas para desenvolvimento local sem login; não use em ambiente exposto.

Próximos passos sugeridos
---
- Proteger o admin com roles por `site_slug` no banco, não só por allowlist de e-mail.
- Mover operator UI para o próprio repo do site (branch feature/admin-chat) e abrir PR
- Implementar LLM fallback (gpt-5-mini) para frases não cobertas pela heurística

---
Patch gerado em: /root/.openclaw/workspace/agent-patches/admin/

Se quiser que eu rode o servidor agora em STAGING (usando as credenciais em cache), diga “rodar servidor” e confirmo que uso a SERVICE_ROLE_KEY do cache.
