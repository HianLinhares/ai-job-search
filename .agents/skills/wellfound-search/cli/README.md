# wellfound-cli

CLI for searching [Wellfound](https://wellfound.com) via public SSR role landing
pages (`__NEXT_DATA__` / Apollo state).

**Data source**: `GET https://wellfound.com/role/l/software-engineer/brazil` (+ optional remote landing).
**Authentication**: None.
**Dependencies**: None (plain `bun` + `fetch`).

> **Personal use:** SSR landings only — `/search` is robots-disallowed; GraphQL /
> Turnstile is not used. Respect rate limits.

## Installation

```bash
cd .agents/skills/wellfound-search/cli
bun install   # optional — only TypeScript dev types
```

## Commands

| Command | Description |
|---------|-------------|
| `search` | List/filter Wellfound jobs from SSR landings |
| `detail` | Look up one job by id/URL |

```bash
bun run src/cli.ts search -q "engineer" --limit 3 --format table
bun run src/cli.ts detail 4658959 --format plain
```

See `../SKILL.md` for the full flag reference.
