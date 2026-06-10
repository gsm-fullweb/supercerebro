# A4 SmartSites Backend

Backend multi-tenant para sites inteligentes da A4IA.

Ele centraliza:

- conteudo de sites em Supabase;
- API publica para frontends React/Vercel;
- comandos por WhatsApp ou webhook;
- interpretacao com IA;
- auditoria, publicacao e rollback.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Depois aplique `supabase/migrations/001_initial_schema.sql` no Supabase.

## Rotas Principais

- `GET /health`
- `GET /public/sites/:siteSlug/config`
- `GET /public/sites/:siteSlug/pages/:pageSlug`
- `GET /public/sites/:siteSlug/posts`
- `POST /agent/commands`

`POST /agent/commands` exige o header:

```http
X-Agent-Secret: valor-do-AGENT_WEBHOOK_SECRET
```

## Conceito

O frontend continua em React/Vercel. Este backend serve dados para qualquer site e recebe comandos de atualizacao por WhatsApp.
