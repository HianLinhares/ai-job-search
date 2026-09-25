---
name: himalayas-search
version: 1.0.0
description: >
  Use this skill to search live remote job listings on Himalayas.app via their
  public JSON search/browse API, or look up a posting by guid/slug/URL. Trigger
  phrases: himalayas, himalayas.app, himalayas jobs, remote jobs himalayas, look
  up this himalayas posting.
context: fork
enabled: false  # tech-first global portal; outside this fork's Psychology/HR scope
allowed-tools: Bash(bun run .agents/skills/himalayas-search/cli/src/cli.ts *)
---

# Himalayas Search Skill

Search live remote job listings from **[Himalayas](https://himalayas.app)** via its
public JSON API. No authentication, no API key, and **zero runtime dependencies** —
it runs with just `bun`.

## When to use this skill

- Keyword search with optional `--country` (API param; examples use `BR`)
- Browse open listings without a query
- Resolve a single posting from a Himalayas guid URL or job slug

## Commands

### Search

```bash
bun run .agents/skills/himalayas-search/cli/src/cli.ts search [-q "<keywords>"] [flags]
```

Flags:
- `--query` / `-q` — maps to API `q` (uses `/jobs/api/search`); omit to browse `/jobs/api`
- `--country` — ISO code passed to the API (e.g. `BR`). `/scrape` should pass `--country BR`
- `--jobage` — client filter on `pubDate`
- `--page`, `--limit` / `-n`, `--format json|table|plain`

Result mapping: `id` = job slug from guid path (or guid), `url` = guid,
`company` = `companyName`, `location` = `locationRestrictions` joined or `"Remote"`,
`date` = `pubDate`.

### Detail

```bash
bun run .agents/skills/himalayas-search/cli/src/cli.ts detail <slug|guid|url> [--format json|plain]
```

Job pages are HTML, not JSON. Detail parses `/companies/{companySlug}/jobs/{jobSlug}`
from the URL, searches the API with a slug-derived query, and matches on `guid`.

## Usage examples

```bash
bun run .agents/skills/himalayas-search/cli/src/cli.ts search -q "developer" --country BR --limit 3 --format table

bun run .agents/skills/himalayas-search/cli/src/cli.ts search --country BR --jobage 14 --format table

bun run .agents/skills/himalayas-search/cli/src/cli.ts detail https://himalayas.app/companies/acme/jobs/senior-engineer --format plain
```

## Output

Search JSON is `{ "meta": { "count", "page", "total" }, "results": [...] }` with
contract fields present (`null` when missing, never omitted). Errors on **stderr**
as `{ "error", "code" }` with exit `1`. Unknown flags are rejected.
