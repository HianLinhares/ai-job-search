# geekhunter-cli

CLI for searching [GeekHunter](https://www.geekhunter.com.br) via HTML board JSON-LD.

**Data source**: `GET https://www.geekhunter.com.br/pt/vagas?...` (ItemList / JobPosting).
**Authentication**: None.
**Dependencies**: None (plain `bun` + `fetch` + regex JSON-LD parse).

> **Personal use:** `/api` and `/feeds` are robots-disallowed; HTML board only.

## Installation

```bash
cd .agents/skills/geekhunter-search/cli
bun install   # optional — only TypeScript dev types
```

## Commands

| Command | Description |
|---------|-------------|
| `search` | List/filter GeekHunter jobs from ItemList JSON-LD |
| `detail` | Look up one job by URL (JobPosting JSON-LD) |

```bash
bun run src/cli.ts search -q "desenvolvedor" --limit 3 --format table
bun run src/cli.ts detail "https://www.geekhunter.com/pt/acme/jobs/role" --format plain
```

See `../SKILL.md` for the full flag reference.
