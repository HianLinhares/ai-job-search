# Search Queries for Job Scraper — Brasil remoto

<!-- Escopo fixo: somente vagas REMOTAS no Brasil. -->

## Configuração de mercado

| Parâmetro | Valor |
|-----------|-------|
| **País** | Brasil |
| **Modalidade** | **Somente remoto** (híbrido/presencial fora do escopo) |
| **LinkedIn CLI** | `--location "Brazil" --remote remote` |
| **Freehire CLI** | `--country BR --remote remote` |
| **Idioma das queries** | Português (BR) |

**Regra obrigatória em todo `/scrape`:**
1. LinkedIn: sempre `-l "Brazil" --remote remote`
2. Freehire: sempre `--country BR --remote remote`
3. Após a busca, **descartar** resultados que não sejam remotos ou que exijam presencial fora do Brasil / realocação internacional
4. Portais dinamarqueses permanecem `enabled: false`

## Installed portal CLIs (primary for `/scrape`)

**linkedin-search** — padrão deste fork:

```bash
bun run .agents/skills/linkedin-search/cli/src/cli.ts search \
  --location "Brazil" \
  --remote remote \
  --query "<termo>" --jobage 14 --limit 20 --format json
```

Não use cidade específica (São Paulo, Rio, etc.) como localização principal — isso mistura presencial. O filtro `--remote remote` + `"Brazil"` é a combinação correta.

**freehire-search** — padrão deste fork:

```bash
bun run .agents/skills/freehire-search/cli/src/cli.ts search \
  -q "<termo>" \
  --country BR \
  --remote remote \
  --jobage 14 --limit 20 --format json
```

Não use `--region latam` sem `--country BR`: isso puxa México, Argentina, etc. Se precisar de vagas remotas sem país resolvido, prefira uma segunda chamada explícita e revise manualmente — o padrão é só `BR`.

As linhas `site:` abaixo são o **fallback WebSearch** (sempre com “remoto” / “remote” + Brasil).

## Search Sites

Primários (fallback WebSearch):
- **gupy.io** — ATS Brasil
- **vagas.com.br** / **catho.com.br** / **infojobs.com.br** / **br.indeed.com**
- **linkedin.com/jobs** — coberto pela CLI `linkedin-search`

## Query Categories

Toda query WebSearch deve incluir **remoto** (ou remote) e **Brasil**.

### Priority 1: Desenvolvimento de software

```
site:gupy.io "desenvolvedor" remoto Brasil
site:gupy.io "engenheiro de software" remoto
site:vagas.com.br "desenvolvedor backend" remoto
site:catho.com.br "desenvolvedor full stack" remoto Brasil
site:infojobs.com.br "engenheiro de software" remoto
site:br.indeed.com "software engineer" remote Brazil
site:linkedin.com/jobs "desenvolvedor" remoto Brasil
```

CLI:
- LinkedIn: `-q "desenvolvedor"` / `"engenheiro de software"` / `"software engineer"` / `"backend"` / `"frontend"` / `"fullstack"` com `-l "Brazil" --remote remote`
- Freehire: mesmas keywords ou `--category backend,frontend,fullstack` com `--country BR --remote remote`

### Priority 2: Dados e inteligência artificial

```
site:gupy.io "cientista de dados" remoto
site:gupy.io "engenheiro de dados" remoto Brasil
site:vagas.com.br "analista de dados" remoto
site:br.indeed.com "data engineer" remote Brazil
site:linkedin.com/jobs "cientista de dados" remoto Brasil
```

CLI:
- LinkedIn: `-q "cientista de dados"` / `"engenheiro de dados"` / `"machine learning"` + remoto BR
- Freehire: `-q "data"` / `--category ml_ai` + `--country BR --remote remote`

### Priority 3: DevOps, plataforma e infraestrutura

```
site:gupy.io "devops" remoto Brasil
site:gupy.io "SRE" remoto
site:linkedin.com/jobs "devops" remoto Brasil
```

CLI:
- LinkedIn: `-q "devops"` / `"SRE"` + remoto BR
- Freehire: `--category devops` + `--country BR --remote remote`

### Priority 4: Rede mais ampla (tech)

```
site:gupy.io "desenvolvedor python" remoto
site:gupy.io "desenvolvedor react" remoto Brasil
site:br.indeed.com "desenvolvedor" remoto Brasil
site:linkedin.com/jobs "tech lead" remoto Brasil
```

## Location Filter

Escopo **somente remoto no Brasil**.

**PASS:**
- Remoto / home office / 100% remoto com sede ou elegibilidade no Brasil
- Remoto Brasil (qualquer cidade listada como sede, desde que o anúncio seja remoto)

**FAIL (não apresentar):**
- Presencial ou híbrido obrigatório
- Remoto só para outros países (EUA, Europa, LATAM fora do Brasil) sem elegibilidade BR
- Exige realocação internacional

**FLAG (mostrar com aviso):**
- Título diz remoto, mas a descrição exige presença frequente no escritório — citar o trecho

## Language Filter

Idiomas em `CLAUDE.md`. Language Gate de `04-job-evaluation.md`: idioma não declarado → excluir; nível abaixo do pedido → sinalizar.

## Date Filter

Últimos 14 dias, ou prazo ainda aberto. Sem data → incluir com flag "data desconhecida".

## Adapting Queries

- `/scrape backend` → Priority 1 + termos backend (sempre com remoto BR)
- `/scrape junior` → adicionar júnior/junior às queries (sempre remoto BR)
- Nunca remover `--remote remote` / `--country BR` sem o usuário pedir explicitamente ampliar o escopo
