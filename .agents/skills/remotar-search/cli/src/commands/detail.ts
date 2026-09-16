import {
  apiGet,
  normalizeId,
  toResult,
  unwrapJob,
  writeError,
  type JobDetailResult,
  type RemotarJob,
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
    job.work_mode ? `Work mode: ${job.work_mode}` : "",
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
  const id = normalizeId(opts.id)
  if (!id) {
    writeError(`could not parse a Remotar id from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    const body = await apiGet<RemotarJob | { data?: RemotarJob }>(`/jobs/${id}`)
    const found = unwrapJob(body)
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
