#!/usr/bin/env bun
// Self-contained CLI for searching Remote OK's public JSON API.
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

const HELP = `remoteok-cli — search Remote OK remote job listings

USAGE
  bun run src/cli.ts search [-q "<keywords>"] [--tag <tag>] [--country BR] [--format json|table|plain]
  bun run src/cli.ts detail <id|slug|url> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>   Client filter: title / company / tags (optional).
  --tag <tag>          Remote OK API tag filter (e.g. dev, javascript).
  --country <code>     Client filter; --country BR keeps Brazil-relevant hits
                       (location/tags matching BR/Brazil/Brasil). Without it,
                       all remote jobs are returned — /scrape should pass --country BR.
  --jobage <days>      Posted within N days (client filter).
  --page <n>           1-indexed page. Default 1.
  --limit, -n <n>      Results per page. Default 25.
  --format <fmt>       json (default) | table | plain.

DETAIL
  <id|slug|url>        Numeric id, slug, or https://remoteok.com/remote-jobs/<id> URL.

EXAMPLES
  bun run src/cli.ts search -q "developer" --country BR --limit 3 --format table
  bun run src/cli.ts search --tag dev --jobage 14 --format table
  bun run src/cli.ts detail 123456 --format plain

Attribution: data from Remote OK (https://remoteok.com). Link back when using results.
Source: ${baseUrl()}
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
  search: new Set(["query", "jobage", "page", "limit", "format", "tag", "country", "help", "h"]),
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
      tag: stringFlag(flags.tag),
      country: stringFlag(flags.country),
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
      process.stderr.write(JSON.stringify({ error: "detail requires a <id|slug|url>", code: "NO_ID" }) + "\n")
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
