---
name: remotar-search
version: 1.0.0
description: >
  Use this skill to search live remote job listings on Remotar (Brasil) via their
  public JSON API, or look up a specific posting by id/URL. Trigger phrases (PT+EN):
  remotar, remotar.com.br, vagas remotar, buscar vagas remotar, remote jobs brasil
  remotar, find remotar jobs, search remotar, look up this remotar posting,
  vagas remotas brasil remotar.
context: fork
enabled: true
allowed-tools: Bash(bun run .agents/skills/remotar-search/cli/src/cli.ts *)
---

# Remotar Search Skill

Search live remote job listings from **[Remotar](https://remotar.com.br)** via its
unofficial public JSON API. No authentication, no API key, and **zero runtime
dependencies** — it runs with just `bun`.

> **Personal use:** This targets an unofficial public API. Respect rate limits;
> do not scrape aggressively.

## When to use this skill

- Browse Remotar's Brazil remote corpus (`--remote` defaults to on → `type=remote`)
- Filter by keywords (`-q`) and recency (`--jobage`)
- Look up one posting by numeric id or Remotar URL

## Commands

### Search

```bash
bun run .agents/skills/remotar-search/cli/src/cli.ts search [-q "<keywords>"] [flags]
```

Flags:
- `--query` / `-q` — API `search` parameter
- `--remote` — default `true`; when true, passes `type=remote`. Use `--remote false` to browse all types
- `--jobage` — posted within N days (client filter on `createdAt`)
- `--page`, `--limit` / `-n`, `--format json|table|plain`

### Detail

```bash
bun run .agents/skills/remotar-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

## Usage examples

```bash
bun run .agents/skills/remotar-search/cli/src/cli.ts search -q "desenvolvedor" --limit 3 --format table
bun run .agents/skills/remotar-search/cli/src/cli.ts search -q "react" --jobage 14 --format table
bun run .agents/skills/remotar-search/cli/src/cli.ts detail 12345 --format plain
```

## Output

Search JSON is `{ "meta": { "count", "page", "total" }, "results": [...] }` with
`id`, `title`, `company`, `location`, `date`, `url`, `description`, `work_mode`, `tags`
(missing values are `null`, never omitted). Errors go to **stderr** as
`{ "error", "code" }` with exit `1`. Unknown flags are rejected (never silently
ignored).
