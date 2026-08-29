# himalayas-cli

CLI for searching [Himalayas.app](https://himalayas.app) via its public JSON API.

**Data source**: `/jobs/api/search`, `/jobs/api`.
**Authentication**: None.
**Dependencies**: None (plain `bun` + `fetch`).

## Installation

```bash
cd .agents/skills/himalayas-search/cli
bun install   # optional — only TypeScript dev types
```

## Commands

| Command | Description |
|---------|-------------|
| `search` | Keyword search or browse |
| `detail` | Resolve one job via search match on guid |

```bash
bun run src/cli.ts search -q "developer" --country BR --limit 3 --format table
bun run src/cli.ts detail https://himalayas.app/companies/acme/jobs/senior-engineer --format plain
```

See `../SKILL.md` for the full flag reference.
