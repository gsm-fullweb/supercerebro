# ChatHook Staging

Stack isolada para restaurar e testar o backup do ChatHook fora da producao.

## Portas

- Frontend: `127.0.0.1:18080`
- Backend, quando habilitado: `127.0.0.1:13000`

Nada e publicado em `80` ou `443`, para nao conflitar com o Traefik/OpenCloud existente.

## Subir stack inicial

```bash
docker compose up -d frontend postgres redis
curl -I http://127.0.0.1:18080/health
```

## Backend

O backend fica em profile separado:

```bash
docker compose --profile backend up -d backend
```

Ele depende de variaveis reais de integracao, entao nao deve ser habilitado antes da revisao.
