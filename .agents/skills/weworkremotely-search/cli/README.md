# weworkremotely-cli

CLI for searching [We Work Remotely](https://weworkremotely.com) via public RSS.

**Data source**: `remote-jobs.rss` and category feeds.
**Authentication**: None.
**Dependencies**: None (plain `bun` + `fetch`; regex RSS parse).

## Installation

```bash
cd .agents/skills/weworkremotely-search/cli
bun install   # optional — only TypeScript dev types
```

## Commands

| Command | Description |
|---------|-------------|
| `search` | Filter the RSS feed |
| `detail` | Resolve one job from URL (RSS or HTML) |

```bash
bun run src/cli.ts search -q "developer" --limit 3 --format table
bun run src/cli.ts detail https://weworkremotely.com/remote-jobs/example --format plain
```

See `../SKILL.md` for the full flag reference.
