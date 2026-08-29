import { apiGet, normalizeJobId, toDetail, writeError, type GupyJob, type JobDetailResult } from "../helpers.js"

export interface DetailOpts {
  id: string // numeric id, /jobs/<id> path, or Gupy jobUrl with base64 jobId
  format: "json" | "plain"
}

function renderPlain(job: JobDetailResult): string {
  const lines = [job.title, `${job.company ?? "—"} · ${job.location ?? "—"}`]

  const field = (label: string, value: string | null) => {
    if (value) lines.push(`${label}: ${value}`)
  }
  field("Posted", job.date ? job.date.slice(0, 10) : null)
  field("Deadline", job.application_deadline)
  field("Workplace", job.workplace_type)
  field("Skills", job.skills.length ? job.skills.join(", ") : null)

  lines.push("", job.description ?? "(no description)", "", `URL: ${job.url}`, `id: ${job.id}`)
  return lines.join("\n")
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = normalizeJobId(opts.id)
  if (!id) {
    writeError(`could not parse a Gupy job id from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    // Detail returns a bare job object (not wrapped in { data }).
    const job = await apiGet<GupyJob>(`/api/v1/jobs/${encodeURIComponent(id)}`)
    if (!job || job.id == null) {
      writeError("job not found", "NOT_FOUND")
      return 1
    }
    const detail = toDetail(job)
    if (opts.format === "plain") {
      process.stdout.write(renderPlain(detail) + "\n")
    } else {
      process.stdout.write(JSON.stringify(detail, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
