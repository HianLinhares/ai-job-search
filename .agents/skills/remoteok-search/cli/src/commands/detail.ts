import {
  apiGet,
  isJob,
  normalizeId,
  toResult,
  writeError,
  type JobDetailResult,
  type RemoteOkJob,
} from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

function renderPlain(job: JobDetailResult): string {
  const lines = [
    job.title,
    `${job.company ?? "—"} · ${job.location ?? "—"}`,
    job.date ? `Posted: ${job.date.slice(0, 10)}` : "",
    job.tags?.length ? `Tags: ${job.tags.join(", ")}` : "",
    "",
    job.description || "(no description)",
    "",
    `URL: ${job.url}`,
    `id: ${job.id}`,
  ].filter((l) => l !== "")
  return lines.join("\n")
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const key = normalizeId(opts.id)
  if (!key) {
    writeError(`could not parse a Remote OK id/slug from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    const raw = await apiGet<RemoteOkJob[]>("/api")
    if (!Array.isArray(raw)) {
      writeError("Remote OK API returned a non-array body", "DETAIL_FAILED")
      return 1
    }
    const jobs = raw.filter(isJob)
    const found = jobs.find((j) => {
      const id = j.id != null ? String(j.id) : ""
      if (key.id && id === key.id) return true
      if (key.slug && (j.slug === key.slug || id === key.slug)) return true
      return false
    })
    if (!found) {
      writeError("job not found", "NOT_FOUND")
      return 1
    }
    const job = toResult(found)
    if (opts.format === "plain") {
      process.stdout.write(renderPlain(job) + "\n")
    } else {
      process.stdout.write(JSON.stringify(job, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
