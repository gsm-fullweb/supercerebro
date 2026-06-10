# memory/seo-workflow.md — Pipeline SEO Programático
**Fullweb AI-Native Agency**
Última atualização: 2026-06-09

---

## Visão Geral

Este documento descreve o pipeline completo de SEO Programático com Blog Autônomo da Fullweb.

É a referência central para Atlas (estratégia), Hermes (execução) e Raptor (infraestrutura).

---

## O que é SEO Programático

SEO Programático é a produção sistemática e escalável de conteúdo otimizado para buscadores, onde:

- A pesquisa de palavras-chave é automatizada
- A geração de conteúdo é feita por IA
- A publicação é automatizada via pipeline
- O monitoramento é contínuo e autônomo
- O humano intervém apenas para ajuste estratégico

---

## Pipeline Completo (5 Fases)

---

### FASE 1 — Estratégia (Atlas)

**Responsável:** Atlas
**Gatilho:** Novo cliente ou ciclo mensal

**Etapas:**
1. Definir nicho e temas principais do cliente
2. Mapear intenção de busca do público-alvo
3. Pesquisar clusters de palavras-chave (seed → relacionadas → long tail)
4. Classificar por volume, dificuldade e potencial de conversão
5. Definir arquitetura de conteúdo (pillar pages + supporting pages)
6. Priorizar pautas para o ciclo

**Ferramentas:**
- Google Search Console (dados reais do site)
- Google Keyword Planner
- Ahrefs / SEMrush / Ubersuggest
- People Also Ask (Google)
- N8N para automação de pesquisa

**Entregável para Hermes:**
```
BRIEF DE CONTEÚDO
Cliente: ...
Cluster: ...
Palavra-chave principal: ...
Volume mensal: ...
Dificuldade (KD): ...
Intenção de busca: ...
Título sugerido: ...
Estrutura H2/H3: ...
Personas que lerão: ...
CTA esperado: ...
Links internos: ...
```

---

### FASE 2 — Produção (Hermes)

**Responsável:** Hermes
**Gatilho:** Recebimento de brief do Atlas

**Etapas:**
1. Analisar SERP para a keyword principal (top 5 resultados)
2. Identificar gaps de conteúdo (o que concorrente não cobre)
3. Gerar artigo com estrutura otimizada
4. Garantir: título H1, meta description, H2/H3, parágrafos, FAQ, CTA
5. Inserir links internos e externos
6. Revisar leiturabilidade e naturalidade do texto
7. Formatar para publicação

**Estrutura padrão de artigo:**
```
- Título H1 (palavra-chave principal)
- Introdução (150-200 palavras, responde direto a dúvida)
- H2: [Subtema 1]
- H2: [Subtema 2]
- H2: [Subtema 3]
- H2: Perguntas Frequentes (FAQ Schema)
  - Pergunta 1
  - Pergunta 2
  - Pergunta 3
- Conclusão + CTA
- Meta description (150-160 caracteres, inclui keyword)
```

**Parâmetros de qualidade obrigatórios:**
- Mínimo 1.200 palavras (artigos informativos)
- Mínimo 800 palavras (artigos comerciais/comparativos)
- Keyword density: 1-2% (natural, não forçado)
- Pelo menos 1 imagem com alt text otimizado
- Pelo menos 2 links internos
- Pelo menos 1 link externo para fonte de autoridade

---

### FASE 3 — Publicação (Raptor + Hermes)

**Responsável:** Raptor (pipeline) + Hermes (execução)
**Gatilho:** Artigo aprovado

**Etapas:**
1. Raptor mantém pipeline de publicação ativo (N8N → CMS)
2. Hermes envia conteúdo formatado para o pipeline
3. Sistema publica no CMS (WordPress / outro)
4. Sistema configura automaticamente:
   - Slug (URL amigável)
   - Meta description
   - Categoria e tags
   - Imagem destacada
   - Schema markup (Article, FAQ)
5. Confirmação de publicação registrada no log

**Integrações mantidas por Raptor:**
- N8N → WordPress REST API
- Google Search Console → indexação imediata (GSC API)
- Sitemap XML → atualização automática

---

### FASE 4 — Monitoramento (Hermes)

**Responsável:** Hermes
**Frequência:** Diária (alertas) + Semanal (relatório)

**Métricas monitoradas:**
- Posição média por keyword
- Impressões e cliques (GSC)
- CTR por página
- Páginas com queda de posição (>3 posições em 7 dias)
- Páginas com potencial de subir (posição 8-15)
- Novas keywords ranqueando organicamente

**Gatilhos de ação:**
| Situação | Ação |
|---|---|
| Artigo caiu >5 posições | Atualizar conteúdo + checar backlinks |
| Artigo entre pos. 8-15 | Fortalecer com link interno + enriquecer |
| Artigo sem impressões em 30 dias | Revisar keyword + reformular título |
| Nova keyword ranqueando | Criar artigo dedicado |

**Relatório semanal para Atlas:**
```
RELATÓRIO SEO SEMANAL
Período: ...
Cliente: ...

Top 5 artigos (por cliques): ...
Artigos em queda: ...
Artigos em subida: ...
Novas keywords: ...
Recomendação: ...
```

---

### FASE 5 — Otimização (Atlas + Hermes)

**Responsável:** Atlas (decisão) + Hermes (execução)
**Frequência:** Mensal

**Atividades:**
1. Atlas analisa relatório de Hermes
2. Identifica artigos para atualização prioritária
3. Identifica gaps de conteúdo novos
4. Ajusta clusters e pautas do próximo ciclo
5. Hermes executa atualizações e novas produções

---

## Tipos de Conteúdo Produzidos

| Tipo | Objetivo | Volume |
|---|---|---|
| Artigo informacional | Topo de funil, volume de tráfego | Principal |
| Artigo comparativo | Meio de funil, consideração | Secundário |
| Landing page de serviço | Fundo de funil, conversão | Pontual |
| FAQ page | Featured snippet, voz | Complementar |
| Pillar page | Autoridade temática | 1 por cluster |

---

## Escala de Produção

| Plano | Artigos/mês | Ciclo |
|---|---|---|
| Essencial | 8 artigos | 2/semana |
| Crescimento | 16 artigos | 4/semana |
| Escala | 30+ artigos | Diário |

---

## Regras Absolutas

1. **Nunca publicar conteúdo sem keyword definida pelo Atlas.**
2. **Nunca publicar sem meta description.**
3. **Nunca publicar texto que pareça gerado por robô** — Hermes deve garantir naturalidade.
4. **Raptor nunca desliga pipeline sem avisar Atlas.**
5. **Todo conteúdo publicado deve ser registrado em `logs/publicacoes.md`.**
