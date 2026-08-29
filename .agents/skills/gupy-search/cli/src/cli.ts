#!/usr/bin/env bun
// Self-contained CLI for searching Gupy's public employability portal API.
// No external CLI framework and zero runtime dependencies — runs with just `bun`.
// Brazil-focused (default remote); unofficial public endpoint — personal use only.

import { runSearch, type RemoteMode, type SearchOpts } from "./commands/search.js"
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

function stringFlag(raw: FlagValue, whenBare?: string): string | undefined {
  if (typeof raw === "string") return raw
  if (raw === true) return whenBare
  return undefined
}

const REMOTE_MODES: RemoteMode[] = ["remote", "hybrid", "onsite", "all"]

const HELP = `gupy-cli — search Gupy employability portal jobs (Brazil ATS)

USAGE
  bun run src/cli.ts search -q "<keywords>" [flags] [--format json|table|plain]
  bun run src/cli.ts detail <id|url> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>   Job name keywords (required; maps to jobName).
  --jobage <days>      Posted within N days (client-side on publishedDate).
  --page <n>           1-indexed page. Default 1.
  --limit, -n <n>      Results per page. Default 10.
  --remote <mode>      remote (default) | hybrid | onsite | all.
                       Bare --remote means remote. Maps to workplaceTypes.
  --location <text>    Optional client filter on city or state.
  --format <fmt>       json (default) | table | plain.

DETAIL
  <id|url>             Numeric job id, /jobs/<id> path, or a Gupy jobUrl
                       whose path is base64 {"jobId":N,...}.

EXAMPLES
  bun run src/cli.ts search -q "desenvolvedor" --remote remote --limit 3 --format table
  bun run src/cli.ts search -q "python" --jobage 14 --format table
  bun run src/cli.ts detail 12341691 --format plain

Source: ${baseUrl()} (unofficial public employability API). Personal use; respect rate limits.
Override base with GUPY_API_URL if needed.
`

function parseIntFlag(name: string, raw: string | boolean | string[]): number | null {
  const val = typeof raw === "string" ? Number(raw.trim()) : NaN
  if (!Number.isInteger(val) || val < 1) {
    process.stderr.write(
      JSON.stringify({
        error: `--${name} must be a whole number of at least 1, got "${raw}"`,
        code: "BAD_ARG",
      }) + "\n",
    )
    return null
  }
  return val
}

const KNOWN_FLAGS: Record<string, Set<string>> = {
  search: new Set(["query", "jobage", "page", "limit", "format", "remote", "location", "help", "h"]),
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
    const query = stringFlag(flags.query)
    if (!query) {
      process.stderr.write(
        JSON.stringify({
          error: "search requires --query / -q (maps to Gupy jobName)",
          code: "NO_QUERY",
        }) + "\n",
      )
      return 1
    }

    for (const name of ["jobage", "page", "limit"] as const) {
      if (flags[name] !== undefined) {
        const v = parseIntFlag(name, flags[name])
        if (v === null) return 1
        flags[name] = String(v)
      }
    }

    const remoteRaw = stringFlag(flags.remote, "remote") ?? "remote"
    if (!REMOTE_MODES.includes(remoteRaw as RemoteMode)) {
      process.stderr.write(
        JSON.stringify({
          error: `--remote must be one of ${REMOTE_MODES.join("|")}, got "${remoteRaw}"`,
          code: "BAD_ARG",
        }) + "\n",
      )
      return 1
    }

    const fmt = (flags.format as string) || "json"
    const opts: SearchOpts = {
      query,
      jobage: flags.jobage ? parseInt(flags.jobage as string, 10) : 9999,
      page: flags.page ? Math.max(1, parseInt(flags.page as string, 10)) : 1,
      limit: flags.limit ? Math.max(1, parseInt(flags.limit as string, 10)) : 10,
      format: (["json", "table", "plain"].includes(fmt) ? fmt : "json") as SearchOpts["format"],
      remote: remoteRaw as RemoteMode,
      location: stringFlag(flags.location),
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
