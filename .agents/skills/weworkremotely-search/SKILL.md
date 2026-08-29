---
name: weworkremotely-search
version: 1.0.0
description: >
  Use this skill to search live remote job listings on We Work Remotely via their
  public RSS feeds, or look up a posting by URL. Trigger phrases: we work remotely,
  weworkremotely, wwr, weworkremotely.com, remote jobs rss, look up this we work
  remotely posting.
context: fork
enabled: true
allowed-tools: Bash(bun run .agents/skills/weworkremotely-search/cli/src/cli.ts *)
---

# We Work Remotely Search Skill

Search live remote job listings from **[We Work Remotely](https://weworkremotely.com)**
via public RSS feeds. No authentication, no API key, and **zero runtime
dependencies** — RSS is parsed with regex under `bun`.

## When to use this skill

- Browse the main remote feed or a category feed (`--category programming`, etc.)
- Client-filter by keyword; optionally keep Brazil/LATAM mentions with `--country BR`
- Fetch detail from the job URL (RSS description or HTML strip)

## Commands

### Search

```bash
bun run .agents/skills/weworkremotely-search/cli/src/cli.ts search [-q "<keywords>"] [flags]
```

Flags:
- `--query` / `-q` — client filter over title, company, description
- `--category` — maps to a category RSS (e.g. `programming`, `devops`, `design`)
- `--country BR` — client filter for Brazil/Brasil/LATAM keywords in title/description
- `--jobage`, `--page`, `--limit` / `-n`, `--format json|table|plain`

WWR titles are often `Company: Role` — the CLI splits them into `company` + `title`.

### Detail

```bash
bun run .agents/skills/weworkremotely-search/cli/src/cli.ts detail <url|slug> [--format json|plain]
```

Tries matching the URL in common RSS feeds first; otherwise fetches the job HTML
and strips text.

## Usage examples

```bash
bun run .agents/skills/weworkremotely-search/cli/src/cli.ts search -q "developer" --limit 3 --format table

bun run .agents/skills/weworkremotely-search/cli/src/cli.ts search --category programming --country BR --format table

bun run .agents/skills/weworkremotely-search/cli/src/cli.ts detail https://weworkremotely.com/remote-jobs/example --format plain
```

## Output

Search JSON is `{ "meta": { "count", "page", "total" }, "results": [...] }` with
`id`, `title`, `company`, `location`, `date`, `url`, `description` (`null` when
missing, never omitted). Errors on **stderr** as `{ "error", "code" }` with exit
`1`. Unknown flags are rejected.
