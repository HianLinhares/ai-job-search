---
name: geekhunter-search
version: 1.0.0
description: >
  Use this skill to search live remote job listings on GeekHunter (Brasil) via
  HTML board + JSON-LD, or look up a specific posting by URL/slug. Trigger phrases
  (PT+EN): geekhunter, geekhunter.com.br, vagas geekhunter, buscar vagas geekhunter,
  remote jobs brasil geekhunter, find geekhunter jobs, search geekhunter, look up
  this geekhunter posting, vagas remotas brasil geekhunter.
context: fork
enabled: true
allowed-tools: Bash(bun run .agents/skills/geekhunter-search/cli/src/cli.ts *)
---

# GeekHunter Search Skill

Search live remote job listings from **[GeekHunter](https://www.geekhunter.com.br)**
by parsing the public HTML board's JSON-LD (`ItemList` / `JobPosting`). No
authentication and **zero runtime dependencies** — it runs with just `bun`.

> **Personal use / robots:** `/api` and `/feeds` are disallowed; the HTML board is
> OK. Respect rate limits; do not scrape aggressively.

## When to use this skill

- Browse GeekHunter remote roles (`--remote` defaults to on → `workModality=Remoto`)
- Filter by keywords (`-q`) and optional recency (`--jobage`; undated search hits are kept)
- Look up one posting by job URL or slug path

## Commands

### Search

```bash
bun run .agents/skills/geekhunter-search/cli/src/cli.ts search [-q "<keywords>"] [flags]
```

Flags:
- `--query` / `-q` — `searchTerm` query param
- `--remote` — default `true`; when true, passes `workModality=Remoto`
- `--jobage` — client filter on detail `datePosted` when available; **null dates are kept**
- `--page`, `--limit` / `-n`, `--format json|table|plain`

### Detail

```bash
bun run .agents/skills/geekhunter-search/cli/src/cli.ts detail <url|path> [--format json|plain]
```

## Usage examples

```bash
bun run .agents/skills/geekhunter-search/cli/src/cli.ts search -q "desenvolvedor" --limit 3 --format table
bun run .agents/skills/geekhunter-search/cli/src/cli.ts detail "https://www.geekhunter.com/pt/acme/jobs/senior-dev" --format plain
```

## Output

Search JSON is `{ "meta": { "count", "page", "total" }, "results": [...] }` with
`id`, `title`, `company`, `location`, `date`, `url`, `description`, `work_mode`
(missing values are `null`, never omitted). Errors go to **stderr** as
`{ "error", "code" }` with exit `1`. Unknown flags are rejected (never silently
ignored).
