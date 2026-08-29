# remoteok-cli

CLI for searching [Remote OK](https://remoteok.com) via its public JSON API.

**Data source**: `GET https://remoteok.com/api` (optional `?tag=`).
**Authentication**: None.
**Dependencies**: None (plain `bun` + `fetch`).

> **Attribution:** Credit Remote OK and link to https://remoteok.com when using results.

## Installation

```bash
cd .agents/skills/remoteok-search/cli
bun install   # optional — only TypeScript dev types
```

## Commands

| Command | Description |
|---------|-------------|
| `search` | List/filter Remote OK jobs |
| `detail` | Look up one job by id/slug/URL |

```bash
bun run src/cli.ts search -q "developer" --country BR --limit 3 --format table
bun run src/cli.ts detail 123456 --format plain
```

See `../SKILL.md` for the full flag reference.
