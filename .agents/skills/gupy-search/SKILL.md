---
name: gupy-search
version: 1.0.0
description: >
  Use this skill whenever the user wants to search for jobs on Gupy, gupy.io,
  portal Gupy, ATS Brasil, vagas remotas no Brasil via Gupy, or look up a specific
  Gupy job posting. Covers Brazilian company career pages hosted on Gupy's ATS.
  Trigger phrases (PT+EN): gupy, gupy.io, portal gupy, vagas gupy, buscar vagas
  gupy, ATS brasil, vagas remotas brasil gupy, find gupy jobs, search gupy,
  gupy job search, look up this gupy job, carreira gupy, trabalhe conosco gupy.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/gupy-search/cli/src/cli.ts *)
---

# Gupy Search Skill

Search live job listings from **[Gupy](https://portal.gupy.io/)** — Brazil's
dominant ATS / employability portal — via the public employability JSON API.
No authentication, no API key, and **zero runtime dependencies** — it runs with
just `bun`.

> **Foco Brasil / Brazil-focused.** Este skill consulta o endpoint público não
> oficial de employability da Gupy (`employability-portal.gupy.io`). É pensado
> para busca de vagas **remotas no Brasil** (padrão: `workplaceTypes=remote` +
> filtro client-side de país Brasil/Brazil). Uso pessoal; respeite rate limits —
> não faça scraping agressivo nem uso comercial em volume.

## ⚠️ Personal use / endpoint não oficial

This skill talks to Gupy's public employability portal API (the same JSON the
web UI uses). It is **unofficial** (not a documented partner API), unauthenticated,
and intended for **personal job-search use only**. Keep volume low, back off on
429s, and do not use it for bulk commercial data collection.

## When to use this skill

- Search Gupy-hosted Brazilian job openings by keyword (title / role name)
- Prefer remote roles in Brazil (the fork default)
- Look one posting up by numeric id or a Gupy `jobUrl`

## Commands

### Search job listings

```bash
bun run .agents/skills/gupy-search/cli/src/cli.ts search -q "<keywords>" [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — **required.** Maps to API `jobName`.
- `--jobage <days>` — posted within N days (client-side filter on `publishedDate`).
- `--page <n>` — 1-indexed page. Default 1.
- `--limit <n>` / `-n <n>` — results per page (API `limit`). Default 10.
- `--format json|table|plain` — default `json`.
- `--remote <mode>` — `remote` (default) | `hybrid` | `onsite` | `all`. Maps to
  `workplaceTypes`; `all` omits the param. A bare `--remote` means `remote`.
- `--location <text>` — optional client-side filter matching `city` or `state`
  (the search API has no free-text location param).

Brazil scope: after the API response, jobs whose `country` is set are kept only
when it matches Brasil/Brazil (case-insensitive). Jobs with an empty/missing
country are kept.

Search JSON already includes each hit's `description` when present. `table` /
`plain` omit bodies for scannability.

### Fetch full job detail

```bash
bun run .agents/skills/gupy-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

Prefers a numeric job id (from `search` results). Also accepts:
- a path containing `/jobs/<id>` or `/job/<id>`
- a Gupy `jobUrl` whose path segment is a base64 JSON payload with `jobId`
  (e.g. `https://company.gupy.io/job/eyJqb2JJZCI6MTIz…`)

## Usage examples

```bash
# Desenvolvedor remoto no Brasil (padrão deste fork)
bun run .agents/skills/gupy-search/cli/src/cli.ts search -q "desenvolvedor" --remote remote --limit 10 --format table

# Engenheiro de software, últimos 14 dias
bun run .agents/skills/gupy-search/cli/src/cli.ts search -q "engenheiro de software" --jobage 14 --format table

# Todas as modalidades (remoto + híbrido + presencial)
bun run .agents/skills/gupy-search/cli/src/cli.ts search -q "analista" --remote all --limit 5 --format table

# Filtrar client-side por estado/cidade
bun run .agents/skills/gupy-search/cli/src/cli.ts search -q "python" --location "São Paulo" --format json

# Detalhe por id numérico
bun run .agents/skills/gupy-search/cli/src/cli.ts detail 12341691 --format plain

# Detalhe a partir de uma jobUrl Gupy
bun run .agents/skills/gupy-search/cli/src/cli.ts detail "https://company.gupy.io/job/eyJqb2JJZCI6MTIzNDE2OTEsInNvdXJjZSI6Imd1cHlfcG9ydGFsIn0=" --format json
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use; includes `description` on search hits |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

Search JSON is `{ "meta": { "count", "page", "total" }, "results": [...] }`; each
result carries `id` (stringified numeric id), `title`, `company`, `location`,
`date`, `url`, and optionally `description`. All errors go to **stderr** as
`{ "error": "...", "code": "..." }` with exit code `1`. Unknown flags are rejected
with `UNKNOWN_FLAG` (never silently discarded).

## Notes

- Endpoint: `https://employability-portal.gupy.io/api/v1/jobs` (unofficial public
  employability API used by portal.gupy.io).
- `id` is `String(job.id)` — pass it to `detail`.
- `date` is `publishedDate`; client-side `--jobage` filters on it.
- Location display joins `city` / `state` / `country`, or `"Remoto"` when remote
  and those fields are empty.
- Retries 429/5xx with exponential backoff (same pattern as freehire helpers).
- Respeite rate limits — uso pessoal apenas.
