# gupy-cli

CLI for searching [Gupy](https://portal.gupy.io/) job listings via the public
employability JSON API (Brazil-focused ATS).

**Data source**: `https://employability-portal.gupy.io/api/v1/jobs` (+ `/{id}`).
**Authentication**: None — public reads with browser-like headers.
**Dependencies**: None (plain `bun` + `fetch`). `bun install` is optional and only
pulls dev type defs.

> **Unofficial public endpoint.** For personal job-search use only. Respect rate
> limits; do not bulk-scrape commercially.

## Installation

```bash
cd .agents/skills/gupy-search/cli
bun install   # optional — only installs TypeScript dev types
```

The CLI runs without any install because it has zero runtime dependencies.

## Commands

| Command | Description |
|---------|-------------|
| `search` | Search jobs by keyword (`jobName`); default remote Brazil scope |
| `detail` | Fetch full detail for a single job by numeric id or jobUrl |

`search` accepts `--format json|table|plain` (default `json`); `detail` accepts
`--format json|plain`. All errors are written to **stderr** as
`{ "error": "...", "code": "..." }` with exit code `1`.

## Quick examples

```bash
# Desenvolvedor remoto (padrão)
bun run src/cli.ts search -q "desenvolvedor" --remote remote --limit 3 --format table

# Últimos 14 dias
bun run src/cli.ts search -q "python" --jobage 14 --format table

# Detalhe por id
bun run src/cli.ts detail 12341691 --format plain
```

See `../SKILL.md` for the full flag reference and usage notes.

## Search flags

| Flag | Alias | Description |
|------|-------|-------------|
| `--query` | `-q` | **Required.** Job name keywords (`jobName`). |
| `--jobage` | | Posted within N days (client-side on `publishedDate`). |
| `--page` | | 1-indexed page. Default 1. |
| `--limit` | `-n` | Results per page. Default 10. |
| `--remote` | | `remote` (default) \| `hybrid` \| `onsite` \| `all`. |
| `--location` | | Optional client filter on city/state. |
| `--format` | | `json` \| `table` \| `plain`. |
