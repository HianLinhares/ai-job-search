# Search Queries for Job Scraper — Brasil remoto

<!-- Escopo fixo: somente vagas REMOTAS no Brasil. -->

## Configuração de mercado

| Parâmetro | Valor |
|-----------|-------|
| **País** | Brasil |
| **Modalidade** | **Somente remoto** (híbrido/presencial fora do escopo) |
| **Idioma das queries** | Português (BR) |

**Regra obrigatória em todo `/scrape`:**
1. Usar apenas CLIs abaixo com os flags de remoto/BR documentados
2. Após a busca, **descartar** resultados presenciais ou sem elegibilidade Brasil
3. Portais dinamarqueses permanecem `enabled: false`

## Installed portal CLIs (primary for `/scrape`)

| Skill | Flags padrão (remoto BR) |
|-------|--------------------------|
| `linkedin-search` | `-l "Brazil" --remote remote` |
| `freehire-search` | `--country BR --remote remote` |
| `gupy-search` | `-q "<termo>" --remote remote` |
| `remoteok-search` | `-q "<termo>" --country BR` |
| `himalayas-search` | `-q "<termo>" --country BR` |
| `weworkremotely-search` | `-q "<termo>"` (+ filtro BR client-side quando possível) |

### Exemplos CLI

```bash
bun run .agents/skills/linkedin-search/cli/src/cli.ts search \
  -l "Brazil" --remote remote -q "desenvolvedor" --jobage 14 --limit 20 --format json

bun run .agents/skills/freehire-search/cli/src/cli.ts search \
  -q "desenvolvedor" --country BR --remote remote --jobage 14 --limit 20 --format json

bun run .agents/skills/gupy-search/cli/src/cli.ts search \
  -q "desenvolvedor" --remote remote --jobage 14 --limit 20 --format json

bun run .agents/skills/remoteok-search/cli/src/cli.ts search \
  -q "developer" --country BR --jobage 14 --limit 20 --format json

bun run .agents/skills/himalayas-search/cli/src/cli.ts search \
  -q "developer" --country BR --jobage 14 --limit 20 --format json

bun run .agents/skills/weworkremotely-search/cli/src/cli.ts search \
  -q "developer" --jobage 14 --limit 20 --format json
```

Não use `--region latam` no Freehire sem `--country BR`. Não use cidade LinkedIn (São Paulo) como `-l` principal — use `"Brazil"` + `--remote remote`.

## Portais NÃO suportados como CLI (não implementar)

Estas fontes **não** devem ganhar skill CLI neste fork (ToS, login, API inexistente ou board encerrado). O `/scrape` **não** deve inventar scrapers para elas:

| Plataforma | Motivo |
|------------|--------|
| **Indeed** | Sem API pública de busca; ToS proíbe bots |
| **Glassdoor** | ToS + robots bloqueiam job/search |
| **Google for Jobs** | Sem API oficial; agregador dinâmico |
| **Wellfound (AngelList)** | Sem API pública; login + anti-bot |
| **Toptal / Turing / Revelo** | Marketplace/matching, não board de busca pública |
| **Stack Overflow Jobs** | Encerrado |

**Fallback fraco (opcional):** WebSearch com `site:br.indeed.com` ou queries genéricas — resultados menos estruturados e possivelmente defasados. Preferir as CLIs instaladas.

## Search Sites (WebSearch fallback only)

Para portais **sem** CLI ou se a CLI falhar — sempre com “remoto” + Brasil:

- **gupy.io** — preferir CLI `gupy-search`; WebSearch só se a CLI falhar
- **vagas.com.br** / **catho.com.br** / **infojobs.com.br** — sem CLI ainda (HTML frágil)
- **programathor.com.br** / **geekhunter.com.br** / **trampos.co** — fase HTML (se skill existir e `enabled: true`)
- **br.indeed.com** — apenas WebSearch fraco; sem CLI

## Query Categories

Toda query WebSearch deve incluir **remoto** (ou remote) e **Brasil**.

### Priority 1: Desenvolvimento de software

```
site:gupy.io "desenvolvedor" remoto Brasil
site:gupy.io "engenheiro de software" remoto
site:vagas.com.br "desenvolvedor backend" remoto
site:catho.com.br "desenvolvedor full stack" remoto Brasil
site:infojobs.com.br "engenheiro de software" remoto
site:linkedin.com/jobs "desenvolvedor" remoto Brasil
```

CLI (rodar em paralelo):
- LinkedIn / Freehire / Gupy / Himalayas / RemoteOK / WWR com os termos: desenvolvedor, engenheiro de software, backend, frontend, fullstack

### Priority 2: Dados e inteligência artificial

```
site:gupy.io "cientista de dados" remoto
site:linkedin.com/jobs "cientista de dados" remoto Brasil
```

CLI: `-q "cientista de dados"` / `"engenheiro de dados"` / `"machine learning"` (+ flags remoto BR)

### Priority 3: DevOps, plataforma e infraestrutura

```
site:gupy.io "devops" remoto Brasil
site:linkedin.com/jobs "devops" remoto Brasil
```

CLI: `-q "devops"` / `"SRE"`

### Priority 4: Rede mais ampla (tech)

```
site:gupy.io "desenvolvedor python" remoto
site:linkedin.com/jobs "tech lead" remoto Brasil
```

## Location Filter

**PASS:** remoto / home office com elegibilidade Brasil  
**FAIL:** presencial/híbrido; remoto só outros países; realocação internacional  
**FLAG:** título remoto mas descrição exige presença frequente

## Language Filter

Language Gate de `04-job-evaluation.md` + tabela Languages em `CLAUDE.md`.

## Date Filter

Últimos 14 dias, ou prazo aberto. Sem data → flag "data desconhecida".

## Adapting Queries

- `/scrape backend` → Priority 1 + termos backend (sempre remoto BR)
- `/scrape junior` → júnior/junior (sempre remoto BR)
- Nunca remover filtros remoto/BR sem o usuário pedir explicitamente
