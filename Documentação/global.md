---
title: Segundo Cérebro do Atlas
owner: Richard Portela
language: pt-BR
purpose: Registro operacional de tudo o que fazemos juntos
updated_at: 2026-06-09
---

# Segundo Cérebro do Atlas

Este arquivo serve como memória operacional do trabalho entre Richard e o Atlas.

## Objetivo

Registrar, de forma organizada e reaproveitável:
- decisões
- ações executadas
- links e arquivos importantes
- posts publicados
- imagens geradas
- erros e correções
- comandos úteis
- padrões de trabalho

## Como usar

Sempre que houver uma ação relevante, registrar aqui:
1. **data/hora**
2. **o que foi feito**
3. **resultado real**
4. **pendências / próximos passos**
5. **evidências** (URL, ID, path, output, erro)

## Regras de registro

- Registrar fatos, não intenções vagas.
- Guardar apenas o que pode ser reutilizado depois.
- Sempre citar o resultado real da execução.
- Separar por projeto/cliente quando necessário.
- Não misturar contextos diferentes.

## Contextos ativos

### Fullweb
- Site e operação de conteúdo comercial/SEO.
- Cada cliente precisa de contexto isolado.
- Não misturar branding, conteúdo, admin, SEO ou KPIs de clientes diferentes.

### Voz de Deus
- Contexto separado de negócio, evangelização e comunidade.

### ChatHook / ZapCode
- Contexto separado de produto, automação e tecnologia.

## Diário operacional

### Formato padrão

```md
## YYYY-MM-DD HH:MM

### Tarefa
- O que foi pedido:
- O que foi feito:
- Resultado real:
- Evidência:
- Próximo passo:
```

### Exemplo

```md
## 2026-06-09 14:30

### Tarefa
- O que foi pedido: gerar post teste para a Fullweb com imagem humanizada.
- O que foi feito: publiquei um post-teste e validei a abertura no front-end.
- Resultado real: post publicado com sucesso.
- Evidência: URL / ID / retorno da API.
- Próximo passo: trocar a imagem por uma versão com pessoas reais na foto.
```

## Histórico recente

### Publicação de posts na Fullweb
- Post principal publicado com sucesso: `Como reduzir leads perdidos no WhatsApp com IA`
- IDs de teste publicados: `106`, `107`, `108`, `109`, `110`, `111`
- Fluxo de publicação validado no endpoint `admin-pub/publish.php`

### Imagens humanizadas
- O objetivo da capa é parecer foto real, não arte de IA.
- Requisitos:
  - uma única cena
  - pessoas reais na foto
  - aparência humana natural
  - qualidade profissional
  - tons claros
  - estilo SaaS moderno
- Não usar colagens, mosaicos, grids ou múltiplas cenas.

### GitHub / repositório
- Remoto configurado para `https://github.com/gsm-fullweb/supercerebro.git`
- Push ainda bloqueado por falta de autenticação no ambiente
- Sem `gh auth`, sem `GITHUB_TOKEN`, sem chave SSH configurada

## Decisões importantes

- A Fullweb deve vender resultado, não tecnologia.
- A operação de conteúdo deve focar em conversão, retenção e autoridade.
- Imagem humanizada precisa ter pessoas reais na foto.
- Cada cliente deve ter contexto isolado.

## Endereços e caminhos úteis

- Script local de imagem: `/root/.hermes/scripts/nano_banana_fullweb_agent.py`
- Skill de conteúdo SEO: `/root/.hermes/skills/seo/seo-cx-content-generator/`
- Prompt de capa humanizada: `/root/.hermes/skills/seo/seo-cx-content-generator/references/image-prompt-guidelines.md`

## Próximas melhorias

- Criar um registro automático por sessão
- Adicionar bloco de decisões por projeto
- Conectar este arquivo a um vault do Obsidian, se desejar
- Transformar este markdown em template recorrente de trabalho
# supercerebro
