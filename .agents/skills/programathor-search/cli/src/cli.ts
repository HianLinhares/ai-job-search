#!/usr/bin/env bun
// Self-contained CLI for searching Programathor's public HTML board.
// Zero runtime dependencies — runs anywhere `bun` is available.

import { runSearch, type SearchOpts } from "./commands/search.js"
import { runDetail, type DetailOpts } from "./commands/detail.js"
import { baseUrl } from "./helpers.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}

const ALIAS: Record<string, string> = { q: "query", n: "limit" }

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith("-")) {
      ;(flags._ as string[]).push(a)
      continue
    }
    const name = a.replace(/^-+/, "")
    const key = ALIAS[name] ?? name
    const next = argv[i + 1]
    let value: string | boolean = true
    if (next !== undefined && !next.startsWith("-")) {
      value = next
      i++
    }
    flags[key] = value
  }
  return flags
}

type FlagValue = string | boolean | string[] | undefined

function stringFlag(raw: FlagValue): string | undefined {
  if (typeof raw === "string") return raw
  return undefined
}

/** Default true. Bare `--remote` → true; `--remote false` → false. */
function parseRemoteFlag(raw: FlagValue): boolean {
  if (raw === undefined) return true
  if (raw === true) return true
  if (typeof raw === "string") {
    const v = raw.trim().toLowerCase()
    if (["false", "0", "no", "off", "all"].includes(v)) return false
    if (["true", "1", "yes", "on", "remote"].includes(v)) return true
  }
  return true
}

const HELP = `programathor-cli — search Programathor Brasil remote job listings

USAGE
  bun run src/cli.ts search [-q "<keywords>"] [--remote true|false] [--format json|table|plain]
  bun run src/cli.ts detail <id|url> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>   Keyword search (search=). Optional — omit to browse.
  --remote <bool>      Default true → remoto=true. Use --remote false to omit.
  --jobage <days>      Posted within N days when date known; null dates are kept.
  --page <n>           1-indexed page (client slice). Default 1.
  --limit, -n <n>      Results per page. Default 25.
  --format <fmt>       json (default) | table | plain.

DETAIL
  <id|url>             Numeric id or https://programathor.com.br/jobs/<id>-<slug>.
                       On HTTP 500, returns minimal fields (exit 0).

EXAMPLES
  bun run src/cli.ts search -q "desenvolvedor" --limit 3 --format table
  bun run src/cli.ts detail 12345 --format plain

Personal use warning. Source: ${baseUrl()}
`

function parseIntFlag(name: string, raw: string | boolean | string[]): number | null {
  const val = typeof raw === "string" ? Number(raw.trim()) : NaN
  if (!Number.isInteger(val) || val < 1) {
    process.stderr.write(
      JSON.stringify({ error: `--${name} must be a whole number of at least 1, got "${raw}"`, code: "BAD_ARG" }) +
        "\n",
    )
    return null
  }
  return val
}

const KNOWN_FLAGS: Record<string, Set<string>> = {
  search: new Set(["query", "jobage", "page", "limit", "format", "remote", "help", "h"]),
  detail: new Set(["format", "help", "h"]),
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2)
  const flags = parseFlags(argv)
  const cmd = (flags._ as string[])[0]

  if (!cmd || flags.help || flags.h) {
    process.stdout.write(HELP)
    return cmd ? 0 : 1
  }

  const knownFlags = KNOWN_FLAGS[cmd]
  if (knownFlags) {
    for (const key of Object.keys(flags)) {
      if (key === "_" || knownFlags.has(key)) continue
      process.stderr.write(
        JSON.stringify({
          error: `unknown flag --${key} for '${cmd}' - flags are never silently ignored, because a discarded filter changes what the search returns; see --help for the supported flags`,
          code: "UNKNOWN_FLAG",
        }) + "\n",
      )
      return 1
    }
  }

  if (cmd === "search") {
    const fmt = (flags.format as string) || "json"
    for (const name of ["jobage", "page", "limit"] as const) {
      if (flags[name] !== undefined) {
        const v = parseIntFlag(name, flags[name])
        if (v === null) return 1
        flags[name] = String(v)
      }
    }
    const opts: SearchOpts = {
      query: stringFlag(flags.query),
      remote: parseRemoteFlag(flags.remote),
      jobage: flags.jobage ? parseInt(flags.jobage as string, 10) : 9999,
      page: flags.page ? Math.max(1, parseInt(flags.page as string, 10)) : 1,
      limit: flags.limit ? Math.max(1, parseInt(flags.limit as string, 10)) : 25,
      format: (["json", "table", "plain"].includes(fmt) ? fmt : "json") as SearchOpts["format"],
    }
    return runSearch(opts)
  }

  if (cmd === "detail") {
    const id = (flags._ as string[])[1]
    if (!id) {
      process.stderr.write(JSON.stringify({ error: "detail requires a <id|url>", code: "NO_ID" }) + "\n")
      return 1
    }
    const fmt = (flags.format as string) || "json"
    const opts: DetailOpts = { id, format: fmt === "plain" ? "plain" : "json" }
    return runDetail(opts)
  }

  process.stderr.write(JSON.stringify({ error: `Unknown command "${cmd}"`, code: "BAD_CMD" }) + "\n")
  return 1
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    process.stderr.write(
      JSON.stringify({
        error: e instanceof Error ? e.message : String(e),
        code: "INTERNAL_ERROR",
      }) + "\n",
    )
    process.exit(1)
  })
