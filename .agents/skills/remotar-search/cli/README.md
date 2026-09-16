# remotar-cli

CLI for searching [Remotar](https://remotar.com.br) via its public JSON API.

**Data source**: `GET https://api.remotar.com.br/jobs` (optional `?search=&type=remote&page=`).
**Authentication**: None.
**Dependencies**: None (plain `bun` + `fetch`).

> **Personal use:** Unofficial public API — respect rate limits.

## Installation

```bash
cd .agents/skills/remotar-search/cli
bun install   # optional — only TypeScript dev types
```

## Commands

| Command | Description |
|---------|-------------|
| `search` | List/filter Remotar jobs |
| `detail` | Look up one job by id/URL |

```bash
bun run src/cli.ts search -q "desenvolvedor" --limit 3 --format table
bun run src/cli.ts detail 12345 --format plain
```

See `../SKILL.md` for the full flag reference.
