---
name: wellfound-search
version: 1.0.0
description: >
  Use this skill to search live remote job listings on Wellfound (AngelList) via
  public SSR landing HTML (`__NEXT_DATA__` / Apollo state), or look up a specific
  posting by id/URL. Trigger phrases (PT+EN): wellfound, wellfound.com, angelist,
  angel list jobs, vagas wellfound, buscar vagas wellfound, remote jobs wellfound
  brazil, find wellfound jobs, search wellfound, look up this wellfound posting,
  vagas remotas brasil wellfound.
context: fork
enabled: true
allowed-tools: Bash(bun run .agents/skills/wellfound-search/cli/src/cli.ts *)
---

# Wellfound Search Skill

Search live job listings from **[Wellfound](https://wellfound.com)** by fetching
SSR role landing pages that embed `__NEXT_DATA__` with Apollo state. No GraphQL,
no Turnstile challenge for search. No authentication, no API key, and **zero
runtime dependencies** — it runs with just `bun`.

> **Personal use:** SSR landings only. Wellfound's `/search` is robots-disallowed;
> GraphQL behind Turnstile is **not** used. Respect rate limits; do not scrape
> aggressively.

## When to use this skill

- Browse Wellfound Brazil software-engineer landings (`--remote` defaults to on)
- Filter by keywords (`-q`) and recency (`--jobage`)
- Look up one posting by numeric id or Wellfound job URL

## Commands

### Search

```bash
bun run .agents/skills/wellfound-search/cli/src/cli.ts search [-q "<keywords>"] [flags]
```

Flags:
- `--query` / `-q` — client filter: all tokens must match title/company/description
- `--remote` — default `true`; keep jobs with `remote===true` or locations mentioning Brazil/Brasil/Remote. Use `--remote false` to skip that filter
- `--country` — optional client location filter (e.g. `BR` / `Brazil` / `Brasil`)
- `--jobage` — posted within N days (client filter on `liveStartAt`)
- `--page`, `--limit` / `-n`, `--format json|table|plain`

### Detail

```bash
bun run .agents/skills/wellfound-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

## Usage examples

```bash
bun run .agents/skills/wellfound-search/cli/src/cli.ts search -q "engineer" --limit 3 --format table
bun run .agents/skills/wellfound-search/cli/src/cli.ts search -q "react" --jobage 14 --format table
bun run .agents/skills/wellfound-search/cli/src/cli.ts detail 4658959 --format plain
```

## Output

Search JSON is `{ "meta": { "count", "page", "total" }, "results": [...] }` with
`id`, `title`, `company`, `location`, `date`, `url`, `description`, `work_mode`, `slug`
(missing values are `null`, never omitted). Errors go to **stderr** as
`{ "error", "code" }` with exit `1`. Unknown flags are rejected (never silently
ignored).
