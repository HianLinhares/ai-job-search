import {
  apiGet,
  matchesJobage,
  toResult,
  writeError,
  type HimalayasSearchResponse,
  type JobResult,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  country?: string
  jobage: number
  page: number
  limit: number
  format: "json" | "table" | "plain"
}

function shortDate(date: string | null): string {
  return typeof date === "string" && date.length >= 10 ? date.slice(0, 10) : "—"
}

interface Column {
  header: string
  width: number
  cell: (r: JobResult) => string
}

function renderTable(rows: JobResult[]): string {
  if (rows.length === 0) return "No results."
  const columns: Column[] = [
    { header: "ID", width: Math.max(2, ...rows.map((r) => r.id.length)), cell: (r) => r.id },
    { header: "TITLE", width: 38, cell: (r) => r.title },
    { header: "COMPANY", width: 22, cell: (r) => r.company ?? "—" },
    { header: "LOCATION", width: 20, cell: (r) => r.location ?? "—" },
    { header: "DATE", width: 10, cell: (r) => shortDate(r.date) },
  ]
  const row = (cells: string[]) =>
    cells.map((c, i) => c.slice(0, columns[i].width).padEnd(columns[i].width)).join("  ")
  const header = row(columns.map((c) => c.header))
  const body = rows.map((r) => row(columns.map((c) => c.cell(r))))
  return [header, "-".repeat(header.length), ...body].join("\n")
}

function renderPlain(rows: JobResult[]): string {
  if (rows.length === 0) return "No results."
  const block = (r: JobResult) =>
    [
      r.title,
      `  ${r.company ?? "—"} · ${r.location ?? "—"} · ${shortDate(r.date)}`,
      `  id: ${r.id}`,
      `  ${r.url}`,
    ].join("\n")
  return rows.map(block).join("\n\n")
}

function buildPath(opts: SearchOpts): string {
  const p = new URLSearchParams()
  p.set("limit", String(opts.limit))
  p.set("offset", String((opts.page - 1) * opts.limit))
  if (opts.country) p.set("country", opts.country.toUpperCase())

  if (opts.query) {
    p.set("q", opts.query)
    return `/jobs/api/search?${p.toString()}`
  }
  return `/jobs/api?${p.toString()}`
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    // When jobage filters client-side, over-fetch a wider window then slice.
    const fetchOpts =
      opts.jobage > 0 && opts.jobage < 9999
        ? { ...opts, page: 1, limit: Math.min(Math.max(opts.limit * opts.page * 5, opts.limit * 5), 100) }
        : opts

    const body = await apiGet<HimalayasSearchResponse>(buildPath(fetchOpts))
    let rows = (body.jobs ?? []).map(toResult)
    rows = rows.filter((j) => matchesJobage(j, opts.jobage))

    let total = body.totalCount ?? rows.length
    if (opts.jobage > 0 && opts.jobage < 9999) {
      total = rows.length
    }
    // Always enforce page/limit client-side — the API may return more than asked.
    const start = (opts.page - 1) * opts.limit
    rows = rows.slice(start, start + opts.limit)

    if (opts.format === "table") {
      process.stdout.write(renderTable(rows) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(renderPlain(rows) + "\n")
    } else {
      process.stdout.write(
        JSON.stringify({ meta: { count: rows.length, page: opts.page, total }, results: rows }, null, 2) +
          "\n",
      )
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
