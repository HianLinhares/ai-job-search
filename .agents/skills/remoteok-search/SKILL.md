---
name: remoteok-search
version: 1.0.0
description: >
  Use this skill to search live remote job listings on Remote OK via their public
  JSON API, or look up a specific posting by id/slug/URL. Trigger phrases: remote
  ok, remoteok, remoteok.com, remote jobs board, find remote developer jobs on
  remote ok, look up this remoteok posting.
context: fork
enabled: true
allowed-tools: Bash(bun run .agents/skills/remoteok-search/cli/src/cli.ts *)
---

# Remote OK Search Skill

Search live remote job listings from **[Remote OK](https://remoteok.com)** via its
public JSON API. No authentication, no API key, and **zero runtime dependencies** —
it runs with just `bun`.

## Attribution (required)

Remote OK's API terms require attribution: credit **Remote OK** and link back to
[https://remoteok.com](https://remoteok.com) whenever you surface or redistribute
results from this skill.

## When to use this skill

- Browse or filter Remote OK's remote corpus (optionally by API `--tag`)
- Prefer Brazil-relevant hits with `--country BR` (client filter on location/tags)
- Look up one posting by numeric id, slug, or Remote OK URL

## Commands

### Search

```bash
bun run .agents/skills/remoteok-search/cli/src/cli.ts search [-q "<keywords>"] [flags]
```

Flags:
- `--query` / `-q` — client filter over title, company, tags
- `--tag` — Remote OK API tag (e.g. `dev`, `javascript`)
- `--country` — client filter; `BR` keeps Brazil/Brasil/BR matches. **Without it,
  all remotes are returned** — `/scrape` should pass `--country BR` for this fork
- `--jobage` — posted within N days (client)
- `--page`, `--limit` / `-n`, `--format json|table|plain`

The API returns an array whose **first element is a legal notice** (no
slug/position) — the CLI skips it automatically.

### Detail

```bash
bun run .agents/skills/remoteok-search/cli/src/cli.ts detail <id|slug|url> [--format json|plain]
```

## Usage examples

```bash
# Brazil-relevant developer roles (what /scrape should request)
bun run .agents/skills/remoteok-search/cli/src/cli.ts search -q "developer" --country BR --limit 3 --format table

# API tag filter, last 14 days
bun run .agents/skills/remoteok-search/cli/src/cli.ts search --tag dev --jobage 14 --format table

# Full detail
bun run .agents/skills/remoteok-search/cli/src/cli.ts detail 123456 --format plain
```

## Output

Search JSON is `{ "meta": { "count", "page", "total" }, "results": [...] }` with
`id`, `title`, `company`, `location`, `date`, `url`, `description`, `tags`, `slug`
(missing values are `null`, never omitted). Errors go to **stderr** as
`{ "error", "code" }` with exit `1`. Unknown flags are rejected (never silently
ignored).
