# programathor-cli

CLI for searching [Programathor](https://programathor.com.br) via its public HTML board.

**Data source**: `GET https://programathor.com.br/jobs?search=&remoto=true`.
**Authentication**: None.
**Dependencies**: None (plain `bun` + `fetch` + HTML regex).

> **Personal use:** Detail pages often 500 — CLI returns minimal fields.

## Installation

```bash
cd .agents/skills/programathor-search/cli
bun install   # optional — only TypeScript dev types
```

## Commands

| Command | Description |
|---------|-------------|
| `search` | List/filter Programathor jobs from HTML cards |
| `detail` | Look up one job (degrades on 500) |

```bash
bun run src/cli.ts search -q "desenvolvedor" --limit 3 --format table
bun run src/cli.ts detail 12345 --format plain
```

See `../SKILL.md` for the full flag reference.
