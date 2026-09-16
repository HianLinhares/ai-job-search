import {
  apiGet,
  matchesJobage,
  toResult,
  writeError,
  type JobResult,
  type RemotarSearchEnvelope,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  remote: boolean
  jobage: number
  page: number
  limit: number
  format: "json" | "table" | "plain"
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

function buildPath(opts: SearchOpts): string {
  const p = new URLSearchParams()
  if (opts.query?.trim()) p.set("search", opts.query.trim())
  if (opts.remote) p.set("type", "remote")
  p.set("page", String(opts.page))
  const qs = p.toString()
  return qs ? `/jobs?${qs}` : "/jobs"
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const envelope = await apiGet<RemotarSearchEnvelope>(buildPath(opts))
    if (!envelope) {
      writeError("Remotar /jobs not found", "SEARCH_FAILED")
      return 1
    }
    const raw = Array.isArray(envelope.data) ? envelope.data : []
    let rows = raw.map(toResult)
    rows = rows.filter((j) => matchesJobage(j, opts.jobage))
    const apiTotal = envelope.meta?.total ?? rows.length
    rows = rows.slice(0, opts.limit)

    if (opts.format === "table") {
      process.stdout.write(renderTable(rows) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(renderPlain(rows) + "\n")
    } else {
      process.stdout.write(
        JSON.stringify({ meta: { count: rows.length, page: opts.page, total: apiTotal }, results: rows }, null, 2) +
          "\n",
      )
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
