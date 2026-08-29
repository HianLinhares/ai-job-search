import {
  apiGet,
  isBrazilScoped,
  matchesLocation,
  toResult,
  withinJobAge,
  writeError,
  type GupyJob,
  type JobResult,
} from "../helpers.js"

const SEARCH_PATH = "/api/v1/jobs"

export type RemoteMode = "remote" | "hybrid" | "onsite" | "all"

export interface SearchOpts {
  query: string
  jobage: number // 9999 = no filter
  page: number
  limit: number
  format: "json" | "table" | "plain"
  remote: RemoteMode
  location?: string
}

interface SearchEnvelope {
  data?: GupyJob[]
  pagination?: { total?: number; limit?: number; offset?: number }
}

function buildQuery(opts: SearchOpts): URLSearchParams {
  const p = new URLSearchParams()
  p.set("jobName", opts.query)
  p.set("limit", String(opts.limit))
  p.set("offset", String((opts.page - 1) * opts.limit))
  if (opts.remote !== "all") p.set("workplaceTypes", opts.remote)
  return p
}

function shortDate(date: string | null): string {
  return date ? date.slice(0, 10) : "—"
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

function applyClientFilters(jobs: GupyJob[], opts: SearchOpts): GupyJob[] {
  return jobs.filter((j) => {
    if (!isBrazilScoped(j)) return false
    if (opts.jobage > 0 && opts.jobage < 9999 && !withinJobAge(j.publishedDate, opts.jobage)) {
      return false
    }
    if (opts.location && !matchesLocation(j, opts.location)) return false
    return true
  })
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const envelope = await apiGet<SearchEnvelope>(`${SEARCH_PATH}?${buildQuery(opts).toString()}`)
    if (!envelope) {
      writeError(`${SEARCH_PATH} not found`, "SEARCH_FAILED")
      return 1
    }
    const raw = envelope.data ?? []
    const filtered = applyClientFilters(raw, opts)
    const rows = filtered.map(toResult)
    const total = envelope.pagination?.total ?? rows.length

    if (opts.format === "table") {
      process.stdout.write(renderTable(rows) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(renderPlain(rows) + "\n")
    } else {
      process.stdout.write(
        JSON.stringify(
          { meta: { count: rows.length, page: opts.page, total }, results: rows },
          null,
          2,
        ) + "\n",
      )
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
