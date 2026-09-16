import {
  fetchHtml,
  findJobPosting,
  jobPostingToResult,
  normalizeId,
  parseJobPath,
  writeError,
  type JobDetailResult,
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
    "",
    job.description || "(no description)",
    "",
    `URL: ${job.url}`,
    `id: ${job.id}`,
  ].filter((l) => l !== "")
  return lines.join("\n")
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const url = normalizeId(opts.id)
  if (!url) {
    writeError(`could not parse a GeekHunter job URL from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    const html = await fetchHtml(url)
    if (html === null) {
      writeError("job not found", "NOT_FOUND")
      return 1
    }
    const posting = findJobPosting(html)
    if (!posting) {
      // Fall back to URL-derived fields if page loads but JSON-LD missing
      const parsed = parseJobPath(url)
      if (!parsed) {
        writeError("job not found", "NOT_FOUND")
        return 1
      }
      const minimal: JobDetailResult = {
        id: parsed.slug,
        title: parsed.slug,
        company: parsed.company,
        location: "Remoto",
        date: null,
        url: parsed.url,
        description: null,
        work_mode: null,
      }
      if (opts.format === "plain") {
        process.stdout.write(renderPlain(minimal) + "\n")
      } else {
        process.stdout.write(JSON.stringify(minimal, null, 2) + "\n")
      }
      return 0
    }
    const job = jobPostingToResult(posting, url)
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
