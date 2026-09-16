---
name: programathor-search
version: 1.0.0
description: >
  Use this skill to search live remote job listings on Programathor (Brasil) via
  the public HTML job board, or look up a posting by id/URL. Trigger phrases
  (PT+EN): programathor, programathor.com.br, vagas programathor, buscar vagas
  programathor, remote jobs brasil programathor, find programathor jobs, search
  programathor, look up this programathor posting, vagas remotas brasil programathor.
context: fork
enabled: true
allowed-tools: Bash(bun run .agents/skills/programathor-search/cli/src/cli.ts *)
---

# Programathor Search Skill

Search live remote job listings from **[Programathor](https://programathor.com.br)**
by parsing the public HTML job list. No authentication and **zero runtime
dependencies** — it runs with just `bun`.

> **Personal use:** Public HTML board only. Detail pages often return HTTP 500 —
> the CLI degrades gracefully. Respect rate limits.

## When to use this skill

- Browse Programathor remote roles (`--remote` defaults to on → `remoto=true`)
- Filter by keywords (`-q`); undated rows are kept when `--jobage` is set
- Look up one posting (detail may be unavailable — returns minimal fields)

## Commands

### Search

```bash
bun run .agents/skills/programathor-search/cli/src/cli.ts search [-q "<keywords>"] [flags]
```

Flags:
- `--query` / `-q` — `search` query param
- `--remote` — default `true`; when true, passes `remoto=true`
- `--jobage` — client filter when date known; **null dates are kept**
- `--page`, `--limit` / `-n`, `--format json|table|plain`

### Detail

```bash
bun run .agents/skills/programathor-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

On HTTP 500 / unreadable detail HTML, exits `0` with URL-derived fields and
`description` noting `(detalhe indisponível no portal)`.

## Usage examples

```bash
bun run .agents/skills/programathor-search/cli/src/cli.ts search -q "desenvolvedor" --limit 3 --format table
bun run .agents/skills/programathor-search/cli/src/cli.ts detail 12345 --format plain
```

## Output

Search JSON is `{ "meta": { "count", "page", "total" }, "results": [...] }` with
`id`, `title`, `company`, `location`, `date`, `url`, `description`, `work_mode`
(missing values are `null`, never omitted). Errors go to **stderr** as
`{ "error", "code" }` with exit `1`. Unknown flags are rejected (never silently
ignored).
